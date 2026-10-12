const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { encryptObject, decryptObject } = require('../utils/encryption');

const PII_FIELDS = ['first_name', 'last_name', 'phone'];
const CHILD_PII = ['name', 'first_name', 'last_name'];

router.get('/me', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await db.get(
            'SELECT id, username, email, role, first_name, last_name, phone, country FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(decryptObject(user, PII_FIELDS));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/me', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { first_name, last_name, phone, country } = req.body;
        const encrypted = encryptObject({ first_name, last_name, phone }, PII_FIELDS);

        await db.run(
            'UPDATE users SET first_name = ?, last_name = ?, phone = ?, country = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [encrypted.first_name, encrypted.last_name, encrypted.phone, country, userId]
        );

        const user = await db.get(
            'SELECT id, username, email, role, first_name, last_name, phone, country FROM users WHERE id = ?',
            [userId]
        );

        res.json({ message: 'Profile updated successfully', user: decryptObject(user, PII_FIELDS) });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/children', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const children = await db.all(
            'SELECT * FROM children WHERE parent_id = ?',
            [userId]
        );

        res.json(children.map(c => decryptObject(c, CHILD_PII)));
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/children', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, age, grade, avatar, learning_goals } = req.body;
        const encrypted = encryptObject({ name }, CHILD_PII);

        const result = await db.run(
            'INSERT INTO children (parent_id, name, age, grade, avatar, learning_goals) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, encrypted.name, age, grade, avatar, learning_goals]
        );

        const child = await db.get('SELECT * FROM children WHERE id = ?', [result.lastID]);

        res.status(201).json({ message: 'Child added successfully', child: decryptObject(child, CHILD_PII) });
    } catch (error) {
        console.error('Add child error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/children/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const childId = req.params.id;
        const { name, age, grade, avatar, learning_goals } = req.body;
        const encrypted = encryptObject({ name }, CHILD_PII);

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        await db.run(
            'UPDATE children SET name = ?, age = ?, grade = ?, avatar = ?, learning_goals = ? WHERE id = ?',
            [encrypted.name, age, grade, avatar, learning_goals, childId]
        );

        const updatedChild = await db.get('SELECT * FROM children WHERE id = ?', [childId]);

        res.json({ message: 'Child updated successfully', child: decryptObject(updatedChild, CHILD_PII) });
    } catch (error) {
        console.error('Update child error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/children/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const childId = req.params.id;

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        await db.run('DELETE FROM children WHERE id = ?', [childId]);

        res.json({ message: 'Child deleted successfully' });
    } catch (error) {
        console.error('Delete child error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin: get all users ──
router.get('/admin/users', async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let query = 'SELECT id, username, email, role, first_name, last_name, country, school_id, created_at, updated_at FROM users';
        const params = [];

        // School admin can only see their school's users
        if (req.user?.role === 'school_admin') {
            query += ' WHERE school_id = ?';
            params.push(req.user.schoolId);
        }

        query += ' ORDER BY created_at DESC';
        const users = await db.all(query, params);
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin: search users ──
router.get('/admin/users/search', async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { q, role, status } = req.query;
        let query = 'SELECT id, username, email, role, first_name, last_name, country, school_id, created_at FROM users WHERE 1=1';
        const params = [];

        if (q) { query += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'; const s = `%${q}%`; params.push(s, s, s, s); }
        if (role) { query += ' AND role = ?'; params.push(role); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (req.user?.role === 'school_admin') { query += ' AND school_id = ?'; params.push(req.user.schoolId); }

        query += ' ORDER BY created_at DESC LIMIT 50';
        const users = await db.all(query, params);
        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin: create user ──
router.post('/admin/users', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin only' });
        }

        const { username, email, password, role, first_name, last_name, country, school_id } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, password required' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, role, first_name, last_name, country, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role || 'parent', first_name, last_name, country, school_id || null]
        );

        const user = await db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [result.lastID]);
        res.status(201).json({ message: 'User created', user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin: update user ──
router.put('/admin/users/:id', async (req, res) => {
    try {
        if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const userId = req.params.id;
        const { role, status, school_id } = req.body;

        // School admin can only modify their school's users
        if (req.user?.role === 'school_admin') {
            const existing = await db.get('SELECT school_id FROM users WHERE id = ?', [userId]);
            if (!existing || existing.school_id !== req.user.schoolId) {
                return res.status(403).json({ error: 'Cannot modify users outside your school' });
            }
        }

        const updates = [];
        const params = [];
        if (role) { updates.push('role = ?'); params.push(role); }
        if (status) { updates.push('status = ?'); params.push(status); }
        if (school_id && req.user?.role === 'admin') { updates.push('school_id = ?'); params.push(school_id); }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        const user = await db.get('SELECT id, username, email, role, status, school_id FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User updated', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin: delete user (GDPR) ──
router.delete('/admin/users/:id', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin only' });
        }
        const userId = req.params.id;
        // Anonymize for GDPR compliance rather than hard delete
        await db.run(
            "UPDATE users SET username = 'deleted_user_' || id, email = 'deleted@anon.eu', password_hash = '', first_name = 'Deleted', last_name = 'User', status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [userId]
        );
        res.json({ message: 'User data deleted (GDPR anonymized)' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── User Preferences ──
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    let prefs = await db.get('SELECT preferences FROM user_preferences WHERE user_id = ?', [userId]);
    res.json({ success: true, data: prefs ? JSON.parse(prefs.preferences) : {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const existing = await db.get('SELECT id FROM user_preferences WHERE user_id = ?', [userId]);
    const data = JSON.stringify(req.body);
    if (existing) {
      await db.run('UPDATE user_preferences SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [data, userId]);
    } else {
      await db.run('INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?)', [userId, data]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Activity Log ──
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { limit = 20 } = req.query;
    const activities = await db.all('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, parseInt(limit)]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activity', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { action, details, ip } = req.body;
    await db.run('INSERT INTO activity_log (user_id, action, details, ip) VALUES (?, ?, ?, ?)', [userId, action || 'unknown', details || '', ip || '']);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Admin: bulk operations ──
router.post('/admin/users/bulk-status', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { userIds, status } = req.body;
    if (!userIds || !Array.isArray(userIds) || !status) return res.status(400).json({ error: 'userIds array and status required' });
    for (const id of userIds) {
      await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    }
    res.json({ success: true, updated: userIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/users/stats', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });
    let query = 'SELECT role, status, COUNT(*) as count FROM users';
    const params = [];
    if (req.user?.role === 'school_admin') { query += ' WHERE school_id = ?'; params.push(req.user.schoolId); }
    query += ' GROUP BY role, status';
    const stats = await db.all(query, params);
    const total = await db.get('SELECT COUNT(*) as total FROM users' + (req.user?.role === 'school_admin' ? ' WHERE school_id = ?' : ''), req.user?.role === 'school_admin' ? [req.user.schoolId] : []);
    res.json({ success: true, data: { breakdown: stats, total: total.total } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Child Progress Tracking ──
router.get('/children/:id/progress', async (req, res) => {
  try {
    const userId = req.user.userId;
    const childId = req.params.id;
    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    const progress = await db.all('SELECT * FROM learning_progress WHERE child_id = ? ORDER BY updated_at DESC LIMIT 50', [childId]);
    const stats = await db.get('SELECT COUNT(*) as totalTopics, SUM(CASE WHEN mastery_level >= 80 THEN 1 ELSE 0 END) as mastered, AVG(mastery_level) as avgMastery, SUM(total_time_spent) as totalTime FROM learning_progress WHERE child_id = ?', [childId]);
    res.json({ success: true, data: { child: decryptObject(child, CHILD_PII), progress, stats } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/children/:id/progress', async (req, res) => {
  try {
    const userId = req.user.userId;
    const childId = req.params.id;
    const { subject, topic, masteryLevel, timeSpent, activityType } = req.body;
    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    await db.run('INSERT INTO learning_progress (child_id, subject, topic, mastery_level, time_spent, activity_type) VALUES (?, ?, ?, ?, ?, ?)', [childId, subject || 'general', topic || 'general', masteryLevel || 0, timeSpent || 0, activityType || 'general']);
    res.status(201).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Parent-Child Communication ──
router.post('/children/:id/message', async (req, res) => {
  try {
    const userId = req.user.userId;
    const childId = req.params.id;
    const { message, type } = req.body;
    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    await db.run('INSERT INTO parent_child_messages (parent_id, child_id, message, type) VALUES (?, ?, ?, ?)', [userId, childId, message || '', type || 'text']);
    res.status(201).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/children/:id/messages', async (req, res) => {
  try {
    const userId = req.user.userId;
    const childId = req.params.id;
    const { limit } = req.query;
    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    const messages = await db.all('SELECT * FROM parent_child_messages WHERE child_id = ? ORDER BY created_at DESC LIMIT ?', [childId, parseInt(limit) || 50]);
    res.json({ success: true, data: messages });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── School Management ──
router.get('/schools', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });
    const schools = await db.all('SELECT * FROM schools ORDER BY name');
    res.json({ success: true, data: schools });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/schools', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, address, country, contactEmail, contactPhone } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await db.run('INSERT INTO schools (name, address, country, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)', [name, address || '', country || '', contactEmail || '', contactPhone || '']);
    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Family Group Management ──
router.post('/family', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await db.run('INSERT INTO family_groups (name, created_by) VALUES (?, ?)', [name, userId]);
    await db.run('INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)', [result.lastID, userId, 'admin']);
    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/family/:familyId/members', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { familyId } = req.params;
    const { memberId, role } = req.body;
    const membership = await db.get('SELECT * FROM family_members WHERE family_id = ? AND user_id = ? AND role = ?', [familyId, userId, 'admin']);
    if (!membership) return res.status(403).json({ error: 'Not authorized' });
    await db.run('INSERT OR IGNORE INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)', [familyId, memberId, role || 'member']);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/family', async (req, res) => {
  try {
    const userId = req.user.userId;
    const families = await db.all('SELECT f.*, fm.role FROM family_groups f JOIN family_members fm ON f.id = fm.family_id WHERE fm.user_id = ?', [userId]);
    res.json({ success: true, data: families });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;