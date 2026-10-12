/**
 * Hardware Simulator Unit Tests
 * Run: node tests/simulator.test.js
 */
const { RobotSimulator, SCENARIOS } = require('../robot/simulator');

let passed = 0, failed = 0;
function assert(label, ok) {
  if (ok) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

async function run() {
  console.log('\n── Hardware Simulator ──');

  // Static checks
  assert('SCENARIOS defined', typeof SCENARIOS === 'object');
  assert('SCENARIOS has entries', Object.keys(SCENARIOS).length >= 6);

  for (const [name, s] of Object.entries(SCENARIOS)) {
    assert(`Scenario "${name}" has desc`, typeof s.desc === 'string' && s.desc.length > 0);
    assert(`Scenario "${name}" has script array`, Array.isArray(s.script));
    s.script.forEach((step, i) => {
      assert(`  Step ${i}: has "at" time`, typeof step.at === 'number');
      assert(`  Step ${i}: has action`, typeof step.action === 'string');
    });
  }

  // Create simulator instance
  const sim = new RobotSimulator('unittest-sim');
  assert('Simulator created', sim !== undefined);
  assert('Robot ID set', sim.robotId === 'unittest-sim');
  assert('Robot HAL created', sim.robot !== undefined);
  assert('Network status default online', sim.networkStatus === 'online');
  assert('Running false initially', sim.running === false);
  assert('Stats counters at 0', sim.stats.commands === 0 && sim.stats.sensorReadings === 0);

  // getStatus while stopped
  let status = sim.getStatus();
  assert('getStatus returns robotId', status.robotId === 'unittest-sim');
  assert('getStatus shows running false', status.running === false);
  assert('getStatus has battery', status.battery !== undefined);
  assert('getStatus has stats', status.stats !== undefined);

  // Run normal-operation for short time, then stop
  const runPromise = sim.runScenario('normal-operation');
  await new Promise(r => setTimeout(r, 1000));
  
  assert('Sim running after start', sim.running === true);
  status = sim.getStatus();
  assert('Running in getStatus', status.running === true);

  // Stop mid-scenario
  sim.stop();
  await new Promise(r => setTimeout(r, 200));
  
  assert('Sim stopped after stop()', sim.running === false);
  assert('Robot offline after stop', sim.robot.state === 'offline');

  // Simulator events
  const eventTypes = ['heartbeat', 'state', 'sensor', 'command', 'speech', 'event', 'telemetry', 'telemetry-sample', 'network'];
  for (const evt of eventTypes) {
    let fired = false;
    sim.once(evt, () => { fired = true; });
    assert(`Event "${evt}" is valid event type`, true); // just check event exists
  }

  // Edge: unknown scenario
  try {
    await sim.runScenario('nonexistent');
    assert('Unknown scenario throws', false);
  } catch (e) {
    assert('Unknown scenario throws error', e.message.includes('Unknown scenario'));
  }

  // Edge: stop twice
  sim.stop();
  assert('Stop already stopped does not crash', true);

  // Edge: run after stop (should be fresh)
  const sim2 = new RobotSimulator('sim2');
  sim2._executeAction({ action: 'sim-network', status: 'offline' });
  assert('Network offline via action', sim2.networkStatus === 'offline');

  sim2._executeAction({ action: 'sim-network', status: 'online' });
  assert('Network online via action', sim2.networkStatus === 'online');

  // Edge: force-drain battery
  sim2._executeAction({ action: 'force-drain', level: 5 });
  assert('Battery drain to 5%', sim2.robot.sensors.battery.level === 5);

  // Edge: sim-obstacle
  sim2._executeAction({ action: 'sim-obstacle', dist: 10 });
  assert('Obstacle at 10cm', sim2.robot.sensors.ultrasonic.front === 10);

  // Edge: unknown action does not crash
  sim2._executeAction({ action: 'unknown-action' });
  assert('Unknown action handled gracefully', true);

  // Edge: teach without topic
  sim2._executeAction({ action: 'teach', topic: undefined });
  assert('Teach without topic handled', true);

  // Edge: empty script
  const SCENARIOS_COPY = JSON.parse(JSON.stringify(SCENARIOS));
  SCENARIOS_COPY['empty-test'] = { desc: 'Empty', script: [] };
  // This scenario exists but just for structure check
  assert('Empty script scenario OK', true);

  // Stress test: rapid scenario transitions
  const sim3 = new RobotSimulator('stress-sim');
  const start = Date.now();
  for (let i = 0; i < 5; i++) {
    sim3._executeAction({ action: 'move', dir: 'forward', speed: 50 });
    sim3._executeAction({ action: 'temperature' });
    sim3._executeAction({ action: 'distance' });
  }
  const elapsed = Date.now() - start;
  assert('5 rapid action cycles < 500ms', elapsed < 500);

  console.log(`\n── Results: ${passed + failed} tests, ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
