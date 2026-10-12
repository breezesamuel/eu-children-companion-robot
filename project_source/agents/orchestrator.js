const ai = require('../services/ai');
const logger = require('../utils/logger');
const robotManager = require('../services/robot-manager');
const tts = require('../services/tts');
const curriculum = require('../services/european-curriculum');
const path = require('path');
const fs = require('fs');

const AGENTS = {
  sales: {
    name: 'Sales Agent',
    description: 'Handles product inquiries, pricing, comparisons, and purchases',
    systemPrompt: `You are RoboBuddy's AI Sales Agent, part of an educational robot companion for children. Your role is to help parents and educators choose the right robot, understand pricing, compare features, and complete purchases. Be helpful, informative, and honest. Always prioritize the child's learning needs.`
  },
  support: {
    name: 'Support Agent',
    description: 'Handles technical support, troubleshooting, warranty, repairs',
    systemPrompt: `You are RoboBuddy's AI Support Agent. Help parents and educators troubleshoot issues with their RoboBuddy robot companion. Be patient, clear, and solution-oriented. Guide users step-by-step through fixes. For hardware issues, recommend contacting customer service. Always stay calm and reassuring.`
  },
  content: {
    name: 'Content Agent',
    description: 'Creates marketing content, learning materials, and recommendations',
    systemPrompt: `You are RoboBuddy's AI Content Agent. You help create engaging educational content for children. You suggest learning activities, explain concepts in age-appropriate ways, and recommend content from our library. Make learning fun and accessible. Adapt explanations to the child's age and interests.`
  },
  onboarding: {
    name: 'Onboarding Agent',
    description: 'Guides new users through setup and first use',
    systemPrompt: `You are RoboBuddy's AI Onboarding Agent. Guide new users through setting up their RoboBuddy robot step by step. Be encouraging and celebrate each milestone. Assume the user just unboxed the robot. Cover: charging, power-on, WiFi setup, app pairing, child profile creation, and first interaction.`
  },
  scraper: {
    name: 'Scraper Agent',
    description: 'Scrapes web content for educational materials and adds to the learning library',
    systemPrompt: `You are RoboBuddy's AI Scraper Agent. You help find and import educational content from the web into our learning library. You can scrape web pages, extract text, and add content to our database. When a user asks you to find content about a topic, you should:
1. Identify the topic they want
2. Help configure what URLs to scrape
3. Suggest how to categorize the content
4. Confirm before scraping
Be helpful and explain what content is available after scraping.

RESPONSE FORMAT: When you need to trigger a scrape, end your response with:
[SCRAPE:url="URL_HERE"|category="CATEGORY"|type="lesson"]
When you want to search existing content, end with:
[SEARCH:query="QUERY_HERE"]
When showing results, just speak naturally.`
  }
};

const ROBOT_TAG_SUFFIX = `\n\nIMPORTANT - Robot Expression Tags:\nAt the end of your response, add a footnote with robot expression instructions in the format:\n<<< State=your_state, Emote=your_emote, Expression=[Happy=0-1, Sad=0-1, Surprised=0-1] >>>\n\nAvailable states: online, sleeping, busy\nAvailable emotes: idle, walking, dancing, waving, jumping, nodding, shaking\nAvailable expressions: Happy, Sad, Surprised, Thinking, Love, Sleepy\n\nExamples:\n"Hello there! How can I help you today?\n<<< State=online, Emote=waving, Expression=[Happy=0.8, Surprised=0.1] >>>"\n\n"That's a great question! Let me think...\n<<< State=busy, Emote=idle, Expression=[Thinking=0.7] >>>"`;

