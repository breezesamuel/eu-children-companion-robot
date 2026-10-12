const logger = require('../utils/logger');

const VOICE_MAP = {
  'en': { lang: 'en', voice: 'en-US-JennyNeural', gender: 'Female', desc: 'English (US) - Jenny' },
  'en-gb': { lang: 'en', voice: 'en-GB-SoniaNeural', gender: 'Female', desc: 'English (UK) - Sonia' },
  'zh': { lang: 'zh', voice: 'zh-CN-XiaoxiaoNeural', gender: 'Female', desc: 'Chinese - Xiaoxiao' },
  'fr': { lang: 'fr', voice: 'fr-FR-DeniseNeural', gender: 'Female', desc: 'French - Denise' },
  'de': { lang: 'de', voice: 'de-DE-KatjaNeural', gender: 'Female', desc: 'German - Katja' },
  'es': { lang: 'es', voice: 'es-ES-ElviraNeural', gender: 'Female', desc: 'Spanish - Elvira' },
  'it': { lang: 'it', voice: 'it-IT-ElsaNeural', gender: 'Female', desc: 'Italian - Elsa' },
  'pt': { lang: 'pt', voice: 'pt-BR-FranciscaNeural', gender: 'Female', desc: 'Portuguese - Francisca' },
  'nl': { lang: 'nl', voice: 'nl-NL-ColetteNeural', gender: 'Female', desc: 'Dutch - Colette' },
  'pl': { lang: 'pl', voice: 'pl-PL-AgnieszkaNeural', gender: 'Female', desc: 'Polish - Agnieszka' },
  'sv': { lang: 'sv', voice: 'sv-SE-SofieNeural', gender: 'Female', desc: 'Swedish - Sofie' },
  'da': { lang: 'da', voice: 'da-DK-ChristelNeural', gender: 'Female', desc: 'Danish - Christel' },
  'fi': { lang: 'fi', voice: 'fi-FI-SelmaNeural', gender: 'Female', desc: 'Finnish - Selma' },
  'nb': { lang: 'nb', voice: 'nb-NO-PernilleNeural', gender: 'Female', desc: 'Norwegian - Pernille' },
  'cs': { lang: 'cs', voice: 'cs-CZ-VlastaNeural', gender: 'Female', desc: 'Czech - Vlasta' },
  'ro': { lang: 'ro', voice: 'ro-RO-AlinaNeural', gender: 'Female', desc: 'Romanian - Alina' },
  'hu': { lang: 'hu', voice: 'hu-HU-NoemiNeural', gender: 'Female', desc: 'Hungarian - Noemi' },
  'el': { lang: 'el', voice: 'el-GR-AthinaNeural', gender: 'Female', desc: 'Greek - Athina' },
  'children-en': { lang: 'en', voice: 'en-US-JennyMultilingualNeural', gender: 'Female', desc: 'English Child-friendly' }
};

const { loadEngine } = require('./tts_engines');

let _engine;   // undefined = not yet resolved, null = no permissive engine available
function _getEngine() {
  if (process.env.NODE_ENV === 'test') return null;
  if (_engine === undefined) _engine = loadEngine();
  return _engine;
}

class TTSService {
  constructor() {
    this.engine = _getEngine();
    this.isAvailable = !!this.engine;
    this.engineName = this.engine ? this.engine.name : 'none';
    this.currentVoice = 'en';
    this.speechRate = 0;
    this.speechPitch = 0;
    this.speechHistory = [];
    this.maxHistory = 100;
    logger.info(`TTS service: ${this.isAvailable ? `AVAILABLE (${this.engineName})` : 'UNAVAILABLE (no permissive engine)'}`);
  }

  async speak(text, options = {}) {
    if (!this.isAvailable) {
      logger.warn('TTS unavailable - cannot speak', { text: text.substring(0, 50) });
      return { success: false, error: 'TTS not available', simulated: true };
    }

    const opts = options || {};
    const lang = opts.lang || this.currentVoice;
    const voiceCfg = VOICE_MAP[lang] || VOICE_MAP['en'];
    const rate = opts.rate !== undefined ? opts.rate : this.speechRate;
    const pitch = opts.pitch !== undefined ? opts.pitch : this.speechPitch;

    try {
      const audioBuffer = await this.engine.synthesize(text, {
        voice: voiceCfg.voice,
        rate,
        pitch
      });

      const base64 = audioBuffer.toString('base64');
      const entry = {
        id: `tts_${Date.now()}`,
        text: text.substring(0, 200),
        lang,
        voice: voiceCfg.voice,
        timestamp: new Date().toISOString(),
        size: audioBuffer.length,
        audioBase64: base64
      };
      this.speechHistory.unshift(entry);
      if (this.speechHistory.length > this.maxHistory) this.speechHistory.pop();

      logger.info('TTS synthesized', { text: text.substring(0, 50), lang, size: audioBuffer.length });
      return { success: true, audio: base64, size: audioBuffer.length, entry };
    } catch (err) {
      logger.error('TTS synthesis failed', { error: err.message, text: text.substring(0, 50) });
      return { success: false, error: err.message };
    }
  }

  async speakToStream(text, options = {}) {
    if (!this.isAvailable) {
      return { success: false, error: 'TTS not available', simulated: true };
    }
    const lang = options.lang || this.currentVoice;
    const voiceCfg = VOICE_MAP[lang] || VOICE_MAP['en'];
    const rate = options.rate !== undefined ? options.rate : this.speechRate;
    const pitch = options.pitch !== undefined ? options.pitch : this.speechPitch;

    try {
      const audioBuffer = await this.engine.synthesize(text, {
        voice: voiceCfg.voice,
        rate,
        pitch
      });
      return { success: true, audio: audioBuffer.toString('base64'), size: audioBuffer.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  setVoice(lang) {
    if (VOICE_MAP[lang]) {
      this.currentVoice = lang;
      return true;
    }
    return false;
  }

  setRate(rate) { this.speechRate = Math.max(-50, Math.min(50, rate)); }
  setPitch(pitch) { this.speechPitch = Math.max(-50, Math.min(50, pitch)); }

  getVoices() { return VOICE_MAP; }
  getHistory(limit = 20) { return this.speechHistory.slice(0, limit); }
  getStatus() {
    return {
      available: this.isAvailable,
      engine: this.isAvailable ? `${this.engineName} (${this.engine.license})` : 'none',
      currentVoice: this.currentVoice,
      voice: VOICE_MAP[this.currentVoice],
      rate: this.speechRate,
      pitch: this.speechPitch,
      historyCount: this.speechHistory.length
    };
  }
}

module.exports = new TTSService();
