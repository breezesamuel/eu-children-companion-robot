const express = require('express');
const router = express.Router();
const activeService = require('../services/active-service');

const serviceRegistry = new Map();
const serviceDependencies = new Map();
const serviceMetrics = new Map();
const serviceConfigs = new Map();
const serviceLogs = new Map();

router.get('/schedules', (req, res) => {
  const userId = req.user.id;
  res.json({ success: true, data: activeService.getSchedules(userId) });
});

router.post('/schedules', (req, res) => {
  const { action, type, interval, times, data } = req.body;
  if (!action) return res.status(400).json({ success: false, error: 'action is required' });
  const schedule = activeService.addSchedule(req.user.id, action, { type, interval, times, data });
  res.status(201).json({ success: true, data: schedule });
});

router.delete('/schedules/:id', (req, res) => {
  const result = activeService.removeSchedule(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Schedule not found' });
  res.json({ success: true });
});

router.get('/reminders', (req, res) => {
  const { status } = req.query;
  res.json({ success: true, data: activeService.getUserReminders(req.user.id, status) });
});

router.post('/reminders', (req, res) => {
  const { title, message, fireAt, type, priority, repeatInterval, category } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title is required' });
  const reminder = activeService.addReminder(req.user.id, title, { message, fireAt, type, priority, repeatInterval, category });
  res.status(201).json({ success: true, data: reminder });
});

router.post('/reminders/:id/cancel', (req, res) => {
  const result = activeService.cancelReminder(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Reminder not found' });
  res.json({ success: true });
});

router.get('/reminders/upcoming', (req, res) => {
  const max = parseInt(req.query.max) || 5;
  res.json({ success: true, data: activeService.getUpcomingReminders(req.user.id, max) });
});

router.get('/preferences', (req, res) => {
  res.json({ success: true, data: activeService.getUserPreferences(req.user.id) });
});

router.put('/preferences', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ success: false, error: 'key is required' });
  activeService.setUserPreference(req.user.id, key, value);
  res.json({ success: true });
});

router.get('/suggest', (req, res) => {
  const { age } = req.query;
  const result = activeService.suggestActivity(req.user.id, parseInt(age) || 8, {});
  res.json(result);
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: activeService.getStats() });
});

router.post('/register', (req, res) => {
  const { name, version, endpoint, type } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  const serviceId = 'svc-' + Date.now();
  serviceRegistry.set(serviceId, { id: serviceId, name, version: version || '1.0.0', endpoint: endpoint || '', type: type || 'internal', status: 'registered', registeredAt: new Date().toISOString(), lastHealthCheck: null });
  res.status(201).json({ success: true, data: serviceRegistry.get(serviceId) });
});

router.get('/registry', (req, res) => {
  const { status, type } = req.query;
  let services = Array.from(serviceRegistry.values());
  if (status) services = services.filter(s => s.status === status);
  if (type) services = services.filter(s => s.type === type);
  res.json({ success: true, data: services });
});

router.get('/registry/:id', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  res.json({ success: true, data: svc });
});

router.put('/registry/:id', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  Object.assign(svc, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: svc });
});

router.delete('/registry/:id', (req, res) => {
  if (!serviceRegistry.has(req.params.id)) return res.status(404).json({ success: false, error: 'Service not found' });
  serviceRegistry.delete(req.params.id);
  res.json({ success: true });
});

router.post('/:id/start', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  svc.status = 'running';
  svc.startedAt = new Date().toISOString();
  res.json({ success: true, data: { id: svc.id, status: svc.status } });
});

router.post('/:id/stop', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  svc.status = 'stopped';
  svc.stoppedAt = new Date().toISOString();
  res.json({ success: true, data: { id: svc.id, status: svc.status } });
});

router.post('/:id/restart', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  svc.status = 'restarting';
  setTimeout(() => { svc.status = 'running'; }, 1000);
  res.json({ success: true, data: { id: svc.id, status: 'restarting' } });
});

router.get('/:id/health', async (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  const healthy = svc.status === 'running';
  svc.lastHealthCheck = new Date().toISOString();
  res.json({ success: true, data: { id: svc.id, name: svc.name, healthy, status: svc.status, lastCheck: svc.lastHealthCheck } });
});

