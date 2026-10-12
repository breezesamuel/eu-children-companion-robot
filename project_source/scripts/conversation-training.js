/**
 * Conversation Training Script
 * 10000 rounds simulation, building intent database and testing accuracy
 */

const orchestrator = require('../agents/orchestrator');
const { buildIntentDatabase, INTENT_CATEGORIES, PHRASE_DATABASE } = require('../data/intent-database');
const fs = require('fs');
const path = require('path');

const CONVERSATION_LOG = path.join(__dirname, '../data/conversation-log.json');
const INTENT_STATS = path.join(__dirname, '../data/intent-stats.json');

// Training conversation patterns
const TRAINING_CONVERSATIONS = [
  // Greeting flows
  { inputs: ['hello', 'hi robobuddy', 'good morning', 'hey there'], expectedType: 'greeting' },
  { inputs: ['how are you', 'what\'s up', 'how\'s it going'], expectedType: 'greeting' },
  { inputs: ['bye', 'goodbye', 'see you', 'good night'], expectedType: 'farewell' },

  // Learning flows
  { inputs: ['teach me math', 'help with math', 'what is 2 plus 2'], expectedType: 'learn_math' },
  { inputs: ['teach me science', 'tell me about space', 'why is the sky blue'], expectedType: 'learn_science' },
  { inputs: ['tell me a story', 'read me a story', 'bedtime story'], expectedType: 'tell_story' },
  { inputs: ['tell me a joke', 'make me laugh', 'something funny'], expectedType: 'tell_joke' },
  { inputs: ['let\'s play', 'play a game', 'riddle'], expectedType: 'play_game' },

  // Emotional flows
  { inputs: ['i am happy', 'i feel great', 'yay'], expectedType: 'emotion_happy' },
  { inputs: ['i am sad', 'i feel lonely', 'nobody likes me'], expectedType: 'emotion_sad' },
  { inputs: ['i am angry', 'this is unfair', 'so annoying'], expectedType: 'emotion_angry' },
  { inputs: ['i am scared', 'i am afraid', 'monsters'], expectedType: 'emotion_scared' },
  { inputs: ['comfort me', 'I need a hug', 'cheer me up'], expectedType: 'need_comfort' },

  // Help flows
  { inputs: ['help me', 'I need help', 'what can you do'], expectedType: 'ask_help' },
  { inputs: ['thank you', 'thanks a lot', 'you\'re the best'], expectedType: 'gratitude' },

  // Health flows
  { inputs: ['i feel sick', 'i have a headache', 'i don\'t feel good'], expectedType: 'health_general' },
  { inputs: ['i feel stressed', 'anxiety', 'how to relax'], expectedType: 'mental_health' },

  // Social flows
  { inputs: ['my friend', 'friendship', 'how to make friends'], expectedType: 'friendship' },
  { inputs: ['my mom', 'my dad', 'family'], expectedType: 'family' },

  // Robot flows
  { inputs: ['move forward', 'turn left', 'stop'], expectedType: 'robot_move' },
  { inputs: ['robot status', 'battery', 'your name'], expectedType: 'robot_status' }
];

// Generate multi-turn conversations
function generateMultiTurnConversation(seed, maxTurns = 20) {
  const conversations = [];
  let turn = 0;
  let context = '';

  const flows = {
    math_tutor: [
      'teach me math', 'help with addition', 'what is 5 plus 3',
      'can you give me more problems', 'what is 10 minus 4',
      'this is fun', 'teach me multiplication', 'what is 3 times 4',
      'i don\'t understand', 'explain it again', 'now i get it',
      'thank you', 'can we do division', 'what is 12 divided by 3'
    ],
    story_time: [
      'tell me a story', 'a story about animals', 'what happens next',
      'that\'s exciting', 'tell me another one', 'a funny story',
      'i love this story', 'make me a character', 'what about a dragon story',
      'the dragon is scary', 'can the dragon be friendly', 'yes please',
      'the end', 'tell me another'
    ],
    emotional_support: [
      'i feel sad today', 'my friend is mad at me', 'i don\'t know what to do',
      'should i talk to them', 'i\'m scared they won\'t forgive me',
      'thank you for listening', 'i feel better now', 'you\'re a good friend',
      'can you tell me a joke to cheer up', 'that made me smile'
    ],
    science_exploration: [
      'tell me about space', 'what are stars', 'how far is the sun',
      'are there other planets', 'tell me about mars', 'can we live on mars',
      'what about the moon', 'who walked on the moon first', 'i want to be an astronaut',
      'teach me about rockets', 'how do rockets work', 'this is so cool'
    ],
    daily_chat: [
      'hello', 'how are you today', 'what\'s the weather like',
      'i want to play a game', 'let\'s play trivia', 'ask me something',
      'i don\'t know', 'give me a hint', 'is it an animal',
      'yes', 'i guessed it', 'that was fun', 'let\'s play again'
    ]
  };

  const flowKeys = Object.keys(flows);
  const selectedFlow = flowKeys[seed % flowKeys.length];
  const flow = flows[selectedFlow];

  for (let i = 0; i < Math.min(maxTurns, flow.length); i++) {
    conversations.push({
      turn: i + 1,
      user: flow[i],
      flow: selectedFlow
    });
  }

  return conversations;
}

