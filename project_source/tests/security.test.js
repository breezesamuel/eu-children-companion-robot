// Security regression suite:
//  - helmet security headers are present
//  - seeded accounts authenticate against REAL bcrypt hashes
//  - the old hardcoded password backdoor is gone
//  - auth input validation rejects malformed payloads
//  - the global rate limiter actually engages (standard headers + 429)
//
// NOTE: env must be set BEFORE requiring the server, because the rate limiter
// reads its limits when the app is constructed.
const http = require('http');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.RATE_LIMIT_MAX = '15';
process.env.RATE_LIMIT_BURST = '0';
process.env.RATE_LIMIT_WINDOW = '60000';

const app = require('../server');
const PORT = parseInt(process.env.PORT || '3099');
const base = `http://localhost:${PORT}`;

function request(method, path, body) {
  return new Promise((resolve) => {
    const url = new URL(path, base);
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(url, opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
const get = (p) => request('GET', p);
const post = (p, b) => request('POST', p, b);

async function runTests() {
  let passed = 0;
  let failed = 0;
  const assert = (name, ok) => {
    if (ok) passed++;
    else { failed++; console.error(`  FAIL: ${name}`); }
  };

  const server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 300));

  try {
    // 1) helmet security headers
    const math = await get('/api/math/questions?count=1');
    assert('math endpoint responds 200', math.status === 200);
    assert('X-Content-Type-Options: nosniff', math.headers['x-content-type-options'] === 'nosniff');
    assert('X-Frame-Options: DENY', String(math.headers['x-frame-options']).toUpperCase() === 'DENY');
    assert('Referrer-Policy present', !!math.headers['referrer-policy']);
    assert('Permissions-Policy present', !!math.headers['permissions-policy']);
    assert('X-Powered-By hidden', !math.headers['x-powered-by']);

    // 1b) Internal docs must not be served, but real web assets still are
    const audit = await get('/SECURITY_AUDIT.md');
    assert('internal markdown is not served (404)', audit.status === 404);
    const asset = await get('/ai-chat.html');
    assert('web assets are still served (200)', asset.status === 200);

    // 2) Seed users authenticate against real bcrypt hashes
    const adminLogin = await post('/api/auth/login', { email: 'admin@robot.com', password: 'admin123' });
    assert('admin@robot.com / admin123 logs in', adminLogin.status === 200 && !!adminLogin.body.token);

    const parentLogin = await post('/api/auth/login', { email: 'parent@example.com', password: 'parent123' });
    assert('parent@example.com / parent123 logs in', parentLogin.status === 200 && !!parentLogin.body.token);

    // 3) The hardcoded backdoor must be gone (existing account + shared password)
    const back1 = await post('/api/auth/login', { email: 'admin@robot.com', password: '123456' });
    assert('backdoor password 123456 is rejected', back1.status === 401);
    const back2 = await post('/api/auth/login', { email: 'admin@robot.com', password: 'parent123' });
    assert("another account's password is rejected", back2.status === 401);
    const wrong = await post('/api/auth/login', { email: 'parent@example.com', password: 'nope-nope-nope' });
    assert('wrong password is rejected', wrong.status === 401);

    // 4) Input validation (express-validator)
    const badLogin = await post('/api/auth/login', { email: 'not-an-email', password: 'x' });
    assert('invalid email -> 400', badLogin.status === 400 && /validation/i.test(JSON.stringify(badLogin.body)));
    const badReg = await post('/api/auth/register', { email: 'bad', username: '', password: 'short' });
    assert('invalid register payload -> 400', badReg.status === 400);

    // 5) Global rate limiter engages (limit = RATE_LIMIT_MAX + BURST = 15)
    let saw429 = false;
    let sawStandardHeader = false;
    for (let i = 0; i < 40; i++) {
      const r = await get('/api/math/questions?count=1');
      if (r.headers['ratelimit-limit'] || r.headers['ratelimit']) sawStandardHeader = true;
      if (r.status === 429) { saw429 = true; break; }
    }
    assert('rate limiter returns 429 once the limit is hit', saw429);
    assert('standard RateLimit headers are exposed', sawStandardHeader);
  } catch (e) {
    failed++;
    console.error('  FAIL: unexpected error:', e.message);
  } finally {
    server.close();
  }

  console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