router.post('/:id/health', async (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  const { checks } = req.body;
  svc.healthDetails = checks || {};
  svc.lastHealthCheck = new Date().toISOString();
  res.json({ success: true, data: { id: svc.id, checks: svc.healthDetails } });
});

router.post('/dependencies', (req, res) => {
  const { serviceId, dependsOn } = req.body;
  if (!serviceId || !dependsOn) return res.status(400).json({ success: false, error: 'serviceId and dependsOn required' });
  serviceDependencies.set(serviceId, { serviceId, dependsOn: Array.isArray(dependsOn) ? dependsOn : [dependsOn] });
  res.status(201).json({ success: true, data: serviceDependencies.get(serviceId) });
});

router.get('/dependencies', (req, res) => {
  res.json({ success: true, data: Array.from(serviceDependencies.values()) });
});

router.get('/dependencies/:serviceId', (req, res) => {
  const deps = serviceDependencies.get(req.params.serviceId);
  if (!deps) return res.status(404).json({ success: false, error: 'Dependencies not found' });
  res.json({ success: true, data: deps });
});

router.get('/:id/logs', (req, res) => {
  const { level, limit } = req.query;
  let logs = serviceLogs.get(req.params.id) || [];
  if (level) logs = logs.filter(l => l.level === level);
  res.json({ success: true, data: logs.slice(0, parseInt(limit) || 100) });
});

router.post('/:id/logs', (req, res) => {
  const { level, message, data } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message required' });
  if (!serviceLogs.has(req.params.id)) serviceLogs.set(req.params.id, []);
  serviceLogs.get(req.params.id).push({ level: level || 'info', message, data: data || {}, timestamp: new Date().toISOString() });
  res.status(201).json({ success: true });
});

router.get('/:id/metrics', (req, res) => {
  res.json({ success: true, data: serviceMetrics.get(req.params.id) || { cpu: 0, memory: 0, requests: 0, uptime: 0 } });
});

router.post('/:id/metrics', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  serviceMetrics.set(req.params.id, { ...req.body, recordedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: serviceMetrics.get(req.params.id) });
});

router.put('/:id/config', (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  serviceConfigs.set(req.params.id, { ...(serviceConfigs.get(req.params.id) || {}), ...req.body, updatedAt: new Date().toISOString() });
  res.json({ success: true, data: serviceConfigs.get(req.params.id) });
});

router.get('/:id/config', (req, res) => {
  res.json({ success: true, data: serviceConfigs.get(req.params.id) || {} });
});

router.post('/auto-scale', (req, res) => {
  const { serviceId, min, max, metric, threshold } = req.body;
  if (!serviceId || !min || !max) return res.status(400).json({ success: false, error: 'serviceId, min, max required' });
  const svc = serviceRegistry.get(serviceId);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  svc.autoScale = { min: parseInt(min), max: parseInt(max), metric: metric || 'cpu', threshold: parseFloat(threshold) || 0.8 };
  res.json({ success: true, data: svc.autoScale });
});

router.post('/discovery/register', (req, res) => {
  const { name, host, port, tags } = req.body;
  if (!name || !host || !port) return res.status(400).json({ success: false, error: 'name, host, port required' });
  const svc = serviceRegistry.get(name);
  if (svc) {
    svc.host = host;
    svc.port = port;
    svc.tags = tags || [];
    svc.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, data: { name, host, port, tags: tags || [] } });
});

router.get('/discovery/services', (req, res) => {
  const { tag } = req.query;
  let services = Array.from(serviceRegistry.values()).filter(s => s.status === 'running');
  if (tag) services = services.filter(s => (s.tags || []).includes(tag));
  res.json({ success: true, data: services });
});

router.post('/:id/backup', async (req, res) => {
  const svc = serviceRegistry.get(req.params.id);
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found' });
  const backup = { serviceId: req.params.id, config: serviceConfigs.get(req.params.id), timestamp: new Date().toISOString(), backupId: 'bk-' + Date.now() };
  res.status(201).json({ success: true, data: backup });
});

router.get('/status', (req, res) => {
  const all = Array.from(serviceRegistry.values());
  res.json({
    success: true,
    data: {
      total: all.length,
      running: all.filter(s => s.status === 'running').length,
      stopped: all.filter(s => s.status === 'stopped').length,
      registered: all.filter(s => s.status === 'registered').length,
      dependencies: serviceDependencies.size,
      uptime: process.uptime()
    }
  });
});

module.exports = router;
