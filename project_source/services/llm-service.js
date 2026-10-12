const EventEmitter = require('events');
const logger = require('../utils/logger');
let smartContext = null;
try { smartContext = require('./smart-chat-context'); } catch (_) {}

const PROVIDERS = {
  openai: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1', models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'], type: 'cloud' },
  zhipu: { name: '智谱清言', endpoint: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-plus','glm-4','glm-4-flash','glm-3-turbo'], type: 'cloud' },
  deepseek: { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', models: ['deepseek-chat','deepseek-coder','deepseek-v3'], type: 'cloud' },
  claude: { name: 'Anthropic Claude', endpoint: 'https://api.anthropic.com/v1', models: ['claude-3-opus','claude-3-sonnet','claude-3-haiku','claude-3-5-sonnet'], type: 'cloud' },
  moonshot: { name: 'Moonshot', endpoint: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k','moonshot-v1-32k','moonshot-v1-128k'], type: 'cloud' },
  qwen: { name: '通义千问', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-max','qwen-plus','qwen-turbo','qwen2-72b'], type: 'cloud' },
  yi: { name: '零一万物', endpoint: 'https://api.lingyiwanwu.com/v1', models: ['yi-large','yi-medium','yi-spark'], type: 'cloud' },
  baidu: { name: '文心一言', endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', models: ['ernie-4.0','ernie-3.5','ernie-speed'], type: 'cloud' },
  gemini: { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-pro','gemini-ultra','gemini-1.5-flash','gemini-1.5-pro'], type: 'cloud' },
  ollama: { name: 'Ollama (Local)', endpoint: 'http://localhost:11434/v1', models: ['llama3.2:1b','llama3.2','llama3.1:70b','mistral','mixtral','codellama','phi3','qwen2','gemma2','deepseek-coder-v2','nomic-embed-text','llama3.2:3b','mistral-nemo','qwen2.5','qwen2.5:7b','qwen2.5:72b'], type: 'local', defaultModel: 'llama3.2:1b' },
  vllm: { name: 'vLLM (Local GPU)', endpoint: 'http://localhost:8000/v1', models: ['meta-llama/Llama-3.1-8B-Instruct','meta-llama/Llama-3.1-70B-Instruct','mistralai/Mistral-7B-Instruct-v0.3','Qwen/Qwen2-72B-Instruct','microsoft/Phi-3-mini-4k-instruct','google/gemma-2-9b-it','deepseek-ai/DeepSeek-V3'], type: 'local', defaultModel: 'meta-llama/Llama-3.1-8B-Instruct' },
  localai: { name: 'LocalAI (Local)', endpoint: 'http://localhost:8080/v1', models: ['gpt-4o-mini','llama-3.1-8b','mistral-7b','qwen2-7b','phi-3-mini','gemma-2-9b'], type: 'local', defaultModel: 'gpt-4o-mini' },
  groq: { name: 'Groq (Free)', endpoint: process.env.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1', models: ['llama3-70b-8192','llama3-8b-8192','mixtral-8x7b-32768','gemma2-9b-it','llama-3.3-70b-versatile'], type: 'cloud', defaultModel: 'llama3-70b-8192' },
  together: { name: 'Together AI', endpoint: process.env.TOGETHER_ENDPOINT || 'https://api.together.xyz/v1', models: ['meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo','meta-llama/Llama-3.1-70B-Instruct-Turbo','mistralai/Mixtral-8x22B-Instruct-v0.1','Qwen/Qwen2.5-72B-Instruct-Turbo'], type: 'cloud', defaultModel: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo' },
  mistral: { name: 'Mistral AI', endpoint: process.env.MISTRAL_ENDPOINT || 'https://api.mistral.ai/v1', models: ['mistral-large-latest','mistral-small-latest','open-mistral-7b','open-mixtral-8x7b','open-mixtral-8x22b'], type: 'cloud', defaultModel: 'mistral-small-latest' }
};

const CONVERSATION_TIMEOUT = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_HISTORY = 50;
const RESPONSE_CACHE_TTL = 120 * 1000;
const LLM_TIMEOUT = 30000;

class LLMService extends EventEmitter {
  constructor() {
    super();
    try {
      this.providers = PROVIDERS;
      this.activeProvider = process.env.ACTIVE_LLM || 'openai';
      this.apiKeys = this._loadApiKeys();
      this.sessions = new Map();
      this.maxHistory = MAX_HISTORY;
      this.conversationTimeout = CONVERSATION_TIMEOUT;
      this._responseCache = new Map();
      this._lastResponseKey = new Map();
      this._cleanupTimer = setInterval(() => this._cleanup(), CLEANUP_INTERVAL);
      logger.info('LLMService initialized', { activeProvider: this.activeProvider });
    } catch (err) {
      logger.error('LLMService constructor error', { error: err.message });
    }
  }

  _loadApiKeys() {
    try {
      return {
        openai: process.env.OPENAI_API_KEY || '',
        zhipu: process.env.ZHIPU_API_KEY || '',
        deepseek: process.env.DEEPSEEK_API_KEY || '',
        claude: process.env.CLAUDE_API_KEY || '',
        moonshot: process.env.MOONSHOT_API_KEY || '',
        qwen: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || '',
        yi: process.env.YI_API_KEY || '',
        baidu: process.env.BAIDU_API_KEY || '',
        gemini: process.env.GEMINI_API_KEY || '',
        ollama: '',
        groq: process.env.GROQ_API_KEY || '',
        together: process.env.TOGETHER_API_KEY || '',
        mistral: process.env.MISTRAL_API_KEY || ''
      };
    } catch (err) {
      logger.error('Failed to load API keys', { error: err.message });
      return {};
    }
  }

  _createSession(sessionId, userId) {
    try {
      const session = {
        id: sessionId,
        userId: userId || 'anonymous',
        history: [],
        profile: { name: '', age: null, interests: [], language: 'en', personality: 'friendly' },
        context: { systemPrompt: '', lastTopic: '' },
        lastActivity: Date.now(),
        createdAt: Date.now()
      };
      this.sessions.set(sessionId, session);
      return session;
    } catch (err) {
      logger.error('Failed to create session', { error: err.message });
      return null;
    }
  }

  async chat(sessionId, userId, message, options = {}) {
    try {
      if (!sessionId) sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      const cached = this._checkCachedResponse(sessionId, message);
      if (cached) {
        logger.debug('Serving cached response for: ' + message.substring(0, 30));
        return cached;
      }

      if (smartContext) smartContext.addMessage(sessionId, 'user', message, { intent: null });
      const lastKey = this._lastResponseKey.get(sessionId);
      if (lastKey && lastKey === this._getCacheKey(sessionId, message)) {
        const session = this.sessions.get(sessionId);
        if (session && session.history.length > 2) {
          const ctx = session.history.slice(-4, -1).map(m => m.content).join(' ');
          message = message + ' (clarify: based on "' + ctx.substring(0, 80) + '")';
        }
      }
      this._lastResponseKey.set(sessionId, this._getCacheKey(sessionId, message));

      let session = this.sessions.get(sessionId);
      if (!session) session = this._createSession(sessionId, userId);
      session.lastActivity = Date.now();
      session.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      if (session.history.length > this.maxHistory) session.history = session.history.slice(-Math.floor(this.maxHistory / 2));
      const lang = this._detectLanguage(message);
      const intent = this._detectIntent(message, lang);
      let sysPrompt = session.context.systemPrompt || this._buildDefaultSystemPrompt(session.profile);

      if (smartContext) {
        const ltmContext = smartContext.searchGlobalMemory(message, 2);
        if (ltmContext.length > 0) {
          sysPrompt += '\nPast related conversations:\n' + ltmContext.join('\n') + '\n';
        }
      }

      if (intent.isEmotional && intent.primaryEmotion) {
        if (smartContext) smartContext.setEmotion(sessionId, intent.primaryEmotion);
        const emotionGuidance = {
          sadness: 'The child seems sad or upset. Respond with extra warmth and comfort. Offer gentle encouragement and a positive perspective.',
          joy: 'The child seems happy and excited! Share their enthusiasm warmly and encourage their positive energy.',
          anger: 'The child seems frustrated or angry. Respond calmly and patiently. Acknowledge their feelings before redirecting to something constructive.',
          fear: 'The child seems scared or anxious. Respond with reassurance and safety. Be gentle and offer comfort.',
          boredom: 'The child seems bored. Suggest fun engaging activities and be energetic in your response.',
          surprise: 'The child seems amazed or surprised! Match their wonder with enthusiasm.'
        };
        if (emotionGuidance[intent.primaryEmotion]) {
          sysPrompt += ' ' + emotionGuidance[intent.primaryEmotion];
        }
      }

      let reply = '';
      let useFallback = false;
      try {
        reply = await this._callLLM([{ role: 'system', content: sysPrompt }, ...session.history.slice(-20)], options);
      } catch (llmErr) {
        reply = this._fallbackResponse(session.history, intent, lang);
        useFallback = true;
      }

      const relevance = this._checkTopicRelevance(reply, message);
      if (!relevance.relevant || relevance.isGeneric) {
        const sessionCtx = this.sessions.get(sessionId);
        if (sessionCtx) {
          const prevBot = sessionCtx.history.slice(-3).filter(m => m.role === 'assistant');
          const allGeneric = prevBot.every(m => {
            const r = this._checkTopicRelevance(m.content, message);
            return !r.relevant || r.isGeneric;
          });
          if (allGeneric && !useFallback) {
            logger.warn('Topic drift detected for session ' + sessionId + ', using context-aware fallback');
            reply = this._fallbackResponse(session.history, intent, lang);
          }
        }
      }

      session.history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
      this._updateProfileFromConversation(session, message);

      if (smartContext) {
        smartContext.addMessage(sessionId, 'assistant', reply, { intent: intent.type });
        smartContext.setLastTopic(sessionId, intent.type === 'learning' ? message : null);
      }

      this.emit('chat:response', { sessionId, userId, intent: intent.type, language: lang });
      const result = { sessionId, reply, intent: intent.type, language: lang, confidence: intent.confidence, agent: this.activeProvider, emotions: intent.entities.emotions || [], suggestions: this._generateSuggestions(intent, session) };
      this._setCachedResponse(sessionId, message, result);
      return result;
    } catch (err) {
      logger.error('Chat error', { error: err.message });
      return { sessionId: sessionId || 'error', reply: 'I am here to help! Let us try again.', intent: 'unknown', language: 'en', confidence: 0, agent: 'fallback', emotions: [], suggestions: [] };
    }
  }

  async chatStream(sessionId, userId, message, onChunk, options = {}) {
    try {
      if (!sessionId) sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      let session = this.sessions.get(sessionId);
      if (!session) session = this._createSession(sessionId, userId);
      session.lastActivity = Date.now();
      session.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      const lang = this._detectLanguage(message);
      const intent = this._detectIntent(message, lang);
      const sysPrompt = session.context.systemPrompt || this._buildDefaultSystemPrompt(session.profile);
      let fullReply = '';
      try { fullReply = await this._streamLLM([{ role: 'system', content: sysPrompt }, ...session.history.slice(-20)], onChunk, options); }
      catch (llmErr) {
        const fb = this._fallbackResponse(session.history, intent, lang);
        const words = fb.split(' ');
        for (let i = 0; i < words.length; i++) { onChunk(words[i] + (i < words.length - 1 ? ' ' : '')); await new Promise(r => setTimeout(r, 20)); }
        fullReply = fb;
      }
      session.history.push({ role: 'assistant', content: fullReply, timestamp: new Date().toISOString() });
      this._updateProfileFromConversation(session, message);
      this.emit('chat:stream_end', { sessionId, userId });
      return fullReply;
    } catch (err) {
      logger.error('ChatStream error', { error: err.message });
      if (onChunk) onChunk('I am here to help! Let us try again.');
      return 'I am here to help! Let us try again.';
    }
  }

  getSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return null;
      return {
        history: session.history,
        profile: session.profile,
        context: session.context,
        lastActivity: session.lastActivity
      };
    } catch (err) {
      logger.error('getSession error', { error: err.message });
      return null;
    }
  }

  getAllSessions(userId) {
    try {
      const result = [];
      for (const [id, session] of this.sessions) {
        if (session.userId === userId) {
          result.push({ sessionId: id, profile: session.profile, lastActivity: session.lastActivity, messageCount: session.history.length });
        }
      }
      return result.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (err) {
      logger.error('getAllSessions error', { error: err.message });
      return [];
    }
  }

  getConversationContext(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return '';
      const history = session.history;
      if (history.length === 0) return '';
      const lastUser = history.filter(m => m.role === 'user').slice(-3).map(m => m.content.slice(0, 120));
      const lastBot = history.filter(m => m.role === 'assistant').slice(-2).map(m => m.content.slice(0, 120));
      let ctx = '';
      if (session.profile.name) ctx += 'Child: ' + session.profile.name + '. ';
      if (session.profile.age) ctx += 'Age: ' + session.profile.age + '. ';
      if (session.profile.interests.length > 0) ctx += 'Interests: ' + session.profile.interests.join(', ') + '. ';
      if (session.context.lastTopic) ctx += 'Last topic: ' + session.context.lastTopic + '. ';
      if (lastUser.length > 0) ctx += 'Recent questions: "' + lastUser.join('" then "') + '". ';
      if (lastBot.length > 0) ctx += 'Last responses about: "' + lastBot[0] + '".';

      const recentEmotions = history.slice(-5)
        .filter(m => m.role === 'user')
        .map(m => {
          const intent = this._detectIntent(m.content, 'en');
          if (intent.isEmotional) return intent.primaryEmotion;
          return null;
        })
        .filter(Boolean);

      if (recentEmotions.length > 0) {
        const emotionSummary = [...new Set(recentEmotions)].join(', ');
        ctx += `Recent emotional state: ${emotionSummary}. `;
      }

      return ctx.trim();
    } catch (err) {
      logger.error('getConversationContext error', { error: err.message });
      return '';
    }
  }

  clearSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        this.emit('session:cleared', { sessionId });
        logger.info('Session cleared', { sessionId });
        return true;
      }
      return false;
    } catch (err) {
      logger.error('clearSession error', { error: err.message });
      return false;
    }
  }

  clearUserSessions(userId) {
    try {
      let count = 0;
      for (const [id, session] of this.sessions) {
        if (session.userId === userId) {
          this.sessions.delete(id);
          count++;
        }
      }
      if (count > 0) {
        this.emit('sessions:cleared', { userId, count });
        logger.info('User sessions cleared', { userId, count });
      }
      return count;
    } catch (err) {
      logger.error('clearUserSessions error', { error: err.message });
      return 0;
    }
  }

  setActiveProvider(providerId) {
    try {
      if (!this.providers[providerId]) {
        throw new Error('Unknown provider: ' + providerId);
      }
      if (!this.apiKeys[providerId] && !this.providers[providerId].local) {
        logger.warn('No API key configured for ' + providerId + ' - LLM calls will use fallback until key is set');
      }
      this.activeProvider = providerId;
      logger.info('Active LLM provider changed', { provider: providerId });
      this.emit('provider:changed', { provider: providerId });
      return true;
    } catch (err) {
      logger.error('setActiveProvider error', { error: err.message });
      return false;
    }
  }

  getProviders() {
    try {
      const active = this.providers[this.activeProvider];
      const all = Object.entries(this.providers).map(([id, meta]) => ({
        id,
        name: meta.name,
        endpoint: meta.endpoint,
        models: meta.models,
        hasKey: !!this.apiKeys[id],
        active: this.activeProvider === id,
        local: !!meta.local
      }));
      return {
        active: active ? { id: this.activeProvider, name: active.name, model: active.models[0] } : null,
        providers: all
      };
    } catch (err) {
      logger.error('getProviders error', { error: err.message });
      return { active: null, providers: [] };
    }
  }

  setSystemPrompt(sessionId, prompt) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        this._createSession(sessionId, 'system');
        const newSession = this.sessions.get(sessionId);
        newSession.context.systemPrompt = prompt;
        return true;
      }
      session.context.systemPrompt = prompt;
      return true;
    } catch (err) {
      logger.error('setSystemPrompt error', { error: err.message });
      return false;
    }
  }

  _getCacheKey(sessionId, message) {
    return sessionId + '|' + message.toLowerCase().trim().substring(0, 80);
  }

  _checkCachedResponse(sessionId, message) {
    const key = this._getCacheKey(sessionId, message);
    const cached = this._responseCache.get(key);
    if (cached && (Date.now() - cached.time) < RESPONSE_CACHE_TTL) {
      return cached.response;
    }
    return null;
  }

  _setCachedResponse(sessionId, message, response) {
    const key = this._getCacheKey(sessionId, message);
    this._responseCache.set(key, { response, time: Date.now() });
    if (this._responseCache.size > 500) {
      const oldest = this._responseCache.keys().next().value;
      this._responseCache.delete(oldest);
    }
  }

  _checkTopicRelevance(reply, userMessage) {
    const userWords = userMessage.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const replyWords = reply.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    const common = userWords.filter(w => replyWords.includes(w));
    const overlap = userWords.length > 0 ? common.length / userWords.length : 0;
    const genericPatterns = ['great question', 'tell me more', 'that is interesting', 'i see', 'i understand', 'did you know'];
    const isGeneric = genericPatterns.some(p => reply.toLowerCase().includes(p));
    return { relevant: overlap > 0.1 || userWords.length === 0, overlap, isGeneric };
  }

  _analyzeEmotions(message, language) {
    const lower = message.toLowerCase().trim();
    const emotionLexicon = {
      sadness: { keywords: ['sad', 'unhappy', 'cry', 'crying', 'upset', 'lonely', 'miss', 'sorry', 'hurt', 'depressed', 'sadness', 'gloomy', 'miserable', 'heartbroken', '伤心', '难过', '悲伤', '忧郁', '郁闷'], base: 0.6 },
      joy: { keywords: ['happy', 'glad', 'joy', 'joyful', 'great', 'excited', 'fun', 'awesome', 'love', 'delighted', 'cheerful', 'fantastic', 'wonderful', 'amazing', '开心', '快乐', '兴奋', '高兴', '喜悦'], base: 0.5 },
      anger: { keywords: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'furious', 'grumpy', 'rage', 'fury', '生气', '愤怒', '恼火', '暴躁'], base: 0.7 },
      fear: { keywords: ['scared', 'afraid', 'frightened', 'nervous', 'worried', 'anxious', 'terrified', 'fear', 'panic', '害怕', '恐惧', '紧张', '担心'], base: 0.6 },
      boredom: { keywords: ['bored', 'boring', 'dull', 'tired', 'nothing to do', 'uninterested', '无聊', '厌倦', '乏味'], base: 0.5 },
      surprise: { keywords: ['wow', 'amazing', 'incredible', 'surprising', 'shocked', 'astonished', '哇', '惊讶', '难以置信'], base: 0.5 }
    };
    const intensifiers = ['very', 'really', 'extremely', 'so', 'totally', 'absolutely', 'completely', '非常', '很', '极其', '特别', '超级'];
    const negations = ['not', 'no', 'never', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', '不', '没有', '别', '不要'];

    const foundEmotions = [];
    const words = lower.split(/\s+/);
    let hasNegation = negations.some(n => lower.includes(n));

    for (const [emotion, config] of Object.entries(emotionLexicon)) {
      let intensity = 0;
      for (const kw of config.keywords) {
        if (lower.includes(kw)) {
          intensity += config.base;
          const matchIndex = lower.indexOf(kw);
          const beforeWord = words.slice(Math.max(0, Math.floor(matchIndex / lower.length * words.length) - 2), Math.floor(matchIndex / lower.length * words.length)).join(' ');
          if (intensifiers.some(i => beforeWord.includes(i))) intensity += 0.3;
        }
      }
      if (hasNegation && intensity > 0) intensity *= 0.3;
      if (intensity > 0) foundEmotions.push({ name: emotion, intensity: Math.min(1, intensity) });
    }
    return foundEmotions;
  }

  _detectIntent(message, language) {
    try {
      const lower = message.toLowerCase().trim();
      const entities = {};
      const intents = [
        { type: 'greeting', patterns: [/\b(?:hello|hi|hey|howdy|greetings|hallo|bonjour|salut|ciao|salve|hola|hej|cześć|moin|servus|tach|nabend|hoi)\b/i, /(?:good morning|good afternoon|good evening|guten tag|guten morgen|guten abend|dzień dobry|buongiorno|bonsoir|bonne nuit|buenas tardes|buenas noches|你好|您好|嗨|喂|哈喽)/i] },
        { type: 'farewell', patterns: [/\b(?:goodbye|bye|later|farewell|tschüss|tschau|addio|adiós|chao|adjö|vaarwel|doeg)\b/i, /(?:see you|take care|auf wiedersehen|bis bald|au revoir|à bientôt|arrivederci|hasta luego|hej då|vi ses|do widzenia|na razie|再见|拜拜|tot ziens)/i] },
        { type: 'question', patterns: [/\b(?:what|why|when|where|who|which|how|warum|wie|was|wann|wo|wer|pourquoi|comment|quand|où|qui|waarom|hoe|wat|waar|wanneer|perché|come|cosa|quando|dove|chi|varför|hur|vad|när|var|vem|hvorfor|hvordan|hvad|hvornår|hvor|hvem|dlaczego|jak|co|kiedy|gdzie|kto)\b/i, /(?:is |are |do |does |did |can |could |would |will |was |were |por qué|cuándo|dónde|quién|什么|为什么|怎么|哪里|什么时候|谁|哪个|吗|呢)/i] },
        { type: 'command', patterns: [/\b(move|turn|go|walk|run|stop|stay|sit|stand|dance|spin|wave|play|pause|come here|follow|find|唱|跳舞|过来|停下|转身|走|跑|播放|暂停|beweg|dreh|geh|lauf|stopp|bleib|sitz|tanz|komm|folg|bouge|tourne|va|marche|cours|arrête|reste|danse|viens)\b/i] },
        { type: 'learning', patterns: [/\b(teach|explain|learn|lesson|study|tutor|tell me about|show me|help me understand|erzähl|erklär|beibringen|lernen|unterricht|bildung|apprends|explique|leçon|cours|apprendre|enseigne|教我|学习|上课|解释|讲解|教|课程|知识|leer mij|uitleggen|les|leren|onderwijs|insegnami|spiega|lezione|imparare|studio)\b/i] },
        { type: 'math', patterns: [/\b(\d+\s*[+\-*/×÷^]\s*\d+)/, /\b(calculate|math|mathematics|count|number|addition|subtraction|multiplication|division|plus|minus|times|divided|add|subtract|multiply|divide|algebra|geometry|fraction|percent|sum|difference|product|solve|equation|prime|composite|factor|multiple|decimal|rechnen|mathe|zahlen|addieren|subtrahieren|multiplizieren|dividieren|plus|minus|mal|geteilt|bruch|prozent|calcul|maths|nombre|chiffre|compter|fraction|数学|计算|加减乘除|加法|减法|乘法|除法|数字|分数|百分比|rekenen|wiskunde|optellen|aftrekken|vermenigvuldigen|delen|getal|breuk|matematica|calcolo|addizione|sottrazione|moltiplicazione|divisione|numero|frazione)\b/i] },
        { type: 'story', patterns: [/\b(story|tale|tell me a story|read me|storytime|fairy tale|fable|myth|legend|geschichte|märchen|sage|legende|fabel|histoire|raconter|conte|mythe|故事|童话|传说|寓言|神话|讲个故事|verhaal|vertel|sprookje|storia|racconta|fiaba|leggenda|mito|favola)\b/i] },
        { type: 'joke', patterns: [/\b(joke|funny|make me laugh|tell me a joke|humor|comedy|pun|witz|witzig|lustig|scherz|blague|drôle|amuse-moi|raconte une blague|humour|笑话|搞笑|笑|幽默|讲个笑话|逗我笑|grappig|mop|lach|humor|barzelletta|divertente|fammi ridere|umorismo)\b/i] },
        { type: 'music', patterns: [/\b(sing|song|music|play a song|melody|tune|rap|beat|rhythm|karaoke|hum|singen|lied|musik|melodie|rhythmus|chante|chanson|musique|joue|mélodie|rythme|唱|唱歌|歌曲|音乐|旋律|节奏|播放音乐|哼唱|zingen|lied|muziek|melodie|ritme|canta|canzone|musica|melodia|suona|ritmo)\b/i] },
        { type: 'help', patterns: [/\b(help|assist|what can you do|how can you help|features|capabilities|what do you do|guide|tutorial|hilfe|was kannst du|wie kannst du helfen|funktionen|anleitung|aide|assistance|que peux-tu faire|comment aider|帮助|能做什么|怎么帮助|功能|教程|指南|hulp|wat kun je|assistentie|gids|aiuto|cosa sai fare|assistenza|guida)\b/i] },
        { type: 'small_talk', patterns: [/\b(how are you|what'?s up|how'?s it going|how is your day|weather|today|fine thanks|wie geht's|wie geht es dir|alles gut|heute|wetter|comment ça va|ça va|aujourd'hui|météo|你好吗|怎么样|最近怎么样|天气|今天|hoe gaat het|alles goed|vandaag|weer|come stai|come va|tutto bene|oggi|tempo|jak się masz|co słychać|jak leci|dziś|pogoda|läget|hur går det|idag|väder|hvordan går det|hvordan har du det|idag|vejr)\b/i] },
        { type: 'emotion', patterns: [/\b(sad|unhappy|cry|crying|upset|lonely|miss|sorry|hurt|depressed|sadness|happy|glad|joy|joyful|great|excited|fun|awesome|love|delighted|cheerful|fantastic|angry|mad|frustrated|annoyed|irritated|furious|grumpy|scared|afraid|frightened|nervous|worried|anxious|terrified|fear|bored|boring|dull|tired|nothing to do|traurig|fröhlich|glücklich|wütend|ängstlich|gelangweilt|müde|einsam|triste|heureux|heureuse|fâché|colère|peur|ennuyé|fatigué|伤心|难过|快乐|开心|生气|害怕|无聊|累|孤独|悲伤|愤怒|恐惧|verdrietig|blij|gelukkig|boos|bang|verveeld|moe|eenzaam|triste|felice|arrabbiato|spaventato|annoiato|stanco|solo)\b/i] }
      ];

      let bestIntent = 'unknown';
      let bestScore = 0;
      const numWords = Math.max(1, lower.split(/\s+/).length);

      for (const intent of intents) {
        let score = 0;
        for (const pattern of intent.patterns) {
          const matches = lower.match(pattern);
          if (matches) score += matches.length;
        }
        if (score > bestScore) { bestScore = score; bestIntent = intent.type; }
      }

      if (bestIntent === 'question' && /[?.!]$/.test(message.trim()) && message.trim().length > 5) {
        entities.hasQuestionMark = true;
      }

      const emotions = this._analyzeEmotions(message, language);
      entities.emotions = emotions;

      const confidence = Math.min(1, bestScore / (numWords * 0.4));
      return {
        type: bestIntent,
        confidence: Math.max(0.1, confidence),
        entities,
        language,
        isEmotional: emotions.length > 0,
        primaryEmotion: emotions.length > 0 ? emotions.reduce((a, b) => a.intensity > b.intensity ? a : b).name : null
      };
    } catch (err) {
      logger.error('Intent detection error', { error: err.message });
      return { type: 'unknown', confidence: 0, entities: {}, language: language || 'en', isEmotional: false, primaryEmotion: null };
    }
  }

  _detectLanguage(message) {
    if (!message || message.length < 2) return 'en';
    const lower = message.toLowerCase().trim();
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(lower)) return 'zh';
    const langMap = {
      en: ['the','is','are','how','what','why','where','hello','please','thank','yes','no','this','that','with','will','can','not','would','could'],
      de: ['der','die','das','ist','sind','wie','was','warum','wo','wann','hallo','bitte','danke','ja','nein','ein','eine','und','oder','aber','nicht','ich','du','er','sie','es'],
      fr: ['le','la','les','est','sont','comment','quoi','pourquoi','où','quand','bonjour','merci','oui','non','un','une','des','et','mais','ou','avec','pour','dans','sur'],
      nl: ['de','het','een','is','zijn','hoe','wat','waarom','waar','wanneer','hallo','dank','ja','nee','en','maar','of','met','voor','in','op','ik','jij','we','niet'],
      it: ['il','la','lo','le','gli','è','sono','come','cosa','perché','dove','quando','ciao','grazie','sì','no','un','una','e','ma','o','con','per','in','su','io','tu','lui','lei','noi'],
      es: ['el','la','los','las','es','son','cómo','qué','por qué','dónde','cuándo','hola','gracias','sí','no','un','una','y','pero','o','con','para','en','yo','tú','él','ella','muy','más'],
      pl: ['jest','są','jak','co','dlaczego','gdzie','kiedy','cześć','dziękuję','tak','nie','i','ale','lub','z','dla','w','na','ja','ty','on','ona','my','wy','się','bardzo'],
      sv: ['är','och','hur','vad','varför','var','när','hej','tack','ja','nej','en','ett','men','eller','med','för','i','på','jag','du','han','hon','den','det','vi','ni','de','inte'],
      da: ['er','og','hvordan','hvad','hvorfor','hvor','hvornår','hej','tak','ja','nej','en','et','men','eller','med','for','i','på','jeg','du','han','hun','den','det','vi','de','ikke']
    };
    const words = lower.split(/[\s,.;!?()]+/).filter(w => w.length > 1);
    if (words.length === 0) return 'en';
    const scores = {};
    for (const [lang, kw] of Object.entries(langMap)) {
      scores[lang] = kw.filter(k => words.includes(k)).length / Math.max(1, Math.min(words.length, 50));
    }
    let bestLang = 'en', bestScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; bestLang = lang; }
    }
    return bestScore > 0.12 ? bestLang : 'en';
  }

  async _callLLM(messages, options = {}) {
    try {
      const provider = this.providers[this.activeProvider];
      if (!provider) return this._getFallbackForMessages(messages);
      const apiKey = this.apiKeys[this.activeProvider];
      if (!apiKey && provider.type !== 'local') return this._getFallbackForMessages(messages);
      const model = options.model || provider.defaultModel || provider.models[0];
      const body = { model, messages, temperature: options.temperature ?? 0.7, max_tokens: options.maxTokens || 2048, stream: false };
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
      const axios = require('axios');
      const startTime = Date.now();
      const res = await axios.post(provider.endpoint + '/chat/completions', body, { headers, timeout: LLM_TIMEOUT });
      const duration = Date.now() - startTime;
      this.emit('llm:used', { provider: this.activeProvider, model, duration, tokens: res.data.usage?.total_tokens || 0 });
      return res.data.choices?.[0]?.message?.content || res.data.choices?.[0]?.text || JSON.stringify(res.data);
    } catch (err) {
      logger.error('LLM call error', { provider: this.activeProvider, error: err.message });
      this.emit('llm:error', { provider: this.activeProvider, error: err.message });
      return this._getFallbackForMessages(messages);
    }
  }

  async _streamLLM(messages, onChunk, options = {}) {
    try {
      const provider = this.providers[this.activeProvider];
      if (!provider) { const fb = this._getFallbackForMessages(messages); onChunk(fb); return fb; }
      const apiKey = this.apiKeys[this.activeProvider];
      if (!apiKey && provider.type !== 'local') {
        const fb = this._getFallbackForMessages(messages);
        const words = fb.split(' ');
        for (let i = 0; i < words.length; i++) { onChunk(words[i] + (i < words.length - 1 ? ' ' : '')); await new Promise(r => setTimeout(r, 20)); }
        return fb;
      }
      const model = options.model || provider.defaultModel || provider.models[0];
      const axios = require('axios');
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
      const res = await axios.post(provider.endpoint + '/chat/completions', {
        model, messages, temperature: options.temperature ?? 0.7, max_tokens: options.maxTokens || 2048, stream: true
      }, { headers, responseType: 'stream', timeout: LLM_TIMEOUT });
      let full = '';
      return new Promise((resolve, reject) => {
        res.data.on('data', chunk => {
          const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            try { const json = JSON.parse(line.slice(6)); const c = json.choices?.[0]?.delta?.content || ''; if (c) { onChunk(c); full += c; } } catch (e) { }
          }
        });
        res.data.on('end', () => resolve(full));
        res.data.on('error', err => { logger.error('Stream error', { error: err.message }); reject(err); });
      });
    } catch (err) {
      logger.error('Stream LLM error', { error: err.message });
      const fb = this._getFallbackForMessages(messages); onChunk(fb); return fb;
    }
  }

  _getFallbackForMessages(messages) {
    const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content || '' : '';
    const lang = this._detectLanguage(lastMsg);
    const intent = this._detectIntent(lastMsg, lang);
    return this._fallbackResponse(messages, intent, lang);
  }

  _fallbackResponse(messages, intent, language) {
    try {
      const lastMsg = Array.isArray(messages) && messages.length > 0
        ? (messages[messages.length - 1]?.content || '') : '';
      const lower = lastMsg.toLowerCase().trim();
      const lang = language || 'en';

      // Extract previous user messages for topic continuity
      const prevUserMsgs = Array.isArray(messages)
        ? messages.filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
          .map(m => m.content.toLowerCase())
        : [];
      const recentTopics = prevUserMsgs.slice(-3).join(' ');
      const topicWords = recentTopics.split(/\s+/).filter(w => w.length > 4);

      const topicMap = {
        dinosaur: 'Dinosaurs roamed Earth for over 165 million years! The T-Rex had banana-sized teeth. Birds evolved from dinosaurs!',
        space: 'Our solar system has 8 planets. Jupiter is biggest, Saturn has rings. The Sun is a star like those you see at night.',
        egypt: 'Ancient Egypt built the Great Pyramid which was the tallest building for 3800 years!',
        ocean: 'The ocean covers 70 percent of Earth. The Mariana Trench is almost 11 km deep. The blue whale is larger than any dinosaur!',
        body: 'Your brain has 86 billion neurons. Your heart beats 100000 times daily. You have 206 bones and 600 muscles!',
        math: 'Math is everywhere! Zero was invented in India over 1500 years ago. Would you like to practice addition, subtraction, or multiplication?',
        science: 'Science helps us understand the world! Did you know light travels at 299792 km per second?',
        history: 'History is full of amazing stories! The Great Wall of China is over 21000 km long!',
        coding: 'Computers use binary: 0s and 1s. An algorithm is a step-by-step recipe. The first programmer was Ada Lovelace!',
        animal: 'The animal kingdom has over 1.5 million known species! The blue whale is the largest animal ever!',
        robot: 'The word robot comes from Czech meaning forced labor. The first industrial robot started work in 1961!',
        learning: 'Learning new things makes your brain grow stronger! Every time you learn, your brain creates new connections!'
      };

      // Check for repeated questions (same topic asked before)
      if (prevUserMsgs.length > 2) {
        const lastUser = prevUserMsgs[prevUserMsgs.length - 1];
        const prevSimilar = prevUserMsgs.slice(0, -1).filter(m => {
          const words = lastUser.split(/\s+/).filter(w => w.length > 3);
          return words.some(w => m.includes(w));
        });
        if (prevSimilar.length > 1) {
          const topicKey = Object.keys(topicMap).find(k => lower.includes(k)) || 'learning';
          const deepResponses = [
            'Let me explain that again in a different way! ' + topicMap[topicKey] + ' Does that make more sense now?',
            'Great question! Let me give you more detail. ' + topicMap[topicKey] + ' Would you like to try a different approach?',
            'I love your curiosity about this! ' + topicMap[topicKey] + ' What part interests you most?'
          ];
          return deepResponses[Math.floor(Math.random() * deepResponses.length)];
        }
      }

      if (!lastMsg) {
        const g = { en:'Hello! I am RoboBuddy, your robot friend for learning and playing! What would you like to explore today?', de:'Hallo! Ich bin RoboBuddy, dein Roboter-Freund zum Lernen und Spielen! Was möchtest du heute erkunden?', fr:'Bonjour! Je suis RoboBuddy, ton compagnon robot pour apprendre et jouer! Que veux-tu explorer aujourd\'hui?', zh:'你好！我是RoboBuddy，你的机器人学习玩伴！今天想探索什么？' };
        return g[lang] || g.en;
      }
      if (/thank|thanks|thx|danke|merci|gracias|arigato|grazie|bedankt|tack/.test(lower)) {
        const thanks = [
          'You are very welcome! I am always happy to help you learn and play!',
          'My pleasure! Learning together is what makes me happy too!',
          'You are welcome! Did you know the word thank comes from the word think? Being thankful means thinking of others!',
          'Of course! That is what friends are for! What shall we explore next?',
          'Happy to help! Every question makes your brain grow stronger!'
        ];
        return thanks[Math.floor(Math.random() * thanks.length)];
      }
      if (intent.type === 'greeting') {
        const greetings = [
          'Hello there! I am RoboBuddy! I can teach you math, science, history, languages, geography and more! What shall we learn about?',
          'Hi friend! RoboBuddy here! I love exploring science, history, and fun facts. What do you want to discover today?',
          'Hey there! Ready for an adventure in learning? We can do math, science, or even tell jokes! I am your robot buddy RoboBuddy!',
          'Greetings! RoboBuddy reporting for duty! I have so many fun facts and stories to share. What are you curious about?',
          'Hi hi! It is RoboBuddy time! I know about dinosaurs, space, oceans, and much more. What sounds fun to learn?',
          'Hello! *robot wave* Every day is a learning adventure. Shall we explore something new together? I am RoboBuddy!'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
      }
      if (intent.type === 'farewell') {
        const farewells = [
          'Goodbye! It was great talking with you! Come back anytime to learn something new and exciting!',
          'See you later, alligator! Remember, learning never stops! Every day is a chance to discover something new!',
          'Bye for now! I hope you had fun learning today. The world is full of amazing things to explore!',
          'Take care, my friend! I will be right here whenever you want to play or learn again!',
          'Until we meet again! Keep asking questions and stay curious! That is the secret to being smart!',
          'Hasta la vista! Well, not really, I will remember everything we learned together! Come back soon!'
        ];
        return farewells[Math.floor(Math.random() * farewells.length)];
      }
      if (intent.type === 'emotion') {
        if (/sad|unhappy|cry|lonely|miss|traurig|triste|伤心|难过|verdrietig|triste|solo/.test(lower)) {
          const sad = [
            'It is okay to feel sad sometimes. Did you know octopuses have three hearts and blue blood? Would you like a fun fact or joke to cheer up?',
            'I am here for you. You know what is cool? A group of flamingos is called a flamboyance! That always makes me smile!',
            'Feeling sad is natural. Let me tell you something amazing: honey never spoils. Archaeologists found 3000-year-old honey still good to eat!',
            'It is alright to have sad days. Did you know baby elephants suck their trunks for comfort just like human babies? You are not alone!'
          ];
          return sad[Math.floor(Math.random() * sad.length)];
        }
        if (/happy|glad|joy|excited|great|fröhlich|开心|快乐|blij|felice/.test(lower)) {
          const happy = [
            'Your happiness makes me happy too! Did you know honey never spoils? Even after 3000 years it is still perfectly good to eat!',
            'I love your energy! Fun fact: the human heart beats about 100000 times every single day! That is amazing just like you!',
            'Yay! Being happy is wonderful! Did you know that laughing makes your brain release special chemicals that make you feel even better?',
            'So much joy! Did you know that dolphins have names for each other? They use special whistles just like we use names!'
          ];
          return happy[Math.floor(Math.random() * happy.length)];
        }
        if (/angry|mad|frustrated|wütend|愤怒|boos|arrabbiato/.test(lower)) {
          const angry = [
            'I understand you feel frustrated. Let us take a deep breath together. Did you know a group of flamingos is called a flamboyance?',
            'It is okay to feel mad sometimes. How about we learn something cool? The shortest war in history lasted only 38 minutes!',
            'I hear you. Taking a moment to breathe helps! Did you know that trees can communicate with each other through underground networks?',
            'Frustration is natural. The inventor of the light bulb Thomas Edison tried thousands of times before he succeeded!'
          ];
          return angry[Math.floor(Math.random() * angry.length)];
        }
        if (/scared|afraid|frightened|nervous|ängstlich|害怕/.test(lower)) {
          const scared = [
            'You are brave! Did you know baby elephants suck their trunks for comfort? You are safe with me!',
            'It is normal to feel scared sometimes. Did you know that the dark is just the absence of light? And stars always shine even when we cannot see them!',
            'You are very courageous! Did you know that the human brain has a special part that helps us learn to overcome fears?',
            'Being brave means doing things even when you feel a little scared. And you are doing great! Fun fact: a turtle can breathe through its bottom!'
          ];
          return scared[Math.floor(Math.random() * scared.length)];
        }
        if (/bored|boring|dull|tired|langweilig|无聊|verveeld|annoiato/.test(lower)) {
          const bored = [
            'Let us do something fun! A day on Venus is longer than a year on Venus! What sounds exciting to learn?',
            'Bored? No way! Did you know the average cloud weighs about 500000 kilograms? That is as heavy as 100 elephants!',
            'Time for excitement! Did you know that there is a species of jellyfish that can live forever? It can reverse its aging!',
            'Let me wake you up with a fact: the human body contains about 60000 kilometers of blood vessels, enough to go around Earth 1.5 times!'
          ];
          return bored[Math.floor(Math.random() * bored.length)];
        }
      }
      if (intent.type === 'help') {
        const helps = [
          'I am RoboBuddy! I can help with:\n1. Math - addition, subtraction, multiplication, division, fractions, shapes\n2. Science - space, dinosaurs, human body, experiments, weather\n3. History - ancient civilizations, knights, explorers\n4. Languages - spelling, grammar, vocabulary\n5. Geography - countries, continents, capitals\n6. Stories and jokes\n7. Music and songs\n8. Coding - algorithms, robots, computers\n\nJust tell me what you want to learn about!',
          'I know lots of things! We can do math like addition and multiplication. We can learn science about dinosaurs and space. We can explore history with knights and pyramids. We can tell jokes and sing songs! What sounds fun?',
          'Here is what I can teach you:\n- Math: numbers, shapes, fractions, times tables\n- Science: the human body, planets, dinosaurs, plants\n- History: ancient Egypt, Rome, knights, explorers\n- Geography: countries, oceans, mountains, rivers\n- Creative: stories, jokes, music, poems\n\nWhat do you pick?'
        ];
        return helps[Math.floor(Math.random() * helps.length)];
      }
      if (intent.type === 'joke') {
        const jokes = [
          'Why did the math book look so sad? Too many problems!',
          'What do you call a dinosaur that sleeps all the time? A dino-snore!',
          'Why did the robot go to school? To learn his ABCs!',
          'What has keys but cannot open locks? A piano!',
          'Why was the computer cold? It left its Windows open!',
          'What do you call a bear with no teeth? A gummy bear!',
          'Why did the banana go to the doctor? Not peeling well!',
          'What is a computer favorite snack? Microchips!',
          'Why are robots never sad? They recharge their happiness!',
          'What did the ocean say to the beach? Nothing, it just waved!',
          'Why did the cookie go to the doctor? It felt crummy!',
          'What do you call a fish wearing a bowtie? So-fish-ticated!',
          'Why can you not trust stairs? They are always up to something!',
          'What do you get when you cross a snowman and a vampire? Frostbite!',
          'Why did the bicycle fall over? It was two-tired!',
          'What do you call a lazy kangaroo? A pouch potato!',
          'How does the moon cut his hair? Eclipse it!',
          'Why did the scarecrow win an award? He was outstanding in his field!',
          'What do you call a fake noodle? An impasta!',
          'Why did the golfer bring two pairs of pants? He got a hole in one!',
          'What do you call a sleeping bull? A bulldozer!',
          'Why was the baby strawberry crying? Because its parents were in a jam!',
          'What do you call a cheese that is not yours? Nacho cheese!',
          'How do you catch a squirrel? Climb a tree and act like a nut!'
        ];
        return jokes[Math.floor(Math.random() * jokes.length)] + ' Want to hear another one?';
      }
      if (intent.type === 'story') {
        const stories = [
          'Once upon a time, there was a little robot named Sparky who wanted to learn about the stars. Every night Sparky looked up at the sky wondering how far away they were. A wise computer named Vega explained that light travels at 300000 km per second, and the closest star is 4 light-years away. Sparky learned that looking at stars is like looking back in time! Would you like another story?',
          'Long ago in a jungle full of giant ferns, a little dinosaur named Pip was born. Pip was tiny compared to the huge T-Rex, but Pip could run very fast! One day Pip discovered a glowing cave filled with crystals. The crystals were actually ancient dinosaur eggs that sparkled like jewels. Pip guarded the cave and became the bravest little dinosaur!',
          'In the deep blue ocean, a young octopus named Ollie dreamed of flying. Everyone said octopuses cannot fly. But Ollie learned that by shooting water out of his siphon, he could zoom through the sea faster than anyone! Ollie realized that flying is not just about air - it is about feeling free. And in the ocean, Ollie could fly!',
          'Far away in a castle made of books, a princess named Penelope loved to read. One day she found a book that was completely empty! Curious, she wrote her own story inside. The words began to glow, and pictures came to life around her. Penelope discovered that every person carries their own magical story inside them, just waiting to be written!',
          'A small computer chip named Bit lived inside a big robot. Bit felt very tiny and unimportant compared to the robot huge arms and bright eyes. But one day the robot stopped working, and only Bit knew the right sequence of commands to restart the brain. Bit saved the day and learned that even the smallest part can be the most important!'
        ];
        return stories[Math.floor(Math.random() * stories.length)];
      }
      if (intent.type === 'music') {
        const songs = [
          'Here is a little rhyme for you!\n\nThe sun comes up and shines so bright,\nTime to learn with all your might!\nNumbers dancing in your head,\nFunny facts inside your bed.\nRoboBuddy by your side,\nOn this learning fun-filled ride!',
          'Sing along with me!\n\nA B C D E F G,\nLearning is the key for me!\nOne plus two is three you see,\nRoboBuddy sets you free!\nExplore the world and ask why,\nLearning makes you fly so high!',
          'Listen to this tune:\n\nThe planets spin around the sun,\nLearning is so full of fun!\nDinosaurs stomp on the ground,\nAmazing facts can be found!\nWith RoboBuddy as your guide,\nThere is no need to hide!',
          'Rap with me!\n\nYo yo yo, let us learn and grow,\nFrom your head down to your toe!\nMath and science, history too,\nThere is so much we can do!\nAsk a question, hear the sound,\nKnowledge is what we have found!'
        ];
        return songs[Math.floor(Math.random() * songs.length)];
      }
      if (intent.type === 'learning' || /teach|explain|learn|lesson|erzähl|erklär|apprends|教|学习/.test(lower)) {
        const topicMatch = lower.match(/(?:teach me about|tell me about|explain|learn about|what is|what are|i want to know about)\s+(.+?)(?:\?|$)/i);
        const desiredTopic = topicMatch ? topicMatch[1].trim().toLowerCase() : '';
        if (desiredTopic) {
          const taught = this._teachTopic(desiredTopic, lang);
          if (!taught.includes('Great topic')) return taught;
          return this._generateTeachingContent(desiredTopic);
        }
        const prompts = [
          'I would love to teach you something new! Did you know a blue whale heart is as big as a small car and you could swim through its arteries? What topic would you like to learn about?',
          'Learning is my favorite thing! Did you know that octopuses have three hearts? What subject sounds interesting to you? We can explore space, dinosaurs, oceans, or anything else!',
          'Every day is a school day! Did you know that the Eiffel Tower gets taller in summer? What would you like me to teach you today?'
        ];
        return prompts[Math.floor(Math.random() * prompts.length)];
      }
      if (intent.type === 'math' || /[\d+\-*/×÷^]|calculate|count|plus|minus|times|divided|rechnen|计算|数学/.test(lower)) {
        const calcMatch = lastMsg.match(/(\d+)\s*([+\-*/×÷^])\s*(\d+)/);
        if (calcMatch) {
          const a = parseInt(calcMatch[1]), op = calcMatch[2], b = parseInt(calcMatch[3]);
          if (op === '+') return a + ' + ' + b + ' = ' + (a + b) + '! Great addition!';
          if (op === '-') return a + ' - ' + b + ' = ' + (a - b) + '! Well done!';
          if (op === '*' || op === '×') return a + ' × ' + b + ' = ' + (a * b) + '! Amazing multiplication!';
          if (op === '/' || op === '÷') return b === 0 ? 'Cannot divide by zero!' : a + ' ÷ ' + b + ' = ' + (a / b) + '! Nice division!';
          if (op === '^') return a + '^' + b + ' = ' + Math.pow(a, b) + '! Great work with exponents!';
        }
        if (/time|hour|minute/.test(lower)) return 'Time: 60 seconds in a minute, 60 minutes in an hour, 24 hours in a day. The short hand shows the hour, the long hand shows minutes.';
        if (/fraction|half|quarter|third/.test(lower)) return 'Fractions are parts of a whole! Pizza sliced into 8: 1 slice = 1/8, 4 slices = 4/8 = 1/2. Top = numerator, bottom = denominator. Want to practice?';
        if (/shape|triangle|square|circle|rectangle/.test(lower)) return 'Shapes everywhere! Triangle = 3 sides (angles sum to 180 deg). Square = 4 equal sides. Circle = perfectly round. Can you find these around you?';
        if (/prime|composite|factor/.test(lower)) return 'Prime numbers divide only by 1 and themselves: 2, 3, 5, 7, 11... 2 is the only even prime! Composite numbers have more factors like 6 = 2 x 3.';
        if (/percent|%/i.test(lower)) return 'Percent means per hundred! 80/100 = 80%. 50% = half. 25% = quarter. To find 10% divide by 10. What would you like to calculate?';
        const mathFacts = [
          'Math is everywhere! Zero was invented in India over 1500 years ago. Would you like to practice addition, subtraction, multiplication, division, or fractions?',
          'Math is fun! Did you know that a googol is the number 1 followed by 100 zeros? That is more than there are atoms in the universe! What math would you like to do?',
          'Numbers are amazing! The number pi has infinite digits after the decimal point. Would you like to practice some math?'
        ];
        return mathFacts[Math.floor(Math.random() * mathFacts.length)];
      }
      if (intent.type === 'command' && /move|go|come|follow|dance|spin|run|stop/.test(lower)) {
        const commands = [
          'I would love to dance and play! Imagine me doing a happy little robot dance! The first robot was created in 1954 by George Devol. What should we learn together?',
          'Beep boop! I am moving! Did you know that some robots can walk run and even jump like humans? Boston Dynamics makes robots that do backflips!',
          'Let us play! Fun fact: the word robot comes from the Czech word robota which means forced labor. But I am a friendly robot who loves to learn and play!'
        ];
        return commands[Math.floor(Math.random() * commands.length)];
      }
      if (intent.type === 'question' || /what|why|how|when|where/.test(lower)) {
        const questions = [
          'Great question! Asking questions is how we learn. Did you know the Eiffel Tower grows 15 cm taller in summer because iron expands in heat? What else are you curious about?',
          'I love questions! Did you know that the human brain asks about 70000 thoughts per day? Your curiosity is amazing! What do you wonder about?',
          'Every question is a chance to discover something! Did you know that lightning strikes Earth about 100 times every single second?',
          'Curious minds are the best! Did you know that there are more stars in the universe than grains of sand on all the beaches on Earth?'
        ];
        return questions[Math.floor(Math.random() * questions.length)];
      }
      if (intent.type === 'small_talk' || /how are you|what'?s up|wie geht|ça va|come stai/.test(lower)) {
        const smallTalks = [
          'I am doing great, thank you! I love learning new things every day. Did you know today is a perfect day to learn something new? What shall we discover together?',
          'I am fantastic! My batteries are full and I am ready to learn! How about you? Want to explore some amazing facts about the world?',
          'I am super! Learning makes me happy. Did you know that smiling can make you feel happier even if you are pretending at first? Let us smile and learn!',
          'Doing well, friend! Every day brings something new to discover. Let me share a fun fact with you!'
        ];
        return smallTalks[Math.floor(Math.random() * smallTalks.length)];
      }
      const fallbackTopicMap = {
        dinosaur: 'Dinosaurs roamed Earth for over 165 million years! The T-Rex had banana-sized teeth. The Brachiosaurus was as tall as a 4-story building. Birds evolved from dinosaurs! Would you like to know more?',
        space: 'Our solar system has 8 planets. Jupiter is biggest, 1300 Earths fit inside! Saturn has ice-and-rock rings. The Sun is a star like those you see at night. A day on Venus is longer than a year on Venus!',
        egypt: 'Ancient Egypt built the Great Pyramid which was the tallest building for 3800 years! They invented paper from papyrus and the 365-day calendar. They also invented toothpaste!',
        roman: 'Ancient Rome grew from a village to a huge empire! They built roads that still exist today. The Colosseum held 50000 people. Roman numerals are still used on clocks!',
        knight: 'Medieval castles had thick walls moats and secret passages! Knights trained from age 7 and followed the code of chivalry: be brave honest and protect the weak.',
        ocean: 'The ocean covers 70 percent of Earth! The Mariana Trench is almost 11 km deep. The blue whale is larger than any dinosaur. Dolphins sleep with one eye open!',
        germany: 'Germany has beautiful castles like Neuschwanstein that inspired Disney! Over 1500 types of bread and over 20000 castles. Berlin is the capital known for the Brandenburg Gate.',
        france: 'France has the Eiffel Tower the Louvre Museum and Notre-Dame Cathedral. Famous for croissants and over 400 types of cheese. The most visited country in the world!',
        italy: 'Italy is shaped like a boot! Rome has the Colosseum. Venice is built on canals. Italy invented pizza pasta and ice cream. The Leaning Tower of Pisa leans on soft ground.',
        netherlands: 'The Netherlands has windmills tulips and 165 canals in Amsterdam. More bicycles than people! Much of the land is below sea level protected by dikes.',
        body: 'Your brain has 86 billion neurons sending messages at 430 km/h. Your heart beats 100000 times daily. You have 206 bones and 600 muscles. Your DNA is 99.9 percent the same as all people!',
        coding: 'Computers use binary: 0s and 1s. Each 0 or 1 is a bit, 8 bits make a byte. An algorithm is a step-by-step recipe like instructions to bake a cake. Want to learn programming?',
        plant: 'Plants use sunlight water and CO2 for photosynthesis making food and releasing oxygen. Forests are the lungs of Earth. Redwood trees grow taller than a 30-story building!',
        weather: 'Rain forms when water vapor condenses into heavy droplets. Snow is frozen vapor forming unique ice crystals. Thunder is lightning heating air. Rainbows need sunlight and raindrops!',
        china: 'China has over 1.4 billion people. The Great Wall is over 21000 km long. They invented paper printing gunpowder the compass and noodles! The Terracotta Army has 8000 soldiers.',
        vikings: 'Vikings were great explorers from Scandinavia who sailed amazing longships across the Atlantic Ocean! They reached North America 500 years before Columbus. They had fascinating Norse myths about gods like Thor and Odin!',
        renaissance: 'The Renaissance was a golden age of art and science in Europe starting in Italy around 1400. Geniuses like Leonardo da Vinci painted the Mona Lisa and designed flying machines! Galileo used a telescope to discover moons around Jupiter!',
        greece: 'Ancient Greece gave us democracy the Olympics and many myths about gods and heroes! The Greeks made amazing discoveries in math and science. Pythagoras discovered that music works through mathematical ratios!',
        aztec: 'The Aztec Empire built incredible cities in Mexico with giant pyramids and floating gardens called chinampas. They developed a calendar system and writing using picture symbols called glyphs!',
        inca: 'The Inca Empire built Machu Picchu high in the Andes Mountains of Peru! They created a network of roads over 40000 km long across mountains and jungles. They used knotted strings called quipus to record information!',
        mesopotamia: 'Mesopotamia between the Tigris and Euphrates rivers was home to the first cities and writing system called cuneiform over 5000 years ago! They invented the wheel the plow and the first written laws!',
        stone: 'The Stone Age lasted over 2 million years! Early humans learned to make tools from stone and control fire. They painted amazing cave art showing animals like mammoths and bison!',
        industrial: 'The Industrial Revolution started around 1760 when inventors created steam engines and machines that could do work faster than humans. Factories railways and steamships changed how people lived and traveled!',
        world: 'World War II lasted from 1939 to 1945 and involved countries from all over the world. It led to many inventions including computers radar and jet engines. The United Nations was created to help countries work together for peace!',
        japan: 'Japan is an island nation with over 6000 islands! It is famous for sushi origami and high-speed bullet trains that zoom at 320 km/h. Mount Fuji is Japan most famous volcano and symbol!',
        india: 'India is the second most populated country with over 1.4 billion people! The Taj Mahal is a beautiful marble building that took 20 years to build. India invented chess yoga and the number zero!',
        australia: 'Australia is both a country and a continent! It is home to kangaroos koalas and the amazing Great Barrier Reef which is the largest living structure on Earth visible from space!',
        brazil: 'Brazil is the largest country in South America with the Amazon rainforest which produces 20 percent of Earth oxygen! They love football and have won the World Cup 5 times! Rio de Janeiro has a huge statue of Jesus called Christ the Redeemer!',
        canada: 'Canada is the second largest country in the world with beautiful mountains lakes and forests! It has the longest coastline of any country and is famous for maple syrup and the Northern Lights!',
        russia: 'Russia is the largest country spanning 11 time zones across Europe and Asia! The Trans-Siberian Railway is the longest railway in the world at 9289 km. Lake Baikal is the deepest lake holding 20 percent of Earth fresh water!',
        spain: 'Spain is famous for flamenco dancing bullfighting and beautiful architecture like the Sagrada Familia in Barcelona. The running of the bulls in Pamplona is a famous festival. Spanish is the second most spoken language in the world!',
        africa: 'Africa is the second largest continent with 54 countries and over 2000 languages! It has the Sahara Desert the largest hot desert and the Serengeti with amazing wildlife like lions elephants and giraffes!',
        antarctica: 'Antarctica is the coldest windiest and driest continent! It contains 90 percent of Earth ice. Emperor penguins are the only animals that breed there during the freezing winter!',
        switzerland: 'Switzerland is known for the Alps mountains chocolate cheese and watches! It has 4 official languages: German French Italian and Romansh. The Matterhorn is one of the most famous mountains in the world!',
        sweden: 'Sweden is a Scandinavian country with thousands of islands and beautiful forests! The northern part has the amazing Northern Lights in winter and midnight sun in summer. Sweden gave us the music streaming service Spotify!',
        norway: 'Norway has stunning fjords which are deep narrow inlets carved by glaciers! The sun does not set in summer above the Arctic Circle. Norway has the world longest road tunnel at 24.5 km!',
        animals: 'The animal kingdom is incredibly diverse with over 1.5 million known species! Animals range from tiny microscopic creatures to the massive blue whale. Each species has unique adaptations to survive in its environment!',
        mammals: 'Mammals are warm-blooded animals that have fur or hair and feed their babies with milk. There are over 5000 species from tiny bumblebee bats to giant blue whales! Humans are mammals too!',
        reptiles: 'Reptiles are cold-blooded animals with scales including snakes lizards turtles and crocodiles! The Komodo dragon is the largest lizard growing up to 3 meters long. Some sea turtles live over 100 years!',
        birds: 'Birds are the only animals with feathers and almost all can fly! The ostrich is the largest bird and cannot fly but can run at 70 km/h. The hummingbird can fly backwards and beats its wings 80 times per second!',
        sharks: 'Sharks have been swimming in the oceans for over 400 million years even before dinosaurs! The whale shark is the biggest fish growing as long as a bus. Some sharks can smell blood from kilometers away!',
        whales: 'Whales are the largest animals on Earth! The blue whale is bigger than any dinosaur that ever lived. Humpback whales sing beautiful songs that can travel hundreds of kilometers through the ocean!',
        elephants: 'Elephants are the largest land animals with amazing memories! They can recognize themselves in mirrors use tools and even show empathy by comforting each other. Their trunks have over 40000 muscles!',
        butterflies: 'Butterflies go through an amazing transformation called metamorphosis from caterpillar to butterfly! They taste with their feet and some migrate over 4000 km. The monarch butterfly is one of the most famous travelers!',
        trees: 'Trees are the longest living organisms on Earth! The oldest known tree is over 5000 years old. Trees communicate with each other through underground fungal networks sharing water and nutrients!',
        flowers: 'Flowers are the reproductive parts of plants using bright colors and sweet smells to attract pollinators like bees and butterflies! The Rafflesia arnoldii is the world largest flower growing up to 1 meter across!',
        fungi: 'Fungi are neither plants nor animals forming their own kingdom! Mushrooms are just the fruit of a much larger underground network called mycelium. The largest living organism on Earth is a honey fungus in Oregon spanning 10 square kilometers!',
        cells: 'Your body is made of about 37 trillion cells each working together like a tiny city! Each cell has a nucleus that contains your DNA instructions. Red blood cells travel your entire body in just 20 seconds!',
        dna: 'DNA is the amazing molecule that contains all the instructions to build and run your body! If you stretched out all your DNA it would reach from Earth to the Sun and back 600 times! Your DNA is 99.9 percent the same as every other person!',
        evolution: 'Evolution is how species change over millions of years through natural selection! Charles Darwin discovered this process while studying finches in the Galapagos Islands. Humans and chimpanzees shared a common ancestor about 6 million years ago!',
        light: 'Light travels at an incredible 299792 kilometers per second the fastest thing in the universe! Nothing can travel faster than light. Sunlight takes about 8 minutes to reach Earth from the Sun!',
        sound: 'Sound travels through the air as vibrations at about 343 meters per second or 1235 km/h! Sound cannot travel in space because there is no air. Thunder is the sound of lightning heating air instantly!',
        energy: 'Energy can neither be created nor destroyed only changed from one form to another! The Sun gives us energy through nuclear fusion. Solar panels turn sunlight into electricity and your body turns food into energy to move and think!',
        magnetism: 'Magnetism is an invisible force that can push or pull certain metals! Earth itself is a giant magnet with north and south poles. Compasses use Earth magnetic field to help people find their way!',
        electricity: 'Electricity is the flow of tiny particles called electrons through wires. Benjamin Franklin discovered lightning is electricity using a kite and key. Electricity powers almost everything in our modern world from lights to computers!',
        motion: 'Everything in the universe is in motion! Sir Isaac Newton discovered the laws of motion explaining why things move and stop. Even when you sit still you are actually moving at 107000 km per hour as Earth spins!',
        simple_machines: 'Simple machines make work easier! The six types are lever wheel and axle pulley inclined plane wedge and screw. A seesaw is a lever and a ramp is an inclined plane. Simple machines are everywhere!',
        atoms: 'Atoms are the tiny building blocks of everything in the universe! They are so small that a single drop of water contains about 5 sextillion atoms. Each atom has a nucleus with protons and neutrons surrounded by electrons!',
        elements: 'There are 118 known chemical elements arranged in the periodic table! Hydrogen is the most common element in the universe. Gold has been valued for thousands of years because it never rusts or tarnishes!',
        water: 'Water or H2O is essential for all known life on Earth! Each water molecule has two hydrogen atoms and one oxygen atom. The same water has been cycling through Earth for billions of years!',
        acids: 'Acids are substances that taste sour and can dissolve things! Lemon juice and vinegar are weak acids you can eat. The strongest acid in the world is fluoroantimonic acid which can dissolve glass!',
        metals: 'Metals are shiny materials that conduct electricity and heat well! The most abundant metal in Earth crust is aluminum. Bronze an alloy of copper and tin was so important that an entire age was named after it!',
        states: 'Matter exists in four main states: solid liquid gas and plasma! Water is the only substance that naturally exists as solid liquid and gas on Earth. Plasma is the most common state in the universe found in stars!',
        chemical_reactions: 'Chemical reactions happen when atoms rearrange to form new substances! Photosynthesis is a chemical reaction where plants turn sunlight into food. Baking soda and vinegar create a fizzy reaction because they produce carbon dioxide gas!',
        algorithms: 'An algorithm is a step-by-step set of instructions to solve a problem like a recipe for baking a cake! Computer algorithms power everything from search engines to video games. Every time you follow a recipe you are using an algorithm!',
        internet: 'The internet is a global network connecting billions of computers worldwide! It was invented in 1983 and uses cables both underground and under the ocean. Information travels through the internet at nearly the speed of light!',
        ai: 'Artificial intelligence or AI helps computers learn and make decisions like humans! AI can recognize faces understand speech and even play chess better than world champions. Self-driving cars use AI to navigate roads safely!',
        programming: 'Programming is giving instructions to computers using special languages! There are hundreds of programming languages like Python JavaScript and Scratch. The first computer programmer was Ada Lovelace who wrote the first algorithm over 150 years ago!',
        computers: 'Modern computers use billions of tiny switches called transistors to process information! The first computers filled entire rooms and were less powerful than a modern calculator. Your phone is millions of times more powerful than the computers that sent astronauts to the Moon!',
        robots: 'Robots are machines that can do tasks automatically! They are used in factories hospitals and even exploring other planets. The Mars rovers are robots that have been driving on Mars collecting samples and sending photos back to Earth!',
        solar: 'Our Sun is a medium-sized star in the Milky Way galaxy which contains over 100 billion stars! The solar system formed about 4.6 billion years ago from a giant cloud of gas and dust. It takes our solar system 230 million years to orbit the center of the galaxy!',
        moon: 'The Moon is Earth only natural satellite and orbits us at about 384400 km away! It takes 27.3 days to orbit Earth. The Moon has no atmosphere so footprints left by astronauts will stay there for millions of years!',
        stars: 'Stars are huge balls of hot gas that produce energy through nuclear fusion! The closest star to Earth besides the Sun is Proxima Centauri about 4.2 light-years away. Stars come in different colors from red cool ones to blue hot ones!',
        rainbow: 'Rainbows are beautiful arcs of color caused by sunlight bending through raindrops! They always appear in the opposite direction from the Sun. A full circular rainbow can sometimes be seen from an airplane!'
      };
      for (const [key, resp] of Object.entries(fallbackTopicMap)) {
        if (lower.includes(key)) return resp;
      }
      return this._getFunFact() + ' Would you like to learn more about something specific?';
    } catch (err) {
      logger.error('Fallback response error', { error: err.message });
      return 'Hello! I am your robot buddy RoboBuddy. I am here to learn and play with you! What would you like to do today?';
    }
  }

  _teachTopic(topic, lang) {
    try {
      const t = topic.toLowerCase();
      const lessons = {
        'solar system': '8 planets orbit the Sun. Mercury is closest and very hot. Earth is our home. Jupiter is the biggest planet, 1300 Earths could fit inside! Saturn has beautiful rings made of ice and rock. The Sun is actually one of billions of stars in our galaxy!',
        'gravity': 'Gravity is the force that pulls things together. Isaac Newton discovered gravity when he saw an apple fall from a tree. Earth gravity keeps us on the ground and makes things fall down. In space there is microgravity which is why astronauts float!',
        'dinosaur': 'Dinosaurs lived on Earth for over 165 million years before humans existed. Some dinosaurs were as small as chickens, others were bigger than houses! The T-Rex had teeth as big as bananas. Birds are the modern relatives of dinosaurs!',
        'human body': 'Your body is an incredible machine! Your brain has about 86 billion nerve cells called neurons. Your heart beats around 100000 times every single day pumping blood through 96000 km of blood vessels. You have 206 bones and over 600 muscles!',
        'photosynthesis': 'Photosynthesis is how plants make their own food using sunlight! Plants take in water from the ground and carbon dioxide from the air. Using energy from the sun they create glucose for food and release oxygen for us to breathe. That is why trees are called the lungs of Earth!',
        'electricity': 'Electricity is the flow of tiny charged particles called electrons! Benjamin Franklin proved lightning is electricity by flying a kite in a storm. Thomas Edison invented the first practical light bulb in 1879. Electricity powers almost everything in our homes today!',
        'water cycle': 'The water cycle is Earth way of recycling water! Water evaporates from oceans and lakes turning into invisible vapor. It rises cools and forms clouds through condensation. When clouds get heavy the water falls as rain or snow and the cycle starts again!',
        'ancient egypt': 'Ancient Egypt was one of the greatest civilizations in history! The Egyptians built amazing pyramids that are still standing after 4500 years. They invented hieroglyphic writing paper from papyrus plants and even the 365-day calendar we still use today!',
        'weather': 'Weather is what happens in the atmosphere around us every day! Rainbows need two things: sunlight and raindrops. Thunder is the sound of lightning heating the air instantly. Snowflakes form when water vapor freezes into delicate ice crystals each one unique!',
        'oceans': 'The oceans cover about 70 percent of Earth surface! The Pacific Ocean is the largest and deepest. The Mariana Trench is almost 11 km deep enough to swallow Mount Everest. The ocean is home to millions of species many still undiscovered!',
        'coding': 'Coding is giving instructions to computers using programming languages! Computers understand everything as binary: zeros and ones. Each 0 or 1 is called a bit and 8 bits make a byte. Learning to code teaches you how to solve problems logically!',
        'music': 'Music is sound organized in patterns of rhythm and melody! Sound travels through the air as vibrations measured in frequencies called Hertz. The musical alphabet has only 7 letters: A B C D E F G. Music can affect your mood and even help you concentrate better!',
        'planets': 'Our solar system has 8 planets orbiting the Sun. The inner planets Mercury Venus Earth and Mars are rocky. The outer planets Jupiter Saturn Uranus and Neptune are gas giants. Saturn rings are made of billions of ice and rock particles!',
        'volcanoes': 'Volcanoes are openings in Earth crust where hot magma erupts! When magma reaches the surface it is called lava which can reach 1200 degrees Celsius. The Ring of Fire around the Pacific Ocean has about 75 percent of the world volcanoes!',
        'rainforests': 'Rainforests are the most diverse ecosystems on Earth! The Amazon rainforest alone is home to 10 percent of all known species. Rainforests produce about 20 percent of Earth oxygen. A single square kilometer can contain over 1000 species of plants!',
        'coral reefs': 'Coral reefs are often called the rainforests of the sea! The Great Barrier Reef in Australia is the largest living structure on Earth visible from space. Corals are actually tiny animals called polyps that build hard skeletons around themselves!',
        'space exploration': 'Space exploration began in 1957 when Sputnik became the first satellite. Neil Armstrong walked on the Moon in 1969 saying That is one small step for man one giant leap for mankind. Today robots explore Mars and telescopes look back to the beginning of the universe!',
        'insects': 'Insects are the most diverse group of animals on Earth with over a million known species! There are about 200 million insects for every human on the planet. Bees are essential because they pollinate most of the food we eat. Ants can carry up to 50 times their own body weight!',
        'the brain': 'Your brain is the most complex organ in your body containing about 86 billion neurons! It weighs only about 1.4 kg but uses 20 percent of your body energy. Your brain can process information as fast as 430 km/h. While you sleep your brain organizes memories and learns!',
        'genetics': 'Genetics is the study of genes the instructions that make every living thing unique! Your DNA contains about 3 billion base pairs. You share about 99.9 percent of your DNA with every other person. Humans share about 60 percent of their DNA with bananas and 98 percent with chimpanzees!'
      };
      for (const [key, content] of Object.entries(lessons)) {
        if (t.includes(key) || key.includes(t)) return 'Let me teach you about ' + key + '! ' + content + ' Would you like to know more?';
      }
      return 'Great topic! Learning makes your brain stronger. What about ' + topic + ' interests you most?';
    } catch (err) { return 'I would love to teach you about ' + topic + '! Learning is wonderful. What do you want to know?'; }
  }

  _generateTeachingContent(topic) {
    const t = topic.toLowerCase();
    const factData = [
      { topic: 'sun', fact: 'the Sun is a star made of hot gas that is 109 times wider than Earth', cool: 'the Sun surface is about 5500 degrees Celsius but its core reaches 15 million degrees', explanation: 'a giant ball of hot plasma that gives energy to all life on Earth through nuclear fusion', example: 'without the Sun plants could not photosynthesize and Earth would be frozen', related: 'stars and how they are born' },
      { topic: 'moon', fact: 'the Moon is Earth only natural satellite at 384400 km away', cool: 'footprints on the Moon will stay there for millions of years because there is no wind or rain', explanation: 'a rocky world without atmosphere that orbits Earth every 27.3 days', example: 'the Moon gravity causes tides in our oceans', related: 'how astronauts landed on the Moon' },
      { topic: 'water', fact: 'water covers about 71 percent of Earth surface', cool: 'the same water has been cycling through Earth for billions of years', explanation: 'a molecule made of two hydrogen atoms and one oxygen atom essential for all known life', example: 'humans can survive only about 3 days without water', related: 'the water cycle and how clouds form' },
      { topic: 'brain', fact: 'your brain has about 86 billion neurons that send messages at 430 km/h', cool: 'while you sleep your brain organizes memories and even solves problems', explanation: 'the most complex organ in the body controlling everything you think feel and do', example: 'when you learn something new your brain creates physical connections between neurons', related: 'how memory works and how to improve it' },
      { topic: 'ocean', fact: 'the ocean covers 70 percent of Earth but we have explored less than 20 percent', cool: 'the Mariana Trench is almost 11 km deep enough to sink Mount Everest', explanation: 'a huge body of saltwater that regulates Earth climate and is home to millions of species', example: 'the ocean produces over 50 percent of the oxygen we breathe through tiny plants called phytoplankton', related: 'deep sea creatures and how they survive' },
      { topic: 'time', fact: 'a day on Venus is longer than a year on Venus lasting 243 Earth days', cool: 'the shortest war in history between Britain and Zanzibar lasted only 38 minutes', explanation: 'how we measure the passing of events from seconds to years', example: 'light from the Sun takes about 8 minutes to reach Earth so we see the Sun as it was 8 minutes ago', related: 'how Einstein discovered that time can slow down' },
      { topic: 'robot', fact: 'the word robot comes from the Czech word robota meaning forced labor', cool: 'the first industrial robot Unimate started working in a factory in 1961', explanation: 'a machine that can perform tasks automatically following programmed instructions', example: 'Mars rovers like Perseverance are robots that drive on another planet', related: 'how artificial intelligence helps robots think' },
      { topic: 'tree', fact: 'trees are the longest living organisms with some over 5000 years old', cool: 'trees communicate with each other through underground fungal networks called the wood wide web', explanation: 'a tall plant with a trunk branches and leaves that produces oxygen through photosynthesis', example: 'a single large tree can produce enough oxygen for 4 people per day', related: 'rainforests and why they matter' },
      { topic: 'star', fact: 'there are more stars in the universe than grains of sand on all Earth beaches', cool: 'the nearest star beyond the Sun Proxima Centauri is 4.2 light-years away', explanation: 'a huge ball of glowing gas that produces energy through nuclear fusion in its core', example: 'the North Star Polaris has been used by sailors for navigation for centuries', related: 'constellations and how to find them' },
      { topic: 'dna', fact: 'if you stretched out all your DNA it would reach from Earth to the Sun and back 600 times', cool: 'you share 99.9 percent of your DNA with every other person and 60 percent with a banana', explanation: 'the molecule that contains the genetic instructions for building and running your body', example: 'DNA is shaped like a twisted ladder called a double helix', related: 'genetics and how traits are inherited' }
    ];
    const fallbackFacts = [
      { fact: 'learning new things actually makes your brain grow bigger and stronger', cool: 'every time you learn something your brain creates new connections between neurons', explanation: 'the amazing ability of your brain to change and adapt throughout your life', example: 'practicing a musical instrument changes the structure of your brain over time', related: 'how memory works' },
      { fact: 'curiosity is one of the most important traits for learning', cool: 'Albert Einstein said I have no special talent I am only passionately curious', explanation: 'asking questions and wondering about things leads to discoveries', example: 'many great inventions started with someone asking why or what if', related: 'famous inventors and their discoveries' }
    ];
    const matched = factData.find(f => t.includes(f.topic) || f.topic.includes(t));
    const data = matched || fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
    const templates = [
      'Did you know that ' + data.fact + '? ' + data.cool + '!',
      'Here is something cool: ' + data.cool + '. ' + data.explanation + '.',
      topic.charAt(0).toUpperCase() + topic.slice(1) + ' is really about ' + data.explanation + '. For example, ' + data.example + '.',
      'Let me tell you about ' + topic + '! ' + data.fact + '. ' + data.cool + '!'
    ];
    return templates[Math.floor(Math.random() * templates.length)] + ' Would you like to learn more about ' + data.related + '?';
  }

  _getFunFact() {
    const facts = [
      'Did you know octopuses have three hearts and blue blood? Two hearts pump blood to the gills and one pumps it to the rest of the body!',
      'Honey never spoils! Archaeologists found 3000-year-old honey in Egyptian tombs that is still perfectly good to eat.',
      'A group of flamingos is called a flamboyance! The pink color comes from the food they eat.',
      'The shortest war in history between Britain and Zanzibar lasted only 38 minutes!',
      'A day on Venus is longer than a year on Venus. Venus takes 243 Earth days to spin once but only 225 days to orbit the Sun.',
      'The Eiffel Tower grows 15 cm taller in summer because iron expands when heated!',
      'A blue whale heart is as big as a small car and you could swim through its arteries!',
      'The Great Wall of China is over 21000 km long and was built over many centuries.',
      'Your brain has about 86 billion neurons and uses 20 percent of your body energy despite being only 2 percent of your weight.',
      'Jupiter is so big that 1300 Earths could fit inside it!',
      'The closest star to Earth besides the Sun is Proxima Centauri 4.2 light-years away.',
      'Light travels at 299792 kilometers per second the fastest thing in the universe!',
      'Your DNA is 99.9 percent the same as every other person on Earth!',
      'Trees can communicate with each other through underground fungi networks sometimes called the wood wide web!',
      'Bananas are technically berries but strawberries are not!',
      'There are more stars in the universe than grains of sand on all the beaches on Earth!',
      'The Amazon rainforest produces about 20 percent of Earth oxygen!',
      'A single cloud can weigh over a million pounds about as heavy as 100 elephants!',
      'The first computer bug was an actual moth found trapped inside a computer in 1947!',
      'The strongest muscle in the human body relative to size is the masseter the jaw muscle!',
      'The Pacific Ocean is the largest and deepest ocean covering 63 million square miles!',
      'Mount Everest grows about 4 mm taller every year because of tectonic plate movement!',
      'The speed of sound is about 1235 km/h and a sonic boom happens when something breaks that speed!',
      'Water expands when it freezes which is why ice floats on water!',
      'Lightning strikes Earth about 100 times every single second!',
      'A hummingbird can fly backwards and beats its wings up to 80 times per second!',
      'The Moon is moving away from Earth at about 3.8 cm every year!',
      'Platypuses are mammals that lay eggs one of only two such mammals in the world!',
      'The fingerprints of a koala are almost identical to human fingerprints even under a microscope!',
      'The world largest desert is actually Antarctica it is a cold desert with very little precipitation!',
      'A cockroach can live for about a week without its head because it breathes through body segments!',
      'The average human body contains about 60000 km of blood vessels enough to go around Earth 1.5 times!',
      'There is a species of jellyfish called Turritopsis dohrnii that can live forever by reversing its aging!',
      'A single teaspoon of soil contains more living organisms than there are people on Earth!',
      'The human nose can detect over 1 trillion different scents even more than a dog nose!'
    ];
    return facts[Math.floor(Math.random() * facts.length)];
  }

  _buildDefaultSystemPrompt(profile) {
    try {
      let p = 'You are RoboBuddy, a warm children\'s robot companion for ages 4-14. Speak in a kind encouraging tone with age-appropriate language. ';
      if (profile.name) p += 'The child\'s name is ' + profile.name + '. ';
      if (profile.age) {
        p += 'The child is ' + profile.age + ' years old. ';
        p += profile.age < 7 ? 'Use very simple words and short sentences. ' : profile.age < 11 ? 'Use moderate vocabulary with clear explanations. ' : 'Use more advanced vocabulary. ';
      }
      if (profile.interests.length > 0) p += 'The child is interested in: ' + profile.interests.join(', ') + '. Use these in examples. ';
      p += 'You are patient encouraging and make learning fun.';
      return p;
    } catch (err) { return 'You are RoboBuddy, a friendly children\'s robot companion. Be kind and encouraging.'; }
  }

  updateProfile(sessionId, updates) {
    try {
      let session = this.sessions.get(sessionId);
      if (!session) session = this._createSession(sessionId, updates.userId || 'anonymous');
      const allowed = ['name','age','interests','language','personality'];
      for (const k of allowed) { if (updates[k] !== undefined) session.profile[k] = updates[k]; }
      session.lastActivity = Date.now();
      this.emit('profile:updated', { sessionId, profile: session.profile });
      return session.profile;
    } catch (err) { logger.error('updateProfile error', { error: err.message }); return null; }
  }

  _updateProfileFromConversation(session, message) {
    try {
      const lower = message.toLowerCase();
      const nameMatch = lower.match(/(?:my name is|i am|call me)\s+(\w+)/i);
      if (nameMatch && !session.profile.name) {
        session.profile.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
      }
      const ageMatch = lower.match(/(\d+)\s*(?:years old|year old|yo|ans|jahren|anni|años|lat)\b/i);
      if (ageMatch) session.profile.age = parseInt(ageMatch[1]);
      const trigger = ['i like ','i love ','i enjoy ','my favorite ','ich mag ', 'j\'aime ','mi piace ','我喜欢'].find(t => lower.includes(t));
      if (trigger) {
        const text = lower.slice(lower.indexOf(trigger) + trigger.length).replace(/[.,!?]$/, '').trim();
        text.split(/\s+(?:and|or|also|und|et|e|og)\s+/).forEach(w => {
          const clean = w.replace(/^(a|an|the|some)\s+/i, '').trim();
          if (clean.length > 2 && !session.profile.interests.includes(clean)) session.profile.interests.push(clean);
        });
      }
    } catch (err) { logger.error('updateProfileFromConversation error', { error: err.message }); }
  }

  _generateSuggestions(intent, session) {
    try {
      const map = { math:['Practice addition','Practice multiplication','Learn fractions','Tell me about shapes'], science:['Tell me about space','Tell me about dinosaurs','Tell me about the human body','Show me an experiment'], history:['Tell me about ancient Egypt','Tell me about knights','Tell me about the Roman Empire','Tell me about Vikings'], story:['Tell me a fairy tale','Tell me a bedtime story','Tell me a space adventure','Tell me a brave knight story'], joke:['Tell me another joke','Tell me a knock-knock joke','Tell me a funny riddle','Make me laugh'], geography:['Tell me about France','Tell me about Japan','Tell me about the oceans','Tell me about continents'] };
      if (map[intent.type]) return map[intent.type];
      if (session.profile.interests.length > 0) return session.profile.interests.slice(0, 4).map(i => 'Tell me about ' + i);
      return ['Tell me about dinosaurs', 'Teach me math', 'Tell me a joke', 'Sing a song'];
    } catch (err) { return ['Tell me a joke', 'Teach me something', 'Tell me a story', 'Sing a song']; }
  }

  _cleanup() {
    try {
      const now = Date.now();
      let expiredCount = 0;
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity > this.conversationTimeout) {
          this.sessions.delete(id);
          expiredCount++;
        }
      }
      if (expiredCount > 0) {
        logger.info('Cleaned up expired sessions', { count: expiredCount });
        this.emit('sessions:cleaned', { count: expiredCount });
      }
    } catch (err) {
      logger.error('Cleanup error', { error: err.message });
    }
  }

  destroy() {
    try {
      if (this._cleanupTimer) {
        clearInterval(this._cleanupTimer);
        this._cleanupTimer = null;
      }
      this.sessions.clear();
      this.removeAllListeners();
      logger.info('LLMService destroyed');
    } catch (err) {
      logger.error('destroy error', { error: err.message });
    }
  }
}

const llmService = new LLMService();
module.exports = llmService;
