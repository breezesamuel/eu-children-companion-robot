const logger = require('../utils/logger');
const registry = require('./registry');

class VoicePipeline {
  constructor() {
    this.asrEngine = null;
    this.ttsEngine = null;
    this.wakeWordEngine = null;
    this.vadEngine = null;
    this.isListening = false;
    this.voiceProfiles = new Map();
    this.vadConfig = { threshold: 500, silenceChunks: 30, minFrames: 20 };
    this.customVocab = [];
    this.audioStreams = new Map();
    this._initEngines();
  }

  _initEngines() {
    registry.registerIntegration('voice-funasr', { name: 'FunASR', type: 'voice', description: 'Alibaba speech recognition', needsKey: false, enabled: true, category: 'voice/asr' }, this);
    registry.registerIntegration('voice-moss-tts', { name: 'MossTTS', type: 'voice', description: 'Chinese TTS engine', needsKey: false, enabled: true, category: 'voice/tts' }, this);
    registry.registerIntegration('voice-sherpa-onnx', { name: 'SherpaONNX', type: 'voice', description: 'ONNX voice pipeline', needsKey: false, enabled: true, category: 'voice/pipeline' }, this);
    registry.registerIntegration('voice-whisper', { name: 'OpenAI Whisper', type: 'voice', description: 'Cloud-based transcription', needsKey: true, apiKey: process.env.OPENAI_API_KEY, enabled: !!process.env.OPENAI_API_KEY, category: 'voice/asr' }, this);
    registry.registerIntegration('voice-tts-openai', { name: 'OpenAI TTS', type: 'voice', description: 'Cloud-based speech synthesis', needsKey: true, apiKey: process.env.OPENAI_API_KEY, enabled: !!process.env.OPENAI_API_KEY, category: 'voice/tts' }, this);

    registry.registerTool('voice:transcribe', { name: 'Transcribe Audio', description: 'Convert speech to text' }, async (p) => this.transcribe(p.audio, p.options));
    registry.registerTool('voice:synthesize', { name: 'Synthesize Speech', description: 'Convert text to speech' }, async (p) => this.synthesize(p.text, p.options));
    registry.registerTool('voice:detect-language', { name: 'Detect Language', description: 'Detect language from audio' }, async (p) => this.detectLanguage(p.audio));
    registry.registerTool('voice:stream-transcribe', { name: 'Stream Transcribe', description: 'Real-time streaming transcription' }, async (p) => this.streamTranscribe(p.audioStream, p.onChunk, p.options));
    // Skip tool registration for non-JSON-serializable functions like registeredVoices, startListening, etc.
  }

  setVADConfig(config) {
    Object.assign(this.vadConfig, config);
  }

  getVADConfig() {
    return { ...this.vadConfig };
  }

  addCustomVocabulary(words) {
    if (Array.isArray(words)) {
      this.customVocab.push(...words);
    } else {
      this.customVocab.push(words);
    }
    return this.customVocab.length;
  }

  clearCustomVocabulary() {
    this.customVocab = [];
  }

  async transcribe(audioBuffer, options = {}) {
    const llmHub = require('./llm-hub');
    const lang = options.language || 'zh';
    try {
      const result = await llmHub.transcribe(audioBuffer, {
        ...options,
        language: lang,
        prompt: this.customVocab.length > 0 ? 'Custom terms: ' + this.customVocab.join(', ') : undefined
      });
      registry.emit('voice:transcribed', { length: audioBuffer.length, language: lang });
      return result;
    } catch (e) {
      logger.warn('Cloud transcription failed, using fallback', { error: e.message });
      return this._localTranscribe(audioBuffer);
    }
  }

  async streamTranscribe(audioStream, onChunk, options = {}) {
    const streamId = `stream_${Date.now()}`;
    this.audioStreams.set(streamId, { chunks: [], active: true });

    const processChunk = async (chunk) => {
      if (!this.audioStreams.get(streamId)?.active) return;
      try {
        const text = await this.transcribe(chunk, { ...options, language: options.language || 'zh' });
        if (text && !text.startsWith('[') && onChunk) {
          onChunk({ text, timestamp: new Date().toISOString(), streamId });
        }
      } catch (e) {
        logger.warn('Stream transcribe chunk error', { error: e.message });
      }
    };

    const listener = async (data) => {
      if (data.streamId === streamId) {
        await processChunk(data.chunk);
      }
    };

    return { streamId, stop: () => { this.audioStreams.set(streamId, { ...this.audioStreams.get(streamId), active: false }); }, listener };
  }

