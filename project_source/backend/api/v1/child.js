const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const { AppError } = require('../../../utils/errors');
const { validateAge, sanitizeName } = require('../../../utils/validation');
const imageProcessor = require('../../../services/image-processor');
const notificationService = require('../../../services/notification');

const CHILD_FIELDS = [
  'id', 'parent_id', 'name', 'nickname', 'birth_date', 'gender',
  'avatar_url', 'blood_type', 'allergies', 'notes',
  'learning_style', 'interests', 'language', 'timezone',
  'created_at', 'updated_at'
];

const selectFields = (req, defaults = CHILD_FIELDS) => {
  if (!req.query.fields) return defaults;
  return req.query.fields.split(',').filter(f => defaults.includes(f.trim()));
};

const calculateAgeInMonths = (birthDate) => {
  const now = new Date();
  return (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
};

const calculateAgeGroup = (months) => {
  if (months <= 12) return 'infant';
  if (months <= 36) return 'toddler';
  if (months <= 72) return 'preschool';
  if (months <= 144) return 'school_age';
  return 'adolescent';
};

// GET /children/search �?search with filtering and pagination
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q, age, interest, gender, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['parent_id = $1'];
    params.push(req.user.id);
    let paramIdx = 2;

    if (q) { conditions.push(`(name ILIKE $${paramIdx} OR nickname ILIKE $${paramIdx})`); params.push(`%${q}%`); paramIdx++; }
    if (interest) { conditions.push(`$${paramIdx} = ANY(interests)`); params.push(interest); paramIdx++; }
    if (gender) { conditions.push(`gender = $${paramIdx}`); params.push(gender); paramIdx++; }
    if (age) {
      const [min, max] = age.split('-').map(Number);
      if (!isNaN(min)) { conditions.push(`birth_date <= NOW() - INTERVAL '${min} months'`); }
      if (!isNaN(max)) { conditions.push(`birth_date >= NOW() - INTERVAL '${max + 1} months'`); }
    }
    const allowedSorts = ['name', 'created_at', 'birth_date', 'updated_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    const where = conditions.join(' AND ');
    const [{ count }] = await db.manyOrNone(`SELECT COUNT(*) FROM children WHERE ${where}`, params);
    const children = await db.manyOrNone(
      `SELECT ${selectFields(req).join(', ')} FROM children WHERE ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({
      success: true,
      data: children,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// POST /children �?create child profile
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, nickname, birth_date, gender, blood_type, allergies, notes, language, timezone } = req.body;
    if (!name || !birth_date) throw new AppError(400, 'Name and birth_date are required');
    validateAge(birth_date);
    const sanitizedName = sanitizeName(name);
    const child = await db.one(
      `INSERT INTO children (parent_id, name, nickname, birth_date, gender, blood_type, allergies, notes, language, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${selectFields(req).join(', ')}`,
      [req.user.id, sanitizedName, nickname || null, birth_date, gender || null, blood_type || null, allergies || null, notes || null, language || 'zh', timezone || 'Asia/Shanghai']
    );
    res.status(201).json({ success: true, data: child });
  } catch (err) { next(err); }
});

// GET /children �?list children for parent
router.get('/', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const fields = selectFields(req);
    const [{ count }] = await db.manyOrNone('SELECT COUNT(*) FROM children WHERE parent_id = $1', [req.user.id]);
    const children = await db.manyOrNone(
      `SELECT ${fields.join(', ')} FROM children WHERE parent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      success: true,
      data: children,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /children/:id �?get single child
router.get('/:id', auth, async (req, res, next) => {
  try {
    const fields = selectFields(req);
    const child = await db.oneOrNone(
      `SELECT ${fields.join(', ')} FROM children WHERE id = $1 AND parent_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!child) throw new AppError(404, 'Child not found');
    res.json({ success: true, data: child });
  } catch (err) { next(err); }
});

// PUT /children/:id �?update child profile
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { name, nickname, birth_date, gender, blood_type, allergies, notes, language, timezone } = req.body;
    const existing = await db.oneOrNone('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!existing) throw new AppError(404, 'Child not found');
    if (birth_date) validateAge(birth_date);
    const fields = selectFields(req);
    const child = await db.one(
      `UPDATE children SET
        name = COALESCE($1, name), nickname = COALESCE($2, nickname),
        birth_date = COALESCE($3, birth_date), gender = COALESCE($4, gender),
        blood_type = COALESCE($5, blood_type), allergies = COALESCE($6, allergies),
        notes = COALESCE($7, notes), language = COALESCE($8, language),
        timezone = COALESCE($9, timezone), updated_at = NOW()
       WHERE id = $10 AND parent_id = $11
       RETURNING ${fields.join(', ')}`,
      [name || null, nickname || null, birth_date || null, gender || null,
       blood_type || null, allergies || null, notes || null, language || null,
       timezone || null, req.params.id, req.user.id]
    );
    res.json({ success: true, data: child });
  } catch (err) { next(err); }
});

// DELETE /children/:id �?delete child
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await db.result('DELETE FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) throw new AppError(404, 'Child not found');
    res.json({ success: true, message: 'Child profile deleted' });
  } catch (err) { next(err); }
});

// POST /children/:id/avatar �?upload avatar
router.post('/:id/avatar', auth, async (req, res, next) => {
  try {
    const { avatar, avatar_type } = req.body;
    if (!avatar) throw new AppError(400, 'Avatar data is required');
    const existing = await db.oneOrNone('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!existing) throw new AppError(404, 'Child not found');
    let avatarUrl;
    if (avatar_type === 'base64') {
      avatarUrl = await imageProcessor.saveBase64Image(avatar, `children/${req.params.id}`);
    } else {
      avatarUrl = avatar;
    }
    await db.none('UPDATE children SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, req.params.id]);
    res.json({ success: true, data: { avatar_url: avatarUrl } });
  } catch (err) { next(err); }
});

// GET /children/:id/milestones �?get developmental milestones
router.get('/:id/milestones', auth, async (req, res, next) => {
  try {
    const child = await db.oneOrNone('SELECT birth_date FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const ageMonths = calculateAgeInMonths(new Date(child.birth_date));
    const milestones = await db.manyOrNone(
      `SELECT * FROM developmental_milestones
       WHERE min_age_months <= $1 AND (max_age_months IS NULL OR max_age_months >= $1)
       ORDER BY min_age_months, category`,
      [ageMonths]
    );
    const achieved = await db.manyOrNone(
      'SELECT milestone_id, achieved_at, notes FROM child_milestones WHERE child_id = $1',
      [req.params.id]
    );
    const achievedSet = new Set(achieved.map(a => a.milestone_id));
    const data = milestones.map(m => ({
      ...m,
      achieved: achievedSet.has(m.id),
      achieved_at: achieved.find(a => a.milestone_id === m.id)?.achieved_at || null,
      notes: achieved.find(a => a.milestone_id === m.id)?.notes || null,
    }));
    res.json({ success: true, data, age_months: ageMonths, age_group: calculateAgeGroup(ageMonths) });
  } catch (err) { next(err); }
});

// POST /children/:id/milestones �?record milestone achievement
router.post('/:id/milestones', auth, async (req, res, next) => {
  try {
    const { milestone_id, notes } = req.body;
    if (!milestone_id) throw new AppError(400, 'milestone_id is required');
    await db.none(
      `INSERT INTO child_milestones (child_id, milestone_id, notes)
       VALUES ($1, $2, $3) ON CONFLICT (child_id, milestone_id) DO UPDATE SET achieved_at = NOW(), notes = EXCLUDED.notes`,
      [req.params.id, milestone_id, notes || null]
    );
    res.status(201).json({ success: true, message: 'Milestone recorded' });
  } catch (err) { next(err); }
});

// GET /children/:id/interests �?get interests
router.get('/:id/interests', auth, async (req, res, next) => {
  try {
    const child = await db.oneOrNone('SELECT interests FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const interestDetails = await db.manyOrNone(
      `SELECT ci.*, ic.name AS category_name, ic.description
       FROM child_interests ci
       JOIN interest_categories ic ON ic.id = ci.category_id
       WHERE ci.child_id = $1
       ORDER BY ci.skill_level DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: interestDetails, interests_raw: child.interests });
  } catch (err) { next(err); }
});

// PUT /children/:id/interests �?update interests
router.put('/:id/interests', auth, async (req, res, next) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests)) throw new AppError(400, 'interests must be an array');
    await db.tx(async t => {
      await t.none('DELETE FROM child_interests WHERE child_id = $1', [req.params.id]);
      if (interests.length > 0) {
        const values = interests.map((i, idx) => `($1, $${idx + 2}, $${idx + 2 + interests.length})`).join(',');
        const skillLevels = interests.map(i => i.skill_level || 1);
        await t.none(
          `INSERT INTO child_interests (child_id, category_id, skill_level) VALUES ${values}`,
          [req.params.id, ...interests.map(i => i.category_id), ...skillLevels]
        );
      }
      await t.none('UPDATE children SET interests = $1, updated_at = NOW() WHERE id = $2', [interests.map(i => i.category_id), req.params.id]);
    });
    res.json({ success: true, message: 'Interests updated' });
  } catch (err) { next(err); }
});

// POST /children/link �?send parent-child invite
router.post('/link', auth, async (req, res, next) => {
  try {
    const { child_id, parent_email } = req.body;
    if (!child_id || !parent_email) throw new AppError(400, 'child_id and parent_email are required');
    const child = await db.oneOrNone('SELECT id, name FROM children WHERE id = $1', [child_id]);
    if (!child) throw new AppError(404, 'Child not found');
    const invite = await db.one(
      `INSERT INTO parent_invites (child_id, invited_by, invited_email, token, expires_at)
       VALUES ($1, $2, $3, gen_random_uuid(), NOW() + INTERVAL '7 days')
       RETURNING *`,
      [child_id, req.user.id, parent_email]
    );
    await notificationService.sendEmail({
      to: parent_email,
      subject: `Invitation to co-parent ${child.name}`,
      template: 'parent-invite',
      data: { child_name: child.name, token: invite.token },
    });
    res.status(201).json({ success: true, data: invite });
  } catch (err) { next(err); }
});

// POST /children/:id/unlink �?unlink parent from child
router.post('/:id/unlink', auth, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM child_parents WHERE child_id = $1 AND parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) throw new AppError(404, 'Parent link not found');
    res.json({ success: true, message: 'Unlinked successfully' });
  } catch (err) { next(err); }
});

