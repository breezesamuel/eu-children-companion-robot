const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const { AppError } = require('../../../utils/errors');
const rateLimit = require('../../../middleware/rate-limit');
const notificationService = require('../../../services/notification');

const userRateLimit = rateLimit({ windowMs: 60000, max: 30 });

// POST /video-call/schedule â€?schedule a call
router.post('/schedule', auth, async (req, res, next) => {
  try {
    const { participants, scheduled_at, duration_minutes, title, notes, is_group } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new AppError(400, 'participants array is required');
    }
    if (!scheduled_at) throw new AppError(400, 'scheduled_at is required');
    const call = await db.one(
      `INSERT INTO scheduled_calls (initiator_id, participants, scheduled_at, duration_minutes, title, notes, is_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, participants, scheduled_at, duration_minutes || 30, title || null, notes || null, is_group || false]
    );
    for (const pid of participants) {
      if (pid !== req.user.id) {
        await notificationService.sendPush({
          userId: pid,
          title: 'Video call scheduled',
          body: `Scheduled call at ${new Date(scheduled_at).toLocaleString()}`,
          data: { call_id: call.id, type: 'call_scheduled' },
        });
      }
    }
    res.status(201).json({ success: true, data: call });
  } catch (err) { next(err); }
});

// GET /video-call/schedule/:userId â€?get schedule
router.get('/schedule/:userId', auth, async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const upcoming = await db.manyOrNone(
      `SELECT * FROM scheduled_calls
       WHERE ($1 = ANY(participants) OR initiator_id = $1)
         AND status = $2 AND scheduled_at >= NOW()
       ORDER BY scheduled_at ASC`,
      [req.params.userId, status]
    );
    const past = await db.manyOrNone(
      `SELECT * FROM scheduled_calls
       WHERE ($1 = ANY(participants) OR initiator_id = $1)
         AND (status != 'pending' OR scheduled_at < NOW())
       ORDER BY scheduled_at DESC LIMIT 20`,
      [req.params.userId]
    );
    res.json({ success: true, data: { upcoming, past } });
  } catch (err) { next(err); }
});

// DELETE /video-call/schedule/:id â€?cancel scheduled call
router.delete('/schedule/:id', auth, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM scheduled_calls WHERE id = $1 AND (initiator_id = $2 OR $2 = ANY(participants))',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) throw new AppError(404, 'Scheduled call not found');
    res.json({ success: true, message: 'Call cancelled' });
  } catch (err) { next(err); }
});

// POST /video-call/group/create â€?create group call
router.post('/group/create', auth, async (req, res, next) => {
  try {
    const { name, members, max_participants, settings } = req.body;
    if (!members || !Array.isArray(members) || members.length < 2) {
      throw new AppError(400, 'At least 2 members required');
    }
    const allMembers = [...new Set([req.user.id, ...members])];
    const group = await db.one(
      `INSERT INTO call_groups (name, created_by, members, max_participants, settings, active_call_id)
       VALUES ($1, $2, $3, $4, $5, NULL) RETURNING *`,
      [name || 'Group Call', req.user.id, allMembers, max_participants || 8, JSON.stringify(settings || {})]
    );
    await notificationService.sendBatchPush({
      userIds: members.filter(m => m !== req.user.id),
      title: 'Group call created',
      body: `You've been added to ${name || 'a group call'}`,
      data: { group_id: group.id },
    });
    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
});

// POST /video-call/group/:groupId/join â€?join group
router.post('/group/:groupId/join', auth, async (req, res, next) => {
  try {
    const group = await db.oneOrNone('SELECT * FROM call_groups WHERE id = $1', [req.params.groupId]);
    if (!group) throw new AppError(404, 'Group not found');
    if (group.members.length >= group.max_participants) throw new AppError(400, 'Group is full');
    if (group.members.includes(req.user.id)) return res.json({ success: true, message: 'Already a member' });
    await db.none('UPDATE call_groups SET members = members || $1, updated_at = NOW() WHERE id = $2', [[req.user.id], req.params.groupId]);
    res.json({ success: true, message: 'Joined group' });
  } catch (err) { next(err); }
});

