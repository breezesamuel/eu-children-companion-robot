const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const cache = require('../../../middleware/cache');
const { AppError } = require('../../../utils/errors');
const storyGenerator = require('../../../services/story-generator');
const nutritionService = require('../../../services/nutrition');

const AGE_GROUPS = ['0-1', '1-3', '3-5', '5-8', '8-12', '12-16'];
const setCache = (res, ttl = 600) => res.set('Cache-Control', `public, max-age=${ttl}`);

// GET /life-services/health â€?service health check
router.get('/health', auth, async (req, res, next) => {
  try {
    const start = Date.now();
    await db.one('SELECT 1');
    const dbLatency = Date.now() - start;
    const services = {
      database: { status: 'ok', latency_ms: dbLatency },
      story_generator: { status: storyGenerator.isAvailable() ? 'ok' : 'degraded' },
      nutrition: { status: nutritionService.isAvailable() ? 'ok' : 'degraded' },
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
      timestamp: new Date(),
    };
    const allOk = Object.values(services).every(s => s.status === 'ok' || typeof s === 'number' || s instanceof Date);
    res.json({ success: true, status: allOk ? 'healthy' : 'degraded', data: services });
  } catch (err) { next(err); }
});

// POST /life-services/stories/generate â€?AI bedtime story
router.post('/stories/generate', auth, async (req, res, next) => {
  try {
    const { child_name, age, theme, length, characters, moral_lesson } = req.body;
    if (!child_name) throw new AppError(400, 'child_name is required');
    const story = await storyGenerator.generate({
      childName: child_name,
      age: age || 4,
      theme: theme || 'adventure',
      length: length || 'short',
      characters: characters || [],
      moralLesson: moral_lesson || null,
    });
    const saved = await db.one(
      `INSERT INTO bedtime_stories (child_name, age, theme, length, characters, moral_lesson, title, content, word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [child_name, age || 4, theme || 'adventure', length || 'short', characters || [], moral_lesson || null, story.title, story.content, story.word_count]
    );
    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
});

// GET /life-services/meal-plan/:age â€?meal planning
router.get('/meal-plan/:age', auth, async (req, res, next) => {
  try {
    const age = req.params.age;
    const days = parseInt(req.query.days) || 7;
    const diet = req.query.diet;
    const exclude = req.query.exclude ? req.query.exclude.split(',') : [];
    if (!AGE_GROUPS.includes(age) && !AGE_GROUPS.some(g => g.startsWith(age.split('-')[0]))) {
      throw new AppError(400, `Invalid age group. Use ranges: ${AGE_GROUPS.join(', ')}`);
    }
    const plans = await db.manyOrNone(
      `SELECT * FROM meal_plans WHERE age_group = $1 ${diet ? 'AND diet_type = $2' : ''} ORDER BY RANDOM() LIMIT $3`,
      diet ? [age, diet, days * 3] : [age, days * 3]
    );
    const meals = plans.map(p => {
      if (exclude.length > 0 && p.ingredients) {
        const pIng = p.ingredients || [];
        if (exclude.some(e => pIng.includes(e))) return null;
      }
      return p;
    }).filter(Boolean);
    const grouped = {};
    meals.forEach(m => {
      const day = Math.floor((meals.indexOf(m) % (days * 3)) / 3) + 1;
      if (!grouped[day]) grouped[day] = { day, meals: [] };
      grouped[day].meals.push(m);
    });
    const hasAllergens = meals.some(m => m.allergens && m.allergens.length > 0);
    setCache(res, 3600);
    res.json({ success: true, data: { plan: Object.values(grouped), total_days: days, note: hasAllergens ? 'Check allergens in meal details' : null, excludes_applied: exclude } });
  } catch (err) { next(err); }
});

// POST /life-services/meal-log/:childId â€?log meal
router.post('/meal-log/:childId', auth, async (req, res, next) => {
  try {
    const { meal_type, food_items, calories, portion_size, notes } = req.body;
    if (!meal_type || !food_items) throw new AppError(400, 'meal_type and food_items required');
    const log = await db.one(
      `INSERT INTO meal_logs (child_id, meal_type, food_items, calories, portion_size, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.childId, meal_type, food_items, calories || null, portion_size || null, notes || null]
    );
    const dailyTotal = await db.oneOrNone(
      `SELECT SUM(calories) AS total_cal, COUNT(*) AS meal_count
       FROM meal_logs WHERE child_id = $1 AND DATE(logged_at) = CURRENT_DATE`,
      [req.params.childId]
    );
    res.status(201).json({ success: true, data: log, daily_summary: dailyTotal });
  } catch (err) { next(err); }
});