// GET /children/:id/recommendations �?age-based content recommendations
router.get('/:id/recommendations', auth, async (req, res, next) => {
  try {
    const child = await db.oneOrNone('SELECT birth_date, interests, learning_style FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const ageMonths = calculateAgeInMonths(new Date(child.birth_date));
    const ageGroup = calculateAgeGroup(ageMonths);
    const interests = child.interests || [];
    const recommendations = await db.manyOrNone(`
      SELECT c.*, ROUND(ts_rank(c.search_vector, plainto_tsquery($3)), 3) AS relevance
      FROM content c
      WHERE c.age_range_min <= $1 AND (c.age_range_max IS NULL OR c.age_range_max >= $1)
        AND c.status = 'published'
      ORDER BY
        CASE WHEN c.category = ANY($2::text[]) THEN 0 ELSE 1 END,
        relevance DESC,
        c.rating DESC
      LIMIT 20
    `, [ageMonths, interests, child.learning_style || '']);
    res.json({ success: true, data: recommendations, age_group: ageGroup });
  } catch (err) { next(err); }
});

// GET /children/:id/assessment �?development assessment
router.get('/:id/assessment', auth, async (req, res, next) => {
  try {
    const child = await db.oneOrNone('SELECT birth_date FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const ageMonths = calculateAgeInMonths(new Date(child.birth_date));
    const assessments = await db.manyOrNone(`
      SELECT
        domain, ROUND(AVG(score)::numeric, 1) AS avg_score,
        MAX(score) AS max_score, MIN(score) AS min_score,
        COUNT(*) AS assessments_count,
        MAX(assessed_at) AS last_assessed
      FROM development_assessments
      WHERE child_id = $1
      GROUP BY domain
    `, [req.params.id]);
    const domainNorms = await db.manyOrNone(
      'SELECT domain, avg_score AS norm_avg, std_dev FROM development_norms WHERE age_months = $1',
      [ageMonths]
    );
    const normMap = {};
    domainNorms.forEach(n => { normMap[n.domain] = { avg: n.norm_avg, std: n.std_dev }; });
    const data = assessments.map(a => {
      const norm = normMap[a.domain];
      const percentile = norm ? Math.round(((a.avg_score - norm.avg) / (norm.std || 1)) * 15 + 50) : null;
      return { ...a, norm_avg: norm?.avg || null, percentile: Math.max(1, Math.min(99, percentile)) };
    });
    res.json({ success: true, data, age_months: ageMonths });
  } catch (err) { next(err); }
});

// POST /children/batch/status �?batch status update
router.post('/batch/status', auth, async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'ids array is required');
    const result = await db.result(
      'UPDATE children SET status = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) AND parent_id = $3',
      [status, ids, req.user.id]
    );
    res.json({ success: true, updated: result.rowCount });
  } catch (err) { next(err); }
});

