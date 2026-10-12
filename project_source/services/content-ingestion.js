const EventEmitter = require('events');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const sources = require('../data/content-sources.json');

let FirecrawlApp = null;
try { FirecrawlApp = require('firecrawl'); } catch(e) { /* optional */ }

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const USE_FIRECRAWL = !!FIRECRAWL_API_KEY && !!FirecrawlApp;

const crawlerEngine = require('./crawler-engine');
const contentGenerator = require('./content-generator');

class ContentIngestionService extends EventEmitter {
  constructor() {
    super();
    this.fcClient = USE_FIRECRAWL ? new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY, apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev' }) : null;
    this.crawlJobs = new Map();
    this.scrapedContent = [];
    this.totalScraped = 0;
    this.isRunning = false;
  }

  isAvailable() { return true; }
  isFirecrawlMode() { return USE_FIRECRAWL; }
  getModeName() { return USE_FIRECRAWL ? 'Firecrawl Cloud' : 'Native HTTP+Cheerio'; }

  async startCrawl(sourceId, options = {}) {
    const source = sources.sources.find(s => s.id === sourceId);
    if (!source) throw new Error(`Unknown source: ${sourceId}`);

    const jobId = `crawl_${Date.now()}_${sourceId}`;
    const job = {
      id: jobId, sourceId, status: 'pending', source,
      pagesCrawled: 0, pagesTotal: 0, startedAt: new Date().toISOString(),
      completedAt: null, error: null
    };
    this.crawlJobs.set(jobId, job);
    this.emit('job:started', job);

    this._runCrawl(job, source, options).catch(err => {
      job.status = 'failed'; job.error = err.message; job.completedAt = new Date().toISOString();
      this.emit('job:failed', job);
      logger.error('Crawl failed', { sourceId, error: err.message });
    });

    return jobId;
  }

