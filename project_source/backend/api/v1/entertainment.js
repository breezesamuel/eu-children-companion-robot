const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const cache = require('../../../middleware/cache');
const { AppError } = require('../../../utils/errors');
const recommendationService = require('../../../services/recommendation');

const MEDIA_TYPES = ['video', 'audio', 'game', 'interactive', 'ebook'];
const setCache = (res, ttl = 300) => {
  res.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl * 2}`);
};

// GET /entertainment/trending â€?trending media
router.get('/trending', auth, async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    const interval = period === 'day' ? '24 hours' : period === 'month' ? '30 days' : '7 days';
    const trending = await db.manyOrNone(`
      SELECT m.*,
        COUNT(DISTINCT vh.id) AS view_count,
        COUNT(DISTINCT CASE WHEN vh.completed THEN vh.id END) AS completion_count,
        ROUND(AVG(r.score)::numeric, 2) AS avg_rating
      FROM media m
      LEFT JOIN viewing_history vh ON vh.media_id = m.id AND vh.viewed_at >= NOW() - $1::interval
      LEFT JOIN media_ratings r ON r.media_id = m.id
      WHERE m.status = 'published'
      GROUP BY m.id
      ORDER BY view_count DESC, avg_rating DESC
      LIMIT 20
    `, [interval]);
    setCache(res, 600);
    res.json({ success: true, data: trending, period });
  } catch (err) { next(err); }
});

// GET /entertainment/history/:userId â€?watch/listen history
router.get('/history/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    const date = req.query.date;
    const status = req.query.status;
    const params = [userId];
    const conditions = ['vh.user_id = $1'];
    let paramIdx = 2;
    if (type && MEDIA_TYPES.includes(type)) { conditions.push(`m.media_type = $${paramIdx}`); params.push(type); paramIdx++; }
    if (date) { conditions.push(`DATE(vh.viewed_at) = $${paramIdx}`); params.push(date); paramIdx++; }
    if (status === 'completed') { conditions.push('vh.completed = true'); }
    if (status === 'in_progress') { conditions.push('vh.completed = false AND vh.progress > 0'); }
    const where = conditions.join(' AND ');
    const [{ count }] = await db.manyOrNone(
      `SELECT COUNT(*) FROM viewing_history vh JOIN media m ON m.id = vh.media_id WHERE ${where}`, params
    );
    const history = await db.manyOrNone(
      `SELECT vh.*, m.title, m.thumbnail_url, m.media_type, m.duration_seconds,
              m.age_rating, m.artist, m.album
       FROM viewing_history vh
       JOIN media m ON m.id = vh.media_id
       WHERE ${where}
       ORDER BY vh.viewed_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      data: history,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// DELETE /entertainment/history â€?clear history
router.delete('/history', auth, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError(400, 'userId is required');
    const result = await db.result('DELETE FROM viewing_history WHERE user_id = $1', [userId]);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) { next(err); }
});

// POST /entertainment/favorites/:mediaId â€?add favorite
router.post('/favorites/:mediaId', auth, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError(400, 'userId is required');
    await db.none(
      'INSERT INTO media_favorites (user_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, req.params.mediaId]
    );
    res.status(201).json({ success: true, message: 'Added to favorites' });
  } catch (err) { next(err); }
});

// DELETE /entertainment/favorites/:mediaId â€?remove favorite
router.delete('/favorites/:mediaId', auth, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError(400, 'userId is required');
    await db.none('DELETE FROM media_favorites WHERE user_id = $1 AND media_id = $2', [userId, req.params.mediaId]);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) { next(err); }
});

