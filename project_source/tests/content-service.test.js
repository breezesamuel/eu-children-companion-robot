const http = require('http');
const app = require('../server');
const jwt = require('jsonwebtoken');

let server;
const PORT = process.env.PORT || 3096;
const base = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const TEST_TOKEN = jwt.sign({ userId: 1, role: 'admin' }, JWT_SECRET);

async function fetch(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${base}${path}`, { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error(`  FAIL: ${msg}`); }
  }

  try {
    server = app.listen(PORT);
    await new Promise(r => setTimeout(r, 200));

    const status = await fetch('/api/content-service/status');
    assert(status.status === 200, 'status endpoint returns 200');
    assert(status.body?.success === true, 'status has success=true');

    const search = await fetch('/api/content-service/search?q=dinosaurs');
    assert(search.status === 200, 'search endpoint returns 200');

    const categories = await fetch('/api/content-service/categories');
    assert(categories.status === 200, 'categories endpoint returns 200');
    assert(Array.isArray(categories.body?.categories), 'categories has array');

    const searchEmpty = await fetch('/api/content-service/search?q=');
    assert(searchEmpty.status === 200, 'empty search returns 200');

    const searchNone = await fetch('/api/content-service/search?q=xyznonexistent999');
    assert(searchNone.status === 200, 'no-match search returns 200');

    console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  } catch (e) {
    console.error('Server error:', e.message);
    process.exit(1);
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
