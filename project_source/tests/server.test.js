const http = require('http');
const app = require('../server');

let server;
const PORT = process.env.PORT || 3097;
const base = `http://localhost:${PORT}`;

async function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`${base}${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
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

    const math = await fetch('/api/math/questions?count=3');
    assert(math.status === 200, 'math endpoint status');
    assert(math.body?.data?.length === 3, 'math questions count');

    const geo = await fetch('/api/geometry/shapes');
    assert(geo.status === 200, 'geometry endpoint status');
    assert(geo.body?.data?.['2d']?.length > 0, 'geometry 2d shapes');

    const vocab = await fetch('/api/english/vocabulary?limit=5');
    assert(vocab.status === 200, 'vocabulary endpoint status');
    assert(vocab.body?.data?.length <= 5, 'vocabulary limit');

    const sci = await fetch('/api/science/facts?topic=space');
    assert(sci.status === 200, 'science endpoint status');
    assert(sci.body?.data?.length > 0, 'science facts count');

    const stories = await fetch('/api/stories');
    assert(stories.status === 200, 'stories endpoint status');
    assert(stories.body?.data?.length > 0, 'stories count');

    const culture = await fetch('/api/culture/europe');
    assert(culture.status === 200, 'culture endpoint status');
    assert(culture.body?.data?.length > 0, 'culture countries count');

    const jokes = await fetch('/api/jokes');
    assert(jokes.status === 200, 'jokes endpoint status');

    const notFound = await fetch('/api/nonexistent');
    assert(notFound.status === 404, '404 for unknown endpoint');

    console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  } catch (e) {
    console.error(`Server error: ${e.message}`);
    process.exit(1);
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