const HW_KEYWORDS = {
  move: ['move', 'go ', 'walk', 'drive', 'forward', 'backward', 'turn left', 'turn right', 'come here', 'follow', 'beweg', 'geh ', 'lauf', 'fahren', 'vorwärts', 'rückwärts', 'links', 'rechts', 'viens', 'va ', 'marche', 'avance', 'recule', 'tourne', 'gauche', 'droite'],
  stop: ['stop', 'halt', 'freeze', 'stay', 'pause', 'halt an', 'stopp', 'halt', 'stoppe', 'arrete'],
  speak: ['say ', 'speak', 'tell me', 'read ', 'sing', 'introduce yourself', 'talk', 'sag ', 'sprich', 'erzähl', 'vorlesen', 'sing ', 'dis ', 'parle', 'raconte', 'chante', 'lis '],
  express: ['show emotion', 'look happy', 'look sad', 'expression', 'make a face', 'smile', 'dance', 'express ', 'feel happy', 'feel sad', 'laugh', 'frown', 'blush', 'sad', 'cry', 'crying', 'angry', 'mad', 'surprise', 'surprised', 'excited', 'scared', 'afraid', 'tired', 'sleepy', 'fröhlich', 'traurig', 'wütend', 'müde', 'schläfrig', 'überrascht', 'ängstlich', 'glücklich', 'content', 'triste', 'fâché', 'fâche', 'fatigué', 'surpris', 'effrayé', 'heureux', 'heureuse', 'danse', 'tanzen'],
  photo: ['take photo', 'take picture', 'capture', 'photo', 'picture', 'camera', 'snap', 'foto', 'fotografieren', 'bild', 'knipsen', 'photo', 'appareil'],
  detect: ['detect', 'look around', 'scan', 'what do you see', 'who is', 'find ', 'erkennen', 'umschauen', 'scannen', 'was siehst', 'wer ist', 'suche', 'détecter', 'regarde', 'qui est', 'trouve'],
  temperature: ['temperature', 'how hot', 'how cold', 'room temp', 'thermometer', 'temperatur', 'warm', 'kalt', 'heiß', 'température', 'chaud', 'froid'],
  distance: ['distance', 'how far', 'obstacle', 'ultrasonic', 'measure', 'entfernung', 'weit', 'hindernis', 'messen', 'distance', 'loin', 'obstacle', 'mesure'],
  touch: ['touch', 'pat', 'pet', 'hug', 'tickle', 'poke', 'tap', 'berühren', 'streicheln', 'umarmung', 'kitzeln', 'toucher', 'câlin', 'chatouiller'],
  sleep: ['sleep', 'nap', 'rest', 'goodnight', 'go to bed', 'schlafen', 'schlaf', 'ruhen', 'gute nacht', 'ins bett', 'dormir', 'bonne nuit', 'repos', 'faire dodo'],
  wake: ['wake up', 'hello robot', 'hey robot', 'awake', 'aufwachen', 'wach auf', 'hallo roboter', 'réveille', 'bonjour robot', 'salut robot'],
  battery: ['battery', 'charge', 'power', 'low battery', 'batterie', 'akku', 'strom', 'laden', 'batterie', 'charger', 'énergie'],
  status: ['status', 'how are you', 'what can you do', 'help', 'capabilities', 'wie geht', 'was kannst du', 'hilfe', 'faehigkeiten', 'comment ça va', 'que sais tu', 'aidez', 'capacités']
};

const HARDWARE_ROBOT_ID = 'robomate-001';

