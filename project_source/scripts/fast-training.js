/**
 * Fast Conversation Training - Tests fallback AI directly
 * No external API calls, 100% local testing
 */

const { buildIntentDatabase, INTENT_CATEGORIES, PHRASE_DATABASE } = require('../data/intent-database');
const ai = require('../services/ai');
const fs = require('fs');
const path = require('path');

const TRAINING_LOG = path.join(__dirname, '../data/training-log.json');
const TRAINING_STATS = path.join(__dirname, '../data/training-stats.json');

// Test inputs covering all intent categories
const TEST_INPUTS = [
  // Greetings
  'hello', 'hi robobuddy', 'good morning', 'hey there', 'how are you',
  'what\'s up', 'hi', 'hello robot', 'good evening', 'good afternoon',
  // Farewells
  'bye', 'goodbye', 'see you', 'good night', 'take care', 'see you later',
  // Gratitude
  'thank you', 'thanks a lot', 'you\'re the best', 'thanks buddy',
  // Math
  'teach me math', 'help with math', 'what is 2 plus 2', 'math lesson',
  'multiplication table', 'how to divide', 'fractions help',
  // Science
  'tell me about space', 'why is the sky blue', 'science lesson',
  'how does gravity work', 'what are atoms', 'solar system',
  // Stories
  'tell me a story', 'bedtime story', 'fairy tale', 'read me something',
  // Jokes
  'tell me a joke', 'make me laugh', 'something funny', 'joke please',
  // Games
  'let\'s play', 'play a game', 'riddle', 'trivia', 'brain teaser',
  // Emotions
  'i am happy', 'i feel great', 'yay', 'excited',
  'i am sad', 'i feel lonely', 'nobody likes me',
  'i am angry', 'this is unfair', 'so annoying',
  'i am scared', 'i am afraid', 'monsters',
  // Comfort
  'comfort me', 'I need a hug', 'cheer me up', 'make me happy',
  // Help
  'help me', 'I need help', 'what can you do', 'how to use',
  // Health
  'i feel sick', 'i have a headache', 'health tips',
  // Mental health
  'i feel stressed', 'anxiety', 'how to relax', 'mental health',
  // Social
  'my friend', 'friendship', 'how to make friends',
  'my mom', 'my dad', 'family problems',
  // Robot
  'move forward', 'turn left', 'stop', 'robot status', 'battery',
  // Multilingual
  '你好', '早上好', '讲个故事', '讲个笑话', '帮我学数学',
  'hallo', 'wie geht es', 'erzähl mir', 'bonjour', 'racconte',
  // Long conversations
  'I want to learn about dinosaurs', 'Tell me everything you know about space exploration',
  'Can you teach me how to draw a cat', 'What is the meaning of friendship',
  'How do airplanes fly', 'Why do we dream', 'What makes a good friend',
  'Can you explain photosynthesis', 'How do computers work', 'What is coding'
];

async function fastTraining(rounds = 10000) {
  console.log(`🚀 Fast training: ${rounds} rounds (fallback mode)\n`);

  const intentStats = {};
  const log = [];
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < rounds; i++) {
    const input = TEST_INPUTS[i % TEST_INPUTS.length];

    try {
      const result = await ai.chat([
        { role: 'system', content: 'You are RoboBuddy, a friendly educational robot companion for children. Be helpful, kind, and age-appropriate.' },
        { role: 'user', content: input }
      ], { personality: 'friendly' });

      const topic = detectTopic(input);
      intentStats[topic] = (intentStats[topic] || 0) + 1;

      if (result && result.length > 0) {
        successCount++;
        if (i < 100) {
          log.push({
            round: i + 1,
            input,
            topic,
            responseLength: result.length,
            success: true
          });
        }
      } else {
        failCount++;
      }
    } catch (e) {
      failCount++;
      if (i < 10) {
        log.push({ round: i + 1, input, error: e.message, success: false });
      }
    }

    if ((i + 1) % 1000 === 0) {
      const elapsed = Date.now() - startTime;
      const rate = ((i + 1) / elapsed * 1000).toFixed(0);
      console.log(`   Round ${i + 1}/${rounds} | Rate: ${rate}/s | Success: ${successCount} | Fail: ${failCount}`);
    }
  }

  const elapsed = Date.now() - startTime;
  const stats = {
    totalRounds: rounds,
    successCount,
    failCount,
    successRate: ((successCount / rounds) * 100).toFixed(2) + '%',
    duration: elapsed + 'ms',
    roundsPerSecond: (rounds / elapsed * 1000).toFixed(0),
    intentDistribution: intentStats,
    uniqueIntents: Object.keys(intentStats).length,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(TRAINING_LOG, JSON.stringify(log, null, 2), 'utf8');
  fs.writeFileSync(TRAINING_STATS, JSON.stringify(stats, null, 2), 'utf8');

  console.log(`\n✅ Training complete!`);
  console.log(`   Duration: ${elapsed}ms`);
  console.log(`   Rate: ${(rounds / elapsed * 1000).toFixed(0)} rounds/sec`);
  console.log(`   Success: ${successCount}/${rounds} (${stats.successRate})`);
  console.log(`   Unique intents: ${Object.keys(intentStats).length}`);
  console.log(`\nIntent distribution:`);
  const sorted = Object.entries(intentStats).sort((a, b) => b[1] - a[1]);
  for (const [topic, count] of sorted.slice(0, 20)) {
    console.log(`   ${topic}: ${count}`);
  }

  return stats;
}

function detectTopic(input) {
  const lower = input.toLowerCase();
  if (/hello|hi|hey|good morning|good evening/.test(lower)) return 'greeting';
  if (/bye|goodbye|see you/.test(lower)) return 'farewell';
  if (/thank|thanks/.test(lower)) return 'gratitude';
  if (/math|multiply|divide|add|subtract|fraction/.test(lower)) return 'math';
  if (/science|space|atom|gravity|planet/.test(lower)) return 'science';
  if (/story|tale|read/.test(lower)) return 'story';
  if (/joke|laugh|funny/.test(lower)) return 'joke';
  if (/play|game|riddle|trivia/.test(lower)) return 'game';
  if (/happy|great|yay|excited/.test(lower)) return 'happy';
  if (/sad|lonely|nobody/.test(lower)) return 'sad';
  if (/angry|unfair|annoying/.test(lower)) return 'angry';
  if (/scared|afraid|monster/.test(lower)) return 'scared';
  if (/comfort|hug|cheer/.test(lower)) return 'comfort';
  if (/help|what can you/.test(lower)) return 'help';
  if (/sick|headache|health/.test(lower)) return 'health';
  if (/stress|anxiety|relax|mental/.test(lower)) return 'mental_health';
  if (/friend|friendship/.test(lower)) return 'social';
  if (/mom|dad|family/.test(lower)) return 'family';
  if (/move|turn|stop|robot|battery/.test(lower)) return 'robot';
  return 'general';
}

if (require.main === module) {
  const rounds = parseInt(process.argv[2]) || 10000;
  fastTraining(rounds).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { fastTraining };
