const express = require('express');
const router = express.Router();
const healthMonitor = require('../services/health-monitor');

const healthHistory = [];
const incidentLog = [];
const healthThresholds = new Map();
const healthChecks = new Map();
const notificationSubscribers = new Map();
let healthCheckInterval = null;

router.get('/', (req, res) => {
  res.json({ success: true, data: healthMonitor.getSummary() });
});

router.get('/latest', (req, res) => {
  const latest = healthMonitor.getLatest();
  if (!latest) return res.status(404).json({ success: false, error: 'No samples yet' });
  res.json({ success: true, data: latest });
});

router.get('/history', (req, res) => {
  const minutes = parseInt(req.query.minutes) || 5;
  res.json({ success: true, data: healthMonitor.getHistory(minutes) });
});

router.get('/checks', (req, res) => {
  res.json({ success: true, data: Array.from(healthChecks.values()) });
});

router.post('/diagnostic', async (req, res) => {
  const result = await healthMonitor.runDiagnostic();
  res.json({ success: true, data: result });
});

router.post('/checks', (req, res) => {
  const { name, type, endpoint, interval } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const checkId = 'chk-' + Date.now();
  healthChecks.set(checkId, { id: checkId, name, type: type || 'http', endpoint: endpoint || '', interval: parseInt(interval) || 30000, status: 'pending', lastRun: null, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: healthChecks.get(checkId) });
});

router.get('/checks/:id', (req, res) => {
  const check = healthChecks.get(req.params.id);
  if (!check) return res.status(404).json({ success: false, error: 'Check not found' });
  res.json({ success: true, data: check });
});

router.put('/checks/:id', (req, res) => {
  const check = healthChecks.get(req.params.id);
  if (!check) return res.status(404).json({ success: false, error: 'Check not found' });
  Object.assign(check, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: check });
});

router.delete('/checks/:id', (req, res) => {
  if (!healthChecks.has(req.params.id)) return res.status(404).json({ success: false, error: 'Check not found' });
  healthChecks.delete(req.params.id);
  res.json({ success: true });
});

router.post('/checks/:id/run', async (req, res) => {
  const check = healthChecks.get(req.params.id);
  if (!check) return res.status(404).json({ success: false, error: 'Check not found' });
  try {
    const result = { id: check.id, name: check.name, status: 'healthy', timestamp: new Date().toISOString() };
    check.status = result.status;
    check.lastRun = result.timestamp;
    healthHistory.push(result);
    if (healthHistory.length > 10000) healthHistory.splice(0, 1000);
    res.json({ success: true, data: result });
  } catch (err) {
    const result = { id: check.id, name: check.name, status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() };
    check.status = result.status;
    check.lastRun = result.timestamp;
    healthHistory.push(result);
    res.status(500).json({ success: false, data: result });
  }
});

router.get('/history/all', (req, res) => {
  const { status, checkId, limit, from, to } = req.query;
  let items = [...healthHistory];
  if (status) items = items.filter(h => h.status === status);
  if (checkId) items = items.filter(h => h.id === checkId);
  if (from) items = items.filter(h => new Date(h.timestamp) >= new Date(from));
  if (to) items = items.filter(h => new Date(h.timestamp) <= new Date(to));
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: items.slice(0, parseInt(limit) || 100) });
});

router.post('/thresholds', (req, res) => {
  const { name, metric, warning, critical } = req.body;
  if (!name || !metric) return res.status(400).json({ success: false, error: 'name and metric required' });
  healthThresholds.set(name, { name, metric, warning: parseFloat(warning) || 80, critical: parseFloat(critical) || 95 });
  res.status(201).json({ success: true, data: healthThresholds.get(name) });
});

router.get('/thresholds', (req, res) => {
  res.json({ success: true, data: Array.from(healthThresholds.values()) });
});

router.put('/thresholds/:name', (req, res) => {
  const threshold = healthThresholds.get(req.params.name);
  if (!threshold) return res.status(404).json({ success: false, error: 'Threshold not found' });
  Object.assign(threshold, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: threshold });
});

router.delete('/thresholds/:name', (req, res) => {
  if (!healthThresholds.has(req.params.name)) return res.status(404).json({ success: false, error: 'Threshold not found' });
  healthThresholds.delete(req.params.name);
  res.json({ success: true });
});

