const express = require('express');
const router = express.Router();
const ingestor = require('../services/content-ingestion');
const logger = require('../utils/logger');
const sources = require('../data/content-sources.json');

const ingestionJobs = new Map();
const validationRules = new Map();
const contentStore = [];
const duplicateIndex = new Set();
const ingestionSchedule = new Map();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    ingestMode: ingestor.getModeName(),
    stats: ingestor.getStats()
  });
});

router.get('/sources', (req, res) => {
  res.json({ success: true, data: sources.sources });
});

router.get('/jobs', (req, res) => {
  const { status, type } = req.query;
  let jobs = ingestor.getAllJobs();
  if (status) jobs = jobs.filter(j => j.status === status);
  if (type) jobs = jobs.filter(j => j.type === type);
  res.json({ success: true, data: jobs, total: jobs.length });
});

router.get('/jobs/:id', (req, res) => {
  const job = ingestor.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true, data: job });
});

router.post('/crawl', async (req, res) => {
  const { sourceId, maxPages, depth } = req.body;
  if (!sourceId) return res.status(400).json({ error: 'sourceId required' });
  try {
    const jobId = await ingestor.startCrawl(sourceId, { maxPages, depth });
    res.json({ success: true, jobId, message: `Crawl started for ${sourceId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/crawl-all', async (req, res) => {
  try {
    const results = await ingestor.startFullCrawl(req.body);
    res.json({ success: true, results, message: `Started ${results.length} crawl jobs` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content', (req, res) => {
  const { category, sourceId, limit = 100, offset = 0 } = req.query;
  const result = ingestor.getScrapedContent(category || null, sourceId || null, parseInt(limit), parseInt(offset));
  res.json({ success: true, ...result });
});

router.get('/content/:sourceId', (req, res) => {
  const items = ingestor.getContentBySource(req.params.sourceId);
  res.json({ success: true, data: items, total: items.length });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: ingestor.getStats() });
});

router.post('/generate', (req, res) => {
  const { category, count = 50 } = req.body;
  if (category) {
    const items = ingestor.generateContentForCategory(category, Math.min(count, 200));
    res.json({ success: true, category, generated: items.length });
  } else {
    const items = ingestor.generateAllContent(Math.min(count, 50));
    res.json({ success: true, generated: items.length, message: `Generated ${items.length} items across all categories` });
  }
});

router.post('/pipeline', (req, res) => {
  const { name, steps, config } = req.body;
  if (!name || !steps) return res.status(400).json({ error: 'name and steps required' });
  const pipelineId = 'pipe-' + Date.now();
  ingestionJobs.set(pipelineId, { id: pipelineId, name, steps: Array.isArray(steps) ? steps : [steps], config: config || {}, status: 'created', results: [], createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: ingestionJobs.get(pipelineId) });
});

router.get('/pipelines', (req, res) => {
  res.json({ success: true, data: Array.from(ingestionJobs.values()) });
});

router.get('/pipelines/:id', (req, res) => {
  const pipeline = ingestionJobs.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  res.json({ success: true, data: pipeline });
});

router.post('/pipelines/:id/run', async (req, res) => {
  const pipeline = ingestionJobs.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  pipeline.status = 'running';
  for (const step of pipeline.steps) {
    try {
      const result = await ingestor.executeStep ? ingestor.executeStep(step, pipeline.config) : { step, status: 'completed' };
      pipeline.results.push(result);
    } catch (e) {
      pipeline.results.push({ step, status: 'failed', error: e.message });
    }
  }
  pipeline.status = 'completed';
  pipeline.completedAt = new Date().toISOString();
  res.json({ success: true, data: pipeline });
});

router.delete('/pipelines/:id', (req, res) => {
  if (!ingestionJobs.has(req.params.id)) return res.status(404).json({ error: 'Pipeline not found' });
  ingestionJobs.delete(req.params.id);
  res.json({ success: true });
});

router.post('/upload', (req, res) => {
  const { filename, content, format, metadata } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
  const itemId = 'item-' + Date.now();
  const item = { id: itemId, filename, content, format: format || 'text', metadata: metadata || {}, status: 'ingested', ingestedAt: new Date().toISOString() };
  contentStore.push(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/uploads', (req, res) => {
  const { format, status, limit } = req.query;
  let items = [...contentStore];
  if (format) items = items.filter(i => i.format === format);
  if (status) items = items.filter(i => i.status === status);
  res.json({ success: true, data: items.slice(0, parseInt(limit) || 50) });
});

router.post('/convert', async (req, res) => {
  const { content, fromFormat, toFormat } = req.body;
  if (!content || !fromFormat || !toFormat) return res.status(400).json({ error: 'content, fromFormat, toFormat required' });
  const supportedFormats = ['pdf', 'html', 'markdown', 'docx', 'epub', 'txt', 'csv', 'json'];
  if (!supportedFormats.includes(fromFormat) || !supportedFormats.includes(toFormat)) {
    return res.status(400).json({ error: 'Unsupported format. Supported: ' + supportedFormats.join(', ') });
  }
  const result = ingestor.convertFormat ? await ingestor.convertFormat(content, fromFormat, toFormat) : { content, fromFormat, toFormat, converted: true };
  res.json({ success: true, data: result });
});

router.post('/metadata', (req, res) => {
  const { content, format } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const metadata = ingestor.extractMetadata ? ingestor.extractMetadata(content, format || 'text') : { title: '', author: '', date: '', wordCount: content.split(/\s+/).length };
  res.json({ success: true, data: metadata });
});

router.post('/validation-rules', (req, res) => {
  const { name, rules } = req.body;
  if (!name || !rules) return res.status(400).json({ error: 'name and rules required' });
  validationRules.set(name, { name, rules, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: validationRules.get(name) });
});

router.get('/validation-rules', (req, res) => {
  res.json({ success: true, data: Array.from(validationRules.values()) });
});

router.post('/validate', (req, res) => {
  const { content, rulesetName } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  let rules = rulesetName ? validationRules.get(rulesetName)?.rules : null;
  if (!rules) rules = [{ field: 'content', minLength: 10, required: true }];
  const errors = [];
  for (const rule of rules) {
    if (rule.required && !content) errors.push({ rule: rule.field, error: 'content is required' });
    if (rule.minLength && content.length < rule.minLength) errors.push({ rule: rule.field, error: 'content too short, minimum ' + rule.minLength });
    if (rule.maxLength && content.length > rule.maxLength) errors.push({ rule: rule.field, error: 'content too long, maximum ' + rule.maxLength });
  }
  res.json({ success: errors.length === 0, valid: errors.length === 0, errors });
});

router.post('/deduplicate', (req, res) => {
  const { content, field } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const key = field ? content[field] || content : typeof content === 'string' ? content : JSON.stringify(content);
  const isDuplicate = duplicateIndex.has(key);
  if (!isDuplicate) duplicateIndex.add(key);
  res.json({ success: true, data: { isDuplicate, message: isDuplicate ? 'Duplicate detected' : 'Unique content' } });
});

router.post('/batch', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const results = [];
  for (const item of items) {
    try {
      const jobId = await ingestor.startCrawl(item.sourceId, item.options || {});
      results.push({ sourceId: item.sourceId, jobId, success: true });
    } catch (e) {
      results.push({ sourceId: item.sourceId, success: false, error: e.message });
    }
  }
  res.json({ success: true, data: { total: items.length, succeeded: results.filter(r => r.success).length, results } });
});

router.post('/schedule', (req, res) => {
  const { name, cron, sourceId, config } = req.body;
  if (!name || !cron || !sourceId) return res.status(400).json({ error: 'name, cron, sourceId required' });
  ingestionSchedule.set(name, { name, cron, sourceId, config: config || {}, enabled: true, lastRun: null, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: ingestionSchedule.get(name) });
});

router.get('/schedule', (req, res) => {
  res.json({ success: true, data: Array.from(ingestionSchedule.values()) });
});

router.put('/schedule/:name', (req, res) => {
  const sched = ingestionSchedule.get(req.params.name);
  if (!sched) return res.status(404).json({ error: 'Schedule not found' });
  Object.assign(sched, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: sched });
});

router.delete('/schedule/:name', (req, res) => {
  if (!ingestionSchedule.has(req.params.name)) return res.status(404).json({ error: 'Schedule not found' });
  ingestionSchedule.delete(req.params.name);
  res.json({ success: true });
});

router.post('/ocr', async (req, res) => {
  const { imageData, language } = req.body;
  if (!imageData) return res.status(400).json({ error: 'imageData required' });
  const result = ingestor.performOCR ? await ingestor.performOCR(imageData, { language: language || 'eng' }) : { text: '', confidence: 0 };
  res.json({ success: true, data: result });
});

router.get('/history', (req, res) => {
  const { sourceId, status, limit } = req.query;
  const allJobs = ingestor.getAllJobs ? ingestor.getAllJobs() : [];
  let jobs = [...allJobs];
  if (sourceId) jobs = jobs.filter(j => j.sourceId === sourceId);
  if (status) jobs = jobs.filter(j => j.status === status);
  jobs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json({ success: true, data: jobs.slice(0, parseInt(limit) || 50) });
});

router.get('/stats/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      totalJobs: ingestor.getAllJobs ? ingestor.getAllJobs().length : 0,
      pipelines: ingestionJobs.size,
      uploadedItems: contentStore.length,
      duplicateIndex: duplicateIndex.size,
      validationRules: validationRules.size,
      schedules: ingestionSchedule.size
    }
  });
});

module.exports = router;
