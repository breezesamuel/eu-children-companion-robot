const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const { AppError } = require('../../../utils/errors');
const recommendationEngine = require('../../../services/recommendation');

const SUBJECTS = ['math', 'language', 'science', 'art', 'music', 'social', 'physical'];

// POST /learning/study-plan/:childId â€?generate study plan
router.post('/study-plan/:childId', auth, async (req, res, next) => {
  try {
    const { duration_weeks, subjects, intensity, goals } = req.body;
    const weeks = duration_weeks || 1;
    const focusSubjects = subjects || SUBJECTS.slice(0, 3);
    const existing = await db.oneOrNone('SELECT id FROM study_plans WHERE child_id = $1 AND status = $2', [req.params.childId, 'active']);
    if (existing) await db.none('UPDATE study_plans SET status = $1 WHERE id = $2', ['archived', existing.id]);
    const plan = await db.one(
      `INSERT INTO study_plans (child_id, duration_weeks, subjects, intensity, goals, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [req.params.childId, weeks, focusSubjects, intensity || 'moderate', goals || null]
    );
    const sessions = [];
    for (let w = 0; w < weeks; w++) {
      for (const subject of focusSubjects) {
        const spw = intensity === 'high' ? 5 : intensity === 'low' ? 2 : 3;
        for (let d = 0; d < spw; d++) {
          sessions.push({ plan_id: plan.id, week: w + 1, day: d + 1, subject, duration_minutes: intensity === 'high' ? 30 : intensity === 'low' ? 15 : 20, completed: false });
        }
      }
    }
    if (sessions.length > 0) {
      const placeholders = sessions.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(',');
      const flat = sessions.flatMap(s => [s.plan_id, s.week, s.day, s.subject, s.duration_minutes, s.completed]);
      await db.none(`INSERT INTO study_plan_sessions (plan_id, week, day, subject, duration_minutes, completed) VALUES ${placeholders}`, flat);
    }
    res.status(201).json({ success: true, data: { plan, sessions_generated: sessions.length } });
  } catch (err) { next(err); }
});

// GET /learning/learning-path/:childId â€?skill tree progress
router.get('/learning-path/:childId', auth, async (req, res, next) => {
  try {
    const params = [req.params.childId];
    const conditions = ['lp.child_id = $1'];
    if (req.query.subject) { conditions.push('ls.subject = $2'); params.push(req.query.subject); }
    const skills = await db.manyOrNone(`
      SELECT lp.*, ls.name AS skill_name, ls.description, ls.category,
        ls.prerequisites, ls.sort_order,
        CASE WHEN lp.mastery_level >= 80 THEN 'mastered'
             WHEN lp.mastery_level >= 50 THEN 'in_progress'
             WHEN lp.started THEN 'started' ELSE 'locked' END AS status
      FROM learning_progress lp
      JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ls.sort_order
    `, params);
    const tree = {};
    skills.forEach(s => {
      const cat = s.category || 'general';
      if (!tree[cat]) tree[cat] = { category: cat, skills: [] };
      tree[cat].skills.push(s);
    });
    res.json({ success: true, data: { flat: skills, tree: Object.values(tree) } });
  } catch (err) { next(err); }
});

// POST /learning/review/:childId â€?spaced repetition review
router.post('/review/:childId', auth, async (req, res, next) => {
  try {
    const { flashcard_id, quality, response_time_ms } = req.body;
    if (!flashcard_id) throw new AppError(400, 'flashcard_id is required');
    const existing = await db.oneOrNone('SELECT * FROM spaced_repetition WHERE child_id = $1 AND flashcard_id = $2', [req.params.childId, flashcard_id]);
    let interval, easeFactor, nextReview;
    if (existing) {
      easeFactor = existing.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
      interval = quality < 3 ? 1 : Math.round(existing.interval * easeFactor);
      nextReview = new Date(Date.now() + interval * 86400000);
      await db.none(
        `UPDATE spaced_repetition SET interval = $1, ease_factor = $2, repetitions = repetitions + 1,
         last_quality = $3, next_review = $4, response_time_ms = $5, updated_at = NOW() WHERE id = $6`,
        [interval, easeFactor, quality, nextReview, response_time_ms || null, existing.id]
      );
    } else {
      interval = 1; easeFactor = 2.5;
      nextReview = new Date(Date.now() + 86400000);
      await db.none(
        `INSERT INTO spaced_repetition (child_id, flashcard_id, interval, ease_factor, last_quality, next_review, response_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.params.childId, flashcard_id, interval, easeFactor, quality, nextReview, response_time_ms || null]
      );
    }
    res.json({ success: true, data: { interval, ease_factor: easeFactor, next_review: nextReview } });
  } catch (err) { next(err); }
});

// GET /learning/reviews/:childId/due â€?due reviews
router.get('/reviews/:childId/due', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const due = await db.manyOrNone(
      `SELECT sr.*, fc.* FROM spaced_repetition sr
       JOIN flashcards fc ON fc.id = sr.flashcard_id
       WHERE sr.child_id = $1 AND sr.next_review <= NOW()
       ORDER BY sr.next_review ASC LIMIT $2`,
      [req.params.childId, limit]
    );
    res.json({ success: true, data: due, count: due.length });
  } catch (err) { next(err); }
});

// GET /learning/mastery/:childId/:subject â€?skill mastery
router.get('/mastery/:childId/:subject', auth, async (req, res, next) => {
  try {
    const { childId, subject } = req.params;
    if (!SUBJECTS.includes(subject)) throw new AppError(400, `Invalid subject. Allowed: ${SUBJECTS.join(', ')}`);
    const mastery = await db.manyOrNone(`
      SELECT ls.name, ls.category, lp.mastery_level, lp.attempts, lp.last_practiced, lp.started_at,
        CASE WHEN lp.mastery_level >= 80 THEN 'mastered'
             WHEN lp.mastery_level >= 50 THEN 'proficient'
             WHEN lp.mastery_level >= 20 THEN 'developing' ELSE 'beginner' END AS level_label
      FROM learning_progress lp
      JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE lp.child_id = $1 AND ls.subject = $2
      ORDER BY ls.sort_order
    `, [childId, subject]);
    const overall = mastery.length ? Math.round(mastery.reduce((s, m) => s + m.mastery_level, 0) / mastery.length) : 0;
    res.json({ success: true, data: { subject, overall_mastery: overall, skills: mastery } });
  } catch (err) { next(err); }
});