router.post('/schedule', (req, res) => {
  const { intervalMs, checks } = req.body;
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  const interval = parseInt(intervalMs) || 30000;
  healthCheckInterval = setInterval(async () => {
    const checkNames = checks || Array.from(healthChecks.keys());
    for (const checkId of checkNames) {
      const check = healthChecks.get(checkId);
      if (!check) continue;
      try {
        const result = { id: check.id, name: check.name, status: 'healthy', timestamp: new Date().toISOString() };
        check.status = result.status;
        check.lastRun = result.timestamp;
        healthHistory.push(result);
      } catch (e) {
        const result = { id: check.id, name: check.name, status: 'unhealthy', error: e.message, timestamp: new Date().toISOString() };
        check.status = result.status;
        check.lastRun = result.timestamp;
        healthHistory.push(result);
      }
    }
  }, interval);
  res.json({ success: true, data: { interval, checks: checks || 'all' } });
});

router.delete('/schedule', (req, res) => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  res.json({ success: true });
});

router.post('/incidents', (req, res) => {
  const { component, severity, message, details } = req.body;
  if (!component || !message) return res.status(400).json({ success: false, error: 'component and message required' });
  incidentLog.push({ id: 'inc-' + Date.now(), component, severity: severity || 'warning', message, details: details || {}, timestamp: new Date().toISOString(), resolved: false });
  res.status(201).json({ success: true, data: incidentLog[incidentLog.length - 1] });
});

router.get('/incidents', (req, res) => {
  const { severity, component, resolved, limit } = req.query;
  let items = [...incidentLog];
  if (severity) items = items.filter(i => i.severity === severity);
  if (component) items = items.filter(i => i.component === component);
  if (resolved !== undefined) items = items.filter(i => i.resolved === (resolved === 'true'));
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: items.slice(0, parseInt(limit) || 50) });
});

router.put('/incidents/:id/resolve', (req, res) => {
  const incident = incidentLog.find(i => i.id === req.params.id);
  if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
  incident.resolved = true;
  incident.resolvedAt = new Date().toISOString();
  res.json({ success: true, data: incident });
});

router.get('/uptime', (req, res) => {
  const { period } = req.query;
  const hours = parseInt(period) || 24;
  const cutoff = Date.now() - hours * 3600000;
  const relevant = healthHistory.filter(h => new Date(h.timestamp).getTime() > cutoff);
  const healthy = relevant.filter(h => h.status === 'healthy').length;
  const uptime = relevant.length > 0 ? (healthy / relevant.length) * 100 : 100;
  res.json({ success: true, data: { period: hours + 'h', uptime: uptime.toFixed(2) + '%', totalSamples: relevant.length, healthySamples: healthy } });
});

router.get('/dashboard', (req, res) => {
  const latest = healthMonitor.getLatest();
  const checksSummary = Array.from(healthChecks.values()).map(c => ({ id: c.id, name: c.name, status: c.status, lastRun: c.lastRun }));
  res.json({
    success: true,
    data: {
      overall: latest?.overall || 'unknown',
      timestamp: latest?.timestamp || null,
      uptime: process.uptime(),
      checks: checksSummary,
      recentIncidents: incidentLog.filter(i => !i.resolved).slice(0, 5),
      totalIncidents: incidentLog.length
    }
  });
});

router.post('/components', (req, res) => {
  const { name, type, status, dependencies } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const component = { name, type: type || 'service', status: status || 'healthy', dependencies: dependencies || [], lastChecked: new Date().toISOString() };
  res.status(201).json({ success: true, data: component });
});

router.get('/components', (req, res) => {
  const components = [
    { name: 'Database', type: 'database', status: 'healthy' },
    { name: 'Cache', type: 'cache', status: 'healthy' },
    { name: 'Queue', type: 'queue', status: 'healthy' },
    { name: 'LLM Service', type: 'service', status: 'healthy' },
    { name: 'TTS Service', type: 'service', status: 'healthy' },
    { name: 'Voice Service', type: 'service', status: 'healthy' }
  ];
  res.json({ success: true, data: components });
});

router.post('/notifications', (req, res) => {
  const { name, channel, config, events } = req.body;
  if (!name || !channel) return res.status(400).json({ success: false, error: 'name and channel required' });
  notificationSubscribers.set(name, { name, channel, config: config || {}, events: events || ['status_change', 'incident', 'threshold_breach'], createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: notificationSubscribers.get(name) });
});

router.get('/notifications', (req, res) => {
  res.json({ success: true, data: Array.from(notificationSubscribers.values()) });
});

router.delete('/notifications/:name', (req, res) => {
  if (!notificationSubscribers.has(req.params.name)) return res.status(404).json({ success: false, error: 'Subscriber not found' });
  notificationSubscribers.delete(req.params.name);
  res.json({ success: true });
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      checksConfigured: healthChecks.size,
      thresholds: healthThresholds.size,
      historyLength: healthHistory.length,
      openIncidents: incidentLog.filter(i => !i.resolved).length,
      subscribers: notificationSubscribers.size,
      schedulingActive: healthCheckInterval !== null
    }
  });
});

module.exports = router;
