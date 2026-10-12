const logger = require('../utils/logger');
const registry = require('./registry');

const PROVIDERS = {
  openai: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1', models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'], embeddingModels: ['text-embedding-3-small','text-embedding-3-large','text-embedding-ada-002'], moderationEndpoint: '/moderations', rateLimit: 5000 },
  zhipu: { name: '智谱清言', endpoint: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-plus','glm-4','glm-4-flash','glm-3-turbo'], embeddingModels: ['embedding-2'], rateLimit: 1000 },
  deepseek: { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', models: ['deepseek-chat','deepseek-coder'], embeddingModels: [], rateLimit: 500 },
  claude: { name: 'Anthropic Claude', endpoint: 'https://api.anthropic.com/v1', models: ['claude-3-opus','claude-3-sonnet','claude-3-haiku'], embeddingModels: [], rateLimit: 1000 },
  moonshot: { name: 'Moonshot', endpoint: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k','moonshot-v1-32k','moonshot-v1-128k'], embeddingModels: [], rateLimit: 500 },
  qwen: { name: '通义千问', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-max','qwen-plus','qwen-turbo'], embeddingModels: ['text-embedding-v1'], rateLimit: 1000 },
  yi: { name: '零一万物', endpoint: 'https://api.lingyiwanwu.com/v1', models: ['yi-large','yi-medium','yi-spark'], embeddingModels: [], rateLimit: 500 },
  baidu: { name: '文心一言', endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', models: ['ernie-4.0','ernie-3.5','ernie-speed'], embeddingModels: [], rateLimit: 500 },
  gemini: { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-pro','gemini-ultra'], embeddingModels: ['embedding-001'], rateLimit: 1500 },
  ollama: { name: 'Ollama (Local)', endpoint: 'http://localhost:11434/v1', models: ['llama3.2:1b','llama3','mistral','codellama','phi'], local: true, embeddingModels: [], rateLimit: 9999 }
};

const MODEL_FALLBACKS = {
  'gpt-4o': ['gpt-4-turbo', 'gpt-3.5-turbo', 'deepseek-chat'],
  'gpt-4-turbo': ['gpt-3.5-turbo', 'deepseek-chat'],
  'deepseek-chat': ['deepseek-coder', 'moonshot-v1-8k'],
  'qwen-max': ['qwen-plus', 'qwen-turbo'],
  'glm-4-plus': ['glm-4', 'glm-4-flash'],
  'claude-3-opus': ['claude-3-sonnet', 'claude-3-haiku']
};

const SYSTEM_PROMPTS = {
  default: 'You are a helpful AI assistant for a children companion robot.',
  child_safe: 'You are a friendly, age-appropriate assistant for children. Keep responses simple, positive, and safe.',
  educational: 'You are an educational tutor for children. Explain concepts simply and encourage curiosity.',
  storytelling: 'You are a creative storyteller for children. Create engaging, imaginative, and moral stories.',
  translation: 'You are a professional translator. Translate accurately and naturally.',
  coding: 'You are an expert programmer. Provide clean, efficient code with explanations.',
  creative: 'You are a creative partner. Help brainstorm ideas with enthusiasm and originality.',
  concise: 'You are a direct assistant. Give brief, to-the-point answers without extra commentary.'
};

const TOKEN_COST_PER_MODEL = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'deepseek-chat': { input: 0.00027, output: 0.0011 },
  'deepseek-coder': { input: 0.0014, output: 0.0028 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'glm-4-plus': { input: 0.001, output: 0.001 },
  'glm-4': { input: 0.0005, output: 0.0005 },
  'qwen-max': { input: 0.002, output: 0.006 },
  'qwen-plus': { input: 0.0008, output: 0.002 },
  'qwen-turbo': { input: 0.0003, output: 0.0006 }
};

const MODERATION_CATEGORIES = ['hate','hate/threatening','harassment','self-harm','sexual','sexual/minors','violence','violence/graphic'];

class LLMHub {
  constructor() {
    this.activeProvider = null;
    this.apiKeys = {};
    this.cache = new Map();
    this.rateLimiters = new Map();
    this.conversations = new Map();
    this.moderationEnabled = true;
    this._loadKeys();
    this._register();
  }

  _loadKeys() {
    const keyMap = {
      openai: process.env.OPENAI_API_KEY,
      zhipu: process.env.ZHIPU_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      claude: process.env.CLAUDE_API_KEY,
      moonshot: process.env.MOONSHOT_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      yi: process.env.YI_API_KEY,
      baidu: process.env.BAIDU_API_KEY,
      gemini: process.env.GEMINI_API_KEY
    };
    for (const [provider, key] of Object.entries(keyMap)) {
      if (key) {
        this.apiKeys[provider] = key;
        if (!this.activeProvider) this.activeProvider = provider;
      }
    }
  }

  _register() {
    for (const [id, meta] of Object.entries(PROVIDERS)) {
      const apiKey = this.apiKeys[id];
      registry.registerIntegration(`llm-${id}`, {
        name: meta.name, type: 'llm', needsKey: !meta.local, apiKey,
        models: meta.models, embeddingModels: meta.embeddingModels,
        endpoint: meta.endpoint, local: !!meta.local,
        category: 'ai/llm'
      }, this);
    }
    registry.registerTool('llm:chat', { name: 'LLM Chat', description: 'Send chat messages to LLM' }, async (p) => this.chat(p.messages, p.options));
    registry.registerTool('llm:stream', { name: 'LLM Stream', description: 'Stream chat response' }, async (p) => this.stream(p.messages, p.options, p.onChunk));
    registry.registerTool('llm:embed', { name: 'Generate Embeddings', description: 'Generate text embeddings' }, async (p) => this.generateEmbedding(p.text, p.options));
    registry.registerTool('llm:moderate', { name: 'Moderate Content', description: 'Check content safety' }, async (p) => this.moderate(p.text));
    registry.registerTool('llm:transcribe', { name: 'Transcribe Audio', description: 'Speech to text' }, async (p) => this.transcribe(p.audio, p.options));
    registry.registerTool('llm:tts', { name: 'Text to Speech', description: 'Convert text to speech' }, async (p) => this.tts(p.text, p.options));
    registry.registerTool('llm:count-tokens', { name: 'Count Tokens', description: 'Estimate token count' }, async (p) => ({ count: this._estimateTokens(p.text) }));
  }

  getProviders() {
    return Object.entries(PROVIDERS).map(([id, meta]) => ({
      id, name: meta.name, endpoint: meta.endpoint,
      models: meta.models, embeddingModels: meta.embeddingModels,
      hasKey: !!this.apiKeys[id],
      active: this.activeProvider === id, local: !!meta.local,
      rateLimit: meta.rateLimit
    }));
  }

  getActive() {
    if (!this.activeProvider) return PROVIDERS.ollama;
    return PROVIDERS[this.activeProvider];
  }

  setActive(providerId) {
    if (!PROVIDERS[providerId]) throw new Error(`Unknown provider: ${providerId}`);
    if (!this.apiKeys[providerId] && !PROVIDERS[providerId].local) throw new Error(`No API key for ${providerId}`);
    this.activeProvider = providerId;
    logger.info(`Active LLM provider: ${PROVIDERS[providerId].name}`);
  }

  async healthCheck() {
    const results = {};
    for (const [id, meta] of Object.entries(PROVIDERS)) {
      if (!meta.local) {
        try {
          const axios = require('axios');
          const healthUrl = meta.endpoint.replace('/v1', '').replace('/v2beta', '') + '/health';
          const res = await axios.get(healthUrl, { timeout: 5000 });
          results[id] = { ok: res.status === 200, status: res.status };
        } catch (e) {
          results[id] = { ok: false, error: e.message };
        }
      } else {
        results[id] = { ok: true, local: true };
      }
    }
    return results;
  }

  setSystemPrompt(name, prompt) {
    SYSTEM_PROMPTS[name] = prompt;
  }

  getSystemPrompt(name) {
    return SYSTEM_PROMPTS[name] || SYSTEM_PROMPTS.default;
  }

  listSystemPrompts() {
    return Object.entries(SYSTEM_PROMPTS).map(([k, v]) => ({ name: k, preview: v.substring(0, 60) }));
  }

  async chat(messages, options = {}) {
    const provider = this.getActive();
    const model = options.model || provider.models[0];
    const apiKey = this.apiKeys[this.activeProvider];

    if (!apiKey && !provider.local) {
      return this._fallback(messages, options);
    }

    if (options.systemPrompt) {
      const sysContent = SYSTEM_PROMPTS[options.systemPrompt] || options.systemPrompt;
      if (!messages.some(m => m.role === 'system')) {
        messages = [{ role: 'system', content: sysContent }, ...messages];
      }
    }

    if (this.moderationEnabled && options.moderate !== false) {
      const fullText = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ');
      const modResult = await this.moderate(fullText);
      if (modResult.flagged) {
        logger.warn('Chat blocked by moderation', { categories: modResult.categories });
        return '[Content blocked by safety filter]';
      }
    }

    const contextManaged = this._manageContext(messages, model);
    const cacheKey = this._cacheKey(model, contextManaged, options);
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    await this._checkRateLimit(this.activeProvider);

    const retryConfig = { retries: 3, baseDelay: 1000, maxDelay: 10000 };
    let lastError;

    for (let attempt = 0; attempt <= retryConfig.retries; attempt++) {
      try {
        const url = `${provider.endpoint}/chat/completions`;
        const body = {
          model,
          messages: contextManaged,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: false
        };
        if (options.topP) body.top_p = options.topP;
        if (options.stop) body.stop = options.stop;
        if (options.presencePenalty) body.presence_penalty = options.presencePenalty;
        if (options.frequencyPenalty) body.frequency_penalty = options.frequencyPenalty;

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        if (options.customHeaders) {
          Object.assign(headers, options.customHeaders);
        }
        if (this.activeProvider === 'zhipu') {
          headers['Authorization'] = this._getZhipuToken();
        }

        const axios = require('axios');
        const res = await axios.post(url, body, { headers, timeout: options.timeout || 60000 });
        const data = res.data;

        const content = data.choices?.[0]?.message?.content || JSON.stringify(data);
        const usage = data.usage || {};
        const totalTokens = usage.total_tokens || this._estimateTokens(content);

        if (options.cache !== false && totalTokens > 10) {
          this._setCache(cacheKey, content, 300);
        }

        const cost = this._estimateCost(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
        registry.emit('llm:used', { provider: this.activeProvider, model, tokens: totalTokens, cost });
        return content;
      } catch (err) {
        lastError = err;
        if (attempt < retryConfig.retries && this._isRetryable(err)) {
          const delay = Math.min(retryConfig.baseDelay * Math.pow(2, attempt) + Math.random() * 1000, retryConfig.maxDelay);
          logger.warn(`LLM retry ${attempt + 1}/${retryConfig.retries}`, { error: err.message, delay });
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    logger.error(`LLM ${this.activeProvider} error after retries`, { error: lastError.message });
    return this._fallbackWithChain(messages, options, model);
  }

  async stream(messages, options = {}, onChunk) {
    const provider = this.getActive();
    const model = options.model || provider.models[0];
    const apiKey = this.apiKeys[this.activeProvider];

    if (!apiKey && !provider.local) {
      const reply = await this._fallback(messages, options);
      return this._simulateStream(reply, onChunk);
    }

    if (options.systemPrompt) {
      const sysContent = SYSTEM_PROMPTS[options.systemPrompt] || options.systemPrompt;
      if (!messages.some(m => m.role === 'system')) {
        messages = [{ role: 'system', content: sysContent }, ...messages];
      }
    }

    if (this.moderationEnabled && options.moderate !== false) {
      const fullText = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ');
      const modResult = await this.moderate(fullText);
      if (modResult.flagged) {
        onChunk('[Content blocked by safety filter]');
        return '[Content blocked by safety filter]';
      }
    }

    const contextManaged = this._manageContext(messages, model);
    if (options.abortSignal) {
      return this._streamWithAbort(provider, model, apiKey, contextManaged, options, onChunk);
    }

    await this._checkRateLimit(this.activeProvider);

    const retryConfig = { retries: 2, baseDelay: 1000, maxDelay: 5000 };

    for (let attempt = 0; attempt <= retryConfig.retries; attempt++) {
      try {
        const axios = require('axios');
        const res = await axios.post(`${provider.endpoint}/chat/completions`, {
          model, messages: contextManaged,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: true
        }, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          responseType: 'stream', timeout: options.timeout || 120000
        });

        let full = '';
        return new Promise((resolve, reject) => {
          let buffer = '';
          res.data.on('data', chunk => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content || '';
                  if (content) {
                    if (onChunk) onChunk(content);
                    full += content;
                  }
                  if (json.usage) {
                    const cost = this._estimateCost(model, json.usage.prompt_tokens || 0, json.usage.completion_tokens || 0);
                    registry.emit('llm:used', { provider: this.activeProvider, model, tokens: json.usage.total_tokens, cost });
                  }
                } catch (e) { /* ignore parse errors */ }
              }
            }
          });
          res.data.on('end', () => resolve(full));
          res.data.on('error', reject);
        });
      } catch (err) {
        if (attempt < retryConfig.retries && this._isRetryable(err)) {
          const delay = Math.min(retryConfig.baseDelay * Math.pow(2, attempt), retryConfig.maxDelay);
          await new Promise(r => setTimeout(r, delay));
        } else {
          logger.error(`LLM stream error`, { error: err.message });
          const reply = await this._fallbackWithChain(messages, options, model);
          if (onChunk) onChunk(reply);
          return reply;
        }
      }
    }
  }

  async _streamWithAbort(provider, model, apiKey, messages, options, onChunk) {
    const axios = require('axios');
    const source = axios.CancelToken.source();
    options.abortSignal.addEventListener('abort', () => source.cancel('Stream aborted'));

    try {
      const res = await axios.post(`${provider.endpoint}/chat/completions`, {
        model, messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2048,
        stream: true
      }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        responseType: 'stream', timeout: options.timeout || 120000,
        cancelToken: source.token
      });

      let full = '';
      return new Promise((resolve, reject) => {
        res.data.on('data', chunk => {
          const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) { if (onChunk) onChunk(content); full += content; }
            } catch (e) { /* ignore */ }
          }
        });
        res.data.on('end', () => resolve(full));
        res.data.on('error', reject);
      });
    } catch (err) {
      if (axios.isCancel(err)) {
        return '[Stream aborted]';
      }
      throw err;
    }
  }

  async generateEmbedding(text, options = {}) {
    const providerId = options.provider || this.activeProvider || 'openai';
    const provider = PROVIDERS[providerId];
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    if (!provider.embeddingModels || provider.embeddingModels.length === 0) {
      return this._fallbackEmbedding(text);
    }

    const model = options.model || provider.embeddingModels[0];
    const apiKey = this.apiKeys[providerId];
    if (!apiKey) return this._fallbackEmbedding(text);

    const cacheKey = `embed:${model}:${text.substring(0, 200)}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      let endpoint, body, headers;
      if (providerId === 'openai') {
        endpoint = `${provider.endpoint}/embeddings`;
        body = { model, input: text };
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
      } else if (providerId === 'qwen') {
        endpoint = `${provider.endpoint}/embeddings`;
        body = { model, input: text };
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
      } else if (providerId === 'gemini') {
        endpoint = `${provider.endpoint}/models/${model}:embedContent`;
        body = { content: { parts: [{ text }] } };
        headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
      } else if (providerId === 'zhipu') {
        endpoint = `${provider.endpoint}/embeddings`;
        body = { model, input: text };
        headers = { 'Authorization': this._getZhipuToken(), 'Content-Type': 'application/json' };
      } else {
        endpoint = `${provider.endpoint}/embeddings`;
        body = { model, input: text };
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
      }

      const axios = require('axios');
      const res = await axios.post(endpoint, body, { headers, timeout: 30000 });
      let embedding;
      if (res.data.data) {
        embedding = res.data.data[0]?.embedding || res.data.data[0]?.values;
      } else if (res.data.embedding) {
        embedding = res.data.embedding.values || res.data.embedding;
      }

      if (embedding) {
        this._setCache(cacheKey, embedding, 600);
        return embedding;
      }
      return this._fallbackEmbedding(text);
    } catch (err) {
      logger.error(`Embedding error (${providerId})`, { error: err.message });
      return this._fallbackEmbedding(text);
    }
  }

  async moderate(text) {
    const apiKey = this.apiKeys['openai'];
    if (!apiKey) return { flagged: false, categories: {}, scores: {} };

    const cacheKey = `mod:${text.substring(0, 500)}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const axios = require('axios');
      const res = await axios.post('https://api.openai.com/v1/moderations', {
        input: text
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10000
      });

      const result = res.data.results?.[0] || { flagged: false, categories: {}, category_scores: {} };
      const output = {
        flagged: result.flagged,
        categories: result.categories || {},
        scores: result.category_scores || {}
      };
      this._setCache(cacheKey, output, 60);
      return output;
    } catch (err) {
      logger.warn('Moderation check failed', { error: err.message });
      return { flagged: false, categories: {}, scores: {}, error: err.message };
    }
  }

  async transcribe(audioBuffer, options = {}) {
    const provider = this.getActive();
    const apiKey = this.apiKeys[this.activeProvider];
    if (!apiKey) return '[语音识别需要配置API Key]';

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', audioBuffer, { filename: options.filename || 'audio.wav', contentType: options.contentType || 'audio/wav' });
      form.append('model', options.whisperModel || 'whisper-1');
      form.append('language', options.language || 'zh');
      if (options.prompt) form.append('prompt', options.prompt);
      if (options.temperature !== undefined) form.append('temperature', options.temperature);
      if (options.responseFormat) form.append('response_format', options.responseFormat);

      const axios = require('axios');
      const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${apiKey}` },
        timeout: options.timeout || 30000
      });
      return res.data.text;
    } catch (err) {
      logger.error('Transcription error', { error: err.message });
      return '[语音识别失败]';
    }
  }

  async tts(text, options = {}) {
    const voice = options.voice || 'alloy';
    const apiKey = this.apiKeys['openai'];
    if (!apiKey) return null;

    try {
      const axios = require('axios');
      const body = {
        model: options.ttsModel || 'tts-1',
        input: text,
        voice,
        response_format: options.responseFormat || 'wav'
      };
      if (options.speed) body.speed = options.speed;

      const res = await axios.post('https://api.openai.com/v1/audio/speech', body, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer', timeout: options.timeout || 30000
      });
      return Buffer.from(res.data);
    } catch (err) {
      logger.error('TTS error', { error: err.message });
      return null;
    }
  }

  async chatWithImage(imageBuffer, prompt, options = {}) {
    const provider = this.getActive();
    const apiKey = this.apiKeys[this.activeProvider];
    if (!apiKey) return this._fallback([{ role: 'user', content: prompt }], options);

    const base64 = imageBuffer.toString('base64');
    const messages = [
      { role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]}
    ];
    return this.chat(messages, options);
  }

  addConversation(id, message) {
    if (!this.conversations.has(id)) {
      this.conversations.set(id, []);
    }
    this.conversations.get(id).push({
      role: message.role || 'user',
      content: message.content,
      timestamp: new Date().toISOString()
    });
    const maxLen = 50;
    const conv = this.conversations.get(id);
    if (conv.length > maxLen) {
      this.conversations.set(id, conv.slice(-maxLen));
    }
  }

  getConversation(id) {
    return this.conversations.get(id) || [];
  }

  clearConversation(id) {
    this.conversations.delete(id);
  }

  listConversations() {
    return Array.from(this.conversations.entries()).map(([id, msgs]) => ({
      id, messageCount: msgs.length,
      lastMessage: msgs[msgs.length - 1]?.content?.substring(0, 50),
      lastUpdated: msgs[msgs.length - 1]?.timestamp
    }));
  }

  setCustomHeader(providerId, key, value) {
    if (!PROVIDERS[providerId]) throw new Error(`Unknown provider: ${providerId}`);
    if (!this._customHeaders) this._customHeaders = {};
    if (!this._customHeaders[providerId]) this._customHeaders[providerId] = {};
    this._customHeaders[providerId][key] = value;
  }

  _estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  _estimateCost(model, promptTokens, completionTokens) {
    const rates = TOKEN_COST_PER_MODEL[model];
    if (!rates) return null;
    const cost = (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
    return Math.round(cost * 1000000) / 1000000;
  }

  _manageContext(messages, model) {
    const maxTokens = 8000;
    let total = 0;
    const managed = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const tokens = this._estimateTokens(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
      if (total + tokens > maxTokens) continue;
      total += tokens;
      managed.unshift(msg);
    }
    return managed;
  }

  _cacheKey(model, messages, options) {
    const msgStr = messages.map(m => `${m.role}:${typeof m.content === 'string' ? m.content.substring(0, 100) : 'img'}`).join('|');
    return `${model}:${msgStr}:${options.temperature ?? 0.7}`;
  }

  _getCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  _setCache(key, value, ttlSeconds) {
    this.cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    if (this.cache.size > 500) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  async _checkRateLimit(providerId) {
    const provider = PROVIDERS[providerId];
    if (!provider || provider.local) return;
    const now = Date.now();
    if (!this.rateLimiters.has(providerId)) {
      this.rateLimiters.set(providerId, { count: 0, windowStart: now });
    }
    const limiter = this.rateLimiters.get(providerId);
    if (now - limiter.windowStart > 1000) {
      limiter.count = 0;
      limiter.windowStart = now;
    }
    limiter.count++;
    if (limiter.count > provider.rateLimit) {
      const wait = 1000 - (now - limiter.windowStart);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      this.rateLimiters.set(providerId, { count: 1, windowStart: Date.now() });
    }
  }

  _isRetryable(err) {
    const status = err.response?.status;
    if (!status) return true;
    return [429, 500, 502, 503, 504].includes(status);
  }

  _getZhipuToken() {
    return process.env.ZHIPU_API_KEY || '';
  }

  _simulateStream(reply, onChunk) {
    const words = reply.split(' ');
    return new Promise(resolve => {
      let i = 0;
      const iv = setInterval(() => {
        if (i < words.length) {
          if (onChunk) onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
          i++;
        } else {
          clearInterval(iv);
          resolve(reply);
        }
      }, 20);
    });
  }

  async _fallbackWithChain(messages, options, failedModel) {
    const fallbacks = MODEL_FALLBACKS[failedModel] || [];
    for (const fbModel of fallbacks) {
      for (const [pid, pmeta] of Object.entries(PROVIDERS)) {
        if (pmeta.models.includes(fbModel) && this.apiKeys[pid]) {
          try {
            logger.info(`Trying fallback: ${fbModel} via ${pid}`);
            const prev = this.activeProvider;
            this.activeProvider = pid;
            const result = await this.chat(messages, { ...options, model: fbModel });
            this.activeProvider = prev;
            return result;
          } catch (e) {
            continue;
          }
        }
      }
    }
    const ai = require('../services/ai');
    return ai.chat(messages, options);
  }

  _fallback(messages, options) {
    const ai = require('../services/ai');
    return ai.chat(messages, options);
  }

  _fallbackEmbedding(text) {
    const dummy = new Array(256).fill(0);
    for (let i = 0; i < text.length && i < dummy.length; i++) {
      dummy[i] = text.charCodeAt(i) / 255;
    }
    return dummy;
  }
}

const llmHub = new LLMHub();
module.exports = llmHub;
