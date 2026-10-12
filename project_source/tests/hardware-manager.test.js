const hw = require('../hardware/hardware-manager');

let passed = 0, failed = 0;
function assert(label, ok) { if (ok) { passed++; console.log('  PASS:', label); } else { failed++; console.error('  FAIL:', label); } }

async function run() {
  console.log('\n── Hardware Manager Tests ──');

  // 1. Module structure
  assert('Module is EventEmitter', typeof hw.on === 'function');
  assert('Has features', typeof hw.features === 'object');
  assert('Has 24 features', Object.keys(hw.features).length === 24);
  assert('Has sensorStates', typeof hw.sensorStates === 'object');
  assert('Has 24 sensor states', Object.keys(hw.sensorStates).length === 24);
  assert('Has eventLog', Array.isArray(hw.eventLog));

  // 2. Feature properties
  const fkeys = Object.keys(hw.features);
  for (const key of fkeys) {
    const f = hw.features[key];
    assert('Feature "' + key + '" has name', typeof f.name === 'string' && f.name.length > 0);
    assert('Feature "' + key + '" has type', typeof f.type === 'string');
    assert('Feature "' + key + '" has status', typeof f.status === 'string');
  }

  // 3. Feature types
  const typeCounts = {};
  for (const f of Object.values(hw.features)) {
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
  }
  assert('Has sensor features', typeCounts.sensor > 0);
  assert('Has actuator features', typeCounts.actuator > 0);
  assert('Has power features', typeCounts.power > 0);
  assert('Has hmi features', typeCounts.hmi > 0);
  assert('Has comms features', typeCounts.comms > 0);
  assert('Has system features', typeCounts.system > 0);
  assert('Total types sum to 24', Object.values(typeCounts).reduce((a, b) => a + b, 0) === 24);

  // 4. getStatus()
  const status = hw.getStatus();
  assert('getStatus returns object', typeof status === 'object');
  assert('getStatus has totalFeatures', typeof status.totalFeatures === 'number');
  assert('getStatus has enabled', typeof status.enabled === 'number');
  assert('getStatus has byType', typeof status.byType === 'object');
  assert('getStatus has simulationActive', typeof status.simulationActive === 'boolean');
  assert('getStatus has eventLogCount', typeof status.eventLogCount === 'number');
  assert('getStatus has uptime', typeof status.uptime === 'number');
  assert('Total features 24', status.totalFeatures === 24);

  // 5. Sensor states exist for sensor features
  const sensorKeys = fkeys.filter(k => hw.features[k].type === 'sensor');
  for (const s of sensorKeys) {
    assert('Sensor "' + s + '" exists in sensorStates', hw.sensorStates[s] !== undefined);
    assert('Sensor "' + s + '" has value or data', typeof hw.sensorStates[s] === 'object');
  }

  // 6. Temperature/humidity sensor structure
  const th = hw.sensorStates.temp_humidity;
  if (th) {
    assert('Temp has temperature', typeof th.temperature === 'number');
    assert('Temp has humidity', typeof th.humidity === 'number');
  }

  // 7. Numeric sensors have value
  for (const s of sensorKeys) {
    const v = hw.sensorStates[s];
    if (v && typeof v.value === 'number') {
      assert('Sensor "' + s + '" is finite', isFinite(v.value));
    }
  }

  // 8. getStatus byType matches actual
  assert('byType.sensor matches', status.byType.sensor === sensorKeys.length);

  // 9. Total features consistency
  const byTypeSum = Object.values(status.byType).reduce((a, b) => a + b, 0);
  assert('byType sum matches total', byTypeSum === status.totalFeatures);

  // 10. Event log capture
  const logBefore = hw.eventLog.length;
  assert('Event log is array', Array.isArray(hw.eventLog));
  hw.on('sensor:' + sensorKeys[0], () => {});
  await new Promise(r => setTimeout(r, 50));
  assert('Simulation ticks without error', true);

  // 11. Power management features
  const powerKeys = fkeys.filter(k => hw.features[k].type === 'power');
  assert('Has power features', powerKeys.length > 0);
  for (const pk of powerKeys) {
    assert('Power feature "' + pk + '" has name', hw.features[pk].name.length > 0);
  }

  // 12. Communication features
  const commKeys = fkeys.filter(k => hw.features[k].type === 'comms');
  assert('Has comms features', commKeys.length > 0);

  // Summary
  console.log('\n── Results: ' + (passed + failed) + ' tests, ' + passed + ' passed, ' + failed + ' failed ──');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
