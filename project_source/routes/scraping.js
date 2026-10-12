const express = require('express');
const router = express.Router();
const ScrapingService = require('../services/scraping-service');
const logger = require('../utils/logger');

const scraper = new ScrapingService();

const jobQueues = new Map();
const scheduledJobs = new Map();
const extractionRules = new Map();
const proxyList = [];
const rateLimitConfig = new Map();

router.post('/jobs', (req, res) => {
  try {
    const config = req.body;
    if (!config.url) return res.status(400).json({ success: false, error: 'url required' });
    const job = scraper.createJob(config);
    res.status(201).json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/jobs', (req, res) => {
  try {
    const { status, sourceType } = req.query;
    let jobs = scraper.getAllJobs();
    if (status) jobs = jobs.filter(j => j.status === status);
    if (sourceType) jobs = jobs.filter(j => j.sourceType === sourceType);
    res.json({ success: true, data: jobs });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/jobs/:id', (req, res) => {
  try {
    const job = scraper.getJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/jobs/:id', (req, res) => {
  try {
    const result = scraper.updateJob(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/jobs/:id', (req, res) => {
  try {
    scraper.deleteJob(req.params.id);
    res.json({ success: true, data: { message: 'Job deleted' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/jobs/:id/run', async (req, res) => {
  try {
    const result = await scraper.runJob(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/run-all', async (req, res) => {
  try {
    const results = await scraper.runAllJobs();
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/jobs/:id/results', (req, res) => {
  try {
    const { limit, offset } = req.query;
    const results = scraper.getResults(req.params.id, { limit: parseInt(limit) || 20, offset: parseInt(offset) || 0 });
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/jobs/:id/results', (req, res) => {
  try {
    const { olderThan } = req.query;
    scraper.deleteResults(req.params.id, olderThan ? parseInt(olderThan) : undefined);
    res.json({ success: true, data: { message: 'Results deleted' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/tools', (req, res) => {
  try {
    res.json({ success: true, data: scraper.getAvailableTools() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/tools/:name/run', async (req, res) => {
  try {
    const result = await scraper.runTool(req.params.name, req.body);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', (req, res) => {
  try {
    res.json({ success: true, data: scraper.getStats() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stop', (req, res) => {
  try {
    scraper.stop();
    res.json({ success: true, data: { message: 'Scraping service stopped' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/queue', (req, res) => {
  try {
    const { name, jobs, concurrency } = req.body;
    if (!name || !jobs || !Array.isArray(jobs)) return res.status(400).json({ success: false, error: 'name and jobs array required' });
    jobQueues.set(name, { name, jobs, concurrency: concurrency || 1, status: 'idle', results: [], createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: jobQueues.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/queue', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(jobQueues.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/queue/:name', (req, res) => {
  try {
    const queue = jobQueues.get(req.params.name);
    if (!queue) return res.status(404).json({ success: false, error: 'Queue not found' });
    res.json({ success: true, data: queue });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/queue/:name/run', async (req, res) => {
  try {
    const queue = jobQueues.get(req.params.name);
    if (!queue) return res.status(404).json({ success: false, error: 'Queue not found' });
    queue.status = 'running';
    const results = [];
    for (const jobConfig of queue.jobs) {
      try {
        const result = await scraper.runJob(jobConfig);
        results.push(result);
      } catch (e) {
        results.push({ error: e.message });
      }
    }
    queue.results = results;
    queue.status = 'completed';
    res.json({ success: true, data: { queue: queue.name, completed: results.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/queue/:name', (req, res) => {
  try {
    if (!jobQueues.has(req.params.name)) return res.status(404).json({ success: false, error: 'Queue not found' });
    jobQueues.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/schedule', (req, res) => {
  try {
    const { name, cron, jobConfig, enabled } = req.body;
    if (!name || !cron || !jobConfig) return res.status(400).json({ success: false, error: 'name, cron, and jobConfig required' });
    scheduledJobs.set(name, { name, cron, jobConfig, enabled: enabled !== false, lastRun: null, nextRun: null, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: scheduledJobs.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/schedule', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(scheduledJobs.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/schedule/:name', (req, res) => {
  try {
    const job = scheduledJobs.get(req.params.name);
    if (!job) return res.status(404).json({ success: false, error: 'Scheduled job not found' });
    res.json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/schedule/:name', (req, res) => {
  try {
    const job = scheduledJobs.get(req.params.name);
    if (!job) return res.status(404).json({ success: false, error: 'Scheduled job not found' });
    Object.assign(job, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/schedule/:name', (req, res) => {
  try {
    if (!scheduledJobs.has(req.params.name)) return res.status(404).json({ success: false, error: 'Scheduled job not found' });
    scheduledJobs.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/sources', (req, res) => {
  try {
    const { type, url, config } = req.body;
    if (!type || !url) return res.status(400).json({ success: false, error: 'type and url required' });
    const source = { type, url, config: config || {}, id: 'src-' + Date.now(), createdAt: new Date().toISOString() };
    res.status(201).json({ success: true, data: source });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/sources', (req, res) => {
  try {
    const { type } = req.query;
    let sources = scraper.getAllSources ? scraper.getAllSources() : [];
    if (type) sources = sources.filter(s => s.type === type);
    res.json({ success: true, data: sources });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/extraction-rules', (req, res) => {
  try {
    const { name, selector, attribute, transform, filters } = req.body;
    if (!name || !selector) return res.status(400).json({ success: false, error: 'name and selector required' });
    extractionRules.set(name, { name, selector, attribute: attribute || 'text', transform: transform || 'none', filters: filters || [], createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: extractionRules.get(name) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/extraction-rules', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(extractionRules.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/extraction-rules/:name', (req, res) => {
  try {
    const rule = extractionRules.get(req.params.name);
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/extraction-rules/:name', (req, res) => {
  try {
    const rule = extractionRules.get(req.params.name);
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    Object.assign(rule, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: rule });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/extraction-rules/:name', (req, res) => {
  try {
    if (!extractionRules.has(req.params.name)) return res.status(404).json({ success: false, error: 'Rule not found' });
    extractionRules.delete(req.params.name);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/deduplicate', (req, res) => {
  try {
    const { jobId, field } = req.body;
    const count = scraper.deduplicateResults ? scraper.deduplicateResults(jobId, field || 'url') : 0;
    res.json({ success: true, data: { removed: count } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/output/format', (req, res) => {
  try {
    const { jobId, format, options } = req.body;
    if (!jobId || !format) return res.status(400).json({ success: false, error: 'jobId and format required' });
    const result = scraper.formatOutput ? scraper.formatOutput(jobId, format, options) : { message: 'Output formatting ready' };
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/webhook', (req, res) => {
  try {
    const { jobId, url, events } = req.body;
    if (!jobId || !url) return res.status(400).json({ success: false, error: 'jobId and url required' });
    scraper.setWebhook ? scraper.setWebhook(jobId, url, events || ['completed', 'failed']) : null;
    res.json({ success: true, data: { jobId, webhookUrl: url, events: events || ['completed', 'failed'] } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/rate-limit', (req, res) => {
  try {
    const { sourcePattern, requestsPerMinute, concurrentRequests } = req.body;
    if (!sourcePattern || !requestsPerMinute) return res.status(400).json({ success: false, error: 'sourcePattern and requestsPerMinute required' });
    rateLimitConfig.set(sourcePattern, { sourcePattern, requestsPerMinute, concurrentRequests: concurrentRequests || 1 });
    res.json({ success: true, data: rateLimitConfig.get(sourcePattern) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/rate-limit', (req, res) => {
  try {
    res.json({ success: true, data: Array.from(rateLimitConfig.values()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/proxies', (req, res) => {
  try {
    const { proxy } = req.body;
    if (!proxy) return res.status(400).json({ success: false, error: 'proxy url required' });
    proxyList.push({ proxy, addedAt: new Date().toISOString() });
    res.status(201).json({ success: true, data: { proxy, total: proxyList.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/proxies', (req, res) => {
  try {
    res.json({ success: true, data: proxyList });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/proxies/rotate', (req, res) => {
  try {
    const currentProxy = proxyList.length > 0 ? proxyList[Math.floor(Math.random() * proxyList.length)] : null;
    if (scraper.setProxy) scraper.setProxy(currentProxy?.proxy);
    res.json({ success: true, data: { currentProxy: currentProxy?.proxy || 'none' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/proxies/:proxy', (req, res) => {
  try {
    const decoded = decodeURIComponent(req.params.proxy);
    const idx = proxyList.findIndex(p => p.proxy === decoded);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Proxy not found' });
    proxyList.splice(idx, 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/notify', (req, res) => {
  try {
    const { jobId, channel, config } = req.body;
    if (!jobId || !channel) return res.status(400).json({ success: false, error: 'jobId and channel required' });
    scraper.setErrorNotification ? scraper.setErrorNotification(jobId, channel, config || {}) : null;
    res.json({ success: true, data: { jobId, channel } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/sitemap', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'url required' });
    const pages = scraper.parseSitemap ? await scraper.parseSitemap(url) : [];
    res.json({ success: true, data: { url, pagesFound: pages.length, pages } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/rss', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'url required' });
    const items = scraper.parseRSS ? await scraper.parseRSS(url) : [];
    res.json({ success: true, data: { url, itemsFound: items.length, items } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        queues: jobQueues.size,
        scheduledJobs: scheduledJobs.size,
        extractionRules: extractionRules.size,
        proxies: proxyList.length,
        isRunning: scraper.isRunning ? scraper.isRunning() : false,
        uptime: process.uptime()
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
