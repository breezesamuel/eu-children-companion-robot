let client = null;
let register = null;
let httpRequestCounter = null;
let httpRequestDuration = null;
let activeConnections = null;

const os = require('os');
const process = require('process');
const { performance } = require('perf_hooks');

let metricsEnabled = true;
try {
    client = require('prom-client');
    register = new client.Registry();
    client.collectDefaultMetrics({ register, prefix: 'robot_' });

    httpRequestCounter = new client.Counter({
        name: 'robot_http_requests_total',
        help: 'Total HTTP requests',
        labelNames: ['method', 'path', 'status', 'endpoint'],
        registers: [register]
    });

    httpRequestDuration = new client.Histogram({
        name: 'robot_http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path', 'endpoint'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
        registers: [register]
    });

    activeConnections = new client.Gauge({
        name: 'robot_active_connections',
        help: 'Number of active connections',
        registers: [register]
    });
    metricsEnabled = true;
} catch (e) {
    metricsEnabled = false;
}

const endpointMetrics = new Map();
const errorCounts = new Map();
const activeRequests = new Map();
const customMetrics = new Map();
const websocketMetrics = { connections: 0, messagesIn: 0, messagesOut: 0, errors: 0 };
const dbQueryMetrics = { count: 0, totalDuration: 0, slowQueries: [] };
const cacheMetrics = { hits: 0, misses: 0 };
const healthChecks = new Map();
const metricAlerts = new Map();

const WINDOW_SIZES = [60, 300, 3600];
const buckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];

function ensureEndpointMetric(method, path) {
    const key = `${method}:${path}`;
    if (!endpointMetrics.has(key)) {
        endpointMetrics.set(key, {
            method, path, count: 0, errors: 0, totalDuration: 0,
            durations: [], statusCounts: {},
            lastSeen: null,
            windows: Object.fromEntries(WINDOW_SIZES.map(w => [w, { count: 0, errors: 0, totalDuration: 0 }]))
        });
    }
    return endpointMetrics.get(key);
}

function incrementRequest(method, path, status) {
    if (!metricsEnabled) return;
    try {
        const endpoint = path.split('/').slice(0, 4).join('/');
        httpRequestCounter.labels(method, path, String(status), endpoint).inc();
    } catch (e) { }
    const ep = ensureEndpointMetric(method, path);
    ep.count++;
    ep.statusCounts[status] = (ep.statusCounts[status] || 0) + 1;
    ep.lastSeen = Date.now();
    if (status >= 400) {
        ep.errors++;
        const errKey = `${status}:${method}:${path}`;
        errorCounts.set(errKey, (errorCounts.get(errKey) || 0) + 1);
    }
    for (const w of WINDOW_SIZES) {
        ep.windows[w].count++;
        if (status >= 400) ep.windows[w].errors++;
    }
}

function observeDuration(method, path, seconds) {
    if (!metricsEnabled) return;
    try {
        const endpoint = path.split('/').slice(0, 4).join('/');
        httpRequestDuration.labels(method, path, endpoint).observe(seconds);
    } catch (e) { }
    const ep = ensureEndpointMetric(method, path);
    ep.totalDuration += seconds;
    ep.durations.push(seconds);
    if (ep.durations.length > 10000) ep.durations.shift();
    for (const w of WINDOW_SIZES) ep.windows[w].totalDuration += seconds;
}

function incrementConnections() {
    if (!metricsEnabled) return;
    try { activeConnections.inc(); } catch (e) { }
}

function decrementConnections() {
    if (!metricsEnabled) return;
    try { activeConnections.dec(); } catch (e) { }
}

function trackActiveRequest(req, res) {
    const id = req.correlationId || req.id || Date.now().toString(36) + Math.random().toString(36).slice(2);
    const entry = { method: req.method, path: req.path, startTime: Date.now(), id };
    activeRequests.set(id, entry);
    res.on('finish', () => activeRequests.delete(id));
    return id;
}

function getActiveRequests() {
    return Array.from(activeRequests.values()).map(r => ({
        ...r, duration_ms: Date.now() - r.startTime
    }));
}

