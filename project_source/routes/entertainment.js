const express = require('express');
const router = express.Router();
const entertainment = require('../services/entertainment');

const mediaLibrary = new Map();
const playlists = new Map();
const contentCategories = new Map();
const watchHistory = new Map();
const userRatings = new Map();
const userPreferences = new Map();
const parentalControls = new Map();
const trendingCache = [];

['music', 'video', 'game', 'story', 'quiz', 'podcast'].forEach(c => contentCategories.set(c, { id: c, name: c.charAt(0).toUpperCase() + c.slice(1), count: 0 }));

router.get('/media', (req, res) => {
  const { type, genre, mood, minAge, maxAge, language } = req.query;
  const filters = {};
  if (genre) filters.genre = genre;
  if (mood) filters.mood = mood;
  if (minAge) filters.minAge = parseInt(minAge);
  if (maxAge) filters.maxAge = parseInt(maxAge);
  if (language) filters.language = language;
  res.json({ success: true, data: entertainment.getAvailableMedia(type, filters) });
});

router.get('/media/:id', (req, res) => {
  const media = entertainment.getMediaById(req.params.id);
  if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
  res.json({ success: true, data: media });
});

router.post('/playlist', (req, res) => {
  const { name, mediaIds } = req.body;
  if (!name || !mediaIds) return res.status(400).json({ success: false, error: 'name and mediaIds required' });
  const playlist = entertainment.createPlaylist(name, mediaIds, req.user.id);
  res.status(201).json({ success: true, data: playlist });
});

router.post('/queue', (req, res) => {
  const { mediaId } = req.body;
  if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId required' });
  const result = entertainment.enqueueMedia(mediaId, req.user.id);
  res.status(result.success ? 201 : 400).json(result);
});

router.get('/queue', (req, res) => {
  res.json({ success: true, data: entertainment.getQueue(req.user.id) });
});

router.post('/games/start', (req, res) => {
  const { gameId, questionCount, categories } = req.body;
  if (!gameId) return res.status(400).json({ success: false, error: 'gameId required' });
  const result = entertainment.startInteractiveGame(gameId, req.user.id, { questionCount, categories });
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/games/turn', (req, res) => {
  const { sessionId, answer } = req.body;
  if (!sessionId || answer === undefined) return res.status(400).json({ success: false, error: 'sessionId and answer required' });
  const result = entertainment.playGameTurn(sessionId, answer);
  res.json(result);
});

router.get('/games/state/:sessionId', (req, res) => {
  const state = entertainment.getGameState(req.params.sessionId);
  if (!state) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: state });
});

router.get('/suggest', (req, res) => {
  const { age, mood, interests } = req.query;
  const result = entertainment.suggestContent(parseInt(age) || 8, mood, interests);
  res.json({ success: true, data: result });
});

router.get('/games', (req, res) => {
  const games = [
    { id: 'trivia', name: 'Quiz Genius', desc: 'Answer questions from many topics!', minAge: 5, maxAge: 14, lives: 3, category: 'educational' },
    { id: 'word-wizard', name: 'Word Wizard', desc: 'Spell words and build vocabulary!', minAge: 5, maxAge: 12, lives: 3, category: 'language' },
    { id: 'math-master', name: 'Math Master', desc: 'Solve math problems quickly!', minAge: 6, maxAge: 14, lives: 5, category: 'math' },
    { id: 'geo-explorer', name: 'Geo Explorer', desc: 'Discover countries and capitals!', minAge: 7, maxAge: 14, lives: 3, category: 'geography' },
    { id: 'science-wiz', name: 'Science Wiz', desc: 'Explore science facts!', minAge: 6, maxAge: 14, lives: 3, category: 'science' },
    { id: 'memory-match', name: 'Memory Match', desc: 'Find matching pairs!', minAge: 4, maxAge: 10, lives: 5, category: 'memory' },
    { id: 'brain-teaser', name: 'Brain Teaser', desc: 'Riddles and logic puzzles!', minAge: 8, maxAge: 14, lives: 3, category: 'logic' }
  ];
  res.json({ success: true, data: games });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: entertainment.getStats() });
});

