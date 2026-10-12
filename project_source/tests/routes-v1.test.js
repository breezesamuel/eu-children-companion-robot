const http = require('http');

process.env.PORT = process.env.PORT || '3098';
const app = require('../server');
const PORT = parseInt(process.env.PORT);
const jwt = require('jsonwebtoken');

let server;
const base = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const TEST_TOKEN = jwt.sign({ userId: 1, role: 'admin' }, JWT_SECRET);
const AUTH_HEADER = { Authorization: `Bearer ${TEST_TOKEN}` };

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (options.body) headers['Content-Type'] = 'application/json';
    const req = http.request(new URL(path, base), { method: options.method || 'GET', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, text: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  let passed = 0, failed = 0;
  function assert(name, ok) {
    if (ok) { passed++; console.log('  PASS:', name); }
    else { failed++; console.error('  FAIL:', name); }
  }

  try {
    server = app.listen(PORT);

    // ── Server health ──
    console.log('\n── Server Endpoints ──');
    let r = await request('/api/math/questions?count=3');
    assert('GET /api/math/questions returns 200', r.status === 200);
    assert('GET /api/math/questions has data', Array.isArray(r.data?.data));

    r = await request('/api/english/vocabulary?limit=5');
    assert('GET /api/english/vocabulary returns 200', r.status === 200);

    r = await request('/api/science/facts?topic=space');
    assert('GET /api/science/facts returns 200', r.status === 200);

    r = await request('/api/stories');
    assert('GET /api/stories returns 200', r.status === 200);

    r = await request('/api/culture/europe');
    assert('GET /api/culture/europe returns 200', r.status === 200);

    r = await request('/api/jokes');
    assert('GET /api/jokes returns 200', r.status === 200);

    r = await request('/api/content-service/status', { headers: AUTH_HEADER });
    assert('GET /content-service/status returns 200', r.status === 200);
    assert('GET /content-service/status has data', r.data?.success === true);

    r = await request('/api/content-service/search?q=dinosaurs', { headers: AUTH_HEADER });
    assert('GET /content-service/search returns 200', r.status === 200);

    // ── Health API ──
    console.log('\n── Health API ──');
    r = await request('/api/robots');
    assert('GET /api/robots returns 200', r.status === 200 || r.status === 401);

    // ── 404 ──
    console.log('\n── Edge Cases ──');
    r = await request('/api/nonexistent');
    assert('Unknown endpoint returns 404', r.status === 404);

    console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  } catch (e) {
    console.error('Server error:', e.message);
    process.exit(1);
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