  async detectLanguage(audioBuffer) {
    const llmHub = require('./llm-hub');
    try {
      const text = await llmHub.transcribe(audioBuffer, { language: null });
      if (text && !text.startsWith('[')) {
        const langDetect = {
          'zh': 'zh-CN', 'en': 'en-US', 'ja': 'ja-JP',
          'ko': 'ko-KR', 'fr': 'fr-FR', 'de': 'de-DE',
          'es': 'es-ES', 'it': 'it-IT', 'pt': 'pt-PT',
          'ru': 'ru-RU', 'ar': 'ar-SA'
        };
        return { text, detectedLanguage: text.match(/[\u4e00-\u9fff]/) ? 'zh-CN' : 'en-US' };
      }
    } catch (e) { /* ignore */ }
    return { text: '', detectedLanguage: 'unknown' };
  }

  async synthesize(text, options = {}) {
    const llmHub = require('./llm-hub');
    const voice = options.voice || 'alloy';
    const lang = options.language || 'zh';
    try {
      let result;
      if (options.ssml) {
        result = await llmHub.tts(text, { ...options, voice, responseFormat: 'wav' });
      } else if (lang === 'zh') {
        result = await this._localSynthesize(text, options);
        if (!result) {
          result = await llmHub.tts(text, { ...options, voice, responseFormat: 'wav' });
        }
      } else {
        result = await llmHub.tts(text, { ...options, voice, responseFormat: 'wav' });
      }
      registry.emit('voice:synthesized', { textLength: text.length, voice });
      return result;
    } catch (e) {
      logger.warn('Cloud TTS failed, using fallback', { error: e.message });
      return this._localSynthesize(text);
    }
  }

  async synthesizeSSML(ssml, options = {}) {
    return this.synthesize(ssml, { ...options, ssml: true });
  }

  async detectEmotion(audioBuffer) {
    try {
      const llmHub = require('./llm-hub');
      const text = await llmHub.transcribe(audioBuffer, { language: 'zh' });
      if (!text || text.startsWith('[')) return { emotion: 'neutral', confidence: 0 };

      const analysis = await llmHub.chat([
        { role: 'system', content: 'Analyze the emotional tone of this speech transcription. Respond with JSON: {"emotion": "happy|sad|angry|neutral|excited|worried|calm", "confidence": 0.0-1.0, "reason": "brief reason"}' },
        { role: 'user', content: text }
      ], { model: 'gpt-4o-mini' });

      try {
        return JSON.parse(analysis);
      } catch (e) {
        return { emotion: 'neutral', confidence: 0.5, text };
      }
    } catch (e) {
      return { emotion: 'neutral', confidence: 0 };
    }
  }

  parseVoiceCommand(text) {
    const commands = {
      '开机': 'power_on', '关机': 'power_off', '重启': 'reboot',
      '暂停': 'pause', '继续': 'resume', '停止': 'stop',
      '开始': 'start', '结束': 'end', '取消': 'cancel',
      '确认': 'confirm', '拒绝': 'reject', '返回': 'back',
      '主页': 'home', '设置': 'settings', '帮助': 'help',
      '播放': 'play', '暂停音乐': 'pause_music', '下一首': 'next_track',
      '上一首': 'prev_track', '大声点': 'volume_up', '小声点': 'volume_down',
      '拍照': 'take_photo', '录像': 'start_recording',
      '讲故事': 'tell_story', '唱歌': 'sing_song', '跳舞': 'dance',
      '打电话': 'make_call', '发消息': 'send_message',
      '打开灯': 'light_on', '关灯': 'light_off',
      '今天天气': 'weather_today', '几点了': 'what_time',
      '翻译': 'translate', '这是什么': 'what_is_this',
      '你好': 'greet', '再见': 'goodbye', '谢谢': 'thank_you'
    };

    const lower = text.toLowerCase();
    for (const [phrase, intent] of Object.entries(commands)) {
      if (lower.includes(phrase.toLowerCase())) {
        return { command: intent, matched: phrase, original: text };
      }
    }
    return { command: 'unknown', original: text };
  }

  registerVoiceProfile(name, profileData) {
    const id = `vp_${Date.now()}`;
    this.voiceProfiles.set(id, {
      id, name, profileData,
      registeredAt: new Date().toISOString(),
      lastUsed: null
    });
    return id;
  }

  getVoiceProfiles() {
    return Array.from(this.voiceProfiles.values()).map(p => ({
      id: p.id, name: p.name,
      registeredAt: p.registeredAt, lastUsed: p.lastUsed
    }));
  }

  deleteVoiceProfile(id) {
    return this.voiceProfiles.delete(id);
  }

