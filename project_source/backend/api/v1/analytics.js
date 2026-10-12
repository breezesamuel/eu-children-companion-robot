const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const { authenticateToken: auth } = require('../../../middleware/auth');
const cache = require('../../../middleware/cache');
const { AppError } = require('../../../utils/errors');
const { validateDateRange } = require('../../../utils/validation');

const parseDateRange = (query) => {
  const now = new Date();
  const end = query.end ? new Date(query.end) : now;
  const start = query.start
    ? new Date(query.start)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (end.getTime() - start.getTime()));
  return { start, end, prevStart, prevEnd };
};

const setCache = (res, ttl = 300) => {
  res.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl * 2}`);
};

// GET /analytics/dashboard â€?aggregated dashboard with comparison
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const { start, end, prevStart, prevEnd } = parseDateRange(req.query);
    const [current, previous] = await Promise.all([
      db.oneOrNone(`
        SELECT
          (SELECT COUNT(*) FROM children WHERE created_at BETWEEN $1 AND $2) AS new_children,
          (SELECT COUNT(*) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS total_sessions,
          (SELECT ROUND(AVG(duration_minutes), 1) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS avg_session_duration,
          (SELECT COUNT(DISTINCT child_id) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS active_children,
          (SELECT COUNT(*) FROM learning_activities WHERE completed_at BETWEEN $1 AND $2) AS completed_activities,
          (SELECT COUNT(*) FROM errors WHERE logged_at BETWEEN $1 AND $2) AS error_count
      `, [start, end]),
      db.oneOrNone(`
        SELECT
          (SELECT COUNT(*) FROM children WHERE created_at BETWEEN $1 AND $2) AS new_children,
          (SELECT COUNT(*) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS total_sessions,
          (SELECT ROUND(AVG(duration_minutes), 1) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS avg_session_duration,
          (SELECT COUNT(DISTINCT child_id) FROM sessions WHERE started_at BETWEEN $1 AND $2) AS active_children,
          (SELECT COUNT(*) FROM learning_activities WHERE completed_at BETWEEN $1 AND $2) AS completed_activities,
          (SELECT COUNT(*) FROM errors WHERE logged_at BETWEEN $1 AND $2) AS error_count
      `, [prevStart, prevEnd])
    ]);
    const calcChange = (c, p) => p ? Math.round(((c - p) / p) * 100) : null;
    setCache(res, 120);
    res.json({
      success: true,
      data: {
        period: { start, end },
        current,
        previous,
        changes: {
          new_children: calcChange(current.new_children, previous.new_children),
          total_sessions: calcChange(current.total_sessions, previous.total_sessions),
          avg_session_duration: calcChange(parseFloat(current.avg_session_duration), parseFloat(previous.avg_session_duration)),
          active_children: calcChange(current.active_children, previous.active_children),
          completed_activities: calcChange(current.completed_activities, previous.completed_activities),
          error_count: calcChange(current.error_count, previous.error_count),
        },
      },
    });
  } catch (err) { next(err); }
});

// GET /analytics/devices â€?device analytics
router.get('/devices', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const [models, firmware, errorRates, connectivity] = await Promise.all([
      db.manyOrNone(
        `SELECT device_model, COUNT(*) AS count, ROUND(AVG(session_quality), 2) AS avg_quality
         FROM device_sessions WHERE created_at BETWEEN $1 AND $2 GROUP BY device_model ORDER BY count DESC`,
        [start, end]
      ),
      db.manyOrNone(
        `SELECT firmware_version, COUNT(*) AS count, ROUND(AVG(error_rate), 3) AS avg_error_rate
         FROM device_firmware WHERE reported_at BETWEEN $1 AND $2 GROUP BY firmware_version ORDER BY count DESC`,
        [start, end]
      ),
      db.manyOrNone(
        `SELECT device_type, ROUND(AVG(error_rate)::numeric, 4) AS avg_error_rate,
                COUNT(*) AS total_requests, SUM(error_count) AS total_errors
         FROM device_errors WHERE logged_at BETWEEN $1 AND $2 GROUP BY device_type`,
        [start, end]
      ),
      db.manyOrNone(
        `SELECT connection_type, ROUND(AVG(latency_ms)) AS avg_latency,
                ROUND(AVG(packet_loss)::numeric, 3) AS avg_packet_loss,
                COUNT(*) AS samples
         FROM connectivity_logs WHERE logged_at BETWEEN $1 AND $2 GROUP BY connection_type`,
        [start, end]
      ),
    ]);
    setCache(res, 300);
    res.json({ success: true, data: { models, firmware, errorRates, connectivity } });
  } catch (err) { next(err); }
});

// GET /analytics/funnels â€?user behavior funnels
router.get('/funnels', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const funnel = await db.manyOrNone(`
      WITH stages AS (
        SELECT
          COUNT(DISTINCT CASE WHEN registered_at BETWEEN $1 AND $2 THEN user_id END) AS registered,
          COUNT(DISTINCT CASE WHEN onboarding_completed_at BETWEEN $1 AND $2 THEN user_id END) AS onboarded,
          COUNT(DISTINCT CASE WHEN first_session_at BETWEEN $1 AND $2 THEN user_id END) AS first_session,
          COUNT(DISTINCT CASE WHEN daily_active BETWEEN $1 AND $2 THEN user_id END) AS daily_use,
          COUNT(DISTINCT CASE WHEN weekly_active BETWEEN $1 AND $2 THEN user_id END) AS weekly_use,
          COUNT(DISTINCT CASE WHEN monthly_active BETWEEN $1 AND $2 THEN user_id END) AS monthly_use
        FROM user_funnel
      )
      SELECT * FROM stages
    `, [start, end]);
    setCache(res, 600);
    res.json({ success: true, data: funnel[0] || {} });
  } catch (err) { next(err); }
});

// GET /analytics/cohorts â€?cohort retention analysis
router.get('/cohorts', auth, async (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks) || 8;
    const cohorts = await db.manyOrNone(`
      SELECT
        DATE_TRUNC('week', registration_date) AS cohort_week,
        COUNT(*) AS cohort_size,
        ROUND(AVG(retention_day_1) * 100, 1) AS day_1_retention,
        ROUND(AVG(retention_day_7) * 100, 1) AS day_7_retention,
        ROUND(AVG(retention_day_30) * 100, 1) AS day_30_retention,
        ROUND(AVG(retention_day_90) * 100, 1) AS day_90_retention
      FROM cohort_data
      WHERE registration_date >= NOW() - INTERVAL '${weeks} weeks'
      GROUP BY cohort_week
      ORDER BY cohort_week DESC
    `);
    setCache(res, 3600);
    res.json({ success: true, data: cohorts });
  } catch (err) { next(err); }
});

// GET /analytics/export/:type â€?export data
router.get('/export/:type', auth, async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'json';
    const { start, end } = parseDateRange(req.query);
    const allowedTypes = ['dashboard', 'trends', 'subjects', 'usage'];
    if (!allowedTypes.includes(type)) {
      throw new AppError(400, `Invalid export type. Allowed: ${allowedTypes.join(', ')}`);
    }
    let data;
    switch (type) {
      case 'dashboard':
        data = await db.manyOrNone(`SELECT * FROM dashboard_snapshots WHERE snapshot_date BETWEEN $1 AND $2 ORDER BY snapshot_date`, [start, end]);
        break;
      case 'trends':
        data = await db.manyOrNone(`SELECT * FROM trend_metrics WHERE metric_date BETWEEN $1 AND $2 ORDER BY metric_date`, [start, end]);
        break;
      case 'subjects':
        data = await db.manyOrNone(`SELECT * FROM subject_performance WHERE recorded_at BETWEEN $1 AND $2 ORDER BY recorded_at`, [start, end]);
        break;
      case 'usage':
        data = await db.manyOrNone(`SELECT * FROM usage_logs WHERE logged_at BETWEEN $1 AND $2 ORDER BY logged_at`, [start, end]);
        break;
    }
    if (format === 'csv') {
      if (!data || data.length === 0) return res.json({ success: true, data: [] });
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(r => Object.values(r).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv"`);
      return res.send([headers, ...rows].join('\n'));
    }
    res.json({ success: true, count: data?.length || 0, data });
  } catch (err) { next(err); }
});

