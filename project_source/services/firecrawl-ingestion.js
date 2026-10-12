const FirecrawlApp = require('firecrawl');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const sources = require('../data/content-sources.json');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';

class FirecrawlIngestionService extends EventEmitter {
  constructor() {
    super();
    this.client = FIRECRAWL_API_KEY ? new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY, apiUrl: FIRECRAWL_API_URL }) : null;
    this.crawlJobs = new Map();
    this.scrapedContent = [];
    this.totalScraped = 0;
    this.isRunning = false;
  }

  isAvailable() {
    return !!this.client;
  }

  async startCrawl(sourceId, options = {}) {
    const source = sources.sources.find(s => s.id === sourceId);
    if (!source) throw new Error(`Unknown source: ${sourceId}`);
    if (!this.client) throw new Error('Firecrawl not configured — set FIRECRAWL_API_KEY');

    const jobId = `crawl_${Date.now()}_${sourceId}`;
    const job = {
      id: jobId, sourceId, status: 'pending', source,
      pagesCrawled: 0, pagesTotal: 0, startedAt: new Date().toISOString(),
      completedAt: null, error: null
    };
    this.crawlJobs.set(jobId, job);
    this.emit('job:started', job);

    this._runCrawl(job, source, options).catch(err => {
      job.status = 'failed';
      job.error = err.message;
      this.emit('job:failed', job);
    });

    return jobId;
  }

  async _runCrawl(job, source, options) {
    job.status = 'crawling';
    this.emit('job:progress', job);

    try {
      const crawlResult = await this.client.crawlUrl(source.url, {
        maxPages: options.maxPages || source.maxPages || 100,
        depth: options.depth || source.depth || 1,
        limit: options.limit || 500,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: true
        }
      });

      if (!crawlResult || !crawlResult.data || !crawlResult.data.length) {
        job.status = 'completed';
        job.pagesTotal = 0;
        job.completedAt = new Date().toISOString();
        this.emit('job:completed', job);
        return;
      }

      const pages = crawlResult.data;
      job.pagesTotal = pages.length;

      const ingested = [];
      for (const page of pages) {
        if (!page.markdown && !page.html) continue;

        const contentItem = {
          id: `fc_${source.id}_${Date.now()}_${job.pagesCrawled}`,
          source: source.id,
          category: source.category,
          url: page.url || page.metadata?.url || '',
          title: page.metadata?.title || page.metadata?.ogTitle || '',
          description: page.metadata?.description || '',
          content: page.markdown || page.html || '',
          contentType: page.markdown ? 'markdown' : 'html',
          language: page.metadata?.language || source.language || 'en',
          scrapedAt: new Date().toISOString(),
          wordCount: (page.markdown || '').split(/\s+/).filter(Boolean).length
        };

        this.scrapedContent.push(contentItem);
        ingested.push(contentItem);
        job.pagesCrawled++;
      }

      this.totalScraped = this.scrapedContent.length;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      this.emit('job:completed', { job, ingested: ingested.length });
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      job.completedAt = new Date().toISOString();
      this.emit('job:failed', job);
    }
  }

  async startBatchCrawl(sourceIds, options = {}) {
    const ids = sourceIds || sources.sources.map(s => s.id);
    const results = [];
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

  async startFullCrawl(options = {}) {
    return this.startBatchCrawl(null, options);
  }

  getJob(jobId) {
    return this.crawlJobs.get(jobId) || null;
  }

  getAllJobs() {
    return Array.from(this.crawlJobs.values());
  }

  getScrapedContent(category, limit = 100, offset = 0) {
    let items = this.scrapedContent;
    if (category) items = items.filter(i => i.category === category);
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  getContentBySource(sourceId) {
    return this.scrapedContent.filter(i => i.source === sourceId);
  }

  getStats() {
    const byCategory = {};
    const bySource = {};
    this.scrapedContent.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      bySource[item.source] = (bySource[item.source] || 0) + 1;
    });
    return {
      totalScraped: this.totalScraped,
      totalCrawlJobs: this.crawlJobs.size,
      activeJobs: Array.from(this.crawlJobs.values()).filter(j => j.status === 'crawling' || j.status === 'pending').length,
      byCategory,
      bySource,
      sources: sources.sources.length
    };
  }
}

module.exports = new FirecrawlIngestionService();
