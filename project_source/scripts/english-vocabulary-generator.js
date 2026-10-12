/**
 * English Vocabulary Generator
 * Generates 1000+ words across CEFR levels (Pre-A1 to B1)
 * Sources: Oxford Wordlist, Cambridge English, European Framework
 * Outputs: server.js-compatible array + docs/content.js-compatible array
 */

const fs = require('fs');
const path = require('path');

function generateAll() {
  const words = {};
  words.pre_a1 = require('./vocab-pre-a1');
  words.a1 = require('./vocab-a1');
  words.a2 = require('./vocab-a2');
  words.b1 = require('./vocab-b1');

  // Merge all levels
  const allWords = [];
  for (const [level, list] of Object.entries(words)) {
    for (const w of list) {
      allWords.push({ ...w, level });
    }
  }
  return allWords;
}

function generateServerFormat() {
  const all = generateAll();
  const levelMap = { pre_a1: 'primary1', a1: 'primary2', a2: 'primary3', b1: 'primary4' };
  return all.map(w => ({
    word: w.word,
    meaning: w.meaning,
    phonetic: w.phonetic,
    example: w.example.replace(/"/g, "'"),
    level: levelMap[w.level] || 'primary1'
  }));
}

function generateContentFormat() {
  const all = generateAll();
  return all.map(w => ({
    word: w.word,
    meaning: `${w.meaning} - ${w.phonetic}`,
    example: w.example
  }));
}

if (require.main === module) {
  const serverData = generateServerFormat();
  const contentData = generateContentFormat();

  const outDir = path.join(__dirname, '..', 'data');
  fs.writeFileSync(path.join(outDir, 'english-vocabulary-server.json'), JSON.stringify(serverData, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'english-vocabulary-content.json'), JSON.stringify(contentData, null, 2), 'utf8');

  console.log(`✅ Generated ${serverData.length} words for server.js`);
  console.log(`✅ Generated ${contentData.length} words for docs/content.js`);
}

module.exports = { generateAll, generateServerFormat, generateContentFormat };