// GET /analytics/learning-paths â€?learning path analysis
router.get('/learning-paths', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const paths = await db.manyOrNone(`
      SELECT
        lp.path_name,
        COUNT(DISTINCT lp.child_id) AS enrolled_count,
        ROUND(AVG(lp.completion_percentage), 1) AS avg_completion,
        lp.steps,
        lp.common_drop_off_step,
        COUNT(DISTINCT CASE WHEN lp.completed THEN lp.child_id END) AS completed_count,
        ROUND(AVG(lp.time_to_complete_days)) AS avg_days_to_complete
      FROM learning_paths lp
      WHERE lp.started_at BETWEEN $1 AND $2
      GROUP BY lp.path_name, lp.steps, lp.common_drop_off_step
      ORDER BY enrolled_count DESC
    `, [start, end]);
    setCache(res, 600);
    res.json({ success: true, data: paths });
  } catch (err) { next(err); }
});

// GET /analytics/peak-usage â€?peak usage time analysis
router.get('/peak-usage', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const hourly = await db.manyOrNone(`
      SELECT
        EXTRACT(HOUR FROM started_at) AS hour,
        COUNT(*) AS session_count,
        ROUND(AVG(duration_minutes), 1) AS avg_duration,
        COUNT(DISTINCT child_id) AS unique_children
      FROM sessions
      WHERE started_at BETWEEN $1 AND $2
        AND started_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY hour
    `, [start, end]);
    const peak = hourly.reduce((max, h) => (h.session_count > (max?.session_count || 0) ? h : max), null);
    const recommendations = [];
    if (peak) {
      const peakHour = parseInt(peak.hour);
      if (peakHour >= 6 && peakHour <= 9) recommendations.push('Morning peak detected. Schedule learning content before school.');
      if (peakHour >= 15 && peakHour <= 18) recommendations.push('Afternoon peak. Ideal for interactive activities after school.');
      if (peakHour >= 19 && peakHour <= 22) recommendations.push('Evening peak. Recommend calming activities before bedtime.');
    }
    res.json({ success: true, data: { hourly, peak, recommendations } });
  } catch (err) { next(err); }
});