router.post('/categories', (req, res) => {
  const { id, name, description, minAge, maxAge } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, error: 'id and name required' });
  contentCategories.set(id, { id, name, description: description || '', minAge: minAge || 0, maxAge: maxAge || 18, count: 0, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: contentCategories.get(id) });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: Array.from(contentCategories.values()) });
});

router.get('/categories/:id', (req, res) => {
  const cat = contentCategories.get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true, data: cat });
});

router.put('/categories/:id', (req, res) => {
  const cat = contentCategories.get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
  Object.assign(cat, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: cat });
});

router.delete('/categories/:id', (req, res) => {
  if (!contentCategories.has(req.params.id)) return res.status(404).json({ success: false, error: 'Category not found' });
  contentCategories.delete(req.params.id);
  res.json({ success: true });
});

router.post('/library', (req, res) => {
  const { id, title, type, url, category, ageRating, metadata } = req.body;
  if (!title || !type) return res.status(400).json({ success: false, error: 'title and type required' });
  const mediaId = id || 'media-' + Date.now();
  mediaLibrary.set(mediaId, { id: mediaId, title, type: type, url: url || '', category: category || 'general', ageRating: ageRating || 0, metadata: metadata || {}, addedAt: new Date().toISOString() });
  if (contentCategories.has(category)) contentCategories.get(category).count++;
  res.status(201).json({ success: true, data: mediaLibrary.get(mediaId) });
});

router.get('/library', (req, res) => {
  const { type, category, ageRating } = req.query;
  let items = Array.from(mediaLibrary.values());
  if (type) items = items.filter(m => m.type === type);
  if (category) items = items.filter(m => m.category === category);
  if (ageRating) items = items.filter(m => m.ageRating <= parseInt(ageRating));
  res.json({ success: true, data: items });
});

router.put('/library/:id', (req, res) => {
  const item = mediaLibrary.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Media not found' });
  Object.assign(item, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: item });
});

router.delete('/library/:id', (req, res) => {
  if (!mediaLibrary.has(req.params.id)) return res.status(404).json({ success: false, error: 'Media not found' });
  mediaLibrary.delete(req.params.id);
  res.json({ success: true });
});

router.post('/playlists', (req, res) => {
  const { name, description, mediaIds, userId } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const playlistId = 'pl-' + Date.now();
  playlists.set(playlistId, { id: playlistId, name, description: description || '', mediaIds: mediaIds || [], userId: userId || req.user?.id || 'anon', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: playlists.get(playlistId) });
});

router.get('/playlists', (req, res) => {
  const { userId } = req.query;
  let items = Array.from(playlists.values());
  if (userId) items = items.filter(p => p.userId === userId);
  res.json({ success: true, data: items });
});

router.get('/playlists/:id', (req, res) => {
  const pl = playlists.get(req.params.id);
  if (!pl) return res.status(404).json({ success: false, error: 'Playlist not found' });
  res.json({ success: true, data: pl });
});

router.put('/playlists/:id/media', (req, res) => {
  const pl = playlists.get(req.params.id);
  if (!pl) return res.status(404).json({ success: false, error: 'Playlist not found' });
  const { mediaId, action } = req.body;
  if (!mediaId || !action) return res.status(400).json({ success: false, error: 'mediaId and action required' });
  if (action === 'add') pl.mediaIds.push(mediaId);
  if (action === 'remove') pl.mediaIds = pl.mediaIds.filter(m => m !== mediaId);
  pl.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pl });
});

router.delete('/playlists/:id', (req, res) => {
  if (!playlists.has(req.params.id)) return res.status(404).json({ success: false, error: 'Playlist not found' });
  playlists.delete(req.params.id);
  res.json({ success: true });
});

router.post('/recommendations', (req, res) => {
  const { userId, age, mood, category } = req.body;
  const items = Array.from(mediaLibrary.values());
  let filtered = items;
  if (category) filtered = filtered.filter(m => m.category === category);
  if (age) filtered = filtered.filter(m => m.ageRating <= parseInt(age));
  if (mood) filtered = filtered.filter(m => (m.metadata?.mood || 'neutral') === mood);
  const recommended = filtered.sort(() => Math.random() - 0.5).slice(0, 10);
  res.json({ success: true, data: recommended });
});

