const express = require('express');
const router = express.Router();
const llm = require('../services/llm-service');
const logger = require('../utils/logger');

const promptTemplates = new Map();
const systemPrompts = new Map();
const conversationStore = new Map();
const modelFallbackChains = new Map();

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId, model, temperature, maxTokens } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message required' });
    const result = await llm.chat(sessionId || null, userId || req.user?.userId || 'anon', message, { model, temperature, maxTokens });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stream', async (req, res) => {
  try {
    const { message, sessionId, userId, model } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message required' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const reply = await llm.chatStream(sessionId || null, userId || req.user?.userId || 'anon', message, chunk => { res.write('data: ' + JSON.stringify({ chunk }) + '\n\n'); }, { model });
    res.write('data: ' + JSON.stringify({ done: true, reply }) + '\n\n');
    res.end();
  } catch (err) { res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n'); res.end(); }
});

router.get('/sessions/:sessionId', (req, res) => {
  try {
    const session = llm.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/sessions', (req, res) => {
  try {
    const { userId } = req.query;
    res.json({ success: true, data: llm.getAllSessions(userId) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/sessions/:sessionId', (req, res) => {
  try {
    llm.clearSession(req.params.sessionId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' });
    llm.setActiveProvider(provider);
    res.json({ success: true, data: { provider } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/providers', (req, res) => {
  try {
    res.json({ success: true, data: llm.getProviders() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/intent', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'query (q) required' });
    const lang = llm._detectLanguage(q);
    const intent = llm._detectIntent(q, lang);
    res.json({ success: true, data: { intent, language: lang, query: q } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/context', (req, res) => {
  try {
    const { sessionId, maxTokens } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
    const ctx = llm.getConversationContext(sessionId);
    res.json({ success: true, data: { context: ctx } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/prompt', (req, res) => {
  try {
    const { sessionId, prompt } = req.body;
    if (!sessionId || !prompt) return res.status(400).json({ success: false, error: 'sessionId and prompt required' });
    llm.setSystemPrompt(sessionId, prompt);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/profile', (req, res) => {
  try {
    const { sessionId, updates } = req.body;
    if (!sessionId || !updates) return res.status(400).json({ success: false, error: 'sessionId and updates required' });
    llm.updateProfile(sessionId, updates);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/fallback', (req, res) => {
  try {
    const { name, models } = req.body;
    if (!name || !models || !Array.isArray(models)) return res.status(400).json({ success: false, error: 'name and models array required' });
    modelFallbackChains.set(name, { name, models, currentIndex: 0, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: modelFallbackChains.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/fallback', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(modelFallbackChains.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/fallback/:name', (req, res) => {
  try {
    const chain = modelFallbackChains.get(req.params.name);
    if (!chain) return res.status(404).json({ success: false, error: 'Fallback chain not found' });
    res.json({ success: true, data: chain });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/fallback/:name', (req, res) => {
  try {
    if (!modelFallbackChains.has(req.params.name)) return res.status(404).json({ success: false, error: 'Fallback chain not found' });
    modelFallbackChains.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/conversations', (req, res) => {
  try {
    const { userId, sessionId, title, metadata } = req.body;
    const sid = sessionId || 'conv-' + Date.now();
    conversationStore.set(sid, { id: sid, userId: userId || 'anon', title: title || 'Untitled', messages: [], metadata: metadata || {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: conversationStore.get(sid) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/conversations', (req, res) => {
  try {
    const { userId } = req.query;
    let conversations = Array.from(conversationStore.values());
    if (userId) conversations = conversations.filter(c => c.userId === userId);
    res.json({ success: true, data: conversations });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/conversations/:id', (req, res) => {
  try {
    const conv = conversationStore.get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, data: conv });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/conversations/:id', (req, res) => {
  try {
    const conv = conversationStore.get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    Object.assign(conv, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: conv });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/conversations/:id', (req, res) => {
  try {
    if (!conversationStore.has(req.params.id)) return res.status(404).json({ success: false, error: 'Conversation not found' });
    conversationStore.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const conv = conversationStore.get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    const { role, content } = req.body;
    if (!role || !content) return res.status(400).json({ success: false, error: 'role and content required' });
    const message = { role, content, timestamp: new Date().toISOString() };
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
    res.status(201).json({ success: true, data: message });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/templates', (req, res) => {
  try {
    const { name, template, variables, category } = req.body;
    if (!name || !template) return res.status(400).json({ success: false, error: 'name and template required' });
    promptTemplates.set(name, { name, template, variables: variables || [], category: category || 'general', createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: promptTemplates.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/templates', (req, res) => {
  try {
    const { category } = req.query;
    let templates = Array.from(promptTemplates.values());
    if (category) templates = templates.filter(t => t.category === category);
    res.json({ success: true, data: templates });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/templates/:name', (req, res) => {
  try {
    const tmpl = promptTemplates.get(req.params.name);
    if (!tmpl) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: tmpl });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/templates/:name', (req, res) => {
  try {
    const tmpl = promptTemplates.get(req.params.name);
    if (!tmpl) return res.status(404).json({ success: false, error: 'Template not found' });
    Object.assign(tmpl, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: tmpl });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/templates/:name', (req, res) => {
  try {
    if (!promptTemplates.has(req.params.name)) return res.status(404).json({ success: false, error: 'Template not found' });
    promptTemplates.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/templates/:name/render', (req, res) => {
  try {
    const tmpl = promptTemplates.get(req.params.name);
    if (!tmpl) return res.status(404).json({ success: false, error: 'Template not found' });
    const { variables } = req.body;
    let rendered = tmpl.template;
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp('{{' + key + '}}', 'g'), value);
      }
    }
    res.json({ success: true, data: { rendered } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/system-prompts', (req, res) => {
  try {
    const { name, content, category } = req.body;
    if (!name || !content) return res.status(400).json({ success: false, error: 'name and content required' });
    systemPrompts.set(name, { name, content, category: category || 'general', createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: systemPrompts.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/system-prompts', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(systemPrompts.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/system-prompts/:name', (req, res) => {
  try {
    const sp = systemPrompts.get(req.params.name);
    if (!sp) return res.status(404).json({ success: false, error: 'System prompt not found' });
    res.json({ success: true, data: sp });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/system-prompts/:name', (req, res) => {
  try {
    const sp = systemPrompts.get(req.params.name);
    if (!sp) return res.status(404).json({ success: false, error: 'System prompt not found' });
    Object.assign(sp, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: sp });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/system-prompts/:name', (req, res) => {
  try {
    if (!systemPrompts.has(req.params.name)) return res.status(404).json({ success: false, error: 'System prompt not found' });
    systemPrompts.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/tokens/:sessionId', (req, res) => {
  try {
    const usage = llm.getTokenUsage ? llm.getTokenUsage(req.params.sessionId) : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    res.json({ success: true, data: usage });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/tokens', (req, res) => {
  try {
    const total = llm.getTotalTokenUsage ? llm.getTotalTokenUsage() : { totalPromptTokens: 0, totalCompletionTokens: 0, grandTotal: 0 };
    res.json({ success: true, data: total });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/stream/config', (req, res) => {
  try {
    const { enabled, chunkSize, delayMs } = req.body;
    if (llm.setStreamConfig) llm.setStreamConfig({ enabled: enabled !== false, chunkSize: chunkSize || 5, delayMs: delayMs || 0 });
    res.json({ success: true, data: { enabled, chunkSize, delayMs } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/format', (req, res) => {
  try {
    const { format } = req.body;
    if (!format) return res.status(400).json({ success: false, error: 'format required' });
    if (llm.setResponseFormat) llm.setResponseFormat(format);
    res.json({ success: true, data: { format } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/model', (req, res) => {
  try {
    const { model, provider } = req.body;
    if (!model) return res.status(400).json({ success: false, error: 'model required' });
    if (llm.setActiveModel) llm.setActiveModel(model, provider);
    res.json({ success: true, data: { model, provider } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/models', (req, res) => {
  try {
    const models = llm.getAvailableModels ? llm.getAvailableModels() : [];
    res.json({ success: true, data: models });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/context/window', (req, res) => {
  try {
    const { maxTokens } = req.body;
    if (!maxTokens) return res.status(400).json({ success: false, error: 'maxTokens required' });
    if (llm.setContextWindow) llm.setContextWindow(parseInt(maxTokens));
    res.json({ success: true, data: { maxTokens } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/context/strategy', (req, res) => {
  try {
    const { strategy } = req.body;
    if (!strategy) return res.status(400).json({ success: false, error: 'strategy required (truncate, summarize, or sliding)' });
    if (llm.setContextStrategy) llm.setContextStrategy(strategy);
    res.json({ success: true, data: { strategy } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/chat/multi-turn', async (req, res) => {
  try {
    const { messages, sessionId, userId, model } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ success: false, error: 'messages array required' });
    const result = await llm.chatMultiTurn ? llm.chatMultiTurn(sessionId || null, userId || 'anon', messages, { model }) : { reply: 'Multi-turn chat not available' };
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/chat/persist', async (req, res) => {
  try {
    const { message, sessionId, userId, model, saveConversation } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message required' });
    const result = await llm.chat(sessionId || null, userId || 'anon', message, { model });
    if (saveConversation !== false && sessionId) {
      if (!conversationStore.has(sessionId)) {
        conversationStore.set(sessionId, { id: sessionId, userId: userId || 'anon', title: message.slice(0, 50), messages: [], createdAt: new Date().toISOString() });
      }
      const conv = conversationStore.get(sessionId);
      conv.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      conv.messages.push({ role: 'assistant', content: result.reply || result.text || '', timestamp: new Date().toISOString() });
      conv.updatedAt = new Date().toISOString();
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        promptTemplates: promptTemplates.size,
        systemPrompts: systemPrompts.size,
        conversations: conversationStore.size,
        fallbackChains: modelFallbackChains.size,
        activeProvider: llm.getActiveProvider ? llm.getActiveProvider() : 'unknown',
        uptime: process.uptime()
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
