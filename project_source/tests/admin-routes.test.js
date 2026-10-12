const http = require('http');

process.env.PORT = process.env.PORT || '3099';
const app = require('../server');
const PORT = parseInt(process.env.PORT);

const base = `http://localhost:${PORT}`;
const ADMIN = '/api/admin';
const DATA = '/api/admin/data';

function request(path, options = {}) {
  const url = new URL(path, base);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body ? JSON.stringify(options.body) : undefined;
  return new Promise((resolve) => {
    const req = http.request(url, { method, headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, text: d }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  let passed = 0, failed = 0;
  function assert(name, ok) {
    if (ok) { passed++; console.log('  PASS:', name); }
    else { failed++; console.error('  FAIL:', name); }
  }

  // Login
  let r = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'parent@example.com', password: 'parent123' }
  });
  const token = r.body?.token;
  const authG = { 'Authorization': 'Bearer ' + token };
  const auth = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // ─── Existing Admin (routes/admin/index.js) ───
  console.log('\n── Existing Admin ──');
  r = await request(ADMIN + '/config', { headers: authG }); assert('Config', r.body?.success);
  r = await request(ADMIN + '/orders', { headers: authG }); assert('Orders', r.body?.success);
  r = await request(ADMIN + '/tickets', { headers: authG }); assert('Tickets', r.body?.success);
  r = await request(ADMIN + '/analytics/dashboard', { headers: authG }); assert('Dashboard', r.body?.success);

  // ─── Admin Data: Users (admin/admin-routes.js) ───
  console.log('\n── Admin Data: Users ──');
  r = await request(DATA + '/users', { headers: authG });
  assert('List users ' + (r.body?.items?.length || 0) + ' items', Array.isArray(r.body?.items));
  r = await request(DATA + '/users', { method: 'POST', headers: auth, body: { name: 'Test', email: 't@t.com', role: 'parent' } });
  assert('Create user', r.body?.success);
  const nid = r.body?.user?.id || r.body?.data?.id;
  if (nid) {
    r = await request(DATA + '/users/' + nid, { method: 'PUT', headers: auth, body: { name: 'Upd' } }); assert('Update', r.body?.success);
    r = await request(DATA + '/users/' + nid, { method: 'DELETE', headers: auth }); assert('Delete', r.body?.success);
  }

  // ─── Admin Data: Devices ───
  console.log('\n── Admin Data: Devices ──');
  r = await request(DATA + '/devices', { headers: authG }); assert('List devices', Array.isArray(r.body?.items));
  r = await request(DATA + '/devices', { method: 'POST', headers: auth, body: { name: 'TestBot', model: 'Pro-X' } }); assert('Create device', r.body?.success);

  // ─── Admin Data: Content ───
  console.log('\n── Admin Data: Content ──');
  r = await request(DATA + '/content', { headers: authG }); assert('List content', Array.isArray(r.body?.items));
  r = await request(DATA + '/content/categories', { headers: authG }); assert('Categories', r.status < 500);
  r = await request(DATA + '/content', { method: 'POST', headers: auth, body: { title: 'Test', subject: 'math' } }); assert('Create content', r.body?.success);

  // ─── Admin Data: Products ───
  console.log('\n── Admin Data: Products ──');
  r = await request(DATA + '/products', { headers: authG }); assert('List products', Array.isArray(r.body?.items));
  r = await request(DATA + '/products', { method: 'POST', headers: auth, body: { name: 'TestP', price: 9.99 } }); assert('Create product', r.body?.success);

  // ─── Admin Data: Analytics (returns flat objects, no success) ───
  console.log('\n── Admin Data: Analytics ──');
  r = await request(DATA + '/analytics/dashboard', { headers: authG }); assert('Dashboard', typeof r.body?.totalVocabulary === 'number');
  r = await request(DATA + '/analytics/users', { headers: authG }); assert('Users analytics', typeof r.body?.total === 'number');
  r = await request(DATA + '/analytics/content', { headers: authG }); assert('Content analytics', r.body?.stats != null);
  r = await request(DATA + '/analytics/devices', { headers: authG }); assert('Devices analytics', typeof r.body?.total === 'number');
  r = await request(DATA + '/analytics/learning', { headers: authG }); assert('Learning analytics', typeof r.body?.totalRecords === 'number');

  // ─── Admin Data: Settings (returns flat object) ───
  console.log('\n── Admin Data: Settings ──');
  r = await request(DATA + '/settings', { headers: authG }); assert('Settings GET', r.status < 500);
  r = await request(DATA + '/settings', { method: 'PUT', headers: auth, body: { site_name: 'Test' } }); assert('Settings PUT', r.body?.success);

  // ─── Admin Data: Notifications ───
  console.log('\n── Admin Data: Notifications ──');
  r = await request(DATA + '/notifications/history', { headers: authG }); assert('Notifications history', Array.isArray(r.body?.items));
  r = await request(DATA + '/notifications/templates', { headers: authG }); assert('Notif templates', Array.isArray(r.body?.templates));

  // ─── Admin Data: Misc ───
  console.log('\n── Admin Data: Misc ──');
  r = await request(DATA + '/upgrade/status', { headers: authG }); assert('Upgrade status', Array.isArray(r.body?.upgrades));
  r = await request(DATA + '/features', { headers: authG }); assert('Features', typeof r.body?.total === 'number');
  r = await request(DATA + '/export/users', { headers: authG }); assert('Export', r.status === 200);

  // Summary
  console.log(`\n── ${passed + failed} tests: ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

app.listen(PORT, () => {
  console.log(`Admin test on port ${PORT}`);
  setTimeout(runTests, 700);
});
