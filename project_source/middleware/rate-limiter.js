const requestCounts = new Map();
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW || '60000');
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100');
const BURST_ALLOWANCE = parseInt(process.env.RATE_LIMIT_BURST || '20');
const CONCURRENCY_LIMIT = parseInt(process.env.RATE_LIMIT_CONCURRENCY || '50');
const GLOBAL_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '10000');

let redisClient = null;
let useRedis = false;

const whitelist = new Set();
const blacklist = new Set();
const activeConcurrent = new Map();
const globalTimestamps = [];

const tierConfigs = new Map();
const routePatternCache = new Map();

const analytics = {
    blockedIPs: new Map(),
    totalBlocked: 0,
    peakUsage: 0,
    totalRequests: 0
};

let mode = (process.env.RATE_LIMIT_MODE || 'sliding').toLowerCase();
let isAdmin = false;

function configureTier(name, config) {
    tierConfigs.set(name, {
        windowMs: config.windowMs || WINDOW_MS,
        maxRequests: config.maxRequests || MAX_REQUESTS,
        burst: config.burst || BURST_ALLOWANCE
    });
}

function setRedis(client) {
    redisClient = client;
    useRedis = true;
}

function setMode(newMode) {
    if (newMode === 'sliding' || newMode === 'fixed') mode = newMode;
}

function addWhitelist(ip) { whitelist.add(ip); }
function removeWhitelist(ip) { whitelist.delete(ip); }
function addBlacklist(ip) { blacklist.add(ip); }
function removeBlacklist(ip) { blacklist.delete(ip); }

function getKey(req) {
    if (req.user && req.user.id) return `user:${req.user.id}`;
    if (req.headers['x-api-key']) return `apikey:${req.headers['x-api-key']}`;
    return `ip:${req.ip || req.connection.remoteAddress || 'unknown'}`;
}

function getTierForPath(path) {
    if (routePatternCache.has(path)) return routePatternCache.get(path);
    for (const [name, config] of tierConfigs) {
        if (config.pattern && path.match(config.pattern)) {
            routePatternCache.set(path, name);
            return name;
        }
    }
    return 'default';
}

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    if (whitelist.has(ip)) return next();
    if (blacklist.has(ip)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    analytics.totalRequests++;

    const key = getKey(req);
    const tierName = getTierForPath(req.path);
    const tier = tierConfigs.get(tierName) || {};
    const windowMs = tier.windowMs || WINDOW_MS;
    const maxRequests = tier.maxRequests || MAX_REQUESTS;
    const burst = tier.burst || BURST_ALLOWANCE;

    const now = Date.now();

    if (req.headers['x-admin-key'] === process.env.ADMIN_KEY) {
        isAdmin = true;
    }

    if (mode === 'fixed') {
        return handleFixedWindow(req, res, next, key, windowMs, maxRequests, burst, ip);
    }
    return handleSlidingWindow(req, res, next, key, windowMs, maxRequests, burst, ip);
}

function handleFixedWindow(req, res, next, key, windowMs, maxRequests, burst, ip) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    if (!requestCounts.has(key)) {
        requestCounts.set(key, { window: windowStart, count: 0, burst: burst });
    }

    const entry = requestCounts.get(key);

    if (entry.window !== windowStart) {
        entry.window = windowStart;
        entry.count = 0;
        entry.burst = burst;
    }

    entry.count++;

    const effectiveLimit = maxRequests + entry.burst;
    const remaining = Math.max(0, effectiveLimit - entry.count);

    setHeaders(res, maxRequests, remaining, windowStart + windowMs);

    if (entry.count > effectiveLimit) {
        return blockRequest(res, req, ip, key, windowMs);
    }

    handleConcurrency(req, res, next);
}

function handleSlidingWindow(req, res, next, key, windowMs, maxRequests, burst, ip) {
    const now = Date.now();

    if (!requestCounts.has(key)) {
        requestCounts.set(key, []);
    }

    const timestamps = requestCounts.get(key).filter(ts => now - ts < windowMs);
    timestamps.push(now);
    requestCounts.set(key, timestamps);

    const effectiveLimit = maxRequests + burst;

    setHeaders(res, maxRequests, Math.max(0, effectiveLimit - timestamps.length), Math.ceil((now + windowMs) / 1000));

    if (timestamps.length > effectiveLimit) {
        return blockRequest(res, req, ip, key, windowMs);
    }

    analytics.peakUsage = Math.max(analytics.peakUsage, timestamps.length);

    handleGlobalLimit(req, res, next, now);
}

