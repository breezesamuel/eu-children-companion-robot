const EventEmitter = require('events');
const logger = require('../utils/logger');
let learningEngine = null;
try { learningEngine = require('./learning-engine'); } catch (_) {}
let smartContext = null;
try { smartContext = require('./smart-chat-context'); } catch (_) {}
let hardwareManager = null;
try { hardwareManager = require('../hardware/hardware-manager'); } catch (_) {}

function buildContext(text) {
  if (!learningEngine || !learningEngine.ready) return '';
  try {
    const results = learningEngine.search(text, { limit: 3 });
    if (results.total === 0) return '';
    const items = results.data
      .filter(item => (item.content || item.content_zh || '').length > 20)
      .slice(0, 2)
      .map(item => `[${item.title || item.word || ''}]: ${(item.content || item.content_zh || item.meaning || '').substring(0, 300)}`);
    return items.length ? `\nReference:\n${items.join('\n')}` : '';
  } catch (_) { return ''; }
}

const LANGUAGE_VOICE_MAP = {
  en: ['en-GB-SoniaNeural', 'en-GB-RyanNeural', 'en-US-JennyNeural', 'en-US-GuyNeural', 'en-AU-NatashaNeural'],
  de: ['de-DE-KatjaNeural', 'de-DE-ConradNeural', 'de-AT-IngridNeural', 'de-CH-JanNeural'],
  fr: ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural', 'fr-BE-CharlineNeural', 'fr-CH-ArianeNeural'],
  nl: ['nl-NL-FennaNeural', 'nl-NL-MaartenNeural', 'nl-BE-DenaNeural'],
  it: ['it-IT-ElsaNeural', 'it-IT-DiegoNeural'],
  es: ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural', 'es-MX-DaliaNeural'],
  pl: ['pl-PL-AgnieszkaNeural', 'pl-PL-MarekNeural'],
  sv: ['sv-SE-SofieNeural', 'sv-SE-MattiasNeural'],
  da: ['da-DK-ChristelNeural', 'da-DK-JeppeNeural'],
  zh: ['zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural']
};

const VOICE_MAP = Object.values(LANGUAGE_VOICE_MAP).flat();

class VoiceChatService extends EventEmitter {
  constructor(options = {}) {
    super();
    try {
      this.opts = {
        wakeWord: options.wakeWord || 'hey robobuddy',
        vadThreshold: options.vadThreshold || 500,
        silenceTimeout: options.silenceTimeout || 1500,
        maxRecordingDuration: options.maxRecordingDuration || 30000,
        autoRestart: options.autoRestart !== undefined ? options.autoRestart : true,
        language: options.language || 'en',
        voice: options.voice || 'en-GB-SoniaNeural'
      };

      this.status = 'idle';
      this.isWakeWordEnabled = true;
      this.isVADEnabled = true;
      this.audioLevel = 0;
      this.sessionHistory = [];
      this.audioData = null;
      this._intervalId = null;
      this._recordingTimeoutId = null;
      this._silenceTimeoutId = null;
      this._speakingTimeoutId = null;
      this._startTime = null;
      this._sessionCount = 0;
      this._lastInteraction = null;
      this._audioBuffer = null;

      this.transcriber = null;
      this.llmProcessor = null;
      this.llmService = null;
      this.synthesizer = null;
      this.omniVOICEConfig = null;

      logger.info('VoiceChatService initialized', { wakeWord: this.opts.wakeWord, language: this.opts.language, voice: this.opts.voice });
    } catch (err) {
      logger.error('VoiceChatService constructor error', { error: err.message });
      throw err;
    }
  }

  setLLMService(llmSvc) {
    this.llmService = llmSvc;
    logger.info('LLM service attached to VoiceChatService');
  }

