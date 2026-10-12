'use strict';
module.exports = {
  async waitForReady() {},
  items: [],
  search(q, params) { return { items: [], total: 0 }; },
  getByCategory(cat, limit, offset) { return { items: [], total: 0 }; },
  getById(id) { return null; },
  getForChild(age, category, limit) { return []; },
  getStats() { return {}; },
  mergeScraped(items) { return 0; },
  incrementViewCount(id) { return 0; },
  ready: true,
  async init() {}
};