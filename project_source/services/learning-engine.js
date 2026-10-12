const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DEFAULT_FORGETTING_FACTOR = 0.1;
const MASTERY_INCREASE = 0.2;
const MASTERY_DECREASE = 0.1;
const MAX_MASTERY = 1.0;
const MIN_MASTERY = 0.0;
const PROFILE_FILE = path.join(__dirname, '..', 'data', 'learning-profiles.json');

class LearningEngine extends EventEmitter {
  constructor() {
    super();
    this.ready = false;
    this.contentIndex = {};
    this.vocabulary = [];
    this.scrapedContent = [];
    this.grammarRules = [];
    this.stories = [];
    this.scienceFacts = [];
    this.mathQuestions = [];
    this.cultureContent = [];
    this.progressRecords = {};
    this.learningProfiles = {};
    this.indexDirty = true;
    this.forgettingFactor = DEFAULT_FORGETTING_FACTOR;
    this._init();
  }

  _init() {
    this._loadVocabulary();
    this._loadScrapedContent();
    this._loadBuiltinContent();
    this._loadContentFiles();
    this._loadLearningProfiles();
    this.ready = true;
    const total = this.vocabulary.length + this.scrapedContent.length + (this.structuredContent ? this.structuredContent.length : 0);
    logger.info(`LearningEngine ready: ${this.vocabulary.length} words, ${this.scrapedContent.length} scraped, ${this.structuredContent ? this.structuredContent.length : 0} structured`);
    this.emit('ready');
  }

  _loadLearningProfiles() {
    try {
      if (fs.existsSync(PROFILE_FILE)) {
        this.learningProfiles = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
        logger.info(`Loaded ${Object.keys(this.learningProfiles).length} learning profiles`);
      }
    } catch (e) {
      logger.warn('Failed to load learning profiles', { error: e.message });
      this.learningProfiles = {};
    }
  }

  _saveLearningProfiles() {
    try {
      const dir = path.dirname(PROFILE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(this.learningProfiles, null, 2), 'utf8');
    } catch (e) {
      logger.warn('Failed to save learning profiles', { error: e.message });
    }
  }

  _loadVocabulary() {
    try {
      const p = path.join(__dirname, '..', 'data', 'english-vocabulary-server.json');
      if (fs.existsSync(p)) {
        this.vocabulary = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {
      logger.warn('Failed to load vocabulary', { error: e.message });
    }
  }

  _loadScrapedContent() {
    this.scrapedContent = [];
    const scrapedDir = path.join(__dirname, '..', 'data', 'scraped-content');
    const dbPath = path.join(__dirname, '..', 'data', 'content-database.json');
    const seen = new Set();
    try {
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (db.entries) {
          for (let i = 0; i < db.entries.length; i++) {
            const e = db.entries[i];
            const entry = {
              id: `scraped-${i}`,
              category: e.category || 'uncategorized',
              type: e.type || 'article',
              topic: e.topic || '',
              title: e.topic || e.content?.substring(0, 50) || 'Untitled',
              content: e.content || '',
              source: e.source || 'unknown',
              sourceUrl: (e.sourceUrl || e.url || ''),
              language: e.language || 'zh',
              scrapedAt: e.scrapedAt || ''
            };
            const key = entry.content.substring(0, 100) + (entry.sourceUrl || '');
            if (!seen.has(key)) {
              seen.add(key);
              this.scrapedContent.push(entry);
            }
          }
        }
      }
      if (fs.existsSync(scrapedDir)) {
        const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(scrapedDir, file), 'utf8'));
            const arr = Array.isArray(data) ? data : (data.data || data.entries || []);
            const cat = file.replace('.json', '');
            for (let i = 0; i < arr.length; i++) {
              const item = arr[i];
              if (!item.id) item.id = `${cat}-${i}`;
              if (!item.category) item.category = cat;
              const key = (item.content || '').substring(0, 100) + (item.url || item.sourceUrl || '');
              if (!seen.has(key)) {
                seen.add(key);
                this.scrapedContent.push(item);
              }
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) {
      logger.warn('Failed to load scraped content', { error: e.message });
    }
  }

  _loadBuiltinContent() {
    const inlineMath = require('./content-generator');
    this.mathQuestions = inlineMath.generateMathProblems ? inlineMath.generateMathProblems(500) : [];
    this.grammarRules = [
      { rule: 'Present Simple', level: 'primary1', example: 'I eat apples.' },
      { rule: 'Present Continuous', level: 'primary2', example: 'I am eating.' },
      { rule: 'Past Simple', level: 'primary3', example: 'I ate apples.' },
      { rule: 'Future Simple', level: 'primary4', example: 'I will eat.' },
      { rule: 'Present Perfect', level: 'primary5', example: 'I have eaten.' },
    ];
  }

  _getLevel(level) {
    if (!level) return 'primary1';
    const m = level.match(/primary(\d)/i);
    if (m) return 'primary' + m[1];
    return 'primary1';
  }

  _loadContentFiles() {
    this.structuredContent = [];
    const dataDir = path.join(__dirname, '..', 'data');
    const contentFiles = ['content-math.json', 'content-science.json', 'content-stories.json', 'content-grammar-fun.json', 'content-tech.json', 'content-engineering.json', 'content-arts.json', 'content-music.json', 'content-history.json', 'content-geography.json', 'content-biology.json', 'content-physics.json', 'content-chemistry.json', 'content-coding.json', 'content-zh.json'];
    for (const file of contentFiles) {
      try {
        const p = path.join(dataDir, file);
        if (!fs.existsSync(p)) continue;
        const raw = fs.readFileSync(p, 'utf8');
        // Strip BOM
        const clean = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
        const data = JSON.parse(clean);
        if (!Array.isArray(data)) continue;
        this.structuredContent.push(...data);
        logger.info(`Loaded ${data.length} items from ${file}`);
      } catch (e) {
        logger.warn(`Failed to load ${file}`, { error: e.message });
      }
    }
  }

  // ─── Learning Profile & Adaptive Difficulty ─────────────────────
  getOrCreateProfile(userId) {
    if (!this.learningProfiles[userId]) {
      this.learningProfiles[userId] = {
        history: [],
        masteryLevels: {},
        difficultyCounts: { easy: 0, medium: 0, hard: 0 },
        preferredDifficulty: 'medium',
        avgResponseTime: 0,
        interactionCount: 0,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        strengths: [],
        weaknesses: [],
        recentTopics: [],
        reviewedItems: {}
      };
    }
    this.learningProfiles[userId].lastActive = new Date().toISOString();
    return this.learningProfiles[userId];
  }

  recordLearningPerformance(userId, contentId, success, timeSpent, difficulty) {
    const profile = this.getOrCreateProfile(userId);
    profile.history.push({
      contentId, timestamp: Date.now(), success, timeSpent, difficulty
    });
    profile.interactionCount++;

    if (!profile.masteryLevels[contentId]) profile.masteryLevels[contentId] = 0.5;
    profile.masteryLevels[contentId] = success
      ? Math.min(MAX_MASTERY, profile.masteryLevels[contentId] + MASTERY_INCREASE)
      : Math.max(MIN_MASTERY, profile.masteryLevels[contentId] - MASTERY_DECREASE);

    profile.avgResponseTime = profile.interactionCount === 1
      ? timeSpent
      : (profile.avgResponseTime * (profile.interactionCount - 1) + timeSpent) / profile.interactionCount;

    const recent = profile.history.slice(-10);
    const successRate = recent.filter(h => h.success).length / Math.max(1, recent.length);
    if (successRate > 0.8 && profile.difficultyCounts.hard < 1) {
      profile.preferredDifficulty = 'hard';
    } else if (successRate < 0.4) {
      profile.preferredDifficulty = 'easy';
    } else {
      profile.preferredDifficulty = 'medium';
    }

    const content = this.contentIndex[contentId];
    if (content) {
      const topic = (content.title || content.category || '').substring(0, 30);
      if (!profile.recentTopics.includes(topic)) {
        profile.recentTopics.unshift(topic);
        if (profile.recentTopics.length > 20) profile.recentTopics.pop();
      }
      const cat = content.category || 'general';
      if (success) {
        if (!profile.strengths.includes(cat)) profile.strengths.push(cat);
      } else {
        if (!profile.weaknesses.includes(cat)) profile.weaknesses.push(cat);
      }
    }

    this._saveLearningProfiles();
    return { success: true, profile };
  }

  getAdaptiveDifficultySuggestion(userId, contentType) {
    const profile = this.getOrCreateProfile(userId);
    const history = profile.history;
    const lastReview = history.slice().reverse().find(h => {
      const c = this.contentIndex[h.contentId];
      return c && (!contentType || c.category === contentType || c.type === contentType);
    });

    let difficultyAdjustment = 0;
    if (lastReview) {
      const hoursSinceReview = (Date.now() - lastReview.timestamp) / (1000 * 60 * 60);
      const retention = Math.exp(-this.forgettingFactor * hoursSinceReview);
      if (retention < 0.5) difficultyAdjustment = -0.25;
    }

    const levels = ['easy', 'medium', 'hard'];
    const baseIdx = levels.indexOf(profile.preferredDifficulty);
    const adjIdx = Math.max(0, Math.min(2, baseIdx + Math.round(difficultyAdjustment)));
    return levels[adjIdx];
  }

  getKnowledgeGraphConnections(contentId, limit = 5) {
    const source = this.contentIndex[contentId];
    if (!source) return [];
    const related = [];
    const sourceTags = new Set(source.tags || []);
    const sourceCat = (source.category || '').toLowerCase();
    const sourceLevel = this._getLevel(source.level || 'primary1');

    for (const [id, item] of Object.entries(this.contentIndex)) {
      if (id === contentId) continue;
      let score = 0;
      const itemTags = new Set(item.tags || []);
      const common = [...sourceTags].filter(t => itemTags.has(t));
      score += common.length * 0.3;
      const itemCat = (item.category || '').toLowerCase();
      if (itemCat === sourceCat) score += 0.2;
      const itemLevel = this._getLevel(item.level || 'primary1');
      if (itemLevel < sourceLevel) score += 0.15;
      if (itemLevel > sourceLevel) score += 0.1;
      if (item.title && source.title && item.title.toLowerCase().includes(source.title.toLowerCase().slice(0, 4))) score += 0.25;
      if (item.content && source.content) {
        const srcWords = new Set(source.content.toLowerCase().split(/\s+/).slice(0, 20));
        const itemWords = item.content.toLowerCase().split(/\s+/);
        const overlap = itemWords.filter(w => srcWords.has(w)).length / Math.max(1, srcWords.size);
        if (overlap > 0.3) score += 0.2;
      }
      if (score > 0.3) related.push({ id, title: item.title, category: itemCat, score, level: itemLevel });
    }
    return related.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  getForgettingCurveReviewItems(userId, limit = 5) {
    const profile = this.getOrCreateProfile(userId);
    const now = Date.now();
    const needsReview = [];
    const seen = new Set();

    for (const h of profile.history) {
      if (seen.has(h.contentId)) continue;
      seen.add(h.contentId);
      const hoursAgo = (now - h.timestamp) / (1000 * 60 * 60);
      const mastery = profile.masteryLevels[h.contentId] || 0.5;
      const retention = Math.exp(-this.forgettingFactor * hoursAgo);
      const urgency = (1 - retention) * (1 - mastery);

      if (urgency > 0.3 && hoursAgo > 1) {
        needsReview.push({
          contentId: h.contentId,
          lastReviewed: h.timestamp,
          hoursAgo: Math.round(hoursAgo),
          mastery: Math.round(mastery * 100),
          urgency: Math.round(urgency * 100),
          retention: Math.round(retention * 100)
        });
      }
    }
    return needsReview.sort((a, b) => b.urgency - a.urgency).slice(0, limit);
  }

  getLearningProfile(userId) {
    const profile = this.learningProfiles[userId];
    if (!profile) return null;
    const history = profile.history;
    const recentSuccess = history.slice(-20).filter(h => h.success).length / Math.max(1, Math.min(20, history.length));
    return {
      preferredDifficulty: profile.preferredDifficulty,
      avgResponseTime: Math.round(profile.avgResponseTime),
      interactionCount: profile.interactionCount,
      recentSuccessRate: Math.round(recentSuccess * 100),
      strengths: profile.strengths.slice(-5),
      weaknesses: profile.weaknesses.slice(-5),
      recentTopics: profile.recentTopics.slice(-5),
      totalHistory: history.length
    };
  }

  _buildIndex() {
    if (!this.indexDirty) return;
    this.contentIndex = {};
    for (const w of this.vocabulary) {
      this.contentIndex[`vocab-${w.word}`] = {
        id: `vocab-${w.word}`,
        type: 'vocabulary',
        category: 'english',
        title: w.word,
        meaning: w.meaning,
        phonetic: w.phonetic,
        example: w.example,
        level: w.level,
        content: `${w.word}: ${w.meaning} - ${w.example}`
      };
    }
    for (const s of this.scrapedContent) {
      const id = s.id || `scraped-${Math.random().toString(36).slice(2,8)}`;
      this.contentIndex[id] = {
        id,
        type: 'scraped',
        category: s.category || 'uncategorized',
        title: s.topic || s.title || s.category || 'Untitled',
        content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content),
        source: s.source,
        language: s.language
      };
    }
    for (const s of (this.structuredContent || [])) {
      if (!s.id || !s.title) continue;
      this.contentIndex[s.id] = {
        id: s.id,
        type: typeof s.type === 'string' ? s.type : 'lesson',
        category: typeof s.category === 'string' ? s.category : 'uncategorized',
        title: s.title,
        content: typeof s.content === 'string' ? s.content : '',
        level: this._getLevel(s.level),
        language: s.language || 'en',
        tags: Array.isArray(s.tags) ? s.tags : []
      };
    }
    this.indexDirty = false;
  }

  markIndexDirty() {
    this.indexDirty = true;
  }

  search(query, options = {}) {
    if (!this.ready) return { data: [], total: 0 };
    this._buildIndex();
    const { type, category, level, limit = 20, offset = 0, userId } = options;
    const q = (query || '').toLowerCase().trim();
    let results = Object.values(this.contentIndex);

    if (q) {
      results = results.filter(item => {
        try {
          return (item.title && String(item.title).toLowerCase().includes(q)) ||
            (item.content && String(item.content).toLowerCase().includes(q)) ||
            (item.meaning && String(item.meaning).toLowerCase().includes(q)) ||
            (item.example && String(item.example).toLowerCase().includes(q)) ||
            (item.category && String(item.category).toLowerCase().includes(q)) ||
            (item.tags && Array.isArray(item.tags) && item.tags.some(t => String(t).toLowerCase().includes(q)));
        } catch (_) { return false; }
      });
    }
    if (type) {
      const t = type.toLowerCase();
      results = results.filter(item => String(item.type || '').toLowerCase() === t);
    }
    if (category) {
      const c = category.toLowerCase();
      results = results.filter(item => String(item.category || '').toLowerCase() === c);
    }
    if (level) {
      const l = level.toLowerCase();
      results = results.filter(item => String(item.level || '').toLowerCase() === l);
    }

    const result = {
      data: results.slice(offset, offset + limit),
      total: results.length,
      offset, limit
    };

    if (userId) {
      result.adaptiveDifficulty = this.getAdaptiveDifficultySuggestion(userId, category || type);
      result.profile = this.getLearningProfile(userId);
      result.needsReview = this.getForgettingCurveReviewItems(userId, 3);
      if (result.data.length > 0) {
        result.data = result.data.map(item => ({
          ...item,
          relatedContent: this.getKnowledgeGraphConnections(item.id, 3)
        }));
      }
    }

    return result;
  }

  getByCategory(category, limit = 20, offset = 0) {
    if (!this.ready) return { data: [], total: 0 };
    // Search structured content and scraped content by category
    const items = [];
    if (this.structuredContent) {
      for (const s of this.structuredContent) {
        if (s.category && s.category.toLowerCase() === category.toLowerCase()) {
          items.push({ id: s.id, title: s.title, content: (s.content || '').substring(0, 200), category: s.category, type: s.type, level: this._getLevel(s.level), tags: s.tags });
        }
      }
    }
    for (const s of this.scrapedContent) {
      if (s.category && s.category.toLowerCase() === category.toLowerCase()) {
        items.push({ id: s.id, title: s.topic || s.title || s.category, content: typeof s.content === 'string' ? s.content.substring(0, 200) : '', category: s.category, type: s.type || 'scraped', source: s.source });
      }
    }
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  getAllStructuredCategories() {
    const cats = {};
    if (this.structuredContent) {
      for (const s of this.structuredContent) {
        const c = s.category || 'uncategorized';
        cats[c] = (cats[c] || 0) + 1;
      }
    }
    return cats;
  }

  getContentStats() {
    return {
      vocabulary: this.vocabulary.length,
      scraped: this.scrapedContent.length,
      structured: this.structuredContent ? this.structuredContent.length : 0,
      totalIndexed: Object.keys(this.contentIndex).length,
      structuredCategories: Object.keys(this.getAllStructuredCategories()).length,
      allCategories: Object.keys(this.getAllCategories()).length
    };
  }

  getVocabularyForStudy(count = 10, level, userId) {
    let pool = this.vocabulary;
    if (level) {
      pool = pool.filter(w => w.level === level);
    } else if (userId) {
      const profile = this.learningProfiles[userId];
      if (profile) {
        const diff = profile.preferredDifficulty;
        const levelMap = { easy: 'primary1', medium: 'primary3', hard: 'primary5' };
        const targetLevel = levelMap[diff] || 'primary3';
        pool = pool.filter(w => (w.level || 'primary1') <= targetLevel);
      }
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(w => ({
      word: w.word,
      meaning: w.meaning,
      phonetic: w.phonetic,
      example: w.example,
      level: w.level
    }));
  }

  generateQuiz(contentType = 'vocabulary', count = 5, level) {
    const questions = [];
    const subjects = {
      vocabulary: () => this._vocabQuestions(count, level),
      math: () => this._mathQuestions(count, level),
      grammar: () => this._grammarQuestions(count, level),
      science: () => this._scienceQuestions(count, level),
      mixed: () => {
        const perType = Math.max(1, Math.floor(count / 4));
        return [
          ...this._vocabQuestions(perType, level),
          ...this._mathQuestions(perType, level),
          ...this._grammarQuestions(perType, level),
          ...this._scienceQuestions(perType, level)
        ].slice(0, count);
      }
    };
    const gen = subjects[contentType] || subjects.vocabulary;
    return gen();
  }

  _vocabQuestions(count, level) {
    const words = this.getVocabularyForStudy(count * 3, level);
    return words.slice(0, count).map(w => {
      const wrong = this.vocabulary
        .filter(v => v.word !== w.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(v => v.meaning);
      const options = [w.meaning, ...wrong].sort(() => Math.random() - 0.5);
      return {
        type: 'vocabulary',
        question: `What does "${w.word}" mean?`,
        options,
        answer: w.meaning,
        phonetic: w.phonetic,
        example: w.example
      };
    });
  }

  _mathQuestions(count, level) {
    const ops = ['+', '-', '×', '÷'];
    const questions = [];
    for (let i = 0; i < count; i++) {
      const op = ops[Math.floor(Math.random() * 4)];
      let a, b, answer;
      if (level === 'primary1') {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
      } else if (level === 'primary2') {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
      } else {
        a = Math.floor(Math.random() * 100) + 1;
        b = Math.floor(Math.random() * 100) + 1;
      }
      switch (op) {
        case '+': answer = a + b; break;
        case '-': 
          if (a < b) [a, b] = [b, a];
          answer = a - b; 
          break;
        case '×': 
          a = Math.min(a, 12); b = Math.min(b, 12);
          answer = a * b; 
          break;
        case '÷':
          answer = Math.floor(a / (b || 1));
          a = answer * (b || 1);
          break;
      }
      const wrongs = new Set();
      wrongs.add(answer + Math.floor(Math.random() * 5) + 1);
      wrongs.add(Math.max(0, answer - Math.floor(Math.random() * 5) - 1));
      wrongs.add(answer + Math.floor(Math.random() * 10) + 2);
      const options = [answer, ...wrongs].sort(() => Math.random() - 0.5).map(String);
      questions.push({ type: 'math', question: `${a} ${op} ${b} = ?`, options, answer: String(answer) });
    }
    return questions;
  }

  _grammarQuestions(count, level) {
    const templates = [
      { q: 'I ___ apples every day.', options: ['eat', 'eats', 'eating', 'ate'], answer: 'eat', level: 'primary1' },
      { q: 'She ___ to school.', options: ['go', 'goes', 'going', 'went'], answer: 'goes', level: 'primary1' },
      { q: 'He ___ playing football now.', options: ['is', 'are', 'am', 'be'], answer: 'is', level: 'primary2' },
      { q: 'They ___ playing in the park yesterday.', options: ['are', 'were', 'was', 'is'], answer: 'were', level: 'primary2' },
      { q: 'I have ___ to London.', options: ['been', 'be', 'being', 'was'], answer: 'been', level: 'primary3' },
      { q: 'She ___ her homework yet.', options: ['hasn\'t finished', 'didn\'t finish', 'doesn\'t finish', 'isn\'t finishing'], answer: 'hasn\'t finished', level: 'primary3' },
      { q: 'If it rains, we ___ stay home.', options: ['will', 'would', 'are', 'were'], answer: 'will', level: 'primary4' },
      { q: 'This is ___ book.', options: ['my', 'me', 'I', 'mine'], answer: 'my', level: 'primary1' },
      { q: 'The cat is ___ the table.', options: ['under', 'on', 'in', 'at'], answer: 'under', level: 'primary1' },
      { q: '___ you like some water?', options: ['Would', 'Do', 'Are', 'Have'], answer: 'Would', level: 'primary2' },
    ];
    const filtered = level ? templates.filter(t => t.level === level) : templates;
    return filtered.slice(0, count).map(t => ({ ...t, type: 'grammar' }));
  }

  _scienceQuestions(count, level) {
    const templates = [
      { q: 'What planet is closest to the Sun?', options: ['Mercury', 'Venus', 'Earth', 'Mars'], answer: 'Mercury', level: 'primary2' },
      { q: 'How many bones are in the human body?', options: ['206', '106', '306', '156'], answer: '206', level: 'primary3' },
      { q: 'What gas do plants absorb?', options: ['CO2', 'O2', 'N2', 'H2'], answer: 'CO2', level: 'primary2' },
      { q: 'What is the boiling point of water?', options: ['100°C', '0°C', '50°C', '200°C'], answer: '100°C', level: 'primary1' },
      { q: 'Which animal can fly?', options: ['Bat', 'Fish', 'Dog', 'Snake'], answer: 'Bat', level: 'primary1' },
      { q: 'What keeps us on the ground?', options: ['Gravity', 'Magnetism', 'Friction', 'Air'], answer: 'Gravity', level: 'primary2' },
      { q: 'What is the largest organ in the body?', options: ['Skin', 'Liver', 'Heart', 'Brain'], answer: 'Skin', level: 'primary3' },
      { q: 'How many planets are in our solar system?', options: ['8', '9', '7', '10'], answer: '8', level: 'primary2' },
      { q: 'What do bees produce?', options: ['Honey', 'Milk', 'Wax', 'Silk'], answer: 'Honey', level: 'primary1' },
      { q: 'What is the fastest land animal?', options: ['Cheetah', 'Lion', 'Horse', 'Gazelle'], answer: 'Cheetah', level: 'primary2' },
    ];
    const filtered = level ? templates.filter(t => t.level === level) : templates;
    return filtered.slice(0, count).map(t => ({ ...t, type: 'science' }));
  }

  getScrapedContent(category, limit = 20, offset = 0) {
    let items = this.scrapedContent;
    if (category) items = items.filter(i => i.category === category);
    const sorted = [...items].sort((a, b) => {
      const aTime = a.scrapedAt ? new Date(a.scrapedAt).getTime() : 0;
      const bTime = b.scrapedAt ? new Date(b.scrapedAt).getTime() : 0;
      return bTime - aTime;
    });
    return { data: sorted.slice(offset, offset + limit), total: sorted.length };
  }

  getAllCategories() {
    const cats = {};
    this._buildIndex();
    for (const item of Object.values(this.contentIndex)) {
      const cat = item.category || 'uncategorized';
      cats[cat] = (cats[cat] || 0) + 1;
    }
    return cats;
  }

  recordProgress(userId, data) {
    const { contentType, itemId, score, completed } = data;
    if (!this.progressRecords[userId]) this.progressRecords[userId] = [];
    this.progressRecords[userId].push({
      contentType, itemId, score, completed,
      timestamp: new Date().toISOString()
    });
    return { success: true, totalRecords: this.progressRecords[userId].length };
  }

  getProgress(userId) {
    const records = this.progressRecords[userId] || [];
    const stats = {};
    for (const r of records) {
      if (!stats[r.contentType]) stats[r.contentType] = { total: 0, completed: 0, avgScore: 0 };
      stats[r.contentType].total++;
      if (r.completed) stats[r.contentType].completed++;
      stats[r.contentType].avgScore = (
        (stats[r.contentType].avgScore * (stats[r.contentType].total - 1) + (r.score || 0)) /
        stats[r.contentType].total
      );
    }
    return { records, stats };
  }

  getProfile(sessionId) {
    return this.learningProfiles[sessionId] || { sessionId, interactions: 0, topics: [] };
  }

  recordInteraction(sessionId, content) {
    if (!this.learningProfiles[sessionId]) {
      this.learningProfiles[sessionId] = { sessionId, interactions: 0, topics: [] };
    }
    this.learningProfiles[sessionId].interactions++;
    if (content && content.topic) {
      if (!this.learningProfiles[sessionId].topics.includes(content.topic)) {
        this.learningProfiles[sessionId].topics.push(content.topic);
      }
    }
  }

  getKnowledgeGraphSuggestions(sessionId, lastTopic) {
    const suggestions = [];
    const items = Object.values(this.contentIndex);
    if (lastTopic) {
      const related = items.filter(i => i.topic === lastTopic || (i.tags && i.tags.includes(lastTopic)));
      suggestions.push(...related.slice(0, 3).map(i => i.title || i.topic));
    }
    if (suggestions.length === 0) {
      const random = items[Math.floor(Math.random() * items.length)];
      if (random) suggestions.push(random.title || random.topic);
    }
    return suggestions;
  }

  getByCategory(category, limit = 10) {
    const items = Object.values(this.contentIndex).filter(i => i.category === category);
    return items.slice(0, limit);
  }

  getVocabularyForStudy(count = 5) {
    return this.vocabulary.slice(0, count);
  }

  generateQuiz(subject, count = 5) {
    const quizzes = [];
    for (let i = 0; i < count; i++) {
      quizzes.push({
        id: `quiz_${i}`,
        question: `Sample ${subject} question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
        subject
      });
    }
    return quizzes;
  }

  getProfileCount() {
    return Object.keys(this.learningProfiles).length;
  }

  getKnowledgeGraphStats() {
    return { nodes: Object.values(this.contentIndex).length, edges: 0 };
  }

  getDueReviewCount() {
    return 0;
  }
}

module.exports = new LearningEngine();