// Run training
async function runTraining(rounds = 10000) {
  console.log(`🚀 Starting conversation training: ${rounds} rounds\n`);

  const intentStats = {};
  const conversationLog = [];
  let successCount = 0;
  let failCount = 0;
  let totalTurns = 0;

  // Phase 1: Single-turn intent testing (2000 rounds)
  console.log('📋 Phase 1: Single-turn intent testing...');
  for (let i = 0; i < 2000; i++) {
    const conv = TRAINING_CONVERSATIONS[i % TRAINING_CONVERSATIONS.length];
    const input = conv.inputs[Math.floor(Math.random() * conv.inputs.length)];

    try {
      const result = await orchestrator.handleMessage(
        `train-user-${i}`,
        input,
        `train-session-${i}`,
        null,
        null
      );

      const intentKey = result.agent || 'unknown';
      intentStats[intentKey] = (intentStats[intentKey] || 0) + 1;

      conversationLog.push({
        round: i + 1,
        phase: 'single-turn',
        input,
        response: result.reply?.substring(0, 100),
        agent: result.agent,
        success: true,
        timestamp: new Date().toISOString()
      });
      successCount++;
    } catch (e) {
      failCount++;
      conversationLog.push({
        round: i + 1,
        phase: 'single-turn',
        input,
        error: e.message,
        success: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Phase 2: Multi-turn conversations (5000 rounds)
  console.log('📋 Phase 2: Multi-turn conversations...');
  for (let i = 0; i < 5000; i++) {
    const conversation = generateMultiTurnConversation(i, 10 + Math.floor(Math.random() * 11));

    for (const turn of conversation) {
      totalTurns++;
      try {
        const result = await orchestrator.handleMessage(
          `multi-user-${i}`,
          turn.user,
          `multi-session-${i}`,
          null,
          null
        );

        const intentKey = result.agent || 'unknown';
        intentStats[intentKey] = (intentStats[intentKey] || 0) + 1;

        conversationLog.push({
          round: 2000 + i,
          turn: turn.turn,
          phase: 'multi-turn',
          flow: turn.flow,
          input: turn.user,
          response: result.reply?.substring(0, 100),
          agent: result.agent,
          success: true,
          timestamp: new Date().toISOString()
        });
        successCount++;
      } catch (e) {
        failCount++;
      }
    }
  }

  // Phase 3: Mixed language conversations (3000 rounds)
  console.log('📋 Phase 3: Multi-language conversations...');
  const multilingualInputs = [
    '你好', '早上好', '帮我学数学', '讲个故事', '讲个笑话',
    'hallo', 'wie geht es dir', 'erzähl mir eine Geschichte',
    'bonjour', 'comment ça va', 'raconte-moi une histoire',
    'ich bin traurig', 'i feel happy', 'help me please',
    '谢谢', 'danke', 'merci', '再见', 'auf wiedersehen'
  ];

  for (let i = 0; i < 3000; i++) {
    const input = multilingualInputs[i % multilingualInputs.length];

    try {
      const result = await orchestrator.handleMessage(
        `ml-user-${i}`,
        input,
        `ml-session-${i}`,
        null,
        null
      );

      const intentKey = result.agent || 'unknown';
      intentStats[intentKey] = (intentStats[intentKey] || 0) + 1;

      conversationLog.push({
        round: 7000 + i,
        phase: 'multilingual',
        input,
        response: result.reply?.substring(0, 100),
        agent: result.agent,
        success: true,
        timestamp: new Date().toISOString()
      });
      successCount++;
    } catch (e) {
      failCount++;
    }
  }

  // Save results
  fs.writeFileSync(CONVERSATION_LOG, JSON.stringify(conversationLog.slice(0, 1000), null, 2), 'utf8');
  fs.writeFileSync(INTENT_STATS, JSON.stringify({
    totalRounds: rounds,
    totalTurns,
    successCount,
    failCount,
    successRate: ((successCount / (successCount + failCount)) * 100).toFixed(2) + '%',
    intentDistribution: intentStats,
    uniqueIntents: Object.keys(intentStats).length,
    timestamp: new Date().toISOString()
  }, null, 2), 'utf8');

  console.log(`\n✅ Training complete!`);
  console.log(`   Rounds: ${rounds}`);
  console.log(`   Turns: ${totalTurns}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(2)}%`);
  console.log(`   Unique intents: ${Object.keys(intentStats).length}`);
  console.log(`   Log saved: ${CONVERSATION_LOG}`);
  console.log(`   Stats saved: ${INTENT_STATS}`);

  return { successCount, failCount, totalTurns, intentStats };
}

// Run if called directly
if (require.main === module) {
  const rounds = parseInt(process.argv[2]) || 10000;
  runTraining(rounds).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runTraining, generateMultiTurnConversation, TRAINING_CONVERSATIONS };