  async _runCrawl(job, source, options) {
    job.status = 'crawling';
    this.emit('job:progress', job);

    try {
      if (USE_FIRECRAWL) {
        await this._runFirecrawlCrawl(job, source, options);
      } else {
        // Always try Playwright first for JS-rendered sites; fall back to native HTTP
        if (!crawlerEngine.isReady) {
          await crawlerEngine.init();
        }
        if (crawlerEngine.isReady) {
          await this._runPlaywrightCrawl(job, source, options);
          // If Playwright got < 3 pages, also try native HTTP to maximize content
          if (job.pagesCrawled < 3) {
            logger.info('Playwright yielded few pages, augmenting with native HTTP', { sourceId: source.id });
            await this._runNativeCrawl(job, source, options);
          }
        } else {
          await this._runNativeCrawl(job, source, options);
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async _runFirecrawlCrawl(job, source, options) {
    const result = await this.fcClient.crawlUrl(source.url, {
      maxPages: options.maxPages || source.maxPages || 100,
      depth: options.depth || source.depth || 1,
      limit: options.limit || 500,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
    });

    if (!result?.data?.length) {
      job.status = 'completed'; job.pagesTotal = 0; job.completedAt = new Date().toISOString();
      this.emit('job:completed', job);
      return;
    }

    job.pagesTotal = result.data.length;
    for (const page of result.data) {
      if (!page.markdown) continue;
      this._addContent(source, job, page.url, page.metadata?.title || '', page.markdown, page.metadata);
    }
    job.status = 'completed'; job.completedAt = new Date().toISOString();
    this.emit('job:completed', { job, ingested: job.pagesCrawled });
    this._fillParametricContent(source, job);
  }

  async _runPlaywrightCrawl(job, source, options) {
    const maxPages = Math.min(options.maxPages || source.maxPages || 30, 100);
    const depth = Math.min(options.depth || source.depth || 3, 5);
    try {
      const result = await crawlerEngine.crawlSource(source.url, { maxPages, depth });
      if (!result.success || !result.pages.length) {
        job.status = 'completed'; job.pagesTotal = 0; job.completedAt = new Date().toISOString();
        this.emit('job:completed', job);
        return;
      }
      job.pagesTotal = result.totalVisited;
      for (const page of result.pages) {
        this._addContent(source, job, page.url, page.title, page.text);
      }
    } catch (err) {
      logger.error('Playwright crawl failed', { sourceId: source.id, error: err.message });
    }
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    this.emit('job:completed', { job, ingested: job.pagesCrawled });
    this._fillParametricContent(source, job);
  }

  async _runNativeCrawl(job, source, options) {
    const maxPages = Math.min(options.maxPages || source.maxPages || 50, 200);
    const depth = Math.min(options.depth || source.depth || 3, 6);
    const visited = new Set();
    const queue = [{ url: source.url, depth: 0 }];
    const baseDomain = new URL(source.url).hostname;
    const concurrency = 3;

    const fetchPage = async (url, processLinks) => {
      if (visited.has(url) && !processLinks) return null;
      if (!processLinks) visited.add(url);

      try {
        const html = await this._fetchUrl(url);
        if (!html) return [];

        const $ = cheerio.load(html);

        if (!processLinks) {
          const title = $('h1').first().text().trim()
            || $('.page-title, .entry-title, .post-title, .article-title, .title').first().text().trim()
            || $('title').text().trim()
            || url;
          const bodySelectors = [
            'article', 'main', '.post-content', '.entry-content', '.article-content',
            '.content', '.post', '.entry', '#content', '.main-content',
            '.story-body', '.article-body', '.node-content', '.field-name-body',
            '.col-sm-9', '.col-md-8', '#primary', 'body'
          ];
          let bodyText = '';
          for (const sel of bodySelectors) {
            const el = $(sel).first();
            if (el.length) {
              const txt = el.text();
              if (txt.length > 80) { bodyText = txt; break; }
            }
          }
          if (!bodyText) {
            $('nav, header, footer, .nav, .navbar, .menu, .sidebar, .side-bar, .widget, .comment, .comments, script, style').remove();
            bodyText = $('body').text();
          }
          const cleanText = bodyText
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
          const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

          if (wordCount >= 8) {
            this._addContent(source, job, url, title, cleanText.substring(0, 10000));
            job.pagesTotal = visited.size;
            this.emit('job:progress', job);
          } else {
            logger.debug('Skipped low-content page', { url, words: wordCount });
          }
        }

        if (processLinks) {
          const links = new Set();
          const linkDepth = options.depth || source.depth || 3;
          const ignorePatterns = [
            /\/search\b/i, /\?search=/, /\/tag\//i, /\/(?:login|signup|register|logout)\b/i,
            /\/cart\b/i, /\/checkout\b/i, /javascript:void/, /^javascript:/,
            /\/wp-json\//, /\bwp-content\//, /\bwp-includes\//,
            /\/feed\//, /\/rss\//, /\/atom\//, /\.rss$/,
            /\/print\//, /\?print=/, /\/share\//,
            /\/author\//, /\/category\/[^/]+\/$/,
            /\/page\/\d+\/$/, /\?page=\d+$/
          ];
          $('a[href]').each((_, el) => {
            try {
              const href = $(el).attr('href');
              if (!href) return;
              const fullUrl = new URL(href, url).href;
              const u = new URL(fullUrl);
              if (u.hostname !== baseDomain) return;
              if (fullUrl.includes('#') || href.startsWith('#')) return;
              if (fullUrl.match(/\.(pdf|zip|mp3|mp4|mpg|avi|jpg|jpeg|png|gif|svg|ico|css|js|json|xml)$/i)) return;
              for (const p of ignorePatterns) { if (p.test(fullUrl)) return; }
              const pathParts = u.pathname.split('/').filter(Boolean).length;
              if (pathParts <= linkDepth + 3) links.add(fullUrl);
            } catch(e) { /* skip */ }
          });
          return Array.from(links);
        }
        return [];
      } catch (err) {
        logger.warn('Page fetch failed', { url, error: err.message });
        return [];
      }
    };

    while (queue.length > 0 && visited.size < maxPages) {
      const batch = [];
      while (queue.length > 0 && batch.length < concurrency) {
        const item = queue.shift();
        if (!visited.has(item.url)) {
          batch.push(item);
        }
      }

      await Promise.all(batch.map(async (item) => {
        await fetchPage(item.url, false);
        if (item.depth < depth) {
          const links = await fetchPage(item.url, true);
          for (const link of links) {
            if (!visited.has(link)) queue.push({ url: link, depth: item.depth + 1 });
          }
        }
      }));

      if (queue.length > 0 && visited.size < maxPages) await this._delay(200);
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    this.emit('job:completed', { job, ingested: job.pagesCrawled });
    this._fillParametricContent(source, job);
  }

  _fillParametricContent(source, job) {
    const catCount = this.scrapedContent.filter(i => i.category === source.category && i.contentType !== 'parametric').length;
    if (catCount < 30) {
      const fillCount = Math.min(90 - this.scrapedContent.filter(i => i.category === source.category).length, 60);
      if (fillCount > 0) {
        const generated = contentGenerator.generateContent(source.category, fillCount, catCount);
        for (const item of generated) {
          this.scrapedContent.push(item);
          this.totalScraped = this.scrapedContent.length;
        }
        logger.info('Generated parametric content', { category: source.category, count: generated.length });
      }
    }
  }

  _addContent(source, job, url, title, content, metadata) {
    const item = {
      id: `ing_${source.id}_${Date.now()}_${job.pagesCrawled}`,
      source: source.id,
      category: source.category,
      url: url || '',
      title: title || '',
      description: metadata?.description || '',
      content: content || '',
      contentType: 'markdown',
      language: source.language || 'en',
      scrapedAt: new Date().toISOString(),
      wordCount: (content || '').split(/\s+/).filter(Boolean).length
    };
    this.scrapedContent.push(item);
    this.totalScraped = this.scrapedContent.length;
    job.pagesCrawled = this.scrapedContent.filter(i => i.source === source.id).length;
  }

  _fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoboMateBot/2.0; +https://robomate.ai)' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return this._fetchUrl(redirectUrl).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        const maxSize = 512 * 1024;
        let totalSize = 0;
        res.on('data', c => {
          chunks.push(c);
          totalSize += c.length;
          if (totalSize > maxSize) { req.destroy(); reject(new Error('Response too large')); }
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async startBatchCrawl(sourceIds, options = {}) {
    const ids = sourceIds || sources.sources.map(s => s.id);
    const results = [];
    // Fire all crawls in parallel, don't await - just return job IDs immediately
    for (const id of ids) {
      try {
        const jobId = await this.startCrawl(id, options);
        results.push({ sourceId: id, jobId, status: 'started' });
      } catch (err) {
        results.push({ sourceId: id, error: err.message, status: 'failed' });
      }
    }
    return results;
  }

  async startFullCrawl(options = {}) { return this.startBatchCrawl(null, options); }

  getJob(jobId) { return this.crawlJobs.get(jobId) || null; }
  getAllJobs() { return Array.from(this.crawlJobs.values()); }

  getScrapedContent(category, sourceId, limit = 100, offset = 0) {
    let items = this.scrapedContent;
    if (category) items = items.filter(i => i.category === category);
    if (sourceId) items = items.filter(i => i.source === sourceId);
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  getContentBySource(sourceId) { return this.scrapedContent.filter(i => i.source === sourceId); }

  generateContentForCategory(category, count = 50) {
    const items = contentGenerator.generateContent(category, count);
    for (const item of items) {
      this.scrapedContent.push(item);
      this.totalScraped = this.scrapedContent.length;
    }
    return items;
  }

  generateAllContent(countPerCategory = 20) {
    const items = contentGenerator.generateAllCategories(countPerCategory);
    for (const item of items) {
      this.scrapedContent.push(item);
      this.totalScraped = this.scrapedContent.length;
    }
    return items;
  }

  getStats() {
    const byCategory = {}; const bySource = {};
    this.scrapedContent.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      bySource[item.source] = (bySource[item.source] || 0) + 1;
    });
    return {
      totalScraped: this.totalScraped,
      totalCrawlJobs: this.crawlJobs.size,
      activeJobs: Array.from(this.crawlJobs.values()).filter(j => j.status === 'crawling' || j.status === 'pending').length,
      mode: this.getModeName(),
      byCategory, bySource, sources: sources.sources.length
    };
  }
}

module.exports = new ContentIngestionService();