// POST /children/batch/delete �?batch delete
router.post('/batch/delete', auth, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'ids array is required');
    const result = await db.result(
      'DELETE FROM children WHERE id = ANY($1::uuid[]) AND parent_id = $2',
      [ids, req.user.id]
    );
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) { next(err); }
});

// GET /children/:id/learning-style �?detect learning style
router.get('/:id/learning-style', auth, async (req, res, next) => {
  try {
    const style = await db.oneOrNone(`
      SELECT
        ROUND(AVG(visual_score)::numeric, 1) AS visual,
        ROUND(AVG(auditory_score)::numeric, 1) AS auditory,
        ROUND(AVG(kinesthetic_score)::numeric, 1) AS kinesthetic,
        ROUND(AVG(reading_writing_score)::numeric, 1) AS reading_writing,
        COUNT(*) AS assessments
      FROM learning_style_assessments
      WHERE child_id = $1
    `, [req.params.id]);
    const dominant = style ? Object.entries(style)
      .filter(([k]) => k !== 'assessments')
      .sort((a, b) => b[1] - a[1])[0][0] : 'visual';
    res.json({ success: true, data: { ...style, dominant_style: dominant } });
  } catch (err) { next(err); }
});

// GET /children/:id/daily-summary �?aggregated daily activity
router.get('/:id/daily-summary', auth, async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const summary = await db.oneOrNone(`
      SELECT
        COUNT(DISTINCT s.id) AS session_count,
        COALESCE(SUM(s.duration_minutes), 0) AS total_minutes,
        COUNT(DISTINCT la.id) FILTER (WHERE la.type = 'learning') AS learning_activities,
        COUNT(DISTINCT la.id) FILTER (WHERE la.type = 'play') AS play_activities,
        COUNT(DISTINCT la.id) FILTER (WHERE la.type = 'reading') AS reading_activities,
        COUNT(DISTINCT la.id) FILTER (WHERE la.type = 'creative') AS creative_activities,
        ROUND(AVG(mood_score)::numeric, 1) AS avg_mood,
        MAX(mood_score) AS best_mood,
        MIN(mood_score) AS lowest_mood
      FROM sessions s
      LEFT JOIN activity_log la ON la.session_id = s.id
      WHERE s.child_id = $1 AND DATE(s.started_at) = $2
    `, [req.params.id, date]);
    res.json({ success: true, data: summary, date });
  } catch (err) { next(err); }
});

// GET /children/:id/export �?GDPR-compliant data export
router.get('/:id/export', auth, async (req, res, next) => {
  try {
    const child = await db.oneOrNone('SELECT * FROM children WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const [sessions, activities, milestones, health_records] = await Promise.all([
      db.manyOrNone('SELECT * FROM sessions WHERE child_id = $1 ORDER BY started_at', [req.params.id]),
      db.manyOrNone('SELECT * FROM activity_log WHERE child_id = $1 ORDER BY created_at', [req.params.id]),
      db.manyOrNone('SELECT * FROM child_milestones WHERE child_id = $1 ORDER BY achieved_at', [req.params.id]),
      db.manyOrNone('SELECT * FROM health_records WHERE child_id = $1 ORDER BY recorded_at', [req.params.id]),
    ]);
    const exportData = {
      exported_at: new Date().toISOString(),
      child: {
        id: child.id, name: child.name, birth_date: child.birth_date,
        gender: child.gender, created_at: child.created_at,
      },
      sessions, activities, milestones, health_records,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="child-${req.params.id}-export.json"`);
    res.json(exportData);
  } catch (err) { next(err); }
});

module.exports = router;
