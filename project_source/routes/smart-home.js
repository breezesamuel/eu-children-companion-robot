const express = require('express');
const router = express.Router();
const smartHome = require('../services/smart-home');

const deviceTypeRegistry = new Map();
const scenes = new Map();
const automationRules = new Map();
const deviceGroups = new Map();
const energyData = new Map();
const deviceSchedules = new Map();
const mqttTopics = new Map();

router.get('/devices', (req, res) => {
  const { type, room, online } = req.query;
  const filters = {};
  if (type) filters.type = type;
  if (room) filters.room = room;
  if (online !== undefined) filters.online = online === 'true';
  res.json({ success: true, data: smartHome.getDevices(filters) });
});

router.get('/devices/discover', (req, res) => {
  const devices = smartHome.discoverDevices();
  res.json({ success: true, data: devices });
});

router.get('/devices/:id', (req, res) => {
  const device = smartHome.getDevice(req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
  res.json({ success: true, data: device });
});

router.put('/devices/:id/state', (req, res) => {
  const result = smartHome.setDeviceState(req.params.id, req.body);
  res.json(result);
});

router.put('/devices/:id/online', (req, res) => {
  const result = smartHome.setDeviceOnline(req.params.id, req.body.online);
  res.json(result);
});

router.post('/devices/register', (req, res) => {
  const device = smartHome.registerDevice(req.body);
  res.status(201).json({ success: true, data: device });
});

router.delete('/devices/:id', (req, res) => {
  const result = smartHome.removeDevice(req.params.id);
  res.json(result);
});

router.get('/scenes', (req, res) => {
  res.json({ success: true, data: Array.from(scenes.values()) });
});

router.post('/scenes', (req, res) => {
  const { name, actions } = req.body;
  if (!name || !actions) return res.status(400).json({ success: false, error: 'name and actions required' });
  const scene = smartHome.createScene(name, actions);
  scenes.set(scene.id || name, scene);
  res.status(201).json({ success: true, data: scene });
});

router.post('/scenes/:id/activate', (req, res) => {
  const result = smartHome.activateScene(req.params.id);
  res.json(result);
});

router.get('/rooms', (req, res) => {
  res.json({ success: true, data: smartHome.getRooms() });
});

router.post('/rooms', (req, res) => {
  const { name, devices } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const room = smartHome.setRoom(name, devices || []);
  res.status(201).json({ success: true, data: room });
});

router.get('/automations', (req, res) => {
  res.json({ success: true, data: Array.from(automationRules.values()) });
});

router.post('/automations', (req, res) => {
  const { name, trigger, condition, action } = req.body;
  if (!name || !trigger || !action) return res.status(400).json({ success: false, error: 'name, trigger, action required' });
  const automation = smartHome.addAutomation(name, trigger, condition, action);
  automationRules.set(automation.id || name, automation);
  res.status(201).json({ success: true, data: automation });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: smartHome.getStats() });
});

router.post('/device-types', (req, res) => {
  const { name, capabilities, category } = req.body;
  if (!name || !capabilities) return res.status(400).json({ success: false, error: 'name and capabilities required' });
  deviceTypeRegistry.set(name, { name, capabilities: Array.isArray(capabilities) ? capabilities : [capabilities], category: category || 'general', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: deviceTypeRegistry.get(name) });
});

router.get('/device-types', (req, res) => {
  res.json({ success: true, data: Array.from(deviceTypeRegistry.values()) });
});

router.get('/device-types/:name', (req, res) => {
  const dt = deviceTypeRegistry.get(req.params.name);
  if (!dt) return res.status(404).json({ success: false, error: 'Device type not found' });
  res.json({ success: true, data: dt });
});

router.delete('/device-types/:name', (req, res) => {
  if (!deviceTypeRegistry.has(req.params.name)) return res.status(404).json({ success: false, error: 'Device type not found' });
  deviceTypeRegistry.delete(req.params.name);
  res.json({ success: true });
});

router.get('/scenes/manage', (req, res) => {
  res.json({ success: true, data: Array.from(scenes.values()) });
});

router.get('/scenes/:id', (req, res) => {
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ success: false, error: 'Scene not found' });
  res.json({ success: true, data: scene });
});

router.put('/scenes/:id', (req, res) => {
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ success: false, error: 'Scene not found' });
  Object.assign(scene, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: scene });
});

router.delete('/scenes/:id', (req, res) => {
  if (!scenes.has(req.params.id)) return res.status(404).json({ success: false, error: 'Scene not found' });
  scenes.delete(req.params.id);
  res.json({ success: true });
});

router.get('/automations/:id', (req, res) => {
  const rule = automationRules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Automation not found' });
  res.json({ success: true, data: rule });
});

router.put('/automations/:id', (req, res) => {
  const rule = automationRules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Automation not found' });
  Object.assign(rule, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: rule });
});

router.delete('/automations/:id', (req, res) => {
  if (!automationRules.has(req.params.id)) return res.status(404).json({ success: false, error: 'Automation not found' });
  automationRules.delete(req.params.id);
  res.json({ success: true });
});

