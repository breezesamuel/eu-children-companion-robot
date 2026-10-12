const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

const ROLE_HIERARCHY = { admin: 4, school_admin: 3, parent: 2, child: 1, guest: 0 };

const revokedTokens = new Set();
const loginAttempts = new Map();

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name || user.username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (revokedTokens.has(token)) {
    logger.warn('Revoked token used', { ip: req.ip });
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    req.token = token;
    next();
  });
}

function refreshToken(req, res) {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(400).json({ error: 'Refresh token required' });

  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'Refresh token revoked' });
  }

  jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid refresh token' });

    const newAccess = generateAccessToken({ id: decoded.userId, role: decoded.role || 'parent' });
    const newRefresh = generateRefreshToken({ id: decoded.userId });
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  });
}

function revokeToken(req, res) {
  const token = req.body?.token || req.token;
  if (token) revokedTokens.add(token);
  res.json({ success: true, message: 'Token revoked' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] ?? 0));
    if (userLevel < requiredLevel) {
      logger.warn('Role denied', { user: req.user.email, required: roles, actual: req.user.role });
      return res.status(403).json({ error: 'Insufficient permissions', required: roles.join(' or ') });
    }
    next();
  };
}

function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Requires role: ' + roles.join(' or ') });
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
}

function trackLoginAttempt(email, success) {
  const key = email.toLowerCase();
  const records = loginAttempts.get(key) || { count: 0, lockedUntil: null };
  if (success) {
    loginAttempts.delete(key);
    return;
  }
  records.count++;
  if (records.count >= 5) {
    records.lockedUntil = Date.now() + 15 * 60 * 1000;
  }
  loginAttempts.set(key, records);
}

function isLoginLocked(email) {
  const records = loginAttempts.get(email.toLowerCase());
  if (!records || !records.lockedUntil) return false;
  if (Date.now() > records.lockedUntil) {
    loginAttempts.delete(email.toLowerCase());
    return false;
  }
  return true;
}

function getLoginAttempts(email) {
  const records = loginAttempts.get(email.toLowerCase());
  return records ? records.count : 0;
}

module.exports = {
  authenticateToken, requireRole, requireAnyRole, optionalAuth,
  generateAccessToken, generateRefreshToken, refreshToken, revokeToken,
  trackLoginAttempt, isLoginLocked, getLoginAttempts,
  ROLE_HIERARCHY,
};
