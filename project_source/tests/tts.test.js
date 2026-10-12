/**
 * TTS Service Unit Tests
 * Run: node tests/tts.test.js
 */
process.env.NODE_ENV = 'test';
const TTSService = require('../services/tts');

let passed = 0, failed = 0;
function assert(label, ok) {
  if (ok) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

async function run() {
  console.log('\n── TTS Service ──');

  assert('TTS service initialized', TTSService !== undefined);
  assert('isAvailable is boolean', typeof TTSService.isAvailable === 'boolean');
  assert('Default voice is en', TTSService.currentVoice === 'en');
  assert('Speech history exists', Array.isArray(TTSService.speechHistory));
  assert('Max history set', TTSService.maxHistory === 100);

  // speak
  let result = await TTSService.speak('Hello', { lang: 'en' });
  assert('speak() returns object', typeof result === 'object');
  assert('speak() has success field', 'success' in result);
  assert('speak() has response', result && (result.success === true || result.success === false));

  // speak with unknown language falls back to en
  let result2 = await TTSService.speak('Test', { lang: 'xx' });
  assert('Unknown lang does not crash', result2 !== undefined);

  // speak with rate/pitch
  let result3 = await TTSService.speak('Hello', { rate: 10, pitch: 10 });
  assert('Custom rate/pitch does not crash', result3 !== undefined);

  // Edge: empty text
  let result4 = await TTSService.speak('');
  assert('Empty text returns result', result4 !== undefined);

  // Edge: very long text
  let result5 = await TTSService.speak('x'.repeat(5000));
  assert('Very long text returns result', result5 !== undefined);

  // Edge: null/undefined options
  let result6 = await TTSService.speak('Hello', null);
  assert('Null options does not crash', result6 !== undefined);

  // getVoices
  let voices = TTSService.getVoices ? TTSService.getVoices() : [];
  if (voices.length > 0) {
    assert('Voices list has items', voices.length > 0);
    assert('Each voice has lang and voice fields', voices.every(v => v.lang && v.voice));
  }

  // updateSettings
  if (TTSService.updateSettings) {
    TTSService.updateSettings({ voice: 'de', rate: 5, pitch: -5 });
    assert('Voice changed to de', TTSService.currentVoice === 'de');
    assert('Rate set to 5', TTSService.speechRate === 5);
    assert('Pitch set to -5', TTSService.speechPitch === -5);
  }

  // Edge: invalid settings
  if (TTSService.updateSettings) {
    TTSService.updateSettings(null);
    assert('Null settings does not crash', true);
  }

  // getHistory
  if (TTSService.getHistory) {
    let hist = TTSService.getHistory();
    assert('History is array', Array.isArray(hist));
  }

  // Edge: history overflow
  TTSService.speechHistory = Array.from({ length: 95 }, (_, i) => ({ text: `test-${i}`, timestamp: new Date().toISOString() }));
  await TTSService.speak('overflow-test');
  assert('History capped at maxHistory', TTSService.speechHistory.length <= TTSService.maxHistory);

  console.log(`\n── Results: ${passed + failed} tests, ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