router.post('/groups', (req, res) => {
  const { name, deviceIds, room } = req.body;
  if (!name || !deviceIds) return res.status(400).json({ success: false, error: 'name and deviceIds required' });
  const groupId = 'group-' + Date.now();
  deviceGroups.set(groupId, { id: groupId, name, deviceIds, room: room || 'default', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: deviceGroups.get(groupId) });
});

router.get('/groups', (req, res) => {
  res.json({ success: true, data: Array.from(deviceGroups.values()) });
});

router.get('/groups/:id', (req, res) => {
  const group = deviceGroups.get(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
});

router.put('/groups/:id', (req, res) => {
  const group = deviceGroups.get(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  Object.assign(group, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: group });
});

router.delete('/groups/:id', (req, res) => {
  if (!deviceGroups.has(req.params.id)) return res.status(404).json({ success: false, error: 'Group not found' });
  deviceGroups.delete(req.params.id);
  res.json({ success: true });
});

router.post('/groups/:id/command', (req, res) => {
  const group = deviceGroups.get(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  const { command, params } = req.body;
  if (!command) return res.status(400).json({ success: false, error: 'command required' });
  const results = group.deviceIds.map(did => {
    try { return { deviceId: did, result: smartHome.setDeviceState(did, { [command]: params }) }; }
    catch (e) { return { deviceId: did, error: e.message }; }
  });
  res.json({ success: true, data: results });
});

router.get('/energy', (req, res) => {
  const { deviceId, period } = req.query;
  const data = energyData.get(deviceId || 'total') || { consumption: 0, unit: 'kWh', period: period || 'day' };
  res.json({ success: true, data });
});

router.post('/energy', (req, res) => {
  const { deviceId, consumption, unit } = req.body;
  if (!deviceId || consumption === undefined) return res.status(400).json({ success: false, error: 'deviceId and consumption required' });
  energyData.set(deviceId, { deviceId, consumption: parseFloat(consumption), unit: unit || 'kWh', recordedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: energyData.get(deviceId) });
});

router.post('/schedules', (req, res) => {
  const { deviceId, action, time, days, enabled } = req.body;
  if (!deviceId || !action || !time) return res.status(400).json({ success: false, error: 'deviceId, action, and time required' });
  const scheduleId = 'sched-' + Date.now();
  deviceSchedules.set(scheduleId, { id: scheduleId, deviceId, action, time, days: days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], enabled: enabled !== false, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: deviceSchedules.get(scheduleId) });
});

router.get('/schedules', (req, res) => {
  const { deviceId } = req.query;
  let items = Array.from(deviceSchedules.values());
  if (deviceId) items = items.filter(s => s.deviceId === deviceId);
  res.json({ success: true, data: items });
});

router.put('/schedules/:id', (req, res) => {
  const schedule = deviceSchedules.get(req.params.id);
  if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });
  Object.assign(schedule, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: schedule });
});

router.delete('/schedules/:id', (req, res) => {
  if (!deviceSchedules.has(req.params.id)) return res.status(404).json({ success: false, error: 'Schedule not found' });
  deviceSchedules.delete(req.params.id);
  res.json({ success: true });
});

router.post('/voice/command', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text required' });
  const result = smartHome.processVoiceCommand ? smartHome.processVoiceCommand(text) : { command: text, interpreted: 'toggle', device: 'unknown' };
  res.json({ success: true, data: result });
});

router.post('/mqtt/topic', (req, res) => {
  const { topic, payload } = req.body;
  if (!topic) return res.status(400).json({ success: false, error: 'topic required' });
  mqttTopics.set(topic, { topic, lastPayload: payload || '', lastUpdate: new Date().toISOString() });
  res.status(201).json({ success: true, data: { topic, status: 'subscribed' } });
});

router.get('/mqtt/topics', (req, res) => {
  res.json({ success: true, data: Array.from(mqttTopics.values()) });
});

router.post('/mqtt/publish', (req, res) => {
  const { topic, message } = req.body;
  if (!topic || !message) return res.status(400).json({ success: false, error: 'topic and message required' });
  const result = smartHome.mqttPublish ? smartHome.mqttPublish(topic, message) : { topic, published: true };
  res.json({ success: true, data: result });
});

router.get('/state', (req, res) => {
  const allDevices = smartHome.getDevices({});
  res.json({
    success: true,
    data: {
      devices: allDevices.length,
      online: allDevices.filter(d => d.online !== false).length,
      scenes: scenes.size,
      automations: automationRules.size,
      groups: deviceGroups.size,
      schedules: deviceSchedules.size,
      rooms: smartHome.getRooms().length
    }
  });
});

router.get('/state/report', (req, res) => {
  res.json({
    success: true,
    data: {
      devices: smartHome.getDevices({}),
      scenes: Array.from(scenes.values()),
      automations: Array.from(automationRules.values()),
      groups: Array.from(deviceGroups.values()),
      roomSummary: smartHome.getRooms()
    }
  });
});

module.exports = router;