// POST /video-call/group/:groupId/leave â€?leave group
router.post('/group/:groupId/leave', auth, async (req, res, next) => {
  try {
    await db.none('UPDATE call_groups SET members = array_remove(members, $1), updated_at = NOW() WHERE id = $2', [req.user.id, req.params.groupId]);
    res.json({ success: true, message: 'Left group' });
  } catch (err) { next(err); }
});

// POST /video-call/:sessionId/recording â€?recording metadata
router.post('/:sessionId/recording', auth, async (req, res, next) => {
  try {
    const { url, duration_seconds, file_size_bytes, format, resolution } = req.body;
    if (!url) throw new AppError(400, 'Recording URL is required');
    const recording = await db.one(
      `INSERT INTO call_recordings (session_id, user_id, url, duration_seconds, file_size_bytes, format, resolution)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.sessionId, req.user.id, url, duration_seconds || 0, file_size_bytes || 0, format || 'mp4', resolution || '720p']
    );
    res.status(201).json({ success: true, data: recording });
  } catch (err) { next(err); }
});

// GET /video-call/recordings/:userId â€?list recordings
router.get('/recordings/:userId', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.manyOrNone(
      'SELECT COUNT(*) FROM call_recordings WHERE user_id = $1', [req.params.userId]
    );
    const recordings = await db.manyOrNone(
      'SELECT * FROM call_recordings WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.params.userId, limit, offset]
    );
    res.json({
      success: true,
      data: recordings,
      pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// GET /video-call/:sessionId/quality â€?call quality metrics
router.get('/:sessionId/quality', auth, async (req, res, next) => {
  try {
    const quality = await db.oneOrNone(
      `SELECT
        ROUND(AVG(latency_ms)) AS avg_latency,
        ROUND(AVG(packet_loss)::numeric, 3) AS avg_packet_loss,
        ROUND(AVG(jitter_ms)::numeric, 1) AS avg_jitter,
        ROUND(AVG(bitrate_kbps)) AS avg_bitrate,
        ROUND(AVG(framerate)) AS avg_framerate,
        MIN(latency_ms) AS min_latency,
        MAX(latency_ms) AS max_latency,
        COUNT(*) AS samples,
        ROUND(AVG(mos_score)::numeric, 2) AS avg_mos
      FROM call_quality_samples WHERE session_id = $1`,
      [req.params.sessionId]
    );
    const severity = quality?.avg_mos >= 4 ? 'excellent' : quality?.avg_mos >= 3 ? 'good' : quality?.avg_mos >= 2 ? 'fair' : 'poor';
    const recommendations = [];
    if (quality?.avg_latency > 300) recommendations.push('High latency detected. Consider switching to audio-only.');
    if (quality?.avg_packet_loss > 0.05) recommendations.push('Packet loss is high. Try lowering video resolution.');
    if (quality?.avg_jitter > 50) recommendations.push('Jitter is high. Consider enabling jitter buffer.');
    res.json({ success: true, data: { ...quality, quality_severity: severity, recommendations } });
  } catch (err) { next(err); }
});

// POST /video-call/:sessionId/adapt-bandwidth â€?change resolution/fps
router.post('/:sessionId/adapt-bandwidth', auth, async (req, res, next) => {
  try {
    const { resolution, framerate, bitrate } = req.body;
    if (!resolution && !framerate && !bitrate) throw new AppError(400, 'At least one of resolution, framerate, bitrate required');
    const adaptation = await db.one(
      `INSERT INTO bandwidth_adaptations (session_id, user_id, resolution, framerate, bitrate)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.sessionId, req.user.id, resolution || '720p', framerate || 30, bitrate || null]
    );
    res.json({ success: true, data: adaptation });
  } catch (err) { next(err); }
});

