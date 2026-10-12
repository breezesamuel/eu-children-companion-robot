const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const url = require('url');
const os = require('os');

const slowRequests = [];
const authFailures = [];
const requestQueue = [];
const dbQueriesPerRequest = new Map();
const memoryPerRequest = new Map();
const MAX_SLOW_LOG = 100;
const MAX_AUTH_LOG = 100;
const MAX_QUEUE_DEPTH = 1000;
const REQUEST_SAMPLE_RATE = 0.01;
const MAX_BODY_LOG_SIZE = 4096;
const WATERFALL_METRICS = ['dns', 'tcp', 'tls', 'firstByte', 'total'];

let requestCounter = 0;
let circuitOpen = false;
let circuitFailCount = 0;
const CIRCUIT_THRESHOLD = 50;
const CIRCUIT_RESET_MS = 30000;

const alertThresholds = {
    slowRequest: parseFloat(process.env.MONITOR_SLOW_THRESHOLD || '2'),
    errorRate: parseFloat(process.env.MONITOR_ERROR_RATE || '0.1'),
    queueDepth: parseInt(process.env.MONITOR_QUEUE_DEPTH || '500'),
    memoryMB: parseInt(process.env.MONITOR_MEMORY_MB || '512')
};

const pathBasedMetrics = new Map();
const userAgentCounts = new Map();
const geoCache = new Map();
const blockedIPs = new Set();

function trackingMiddleware(req, res, next) {
    requestCounter++;
    const isSample = Math.random() < REQUEST_SAMPLE_RATE;
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    req.startTime = Date.now();
    req.requestId = correlationId;

    const reqId = metrics.trackActiveRequest ? metrics.trackActiveRequest(req, res) : null;

    requestQueue.push({ id: correlationId, timestamp: Date.now(), path: req.path });
    if (requestQueue.length > MAX_QUEUE_DEPTH) requestQueue.shift();

    if (requestQueue.length > alertThresholds.queueDepth) {
        logger.warn('Request queue depth alert', { depth: requestQueue.length, threshold: alertThresholds.queueDepth });
    }

    if (circuitOpen) {
        const elapsed = Date.now() - circuitOpen;
        if (elapsed > CIRCUIT_RESET_MS) {
            circuitOpen = false;
            circuitFailCount = 0;
            logger.info('Circuit breaker reset');
        } else {
            return res.status(503).json({ error: 'Service temporarily unavailable', retryAfter: Math.ceil((CIRCUIT_RESET_MS - elapsed) / 1000) });
        }
    }

    metrics.incrementConnections();

    const startMemory = process.memoryUsage();
    memoryPerRequest.set(correlationId, startMemory);

    dbQueriesPerRequest.set(correlationId, 0);

    if (isSample) {
        req._sampleLog = true;
        req._timings = {};
    }

    let responseBody = null;
    let responseSize = 0;

    const originalJson = res.json.bind(res);
    res.json = function (body) {
        responseBody = body;
        return finish(body);
    };
    const originalSend = res.send.bind(res);
    res.send = function (body) {
        responseBody = body;
        return finish(body);
    };
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, ...args) {
        if (chunk) responseBody = chunk;
        return finish(responseBody);
    };

    function finish(body) {
        const duration = (Date.now() - req.startTime) / 1000;
        const path = req.route ? req.route.path : req.path;
        const method = req.method;
        const status = res.statusCode;

        metrics.incrementRequest(method, path, status);
        metrics.observeDuration(method, path, duration);
        metrics.decrementConnections();

        if (body) {
            try {
                const str = typeof body === 'string' ? body : JSON.stringify(body);
                responseSize = Buffer.byteLength(str, 'utf-8');
            } catch (e) { }
        }

        const ua = req.headers['user-agent'] || '';
        userAgentCounts.set(ua, (userAgentCounts.get(ua) || 0) + 1);

        const pathKey = `${method}:${path}`;
        if (!pathBasedMetrics.has(pathKey)) {
            pathBasedMetrics.set(pathKey, { count: 0, errors: 0, totalDuration: 0, sizes: [] });
        }
        const pm = pathBasedMetrics.get(pathKey);
        pm.count++;
        pm.totalDuration += duration;
        pm.sizes.push(responseSize);
        if (pm.sizes.length > 1000) pm.sizes.shift();
        if (status >= 400) pm.errors++;

        const dbQueryCount = dbQueriesPerRequest.get(correlationId) || 0;

        const logMeta = {
            correlationId, method, path: req.originalUrl, status,
            duration: `${duration.toFixed(3)}s`, size: responseSize,
            userAgent: ua, dbQueries: dbQueryCount,
            queueDepth: requestQueue.length
        };

        if (status === 429) {
            circuitFailCount++;
            if (circuitFailCount >= CIRCUIT_THRESHOLD) {
                circuitOpen = Date.now();
                logger.error('Circuit breaker opened due to rate limiting');
            }
        }

        if (duration > alertThresholds.slowRequest) {
            slowRequests.push({ time: new Date().toISOString(), method, path: req.originalUrl, duration, status, dbQueries: dbQueryCount });
            if (slowRequests.length > MAX_SLOW_LOG) slowRequests.shift();
            logger.warn('Slow request detected', logMeta);
        }

        if (status === 401 || status === 403) {
            authFailures.push({ time: new Date().toISOString(), method, path: req.originalUrl, status, ip: req.ip, ua });
            if (authFailures.length > MAX_AUTH_LOG) authFailures.shift();
        }

        if (isSample) {
            const memAfter = process.memoryUsage();
            logMeta._sample = true;
            logMeta._memoryDelta = {
                heap: ((memAfter.heapUsed - startMemory.heapUsed) / 1024).toFixed(1) + 'KB',
                rss: ((memAfter.rss - startMemory.rss) / 1024).toFixed(1) + 'KB'
            };
        }

        if (status >= 500) {
            logger.error('Request failed', logMeta);
        } else if (status >= 400) {
            logger.warn('Request warning', logMeta);
        } else {
            logger.info('Request completed', logMeta);
        }

        if (req._timings) {
            logMeta.waterfall = req._timings;
        }

        res.setHeader('X-Request-Id', correlationId);

        dbQueriesPerRequest.delete(correlationId);
        memoryPerRequest.delete(correlationId);

        res.json = originalJson;
        res.send = originalSend;
        res.end = originalEnd;
        return originalJson(body);
    }

    next();
}

