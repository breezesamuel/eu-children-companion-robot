const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const contentService = require('../services/content-service');

router.get('/lessons', async (req, res) => {
  try {
    await contentService.waitForReady();
    const { topic, category, level, limit = 5 } = req.query;
    if (!topic && !category) {
      const stats = contentService.getStats();
      return res.json({ success: true, data: [], categories: Object.keys(stats.byCategory), message: 'Specify a topic or category to search for lessons' });
    }
    const result = contentService.search(topic || '', { category, level, limit: parseInt(limit) });
    res.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recommend/:child_id', async (req, res) => {
  try {
    await contentService.waitForReady();
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const childId = req.params.child_id;
    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const records = await db.all('SELECT activity_type, COUNT(*) as cnt FROM learning_records WHERE child_id = ? GROUP BY activity_type ORDER BY cnt DESC LIMIT 3', [childId]);
    const recentTopics = await db.all('SELECT activity_name FROM learning_records WHERE child_id = ? ORDER BY created_at DESC LIMIT 5', [childId]);

    const age = child.age || 8;
    const preferredCats = records.map(r => r.activity_type).filter(Boolean);
    const allCats = Object.keys(contentService.getStats().byCategory);

    let recommendations = [];
    if (preferredCats.length > 0) {
      for (const cat of preferredCats) {
        const catKey = allCats.find(c => c.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(c.toLowerCase()));
        if (catKey) recommendations.push(...contentService.getForChild(age, catKey, 5));
      }
    }
    if (recommendations.length < 10) {
      for (const cat of allCats.slice(0, 4)) {
        recommendations.push(...contentService.getForChild(age, cat, 3));
      }
    }

    const unique = [];
    const seen = new Set();
    for (const item of recommendations) {
      if (!seen.has(item.id)) { seen.add(item.id); unique.push(item); }
    }

    res.json({ success: true, child_id: childId, age, recentTopics: recentTopics.map(r => r.activity_name).filter(Boolean), data: unique.slice(0, 20) });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/records', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { child_id, activity_type, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT lr.*, c.name as child_name 
            FROM learning_records lr
            JOIN children c ON lr.child_id = c.id
            WHERE c.parent_id = ?
        `;
        let params = [userId];

        if (child_id) {
            query += ' AND lr.child_id = ?';
            params.push(child_id);
        }

        if (activity_type) {
            query += ' AND lr.activity_type = ?';
            params.push(activity_type);
        }

        query += ' ORDER BY lr.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const records = await db.all(query, params);

        res.json(records);
    } catch (error) {
        console.error('Get learning records error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/records', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { child_id, activity_type, activity_name, duration, score, progress, completed, metadata } = req.body;

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [child_id, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await db.run(
            'INSERT INTO learning_records (child_id, activity_type, activity_name, duration, score, progress, completed, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [child_id, activity_type, activity_name, duration, score, progress, completed, metadata]
        );

        const record = await db.get('SELECT * FROM learning_records WHERE id = ?', [result.lastID]);

        res.status(201).json({ message: 'Learning record created', record });
    } catch (error) {
        console.error('Create learning record error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/progress/:child_id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const childId = req.params.child_id;

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const progress = await db.all(`
            SELECT activity_type, 
                   COUNT(*) as total_activities,
                   AVG(progress) as avg_progress,
                   SUM(duration) as total_duration,
                   SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_count
            FROM learning_records 
            WHERE child_id = ?
            GROUP BY activity_type
        `, [childId]);

        res.json({ child_id: childId, progress });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/achievements/:child_id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const childId = req.params.child_id;

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const achievements = await db.all('SELECT * FROM achievements WHERE child_id = ? OR child_id IS NULL', [childId]);

        res.json(achievements);
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/achievements/:child_id/unlock', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const childId = req.params.child_id;
        const { achievement_id } = req.body;

        const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [childId, userId]);
        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const achievement = await db.get('SELECT * FROM achievements WHERE id = ?', [achievement_id]);
        if (!achievement) {
            return res.status(404).json({ error: 'Achievement not found' });
        }

        const existing = await db.get('SELECT * FROM achievements WHERE id = ?', [achievement.id]);
        if (existing) {
            await db.run(
                'UPDATE achievements SET unlocked = ?, unlocked_at = CURRENT_TIMESTAMP WHERE id = ?',
                [true, achievement.id]
            );
        } else {
            await db.run(
                'INSERT INTO achievements (id, child_id, title, description, icon, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [achievement.id, childId, achievement.title, achievement.description, achievement.icon, true]
            );
        }

        res.json({ message: 'Achievement unlocked!' });
    } catch (error) {
        console.error('Unlock achievement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/courses', async (req, res) => {
    try {
        const { category, difficulty, limit = 10, offset = 0 } = req.query;

        let query = 'SELECT * FROM courses';
        let params = [];

        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }

        if (difficulty) {
            query += (category ? ' AND' : ' WHERE') + ' difficulty = ?';
            params.push(difficulty);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const courses = await db.all(query, params);

        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/courses/:id', async (req, res) => {
    try {
        const course = await db.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;