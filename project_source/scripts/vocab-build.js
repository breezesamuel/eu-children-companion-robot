const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'data', 'english-vocabulary-server.json');
const DST = path.join(__dirname, '..', 'data', 'english-vocabulary-content.json');

const existing = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const seen = new Set(existing.map(w => w.word.toLowerCase()));
const contentExist = JSON.parse(fs.readFileSync(DST, 'utf8'));
const seenContent = new Set(contentExist.map(w => w.word.toLowerCase()));

// Load all vocabulary data parts
let WORD_DATA = [];
const dataDir = __dirname;
for (let i = 1; i <= 3; i++) {
  const p = path.join(dataDir, `vocab-data-part${i}.js`);
  if (fs.existsSync(p)) {
    const part = require(p);
    if (Array.isArray(part)) WORD_DATA = WORD_DATA.concat(part);
    console.log(`Loaded part${i}: ${part.length} words`);
  }
}
// Load generator output
const genPath = path.join(dataDir, 'vocab-word-data.json');
if (fs.existsSync(genPath)) {
  const genData = JSON.parse(fs.readFileSync(genPath, 'utf8'));
  if (genData && Array.isArray(genData.words)) {
    WORD_DATA = WORD_DATA.concat(genData.words);
    console.log(`Loaded generator: ${genData.words.length} words`);
  }
}

let newCount = 0;
let newContentCount = 0;

for (const entry of WORD_DATA) {
  const [word, meaning, phonetic, example, level] = entry;
  const key = word.toLowerCase();
  if (!seen.has(key)) {
    existing.push({ word, meaning, phonetic, example, level });
    seen.add(key);
    newCount++;
  }
  if (!seenContent.has(key)) {
    contentExist.push({
      word: word,
      meaning: meaning + ' - ' + phonetic,
      example: example
    });
    seenContent.add(key);
    newContentCount++;
  }
}

console.log('Server: added', newCount, 'Total:', existing.length);
console.log('Content: added', newContentCount, 'Total:', contentExist.length);
const lvls = {}; existing.forEach(x => { lvls[x.level] = (lvls[x.level]||0)+1; });
console.log('Levels:', JSON.stringify(lvls));

fs.writeFileSync(SRC, JSON.stringify(existing, null, 2));
fs.writeFileSync(DST, JSON.stringify(contentExist, null, 2));
console.log('Written successfully!');