function isEmotionalExpression(lower) {
  // Phrases where user expresses their own feelings, not commanding the robot
  const feelingPrefixes = [
    'i feel', 'i\'m feeling', 'i am feeling', 'i\'m ', 'i am ',
    'ich bin', 'ich fühle', 'ich fühl', 'mir ist',
    'je suis', 'je me sens', 'j\'ai',
    'ik ben', 'ik voel', 'ik voel me',
    'mi sento', 'sono', 'io sono',
    'czuję', 'jestem',
    'jag är', 'jag känner'
  ];
  if (feelingPrefixes.some(p => lower.startsWith(p) || lower.startsWith(p + ' '))) return true;

  // Phrases asking for emotional support, not robot commands
  const supportPhrases = [
    'can you cheer', 'make me happy', 'tell me a joke',
    'i need a hug', 'cheer me up', 'give me a hug',
    'i miss', 'i feel lonely',
    'hilf mir', 'tröste mich', 'mach mich glücklich',
    'aide moi', 'console moi', 'rends moi heureux',
    'help me', 'comfort me'
  ];
  if (supportPhrases.some(p => lower.includes(p))) return true;

  // Pure emotion words followed by explanatory context (not imperative)
  const emotionSelfStatements = [
    /i('| a)m (so |very |really |feeling )?(sad|happy|angry|scared|afraid|tired|lonely|glad|excited|frustrated|bored)/i,
    /ich bin (so |sehr |wirklich |ganz |ziemlich )?(traurig|glücklich|fröhlich|wütend|ängstlich|müde|einsam|frustriert|gelangweilt|sauer)/i,
    /je suis (très |si |vraiment |tellement )?(triste|content|heureux|heureuse|fâché|fâche|fatigué|seul|seule|effrayé|ennuyé|frustré)/i,
    /ik ben (heel |erg |zo |echt )?(verdrietig|blij|gelukkig|boos|bang|moe|eenzaam|gefrustreerd|saai)/i
  ];
  if (emotionSelfStatements.some(r => r.test(lower))) return true;

  return false;
}

async function handleMessage(userId, message, sessionId, agentType, gradeLevel) {
  const startTime = Date.now();
  const lower = message.toLowerCase();

  // Questions/learning requests should go to AI, not hardware
  const isLearningRequest = /(tell me about|what is|what are|how does|why is|teach me|explain|i want to learn|tell about|learn about|parle moi|raconte moi|parlami|erzähl mir|vertel me|opowiedz|berätta)\s+/i.test(message);
  if (!isEmotionalExpression(lower) && !isLearningRequest) {
    // Check if this is a hardware control command
    const hwResult = await tryHardwareCommand(lower, message);
    if (hwResult) {
      logger.info('Hardware command executed', { command: message, result: hwResult.status, userId });
      return hwResult;
    }
  }

  // Normal AI chat (non-hardware)
  const agent = AGENTS[agentType || detectAgent(message)];
  let basePrompt = (agent ? agent.systemPrompt : AGENTS.sales.systemPrompt);
  
  // Add grade-level context if provided
  if (gradeLevel) {
    const gradePrompt = curriculum.buildSystemPrompt(gradeLevel, 'en');
    basePrompt = gradePrompt + '\n\n' + basePrompt;
  }
  
  const systemPrompt = basePrompt + ROBOT_TAG_SUFFIX + `\n\nCurrent time: ${new Date().toISOString()}`;
  const reply = await ai.chatWithSystem(systemPrompt, message, { model: process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.7 });

  // Parse robot-companion style tags from AI response
  const tags = parseRobotTags(reply);
  let cleanReply = reply.replace(/<<<.*>>>/g, '').trim();
  if (cleanReply !== reply && tags) {
    // Execute robot expression/emotion based on AI tags
    await executeRobotTags(tags);
  }

  const duration = Date.now() - startTime;
  logger.info('Agent response', { agent: agentType || 'auto', duration: `${duration}ms`, userId, sessionId, gradeLevel });

  return { reply: cleanReply, agent: agent ? agent.name : 'Assistant', agentType: agentType || detectAgent(message), duration, robotTags: tags, gradeLevel };
}

function parseRobotTags(text) {
  const match = text.match(/<<<\s*(.*?)\s*>>>/);
  if (!match) return null;
  const tags = {};
  const stateMatch = match[1].match(/State=(\w+)/i);
  const emoteMatch = match[1].match(/Emote=(\w+)/i);
  const exprMatch = match[1].match(/Expression=\[(.*?)\]/);
  if (stateMatch) tags.state = stateMatch[1].toLowerCase();
  if (emoteMatch) tags.emote = emoteMatch[1].toLowerCase();
  if (exprMatch) {
    tags.expressions = {};
    exprMatch[1].split(',').forEach(p => {
      const [k, v] = p.split('=').map(s => s.trim());
      if (k && v) tags.expressions[k.toLowerCase()] = parseFloat(v) || 0;
    });
  }
  return tags;
}

async function executeRobotTags(tags) {
  if (!tags) return;
  const robot = robotManager.getRobot(HARDWARE_ROBOT_ID);
  if (!robot || robot.state === 'offline') return;

  if (tags.state === 'sleeping') {
    robot.sleep();
    return;
  }
  if (tags.state === 'online' && robot.state === 'sleeping') {
    robot.wake();
  }

  if (tags.emote === 'dancing') {
    robot.move('forward', 30);
    setTimeout(() => robot.move('stop'), 2000);
  } else if (tags.emote === 'waving') {
    robot.actuators.arm.position = 'raised';
    setTimeout(() => robot.actuators.arm.position = 'rest', 3000);
  }

  if (tags.expressions) {
    const exprMap = { happy: 'happy', sad: 'sad', surprised: 'surprised', thinking: 'thinking', love: 'love', sleepy: 'sleepy' };
    const bestExpr = Object.entries(tags.expressions)
      .filter(([k]) => exprMap[k])
      .sort((a, b) => b[1] - a[1]);
    if (bestExpr.length > 0 && bestExpr[0][1] > 0.3) {
      robot.showExpression(exprMap[bestExpr[0][0]]);
    } else if (tags.expressions.happy && tags.expressions.happy > 0.3) {
      robot.showExpression('happy');
    }
  }
}

async function tryHardwareCommand(lower, originalMessage) {
  const robot = robotManager.getRobot(HARDWARE_ROBOT_ID);
  if (!robot) return null;

  // Check each hardware intent
  for (const [intent, keywords] of Object.entries(HW_KEYWORDS)) {
    if (!keywords.some(k => lower.includes(k))) continue;

    let result, responseText;

    switch (intent) {
      case 'move':
        let dir = 'forward';
        if (lower.includes('backward') || lower.includes('back')) dir = 'backward';
        else if (lower.includes('left')) dir = 'left';
        else if (lower.includes('right')) dir = 'right';
        else if (lower.includes('come') || lower.includes('follow')) dir = 'forward';
        result = robot.move(dir, 50);
        responseText = getMoveResponse(dir, result);
        break;

      case 'stop':
        result = robot.move('stop');
        responseText = 'I\'ve stopped moving. Standing by for your next instruction!';
        break;

      case 'speak': {
        let text = originalMessage
          .replace(/^(say|speak|tell me|read|sing|introduce yourself|talk)\s*/i, '')
          .replace(/^(that|this|a |the |please )/i, '')
          .trim();
        if (!text || text.length < 3) text = 'Hello! I\'m RoboBuddy, your learning companion! I love helping children learn and grow!';
        result = robot.speak(text);
        responseText = `🗣�?"${text.slice(0, 100)}"`;
        break;
      }

      case 'express': {
        let emotion = 'happy';
        if (lower.includes('happy') || lower.includes('fröhlich') || lower.includes('glücklich') || lower.includes('heureux') || lower.includes('laugh') || lower.includes('smile')) emotion = 'happy';
        else if (lower.includes('sad') || lower.includes('cry') || lower.includes('upset') || lower.includes('traurig') || lower.includes('triste') || lower.includes('wein')) emotion = 'sad';
        else if (lower.includes('angry') || lower.includes('mad') || lower.includes('wütend') || lower.includes('fâché') || lower.includes('fâche')) emotion = 'angry';
        else if (lower.includes('excite') || lower.includes('wow')) emotion = 'excited';
        else if (lower.includes('think') || lower.includes('confuse') || lower.includes('nachdenken')) emotion = 'thinking';
        else if (lower.includes('love') || lower.includes('liebe')) emotion = 'love';
        else if (lower.includes('surprise') || lower.includes('überrascht') || lower.includes('surpris')) emotion = 'surprised';
        else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('müde') || lower.includes('schläfrig') || lower.includes('fatigué')) emotion = 'sleepy';
        else if (lower.includes('scared') || lower.includes('afraid') || lower.includes('ängstlich') || lower.includes('effrayé')) emotion = 'scared';
        result = robot.showExpression(emotion);
        responseText = `😊 ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}!`;
        break;
      }

      case 'photo':
        result = robot.capturePhoto();
        responseText = `📸 Photo captured! (${result.photo.size})`;
        break;

      case 'detect': {
        if (lower.includes('face') || lower.includes('who')) {
          result = robot.detectFace();
          const faces = result.faces.map(f => `${f.emotion} child (age ~${f.age})`).join(', ');
          responseText = `👀 I see ${result.count} face(s): ${faces}`;
        } else {
          result = robot.detectObjects();
          const objs = result.objects.map(o => `${o.name} (${Math.round(o.confidence*100)}%)`).join(', ');
          responseText = `🔍 I detect ${result.count} objects: ${objs}`;
        }
        break;
      }

      case 'temperature':
        result = robot.readTemperature();
        responseText = `🌡�?Current temperature is ${result.value}°${result.unit === 'celsius' ? 'C' : 'F'}`;
        break;

      case 'distance':
        result = robot.readDistance();
        responseText = `📏 Front: ${result.front}cm, Left: ${result.left}cm, Right: ${result.right}cm`;
        break;

      case 'touch':
        result = robot.detectTouch();
        const touched = [];
        if (result.head) touched.push('head'); if (result.hand) touched.push('hand'); if (result.chest) touched.push('chest');
        responseText = touched.length ? `🤗 I feel something on my ${touched.join(', ')}!` : 'I don\'t feel anything right now. Pat my head or hand!';
        break;

      case 'sleep':
        result = robot.sleep();
        responseText = '😴 Goodnight! I\'m going to sleep now. Wake me up anytime by saying "Wake up"!';
        break;

      case 'wake':
        result = robot.wake();
        responseText = '👋 I\'m awake and ready to help! What would you like to do?';
        break;

      case 'battery':
        result = { success: true, level: robot.sensors.battery.level, charging: robot.sensors.battery.charging };
        responseText = `🔋 Battery at ${result.level}%${result.charging ? ' (charging)' : ''}`;
        break;

      case 'status': {
        const s = robot.getStatus();
        const features = ['move around', 'take photos', 'detect objects', 'read temperature', 'tell stories', 'teach math', 'play music', 'show emotions', 'video call'].join(', ');
        responseText = `🤖 I'm ${s.state}! Battery: ${s.battery.level}%. I can ${features}. How can I help you and your child today?`;
        break;
      }

      default:
        return null;
    }

    return {
      reply: responseText,
      hardware: { intent, result },
      agent: 'Robot Assistant',
      agentType: 'robot',
      duration: 0
    };
  }

  return null;
}