// GET /analytics/anomalies â€?anomaly detection
router.get('/anomalies', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const threshold = parseFloat(req.query.threshold) || 2.0;
    const anomalies = await db.manyOrNone(`
      WITH stats AS (
        SELECT
          AVG(activity_count) AS avg_activity,
          STDDEV(activity_count) AS std_activity,
          AVG(error_rate) AS avg_error,
          STDDEV(error_rate) AS std_error
        FROM daily_metrics
        WHERE metric_date BETWEEN $1 AND $2
      )
      SELECT dm.*,
        CASE
          WHEN dm.activity_count < (SELECT avg_activity - $3::numeric * std_activity FROM stats) THEN 'low_activity'
          WHEN dm.activity_count > (SELECT avg_activity + $3::numeric * std_activity FROM stats) THEN 'high_activity'
          WHEN dm.error_rate > (SELECT avg_error + $3::numeric * std_error FROM stats) THEN 'high_errors'
          ELSE NULL
        END AS anomaly_type
      FROM daily_metrics dm
      WHERE dm.metric_date BETWEEN $1 AND $2
      HAVING anomaly_type IS NOT NULL
      ORDER BY dm.metric_date DESC
    `, [start, end, threshold]);
    res.json({ success: true, count: anomalies?.length || 0, data: anomalies || [] });
  } catch (err) { next(err); }
});

// GET /analytics/trends â€?trends over time
router.get('/trends', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const granularity = req.query.granularity || 'day';
    const interval = granularity === 'hour' ? 'hour' : granularity === 'week' ? 'week' : 'day';
    const trends = await db.manyOrNone(`
      SELECT
        DATE_TRUNC($1::text, metric_date) AS period,
        SUM(active_users) AS active_users,
        SUM(new_users) AS new_users,
        SUM(sessions) AS sessions,
        ROUND(AVG(avg_session_duration_minutes), 1) AS avg_duration,
        SUM(content_consumed) AS content_consumed,
        SUM(errors) AS errors
      FROM rollup_metrics
      WHERE metric_date BETWEEN $2 AND $3
      GROUP BY period
      ORDER BY period
    `, [interval, start, end]);
    setCache(res, 600);
    res.json({ success: true, data: trends });
  } catch (err) { next(err); }
});

// GET /analytics/subject-performance â€?subject performance breakdown
router.get('/subject-performance', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const childId = req.query.child_id;
    const params = [start, end];
    let childFilter = '';
    if (childId) { params.push(childId); childFilter = 'AND child_id = $3'; }
    const data = await db.manyOrNone(`
      SELECT
        subject,
        COUNT(*) AS total_activities,
        ROUND(AVG(score)::numeric, 1) AS avg_score,
        ROUND(AVG(accuracy)::numeric, 1) AS avg_accuracy,
        SUM(time_spent_minutes) AS total_time_spent,
        COUNT(DISTINCT child_id) AS unique_children
      FROM subject_performance
      WHERE recorded_at BETWEEN $1 AND $2 ${childFilter}
      GROUP BY subject
      ORDER BY avg_score DESC
    `, params);
    setCache(res, 600);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /analytics/retention â€?retention analysis
router.get('/retention', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const retention = await db.manyOrNone(`
      SELECT
        DATE_TRUNC('week', first_active_date) AS cohort,
        COUNT(*) AS users,
        ROUND(AVG(day_1_retained) * 100, 1) AS day_1,
        ROUND(AVG(day_3_retained) * 100, 1) AS day_3,
        ROUND(AVG(day_7_retained) * 100, 1) AS day_7,
        ROUND(AVG(day_14_retained) * 100, 1) AS day_14,
        ROUND(AVG(day_30_retained) * 100, 1) AS day_30
      FROM retention_data
      WHERE first_active_date BETWEEN $1 AND $2
      GROUP BY cohort
      ORDER BY cohort DESC
    `, [start, end]);
    setCache(res, 1800);
    res.json({ success: true, data: retention });
  } catch (err) { next(err); }
});

// GET /analytics/geography â€?geographic distribution
router.get('/geography', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const geo = await db.manyOrNone(`
      SELECT
        COALESCE(region, 'Unknown') AS region,
        COALESCE(country, 'Unknown') AS country,
        COUNT(DISTINCT user_id) AS users,
        COUNT(*) AS sessions,
        ROUND(AVG(duration_minutes), 1) AS avg_duration
      FROM geo_analytics
      WHERE session_date BETWEEN $1 AND $2
      GROUP BY region, country
      ORDER BY users DESC
    `, [start, end]);
    setCache(res, 3600);
    res.json({ success: true, data: geo });
  } catch (err) { next(err); }
});

// GET /analytics/real-time â€?real-time activity snapshot
router.get('/real-time', auth, async (req, res, next) => {
  try {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const realtime = await db.oneOrNone(`
      SELECT
        COUNT(DISTINCT child_id) AS active_children,
        COUNT(DISTINCT session_id) AS active_sessions,
        COUNT(*) FILTER (WHERE activity_type = 'learning') AS learning_activities,
        COUNT(*) FILTER (WHERE activity_type = 'entertainment') AS entertainment_activities,
        COUNT(*) FILTER (WHERE activity_type = 'health') AS health_activities
      FROM realtime_activity
      WHERE last_heartbeat >= $1
    `, [fiveMinAgo]);
    res.json({
      success: true,
      data: realtime || { active_children: 0, active_sessions: 0, learning_activities: 0, entertainment_activities: 0, health_activities: 0 },
      timestamp: now,
    });
  } catch (err) { next(err); }
});

// GET /analytics/engagement â€?engagement scores
router.get('/engagement', auth, async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const limit = parseInt(req.query.limit) || 20;
    const engagement = await db.manyOrNone(`
      SELECT
        child_id,
        child_name,
        ROUND(AVG(daily_engagement_score)::numeric, 1) AS avg_engagement,
        ROUND(AVG(daily_time_spent_minutes)::numeric, 1) AS avg_time_spent,
        COUNT(DISTINCT DATE(activity_date)) AS active_days,
        MAX(engagement_tier) AS highest_tier
      FROM engagement_scores
      WHERE activity_date BETWEEN $1 AND $2
      GROUP BY child_id, child_name
      ORDER BY avg_engagement DESC
      LIMIT $3
    `, [start, end, limit]);
    setCache(res, 600);
    res.json({ success: true, data: engagement });
  } catch (err) { next(err); }
});

module.exports = router;
