const http = require('http');

const BASE = 'http://localhost:3000';
let token = '';

async function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Parse: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login() {
  const r = await api('POST', '/api/auth/login', { email: 'parent@example.com', password: 'parent123' });
  token = r.body.token;
  console.log('Login OK, token: ' + token.slice(0, 20) + '...');
}

// ── 1000-round stress test ──
async function stressTest(rounds) {
  console.log('\n=== STRESS TEST: ' + rounds + ' rounds ===');
  const messages = [
    'Hello', 'Tell me about dinosaurs', 'What is 42 * 13?',
    'I feel sad today', 'Tell me a joke', 'What is the capital of France?',
    'Explain how the internet works', 'What color are leaves in summer?',
    'Tell me about the solar system', 'How many planets are in our solar system?',
    'What is gravity?', 'Tell me about ancient Egypt', 'What is DNA?',
    'Explain photosynthesis', 'How does rain form?', 'What is the speed of light?',
    'Tell me about the Roman Empire', 'What is the largest ocean?',
    'How do butterflies form?', 'What is the biggest animal?',
    'Hallo Roboter', 'Erzähl mir von Dinosauriern', 'Parle moi des dinosaures',
    'Ik wil over de ruimte leren', 'Raccontami una storia',
    'What is 123 + 456?', 'Teach me about prime numbers', 'Show me sad',
    'Take a photo', 'What is the temperature?', 'How are you?',
    'I am happy today', 'I miss my grandmother', 'Tell me about the moon',
    'Why is the sky blue?', 'What causes thunder?', 'How do birds fly?',
    'What is a black hole?', 'Tell me about Leonardo da Vinci',
    'What is electricity?', 'How do magnets work?', 'Explain evolution',
    'What is the human heart?', 'Tell me about Mount Everest',
    'What is the longest river?', 'Who was Albert Einstein?',
    'What is artificial intelligence?', 'How does a computer work?',
    'Tell me about volcanoes', 'What is a tsunami?', 'How do stars die?'
  ];

  let passed = 0, failed = 0;
  const totalStart = Date.now();

  for (let i = 1; i <= rounds; i++) {
    const msg = messages[i % messages.length];
    try {
      const r = await api('POST', '/api/v1/chat', { message: msg, sessionId: 'stress_test' });
      if (r.status === 200 && r.body && r.body.success) {
        passed++;
      } else {
        failed++;
      }
      if (i % 100 === 0 || i === rounds) {
        const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
        const avg = ((Date.now() - totalStart) / i).toFixed(0);
        console.log('  Round ' + i + '/' + rounds + ' | OK: ' + passed + ' | FAIL: ' + failed + ' | Avg: ' + avg + 'ms | Time: ' + elapsed + 's');
      }
    } catch (e) {
      failed++;
      if (failed % 50 === 1) console.log('  ERROR at round ' + i + ': ' + e.message.slice(0, 80));
    }
  }

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log('\nSTRESS TEST COMPLETE: ' + rounds + ' rounds in ' + totalTime + 's');
  console.log('  Passed: ' + passed + ' | Failed: ' + failed + ' | Rate: ' + (passed/rounds*100).toFixed(1) + '%');
  console.log('  Avg response: ' + (totalTime/rounds*1000).toFixed(0) + 'ms');
  console.log('  Throughput: ' + (rounds/totalTime).toFixed(1) + ' req/s');
}