// GET /learning/recommendations/:childId â€?learning recommendations
router.get('/recommendations/:childId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await recommendationEngine.getLearningRecommendations(req.params.childId, limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /learning/progress-report/:childId â€?progress report
router.get('/progress-report/:childId', auth, async (req, res, next) => {
  try {
    const params = [req.params.childId];
    const conditions = ['lp.child_id = $1'];
    if (req.query.subject) { conditions.push('ls.subject = $2'); params.push(req.query.subject); }
    const report = await db.manyOrNone(`
      SELECT ls.subject, ls.category, COUNT(*) AS total_skills,
        ROUND(AVG(lp.mastery_level)::numeric, 1) AS avg_mastery,
        SUM(lp.attempts) AS total_attempts, MAX(lp.last_practiced) AS last_practice,
        COUNT(*) FILTER (WHERE lp.mastery_level >= 80) AS mastered_count,
        COUNT(*) FILTER (WHERE lp.mastery_level < 20 OR lp.mastery_level IS NULL) AS not_started_count
      FROM learning_progress lp
      JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ls.subject, ls.category
      ORDER BY ls.subject, ls.category
    `, params);
    const overall = report.length ? Math.round(report.reduce((s, r) => s + r.avg_mastery, 0) / report.length) : 0;
    res.json({ success: true, data: { overall_mastery: overall, breakdown: report } });
  } catch (err) { next(err); }
});

// GET /learning/schedule/:childId â€?get study schedule
router.get('/schedule/:childId', auth, async (req, res, next) => {
  try {
    const params = [req.params.childId];
    const conditions = ['child_id = $1'];
    if (req.query.date) { conditions.push('DATE(scheduled_date) = $2'); params.push(req.query.date); }
    const schedule = await db.manyOrNone(`SELECT * FROM study_schedule WHERE ${conditions.join(' AND ')} ORDER BY scheduled_date, start_time`, params);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// POST /learning/schedule/:childId â€?create schedule entry
router.post('/schedule/:childId', auth, async (req, res, next) => {
  try {
    const { subject, start_time, end_time, scheduled_date, notes } = req.body;
    if (!subject || !start_time || !scheduled_date) throw new AppError(400, 'subject, start_time, scheduled_date required');
    const entry = await db.one(
      `INSERT INTO study_schedule (child_id, subject, start_time, end_time, scheduled_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.childId, subject, start_time, end_time || null, scheduled_date, notes || null]
    );
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// GET /learning/summary/:childId/:subject â€?subject summary
router.get('/summary/:childId/:subject', auth, async (req, res, next) => {
  try {
    const { childId, subject } = req.params;
    const topics = await db.manyOrNone(`
      SELECT ls.*, lp.mastery_level, lp.attempts, lp.last_practiced
      FROM learning_skills ls
      LEFT JOIN learning_progress lp ON lp.skill_id = ls.id AND lp.child_id = $1
      WHERE ls.subject = $2 ORDER BY ls.sort_order
    `, [childId, subject]);
    const strengths = topics.filter(t => (t.mastery_level || 0) >= 70).map(s => s.name);
    const weaknesses = topics.filter(t => (t.mastery_level || 0) < 30).map(w => w.name);
    res.json({ success: true, data: { subject, topics, strengths, weaknesses } });
  } catch (err) { next(err); }
});

// POST /learning/homework â€?create homework
router.post('/homework', auth, async (req, res, next) => {
  try {
    const { child_id, subject, title, description, due_date, estimated_minutes, attachments } = req.body;
    if (!child_id || !subject || !title) throw new AppError(400, 'child_id, subject, title required');
    const homework = await db.one(
      `INSERT INTO homework (child_id, subject, title, description, due_date, estimated_minutes, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [child_id, subject, title, description || null, due_date || null, estimated_minutes || null, attachments || null]
    );
    res.status(201).json({ success: true, data: homework });
  } catch (err) { next(err); }
});

// GET /learning/homework/:childId â€?list homework
router.get('/homework/:childId', auth, async (req, res, next) => {
  try {
    const params = [req.params.childId];
    const conditions = ['child_id = $1'];
    let idx = 2;
    if (req.query.status) { conditions.push(`status = $${idx}`); params.push(req.query.status); idx++; }
    if (req.query.subject) { conditions.push(`subject = $${idx}`); params.push(req.query.subject); idx++; }
    const homework = await db.manyOrNone(`SELECT * FROM homework WHERE ${conditions.join(' AND ')} ORDER BY due_date ASC NULLS LAST, created_at DESC`, params);
    res.json({ success: true, data: homework });
  } catch (err) { next(err); }
});

// PUT /learning/homework/:id â€?update homework
router.put('/homework/:id', auth, async (req, res, next) => {
  try {
    const { title, description, status, due_date, estimated_minutes, completion_notes } = req.body;
    const homework = await db.one(
      `UPDATE homework SET title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), due_date = COALESCE($4, due_date),
        estimated_minutes = COALESCE($5, estimated_minutes),
        completion_notes = COALESCE($6, completion_notes), updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, status, due_date, estimated_minutes, completion_notes, req.params.id]
    );
    res.json({ success: true, data: homework });
  } catch (err) { next(err); }
});

// POST /learning/goals/:childId â€?create learning goal
router.post('/goals/:childId', auth, async (req, res, next) => {
  try {
    const { subject, title, description, target_date, target_value, metric } = req.body;
    if (!subject || !title) throw new AppError(400, 'subject and title required');
    const goal = await db.one(
      `INSERT INTO learning_goals (child_id, subject, title, description, target_date, target_value, metric, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING *`,
      [req.params.childId, subject, title, description || null, target_date || null, target_value || null, metric || null]
    );
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
});

// GET /learning/goals/:childId â€?list goals
router.get('/goals/:childId', auth, async (req, res, next) => {
  try {
    const status = req.query.status;
    const params = [req.params.childId];
    const conditions = ['child_id = $1'];
    if (status) { conditions.push('status = $2'); params.push(status); }
    const goals = await db.manyOrNone(`SELECT * FROM learning_goals WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
    const progress = await Promise.all(goals.map(async g => {
      if (g.metric === 'mastery' && g.subject) {
        const current = await db.oneOrNone('SELECT ROUND(AVG(mastery_level)::numeric, 1) AS value FROM learning_progress lp JOIN learning_skills ls ON ls.id = lp.skill_id WHERE lp.child_id = $1 AND ls.subject = $2', [req.params.childId, g.subject]);
        return { ...g, current_value: parseFloat(current?.value) || 0, progress_pct: g.target_value ? Math.min(100, Math.round((parseFloat(current?.value) || 0) / g.target_value * 100)) : 0 };
      }
      return { ...g, current_value: null, progress_pct: g.status === 'completed' ? 100 : 0 };
    }));
    res.json({ success: true, data: progress });
  } catch (err) { next(err); }
});

// PUT /learning/goals/:id â€?update goal
router.put('/goals/:id', auth, async (req, res, next) => {
  try {
    const { title, description, target_date, target_value, metric, status } = req.body;
    const goal = await db.one(
      `UPDATE learning_goals SET title = COALESCE($1, title), description = COALESCE($2, description),
        target_date = COALESCE($3, target_date), target_value = COALESCE($4, target_value),
        metric = COALESCE($5, metric), status = COALESCE($6, status), updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, target_date, target_value, metric, status, req.params.id]
    );
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
});

// POST /learning/quizzes/generate â€?auto-generate quiz
router.post('/quizzes/generate', auth, async (req, res, next) => {
  try {
    const { child_id, subject, topic, question_count = 5, difficulty } = req.body;
    if (!child_id || !subject) throw new AppError(400, 'child_id and subject required');
    const questions = await db.manyOrNone(
      `SELECT * FROM question_bank
       WHERE subject = $1 AND (topic = $2 OR $2 IS NULL)
         AND (difficulty = $3 OR $3 IS NULL)
       ORDER BY RANDOM() LIMIT $4`,
      [subject, topic || null, difficulty || null, question_count]
    );
    if (questions.length < 3) throw new AppError(400, 'Not enough questions available');
    const quiz = await db.one(
      `INSERT INTO quizzes (child_id, subject, topic, question_ids, total_questions, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [child_id, subject, topic || null, questions.map(q => q.id), questions.length, difficulty || 'medium']
    );
    res.status(201).json({ success: true, data: { quiz, questions } });
  } catch (err) { next(err); }
});

// POST /learning/flashcards â€?create flashcard
router.post('/flashcards', auth, async (req, res, next) => {
  try {
    const { child_id, subject, front, back, tags, hint } = req.body;
    if (!child_id || !front || !back) throw new AppError(400, 'child_id, front, back required');
    const card = await db.one(
      `INSERT INTO flashcards (child_id, subject, front, back, tags, hint)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [child_id, subject || 'general', front, back, tags || [], hint || null]
    );
    await db.none('INSERT INTO spaced_repetition (child_id, flashcard_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [child_id, card.id]);
    res.status(201).json({ success: true, data: card });
  } catch (err) { next(err); }
});

// GET /learning/flashcards/:childId â€?list flashcards
router.get('/flashcards/:childId', auth, async (req, res, next) => {
  try {
    const subject = req.query.subject;
    const params = [req.params.childId];
    const conditions = ['child_id = $1'];
    if (subject) { conditions.push('subject = $2'); params.push(subject); }
    const cards = await db.manyOrNone(`SELECT * FROM flashcards WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
    res.json({ success: true, data: cards });
  } catch (err) { next(err); }
});

// DELETE /learning/flashcards/:id â€?delete flashcard
router.delete('/flashcards/:id', auth, async (req, res, next) => {
  try {
    await db.none('DELETE FROM spaced_repetition WHERE flashcard_id = $1', [req.params.id]);
    const result = await db.result('DELETE FROM flashcards WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) throw new AppError(404, 'Flashcard not found');
    res.json({ success: true, message: 'Flashcard deleted' });
  } catch (err) { next(err); }
});

// POST /learning/session/start â€?start study session
router.post('/session/start', auth, async (req, res, next) => {
  try {
    const { child_id, subject, session_type } = req.body;
    if (!child_id || !subject) throw new AppError(400, 'child_id and subject required');
    const session = await db.one(
      `INSERT INTO study_sessions (child_id, subject, session_type, started_at, status)
       VALUES ($1, $2, $3, NOW(), 'active') RETURNING *`,
      [child_id, subject, session_type || 'self_study']
    );
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
});

// POST /learning/session/end â€?end study session
router.post('/session/end', auth, async (req, res, next) => {
  try {
    const { session_id, completed, notes } = req.body;
    if (!session_id) throw new AppError(400, 'session_id required');
    const session = await db.one(
      `UPDATE study_sessions SET ended_at = NOW(), duration_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60),
        status = $1, completed = $2, notes = $3 WHERE id = $4 RETURNING *`,
      [completed ? 'completed' : 'cancelled', completed || false, notes || null, session_id]
    );
    if (completed) {
      const today = new Date().toISOString().slice(0, 10);
      await db.none(
        `INSERT INTO study_streaks (child_id, study_date) VALUES ($1, $2) ON CONFLICT (child_id, study_date) DO NOTHING`,
        [session.child_id, today]
      );
    }
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
});

// GET /learning/streaks/:childId â€?learning streaks
router.get('/streaks/:childId', auth, async (req, res, next) => {
  try {
    const streaks = await db.manyOrNone(
      'SELECT study_date FROM study_streaks WHERE child_id = $1 ORDER BY study_date DESC',
      [req.params.childId]
    );
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = streaks.map(s => new Date(s.study_date).setHours(0, 0, 0, 0));
    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
    if (uniqueDates.length > 0) {
      const diffFromToday = Math.round((today.getTime() - uniqueDates[0]) / 86400000);
      if (diffFromToday <= 1) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const gap = Math.round((uniqueDates[i - 1] - uniqueDates[i]) / 86400000);
          if (gap === 1) currentStreak++;
          else break;
        }
      }
    }
    const longestStreak = await db.oneOrNone(
      `WITH date_groups AS (
        SELECT study_date, ROW_NUMBER() OVER (ORDER BY study_date) - EXTRACT(DAY FROM study_date)::INT AS grp
        FROM (SELECT DISTINCT study_date FROM study_streaks WHERE child_id = $1) sub
      )
      SELECT MAX(COUNT(*)) AS longest_streak FROM date_groups GROUP BY grp ORDER BY longest_streak DESC LIMIT 1`,
      [req.params.childId]
    );
    const milestones = [
      { days: 3, label: 'Getting Started', achieved: currentStreak >= 3 },
      { days: 7, label: 'One Week Streak', achieved: currentStreak >= 7 },
      { days: 14, label: 'Two Weeks Strong', achieved: currentStreak >= 14 },
      { days: 30, label: 'Monthly Master', achieved: currentStreak >= 30 },
      { days: 60, label: 'Two Month Champion', achieved: currentStreak >= 60 },
      { days: 100, label: 'Century Learner', achieved: currentStreak >= 100 },
    ];
    res.json({ success: true, data: { current_streak: currentStreak, longest_streak: parseInt(longestStreak?.longest_streak) || 0, total_days: uniqueDates.length, milestones, next_milestone: milestones.find(m => !m.achieved)?.label || 'All Achieved' } });
  } catch (err) { next(err); }
});

// GET /learning/comparison/:childId â€?anonymized peer comparison
router.get('/comparison/:childId', auth, async (req, res, next) => {
  try {
    const { childId } = req.params;
    const subject = req.query.subject;
    const childMastery = await db.manyOrNone(`
      SELECT ls.subject, ROUND(AVG(lp.mastery_level)::numeric, 1) AS avg_mastery
      FROM learning_progress lp JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE lp.child_id = $1 ${subject ? 'AND ls.subject = $2' : ''}
      GROUP BY ls.subject
    `, subject ? [childId, subject] : [childId]);
    const peerMastery = await db.manyOrNone(`
      SELECT ls.subject, ROUND(AVG(lp.mastery_level)::numeric, 1) AS peer_avg_mastery,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lp.mastery_level)::numeric, 1) AS peer_median,
        ROUND(AVG(lp.mastery_level)::numeric + STDDEV(lp.mastery_level)::numeric, 1) AS peer_high,
        COUNT(*) AS peer_count
      FROM learning_progress lp JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE lp.child_id != $1 AND ls.subject = ANY($2::text[])
      GROUP BY ls.subject
    `, [childId, childMastery.map(c => c.subject)]);
    const comparison = childMastery.map(c => {
      const peer = peerMastery.find(p => p.subject === c.subject);
      const percentile = peer ? Math.round(((c.avg_mastery - peer.peer_avg_mastery) / Math.max(peer.peer_high - peer.peer_avg_mastery, 1)) * 25 + 50) : 50;
      return { subject: c.subject, child_avg: c.avg_mastery, peer_avg: peer?.peer_avg_mastery || null, peer_median: peer?.peer_median || null, peer_high: peer?.peer_high || null, percentile: Math.max(1, Math.min(99, percentile)), peer_count: peer?.peer_count || 0 };
    });
    res.json({ success: true, data: comparison });
  } catch (err) { next(err); }
});

// GET /learning/pace/:childId â€?learning pace analysis
router.get('/pace/:childId', auth, async (req, res, next) => {
  try {
    const pace = await db.manyOrNone(`
      SELECT ls.subject, ls.name AS skill_name,
        lp.attempts, lp.mastery_level, lp.last_practiced,
        CASE WHEN lp.mastery_level >= 80 THEN 'fast'
             WHEN lp.mastery_level >= 30 AND lp.attempts > 3 THEN 'moderate'
             WHEN lp.attempts > 5 AND lp.mastery_level < 30 THEN 'struggling'
             ELSE 'new' END AS pace_category
      FROM learning_progress lp
      JOIN learning_skills ls ON ls.id = lp.skill_id
      WHERE lp.child_id = $1
      ORDER BY pace_category, lp.mastery_level DESC
    `, [req.params.childId]);
    const fast = pace.filter(p => p.pace_category === 'fast').length;
    const struggling = pace.filter(p => p.pace_category === 'struggling').length;
    res.json({ success: true, data: { pace, summary: { fast, moderate: pace.filter(p => p.pace_category === 'moderate').length, struggling, new: pace.filter(p => p.pace_category === 'new').length } } });
  } catch (err) { next(err); }
});

module.exports = router;
