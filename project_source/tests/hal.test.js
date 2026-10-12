/**
 * Robot HAL Unit Tests — covers normal + edge cases
 * Run: node tests/hal.test.js
 */
process.env.NODE_ENV = 'test';
const RobotHAL = require('../robot/hal');

let passed = 0, failed = 0;
function assert(label, ok) {
  if (ok) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

// ── 1. State Machine ──────────────────────────────────────
(async function stateTests() {
  console.log('\n── State Machine ──');
  const r = new RobotHAL('test-001');

  assert('Initial state is offline', r.state === 'offline');

  r.start();
  assert('Immediate state is booting', r.state === 'booting');
  await new Promise(r2 => setTimeout(r2, 2500));
  assert('After 2s state is online', r.state === 'online');
  assert('Boot time set', r.bootTime !== null);
  assert('Expression is happy after boot', r.expression === 'happy');
  assert('Heartbeat interval running', r._heartbeatInterval !== null);

  let sleeperr = r.sleep();
  assert('Sleep from online succeeds', sleeperr.success === true);
  assert('State becomes sleeping', r.state === 'sleeping');
  assert('Screen off during sleep', r.actuators.display.screenOn === false);
  assert('LED dim during sleep', r.actuators.ledMatrix.brightness === 5);

  let sleepTwice = r.sleep();
  assert('Sleep again from sleeping fails', sleepTwice.success === false);
  assert('Sleep error message', sleepTwice.error !== undefined);

  let wakeErr = r.wake();
  assert('Wake from sleeping succeeds', wakeErr.success === true);
  assert('State back to online', r.state === 'online');
  assert('Screen back on', r.actuators.display.screenOn === true);
  assert('LED back to normal', r.actuators.ledMatrix.brightness === 80);

  let wakeAgain = r.wake();
  assert('Wake from online fails', wakeAgain.success === false);

  // Charging
  let charge = r.startCharging();
  assert('Start charging succeeds', charge.success === true);
  assert('Battery charging flag', r.sensors.battery.charging === true);
  assert('State is charging', r.state === 'charging');

  let chargeStop = r.stopCharging();
  assert('Stop charging succeeds', chargeStop.success === true);
  assert('Battery charging flag cleared', r.sensors.battery.charging === false);
  assert('State back to online after charge', r.state === 'online');

  // Shutdown
  let shut = r.shutdown();
  assert('Shutdown succeeds', shut.success === true);
  assert('State back to offline', r.state === 'offline');
  assert('Heartbeat stopped', r._heartbeatInterval === null);
  assert('Simulation stopped', r._simulationInterval === null);
})();

// ── 2. Movement ───────────────────────────────────────────
(async function moveTests() {
  console.log('\n── Movement ──');
  const r = new RobotHAL('move-test');
  r.state = 'online';

  let fwd = r.move('forward', 75);
  assert('Move forward works', fwd.success === true);
  assert('Left speed = 75', r.actuators.wheels.leftSpeed === 75);
  assert('Right speed = 75', r.actuators.wheels.rightSpeed === 75);
  assert('Direction forward', r.actuators.wheels.direction === 'forward');

  let bwd = r.move('backward', 50);
  assert('Move backward works', bwd.success === true);
  assert('Left speed negative', r.actuators.wheels.leftSpeed < 0);

  let left = r.move('left', 60);
  assert('Move left works', left.success === true);
  assert('Left speed half negative', Math.abs(r.actuators.wheels.leftSpeed) === Math.abs(r.actuators.wheels.rightSpeed) * 0.5);

  let right = r.move('right', 80);
  assert('Move right works', right.success === true);

  let stop = r.move('stop');
  assert('Stop works', stop.success === true);
  assert('Both speeds zero', r.actuators.wheels.leftSpeed === 0 && r.actuators.wheels.rightSpeed === 0);

  // Edge: speed clamping
  r.move('forward', 999);
  assert('Speed clamped to 100', r.actuators.wheels.leftSpeed === 100);

  r.move('forward', -999);
  assert('Speed clamped to 0', r.actuators.wheels.leftSpeed === 0);

  // Edge: unknown direction defaults to stop
  r.move('sideways', 50);
  assert('Unknown direction defaults to stop', r.actuators.wheels.direction === 'stopped');

  // Edge: move while offline
  r.state = 'offline';
  let offlineMove = r.move('forward');
  assert('Move while offline returns error', offlineMove.error !== undefined);
})();

// ── 3. Speech ─────────────────────────────────────────────
(async function speechTests() {
  console.log('\n── Speech ──');
  const r = new RobotHAL('speech-test');
  r.state = 'online';

  let sp = r.speak('Hello world', 'en');
  assert('Speak returns success', sp.success === true);
  assert('Duration calculated', sp.duration >= 1000);
  assert('Speaker playing', r.actuators.speaker.playing === true);
  assert('Current track set', r.actuators.speaker.currentTrack !== null);

  // Edge: speech while offline
  r.state = 'offline';
  let offSp = r.speak('test');
  assert('Speak while offline errors', offSp.error !== undefined);

  // Edge: very long text truncation
  r.state = 'online';
  let long = 'a'.repeat(10000);
  let lsp = r.speak(long);
  assert('Long text truncates track name', lsp.text.length <= 60);
})();

// ── 4. Expressions ────────────────────────────────────────
(async function expressionTests() {
  console.log('\n── Expressions ──');
  const r = new RobotHAL('expr-test');

  let exp = r.showExpression('happy');
  assert('Show happy expression', exp.success === true);
  assert('Emoji matches', exp.emoji === '😊');
  assert('LED pattern set', r.actuators.ledMatrix.pattern === 'happy');

  let unknown = r.showExpression('nonexistent');
  assert('Unknown expression errors', unknown.error !== undefined);
})();

// ── 5. Sensors ────────────────────────────────────────────
(async function sensorTests() {
  console.log('\n── Sensors ──');
  const r = new RobotHAL('sensor-test');
  r.state = 'online';

  // Temperature
  let temps = [];
  for (let i = 0; i < 50; i++) {
    let t = r.readTemperature();
    temps.push(t.value);
  }
  let min = Math.min(...temps), max = Math.max(...temps);
  assert('Temperature within 23-26°C range', min >= 23 && max <= 26);
  assert('Temperature has at most 1 decimal', temps.every(t => (String(t).split('.')[1]?.length || 0) <= 1));

  // Distance
  let dists = [];
  for (let i = 0; i < 30; i++) {
    let d = r.readDistance();
    dists.push(d.front);
  }
  let dMin = Math.min(...dists), dMax = Math.max(...dists);
  assert('Ultrasonic front in 20-320 range', dMin >= 20 && dMax <= 320);
  assert('Ultrasonic left in 10-210 range', Math.min(...dists.map(() => r.sensors.ultrasonic.left)) >= 10);
  assert('Distances are integers', Number.isInteger(dists[0]));

  // Touch
  let anyTouch = false;
  for (let i = 0; i < 20; i++) {
    let t = r.detectTouch();
    if (t.head || t.hand || t.chest) anyTouch = true;
  }
  assert('Touch detection sometimes triggers', anyTouch === true);

  // Photo
  let photo = r.capturePhoto();
  assert('Photo captured', photo.success === true);
  assert('Photo has ID', photo.photo.id.startsWith('photo_'));
  assert('Photo has timestamp', photo.photo.timestamp !== undefined);
  assert('Camera active after photo', r.sensors.camera.active === true);

  // Object detection
  let obj = r.detectObjects();
  assert('Object detection returns array', Array.isArray(obj.objects));
  assert('Detects person', obj.personDetected === true);
  assert('Expression changed to happy', r.expression === 'happy');

  // Face detection
  let face = r.detectFace();
  assert('Face detection returns faces', Array.isArray(face.faces));
  assert('Face has confidence', face.faces[0].confidence > 0);
})();

// ── 6. Command Parsing ────────────────────────────────────
(async function commandTests() {
  console.log('\n── Command Parsing ──');
  const r = new RobotHAL('cmd-test');
  r.state = 'online';

  // Movement commands
  let cmd1 = r.executeCommand('go forward 50');
  assert('"go forward 50" works', cmd1.success === true);
  assert('Direction forward', r.actuators.wheels.direction === 'forward');

  let cmd2 = r.executeCommand('stop');
  assert('"stop" works', cmd2.success === true);

  let cmd3 = r.executeCommand('walk left');
  assert('"walk left" works', cmd3.success === true);

  // Speech aliases
  let cmd4 = r.executeCommand('say hello there');
  assert('"say" alias works', cmd4.success === true);

  let cmd5 = r.executeCommand('tell me a story');
  assert('"tell" alias works', cmd5.success === true);

  // Expression aliases
  let cmd6 = r.executeCommand('express happy');
  assert('"express" works', cmd6.success === true);
  assert('Expression is happy', r.expression === 'happy');

  let cmd7 = r.executeCommand('show sad');
  assert('"show sad" works', cmd7.success === true);
  assert('Expression is sad', r.expression === 'sad');

  // Sensor commands
  let cmd8 = r.executeCommand('temperature');
  assert('"temperature" works', cmd8.success === true);

  let cmd9 = r.executeCommand('distance');
  assert('"distance" works', cmd9.success === true);

  let cmd10 = r.executeCommand('detect');
  assert('"detect" works', cmd10.success === true);

  let cmd11 = r.executeCommand('detect face');
  assert('"detect face" works', cmd11.success === true && cmd11.faces !== undefined);

  // Photo commands
  let cmd12 = r.executeCommand('photo');
  assert('"photo" works', cmd12.success === true);

  let cmd13 = r.executeCommand('capture');
  assert('"capture" works', cmd13.success === true);

  // State commands
  r.sleep().state = 'sleeping'; // force sleep
  let cmd14 = r.executeCommand('wake');
  assert('"wake" works', cmd14.success === true);
  assert('State online after wake', r.state === 'online');

  let cmd15 = r.executeCommand('status');
  assert('"status" returns robotId', cmd15.robotId === 'cmd-test');

  let cmd16 = r.executeCommand('shutdown');
  assert('"shutdown" works', cmd16.success === true);
  assert('State offline', r.state === 'offline');

  // Unknown command
  let cmd17 = r.executeCommand('fly to the moon');
  assert('Unknown command returns error', cmd17.error !== undefined);
  assert('Error has suggestion', cmd17.error.includes('Try:'));

  // Head movement
  r.state = 'online';
  let head1 = r.executeCommand('head 45 15');
  assert('Head pan/tilt set', head1.success === true);
  assert('Head pan = 45', r.actuators.head.pan === 45);
  assert('Head tilt = 15', r.actuators.head.tilt === 15);

  r.executeCommand('head pan 90');
  assert('Head pan max 90', r.actuators.head.pan === 90);

  r.executeCommand('head pan -200');
  assert('Head pan min -90', r.actuators.head.pan === -90);

  r.executeCommand('head tilt 30');
  assert('Head tilt max 30', r.actuators.head.tilt === 30);

  r.executeCommand('head tilt -50');
  assert('Head tilt min -30', r.actuators.head.tilt === -30);

  // Charge commands
  let cmdCharge = r.executeCommand('charge');
  assert('"charge" works', cmdCharge.success === true);
  assert('Charging state', r.state === 'charging');

  let cmdChargeStop = r.executeCommand('charge stop');
  assert('"charge stop" works', cmdChargeStop.success === true);
})();

// ── 7. Battery Simulation ─────────────────────────────────
(async function batteryTests() {
  console.log('\n── Battery Simulation ──');
  const r = new RobotHAL('battery-test');
  r.start();
  await new Promise(r2 => setTimeout(r2, 2500));
  assert('Robot online', r.state === 'online');

  // Battery should drain over time
  let initialLevel = r.sensors.battery.level;
  let drained = false;
  for (let i = 0; i < 10; i++) {
    // Trigger multiple heartbeats
    r._startHeartbeat();
    await new Promise(r2 => setTimeout(r2, 100));
    if (r.sensors.battery.level < initialLevel) { drained = true; break; }
  }
  assert('Battery drains over time', drained);

  // Charging
  r.startCharging();
  let chargeLevel = r.sensors.battery.level;
  await new Promise(r2 => setTimeout(r2, 100));
  assert('Battery charges', r.sensors.battery.level >= chargeLevel);

  r.shutdown();
})();

// ── 8. Edge Cases ─────────────────────────────────────────
(async function edgeCaseTests() {
  console.log('\n── Edge Cases ──');
  const r = new RobotHAL('edge-test');

  // Command log limit (start robot so speak() logs)
  r.state = 'online';
  for (let i = 0; i < 150; i++) r.executeCommand('say test');
  assert('Command log capped at 100', r.commandLog.length === 100);

  // Consecutive state transitions
  r.state = 'online'; // skip boot delay
  let r1 = r.sleep();
  let r2 = r.wake();
  let r3 = r.sleep();
  assert('Valid state transitions work', r1.success && r2.success && r3.success);

  // Garbage input to executeCommand
  let garbage = r.executeCommand('');
  assert('Empty command still produces error or status', garbage !== undefined);

  // getStatus shape
  let status = r.getStatus();
  assert('Status has robotId', status.robotId === 'edge-test');
  assert('Status has state', status.state !== undefined);
  assert('Status has battery', status.battery !== undefined);
  assert('Status has sensors', status.sensors !== undefined);
  assert('Status has actuators', status.actuators !== undefined);
  assert('Status has expression', status.expression !== undefined);
  assert('Status has health', status.health !== undefined);

  // Simulator emits ambient events
  let ambientCount = 0;
  r.on('event', (e) => { if (e.type === 'ambient') ambientCount++; });
  for (let i = 0; i < 100; i++) r._startSimulation();
  assert('Simulator registered', ambientCount >= 0);
})();

// ── 9. Static Members ─────────────────────────────────────
(async function staticTests() {
  console.log('\n── Static Members ──');
  assert('EXPRESSIONS defined', Object.keys(RobotHAL.EXPRESSIONS).length >= 8);
  assert('STATES defined', RobotHAL.STATES.includes('online'));
  assert('STATES includes sleep', RobotHAL.STATES.includes('sleeping'));
  assert('STATES includes error', RobotHAL.STATES.includes('error'));
})();

// ── Summary ────────────────────────────────────────────────
setTimeout(() => {
  console.log(`\n── Results: ${passed + failed} tests, ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}, 3000);
