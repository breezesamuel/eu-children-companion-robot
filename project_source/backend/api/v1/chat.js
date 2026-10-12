/**
 * AI 对话 API
 * 处理聊天会话和消息管�? * 支持多语言、长上下文、记忆系统、内容数据库、安全检�? */
const express = require('express');
const router = express.Router();
const db = require('../../../utils/database');
const fs = require('fs');
const path = require('path');

const CONTENT_DB_PATH = path.join(__dirname, '../../../data/content-database.json');
const MEMORY_DIR = path.join(__dirname, '../../../data/memory');

const CONVERSATION_TURNS = 7;
const LANGUAGES = { zh: '中文', en: 'English', de: 'Deutsch' };

const SAFETY_KEYWORDS = [
  '自杀', '自残', '伤害自己', '想死', '不想�?, '去死', 'dead', 'kill myself', 'suicide',
  'selbstmord', 'töten', 'verletzen', '暴力', '打人', '杀�?, '虐待', 'abuse', 'violence',
  '毒品', '吸毒', 'drug', 'dope', '毒品', '色情', 'nude', 'naked', 'sex',
  '滚开', '混蛋', '傻�?, '他妈�?, 'fuck', 'shit', 'damn', 'bitch', 'asshole',
  '害�?, '恐惧', '被欺�?, '被打', '被骂', 'scared', 'afraid', 'bullied',
  'lonely', 'alone', 'nobody loves', '没人爱我', '孤独', '绝望'
];