// POST /life-services/chores â€?create chore
router.post('/chores', auth, async (req, res, next) => {
  try {
    const { child_id, title, description, frequency, assigned_day, reward, difficulty, category } = req.body;
    if (!child_id || !title) throw new AppError(400, 'child_id and title required');
    const chore = await db.one(
      `INSERT INTO chores (child_id, title, description, frequency, assigned_day, reward, difficulty, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [child_id, title, description || null, frequency || 'daily', assigned_day || null, reward || null, difficulty || 'easy', category || 'general']
    );
    res.status(201).json({ success: true, data: chore });
  } catch (err) { next(err); }
});

// GET /life-services/chores/:childId â€?list chores
router.get('/chores/:childId', auth, async (req, res, next) => {
  try {
    const status = req.query.status;
    const params = [req.params.childId];
    const conditions = ['child_id = $1'];
    if (status) { conditions.push('status = $2'); params.push(status); }
    const chores = await db.manyOrNone(`SELECT * FROM chores WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
    const completion_rate = chores.length ? Math.round(chores.filter(c => c.status === 'completed').length / chores.length * 100) : 0;
    res.json({ success: true, data: chores, completion_rate });
  } catch (err) { next(err); }
});

// PUT /life-services/chores/:id â€?update chore
router.put('/chores/:id', auth, async (req, res, next) => {
  try {
    const { title, description, status, frequency, reward, difficulty, notes } = req.body;
    const chore = await db.one(
      `UPDATE chores SET title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), frequency = COALESCE($4, frequency),
        reward = COALESCE($5, reward), difficulty = COALESCE($6, difficulty),
        notes = COALESCE($7, notes), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, status, frequency, reward, difficulty, notes, req.params.id]
    );
    res.json({ success: true, data: chore });
  } catch (err) { next(err); }
});

// GET /life-services/mindfulness/:age â€?mindfulness exercises
router.get('/mindfulness/:age', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const duration = parseInt(req.query.duration) || 5;
    const category = req.query.category;
    const params = [age];
    const conditions = ['min_age <= $1 AND (max_age IS NULL OR max_age >= $1)'];
    if (category) { conditions.push('category = $2'); params.push(category); }
    const exercises = await db.manyOrNone(
      `SELECT * FROM mindfulness_exercises WHERE ${conditions.join(' AND ')} AND duration_minutes <= $${params.length + 1} ORDER BY RANDOM() LIMIT 5`,
      [...params, duration]
    );
    setCache(res, 3600);
    res.json({ success: true, data: exercises });
  } catch (err) { next(err); }
});

// GET /life-services/activities/:age/:skill â€?skill-building activities
router.get('/activities/:age/:skill', auth, async (req, res, next) => {
  try {
    const { age, skill } = req.params;
    const ageNum = parseInt(age);
    const limit = parseInt(req.query.limit) || 10;
    const activities = await db.manyOrNone(
      `SELECT * FROM skill_activities WHERE skill_area = $1 AND min_age <= $2 AND (max_age IS NULL OR max_age >= $2)
       ORDER BY difficulty ASC, rating DESC LIMIT $3`,
      [skill, ageNum, limit]
    );
    setCache(res, 3600);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

// GET /life-services/parent-tips/:topic â€?parenting tips
router.get('/parent-tips/:topic', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.query.age) || null;
    const params = [req.params.topic];
    const conditions = ['topic = $1'];
    if (age) { conditions.push('(min_age IS NULL OR min_age <= $2)'); conditions.push('(max_age IS NULL OR max_age >= $3)'); params.push(age, age); }
    const tips = await db.manyOrNone(`SELECT * FROM parent_tips WHERE ${conditions.join(' AND ')} ORDER BY priority DESC, created_at DESC`, params);
    setCache(res, 7200);
    res.json({ success: true, data: tips });
  } catch (err) { next(err); }
});

// GET /life-services/weather-activities â€?weather-based activity suggestions
router.get('/weather-activities', auth, async (req, res, next) => {
  try {
    const { temperature, condition, is_indoor } = req.query;
    const params = [];
    const conditions = [];
    if (is_indoor !== undefined) { conditions.push('is_indoor = $' + (params.length + 1)); params.push(is_indoor === 'true'); }
    if (condition) { conditions.push('$' + (params.length + 1) + ' = ANY(suitable_weather)'); params.push(condition); }
    if (temperature) { conditions.push('(min_temp IS NULL OR min_temp <= $' + (params.length + 1) + ')'); params.push(parseFloat(temperature)); conditions.push('(max_temp IS NULL OR max_temp >= $' + (params.length + 1) + ')'); params.push(parseFloat(temperature)); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const activities = await db.manyOrNone(`SELECT * FROM weather_activities ${where} ORDER BY rating DESC LIMIT 20`, params);
    setCache(res, 1800);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

// GET /life-services/holiday-activities/:country/:holiday
router.get('/holiday-activities/:country/:holiday', auth, async (req, res, next) => {
  try {
    const { country, holiday } = req.params;
    const activities = await db.manyOrNone(
      `SELECT * FROM holiday_activities WHERE (country = $1 OR country IS NULL) AND holiday = $2 ORDER BY age_min ASC, rating DESC`,
      [country, holiday]
    );
    setCache(res, 86400);
    res.json({ success: true, data: activities, country, holiday });
  } catch (err) { next(err); }
});

// POST /life-services/emergency-contacts/:childId â€?add emergency contact
router.post('/emergency-contacts/:childId', auth, async (req, res, next) => {
  try {
    const { name, relationship, phone, email, is_primary, notes } = req.body;
    if (!name || !phone) throw new AppError(400, 'name and phone required');
    if (is_primary) {
      await db.none('UPDATE emergency_contacts SET is_primary = false WHERE child_id = $1', [req.params.childId]);
    }
    const contact = await db.one(
      `INSERT INTO emergency_contacts (child_id, name, relationship, phone, email, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.childId, name, relationship || null, phone, email || null, is_primary || false, notes || null]
    );
    res.status(201).json({ success: true, data: contact });
  } catch (err) { next(err); }
});

// GET /life-services/emergency-contacts/:childId â€?list emergency contacts
router.get('/emergency-contacts/:childId', auth, async (req, res, next) => {
  try {
    const contacts = await db.manyOrNone(
      'SELECT * FROM emergency_contacts WHERE child_id = $1 ORDER BY is_primary DESC, created_at',
      [req.params.childId]
    );
    res.json({ success: true, data: contacts });
  } catch (err) { next(err); }
});

// GET /life-services/pet-care/:petType â€?pet care tips
router.get('/pet-care/:petType', auth, async (req, res, next) => {
  try {
    const tips = await db.manyOrNone(
      'SELECT * FROM pet_care_tips WHERE pet_type = $1 ORDER BY category, priority',
      [req.params.petType]
    );
    setCache(res, 86400);
    res.json({ success: true, data: tips });
  } catch (err) { next(err); }
});

// GET /life-services/family-activities/:age â€?family bonding activities
router.get('/family-activities/:age', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const limit = parseInt(req.query.limit) || 10;
    const duration = parseInt(req.query.duration) || null;
    const params = [age, limit];
    let durationClause = '';
    if (duration) { durationClause = 'AND estimated_minutes <= $3'; params.push(duration); }
    const activities = await db.manyOrNone(
      `SELECT * FROM family_activities WHERE min_age <= $1 AND (max_age IS NULL OR max_age >= $1) ${durationClause} ORDER BY rating DESC LIMIT $2`,
      params
    );
    setCache(res, 3600);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

// GET /life-services/screen-alternatives/:age â€?offline activity suggestions
router.get('/screen-alternatives/:age', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const params = [age, limit];
    let catClause = '';
    if (category) { catClause = 'AND category = $3'; params.push(category); }
    const activities = await db.manyOrNone(
      `SELECT * FROM screen_alternatives WHERE min_age <= $1 AND (max_age IS NULL OR max_age >= $1) ${catClause} ORDER BY RANDOM() LIMIT $2`,
      params
    );
    setCache(res, 3600);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

// GET /life-services/social-stories/:topic â€?social skills stories
router.get('/social-stories/:topic', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.query.age) || null;
    const params = [req.params.topic];
    const conditions = ['topic = $1'];
    if (age) { conditions.push('(min_age IS NULL OR min_age <= $2)'); conditions.push('(max_age IS NULL OR max_age >= $3)'); params.push(age, age); }
    const stories = await db.manyOrNone(`SELECT * FROM social_stories WHERE ${conditions.join(' AND ')} ORDER BY sort_order, title`, params);
    setCache(res, 7200);
    res.json({ success: true, data: stories });
  } catch (err) { next(err); }
});

