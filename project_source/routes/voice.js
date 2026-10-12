const express = require('express');
const router = express.Router();
const VoiceChatService = require('../services/voice-chat');
const llm = require('../services/llm-service');
const orchestrator = require('../agents/orchestrator');
const tts = require('../services/tts');
const stt = require('../services/speech-to-text');
const logger = require('../utils/logger');

const voice = new VoiceChatService();
voice.setLLMService(llm);

const ttsCache = new Map();
const voiceProfiles = new Map();
const voiceCommands = new Map();
const voiceSessions = new Map();
const audioFiles = new Map();

router.post('/chat', async (req, res) => {
  try {
    const { message, language, history, userId, gradeLevel } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message required' });
    const uid = userId || 'voice-user-' + Date.now();
    const lang = language || 'en';
    const aiResult = await orchestrator.handleMessage(uid, message, 'voice-session', null, gradeLevel);
    const reply = aiResult.reply || 'I heard you but I\'m not sure what to say.';
    let audioBase64 = null;
    try {
      const langKey = lang.split('-')[0].toLowerCase();
      const ttsResult = await tts.speak(reply, { lang: langKey });
      if (ttsResult.success && ttsResult.audio) {
        audioBase64 = ttsResult.audio;
      }
    } catch (ttsErr) {
      logger.warn('TTS generation failed for voice chat', { error: ttsErr.message });
    }
    res.json({
      success: true,
      reply,
      audio: audioBase64,
      agent: aiResult.agent || 'general',
      emotions: aiResult.emotions || { primary: 'neutral' },
      language: lang
    });
  } catch (err) {
    logger.error('Voice chat error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/start', (req, res) => {
  try {
    voice.start();
    res.json({ success: true, data: { status: voice.getStatus() } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stop', (req, res) => {
  try {
    voice.stop();
    res.json({ success: true, data: { status: voice.getStatus() } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/transcribe', async (req, res) => {
  try {
    const { audio, provider, language } = req.body;
    if (!audio) return res.status(400).json({ success: false, error: 'audio data required' });
    const result = await voice.transcribeAudio(audio, { provider, language });
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/process', async (req, res) => {
  try {
    const { text, sessionId, useLLM } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text required' });
    let result;
    if (useLLM !== false) {
      result = await voice.processVoiceInputReal(text, sessionId);
    } else {
      result = await voice.processVoiceInput(text);
    }
    if (sessionId) result.sessionId = sessionId;
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/speak', async (req, res) => {
  try {
    const { text, language, voice: voiceName } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text required' });
    const result = await voice.speak(text, language, voiceName);
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/synthesize', async (req, res) => {
  try {
    const { text, language, voice: voiceName, rate, pitch } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text required' });
    const result = await voice.synthesizeSpeech(text, language, voiceName, { rate, pitch });
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/wake', (req, res) => {
  try {
    voice.simulateWakeWord();
    res.json({ success: true, data: { message: 'Wake word detected, recording...' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/conversation', async (req, res) => {
  try {
    const result = await voice.startConversation();
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/language', (req, res) => {
  try {
    const { language } = req.body;
    if (!language) return res.status(400).json({ success: false, error: 'language required' });
    voice.setLanguage(language);
    res.json({ success: true, data: { language } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/voice', (req, res) => {
  try {
    const { voice: voiceName } = req.body;
    if (!voiceName) return res.status(400).json({ success: false, error: 'voice required' });
    voice.setVoice(voiceName);
    res.json({ success: true, data: { voice: voiceName } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/status', (req, res) => {
  try {
    res.json({ success: true, data: voice.getStatus() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/history', (req, res) => {
  try {
    const { limit } = req.query;
    res.json({ success: true, data: voice.getSessionHistory(parseInt(limit) || 10) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/history', (req, res) => {
  try {
    voice.clearSessionHistory();
    res.json({ success: true, data: { message: 'History cleared' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/omnivoice', (req, res) => {
  try {
    const config = voice.configureOmniVOICE(req.body);
    res.json(config);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/cache', (req, res) => {
  try {
    const cacheInfo = { size: ttsCache.size, keys: Array.from(ttsCache.keys()) };
    res.json({ success: true, data: cacheInfo });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/cache', (req, res) => {
  try {
    ttsCache.clear();
    res.json({ success: true, data: { message: 'TTS cache cleared' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/cache/warm', async (req, res) => {
  try {
    const { texts, language } = req.body;
    if (!texts || !Array.isArray(texts)) return res.status(400).json({ success: false, error: 'texts array required' });
    const results = [];
    for (const text of texts) {
      const ttsResult = await tts.speak(text, { lang: language || 'en' });
      if (ttsResult.success) {
        ttsCache.set(text + ':' + (language || 'en'), ttsResult.audio);
        results.push({ text, cached: true });
      }
    }
    res.json({ success: true, data: { warmed: results.length, total: texts.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/profiles', (req, res) => {
  try {
    const { name, language, voice: voiceName, rate, pitch, volume } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const profileId = 'profile-' + Date.now();
    voiceProfiles.set(profileId, { id: profileId, name, language, voice: voiceName, rate, pitch, volume, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: voiceProfiles.get(profileId) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/profiles', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(voiceProfiles.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/profiles/:id', (req, res) => {
  try {
    const profile = voiceProfiles.get(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/profiles/:id', (req, res) => {
  try {
    const profile = voiceProfiles.get(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
    Object.assign(profile, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/profiles/:id', (req, res) => {
  try {
    if (!voiceProfiles.has(req.params.id)) return res.status(404).json({ success: false, error: 'Profile not found' });
    voiceProfiles.delete(req.params.id);
    res.json({ success: true, data: { message: 'Profile deleted' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/vad', (req, res) => {
  try {
    res.json({ success: true, data: voice.getVADConfig ? voice.getVADConfig() : { enabled: true, threshold: 0.5, silenceTimeoutMs: 1500 } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/vad', (req, res) => {
  try {
    const { enabled, threshold, silenceTimeoutMs, mode } = req.body;
    if (voice.setVADConfig) voice.setVADConfig({ enabled, threshold, silenceTimeoutMs, mode });
    res.json({ success: true, data: { enabled, threshold, silenceTimeoutMs, mode } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stream/start', (req, res) => {
  try {
    const { sessionId, encoding, sampleRate } = req.body;
    const sid = sessionId || 'stream-' + Date.now();
    voiceSessions.set(sid, { id: sid, encoding: encoding || 'pcm16', sampleRate: sampleRate || 16000, startTime: new Date().toISOString(), chunks: [] });
    res.status(201).json({ success: true, data: { sessionId: sid } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stream/:sessionId/chunk', (req, res) => {
  try {
    const session = voiceSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Stream session not found' });
    const { audioChunk } = req.body;
    if (audioChunk) session.chunks.push(audioChunk);
    res.json({ success: true, data: { received: session.chunks.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stream/:sessionId/end', async (req, res) => {
  try {
    const session = voiceSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Stream session not found' });
    const fullAudio = session.chunks.join('');
    const transcript = await stt.transcribe(fullAudio, { language: req.body.language || 'en' });
    voiceSessions.delete(req.params.sessionId);
    res.json({ success: true, data: { transcript, duration: session.chunks.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stt/providers', (req, res) => {
  try {
    const providers = stt.getProviders ? stt.getProviders() : ['local', 'google', 'aws', 'azure', 'whisper'];
    res.json({ success: true, data: providers });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/stt/provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' });
    if (stt.setActiveProvider) stt.setActiveProvider(provider);
    res.json({ success: true, data: { provider } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/commands', (req, res) => {
  try {
    const { name, phrases, action, language } = req.body;
    if (!name || !phrases) return res.status(400).json({ success: false, error: 'name and phrases required' });
    voiceCommands.set(name, { name, phrases: Array.isArray(phrases) ? phrases : [phrases], action: action || 'custom', language: language || 'en', createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: voiceCommands.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/commands', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(voiceCommands.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/commands/:name', (req, res) => {
  try {
    if (!voiceCommands.has(req.params.name)) return res.status(404).json({ success: false, error: 'Command not found' });
    voiceCommands.delete(req.params.name);
    res.json({ success: true, data: { message: 'Command deleted' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/auth/enroll', async (req, res) => {
  try {
    const { userId, audioSamples } = req.body;
    if (!userId || !audioSamples) return res.status(400).json({ success: false, error: 'userId and audioSamples required' });
    const result = await voice.enrollVoiceAuth ? voice.enrollVoiceAuth(userId, audioSamples) : { success: true, message: 'Voice enrollment simulated' };
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/auth/verify', async (req, res) => {
  try {
    const { userId, audioSample } = req.body;
    if (!userId || !audioSample) return res.status(400).json({ success: false, error: 'userId and audioSample required' });
    const result = await voice.verifyVoiceAuth ? voice.verifyVoiceAuth(userId, audioSample) : { success: true, confidence: 0.95 };
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/auth/enrolled/:userId', (req, res) => {
  try {
    const info = voice.getVoiceEnrollment ? voice.getVoiceEnrollment(req.params.userId) : { userId: req.params.userId, enrolled: true, sampleCount: 3 };
    res.json({ success: true, data: info });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/audio/upload', (req, res) => {
  try {
    const { name, audioData, format, metadata } = req.body;
    if (!name || !audioData) return res.status(400).json({ success: false, error: 'name and audioData required' });
    const fileId = 'audio-' + Date.now();
    audioFiles.set(fileId, { id: fileId, name, format: format || 'wav', size: audioData.length, metadata: metadata || {}, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: audioFiles.get(fileId) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/audio', (req, res) => {
  try {
    const files = Array.from(audioFiles.values());
    const { name, format } = req.query;
    let filtered = files;
    if (name) filtered = filtered.filter(f => f.name.includes(name));
    if (format) filtered = filtered.filter(f => f.format === format);
    res.json({ success: true, data: filtered });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/audio/:id', (req, res) => {
  try {
    const file = audioFiles.get(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: 'Audio file not found' });
    res.json({ success: true, data: file });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/audio/:id', (req, res) => {
  try {
    if (!audioFiles.has(req.params.id)) return res.status(404).json({ success: false, error: 'Audio file not found' });
    audioFiles.delete(req.params.id);
    res.json({ success: true, data: { message: 'Audio file deleted' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/tts/providers', (req, res) => {
  try {
    const providers = tts.getProviders ? tts.getProviders() : ['local', 'google', 'aws', 'azure', 'elevenlabs'];
    res.json({ success: true, data: providers });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/tts/provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' });
    if (tts.setActiveProvider) tts.setActiveProvider(provider);
    res.json({ success: true, data: { provider } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/languages', (req, res) => {
  try {
    const languages = voice.getSupportedLanguages ? voice.getSupportedLanguages() : ['en', 'de', 'fr', 'nl', 'es', 'it', 'pt', 'zh', 'ja', 'ko'];
    res.json({ success: true, data: languages });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/sessions', (req, res) => {
  try {
    const sessions = Array.from(voiceSessions.values());
    const { status } = req.query;
    let filtered = sessions;
    if (status) filtered = sessions.filter(s => s.status === status);
    res.json({ success: true, data: filtered });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/sessions/:id', (req, res) => {
  try {
    const session = voiceSessions.get(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/sessions/:id', (req, res) => {
  try {
    if (!voiceSessions.has(req.params.id)) return res.status(404).json({ success: false, error: 'Session not found' });
    voiceSessions.delete(req.params.id);
    res.json({ success: true, data: { message: 'Session ended' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        sessions: voiceSessions.size,
        profiles: voiceProfiles.size,
        commands: voiceCommands.size,
        audioFiles: audioFiles.size,
        cacheEntries: ttsCache.size,
        uptime: process.uptime()
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
