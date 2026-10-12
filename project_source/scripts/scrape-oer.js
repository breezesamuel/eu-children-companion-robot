// OER Content Scraper — fetches real educational content from OER Commons, CK-12, and Oak National Academy
// Usage: node scripts/scrape-oer.js [--source all|oercommons|ck12|oak] [--query "maths" --level primary]

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  outputDir: path.join(__dirname, '..', 'data', 'scraped-content'),
  delayMs: 1500,
  maxResults: 100
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// ==================== OER COMMONS API ====================
async function fetchOERCommons(query, maxResults = 50) {
  const results = [];
  let batchStart = 0;
  const batchSize = 20;

  while (results.length < maxResults) {
    const url = `https://www.oercommons.org/api/search?batch_start=${batchStart}&batch_size=${batchSize}&f.keyword=${encodeURIComponent(query)}&f.grade_level=preschool&f.grade_level=primary&f.grade_level=upper-primary&f.grade_level=middle-school`;
    
    try {
      const data = await fetchJSON(url);
      if (!data || !data.results) break;
      
      for (const item of data.results) {
        results.push({
          title: item.title || item.name || 'Untitled',
          description: item.description || '',
          url: item.url || '',
          source: 'oercommons',
          subject: query,
          gradeLevel: item.grade_level || [],
          educationLevel: item.education_level || [],
          materialType: item.material_type || '',
          language: item.language || 'en',
          license: item.license || '',
          author: item.author || '',
          subjects: item.subjects || [],
          standards: item.standards || [],
          scrapedAt: new Date().toISOString()
        });
      }
      
      batchStart += batchSize;
      if (!data.results || data.results.length === 0) break;
      
      await delay(CONFIG.delayMs);
    } catch (e) {
      console.warn(`OER Commons API error for "${query}": ${e.message}`);
      break;
    }
  }
  
  return results;
}

// ==================== OAK NATIONAL ACADEMY API ====================
async function fetchOakAcademy(keyStage, subject, maxResults = 30) {
  const results = [];
  const ksMap = { 'EYFS': 'early-years-foundation-stage', 'KS1': 'key-stage-1', 'KS2': 'key-stage-2', 'KS3': 'key-stage-3', 'KS4': 'key-stage-4' };
  const ks = ksMap[keyStage] || 'key-stage-2';
  
  try {
    const url = `https://open-api.thenational.academy/api/${ks}/subjects`;
    console.log(`  Oak Academy: fetching subjects for ${keyStage}...`);
    const subjects = await fetchJSON(url);
    if (!subjects || !Array.isArray(subjects)) return results;
    
    const targetSubject = subjects.find(s => s.title?.toLowerCase().includes(subject?.toLowerCase() || ''));
    if (!targetSubject) return results;
    
    const unitsUrl = `https://open-api.thenational.academy/api/${ks}/subjects/${targetSubject.slug}/units`;
    console.log(`  Oak Academy: fetching units for ${targetSubject.title}...`);
    const units = await fetchJSON(unitsUrl);
    if (!units || !Array.isArray(units)) return results;
    
    for (const unit of units.slice(0, maxResults)) {
      results.push({
        title: unit.title || '',
        description: unit.description || unit.planning?.priorKnowledge || '',
        url: unit.lessonUrl || `https://www.thenational.academy/teachers/programmes/${ks}/subjects/${targetSubject.slug}/units/${unit.slug}`,
        source: 'oaknational',
        subject: targetSubject.title,
        keyStage,
        unit: unit.slug,
        learningObjectives: unit.learningObjectives || [],
        tags: unit.tags || [],
        scrapedAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn(`  Oak Academy error: ${e.message}`);
  }
  
  return results;
}

// ==================== CK-12 FLEXBOOK SCRAPER ====================
async function fetchCK12(subject, maxResults = 30) {
  const results = [];
  // CK-12 doesn't have a public API, so we use their URL patterns
  const subjects = {
    'math': 'https://flexbooks.ck12.org/flexbooks/student/maths/',
    'science': 'https://flexbooks.ck12.org/flexbooks/student/science/',
    'english': 'https://flexbooks.ck12.org/flexbooks/student/english/',
    'physics': 'https://flexbooks.ck12.org/flexbooks/student/physics/',
    'chemistry': 'https://flexbooks.ck12.org/flexbooks/student/chemistry/',
    'biology': 'https://flexbooks.ck12.org/flexbooks/student/biology/',
    'geography': 'https://flexbooks.ck12.org/cbook/ck-12-earth-science-concepts-for-middle-school/',
    'history': 'https://flexbooks.ck12.org/cbook/ck-12-u-s-history/',
  };
  
  // CK-12 has known FlexBook paths we can reference
  const knownBooks = {
    'Math': [
      { title: 'CK-12 Middle School Math - Grade 6', url: 'https://flexbooks.ck12.org/cbook/ck-12-middle-school-math-grade-6/', topics: 'Number sense, fractions, decimals, geometry, statistics' },
      { title: 'CK-12 Middle School Math - Grade 7', url: 'https://flexbooks.ck12.org/cbook/ck-12-middle-school-math-grade-7/', topics: 'Ratios, proportions, expressions, equations, geometry' },
      { title: 'CK-12 Middle School Math - Grade 8', url: 'https://flexbooks.ck12.org/cbook/ck-12-middle-school-math-grade-8/', topics: 'Linear equations, functions, Pythagorean theorem' },
      { title: 'CK-12 Algebra I', url: 'https://flexbooks.ck12.org/cbook/ck-12-algebra-i/', topics: 'Expressions, equations, inequalities, functions, quadratics' },
      { title: 'CK-12 Geometry', url: 'https://flexbooks.ck12.org/cbook/ck-12-geometry/', topics: 'Angles, triangles, circles, area, volume, proofs' },
      { title: 'CK-12 Elementary Math - Grade 1', url: 'https://flexbooks.ck12.org/cbook/ck-12-elementary-math-grade-1/', topics: 'Addition, subtraction, place value, shapes' },
      { title: 'CK-12 Elementary Math - Grade 2', url: 'https://flexbooks.ck12.org/cbook/ck-12-elementary-math-grade-2/', topics: 'Addition, subtraction, money, time, measurement' },
      { title: 'CK-12 Elementary Math - Grade 3', url: 'https://flexbooks.ck12.org/cbook/ck-12-elementary-math-grade-3/', topics: 'Multiplication, division, fractions, area' },
      { title: 'CK-12 Elementary Math - Grade 4', url: 'https://flexbooks.ck12.org/cbook/ck-12-elementary-math-grade-4/', topics: 'Multi-digit multiplication, division, fractions, decimals' },
      { title: 'CK-12 Elementary Math - Grade 5', url: 'https://flexbooks.ck12.org/cbook/ck-12-elementary-math-grade-5/', topics: 'Fractions, decimals, volume, coordinate plane' }
    ],
    'Science': [
      { title: 'CK-12 Earth Science for Middle School', url: 'https://flexbooks.ck12.org/cbook/ck-12-earth-science-concepts-for-middle-school/', topics: 'Geology, oceans, weather, climate, astronomy' },
      { title: 'CK-12 Life Science for Middle School', url: 'https://flexbooks.ck12.org/cbook/ck-12-life-science-concepts-for-middle-school/', topics: 'Cells, genetics, evolution, ecology, human body' },
      { title: 'CK-12 Physical Science for Middle School', url: 'https://flexbooks.ck12.org/cbook/ck-12-physical-science-concepts-for-middle-school/', topics: 'Motion, forces, energy, waves, matter' },
      { title: 'CK-12 Biology', url: 'https://flexbooks.ck12.org/cbook/ck-12-biology/', topics: 'Biochemistry, cells, genetics, evolution, ecology' },
      { title: 'CK-12 Chemistry', url: 'https://flexbooks.ck12.org/cbook/ck-12-chemistry/', topics: 'Atoms, bonding, reactions, stoichiometry, thermochemistry' },
      { title: 'CK-12 Physics', url: 'https://flexbooks.ck12.org/cbook/ck-12-physics/', topics: 'Mechanics, thermodynamics, waves, electromagnetism' }
    ]
  };
  
  const books = knownBooks[subject] || knownBooks['Math'].concat(knownBooks['Science']);
  for (const book of books.slice(0, Math.ceil(maxResults / 5))) {
    results.push({
      title: book.title,
      url: book.url,
      source: 'ck12',
      subject,
      description: `FlexBook covering: ${book.topics}`,
      topics: book.topics,
      scrapedAt: new Date().toISOString()
    });
  }
  
  return results;
}

// ==================== UTILITY ====================
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const req = protocol.get(url, { headers: { 'User-Agent': 'RoboBuddy-Learning-Center/1.0' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==================== MAIN ====================
async function main() {
  const args = process.argv.slice(2);
  const sourceFlag = args.find(a => a.startsWith('--source='));
  const queryFlag = args.find(a => a.startsWith('--query='));
  const levelFlag = args.find(a => a.startsWith('--level='));
  
  const source = sourceFlag ? sourceFlag.split('=')[1] : 'all';
  const query = queryFlag ? queryFlag.split('=')[1] : 'mathematics';
  const level = levelFlag ? levelFlag.split('=')[1] : 'KS2';
  
  const queries = ['mathematics', 'english', 'science', 'history', 'geography', 'art', 'music', 'computing'];
  const keyStages = ['EYFS', 'KS1', 'KS2', 'KS3', 'KS4'];
  
  console.log('=== OER Content Scraper ===');
  console.log(`Source: ${source}, Query: ${query}, Level: ${level}`);
  
  const allResults = {};
  
  if (source === 'all' || source === 'oercommons') {
    console.log('\n--- OER Commons ---');
    for (const q of (query === 'all' ? queries : [query])) {
      console.log(`  Fetching "${q}"...`);
      const results = await fetchOERCommons(q, CONFIG.maxResults);
      allResults[`oercommons_${q}`] = results;
      console.log(`  Found ${results.length} resources for "${q}"`);
    }
  }
  
  if (source === 'all' || source === 'oak') {
    console.log('\n--- Oak National Academy ---');
    for (const ks of (level === 'all' ? keyStages : [level])) {
      for (const q of (query === 'all' ? queries : [query])) {
        console.log(`  Fetching ${ks}/${q}...`);
        const results = await fetchOakAcademy(ks, q, 10);
        allResults[`oak_${ks}_${q}`] = results;
        console.log(`  Found ${results.length} units`);
        await delay(CONFIG.delayMs);
      }
    }
  }
  
  if (source === 'all' || source === 'ck12') {
    console.log('\n--- CK-12 FlexBooks ---');
    const subjects = query === 'all' ? ['Math', 'Science'] : [query];
    for (const s of subjects) {
      const results = await fetchCK12(s, 20);
      allResults[`ck12_${s}`] = results;
      console.log(`  Found ${results.length} FlexBooks for ${s}`);
    }
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(CONFIG.outputDir, `scraped-${timestamp}.json`);
  
  // Flatten and save
  const flatResults = Object.values(allResults).flat();
  fs.writeFileSync(outputFile, JSON.stringify(flatResults, null, 2), 'utf8');
  
  console.log(`\n=== Summary ===`);
  console.log(`Total resources scraped: ${flatResults.length}`);
  console.log(`Saved to: ${outputFile}`);
  
  // Also save to content-database.json format
  const dbFile = path.join(__dirname, '..', 'data', 'content-database.json');
  let existing = { resources: [] };
  try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch (e) {}
  
  const dbResources = flatResults.map(r => ({
    ...r,
    content: r.description || r.topics || '',
    type: r.materialType || 'lesson',
    category: r.subject || query,
    source: r.source,
  }));
  
  existing.resources = [...dbResources, ...existing.resources];
  fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`Appended to: ${dbFile}`);
  console.log(`Total in database: ${existing.resources.length} resources`);
}

main().catch(console.error);
