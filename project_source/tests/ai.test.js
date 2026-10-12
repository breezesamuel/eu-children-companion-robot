/**
 * AI Service Unit Tests
 * Run: node tests/ai.test.js
 */
const ai = require('../services/ai');

let passed = 0, failed = 0;
function assert(label, ok) {
  if (ok) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

async function run() {
  console.log('\n── AI Service ──');

  // chat function exists
  assert('chat is a function', typeof ai.chat === 'function');

  // chatWithSystem exists
  assert('chatWithSystem is a function', typeof ai.chatWithSystem === 'function');

  // Basic chat with fallback (no API key configured)
  let resp = await ai.chat([{ role: 'user', content: 'Hello' }]);
  assert('Fallback returns string', typeof resp === 'string');
  assert('Fallback response not empty', resp.length > 0);

  // Different message types
  let resp2 = await ai.chat([{ role: 'user', content: 'My robot is broken!' }]);
  assert('Fallback handles support keywords', resp2.length > 0);

  let resp3 = await ai.chat([{ role: 'user', content: 'How much does it cost?' }]);
  assert('Fallback handles sales keywords', resp3.length > 0);

  // Edge: empty messages
  let resp4 = await ai.chat([]);
  assert('Empty messages array returns fallback', typeof resp4 === 'string');

  // Edge: messages without content
  let resp5 = await ai.chat([{ role: 'user', content: '' }]);
  assert('Empty content returns fallback', typeof resp5 === 'string');

  // Edge: null messages
  let resp6 = await ai.chat(null);
  assert('Null messages does not crash', typeof resp6 === 'string');

  // Edge: undefined messages
  let resp7 = await ai.chat(undefined);
  assert('Undefined messages does not crash', typeof resp7 === 'string');

  // chatWithSystem
  let sysResp = await ai.chatWithSystem('You are a helpful tutor.', 'What is 2+2?');
  assert('chatWithSystem returns string', typeof sysResp === 'string');

  // Edge: chatWithSystem empty params
  let sysResp2 = await ai.chatWithSystem('', '');
  assert('chatWithSystem empty params works', typeof sysResp2 === 'string');

  // chat with options
  let optResp = await ai.chat([{ role: 'user', content: 'test' }], { temperature: 0.5, maxTokens: 100 });
  assert('Options parameter handled gracefully', typeof optResp === 'string');

  // Edge: temperature out of range
  let optResp2 = await ai.chat([{ role: 'user', content: 'test' }], { temperature: 999, maxTokens: -1 });
  assert('Extreme options handled gracefully', typeof optResp2 === 'string');

  // Multiple messages in array
  let multiResp = await ai.chat([
    { role: 'system', content: 'Be helpful.' },
    { role: 'user', content: 'Tell me about robots.' },
    { role: 'assistant', content: 'Robots are machines.' },
    { role: 'user', content: 'Tell me more.' }
  ]);
  assert('Multi-message conversation works', typeof multiResp === 'string');

  // Non-ASCII / Unicode input
  let uniResp = await ai.chat([{ role: 'user', content: '你好世界' }]);
  assert('Unicode input handled', typeof uniResp === 'string');

  let uniResp2 = await ai.chat([{ role: 'user', content: 'Bonjour le monde' }]);
  assert('French input handled', typeof uniResp2 === 'string');

  // Performance: rapid consecutive calls
  let start = Date.now();
  for (let i = 0; i < 10; i++) {
    await ai.chat([{ role: 'user', content: `test ${i}` }]);
  }
  let elapsed = Date.now() - start;
  assert('10 rapid calls complete within 3s', elapsed < 3000);

  console.log(`\n── Results: ${passed + failed} tests, ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
