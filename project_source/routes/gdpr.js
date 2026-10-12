const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

const CONSENT_TYPES = [
    'registration',
    'marketing',
    'analytics',
    'personalization',
    'third_party_sharing',
    'cookie_essential',
    'cookie_functional',
    'cookie_analytics',
    'cookie_marketing',
    'terms_of_service',
    'privacy_policy'
];

const DATA_CATEGORIES = [
    'profile',
    'children',
    'usage_history',
    'chat_history',
    'location',
    'preferences',
    'payment_info',
    'device_info'
];

function isPostgres() {
    return process.env.DATABASE_URL && require('../utils/postgres').isConnected();
}

async function ensureGdprTables() {
    const pg = require('../utils/postgres');
    try {
        await pg.exec(`
            CREATE TABLE IF NOT EXISTS gdpr_consents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                consent_type VARCHAR(50) NOT NULL,
                granted BOOLEAN DEFAULT false,
                granted_at TIMESTAMP,
                revoked_at TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                privacy_policy_version VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pg.exec(`
            CREATE TABLE IF NOT EXISTS data_access_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                request_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                data_categories JSONB,
                format VARCHAR(10) DEFAULT 'json',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                download_url TEXT,
                expiry_at TIMESTAMP,
                notes TEXT
            )
        `);

        await pg.exec(`
            CREATE TABLE IF NOT EXISTS data_processing_records (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                processing_activity VARCHAR(100) NOT NULL,
                data_category VARCHAR(50),
                purpose VARCHAR(255),
                legal_basis VARCHAR(50),
                recipient VARCHAR(100),
                retention_period VARCHAR(50),
                security_measures TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pg.exec(`
            CREATE TABLE IF NOT EXISTS cookie_consent_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                session_id VARCHAR(100),
                consent_banner_version VARCHAR(20),
                preferences JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pg.exec(`
            CREATE TABLE IF NOT EXISTS deleted_users_audit (
                id SERIAL PRIMARY KEY,
                original_user_id INTEGER NOT NULL,
                username VARCHAR(100),
                email VARCHAR(255),
                deletion_reason TEXT,
                deletion_type VARCHAR(20) DEFAULT 'user_requested',
                scheduled_deletion_at TIMESTAMP,
                completed_at TIMESTAMP,
                data_erased BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        logger.warn('Could not ensure GDPR tables', { error: e.message });
    }
}

router.post('/consent', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { consent_type, granted, privacy_policy_version } = req.body;
        if (!consent_type) {
            return res.status(400).json({ error: 'consent_type is required' });
        }

        if (!CONSENT_TYPES.includes(consent_type)) {
            return res.status(400).json({ error: `Invalid consent type. Must be one of: ${CONSENT_TYPES.join(', ')}` });
        }

        const consent = {
            user_id: userId,
            consent_type,
            granted: !!granted,
            granted_at: granted ? new Date().toISOString() : null,
            revoked_at: granted ? null : new Date().toISOString(),
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || '',
            privacy_policy_version: privacy_policy_version || '1.0.0',
            created_at: new Date().toISOString()
        };

        if (isPostgres()) {
            await ensureGdprTables();
            if (granted) {
                await db.run(
                    `INSERT INTO gdpr_consents (user_id, consent_type, granted, granted_at, ip_address, user_agent, privacy_policy_version, created_at)
                     VALUES ($1, $2, true, CURRENT_TIMESTAMP, $3, $4, $5, CURRENT_TIMESTAMP)`,
                    [userId, consent_type, req.ip, req.headers['user-agent'] || '', privacy_policy_version || '1.0.0']
                );
            } else {
                await db.run(
                    `INSERT INTO gdpr_consents (user_id, consent_type, granted, revoked_at, ip_address, user_agent, privacy_policy_version, created_at)
                     VALUES ($1, $2, false, CURRENT_TIMESTAMP, $3, $4, $5, CURRENT_TIMESTAMP)`,
                    [userId, consent_type, req.ip, req.headers['user-agent'] || '', privacy_policy_version || '1.0.0']
                );
            }
        } else {
            const table = db.getTable('gdpr_consents');
            if (!table) {
                db.getTable = () => [];
                db.tables = db.tables || {};
                db.tables.gdpr_consents = [];
            }
            await db.insert('gdpr_consents', consent);
        }

        await recordProcessingActivity(
            userId,
            'consent_update',
            'profile',
            'To record consent preferences',
            'consent',
            null,
            '1 year'
        );

        res.json({ success: true, message: 'Consent recorded', data: consent });
    } catch (error) {
        console.error('GDPR consent error:', error);
        logger.error('GDPR consent error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/consent/batch', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { consents, privacy_policy_version } = req.body;
        if (!consents || !Array.isArray(consents)) {
            return res.status(400).json({ error: 'consents array is required' });
        }

        const results = [];
        for (const consentItem of consents) {
            const { consent_type, granted } = consentItem;
            
            if (!CONSENT_TYPES.includes(consent_type)) {
                results.push({ consent_type, success: false, error: 'Invalid consent type' });
                continue;
            }

            const consent = {
                user_id: userId,
                consent_type,
                granted: !!granted,
                granted_at: granted ? new Date().toISOString() : null,
                revoked_at: granted ? null : new Date().toISOString(),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || '',
                privacy_policy_version: privacy_policy_version || '1.0.0',
                created_at: new Date().toISOString()
            };

            try {
                await db.insert('gdpr_consents', consent);
                results.push({ consent_type, success: true, granted });
            } catch (e) {
                if (!db.tables.gdpr_consents) db.tables.gdpr_consents = [];
                db.tables.gdpr_consents.push(consent);
                results.push({ consent_type, success: true, granted });
            }
        }

        res.json({ 
            success: true, 
            message: 'Batch consent processed',
            data: { 
                total: consents.length, 
                successful: results.filter(r => r.success).length,
                results 
            }
        });
    } catch (error) {
        logger.error('Batch consent error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/consent', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let consents;
        if (isPostgres()) {
            consents = await db.all(
                'SELECT * FROM gdpr_consents WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
        } else {
            const table = db.getTable('gdpr_consents') || [];
            consents = table.filter(c => c.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        const latestConsents = {};
        consents.forEach(c => {
            if (!latestConsents[c.consent_type] || 
                new Date(c.created_at) > new Date(latestConsents[c.consent_type].created_at)) {
                latestConsents[c.consent_type] = c;
            }
        });

        const consentSummary = CONSENT_TYPES.map(type => ({
            type,
            granted: latestConsents[type]?.granted || false,
            lastUpdated: latestConsents[type]?.created_at || null,
            version: latestConsents[type]?.privacy_policy_version || null
        }));

        res.json({ 
            success: true, 
            data: {
                all: consents,
                latest: latestConsents,
                summary: consentSummary
            }
        });
    } catch (error) {
        console.error('GDPR consent query error:', error);
        logger.error('GDPR consent query error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/consent/history', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { consent_type, limit = 100, offset = 0 } = req.query;

        let consents;
        try {
            let query = 'SELECT * FROM gdpr_consents WHERE user_id = $1';
            const params = [userId];
            let paramIndex = 2;

            if (consent_type) {
                query += ` AND consent_type = $${paramIndex++}`;
                params.push(consent_type);
            }

            query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
            params.push(parseInt(limit), parseInt(offset));

            consents = await db.query(query, params);
        } catch (e) {
            consents = (db.getTable('gdpr_consents') || [])
                .filter(c => c.user_id === userId)
                .filter(c => !consent_type || c.consent_type === consent_type)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        res.json({ 
            success: true, 
            data: consents,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Consent history error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/data-access-request', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { request_type, data_categories, format = 'json', notes } = req.body;

        const validTypes = ['access', 'portability'];
        if (!request_type || !validTypes.includes(request_type)) {
            return res.status(400).json({ error: `Invalid request type. Must be one of: ${validTypes.join(', ')}` });
        }

        if (data_categories && !Array.isArray(data_categories)) {
            return res.status(400).json({ error: 'data_categories must be an array' });
        }

        const invalidCategories = data_categories?.filter(c => !DATA_CATEGORIES.includes(c));
        if (invalidCategories?.length > 0) {
            return res.status(400).json({ error: `Invalid data categories: ${invalidCategories.join(', ')}` });
        }

        const request = {
            user_id: userId,
            request_type,
            data_categories: data_categories ? JSON.stringify(data_categories) : null,
            format: format || 'json',
            status: 'pending',
            notes: notes || null,
            requested_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('data_access_requests', request);
        } catch (e) {
            if (!db.tables.data_access_requests) db.tables.data_access_requests = [];
            if (!db.ids) db.ids = {};
            const newId = (db.ids.data_access_requests || 0) + 1;
            db.ids.data_access_requests = newId;
            result = { insertId: newId };
            db.tables.data_access_requests.push({ id: newId, ...request });
        }

        await recordProcessingActivity(
            userId,
            'data_access_request',
            data_categories?.[0] || 'profile',
            'To fulfill data subject access request',
            'legal_obligation',
            null,
            '1 month'
        );

        res.status(201).json({
            success: true,
            message: 'Data access request submitted (GDPR Art. 15 / Art. 20)',
            data: {
                id: result.insertId,
                ...request,
                estimatedCompletion: 'Within 1 month',
                data_categories
            }
        });
    } catch (error) {
        logger.error('Data access request error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/data-access-requests', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { status, limit = 50, offset = 0 } = req.query;

        let requests;
        try {
            let query = 'SELECT * FROM data_access_requests WHERE user_id = $1';
            const params = [userId];
            let paramIndex = 2;

            if (status) {
                query += ` AND status = $${paramIndex++}`;
                params.push(status);
            }

            query += ' ORDER BY requested_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
            params.push(parseInt(limit), parseInt(offset));

            requests = await db.query(query, params);
        } catch (e) {
            requests = (db.getTable('data_access_requests') || [])
                .filter(r => r.user_id === userId)
                .filter(r => !status || r.status === status)
                .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        const requestsWithParsedData = requests.map(r => ({
            ...r,
            data_categories: r.data_categories ? JSON.parse(r.data_categories) : null
        }));

        res.json({
            success: true,
            data: requestsWithParsedData,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Get data access requests error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/export', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { categories, format = 'json', includeMetadata = false } = req.body;

        const requestedCategories = categories || DATA_CATEGORIES;

        const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
        const children = await db.all('SELECT * FROM children WHERE parent_id = $1', [userId]);
        
        let consents = [];
        try {
            consents = await db.all('SELECT * FROM gdpr_consents WHERE user_id = $1', [userId]);
        } catch (e) {
            consents = (db.getTable('gdpr_consents') || []).filter(c => c.user_id === userId);
        }

        let chatSessions = [];
        try {
            chatSessions = await db.all('SELECT * FROM chat_sessions WHERE user_id = $1', [userId]);
        } catch (e) {
            chatSessions = (db.getTable('chat_sessions') || []).filter(s => s.user_id === userId);
        }

        let chatMessages = [];
        try {
            chatMessages = await db.all(
                `SELECT cm.* FROM chat_messages cm 
                 JOIN chat_sessions cs ON cm.session_id = cs.id 
                 WHERE cs.user_id = $1`,
                [userId]
            );
        } catch (e) {
            chatMessages = (db.getTable('chat_messages') || []).filter(m => {
                const sessions = db.getTable('chat_sessions') || [];
                const session = sessions.find(s => s.id === m.session_id);
                return session && session.user_id === userId;
            });
        }

        let orders = [];
        try {
            orders = await db.all('SELECT * FROM orders WHERE user_id = $1', [userId]);
        } catch (e) {
            orders = (db.getTable('orders') || []).filter(o => o.user_id === userId);
        }

        let subscriptions = [];
        try {
            subscriptions = await db.all('SELECT * FROM user_subscriptions WHERE user_id = $1', [userId]);
        } catch (e) {
            subscriptions = (db.getTable('user_subscriptions') || []).filter(s => s.user_id === userId);
        }

        let devices = [];
        try {
            devices = await db.all('SELECT * FROM user_devices WHERE user_id = $1', [userId]);
        } catch (e) {
            devices = (db.getTable('user_devices') || []).filter(d => d.user_id === userId);
        }

        const exportData = {
            exported_at: new Date().toISOString(),
            export_id: crypto.randomUUID(),
            format: format || 'json',
            gdpr_reference: 'Art. 20 - Right to Data Portability',
            data: {}
        };

        if (requestedCategories.includes('profile') && user) {
            exportData.data.profile = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                language: user.language,
                timezone: user.timezone,
                email_verified: user.email_verified,
                mfa_enabled: user.mfa_enabled,
                status: user.status,
                last_login_at: user.last_login_at,
                created_at: user.created_at
            };
        }

        if (requestedCategories.includes('children') && children.length > 0) {
            exportData.data.children = children.map(c => ({
                id: c.id,
                name: c.name,
                birth_date: c.birth_date,
                age_group: c.age_group,
                avatar_url: c.avatar_url,
                preferences: c.preferences ? JSON.parse(c.preferences) : null,
                created_at: c.created_at
            }));
        }

        if (requestedCategories.includes('chat_history')) {
            exportData.data.chatHistory = {
                sessions: chatSessions,
                messages: chatMessages.map(m => ({
                    ...m,
                    metadata: m.metadata ? JSON.parse(m.metadata) : null
                }))
            };
        }

        if (requestedCategories.includes('consents')) {
            exportData.data.consents = consents;
        }

        if (requestedCategories.includes('payment_info')) {
            exportData.data.paymentInfo = {
                orders: orders.map(o => ({
                    ...o,
                    items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
                })),
                subscriptions: subscriptions.map(s => ({
                    ...s,
                    metadata: s.metadata ? JSON.parse(s.metadata) : null
                }))
            };
        }

        if (requestedCategories.includes('device_info')) {
            exportData.data.devices = devices;
        }

        if (includeMetadata) {
            exportData.metadata = {
                data_categories_requested: requestedCategories,
                data_categories_included: Object.keys(exportData.data),
                request_ip: req.ip,
                request_user_agent: req.headers['user-agent']
            };
        }

        await recordProcessingActivity(
            userId,
            'data_export',
            'profile',
            'To fulfill data portability request',
            'legal_obligation',
            null,
            '1 month'
        );

        res.json({
            success: true,
            message: 'Data export ready (GDPR Art. 20 - Right to Data Portability)',
            data: exportData,
            checksum: crypto.createHash('sha256').update(JSON.stringify(exportData)).digest('hex')
        });
    } catch (error) {
        console.error('GDPR export error:', error);
        logger.error('GDPR export error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/delete', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { reason, scheduled_days, confirm_deletion } = req.body;

        if (!confirm_deletion || confirm_deletion !== 'I understand this action is permanent') {
            return res.status(400).json({ 
                error: 'Please confirm deletion with the required statement',
                required_confirmation: 'I understand this action is permanent'
            });
        }

        const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const scheduledDays = scheduled_days ? parseInt(scheduled_days) : 0;
        const scheduledDeletionAt = scheduledDays > 0 
            ? new Date(Date.now() + scheduledDays * 24 * 60 * 60 * 1000)
            : null;

        const deletionType = scheduledDays > 0 ? 'scheduled' : 'immediate';

        const auditRecord = {
            original_user_id: userId,
            username: user.username,
            email: user.email,
            deletion_reason: reason || 'User requested deletion (GDPR Art. 17)',
            deletion_type: deletionType,
            scheduled_deletion_at: scheduledDeletionAt?.toISOString() || null,
            data_erased: false,
            created_at: new Date().toISOString()
        };

        try {
            await db.insert('deleted_users_audit', auditRecord);
        } catch (e) {
            if (!db.tables.deleted_users_audit) db.tables.deleted_users_audit = [];
            db.tables.deleted_users_audit.push({
                id: (db.ids?.deleted_users_audit || 0) + 1,
                ...auditRecord
            });
            if (!db.ids) db.ids = {};
            db.ids.deleted_users_audit = (db.ids.deleted_users_audit || 0) + 1;
        }

        if (isPostgres()) {
            await ensureGdprTables();
            await db.run(
                `INSERT INTO deleted_users_audit (original_user_id, username, email, deletion_reason, deletion_type, scheduled_deletion_at, data_erased, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, false, CURRENT_TIMESTAMP)`,
                [userId, user.username, user.email, reason || 'User requested deletion (GDPR Art. 17)', deletionType, scheduledDeletionAt?.toISOString() || null]
            );

            if (scheduledDays === 0) {
                await db.run('DELETE FROM gdpr_consents WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM children WHERE parent_id = $1', [userId]);
                await db.run('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM user_devices WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM login_history WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM notifications WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM alerts WHERE user_id = $1', [userId]);
                await db.run('DELETE FROM users WHERE id = $1', [userId]);

                await db.run('UPDATE deleted_users_audit SET data_erased = true, completed_at = CURRENT_TIMESTAMP WHERE original_user_id = $1', [userId]);
            }
        } else {
            if (scheduledDays === 0) {
                if (db.tables.gdpr_consents) {
                    db.tables.gdpr_consents = db.tables.gdpr_consents.filter(c => c.user_id !== userId);
                }
                if (db.tables.children) {
                    db.tables.children = db.tables.children.filter(c => c.parent_id !== userId);
                }
                if (db.tables.chat_messages) {
                    db.tables.chat_messages = db.tables.chat_messages.filter(m => m.user_id !== userId);
                }
                if (db.tables.chat_sessions) {
                    db.tables.chat_sessions = db.tables.chat_sessions.filter(s => s.user_id !== userId);
                }
                if (db.tables.user_devices) {
                    db.tables.user_devices = db.tables.user_devices.filter(d => d.user_id !== userId);
                }
                if (db.tables.login_history) {
                    db.tables.login_history = db.tables.login_history.filter(h => h.user_id !== userId);
                }
                if (db.tables.notifications) {
                    db.tables.notifications = db.tables.notifications.filter(n => n.user_id !== userId);
                }
                if (db.tables.alerts) {
                    db.tables.alerts = db.tables.alerts.filter(a => a.user_id !== userId);
                }
                if (db.tables.users) {
                    db.tables.users = db.tables.users.filter(u => u.id !== userId);
                }

                const auditIdx = (db.tables.deleted_users_audit || []).findIndex(
                    a => a.original_user_id === userId && a.created_at === auditRecord.created_at
                );
                if (auditIdx >= 0) {
                    db.tables.deleted_users_audit[auditIdx].data_erased = true;
                    db.tables.deleted_users_audit[auditIdx].completed_at = new Date().toISOString();
                }
            }
        }

        await recordProcessingActivity(
            userId,
            'data_deletion',
            'profile',
            'To fulfill right to erasure request',
            'legal_obligation',
            null,
            '7 years (for audit purposes only)'
        );

        res.json({
            success: true,
            message: scheduledDays > 0 
                ? `Account scheduled for deletion in ${scheduledDays} days (GDPR Art. 17 - Right to Erasure)`
                : 'Account deleted (GDPR Art. 17 - Right to Erasure)',
            data: {
                deletionType,
                scheduledDeletionAt: scheduledDeletionAt?.toISOString() || null,
                auditRecord: auditRecord
            }
        });
    } catch (error) {
        console.error('GDPR deletion error:', error);
        logger.error('GDPR deletion error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/delete/cancel', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let pendingAudit;
        try {
            pendingAudit = await db.queryOne(
                `SELECT * FROM deleted_users_audit 
                 WHERE original_user_id = $1 
                 AND data_erased = false 
                 AND scheduled_deletion_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC LIMIT 1`,
                [userId]
            );
        } catch (e) {
            pendingAudit = (db.tables.deleted_users_audit || [])
                .filter(a => 
                    a.original_user_id === userId && 
                    !a.data_erased &&
                    a.scheduled_deletion_at &&
                    new Date(a.scheduled_deletion_at) > new Date()
                )
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        }

        if (!pendingAudit) {
            return res.status(404).json({ error: 'No pending deletion found' });
        }

        try {
            await db.run('UPDATE deleted_users_audit SET data_erased = true, completed_at = CURRENT_TIMESTAMP WHERE id = $1', [pendingAudit.id]);
        } catch (e) {
            const idx = (db.tables.deleted_users_audit || []).findIndex(a => a.id === pendingAudit.id);
            if (idx >= 0) {
                db.tables.deleted_users_audit[idx].data_erased = true;
                db.tables.deleted_users_audit[idx].completed_at = new Date().toISOString();
                db.tables.deleted_users_audit[idx].deletion_type = 'cancelled';
            }
        }

        res.json({
            success: true,
            message: 'Account deletion cancelled successfully',
            data: {
                cancelledAt: new Date().toISOString(),
                originalScheduledDate: pendingAudit.scheduled_deletion_at
            }
        });
    } catch (error) {
        logger.error('Cancel deletion error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rectification', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data_category, field, current_value, corrected_value, reason, supporting_evidence } = req.body;

        if (!data_category || !field || corrected_value === undefined) {
            return res.status(400).json({ error: 'data_category, field, and corrected_value are required' });
        }

        if (!DATA_CATEGORIES.includes(data_category)) {
            return res.status(400).json({ error: `Invalid data category. Must be one of: ${DATA_CATEGORIES.join(', ')}` });
        }

        const rectificationRequest = {
            user_id: userId,
            data_category,
            field,
            current_value: current_value || null,
            corrected_value: JSON.stringify(corrected_value),
            reason: reason || null,
            supporting_evidence: supporting_evidence || null,
            status: 'pending',
            requested_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('data_rectification_requests', rectificationRequest);
        } catch (e) {
            if (!db.tables.data_rectification_requests) db.tables.data_rectification_requests = [];
            result = { insertId: (db.ids?.data_rectification_requests || 0) + 1 };
            if (!db.ids) db.ids = {};
            db.ids.data_rectification_requests = result.insertId;
            db.tables.data_rectification_requests.push({ id: result.insertId, ...rectificationRequest });
        }

        await recordProcessingActivity(
            userId,
            'data_rectification_request',
            data_category,
            'To fulfill right to rectification request',
            'legal_obligation',
            null,
            '1 month'
        );

        res.status(201).json({
            success: true,
            message: 'Data rectification request submitted (GDPR Art. 16)',
            data: {
                id: result.insertId,
                ...rectificationRequest,
                corrected_value
            }
        });
    } catch (error) {
        logger.error('Rectification request error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/restrict-processing', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { processing_activity, reason, start_date, end_date } = req.body;

        if (!processing_activity) {
            return res.status(400).json({ error: 'processing_activity is required' });
        }

        const restriction = {
            user_id: userId,
            processing_activity,
            reason: reason || null,
            start_date: start_date || new Date().toISOString(),
            end_date: end_date || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('processing_restrictions', restriction);
        } catch (e) {
            if (!db.tables.processing_restrictions) db.tables.processing_restrictions = [];
            result = { insertId: (db.ids?.processing_restrictions || 0) + 1 };
            if (!db.ids) db.ids = {};
            db.ids.processing_restrictions = result.insertId;
            db.tables.processing_restrictions.push({ id: result.insertId, ...restriction });
        }

        res.status(201).json({
            success: true,
            message: 'Processing restriction applied (GDPR Art. 18)',
            data: restriction
        });
    } catch (error) {
        logger.error('Restrict processing error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/objection', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { processing_type, reason, details } = req.body;

        if (!processing_type) {
            return res.status(400).json({ error: 'processing_type is required' });
        }

        const objection = {
            user_id: userId,
            processing_type,
            reason: reason || null,
            details: details || null,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('processing_objections', objection);
        } catch (e) {
            if (!db.tables.processing_objections) db.tables.processing_objections = [];
            result = { insertId: (db.ids?.processing_objections || 0) + 1 };
            if (!db.ids) db.ids = {};
            db.ids.processing_objections = result.insertId;
            db.tables.processing_objections.push({ id: result.insertId, ...objection });
        }

        res.status(201).json({
            success: true,
            message: 'Processing objection submitted (GDPR Art. 21)',
            data: objection
        });
    } catch (error) {
        logger.error('Processing objection error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/cookie-consent', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { preferences, consent_banner_version, session_id } = req.body;

        if (!preferences) {
            return res.status(400).json({ error: 'preferences are required' });
        }

        const cookieLog = {
            user_id: userId || null,
            session_id: session_id || crypto.randomUUID(),
            consent_banner_version: consent_banner_version || '1.0.0',
            preferences: JSON.stringify(preferences),
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || '',
            created_at: new Date().toISOString()
        };

        try {
            await db.insert('cookie_consent_logs', cookieLog);
        } catch (e) {
            if (!db.tables.cookie_consent_logs) db.tables.cookie_consent_logs = [];
            db.tables.cookie_consent_logs.push(cookieLog);
        }

        res.json({
            success: true,
            message: 'Cookie consent recorded',
            data: {
                ...cookieLog,
                preferences
            }
        });
    } catch (error) {
        logger.error('Cookie consent error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/cookie-consent', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const session_id = req.query.session_id;

        let logs;
        try {
            if (userId) {
                logs = await db.query(
                    'SELECT * FROM cookie_consent_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
                    [userId]
                );
            } else if (session_id) {
                logs = await db.query(
                    'SELECT * FROM cookie_consent_logs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10',
                    [session_id]
                );
            } else {
                logs = [];
            }
        } catch (e) {
            logs = (db.getTable('cookie_consent_logs') || [])
                .filter(l => (userId && l.user_id === userId) || (session_id && l.session_id === session_id))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10);
        }

        const latestLog = logs[0];

        res.json({
            success: true,
            data: {
                latest: latestLog ? {
                    ...latestLog,
                    preferences: JSON.parse(latestLog.preferences)
                } : null,
                history: logs.map(l => ({
                    ...l,
                    preferences: JSON.parse(l.preferences)
                }))
            },
            defaults: {
                categories: {
                    essential: true,
                    functional: false,
                    analytics: false,
                    marketing: false
                }
            }
        });
    } catch (error) {
        logger.error('Get cookie consent error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/data-processing-records', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { limit = 100, offset = 0 } = req.query;

        let records;
        try {
            records = await db.query(
                'SELECT * FROM data_processing_records WHERE user_id = $1 ORDER BY processed_at DESC LIMIT $2 OFFSET $3',
                [userId, parseInt(limit), parseInt(offset)]
            );
        } catch (e) {
            records = (db.getTable('data_processing_records') || [])
                .filter(r => r.user_id === userId)
                .sort((a, b) => new Date(b.processed_at) - new Date(a.processed_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        res.json({
            success: true,
            data: records,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Get processing records error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/breach-notification', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

        const { affected_users, breach_type, description, discovery_date, risk_assessment, notification_sent } = req.body;

        if (!breach_type || !affected_users) {
            return res.status(400).json({ error: 'breach_type and affected_users are required' });
        }

        const breachRecord = {
            affected_users: JSON.stringify(affected_users),
            breach_type,
            description: description || null,
            discovery_date: discovery_date || new Date().toISOString(),
            risk_assessment: risk_assessment ? JSON.stringify(risk_assessment) : null,
            notification_sent: notification_sent || false,
            notification_sent_at: notification_sent ? new Date().toISOString() : null,
            status: 'investigating',
            created_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('data_breaches', breachRecord);
        } catch (e) {
            if (!db.tables.data_breaches) db.tables.data_breaches = [];
            result = { insertId: (db.ids?.data_breaches || 0) + 1 };
            db.tables.data_breaches.push({ id: result.insertId, ...breachRecord });
        }

        res.status(201).json({
            success: true,
            message: 'Data breach recorded (GDPR Art. 33, 34)',
            data: {
                id: result.insertId,
                ...breachRecord,
                affected_users,
                risk_assessment
            }
        });
    } catch (error) {
        logger.error('Breach notification error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/pia/:id', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

        let pia;
        try {
            pia = await db.queryOne('SELECT * FROM privacy_impact_assessments WHERE id = $1', [req.params.id]);
        } catch (e) {
            pia = (db.getTable('privacy_impact_assessments') || []).find(p => p.id == req.params.id);
        }

        if (!pia) return res.status(404).json({ error: 'PIA not found' });

        res.json({
            success: true,
            data: {
                ...pia,
                risks_identified: pia.risks_identified ? JSON.parse(pia.risks_identified) : [],
                mitigation_measures: pia.mitigation_measures ? JSON.parse(pia.mitigation_measures) : [],
                stakeholders: pia.stakeholders ? JSON.parse(pia.stakeholders) : []
            }
        });
    } catch (error) {
        logger.error('Get PIA error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/dpa/generate', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

        const { processor_name, processor_address, data_categories, purpose, transfer_countries, security_measures, duration } = req.body;

        if (!processor_name || !data_categories || !purpose) {
            return res.status(400).json({ error: 'processor_name, data_categories, and purpose are required' });
        }

        const dpaTemplate = {
            parties: {
                controller: 'RobotCare Ltd.',
                processor: processor_name,
                processorAddress: processor_address
            },
            subjectMatter: {
                dataCategories: data_categories,
                purpose,
                duration: duration || 'Indefinite'
            },
            obligations: {
                processorSecurity: security_measures || ['Encryption', 'Access controls', 'Regular audits'],
                dataSubjectRights: true,
                breachNotification: 'Within 72 hours',
                subProcessing: 'Requires prior written consent'
            },
            transfers: {
                countries: transfer_countries || [],
                safeguards: transfer_countries?.length > 0 ? ['Standard Contractual Clauses'] : []
            },
            generatedAt: new Date().toISOString(),
            version: '1.0'
        };

        res.json({
            success: true,
            message: 'DPA generated (GDPR Art. 28)',
            data: dpaTemplate
        });
    } catch (error) {
        logger.error('Generate DPA error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            consentTypes: CONSENT_TYPES,
            dataCategories: DATA_CATEGORIES,
            rights: [
                { article: 'Art. 15', name: 'Right of Access' },
                { article: 'Art. 16', name: 'Right to Rectification' },
                { article: 'Art. 17', name: 'Right to Erasure (Right to be Forgotten)' },
                { article: 'Art. 18', name: 'Right to Restriction of Processing' },
                { article: 'Art. 20', name: 'Right to Data Portability' },
                { article: 'Art. 21', name: 'Right to Object' },
                { article: 'Art. 22', name: 'Automated Individual Decision-Making' }
            ]
        }
    });
});

async function recordProcessingActivity(userId, activity, dataCategory, purpose, legalBasis, recipient, retentionPeriod) {
    const record = {
        user_id: userId,
        processing_activity: activity,
        data_category: dataCategory,
        purpose,
        legal_basis: legalBasis,
        recipient: recipient,
        retention_period: retentionPeriod,
        processed_at: new Date().toISOString()
    };

    try {
        await db.insert('data_processing_records', record);
    } catch (e) {
        if (!db.tables.data_processing_records) db.tables.data_processing_records = [];
        db.tables.data_processing_records.push(record);
    }
}

module.exports = router;