function recordDbQueryPerRequest(correlationId) {
    const count = dbQueriesPerRequest.get(correlationId) || 0;
    dbQueriesPerRequest.set(correlationId, count + 1);
}

trackingMiddleware.getSlowRequests = (limit = 20) => slowRequests.slice(-limit);
trackingMiddleware.getAuthFailures = (limit = 20) => authFailures.slice(-limit);
trackingMiddleware.getQueueDepth = () => requestQueue.length;
trackingMiddleware.getQueue = (limit = 50) => requestQueue.slice(-limit);
trackingMiddleware.getCircuitStatus = () => ({
    open: !!circuitOpen,
    openedAt: circuitOpen || null,
    failCount: circuitFailCount,
    threshold: CIRCUIT_THRESHOLD,
    remainingMs: circuitOpen ? Math.max(0, CIRCUIT_RESET_MS - (Date.now() - circuitOpen)) : 0
});

trackingMiddleware.getPathMetrics = () => {
    const result = {};
    for (const [key, pm] of pathBasedMetrics) {
        const sizes = pm.sizes;
        const avgSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
        result[key] = {
            count: pm.count, errors: pm.errors,
            errorRate: pm.count > 0 ? ((pm.errors / pm.count) * 100).toFixed(2) + '%' : '0%',
            avgDuration: pm.count > 0 ? (pm.totalDuration / pm.count).toFixed(3) : '0',
            avgSize: Math.round(avgSize), lastSeen: new Date().toISOString()
        };
    }
    return result;
};

trackingMiddleware.getUserAgentStats = (top = 10) => {
    const sorted = [...userAgentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
    return sorted.map(([ua, count]) => {
        const parsed = parseUserAgent(ua);
        return { ua: ua.slice(0, 100), count, ...parsed };
    });
};

trackingMiddleware.getAlertThresholds = () => ({ ...alertThresholds });
trackingMiddleware.setAlertThresholds = (thresholds) => {
    Object.assign(alertThresholds, thresholds);
};

trackingMiddleware.recordDbQuery = (correlationId) => recordDbQueryPerRequest(correlationId);

trackingMiddleware.getDbQueriesPerRequest = (correlationId) => dbQueriesPerRequest.get(correlationId) || 0;

trackingMiddleware.getMemoryPerRequest = () => {
    const result = {};
    for (const [id, mem] of memoryPerRequest) {
        result[id] = { heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2), rssMB: (mem.rss / 1024 / 1024).toFixed(2) };
    }
    return result;
};

trackingMiddleware.getWaterfallMetrics = () => WATERFALL_METRICS;

trackingMiddleware.incrementDbQueryCount = (correlationId) => {
    const count = dbQueriesPerRequest.get(correlationId) || 0;
    dbQueriesPerRequest.set(correlationId, count + 1);
};

function parseUserAgent(ua) {
    const result = { browser: 'unknown', os: 'unknown', device: 'unknown', isBot: false };
    if (!ua) return result;
    if (/bot|crawl|spider|scrape|curl|wget|python-requests/i.test(ua)) result.isBot = true;
    if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) result.browser = 'Chrome';
    else if (/firefox/i.test(ua)) result.browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) result.browser = 'Safari';
    else if (/edge/i.test(ua)) result.browser = 'Edge';
    else if (/opr|opera/i.test(ua)) result.browser = 'Opera';
    if (/windows/i.test(ua)) result.os = 'Windows';
    else if (/mac/i.test(ua)) result.os = 'macOS';
    else if (/linux/i.test(ua)) result.os = 'Linux';
    else if (/android/i.test(ua)) result.os = 'Android';
    else if (/ios|iphone|ipad/i.test(ua)) result.os = 'iOS';
    if (/mobile/i.test(ua)) result.device = 'Mobile';
    else if (/tablet/i.test(ua)) result.device = 'Tablet';
    else result.device = 'Desktop';
    return result;
}

trackingMiddleware.parseUserAgent = parseUserAgent;

trackingMiddleware.addBlockedIP = (ip) => blockedIPs.add(ip);
trackingMiddleware.removeBlockedIP = (ip) => blockedIPs.delete(ip);
trackingMiddleware.getBlockedIPs = () => [...blockedIPs];
trackingMiddleware.isBlockedIP = (ip) => blockedIPs.has(ip);

trackingMiddleware.getMonitoringData = () => ({
    slowRequests: trackingMiddleware.getSlowRequests(20),
    authFailures: trackingMiddleware.getAuthFailures(20),
    queueDepth: requestQueue.length,
    circuit: trackingMiddleware.getCircuitStatus(),
    pathMetrics: trackingMiddleware.getPathMetrics(),
    uaTop: trackingMiddleware.getUserAgentStats(5),
    dbQueriesActive: dbQueriesPerRequest.size,
    thresholds: alertThresholds
});

module.exports = trackingMiddleware;