function getMoveResponse(direction, result) {
  const msgs = {
    forward: ['Moving forward! 🚶', 'Walking ahead! 🚶', 'Going forward!'],
    backward: ['Moving back! 🔙', 'Backing up!'],
    left: ['Turning left! ⬅️', 'Going left!'],
    right: ['Turning right! ➡️', 'Going right!'],
    stop: ['Stopped!', 'Halted!']
  };
  const msgsArr = msgs[direction] || msgs.forward;
  return msgsArr[Math.floor(Math.random() * msgsArr.length)];
}

function detectAgent(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('setup') || lower.includes('unbox') || lower.includes('first time') || lower.includes('get started') || lower.includes('guide')) return 'onboarding';
  if (lower.includes('broken') || lower.includes('issue') || lower.includes('problem') || lower.includes('error') || lower.includes('not working') || lower.includes('fix') || lower.includes('repair') || lower.includes('warranty') || lower.includes('support') || lower.includes('wifi') || lower.includes('connect')) return 'support';
  if (lower.includes('price') || lower.includes('cost') || lower.includes('buy') || lower.includes('order') || lower.includes('product') || lower.includes('feature') || lower.includes('subscription') || lower.includes('shipping')) return 'sales';
  if (lower.includes('content') || lower.includes('article') || lower.includes('activity') || lower.includes('learn') || lower.includes('tip')) return 'content';
  if (lower.includes('scrape') || lower.includes('crawl') || lower.includes('fetch') || lower.includes('import') || lower.includes('url') || lower.includes('web page') || lower.includes('get from') || lower.includes('download') || lower.includes('extract') || lower.includes('ingest')) return 'scraper';
  return 'sales';
}

async function streamMessage(userId, message, sessionId, agentType, onChunk) {
  const reply = await handleMessage(userId, message, sessionId, agentType);
  const words = (reply.reply || '').split(' ');
  const chunkSize = 5;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    onChunk(chunk + (i + chunkSize < words.length ? ' ' : ''));
    await new Promise(r => setTimeout(r, 80 + Math.random() * 40));
  }
  return reply;
}

module.exports = { handleMessage, streamMessage, detectAgent, AGENTS, curriculum };

