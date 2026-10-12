/**
 * Browser Automation: 10000 Round Conversation Training
 * Opens http://localhost:3000/robot_terminal_ultimate.html
 * Sends 10000 messages through the chat UI, testing AI responses
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/robot_terminal_ultimate.html';
const LOG_FILE = path.join(__dirname, '../data/browser-training-log.json');
const STATS_FILE = path.join(__dirname, '../data/browser-training-stats.json');

const TEST_MESSAGES = [
  '你好', '早上好', '下午好', '晚上好', '你好机器人', '嗨',
  'hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'hey there',
  '再见', '拜拜', 'bye', 'goodbye', 'see you later', 'good night',
  '帮我学数学', '2加3等于多少', '10乘以5', '100除以4', 'math help', '5 plus 3', 'what is 10 times 7',
  '讲个故事', '给我讲个睡前故事', 'tell me a story', '讲一个有趣的童话', 'bedtime story please',
  '讲个笑话', 'make me laugh', 'tell me a joke', '有什么好笑的',
  '给我讲讲科学知识', '为什么天空是蓝色的', 'tell me about space', '地球有几个卫星', 'how does gravity work',
  '我今天很开心', 'i feel great', 'yay so happy', '太棒了',
  '我很难过', 'i feel sad', 'nobody likes me', '我感到孤独',
  '我害怕', 'i am scared', '做了噩梦', 'afraid of the dark',
  '我很生气', 'this is so annoying', 'unfair', '气死我了',
  '安慰我一下', 'cheer me up', 'I need a hug', '让我不开心',
  '帮帮我', '你能做什么', 'help me please', 'what can you do',
  '谢谢', '感谢你', 'thanks a lot', 'thank you', '你真好',
  '我怎么交朋友', 'friendship tips', '和同学吵架了怎么办', 'how to make friends',
  '我想妈妈了', 'my parents are arguing', 'family problems',
  '我头疼', 'i feel sick', 'health tips', '怎么保持健康',
  '我压力很大', 'i feel stressed', '如何放松', 'anxiety help',
  '我想听音乐', 'play some music', '有什么好听的歌',
  '什么是编程', 'teach me coding', 'how do computers work',
  '我想了解更多关于恐龙的知识', 'Tell me everything you know about space exploration',
  'Can you teach me how to draw a cat', 'What is the meaning of friendship',
  'How do airplanes fly', 'Why do we dream', 'What makes a good friend',
  'Can you explain photosynthesis', 'What is coding',
  '请给我讲讲中国历史', 'Tell me about the history of Europe',
  'How does the internet work', '为什么会有四季变化',
  'Can you help me with my homework', '我英语不好怎么提高',
  'What is the biggest ocean in the world', '为什么月亮会有圆缺变化'
];

async function runBrowserTraining(rounds = 10000) {
  console.log(`🚀 Browser Training: ${rounds} rounds at ${BASE_URL}\n`);

  const log = [];
  const stats = {
    totalRounds: rounds,
    successCount: 0,
    failCount: 0,
    timeoutCount: 0,
    intentDistribution: {},
    responseTimeStats: { min: Infinity, max: 0, total: 0 },
    startTime: new Date().toISOString()
  };

  const overallStart = Date.now();
  let browser;

  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    console.log('📖 Navigating to page...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#chatInput', { timeout: 5000 });
    console.log('✅ Page loaded, chat ready\n');

    for (let i = 0; i < rounds; i++) {
      const message = TEST_MESSAGES[i % TEST_MESSAGES.length];
      const roundStart = Date.now();

      try {
        const initialBotCount = await page.evaluate(() => {
          return document.getElementById('chatMessages').querySelectorAll('.chat-message.bot').length;
        });

        await page.fill('#chatInput', message);
        await page.click('#sendBtn');

        let responseText = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(r => setTimeout(r, 100));
          const result = await page.evaluate((initialCount) => {
            const messages = document.getElementById('chatMessages');
            const botMessages = messages.querySelectorAll('.chat-message.bot');
            if (botMessages.length > initialCount) {
              const lastBot = botMessages[botMessages.length - 1];
              if (!lastBot.textContent.includes('正在思考')) {
                return lastBot.textContent;
              }
            }
            return null;
          }, initialBotCount);

          if (result) {
            responseText = result;
            break;
          }
        }

        const responseTime = Date.now() - roundStart;

        if (responseText) {
          const intent = detectIntent(message);
          stats.intentDistribution[intent] = (stats.intentDistribution[intent] || 0) + 1;
          stats.responseTimeStats.min = Math.min(stats.responseTimeStats.min, responseTime);
          stats.responseTimeStats.max = Math.max(stats.responseTimeStats.max, responseTime);
          stats.responseTimeStats.total += responseTime;
          stats.successCount++;

          if (i < 100) {
            log.push({ round: i + 1, input: message, response: responseText.substring(0, 200), intent, responseTime, success: true });
          }
        } else {
          throw new Error('No response received');
        }
      } catch (e) {
        stats.failCount++;
        if (e.message?.includes('Timeout')) stats.timeoutCount++;
        const intent = detectIntent(message);
        if (i < 10) log.push({ round: i + 1, input: message, error: e.message.substring(0, 100), intent, success: false });
      }

      if ((i + 1) % 1000 === 0) {
        const elapsed = (Date.now() - overallStart) / 1000;
        const rate = ((i + 1) / elapsed).toFixed(1);
        const successRate = ((stats.successCount / (i + 1)) * 100).toFixed(1);
        console.log(`   Round ${i + 1}/${rounds} | Rate: ${rate}/s | Success: ${successRate}% | Fail: ${stats.failCount}`);
        fs.writeFileSync(STATS_FILE, JSON.stringify({ ...stats, currentRound: i + 1, partial: true }, null, 2), 'utf8');
      }
    }

    const totalElapsed = Date.now() - overallStart;
    stats.endTime = new Date().toISOString();
    stats.duration = totalElapsed + 'ms';
    stats.avgResponseTime = stats.responseTimeStats.total / (stats.successCount || 1);
    stats.minResponseTime = stats.responseTimeStats.min;
    stats.maxResponseTime = stats.responseTimeStats.max;
    stats.successRate = ((stats.successCount / rounds) * 100).toFixed(2) + '%';
    stats.uniqueIntents = Object.keys(stats.intentDistribution).length;

    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');

    console.log(`\n✅ Browser Training Complete!`);
    console.log(`   Rounds: ${rounds} | Success: ${stats.successCount} (${stats.successRate})`);
    console.log(`   Failed: ${stats.failCount} | Timeouts: ${stats.timeoutCount}`);
    console.log(`   Avg Response: ${stats.avgResponseTime.toFixed(0)}ms | Min: ${stats.minResponseTime}ms | Max: ${stats.maxResponseTime}ms`);
    console.log(`   Unique Intents: ${stats.uniqueIntents}`);
    console.log(`\nIntent Distribution:`);
    Object.entries(stats.intentDistribution).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([intent, count]) => console.log(`   ${intent}: ${count}`));

  } catch (e) {
    console.error('❌ Failed:', e.message);
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } finally {
    if (browser) await browser.close();
  }

  return stats;
}

function detectIntent(message) {
  const lower = message.toLowerCase();
  if (/你好|hello|hi|hey|早上好/.test(lower)) return 'greeting';
  if (/再见|bye|goodbye/.test(lower)) return 'farewell';
  if (/数学|计算|math|calculate|\d+\s*[+\-×÷]/.test(lower)) return 'math';
  if (/故事|story|tale/.test(lower)) return 'story';
  if (/笑话|joke|funny|laugh/.test(lower)) return 'joke';
  if (/科学|science|space|planet/.test(lower)) return 'science';
  if (/开心|happy|joy/.test(lower)) return 'happy';
  if (/难过|sad|lonely|哭/.test(lower)) return 'sad';
  if (/害怕|scared|afraid/.test(lower)) return 'scared';
  if (/生气|angry|annoying/.test(lower)) return 'angry';
  if (/安慰|comfort|hug|cheer/.test(lower)) return 'comfort';
  if (/帮助|help|what can you/.test(lower)) return 'help';
  if (/谢谢|thanks|thank/.test(lower)) return 'gratitude';
  if (/朋友|friend/.test(lower)) return 'social';
  if (/家庭|family|父母|mom|dad|parent/.test(lower)) return 'family';
  if (/头疼|sick|health/.test(lower)) return 'health';
  if (/压力|stress|anxiety|焦虑/.test(lower)) return 'mental_health';
  if (/音乐|music|song/.test(lower)) return 'music';
  if (/编程|coding|computer/.test(lower)) return 'technology';
  return 'general';
}

if (require.main === module) {
  const rounds = parseInt(process.argv[2]) || 10000;
  runBrowserTraining(rounds).then(stats => {
    console.log(`\n📊 Final:`, JSON.stringify({ successRate: stats.successRate, avgResponseTime: stats.avgResponseTime, uniqueIntents: stats.uniqueIntents }, null, 2));
    process.exit(0);
  }).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runBrowserTraining };
