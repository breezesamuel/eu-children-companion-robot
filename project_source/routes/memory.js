const express = require('express');
const router = express.Router();
const LongTermMemory = require('../services/long-term-memory');
const logger = require('../utils/logger');

const memory = new LongTermMemory();

const memories = new Map();
const memoryGraph = new Map();
const importanceScores = new Map();

router.post('/store', (req, res) => {
  try {
    const { role, content, metadata } = req.body;
    const userId = req.user.userId;
    if (!role || !content) return res.status(400).json({ success: false, error: 'role and content required' });
    const result = memory.store(userId, role, content, metadata || {});
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/search', (req, res) => {
  try {
    const { q, limit, threshold } = req.query;
    const userId = req.user.userId;
    if (!q) return res.status(400).json({ success: false, error: 'query (q) required' });
    const results = memory.search(userId, q, parseInt(limit) || 10, parseFloat(threshold) || 0.3);
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/recall/:topic', (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic } = req.params;
    const { limit } = req.query;
    const results = memory.recall(userId, topic, parseInt(limit) || 20);
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/context', (req, res) => {
  try {
    const userId = req.user.userId;
    const { query, maxTokens } = req.query;
    const context = memory.getContext(userId, query || '', parseInt(maxTokens) || 2000);
    res.json({ success: true, data: { context } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/profile', (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = memory.getLearningProfile(userId);
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/evolution', (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, level } = req.body;
    if (!topic || !level) return res.status(400).json({ success: false, error: 'topic and level required' });
    const result = memory.trackEvolution(userId, topic, level);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/forget', (req, res) => {
  try {
    const userId = req.user.userId;
    const { pattern } = req.body;
    if (!pattern) return res.status(400).json({ success: false, error: 'pattern required' });
    const count = memory.forget(userId, pattern);
    res.json({ success: true, data: { removed: count } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/summarize', (req, res) => {
  try {
    const userId = req.user.userId;
    const { hours } = req.query;
    const summary = memory.summarize(userId, parseInt(hours) ? parseInt(hours) * 3600000 : null);
    res.json({ success: true, data: summary });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', (req, res) => {
  try {
    const stats = memory.getStats();
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/items', (req, res) => {
  try {
    const { userId, type, content, tags, importance } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    if (!type || !content) return res.status(400).json({ success: false, error: 'type and content required' });
    const memoryId = 'mem-' + Date.now();
    const item = { id: memoryId, userId: uid, type, content, tags: tags || [], importance: importance || 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (!memories.has(uid)) memories.set(uid, []);
    memories.get(uid).push(item);
    importanceScores.set(memoryId, item.importance);
    res.status(201).json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/items', (req, res) => {
  try {
    const userId = req.query.userId || req.user?.userId;
    const { type, tag, minImportance, limit, offset } = req.query;
    const uid = userId || 'anon';
    let items = memories.get(uid) || [];
    if (type) items = items.filter(i => i.type === type);
    if (tag) items = items.filter(i => i.tags.includes(tag));
    if (minImportance) items = items.filter(i => i.importance >= parseFloat(minImportance));
    const start = parseInt(offset) || 0;
    const end = start + (parseInt(limit) || 50);
    res.json({ success: true, data: items.slice(start, end), total: items.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/items/:id', (req, res) => {
  try {
    const { userId } = req.query;
    const uid = userId || req.user?.userId || 'anon';
    const items = memories.get(uid) || [];
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Memory not found' });
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/items/:id', (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    const items = memories.get(uid) || [];
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Memory not found' });
    Object.assign(items[idx], req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: items[idx] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/items/:id', (req, res) => {
  try {
    const { userId } = req.query;
    const uid = userId || req.user?.userId || 'anon';
    const items = memories.get(uid) || [];
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Memory not found' });
    items.splice(idx, 1);
    importanceScores.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/vector-search', (req, res) => {
  try {
    const { userId, query, type, limit } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    if (!query) return res.status(400).json({ success: false, error: 'query required' });
    const items = memories.get(uid) || [];
    let results = items.filter(i => i.content.toLowerCase().includes(query.toLowerCase()));
    if (type) results = results.filter(i => i.type === type);
    const sorted = results.sort((a, b) => b.importance - a.importance).slice(0, parseInt(limit) || 10);
    res.json({ success: true, data: sorted });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/types', (req, res) => {
  try {
    const { name, description, ttl } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const typeEntry = { name, description: description || '', ttl: ttl || 0, createdAt: new Date().toISOString() };
    res.status(201).json({ success: true, data: typeEntry });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/types', (req, res) => {
  try {
    const types = ['fact', 'concept', 'experience', 'preference', 'skill', 'relationship', 'routine', 'achievement'];
    res.json({ success: true, data: types });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/importance', (req, res) => {
  try {
    const { memoryId, score } = req.body;
    if (!memoryId || score === undefined) return res.status(400).json({ success: false, error: 'memoryId and score required' });
    importanceScores.set(memoryId, parseFloat(score));
    res.json({ success: true, data: { memoryId, importance: score } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/consolidate', async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    const result = memory.consolidate ? await memory.consolidate(uid) : { consolidated: 0, message: 'Memory consolidation triggered' };
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/graph', (req, res) => {
  try {
    const { userId } = req.query;
    const uid = userId || req.user?.userId || 'anon';
    const items = memories.get(uid) || [];
    const nodes = items.map(i => ({ id: i.id, label: i.type, group: i.type }));
    const edges = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].tags.some(t => items[j].tags.includes(t))) {
          edges.push({ from: items[i].id, to: items[j].id });
        }
      }
    }
    memoryGraph.set(uid, { nodes, edges });
    res.json({ success: true, data: { nodes, edges } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/graph/:userId', (req, res) => {
  try {
    const graph = memoryGraph.get(req.params.userId);
    if (!graph) return res.status(404).json({ success: false, error: 'Graph not found for user' });
    res.json({ success: true, data: graph });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/export', (req, res) => {
  try {
    const { userId, format } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    const items = memories.get(uid) || [];
    if (format === 'json') {
      return res.json({ success: true, data: items });
    }
    const text = items.map(i => `[${i.type}] ${i.content} (${i.importance})`).join('\n---\n');
    res.json({ success: true, data: { format: 'text', content: text, count: items.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/import', (req, res) => {
  try {
    const { userId, memories: importedMemories } = req.body;
    const uid = userId || req.user?.userId || 'anon';
    if (!importedMemories || !Array.isArray(importedMemories)) return res.status(400).json({ success: false, error: 'memories array required' });
    if (!memories.has(uid)) memories.set(uid, []);
    const existing = memories.get(uid);
    let count = 0;
    for (const item of importedMemories) {
      existing.push({ id: 'mem-' + Date.now() + '-' + count, ...item, createdAt: new Date().toISOString() });
      count++;
    }
    res.json({ success: true, data: { imported: count } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/ttl', (req, res) => {
  try {
    const { type, ttlHours } = req.body;
    if (!type || !ttlHours) return res.status(400).json({ success: false, error: 'type and ttlHours required' });
    let removed = 0;
    const cutoff = Date.now() - ttlHours * 3600000;
    for (const [uid, items] of memories.entries()) {
      const before = items.length;
      memories.set(uid, items.filter(i => i.type !== type || new Date(i.createdAt).getTime() > cutoff));
      removed += before - memories.get(uid).length;
    }
    res.json({ success: true, data: { type, ttlHours, removed } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats/detailed', (req, res) => {
  try {
    let totalItems = 0;
    const typeCounts = {};
    for (const [, items] of memories.entries()) {
      totalItems += items.length;
      for (const item of items) {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      }
    }
    res.json({
      success: true,
      data: {
        totalMemories: totalItems,
        userCount: memories.size,
        typeDistribution: typeCounts,
        averageImportance: importanceScores.size > 0 ? Array.from(importanceScores.values()).reduce((a, b) => a + b, 0) / importanceScores.size : 0,
        graphCount: memoryGraph.size
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
