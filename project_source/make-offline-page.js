const smartedu = require('./services/smartedu-ingestion');
const fs = require('fs');

const data = smartedu.getAll();
const stats = smartedu.getStats();

function simplify(books) {
  return books.map(b => ({
    id: b.contentId.substring(0, 8),
    title: b.title,
    subject: b.euSubjectName,
    grade: b.originalGrade,
    stage: b.originalStage,
    version: b.version,
    semester: b.semester,
    euLevel: b.euLevel,
    age: b.age
  }));
}

const simplified = {};
for (const [level, subjects] of Object.entries(data.byLevel)) {
  simplified[level] = {};
  for (const [subject, books] of Object.entries(subjects)) {
    simplified[level][subject] = simplify(books);
  }
}

const dataJson = JSON.stringify(simplified);
const statsJson = JSON.stringify(stats);

let html = fs.readFileSync('docs/smartedu-browser.html', 'utf8');

// Replace the init function and add embedded data
const oldInit = html.indexOf('async function init()');
const oldInitEnd = html.indexOf('init();', oldInit);
const initBlockEnd = html.indexOf('</script>', oldInitEnd);

const embeddedScript = `
const SMARTEDU_DATA = ${dataJson};
const SMARTEDU_STATS = ${statsJson};

function init() {
  document.getElementById('status').textContent = '● Offline Mode (' + SMARTEDU_STATS.total.toLocaleString() + ' books)';
  document.getElementById('status').style.color = '#10b981';
  document.getElementById('totalBooks').textContent = SMARTEDU_STATS.total.toLocaleString();
  document.getElementById('totalSubjects').textContent = Object.keys(SMARTEDU_STATS.bySubject).length;
  document.getElementById('totalLevels').textContent = Object.keys(SMARTEDU_STATS.byLevel).length;
  loadSidebar(SMARTEDU_STATS);
  allBooks = flattenBooks(SMARTEDU_DATA);
  document.getElementById('mainTitle').textContent = '📚 All Textbooks';
  renderBooks(allBooks.slice(0, 50));
}

init();
`;

html = html.substring(0, oldInit) + embeddedScript + html.substring(initBlockEnd);
fs.writeFileSync('docs/smartedu-offline.html', html, 'utf8');
console.log('Created: docs/smartedu-offline.html');
console.log('Books embedded: ' + stats.total);
console.log('File size: ' + (fs.statSync('docs/smartedu-offline.html').size / 1024).toFixed(0) + ' KB');