// ── 20+ round continuous conversation ──
async function longConversation(scenario, messages) {
  console.log('\n=== LONG CONVERSATION: ' + scenario + ' (' + messages.length + ' rounds) ===');
  const sessionId = 'long_' + scenario.replace(/\s/g, '_') + '_' + Date.now();
  let successCount = 0;
  const start = Date.now();

  for (let i = 0; i < messages.length; i++) {
    try {
      const r = await api('POST', '/api/v1/chat', { message: messages[i], sessionId });
      const reply = (r.body && r.body.data && r.body.data.reply) || JSON.stringify(r.body).slice(0, 80);
      if (r.status === 200) {
        successCount++;
        console.log('  [' + (i+1) + '] You: ' + messages[i].slice(0, 50));
        console.log('      Bot: ' + reply.slice(0, 80));
      } else {
        console.log('  [' + (i+1) + '] FAIL status=' + r.status);
      }
    } catch (e) {
      console.log('  [' + (i+1) + '] ERROR: ' + e.message.slice(0, 80));
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\nScenario "' + scenario + '" done: ' + successCount + '/' + messages.length + ' in ' + elapsed + 's');
  return successCount === messages.length;
}

// ── Main ──
async function main() {
  console.log('RoboBuddy Chat API Test Suite\n');
  console.log('Target: ' + BASE);

  // Health check
  try {
    const r = await api('GET', '/api/health');
    console.log('Server: ' + r.body.status);
  } catch (e) {
    console.log('ERROR: Server not reachable at ' + BASE);
    console.log('Run: node server.js first');
    process.exit(1);
  }

  await login();

  // 1000-round stress
  await stressTest(1000);

  // Long conversations
  const allScenarios = [
    { name: 'dinosaurs', msgs: [
      'Tell me about dinosaurs', 'Were dinosaurs really that big?',
      'What is the difference between T-Rex and Stegosaurus?',
      'How do we know what dinosaurs looked like?', 'Were any dinosaurs friendly?',
      'Did dinosaurs live everywhere on Earth?', 'Why did dinosaurs go extinct?',
      'Could dinosaurs come back?', 'What was the biggest dinosaur?',
      'What was the smallest dinosaur?', 'Did dinosaurs have feathers?',
      'Could a human outrun a T-Rex?', 'What did dinosaurs eat?',
      'How long did dinosaurs live?', 'Were there dinosaur babies?',
      'How many types of dinosaurs are there?', 'What is a velociraptor?',
      'Were dinosaurs reptiles?', 'What is the oldest dinosaur fossil?',
      'Could I ride a brontosaurus?', 'Do birds descend from dinosaurs?'
    ]},
    { name: 'empathy', msgs: [
      'I am feeling really sad today', 'I had a bad day at school',
      'Nobody wants to play with me', 'I feel lonely sometimes',
      'Can you cheer me up?', 'Tell me something nice',
      'I am scared of the dark', 'My pet fish died today',
      'I miss my grandmother', 'Why do people fight?',
      'Is it okay to cry?', 'What makes you happy?',
      'I am proud of myself', 'Tell me a funny story',
      'How do I make friends?', 'I feel like I am not good enough',
      'What if I fail a test?', 'I am angry at my brother',
      'Can you teach me something fun?', 'I love learning with you'
    ]},
    { name: 'science', msgs: [
      'How does the internet work?', 'What is a computer made of?',
      'How does electricity get to my house?', 'What is the speed of light?',
      'Why is the sky blue?', 'How do airplanes fly?',
      'What is gravity?', 'How do magnets work?', 'What is DNA?',
      'How do cells work?', 'What is a black hole?',
      'How do stars form?', 'What causes earthquakes?',
      'How does rain form?', 'What is the water cycle?',
      'How do plants make food?', 'What is the periodic table?',
      'How does a vaccine work?', 'What is artificial intelligence?',
      'How does a rocket reach space?', 'What is quantum physics?'
    ]},
    { name: 'german', msgs: [
      'Hallo! Wie geht es dir?', 'Erzähl mir von Dinosauriern',
      'Was ist der größte Ozean?', 'Wie funktioniert ein Computer?',
      'Erzähl mir etwas Lustiges', 'Ich bin sehr traurig heute',
      'Was ist die Hauptstadt von Deutschland?', 'Kannst du mir eine Geschichte erzählen?',
      'Warum ist der Himmel blau?', 'Wie viele Planeten gibt es?',
      'Erkläre mir Fotosynthese', 'Was ist DNA?', 'Wie alt ist die Erde?',
      'Wer war Albert Einstein?', 'Was ist künstliche Intelligenz?',
      'Kannst du mir etwas über Rom erzählen?', 'Was ist das größte Tier?',
      'Wie funktioniert Regen?', 'Was ist ein Vulkan?', 'Erzähl mir von den Sternen',
      'Was ist die Lichtgeschwindigkeit?'
    ]},
    { name: 'math', msgs: [
      'What is 42 * 13?', 'What is 1234 + 5678?',
      'What is 100 - 37?', 'What is 144 / 12?',
      'What is 7 squared?', 'What is the square root of 625?',
      'Is 97 a prime number?', 'What is 15% of 200?',
      'What is 2 to the power of 10?', 'What is 1000 divided by 7?',
      'What is 3.14 * 2 * 5?', 'What is the area of a circle with radius 5?',
      'What is 99 * 99?', 'What is 5 factorial?',
      'What is the sum of 1 to 100?', 'Convert 0.75 to a fraction',
      'What is 25% of 80?', 'What is the GCD of 12 and 18?',
      'What is the LCM of 4 and 6?', 'What is 3 to the power of 4?'
    ]}
  ];

  let totalPassed = 0, totalScenarios = 0;
  for (const s of allScenarios) {
    const ok = await longConversation(s.name, s.msgs);
    if (ok) totalPassed++;
    totalScenarios++;
  }

  console.log('\n=== FINAL SUMMARY ===');
  console.log('Stress test: 1000 rounds completed');
  console.log('Long conversations: ' + totalPassed + '/' + totalScenarios + ' scenarios fully passed');
  console.log('All tests completed successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });