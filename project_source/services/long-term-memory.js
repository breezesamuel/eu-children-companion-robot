const EventEmitter = require('events');
const logger = require('../utils/logger');

class LongTermMemory extends EventEmitter {
  constructor(maxMemories = 10000) {
    super();
    this.maxMemories = maxMemories;
    this.memories = [];
    this.evolution = {};
    this._idCounter = 0;
  }

  _generateId() { return 'mem_' + (++this._idCounter) + '_' + Date.now(); }

  _embed(content) {
    if (!content || typeof content !== 'string') return { words: {}, topWords: [] };
    const words = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const freq = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const top50 = sorted.slice(0, 50);
    const topWords = top50.map(e => e[0]);
    const wordsMap = {};
    for (const [word, count] of top50) {
      wordsMap[word] = count;
    }
    return { words: wordsMap, topWords };
  }

  _wordSet(str) { if (!str || typeof str !== 'string') return new Set(); return new Set(str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)); }

  _jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  _getUserMemories(userId) { return this.memories.filter(m => m.userId === userId); }

  store(userId, role, content, metadata) {
    try {
      if (!userId || !content) {
        return { error: 'userId and content are required' };
      }
      const embedding = this._embed(content);
      const memory = {
        id: this._generateId(),
        userId: userId,
        role: role || 'user',
        content: content,
        timestamp: new Date().toISOString(),
        embedding: embedding,
        metadata: metadata || {}
      };
      this.memories.push(memory);
      if (this.memories.length > this.maxMemories) {
        this.memories.shift();
      }
      this.emit('memory:stored', { userId, memoryId: memory.id });
      logger.info('LongTermMemory: stored memory ' + memory.id + ' for user ' + userId);
      return memory;
    } catch (err) {
      logger.error('LongTermMemory.store error: ' + err.message);
      return { error: err.message };
    }
  }

  search(userId, query, limit = 10, threshold = 0.3) {
    try {
      if (!query) return [];
      const querySet = this._wordSet(query);
      if (querySet.size === 0) return [];
      const userMemories = userId ? this._getUserMemories(userId) : this.memories;
      const scored = [];
      for (const mem of userMemories) {
        const memSet = new Set(mem.embedding.topWords);
        const score = this._jaccardSimilarity(querySet, memSet);
        if (score >= threshold) {
          scored.push({ memory: mem, relevance: score });
        }
      }
      scored.sort((a, b) => b.relevance - a.relevance);
      const results = scored.slice(0, limit);
      logger.debug('LongTermMemory.search: found ' + results.length + ' results for user ' + userId);
      return results;
    } catch (err) {
      logger.error('LongTermMemory.search error: ' + err.message);
      return [];
    }
  }

  recall(userId, topic, limit = 20) {
    try {
      if (!userId) return [];
      if (!topic) return this._getUserMemories(userId).slice(-limit).reverse();
      const results = this.memories
        .filter(m => m.userId === userId && m.metadata && m.metadata.topic === topic)
        .slice(-limit)
        .reverse();
      logger.debug('LongTermMemory.recall: found ' + results.length + ' memories for topic ' + topic);
      return results;
    } catch (err) {
      logger.error('LongTermMemory.recall error: ' + err.message);
      return [];
    }
  }

  getContext(userId, query, maxTokens = 2000) {
    try {
      const searchResults = this.search(userId, query, 5, 0.2);
      const recent = userId ? this._getUserMemories(userId).slice(-10) : [];
      const seen = new Set();
      const combined = [];
      for (const sr of searchResults) {
        if (!seen.has(sr.memory.id)) {
          combined.push(sr.memory);
          seen.add(sr.memory.id);
        }
      }
      for (const mem of recent) {
        if (!seen.has(mem.id)) {
          combined.push(mem);
          seen.add(mem.id);
        }
      }
      let context = '';
      for (const mem of combined) {
        const line = '[' + mem.role + '] ' + mem.content + '\n';
        if ((context.length + line.length) > maxTokens) break;
        context += line;
      }
      return context.trim();
    } catch (err) {
      logger.error('LongTermMemory.getContext error: ' + err.message);
      return '';
    }
  }

  summarize(userId, timeRange) {
    try {
      if (!userId) return { error: 'userId is required' };
      let mems = this._getUserMemories(userId);
      if (timeRange) {
        const cutoff = Date.now() - timeRange;
        mems = mems.filter(m => new Date(m.timestamp).getTime() >= cutoff);
      }
      if (mems.length === 0) {
        return { topics: [], emotions: [], learningProgress: [], memoryCount: 0 };
      }
      const topics = {};
      const emotions = {};
      for (const mem of mems) {
        if (mem.metadata && mem.metadata.topic) {
          topics[mem.metadata.topic] = (topics[mem.metadata.topic] || 0) + 1;
        }
        if (mem.metadata && mem.metadata.emotion) {
          emotions[mem.metadata.emotion] = (emotions[mem.metadata.emotion] || 0) + 1;
        }
      }
      const topTopics = Object.entries(topics).sort((a, b) => b[1] - a[1]).map(e => e[0]);
      const topEmotions = Object.entries(emotions).sort((a, b) => b[1] - a[1]).map(e => e[0]);
      const learningProgress = [];
      if (this.evolution[userId]) {
        for (const [topic, data] of Object.entries(this.evolution[userId])) {
          learningProgress.push({ topic: topic, currentLevel: data.currentLevel, history: data.history });
        }
      }
      return {
        topics: topTopics,
        emotions: topEmotions,
        learningProgress: learningProgress,
        memoryCount: mems.length,
        timeRange: timeRange || 'all'
      };
    } catch (err) {
      logger.error('LongTermMemory.summarize error: ' + err.message);
      return { error: err.message };
    }
  }

  getLearningProfile(userId) {
    try {
      if (!userId) return { error: 'userId is required' };
      const mems = this._getUserMemories(userId);
      const knownTopics = [];
      const topicCount = {};
      const emotionCount = {};
      let totalInteractions = mems.length;
      let totalSessionLength = 0;
      let sessionCount = 0;
      for (const mem of mems) {
        if (mem.metadata && mem.metadata.topic) {
          topicCount[mem.metadata.topic] = (topicCount[mem.metadata.topic] || 0) + 1;
        }
        if (mem.metadata && mem.metadata.emotion) {
          emotionCount[mem.metadata.emotion] = (emotionCount[mem.metadata.emotion] || 0) + 1;
        }
        if (mem.metadata && mem.metadata.sessionLength) {
          totalSessionLength += mem.metadata.sessionLength;
          sessionCount++;
        }
      }
      for (const [topic, count] of Object.entries(topicCount)) {
        knownTopics.push({ topic: topic, count: count });
      }
      const sortedTopics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]);
      const favoriteSubjects = sortedTopics.slice(0, 3).map(e => e[0]);
      const struggleAreas = [];
      if (this.evolution[userId]) {
        for (const [topic, data] of Object.entries(this.evolution[userId])) {
          if (data.currentLevel < 2) {
            struggleAreas.push(topic);
          }
        }
      }
      const sortedEmotions = Object.entries(emotionCount).sort((a, b) => b[1] - a[1]);
      const emotionalTrend = sortedEmotions.length > 0 ? sortedEmotions[0][0] : 'neutral';
      const averageSessionLength = sessionCount > 0 ? Math.round(totalSessionLength / sessionCount) : 0;
      return {
        knownTopics: knownTopics,
        favoriteSubjects: favoriteSubjects,
        struggleAreas: struggleAreas,
        emotionalTrend: emotionalTrend,
        totalInteractions: totalInteractions,
        averageSessionLength: averageSessionLength
      };
    } catch (err) {
      logger.error('LongTermMemory.getLearningProfile error: ' + err.message);
      return { error: err.message };
    }
  }

  trackEvolution(userId, topic, level) {
    try {
      if (!userId || !topic || level === undefined || level === null) {
        return { error: 'userId, topic, and level are required' };
      }
      if (!this.evolution[userId]) {
        this.evolution[userId] = {};
      }
      const previousLevel = this.evolution[userId][topic]
        ? this.evolution[userId][topic].currentLevel
        : null;
      this.evolution[userId][topic] = {
        currentLevel: level,
        history: this.evolution[userId][topic]
          ? [...this.evolution[userId][topic].history, { level: level, timestamp: new Date().toISOString() }]
          : [{ level: level, timestamp: new Date().toISOString() }]
      };
      let progression = 'initial';
      if (previousLevel !== null) {
        if (level > previousLevel) progression = 'improved';
        else if (level < previousLevel) progression = 'regressed';
        else progression = 'stable';
      }
      this.emit('evolution:tracked', { userId, topic, previousLevel, newLevel: level, progression });
      logger.info('LongTermMemory.trackEvolution: ' + userId + ' topic=' + topic + ' level=' + level + ' (' + progression + ')');
      return { topic: topic, previousLevel: previousLevel, newLevel: level, progression: progression };
    } catch (err) {
      logger.error('LongTermMemory.trackEvolution error: ' + err.message);
      return { error: err.message };
    }
  }

  forget(userId, pattern) {
    try {
      if (!userId) return 0;
      if (!pattern) return 0;
      const before = this.memories.length;
      if (typeof pattern === 'string') {
        this.memories = this.memories.filter(m => {
          if (m.userId !== userId) return true;
          return !m.content.includes(pattern);
        });
      } else if (pattern instanceof RegExp) {
        this.memories = this.memories.filter(m => {
          if (m.userId !== userId) return true;
          return !pattern.test(m.content);
        });
      } else if (typeof pattern === 'function') {
        this.memories = this.memories.filter(m => {
          if (m.userId !== userId) return true;
          return !pattern(m);
        });
      } else {
        return 0;
      }
      const removed = before - this.memories.length;
      logger.info('LongTermMemory.forget: removed ' + removed + ' memories for user ' + userId);
      this.emit('memory:forgotten', { userId, count: removed });
      return removed;
    } catch (err) {
      logger.error('LongTermMemory.forget error: ' + err.message);
      return 0;
    }
  }

  getStats() {
    try {
      const userIds = new Set(this.memories.map(m => m.userId));
      const topics = {};
      let totalSize = 0;
      for (const mem of this.memories) {
        totalSize += mem.content ? mem.content.length : 0;
        if (mem.metadata && mem.metadata.topic) {
          topics[mem.metadata.topic] = (topics[mem.metadata.topic] || 0) + 1;
        }
      }
      const topTopics = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
      const oldest = this.memories.length > 0
        ? this.memories.reduce((a, b) => new Date(a.timestamp) < new Date(b.timestamp) ? a : b)
        : null;
      const newest = this.memories.length > 0
        ? this.memories.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b)
        : null;
      return {
        totalMemories: this.memories.length,
        uniqueUsers: userIds.size,
        topTopics: topTopics,
        memorySize: totalSize,
        oldestMemory: oldest ? oldest.timestamp : null,
        newestMemory: newest ? newest.timestamp : null
      };
    } catch (err) {
      logger.error('LongTermMemory.getStats error: ' + err.message);
      return { error: err.message };
    }
  }

  clear() {
    try {
      const count = this.memories.length;
      this.memories = [];
      this.evolution = {};
      this.emit('memory:cleared', { count: count });
      logger.info('LongTermMemory.clear: cleared ' + count + ' memories');
      return { cleared: count };
    } catch (err) {
      logger.error('LongTermMemory.clear error: ' + err.message);
      return { error: err.message };
    }
  }
}

module.exports = LongTermMemory;