// GET /video-call/analytics/:userId â€?call analytics
router.get('/analytics/:userId', auth, async (req, res, next) => {
  try {
    const period = req.query.period || '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000);
    const analytics = await db.oneOrNone(`
      SELECT
        COUNT(*) AS total_calls,
        SUM(duration_seconds) AS total_duration_seconds,
        ROUND(AVG(duration_seconds)) AS avg_duration_seconds,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_calls,
        COUNT(*) FILTER (WHERE status = 'missed') AS missed_calls,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_calls,
        COUNT(DISTINCT DATE(started_at)) AS active_days,
        MAX(duration_seconds) AS longest_call,
        ROUND(AVG(quality_score)::numeric, 2) AS avg_quality,
        COUNT(*) FILTER (WHERE is_group) AS group_calls
      FROM call_sessions
      WHERE (caller_id = $1 OR callee_id = $1) AND started_at >= $2
    `, [req.params.userId, since]);
    const daily = await db.manyOrNone(`
      SELECT DATE(started_at) AS date, COUNT(*) AS calls, SUM(duration_seconds) AS total_seconds
      FROM call_sessions WHERE (caller_id = $1 OR callee_id = $1) AND started_at >= $2
      GROUP BY DATE(started_at) ORDER BY date
    `, [req.params.userId, since]);
    const trend = daily.length >= 2
      ? (daily[daily.length - 1].calls - daily[0].calls) / Math.max(daily[0].calls, 1) * 100
      : 0;
    res.json({ success: true, data: { summary: analytics, daily, trend_percent: Math.round(trend) } });
  } catch (err) { next(err); }
});

// GET /video-call/contacts/:userId â€?contact list
router.get('/contacts/:userId', auth, async (req, res, next) => {
  try {
    const contacts = await db.manyOrNone(`
      SELECT c.*, u.name, u.avatar_url, u.online_status,
        (SELECT COUNT(*) FROM call_sessions WHERE (caller_id = c.contact_id OR callee_id = c.contact_id) AND (caller_id = $1 OR callee_id = $1) AND started_at >= NOW() - INTERVAL '30 days') AS recent_call_count
      FROM call_contacts c
      JOIN users u ON u.id = c.contact_id
      WHERE c.user_id = $1
      ORDER BY c.is_favorite DESC, u.name ASC
    `, [req.params.userId]);
    const blocked = await db.manyOrNone(
      'SELECT bu.*, u.name FROM blocked_users bu JOIN users u ON u.id = bu.blocked_id WHERE bu.user_id = $1',
      [req.params.userId]
    );
    res.json({ success: true, data: { contacts, blocked } });
  } catch (err) { next(err); }
});

// POST /video-call/contacts/:userId â€?add contact
router.post('/contacts/:userId', auth, async (req, res, next) => {
  try {
    const { contact_id, nickname, is_favorite } = req.body;
    if (!contact_id) throw new AppError(400, 'contact_id required');
    if (contact_id === req.params.userId) throw new AppError(400, 'Cannot add yourself');
    const contact = await db.one(
      `INSERT INTO call_contacts (user_id, contact_id, nickname, is_favorite)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, contact_id) DO UPDATE SET
         nickname = COALESCE($3, call_contacts.nickname), is_favorite = COALESCE($4, call_contacts.is_favorite)
       RETURNING *`,
      [req.params.userId, contact_id, nickname || null, is_favorite || false]
    );
    res.status(201).json({ success: true, data: contact });
  } catch (err) { next(err); }
});

