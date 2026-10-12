const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_DIR = __dirname;
const RESULTS = {};

const TESTS = [
  { name: 'Admin Routes', file: 'admin-routes.test.js', timeout: 45000 },
  { name: 'API v1 Routes', file: 'routes-v1.test.js', timeout: 45000 },
  { name: 'API Original', file: 'api.test.js', timeout: 30000 },
  { name: 'Hardware Manager', file: 'hardware-manager.test.js', timeout: 15000 },
  { name: 'Hardware Simulator', file: 'simulator.test.js', timeout: 15000 },
  { name: 'Content Service', file: 'content-service.test.js', timeout: 15000 },
  { name: 'AI Service', file: 'ai.test.js', timeout: 15000 },
  { name: 'TTS Service', file: 'tts.test.js', timeout: 15000 },
  { name: 'Watchdog', file: 'watchdog.test.js', timeout: 15000 },
  { name: 'Server Basic', file: 'server.test.js', timeout: 15000 },
  { name: 'Security', file: 'security.test.js', timeout: 20000 },
  { name: 'Database', file: 'database.test.js', timeout: 15000 },
];

let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;

function pad(s, n) { return String(s).padEnd(n); }

function runTest(test) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn('node', [test.file], {
      cwd: TEST_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: test.timeout,
      env: { ...process.env, PORT: String(3099 + Math.floor(Math.random() * 100)) },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    function finish(code, signal) {
      if (settled) return;
      settled = true;

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const passedMatch = stdout.match(/(\d+)\s*passed/);
      const failedMatch = stdout.match(/(\d+)\s*failed/);
      const runMatch = stdout.match(/(\d+)\s*\/\s*(\d+)/);

      let passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      let failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      let total = runMatch ? parseInt(runMatch[2]) : (passed + failed);

      // A suite that crashed or was killed before reporting must NOT be silently
      // treated as passing. Attribute at least one failure so the summary is honest.
      if ((code !== 0 || signal != null) && failed === 0) {
        failed = Math.max(1, total - passed);
      }

      const status = (code === 0 && signal == null) ? 'PASS' : 'FAIL';
      const shownTotal = total || (passed + failed);
      RESULTS[test.name] = { status, passed, failed, total: shownTotal, elapsed, code, signal };
      totalPassed += passed;
      totalFailed += failed;
      totalTests += shownTotal;

      const icon = status === 'PASS' ? '\u2713' : '\u2717';
      const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      process.stdout.write(`  ${color}${icon}${reset} ${pad(test.name, 22)} ${pad(passed + '/' + shownTotal, 12)} passed  ${elapsed}s  (exit ${code}${signal ? '/' + signal : ''})\n`);
      resolve();
    }

    // 'exit' fires as soon as the process ends. 'close' additionally waits for the stdio
    // pipes to close, which lingering grandchild processes can hold open on Windows —
    // that used to make suites appear to "hang" and get killed at the timeout.
    child.on('exit', (code, signal) => {
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (e) { /* already gone */ }
        finish(code, signal);
      }, 300);
    });
    child.on('close', (code) => finish(code, null));

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      process.stdout.write(`  \x1b[31m\u2717\x1b[0m ${pad(test.name, 22)} SPAWN ERROR: ${err.message}\n`);
      RESULTS[test.name] = { status: 'ERROR', passed: 0, failed: 1, total: 1, elapsed: '0.0', error: err.message };
      totalFailed += 1;
      totalTests += 1;
      resolve();
    });
  });
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  ROBOT COMPANION — INTEGRATION TEST SUITE');
  console.log('='.repeat(60));
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log(`  CWD: ${TEST_DIR}`);
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();

  for (const test of TESTS) {
    await runTest(test);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total test suites:  ${TESTS.length}`);
  console.log(`  Total test cases:   ${totalTests}`);
  console.log(`  Total passed:       ${totalPassed}`);
  console.log(`  Total failed:       ${totalFailed}`);
  console.log(`  Duration:           ${elapsed}s`);
  console.log('');

  let maxNameLen = Math.max(...TESTS.map(t => t.name.length));
  for (const test of TESTS) {
    const r = RESULTS[test.name];
    const icon = r.status === 'PASS' ? '\u2713' : r.status === 'FAIL' ? '\u2717' : '!';
    const color = r.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    const pc = r.passed !== undefined ? r.passed : 0;
    const tc = r.total !== undefined ? r.total : 0;
    const el = r.elapsed || '?';
    console.log(`  ${color}${icon}${reset} ${pad(test.name, maxNameLen + 2)} ${pad(pc + '/' + tc, 12)} ${el}s`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  ${totalFailed > 0 ? '\x1b[31m' + totalFailed + ' FAILURES\x1b[0m' : '\x1b[32mALL PASSED\x1b[0m'}`);
  console.log('='.repeat(60) + '\n');

  // Write results to JSON
  const report = {
    timestamp: new Date().toISOString(),
    suites: TESTS.length,
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    duration: elapsed,
    results: RESULTS,
  };
  fs.writeFileSync(path.join(TEST_DIR, 'test-report.json'), JSON.stringify(report, null, 2));
  console.log('  Report saved to tests/test-report.json\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