  async performDiarization(audioBuffer, numSpeakers) {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const tmpFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_diar_${Date.now()}.wav`;
      fs.writeFileSync(tmpFile, audioBuffer);

      try {
        const result = execSync(`python -c "
import sys
sys.path.insert(0, '${__dirname}')
from pyannote.audio import Pipeline
pipeline = Pipeline.from_pretrained('pyannote/speaker-diarization')
diarization = pipeline('${tmpFile}')
for segment, _, speaker in diarization.itertracks(yield_label=True):
    print(f'{segment.start:.1f}\\t{segment.end:.1f}\\t{speaker}')
"`, { timeout: 60000, encoding: 'utf-8' });
        fs.unlinkSync(tmpFile);
        const segments = result.trim().split('\n').filter(l => l).map(l => {
          const parts = l.split('\t');
          return { start: parseFloat(parts[0]), end: parseFloat(parts[1]), speaker: parts[2] };
        });
        return { segments, numSpeakers: new Set(segments.map(s => s.speaker)).size };
      } catch (e) {
        fs.unlinkSync(tmpFile);
        return { error: 'Diarization not available', detail: e.message };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  async assessPronunciation(audioBuffer, referenceText) {
    try {
      const llmHub = require('./llm-hub');
      const transcription = await llmHub.transcribe(audioBuffer, { language: 'zh' });
      if (!transcription || transcription.startsWith('[')) {
        return { score: 0, transcription, error: 'Transcription failed' };
      }

      const analysis = await llmHub.chat([
        { role: 'system', content: 'Compare the transcribed text with the reference text. Rate pronunciation accuracy from 0-100. Respond with JSON: {"score": 0-100, "accuracy": "high|medium|low", "issues": ["issue1", "issue2"]}' },
        { role: 'user', content: `Reference: "${referenceText}"\nTranscribed: "${transcription}"` }
      ], { model: 'gpt-4o-mini' });

      try {
        return { ...JSON.parse(analysis), transcription, reference: referenceText };
      } catch (e) {
        return { score: 50, transcription, reference: referenceText, error: 'Analysis parse failed' };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  async noiseSuppression(audioBuffer) {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const inputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_noise_in_${Date.now()}.wav`;
      const outputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_noise_out_${Date.now()}.wav`;
      fs.writeFileSync(inputFile, audioBuffer);

      try {
        execSync(`python -c "
import noisereduce as nr
import soundfile as sf
import numpy as np
data, sr = sf.read('${inputFile}')
reduced = nr.reduce_noise(y=data, sr=sr, prop_decrease=0.8)
sf.write('${outputFile}', reduced, sr)
"`, { timeout: 30000, encoding: 'utf-8' });
        const cleaned = fs.readFileSync(outputFile);
        fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFile);
        return cleaned;
      } catch (e) {
        fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        return audioBuffer;
      }
    } catch (e) {
      return audioBuffer;
    }
  }

  convertAudioFormat(audioBuffer, targetFormat, options = {}) {
    const fs = require('fs');
    const inputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_conv_in_${Date.now()}.wav`;
    const outputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_conv_out_${Date.now()}.${targetFormat}`;
    fs.writeFileSync(inputFile, audioBuffer);

    try {
      const { execSync } = require('child_process');
      const sampleRate = options.sampleRate || 16000;
      const channels = options.channels || 1;
      const bitRate = options.bitRate || '128k';
      let cmd;
      switch (targetFormat) {
        case 'mp3':
          cmd = `ffmpeg -y -i "${inputFile}" -ar ${sampleRate} -ac ${channels} -b:a ${bitRate} "${outputFile}"`;
          break;
        case 'wav':
          cmd = `ffmpeg -y -i "${inputFile}" -ar ${sampleRate} -ac ${channels} "${outputFile}"`;
          break;
        case 'ogg':
          cmd = `ffmpeg -y -i "${inputFile}" -ar ${sampleRate} -ac ${channels} -c:a libvorbis "${outputFile}"`;
          break;
        case 'flac':
          cmd = `ffmpeg -y -i "${inputFile}" -ar ${sampleRate} -ac ${channels} "${outputFile}"`;
          break;
        default:
          throw new Error(`Unsupported format: ${targetFormat}`);
      }
      execSync(cmd, { timeout: 30000 });
      const converted = fs.readFileSync(outputFile);
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      return converted;
    } catch (e) {
      fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      return audioBuffer;
    }
  }

  normalizeAudioLevel(audioBuffer, targetLevel = -16) {
    const fs = require('fs');
    const inputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_norm_in_${Date.now()}.wav`;
    const outputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_norm_out_${Date.now()}.wav`;
    fs.writeFileSync(inputFile, audioBuffer);

    try {
      const { execSync } = require('child_process');
      execSync(`ffmpeg -y -i "${inputFile}" -af loudnorm=I=${targetLevel}:LRA=7:TP=-1 "${outputFile}"`, { timeout: 30000 });
      const normalized = fs.readFileSync(outputFile);
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      return normalized;
    } catch (e) {
      fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      return audioBuffer;
    }
  }

  async detectWakeWord(audioBuffer) {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const tmpFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_wake_${Date.now()}.wav`;
      fs.writeFileSync(tmpFile, audioBuffer);

      try {
        const result = execSync(`python -c "import porcupine; p = porcupine.create(keywords=['hey robobuddy']); print(p.process_file('${tmpFile}'))"`, {
          timeout: 10000, encoding: 'utf-8', cwd: 'F:\\2026\\欧洲儿童陪护机器人\\project_source'
        });
        fs.unlinkSync(tmpFile);
        return result.trim() === 'True';
      } catch (e) {
        fs.unlinkSync(tmpFile);
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  async startListening(callback) {
    this.isListening = true;
    logger.info('Voice listening started');
    try {
      const { spawn } = require('child_process');
      const proc = spawn('python', ['-c', `
import pyaudio, wave, sys, json, time
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
VAD_THRESHOLD = ${this.vadConfig.threshold}
SILENCE_CHUNKS = ${this.vadConfig.silenceChunks}
MIN_FRAMES = ${this.vadConfig.minFrames}
p = pyaudio.PyAudio()
stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
print('{"status":"listening"}', flush=True)
frames = []
silent_chunks = 0
total_chunks = 0
while total_chunks < 200:
    data = stream.read(CHUNK, exception_on_overflow=False)
    frames.append(data)
    max_val = max(abs(int.from_bytes(data[i:i+2], 'little', signed=True)) for i in range(0, len(data), 2))
    if max_val < VAD_THRESHOLD:
        silent_chunks += 1
    else:
        silent_chunks = 0
    if silent_chunks > SILENCE_CHUNKS and len(frames) > MIN_FRAMES:
        break
    total_chunks += 1
stream.stop_stream()
stream.close()
p.terminate()
wf = wave.open(sys.argv[1], 'wb')
wf.setnchannels(CHANNELS)
wf.setsampwidth(p.get_sample_size(FORMAT))
wf.setframerate(RATE)
wf.writeframes(b''.join(frames))
wf.close()
print('{"done":true,"frames":' + str(len(frames)) + ',"duration":' + str(len(frames) * CHUNK / RATE) + '}', flush=True)
      `], { cwd: 'F:\\2026\\欧洲儿童陪护机器人\\project_source' });

      proc.stdout.on('data', async (data) => {
        try {
          const parsed = JSON.parse(data.toString().trim());
          if (parsed.done && callback) {
            const fs = require('fs');
            const audioFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_voice_${Date.now()}.wav`;
            if (fs.existsSync(audioFile)) {
              const audio = fs.readFileSync(audioFile);
              const text = await this.transcribe(audio);
              const command = this.parseVoiceCommand(text);
              const emotion = await this.detectEmotion(audio);
              callback({ text, audio, command, emotion });
              fs.unlinkSync(audioFile);
            }
          }
        } catch (e) { /* ignore JSON parse errors */ }
      });

      proc.on('exit', () => { this.isListening = false; });
    } catch (e) {
      logger.error('Voice listening start failed', { error: e.message });
      this.isListening = false;
    }
  }

  stopListening() {
    this.isListening = false;
  }

  async streamToWebSocket(wsUrl, audioBuffer) {
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);
    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(audioBuffer);
        ws.close();
        resolve({ sent: true, size: audioBuffer.length });
      });
      ws.on('error', (e) => reject(e));
    });
  }

  _localTranscribe(audioBuffer) {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const tmpFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_audio_${Date.now()}.wav`;
      fs.writeFileSync(tmpFile, audioBuffer);
      try {
        const result = execSync(`python -c "import funasr; pipeline = funasr.AutoModel(model='paraformer-zh'); print(pipeline.generate('${tmpFile}')[0]['text'])"`, {
          timeout: 30000, encoding: 'utf-8', cwd: 'F:\\2026\\欧洲儿童陪护机器人\\project_source'
        });
        fs.unlinkSync(tmpFile);
        return result.trim() || '[语音识别未返回结果]';
      } catch (e) {
        fs.unlinkSync(tmpFile);
        return '[语音识别: FunASR未安装，请配置OpenAI API Key使用云端服务]';
      }
    } catch (e) {
      return '[语音识别引擎不可用]';
    }
  }

  _localSynthesize(text, options = {}) {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const outputFile = `F:\\2026\\欧洲儿童陪护机器人\\project_source\\tmp_tts_${Date.now()}.wav`;

      try {
        execSync(`python -c "from moss_tts import TTS; tts = TTS(); tts.tts('${text.replace(/'/g, "\\'")}', '${outputFile}')"`, {
          timeout: 30000, encoding: 'utf-8', cwd: 'F:\\2026\\欧洲儿童陪护机器人\\project_source'
        });
        const audio = fs.readFileSync(outputFile);
        fs.unlinkSync(outputFile);
        return audio;
      } catch (e) {
        fs.unlinkSync(outputFile);
        return null;
      }
    } catch (e) {
      return null;
    }
  }
}

module.exports = new VoicePipeline();
