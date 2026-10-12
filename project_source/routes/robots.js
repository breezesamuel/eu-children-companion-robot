const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');

const ROBOT_STATUSES = ['online', 'offline', 'sleeping', 'charging', 'error', 'maintenance', 'updating'];
const FIRMWARE_CHANNELS = ['stable', 'beta', 'nightly'];

router.get('/', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        
        let robots;
        if (isAdmin) {
            try {
                robots = await db.all('SELECT * FROM robots ORDER BY status DESC, last_active DESC');
            } catch (e) {
                robots = (db.getTable('robots') || [])
                    .sort((a, b) => {
                        const statusOrder = { online: 0, charging: 1, sleeping: 2, offline: 3, error: 4 };
                        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99) ||
                            new Date(b.last_active || 0) - new Date(a.last_active || 0);
                    });
            }
        } else {
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            
            try {
                robots = await db.all(
                    `SELECT r.* FROM robots r 
                     LEFT JOIN robot_bindings rb ON r.id = rb.robot_id
                     WHERE r.owner_id = $1 OR rb.parent_id = $1
                     ORDER BY r.status DESC, r.last_active DESC`,
                    [userId]
                );
            } catch (e) {
                robots = (db.getTable('robots') || [])
                    .filter(r => r.owner_id === userId)
                    .sort((a, b) => {
                        const statusOrder = { online: 0, charging: 1, sleeping: 2, offline: 3, error: 4 };
                        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                    });
            }
        }

        const robotsWithDetails = await Promise.all(robots.map(async (robot) => {
            let config = null;
            let metrics = null;
            
            try {
                config = await db.queryOne('SELECT * FROM robot_configs WHERE robot_id = $1', [robot.id]);
            } catch (e) {
                config = (db.getTable('robot_configs') || []).find(c => c.robot_id === robot.id);
            }

            try {
                metrics = await db.queryOne(
                    'SELECT * FROM robot_metrics WHERE robot_id = $1 ORDER BY recorded_at DESC LIMIT 1',
                    [robot.id]
                );
            } catch (e) {
                metrics = (db.getTable('robot_metrics') || [])
                    .filter(m => m.robot_id === robot.id)
                    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0];
            }

            return {
                ...robot,
                config: config ? {
                    ...config,
                    settings: config.settings ? JSON.parse(config.settings) : {},
                    preferences: config.preferences ? JSON.parse(config.preferences) : {}
                } : null,
                latestMetrics: metrics ? {
                    ...metrics,
                    sensor_data: metrics.sensor_data ? JSON.parse(metrics.sensor_data) : {},
                    battery_health: metrics.battery_health ? JSON.parse(metrics.battery_health) : {}
                } : null
            };
        }));

        res.json({
            success: true,
            total: robotsWithDetails.length,
            data: robotsWithDetails
        });
    } catch (error) {
        console.error('Get robots error:', error);
        logger.error('Get robots error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            let hasAccess = false;
            try {
                const binding = await db.queryOne(
                    'SELECT * FROM robot_bindings WHERE robot_id = $1 AND parent_id = $2',
                    [robot.id, userId]
                );
                hasAccess = !!binding;
            } catch (e) {
                const bindings = db.getTable('robot_bindings') || [];
                hasAccess = bindings.some(b => b.robot_id === robot.id && b.parent_id === userId);
            }

            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to this robot' });
            }
        }

        let config = null;
        try {
            config = await db.queryOne('SELECT * FROM robot_configs WHERE robot_id = $1', [robot.id]);
        } catch (e) {
            config = (db.getTable('robot_configs') || []).find(c => c.robot_id === robot.id);
        }

        let commands = [];
        try {
            commands = await db.query(
                'SELECT * FROM robot_commands WHERE robot_id = $1 ORDER BY created_at DESC LIMIT 50',
                [robot.id]
            );
        } catch (e) {
            commands = (db.getTable('robot_commands') || [])
                .filter(c => c.robot_id === robot.id)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 50);
        }

        let metrics = [];
        try {
            metrics = await db.query(
                'SELECT * FROM robot_metrics WHERE robot_id = $1 ORDER BY recorded_at DESC LIMIT 100',
                [robot.id]
            );
        } catch (e) {
            metrics = (db.getTable('robot_metrics') || [])
                .filter(m => m.robot_id === robot.id)
                .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
                .slice(0, 100);
        }

        let logs = [];
        try {
            logs = await db.query(
                'SELECT * FROM robot_logs WHERE robot_id = $1 ORDER BY created_at DESC LIMIT 100',
                [robot.id]
            );
        } catch (e) {
            logs = (db.getTable('robot_logs') || [])
                .filter(l => l.robot_id === robot.id)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 100);
        }

        res.json({
            success: true,
            data: {
                robot,
                config: config ? {
                    ...config,
                    settings: config.settings ? JSON.parse(config.settings) : {},
                    preferences: config.preferences ? JSON.parse(config.preferences) : {}
                } : null,
                recentCommands: commands,
                recentMetrics: metrics.map(m => ({
                    ...m,
                    sensor_data: m.sensor_data ? JSON.parse(m.sensor_data) : {}
                })),
                recentLogs: logs
            }
        });
    } catch (error) {
        console.error('Get robot error:', error);
        logger.error('Get robot error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        
        if (!isAdmin && !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { device_id, name, location, firmware_version, model, serial_number, child_id, owner_id } = req.body;

        if (!device_id || !name) {
            return res.status(400).json({ error: 'device_id and name are required' });
        }

        let existing;
        try {
            existing = await db.get('SELECT * FROM robots WHERE device_id = $1', [device_id]);
        } catch (e) {
            existing = (db.getTable('robots') || []).find(r => r.device_id === device_id);
        }

        if (existing) {
            return res.status(400).json({ error: 'Device already registered' });
        }

        const robot = {
            device_id,
            name,
            location: location || null,
            firmware_version: firmware_version || '1.0.0',
            firmware_channel: 'stable',
            model: model || 'RoboMate Pro',
            serial_number: serial_number || null,
            status: 'offline',
            battery_level: 100,
            owner_id: isAdmin ? (owner_id || userId) : userId,
            child_id: child_id || null,
            last_active: null,
            last_heartbeat: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.run(
                'INSERT INTO robots (device_id, name, location, firmware_version, firmware_channel, model, serial_number, status, battery_level, owner_id, child_id, last_active, last_heartbeat, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [robot.device_id, robot.name, robot.location, robot.firmware_version, robot.firmware_channel, robot.model, robot.serial_number, robot.status, robot.battery_level, robot.owner_id, robot.child_id, robot.last_active, robot.last_heartbeat, robot.created_at, robot.updated_at]
            );
        } catch (e) {
            if (!db.tables.robots) db.tables.robots = [];
            if (!db.ids) db.ids = {};
            const newId = (db.ids.robots || 0) + 1;
            db.ids.robots = newId;
            result = { lastID: newId };
            db.tables.robots.push({ id: newId, ...robot });
        }

        const defaultConfig = {
            robot_id: result.lastID,
            settings: JSON.stringify({
                volume: 70,
                brightness: 80,
                language: 'en',
                sleep_mode: true,
                auto_update: true,
                safety_mode: true
            }),
            preferences: JSON.stringify({
                favorite_activities: [],
                learning_level: 'intermediate',
                personality: 'friendly'
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            await db.insert('robot_configs', defaultConfig);
        } catch (e) {
            if (!db.tables.robot_configs) db.tables.robot_configs = [];
            db.tables.robot_configs.push(defaultConfig);
        }

        const newRobot = { id: result.lastID, ...robot };

        res.status(201).json({ 
            message: 'Robot registered successfully', 
            robot: newRobot,
            config: {
                ...defaultConfig,
                settings: JSON.parse(defaultConfig.settings),
                preferences: JSON.parse(defaultConfig.preferences)
            }
        });
    } catch (error) {
        console.error('Register robot error:', error);
        logger.error('Register robot error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/heartbeat', async (req, res) => {
    try {
        const robotId = req.params.id;
        const { battery_level, status, temperature, network_strength, sensor_data, cpu_usage, memory_usage } = req.body;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        const newStatus = status || (battery_level === 0 ? 'offline' : robot.status === 'offline' ? 'online' : robot.status);
        const newBattery = battery_level !== undefined ? battery_level : robot.battery_level;

        try {
            await db.run(
                'UPDATE robots SET status = $1, battery_level = $2, last_active = CURRENT_TIMESTAMP, last_heartbeat = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [newStatus, newBattery, robot.id]
            );
        } catch (e) {
            const idx = (db.tables.robots || []).findIndex(r => r.id === robot.id);
            if (idx >= 0) {
                db.tables.robots[idx].status = newStatus;
                db.tables.robots[idx].battery_level = newBattery;
                db.tables.robots[idx].last_active = new Date().toISOString();
                db.tables.robots[idx].last_heartbeat = new Date().toISOString();
                db.tables.robots[idx].updated_at = new Date().toISOString();
            }
        }

        if (sensor_data || cpu_usage !== undefined || memory_usage !== undefined || temperature !== undefined) {
            const metric = {
                robot_id: robot.id,
                battery_level: newBattery,
                temperature: temperature || null,
                cpu_usage: cpu_usage !== undefined ? cpu_usage : null,
                memory_usage: memory_usage !== undefined ? memory_usage : null,
                network_strength: network_strength || null,
                sensor_data: sensor_data ? JSON.stringify(sensor_data) : null,
                status: newStatus,
                recorded_at: new Date().toISOString()
            };

            try {
                await db.insert('robot_metrics', metric);
            } catch (e) {
                if (!db.tables.robot_metrics) db.tables.robot_metrics = [];
                db.tables.robot_metrics.push(metric);
            }
        }

        let updatedRobot;
        try {
            updatedRobot = await db.get('SELECT * FROM robots WHERE id = $1', [robot.id]);
        } catch (e) {
            updatedRobot = (db.getTable('robots') || []).find(r => r.id === robot.id);
        }

        res.json({ message: 'Heartbeat received', robot: updatedRobot });
    } catch (error) {
        console.error('Heartbeat error:', error);
        logger.error('Heartbeat error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { name, location, firmware_version, child_id, status, owner_id } = req.body;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (location !== undefined) updates.location = location;
        if (firmware_version) updates.firmware_version = firmware_version;
        if (child_id !== undefined) updates.child_id = child_id;
        if (status && ROBOT_STATUSES.includes(status)) updates.status = status;
        if (isAdmin && owner_id !== undefined) updates.owner_id = owner_id;

        try {
            await db.update('robots', updates, { id: robot.id });
        } catch (e) {
            const idx = (db.tables.robots || []).findIndex(r => r.id === robot.id);
            if (idx >= 0) {
                db.tables.robots[idx] = { ...db.tables.robots[idx], ...updates };
            }
        }

        let updatedRobot;
        try {
            updatedRobot = await db.get('SELECT * FROM robots WHERE id = $1', [robot.id]);
        } catch (e) {
            updatedRobot = { ...robot, ...updates };
        }

        res.json({ message: 'Robot updated successfully', robot: updatedRobot });
    } catch (error) {
        console.error('Update robot error:', error);
        logger.error('Update robot error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        try {
            await db.run('DELETE FROM robots WHERE id = $1', [robot.id]);
        } catch (e) {
            if (db.tables.robots) {
                db.tables.robots = db.tables.robots.filter(r => r.id !== robot.id);
            }
        }

        res.json({ message: 'Robot deleted successfully', deletedRobot: robot });
    } catch (error) {
        console.error('Delete robot error:', error);
        logger.error('Delete robot error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/config', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let config;
        try {
            config = await db.queryOne('SELECT * FROM robot_configs WHERE robot_id = $1', [robot.id]);
        } catch (e) {
            config = (db.getTable('robot_configs') || []).find(c => c.robot_id === robot.id);
        }

        if (!config) {
            config = {
                robot_id: robot.id,
                settings: {},
                preferences: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }

        res.json({
            success: true,
            data: {
                ...config,
                settings: config.settings ? (typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings) : {},
                preferences: config.preferences ? (typeof config.preferences === 'string' ? JSON.parse(config.preferences) : config.preferences) : {}
            }
        });
    } catch (error) {
        logger.error('Get robot config error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id/config', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { settings, preferences } = req.body;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let config;
        try {
            config = await db.queryOne('SELECT * FROM robot_configs WHERE robot_id = $1', [robot.id]);
        } catch (e) {
            config = (db.getTable('robot_configs') || []).find(c => c.robot_id === robot.id);
        }

        const updates = { updated_at: new Date().toISOString() };
        if (settings) {
            const currentSettings = config?.settings ? (typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings) : {};
            updates.settings = JSON.stringify({ ...currentSettings, ...settings });
        }
        if (preferences) {
            const currentPrefs = config?.preferences ? (typeof config.preferences === 'string' ? JSON.parse(config.preferences) : config.preferences) : {};
            updates.preferences = JSON.stringify({ ...currentPrefs, ...preferences });
        }

        if (config) {
            try {
                await db.update('robot_configs', updates, { robot_id: robot.id });
            } catch (e) {
                const idx = (db.tables.robot_configs || []).findIndex(c => c.robot_id === robot.id);
                if (idx >= 0) {
                    db.tables.robot_configs[idx] = { ...db.tables.robot_configs[idx], ...updates };
                }
            }
        } else {
            const newConfig = {
                robot_id: robot.id,
                settings: updates.settings || JSON.stringify({}),
                preferences: updates.preferences || JSON.stringify({}),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            try {
                await db.insert('robot_configs', newConfig);
            } catch (e) {
                if (!db.tables.robot_configs) db.tables.robot_configs = [];
                db.tables.robot_configs.push(newConfig);
            }
        }

        res.json({
            success: true,
            message: 'Robot configuration updated',
            data: {
                settings: settings || {},
                preferences: preferences || {}
            }
        });
    } catch (error) {
        logger.error('Update robot config error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/command', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { command, parameters, priority = 'normal', timeout = 30000 } = req.body;

        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const commandRecord = {
            robot_id: robot.id,
            user_id: userId,
            command,
            parameters: parameters ? JSON.stringify(parameters) : null,
            priority,
            status: 'queued',
            result: null,
            error: null,
            executed_at: null,
            completed_at: null,
            timeout: parseInt(timeout),
            created_at: new Date().toISOString()
        };

        let result;
        try {
            result = await db.insert('robot_commands', commandRecord);
        } catch (e) {
            if (!db.tables.robot_commands) db.tables.robot_commands = [];
            if (!db.ids) db.ids = {};
            const newId = (db.ids.robot_commands || 0) + 1;
            db.ids.robot_commands = newId;
            result = { insertId: newId };
            db.tables.robot_commands.push({ id: newId, ...commandRecord });
        }

        const statuses = {
            'sleep': 'sleeping',
            'wake': 'online',
            'restart': 'offline',
            'shutdown': 'offline',
            'charge': 'charging'
        };

        if (statuses[command]) {
            try {
                await db.run('UPDATE robots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [statuses[command], robot.id]);
            } catch (e) {
                const idx = (db.tables.robots || []).findIndex(r => r.id === robot.id);
                if (idx >= 0) {
                    db.tables.robots[idx].status = statuses[command];
                    db.tables.robots[idx].updated_at = new Date().toISOString();
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Command queued',
            data: {
                id: result.insertId,
                command,
                parameters,
                priority,
                status: 'queued',
                expectedResult: command === 'status' ? 'Robot status will be returned' :
                    command === 'sleep' ? 'Robot will go to sleep' :
                    command === 'wake' ? 'Robot will wake up' :
                    command === 'restart' ? 'Robot will restart' :
                    command === 'shutdown' ? 'Robot will shut down' :
                    `Command ${command} will be executed`
            }
        });
    } catch (error) {
        logger.error('Send command error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/commands', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { status, limit = 50, offset = 0 } = req.query;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let commands;
        try {
            let query = 'SELECT * FROM robot_commands WHERE robot_id = $1';
            const params = [robot.id];
            let paramIndex = 2;

            if (status) {
                query += ` AND status = $${paramIndex++}`;
                params.push(status);
            }

            query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
            params.push(parseInt(limit), parseInt(offset));

            commands = await db.query(query, params);
        } catch (e) {
            commands = (db.getTable('robot_commands') || [])
                .filter(c => c.robot_id === robot.id)
                .filter(c => !status || c.status === status)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        const commandsWithParsedParams = commands.map(c => ({
            ...c,
            parameters: c.parameters ? JSON.parse(c.parameters) : null,
            result: c.result ? JSON.parse(c.result) : null
        }));

        res.json({
            success: true,
            data: commandsWithParsedParams,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Get commands error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/metrics', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { period = '24h', limit = 100 } = req.query;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const now = Date.now();
        let since;
        switch (period) {
            case '1h': since = new Date(now - 60 * 60 * 1000); break;
            case '24h': since = new Date(now - 24 * 60 * 60 * 1000); break;
            case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
            case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
            default: since = new Date(now - 24 * 60 * 60 * 1000);
        }

        let metrics;
        try {
            metrics = await db.query(
                'SELECT * FROM robot_metrics WHERE robot_id = $1 AND recorded_at >= $2 ORDER BY recorded_at DESC LIMIT $3',
                [robot.id, since.toISOString(), parseInt(limit)]
            );
        } catch (e) {
            metrics = (db.getTable('robot_metrics') || [])
                .filter(m => m.robot_id === robot.id && new Date(m.recorded_at) >= since)
                .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
                .slice(0, parseInt(limit));
        }

        const metricsWithParsedData = metrics.map(m => ({
            ...m,
            sensor_data: m.sensor_data ? JSON.parse(m.sensor_data) : {},
            battery_health: m.battery_health ? JSON.parse(m.battery_health) : {}
        }));

        const aggregated = {
            period,
            count: metricsWithParsedData.length,
            avgBattery: metricsWithParsedData.length > 0
                ? Math.round(metricsWithParsedData.reduce((sum, m) => sum + (m.battery_level || 0), 0) / metricsWithParsedData.length)
                : 0,
            avgCpu: metricsWithParsedData.filter(m => m.cpu_usage !== null).length > 0
                ? Math.round(metricsWithParsedData.filter(m => m.cpu_usage !== null).reduce((sum, m) => sum + m.cpu_usage, 0) / metricsWithParsedData.filter(m => m.cpu_usage !== null).length)
                : null,
            statusChanges: [...new Set(metricsWithParsedData.map(m => m.status).filter(Boolean))],
            minBattery: Math.min(...metricsWithParsedData.map(m => m.battery_level).filter(b => b !== null)),
            maxBattery: Math.max(...metricsWithParsedData.map(m => m.battery_level).filter(b => b !== null))
        };

        res.json({
            success: true,
            data: {
                metrics: metricsWithParsedData,
                aggregated
            }
        });
    } catch (error) {
        logger.error('Get metrics error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/logs', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        const { level, limit = 100, offset = 0 } = req.query;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let logs;
        try {
            let query = 'SELECT * FROM robot_logs WHERE robot_id = $1';
            const params = [robot.id];
            let paramIndex = 2;

            if (level) {
                query += ` AND level = $${paramIndex++}`;
                params.push(level);
            }

            query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
            params.push(parseInt(limit), parseInt(offset));

            logs = await db.query(query, params);
        } catch (e) {
            logs = (db.getTable('robot_logs') || [])
                .filter(l => l.robot_id === robot.id)
                .filter(l => !level || l.level === level)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        }

        const logsWithParsedData = logs.map(l => ({
            ...l,
            metadata: l.metadata ? JSON.parse(l.metadata) : {}
        }));

        res.json({
            success: true,
            data: logsWithParsedData,
            pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        logger.error('Get logs error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/bind', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;
        const { parent_id, child_id, relationship } = req.body;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Only the robot owner can bind other users' });
        }

        const binding = {
            robot_id: robot.id,
            parent_id: parent_id || userId,
            child_id: child_id || null,
            relationship: relationship || 'primary',
            is_owner: parent_id === robot.owner_id,
            created_at: new Date().toISOString()
        };

        try {
            await db.insert('robot_bindings', binding);
        } catch (e) {
            if (!db.tables.robot_bindings) db.tables.robot_bindings = [];
            db.tables.robot_bindings.push(binding);
        }

        res.status(201).json({
            success: true,
            message: 'Binding created',
            data: binding
        });
    } catch (error) {
        logger.error('Create binding error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/bindings', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let bindings;
        try {
            bindings = await db.query(
                `SELECT rb.*, u.username as parent_name, c.name as child_name
                 FROM robot_bindings rb
                 LEFT JOIN users u ON rb.parent_id = u.id
                 LEFT JOIN children c ON rb.child_id = c.id
                 WHERE rb.robot_id = $1
                 ORDER BY rb.created_at DESC`,
                [robot.id]
            );
        } catch (e) {
            bindings = (db.getTable('robot_bindings') || []).filter(b => b.robot_id === robot.id);
        }

        res.json({
            success: true,
            data: bindings
        });
    } catch (error) {
        logger.error('Get bindings error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/firmware/check', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const currentVersion = robot.firmware_version || '1.0.0';
        const latestVersion = '2.1.0';
        const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

        res.json({
            success: true,
            data: {
                currentVersion,
                latestVersion,
                hasUpdate,
                channel: robot.firmware_channel || 'stable',
                availableChannels: FIRMWARE_CHANNELS,
                updateInfo: hasUpdate ? {
                    version: latestVersion,
                    size: '45.2 MB',
                    releaseDate: '2026-01-15',
                    releaseNotes: [
                        'Improved battery management',
                        'New learning modules for math',
                        'Enhanced voice recognition',
                        'Bug fixes and stability improvements'
                    ],
                    required: false,
                    estimatedInstallTime: '5-10 minutes'
                } : null
            }
        });
    } catch (error) {
        logger.error('Firmware check error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/firmware/update', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;
        const { version, channel } = req.body;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (robot.status === 'updating') {
            return res.status(400).json({ error: 'Firmware update already in progress' });
        }

        try {
            await db.run(
                'UPDATE robots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['updating', robot.id]
            );
        } catch (e) {
            const idx = (db.tables.robots || []).findIndex(r => r.id === robot.id);
            if (idx >= 0) {
                db.tables.robots[idx].status = 'updating';
                db.tables.robots[idx].updated_at = new Date().toISOString();
            }
        }

        const updateRecord = {
            robot_id: robot.id,
            from_version: robot.firmware_version,
            to_version: version || '2.1.0',
            channel: channel || robot.firmware_channel || 'stable',
            status: 'in_progress',
            progress: 0,
            started_at: new Date().toISOString(),
            completed_at: null,
            error: null
        };

        try {
            await db.insert('firmware_updates', updateRecord);
        } catch (e) {
            if (!db.tables.firmware_updates) db.tables.firmware_updates = [];
            db.tables.firmware_updates.push(updateRecord);
        }

        res.status(202).json({
            success: true,
            message: 'Firmware update initiated',
            data: {
                fromVersion: robot.firmware_version,
                toVersion: version || '2.1.0',
                estimatedTime: '5-10 minutes',
                checkStatus: 'GET /robots/' + robotId + '/firmware/status'
            }
        });
    } catch (error) {
        logger.error('Firmware update error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/groups', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let groups;
        try {
            groups = await db.query('SELECT * FROM robot_groups ORDER BY name ASC');
        } catch (e) {
            groups = (db.getTable('robot_groups') || []).sort((a, b) => a.name.localeCompare(b.name));
        }

        const groupsWithMembers = await Promise.all(groups.map(async (group) => {
            let members = [];
            try {
                members = await db.query(
                    `SELECT r.* FROM robots r
                     JOIN robot_group_members rgm ON r.id = rgm.robot_id
                     WHERE rgm.group_id = $1`,
                    [group.id]
                );
            } catch (e) {
                const memberEntries = (db.getTable('robot_group_members') || []).filter(m => m.group_id === group.id);
                const robots = db.getTable('robots') || [];
                members = robots.filter(r => memberEntries.some(m => m.robot_id === r.id));
            }

            return {
                ...group,
                settings: group.settings ? JSON.parse(group.settings) : {},
                memberCount: members.length,
                members: members.slice(0, 10)
            };
        }));

        res.json({
            success: true,
            data: groupsWithMembers
        });
    } catch (error) {
        logger.error('Get robot groups error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        const userId = req.user?.userId;

        let robots;
        if (isAdmin) {
            robots = db.getTable('robots') || [];
        } else {
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            robots = (db.getTable('robots') || []).filter(r => r.owner_id === userId);
        }

        const total = robots.length;
        const online = robots.filter(r => r.status === 'online').length;
        const offline = robots.filter(r => r.status === 'offline').length;
        const sleeping = robots.filter(r => r.status === 'sleeping').length;
        const charging = robots.filter(r => r.status === 'charging').length;
        const error = robots.filter(r => r.status === 'error').length;
        const updating = robots.filter(r => r.status === 'updating').length;

        const onlineBatteries = robots.filter(r => r.status === 'online' && r.battery_level != null);
        const avgBattery = onlineBatteries.length > 0
            ? Math.round(onlineBatteries.reduce((s, r) => s + r.battery_level, 0) / onlineBatteries.length)
            : 0;

        const lowBattery = robots.filter(r => r.battery_level != null && r.battery_level <= 20).length;

        res.json({
            success: true,
            data: {
                total,
                byStatus: {
                    online,
                    offline,
                    sleeping,
                    charging,
                    error,
                    updating
                },
                avgBattery,
                lowBattery,
                mostCommonModel: getMostCommon(robots, 'model'),
                mostCommonFirmware: getMostCommon(robots, 'firmware_version')
            }
        });
    } catch (error) {
        console.error('Get robot stats error:', error);
        logger.error('Get robot stats error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/diagnostics/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';
        const robotId = req.params.id;

        let robot;
        try {
            robot = await db.get('SELECT * FROM robots WHERE id = $1 OR device_id = $1', [robotId]);
        } catch (e) {
            robot = (db.getTable('robots') || []).find(r => r.id == robotId || r.device_id === robotId);
        }

        if (!robot) {
            return res.status(404).json({ error: 'Robot not found' });
        }

        if (!isAdmin && robot.owner_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const diagnostics = {
            robot: {
                id: robot.id,
                device_id: robot.device_id,
                name: robot.name,
                model: robot.model,
                status: robot.status
            },
            health: {
                overall: robot.status === 'error' ? 'critical' :
                    robot.status === 'offline' ? 'warning' : 'healthy',
                issues: []
            },
            components: {
                battery: {
                    level: robot.battery_level || 0,
                    status: robot.battery_level >= 50 ? 'good' :
                        robot.battery_level >= 20 ? 'warning' : 'critical',
                    health: 'good',
                    charging: robot.status === 'charging'
                },
                network: {
                    status: robot.status === 'offline' ? 'disconnected' : 'connected',
                    lastSeen: robot.last_heartbeat || robot.last_active
                },
                cpu: {
                    status: 'normal',
                    usage: null
                },
                memory: {
                    status: 'normal',
                    usage: null
                },
                storage: {
                    status: 'normal',
                    usage: null
                }
            },
            firmware: {
                version: robot.firmware_version,
                channel: robot.firmware_channel || 'stable',
                updateAvailable: false
            },
            sensors: {
                camera: 'operational',
                microphone: 'operational',
                speaker: 'operational',
                touch: 'operational',
                motion: 'operational'
            },
            lastDiagnostics: new Date().toISOString()
        };

        if (robot.status === 'error') {
            diagnostics.health.issues.push({
                component: 'system',
                severity: 'critical',
                message: 'Robot is in error state'
            });
        }

        if ((robot.battery_level || 0) <= 20) {
            diagnostics.health.issues.push({
                component: 'battery',
                severity: 'warning',
                message: `Low battery: ${robot.battery_level || 0}%`
            });
        }

        if (robot.status === 'offline') {
            diagnostics.health.issues.push({
                component: 'network',
                severity: 'warning',
                message: 'Robot appears to be offline'
            });
        }

        res.json({
            success: true,
            data: diagnostics
        });
    } catch (error) {
        logger.error('Diagnostics error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

function getMostCommon(arr, field) {
    const counts = {};
    arr.forEach(item => {
        const val = item[field];
        if (val) counts[val] = (counts[val] || 0) + 1;
    });
    
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
}

module.exports = router;
