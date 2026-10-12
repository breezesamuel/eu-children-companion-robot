const express = require('express');
const router = express.Router();
const tts = require('../services/tts');
const logger = require('../utils/logger');

const ttsHistory = [];
const ttsCache = new Map();
const voiceProfiles = new Map();
const ttsProviders = new Map();
const usageStats = { totalRequests: 0, totalChars: 0, byProvider: {}, byLanguage: {} };

['local', 'google', 'aws', 'azure', 'elevenlabs'].forEach(p => ttsProviders.set(p, { id: p, name: p.charAt(0).toUpperCase() + p.slice(1), active: p === 'local' }));

router.get('/status', (req, res) => {
  res.json({ success: true, data: tts.getStatus() });
});

router.get('/voices', (req, res) => {
  res.json({ success: true, data: tts.getVoices() });
});

router.post('/speak', async (req, res) => {
  const { text, lang, rate, pitch, provider, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const cacheKey = text + ':' + (lang || 'en') + ':' + (rate || 1) + ':' + (pitch || 1) + ':' + (voice || 'default');
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      usageStats.totalRequests++;
      usageStats.totalChars += text.length;
      return res.json({ success: true, audio: cached.audio, cached: true, size: cached.size });
    }
    const result = await tts.speak(text, { lang, rate, pitch, provider, voice });
    if (!result.success) return res.status(500).json({ error: result.error, simulated: result.simulated });
    ttsCache.set(cacheKey, { audio: result.audio, size: result.size });
    if (ttsCache.size > 1000) {
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    usageStats.totalRequests++;
    usageStats.totalChars += text.length;
    usageStats.byProvider[provider || 'local'] = (usageStats.byProvider[provider || 'local'] || 0) + 1;
    usageStats.byLanguage[lang || 'en'] = (usageStats.byLanguage[lang || 'en'] || 0) + 1;
    ttsHistory.unshift({ text: text.slice(0, 100), lang: lang || 'en', rate, pitch, provider: provider || 'local', voice, size: result.size, timestamp: new Date().toISOString() });
    if (ttsHistory.length > 1000) ttsHistory.pop();
    res.json({ success: true, audio: result.audio, size: result.size, entry: result.entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', (req, res) => {
  const { lang, rate, pitch, provider, voice } = req.body;
  if (lang) { if (!tts.setVoice(lang)) return res.status(400).json({ error: 'Unknown voice' }); }
  if (rate !== undefined) tts.setRate(rate);
  if (pitch !== undefined) tts.setPitch(pitch);
  if (provider && tts.setActiveProvider) tts.setActiveProvider(provider);
  if (voice && tts.setVoiceName) tts.setVoiceName(voice);
  res.json({ success: true, data: tts.getStatus() });
});

router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const { lang, provider } = req.query;
  let items = [...ttsHistory];
  if (lang) items = items.filter(h => h.lang === lang);
  if (provider) items = items.filter(h => h.provider === provider);
  res.json({ success: true, data: items.slice(0, limit) });
});

router.delete('/history', (req, res) => {
  ttsHistory.length = 0;
  res.json({ success: true, data: { message: 'TTS history cleared' } });
});

router.get('/cache', (req, res) => {
  res.json({ success: true, data: { size: ttsCache.size, keys: Array.from(ttsCache.keys()).slice(0, 20) } });
});

router.delete('/cache', (req, res) => {
  ttsCache.clear();
  res.json({ success: true, data: { message: 'TTS cache cleared' } });
});

router.post('/providers', (req, res) => {
  const { id, name, apiKey, endpoint, models } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, error: 'id and name required' });
  ttsProviders.set(id, { id, name, apiKey: apiKey || '', endpoint: endpoint || '', models: models || [], active: false, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: ttsProviders.get(id) });
});

router.get('/providers', (req, res) => {
  res.json({ success: true, data: Array.from(ttsProviders.values()) });
});

router.put('/providers/:id', (req, res) => {
  const provider = ttsProviders.get(req.params.id);
  if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });
  Object.assign(provider, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: provider });
});

router.put('/providers/:id/activate', (req, res) => {
  for (const [, p] of ttsProviders) p.active = false;
  const provider = ttsProviders.get(req.params.id);
  if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });
  provider.active = true;
  if (tts.setActiveProvider) tts.setActiveProvider(req.params.id);
  res.json({ success: true, data: provider });
});

