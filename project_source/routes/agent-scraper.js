const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const orchestrator = require('../agents/orchestrator');
const learningEngine = require('../services/learning-engine');

let axios;
try { axios = require('axios'); } catch (_) { axios = null; }

const SCRAPE_DIR = path.join(__dirname, '..', 'data', 'scraped-content');
const INGESTION_FILE = path.join(SCRAPE_DIR, 'agent-scraped.json');

try { if (!fs.existsSync(SCRAPE_DIR)) fs.mkdirSync(SCRAPE_DIR, { recursive: true }); } catch (_) {}

function loadExisting() {
  try {
    if (fs.existsSync(INGESTION_FILE)) {
      return JSON.parse(fs.readFileSync(INGESTION_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveExisting(items) {
  try {
    fs.writeFileSync(INGESTION_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    logger.warn('Failed to save agent-scraped.json', { error: e.message });
  }
}

function parseScrapeTag(text) {
  const match = text.match(/\[SCRAPE:\s*url="([^"]*)"\s*\|\s*category="([^"]*)"(?:\s*\|\s*type="([^"]*)")?\s*\]/);
  if (!match) return null;
  return { url: match[1], category: match[2], type: match[3] || 'lesson' };
}

function parseSearchTag(text) {
  const match = text.match(/\[SEARCH:\s*query="([^"]*)"\s*\]/);
  if (!match) return null;
  return { query: match[1] };
}

async function scrapeUrl(url) {
  if (!axios) return { success: false, error: 'axios not available' };
  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoboBuddyBot/1.0)' },
      responseType: 'text'
    });
    const $ = (() => { try { return require('cheerio').load(resp.data); } catch (_) { return null; } })();
    let title = '';
    let content = '';
    if ($) {
      title = $('title').text().trim();
      $('script, style, nav, header, footer, .nav, .navbar, .sidebar, .widget, .comment').remove();
      content = $('article, main, .content, .post, .entry').first().text().trim() || $('body').text().trim();
      content = content.replace(/\s+/g, ' ').substring(0, 8000);
    } else {
      content = (resp.data || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').substring(0, 8000);
      const tm = resp.data.match(/<title>([^<]*)<\/title>/i);
      if (tm) title = tm[1];
    }
    return { success: true, title, content, url, statusCode: resp.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function ingestToLearningEngine(items, category, sourceType) {
  const dbPath = path.join(__dirname, '..', 'data', 'content-database.json');
  const existing = [];
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.entries) existing.push(...db.entries);
    }
  } catch (_) {}
  const added = [];
  for (const item of items) {
    const entry = {
      topic: item.title || item.url || 'Untitled',
      content: item.content || '',
      category: category || 'web',
      type: sourceType || 'lesson',
      source: 'agent-scraper',
      sourceUrl: item.url || '',
      language: 'en',
      scrapedAt: new Date().toISOString()
    };
    existing.unshift(entry);
    added.push(entry);
  }
  try {
    fs.writeFileSync(dbPath, JSON.stringify({ entries: existing }, null, 2), 'utf8');
  } catch (e) {
    logger.warn('Failed to update content-database.json', { error: e.message });
  }
  learningEngine._init();
  return added;
}

function extractUrlFromMessage(msg) {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = msg.match(urlRegex);
  return matches ? matches[0] : null;
}

function detectCategoryFromMessage(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('故事') || lower.includes('story') || lower.includes('fairy') || lower.includes('童话')) return 'stories';
  if (lower.includes('数学') || lower.includes('math') || lower.includes('数') || lower.includes('加减乘除')) return 'math';
  if (lower.includes('科学') || lower.includes('science') || lower.includes('宇宙') || lower.includes('自然')) return 'science';
  if (lower.includes('英语') || lower.includes('英文') || lower.includes('english') || lower.includes('vocab') || lower.includes('单词')) return 'english';
  if (lower.includes('grammar') || lower.includes('语法') || lower.includes('joke') || lower.includes('笑话') || lower.includes('fun')) return 'grammar_fun';
  if (lower.includes('历史') || lower.includes('history') || lower.includes('文化') || lower.includes('culture')) return 'culture';
  if (lower.includes('地理') || lower.includes('geography') || lower.includes('国家')) return 'geography';
  if (lower.includes('音乐') || lower.includes('music') || lower.includes('song')) return 'music';
  if (lower.includes('动物') || lower.includes('animal') || lower.includes('plant') || lower.includes('植物')) return 'biology';
  if (lower.includes('编程') || lower.includes('code') || lower.includes('program')) return 'coding';
  if (lower.includes('艺术') || lower.includes('art') || lower.includes('draw') || lower.includes('绘画')) return 'art';
  if (lower.includes('小红') || lower.includes('xiaohongshu') || lower.includes('redbook')) return 'xiaohongshu';
  if (lower.includes('百科') || lower.includes('wiki') || lower.includes('baike') || lower.includes('encyclopedia')) return 'encyclopedia';
  return 'web';
}

router.post('/chat', async (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // First check if user directly provided a URL
    const directUrl = extractUrlFromMessage(message);
    let urlToScrape = directUrl;
    let detectedCategory = detectCategoryFromMessage(message);
    let manualScrape = false;

    const result = await orchestrator.handleMessage(userId, message, sessionId, 'scraper');
    const reply = result.reply || '';
    const actions = [];

    let scrapeTag = parseScrapeTag(reply);

    // Fallback: if AI didn't produce a scrape tag but user provided a URL
    if (!scrapeTag && directUrl) {
      scrapeTag = { url: directUrl, category: detectedCategory, type: 'lesson' };
      manualScrape = true;
    }

    // Fallback: if AI didn't produce a scrape tag but user mentioned a known platform
    if (!scrapeTag && !directUrl && (message.includes('小红') || message.includes('抓取') || message.includes('爬取') || message.includes('采集') || message.includes('scrape') || message.includes('crawl'))) {
      actions.push({ type: 'suggestion', message: '请提供一个具体的网页URL，例如：https://...' });
    }

    if (scrapeTag) {
      actions.push({ type: 'scrape', config: scrapeTag, status: 'executing', autoCategory: manualScrape });
      const scrapeResult = await scrapeUrl(scrapeTag.url);
      if (scrapeResult.success) {
        const ingested = ingestToLearningEngine(
          [{ title: scrapeResult.title, content: scrapeResult.content, url: scrapeResult.url }],
          scrapeTag.category, scrapeTag.type
        );
        const agentScraped = loadExisting();
        agentScraped.unshift({
          id: `agent-s-${Date.now()}`,
          url: scrapeTag.url,
          title: scrapeResult.title,
          topic: scrapeResult.title,
          category: scrapeTag.category,
          type: scrapeTag.type,
          content: scrapeResult.content.substring(0, 500),
          source: 'agent-scraper',
          language: 'en',
          scrapedAt: new Date().toISOString()
        });
        saveExisting(agentScraped);
        actions[0].status = 'done';
        actions[0].result = { title: scrapeResult.title, ingested: ingested.length, contentLength: scrapeResult.content.length };
      } else {
        actions[0].status = 'failed';
        actions[0].error = scrapeResult.error;
      }
    }

    const searchTag = parseSearchTag(reply);
    if (searchTag) {
      const searchResult = learningEngine.search(searchTag.query, { limit: 10 });
      actions.push({ type: 'search', query: searchTag.query, results: searchResult.data.slice(0, 5), total: searchResult.total });
    }

    res.json({
      success: true,
      data: {
        reply: reply.replace(/\[SCRAPE:[^\]]*\]/g, '').replace(/\[SEARCH:[^\]]*\]/g, '').trim(),
        agent: result.agent,
        agentType: result.agentType,
        actions: actions.length > 0 ? actions : undefined
      }
    });
  } catch (error) {
    logger.error('Agent-scraper error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', (req, res) => {
  const items = loadExisting();
  const { limit = 20, offset = 0 } = req.query;
  const sliced = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ success: true, data: sliced, total: items.length });
});

router.get('/categories', (req, res) => {
  const items = loadExisting();
  const cats = {};
  for (const item of items) {
    const c = item.category || 'uncategorized';
    cats[c] = (cats[c] || 0) + 1;
  }
  res.json({ success: true, data: cats });
});

router.get('/stats', (req, res) => {
  const items = loadExisting();
  const cats = {};
  for (const item of items) {
    const c = item.category || 'uncategorized';
    cats[c] = (cats[c] || 0) + 1;
  }
  res.json({ success: true, data: { total: items.length, categories: cats } });
});

router.delete('/history/:id', (req, res) => {
  let items = loadExisting();
  const before = items.length;
  items = items.filter(i => i.id !== req.params.id);
  if (items.length === before) return res.status(404).json({ error: 'Item not found' });
  saveExisting(items);
  res.json({ success: true, message: 'Deleted' });
});

// ==================== CONTENT RATING / FEEDBACK ====================
router.post('/rating/:id', (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  if (rating !== 1 && rating !== -1 && rating !== 0) {
    return res.status(400).json({ error: 'Rating must be 1 (upvote), -1 (downvote), or 0 (neutral)' });
  }
  const items = loadExisting();
  const item = items.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.rating = rating;
  if (feedback) item.feedback = feedback;
  item.ratedAt = new Date().toISOString();
  saveExisting(items);
  res.json({ success: true, message: 'Rating saved', rating, item: { id: item.id, title: item.title, rating: item.rating } });
});

router.get('/ratings', (req, res) => {
  const items = loadExisting();
  const rated = items.filter(i => i.rating !== undefined).map(i => ({
    id: i.id, title: i.title, url: i.url, category: i.category, rating: i.rating, feedback: i.feedback, scrapedAt: i.scrapedAt, ratedAt: i.ratedAt
  }));
  res.json({ success: true, data: rated, total: rated.length, stats: {
    upvoted: rated.filter(i => i.rating === 1).length,
    downvoted: rated.filter(i => i.rating === -1).length,
    neutral: rated.filter(i => i.rating === 0).length,
    withFeedback: rated.filter(i => i.feedback).length
  }});
});

// ==================== CONTENT STATS (enhanced) ====================
router.get('/stats', (req, res) => {
  const items = loadExisting();
  const cats = {};
  let upvotes = 0, downvotes = 0;
  for (const item of items) {
    const c = item.category || 'uncategorized';
    cats[c] = (cats[c] || 0) + 1;
    if (item.rating === 1) upvotes++;
    else if (item.rating === -1) downvotes++;
  }
  res.json({ success: true, data: { total: items.length, categories: cats, ratings: { upvotes, downvotes } } });
});

module.exports = router;