// GET /video-call/history/:userId â€?call history with filters
router.get('/history/:userId', auth, async (req, res, next) => {
  try {
    const { type, date, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.params.userId];
    const conditions = ['(caller_id = $1 OR callee_id = $1)'];
    let idx = 2;
    if (type === 'group') { conditions.push('is_group = true'); }
    if (type === 'one_to_one') { conditions.push('is_group = false'); }
    if (date) { conditions.push(`DATE(started_at) = $${idx}`); params.push(date); idx++; }
    if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
    const where = conditions.join(' AND ');
    const [{ count }] = await db.manyOrNone(`SELECT COUNT(*) FROM call_sessions WHERE ${where}`, params);
    const history = await db.manyOrNone(
      `SELECT cs.*,
        CASE WHEN cs.caller_id = $1 THEN cs.callee_id ELSE cs.caller_id END AS other_party_id,
        u.name AS other_party_name, u.avatar_url AS other_party_avatar
       FROM call_sessions cs
       LEFT JOIN users u ON u.id = CASE WHEN cs.caller_id = $1 THEN cs.callee_id ELSE cs.caller_id END
       WHERE ${where}
       ORDER BY cs.started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({
      success: true,
      data: history,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
});

// POST /video-call/block/:userId â€?block user
router.post('/block/:userId', auth, async (req, res, next) => {
  try {
    const { blocked_id } = req.body;
    if (!blocked_id) throw new AppError(400, 'blocked_id required');
    await db.none(
      'INSERT INTO blocked_users (user_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.userId, blocked_id]
    );
    await db.none('DELETE FROM call_contacts WHERE user_id = $1 AND contact_id = $2', [req.params.userId, blocked_id]);
    res.json({ success: true, message: 'User blocked' });
  } catch (err) { next(err); }
});

// DELETE /video-call/block/:userId â€?unblock user
router.delete('/block/:userId', auth, async (req, res, next) => {
  try {
    const { blocked_id } = req.body;
    if (!blocked_id) throw new AppError(400, 'blocked_id required');
    await db.none('DELETE FROM blocked_users WHERE user_id = $1 AND blocked_id = $2', [req.params.userId, blocked_id]);
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) { next(err); }
});

// POST /video-call/emergency â€?emergency call routing
router.post('/emergency', auth, async (req, res, next) => {
  try {
    const { child_id, reason, location } = req.body;
    if (!child_id) throw new AppError(400, 'child_id required');
    const parents = await db.manyOrNone(
      'SELECT parent_id FROM children WHERE id = $1 UNION SELECT parent_id FROM child_parents WHERE child_id = $1',
      [child_id]
    );
    if (parents.length === 0) throw new AppError(404, 'No parent found for child');
    const emergency = await db.one(
      `INSERT INTO emergency_calls (child_id, initiator_id, reason, location, status)
       VALUES ($1, $2, $3, $4, 'routing') RETURNING *`,
      [child_id, req.user.id, reason || 'Emergency', location || null]
    );
    for (const p of parents) {
      await notificationService.sendPush({
        userId: p.parent_id,
        title: 'EMERGENCY CALL',
        body: `Emergency call from child${reason ? ': ' + reason : ''}`,
        priority: 'high',
        data: { emergency_id: emergency.id, child_id, type: 'emergency' },
      });
    }
    res.status(201).json({ success: true, data: emergency, routed_to: parents.length, parents_notified: parents.map(p => p.parent_id) });
  } catch (err) { next(err); }
});

// POST /video-call/:sessionId/background â€?set virtual background
router.post('/:sessionId/background', auth, async (req, res, next) => {
  try {
    const { type, image_url, color } = req.body;
    if (!type) throw new AppError(400, 'type (blur/image/color) is required');
    const allowed = ['blur', 'image', 'color'];
    if (!allowed.includes(type)) throw new AppError(400, `type must be one of: ${allowed.join(', ')}`);
    const bg = await db.one(
      `INSERT INTO virtual_backgrounds (session_id, user_id, bg_type, image_url, color)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.sessionId, req.user.id, type, image_url || null, color || null]
    );
    res.json({ success: true, data: bg });
  } catch (err) { next(err); }
});

// POST /video-call/:sessionId/feedback â€?call feedback
router.post('/:sessionId/feedback', auth, async (req, res, next) => {
  try {
    const { rating, audio_quality, video_quality, comments, issues } = req.body;
    if (!rating || rating < 1 || rating > 5) throw new AppError(400, 'rating (1-5) is required');
    const existing = await db.oneOrNone('SELECT id FROM call_feedback WHERE session_id = $1 AND user_id = $2', [req.params.sessionId, req.user.id]);
    if (existing) throw new AppError(400, 'Feedback already submitted for this session');
    const feedback = await db.one(
      `INSERT INTO call_feedback (session_id, user_id, rating, audio_quality, video_quality, comments, issues)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.sessionId, req.user.id, rating, audio_quality || null, video_quality || null, comments || null, issues || []]
    );
    await db.none('UPDATE call_sessions SET feedback_score = $1 WHERE id = $2', [rating, req.params.sessionId]);
    res.status(201).json({ success: true, data: feedback });
  } catch (err) { next(err); }
});

// GET /video-call/active/:userId â€?active calls for user
router.get('/active/:userId', auth, async (req, res, next) => {
  try {
    const active = await db.manyOrNone(
      `SELECT cs.*, cg.name AS group_name
       FROM call_sessions cs
       LEFT JOIN call_groups cg ON cg.active_call_id = cs.id
       WHERE (cs.caller_id = $1 OR cs.callee_id = $1 OR $1 = ANY(cs.participants))
         AND cs.status = 'active'
       ORDER BY cs.started_at DESC`,
      [req.params.userId]
    );
    res.json({ success: true, data: active });
  } catch (err) { next(err); }
});

module.exports = router;