router.delete('/providers/:id', (req, res) => {
  if (!ttsProviders.has(req.params.id)) return res.status(404).json({ success: false, error: 'Provider not found' });
  ttsProviders.delete(req.params.id);
  res.json({ success: true });
});

router.post('/voices/select', (req, res) => {
  const { voice, language, gender } = req.body;
  if (!voice) return res.status(400).json({ success: false, error: 'voice required' });
  if (tts.setVoiceByName) tts.setVoiceByName(voice);
  res.json({ success: true, data: { voice, language, gender } });
});

router.get('/voices/list', (req, res) => {
  const { language, gender } = req.query;
  let voices = tts.getVoices() || [];
  if (language) voices = voices.filter(v => (v.languages || []).includes(language));
  if (gender) voices = voices.filter(v => v.gender === gender);
  res.json({ success: true, data: voices });
});

router.post('/ssml', async (req, res) => {
  const { ssml, provider } = req.body;
  if (!ssml) return res.status(400).json({ error: 'ssml required' });
  try {
    const result = await tts.speakSSML ? tts.speakSSML(ssml, { provider }) : tts.speak(ssml, { provider });
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json({ success: true, audio: result.audio, size: result.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  const { texts, lang, rate, pitch, provider } = req.body;
  if (!texts || !Array.isArray(texts)) return res.status(400).json({ error: 'texts array required' });
  const results = [];
  for (const text of texts) {
    try {
      const result = await tts.speak(text, { lang, rate, pitch, provider });
      results.push({ text: text.slice(0, 50), success: result.success, size: result.size });
    } catch (e) {
      results.push({ text: text.slice(0, 50), success: false, error: e.message });
    }
  }
  res.json({ success: true, data: { total: texts.length, succeeded: results.filter(r => r.success).length, results } });
});

router.post('/convert', async (req, res) => {
  const { audio, fromFormat, toFormat } = req.body;
  if (!audio || !toFormat) return res.status(400).json({ error: 'audio and toFormat required' });
  const result = tts.convertFormat ? await tts.convertFormat(audio, fromFormat || 'mp3', toFormat) : { audio, format: toFormat, converted: true };
  res.json({ success: true, data: result });
});

router.get('/usage', (req, res) => {
  res.json({ success: true, data: usageStats });
});

router.post('/profiles', (req, res) => {
  const { name, voice, language, rate, pitch, volume } = req.body;
  if (!name || !voice) return res.status(400).json({ error: 'name and voice required' });
  const profileId = 'vp-' + Date.now();
  voiceProfiles.set(profileId, { id: profileId, name, voice, language: language || 'en', rate: rate || 1, pitch: pitch || 1, volume: volume || 1, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: voiceProfiles.get(profileId) });
});

router.get('/profiles', (req, res) => {
  res.json({ success: true, data: Array.from(voiceProfiles.values()) });
});

router.get('/profiles/:id', (req, res) => {
  const profile = voiceProfiles.get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ success: true, data: profile });
});

router.put('/profiles/:id', (req, res) => {
  const profile = voiceProfiles.get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  Object.assign(profile, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: profile });
});

router.delete('/profiles/:id', (req, res) => {
  if (!voiceProfiles.has(req.params.id)) return res.status(404).json({ error: 'Profile not found' });
  voiceProfiles.delete(req.params.id);
  res.json({ success: true });
});

router.get('/languages', (req, res) => {
  const languages = tts.getSupportedLanguages ? tts.getSupportedLanguages() : ['en', 'de', 'fr', 'nl', 'es', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru'];
  res.json({ success: true, data: languages });
});

router.put('/speed', (req, res) => {
  const { rate } = req.body;
  if (rate === undefined) return res.status(400).json({ error: 'rate required' });
  tts.setRate(parseFloat(rate));
  res.json({ success: true, data: { rate } });
});

router.put('/pitch', (req, res) => {
  const { pitch } = req.body;
  if (pitch === undefined) return res.status(400).json({ error: 'pitch required' });
  tts.setPitch(parseFloat(pitch));
  res.json({ success: true, data: { pitch } });
});

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      providers: ttsProviders.size,
      cacheEntries: ttsCache.size,
      historyLength: ttsHistory.length,
      profiles: voiceProfiles.size,
      usage: usageStats
    }
  });
});

module.exports = router;
