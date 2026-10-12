const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../utils/database');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// Reusable request-validation gate. Applied with express-validator chains on the
// highest-risk auth routes so malformed input is rejected before hitting business logic.
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const PASSWORD_MIN_LENGTH = 8;
const LOGIN_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SOCIAL_PROVIDERS = ['google', 'apple', 'facebook'];

// TOTP (RFC 6238) verification via otplib (MIT, actively maintained, OSV-clean).
// This replaces an earlier stub that accepted *any* 6-digit string as a valid
// MFA code. See docs/SECURITY_AUDIT.md (S3).
const otplib = require('otplib');
const { authenticateToken } = require('../middleware/auth');

const MFA_ISSUER = process.env.MFA_ISSUER || 'RobotCare';
// Seconds of clock skew tolerated when checking a TOTP code (±1 time step).
const MFA_EPOCH_TOLERANCE = 30;

function generateTotpSecret() {
    return otplib.generateSecret();
}

function totpKeyUri(email, secret) {
    return otplib.generateURI({
        strategy: 'totp',
        issuer: MFA_ISSUER,
        label: email || 'user',
        secret
    });
}

// Returns true only for a structurally valid, in-window TOTP code.
// otplib throws (TokenLengthError, etc.) on malformed input, so failures are
// caught and treated as invalid rather than letting the request 500.
function verifyTotp(token, secret) {
    if (!token || !secret) return false;
    try {
        const result = otplib.verifySync({
            token: String(token),
            secret,
            epochTolerance: MFA_EPOCH_TOLERANCE
        });
        return !!(result && result.valid === true);
    } catch (e) {
        return false;
    }
}

