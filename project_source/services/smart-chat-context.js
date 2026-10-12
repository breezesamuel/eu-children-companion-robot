const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const LTM_CACHE = path.join(__dirname, '..', 'data', 'smart-context-cache.json');

class SmartChatContext extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.globalMemory = [];
    this.cannedResponses = new Map();
    this._loadCache();
  }

  _loadCache() {
    try {
      if (fs.existsSync(LTM_CACHE)) {
        const data = JSON.parse(fs.readFileSync(LTM_CACHE, 'utf8'));
        this.globalMemory = data.memory || [];
        logger.info('SmartChatContext: loaded ' + this.globalMemory.length + ' cached memories');
      }
    } catch (_) { this.globalMemory = []; }
  }

  _saveCache() {
    try {
      const dir = path.dirname(LTM_CACHE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LTM_CACHE, JSON.stringify({ memory: this.globalMemory.slice(-1000) }, null, 2), 'utf8');
    } catch (_) {}
  }

  getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        context: { lastTopic: '', topics: [], interests: [], emotion: null, language: 'en' },
        profile: {},
        createdAt: Date.now(),
        lastActive: Date.now(),
        msgCount: 0
      });
    }
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId, role, content, meta) {
    const session = this.getOrCreateSession(sessionId);
    session.history.push({ role, content, meta: meta || {}, timestamp: Date.now() });
    session.msgCount++;
    session.lastActive = Date.now();

    if (session.history.length > 60) {
      const removed = session.history.splice(0, session.history.length - 40);
      session.summarized = (session.summarized || '') + ' ' +
        removed.filter(m => m.role === 'user').map(m => m.content.substring(0, 60)).join(' | ') + '.';
      if (session.summarized.length > 1500) session.summarized = session.summarized.slice(-1000);
    }

    if (role === 'user') {
      const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      words.forEach(w => {
        if (!session.context.topics.includes(w) && /^[a-z]+$/.test(w)) session.context.topics.push(w);
      });
      if (session.context.topics.length > 30) session.context.topics = session.context.topics.slice(-30);

      this.globalMemory.push({
        sessionId, role, content: content.substring(0, 200),
        topic: session.context.lastTopic || '', timestamp: Date.now()
      });
      if (this.globalMemory.length > 5000) this.globalMemory = this.globalMemory.slice(-3000);
    }
    return session;
  }

  buildPrompt(sessionId, userMessage, engineContext) {
    const session = this.getOrCreateSession(sessionId);
    const recent = session.history.slice(-10);
    const parts = [];

    if (session.summarized) parts.push('[Earlier: ' + session.summarized.substring(0, 250) + ']');

    recent.forEach(h => {
      const label = h.role === 'user' ? 'User' : 'Assistant';
      parts.push(label + ': ' + h.content.substring(0, 150));
    });

    const ctx = session.context;
    if (ctx.lastTopic) parts.push('[Current topic: ' + ctx.lastTopic + ']');
    if (ctx.topics.length > 0) parts.push('[Topics discussed: ' + ctx.topics.slice(-5).join(', ') + ']');
    if (ctx.interests.length > 0) parts.push('[Interests: ' + ctx.interests.join(', ') + ']');

    if (engineContext) parts.push(engineContext);

    return parts.join('\n');
  }

  getRecentContext(sessionId, limit = 3) {
    const session = this.sessions.get(sessionId);
    if (!session) return '';
    return session.history.slice(-limit).map(h =>
      (h.role === 'user' ? 'User: ' : 'Bot: ') + h.content.substring(0, 100)
    ).join('\n');
  }

  searchGlobalMemory(query, limit = 3) {
    const q = query.toLowerCase();
    const results = this.globalMemory
      .filter(m => m.content && m.content.toLowerCase().includes(q))
      .slice(-limit * 3)
      .slice(-limit)
      .map(m => m.content.substring(0, 150));
    return results;
  }

  detectRepeatQuestion(sessionId, query) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const lower = query.toLowerCase().trim();
    const similar = session.history.filter(h =>
      h.role === 'user' && h.content && h.content.toLowerCase().includes(lower.substring(0, 10))
    );
    return similar.length > 1;
  }

  updateProfile(sessionId, updates) {
    const session = this.getOrCreateSession(sessionId);
    Object.assign(session.profile, updates);
    if (updates.interests) {
      session.context.interests = [...new Set([...session.context.interests, ...updates.interests])];
    }
  }

  setLastTopic(sessionId, topic) {
    const session = this.getOrCreateSession(sessionId);
    if (topic) {
      session.context.lastTopic = topic.substring(0, 50);
      if (!session.context.topics.includes(topic)) {
        session.context.topics.push(topic);
      }
    }
  }

  setEmotion(sessionId, emotion) {
    const session = this.getOrCreateSession(sessionId);
    session.context.emotion = emotion;
  }

  getEmotion(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.context.emotion : null;
  }

  hasRecentInteraction(sessionId, seconds = 30) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return (Date.now() - session.lastActive) < (seconds * 1000);
  }

  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      msgCount: session.msgCount,
      topics: session.context.topics.slice(-5),
      interests: session.context.interests,
      lastTopic: session.context.lastTopic,
      emotion: session.context.emotion,
      lastActive: session.lastActive,
      historyLen: session.history.length
    };
  }

  cacheCannedResponse(key, response) {
    this.cannedResponses.set(key.toLowerCase(), response);
    if (this.cannedResponses.size > 200) {
      const firstKey = this.cannedResponses.keys().next().value;
      this.cannedResponses.delete(firstKey);
    }
  }

  getCannedResponse(key) {
    return this.cannedResponses.get(key.toLowerCase());
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  getStats() {
    return {
      activeSessions: this.sessions.size,
      globalMemorySize: this.globalMemory.length,
      cachedResponses: this.cannedResponses.size
    };
  }
}

module.exports = new SmartChatContext();
