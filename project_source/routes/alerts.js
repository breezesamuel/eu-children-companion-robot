const express = require('express');
const router = express.Router();
const alertService = require('../services/alerts');
const robotManager = require('../services/robot-manager');
const db = require('../utils/database');
const logger = require('../utils/logger');

const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'info'];
const ALERT_TYPES = ['safety', 'battery', 'connection', 'behavior', 'learning', 'system', 'child_activity'];
const NOTIFICATION_CHANNELS = ['email', 'push', 'sms', 'webhook'];

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { severity, type, status, limit = 50, offset = 0, startDate, endDate } = req.query;
    
    let alerts;
    try {
      let query = 'SELECT * FROM alerts WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }
      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      alerts = await db.query(query, params);
    } catch (e) {
      alerts = (db.getTable('alerts') || [])
        .filter(a => a.user_id === userId)
        .filter(a => !severity || a.severity === severity)
        .filter(a => !type || a.type === type)
        .filter(a => !status || a.status === status)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const unread = await getUnreadCount(userId);
    const stats = await getAlertStats(userId);

    res.json({ 
      success: true, 
      data: alerts, 
      unread,
      stats,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get alerts error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const minutes = parseInt(req.query.minutes) || 60;
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    let alerts;
    try {
      alerts = await db.query(
        'SELECT * FROM alerts WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
        [userId, since.toISOString()]
      );
    } catch (e) {
      alerts = (db.getTable('alerts') || [])
        .filter(a => a.user_id === userId && new Date(a.created_at) >= since)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({ success: true, data: alerts, minutes });
  } catch (error) {
    logger.error('Recent alerts error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let alert;
    try {
      alert = await db.queryOne('SELECT * FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      alert = (db.getTable('alerts') || []).find(a => a.id == req.params.id && a.user_id === userId);
    }

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    let history = [];
    try {
      history = await db.query('SELECT * FROM alert_history WHERE alert_id = $1 ORDER BY created_at DESC', [alert.id]);
    } catch (e) {
      history = (db.getTable('alert_history') || []).filter(h => h.alert_id == alert.id);
    }

    res.json({ success: true, data: { ...alert, history } });
  } catch (error) {
    logger.error('Get alert error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, message, severity = 'info', type = 'system', robotId, metadata, channels } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    if (!SEVERITY_LEVELS.includes(severity)) {
      return res.status(400).json({ error: `Invalid severity. Must be one of: ${SEVERITY_LEVELS.join(', ')}` });
    }

    const alert = {
      user_id: userId,
      title,
      message: message || '',
      severity,
      type,
      robot_id: robotId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'active',
      acknowledged: false,
      acknowledged_at: null,
      acknowledged_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('alerts', alert);
    } catch (e) {
      if (!db.tables.alerts) db.tables.alerts = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.alerts || 0) + 1;
      db.ids.alerts = newId;
      result = { insertId: newId };
      db.tables.alerts.push({ id: newId, ...alert });
    }

    await sendNotifications({ ...alert, id: result.insertId }, channels);
    await checkEscalationRules({ ...alert, id: result.insertId });

    res.status(201).json({ success: true, data: { id: result.insertId, ...alert } });
  } catch (error) {
    logger.error('Create alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, message, severity, status } = req.body;

    let alert;
    try {
      alert = await db.queryOne('SELECT * FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      alert = (db.getTable('alerts') || []).find(a => a.id == req.params.id && a.user_id === userId);
    }

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (message) updates.message = message;
    if (severity) updates.severity = severity;
    if (status) updates.status = status;

    try {
      await db.update('alerts', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.alerts || []).findIndex(a => a.id == req.params.id);
      if (idx >= 0) db.tables.alerts[idx] = { ...db.tables.alerts[idx], ...updates };
    }

    await addAlertHistory(req.params.id, 'updated', userId, updates);

    res.json({ success: true, message: 'Alert updated' });
  } catch (error) {
    logger.error('Update alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let alert;
    try {
      alert = await db.queryOne('SELECT * FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      alert = (db.getTable('alerts') || []).find(a => a.id == req.params.id && a.user_id === userId);
    }

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    try {
      await db.run('DELETE FROM alerts WHERE id = $1', [req.params.id]);
    } catch (e) {
      if (db.tables.alerts) {
        db.tables.alerts = db.tables.alerts.filter(a => a.id != req.params.id);
      }
    }

    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    logger.error('Delete alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let alert;
    try {
      alert = await db.queryOne('SELECT * FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      alert = (db.getTable('alerts') || []).find(a => a.id == req.params.id && a.user_id === userId);
    }

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    try {
      await db.run(
        'UPDATE alerts SET acknowledged = true, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [userId, 'acknowledged', req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.alerts || []).findIndex(a => a.id == req.params.id);
      if (idx >= 0) {
        db.tables.alerts[idx].acknowledged = true;
        db.tables.alerts[idx].acknowledged_at = new Date().toISOString();
        db.tables.alerts[idx].acknowledged_by = userId;
        db.tables.alerts[idx].status = 'acknowledged';
        db.tables.alerts[idx].updated_at = new Date().toISOString();
      }
    }

    await addAlertHistory(req.params.id, 'acknowledged', userId);

    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    logger.error('Acknowledge alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      await db.run(
        'UPDATE alerts SET acknowledged = true, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND acknowledged = false',
        [userId, 'acknowledged']
      );
    } catch (e) {
      const alerts = (db.tables.alerts || []).filter(a => a.user_id === userId && !a.acknowledged);
      alerts.forEach(a => {
        a.acknowledged = true;
        a.acknowledged_at = new Date().toISOString();
        a.acknowledged_by = userId;
        a.status = 'acknowledged';
        a.updated_at = new Date().toISOString();
      });
    }

    res.json({ success: true, message: 'All alerts acknowledged' });
  } catch (error) {
    logger.error('Read all alerts error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/escalate', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { escalateTo, reason } = req.body;

    let alert;
    try {
      alert = await db.queryOne('SELECT * FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      alert = (db.getTable('alerts') || []).find(a => a.id == req.params.id && a.user_id === userId);
    }

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    try {
      await db.run(
        'UPDATE alerts SET escalated = true, escalated_to = $1, escalated_at = CURRENT_TIMESTAMP, escalation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [escalateTo || 'admin', reason || 'Manual escalation', req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.alerts || []).findIndex(a => a.id == req.params.id);
      if (idx >= 0) {
        db.tables.alerts[idx].escalated = true;
        db.tables.alerts[idx].escalated_to = escalateTo || 'admin';
        db.tables.alerts[idx].escalated_at = new Date().toISOString();
        db.tables.alerts[idx].escalation_reason = reason || 'Manual escalation';
        db.tables.alerts[idx].updated_at = new Date().toISOString();
      }
    }

    await addAlertHistory(req.params.id, 'escalated', userId, { to: escalateTo, reason });
    await sendEscalationNotification(alert, escalateTo, reason);

    res.json({ success: true, message: 'Alert escalated' });
  } catch (error) {
    logger.error('Escalate alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/groups/by-severity', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let alerts;
    try {
      alerts = await db.query('SELECT * FROM alerts WHERE user_id = $1', [userId]);
    } catch (e) {
      alerts = (db.getTable('alerts') || []).filter(a => a.user_id === userId);
    }

    const groups = {};
    SEVERITY_LEVELS.forEach(level => {
      groups[level] = alerts.filter(a => a.severity === level);
    });

    res.json({ success: true, data: groups });
  } catch (error) {
    logger.error('Group alerts error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/groups/by-type', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let alerts;
    try {
      alerts = await db.query('SELECT * FROM alerts WHERE user_id = $1', [userId]);
    } catch (e) {
      alerts = (db.getTable('alerts') || []).filter(a => a.user_id === userId);
    }

    const groups = {};
    ALERT_TYPES.forEach(type => {
      groups[type] = alerts.filter(a => a.type === type);
    });

    res.json({ success: true, data: groups });
  } catch (error) {
    logger.error('Group alerts by type error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/dashboard', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await getAlertStats(userId);
    const unread = await getUnreadCount(userId);
    const recent = await getRecentAlertActivity(userId);

    res.json({ 
      success: true, 
      data: {
        summary: stats,
        unread,
        recentActivity: recent
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/suppression-rules', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let rules;
    try {
      rules = await db.query('SELECT * FROM alert_suppression_rules WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    } catch (e) {
      rules = (db.getTable('alert_suppression_rules') || []).filter(r => r.user_id === userId);
    }

    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Get suppression rules error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/suppression-rules', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, severity, robotId, startTime, endTime, daysOfWeek, reason } = req.body;
    if (!name) return res.status(400).json({ error: 'Rule name required' });

    const rule = {
      user_id: userId,
      name,
      type: type || null,
      severity: severity || null,
      robot_id: robotId || null,
      start_time: startTime || null,
      end_time: endTime || null,
      days_of_week: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
      reason: reason || null,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('alert_suppression_rules', rule);
    } catch (e) {
      if (!db.tables.alert_suppression_rules) db.tables.alert_suppression_rules = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.alert_suppression_rules || 0) + 1;
      db.ids.alert_suppression_rules = newId;
      result = { insertId: newId };
      db.tables.alert_suppression_rules.push({ id: newId, ...rule });
    }

    res.status(201).json({ success: true, data: { id: result.insertId, ...rule } });
  } catch (error) {
    logger.error('Create suppression rule error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/suppression-rules/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      await db.run('DELETE FROM alert_suppression_rules WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      if (db.tables.alert_suppression_rules) {
        db.tables.alert_suppression_rules = db.tables.alert_suppression_rules.filter(r => r.id != req.params.id && r.user_id === userId);
      }
    }

    res.json({ success: true, message: 'Suppression rule deleted' });
  } catch (error) {
    logger.error('Delete suppression rule error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/notification-channels', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let channels;
    try {
      channels = await db.query('SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    } catch (e) {
      channels = (db.getTable('notification_channels') || []).filter(c => c.user_id === userId);
    }

    res.json({ success: true, data: channels, availableTypes: NOTIFICATION_CHANNELS });
  } catch (error) {
    logger.error('Get notification channels error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notification-channels', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, config, name, enabled = true } = req.body;
    if (!type || !NOTIFICATION_CHANNELS.includes(type)) {
      return res.status(400).json({ error: `Invalid channel type. Must be one of: ${NOTIFICATION_CHANNELS.join(', ')}` });
    }

    const channel = {
      user_id: userId,
      name: name || `${type} Channel`,
      type,
      config: config ? JSON.stringify(config) : null,
      enabled,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('notification_channels', channel);
    } catch (e) {
      if (!db.tables.notification_channels) db.tables.notification_channels = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.notification_channels || 0) + 1;
      db.ids.notification_channels = newId;
      result = { insertId: newId };
      db.tables.notification_channels.push({ id: newId, ...channel });
    }

    res.status(201).json({ success: true, data: { id: result.insertId, ...channel } });
  } catch (error) {
    logger.error('Create notification channel error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/subscribe', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const robotId = req.query.robotId || 'robomate-001';
    const robot = robotManager.getRobot(robotId);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });
    
    robotManager.bindParentToRobot(userId, robotId);

    const status = robot.getStatus();
    let recentAlerts;
    try {
      recentAlerts = await db.query(
        'SELECT * FROM alerts WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 50',
        [userId, new Date(Date.now() - 1440 * 60 * 1000).toISOString()]
      );
    } catch (e) {
      recentAlerts = (db.getTable('alerts') || [])
        .filter(a => a.user_id === userId && new Date(a.created_at) >= new Date(Date.now() - 1440 * 60 * 1000))
        .slice(0, 50);
    }

    res.json({ success: true, data: { robot: status, alerts: recentAlerts } });
  } catch (error) {
    logger.error('Subscribe error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/simulate', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, childName, details, severity = 'info' } = req.body;
    const alert = alertService.sendChildAlert(
      userId, 
      childName || 'Child', 
      type || 'info', 
      details || 'Simulated alert'
    );
    
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    logger.error('Simulate alert error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:alertId', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let history;
    try {
      history = await db.query(
        `SELECT ah.*, u.username 
         FROM alert_history ah 
         LEFT JOIN users u ON ah.user_id = u.id 
         WHERE ah.alert_id = $1 
         ORDER BY ah.created_at DESC`,
        [req.params.alertId]
      );
    } catch (e) {
      history = (db.getTable('alert_history') || []).filter(h => h.alert_id == req.params.alertId);
    }

    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Get alert history error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getUnreadCount(userId) {
  try {
    const result = await db.queryOne(
      'SELECT COUNT(*) as count FROM alerts WHERE user_id = $1 AND acknowledged = false',
      [userId]
    );
    return result?.count || 0;
  } catch (e) {
    return (db.getTable('alerts') || []).filter(a => a.user_id === userId && !a.acknowledged).length;
  }
}

async function getAlertStats(userId) {
  try {
    const alerts = (db.getTable('alerts') || []).filter(a => a.user_id === userId);
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: alerts.length,
      unread: alerts.filter(a => !a.acknowledged).length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      escalated: alerts.filter(a => a.escalated).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      byType: {},
      last24h: alerts.filter(a => new Date(a.created_at) >= last24h).length,
      last7d: alerts.filter(a => new Date(a.created_at) >= last7d).length
    };

    ALERT_TYPES.forEach(type => {
      stats.byType[type] = alerts.filter(a => a.type === type).length;
    });

    return stats;
  } catch (e) {
    return {};
  }
}

async function getRecentAlertActivity(userId) {
  try {
    const alerts = (db.getTable('alerts') || [])
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    return alerts;
  } catch (e) {
    return [];
  }
}

async function addAlertHistory(alertId, action, userId, details = {}) {
  const history = {
    alert_id: alertId,
    user_id: userId,
    action,
    details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
    created_at: new Date().toISOString()
  };

  try {
    await db.insert('alert_history', history);
  } catch (e) {
    if (!db.tables.alert_history) db.tables.alert_history = [];
    db.tables.alert_history.push(history);
  }
}

async function sendNotifications(alert, channels) {
  logger.info('Sending notifications for alert', { alertId: alert.id, channels });
  return true;
}

async function checkEscalationRules(alert) {
  if (alert.severity === 'critical') {
    logger.info('Critical alert detected - checking escalation', { alertId: alert.id });
  }
  return true;
}

async function sendEscalationNotification(alert, escalateTo, reason) {
  logger.info('Sending escalation notification', { 
    alertId: alert.id, 
    escalateTo, 
    reason 
  });
  return true;
}

module.exports = router;
