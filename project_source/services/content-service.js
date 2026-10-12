const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const contentGenerator = require('./content-generator');

const DATA_FILE = path.join(__dirname, '..', 'data', 'content-store.json');

class ContentService extends EventEmitter {
  constructor() {
    super();
    this.items = [];
    this.ready = false;
    this._readyPromise = this.init();
  }

  async waitForReady() {
    await this._readyPromise;
    return this;
  }

  async init() {
    const loaded = await this._loadFromDisk();
    if (loaded && this.items.length > 500) {
      logger.info(`Content service initialized from disk: ${this.items.length} items`);
    } else {
      const generated = contentGenerator.generateAllCategories(90);
      this.items = generated;
      logger.info(`Content service initialized with parametric generation: ${this.items.length} items`);
      await this._saveToDisk();
    }
    this.ready = true;
    this.emit('ready', { totalItems: this.items.length });
  }

  mergeScraped(scrapedItems) {
    const existingIds = new Set(this.items.map(i => i.id));
    let added = 0;
    for (const item of scrapedItems) {
      if (!existingIds.has(item.id)) {
        this.items.push(item);
        existingIds.add(item.id);
        added++;
      }
    }
    if (added > 0) {
      logger.info(`Content service merged ${added} scraped items (total: ${this.items.length})`);
      this._saveToDisk();
    }
    return added;
  }

  _stem(word) {
    const w = word.toLowerCase().trim();
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f';
    if (w.endsWith('es') && (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('ches') || w.endsWith('shes'))) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
    return w;
  }

  search(query, options = {}) {
    const { category, level, limit = 50, offset = 0, minWords, maxWords, language } = options;
    let results = this.items;

    if (query) {
      const q = query.toLowerCase();
      const stems = [q, this._stem(q)].filter((v, i, a) => a.indexOf(v) === i);
      results = results.filter(i => {
        const title = i.title.toLowerCase();
        const content = i.content.toLowerCase();
        const cat = i.category.toLowerCase();
        return stems.some(s => title.includes(s) || content.includes(s) || cat.includes(s));
      });
    }
    if (category) results = results.filter(i => i.category === category);
    if (language) results = results.filter(i => i.language === language);
    if (level) {
      const l = level.toLowerCase();
      results = results.filter(i => i.title.toLowerCase().includes(`(${l})`));
    }
    if (minWords) results = results.filter(i => (i.wordCount || 0) >= minWords);
    if (maxWords) results = results.filter(i => (i.wordCount || 0) <= maxWords);

    return {
      data: results.slice(offset, offset + limit),
      total: results.length,
      offset,
      limit
    };
  }

  getByCategory(category, limit = 100, offset = 0) {
    const items = this.items.filter(i => i.category === category);
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  getById(id) {
    return this.items.find(i => i.id === id) || null;
  }

  getStats() {
    const byCategory = {};
    const byContentType = {};
    let totalWords = 0;

    for (const item of this.items) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      byContentType[item.contentType] = (byContentType[item.contentType] || 0) + 1;
      totalWords += item.wordCount || 0;
    }

    return {
      totalItems: this.items.length,
      totalWords,
      avgWords: this.items.length > 0 ? Math.round(totalWords / this.items.length) : 0,
      categories: Object.keys(byCategory).length,
      byCategory,
      byContentType,
      ready: this.ready
    };
  }

  getByDifficulty(level, limit = 50, offset = 0) {
    const l = level.toLowerCase();
    const items = this.items.filter(i => {
      const titleLower = i.title.toLowerCase();
      return titleLower.includes(`(${l})`) || titleLower.includes(`(${l[0]})`);
    });
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  getForChild(childAge, category, limit = 20) {
    let items = this.items;
    if (category) items = items.filter(i => i.category === category);
    if (childAge < 7) {
      const basic = items.filter(i => i.title.toLowerCase().includes('(basic)'));
      return basic.slice(0, limit);
    } else if (childAge < 11) {
      const basic = items.filter(i => i.title.toLowerCase().includes('(basic)'));
      const inter = items.filter(i => i.title.toLowerCase().includes('(intermediate)'));
      return [...basic.slice(0, Math.ceil(limit / 2)), ...inter.slice(0, Math.floor(limit / 2))];
    } else {
      const inter = items.filter(i => i.title.toLowerCase().includes('(intermediate)'));
      const adv = items.filter(i => i.title.toLowerCase().includes('(advanced)'));
      return [...inter.slice(0, Math.ceil(limit / 2)), ...adv.slice(0, Math.floor(limit / 2))];
    }
  }

  async _saveToDisk() {
    try {
      const data = JSON.stringify({
        savedAt: new Date().toISOString(),
        count: this.items.length,
        items: this.items
      });
      fs.writeFileSync(DATA_FILE, data, 'utf-8');
      return true;
    } catch (err) {
      logger.error('Failed to save content store', { error: err.message });
      return false;
    }
  }

  async _loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_FILE)) return false;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.items && Array.isArray(data.items)) {
        this.items = data.items;
        logger.info(`Loaded ${this.items.length} content items from disk (saved: ${data.savedAt})`);
        return true;
      }
      return false;
    } catch (err) {
      logger.warn('Failed to load content store from disk, will regenerate', { error: err.message });
      return false;
    }
  }
}

module.exports = new ContentService();