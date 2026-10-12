const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const cache = require('../../../middleware/cache');
const { AppError } = require('../../../utils/errors');
const contentService = require('../../../services/content');
const recommendationEngine = require('../../../services/recommendation');

const SUBJECTS = ['math', 'language', 'science', 'art', 'music', 'social', 'physical'];
const setCache = (res, ttl = 300) => {
  res.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl * 2}`);
};

// GET /content/daily-pick â€?content of the day
router.get('/daily-pick', auth, async (req, res, next) => {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const pick = await db.oneOrNone(`
      SELECT * FROM content
      WHERE status = 'published'
      ORDER BY MOD(id, $1) ASC, rating DESC
      LIMIT 1
    `, [dayOfYear]);
    setCache(res, 600);
    res.json({ success: true, data: pick, date: today.toISOString().slice(0, 10) });
  } catch (err) { next(err); }
});

// GET /content/categories â€?content categories with hierarchy
router.get('/categories', auth, async (req, res, next) => {
  try {
    const categories = await db.manyOrNone(`
      SELECT c.*, COUNT(sub.id) AS subcategory_count,
        (SELECT COUNT(*) FROM content WHERE category_id = c.id) AS content_count
      FROM content_categories c
      LEFT JOIN content_categories sub ON sub.parent_id = c.id
      WHERE c.parent_id IS NULL
      GROUP BY c.id
      ORDER BY c.name
    `);
    const result = await Promise.all(categories.map(async (cat) => {
      const subs = await db.manyOrNone(
        `SELECT cs.*, (SELECT COUNT(*) FROM content WHERE category_id = cs.id) AS content_count
         FROM content_categories cs WHERE cs.parent_id = $1 ORDER BY cs.name`,
        [cat.id]
      );
      return { ...cat, subcategories: subs };
    }));
    setCache(res, 3600);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /content/recommendations/:childId â€?content recommendations
router.get('/recommendations/:childId', auth, async (req, res, next) => {
  try {
    const { childId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = await recommendationEngine.getContentRecommendations(childId, limit);
    setCache(res, 600);
    res.json({ success: true, data: recommendations });
  } catch (err) { next(err); }
});

// GET /content/favorites â€?get favorites
router.get('/favorites', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.manyOrNone(
      'SELECT COUNT(*) FROM content_favorites WHERE user_id = $1', [req.user.id]
    );
    const favorites = await db.manyOrNone(`
      SELECT cf.*, c.title, c.subject, c.thumbnail_url, c.duration_minutes
      FROM content_favorites cf
      JOIN content c ON c.id = cf.content_id
      WHERE cf.user_id = $1
      ORDER BY cf.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);
    res.json({
      success: true,
      data: favorites,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// POST /content/favorites/:contentId â€?add favorite
router.post('/favorites/:contentId', auth, async (req, res, next) => {
  try {
    const { contentId } = req.params;
    await db.none(
      'INSERT INTO content_favorites (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, contentId]
    );
    res.status(201).json({ success: true, message: 'Added to favorites' });
  } catch (err) { next(err); }
});

// DELETE /content/favorites/:contentId â€?remove favorite
router.delete('/favorites/:contentId', auth, async (req, res, next) => {
  try {
    await db.none('DELETE FROM content_favorites WHERE user_id = $1 AND content_id = $2', [req.user.id, req.params.contentId]);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) { next(err); }
});

// GET /content/recent/:childId â€?recently viewed
router.get('/recent/:childId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recent = await db.manyOrNone(`
      SELECT cv.*, c.title, c.subject, c.thumbnail_url
      FROM content_views cv
      JOIN content c ON c.id = cv.content_id
      WHERE cv.child_id = $1
      ORDER BY cv.viewed_at DESC
      LIMIT $2
    `, [req.params.childId, limit]);
    res.json({ success: true, data: recent });
  } catch (err) { next(err); }
});

// POST /content/recent/:contentId â€?record view
router.post('/recent/:contentId', auth, async (req, res, next) => {
  try {
    const { childId, progress } = req.body;
    if (!childId) throw new AppError(400, 'childId is required');
    await db.none(
      `INSERT INTO content_views (child_id, content_id, progress_percent)
       VALUES ($1, $2, $3)
       ON CONFLICT (child_id, content_id) DO UPDATE SET viewed_at = NOW(), progress_percent = $3`,
      [childId, req.params.contentId, progress || 0]
    );
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

// GET /content/recent â€?cross-child recent views
router.get('/recent', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recent = await db.manyOrNone(`
      SELECT DISTINCT ON (cv.content_id) cv.*, c.title, c.subject, ch.name AS child_name
      FROM content_views cv
      JOIN content c ON c.id = cv.content_id
      JOIN children ch ON ch.id = cv.child_id
      WHERE ch.parent_id = $1
      ORDER BY cv.content_id, cv.viewed_at DESC
      LIMIT $2
    `, [req.user.id, limit]);
    res.json({ success: true, data: recent });
  } catch (err) { next(err); }
});

// GET /content/:subject/:id/related â€?related content
router.get('/:subject/:id/related', auth, async (req, res, next) => {
  try {
    const { subject, id } = req.params;
    const limit = parseInt(req.query.limit) || 6;
    if (!SUBJECTS.includes(subject)) throw new AppError(400, `Invalid subject. Allowed: ${SUBJECTS.join(', ')}`);
    const related = await db.manyOrNone(`
      SELECT c.*, COUNT(*) OVER() AS total_count
      FROM content c
      WHERE c.subject = $1 AND c.id != $2 AND c.status = 'published'
        AND (c.tags && (SELECT COALESCE(tags, ARRAY[]::text[]) FROM content WHERE id = $2))
      ORDER BY c.rating DESC, c.popularity_score DESC
      LIMIT $3
    `, [subject, id, limit]);
    setCache(res, 600);
    res.json({ success: true, data: related });
  } catch (err) { next(err); }
});

// POST /content/rate/:contentId â€?rate content
router.post('/rate/:contentId', auth, async (req, res, next) => {
  try {
    const { score, review } = req.body;
    if (!score || score < 1 || score > 5) throw new AppError(400, 'Score must be between 1 and 5');
    const existing = await db.oneOrNone(
      'SELECT id FROM content_ratings WHERE user_id = $1 AND content_id = $2',
      [req.user.id, req.params.contentId]
    );
    if (existing) {
      await db.none('UPDATE content_ratings SET score = $1, review = $2, updated_at = NOW() WHERE id = $3',
        [score, review || null, existing.id]);
    } else {
      await db.none('INSERT INTO content_ratings (user_id, content_id, score, review) VALUES ($1, $2, $3, $4)',
        [req.user.id, req.params.contentId, score, review || null]);
    }
    const updated = await db.oneOrNone(
      'UPDATE content SET rating = (SELECT ROUND(AVG(score)::numeric, 2) FROM content_ratings WHERE content_id = $1) WHERE id = $1 RETURNING rating',
      [req.params.contentId]
    );
    res.json({ success: true, data: { new_rating: updated?.rating } });
  } catch (err) { next(err); }
});

// GET /content/ratings/:contentId â€?get ratings
router.get('/ratings/:contentId', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.manyOrNone(
      'SELECT COUNT(*) FROM content_ratings WHERE content_id = $1', [req.params.contentId]
    );
    const [{ avg, dist }] = await db.manyOrNone(`
      SELECT ROUND(AVG(score)::numeric, 2) AS avg,
        jsonb_agg(jsonb_build_object('score', score, 'count', cnt) ORDER BY score) AS dist
      FROM (SELECT score, COUNT(*) AS cnt FROM content_ratings WHERE content_id = $1 GROUP BY score) sub
    `, [req.params.contentId]);
    const ratings = await db.manyOrNone(
      'SELECT cr.*, u.name AS user_name FROM content_ratings cr LEFT JOIN users u ON u.id = cr.user_id WHERE cr.content_id = $1 ORDER BY cr.created_at DESC LIMIT $2 OFFSET $3',
      [req.params.contentId, limit, offset]
    );
    res.json({
      success: true,
      data: { average: avg, distribution: dist, ratings },
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// POST /content/batch/get â€?batch content fetch
router.post('/batch/get', auth, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'ids array is required');
    if (ids.length > 100) throw new AppError(400, 'Maximum 100 items per batch');
    const content = await db.manyOrNone('SELECT * FROM content WHERE id = ANY($1::uuid[]) AND status = $2', [ids, 'published']);
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
});

// POST /content/batch/search â€?batch search
router.post('/batch/search', auth, async (req, res, next) => {
  try {
    const { queries } = req.body;
    if (!Array.isArray(queries) || queries.length > 20) throw new AppError(400, 'Max 20 queries');
    const results = await Promise.all(queries.map(async (q) => {
      const items = await db.manyOrNone(
        `SELECT id, title, subject, thumbnail_url, duration_minutes, rating
         FROM content WHERE search_vector @@ plainto_tsquery($1) AND status = 'published' LIMIT 5`,
        [q.query]
      );
      return { query: q.label || q.query, items };
    }));
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// GET /content/progress/:childId/:contentId â€?get progress
router.get('/progress/:childId/:contentId', auth, async (req, res, next) => {
  try {
    const progress = await db.oneOrNone(
      'SELECT * FROM content_progress WHERE child_id = $1 AND content_id = $2',
      [req.params.childId, req.params.contentId]
    );
    res.json({ success: true, data: progress || { progress_percent: 0, completed: false } });
  } catch (err) { next(err); }
});

// POST /content/progress/:childId/:contentId â€?update progress
router.post('/progress/:childId/:contentId', auth, async (req, res, next) => {
  try {
    const { progress_percent, completed, time_spent_seconds } = req.body;
    await db.none(
      `INSERT INTO content_progress (child_id, content_id, progress_percent, completed, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (child_id, content_id) DO UPDATE SET
         progress_percent = GREATEST(content_progress.progress_percent, $3),
         completed = content_progress.completed OR $4,
         time_spent_seconds = content_progress.time_spent_seconds + $5,
         updated_at = NOW()`,
      [req.params.childId, req.params.contentId, progress_percent || 0, completed || false, time_spent_seconds || 0]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /content/stats/:subject â€?content statistics
router.get('/stats/:subject', auth, async (req, res, next) => {
  try {
    const { subject } = req.params;
    if (!SUBJECTS.includes(subject)) throw new AppError(400, `Invalid subject. Allowed: ${SUBJECTS.join(', ')}`);
    const stats = await db.oneOrNone(`
      SELECT
        COUNT(*) AS total_items,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(views_count) AS total_views,
        SUM(completion_count) AS total_completions,
        ROUND(AVG(duration_minutes)::numeric, 1) AS avg_duration,
        COUNT(*) FILTER (WHERE status = 'published') AS published,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft,
        MAX(popularity_score) AS max_popularity,
        MIN(popularity_score) AS min_popularity
      FROM content
      WHERE subject = $1
    `, [subject]);
    const byCategory = await db.manyOrNone(`
      SELECT cc.name AS category, COUNT(*) AS count
      FROM content c
      JOIN content_categories cc ON cc.id = c.category_id
      WHERE c.subject = $1
      GROUP BY cc.name
    `, [subject]);
    setCache(res, 1800);
    res.json({ success: true, data: { ...stats, by_category: byCategory } });
  } catch (err) { next(err); }
});

// GET /content/search â€?search content with cursor pagination
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q, subject, category, age_min, age_max, sort = 'rating', cursor, limit = 20 } = req.query;
    const params = [];
    const conditions = ["status = 'published'"];
    let paramIdx = 1;
    if (q) { conditions.push(`search_vector @@ plainto_tsquery($${paramIdx})`); params.push(q); paramIdx++; }
    if (subject) { conditions.push(`subject = $${paramIdx}`); params.push(subject); paramIdx++; }
    if (category) { conditions.push(`category_id = $${paramIdx}`); params.push(category); paramIdx++; }
    if (age_min) { conditions.push(`age_range_min >= $${paramIdx}`); params.push(parseInt(age_min)); paramIdx++; }
    if (age_max) { conditions.push(`age_range_max <= $${paramIdx}`); params.push(parseInt(age_max)); paramIdx++; }
    if (cursor) { conditions.push(`created_at < $${paramIdx}`); params.push(new Date(cursor)); paramIdx++; }
    const sortMap = { rating: 'rating DESC', popularity: 'popularity_score DESC', newest: 'created_at DESC', title: 'title ASC' };
    const orderBy = sortMap[sort] || 'rating DESC';
    const items = await db.manyOrNone(
      `SELECT * FROM content WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT $${paramIdx}`,
      [...params, parseInt(limit) + 1]
    );
    const hasMore = items.length > parseInt(limit);
    if (hasMore) items.pop();
    const nextCursor = hasMore ? items[items.length - 1].created_at : null;
    res.json({ success: true, data: items, pagination: { cursor: nextCursor, hasMore, limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// GET /content/:subject â€?list content by subject
router.get('/:subject', auth, async (req, res, next) => {
  try {
    const { subject } = req.params;
    if (!SUBJECTS.includes(subject)) throw new AppError(400, `Invalid subject. Allowed: ${SUBJECTS.join(', ')}`);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const conditions = ['subject = $1', "status = 'published'"];
    const params = [subject];
    if (category) { conditions.push('category_id = $2'); params.push(category); }
    const where = conditions.join(' AND ');
    const [{ count }] = await db.manyOrNone(`SELECT COUNT(*) FROM content WHERE ${where}`, params);
    const sortCol = req.query.sort === 'newest' ? 'created_at' : req.query.sort === 'popular' ? 'popularity_score' : 'rating';
    const sortOrder = req.query.order === 'ASC' ? 'ASC' : 'DESC';
    const items = await db.manyOrNone(
      `SELECT * FROM content WHERE ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    setCache(res, 300);
    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /content/:subject/:id â€?single content item
router.get('/:subject/:id', auth, async (req, res, next) => {
  try {
    const { subject, id } = req.params;
    const item = await db.oneOrNone('SELECT * FROM content WHERE id = $1 AND subject = $2', [id, subject]);
    if (!item) throw new AppError(404, 'Content not found');
    await db.none('UPDATE content SET views_count = views_count + 1 WHERE id = $1', [id]);
    setCache(res, 600);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// GET /content/:subject/:id/diff â€?content diff for updates
router.get('/:subject/:id/diff', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const since = req.query.since;
    if (!since) throw new AppError(400, 'since query param (ISO timestamp) is required');
    const sinceDate = new Date(since);
    const current = await db.oneOrNone('SELECT * FROM content WHERE id = $1', [id]);
    if (!current) throw new AppError(404, 'Content not found');
    const history = await db.manyOrNone(
      'SELECT * FROM content_history WHERE content_id = $1 AND changed_at > $2 ORDER BY changed_at DESC',
      [id, sinceDate]
    );
    const hasChanges = history.length > 0 || new Date(current.updated_at) > sinceDate;
    res.json({
      success: true,
      data: {
        has_changes: hasChanges,
        current_version: current.updated_at,
        last_viewed_version: since,
        changes_since_last_view: history,
        current_content: hasChanges ? current : null,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