function getEndpointMetrics() {
    const result = {};
    for (const [key, ep] of endpointMetrics) {
        const sorted = [...ep.durations].sort((a, b) => a - b);
        const len = sorted.length;
        result[key] = {
            method: ep.method, path: ep.path, count: ep.count, errors: ep.errors,
            errorRate: ep.count > 0 ? ((ep.errors / ep.count) * 100).toFixed(2) + '%' : '0%',
            avgDuration: ep.count > 0 ? (ep.totalDuration / ep.count).toFixed(3) : '0',
            p50: len > 0 ? sorted[Math.floor(len * 0.5)].toFixed(3) : 0,
            p95: len > 0 ? sorted[Math.floor(len * 0.95)].toFixed(3) : 0,
            p99: len > 0 ? sorted[Math.floor(len * 0.99)].toFixed(3) : 0,
            statusCounts: ep.statusCounts, lastSeen: ep.lastSeen ? new Date(ep.lastSeen).toISOString() : null
        };
    }
    return result;
}

function getErrorMetrics() {
    const result = {};
    for (const [key, count] of errorCounts) {
        result[key] = count;
    }
    return result;
}

function recordCustomMetric(name, value, tags = {}) {
    if (!customMetrics.has(name)) {
        customMetrics.set(name, { values: [], tags: {} });
    }
    const metric = customMetrics.get(name);
    metric.values.push({ value, timestamp: Date.now(), tags });
    if (metric.values.length > 10000) metric.values.shift();
    Object.assign(metric.tags, tags);
}

function getCustomMetrics(name, windowSeconds) {
    const cutoff = windowSeconds ? Date.now() - windowSeconds * 1000 : 0;
    const result = {};
    for (const [key, metric] of customMetrics) {
        if (name && key !== name) continue;
        const filtered = metric.values.filter(v => v.timestamp >= cutoff);
        if (filtered.length === 0) continue;
        const values = filtered.map(v => v.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const sorted = [...values].sort((a, b) => a - b);
        result[key] = {
            count: values.length, sum, avg: sum / values.length,
            min: sorted[0], max: sorted[sorted.length - 1],
            last: values[values.length - 1], tags: metric.tags
        };
    }
    return result;
}

function incrementWebSocketConnections() { websocketMetrics.connections++; }
function decrementWebSocketConnections() { if (websocketMetrics.connections > 0) websocketMetrics.connections--; }
function recordWebSocketMessage(direction) {
    if (direction === 'in') websocketMetrics.messagesIn++;
    else websocketMetrics.messagesOut++;
}
function recordWebSocketError() { websocketMetrics.errors++; }

function getWebSocketMetrics() { return { ...websocketMetrics }; }

function recordDbQuery(durationMs) {
    dbQueryMetrics.count++;
    dbQueryMetrics.totalDuration += durationMs;
    if (durationMs > 1000) {
        dbQueryMetrics.slowQueries.push({ duration: durationMs, timestamp: Date.now() });
        if (dbQueryMetrics.slowQueries.length > 100) dbQueryMetrics.slowQueries.shift();
    }
}

function getDbQueryMetrics() {
    return {
        count: dbQueryMetrics.count,
        avgDuration: dbQueryMetrics.count > 0 ? (dbQueryMetrics.totalDuration / dbQueryMetrics.count).toFixed(2) : 0,
        slowQueryCount: dbQueryMetrics.slowQueries.length,
        slowQueries: dbQueryMetrics.slowQueries.slice(-20)
    };
}

function recordCacheHit() { cacheMetrics.hits++; }
function recordCacheMiss() { cacheMetrics.misses++; }

function getCacheMetrics() {
    const total = cacheMetrics.hits + cacheMetrics.misses;
    return {
        hits: cacheMetrics.hits, misses: cacheMetrics.misses,
        hitRate: total > 0 ? ((cacheMetrics.hits / total) * 100).toFixed(1) + '%' : '0%'
    };
}

function getSystemMetrics() {
    const mem = process.memoryUsage();
    const cpus = os.cpus();
    const loadAvg = os.loadavg ? os.loadavg() : [0, 0, 0];
    return {
        memory: {
            rss: mem.rss, heapTotal: mem.heapTotal, heapUsed: mem.heapUsed, external: mem.external,
            rssMB: (mem.rss / 1024 / 1024).toFixed(1),
            heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1)
        },
        cpu: {
            cores: cpus.length, model: cpus[0]?.model || 'unknown',
            loadAvg1: loadAvg[0], loadAvg5: loadAvg[1], loadAvg15: loadAvg[2]
        },
        os: { platform: os.platform(), uptime: os.uptime(), hostname: os.hostname() },
        process: { uptime: process.uptime(), pid: process.pid, version: process.version }
    };
}

