const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJSON(file) {
  try {
    const p = path.join(DATA_DIR, file);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function paginate(arr, query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const start = (page - 1) * limit;
  const total = arr.length;
  const items = arr.slice(start, start + limit);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function search(arr, query, fields) {
  if (!query) return arr;
  const q = query.toLowerCase();
  return arr.filter(item => fields.some(f => {
    const v = item[f];
    return v && String(v).toLowerCase().includes(q);
  }));
}

function sortItems(arr, sortBy, order) {
  if (!sortBy) return arr;
  const dir = order === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    const va = a[sortBy], vb = b[sortBy];
    if (va == null) return 1; if (vb == null) return -1;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function getStats(arr) {
  return { total: arr.length, updatedAt: new Date().toISOString() };
}

function getContentStats() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const stats = {};
  files.forEach(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      const len = Array.isArray(data) ? data.length : (data.sources ? data.sources.length : 1);
      stats[f] = { size: fs.statSync(path.join(DATA_DIR, f)).size, items: len };
    } catch {}
  });
  return stats;
}

// ---------------------------------------------------------------------------
// User Management (8)
// ---------------------------------------------------------------------------
router.get('/users', (req, res) => {
  try {
    const data = readJSON('users.json');
    const filtered = search(data, req.query.q, ['name', 'email', 'role']);
    const sorted = sortItems(filtered, req.query.sortBy, req.query.order);
    res.json(paginate(sorted, req.query));
  } catch { res.json({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }); }
});

router.post('/users', (req, res) => {
  try {
    const data = readJSON('users.json');
    const user = { id: Date.now().toString(36), ...req.body, createdAt: new Date().toISOString() };
    data.push(user);
    writeJSON('users.json', data);
    res.status(201).json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', (req, res) => {
  try {
    const data = readJSON('users.json');
    const idx = data.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    data[idx] = { ...data[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeJSON('users.json', data);
    res.json({ success: true, user: data[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', (req, res) => {
  try {
    let data = readJSON('users.json');
    const idx = data.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    data.splice(idx, 1);
    writeJSON('users.json', data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users/:id/ban', (req, res) => {
  try {
    const data = readJSON('users.json');
    const user = data.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.banned = true;
    user.bannedAt = new Date().toISOString();
    writeJSON('users.json', data);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users/:id/unban', (req, res) => {
  try {
    const data = readJSON('users.json');
    const user = data.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.banned = false;
    user.bannedAt = null;
    writeJSON('users.json', data);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/roles', (req, res) => {
  try {
    const data = readJSON('users.json');
    const user = data.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.roles = req.body.roles || [];
    writeJSON('users.json', data);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/:id/activity', (req, res) => {
  try {
    const logs = readJSON('activity-logs.json');
    const items = logs.filter(l => l.userId === req.params.id);
    res.json(paginate(items, req.query));
  } catch { res.json({ items: [], total: 0 }); }
});

// ---------------------------------------------------------------------------
// Device Management (8)
// ---------------------------------------------------------------------------
router.get('/devices', (req, res) => {
  try {
    let data = readJSON('devices.json');
    const filtered = search(data, req.query.q, ['device_id', 'name', 'status']);
    const sorted = sortItems(filtered, req.query.sortBy, req.query.order);
    res.json(paginate(sorted, req.query));
  } catch { res.json({ items: [], total: 0 }); }
});

router.post('/devices', (req, res) => {
  try {
    const data = readJSON('devices.json');
    const device = { device_id: 'DEV-' + Date.now().toString(36).toUpperCase(), ...req.body, registeredAt: new Date().toISOString() };
    data.push(device);
    writeJSON('devices.json', data);
    res.status(201).json({ success: true, device });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/devices/:id', (req, res) => {
  try {
    const data = readJSON('devices.json');
    const idx = data.findIndex(d => d.device_id === req.params.id || d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    data[idx] = { ...data[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeJSON('devices.json', data);
    res.json({ success: true, device: data[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/devices/:id', (req, res) => {
  try {
    let data = readJSON('devices.json');
    const idx = data.findIndex(d => d.device_id === req.params.id || d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    data.splice(idx, 1);
    writeJSON('devices.json', data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/devices/:id/status', (req, res) => {
  try {
    const data = readJSON('devices.json');
    const device = data.find(d => d.device_id === req.params.id || d.id === req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const telemetry = readJSON('device-telemetry.json').filter(t => t.device_id === device.device_id);
    res.json({ device: device.device_id, status: device.status || 'unknown', lastHeartbeat: device.lastHeartbeat, telemetry: telemetry.slice(-50) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/devices/:id/logs', (req, res) => {
  try {
    const logs = readJSON('device-logs.json');
    const items = logs.filter(l => l.device_id === req.params.id || l.deviceId === req.params.id);
    res.json(paginate(items, req.query));
  } catch { res.json({ items: [], total: 0 }); }
});

router.post('/devices/:id/firmware', (req, res) => {
  res.json({ success: true, message: 'Firmware update queued for device ' + req.params.id, version: req.body.version || 'latest' });
});

router.post('/devices/:id/restart', (req, res) => {
  res.json({ success: true, message: 'Restart command sent to device ' + req.params.id });
});

// ---------------------------------------------------------------------------
// Content Management (8)
// ---------------------------------------------------------------------------
router.get('/content', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f.startsWith('content-'));
    let all = [];
    files.forEach(f => {
      const data = readJSON(f);
      if (Array.isArray(data)) all = all.concat(data.map(d => ({ ...d, _source: f })));
    });
    const filtered = search(all, req.query.q, ['title', 'word', 'meaning', 'name', 'description']);
    const sorted = sortItems(filtered, req.query.sortBy, req.query.order);
    res.json(paginate(sorted, req.query));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/content', (req, res) => {
  const file = req.body._source || 'content-custom.json';
  try {
    const data = readJSON(file);
    const item = { id: Date.now().toString(36), ...req.body, createdAt: new Date().toISOString() };
    delete item._source;
    data.push(item);
    writeJSON(file, data);
    res.status(201).json({ success: true, item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/content/:id', (req, res) => {
  const file = req.body._source || 'content-custom.json';
  try {
    const data = readJSON(file);
    const idx = data.findIndex(d => d.id === req.params.id || d.word === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Content not found' });
    data[idx] = { ...data[idx], ...req.body, updatedAt: new Date().toISOString() };
    delete data[idx]._source;
    writeJSON(file, data);
    res.json({ success: true, item: data[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/content/:id', (req, res) => {
  const file = req.query.source || 'content-custom.json';
  try {
    let data = readJSON(file);
    data = data.filter(d => d.id !== req.params.id && d.word !== req.params.id);
    writeJSON(file, data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/content/:id/publish', (req, res) => {
  const file = req.body._source || 'content-custom.json';
  try {
    const data = readJSON(file);
    const item = data.find(d => d.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    item.published = true; item.publishedAt = new Date().toISOString();
    writeJSON(file, data);
    res.json({ success: true, item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/content/:id/archive', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = readJSON(file);
      if (!Array.isArray(data)) continue;
      const item = data.find(d => d.id === req.params.id);
      if (item) { item.archived = true; writeJSON(file, data); return res.json({ success: true }); }
    }
    res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/content/categories', (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const cats = files.map(f => ({ file: f, name: f.replace('.json', '').replace('content-', '').replace('english-', ''), ...getStats(readJSON(f)) }));
  res.json(cats);
});

router.post('/content/upload', (req, res) => {
  res.json({ success: true, message: 'Upload endpoint ready. Use multipart/form-data with field "file".' });
});

// ---------------------------------------------------------------------------
// Products (6)
// ---------------------------------------------------------------------------
router.get('/products', (req, res) => {
  try {
    const data = readJSON('products.json');
    const filtered = search(data, req.query.q, ['name', 'id']);
    const sorted = sortItems(filtered, req.query.sortBy, req.query.order);
    res.json(paginate(sorted, req.query));
  } catch { res.json({ items: [], total: 0 }); }
});

router.post('/products', (req, res) => {
  try {
    const data = readJSON('products.json');
    const product = { id: 'PROD-' + Date.now().toString(36).toUpperCase(), ...req.body, createdAt: new Date().toISOString() };
    data.push(product);
    writeJSON('products.json', data);
    res.status(201).json({ success: true, product });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/products/:id', (req, res) => {
  try {
    const data = readJSON('products.json');
    const idx = data.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    data[idx] = { ...data[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeJSON('products.json', data);
    res.json({ success: true, product: data[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/products/:id', (req, res) => {
  try {
    let data = readJSON('products.json');
    const idx = data.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    data.splice(idx, 1);
    writeJSON('products.json', data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/products/:id/versions', (req, res) => {
  try {
    const data = readJSON('product-versions.json');
    const items = data.filter(v => v.product_id === req.params.id);
    res.json(paginate(items, req.query));
  } catch { res.json({ items: [], total: 0 }); }
});

router.put('/products/:id/pricing', (req, res) => {
  try {
    const data = readJSON('products.json');
    const product = data.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.price = req.body.price;
    product.currency = req.body.currency || 'USD';
    writeJSON('products.json', data);
    res.json({ success: true, product });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Analytics (6)
// ---------------------------------------------------------------------------
router.get('/analytics/dashboard', (req, res) => {
  try {
    const vocab = readJSON('english-vocabulary-server.json');
    const content = readJSON('english-vocabulary-content.json');
    const devices = readJSON('devices.json');
    const users = readJSON('users.json');
    const levels = {};
    vocab.forEach(w => { const l = w.level || 'unknown'; levels[l] = (levels[l] || 0) + 1; });
    res.json({
      totalVocabulary: vocab.length,
      totalContent: content.length,
      totalDevices: Array.isArray(devices) ? devices.length : 0,
      totalUsers: Array.isArray(users) ? users.length : 0,
      vocabularyByLevel: levels,
      contentFiles: getContentStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) { res.json({ error: e.message }); }
});

router.get('/analytics/users', (req, res) => {
  try {
    const data = readJSON('users.json');
    if (!Array.isArray(data)) return res.json({ total: 0 });
    const byRole = {}; data.forEach(u => { const r = u.role || 'user'; byRole[r] = (byRole[r] || 0) + 1; });
    const active = data.filter(u => u.lastLogin && Date.now() - new Date(u.lastLogin).getTime() < 86400000 * 7).length;
    res.json({ total: data.length, active, byRole, growth: { last7days: active, last30days: data.length } });
  } catch { res.json({ total: 0 }); }
});

router.get('/analytics/content', (req, res) => {
  res.json({ stats: getContentStats(), timestamp: new Date().toISOString() });
});

router.get('/analytics/devices', (req, res) => {
  try {
    const data = readJSON('devices.json');
    if (!Array.isArray(data)) return res.json({ total: 0 });
    const byStatus = {}; data.forEach(d => { const s = d.status || 'unknown'; byStatus[s] = (byStatus[s] || 0) + 1; });
    const online = data.filter(d => d.status === 'online').length;
    res.json({ total: data.length, online, byStatus });
  } catch { res.json({ total: 0 }); }
});

router.get('/analytics/learning', (req, res) => {
  try {
    const records = readJSON('learning-records.json');
    const total = Array.isArray(records) ? records.length : 0;
    const completed = Array.isArray(records) ? records.filter(r => r.completed).length : 0;
    res.json({ totalRecords: total, completed, completionRate: total ? (completed / total * 100).toFixed(1) + '%' : '0%' });
  } catch { res.json({ totalRecords: 0, completed: 0 }); }
});

router.get('/analytics/reports', (req, res) => {
  try {
    const report = {
      generated: new Date().toISOString(),
      vocabulary: { total: (readJSON('english-vocabulary-server.json') || []).length },
      content: getContentStats(),
      users: (readJSON('users.json') || []).length,
      devices: (readJSON('devices.json') || []).length,
    };
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Settings (6)
// ---------------------------------------------------------------------------
let systemSettings = { appName: 'RoboMate', language: 'zh-CN', theme: 'light', maintenanceMode: false, logLevel: 'info', updatedAt: null };

router.get('/settings', (req, res) => res.json(systemSettings));

router.put('/settings', (req, res) => {
  systemSettings = { ...systemSettings, ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, settings: systemSettings });
});

router.post('/settings/backup', (req, res) => {
  const backup = { timestamp: new Date().toISOString(), files: {} };
  fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).forEach(f => {
    backup.files[f] = readJSON(f);
  });
  const backupPath = path.join(DATA_DIR, 'backup-' + Date.now() + '.json');
  writeJSON(path.basename(backupPath), backup);
  res.json({ success: true, backupFile: path.basename(backupPath), files: Object.keys(backup.files).length });
});

router.post('/settings/restore', (req, res) => {
  const file = req.body.file;
  if (!file) return res.status(400).json({ error: 'Backup file name required' });
  try {
    const backup = readJSON(file);
    if (!backup || !backup.files) return res.status(400).json({ error: 'Invalid backup file' });
    Object.entries(backup.files).forEach(([name, data]) => writeJSON(name, data));
    res.json({ success: true, message: 'Restored ' + Object.keys(backup.files).length + ' files' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/settings/logs', (req, res) => {
  const logDir = path.join(__dirname, '..');
  const logs = fs.readdirSync(logDir).filter(f => f.startsWith('server') && (f.endsWith('.log') || f.endsWith('.txt')));
  const details = logs.map(f => ({ file: f, size: fs.statSync(path.join(logDir, f)).size }));
  res.json({ logs: details });
});

router.post('/settings/maintenance', (req, res) => {
  systemSettings.maintenanceMode = req.body.enabled !== false;
  res.json({ success: true, maintenanceMode: systemSettings.maintenanceMode });
});

// ---------------------------------------------------------------------------
// Notifications (4)
// ---------------------------------------------------------------------------
const notifications = [];

router.post('/notifications', (req, res) => {
  const n = { id: Date.now().toString(36), ...req.body, sentAt: new Date().toISOString() };
  notifications.push(n);
  res.status(201).json({ success: true, notification: n });
});

router.post('/notifications/broadcast', (req, res) => {
  const n = { id: Date.now().toString(36), type: 'broadcast', ...req.body, sentAt: new Date().toISOString() };
  notifications.push(n);
  res.json({ success: true, notification: n, broadcastTo: 'all' });
});

router.get('/notifications/templates', (req, res) => {
  res.json({ templates: [
    { id: 'welcome', name: 'Welcome Message', variables: ['userName'] },
    { id: 'update', name: 'Update Available', variables: ['version', 'deviceName'] },
    { id: 'achievement', name: 'Achievement Unlocked', variables: ['childName', 'achievement'] },
    { id: 'alert', name: 'Safety Alert', variables: ['deviceName', 'alertType'] },
  ]});
});

router.get('/notifications/history', (req, res) => {
  res.json(paginate(notifications, req.query));
});

// ---------------------------------------------------------------------------
// Upgrade (4)
// ---------------------------------------------------------------------------
let upgrades = [];

router.post('/upgrade/plan', (req, res) => {
  const plan = { id: 'UPG-' + Date.now().toString(36).toUpperCase(), ...req.body, status: 'planned', createdAt: new Date().toISOString() };
  upgrades.push(plan);
  res.status(201).json({ success: true, plan });
});

router.post('/upgrade/deploy', (req, res) => {
  const id = req.body.planId;
  const plan = upgrades.find(p => p.id === id);
  if (plan) plan.status = 'deploying';
  res.json({ success: true, planId: id, status: 'deploying' });
});

router.get('/upgrade/status', (req, res) => {
  res.json({ upgrades, active: upgrades.filter(u => u.status === 'deploying' || u.status === 'planned') });
});

router.post('/upgrade/rollback', (req, res) => {
  const id = req.body.planId;
  const plan = upgrades.find(p => p.id === id);
  if (plan) plan.status = 'rolled-back';
  res.json({ success: true, planId: id, status: 'rolled-back' });
});

// ---------------------------------------------------------------------------
// Audit & Security (4)
// ---------------------------------------------------------------------------
const auditLog = [];

router.get('/audit', (req, res) => {
  const filtered = req.query.q ? auditLog.filter(a => JSON.stringify(a).toLowerCase().includes(req.query.q.toLowerCase())) : auditLog;
  res.json(paginate(filtered, req.query));
});

router.get('/audit/export', (req, res) => {
  res.json({ auditLog, exportedAt: new Date().toISOString(), count: auditLog.length });
});

router.put('/security', (req, res) => {
  systemSettings.security = { ...systemSettings.security, ...req.body };
  res.json({ success: true, security: systemSettings.security });
});

router.get('/security/keys', (req, res) => {
  res.json({ keys: [
    { name: 'Stripe Publishable Key', key: process.env.STRIPE_PUBLISHABLE_KEY ? 'sk_...' + process.env.STRIPE_PUBLISHABLE_KEY.slice(-4) : 'not-set' },
    { name: 'OpenAI API Key', key: process.env.OPENAI_API_KEY ? 'sk-...' + process.env.OPENAI_API_KEY.slice(-4) : 'not-set' },
    { name: 'JWT Secret', key: process.env.JWT_SECRET ? '***configured***' : 'not-set' },
  ]});
});

// ---------------------------------------------------------------------------
// Import / Export (2)
// ---------------------------------------------------------------------------
router.get('/export/:type', (req, res) => {
  const type = req.params.type;
  const exportable = {
    vocabulary: 'english-vocabulary-server.json',
    content: 'english-vocabulary-content.json',
    devices: 'devices.json',
    users: 'users.json',
    products: 'products.json',
  };
  const file = exportable[type];
  if (!file) return res.status(400).json({ error: 'Unknown export type: ' + type + '. Available: ' + Object.keys(exportable).join(', ') });
  const data = readJSON(file);
  res.json({ type, count: Array.isArray(data) ? data.length : 1, data, exportedAt: new Date().toISOString() });
});

router.post('/import/:type', (req, res) => {
  const type = req.params.type;
  const importable = {
    vocabulary: 'english-vocabulary-server.json',
    content: 'english-vocabulary-content.json',
    devices: 'devices.json',
    products: 'products.json',
  };
  const file = importable[type];
  if (!file) return res.status(400).json({ error: 'Unknown import type: ' + type });
  try {
    const data = req.body.data || req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Data must be an array' });
    writeJSON(file, data);
    res.json({ success: true, type, imported: data.length, file });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Feature list
// ---------------------------------------------------------------------------
router.get('/features', (req, res) => {
  const routes = [];
  router.stack.forEach(r => {
    if (r.route) {
      const methods = Object.keys(r.route.methods).join(',').toUpperCase();
      routes.push({ method: methods, path: r.route.path });
    }
  });
  res.json({ total: routes.length, routes });
});

module.exports = { router, features: [], count: 0 };
