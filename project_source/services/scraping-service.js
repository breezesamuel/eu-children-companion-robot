const { EventEmitter } = require('events');
const logger = require('../utils/logger');

let axios;
try { axios = require('axios'); } catch (_) { axios = null; }

const SOURCES = [
    { id: 'huginn', name: 'Huginn', description: 'Agent-based automation', type: 'framework' },
    { id: 'changedetection', name: 'ChangeDetection', description: 'Website change detection', type: 'tool' },
    { id: 'playwright', name: 'Playwright', description: 'Browser automation', type: 'browser' },
    { id: 'puppeteer', name: 'Puppeteer', description: 'Chrome headless', type: 'browser' },
    { id: 'scrapy', name: 'Scrapy', description: 'Python scraping framework', type: 'framework' },
    { id: 'beautifulsoup', name: 'BeautifulSoup', description: 'HTML parser', type: 'parser' },
    { id: 'cheerio', name: 'Cheerio', description: 'Node.js HTML parser', type: 'parser' },
    { id: 'selenium', name: 'Selenium', description: 'Browser automation', type: 'browser' },
    { id: 'apify', name: 'Apify', description: 'Web scraping platform', type: 'platform' },
    { id: 'crawl4ai', name: 'Crawl4AI', description: 'AI-powered crawling', type: 'ai' }
];

const CRON_MS = { m: 60000, h: 3600000, d: 86400000 };

class ScrapingService extends EventEmitter {
    constructor() {
        super();
        this.jobs = new Map();
        this.results = new Map();
        this.sources = SOURCES;
        this.scheduledJobs = new Map();
        this.maxResultsPerJob = 1000;
        this.maxConcurrentJobs = 5;
        this.runningJobs = 0;
        this._tools = new Map();
        this._startTime = Date.now();
        this._idCounter = 0;
        logger.info('ScrapingService initialized', { sources: this.sources.length });
    }

    /** Create a scraping job with config. Emits 'job:created'. */
    createJob(config) {
        try {
            if (!config || !config.url) throw new Error('URL is required');
            const validTypes = ['html', 'json', 'rss', 'sitemap', 'screenshot'];
            if (config.type && !validTypes.includes(config.type)) {
                throw new Error(`Invalid type "${config.type}". Valid: ${validTypes.join(', ')}`);
            }
            const id = `job_${++this._idCounter}_${Date.now()}`;
            const job = {
                id, name: config.name || `Scrape-${config.url}`, type: config.type || 'html',
                url: config.url, selector: config.selector || null, schedule: config.schedule || null,
                depth: config.depth != null ? config.depth : 1, maxPages: config.maxPages || 10,
                followLinks: config.followLinks || false, headers: config.headers || {},
                timeout: config.timeout || 30000, transform: config.transform || 'html',
                storage: config.storage || 'memory', notifyOnChange: config.notifyOnChange || false,
                enabled: true, createdAt: new Date().toISOString(),
                lastRun: null, nextRun: null, runCount: 0, errorCount: 0
            };
            this.jobs.set(id, job);
            this.results.set(id, []);
            if (job.schedule) this._scheduleJob(id, job.schedule);
            this.emit('job:created', { jobId: id, job });
            logger.info('Job created', { jobId: id, url: config.url });
            return { success: true, jobId: id, job };
        } catch (err) {
            logger.error('createJob failed', { error: err.message });
            throw err;
        }
    }

    /** @returns {{ job, resultCount, lastRun, nextRun, status }|null} */
    getJob(jobId) {
        try {
            const job = this.jobs.get(jobId);
            if (!job) return null;
            const results = this.results.get(jobId) || [];
            return { job, resultCount: results.length, lastRun: job.lastRun, nextRun: job.nextRun, status: job.enabled ? 'active' : 'paused' };
        } catch (err) { logger.error('getJob failed', { jobId, error: err.message }); return null; }
    }

