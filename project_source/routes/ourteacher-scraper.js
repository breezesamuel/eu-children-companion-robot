const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const crawler = require('../services/crawler-engine');
const learningEngine = require('../services/learning-engine');

const RESULTS_DIR = path.join(__dirname, '..', 'data', 'scraped-content');
const OURTEACHER_FILE = path.join(RESULTS_DIR, 'ourteacher-scraped.json');

try { if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true }); } catch (_) {}

const TARGETS = [
  { name: 'OurTeacher Home', url: 'https://www.ourteacher.cc/', category: 'teacherResources', depth: 2 },
  { name: 'OurTeacher Download', url: 'https://www.ourteacher.cc/download', category: 'downloadableResources', depth: 2 },
  { name: 'OurTeacher Chat', url: 'https://www.ourteacher.cc/next/chat/19', category: 'teacherChat', depth: 1 }
];

function loadResults() {
  try {
    if (fs.existsSync(OURTEACHER_FILE)) {
      const raw = fs.readFileSync(OURTEACHER_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return { pages: [], lastCrawl: null, stats: { totalPages: 0, totalScraped: 0 } };
}

function saveResults(data) {
  try {
    fs.writeFileSync(OURTEACHER_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    logger.warn('Failed to save ourteacher results', { error: e.message });
  }
}

function ingestToEngine(pages, category) {
  const dbPath = path.join(__dirname, '..', 'data', 'content-database.json');
  let existing = [];
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.entries) existing.push(...db.entries);
    }
  } catch (_) {}
  const added = [];
  const existingUrls = new Set(existing.map(e => e.sourceUrl).filter(Boolean));
  for (const page of pages) {
    if (!page.text || page.text.length < 50) continue;
    if (existingUrls.has(page.url)) continue;
    const entry = {
      topic: page.title || page.url || 'OurTeacher Resource',
      content: page.text,
      category: category || 'teacherResources',
      type: 'lesson',
      source: 'ourteacher',
      sourceUrl: page.url || '',
      language: 'en',
      scrapedAt: page.scrapedAt || new Date().toISOString()
    };
    existing.unshift(entry);
    added.push(entry);
  }
  try {
    fs.writeFileSync(dbPath, JSON.stringify({ entries: existing }, null, 2), 'utf8');
  } catch (e) {
    logger.warn('Failed to update content-database.json', { error: e.message });
  }
  try { learningEngine._init(); } catch (_) {}
  return added;
}

// Start crawl of all or specific ourteacher.cc targets
router.post('/crawl', async (req, res) => {
  try {
    const { target, maxPages, depth } = req.body;
    let targetsToCrawl = TARGETS;
    if (target) {
      targetsToCrawl = TARGETS.filter(t =>
        t.name.toLowerCase().includes(target.toLowerCase()) ||
        t.url.toLowerCase().includes(target.toLowerCase())
      );
    }
    if (targetsToCrawl.length === 0) {
      return res.status(400).json({
        success: false, error: 'No matching target found',
        available: TARGETS.map(t => ({ name: t.name, url: t.url }))
      });
    }

    const allPages = [];
    const results = [];

    for (const t of targetsToCrawl) {
      logger.info('Starting crawl', { name: t.name, url: t.url, depth: depth || t.depth });
      const crawlResult = await crawler.crawlSource(t.url, {
        maxPages: maxPages || 30,
        depth: depth || t.depth,
        minContentLength: 100
      });
      if (crawlResult.success && crawlResult.pages.length > 0) {
        const ingested = ingestToEngine(crawlResult.pages, t.category);
        allPages.push(...crawlResult.pages);
        results.push({
          target: t.name, url: t.url,
          pagesFound: crawlResult.totalVisited,
          pagesExtracted: crawlResult.totalExtracted,
          ingested: ingested.length
        });
      } else {
        results.push({
          target: t.name, url: t.url,
          pagesFound: crawlResult.totalVisited || 0,
          pagesExtracted: 0,
          ingested: 0,
          error: crawlResult.error || 'No content extracted (site may require login)'
        });
      }
    }

    const data = loadResults();
    const existingUrls = new Set(data.pages.map(p => p.url));
    for (const p of allPages) {
      if (!existingUrls.has(p.url)) {
        data.pages.push({ ...p, crawledAt: new Date().toISOString() });
      }
    }
    if (data.pages.length > 10000) data.pages = data.pages.slice(-10000);
    data.lastCrawl = new Date().toISOString();
    data.stats.totalPages = data.pages.length;
    data.stats.totalScraped = data.pages.length;
    saveResults(data);

    res.json({ success: true, data: { pages: allPages.length, results, lastCrawl: data.lastCrawl } });
  } catch (err) {
    logger.error('OurTeacher crawl error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Render a single page from ourteacher.cc (no dedup — always re-renders)
router.post('/render', async (req, res) => {
  try {
    const { url, timeout, waitUntil } = req.body;
    if (!url) return res.json({ success: false, error: 'URL required' });
    if (!url.includes('ourteacher.cc')) return res.json({ success: false, error: 'Only ourteacher.cc URLs allowed' });

    const result = await crawler.renderPage(url, {
      timeout: timeout || 30000,
      waitUntil: waitUntil || 'networkidle',
      scroll: true
    });
    if (result.success) {
      const ingested = ingestToEngine(
        [{ url: result.url, title: result.title, text: result.text, scrapedAt: new Date().toISOString() }],
        'teacherResources'
      );
      const data = loadResults();
      data.pages.unshift({
        url: result.url, title: result.title,
        text: result.text,
        metaDesc: result.metaDesc || '',
        linksCount: (result.links || []).length,
        scrapedAt: new Date().toISOString(),
        crawledAt: new Date().toISOString()
      });
      if (data.pages.length > 10000) data.pages = data.pages.slice(0, 10000);
      data.lastCrawl = new Date().toISOString();
      data.stats.totalPages = data.pages.length;
      data.stats.totalScraped = data.pages.length;
      saveResults(data);

      res.json({
        success: true,
        data: {
          title: result.title,
          textLength: result.text.length,
          linksFound: (result.links || []).length,
          imagesFound: (result.images || []).length,
          metaDesc: result.metaDesc,
          ingested: ingested.length
        }
      });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get crawl results
router.get('/results', (req, res) => {
  const data = loadResults();
  const { limit = 20, offset = 0, search } = req.query;
  let pages = data.pages || [];
  if (search) {
    const q = search.toLowerCase();
    pages = pages.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.text || '').toLowerCase().includes(q) ||
      (p.url || '').toLowerCase().includes(q)
    );
  }
  const sliced = pages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ success: true, data: sliced, total: pages.length, stats: data.stats, lastCrawl: data.lastCrawl });
});

// Get crawl stats
router.get('/stats', (req, res) => {
  const data = loadResults();
  res.json({
    success: true,
    data: {
      ...data.stats,
      targets: TARGETS.length,
      targetNames: TARGETS.map(t => t.name),
      lastCrawl: data.lastCrawl,
      pagesInDb: data.pages.length
    }
  });
});

// Get available targets
router.get('/targets', (req, res) => {
  res.json({ success: true, data: TARGETS });
});

// Search scraped content via learning engine
router.get('/search', (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.json({ success: false, error: 'Query required' });
  const results = learningEngine.search('ourteacher ' + q, { limit: parseInt(limit) });
  res.json({ success: true, data: results.data, total: results.total });
});

// Clear results
router.delete('/results', (req, res) => {
  saveResults({ pages: [], lastCrawl: null, stats: { totalPages: 0, totalScraped: 0 } });
  res.json({ success: true, message: 'Results cleared' });
});

module.exports = router;