router.post('/ratings', (req, res) => {
  const { mediaId, score, userId } = req.body;
  if (!mediaId || score === undefined) return res.status(400).json({ success: false, error: 'mediaId and score required' });
  const uid = userId || req.user?.id || 'anon';
  userRatings.set(mediaId + ':' + uid, { mediaId, userId: uid, score: Math.min(5, Math.max(0, parseInt(score))), createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: userRatings.get(mediaId + ':' + uid) });
});

router.get('/ratings/:mediaId', (req, res) => {
  const ratings = Array.from(userRatings.values()).filter(r => r.mediaId === req.params.mediaId);
  const avg = ratings.length > 0 ? ratings.reduce((a, r) => a + r.score, 0) / ratings.length : 0;
  res.json({ success: true, data: { mediaId: req.params.mediaId, average: avg, count: ratings.length, ratings } });
});

router.get('/history', (req, res) => {
  const { userId, mediaId, limit } = req.query;
  const uid = userId || req.user?.id || 'anon';
  let history = watchHistory.get(uid) || [];
  if (mediaId) history = history.filter(h => h.mediaId === mediaId);
  res.json({ success: true, data: history.slice(0, parseInt(limit) || 50) });
});

router.post('/history', (req, res) => {
  const { mediaId, progress, completed } = req.body;
  if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId required' });
  const uid = req.user?.id || 'anon';
  if (!watchHistory.has(uid)) watchHistory.set(uid, []);
  watchHistory.get(uid).push({ mediaId, progress: progress || 0, completed: completed || false, timestamp: new Date().toISOString() });
  res.status(201).json({ success: true });
});

router.get('/preferences', (req, res) => {
  const uid = req.user?.id || 'anon';
  res.json({ success: true, data: userPreferences.get(uid) || { genres: [], moods: [], maxAgeRating: 18, language: 'en' } });
});

router.put('/preferences', (req, res) => {
  const uid = req.user?.id || 'anon';
  userPreferences.set(uid, { ...userPreferences.get(uid), ...req.body, updatedAt: new Date().toISOString() });
  res.json({ success: true, data: userPreferences.get(uid) });
});

router.post('/parental-controls', (req, res) => {
  const { userId, maxAgeRating, blockedCategories, timeLimitMinutes, pin } = req.body;
  const uid = userId || req.user?.id || 'anon';
  parentalControls.set(uid, { userId: uid, maxAgeRating: maxAgeRating || 12, blockedCategories: blockedCategories || [], timeLimitMinutes: timeLimitMinutes || 120, pin: pin || '0000', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: parentalControls.get(uid) });
});

router.get('/parental-controls', (req, res) => {
  const uid = req.user?.id || 'anon';
  const controls = parentalControls.get(uid);
  if (!controls) return res.status(404).json({ success: false, error: 'No parental controls set' });
  res.json({ success: true, data: controls });
});

router.get('/trending', (req, res) => {
  const { category, limit } = req.query;
  let items = trendingCache.length > 0 ? trendingCache : Array.from(mediaLibrary.values()).sort(() => Math.random() - 0.5);
  if (category) items = items.filter(m => m.category === category);
  res.json({ success: true, data: items.slice(0, parseInt(limit) || 20) });
});

router.post('/trending/refresh', (req, res) => {
  trendingCache.length = 0;
  const items = Array.from(mediaLibrary.values());
  const viewed = Array.from(watchHistory.values()).flat();
  const counts = {};
  viewed.forEach(v => { counts[v.mediaId] = (counts[v.mediaId] || 0) + 1; });
  const sorted = items.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  trendingCache.push(...sorted);
  res.json({ success: true, data: { refreshed: trendingCache.length } });
});

router.get('/stats/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      mediaCount: mediaLibrary.size,
      playlistCount: playlists.size,
      categories: contentCategories.size,
      ratings: userRatings.size,
      trendingCount: trendingCache.length,
      historyEntries: Array.from(watchHistory.values()).reduce((a, h) => a + h.length, 0)
    }
  });
});

module.exports = router;
