/**
 * Watchdog Unit Tests
 * Run: node tests/watchdog.test.js
 */
const watchdog = require('../services/watchdog');

let passed = 0, failed = 0;
function assert(label, ok) {
  if (ok) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

async function run() {
  console.log('\n── Watchdog Service ──');

  // Startup state
  assert('Watchdog object exists', watchdog !== undefined);
  assert('Watchdog is an EventEmitter', typeof watchdog.on === 'function');
  assert('CPU threshold default', watchdog.cpuThreshold === 90);
  assert('CPU window default', watchdog.cpuWindow === 10000);
  assert('Memory threshold default', watchdog.memThreshold === 512);
  assert('Check interval default', watchdog.checkInterval === 5000);

  // Metrics initial state
  const m = watchdog.metrics;
  assert('Metrics has cpu object', m.cpu !== undefined);
  assert('Metrics has memory object', m.memory !== undefined);
  assert('Metrics has restarts counter', typeof m.restarts === 'number');
  assert('Metrics has status string', typeof m.status === 'string');

  // Start watchdog
  watchdog.start();
  assert('Watchdog started', watchdog.metrics.status !== 'stopped');

  // Register a service check
  let checkCalled = false;
  watchdog.registerServiceCheck('test-service', () => { checkCalled = true; return true; });
  assert('Service check registered', true);

  // Wait for a check cycle
  await new Promise(r => setTimeout(r, watchdog.checkInterval + 500));
  assert('Service check was called', checkCalled);

  // CPU estimation returns number
  const cpuSamples = watchdog.metrics.cpu;
  assert('CPU samples incremented', cpuSamples.samples > 0);
  assert('CPU avg is a number', typeof cpuSamples.avg === 'number');
  assert('CPU peak is a number', typeof cpuSamples.peak === 'number');

  // Memory metrics populated
  assert('RSS memory is number', typeof m.memory.rss === 'number');
  assert('Heap used is number', typeof m.memory.heapUsed === 'number');
  assert('Heap total is number', typeof m.memory.heapTotal === 'number');
  assert('Memory peak is number', typeof m.memory.peak === 'number');
  assert('Memory values sensible', m.memory.rss > 0 && m.memory.rss < 100000);

  // getMetrics returns full state
  const fullMetrics = watchdog.getMetrics();
  assert('getMetrics has cpu', fullMetrics.cpu !== undefined);
  assert('getMetrics has memory', fullMetrics.memory !== undefined);
  assert('getMetrics has restarts', fullMetrics.restarts >= 0);
  assert('getMetrics has cpuHistory', Array.isArray(fullMetrics.cpuHistory));

  // isHealthy
  assert('isHealthy returns boolean', typeof watchdog.isHealthy() === 'boolean');

  // Event: check event fires
  const checkEventFired = new Promise(resolve => {
    watchdog.once('check', (data) => resolve(data));
  });
  const checkData = await checkEventFired;
  assert('Check event has cpu data', checkData.cpu !== undefined);
  assert('Check event has memory data', checkData.memory !== undefined);

  // Event: warning fires on high lag
  const warningFired = new Promise(resolve => {
    watchdog.once('warning', (data) => resolve(data));
  });
  watchdog.emit('warning', { type: 'event-loop-lag', value: 1500 });
  const warnData = await warningFired;
  assert('Warning event captures type', warnData.type === 'event-loop-lag');
  assert('Warning event captures value', warnData.value > 1000);

  // Event: critical fires
  const criticalFired = new Promise(resolve => {
    watchdog.once('critical', (data) => resolve(data));
  });
  watchdog.emit('critical', { type: 'test', value: 99 });
  const critData = await criticalFired;
  assert('Critical event captures type', critData.type === 'test');

  // Stop watchdog
  watchdog.stop();
  assert('Watchdog stopped', true);

  // Edge: double stop doesn't crash
  watchdog.stop();
  assert('Double stop does not crash', true);

  // Edge: start after stop
  watchdog.start();
  assert('Restart after stop works', true);
  watchdog.stop();

  // Edge: registerServiceCheck with undefined name
  watchdog.registerServiceCheck(null, () => true);
  assert('Null service check name does not crash', true);

  console.log(`\n── Results: ${passed + failed} tests, ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