// GET /entertainment/favorites â€?list favorites
router.get('/favorites', auth, async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) throw new AppError(400, 'userId is required');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.manyOrNone(
      'SELECT COUNT(*) FROM media_favorites WHERE user_id = $1', [userId]
    );
    const favorites = await db.manyOrNone(
      `SELECT mf.*, m.title, m.thumbnail_url, m.media_type, m.duration_seconds, m.age_rating
       FROM media_favorites mf
       JOIN media m ON m.id = mf.media_id
       WHERE mf.user_id = $1
       ORDER BY mf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json({
      success: true,
      data: favorites,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /entertainment/recommendations/:userId â€?recommendations
router.get('/recommendations/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = await recommendationService.getMediaRecommendations(userId, limit);
    setCache(res, 600);
    res.json({ success: true, data: recommendations });
  } catch (err) { next(err); }
});

// POST /entertainment/rate/:mediaId â€?rate media
router.post('/rate/:mediaId', auth, async (req, res, next) => {
  try {
    const { userId, score, review } = req.body;
    if (!userId) throw new AppError(400, 'userId is required');
    if (!score || score < 1 || score > 5) throw new AppError(400, 'Score must be 1-5');
    await db.none(
      `INSERT INTO media_ratings (user_id, media_id, score, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, media_id) DO UPDATE SET score = $3, review = COALESCE($4, media_ratings.review), updated_at = NOW()`,
      [userId, req.params.mediaId, score, review || null]
    );
    const updated = await db.oneOrNone(
      `UPDATE media SET rating = (SELECT ROUND(AVG(score)::numeric, 2) FROM media_ratings WHERE media_id = $1)
       WHERE id = $1 RETURNING rating`,
      [req.params.mediaId]
    );
    res.json({ success: true, data: { new_rating: updated?.rating } });
  } catch (err) { next(err); }
});

// GET /entertainment/ratings/:mediaId â€?get ratings
router.get('/ratings/:mediaId', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.manyOrNone('SELECT COUNT(*) FROM media_ratings WHERE media_id = $1', [req.params.mediaId]);
    const { avg, dist } = await db.oneOrNone(`
      SELECT ROUND(AVG(score)::numeric, 2) AS avg,
        (SELECT jsonb_agg(jsonb_build_object('score', score, 'count', cnt) ORDER BY score)
         FROM (SELECT score, COUNT(*) AS cnt FROM media_ratings WHERE media_id = $1 GROUP BY score) sub) AS dist
      FROM media_ratings WHERE media_id = $1
    `, [req.params.mediaId]) || {};
    const ratings = await db.manyOrNone(
      `SELECT mr.*, u.name AS user_name FROM media_ratings mr
       LEFT JOIN users u ON u.id = mr.user_id
       WHERE mr.media_id = $1 ORDER BY mr.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.mediaId, limit, offset]
    );
    res.json({
      success: true,
      data: { average: avg, distribution: dist || [], ratings },
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /entertainment/progress/:userId/:mediaId â€?get progress
router.get('/progress/:userId/:mediaId', auth, async (req, res, next) => {
  try {
    const progress = await db.oneOrNone(
      'SELECT * FROM media_progress WHERE user_id = $1 AND media_id = $2',
      [req.params.userId, req.params.mediaId]
    );
    res.json({ success: true, data: progress || { progress_percent: 0, completed: false, last_position: 0 } });
  } catch (err) { next(err); }
});

// POST /entertainment/progress/:userId/:mediaId â€?update progress
router.post('/progress/:userId/:mediaId', auth, async (req, res, next) => {
  try {
    const { progress_percent, completed, last_position, time_spent_seconds } = req.body;
    await db.none(
      `INSERT INTO media_progress (user_id, media_id, progress_percent, completed, last_position, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, media_id) DO UPDATE SET
         progress_percent = GREATEST(media_progress.progress_percent, $3),
         completed = media_progress.completed OR $4,
         last_position = COALESCE($5, media_progress.last_position),
         time_spent_seconds = media_progress.time_spent_seconds + COALESCE($6, 0),
         updated_at = NOW()`,
      [req.params.userId, req.params.mediaId, progress_percent || 0, completed || false, last_position || 0, time_spent_seconds || 0]
    );
    await db.none(
      'INSERT INTO viewing_history (user_id, media_id, progress, completed) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [req.params.userId, req.params.mediaId, progress_percent || 0, completed || false]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /entertainment/continue-watching/:userId â€?continue watching
router.get('/continue-watching/:userId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const items = await db.manyOrNone(`
      SELECT mp.*, m.title, m.thumbnail_url, m.media_type, m.duration_seconds
      FROM media_progress mp
      JOIN media m ON m.id = mp.media_id
      WHERE mp.user_id = $1 AND mp.completed = false AND mp.progress_percent > 0
      ORDER BY mp.updated_at DESC
      LIMIT $2
    `, [req.params.userId, limit]);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// GET /entertainment/parental-controls/:childId â€?get parental controls
router.get('/parental-controls/:childId', auth, async (req, res, next) => {
  try {
    const controls = await db.oneOrNone(
      'SELECT * FROM parental_controls WHERE child_id = $1',
      [req.params.childId]
    );
    res.json({ success: true, data: controls || { max_daily_minutes: 60, content_rating_limit: 'G', blocked_categories: [], bedtime_start: '20:00', bedtime_end: '07:00' } });
  } catch (err) { next(err); }
});

// PUT /entertainment/parental-controls/:childId â€?update parental controls
router.put('/parental-controls/:childId', auth, async (req, res, next) => {
  try {
    const { max_daily_minutes, content_rating_limit, blocked_categories, bedtime_start, bedtime_end } = req.body;
    await db.none(
      `INSERT INTO parental_controls (child_id, max_daily_minutes, content_rating_limit, blocked_categories, bedtime_start, bedtime_end)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (child_id) DO UPDATE SET
         max_daily_minutes = COALESCE($2, parental_controls.max_daily_minutes),
         content_rating_limit = COALESCE($3, parental_controls.content_rating_limit),
         blocked_categories = COALESCE($4, parental_controls.blocked_categories),
         bedtime_start = COALESCE($5, parental_controls.bedtime_start),
         bedtime_end = COALESCE($6, parental_controls.bedtime_end),
         updated_at = NOW()`,
      [req.params.childId, max_daily_minutes, content_rating_limit, blocked_categories || [], bedtime_start, bedtime_end]
    );
    res.json({ success: true, message: 'Parental controls updated' });
  } catch (err) { next(err); }
});

// GET /entertainment/age-appropriate/:age â€?age-appropriate filtering
router.get('/age-appropriate/:age', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const mediaType = req.query.type;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const params = [age];
    const conditions = ['m.status = $2'];
    let paramIdx = 3;
    if (mediaType && MEDIA_TYPES.includes(mediaType)) { conditions.push(`m.media_type = $${paramIdx}`); params.push(mediaType); paramIdx++; }
    const where = conditions.join(' AND ');
    const [{ count }] = await db.manyOrNone(
      `SELECT COUNT(*) FROM media m WHERE m.min_age <= $1 AND (m.max_age IS NULL OR m.max_age >= $1) AND ${where}`,
      [age, 'published', ...params.slice(1)]
    );
    const items = await db.manyOrNone(
      `SELECT * FROM media m WHERE m.min_age <= $1 AND (m.max_age IS NULL OR m.max_age >= $1) AND ${where}
       ORDER BY m.rating DESC, m.popularity DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [age, 'published', ...params.slice(1), limit, offset]
    );
    setCache(res, 600);
    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// PUT /entertainment/playlist/:id/reorder â€?reorder playlist
router.put('/playlist/:id/reorder', auth, async (req, res, next) => {
  try {
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids)) throw new AppError(400, 'item_ids array is required');
    await db.tx(async t => {
      for (let i = 0; i < item_ids.length; i++) {
        await t.none('UPDATE playlist_items SET sort_order = $1 WHERE id = $2 AND playlist_id = $3',
          [i, item_ids[i], req.params.id]);
      }
    });
    res.json({ success: true, message: 'Playlist reordered' });
  } catch (err) { next(err); }
});

// GET /entertainment/games/leaderboard/:gameId â€?game leaderboard
router.get('/games/leaderboard/:gameId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'all';
    const interval = period === 'daily' ? '1 day' : period === 'weekly' ? '7 days' : period === 'monthly' ? '30 days' : '100 years';
    const leaderboard = await db.manyOrNone(`
      SELECT gs.user_id, u.name AS user_name,
        MAX(gs.score) AS high_score,
        SUM(gs.score) AS total_score,
        COUNT(*) AS games_played,
        ROUND(AVG(gs.score)::numeric, 1) AS avg_score
      FROM game_sessions gs
      JOIN users u ON u.id = gs.user_id
      WHERE gs.game_id = $1 AND gs.played_at >= NOW() - $2::interval
      GROUP BY gs.user_id, u.name
      ORDER BY high_score DESC
      LIMIT $3
    `, [req.params.gameId, interval, limit]);
    setCache(res, 120);
    res.json({ success: true, data: leaderboard });
  } catch (err) { next(err); }
});

// POST /entertainment/games/score â€?submit game score
router.post('/games/score', auth, async (req, res, next) => {
  try {
    const { userId, gameId, score, level, duration_seconds, metadata } = req.body;
    if (!userId || !gameId || score === undefined) throw new AppError(400, 'userId, gameId, and score are required');
    const session = await db.one(
      `INSERT INTO game_sessions (user_id, game_id, score, level, duration_seconds, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, gameId, score, level || 1, duration_seconds || 0, JSON.stringify(metadata || {})]
    );
    const isHighScore = await db.oneOrNone(
      'SELECT score FROM game_sessions WHERE game_id = $1 AND user_id = $2 ORDER BY score DESC LIMIT 1',
      [gameId, userId]
    );
    const isNewHigh = isHighScore?.score === score;
    res.status(201).json({ success: true, data: session, is_new_high_score: isNewHigh });
  } catch (err) { next(err); }
});

// GET /entertainment/games/stats/:userId â€?game session analytics
router.get('/games/stats/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const stats = await db.oneOrNone(`
      SELECT
        COUNT(*) AS total_sessions,
        SUM(score) AS total_score,
        ROUND(AVG(score)::numeric, 1) AS avg_score,
        MAX(score) AS high_score,
        SUM(duration_seconds) AS total_play_seconds,
        ROUND(AVG(duration_seconds)::numeric, 1) AS avg_session_seconds,
        COUNT(DISTINCT game_id) AS unique_games,
        MAX(played_at) AS last_played
      FROM game_sessions WHERE user_id = $1
    `, [userId]);
    const byGame = await db.manyOrNone(`
      SELECT game_id, COUNT(*) AS plays, MAX(score) AS high_score, ROUND(AVG(score)::numeric, 1) AS avg_score
      FROM game_sessions WHERE user_id = $1 GROUP BY game_id ORDER BY plays DESC
    `, [userId]);
    const recentSessions = await db.manyOrNone(
      'SELECT * FROM game_sessions WHERE user_id = $1 ORDER BY played_at DESC LIMIT 10', [userId]
    );
    res.json({ success: true, data: { summary: stats, by_game: byGame, recent_sessions: recentSessions } });
  } catch (err) { next(err); }
});

// GET /entertainment/similar/:mediaId â€?content similarity search
router.get('/similar/:mediaId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const similar = await db.manyOrNone(`
      SELECT m.*, sm.similarity_score
      FROM media_similarity sm
      JOIN media m ON m.id = sm.similar_media_id
      WHERE sm.media_id = $1
      ORDER BY sm.similarity_score DESC
      LIMIT $2
    `, [req.params.mediaId, limit]);
    setCache(res, 3600);
    res.json({ success: true, data: similar });
  } catch (err) { next(err); }
});

// POST /entertainment/media/batch â€?batch media lookup
router.post('/media/batch', auth, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'ids array is required');
    if (ids.length > 100) throw new AppError(400, 'Maximum 100 items');
    const media = await db.manyOrNone('SELECT * FROM media WHERE id = ANY($1::uuid[]) AND status = $2', [ids, 'published']);
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

// GET /entertainment/search â€?search media
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q, type, genre, age_min, age_max, sort = 'rating', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ["status = 'published'"];
    let idx = 1;
    if (q) { conditions.push(`search_vector @@ plainto_tsquery($${idx})`); params.push(q); idx++; }
    if (type) { conditions.push(`media_type = $${idx}`); params.push(type); idx++; }
    if (genre) { conditions.push(`$${idx} = ANY(genres)`); params.push(genre); idx++; }
    if (age_min) { conditions.push(`min_age <= $${idx}`); params.push(parseInt(age_min)); idx++; }
    if (age_max) { conditions.push(`(max_age IS NULL OR max_age >= $${idx})`); params.push(parseInt(age_max)); idx++; }
    const where = conditions.join(' AND ');
    const sortMap = { rating: 'rating DESC', popularity: 'popularity DESC', newest: 'created_at DESC', title: 'title ASC' };
    const [{ count }] = await db.manyOrNone(`SELECT COUNT(*) FROM media WHERE ${where}`, params);
    const items = await db.manyOrNone(
      `SELECT * FROM media WHERE ${where} ORDER BY ${sortMap[sort] || 'rating DESC'} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /entertainment/media/:id â€?get single media item
router.get('/media/:id', auth, async (req, res, next) => {
  try {
    const item = await db.oneOrNone('SELECT * FROM media WHERE id = $1', [req.params.id]);
    if (!item) throw new AppError(404, 'Media not found');
    await db.none('UPDATE media SET views_count = views_count + 1 WHERE id = $1', [req.params.id]);
    setCache(res, 600);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

module.exports = router;