    /** @returns {Array} all jobs */
    getAllJobs() {
        try { return Array.from(this.jobs.values()); } catch (err) { logger.error('getAllJobs failed', { error: err.message }); return []; }
    }

    /** Update job config fields. Respects schedule/enabled changes. */
    updateJob(jobId, updates) {
        try {
            const job = this.jobs.get(jobId);
            if (!job) { logger.warn('Job not found', { jobId }); return null; }
            const oldSchedule = job.schedule;
            const allowed = ['name','type','url','selector','schedule','depth','maxPages','followLinks','headers','timeout','transform','storage','notifyOnChange','enabled'];
            for (const k of Object.keys(updates)) { if (allowed.includes(k)) job[k] = updates[k]; }
            if (updates.schedule && updates.schedule !== oldSchedule) { this._clearScheduledJob(jobId); this._scheduleJob(jobId, updates.schedule); }
            if (updates.enabled === false && oldSchedule) this._clearScheduledJob(jobId);
            if (updates.enabled === true && job.schedule) { this._clearScheduledJob(jobId); this._scheduleJob(jobId, job.schedule); }
            this.jobs.set(jobId, job);
            logger.info('Job updated', { jobId });
            return { success: true, job };
        } catch (err) { logger.error('updateJob failed', { jobId, error: err.message }); return null; }
    }

    /** Delete job, clear interval, remove all results. Emits 'job:deleted'. */
    deleteJob(jobId) {
        try {
            if (!this.jobs.has(jobId)) return { success: false, error: 'Job not found' };
            this._clearScheduledJob(jobId);
            this.jobs.delete(jobId);
            this.results.delete(jobId);
            this.emit('job:deleted', { jobId });
            logger.info('Job deleted', { jobId });
            return { success: true, jobId };
        } catch (err) { logger.error('deleteJob failed', { jobId, error: err.message }); return { success: false, error: err.message }; }
    }

    /** Execute a scraping job immediately. Emits 'job:complete'. */
    async runJob(jobId) {
        try {
            const job = this.jobs.get(jobId);
            if (!job) return { success: false, error: 'Job not found' };
            if (this.runningJobs >= this.maxConcurrentJobs) {
                return { success: false, error: 'Concurrency limit reached', queued: true };
            }
            this.runningJobs++;
            const start = Date.now();
            const resp = await this._fetchContent(job.url, { headers: job.headers, timeout: job.timeout });
            if (!resp.success) { job.errorCount++; this.runningJobs--; return { success: false, error: resp.error, statusCode: resp.statusCode }; }
            let data = resp.body;
            if (job.selector && resp.body) data = this._applySelector(resp.body, job.selector);
            const transformed = job.transform !== 'html' ? this._applyTransform(typeof data === 'string' ? data : JSON.stringify(data), job.transform) : data;
            const result = {
                id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, jobId,
                timestamp: new Date().toISOString(), url: job.url, statusCode: resp.statusCode,
                contentType: resp.contentType, size: resp.size, duration: Date.now() - start,
                data: transformed, raw: job.storage === 'memory' ? null : (resp.body || '').slice(0, 10000)
            };
            const results = this.results.get(jobId) || [];
            results.push(result);
            this.results.set(jobId, results);
            this._cleanResults(jobId);
            job.lastRun = new Date().toISOString();
            job.runCount++;
            this.jobs.set(jobId, job);
            this.runningJobs--;
            const summary = { jobId, url: job.url, statusCode: resp.statusCode, size: resp.size, duration: result.duration, resultCount: results.length };
            this.emit('job:complete', summary);
            logger.info('Job completed', summary);
            return { success: true, result, summary };
        } catch (err) {
            logger.error('runJob failed', { jobId, error: err.message });
            this.runningJobs = Math.max(0, this.runningJobs - 1);
            return { success: false, error: err.message };
        }
    }