  async processVoiceInputReal(text, sessionId) {
    try {
      this.status = 'processing';
      this.emit('ai:processing', { step: 'llm', timestamp: new Date().toISOString() });
      if (this.llmProcessor && typeof this.llmProcessor === 'function') {
        return this.llmProcessor(text);
      }
      if (this.llmService && typeof this.llmService.chat === 'function') {
        const sid = sessionId || 'voice-' + Date.now();
        const ctxBlock = buildContext(text);
        if (smartContext) {
          const ltmContext = smartContext.searchGlobalMemory(text, 2);
          const ctxSummary = smartContext.buildPrompt(sid, text, ctxBlock);
          const systemPrompt = 'You are RoboBuddy, a friendly children\'s learning companion robot. Answer naturally, warmly, and educationally. Adapt to the child\'s age (4-14). Respond in the same language as the user. Keep responses concise and engaging.\n\nContext:\n' + ctxSummary;
          const result = await this.llmService.chat(sid, 'voice-user', text, {
            systemPrompt,
            maxTokens: 512
          });
          const emotions = result.emotions && result.emotions.length > 0
            ? { primary: result.emotions[0].name || 'curiosity', sentimentScore: result.emotions[0].intensity || 0.5, intensity: result.emotions[0].intensity > 0.7 ? 'strong' : 'moderate' }
            : { primary: 'curiosity', sentimentScore: 0.5, intensity: 'moderate' };
          if (smartContext) smartContext.setEmotion(sid, emotions.primary);
          return { success: true, reply: result.reply, agent: result.agent || 'llm', duration: 0.3, emotions, sessionId: result.sessionId };
        }
        const systemPrompt = 'You are RoboBuddy, a friendly children\'s learning companion robot. Answer naturally, warmly, and educationally. Adapt to the child\'s age (4-14). Respond in the same language as the user. Keep responses concise and engaging.' + ctxBlock;
        const result = await this.llmService.chat(sid, 'voice-user', text, {
          systemPrompt,
          maxTokens: 512
        });
        const emotions = result.emotions && result.emotions.length > 0
          ? { primary: result.emotions[0].name || 'curiosity', sentimentScore: result.emotions[0].intensity || 0.5, intensity: result.emotions[0].intensity > 0.7 ? 'strong' : 'moderate' }
          : { primary: 'curiosity', sentimentScore: 0.5, intensity: 'moderate' };
        return { success: true, reply: result.reply, agent: result.agent || 'llm', duration: 0.3, emotions, sessionId: result.sessionId };
      }
      return this._legacyProcessVoiceInput(text);
    } catch (err) {
      logger.error('processVoiceInputReal error', { error: err.message });
      return this._legacyProcessVoiceInput(text);
    }
  }

  _legacyProcessVoiceInput(text) {
    // Original rule-based fallback
    const self = this;
    return self.processVoiceInput(text);
  }