function parseMfaMethods(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

const loginAttempts = new Map();
const refreshTokens = new Map();

async function verifyPassword(inputPassword, storedHash) {
    // SECURITY: never fall back to a shared/static password.
    // A previous version accepted 'admin123' / 'parent123' / '123456' for ANY account,
    // which was a full authentication bypass. Always verify against the stored hash.
    if (typeof inputPassword !== 'string' || typeof storedHash !== 'string' || !storedHash) {
        return false;
    }
    try {
        return await bcrypt.compare(inputPassword, storedHash);
    } catch (e) {
        logger.warn('Password verification error', { error: e.message });
        return false;
    }
}

function validatePassword(password) {
    const errors = [];
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    return errors;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function generateTokens(user) {
    const accessToken = jwt.sign(
        { userId: user.id, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
    
    const refreshToken = jwt.sign(
        { userId: user.id, role: user.role, type: 'refresh', jti: crypto.randomUUID() },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
}

function isLoginLocked(email) {
    const attempt = loginAttempts.get(email);
    if (!attempt) return false;
    
    if (attempt.lockoutUntil && new Date() < attempt.lockoutUntil) {
        return true;
    }
    
    return false;
}

function recordLoginAttempt(email, success) {
    const attempt = loginAttempts.get(email) || { attempts: 0, lockoutUntil: null };
    
    if (success) {
        loginAttempts.delete(email);
    } else {
        attempt.attempts++;
        if (attempt.attempts >= LOGIN_MAX_ATTEMPTS) {
            attempt.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        }
        loginAttempts.set(email, attempt);
    }
}

router.post('/register', [
    body('email').trim().isEmail().withMessage('Invalid email format'),
    body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('username').trim().notEmpty().withMessage('Username is required'),
], validateRequest, async (req, res) => {
    try {
        const { username, email, password, role = 'parent', first_name, last_name, phone, language = 'en', timezone, acceptTerms = false } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!acceptTerms) {
            return res.status(400).json({ error: 'You must accept the terms of service' });
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: 'Password validation failed', details: passwordErrors });
        }

        let existingUser;
        try {
            existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        } catch (e) {
            existingUser = (db.getTable('users') || []).find(u => u.email === email || u.username === username);
        }

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const user = {
            username,
            email,
            password_hash: passwordHash,
            role,
            first_name: first_name || null,
            last_name: last_name || null,
            phone: phone || null,
            language,
            timezone: timezone || null,
            email_verified: false,
            status: 'active',
            mfa_enabled: false,
            last_login_at: null,
            last_login_ip: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.run(
                'INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, language, timezone, email_verified, status, mfa_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [user.username, user.email, user.password_hash, user.role, user.first_name, user.last_name, user.phone, user.language, user.timezone, user.email_verified, user.status, user.mfa_enabled, user.created_at, user.updated_at]
            );
        } catch (e) {
            if (!db.tables.users) db.tables.users = [];
            if (!db.ids) db.ids = {};
            const newId = (db.ids.users || 0) + 1;
            db.ids.users = newId;
            result = { lastID: newId };
            db.tables.users.push({ id: newId, ...user });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationRecord = {
            user_id: result.lastID,
            token: verificationToken,
            type: 'email_verification',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            used: false,
            created_at: new Date().toISOString()
        };

        try {
            await db.insert('verification_tokens', verificationRecord);
        } catch (e) {
            if (!db.tables.verification_tokens) db.tables.verification_tokens = [];
            db.tables.verification_tokens.push(verificationRecord);
        }

        try {
            await db.insert('gdpr_consents', {
                user_id: result.lastID,
                consent_type: 'terms_of_service',
                granted: acceptTerms,
                granted_at: new Date().toISOString(),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                created_at: new Date().toISOString()
            });

            await db.insert('gdpr_consents', {
                user_id: result.lastID,
                consent_type: 'privacy_policy',
                granted: acceptTerms,
                granted_at: new Date().toISOString(),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                created_at: new Date().toISOString()
            });
        } catch (e) {
            logger.warn('Could not record GDPR consent on registration', { error: e.message });
        }

        const newUser = {
            id: result.lastID,
            username,
            email,
            role,
            first_name,
            last_name,
            email_verified: false,
            mfa_enabled: false
        };

        const { accessToken, refreshToken } = generateTokens(newUser);

        try {
            await db.insert('user_devices', {
                user_id: result.lastID,
                device_id: crypto.randomUUID(),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                is_active: true,
                last_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });
        } catch (e) { /* ignore */ }

        res.status(201).json({
            message: 'User registered successfully. Please verify your email.',
            user: newUser,
            token: accessToken,
            refreshToken,
            // SECURITY: never hand the email-verification token back to the
            // client in production; it is delivered out-of-band (email). Kept in
            // non-production so local flows/tests remain workable.
            ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {})
        });
    } catch (error) {
        console.error('Registration error:', error);
        logger.error('Registration error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
], validateRequest, async (req, res) => {
    try {
        const { email, password, deviceName, rememberMe = false } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (isLoginLocked(email)) {
            return res.status(429).json({
                error: 'Account temporarily locked',
                message: `Too many login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
            });
        }

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.email === email);
        }

        if (!user) {
            recordLoginAttempt(email, false);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ error: 'Account is inactive. Please contact support.' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Account is suspended. Please contact support.' });
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            recordLoginAttempt(email, false);
            const attempt = loginAttempts.get(email);
            return res.status(401).json({
                error: 'Invalid credentials',
                attemptsRemaining: attempt ? LOGIN_MAX_ATTEMPTS - attempt.attempts : LOGIN_MAX_ATTEMPTS
            });
        }

        recordLoginAttempt(email, true);

        if (user.mfa_enabled) {
            const mfaChallenge = crypto.randomBytes(32).toString('hex');
            try {
                await db.insert('mfa_challenges', {
                    user_id: user.id,
                    challenge: mfaChallenge,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    used: false,
                    created_at: new Date().toISOString()
                });
            } catch (e) {
                if (!db.tables.mfa_challenges) db.tables.mfa_challenges = [];
                db.tables.mfa_challenges.push({
                    user_id: user.id,
                    challenge: mfaChallenge,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    used: false,
                    created_at: new Date().toISOString()
                });
            }

            return res.status(202).json({
                message: 'MFA required',
                mfaChallenge,
                mfaMethods: user.mfa_methods ? JSON.parse(user.mfa_methods) : ['totp']
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        try {
            await db.run(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1, login_count = COALESCE(login_count, 0) + 1 WHERE id = $2',
                [req.ip, user.id]
            );
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === user.id);
            if (idx >= 0) {
                db.tables.users[idx].last_login_at = new Date().toISOString();
                db.tables.users[idx].last_login_ip = req.ip;
                db.tables.users[idx].login_count = (db.tables.users[idx].login_count || 0) + 1;
            }
        }

        const deviceId = crypto.randomUUID();
        try {
            await db.insert('user_devices', {
                user_id: user.id,
                device_id: deviceId,
                name: deviceName || 'Unknown Device',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                is_active: true,
                remember_me: rememberMe,
                last_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });
        } catch (e) {
            if (!db.tables.user_devices) db.tables.user_devices = [];
            db.tables.user_devices.push({
                user_id: user.id,
                device_id: deviceId,
                name: deviceName || 'Unknown Device',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                is_active: true,
                remember_me: rememberMe,
                last_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });
        }

        try {
            await db.insert('login_history', {
                user_id: user.id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                device_id: deviceId,
                success: true,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            if (!db.tables.login_history) db.tables.login_history = [];
            db.tables.login_history.push({
                user_id: user.id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                device_id: deviceId,
                success: true,
                created_at: new Date().toISOString()
            });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
                mfa_enabled: user.mfa_enabled,
                language: user.language
            },
            token: accessToken,
            refreshToken,
            deviceId
        });
    } catch (error) {
        console.error('Login error:', error);
        logger.error('Login error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login/mfa', async (req, res) => {
    try {
        const { challenge, code, method = 'totp' } = req.body;
        
        if (!challenge || !code) {
            return res.status(400).json({ error: 'Challenge and code are required' });
        }

        let mfaChallenge;
        try {
            mfaChallenge = await db.queryOne(
                'SELECT * FROM mfa_challenges WHERE challenge = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP',
                [challenge]
            );
        } catch (e) {
            mfaChallenge = (db.getTable('mfa_challenges') || []).find(c =>
                c.challenge === challenge &&
                !c.used &&
                new Date(c.expires_at) > new Date()
            );
        }

        if (!mfaChallenge) {
            return res.status(400).json({ error: 'Invalid or expired MFA challenge' });
        }

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', [mfaChallenge.user_id]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === mfaChallenge.user_id);
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const methods = parseMfaMethods(user.mfa_methods);
        const secret = methods && methods.totp && methods.totp.secret;

        if (!secret || !verifyTotp(code, secret)) {
            return res.status(401).json({ error: 'Invalid MFA code' });
        }

        try {
            await db.run('UPDATE mfa_challenges SET used = true WHERE challenge = $1', [challenge]);
        } catch (e) {
            const idx = (db.tables.mfa_challenges || []).findIndex(c => c.challenge === challenge);
            if (idx >= 0) db.tables.mfa_challenges[idx].used = true;
        }

        const { accessToken, refreshToken } = generateTokens(user);

        res.json({
            message: 'MFA verified successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token: accessToken,
            refreshToken
        });
    } catch (error) {
        logger.error('MFA login error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/social-login', async (req, res) => {
    try {
        const { provider, accessToken, idToken, deviceName } = req.body;
        
        if (!provider || (!accessToken && !idToken)) {
            return res.status(400).json({ error: 'Provider and token are required' });
        }

        if (!SOCIAL_PROVIDERS.includes(provider)) {
            return res.status(400).json({ error: `Invalid provider. Supported: ${SOCIAL_PROVIDERS.join(', ')}` });
        }

        let socialUser;
        try {
            socialUser = await verifySocialToken(provider, accessToken || idToken);
        } catch (e) {
            const status = e && e.status ? e.status : 401;
            return res.status(status).json({ error: e.message || 'Invalid social token' });
        }

        let user;
        try {
            user = await db.get(
                `SELECT u.* FROM users u 
                 JOIN social_connections sc ON u.id = sc.user_id 
                 WHERE sc.provider = $1 AND sc.provider_user_id = $2`,
                [provider, socialUser.id]
            );
        } catch (e) {
            const socialConnections = db.getTable('social_connections') || [];
            const connection = socialConnections.find(c => c.provider === provider && c.provider_user_id === socialUser.id);
            if (connection) {
                user = (db.getTable('users') || []).find(u => u.id === connection.user_id);
            }
        }

        if (!user && socialUser.email) {
            try {
                user = await db.get('SELECT * FROM users WHERE email = ?', [socialUser.email]);
            } catch (e) {
                user = (db.getTable('users') || []).find(u => u.email === socialUser.email);
            }

            if (user) {
                try {
                    await db.insert('social_connections', {
                        user_id: user.id,
                        provider,
                        provider_user_id: socialUser.id,
                        email: socialUser.email,
                        name: socialUser.name,
                        created_at: new Date().toISOString()
                    });
                } catch (e) {
                    if (!db.tables.social_connections) db.tables.social_connections = [];
                    db.tables.social_connections.push({
                        user_id: user.id,
                        provider,
                        provider_user_id: socialUser.id,
                        email: socialUser.email,
                        name: socialUser.name,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }

        if (!user) {
            const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
            const username = socialUser.email?.split('@')[0] || `user_${crypto.randomBytes(8).toString('hex')}`;

            const newUser = {
                username,
                email: socialUser.email || null,
                password_hash: passwordHash,
                role: 'parent',
                first_name: socialUser.givenName || socialUser.first_name || null,
                last_name: socialUser.familyName || socialUser.last_name || null,
                email_verified: socialUser.email_verified || false,
                status: 'active',
                mfa_enabled: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            let result;
            try {
                result = await db.run(
                    'INSERT INTO users (username, email, password_hash, role, first_name, last_name, email_verified, status, mfa_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newUser.username, newUser.email, newUser.password_hash, newUser.role, newUser.first_name, newUser.last_name, newUser.email_verified, newUser.status, newUser.mfa_enabled, newUser.created_at, newUser.updated_at]
                );
            } catch (e) {
                if (!db.tables.users) db.tables.users = [];
                if (!db.ids) db.ids = {};
                const newId = (db.ids.users || 0) + 1;
                db.ids.users = newId;
                result = { lastID: newId };
                db.tables.users.push({ id: newId, ...newUser });
            }

            try {
                await db.insert('social_connections', {
                    user_id: result.lastID,
                    provider,
                    provider_user_id: socialUser.id,
                    email: socialUser.email,
                    name: socialUser.name,
                    created_at: new Date().toISOString()
                });
            } catch (e) {
                if (!db.tables.social_connections) db.tables.social_connections = [];
                db.tables.social_connections.push({
                    user_id: result.lastID,
                    provider,
                    provider_user_id: socialUser.id,
                    email: socialUser.email,
                    name: socialUser.name,
                    created_at: new Date().toISOString()
                });
            }

            user = { id: result.lastID, ...newUser };
        }

        const { accessToken: newAccessToken, refreshToken } = generateTokens(user);

        res.json({
            message: 'Social login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name
            },
            token: newAccessToken,
            refreshToken,
            isNewUser: user.created_at && (Date.now() - new Date(user.created_at).getTime() < 10000)
        });
    } catch (error) {
        logger.error('Social login error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/refresh-token', async (req, res) => {
    try {
        const { token: refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        let device;
        try {
            device = await db.queryOne(
                'SELECT * FROM user_devices WHERE refresh_token_hash = $1 AND is_active = true',
                [tokenHash]
            );
        } catch (e) {
            device = (db.getTable('user_devices') || []).find(d =>
                d.refresh_token_hash === tokenHash && d.is_active
            );
        }

        let user;
        try {
            user = await db.get('SELECT id, username, email, role, status FROM users WHERE id = ?', [decoded.userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === decoded.userId);
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        if (device) {
            const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
            try {
                await db.run(
                    'UPDATE user_devices SET refresh_token_hash = $1, last_seen_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [newTokenHash, device.id]
                );
            } catch (e) {
                const idx = (db.tables.user_devices || []).findIndex(d => d.id === device.id);
                if (idx >= 0) {
                    db.tables.user_devices[idx].refresh_token_hash = newTokenHash;
                    db.tables.user_devices[idx].last_seen_at = new Date().toISOString();
                }
            }
        }

        res.json({
            message: 'Token refreshed',
            token: accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        logger.error('Token refresh error', { error: error.message });
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { deviceId, allDevices = false } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (allDevices) {
            try {
                await db.run('UPDATE user_devices SET is_active = false, refresh_token_hash = NULL WHERE user_id = $1', [userId]);
            } catch (e) {
                const devices = db.tables.user_devices || [];
                devices.forEach(d => {
                    if (d.user_id === userId) {
                        d.is_active = false;
                        d.refresh_token_hash = null;
                    }
                });
            }
        } else if (deviceId) {
            try {
                await db.run(
                    'UPDATE user_devices SET is_active = false, refresh_token_hash = NULL WHERE user_id = $1 AND device_id = $2',
                    [userId, deviceId]
                );
            } catch (e) {
                const idx = (db.tables.user_devices || []).findIndex(d => d.user_id === userId && d.device_id === deviceId);
                if (idx >= 0) {
                    db.tables.user_devices[idx].is_active = false;
                    db.tables.user_devices[idx].refresh_token_hash = null;
                }
            }
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        logger.error('Logout error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/forgot-password', [
    body('email').trim().isEmail().withMessage('Valid email is required'),
], validateRequest, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.email === email);
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

        if (user) {
            const tokenRecord = {
                user_id: user.id,
                token: resetToken,
                type: 'password_reset',
                expires_at: expiresAt.toISOString(),
                used: false,
                created_at: new Date().toISOString()
            };

            try {
                await db.insert('verification_tokens', tokenRecord);
            } catch (e) {
                if (!db.tables.verification_tokens) db.tables.verification_tokens = [];
                db.tables.verification_tokens.push(tokenRecord);
            }

            logger.info('Password reset token generated', { userId: user.id, email });
        }

        const response = {
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        };
        // SECURITY: do not expose the reset token over HTTP in production — it would allow
        // account takeover. Keep it in non-production only, for local testing/automation.
        if (process.env.NODE_ENV !== 'production' && user) {
            response.resetToken = resetToken;
        }
        res.json(response);
    } catch (error) {
        logger.error('Forgot password error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/reset-password', [
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validateRequest, async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: 'Password validation failed', details: passwordErrors });
        }

        let tokenRecord;
        try {
            tokenRecord = await db.queryOne(
                'SELECT * FROM verification_tokens WHERE token = $1 AND type = $2 AND used = false AND expires_at > CURRENT_TIMESTAMP',
                [token, 'password_reset']
            );
        } catch (e) {
            tokenRecord = (db.getTable('verification_tokens') || []).find(t =>
                t.token === token &&
                t.type === 'password_reset' &&
                !t.used &&
                new Date(t.expires_at) > new Date()
            );
        }

        if (!tokenRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            await db.run('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, tokenRecord.user_id]);
            await db.run('UPDATE verification_tokens SET used = true WHERE token = $1', [token]);
        } catch (e) {
            const userIdx = (db.tables.users || []).findIndex(u => u.id === tokenRecord.user_id);
            if (userIdx >= 0) {
                db.tables.users[userIdx].password_hash = passwordHash;
                db.tables.users[userIdx].updated_at = new Date().toISOString();
            }
            const tokenIdx = (db.tables.verification_tokens || []).findIndex(t => t.token === token);
            if (tokenIdx >= 0) {
                db.tables.verification_tokens[tokenIdx].used = true;
            }
        }

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Reset password error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        let tokenRecord;
        try {
            tokenRecord = await db.queryOne(
                'SELECT * FROM verification_tokens WHERE token = $1 AND type = $2 AND used = false AND expires_at > CURRENT_TIMESTAMP',
                [token, 'email_verification']
            );
        } catch (e) {
            tokenRecord = (db.getTable('verification_tokens') || []).find(t =>
                t.token === token &&
                t.type === 'email_verification' &&
                !t.used &&
                new Date(t.expires_at) > new Date()
            );
        }

        if (!tokenRecord) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        try {
            await db.run('UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [tokenRecord.user_id]);
            await db.run('UPDATE verification_tokens SET used = true WHERE token = $1', [token]);
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === tokenRecord.user_id);
            if (idx >= 0) {
                db.tables.users[idx].email_verified = true;
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
            const tokenIdx = (db.tables.verification_tokens || []).findIndex(t => t.token === token);
            if (tokenIdx >= 0) {
                db.tables.verification_tokens[tokenIdx].used = true;
            }
        }

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        logger.error('Verify email error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/resend-verification', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationRecord = {
            user_id: userId,
            token: verificationToken,
            type: 'email_verification',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            used: false,
            created_at: new Date().toISOString()
        };

        try {
            await db.insert('verification_tokens', verificationRecord);
        } catch (e) {
            if (!db.tables.verification_tokens) db.tables.verification_tokens = [];
            db.tables.verification_tokens.push(verificationRecord);
        }

        res.json({
            success: true,
            message: 'Verification email sent',
            // SECURITY: do not expose the token in production (see /register).
            ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {})
        });
    } catch (error) {
        logger.error('Resend verification error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/mfa/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { method = 'totp' } = req.body;
        if (method !== 'totp') {
            return res.status(400).json({ error: 'Unsupported MFA method' });
        }

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate a real base32 TOTP secret. MFA is intentionally NOT enabled
        // yet: the account is only protected once the user proves possession of
        // the secret via POST /mfa/verify. This avoids locking a user out with a
        // mistyped/never-scanned secret.
        const secret = generateTotpSecret();
        const otpAuth = totpKeyUri(user.email, secret);
        const mfaMethods = { totp: { enabled: false, pending: true, secret } };

        try {
            await db.run(
                'UPDATE users SET mfa_methods = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [JSON.stringify(mfaMethods), userId]
            );
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx].mfa_methods = JSON.stringify(mfaMethods);
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
        }

        res.json({
            success: true,
            data: {
                method,
                secret,
                otpAuth,
                // No third-party QR service: the client renders the QR locally
                // from otpAuth. The shared secret must never leave the device.
                qrCodeUrl: null
            }
        });
    } catch (error) {
        logger.error('MFA setup error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/mfa/verify', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        if (!code) return res.status(400).json({ error: 'Code required' });

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }
        if (!user) return res.status(404).json({ error: 'User not found' });

        const methods = parseMfaMethods(user.mfa_methods);
        const secret = methods && methods.totp && methods.totp.secret;

        if (!secret) {
            return res.status(400).json({ error: 'MFA has not been set up' });
        }

        if (!verifyTotp(code, secret)) {
            return res.status(401).json({ error: 'Invalid verification code' });
        }

        // The code checked out, so the secret is confirmed: enable MFA now.
        const confirmed = { totp: { enabled: true, pending: false, secret } };
        try {
            await db.run(
                'UPDATE users SET mfa_enabled = true, mfa_methods = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [JSON.stringify(confirmed), userId]
            );
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx].mfa_enabled = true;
                db.tables.users[idx].mfa_methods = JSON.stringify(confirmed);
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
        }

        res.json({ success: true, message: 'MFA enabled' });
    } catch (error) {
        logger.error('MFA verify error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        try {
            await db.run(
                'UPDATE users SET mfa_enabled = false, mfa_methods = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [userId]
            );
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx].mfa_enabled = false;
                db.tables.users[idx].mfa_methods = null;
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
        }

        res.json({ success: true, message: 'MFA disabled' });
    } catch (error) {
        logger.error('MFA disable error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/devices', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let devices;
        try {
            devices = await db.query(
                'SELECT * FROM user_devices WHERE user_id = $1 ORDER BY last_seen_at DESC',
                [userId]
            );
        } catch (e) {
            devices = (db.getTable('user_devices') || [])
                .filter(d => d.user_id === userId)
                .sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at));
        }

        res.json({ success: true, data: devices });
    } catch (error) {
        logger.error('Get devices error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/devices/:deviceId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        try {
            await db.run(
                'DELETE FROM user_devices WHERE user_id = $1 AND device_id = $2',
                [userId, req.params.deviceId]
            );
        } catch (e) {
            if (db.tables.user_devices) {
                db.tables.user_devices = db.tables.user_devices.filter(
                    d => !(d.user_id === userId && d.device_id === req.params.deviceId)
                );
            }
        }

        res.json({ success: true, message: 'Device removed' });
    } catch (error) {
        logger.error('Remove device error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/login-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { limit = 50, offset = 0 } = req.query;

        let history;
        try {
            history = await db.query(
                'SELECT * FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, parseInt(limit), parseInt(offset)]
            );
        } catch (e) {
            history = (db.getTable('login_history') || [])
                .filter(h => h.user_id === userId)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        res.json({
            success: true,
            data: history,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Get login history error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { first_name, last_name, phone, language, timezone } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (phone !== undefined) updates.phone = phone;
        if (language) updates.language = language;
        if (timezone) updates.timezone = timezone;

        try {
            await db.update('users', updates, { id: userId });
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx] = { ...db.tables.users[idx], ...updates };
            }
        }

        let user;
        try {
            user = await db.get('SELECT id, username, email, role, first_name, last_name, phone, language, timezone, email_verified, mfa_enabled FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }

        res.json({ success: true, data: user });
    } catch (error) {
        logger.error('Update profile error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/change-password', authenticateToken, [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    body('newPassword').isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], validateRequest, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }

        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValidCurrent = await verifyPassword(currentPassword, user.password_hash);
        if (!isValidCurrent) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: 'New password validation failed', details: passwordErrors });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        try {
            await db.run('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, userId]);
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx].password_hash = newPasswordHash;
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
        }

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change password error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/deactivate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { reason, confirm } = req.body;
        if (!confirm || confirm !== 'I understand') {
            return res.status(400).json({ error: 'Please confirm account deactivation' });
        }

        try {
            await db.run(
                'UPDATE users SET status = $1, deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                ['inactive', reason || null, userId]
            );
        } catch (e) {
            const idx = (db.tables.users || []).findIndex(u => u.id === userId);
            if (idx >= 0) {
                db.tables.users[idx].status = 'inactive';
                db.tables.users[idx].deactivated_at = new Date().toISOString();
                db.tables.users[idx].deactivation_reason = reason || null;
                db.tables.users[idx].updated_at = new Date().toISOString();
            }
        }

        try {
            await db.run('UPDATE user_devices SET is_active = false WHERE user_id = $1', [userId]);
        } catch (e) {
            const devices = db.tables.user_devices || [];
            devices.forEach(d => {
                if (d.user_id === userId) {
                    d.is_active = false;
                }
            });
        }

        res.json({ success: true, message: 'Account deactivated successfully' });
    } catch (error) {
        logger.error('Deactivate account error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let user;
        try {
            user = await db.get('SELECT id, username, email, role, first_name, last_name, phone, language, timezone, email_verified, mfa_enabled, status, created_at FROM users WHERE id = ?', [userId]);
        } catch (e) {
            user = (db.getTable('users') || []).find(u => u.id === userId);
        }

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, data: user });
    } catch (error) {
        logger.error('Get current user error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            jwtExpiresIn: JWT_EXPIRES_IN,
            refreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
            socialProviders: SOCIAL_PROVIDERS,
            passwordMinLength: PASSWORD_MIN_LENGTH,
            loginMaxAttempts: LOGIN_MAX_ATTEMPTS,
            lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES
        }
    });
});

/**
 * Social login token verification.
 *
 * SECURITY: the previous implementation was a STUB that returned a fabricated
 * identity for ANY token, which let anyone create/log into accounts with no
 * verification at all. It now performs real verification against the provider's
 * official endpoint and FAILS CLOSED: if a provider is not configured, or the
 * token is invalid, the request is rejected. An identity is never fabricated.
 *
 * Configuration (env):
 *   GOOGLE_CLIENT_ID     - enables Google ID-token verification (audience check)
 *   FACEBOOK_APP_TOKEN   - "<app_id>|<app_secret>" enables Facebook verification
 * Apple (sign-in with Apple) is not implemented yet and always fails closed.
 */
async function fetchJson(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        const text = await response.text();
        let data = null;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }
        return { ok: response.ok, status: response.status, data };
    } finally {
        clearTimeout(timer);
    }
}

function httpError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

const SOCIAL_VERIFIERS = {
    async google(token) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) throw httpError('Google login is not configured', 501);

        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
        const { ok, data } = await fetchJson(url);
        const p = ok && data ? data : null;
        if (!p || !p.sub) throw httpError('Invalid Google token', 401);
        if (p.aud && p.aud !== clientId) throw httpError('Google token audience mismatch', 401);
        if (p.email_verified === 'false' || p.email_verified === false) {
            throw httpError('Google email not verified', 401);
        }
        return {
            id: String(p.sub),
            email: p.email || null,
            name: p.name || null,
            givenName: p.given_name || null,
            familyName: p.family_name || null,
            email_verified: p.email_verified === 'true' || p.email_verified === true
        };
    },

    async facebook(token) {
        const appToken = process.env.FACEBOOK_APP_TOKEN;
        if (!appToken) throw httpError('Facebook login is not configured', 501);

        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`;
        const debug = await fetchJson(debugUrl);
        const info = debug.data && debug.data.data ? debug.data.data : null;
        if (!info || info.is_valid !== true) throw httpError('Invalid Facebook token', 401);

        const meUrl = `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name&access_token=${encodeURIComponent(token)}`;
        const me = await fetchJson(meUrl);
        const p = me.ok && me.data ? me.data : null;
        if (!p || !p.id) throw httpError('Invalid Facebook token', 401);
        return {
            id: String(p.id),
            email: p.email || null,
            name: p.name || null,
            givenName: p.first_name || null,
            familyName: p.last_name || null,
            email_verified: true
        };
    },

    async apple() {
        // Sign-in with Apple requires verifying a JWT against Apple's rotating
        // public keys; until that is implemented we refuse rather than guess.
        throw httpError('Apple login is not configured', 501);
    }
};

async function verifySocialToken(provider, token) {
    const verifier = SOCIAL_VERIFIERS[provider];
    if (!verifier) throw httpError('Unsupported provider', 400);
    if (!token) throw httpError('Social token is required', 400);
    return verifier(String(token));
}

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