    /** Run all enabled jobs sequentially. */
    async runAllJobs() {
        const results = [];
        const enabled = Array.from(this.jobs.values()).filter(j => j.enabled);
        logger.info('Running all enabled jobs', { count: enabled.length });
        for (const job of enabled) results.push({ jobId: job.id, result: await this.runJob(job.id) });
        return results;
    }

    /**
     * Get results with pagination and sorting.
     * @param {Object} [opts] - { limit: 20, offset: 0, sort: 'newest'|'oldest', format: 'raw'|'summary' }
     */
    getResults(jobId, opts = {}) {
        try {
            const all = this.results.get(jobId);
            if (!all) return { success: false, error: 'No results', results: [], total: 0 };
            const { limit = 20, offset = 0, sort = 'newest', format = 'raw' } = opts;
            let sorted = [...all];
            sorted.sort((a, b) => sort === 'newest' ? new Date(b.timestamp) - new Date(a.timestamp) : new Date(a.timestamp) - new Date(b.timestamp));
            const page = sorted.slice(offset, offset + limit);
            const results = format === 'summary' ? page.map(r => ({
                id: r.id, jobId: r.jobId, timestamp: r.timestamp, statusCode: r.statusCode,
                size: r.size, duration: r.duration,
                preview: typeof r.data === 'string' ? r.data.slice(0, 200) : JSON.stringify(r.data).slice(0, 200)
            })) : page;
            return { success: true, results, total: all.length, limit, offset, returned: results.length };
        } catch (err) { logger.error('getResults failed', { jobId, error: err.message }); return { success: false, error: err.message, results: [], total: 0 }; }
    }

    /** Delete results older than an ISO date string. */
    deleteResults(jobId, olderThan) {
        try {
            const results = this.results.get(jobId);
            if (!results) return { success: false, error: 'Job not found', deleted: 0 };
            const cutoff = new Date(olderThan).getTime();
            if (isNaN(cutoff)) return { success: false, error: 'Invalid date', deleted: 0 };
            const before = results.length;
            const remaining = results.filter(r => new Date(r.timestamp).getTime() >= cutoff);
            this.results.set(jobId, remaining);
            const deleted = before - remaining.length;
            logger.info('Deleted old results', { jobId, deleted });
            return { success: true, deleted, remaining: remaining.length };
        } catch (err) { logger.error('deleteResults failed', { jobId, error: err.message }); return { success: false, error: err.message, deleted: 0 }; }
    }