function registerHealthCheck(name, checkFn) {
    healthChecks.set(name, checkFn);
}

async function getHealthMetrics() {
    const result = {};
    for (const [name, checkFn] of healthChecks) {
        try {
            const status = await checkFn();
            result[name] = { status: status !== false ? 'ok' : 'fail', timestamp: Date.now() };
        } catch (e) {
            result[name] = { status: 'fail', error: e.message, timestamp: Date.now() };
        }
    }
    return result;
}

function setMetricAlert(name, config) {
    metricAlerts.set(name, config);
}

function checkAlerts(metrics) {
    const triggered = [];
    for (const [name, config] of metricAlerts) {
        const value = metrics[name];
        if (value !== undefined) {
            if (config.max !== undefined && value > config.max) {
                triggered.push({ name, value, threshold: config.max, type: 'max', message: config.message || `${name} exceeded max threshold` });
            }
            if (config.min !== undefined && value < config.min) {
                triggered.push({ name, value, threshold: config.min, type: 'min', message: config.message || `${name} below min threshold` });
            }
        }
    }
    return triggered;
}

async function getMetrics() {
    if (!metricsEnabled) return '';
    try { return await register.metrics(); } catch (e) { return ''; }
}

function getContentType() {
    if (!metricsEnabled) return 'text/plain';
    return register.contentType;
}

function getMetricsJSON() {
    return {
        system: getSystemMetrics(),
        endpoints: getEndpointMetrics(),
        errors: getErrorMetrics(),
        activeRequests: getActiveRequests().length,
        websocket: getWebSocketMetrics(),
        database: getDbQueryMetrics(),
        cache: getCacheMetrics(),
        custom: getCustomMetrics(),
        health: {},
        alerts: checkAlerts({
            activeRequests: activeRequests.size,
            dbQueryCount: dbQueryMetrics.count,
            memory: process.memoryUsage().heapUsed / 1024 / 1024
        })
    };
}

if (!metricsEnabled) {
    const noop = () => {};
    const noopObj = {
        incrementRequest: noop, observeDuration: noop,
        incrementConnections: noop, decrementConnections: noop,
        trackActiveRequest: () => {},
        getActiveRequests: () => [],
        getEndpointMetrics: () => ({}),
        getErrorMetrics: () => ({}),
        recordCustomMetric: noop, getCustomMetrics: () => ({}),
        incrementWebSocketConnections: noop, decrementWebSocketConnections: noop,
        recordWebSocketMessage: noop, recordWebSocketError: noop,
        getWebSocketMetrics: () => ({}),
        recordDbQuery: noop, getDbQueryMetrics: () => ({}),
        recordCacheHit: noop, recordCacheMiss: noop,
        getCacheMetrics: () => ({}),
        getSystemMetrics: () => ({}),
        registerHealthCheck: noop, getHealthMetrics: async () => ({}),
        setMetricAlert: noop, checkAlerts: () => [],
        getMetrics: async () => '', getContentType: () => 'text/plain',
        getMetricsJSON: () => ({})
    };
    Object.assign(module.exports, noopObj);
} else {
    module.exports = {
        register, incrementRequest, observeDuration,
        incrementConnections, decrementConnections,
        trackActiveRequest, getActiveRequests,
        getEndpointMetrics, getErrorMetrics,
        recordCustomMetric, getCustomMetrics,
        incrementWebSocketConnections, decrementWebSocketConnections,
        recordWebSocketMessage, recordWebSocketError,
        getWebSocketMetrics, recordDbQuery, getDbQueryMetrics,
        recordCacheHit, recordCacheMiss, getCacheMetrics,
        getSystemMetrics, registerHealthCheck, getHealthMetrics,
        setMetricAlert, checkAlerts,
        getMetrics, getContentType, getMetricsJSON
    };
}
