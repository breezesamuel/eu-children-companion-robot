'use strict';

// Thin, project-standard wrapper around express-rate-limit (MIT).
//
// Regression note: this file used to be a silent no-op — `(req, res, next) => next()` —
// so every caller (e.g. backend/api/v1/video-call.js) believed it was rate limited
// but was not. It now returns a real limiter.
const rateLimit = require('express-rate-limit');

module.exports = function rateLimitMiddleware(opts = {}) {
  const cfg = Object.assign({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  }, opts);

  // Accept the legacy `max` option from older callers (express-rate-limit renamed it to `limit`).
  if (opts.max && !opts.limit) cfg.limit = opts.max;
  delete cfg.max;

  return rateLimit(cfg);
};
