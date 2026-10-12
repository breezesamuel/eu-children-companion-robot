const express = require('express');
const router = express.Router();
const SelfHostedHub = require('../services/self-hosted');
const logger = require('../utils/logger');

const hub = new SelfHostedHub();

const registeredInstances = new Map();
const instanceConfigs = new Map();
const instanceLogs = new Map();

router.get('/config', (req, res) => {
  try {
    const { service } = req.query;
    if (service) return res.json({ success: true, data: hub.getConfig(service) });
    res.json({ success: true, data: hub.getAllConfigs() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/config/:service', (req, res) => {
  try {
    const result = hub.configure(req.params.service, req.body);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/health', async (req, res) => {
  try {
    const { service } = req.query;
    if (service) return res.json({ success: true, data: await hub.healthCheck(service) });
    const results = await hub.healthCheckAll();
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/discover', async (req, res) => {
  try {
    const results = await hub.discoverAll();
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/map', (req, res) => {
  try {
    res.json({ success: true, data: hub.getIntegrationMap() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/ha/states', (req, res) => {
  try { res.json({ success: true, data: hub.haGetStates() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/ha/service', (req, res) => {
  try {
    const { domain, service, entityId, data } = req.body;
    if (!domain || !service || !entityId) return res.status(400).json({ success: false, error: 'domain, service, entityId required' });
    res.json(hub.haCallService(domain, service, entityId, data));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/omv/disks', (req, res) => {
  try { res.json({ success: true, data: hub.omvGetDisks() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/omv/health', (req, res) => {
  try { res.json({ success: true, data: hub.omvGetHealth() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/matrix/room', (req, res) => {
  try {
    const { name, topic } = req.body;
    res.json(hub.matrixCreateRoom(name || 'General', topic));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/matrix/send', (req, res) => {
  try {
    const { roomId, content } = req.body;
    if (!roomId || !content) return res.status(400).json({ success: false, error: 'roomId and content required' });
    res.json(hub.matrixSendMessage(roomId, content));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/matrix/rooms', (req, res) => {
  try { res.json({ success: true, data: hub.matrixGetRooms() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/jitsi/meeting', (req, res) => {
  try {
    const { topic, ...options } = req.body;
    res.json(hub.jitsiCreateMeeting(topic, options));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/jitsi/meetings', (req, res) => {
  try { res.json({ success: true, data: hub.jitsiGetActiveMeetings() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/nextcloud/upload', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename) return res.status(400).json({ success: false, error: 'filename required' });
    res.json(hub.nextcloudUploadFile(filename, content || ''));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/nextcloud/files', (req, res) => {
  try {
    const { path: filePath } = req.query;
    res.json({ success: true, data: hub.nextcloudListFiles(filePath || '/') });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/grafana/dashboard', (req, res) => {
  try {
    const { title, panels } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title required' });
    res.json(hub.grafanaCreateDashboard(title, panels || []));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/grafana/dashboards', (req, res) => {
  try { res.json({ success: true, data: hub.grafanaGetDashboards() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/grafana/alert', (req, res) => {
  try {
    const { name, query, condition } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    res.json(hub.grafanaCreateAlert(name, query, condition));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/register', (req, res) => {
  try {
    const { instanceId, name, version, host, port, capabilities } = req.body;
    if (!instanceId || !name) return res.status(400).json({ success: false, error: 'instanceId and name required' });
    registeredInstances.set(instanceId, { instanceId, name, version: version || '1.0.0', host: host || 'localhost', port: port || 3000, capabilities: capabilities || [], status: 'registered', registeredAt: new Date().toISOString(), lastHeartbeat: new Date().toISOString() });
    res.status(201).json({ success: true, data: registeredInstances.get(instanceId) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances', (req, res) => {
  try {
    const { status } = req.query;
    let instances = Array.from(registeredInstances.values());
    if (status) instances = instances.filter(i => i.status === status);
    res.json({ success: true, data: instances });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: instance });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/instances/:id', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    Object.assign(instance, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: instance });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/instances/:id', (req, res) => {
  try {
    if (!registeredInstances.has(req.params.id)) return res.status(404).json({ success: false, error: 'Instance not found' });
    registeredInstances.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/heartbeat', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    instance.lastHeartbeat = new Date().toISOString();
    instance.status = 'online';
    const { metrics } = req.body;
    if (metrics) instance.metrics = metrics;
    res.json({ success: true, data: { status: 'acknowledged', lastHeartbeat: instance.lastHeartbeat } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id/version', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const latest = hub.getLatestVersion ? hub.getLatestVersion() : instance.version;
    res.json({ success: true, data: { current: instance.version, latest, isUpToDate: instance.version === latest } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/sync-config', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const config = req.body.config || hub.getAllConfigs();
    instanceConfigs.set(req.params.id, { instanceId: req.params.id, config, syncedAt: new Date().toISOString() });
    res.json({ success: true, data: { message: 'Configuration synced', services: Object.keys(config).length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id/config', (req, res) => {
  try {
    const config = instanceConfigs.get(req.params.id);
    if (!config) return res.status(404).json({ success: false, error: 'No config found for instance' });
    res.json({ success: true, data: config });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id/stats', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({
      success: true,
      data: {
        uptime: instance.metrics?.uptime || 0,
        cpu: instance.metrics?.cpu || 0,
        memory: instance.metrics?.memory || 0,
        requests: instance.metrics?.requests || 0,
        lastHeartbeat: instance.lastHeartbeat
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/logs/stream', (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const { lines, level } = req.body;
    const logId = 'log-' + Date.now();
    instanceLogs.set(logId, { instanceId: req.params.id, lines: lines || 50, level: level || 'info', startedAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: { logId, message: 'Log stream started' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id/logs', (req, res) => {
  try {
    const logs = Array.from(instanceLogs.values()).filter(l => l.instanceId === req.params.id);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/backup', async (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const backup = hub.createBackup ? await hub.createBackup(req.params.id, req.body.options || {}) : { backupId: 'backup-' + Date.now(), status: 'completed' };
    res.json({ success: true, data: backup });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/restore', async (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const { backupId } = req.body;
    if (!backupId) return res.status(400).json({ success: false, error: 'backupId required' });
    const result = hub.restoreBackup ? await hub.restoreBackup(req.params.id, backupId) : { status: 'restored' };
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/instances/:id/update', async (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const { version } = req.body;
    const result = hub.deployUpdate ? await hub.deployUpdate(req.params.id, version || 'latest') : { status: 'update_initiated', version: version || 'latest' };
    instance.version = version || instance.version;
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/instances/:id/health', async (req, res) => {
  try {
    const instance = registeredInstances.get(req.params.id);
    if (!instance) return res.status(404).json({ success: false, error: 'Instance not found' });
    const checks = await hub.healthCheckAll ? await hub.healthCheckAll() : { status: 'healthy' };
    res.json({ success: true, data: { instance: instance.name, status: instance.status, checks } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        instances: registeredInstances.size,
        online: Array.from(registeredInstances.values()).filter(i => i.status === 'online').length,
        services: hub.getAllConfigs ? Object.keys(hub.getAllConfigs()).length : 0,
        uptime: process.uptime()
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
