const express = require('express');
const router = express.Router();
const engine = require('../services/learning-engine');
const llm = require('../services/llm-service');
const path = require('path');
const fs = require('fs');

let axios;
try { axios = require('axios'); } catch (_) { axios = null; }
let contentService;
try { contentService = require('../services/content-service'); } catch (_) { contentService = null; }
let cheerio;
try { cheerio = require('cheerio'); } catch (_) { cheerio = null; }

function detectLang(text) { return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text) ? 'zh' : 'en'; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Long-Term Memory ─────────────────────────────────────────────
const LTM_FILE = path.join(__dirname, '..', 'data', 'long-term-memory.json');
let longTermMemory = { interactions: [], userPreferences: {} };
function loadLongTermMemory() {
  try { if (fs.existsSync(LTM_FILE)) longTermMemory = JSON.parse(fs.readFileSync(LTM_FILE, 'utf8')); }
  catch (_) { longTermMemory = { interactions: [], userPreferences: {} }; }
}
function saveLongTermMemory() {
  try { fs.writeFileSync(LTM_FILE, JSON.stringify(longTermMemory, null, 2), 'utf8'); }
  catch (_) {}
}
loadLongTermMemory();

function storeInLongTermMemory(sessionId, role, content, intent) {
  longTermMemory.interactions.push({
    sessionId, role, content: content.substring(0, 200), intent, timestamp: Date.now()
  });
  if (longTermMemory.interactions.length > 10000) longTermMemory.interactions = longTermMemory.interactions.slice(-5000);
  saveLongTermMemory();
}

function retrieveLongTermMemory(query, limit = 3) {
  const q = query.toLowerCase();
  return longTermMemory.interactions
    .filter(i => i.content && i.content.toLowerCase().includes(q))
    .slice(-limit)
    .map(i => i.content.substring(0, 150));
}

// ─── Conversation Memory ──────────────────────────────────────────
const conversationStore = new Map();
const MAX_HISTORY = 100;

function getSession(sessionId) {
  if (!sessionId) sessionId = 'default';
  if (!conversationStore.has(sessionId)) {
    const profile = engine.getProfile(sessionId) || {};
    conversationStore.set(sessionId, {
      history: [], topics: [], interests: [], msgCount: 0, lastSummarized: 0,
      profile: profile
    });
  } else {
    const session = conversationStore.get(sessionId);
    if (!session.profile) {
      const profile = engine.getProfile(sessionId) || {};
      session.profile = profile;
    }
  }
  return conversationStore.get(sessionId);
}

function addToHistory(sessionId, role, content, meta) {
  const session = getSession(sessionId);
  session.history.push({ role, content, meta, timestamp: Date.now() });
  session.msgCount++;
  if (session.history.length > MAX_HISTORY) {
    const removed = session.history.splice(0, session.history.length - Math.floor(MAX_HISTORY * 0.6));
    session.summarized = (session.summarized || '') + ' Previous messages: ' + removed.map(m => (m.content || '').substring(0, 80)).join(' | ') + '. ';
    if (session.summarized.length > 2000) session.summarized = session.summarized.slice(-1500);
  }
  if (role === 'user' && content.length > 3) {
    const lower = content.toLowerCase();
    const topicWords = lower.split(/\s+/).filter(w => w.length > 3 && !['this','that','with','from','what','tell','about','teach','learn','know','like','want','have','does','there','could','would','should','where','which','their','they','them','when','then','make','more','some','very','just','also','than'].includes(w));
    topicWords.forEach(w => {
      if (!session.topics.includes(w)) session.topics.push(w);
    });
    if (session.topics.length > 20) session.topics = session.topics.slice(-20);
    storeInLongTermMemory(sessionId, 'user', content, meta ? meta.intent : null);
    try { engine.recordInteraction(sessionId, content); } catch (_) {}
  }
}

function getConversationSummary(sessionId, maxLen = 600) {
  const session = getSession(sessionId);
  const recent = session.history.slice(-8).filter(h => h.role === 'user' || h.role === 'bot');
  const parts = [];
  if (session.summarized) parts.push('[Earlier: ' + session.summarized.substring(0, 200) + ']');
  recent.forEach(h => parts.push((h.role === 'user' ? 'User' : 'You') + ': ' + h.content.substring(0, 120)));
  let result = parts.join('\n');
  if (result.length > maxLen) result = result.slice(-maxLen);
  return result;
}

function getInterests(sessionId) {
  const session = getSession(sessionId);
  const interests = [];
  const topicSet = new Set();
  session.topics.forEach(t => {
    const clean = t.replace(/[^a-z]/g, '').trim();
    if (clean.length > 2 && !topicSet.has(clean)) { topicSet.add(clean); interests.push(clean); }
  });
  return interests.slice(0, 5);
}

function generateFollowups(sessionId, lastTopic, intent) {
  const interests = getInterests(sessionId);
  const suggestions = [];
  const kgSuggestions = engine.getKnowledgeGraphSuggestions(sessionId, lastTopic || '');
  if (intent === 'vocab') suggestions.push('Use "' + pick(['this','that','those','these']) + '" in a sentence', 'Give me a harder word', 'What is a synonym');
  else if (intent === 'quiz') suggestions.push('Give me another quiz', 'Make it harder', 'Quiz me on a different topic');
  else if (intent === 'story') suggestions.push('Tell me another story', 'What is the moral of that story?', 'Tell me a bedtime story');
  else if (intent === 'math') suggestions.push('Give me another math problem', 'What is 100 divided by 4?', 'Teach me fractions');
  else if (intent === 'module') suggestions.push('Show me a lesson', 'What can I learn here?', 'Teach me something new');
  else if (intent === 'search' || intent === 'conversation') {
    if (lastTopic) suggestions.push('Tell me more about ' + lastTopic, 'Why is that interesting?', 'How does that work?');
    interests.forEach(i => suggestions.push('Tell me about ' + i));
  }
  if (kgSuggestions && kgSuggestions.length > 0) {
    kgSuggestions.slice(0, 2).forEach(s => {
      const title = s.title || s.word || s;
      if (!suggestions.includes('Tell me about ' + title)) suggestions.push('Tell me about ' + title);
    });
  }
  if (suggestions.length < 3) suggestions.push('What else can you do?', 'Teach me something new', 'Give me a fun fact');
  while (suggestions.length > 4) suggestions.pop();
  return suggestions;
}

// ─── Context Builder (learning engine + crawler data) ────────────
function buildContextFromEngine(query, maxItems = 3) {
  const items = [];
  try {
    const results = engine.search(query, { limit: maxItems });
    if (results.total > 0) {
      for (const item of results.data) {
        const title = item.title || item.word || '';
        const content = item.content || item.content_zh || item.meaning || '';
        const category = item.category || '';
        const source = item.source || 'builtin';
        if (content && content.length > 20) {
          items.push({ title, content: content.substring(0, 500), category, source });
        }
      }
    }
  } catch (_) {}
  if (contentService && contentService.ready) {
    try {
      const csResult = contentService.search(query, { limit: 2 });
      if (csResult.total > 0) {
        for (const item of csResult.data) {
          if (item.content && item.content.length > 20) {
            items.push({ title: item.title || '', content: item.content.substring(0, 500), category: item.category || '', source: 'content-service' });
          }
        }
      }
    } catch (_) {}
  }
  if (items.length === 0) return '';
  return 'Relevant educational content:\n' + items.map((item, i) =>
    `[${i + 1}] ${item.title}${item.category ? ` (${item.category})` : ''}: ${item.content.substring(0, 300)}`
  ).join('\n').substring(0, 2000);
}

function buildProfileContext(sessionId) {
  try {
    const profile = engine.getProfile(sessionId);
    if (!profile) return '';
    const parts = [];
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.language) parts.push(`Language: ${profile.language}`);
    if (profile.level) parts.push(`Level: ${profile.level}`);
    if (profile.interests && profile.interests.length > 0) parts.push(`Interests: ${profile.interests.join(', ')}`);
    if (profile.learningStyle) parts.push(`Learning style: ${profile.learningStyle}`);
    if (parts.length === 0) return '';
    return `Learner profile: ${parts.join(' | ')}.`;
  } catch (_) { return ''; }
}

function buildKnowledgeGraphContext(sessionId, query) {
  try {
    const suggestions = engine.getKnowledgeGraphSuggestions(sessionId, query);
    if (!suggestions || suggestions.length === 0) return '';
    return 'Related topics: ' + suggestions.map(s => s.title || s.word || s).join(', ') + '.';
  } catch (_) { return ''; }
}

// ─── Module Detection ─────────────────────────────────────────────
const MODULES = {
  math: { keywords: ['math', 'mathematics', 'addition', 'subtraction', 'multiplication', 'division', 'fraction', 'geometry', 'algebra', 'number'], category: 'math' },
  science: { keywords: ['science', 'biology', 'chemistry', 'physics', 'astronomy', 'dinosaur', 'space', 'planet', 'animal', 'plant', '人体', '动物', '植物', '化学', '物理'], category: 'science' },
  english: { keywords: ['english', 'vocabulary', 'word', 'grammar', 'spelling', 'reading', 'write', 'speak'], category: 'english' },
  technology: { keywords: ['technology', 'coding', 'programming', 'computer', 'robot', 'ai', 'artificial intelligence', 'internet', 'electronics'], category: 'technology' },
  engineering: { keywords: ['engineering', 'structure', 'aerospace', 'automotive', 'mechanical', 'electrical', 'bridge', 'building'], category: 'engineering' },
  arts: { keywords: ['art', 'drawing', 'painting', 'craft', 'drama', 'sculpture', 'music', 'creative', 'design'], category: 'arts' },
  story: { keywords: ['story', 'tale', 'fairy', 'fable', 'bedtime', 'adventure'], category: 'story' },
  music: { keywords: ['music', 'song', 'rhyme', 'instrument', 'piano', 'violin', 'sing', 'rhythm', 'classical'], category: 'music' }
};

function detectModule(text) {
  const lower = text.toLowerCase();
  for (const [mod, config] of Object.entries(MODULES)) {
    if (config.keywords.some(k => lower.includes(k))) return mod;
  }
  return null;
}

// ─── Local Search ─────────────────────────────────────────────────
function searchAllLocalData(query, limit = 5) {
  const results = { structured: [], content: [], vocabulary: [] };
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const cats = engine.getAllStructuredCategories();
  for (const [cat] of Object.entries(cats)) {
    if (cat.includes(q) || q.includes(cat.replace('_', ' ')) || cat.replace('_', ' ').includes(q)) {
      const catItems = engine.getByCategory(cat, 3);
      if (catItems.total > 0) {
        catItems.data.forEach(item => {
          results.structured.push({ source: 'structured', title: item.title, content: (item.content || '').substring(0, 500), category: item.category, level: item.level });
        });
      }
    }
  }

  if (contentService && contentService.ready) {
    try {
      const csResult = contentService.search(q, { limit: 3 });
      if (csResult.total > 0) {
        csResult.data.forEach(item => {
          results.content.push({ source: 'content-service', title: item.title, content: (item.content || '').substring(0, 500), category: item.category });
        });
      }
    } catch (_) {}
  }

  const engineResult = engine.search(q, { limit: 8 });
  if (engineResult.total > 0) {
    engineResult.data.forEach(item => {
      if (item.type === 'vocabulary') {
        results.vocabulary.push({ source: 'vocabulary', title: item.title || item.word, content: item.meaning || '', phonetic: item.phonetic, example: item.example });
      } else {
        const content = item.content_zh ? item.content_zh : (item.content || '');
        results.content.push({ source: 'content', title: item.title || item.word, content: content.substring(0, 500), category: item.category, level: item.level });
      }
    });
  }

  const merged = [...results.structured, ...results.content, ...results.vocabulary];
  return merged.filter(item => item.content && item.content.length > 5).slice(0, limit);
}

// ─── Multi-Source Web Scraping ────────────────────────────────────
const CACHE = {};
function getCached(url, ttlMs) {
  const entry = CACHE[url];
  if (entry && Date.now() - entry.time < ttlMs) return entry.data;
  return null;
}
function setCache(url, data) { CACHE[url] = { data, time: Date.now() }; }

function extractContent($, maxChars) {
  $('script,style,nav,header,footer,.sidebar,.nav,.infobox,.toc,.mw-jump-link,.reference,.noprint,.mw-editsection,.adsbygoogle,.ad,.notice,.metadata,.portal,.navbox,.sistertable,.mbox-small,#toc,.thumb,.gallery,.mw-empty-elt').remove();
  let content = '';
  $('p,li,dt,dd,blockquote,pre,td').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 15) content += text + ' ';
  });
  if (!content || content.length < 50) content = $('body').text().replace(/\s+/g, ' ').trim();
  return content.replace(/\s+/g, ' ').trim().substring(0, maxChars || 2000);
}

async function scrapeWikipedia(topic) {
  const encoded = encodeURIComponent(topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase());
  const urls = [`https://en.wikipedia.org/wiki/${encoded}`, `https://en.wikipedia.org/wiki/${topic.replace(/\s+/g, '_')}`, `https://simple.wikipedia.org/wiki/${encoded}`];
  for (const url of urls) {
    const cached = getCached(url, 600000);
    if (cached) return cached;
    try {
      const resp = await axios.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoboBuddyBot/1.0)' } });
      if (!cheerio) continue;
      const $ = cheerio.load(resp.data);
      const title = $('h1').first().text().trim() || $('title').text().trim();
      const content = extractContent($, 1500);
      if (content.length < 80) continue;
      const result = { title, content: (url.includes('simple') ? '[Simple] ' : '') + content, url };
      setCache(url, result);
      return result;
    } catch (_) {}
  }
  return null;
}

async function scrapeKidsBritannica(topic) {
  try {
    const slug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://kids.britannica.com/kids/article/${slug}`;
    const cached = getCached(url, 600000);
    if (cached) return cached;
    const resp = await axios.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!cheerio) return null;
    const $ = cheerio.load(resp.data);
    const content = extractContent($, 1200);
    const title = $('h1').first().text().trim() || topic;
    if (content.length < 60) return null;
    const result = { title, content: content.substring(0, 1200), url };
    setCache(url, result);
    return result;
  } catch (_) { return null; }
}

async function scrapeDuckDuckGo(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' facts for kids')}`;
    const cached = getCached(url, 300000);
    if (cached) return cached;
    const resp = await axios.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!cheerio) return null;
    const $ = cheerio.load(resp.data);
    const results = [];
    $('.result__body').slice(0, 4).each((i, el) => {
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__a').text().trim();
      if (snippet.length > 15) results.push({ title: link || 'Result', content: snippet });
    });
    if (results.length === 0) return null;
    const merged = results.map(r => r.content).join(' ').substring(0, 1500);
    const result = { title: 'Web search: ' + query, content: merged || results[0].content || 'No results', url };
    setCache(url, result);
    return result;
  } catch (_) { return null; }
}

async function scrapeTopic(topic) {
  if (!axios) return null;
  try {
    const wikipedia = await Promise.race([
      scrapeWikipedia(topic),
      new Promise(r => setTimeout(() => r(null), 6000))
    ]);
    if (wikipedia) return wikipedia;
    const kidsBrit = await Promise.race([
      scrapeKidsBritannica(topic),
      new Promise(r => setTimeout(() => r(null), 5000))
    ]);
    if (kidsBrit) return kidsBrit;
    const ddg = await Promise.race([
      scrapeDuckDuckGo(topic),
      new Promise(r => setTimeout(() => r(null), 5000))
    ]);
    if (ddg) return ddg;
  } catch (_) {}
  return null;
}

// ─── Formatting ────────────────────────────────────────────────────
function formatAsConversation(query, localResults, scrapedResult, history) {
  const nonVocab = localResults.filter(r => r.source !== 'vocabulary');
  if (nonVocab.length > 0) {
    const item = nonVocab[0];
    let content = item.content.substring(0, 350).trim();
    const more = nonVocab.length > 1 ? nonVocab.slice(1).map(r => r.title).filter(Boolean).join(', ') : '';
    if (more && content.length > 20) content += `\n\nYou might also like: ${more}.`;
    if (content.length < 20) content = `${item.title || ''} ${content}`;
    return content;
  }
  if (localResults.length > 0) {
    const words = localResults.slice(0, 3).map(w => `${w.title} (${w.content || ''})`).join(', ');
    return `I found some related words: ${words}.`;
  }
  if (scrapedResult) return scrapedResult.content.replace(/\s+/g, ' ').trim();
  return null;
}

function isCannedReply(text) {
  const canned = ['great question', 'great topic', 'i would love to teach', 'did you know', 'asking questions is how we learn',
    'let us take a deep breath', 'learning makes your brain stronger', 'tell me what you want to learn',
    'i am here to help', 'what shall we learn about', 'what topic would you like', 'what else are you curious',
    'i understand you feel', 'let us do something fun', 'that is interesting', 'i see'];
  return canned.some(phrase => text.toLowerCase().includes(phrase));
}

// ─── Main Answer Pipeline ────────────────────────────────────────
async function unifiedAnswer(text, sessionId) {
  const lower = text.toLowerCase().trim();
  const query = lower.replace(/^(tell me about|what is|what are|what's|who is|who was|explain|about|teach me about|learn about|i want to know about|i want to learn about)/i, '').replace(/^me\s+|^about\s+/i, '').trim();
  const searchTopic = query || lower;

  const localResults = searchAllLocalData(searchTopic, 5);
  if (localResults.length > 0) {
    const formatted = formatAsConversation(searchTopic, localResults, null, getSession(sessionId));
    if (formatted) return { text: formatted, intent: 'search', source: 'local', module: detectModule(text), query: searchTopic };
  }

  if (searchTopic.length > 2) {
    const scraped = await Promise.race([
      scrapeTopic(searchTopic),
      new Promise(r => setTimeout(() => r(null), 12000))
    ]);
    if (scraped) {
      const formatted = formatAsConversation(searchTopic, [], scraped, getSession(sessionId));
      if (formatted) return { text: formatted, intent: 'search', source: 'web', module: detectModule(text), query: searchTopic };
    }
  }

  try {
      const context = getConversationSummary(sessionId);
      const interests = getInterests(sessionId).join(', ');
      const profileCtx = buildProfileContext(sessionId);
      const kgCtx = buildKnowledgeGraphContext(sessionId, searchTopic);
      const ltmCtx = retrieveLongTermMemory(searchTopic, 2);
      const crawlerCtx = buildContextFromEngine(text, 2);
      const ctxBlock = crawlerCtx ? `\nReference:\n${crawlerCtx}\n` : '';
      const ltmBlock = ltmCtx.length > 0 ? `\nPast related conversations:\n${ltmCtx.join('\n')}\n` : '';
      const profileBlock = profileCtx ? `\n${profileCtx}\n` : '';
      const kgBlock = kgCtx ? `\n${kgCtx}\n` : '';
      const prompt = `Our conversation so far:\n${context}\n${profileBlock}${kgBlock}${ltmBlock}\nQuestion: "${text}"${interests ? `\n\nChild's interests include: ${interests}` : ''}\n\nAnswer naturally in 2-4 sentences. Be warm and educational. Use plain text only.${ctxBlock}`;
    const llmResult = await Promise.race([
      llm.chat('voice-' + sessionId, 'voice-user', prompt, {
        systemPrompt: 'You are RoboBuddy, a friendly learning companion robot for children. Answer naturally in 2-4 sentences in English. Only plain text - no emojis or symbols. Be warm and educational. Reference our conversation history when relevant.',
        maxTokens: 300
      }),
      new Promise(r => setTimeout(() => r(null), 8000))
    ]);
    if (llmResult && llmResult.reply && llmResult.reply.length > 5 && !isCannedReply(llmResult.reply)) {
      return { text: llmResult.reply.replace(/[^\w\s.,!?'-]/g, '').trim(), intent: llmResult.intent || 'conversation', source: 'llm', query: searchTopic };
    }
  } catch (_) {}

  return null;
}

// ─── Quick Responses ──────────────────────────────────────────────
const GREETINGS = ["Hello! I'm RoboBuddy, activated and ready to help you learn. What would you like to explore today?", "Hi there! RoboBuddy online. I can teach you about any subject!", "Hey! RoboBuddy here. I have access to thousands of lessons and the web. Ask me anything!"];
const FUN_FACTS = [
  "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs still good to eat!",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "The Eiffel Tower grows 15 cm taller in summer because iron expands in heat.",
  "A blue whale's heart is as big as a small car.",
  "The shortest war in history lasted only 38 minutes.",
  "Bananas are berries, but strawberries are not.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "A group of flamingos is called a flamboyance.",
  "The Great Wall of China is over 21000 km long.",
  "Your brain has 86 billion neurons sending messages at 430 km/h.",
  "The first computer bug was an actual moth found in a computer in 1947."
];
const HELP = `I am RoboBuddy! Here is what I can do:
- Answer any question: ask about dinosaurs, space, science, history
- Teach subjects: say "teach me math", "learn biology", "show me coding"
- Vocabulary: say "new words" or "vocabulary"
- Quizzes: say "quiz me" or "test me"
- Stories: say "tell me a story"
- Math: say "what is 25 times 4"
- Search web: ask anything I do not know
- Video: I can see you through the camera!`;

// ─── Route: Chat ──────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, sessionId: sid } = req.body;
  if (!message || !message.trim()) return res.json({ success: false, error: 'Empty message' });

  const msg = message.trim();
  const lower = msg.toLowerCase();
  const sessionId = sid || 'default';
  let reply = '', intent = 'conversation', module = null;
  let lastTopic = '';

  addToHistory(sessionId, 'user', msg);

  // Module trigger commands
  const moduleTrigger = lower.match(/^(open|show|go to|launch|start)\s+(.+)/i) ||
    lower.match(/^(teach me|learn|study)\s+(.+)/i);
  if (moduleTrigger) {
    const target = moduleTrigger[2].trim();
    const learningIntent = /vocab|word|quiz|test|practice|exam|story|tale|joke|funny|sing|song|dance/i;
    if (!learningIntent.test(target)) {
      const mod = detectModule(target);
      if (mod) {
        module = mod;
        lastTopic = mod;
        reply = `Opening the ${mod} module. Say "show me something in ${mod}" to explore lessons.`;
        intent = 'module';
      }
    }
  }

  if (!reply) {
    if (/^(hi|hello|hey|howdy|good morning|good afternoon)/i.test(lower) && !/^(bye|goodbye)/.test(lower)) {
      reply = pick(GREETINGS);
      intent = 'greeting';
    } else if (/^(bye|goodbye|see you|talk to you later)/i.test(lower)) {
      reply = pick(["Goodbye! Come back anytime to learn something new!", "Bye bye! I had fun learning with you today!", "See you later, alligator! I will be right here when you want to learn again!"]);
      intent = 'goodbye';
    } else if (/thank(s| you)/i.test(lower)) {
      reply = pick(["You are welcome! Learning is fun!", "Happy to help! What else shall we explore?", "Anytime! Keep being curious!", "My pleasure! Asking questions is how we grow!"]);

      intent = 'thanks';
    } else if (/^(help|what can you do|what do you know)/i.test(lower) || /how can you/i.test(lower)) {
      reply = HELP;
      intent = 'help';
    } else if (/vocab|word|vocabulary|teach me words|new words/i.test(lower)) {
      const words = engine.getVocabularyForStudy(3);
      reply = "Here are some words for you!\n" + words.map((w,i) => `${i+1}. ${w.word} - ${w.meaning}${w.example ? ' (' + w.example + ')' : ''}`).join('\n');
      intent = 'vocab';
    } else if (/quiz|test me|practice|exam/i.test(lower)) {
      const qs = engine.generateQuiz('mixed', 2);
      reply = "Quiz time!\n" + qs.map((q,i) => `${i+1}. ${q.question}\n   ${q.options.map((o,j) => `${String.fromCharCode(65+j)}. ${o}`).join('  ')}`).join('\n\n');
      intent = 'quiz';
    } else if (/story|tale|fairy/i.test(lower)) {
      const stories = engine.getByCategory('stories_bedtime', 1);
      if (stories.total > 0) {
        const s = stories.data[0];
        reply = `Here is a story: ${s.title}\n\n${(s.content || '').substring(0, 400)}...`;
      } else {
        reply = "Once upon a time, there was a curious child who loved to learn. Every day they discovered something new and amazing. The end!";
      }
      intent = 'story';
    } else if (/fun fact|interesting|wow|amazing|cool/i.test(lower) || /tell me something (interesting|fun|amazing|cool)/i.test(lower)) {
      reply = pick(FUN_FACTS) + ' Would you like to know more?';
      intent = 'conversation';
    } else if (/math|calculate|plus|minus|times|divided|what is \d+/.test(lower) && /\d+/.test(lower)) {
      const m = lower.match(/(\d+)\s*([+\-*\/xX]|plus|minus|times|divided by)\s*(\d+)/);
      if (m) {
        let a = parseInt(m[1]), b = parseInt(m[3]), op = m[2];
        const ops = { '+': a+b, '-': a-b, '*': a*b, 'x': a*b, 'X': a*b, '/': b!==0?(a/b).toFixed(1):'undefined',
          'plus': a+b, 'minus': a-b, 'times': a*b, 'divided by': b!==0?(a/b).toFixed(1):'undefined' };
        reply = `${a} ${op} ${b} = ${ops[op] || '?'}`;
        intent = 'math';
      }
    }
  }

  if (!reply) {
    try {
      const contextSummary = getConversationSummary(sessionId, 400);
      const interests = getInterests(sessionId);
      const profileCtx = buildProfileContext(sessionId);
      const kgCtx = buildKnowledgeGraphContext(sessionId, msg);
      const ltmCtx = retrieveLongTermMemory(msg, 2);
      const crawlerContext = buildContextFromEngine(msg, 3);
      const ltmBlock = ltmCtx.length > 0 ? `\nPast related conversations:\n${ltmCtx.join('\n')}\n` : '';
      const contextBlock = crawlerContext ? `\n\nReference knowledge base:\n${crawlerContext}\n\nUse this reference to inform your answer if relevant.` : '';
      const kgBlock = kgCtx ? `\n${kgCtx}\n` : '';
      const profileBlock = profileCtx ? `\n${profileCtx}\n` : '';
      const interestStr = interests.length > 0 ? `Child interests: ${interests.join(', ')}. ` : '';
      const llmSystemPrompt = `You are RoboBuddy, a friendly children's learning companion robot. Answer naturally, warmly, and educationally. ${interestStr}${profileBlock}Adapt to the child's age (4-14). Respond in the same language as the user. Keep responses concise (2-4 sentences). Use plain text only.${contextBlock}${kgBlock}${ltmBlock}`;
      const llmResult = await Promise.race([
        llm.chat('smart-' + sessionId, 'smart-chat-user', msg, { systemPrompt: llmSystemPrompt, maxTokens: 300 }),
        new Promise(r => setTimeout(() => r(null), 10000))
      ]);
      if (llmResult && llmResult.reply && llmResult.reply.length > 5 && !isCannedReply(llmResult.reply)) {
        reply = llmResult.reply.replace(/[^\w\s.,!?'-]/g, '').trim();
        intent = llmResult.intent || 'conversation';
      }
    } catch (_) { /* fall through */ }
  }

  if (!reply) {
    const result = await unifiedAnswer(msg, sessionId);
    if (result) {
      reply = result.text.replace(/[^\w\s.,!?'-]/g, '').trim();
      intent = result.intent;
      module = result.module || module;
      lastTopic = result.query || '';
    }
  }

  if (!reply) {
    const word = engine.getVocabularyForStudy(1)[0];
    reply = word ? `Let me teach you a word! "${word.word}" means "${word.meaning}". ${word.example || ''}` : pick(FUN_FACTS) + ' What would you like to explore?';
    intent = 'default';
  }

  addToHistory(sessionId, 'bot', reply, { intent, source: intent === 'search' ? 'data' : 'rule' });
  storeInLongTermMemory(sessionId, 'bot', reply, intent);
  const followups = generateFollowups(sessionId, lastTopic, intent);
  const session = getSession(sessionId);
  const kgSuggestions = engine.getKnowledgeGraphSuggestions(sessionId, lastTopic || '');

  res.json({
    success: true, reply, intent: intent || 'conversation', language: 'en', rich: false,
    module: module,
    sessionId: sessionId,
    historyCount: session.msgCount,
    followups: followups,
    interests: getInterests(sessionId),
    profile: session.profile ? { level: session.profile.level, age: session.profile.age, interests: session.profile.interests, language: session.profile.language } : null,
    knowledgeGraph: kgSuggestions.length > 0 ? kgSuggestions.slice(0, 3).map(s => s.title || s.word || s) : undefined
  });
});

// ─── Wake ─────────────────────────────────────────────────────────
router.post('/wake', (req, res) => {
  res.json({ success: true, reply: pick(GREETINGS), intent: 'greeting', language: 'en' });
});

// ─── Clear History ────────────────────────────────────────────────
router.post('/clear', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && conversationStore.has(sessionId)) conversationStore.delete(sessionId);
  res.json({ success: true });
});

// ─── Status ───────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const agentPath = path.join(__dirname, '..', 'data', 'scraped-content', 'agent-scraped.json');
  let scrapedCount = 0;
  try { if (fs.existsSync(agentPath)) scrapedCount = JSON.parse(fs.readFileSync(agentPath, 'utf8')).length; } catch(_) {}
  const profileCount = typeof engine.getProfileCount === 'function' ? engine.getProfileCount() : 0;
  const kgCount = typeof engine.getKnowledgeGraphStats === 'function' ? engine.getKnowledgeGraphStats() : {};
  const reviewCount = typeof engine.getDueReviewCount === 'function' ? engine.getDueReviewCount() : 0;
  res.json({
    success: true, ready: engine.ready, languages: ['en'],
    vocabulary: engine.vocabulary.length, scrapedTotal: engine.scrapedContent.length,
    agentScraped: scrapedCount, structuredTotal: (engine.structuredContent || []).length,
    categories: Object.keys(engine.getAllCategories()).length,
    activeSessions: conversationStore.size,
    longTermMemoryEntries: longTermMemory.interactions.length,
    learningProfiles: profileCount,
    knowledgeGraphNodes: kgCount.nodes || 0,
    knowledgeGraphEdges: kgCount.edges || 0,
    reviewsDue: reviewCount
  });
});

// ─── Real LLM API Routes ─────────────────────────────────────────
// Expose all configured LLM providers to the frontend
router.get('/llm/providers', (req, res) => {
  try {
    const all = llm.getProviders();
    const envKeys = {
      openai: !!process.env.OPENAI_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      zhipu: !!process.env.ZHIPU_API_KEY,
      claude: !!process.env.CLAUDE_API_KEY,
      qwen: !!(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY),
      yi: !!process.env.YI_API_KEY,
      baidu: !!process.env.BAIDU_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      moonshot: !!process.env.MOONSHOT_API_KEY
    };
    res.json({ success: true, providers: all, apiKeysConfigured: envKeys });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Switch the active LLM provider
router.post('/llm/set-provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.json({ success: false, error: 'No provider specified' });
    const ok = llm.setActiveProvider(provider);
    res.json({ success: ok, activeProvider: provider });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Direct LLM chat (bypasses rule-based pipeline, uses real models)
router.post('/llm/chat', async (req, res) => {
  try {
    const { message, sessionId, provider, model, systemPrompt, temperature, maxTokens } = req.body;
    if (!message || !message.trim()) return res.json({ success: false, error: 'Empty message' });
    if (provider) llm.setActiveProvider(provider);
    const sid = sessionId || 'llm-' + Date.now();
    const ctxBlock = buildContextFromEngine(message, 3);
    const contextNote = ctxBlock ? `\n\nRelevant knowledge:\n${ctxBlock}\n\nUse this as reference if relevant.` : '';
    const result = await llm.chat(sid, 'smart-chat-user', message, {
      model: model || undefined,
      systemPrompt: (systemPrompt || 'You are RoboBuddy, a friendly children\'s learning companion robot. Answer naturally, warmly, and educationally. Adapt to the child\'s age (4-14). Use plain text. Respond in the same language as the user.') + contextNote,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens || 1024
    });
    res.json({ success: true, reply: result.reply, sessionId: result.sessionId, intent: result.intent, language: result.language, agent: result.agent });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Stream LLM chat (SSE-based streaming response)
router.post('/llm/chat/stream', async (req, res) => {
  try {
    const { message, sessionId, provider, model, systemPrompt, temperature, maxTokens } = req.body;
    if (!message || !message.trim()) return res.json({ success: false, error: 'Empty message' });
    if (provider) llm.setActiveProvider(provider);
    const sid = sessionId || 'llm-stream-' + Date.now();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let full = '';
    await llm.chatStream(sid, 'smart-chat-user', message, (chunk) => {
      full += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }, {
      model: model || undefined,
      systemPrompt: systemPrompt || 'You are RoboBuddy, a friendly children\'s learning companion robot. Answer naturally, warmly, and educationally. Respond in the same language as the user.',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens || 1024
    });
    res.write(`data: ${JSON.stringify({ done: true, full, sessionId: sid })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Set API key for a provider (runtime, not persisted)
router.post('/llm/set-api-key', (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) return res.json({ success: false, error: 'Provider and apiKey required' });
    if (llm.apiKeys) llm.apiKeys[provider] = apiKey;
    process.env[provider.toUpperCase() + '_API_KEY'] = apiKey;
    res.json({ success: true, provider });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