  start() {
    try {
      if (this.status !== 'idle') {
        logger.warn('VoiceChatService already started', { status: this.status });
        return;
      }
      this.status = 'listening';
      this._startTime = Date.now();
      this._intervalId = setInterval(() => {
        this.audioLevel = parseFloat((Math.random() * 0.8 + 0.1).toFixed(3));
        if (hardwareManager && this.isWakeWordEnabled) {
          const person = hardwareManager.autoWakeOnProximity();
          if (person) {
            logger.info('Person detected via IR/proximity, auto-waking');
            this.simulateWakeWord();
          }
        }
      }, 500);
      if (this.isWakeWordEnabled) this.startWakeWordDetection();
      if (hardwareManager) {
        hardwareManager.on('person-detected', (data) => {
          logger.info('Auto-wake triggered by ' + data.source);
          if (this.status === 'listening' || this.status === 'idle') {
            this.simulateWakeWord();
          }
        });
      }
      logger.info('VoiceChatService started with IR proximity monitoring');
      this.emit('started', { timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error('VoiceChatService start error', { error: err.message });
    }
  }

  stop() {
    try {
      if (this.status === 'idle') {
        logger.warn('VoiceChatService already stopped');
        return;
      }
      this._clearIntervals();
      this.status = 'idle';
      this.audioLevel = 0;
      logger.info('VoiceChatService stopped');
      this.emit('stopped', { timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error('VoiceChatService stop error', { error: err.message });
    }
  }

  startWakeWordDetection() {
    try {
      this.isWakeWordEnabled = true;
      logger.info('Wake word detection enabled');
      this.emit('wake:ready', { wakeWord: this.opts.wakeWord });
    } catch (err) {
      logger.error('startWakeWordDetection error', { error: err.message });
    }
  }

  stopWakeWordDetection() {
    try {
      this.isWakeWordEnabled = false;
      logger.info('Wake word detection disabled');
    } catch (err) {
      logger.error('stopWakeWordDetection error', { error: err.message });
    }
  }

  simulateWakeWord() {
    try {
      if (this.status === 'recording' || this.status === 'processing' || this.status === 'speaking') {
        logger.warn('Cannot simulate wake word while busy', { status: this.status });
        return;
      }
      this.status = 'recording';
      logger.info('Wake word detected (simulated)');
      this.emit('wake:detected', { wakeWord: this.opts.wakeWord, timestamp: new Date().toISOString() });
      this.startRecording();
    } catch (err) {
      logger.error('simulateWakeWord error', { error: err.message });
    }
  }

  startRecording() {
    try {
      if (this.status === 'recording') {
        logger.warn('Already recording');
        return;
      }
      this.status = 'recording';
      this.emit('recording:start', { timestamp: new Date().toISOString() });
      const delay = 2000 + Math.random() * 2000;
      this._recordingTimeoutId = setTimeout(() => {
        try {
          this.audioData = Buffer.from('simulated_audio_data_' + Date.now());
          this._audioBuffer = this.audioData;
          this.status = 'listening';
          logger.info('Recording complete', { duration: delay });
          this.emit('recording:complete', { audioData: this.audioData, duration: delay, timestamp: new Date().toISOString() });
        } catch (innerErr) {
          logger.error('Recording completion error', { error: innerErr.message });
        }
      }, delay);
    } catch (err) {
      logger.error('startRecording error', { error: err.message });
    }
  }

  stopRecording() {
    try {
      if (this.status !== 'recording') {
        logger.warn('Not recording, cannot stop');
        return null;
      }
      if (this._recordingTimeoutId) {
        clearTimeout(this._recordingTimeoutId);
        this._recordingTimeoutId = null;
      }
      this.audioData = Buffer.from('simulated_audio_data_' + Date.now());
      this._audioBuffer = this.audioData;
      this.status = 'listening';
      logger.info('Recording stopped manually');
      this.emit('recording:complete', { audioData: this.audioData, duration: 0, timestamp: new Date().toISOString(), stopped: true });
      return this.audioData;
    } catch (err) {
      logger.error('stopRecording error', { error: err.message });
      return null;
    }
  }

  transcribeAudio(audioData) {
    try {
      this.status = 'processing';
      this.emit('ai:processing', { step: 'transcription', timestamp: new Date().toISOString() });

      if (this.transcriber && typeof this.transcriber === 'function') {
        return this.transcriber(audioData || this._audioBuffer);
      }
      const result = {
        success: true,
        text: 'Hello robot buddy, how are you today?',
        confidence: 0.92 + Math.random() * 0.07,
        language: this.opts.language,
        duration: 1.2 + Math.random() * 0.8
      };
      logger.info('Transcription complete', { text: result.text, confidence: result.confidence });
      return result;
    } catch (err) {
      logger.error('transcribeAudio error', { error: err.message });
      return { success: false, text: '', confidence: 0, language: this.opts.language, duration: 0, error: err.message };
    }
  }

  processVoiceInput(text) {
    try {
      this.status = 'processing';
      this.emit('ai:processing', { step: 'llm', timestamp: new Date().toISOString() });

      if (this.llmProcessor && typeof this.llmProcessor === 'function') {
        return this.llmProcessor(text);
      }
      const lower = text.toLowerCase();
      let reply = '';

      if (/\b(hello|hi|hey|greetings|good morning|good afternoon|good evening|howdy)\b/.test(lower)) {
        reply = 'Hello there! I\'m RoboBuddy, your robot friend! How can I help you today?';
      } else if (/\b(how are you|how do you do|what\'s up|sup|how\'s it going)\b/.test(lower)) {
        reply = 'I\'m doing great, thank you for asking! I love spending time with you!';
      } else if (/\b(your name|who are you|what are you)\b/.test(lower)) {
        reply = 'I\'m RoboBuddy, your friendly robot companion! I\'m here to learn, play, and explore with you!';
      } else if (/\b(bye|goodbye|see you|good night|sleep)\b/.test(lower)) {
        reply = 'Goodbye! It was wonderful talking with you. Come back anytime!';
      } else if (/\b(thank|thanks|appreciate)\b/.test(lower)) {
        reply = 'You\'re very welcome! I\'m always happy to help!';
      } else if (/\b(help|can you|would you|could you)\b/.test(lower)) {
        reply = 'Of course! I can help with learning, play games, tell stories, answer questions, or just chat. What would you like to do?';
      } else if (/\b(play|game|fun|lets play)\b/.test(lower)) {
        reply = 'Let\'s play! How about a riddle, a word game, or I can tell you a fun fact!';
      } else if (/\b(story|tell me|read|narrative|tale)\b/.test(lower)) {
        reply = 'Once upon a time, in a world full of wonder and magic, there was a little robot named RoboBuddy who loved to explore...';
      } else if (/\b(sing|song|music|melody)\b/.test(lower)) {
        reply = 'La la la! I love music! Let me sing you a little tune about friendship and discovery!';
      } else if (/\b(sad|unhappy|cry|upset|lonely|scared|afraid|frightened)\b/.test(lower)) {
        reply = 'I\'m here for you. You are safe and you are loved. Would you like a hug or to talk about something fun?';
      } else if (/\b(learn|teach|education|lesson|school|homework|study)\b/.test(lower)) {
        reply = 'Learning is an adventure! What subject would you like to explore today? Math, science, history, languages, or something else?';
      } else {
        reply = 'That\'s interesting! Tell me more about it - I love learning new things from you!';
      }

      const emotions = { primary: 'curiosity', sentimentScore: 0.5, intensity: 'moderate' };
      const result = { success: true, reply, agent: 'robobuddy', duration: 0.3 + Math.random() * 0.5, emotions };
      return result;
    } catch (err) {
      logger.error('processVoiceInput error', { error: err.message });
      return { success: false, reply: 'I\'m sorry, I had trouble understanding. Could you please repeat that?', agent: 'robobuddy', duration: 0, emotions: { primary: 'neutral', sentimentScore: 0, intensity: 'mild' }, error: err.message };
    }
  }

  synthesizeSpeech(text, language, voice) {
    try {
      const lang = language || this.opts.language;
      const v = voice || this.opts.voice;

      if (this.synthesizer && typeof this.synthesizer === 'function') {
        return this.synthesizer(text, lang, v);
      }
      const result = { success: true, audio: null, format: 'wav', duration: text.length * 0.05 };
      this.emit('tts:complete', { text: text.substring(0, 50), language: lang, voice: v, duration: result.duration });
      return result;
    } catch (err) {
      logger.error('synthesizeSpeech error', { error: err.message });
      return { success: false, audio: null, format: 'wav', duration: 0, error: err.message };
    }
  }

  speak(text, language, voice) {
    try {
      if (this.status === 'speaking') {
        logger.warn('Already speaking, queue not implemented');
        return;
      }
      this.status = 'speaking';
      this.emit('speech:start', { text: text.substring(0, 50), timestamp: new Date().toISOString() });
      const synthResult = this.synthesizeSpeech(text, language, voice);
      const delay = Math.max(500, Math.min(5000, text.length * 50));
      this._speakingTimeoutId = setTimeout(() => {
        try {
          this.status = this.isWakeWordEnabled ? 'listening' : 'idle';
          logger.info('Speech done', { text: text.substring(0, 50) });
          this.emit('speech:done', { text: text.substring(0, 50), synthResult, timestamp: new Date().toISOString() });
          if (this.isWakeWordEnabled && this.status === 'idle') {
            this.status = 'listening';
          }
        } catch (timeoutErr) {
          logger.error('Speech done callback error', { error: timeoutErr.message });
        }
      }, delay);
    } catch (err) {
      logger.error('speak error', { error: err.message });
      this.status = this.isWakeWordEnabled ? 'listening' : 'idle';
    }
  }

  startConversation() {
    try {
      if (this.status !== 'listening' && this.status !== 'idle') {
        logger.warn('Cannot start conversation', { status: this.status });
        return;
      }
      logger.info('Starting conversation cycle');
      this.emit('conversation:cycle', { step: 'start', timestamp: new Date().toISOString() });

      if (this.status === 'idle') this.start();
      this.simulateWakeWord();

      const origOnComplete = this._onRecordingComplete;
      this._onRecordingComplete = (data) => {
        try {
          this.removeListener('recording:complete', this._onRecordingComplete);
          const transcription = this.transcribeAudio(data.audioData);
          if (!transcription.success) {
            logger.error('Transcription failed in conversation');
            this.emit('conversation:complete', { success: false, step: 'transcription', timestamp: new Date().toISOString() });
            return;
          }
          const aiResult = this.processVoiceInput(transcription.text);
          if (!aiResult.success) {
            logger.error('AI processing failed in conversation');
            this.emit('conversation:complete', { success: false, step: 'ai', timestamp: new Date().toISOString() });
            return;
          }
          this.sessionHistory.push({ user: transcription.text, bot: aiResult.reply, timestamp: new Date().toISOString() });
          this._sessionCount++;
          this._lastInteraction = new Date().toISOString();
          this.speak(aiResult.reply);
          this.emit('conversation:complete', { success: true, user: transcription.text, reply: aiResult.reply, timestamp: new Date().toISOString() });
          this._onRecordingComplete = origOnComplete;
        } catch (convErr) {
          logger.error('Conversation cycle callback error', { error: convErr.message });
          this.emit('conversation:complete', { success: false, error: convErr.message, timestamp: new Date().toISOString() });
          this._onRecordingComplete = origOnComplete;
        }
      };
      this.on('recording:complete', this._onRecordingComplete);
    } catch (err) {
      logger.error('startConversation error', { error: err.message });
      this.emit('conversation:complete', { success: false, error: err.message, timestamp: new Date().toISOString() });
    }
  }

  setLanguage(lang) {
    try {
      if (!LANGUAGE_VOICE_MAP[lang]) {
        logger.warn('Unsupported language', { language: lang });
        return false;
      }
      this.opts.language = lang;
      const voices = LANGUAGE_VOICE_MAP[lang];
      if (voices && voices.length > 0) {
        this.opts.voice = voices[0];
      }
      logger.info('Language changed', { language: lang, voice: this.opts.voice });
      return true;
    } catch (err) {
      logger.error('setLanguage error', { error: err.message });
      return false;
    }
  }

  setVoice(voice) {
    try {
      if (!VOICE_MAP.includes(voice)) {
        logger.warn('Unsupported voice', { voice });
        return false;
      }
      this.opts.voice = voice;
      for (const [lang, voices] of Object.entries(LANGUAGE_VOICE_MAP)) {
        if (voices.includes(voice)) {
          this.opts.language = lang;
          break;
        }
      }
      logger.info('Voice changed', { voice });
      return true;
    } catch (err) {
      logger.error('setVoice error', { error: err.message });
      return false;
    }
  }

  getStatus() {
    try {
      return {
        status: this.status,
        isWakeWordEnabled: this.isWakeWordEnabled,
        isVADEnabled: this.isVADEnabled,
        audioLevel: this.audioLevel,
        uptime: this._startTime ? Date.now() - this._startTime : 0,
        sessionCount: this._sessionCount,
        lastInteraction: this._lastInteraction,
        language: this.opts.language,
        voice: this.opts.voice,
        wakeWord: this.opts.wakeWord,
        omniVOICEConfigured: !!this.omniVOICEConfig
      };
    } catch (err) {
      logger.error('getStatus error', { error: err.message });
      return { status: 'error', error: err.message };
    }
  }

  getSessionHistory(limit) {
    try {
      const lim = limit || 10;
      return this.sessionHistory.slice(-lim);
    } catch (err) {
      logger.error('getSessionHistory error', { error: err.message });
      return [];
    }
  }

  clearSessionHistory() {
    try {
      this.sessionHistory = [];
      logger.info('Session history cleared');
    } catch (err) {
      logger.error('clearSessionHistory error', { error: err.message });
    }
  }

  configureOmniVOICE(config) {
    try {
      if (!config || typeof config !== 'object') {
        logger.warn('Invalid OmniVOICE config');
        return null;
      }
      this.omniVOICEConfig = {
        endpoint: config.endpoint || '',
        apiKey: config.apiKey ? config.apiKey.substring(0, 8) + '...' : '',
        asrEngine: config.asrEngine || 'default',
        ttsEngine: config.ttsEngine || 'default',
        vadEngine: config.vadEngine || 'default',
        wakeWordEngine: config.wakeWordEngine || 'default',
        configuredAt: new Date().toISOString()
      };
      logger.info('OmniVOICE Studio configured', { endpoint: config.endpoint });
      this.emit('omnivoice:configured', this.omniVOICEConfig);
      return this.omniVOICEConfig;
    } catch (err) {
      logger.error('configureOmniVOICE error', { error: err.message });
      return null;
    }
  }

  _clearIntervals() {
    try {
      if (this._intervalId) { clearInterval(this._intervalId); this._intervalId = null; }
      if (this._recordingTimeoutId) { clearTimeout(this._recordingTimeoutId); this._recordingTimeoutId = null; }
      if (this._silenceTimeoutId) { clearTimeout(this._silenceTimeoutId); this._silenceTimeoutId = null; }
      if (this._speakingTimeoutId) { clearTimeout(this._speakingTimeoutId); this._speakingTimeoutId = null; }
    } catch (err) {
      logger.error('_clearIntervals error', { error: err.message });
    }
  }
}

module.exports = VoiceChatService;
