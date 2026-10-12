const express = require('express');
const router = express.Router();
const db = require('../../utils/database');
const logger = require('../../utils/logger');
const analytics = require('./analytics');
const robotManager = require('../../services/robot-manager');
const crypto = require('crypto');

const ADMIN_ROLES = ['admin', 'school_admin', 'moderator'];
const PERMISSIONS = {
  users: 'manage_users',
  roles: 'manage_roles',
  content: 'manage_content',
  analytics: 'view_analytics',
  settings: 'manage_settings',
  robots: 'manage_robots',
  orders: 'manage_orders',
  tickets: 'manage_tickets',
  support: 'manage_support'
};

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  };
}

router.use('/analytics', analytics);

router.get('/status', requireRole(...ADMIN_ROLES), (req, res) => {
  res.json({
    success: true,
    data: {
      adminRoles: ADMIN_ROLES,
      permissions: Object.values(PERMISSIONS),
      currentUser: {
        id: req.user.userId,
        role: req.user.role
      }
    }
  });
});

router.get('/users', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { role, status, search, limit = 50, offset = 0 } = req.query;

    let users;
    try {
      let query = 'SELECT id, username, email, role, first_name, last_name, email_verified, status, last_login_at, created_at FROM users WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (role) {
        query += ` AND role = $${paramIndex++}`;
        params.push(role);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (search) {
        query += ` AND (username LIKE $${paramIndex++} OR email LIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      users = await db.query(query, params);
    } catch (e) {
      users = db.getTable('users') || [];
      users = users
        .filter(u => !role || u.role === role)
        .filter(u => !status || u.status === status)
        .filter(u => !search || 
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const usersWithCounts = await Promise.all(users.map(async (user) => {
      let childCount = 0;
      let orderCount = 0;
      let subscription = null;

      try {
        const childResult = await db.queryOne('SELECT COUNT(*) as count FROM children WHERE parent_id = $1', [user.id]);
        childCount = childResult?.count || 0;
      } catch (e) {
        childCount = (db.getTable('children') || []).filter(c => c.parent_id === user.id).length;
      }

      try {
        const orderResult = await db.queryOne('SELECT COUNT(*) as count FROM orders WHERE user_id = $1', [user.id]);
        orderCount = orderResult?.count || 0;
      } catch (e) {
        orderCount = (db.getTable('orders') || []).filter(o => o.user_id === user.id).length;
      }

      try {
        subscription = await db.queryOne('SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
      } catch (e) {
        const subs = (db.getTable('user_subscriptions') || []).filter(s => s.user_id === user.id);
        subscription = subs.length > 0 ? subs[subs.length - 1] : null;
      }

      return {
        ...user,
        childCount,
        orderCount,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          plan_id: subscription.plan_id
        } : null
      };
    }));

    res.json({
      success: true,
      data: usersWithCounts,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    let user;
    try {
      user = await db.queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    } catch (e) {
      user = (db.getTable('users') || []).find(u => u.id == req.params.id);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    let children = [];
    try {
      children = await db.query('SELECT * FROM children WHERE parent_id = $1', [user.id]);
    } catch (e) {
      children = (db.getTable('children') || []).filter(c => c.parent_id === user.id);
    }

    let orders = [];
    try {
      orders = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [user.id]);
    } catch (e) {
      orders = (db.getTable('orders') || [])
        .filter(o => o.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    }

    let subscription = null;
    try {
      subscription = await db.queryOne('SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
    } catch (e) {
      const subs = (db.getTable('user_subscriptions') || []).filter(s => s.user_id === user.id);
      subscription = subs.length > 0 ? subs[subs.length - 1] : null;
    }

    let robots = [];
    try {
      robots = await db.query('SELECT * FROM robots WHERE owner_id = $1', [user.id]);
    } catch (e) {
      robots = (db.getTable('robots') || []).filter(r => r.owner_id === user.id);
    }

    let activityLog = [];
    try {
      activityLog = await db.query(`
        (SELECT 'login' as type, created_at, NULL as details FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20)
        UNION ALL
        (SELECT 'ticket' as type, created_at, subject as details FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20)
        ORDER BY created_at DESC LIMIT 30
      `, [user.id]);
    } catch (e) {
      activityLog = [];
    }

    res.json({
      success: true,
      data: {
        user: {
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
          last_login_ip: user.last_login_ip,
          login_count: user.login_count || 0,
          created_at: user.created_at
        },
        children,
        orders: orders.map(o => ({
          ...o,
          items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
        })),
        subscription: subscription ? {
          ...subscription,
          metadata: subscription.metadata ? JSON.parse(subscription.metadata) : {}
        } : null,
        robots,
        activityLog
      }
    });
  } catch (error) {
    logger.error('Get user detail error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/role', requireRole('admin'), async (req, res) => {
  try {
    const { role, permissions } = req.body;

    if (!role) return res.status(400).json({ error: 'Role is required' });

    const validRoles = [...ADMIN_ROLES, 'parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    let user;
    try {
      user = await db.queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    } catch (e) {
      user = (db.getTable('users') || []).find(u => u.id == req.params.id);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const oldRole = user.role;

    try {
      await db.run('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [role, req.params.id]);
    } catch (e) {
      const idx = (db.tables.users || []).findIndex(u => u.id == req.params.id);
      if (idx >= 0) {
        db.tables.users[idx].role = role;
        db.tables.users[idx].updated_at = new Date().toISOString();
      }
    }

    await addAdminActivity(req.user.userId, 'role_changed', {
      userId: req.params.id,
      username: user.username,
      oldRole,
      newRole: role
    });

    res.json({
      success: true,
      message: `User ${user.username} role updated from ${oldRole} to ${role}`
    });
  } catch (error) {
    logger.error('Update user role error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status` });
    }

    let user;
    try {
      user = await db.queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    } catch (e) {
      user = (db.getTable('users') || []).find(u => u.id == req.params.id);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const oldStatus = user.status;

    try {
      await db.run('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, req.params.id]);
    } catch (e) {
      const idx = (db.tables.users || []).findIndex(u => u.id == req.params.id);
      if (idx >= 0) {
        db.tables.users[idx].status = status;
        db.tables.users[idx].updated_at = new Date().toISOString();
      }
    }

    await addAdminActivity(req.user.userId, 'status_changed', {
      userId: req.params.id,
      username: user.username,
      oldStatus,
      newStatus: status,
      reason
    });

    res.json({
      success: true,
      message: `User ${user.username} status updated from ${oldStatus} to ${status}`
    });
  } catch (error) {
    logger.error('Update user status error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/roles', requireRole('admin'), (req, res) => {
  res.json({
    success: true,
    data: {
      roles: [
        { name: 'admin', description: 'Full system access', permissions: Object.values(PERMISSIONS) },
        { name: 'school_admin', description: 'School administration', permissions: ['manage_users', 'view_analytics', 'manage_robots'] },
        { name: 'moderator', description: 'Content moderation', permissions: ['manage_content', 'manage_tickets'] },
        { name: 'parent', description: 'Regular user', permissions: [] }
      ],
      availablePermissions: Object.entries(PERMISSIONS).map(([key, value]) => ({ key, description: `Permission for ${key}` }))
    }
  });
});

router.get('/activity-log', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { action, userId, limit = 100, offset = 0 } = req.query;

    let logs;
    try {
      let query = `SELECT al.*, u.username as admin_name
                   FROM admin_activity_log al
                   LEFT JOIN users u ON al.admin_id = u.id
                   WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (action) {
        query += ` AND al.action = $${paramIndex++}`;
        params.push(action);
      }
      if (userId) {
        query += ` AND al.admin_id = $${paramIndex++}`;
        params.push(userId);
      }

      query += ' ORDER BY al.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      logs = await db.query(query, params);
    } catch (e) {
      logs = db.getTable('admin_activity_log') || [];
      const users = db.getTable('users') || [];
      logs = logs
        .filter(l => !action || l.action === action)
        .filter(l => !userId || l.admin_id == userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
        .map(l => ({
          ...l,
          admin_name: users.find(u => u.id === l.admin_id)?.username
        }));
    }

    res.json({
      success: true,
      data: logs.map(l => ({
        ...l,
        details: l.details ? JSON.parse(l.details) : {}
      })),
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Activity log error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard-stats', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const users = db.getTable('users') || [];
    const children = db.getTable('children') || [];
    const orders = db.getTable('orders') || [];
    const subscriptions = db.getTable('user_subscriptions') || [];
    const tickets = db.getTable('support_tickets') || [];
    const robots = db.getTable('robots') || [];

    const now = new Date();
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid');
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');

    const stats = {
      summary: {
        totalUsers: users.length,
        totalChildren: children.length,
        totalOrders: orders.length,
        totalRevenue: completedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0),
        activeSubscriptions: activeSubscriptions.length,
        totalRobots: robots.length
      },
      byStatus: {
        usersByRole: {},
        ordersByStatus: {},
        ticketsByStatus: {},
        robotsByStatus: {}
      },
      recentActivity: {
        newUsersLast30d: users.filter(u => new Date(u.created_at) >= last30d).length,
        newUsersLast7d: users.filter(u => new Date(u.created_at) >= last7d).length,
        ordersLast30d: orders.filter(o => new Date(o.created_at) >= last30d).length,
        revenueLast30d: orders
          .filter(o => new Date(o.created_at) >= last30d && (o.status === 'completed' || o.status === 'paid'))
          .reduce((sum, o) => sum + (o.amount_total || 0), 0)
      }
    };

    const roles = ['admin', 'school_admin', 'parent'];
    roles.forEach(role => {
      stats.byStatus.usersByRole[role] = users.filter(u => u.role === role).length;
    });

    const orderStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    orderStatuses.forEach(status => {
      stats.byStatus.ordersByStatus[status] = orders.filter(o => o.status === status).length;
    });

    const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    ticketStatuses.forEach(status => {
      stats.byStatus.ticketsByStatus[status] = tickets.filter(t => t.status === status).length;
    });

    const robotStatuses = ['online', 'offline', 'sleeping', 'charging', 'error'];
    robotStatuses.forEach(status => {
      stats.byStatus.robotsByStatus[status] = robots.filter(r => r.status === status).length;
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings', requireRole('admin'), async (req, res) => {
  try {
    let settings;
    try {
      settings = await db.query('SELECT * FROM system_settings ORDER BY category, key');
    } catch (e) {
      settings = (db.getTable('system_settings') || []).sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.key.localeCompare(b.key);
      });
    }

    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = {
        value: s.value ? (typeof s.value.startsWith('{') || s.value.startsWith('[') ? JSON.parse(s.value) : s.value) : s.value,
        description: s.description,
        type: s.type,
        editable: s.editable !== false
      };
    });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    logger.error('Get settings error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', requireRole('admin'), async (req, res) => {
  try {
    const { key, value, category = 'general' } = req.body;

    if (!key) return res.status(400).json({ error: 'Key is required' });

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    let existing;
    try {
      existing = await db.queryOne('SELECT * FROM system_settings WHERE category = $1 AND key = $2', [category, key]);
    } catch (e) {
      existing = (db.getTable('system_settings') || []).find(s => s.category === category && s.key === key);
    }

    if (existing) {
      try {
        await db.run(
          'UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 AND key = $3',
          [stringValue, category, key]
        );
      } catch (e) {
        const idx = (db.tables.system_settings || []).findIndex(s => s.category === category && s.key === key);
        if (idx >= 0) {
          db.tables.system_settings[idx].value = stringValue;
          db.tables.system_settings[idx].updated_at = new Date().toISOString();
        }
      }
    } else {
      const newSetting = {
        category,
        key,
        value: stringValue,
        type: typeof value === 'object' ? 'json' : 'string',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        await db.insert('system_settings', newSetting);
      } catch (e) {
        if (!db.tables.system_settings) db.tables.system_settings = [];
        db.tables.system_settings.push(newSetting);
      }
    }

    await addAdminActivity(req.user.userId, 'setting_changed', {
      category,
      key,
      value
    });

    logger.info('System setting updated', { category, key });
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    logger.error('Update setting error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/announcements', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    let announcements;
    try {
      announcements = await db.query(
        'SELECT * FROM announcements ORDER BY created_at DESC'
      );
    } catch (e) {
      announcements = (db.getTable('announcements') || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({
      success: true,
      data: announcements.map(a => ({
        ...a,
        isActive: a.status === 'active' &&
          (!a.start_date || new Date() >= new Date(a.start_date)) &&
          (!a.end_date || new Date() <= new Date(a.end_date))
      }))
    });
  } catch (error) {
    logger.error('Get announcements error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/announcements', requireRole('admin'), async (req, res) => {
  try {
    const { title, content, priority = 'normal', target_roles, start_date, end_date, type = 'general' } = req.body;

    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const announcement = {
      title,
      content,
      priority,
      target_roles: target_roles ? JSON.stringify(target_roles) : null,
      start_date: start_date || null,
      end_date: end_date || null,
      type,
      status: 'active',
      created_by: req.user.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const result = await db.insert('announcements', announcement);
      announcement.id = result.insertId;
    } catch (e) {
      if (!db.tables.announcements) db.tables.announcements = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.announcements || 0) + 1;
      db.ids.announcements = newId;
      announcement.id = newId;
      db.tables.announcements.push({ id: newId, ...announcement });
    }

    await addAdminActivity(req.user.userId, 'announcement_created', {
      announcementId: announcement.id,
      title
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created',
      data: announcement
    });
  } catch (error) {
    logger.error('Create announcement error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/api-keys', requireRole('admin'), async (req, res) => {
  try {
    let keys;
    try {
      keys = await db.query(
        `SELECT ak.*, u.username as created_by_name
         FROM admin_api_keys ak
         LEFT JOIN users u ON ak.created_by = u.id
         ORDER BY ak.created_at DESC`
      );
    } catch (e) {
      const users = db.getTable('users') || [];
      keys = db.getTable('admin_api_keys') || [];
      keys = keys.map(k => ({
        ...k,
        created_by_name: users.find(u => u.id === k.created_by)?.username
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({
      success: true,
      data: keys.map(k => ({
        ...k,
        permissions: k.permissions ? JSON.parse(k.permissions) : [],
        key_masked: '****' + k.key?.slice(-4)
      }))
    });
  } catch (error) {
    logger.error('Get API keys error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api-keys', requireRole('admin'), async (req, res) => {
  try {
    const { name, permissions, expires_at } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = {
      key: keyHash,
      name,
      permissions: permissions ? JSON.stringify(permissions) : '[]',
      expires_at: expires_at || null,
      status: 'active',
      last_used_at: null,
      created_by: req.user.userId,
      created_at: new Date().toISOString()
    };

    try {
      const result = await db.insert('admin_api_keys', keyRecord);
      keyRecord.id = result.insertId;
    } catch (e) {
      if (!db.tables.admin_api_keys) db.tables.admin_api_keys = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.admin_api_keys || 0) + 1;
      db.ids.admin_api_keys = newId;
      keyRecord.id = newId;
      db.tables.admin_api_keys.push({ id: newId, ...keyRecord });
    }

    await addAdminActivity(req.user.userId, 'api_key_created', {
      keyName: name
    });

    res.status(201).json({
      success: true,
      message: "API key created - store this key now, it won't be shown again",
      data: {
        id: keyRecord.id,
        key: apiKey,
        name,
        permissions,
        expires_at
      }
    });
  } catch (error) {
    logger.error('Create API key error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/api-keys/:id/revoke', requireRole('admin'), async (req, res) => {
  try {
    try {
      await db.run('UPDATE admin_api_keys SET status = $1, revoked_at = CURRENT_TIMESTAMP WHERE id = $2', ['revoked', req.params.id]);
    } catch (e) {
      const idx = (db.tables.admin_api_keys || []).findIndex(k => k.id == req.params.id);
      if (idx >= 0) {
        db.tables.admin_api_keys[idx].status = 'revoked';
        db.tables.admin_api_keys[idx].revoked_at = new Date().toISOString();
      }
    }

    await addAdminActivity(req.user.userId, 'api_key_revoked', {
      keyId: req.params.id
    });

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    logger.error('Revoke API key error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/backups', requireRole('admin'), async (req, res) => {
  try {
    let backups;
    try {
      backups = await db.query('SELECT * FROM system_backups ORDER BY created_at DESC');
    } catch (e) {
      backups = (db.getTable('system_backups') || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({
      success: true,
      data: backups.map(b => ({
        ...b,
        metadata: b.metadata ? JSON.parse(b.metadata) : {}
      }))
    });
  } catch (error) {
    logger.error('Get backups error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/backups', requireRole('admin'), async (req, res) => {
  try {
    const { type = 'full', description } = req.body;

    const backup = {
      type,
      description: description || `Manual backup by admin`,
      status: 'in_progress',
      size_bytes: null,
      file_path: null,
      metadata: JSON.stringify({
        initiatedBy: req.user.userId,
        tables: Object.keys(db.tables || {}).length
      }),
      created_at: new Date().toISOString()
    };

    try {
      const result = await db.insert('system_backups', backup);
      backup.id = result.insertId;
    } catch (e) {
      if (!db.tables.system_backups) db.tables.system_backups = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.system_backups || 0) + 1;
      db.ids.system_backups = newId;
      backup.id = newId;
      db.tables.system_backups.push({ id: newId, ...backup });
    }

    await addAdminActivity(req.user.userId, 'backup_initiated', {
      type,
      description
    });

    res.status(202).json({
      success: true,
      message: 'Backup initiated',
      data: backup
    });
  } catch (error) {
    logger.error('Initiate backup error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit-trail', requireRole('admin'), async (req, res) => {
  try {
    const { entity_type, entity_id, action, limit = 100, offset = 0 } = req.query;

    let auditLogs;
    try {
      let query = `SELECT al.*, u.username as actor_name
                   FROM audit_trail al
                   LEFT JOIN users u ON al.actor_id = u.id
                   WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (entity_type) {
        query += ` AND al.entity_type = $${paramIndex++}`;
        params.push(entity_type);
      }
      if (entity_id) {
        query += ` AND al.entity_id = $${paramIndex++}`;
        params.push(entity_id);
      }
      if (action) {
        query += ` AND al.action = $${paramIndex++}`;
        params.push(action);
      }

      query += ' ORDER BY al.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      auditLogs = await db.query(query, params);
    } catch (e) {
      const users = db.getTable('users') || [];
      auditLogs = (db.getTable('audit_trail') || [])
        .filter(l => !entity_type || l.entity_type === entity_type)
        .filter(l => !entity_id || l.entity_id == entity_id)
        .filter(l => !action || l.action === action)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
        .map(l => ({
          ...l,
          actor_name: users.find(u => u.id === l.actor_id)?.username
        }));
    }

    res.json({
      success: true,
      data: auditLogs.map(l => ({
        ...l,
        old_values: l.old_values ? JSON.parse(l.old_values) : null,
        new_values: l.new_values ? JSON.parse(l.new_values) : null
      })),
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Audit trail error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system', requireRole('admin'), (req, res) => {
  const tables = Object.keys(db.tables || {}).map(name => ({
    name,
    count: (db.getTable(name) || []).length
  }));

  res.json({
    success: true,
    data: {
      version: '2.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      tables,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        external: Math.round((process.memoryUsage().external || 0) / 1024 / 1024) + 'MB'
      }
    }
  });
});

router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        aiAgents: true,
        streaming: true,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        email: !!(process.env.SENDGRID_API_KEY || process.env.SMTP_HOST),
        postgres: !!process.env.DATABASE_URL,
        encryption: true
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        platform: process.platform
      }
    }
  });
});

