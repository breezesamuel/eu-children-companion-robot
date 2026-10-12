const http = require('http');

process.env.PORT = process.env.PORT || '3099';
const app = require('../server');
const PORT = parseInt(process.env.PORT);

let server;
let token;
const base = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  const url = new URL(path, base);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body ? JSON.stringify(options.body) : undefined;

  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } else {
            resolve({ status: res.statusCode, text: data });
          }
        } catch (e) {
          resolve({ status: res.statusCode, text: data, parseError: e.message });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) { passed++; console.log('  PASS:', name); }
    else { failed++; console.error('  FAIL:', name); }
  }

  // 1. Public endpoints
  console.log('\n── Public Endpoints ──');
  let r = await request('/api/health');
  assert('Health check', r.data?.status === 'healthy');

  r = await request('/api/products');
  assert('Product list (7 items)', r.data?.data?.length === 7);

  r = await request('/api/products?type=device');
  assert('Device filter (3 items)', r.data?.data?.length === 3);

  r = await request('/api/products/pricing/plans');
  assert('Pricing page', r.data?.data?.devices?.length === 3);

  r = await request('/api/products/features/list');
  assert('Features (6 items)', r.data?.data?.length === 6);

  r = await request('/api/support/faq');
  assert('FAQ (6 items)', r.data?.data?.length === 6);

  r = await request('/api/metrics');
  assert('Metrics endpoint', (r.text || '').length > 100);

  // 2. Auth
  console.log('\n── Authentication ──');
  r = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'parent@example.com', password: 'parent123' }
  });
  assert('Login success', !!r.data?.token);
  token = r.data?.token;

  const auth = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 3. Protected endpoints
  console.log('\n── Protected Endpoints ──');
  r = await request('/api/storefront/dashboard', { headers: auth });
  assert('Customer dashboard', r.data?.success);

  r = await request('/api/gdpr/consent', { headers: auth });
  assert('GDPR consent', r.data?.success);

  r = await request('/api/gdpr/export', { method: 'POST', headers: auth });
  assert('GDPR export', r.data?.success);

  r = await request('/api/agents', { headers: auth });
  assert('Agent list', r.data?.data?.length >= 3);

  r = await request('/api/agents/chat', {
    method: 'POST', headers: auth,
    body: { message: 'Compare Basic vs Premium', agentType: 'sales' }
  });
  assert('Agent chat reply', r.data?.success && !!r.data?.data?.reply);

  r = await request('/api/support/tickets', {
    method: 'POST', headers: auth,
    body: { subject: 'Test', message: 'Test issue', priority: 'low', category: 'general' }
  });
  assert('Create support ticket', r.data?.success);

  r = await request('/api/support/tickets', { headers: auth });
  assert('List support tickets', r.data?.success);

  r = await request('/api/orders/my', { headers: auth });
  assert('List orders', r.data?.success);

  r = await request('/api/subscriptions/my', { headers: auth });
  assert('List subscriptions', r.data?.success);

  r = await request('/api/admin/analytics/dashboard', { headers: auth });
  assert('Admin analytics dashboard', r.data?.success);

  r = await request('/api/admin/config', { headers: auth });
  assert('Admin config', r.data?.success);

  r = await request('/api/orders/create-checkout', {
    method: 'POST', headers: auth,
    body: { items: [{ productId: 'robot-premium', quantity: 1 }] }
  });
  assert('Create checkout session', r.data?.success);

  // 4. Agent sessions
  r = await request('/api/agents/sessions', { method: 'POST', headers: auth, body: { title: 'Test session' } });
  assert('Create agent session', r.data?.success);

  r = await request('/api/agents/sessions', { headers: auth });
  assert('List agent sessions', r.data?.success);

  // 5. Voice Chat
  console.log('\n── Voice Chat ──');
  r = await request('/api/voice-chat/status');
  assert('Voice chat status', r.data?.success && typeof r.data?.vocabulary === 'number');
  r = await request('/api/voice-chat/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { message: 'hello' }
  });
  assert('Voice chat greeting', r.data?.success && !!r.data?.reply);
  r = await request('/api/voice-chat/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { message: '教我单词' }
  });
  assert('Voice chat vocab', r.data?.success && !!r.data?.reply);

  // 6. Unified Learning - English Modules
  console.log('\n── Unified Learning (English Modules) ──');
  r = await request('/api/learn/english/vocabulary?count=3');
  assert('English vocabulary', r.data?.success && r.data?.data?.length === 3);
  r = await request('/api/learn/english/grammar');
  assert('English grammar', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/speaking');
  assert('English speaking', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/writing');
  assert('English writing', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/reading');
  assert('English reading', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/spelling');
  assert('English spelling', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/spelling?level=C2');
  assert('English spelling C2', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/spelling?level=TOEFL');
  assert('English spelling TOEFL', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/spelling?level=IELTS');
  assert('English spelling IELTS', r.data?.success && r.data?.data?.length > 0);
  r = await request('/api/learn/english/search?query=brave');
  assert('English search', r.data?.success && Array.isArray(r.data?.data));
  r = await request('/api/learn/english/all');
  assert('English all summary', r.data?.success && r.data?.data?.vocabulary > 0);

  // 7. Agent Scraper Endpoints
  console.log('\n── Agent Scraper ──');
  r = await request('/api/agent-scraper/stats');
  assert('Scraper stats', r.data?.success && typeof r.data?.data?.total === 'number');
  r = await request('/api/agent-scraper/history?limit=5');
  assert('Scraper history', r.data?.success && Array.isArray(r.data?.data));
  r = await request('/api/agent-scraper/categories');
  assert('Scraper categories', r.data?.success && typeof r.data?.data === 'object');
  r = await request('/api/agent-scraper/ratings');
  assert('Scraper ratings', r.data?.success && Array.isArray(r.data?.data));

  // 8. Learning endpoints
  console.log('\n── Learning Engine ──');
  r = await request('/api/learn/vocabulary?count=5');
  assert('Vocabulary', r.data?.success && r.data?.data?.length === 5);
  r = await request('/api/learn/explore');
  assert('Content explore', r.data?.success);
  r = await request('/api/learn/scraped?limit=3');
  assert('Scraped content', r.data?.success);
  r = await request('/api/learn/types');
  assert('Content types', r.data?.success && r.data?.data?.length > 0);

  // Summary
  const total = passed + failed;
  console.log(`\n── Results: ${passed}/${total} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

server = app.listen(PORT, () => {
  console.log(`Test server on port ${PORT}`);
  runTests();
});