function handleGlobalLimit(req, res, next, now) {
    globalTimestamps.push(now);
    while (globalTimestamps.length > 0 && globalTimestamps[0] < now - WINDOW_MS) {
        globalTimestamps.shift();
    }
    if (globalTimestamps.length > GLOBAL_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Global rate limit exceeded', retryAfter: Math.ceil(WINDOW_MS / 1000) });
    }
    handleConcurrency(req, res, next);
}

function handleConcurrency(req, res, next) {
    const key = req.correlationId || req.ip;
    const current = activeConcurrent.size;

    if (current >= CONCURRENCY_LIMIT) {
        return res.status(429).json({ error: 'Too many concurrent requests', concurrencyLimit: CONCURRENCY_LIMIT });
    }

    activeConcurrent.set(key, Date.now());
    analytics.peakUsage = Math.max(analytics.peakUsage, current + 1);

    res.on('finish', () => {
        activeConcurrent.delete(key);
    });

    next();
}

function setHeaders(res, limit, remaining, resetTime) {
    const resetUnix = typeof resetTime === 'number' && resetTime > 1e12 ? resetTime : Math.ceil(resetTime / 1000);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetUnix);
    res.setHeader('Retry-After', Math.ceil((resetUnix * 1000 - Date.now()) / 1000));
}

function blockRequest(res, req, ip, key, windowMs) {
    analytics.totalBlocked++;
    analytics.blockedIPs.set(ip, (analytics.blockedIPs.get(ip) || 0) + 1);
    return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
        key: key.slice(0, 50)
    });
}

function getRateLimitStatus(key) {
    const timestamps = requestCounts.get(key);
    if (!timestamps) return { allowed: true, used: 0, remaining: MAX_REQUESTS };
    const now = Date.now();
    const valid = timestamps.filter(ts => now - ts < WINDOW_MS);
    return {
        allowed: valid.length <= MAX_REQUESTS,
        used: valid.length,
        remaining: Math.max(0, MAX_REQUESTS - valid.length),
        resetIn: valid.length > 0 ? WINDOW_MS - (now - valid[0]) : 0
    };
}

function getAnalytics() {
    return {
        totalBlocked: analytics.totalBlocked,
        totalRequests: analytics.totalRequests,
        peakUsage: analytics.peakUsage,
        topBlockedIPs: [...analytics.blockedIPs.entries()]
            .sort((a, b) => b[1] - a[1]).slice(0, 20)
            .map(([ip, count]) => ({ ip, count })),
        activeConcurrent: activeConcurrent.size,
        trackedKeys: requestCounts.size
    };
}

function resetLimit(key) {
    requestCounts.delete(key);
}

function resetAll() {
    requestCounts.clear();
    globalTimestamps.length = 0;
    activeConcurrent.clear();
    analytics.blockedIPs.clear();
    analytics.totalBlocked = 0;
    analytics.peakUsage = 0;
}

const interval = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, timestamps] of requestCounts) {
        if (Array.isArray(timestamps)) {
            const filtered = timestamps.filter(ts => ts > cutoff);
            if (filtered.length === 0) requestCounts.delete(key);
            else requestCounts.set(key, filtered);
        } else if (timestamps && typeof timestamps === 'object') {
            if (timestamps.window && timestamps.window + WINDOW_MS < Date.now()) {
                requestCounts.delete(key);
            }
        }
    }
    for (const [key, time] of activeConcurrent) {
        if (Date.now() - time > 60000) activeConcurrent.delete(key);
    }
}, Math.min(WINDOW_MS, 60000));

rateLimiter.configureTier = configureTier;
rateLimiter.setRedis = setRedis;
rateLimiter.setMode = setMode;
rateLimiter.addWhitelist = addWhitelist;
rateLimiter.removeWhitelist = removeWhitelist;
rateLimiter.addBlacklist = addBlacklist;
rateLimiter.removeBlacklist = removeBlacklist;
rateLimiter.getStatus = getRateLimitStatus;
rateLimiter.getAnalytics = getAnalytics;
rateLimiter.resetLimit = resetLimit;
rateLimiter.resetAll = resetAll;

module.exports = rateLimiter;