router.put('/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });

    logger.info('Config updated via admin', { key });
    res.json({ success: true, message: 'Config updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let orders;
    try {
      let query = 'SELECT * FROM orders WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      orders = await db.query(query, params);
    } catch (e) {
      orders = (db.getTable('orders') || [])
        .filter(o => !status || o.status === status)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      data: orders.map(o => ({
        ...o,
        items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
      })),
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get orders error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    let user;
    try {
      user = await db.queryOne('SELECT id, username, email, first_name, last_name FROM users WHERE id = $1', [order.user_id]);
    } catch (e) {
      user = (db.getTable('users') || []).find(u => u.id === order.user_id);
    }

    res.json({
      success: true,
      data: {
        ...order,
        items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : [],
        user: user ? { id: user.id, username: user.username, email: user.email, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() } : null
      }
    });
  } catch (error) {
    logger.error('Get order detail error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const { status, tracking_number, shipping_provider } = req.body;

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (shipping_provider) updates.shipping_provider = shipping_provider;

    try {
      await db.update('orders', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.orders || []).findIndex(o => o.id == req.params.id);
      if (idx >= 0) {
        db.tables.orders[idx] = { ...db.tables.orders[idx], ...updates };
      }
    }

    await addAdminActivity(req.user.userId, 'order_updated', {
      orderId: req.params.id,
      oldStatus: order.status,
      newStatus: status
    });

    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    logger.error('Update order error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    let tickets;
    try {
      let query = `SELECT st.*, u.username as user_name
                   FROM support_tickets st
                   LEFT JOIN users u ON st.user_id = u.id
                   WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND st.status = $${paramIndex++}`;
        params.push(status);
      }
      if (priority) {
        query += ` AND st.priority = $${paramIndex++}`;
        params.push(priority);
      }

      query += ' ORDER BY st.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      tickets = await db.query(query, params);
    } catch (e) {
      const users = db.getTable('users') || [];
      tickets = (db.getTable('support_tickets') || [])
        .filter(t => !status || t.status === status)
        .filter(t => !priority || t.priority === priority)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
        .map(t => ({
          ...t,
          user_name: users.find(u => u.id === t.user_id)?.username
        }));
    }

    res.json({
      success: true,
      data: tickets,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get tickets error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    let user;
    try {
      user = await db.queryOne('SELECT id, username, email FROM users WHERE id = $1', [ticket.user_id]);
    } catch (e) {
      user = (db.getTable('users') || []).find(u => u.id === ticket.user_id);
    }

    let responses;
    try {
      responses = await db.query(
        `SELECT r.*, u.username
         FROM support_ticket_responses r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.ticket_id = $1
         ORDER BY r.created_at ASC`,
        [ticket.id]
      );
    } catch (e) {
      const users = db.getTable('users') || [];
      responses = (db.getTable('support_ticket_responses') || [])
        .filter(r => r.ticket_id == ticket.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(r => ({
          ...r,
          username: users.find(u => u.id === r.user_id)?.username
        }));
    }

    res.json({
      success: true,
      data: {
        ...ticket,
        user: user ? { id: user.id, username: user.username, email: user.email } : null,
        responses
      }
    });
  } catch (error) {
    logger.error('Get ticket detail error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/tickets/:id', async (req, res) => {
  try {
    const { status, assignee_id, priority } = req.body;

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (assignee_id !== undefined) updates.assignee_id = assignee_id;
    if (priority) updates.priority = priority;

    try {
      await db.update('support_tickets', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == req.params.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx] = { ...db.tables.support_tickets[idx], ...updates };
      }
    }

    await addAdminActivity(req.user.userId, 'ticket_updated', {
      ticketId: req.params.id,
      oldStatus: ticket.status,
      newStatus: status
    });

    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    logger.error('Update ticket error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/school/robots', requireRole('admin', 'school_admin'), (req, res) => {
  const robots = robotManager.getAllRobots().map(r => ({
    ...r, ownerId: r.ownerId === req.user.userId ? r.ownerId : '(other)'
  }));
  res.json({ success: true, data: robots });
});

router.get('/school/stats', requireRole('admin', 'school_admin'), (req, res) => {
  const robots = robotManager.getAllRobots();
  const online = robots.filter(r => r.state === 'online').length;
  const charging = robots.filter(r => r.state === 'charging').length;
  res.json({ success: true, data: { total: robots.length, online, offline: robots.length - online, charging } });
});

router.post('/school/robot/:id/command', requireRole('admin', 'school_admin'), (req, res) => {
  const robot = robotManager.getRobot(req.params.id);
  if (!robot) return res.status(404).json({ error: 'Robot not found' });
  const result = robot.executeCommand(req.body.command || 'status');
  res.json({ success: true, result });
});

const monitoringMiddleware = require('../../middleware/monitoring');

router.get('/monitoring/slow-requests', requireRole('admin'), (req, res) => {
  res.json({ success: true, data: monitoringMiddleware.getSlowRequests() });
});

router.get('/monitoring/auth-failures', requireRole('admin'), (req, res) => {
  res.json({ success: true, data: monitoringMiddleware.getAuthFailures() });
});

router.get('/monitoring/health', requireRole('admin'), (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true, data: {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB'
      },
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage(),
      pid: process.pid
    }
  });
});

async function addAdminActivity(adminId, action, details = {}) {
  const log = {
    admin_id: adminId,
    action,
    details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
    ip_address: null,
    created_at: new Date().toISOString()
  };

  try {
    await db.insert('admin_activity_log', log);
  } catch (e) {
    if (!db.tables.admin_activity_log) db.tables.admin_activity_log = [];
    db.tables.admin_activity_log.push(log);
  }
}

module.exports = router;