    /** Simulated HTTP fetch. Tries axios, falls back to simulation. */
    async _fetchContent(url, opts = {}) {
        const start = Date.now();
        try {
            if (!url || typeof url !== 'string') return { success: false, error: 'Invalid URL' };
            let parsed;
            try { parsed = new URL(url); } catch (_) { return { success: false, error: 'Malformed URL' }; }
            if (!['http:', 'https:'].includes(parsed.protocol)) return { success: false, error: `Unsupported protocol: ${parsed.protocol}` };
            if (axios) {
                try {
                    const resp = await axios.get(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScrapingService/1.0)', ...opts.headers },
                        timeout: opts.timeout || 30000, responseType: 'text', validateStatus: () => true
                    });
                    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                    return {
                        success: resp.status >= 200 && resp.status < 400, statusCode: resp.status,
                        headers: resp.headers, body, contentType: resp.headers['content-type'] || 'text/html',
                        size: Buffer.byteLength(body, 'utf8'), duration: Date.now() - start
                    };
                } catch (e) { logger.warn('Axios failed, using simulation', { url, error: e.message }); }
            }
            return this._simulateFetch(url, start, opts);
        } catch (err) {
            return { success: false, error: err.message, statusCode: 0, body: null, contentType: null, size: 0, duration: Date.now() - start };
        }
    }

    /** Generate realistic simulated response based on URL pattern. */
    _simulateFetch(url, start) {
        const delay = Math.min(200 + Math.random() * 800, 30000);
        const duration = Date.now() - start + delay;
        const lower = url.toLowerCase();
        let body, type;
        const now = new Date();
        const yesterday = new Date(now - 86400000);

        if (lower.includes('rss') || lower.includes('feed')) {
            type = 'application/rss+xml';
            body = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><link>${url}</link>${[1,2].map(i => `
    <item><title>Article ${i}</title><link>${url}/a${i}</link><description>Sample article ${i} description.</description><pubDate>${(i===1?now:yesterday).toUTCString()}</pubDate></item>`).join('')}
</channel></rss>`;
        } else if (lower.includes('sitemap')) {
            type = 'application/xml';
            body = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[1,2,3].map(i => `
    <url><loc>${url}/p${i}</loc><lastmod>${now.toISOString().slice(0,10)}</lastmod><priority>${(1 - i*0.2).toFixed(1)}</priority></url>`).join('')}
</urlset>`;
        } else if (lower.includes('api') || lower.includes('json')) {
            type = 'application/json';
            body = JSON.stringify({ status: 'ok', data: [{ id: 1, title: 'Sample', content: 'Simulated content' }], total: 1, timestamp: now.toISOString() });
        } else {
            type = 'text/html; charset=utf-8';
            const host = new URL(url).hostname || 'example.com';
            body = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${host}</title><meta name="description" content="Sample site"></head>
<body><header><h1>${host}</h1><nav><a href="/a">About</a><a href="/b">Blog</a></nav></header>
<main><article class="post"><h2>Post 1</h2><p class="summary">Summary text here.</p><div class="content"><p>Full content paragraph with more text for testing.</p></div><span class="date">${now.toISOString().slice(0,10)}</span></article>
<article class="post"><h2>Post 2</h2><p class="summary">Second post summary.</p><div class="content"><p>Another content block with <strong>bold</strong> and <em>italic</em> text.</p><ul><li>Item A</li><li>Item B</li></ul></div><span class="date">${yesterday.toISOString().slice(0,10)}</span></article></main>
<footer>&copy; 2024 ${host}</footer></body></html>`;
        }
        return {
            success: true, statusCode: 200,
            headers: { 'content-type': type, 'content-length': String(Buffer.byteLength(body, 'utf8')), server: 'Simulated/1.0', date: now.toUTCString() },
            body, contentType: type, size: Buffer.byteLength(body, 'utf8'), duration: Math.round(duration)
        };
    }

    /** Transform body to target format: 'markdown', 'text', or 'structured'. */
    _applyTransform(body, transform) {
        try {
            if (!body) return '';
            if (transform === 'markdown') {
                return body
                    .replace(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi, (_, c) => `${'#'.repeat(+(_.match(/h(\d)/)?.[1]||1))} ${c}\n\n`)
                    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n').replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
                    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
                    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
                    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
            }
            if (transform === 'text') {
                return body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
            }
            if (transform === 'structured') {
                const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                const desc = body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
                const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                const links = [...body.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '') }));
                const images = [...body.matchAll(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi)].map(m => ({ src: m[1] }));
                return JSON.stringify({
                    title: title?.[1]?.trim() || null, description: desc?.[1] || null, h1: h1?.[1]?.trim() || null,
                    linkCount: links.length, links: links.slice(0, 20), imageCount: images.length, images: images.slice(0, 10),
                    wordCount: body.replace(/<[^>]+>/g, '').split(/\s+/).length, extractedAt: new Date().toISOString()
                }, null, 2);
            }
            return body;
        } catch (err) { logger.error('Transform failed', { transform, error: err.message }); return body; }
    }

    /** Simulate CSS selector on HTML body via regex matching. */
    _applySelector(body, selector) {
        try {
            if (!body || !selector) return [];
            const results = [];
            for (const sel of selector.split(',').map(s => s.trim())) {
                if (sel.startsWith('#')) {
                    const m = body.match(new RegExp(`<[^>]*id=["']${sel.slice(1)}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
                    if (m) results.push(m[1].replace(/<[^>]+>/g, '').trim());
                } else if (sel.startsWith('.')) {
                    const re = new RegExp(`<[^>]*class=["'][^"']*${sel.slice(1)}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
                    let m; while ((m = re.exec(body)) !== null) results.push(m[1].replace(/<[^>]+>/g, '').trim());
                } else if (sel.startsWith('[')) {
                    const a = sel.match(/\[(\w+)([=~|^$*]?)["']?([^"'\]]*)["']?\]/);
                    if (a) { const re = new RegExp(`<[^>]*${a[1]}=["'][^"']*${a[3]}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi'); let m; while ((m = re.exec(body)) !== null) results.push(m[1].replace(/<[^>]+>/g, '').trim()); }
                } else {
                    const re = new RegExp(`<${sel}[^>]*>([\\s\\S]*?)<\\/${sel}>`, 'gi');
                    let m; while ((m = re.exec(body)) !== null) results.push(m[1].replace(/<[^>]+>/g, '').trim());
                }
            }
            return results.filter(Boolean);
        } catch (err) { logger.error('Selector failed', { selector, error: err.message }); return []; }
    }

    /** Parse cron-like pattern and set an interval for the job. */
    _scheduleJob(jobId, schedule) {
        try {
            const interval = this._parseCronToMs(schedule);
            if (interval <= 0) { logger.warn('Invalid schedule', { jobId, schedule }); return; }
            const timerId = setInterval(() => this.runJob(jobId), interval);
            this.scheduledJobs.set(jobId, { timerId, interval, schedule });
            const job = this.jobs.get(jobId);
            if (job) { job.nextRun = new Date(Date.now() + interval).toISOString(); this.jobs.set(jobId, job); }
            logger.info('Job scheduled', { jobId, schedule, interval });
        } catch (err) { logger.error('scheduleJob failed', { jobId, schedule, error: err.message }); }
    }

    // Convert a cron-like pattern to milliseconds. Supports patterns like */N, 0 *, 0 0 etc.
    _parseCronToMs(pattern) {
        if (!pattern || typeof pattern !== 'string') return 0;
        const parts = pattern.trim().split(/\s+/);
        if (parts.length < 5) { const n = parseInt(pattern, 10); return !isNaN(n) && n > 0 ? n * 1000 : 0; }
        const [min, hr] = parts;
        if (min.startsWith('*/')) { const n = parseInt(min.slice(2), 10); if (!isNaN(n) && n > 0) return n * CRON_MS.m; }
        if (min === '0' && hr === '*') return CRON_MS.h;
        if (min === '0' && hr === '0') return CRON_MS.d;
        if (min === '0' && hr.startsWith('*/')) { const n = parseInt(hr.slice(2), 10); if (!isNaN(n) && n > 0) return n * CRON_MS.h; }
        return CRON_MS.h;
    }

    _clearScheduledJob(jobId) {
        const s = this.scheduledJobs.get(jobId);
        if (s) { clearInterval(s.timerId); this.scheduledJobs.delete(jobId); }
    }

    _cleanResults(jobId) {
        const r = this.results.get(jobId);
        if (r && r.length > this.maxResultsPerJob) {
            r.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            this.results.set(jobId, r.slice(0, this.maxResultsPerJob));
        }
    }

    /** Register a custom scraping tool with a handler function. Emits 'tool:registered'. */
    registerScrapingTool(name, handler) {
        try {
            if (!name || typeof name !== 'string') return { success: false, error: 'Name required' };
            if (typeof handler !== 'function') return { success: false, error: 'Handler must be a function' };
            if (this._tools.has(name)) logger.warn('Overwriting tool', { name });
            const tool = { name, handler, registeredAt: new Date().toISOString() };
            this._tools.set(name, tool);
            this.emit('tool:registered', { name });
            logger.info('Tool registered', { name });
            return { success: true, tool: { name, registeredAt: tool.registeredAt } };
        } catch (err) { logger.error('registerTool failed', { name, error: err.message }); return { success: false, error: err.message }; }
    }

    /** Return list of registered tools + built-in sources. */
    getAvailableTools() {
        try {
            const custom = Array.from(this._tools.values()).map(t => ({ name: t.name, type: 'custom', registeredAt: t.registeredAt }));
            return [...this.sources, ...custom];
        } catch (err) { logger.error('getAvailableTools failed', { error: err.message }); return []; }
    }

    /** Run a registered tool by name with the given context. Emits 'tool:ran'. */
    async runTool(toolName, context) {
        try {
            const tool = this._tools.get(toolName);
            if (!tool) {
                const src = this.sources.find(s => s.id === toolName);
                if (src) return { success: false, error: `"${toolName}" is a known source but no handler registered`, source: src };
                return { success: false, error: `Tool "${toolName}" not found` };
            }
            const result = await tool.handler(context);
            this.emit('tool:ran', { toolName, result });
            return { success: true, toolName, result };
        } catch (err) { logger.error('runTool failed', { toolName, error: err.message }); return { success: false, error: err.message }; }
    }

    /** Import config suggestion from an awesome-selfhosted source. */
    importFromAwesomeSelfhosted(source) {
        try {
            if (!source || typeof source !== 'string') return { success: false, error: 'Source required' };
            const found = this.sources.find(s => s.id === source || s.name === source);
            if (!found) return { success: false, error: `Source "${source}" not found`, available: this.sources.map(s => s.id) };
            logger.info('Imported awesome-selfhosted config', { source: found.id });
            return {
                success: true, source: found,
                suggestedConfig: { name: `Import-${found.name}`, type: 'html', url: `https://github.com/awesome-selfhosted/${found.id}`, transform: 'markdown', storage: 'memory', headers: { 'X-Scraping-Source': 'awesome-selfhosted', 'X-Tool-ID': found.id } }
            };
        } catch (err) { logger.error('importFromAwesomeSelfhosted failed', { source, error: err.message }); return { success: false, error: err.message }; }
    }

    /** Return service statistics. */
    getStats() {
        try {
            const allJobs = Array.from(this.jobs.values());
            let totalResults = 0;
            for (const r of this.results.values()) totalResults += r.length;
            const uptime = Date.now() - this._startTime;
            return {
                totalJobs: this.jobs.size, activeJobs: allJobs.filter(j => j.enabled).length,
                totalResults, toolsRegistered: this._tools.size, uptime,
                uptimeHuman: this._formatUptime(uptime), scheduledJobs: this.scheduledJobs.size,
                totalRuns: allJobs.reduce((a, j) => a + (j.runCount || 0), 0),
                totalErrors: allJobs.reduce((a, j) => a + (j.errorCount || 0), 0),
                runningJobs: this.runningJobs, maxConcurrentJobs: this.maxConcurrentJobs,
                sourcesAvailable: this.sources.length
            };
        } catch (err) { logger.error('getStats failed', { error: err.message }); return { totalJobs: 0, activeJobs: 0, totalResults: 0, toolsRegistered: 0, uptime: 0 }; }
    }

    _formatUptime(ms) {
        const s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000) % 24, d = Math.floor(ms / 86400000);
        const p = [];
        if (d) p.push(`${d}d`); if (h) p.push(`${h}h`); if (m) p.push(`${m}m`); p.push(`${s}s`);
        return p.join(' ');
    }

    /** Stop all scheduled jobs, clear intervals, remove listeners. Emits 'stopped'. */
    stop() {
        try {
            for (const [id, s] of this.scheduledJobs) { clearInterval(s.timerId); }
            this.scheduledJobs.clear();
            for (const j of this.jobs.values()) j.nextRun = null;
            this.emit('stopped', { uptime: Date.now() - this._startTime });
            logger.info('ScrapingService stopped');
            this.removeAllListeners();
            return { success: true };
        } catch (err) { logger.error('stop failed', { error: err.message }); return { success: false, error: err.message }; }
    }
}

module.exports = ScrapingService;