// GET /life-services/sensory-play/:age â€?sensory play ideas
router.get('/sensory-play/:age', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const limit = parseInt(req.query.limit) || 8;
    const difficulty = req.query.difficulty;
    const params = [age, limit];
    let diffClause = '';
    if (difficulty) { diffClause = 'AND difficulty = $3'; params.push(difficulty); }
    const ideas = await db.manyOrNone(
      `SELECT * FROM sensory_play_ideas WHERE min_age <= $1 AND (max_age IS NULL OR max_age >= $1) ${diffClause} ORDER BY RANDOM() LIMIT $2`,
      params
    );
    setCache(res, 3600);
    res.json({ success: true, data: ideas });
  } catch (err) { next(err); }
});

// GET /life-services/travel-activities/:age/:duration â€?travel activities
router.get('/travel-activities/:age/:duration', auth, async (req, res, next) => {
  try {
    const age = parseInt(req.params.age);
    const duration = req.params.duration;
    const mode = req.query.transport_mode;
    const params = [age];
    const conditions = ['min_age <= $1 AND (max_age IS NULL OR max_age >= $1)'];
    const durationMap = { short: 30, medium: 60, long: 120 };
    const maxMinutes = durationMap[duration] || 60;
    conditions.push('estimated_minutes <= $2'); params.push(maxMinutes);
    if (mode) { conditions.push('suitable_for_mode @> ARRAY[$3]::text[]'); params.push(mode); }
    const activities = await db.manyOrNone(
      `SELECT * FROM travel_activities WHERE ${conditions.join(' AND ')} ORDER BY RANDOM() LIMIT 10`,
      params
    );
    setCache(res, 3600);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

module.exports = router;
