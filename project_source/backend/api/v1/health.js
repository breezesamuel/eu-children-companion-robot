const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const { AppError } = require('../../../utils/errors');
const notificationService = require('../../../services/notification');
const whoPercentile = require('../../../services/who-percentile');

const PERIODS = { '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };

// POST /health/growth/:childId â€?record growth measurement
router.post('/growth/:childId', auth, async (req, res, next) => {
  try {
    const { height_cm, weight_kg, head_circumference_cm, notes } = req.body;
    if (height_cm === undefined && weight_kg === undefined && head_circumference_cm === undefined) {
      throw new AppError(400, 'At least one measurement required');
    }
    const child = await db.oneOrNone('SELECT birth_date, gender FROM children WHERE id = $1 AND parent_id = $2', [req.params.childId, req.user.id]);
    if (!child) throw new AppError(404, 'Child not found');
    const ageMonths = Math.floor((new Date() - new Date(child.birth_date)) / (30.44 * 86400000));
    const percentiles = {};
    if (height_cm) percentiles.height_percentile = whoPercentile.calculate('height', ageMonths, height_cm, child.gender);
    if (weight_kg) percentiles.weight_percentile = whoPercentile.calculate('weight', ageMonths, weight_kg, child.gender);
    if (head_circumference_cm) percentiles.head_percentile = whoPercentile.calculate('head', ageMonths, head_circumference_cm, child.gender);
    const record = await db.one(
      `INSERT INTO growth_records (child_id, height_cm, weight_kg, head_circumference_cm, height_percentile, weight_percentile, head_percentile, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.childId, height_cm || null, weight_kg || null, head_circumference_cm || null,
       percentiles.height_percentile || null, percentiles.weight_percentile || null, percentiles.head_percentile || null, notes || null]
    );
    res.status(201).json({ success: true, data: { ...record, age_months: ageMonths } });
  } catch (err) { next(err); }
});

// GET /health/growth/:childId â€?get growth records
router.get('/growth/:childId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const records = await db.manyOrNone(
      'SELECT * FROM growth_records WHERE child_id = $1 ORDER BY recorded_at DESC LIMIT $2',
      [req.params.childId, limit]
    );
    const child = await db.oneOrNone('SELECT birth_date, gender FROM children WHERE id = $1', [req.params.childId]);
    const ageAtRecords = records.map(r => ({
      ...r,
      age_months: Math.floor((new Date(r.recorded_at) - new Date(child?.birth_date)) / (30.44 * 86400000)),
    }));
    res.json({ success: true, data: ageAtRecords });
  } catch (err) { next(err); }
});

// GET /health/vaccinations/:childId â€?get vaccination records
router.get('/vaccinations/:childId', auth, async (req, res, next) => {
  try {
    const records = await db.manyOrNone(
      `SELECT v.*, vs.name AS vaccine_name, vs.dose_number, vs.recommended_age_months,
              vs.min_gap_days, vs.max_gap_days
       FROM vaccination_records v
       JOIN vaccine_schedule vs ON vs.id = v.vaccine_id
       WHERE v.child_id = $1
       ORDER BY v.administered_date DESC NULLS LAST, vs.recommended_age_months`,
      [req.params.childId]
    );
    const overdue = records.filter(r => !r.administered_date && r.recommended_age_months <= 24);
    res.json({ success: true, data: records, overdue_count: overdue.length });
  } catch (err) { next(err); }
});

// POST /health/vaccinations/:childId â€?log vaccination
router.post('/vaccinations/:childId', auth, async (req, res, next) => {
  try {
    const { vaccine_id, administered_date, batch_number, administered_by, location, notes, next_dose_date } = req.body;
    if (!vaccine_id) throw new AppError(400, 'vaccine_id is required');
    const record = await db.one(
      `INSERT INTO vaccination_records (child_id, vaccine_id, administered_date, batch_number, administered_by, location, notes, next_dose_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.childId, vaccine_id, administered_date || new Date(), batch_number || null,
       administered_by || null, location || null, notes || null, next_dose_date || null]
    );
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// PUT /health/vaccinations/:id â€?update vaccination record
router.put('/vaccinations/:id', auth, async (req, res, next) => {
  try {
    const { batch_number, administered_by, location, notes, next_dose_date } = req.body;
    const record = await db.one(
      `UPDATE vaccination_records SET
        batch_number = COALESCE($1, batch_number),
        administered_by = COALESCE($2, administered_by),
        location = COALESCE($3, location),
        notes = COALESCE($4, notes),
        next_dose_date = COALESCE($5, next_dose_date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [batch_number, administered_by, location, notes, next_dose_date, req.params.id]
    );
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// GET /health/allergies/:childId â€?get allergies
router.get('/allergies/:childId', auth, async (req, res, next) => {
  try {
    const allergies = await db.manyOrNone(
      'SELECT * FROM allergies WHERE child_id = $1 ORDER BY severity DESC, created_at',
      [req.params.childId]
    );
    res.json({ success: true, data: allergies });
  } catch (err) { next(err); }
});

// POST /health/allergies/:childId â€?add allergy
router.post('/allergies/:childId', auth, async (req, res, next) => {
  try {
    const { allergen, reaction, severity, notes } = req.body;
    if (!allergen) throw new AppError(400, 'allergen is required');
    const allergy = await db.one(
      `INSERT INTO allergies (child_id, allergen, reaction, severity, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.childId, allergen, reaction || null, severity || 'mild', notes || null]
    );
    res.status(201).json({ success: true, data: allergy });
  } catch (err) { next(err); }
});

// DELETE /health/allergies/:id â€?remove allergy
router.delete('/allergies/:id', auth, async (req, res, next) => {
  try {
    const result = await db.result('DELETE FROM allergies WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) throw new AppError(404, 'Allergy not found');
    res.json({ success: true, message: 'Allergy removed' });
  } catch (err) { next(err); }
});

// GET /health/appointments/:childId â€?get appointments
router.get('/appointments/:childId', auth, async (req, res, next) => {
  try {
    const status = req.query.status;
    const conditions = ['child_id = $1'];
    const params = [req.params.childId];
    if (status) { conditions.push('status = $2'); params.push(status); }
    const appointments = await db.manyOrNone(
      `SELECT * FROM appointments WHERE ${conditions.join(' AND ')} ORDER BY appointment_date DESC`,
      params
    );
    res.json({ success: true, data: appointments });
  } catch (err) { next(err); }
});

// POST /health/appointments/:childId â€?create appointment
router.post('/appointments/:childId', auth, async (req, res, next) => {
  try {
    const { doctor_name, specialty, appointment_date, location, notes, reminder_minutes_before } = req.body;
    if (!doctor_name || !appointment_date) throw new AppError(400, 'doctor_name and appointment_date are required');
    const appointment = await db.one(
      `INSERT INTO appointments (child_id, doctor_name, specialty, appointment_date, location, notes, reminder_minutes_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.childId, doctor_name, specialty || null, appointment_date, location || null, notes || null, reminder_minutes_before || 60]
    );
    if (reminder_minutes_before) {
      const reminderTime = new Date(new Date(appointment_date).getTime() - reminder_minutes_before * 60000);
      await notificationService.scheduleNotification({
        userId: req.user.id,
        type: 'appointment_reminder',
        title: `Appointment with ${doctor_name}`,
        scheduled_at: reminderTime,
        data: { appointment_id: appointment.id },
      });
    }
    res.status(201).json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

// PUT /health/appointments/:id â€?update appointment
router.put('/appointments/:id', auth, async (req, res, next) => {
  try {
    const { doctor_name, specialty, appointment_date, location, notes, status, reminder_minutes_before } = req.body;
    const appointment = await db.one(
      `UPDATE appointments SET
        doctor_name = COALESCE($1, doctor_name), specialty = COALESCE($2, specialty),
        appointment_date = COALESCE($3, appointment_date), location = COALESCE($4, location),
        notes = COALESCE($5, notes), status = COALESCE($6, status),
        reminder_minutes_before = COALESCE($7, reminder_minutes_before),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [doctor_name, specialty, appointment_date, location, notes, status, reminder_minutes_before, req.params.id]
    );
    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

// DELETE /health/appointments/:id â€?cancel appointment
router.delete('/appointments/:id', auth, async (req, res, next) => {
  try {
    const result = await db.result('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) throw new AppError(404, 'Appointment not found');
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) { next(err); }
});

// POST /health/medications/:childId â€?log medication
router.post('/medications/:childId', auth, async (req, res, next) => {
  try {
    const { medication_name, dosage, unit, frequency, route, administered_at, notes, prescribed_by } = req.body;
    if (!medication_name || !dosage) throw new AppError(400, 'medication_name and dosage are required');
    const record = await db.one(
      `INSERT INTO medications (child_id, medication_name, dosage, unit, frequency, route, administered_at, notes, prescribed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.params.childId, medication_name, dosage, unit || 'mg', frequency || null, route || 'oral', administered_at || new Date(), notes || null, prescribed_by || null]
    );
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// GET /health/medications/:childId â€?get medication history
router.get('/medications/:childId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const records = await db.manyOrNone(
      'SELECT * FROM medications WHERE child_id = $1 ORDER BY administered_at DESC LIMIT $2',
      [req.params.childId, limit]
    );
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// GET /health/metrics/:childId â€?aggregated health metrics
router.get('/metrics/:childId', auth, async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    const days = PERIODS[period] || 7;
    const since = new Date(Date.now() - days * 86400000);
    const metrics = await db.oneOrNone(`
      SELECT
        ROUND(AVG(weight_kg)::numeric, 2) AS avg_weight,
        ROUND(AVG(height_cm)::numeric, 1) AS avg_height,
        ROUND(AVG(bmi)::numeric, 1) AS avg_bmi,
        ROUND(AVG(sleep_hours)::numeric, 1) AS avg_sleep,
        ROUND(AVG(screen_time_minutes)::numeric, 1) AS avg_screen_time,
        ROUND(AVG(activity_minutes)::numeric, 1) AS avg_activity,
        ROUND(AVG(calorie_intake)::numeric, 1) AS avg_calories,
        ROUND(AVG(mood_score)::numeric, 1) AS avg_mood,
        MAX(weight_kg) AS max_weight, MIN(weight_kg) AS min_weight,
        MAX(height_cm) AS max_height, MIN(height_cm) AS min_height
      FROM health_metrics
      WHERE child_id = $1 AND recorded_at >= $2
    `, [req.params.childId, since]);
    res.json({ success: true, data: metrics, period });
  } catch (err) { next(err); }
});

// POST /health/screen-time/:childId â€?log screen time
router.post('/screen-time/:childId', auth, async (req, res, next) => {
  try {
    const { minutes, device_type, app_name, start_time, end_time } = req.body;
    if (minutes === undefined) throw new AppError(400, 'minutes is required');
    const record = await db.one(
      `INSERT INTO screen_time_logs (child_id, minutes, device_type, app_name, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.childId, minutes, device_type || null, app_name || null, start_time || null, end_time || null]
    );
    const dailyTotal = await db.oneOrNone(
      `SELECT SUM(minutes) AS total FROM screen_time_logs
       WHERE child_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [req.params.childId]
    );
    const totalMinutes = parseInt(dailyTotal?.total) || 0;
    const exceeded = totalMinutes > 120;
    if (exceeded) {
      await notificationService.sendPush({
        userId: req.user.id,
        title: 'Screen time limit exceeded',
        body: `Child has used ${totalMinutes} minutes of screen time today`,
      });
    }
    res.status(201).json({ success: true, data: record, daily_total_minutes: totalMinutes, limit_exceeded: exceeded });
  } catch (err) { next(err); }
});

// GET /health/screen-time/:childId â€?get screen time
router.get('/screen-time/:childId', auth, async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    const days = PERIODS[period] || 7;
    const since = new Date(Date.now() - days * 86400000);
    const records = await db.manyOrNone(
      'SELECT * FROM screen_time_logs WHERE child_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
      [req.params.childId, since]
    );
    const daily = {};
    records.forEach(r => {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      daily[d] = (daily[d] || 0) + r.minutes;
    });
    const dailyBreakdown = Object.entries(daily).map(([date, minutes]) => ({ date, minutes }));
    res.json({ success: true, data: { records, daily_breakdown: dailyBreakdown } });
  } catch (err) { next(err); }
});

// POST /health/activity/:childId â€?log physical activity
router.post('/activity/:childId', auth, async (req, res, next) => {
  try {
    const { activity_type, duration_minutes, intensity, calories_burned, notes } = req.body;
    if (!activity_type || !duration_minutes) throw new AppError(400, 'activity_type and duration_minutes are required');
    const record = await db.one(
      `INSERT INTO physical_activities (child_id, activity_type, duration_minutes, intensity, calories_burned, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.childId, activity_type, duration_minutes, intensity || 'moderate', calories_burned || null, notes || null]
    );
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// GET /health/activity/:childId â€?get activity log
router.get('/activity/:childId', auth, async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    const days = PERIODS[period] || 7;
    const since = new Date(Date.now() - days * 86400000);
    const records = await db.manyOrNone(
      'SELECT * FROM physical_activities WHERE child_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
      [req.params.childId, since]
    );
    const totalMinutes = records.reduce((s, r) => s + r.duration_minutes, 0);
    res.json({ success: true, data: records, total_minutes: totalMinutes, period });
  } catch (err) { next(err); }
});

// POST /health/symptoms/:childId â€?log symptom
router.post('/symptoms/:childId', auth, async (req, res, next) => {
  try {
    const { symptom, severity, onset_date, duration_hours, notes, temperature_celsius } = req.body;
    if (!symptom || !severity) throw new AppError(400, 'symptom and severity are required');
    const record = await db.one(
      `INSERT INTO symptom_logs (child_id, symptom, severity, onset_date, duration_hours, notes, temperature_celsius)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.childId, symptom, severity, onset_date || new Date(), duration_hours || null, notes || null, temperature_celsius || null]
    );
    if (parseFloat(severity) >= 4 || (temperature_celsius && parseFloat(temperature_celsius) > 39)) {
      await notificationService.sendPush({
        userId: req.user.id,
        title: 'High severity symptom reported',
        body: `${symptom} with severity ${severity}${temperature_celsius ? ` and fever ${temperature_celsius}Â°C` : ''}`,
        data: { child_id: req.params.childId, symptom_id: record.id },
      });
    }
    res.status(201).json({ success: true, data: record, alert_sent: parseFloat(severity) >= 4 });
  } catch (err) { next(err); }
});

// GET /health/report/:childId â€?health report
router.get('/report/:childId', auth, async (req, res, next) => {
  try {
    const format = req.query.format || 'summary';
    const period = req.query.period || '30d';
    const days = PERIODS[period] || 30;
    const since = new Date(Date.now() - days * 86400000);
    const [growth, vaccinations, appointments, symptoms, medications, activity, screenTime] = await Promise.all([
      db.manyOrNone('SELECT * FROM growth_records WHERE child_id = $1 AND recorded_at >= $2 ORDER BY recorded_at', [req.params.childId, since]),
      db.manyOrNone('SELECT vr.*, vs.name AS vaccine_name FROM vaccination_records vr JOIN vaccine_schedule vs ON vs.id = vr.vaccine_id WHERE vr.child_id = $1 AND vr.created_at >= $2', [req.params.childId, since]),
      db.manyOrNone('SELECT * FROM appointments WHERE child_id = $1 AND appointment_date >= $2 ORDER BY appointment_date', [req.params.childId, since]),
      db.manyOrNone('SELECT * FROM symptom_logs WHERE child_id = $1 AND created_at >= $2 ORDER BY created_at DESC', [req.params.childId, since]),
      db.manyOrNone('SELECT * FROM medications WHERE child_id = $1 AND administered_at >= $2 ORDER BY administered_at DESC', [req.params.childId, since]),
      db.manyOrNone('SELECT * FROM physical_activities WHERE child_id = $1 AND created_at >= $2 ORDER BY created_at', [req.params.childId, since]),
      db.manyOrNone('SELECT * FROM screen_time_logs WHERE child_id = $1 AND created_at >= $2 ORDER BY created_at', [req.params.childId, since]),
    ]);
    const avgScreenTime = screenTime.length ? Math.round(screenTime.reduce((s, r) => s + r.minutes, 0) / screenTime.length) : 0;
    const totalActivity = activity.reduce((s, r) => s + r.duration_minutes, 0);
    const report = {
      period, generated_at: new Date(),
      summary: {
        total_growth_records: growth.length,
        vaccinations_administered: vaccinations.filter(v => v.administered_date).length,
        appointments: appointments.length,
        symptoms_logged: symptoms.length,
        medications_taken: medications.length,
        avg_screen_time_minutes: avgScreenTime,
        total_activity_minutes: totalActivity,
      },
      growth: format === 'detailed' ? growth : undefined,
      vaccinations: format === 'detailed' ? vaccinations : undefined,
      appointments: format === 'detailed' ? appointments : undefined,
      symptoms: symptoms,
      medications: medications,
      activity_summary: { total_minutes: totalActivity, sessions: activity.length },
      screen_time_summary: { avg_daily_minutes: avgScreenTime, total_days: screenTime.length },
    };
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// GET /health/health-score/:childId â€?composite wellness score
router.get('/health-score/:childId', auth, async (req, res, next) => {
  try {
    const period = req.query.period || '30d';
    const days = PERIODS[period] || 30;
    const since = new Date(Date.now() - days * 86400000);
    const [metrics, activity, sleep, screenTime] = await Promise.all([
      db.oneOrNone('SELECT ROUND(AVG(mood_score)::numeric, 1) AS avg_mood FROM health_metrics WHERE child_id = $1 AND recorded_at >= $2', [req.params.childId, since]),
      db.oneOrNone('SELECT COALESCE(SUM(duration_minutes), 0) AS total_activity FROM physical_activities WHERE child_id = $1 AND intensity = $2 AND created_at >= $3', [req.params.childId, 'vigorous', since]),
      db.oneOrNone('SELECT ROUND(AVG(sleep_hours)::numeric, 1) AS avg_sleep FROM health_metrics WHERE child_id = $1 AND recorded_at >= $2', [req.params.childId, since]),
      db.oneOrNone('SELECT COALESCE(AVG(minutes), 0) AS avg_screen FROM screen_time_logs WHERE child_id = $1 AND created_at >= $2', [req.params.childId, since]),
    ]);
    const moodScore = Math.min(100, ((parseFloat(metrics?.avg_mood) || 5) / 10) * 100);
    const activityScore = Math.min(100, ((activity?.total_activity || 0) / (days * 30)) * 100);
    const sleepScore = Math.min(100, ((parseFloat(sleep?.avg_sleep) || 8) / 10) * 100);
    const screenScore = Math.max(0, 100 - ((parseFloat(screenTime?.avg_screen) || 0) / 120) * 100);
    const overall = Math.round((moodScore * 0.3 + activityScore * 0.25 + sleepScore * 0.25 + screenScore * 0.2));
    res.json({ success: true, data: { overall, components: { mood: Math.round(moodScore), activity: Math.round(activityScore), sleep: Math.round(sleepScore), screen_time: Math.round(screenScore) }, period } });
  } catch (err) { next(err); }
});

// GET /health/immunization-schedule/:country â€?immunization schedule
router.get('/immunization-schedule/:country', auth, async (req, res, next) => {
  try {
    const schedule = await db.manyOrNone(
      'SELECT * FROM vaccine_schedule WHERE country = $1 OR country IS NULL ORDER BY recommended_age_months',
      [req.params.country]
    );
    setCache(res, 86400);
    res.json({ success: true, data: schedule, country: req.params.country });
  } catch (err) { next(err); }
});

// GET /health/export/:childId â€?export health data
router.get('/export/:childId', auth, async (req, res, next) => {
  try {
    const [growth, vaccinations, allergies, appointments, medications, symptoms, activity] = await Promise.all([
      db.manyOrNone('SELECT * FROM growth_records WHERE child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT vr.*, vs.name AS vaccine_name FROM vaccination_records vr JOIN vaccine_schedule vs ON vs.id = vr.vaccine_id WHERE vr.child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT * FROM allergies WHERE child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT * FROM appointments WHERE child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT * FROM medications WHERE child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT * FROM symptom_logs WHERE child_id = $1', [req.params.childId]),
      db.manyOrNone('SELECT * FROM physical_activities WHERE child_id = $1', [req.params.childId]),
    ]);
    const exportData = { exported_at: new Date().toISOString(), child_id: req.params.childId, growth, vaccinations, allergies, appointments, medications, symptoms, activity };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="health-${req.params.childId}-export.json"`);
    res.json(exportData);
  } catch (err) { next(err); }
});

// GET /health/alerts/:childId â€?active health alerts
router.get('/alerts/:childId', auth, async (req, res, next) => {
  try {
    const alerts = [];
    const overdueVaccines = await db.manyOrNone(
      `SELECT vs.name FROM vaccination_records vr
       JOIN vaccine_schedule vs ON vs.id = vr.vaccine_id
       WHERE vr.child_id = $1 AND vr.administered_date IS NULL AND vs.recommended_age_months <= $2`,
      [req.params.childId, 24]
    );
    overdueVaccines.forEach(v => alerts.push({ type: 'vaccination', severity: 'high', message: `Overdue: ${v.name} vaccine` }));
    const abnormalMetrics = await db.manyOrNone(
      `SELECT * FROM health_metrics WHERE child_id = $1
       AND (temperature_celsius > 38 OR temperature_celsius IS NOT NULL AND temperature_celsius < 35.5)
       AND recorded_at >= NOW() - INTERVAL '7 days'`,
      [req.params.childId]
    );
    abnormalMetrics.forEach(m => alerts.push({ type: 'abnormal_metric', severity: 'medium', message: `Abnormal temperature: ${m.temperature_celsius}Â°C`, metric_id: m.id }));
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const upcomingAppointments = await db.manyOrNone(
      'SELECT * FROM appointments WHERE child_id = $1 AND DATE(appointment_date) = $2 AND status = $3',
      [req.params.childId, tomorrow, 'scheduled']
    );
    upcomingAppointments.forEach(a => alerts.push({ type: 'appointment', severity: 'info', message: `Upcoming: ${a.doctor_name} on ${a.appointment_date}`, appointment_id: a.id }));
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) { next(err); }
});

module.exports = router;
