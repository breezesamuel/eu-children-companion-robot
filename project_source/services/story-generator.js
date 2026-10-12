'use strict';
module.exports = {
  isAvailable() { return true; },
  async generate(opts) { return { title: 'Generated Story', content: 'Once upon a time...' }; }
};