// Crawl ourteacher.cc: performs both render + crawl, reports results
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3099;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:${PORT}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let r = '';
      res.on('data', c => r += c);
      res.on('end', () => { try { resolve(JSON.parse(r)); } catch(e) { resolve({ raw: r }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function del(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${PORT}${path}`, { method: 'DELETE' }, (res) => {
      let r = '';
      res.on('data', c => r += c);
      res.on('end', () => { try { resolve(JSON.parse(r)); } catch(e) { resolve({ raw: r }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); } });
    }).on('error', reject);
  });
}

async function waitForServer(maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try { await get('/api/ourteacher/stats'); return true; } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('=== Starting server ===');
  const env = { ...process.env, PORT: String(PORT) };
  const child = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => { /* suppress */ });
  child.stderr.on('data', d => { /* suppress */ });
  child.on('exit', (c) => { if (c) console.log('Server exited:', c); });

  if (!await waitForServer(30000)) {
    console.log('FAIL: server did not start');
    child.kill();
    process.exit(1);
  }
  console.log('Server ready on port', PORT);

  // Clear previous
  await del('/api/ourteacher/results');
  console.log('Cleared previous results');

  // ── Step 1: Render Home page ──
  console.log('\n--- Step 1: Render https://www.ourteacher.cc/ ---');
  let r = await post('/api/ourteacher/render', { url: 'https://www.ourteacher.cc/' });
  if (r.success) {
    console.log('  Title:', r.data.title);
    console.log('  Content length:', r.data.textLength, 'chars');
    console.log('  Links found:', r.data.linksFound);
    console.log('  Ingested to engine:', r.data.ingested);
  } else {
    console.log('  FAIL:', r.error);
  }

  // ── Step 2: Render /download page ──
  console.log('\n--- Step 2: Render https://www.ourteacher.cc/download ---');
  r = await post('/api/ourteacher/render', { url: 'https://www.ourteacher.cc/download' });
  if (r.success) {
    console.log('  Title:', r.data.title);
    console.log('  Content length:', r.data.textLength, 'chars');
    console.log('  Links found:', r.data.linksFound);
    console.log('  Ingested to engine:', r.data.ingested);
  } else {
    console.log('  FAIL:', r.error);
  }

  // ── Step 3: Full crawl of all targets ──
  console.log('\n--- Step 3: Full crawl all targets ---');
  r = await post('/api/ourteacher/crawl', { target: 'OurTeacher' });
  if (r.success) {
    console.log('  Pages crawled:', r.data.pages);
    for (const res of r.data.results) {
      console.log('  Target:', res.target, '- found:', res.pagesFound, '- extracted:', res.pagesExtracted, '- ingested:', res.ingested, res.error ? '- ERROR: ' + res.error : '');
    }
  } else {
    console.log('  FAIL:', r.error);
  }

  // ── Step 4: Final stats ──
  console.log('\n--- Final Stats ---');
  const stats = await get('/api/ourteacher/stats');
  console.log('  Pages in DB:', stats.data?.pagesInDb);
  console.log('  Total scraped:', stats.data?.totalScraped);
  console.log('  Last crawl:', stats.data?.lastCrawl);

  const results = await get('/api/ourteacher/results?limit=10');
  console.log('\n--- Scraped Content Preview ---');
  for (const p of (results.data || [])) {
    console.log('  [' + (p.title || 'no title') + '] ' + (p.text ? p.text.substring(0, 120).replace(/\n/g, ' ') : '') + '...');
  }

  console.log('\n=== Done ===');
  child.kill();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });