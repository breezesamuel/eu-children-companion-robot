// In-house security helpers.
//
// STATUS (full rationale in docs/SECURITY_AUDIT.md):
//   * corsRestricted   -> ACTIVE (mounted in server.js): allow-list CORS.
//   * securityHeaders  -> SUPERSEDED by helmet (kept for reference/tests only).
//   * bodySizeLimiter / injectionGuard / rateLimitByIp / blockIps / noSniffJson
//         -> NOT MOUNTED anywhere. These were dead code that looked active; body-size
//            limiting is now enforced by express.json({ limit: MAX_BODY_SIZE }).
//   * sanitizeInput / deepSanitize / detectInjection -> utilities only, not mounted.
const logger = require('../utils/logger');

const requestCounts = new Map();
const ipBlacklist = new Set();
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '1mb';

function parseSize(s) {
  const match = String(s).match(/^(\d+)([kKmMgG]?[bB]?)?$/);
  if (!match) return 1024 * 1024;
  const num = parseInt(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  return { b: num, k: num * 1024, m: num * 1024 * 1024, g: num * 1024 * 1024 * 1024 }[unit[0]] || num;
}

const MAX_BYTES = parseSize(MAX_BODY_SIZE);

const SQL_INJECTION_PATTERNS = [
  /(\bSELECT\b.*\bFROM\b)/i, /(\bDROP\b.*\bTABLE\b)/i, /(\bDELETE\b.*\bFROM\b)/i,
  /(\bINSERT\b.*\bINTO\b)/i, /(\bUPDATE\b.*\bSET\b)/i, /(\bUNION\b.*\bSELECT\b)/i,
  /(\bALTER\b.*\bTABLE\b)/i, /(\bCREATE\b.*\bTABLE\b)/i, /(\bEXEC\b|\bEXECUTE\b)/i,
  /(\bLOAD_FILE\b)/i, /(\bINTO\s+OUTFILE\b)/i, /(\bSLEEP\s*\()/i,
  /(\bPG_SLEEP\b)/i, /(\bWAITFOR\s+DELAY\b)/i, /(';.*--)/,
  /(\bOR\s+'1'\s*=\s*'1)/i, /(\bOR\s+1\s*=\s*1)/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i, /javascript\s*:/i, /onerror\s*=/i, /onload\s*=/i,
  /onclick\s*=/i, /onmouseover\s*=/i, /onfocus\s*=/i, /onchange\s*=/i,
  /<iframe[\s>]/i, /<embed[\s>]/i, /<object[\s>]/i, /<svg[\s>]/i,
  /alert\s*\(/i, /eval\s*\(/i, /document\.cookie/i, /window\.location/i,
  /fetch\s*\(/i, /XMLHttpRequest/i,
];

const PATH_TRAVERSAL = /(\.\.\/|\.\.\\)/;

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self "http://localhost:3000"), geolocation=(self), fullscreen=(self)');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",
      "frame-src https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com wss://*.robobuddy.eu",
      "font-src 'self' data:",
      "media-src 'self' blob:",
    ].join('; '));
  }

  next();
}

function corsRestricted(req, res, next) {
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : [];

  const origin = req.headers.origin;

  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    if (origin && allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id, X-Requested-With, Accept, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, X-Correlation-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else {
    logger.warn('CORS blocked origin', { origin, ip: req.ip });
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

function bodySizeLimiter(req, res, next) {
  if (req.headers['content-length']) {
    const len = parseInt(req.headers['content-length']);
    if (len > MAX_BYTES) {
      logger.warn('Request body too large', { size: len, max: MAX_BYTES, ip: req.ip });
      return res.status(413).json({ error: 'Request body too large' });
    }
  }
  next();
}

function sanitizeInput(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>"'&]/g, c =>
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' })[c] || c
    );
  }
  return value;
}

function deepSanitize(obj) {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) result[k] = deepSanitize(v);
    return result;
  }
  return obj;
}

function detectInjection(value) {
  if (typeof value !== 'string') return false;
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) return 'sql';
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) return 'xss';
  }
  if (PATH_TRAVERSAL.test(value)) return 'path-traversal';
  return false;
}

function injectionGuard(req, res, next) {
  const checkValue = (val, path) => {
    if (typeof val === 'string') {
      const threat = detectInjection(val);
      if (threat) {
        logger.warn('Injection attempt blocked', { type: threat, path, ip: req.ip, value: val.substring(0, 100) });
        return true;
      }
    }
    if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        if (checkValue(v, path + '.' + k)) return true;
      }
    }
    return false;
  };

  if (req.body && checkValue(req.body, 'body')) {
    return res.status(400).json({ error: 'Request contains blocked content' });
  }
  if (req.query && checkValue(req.query, 'query')) {
    return res.status(400).json({ error: 'Query contains blocked content' });
  }

  next();
}

function rateLimitByIp(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowKey = Math.floor(now / windowMs);
    const key = ip + ':' + windowKey;

    const count = requestCounts.get(key) || 0;
    if (count >= maxRequests) {
      logger.warn('IP rate limited', { ip, count, max: maxRequests });
      return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil((windowMs - (now % windowMs)) / 1000) });
    }
    requestCounts.set(key, count + 1);

    setTimeout(() => { if (requestCounts.get(key) <= 1) requestCounts.delete(key); }, windowMs);
    next();
  };
}

function blockIps(ipList) {
  ipList.forEach(ip => ipBlacklist.add(ip));
  return (req, res, next) => {
    if (ipBlacklist.has(req.ip)) {
      logger.warn('Blocked IP attempted access', { ip: req.ip });
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

function noSniffJson(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return originalJson(body);
  };
  next();
}

module.exports = {
  securityHeaders, corsRestricted, bodySizeLimiter,
  sanitizeInput, deepSanitize, detectInjection, injectionGuard,
  rateLimitByIp, blockIps, noSniffJson,
};