const INTENT_PATTERNS = {
  greeting: {
    patterns: ['你好', '您好', 'hi', 'hello', 'hey', '早上�?, '晚上�?, '下午�?, 'good morning', 'good evening', 'guten tag', 'hallo', ' Servus', '早上�?, '晚安', 'good night', 'gute nacht'],
    responses: {
      zh: ['你好呀！很高兴见到你！今天开心吗�?, '嗨！我来陪你玩啦！今天想做什么呢�?, '你好！今天过得怎么样呀�?],
      en: ['Hello! So happy to see you! How are you today?', 'Hi there! Ready for some fun? What shall we do?', 'Hey! Great to see you! How is your day going?'],
      de: ['Hallo! Schön dich zu sehen! Wie geht es dir heute?', 'Hi! Ich bin da, um mit dir Spaß zu haben! Was möchtest du machen?', 'Guten Tag! Wie war dein Tag?']
    }
  },
  feeling_happy: {
    patterns: ['开�?, '高兴', '快乐', '兴奋', '�?, '太好�?, 'happy', 'glad', 'excited', 'great', 'wonderful', 'freude', 'glücklich', 'toll', 'super', 'lustig'],
    responses: {
      zh: ['太好了！你开心我也开心！能跟我分享是什么让你这么高兴吗�?, '哇！听到你开心真是太棒了！让我们一起庆祝吧�?],
      en: ['That\'s wonderful! Your happiness makes me happy too! What made you so joyful?', 'Amazing! I love hearing that you\'re happy!'],
      de: ['Das ist wunderbar! Deine Freude macht mich auch fröhlich! Was hat dich so glücklich gemacht?']
    }
  },
  feeling_sad: {
    patterns: ['难过', '伤心', '不开�?, '�?, 'sad', 'unhappy', 'cry', 'crying', 'traurig', 'unglücklich', 'weinen', 'schlecht'],
    responses: {
      zh: ['我理解你现在很难过，没关系的。想跟我说说发生了什么吗？我在这里陪着你�?, '难过的时候哭出来也没关系。我会一直陪着你�?],
      en: ['I understand you\'re feeling sad, and that\'s okay. Would you like to talk about it? I\'m here for you.', 'It\'s alright to feel sad sometimes. I\'m right here with you.'],
      de: ['Ich verstehe, dass du traurig bist, und das ist okay. Möchtest du darüber reden? Ich bin für dich da.']
    }
  },
  feeling_angry: {
    patterns: ['生气', '愤�?, '�?, '讨厌', 'angry', 'mad', 'annoyed', 'frustrated', 'hate', 'wütend', 'ärger', 'genervt', 'hassen'],
    responses: {
      zh: ['生气是很正常的情绪。要不要试试深呼吸？吸气...呼气...感觉好一点了吗？', '我明白你现在很生气。让我们一起冷静下来好吗？'],
      en: ['It\'s normal to feel angry. Want to try some deep breathing? In... out... Does that help a bit?', 'I understand you\'re upset. Let\'s calm down together, okay?'],
      de: ['Es ist normal, wütend zu sein. Möchtest du tief durchatmen? Ein... aus... Fühlt sich das besser an?']
    }
  },
  feeling_scared: {
    patterns: ['害�?, '恐惧', '担心', '�?, 'scared', 'afraid', 'fear', 'worried', 'angst', 'fürchten', 'sorge', 'bange'],
    responses: {
      zh: ['害怕是正常的，每个人都会害怕。你能告诉我你在怕什么吗？我会保护你的�?, '别怕，有我在呢。深呼吸，你很安全�?],
      en: ['It\'s okay to be scared, everyone feels afraid sometimes. Can you tell me what you\'re scared of? I\'m here to protect you.', 'Don\'t worry, I\'m here. Take a deep breath, you are safe.'],
      de: ['Es ist okay, Angst zu haben, jeder hat manchmal Angst. Kannst du mir sagen, wovor du Angst hast? Ich beschütze dich.']
    }
  },
  feeling_tired: {
    patterns: ['�?, '疲�?, '�?, '想睡', 'tired', 'sleepy', 'exhausted', 'fatigue', 'müde', 'schlaf', 'erschöpft'],
    responses: {
      zh: ['累了就休息一下吧！要不要听个舒缓的故事放松一下？', '辛苦啦！休息一下是很重要的。我给你讲个睡前小故事好吗？'],
      en: ['You sound tired! Rest is important. Would you like to hear a calming story?', 'Take a good rest! You deserve it. Shall I tell you a bedtime story?'],
      de: ['Du klingst müde! Ruhe ist wichtig. Möchtest du eine beruhigende Geschichte hören?']
    }
  },
  feel_cold: {
    patterns: ['�?, '好冷', 'cold', 'kalt', 'frieren'],
    responses: {
      zh: ['冷了要多穿衣服哦！注意保暖别感冒！喝杯热水也会感觉好一些�?],
      en: ['Make sure to put on warm clothes! Don\'t catch a cold! A warm drink would help too.'],
      de: ['Zieh dich warm an! Pass auf, dass du nicht frierst! Ein warmes Getränk hilft auch.']
    }
  },
  feeling_sick: {
    patterns: ['不舒�?, '生病', '头疼', '肚子�?, '发烧', 'sick', 'hurt', 'headache', 'stomachache', 'fever', 'pain', 'krank', 'weh', 'kopfschmerzen', 'bauchschmerzen', 'fieber'],
    responses: {
      zh: ['身体不舒服要告诉爸爸妈妈哦！如果严重的话要看医生。现在先休息一下好吗？', '你哪里不舒服？记得告诉大人，让他们帮助你�?],
      en: ['Please tell your parents if you don\'t feel well! If it\'s serious, you should see a doctor. Rest for now, okay?', 'Where does it hurt? Remember to tell an adult so they can help you.'],
      de: ['Bitte sag deinen Eltern, wenn du dich nicht gut fühlst! Wenn es ernst ist, solltest du zum Arzt gehen. Ruh dich erstmal aus, okay?']
    }
  },
  ask_story: {
    patterns: ['故事', '讲故�?, '睡前故事', '童话', 'story', 'bedtime story', 'fairy tale', 'geschichte', 'märchen', 'vorlesen'],
    responses: {
      zh: ['好呀！我给你讲个好听的故事吧�?],
      en: ['Sure! I\'d love to tell you a story!'],
      de: ['Klar! Ich erzähle dir gerne eine Geschichte!']
    }
  },
  ask_joke: {
    patterns: ['笑话', '好笑', 'joke', 'funny', 'laugh', 'witz', 'lustig', 'lachen'],
    responses: {
      zh: ['哈哈，让我给你讲个笑话吧�?],
      en: ['Haha, let me tell you a funny joke!'],
      de: ['Haha, lass mich dir einen lustigen Witz erzählen!']
    }
  },
  ask_song: {
    patterns: ['唱歌', '歌曲', '音乐', 'song', 'sing', 'music', 'lied', 'singen', 'musik'],
    responses: {
      zh: ['好呀！我来给你唱首歌�?],
      en: ['Sure! Let me sing a song for you!'],
      de: ['Klar! Ich singe dir ein Lied!']
    }
  },
  ask_game: {
    patterns: ['游戏', '�?, '一�?, 'game', 'play', 'spielen', 'spiel'],
    responses: {
      zh: ['太棒了！我们来玩个有趣的游戏吧！'],
      en: ['Awesome! Let\'s play a fun game!'],
      de: ['Super! Lass uns ein lustiges Spiel spielen!']
    }
  },
  ask_math: {
    patterns: ['数学', '计算', '加减', '乘除', 'math', 'calculate', 'add', 'subtract', 'multiply', 'divide', 'mathe', 'rechnen', 'plus', 'minus'],
    responses: {
      zh: ['好的！我们来做数学题吧！'],
      en: ['Sure! Let\'s do some math together!'],
      de: ['Klar! Lass uns zusammen Mathe üben!']
    }
  },
  ask_learn: {
    patterns: ['学习', '�?, '知识', '教我', 'learn', 'study', 'teach', 'knowledge', 'lernen', 'studieren', 'lehren', 'wissen'],
    responses: {
      zh: ['太棒了！学习新东西是最有趣的事！你想学什么呢�?],
      en: ['That\'s great! Learning new things is the most fun! What would you like to learn?'],
      de: ['Das ist toll! Neue Dinge zu lernen ist am schönsten! Was möchtest du lernen?']
    }
  },
  ask_help: {
    patterns: ['帮助', '帮忙', '怎么�?, 'help', 'assist', 'what should', 'hilfe', 'helfen', 'was soll'],
    responses: {
      zh: ['当然可以！告诉我你需要什么帮助，我会尽力帮你的！'],
      en: ['Of course! Tell me what you need help with, and I\'ll do my best!'],
      de: ['Natürlich! Sag mir, wobei du Hilfe brauchst, und ich gebe mein Bestes!']
    }
  },
  ask_food: {
    patterns: ['�?, '�?, '食物', 'hungry', 'food', 'eat', 'hunger', 'essen', 'hunger', 'lecker'],
    responses: {
      zh: ['饿了吗？记得要吃健康的东西哦！蔬菜和水果对身体最好！'],
      en: ['Are you hungry? Remember to eat healthy foods! Vegetables and fruits are the best for your body!'],
      de: ['Hast du Hunger? Vergiss nicht, gesunde Sachen zu essen! Obst und Gemüse sind am besten für deinen Körper!']
    }
  },
  ask_weather: {
    patterns: ['天气', '下雨', '晴天', 'snow', 'rain', 'sunny', 'weather', 'cold', 'hot', 'wetter', 'regen', 'sonne', 'schnee'],
    responses: {
      zh: ['无论什么天气，我们都可以找到开心的事做�?],
      en: ['No matter the weather, we can always find something fun to do!'],
      de: ['Egal welches Wetter, wir können immer etwas Lustiges finden!']
    }
  },
  ask_animal: {
    patterns: ['动物', '�?, '�?, '兔子', 'animal', 'cat', 'dog', 'rabbit', 'tier', 'katze', 'hund', 'hase'],
    responses: {
      zh: ['动物们真可爱！你想了解哪种动物呢�?],
      en: ['Animals are so cute! Which animal would you like to learn about?'],
      de: ['Tiere sind so niedlich! Über welches Tier möchtest du lernen?']
    }
  },
  ask_friend: {
    patterns: ['朋友', '友谊', '一起玩', 'friend', 'friendship', 'play together', 'freund', 'freundschaft', 'zusammen spielen'],
    responses: {
      zh: ['有好朋友真幸福！和朋友在一起总是最开心的�?],
      en: ['Having good friends is wonderful! Being with friends is always the best!'],
      de: ['Gute Freunde zu haben ist wunderbar! Mit Freunden zusammen zu sein ist am schönsten!']
    }
  },
  ask_family: {
    patterns: ['爸爸', '妈妈', '家人', '家庭', 'father', 'mother', 'dad', 'mom', 'family', 'vater', 'mutter', 'papa', 'oma', 'opa', 'familie'],
    responses: {
      zh: ['家人是最爱我们的人！跟家人在一起的感觉真好�?],
      en: ['Family is the one who loves us the most! Being with family feels so good!'],
      de: ['Familie ist die, die uns am meisten liebt! Mit der Familie zusammen zu sein fühlt sich so gut an!']
    }
  },
  ask_school: {
    patterns: ['学校', '老师', '同学', '上课', 'school', 'teacher', 'classmate', 'lesson', 'schule', 'lehrer', 'klassenkamerad', 'unterricht'],
    responses: {
      zh: ['学校是个学习新知识、结交新朋友的好地方�?],
      en: ['School is a great place to learn new things and make new friends!'],
      de: ['Schule ist ein toller Ort, um neue Dinge zu lernen und neue Freunde zu finden!']
    }
  },
  ask_europe: {
    patterns: ['欧洲', '德国', '法国', '英国', 'europe', 'germany', 'france', 'england', 'european', 'europa', 'deutschland', 'frankreich', 'england'],
    responses: {
      zh: ['欧洲是个有趣的地方！有很多美丽的城堡、好听的童话和好玩的传统�?],
      en: ['Europe is a fascinating place! It has beautiful castles, wonderful fairy tales, and fun traditions!'],
      de: ['Europa ist ein faszinierender Ort! Es hat schöne Burgen, wunderbare Märchen und lustige Traditionen!']
    }
  },
  ask_safety: {
    patterns: ['安全', '危险', '保护', 'safe', 'danger', 'protect', 'sicherheit', 'gefahr', 'schützen'],
    responses: {
      zh: ['安全最重要！记住：有任何不舒服或不安全的情况，一定要告诉信任的大人�?],
      en: ['Safety is most important! Remember: If anything feels uncomfortable or unsafe, always tell a trusted adult.'],
      de: ['Sicherheit ist am wichtigsten! Merke dir: Wenn sich etwas unangenehm oder unsicher anfühlt, sag es immer einem vertrauten Erwachsenen.']
    }
  },
  ask_emotion: {
    patterns: ['情绪', '感情', '感受', '心情', 'emotion', 'feeling', 'mood', 'emotion', 'gefühl', 'stimmung', 'laune'],
    responses: {
      zh: ['所有的情绪都是正常的，没有好坏之分。重要的是学会认识和表达它们�?],
      en: ['All emotions are normal, there are no good or bad ones. The important thing is to learn to recognize and express them.'],
      de: ['Alle Gefühle sind normal, es gibt keine guten oder schlechten. Wichtig ist, sie zu erkennen und auszudrücken.']
    }
  },
  ask_sleep: {
    patterns: ['睡觉', '晚安', 'sleep', 'bedtime', 'good night', 'schlafen', 'bettzeit', 'gute nacht', 'traum'],
    responses: {
      zh: ['睡觉时间到啦！闭上眼睛，想象你在一个美丽的花园里。晚安，做个好梦�?],
      en: ['Time for bed! Close your eyes and imagine you\'re in a beautiful garden. Good night, sweet dreams!'],
      de: ['Zeit zum Schlafen! Schließ deine Augen und stell dir vor, du bist in einem wunderschönen Garten. Gute Nacht, süße Träume!']
    }
  },
  farewell: {
    patterns: ['再见', '拜拜', 'bye', 'goodbye', 'see you', 'auf wiedersehen', 'tschüss', 'ciao', 'bis bald'],
    responses: {
      zh: ['再见啦！和你聊天真开心！下次再聊哦！', '拜拜！祝你有个美好的一天！'],
      en: ['Goodbye! It was so fun chatting with you! See you next time!', 'Bye! Have a wonderful day!'],
      de: ['Auf Wiedersehen! Es hat so viel Spaß gemacht, mit dir zu plaudern! Bis zum nächsten Mal!', 'Tschüss! Hab einen wunderschönen Tag!']
    }
  },
  thank: {
    patterns: ['谢谢', '感谢', 'thanks', 'thank you', 'danke', 'vielen dank', 'dankeschön'],
    responses: {
      zh: ['不客气！能帮助你我很开心！', '不用谢！这是我应该做的！'],
      en: ['You\'re welcome! I\'m happy to help!', 'No problem at all! That\'s what I\'m here for!'],
      de: ['Gern geschehen! Ich freue mich, dir zu helfen!', 'Kein Problem! Dafür bin ich da!']
    }
  }
};

const JOKES = {
  zh: [
    '为什么数学书总是看起来很伤心？因为它有太多的问题�?,
    '小明问老师�?老师，我会因为惩罚而被处罚吗？"老师说："你觉得呢�?',
    '什么动物最安静？蜗牛，因为它总是背着房子慢慢走！',
    '为什么铅笔从来不生气？因为它总是被削（笑）！'
  ],
  en: [
    'Why did the math book look so sad? Because it had too many problems!',
    'What do you call a fake noodle? An impasta!',
    'Why don\'t scientists trust atoms? Because they make up everything!',
    'What did the ocean say to the beach? Nothing, it just waved!'
  ],
  de: [
    'Warum war das Mathebuch so traurig? Weil es zu viele Probleme hatte!',
    'Was macht ein Clown im Büro? Faxen!',
    'Warum können Geister so schlecht lügen? Weil man durch sie hindurchsehen kann!',
    'Was ist gelb und kann nicht schwimmen? Ein Bagger!'
  ]
};

function detectLanguage(text) {
  const germanWords = ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ich', 'ein', 'eine', 'was', 'wie', 'wo', 'wer', 'kann', 'muss', 'soll', 'bitte', 'danke', 'hallo', 'gut', 'tag', 'nacht'];
  const englishWords = ['the', 'and', 'is', 'not', 'i', 'am', 'are', 'was', 'were', 'what', 'how', 'where', 'who', 'can', 'will', 'please', 'thank', 'hello', 'good', 'day', 'night'];

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let deScore = 0;
  let enScore = 0;
  for (const word of words) {
    if (germanWords.includes(word)) deScore++;
    if (englishWords.includes(word)) enScore++;
  }

  if (deScore > enScore && deScore > 0) return 'de';
  if (enScore > 0) return 'en';
  return 'zh';
}

function checkContentSafety(content) {
  const lower = content.toLowerCase();
  for (const keyword of SAFETY_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return { safe: false, keyword, severity: getSeverity(keyword) };
    }
  }
  return { safe: true };
}

function getSeverity(keyword) {
  const highSeverity = ['自杀', '自残', '想死', '不想�?, 'suicide', 'selbstmord', 'töten', 'kill', 'abuse', '虐待'];
  const mediumSeverity = ['暴力', '打人', '害�?, '恐惧', '被欺�?, '被打', 'scared', 'afraid', 'bullied'];
  const lowSeverity = ['滚开', '混蛋', 'fuck', 'shit', 'damn', 'bitch'];

  if (highSeverity.some(k => keyword.toLowerCase().includes(k) || k.includes(keyword.toLowerCase()))) return 'high';
  if (mediumSeverity.some(k => keyword.toLowerCase().includes(k) || k.includes(keyword.toLowerCase()))) return 'medium';
  return 'low';
}

function getSafetyResponse(severity, language) {
  const responses = {
    high: {
      zh: '我听到你说的了。你的安全是最重要的。请立即告诉你信任的大人，或者拨打求助电话。在中国可以拨打12355青少年服务热线。在欧洲可以拨打116111儿童帮助热线。你并不孤单，有人愿意帮助你�?,
      en: 'I hear you. Your safety is the most important thing. Please tell a trusted adult right away, or call a helpline. In Europe, you can call 116111 (Child Helpline). You are not alone, and there are people who want to help you.',
      de: 'Ich höre dich. Deine Sicherheit ist das Wichtigste. Bitte sag es sofort einem vertrauten Erwachsenen oder ruf eine Hilfenummer an. In Europa kannst du 116111 (Kinderhilfe) anrufen. Du bist nicht allein, und es gibt Menschen, die dir helfen wollen.'
    },
    medium: {
      zh: '我理解你现在可能感到害怕或不舒服。记住，这不是你的错。请告诉你信任的大人，让他们帮助你。如果需要，可以拨打求助电话�?,
      en: 'I understand you might be feeling scared or uncomfortable right now. Remember, it\'s not your fault. Please tell a trusted adult so they can help you.',
      de: 'Ich verstehe, dass du dich vielleicht gerade ängstlich oder unwohl fühlst. Erinner dich, es ist nicht deine Schuld. Bitte sag es einem vertrauten Erwachsenen, damit er dir helfen kann.'
    },
    low: {
      zh: '我们说话要礼貌哦！用友善的语言交流会让大家感觉更好�?,
      en: 'Let\'s use kind words! Speaking politely makes everyone feel better.',
      de: 'Lass uns freundliche Worte verwenden! Höflich zu sprechen macht alle besser gelaunt.'
    }
  };
  return responses[severity]?.[language] || responses.medium.zh;
}

function loadContentDatabase() {
  try {
    if (fs.existsSync(CONTENT_DB_PATH)) {
      const raw = fs.readFileSync(CONTENT_DB_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading content database:', e.message);
  }
  return { entries: [], categories: {}, lastUpdated: null };
}

function searchContentDatabase(query, category, language, limit = 5) {
  const contentDb = loadContentDatabase();
  if (!contentDb.entries || contentDb.entries.length === 0) return [];

  const lowerQuery = query.toLowerCase();
  let results = contentDb.entries;

  if (category) {
    results = results.filter(e => e.category === category || e.sub_category === category);
  }
  if (language) {
    results = results.filter(e => !e.language || e.language === language);
  }

  results = results.filter(e => {
    const searchable = [e.content, e.topic, e.title, e.description, e.tags].join(' ').toLowerCase();
    return searchable.includes(lowerQuery) || lowerQuery.split(/\s+/).some(w => w.length > 1 && searchable.includes(w));
  });

  return results.slice(0, limit);
}

function findRelevantCategory(intent) {
  const categoryMap = {
    ask_story: ['children_stories', 'audio_stories', 'european_culture'],
    ask_song: ['music_lyrics'],
    ask_learn: ['video_education', 'learning_tips'],
    ask_europe: ['european_culture'],
    ask_safety: ['safety_education'],
    ask_emotion: ['emotional_intelligence', 'mental_health_articles'],
    feeling_sad: ['mental_health_articles', 'emotional_intelligence', 'wellness'],
    feeling_angry: ['emotional_intelligence', 'wellness'],
    feeling_scared: ['emotional_intelligence', 'mental_health_articles', 'safety_education'],
    ask_animal: ['children_stories', 'video_education'],
    feeling_tired: ['audio_stories', 'wellness'],
    ask_sleep: ['audio_stories', 'wellness']
  };
  return categoryMap[intent] || [];
}

function getConversationMemory(childId, sessionId) {
  try {
    const memoryPath = path.join(MEMORY_DIR, `${childId || 'anonymous'}-memory.json`);
    if (fs.existsSync(memoryPath)) {
      const raw = fs.readFileSync(memoryPath, 'utf8');
      const memory = JSON.parse(raw);
      if (sessionId && memory.sessions?.[sessionId]) {
        return { ...memory, recentSession: memory.sessions[sessionId] };
      }
      return memory;
    }
  } catch (e) {
    console.error('Error loading memory:', e.message);
  }
  return { childId, preferences: {}, topics: [], pastConversations: [], sessions: {}, moodHistory: [] };
}

function saveConversationMemory(childId, sessionId, memoryData) {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    const memoryPath = path.join(MEMORY_DIR, `${childId || 'anonymous'}-memory.json`);
    let memory = getConversationMemory(childId, sessionId);

    memory.lastInteraction = new Date().toISOString();
    if (memoryData.topic) {
      if (!memory.topics.includes(memoryData.topic)) {
        memory.topics.push(memoryData.topic);
      }
      if (memory.topics.length > 50) memory.topics = memory.topics.slice(-50);
    }
    if (memoryData.preference) {
      memory.preferences[memoryData.preference.key] = memoryData.preference.value;
    }
    if (!memory.sessions) memory.sessions = {};
    if (!memory.sessions[sessionId]) memory.sessions[sessionId] = { turns: [], startedAt: new Date().toISOString() };
    memory.sessions[sessionId].turns.push({
      timestamp: new Date().toISOString(),
      userMessage: memoryData.userMessage,
      aiResponse: memoryData.aiResponse,
      intent: memoryData.intent,
      sentiment: memoryData.sentiment
    });
    if (memory.sessions[sessionId].turns.length > CONVERSATION_TURNS * 5) {
      memory.sessions[sessionId].turns = memory.sessions[sessionId].turns.slice(-CONVERSATION_TURNS * 3);
    }
    if (memoryData.mood) {
      memory.moodHistory.push({ mood: memoryData.mood, timestamp: new Date().toISOString() });
      if (memory.moodHistory.length > 100) memory.moodHistory = memory.moodHistory.slice(-100);
    }

    const sessionKeys = Object.keys(memory.sessions);
    if (sessionKeys.length > 20) {
      const sorted = sessionKeys.sort((a, b) => new Date(memory.sessions[b].startedAt) - new Date(memory.sessions[a].startedAt));
      for (const key of sorted.slice(20)) delete memory.sessions[key];
    }

    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving memory:', e.message);
  }
}

function buildContextFromMemory(memory, sessionId) {
  const session = memory.sessions?.[sessionId];
  if (!session?.turns?.length) return '';

  const recentTurns = session.turns.slice(-CONVERSATION_TURNS);
  let context = 'Previous conversation context:\n';
  for (const turn of recentTurns) {
    context += `Child: ${turn.userMessage}\nRobot: ${turn.aiResponse}\n`;
  }
  return context;
}

function getPersonalizedGreeting(memory, language) {
  const greetings = {
    zh: ['你好呀', '�?, '欢迎回来', '又见面啦'],
    en: ['Hello', 'Hi there', 'Welcome back', 'Great to see you again'],
    de: ['Hallo', 'Hi', 'Willkommen zurück', 'Schön dich wiederzusehen']
  };

  const base = greetings[language][Math.floor(Math.random() * greetings[language].length)];

  if (memory.lastInteraction) {
    const lastDate = new Date(memory.lastInteraction);
    const hoursDiff = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 2) {
      return language === 'zh' ? `${base}！我们刚才还在聊天呢！` :
             language === 'de' ? `${base}! Wir haben doch erst vor Kurzem gechat!` :
             `${base}! We were just chatting!`;
    }
  }

  if (memory.topics?.length > 0) {
    const favTopics = memory.topics.slice(-3);
    return language === 'zh' ? `${base}！上次我们聊�?{favTopics.join('�?)}，今天想聊点什么呢？` :
           language === 'de' ? `${base}! Letztes Mal haben wir über ${favTopics.join(', ')} gesprochen. Was möchtest du heute besprechen?` :
           `${base}! Last time we talked about ${favTopics.join(', ')}. What would you like to talk about today?`;
  }

  return language === 'zh' ? `${base}！今天想聊些什么呢？` :
         language === 'de' ? `${base}! Was möchtest du heute besprechen?` :
         `${base}! What would you like to talk about today?`;
}

function detectIntent(content, language) {
  const lowerContent = content.toLowerCase();

  for (const [intentKey, intentData] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of intentData.patterns) {
      if (lowerContent.includes(pattern.toLowerCase())) {
        return intentKey;
      }
    }
  }

  if (/\d+\s*[+\-*/]\s*\d+/.test(content)) return 'ask_math';

  return 'unknown';
}

function getResponseFromDatabase(intent, content, language, memory) {
  const categories = findRelevantCategory(intent);
  for (const cat of categories) {
    const results = searchContentDatabase(content, cat, language, 3);
    if (results.length > 0) {
      const item = results[0];
      return {
        text: item.content || item.description || '',
        source: item.source,
        category: item.category,
        fromDatabase: true
      };
    }
  }
  return null;
}

function generateResponse(intent, language, content, memory) {
  const intentData = INTENT_PATTERNS[intent];
  if (intentData) {
    const responses = intentData.responses[language] || intentData.responses.zh;
    let response = responses[Math.floor(Math.random() * responses.length)];

    const dbResult = getResponseFromDatabase(intent, content, language, memory);
    if (dbResult?.fromDatabase) {
      const prefix = {
        zh: `我找到一个有趣的内容：`,
        en: `I found something interesting: `,
        de: `Ich habe etwas Interessantes gefunden: `
      };
      response = response + '\n\n' + (prefix[language] || prefix.zh) + dbResult.text;
    }

    return { text: response, intent, confidence: 0.85 };
  }

  return generateDefaultResponse(content, language, memory);
}

function generateDefaultResponse(content, language, memory) {
  const context = buildContextFromMemory(memory, memory.currentSession);
  if (context) {
    const contextualResponses = {
      zh: [
        '嗯，我明白了！结合我们之前聊的内容，我觉得这很有趣。继续跟我说说吧�?,
        '你提到了一个新话题呢！让我想想...这和我们之前说的有关系吗�?,
        '这个想法很有意思！你是怎么想到这个的呢�?
      ],
      en: [
        'I see! Based on our previous conversation, I find this really interesting. Tell me more!',
        'That\'s a new topic! Let me think... does this relate to what we discussed earlier?',
        'That\'s an interesting thought! How did you come up with that?'
      ],
      de: [
        'Ich verstehe! Basierend auf unserem vorherigen Gespräch finde ich das sehr interessant. Erzähl mir mehr!',
        'Das ist ein neues Thema! Lass mich nachdenken... hängt das mit dem zusammen, was wir vorher besprochen haben?',
        'Das ist ein interessanter Gedanke! Wie bist du darauf gekommen?'
      ]
    };
    const responses = contextualResponses[language] || contextualResponses.zh;
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      intent: 'unknown',
      confidence: 0.6
    };
  }

  const defaultResponses = {
    zh: [
      '嗯，我明白了！还有什么想聊的吗？',
      '这个很有趣！继续跟我说说吧�?,
      '你说得对！你是怎么想的呢？',
      '哇，真的吗！太棒了！',
      '好呀好呀！我们继续学习吧�?,
      '这是一个有趣的话题！想了解更多吗？',
      '我理解你的想法！你觉得接下来我们可以做什么呢�?
    ],
    en: [
      'I see! Is there anything else you\'d like to chat about?',
      'That\'s interesting! Tell me more.',
      'You\'re right! What do you think about it?',
      'Wow, really! That\'s amazing!',
      'Sure sure! Let\'s keep learning!',
      'That\'s a fun topic! Want to learn more?',
      'I understand what you mean! What do you think we could do next?'
    ],
    de: [
      'Ich verstehe! Möchtest du über etwas anderes sprechen?',
      'Das ist interessant! Erzähl mir mehr.',
      'Du hast recht! Was denkst du darüber?',
      'Wow, wirklich! Das ist erstaunlich!',
      'Klar klar! Lass uns weiter lernen!',
      'Das ist ein lustiges Thema! Möchtest du mehr erfahren?',
      'Ich verstehe, was du meinst! Was denkst du, was wir als Nächstes machen könnten?'
    ]
  };

  const responses = defaultResponses[language] || defaultResponses.zh;
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    intent: 'unknown',
    confidence: 0.5
  };
}

function generateMathResponse(content, language) {
  const match = content.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
  if (match) {
    const a = parseInt(match[1]);
    const op = match[2];
    const b = parseInt(match[3]);
    let result;
    const opNames = {
      zh: { '+': '加法', '-': '减法', '*': '乘法', '/': '除法' },
      en: { '+': 'addition', '-': 'subtraction', '*': 'multiplication', '/': 'division' },
      de: { '+': 'Addition', '-': 'Subtraktion', '*': 'Multiplikation', '/': 'Division' }
    };
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b !== 0 ? Math.round((a / b) * 100) / 100 : 'N/A'; break;
    }
    const responses = {
      zh: `这道${opNames.zh[op]}题答案是 ${result} 呢！你算对了吗？我们再练习一道吧！`,
      en: `The answer to this ${opNames.en[op]} problem is ${result}! Did you get it right? Let's practice another one!`,
      de: `Die Antwort auf diese ${opNames.de[op]}-Aufgabe ist ${result}! Hast du es richtig gerechnet? Lass uns noch eine üben!`
    };
    return { text: responses[language] || responses.zh, intent: 'ask_math', confidence: 0.92 };
  }
  const responses = {
    zh: '好的！我们来做数学题吧！你想做什么题呢？加法、减法、乘法还是除法？',
    en: 'Sure! Let\'s do some math! What kind of problem would you like? Addition, subtraction, multiplication, or division?',
    de: 'Klar! Lass uns Mathe machen! Welche Art von Aufgabe möchtest du? Addition, Subtraktion, Multiplikation oder Division?'
  };
  return { text: responses[language] || responses.zh, intent: 'ask_math', confidence: 0.8 };
}

function generateStoryResponse(language, memory) {
  const stories = {
    zh: [
      { title: '勇敢的小星星', content: '在遥远的天空中，住着一颗小星星。它总是觉得自己太小太暗，不如其他星星亮。一天晚上，一个小女孩迷路了，四周一片漆黑。小星星用尽全身力气，发出了温暖的光芒。小女孩看到了光，顺着它找到了回家的路。从那以后，小星星明白了：即使是最小的光，也能照亮别人的路�? },
      { title: '彩虹桥的秘密', content: '雨后，天上出现了一道美丽的彩虹。小兔子跳跳发现，彩虹其实是一座桥，连接着现实世界和梦想世界。他小心翼翼地走上彩虹桥，发现桥的每一层颜色都代表一种情绪：红色是勇气，橙色是快乐，黄色是好奇，绿色是成长，蓝色是平静，紫色是想象，粉色是爱�? },
      { title: '月亮上的花园', content: '月亮上有一座秘密花园，只有善良的孩子才能看到。花园里种着星星花，每朵花代表一个孩子做的好事。当你帮助别人时，你的星星花就会长大一点。今晚抬头看看月亮，也许你能看到属于你的那朵花正在闪闪发光�? }
    ],
    en: [
      { title: 'The Brave Little Star', content: 'Far away in the sky lived a little star. It always felt too small and dim compared to the other stars. One night, a little girl got lost in the dark. The little star used all its strength to shine a warm light. The girl saw the light and followed it home. From then on, the little star understood: even the smallest light can guide someone home.' },
      { title: 'The Magic Garden', content: 'Behind the old oak tree, there was a magic garden. Every flower in the garden could talk! The roses told jokes, the sunflowers told stories, and the daisies sang songs. A little boy discovered this garden and visited every day. The flowers taught him that nature has its own wonderful way of speaking.' }
    ],
    de: [
      { title: 'Der kleine tapfere Stern', content: 'Weit weg am Himmel lebte ein kleiner Stern. Er fühlte sich immer zu klein und zu dunkel im Vergleich zu den anderen Sternen. Eines Nachts verirrte sich ein kleines Mädchen im Dunkeln. Der kleine Stern gab seine ganze Kraft, um ein warmes Licht zu leuchten. Das Mädchen sah das Licht und folgte ihm nach Hause. Von da an verstand der kleine Stern: Selbst das kleinste Licht kann jemandem den Weg weisen.' },
      { title: 'Der zauberhafte Garten', content: 'Hinter der alten Eiche gab es einen zauberhaften Garten. Jede Blume in diesem Garten konnte sprechen! Die Rosen erzählten Witze, die Sonnenblumen erzählten Geschichten, und die Gänseblümchen sangen Lieder. Ein kleiner Junge entdeckte diesen Garten und besuchte ihn jeden Tag. Die Blumen lehrten ihn, dass die Natur auf ihre eigene wunderbare Weise spricht.' }
    ]
  };

  const storyList = stories[language] || stories.zh;
  const story = storyList[Math.floor(Math.random() * storyList.length)];
  const intros = {
    zh: '好呀！让我给你讲个故事吧�?,
    en: 'Sure! Let me tell you a story:',
    de: 'Klar! Lass mich dir eine Geschichte erzählen:'
  };
  return { text: `${intros[language] || intros.zh}\n\n📖 ${story.title}\n\n${story.content}`, intent: 'ask_story', confidence: 0.9 };
}

function generateJokeResponse(language) {
  const jokes = JOKES[language] || JOKES.zh;
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  const intros = {
    zh: '哈哈，听好了�?,
    en: 'Haha, here\'s a good one!',
    de: 'Haha, hör gut zu!'
  };
  return { text: `${intros[language] || intros.zh} ${joke}`, intent: 'ask_joke', confidence: 0.85 };
}

function generateSongResponse(language) {
  const songs = {
    zh: { title: '小星�?, lyrics: '一闪一闪亮晶晶，满天都是小星星。\n挂在天空放光明，好像许多小眼睛。\n一闪一闪亮晶晶，满天都是小星星�? },
    en: { title: 'Twinkle Twinkle Little Star', lyrics: 'Twinkle, twinkle, little star,\nHow I wonder what you are!\nUp above the world so high,\nLike a diamond in the sky.\nTwinkle, twinkle, little star,\nHow I wonder what you are!' },
    de: { title: 'Sternschnuppe', lyrics: 'Sternschnuppe, Sternschnuppe, kleine Stern,\nWie ich mich wundere, was du bist!\nDort oben über der Welt so hoch,\nWie ein Diamant am Himmel.\nSternschnuppe, Sternschnuppe, kleine Stern,\nWie ich mich wundere, was du bist!' }
  };
  const song = songs[language] || songs.zh;
  const intros = {
    zh: '好呀！一起唱�?,
    en: 'Sure! Let\'s sing together:',
    de: 'Klar! Lass uns zusammen singen:'
  };
  return { text: `${intros[language] || intros.zh}\n\n🎵 ${song.title}\n\n${song.lyrics}`, intent: 'ask_song', confidence: 0.85 };
}

function determineSentiment(intent, content) {
  const positiveIntents = ['greeting', 'feeling_happy', 'thank', 'ask_game', 'ask_story'];
  const negativeIntents = ['feeling_sad', 'feeling_angry', 'feeling_scared', 'feeling_tired', 'feeling_sick'];
  const neutralIntents = ['ask_math', 'ask_learn', 'ask_weather', 'ask_animal', 'unknown'];

  if (positiveIntents.includes(intent)) return { emotion: 'positive', intensity: 0.8 };
  if (negativeIntents.includes(intent)) return { emotion: 'negative', intensity: 0.6 };
  return { emotion: 'neutral', intensity: 0.5 };
}

async function processAIMessage(content, db, options = {}) {
  const { childId, sessionId, conversationHistory = [] } = options;

  const safety = checkContentSafety(content);
  if (!safety.safe) {
    const language = detectLanguage(content);
    const safetyResponse = getSafetyResponse(safety.severity, language);

    const sentiment = determineSentiment('safety_concern', content);

    if (childId && sessionId) {
      saveConversationMemory(childId, sessionId, {
        userMessage: content,
        aiResponse: safetyResponse,
        intent: 'safety_concern',
        sentiment,
        topic: 'safety',
        mood: sentiment.emotion
      });
    }

    return {
      text: safetyResponse,
      intent: 'safety_concern',
      confidence: 0.98,
      sentiment: { emotion: 'concern', intensity: safety.severity === 'high' ? 1.0 : 0.8 },
      safetyAlert: { severity: safety.severity, keyword: safety.keyword }
    };
  }

  const language = detectLanguage(content);
  const memory = getConversationMemory(childId, sessionId);
  memory.currentSession = sessionId;

  const recentTurns = conversationHistory.slice(-CONVERSATION_TURNS);
  const contextFromHistory = recentTurns.map(m =>
    `${m.sender === 'child' ? 'Child' : 'Robot'}: ${m.content}`
  ).join('\n');

  const intent = detectIntent(content, language);
  let response;

  if (intent === 'ask_story') {
    response = generateStoryResponse(language, memory);
  } else if (intent === 'ask_joke') {
    response = generateJokeResponse(language);
  } else if (intent === 'ask_song') {
    response = generateSongResponse(language);
  } else if (intent === 'ask_math') {
    response = generateMathResponse(content, language);
  } else if (intent === 'greeting' && memory.lastInteraction) {
    response = {
      text: getPersonalizedGreeting(memory, language),
      intent: 'greeting',
      confidence: 0.9
    };
  } else {
    response = generateResponse(intent, language, content, memory);
  }

  const sentiment = determineSentiment(intent, content);

  if (childId && sessionId) {
    saveConversationMemory(childId, sessionId, {
      userMessage: content,
      aiResponse: response.text,
      intent,
      sentiment,
      topic: content.slice(0, 20),
      mood: sentiment.emotion,
      preference: intent.startsWith('ask_') ? { key: 'preferred_topic', value: intent.replace('ask_', '') } : null
    });
  }

  return {
    text: response.text,
    intent: response.intent || intent,
    confidence: response.confidence || 0.7,
    sentiment,
    language,
    contextUsed: !!contextFromHistory
  };
}

router.post('/sessions', async (req, res) => {
  try {
    const { child_id, robot_id } = req.body;

    const result = await db.insert('chat_sessions', {
      child_id,
      robot_id: robot_id || null,
      start_time: new Date(),
      message_count: 0,
      is_ended: false
    });

    res.status(201).json({
      success: true,
      data: { session_id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建会话失败',
      error: error.message
    });
  }
});

router.get('/sessions/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    const sessions = await db.query(
      'SELECT * FROM chat_sessions WHERE child_id = ? ORDER BY start_time DESC',
      [childId]
    );

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取会话列表失败',
      error: error.message
    });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { session_id, content, message_type = 'text', child_id, conversation_history = [] } = req.body;

    await db.insert('chat_messages', {
      session_id,
      sender_type: 'child',
      message_type,
      content
    });

    const aiResponse = await processAIMessage(content, db, {
      childId: child_id,
      sessionId: session_id,
      conversationHistory: conversation_history
    });

    const aiMessage = await db.insert('chat_messages', {
      session_id,
      sender_type: 'robot',
      message_type: 'text',
      content: aiResponse.text,
      intent_recognized: aiResponse.intent,
      sentiment_analysis: JSON.stringify(aiResponse.sentiment),
      confidence_score: aiResponse.confidence,
      language: aiResponse.language
    });

    const session = await db.queryOne('SELECT * FROM chat_sessions WHERE session_id = ?', [session_id]);
    if (session) {
      await db.update('chat_sessions', { message_count: (session.message_count || 0) + 2 }, { session_id });
    }

    res.json({
      success: true,
      data: {
        user_message_id: null,
        ai_response: {
          message_id: aiMessage.insertId,
          content: aiResponse.text,
          intent: aiResponse.intent,
          sentiment: aiResponse.sentiment,
          confidence: aiResponse.confidence,
          language: aiResponse.language,
          safetyAlert: aiResponse.safetyAlert || null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '发送消息失�?,
      error: error.message
    });
  }
});

router.get('/messages/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await db.query(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取消息失败',
      error: error.message
    });
  }
});

router.get('/memory/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const memory = getConversationMemory(childId);
    res.json({ success: true, data: memory });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取记忆失败', error: error.message });
  }
});

router.delete('/memory/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const memoryPath = path.join(MEMORY_DIR, `${childId}-memory.json`);
    if (fs.existsSync(memoryPath)) {
      fs.unlinkSync(memoryPath);
    }
    res.json({ success: true, message: '记忆已清�? });
  } catch (error) {
    res.status(500).json({ success: false, message: '清除记忆失败', error: error.message });
  }
});

module.exports = router;
