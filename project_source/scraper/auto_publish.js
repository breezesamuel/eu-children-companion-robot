const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CronJob } = require('cron');
const EventEmitter = require('events');

class PublishQueue {
    constructor() {
        this.items = [];
        this.processing = false;
    }

    enqueue(item) {
        item.priority = item.priority || 0;
        item.status = 'queued';
        item.createdAt = Date.now();
        this.items.push(item);
        this.items.sort((a, b) => b.priority - a.priority);
    }

    dequeue() {
        const idx = this.items.findIndex(i => i.status === 'queued');
        if (idx === -1) return null;
        this.items[idx].status = 'processing';
        return this.items[idx];
    }

    remove(id) {
        this.items = this.items.filter(i => i.id !== id);
    }

    getNext() {
        return this.items.find(i => i.status === 'queued');
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }
}

class PublishHistory {
    constructor(historyPath = './publish_history.json') {
        this.historyPath = historyPath;
        this.records = [];
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.historyPath)) {
                this.records = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
            }
        } catch (e) {
            this.records = [];
        }
    }

    _save() {
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(this.records, null, 2));
        } catch (e) {
            console.error('Failed to save publish history:', e.message);
        }
    }

    addRecord(record) {
        record.id = record.id || `pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        record.timestamp = record.timestamp || Date.now();
        this.records.unshift(record);
        this._save();
        return record.id;
    }

    updateRecord(id, updates) {
        const idx = this.records.findIndex(r => r.id === id);
        if (idx === -1) return false;
        Object.assign(this.records[idx], updates);
        this._save();
        return true;
    }

    getRecords({ platform, status, limit = 50, offset = 0 } = {}) {
        let filtered = this.records;
        if (platform) filtered = filtered.filter(r => r.platform === platform);
        if (status) filtered = filtered.filter(r => r.status === status);
        return filtered.slice(offset, offset + limit);
    }

    getAnalytics() {
        const total = this.records.length;
        const successful = this.records.filter(r => r.status === 'published').length;
        const failed = this.records.filter(r => r.status === 'failed').length;
        const platformBreakdown = {};
        this.records.forEach(r => {
            if (!platformBreakdown[r.platform]) platformBreakdown[r.platform] = { total: 0, success: 0, failed: 0 };
            platformBreakdown[r.platform].total++;
            if (r.status === 'published') platformBreakdown[r.platform].success++;
            else if (r.status === 'failed') platformBreakdown[r.platform].failed++;
        });
        return { total, successful, failed, successRate: total ? (successful / total * 100).toFixed(2) : 0, platformBreakdown };
    }

    getEngagementStats() {
        return this.records
            .filter(r => r.analytics)
            .reduce((acc, r) => {
                acc.totalViews = (acc.totalViews || 0) + (r.analytics.views || 0);
                acc.totalEngagement = (acc.totalEngagement || 0) + (r.analytics.engagement || 0);
                return acc;
            }, { totalViews: 0, totalEngagement: 0 });
    }
}

class AutoPublish extends EventEmitter {
    constructor(options = {}) {
        super();
        this.platforms = {
            blog: {
                enabled: options.blog?.enabled !== false,
                apiUrl: options.blog?.apiUrl || 'https://api.blog.com',
                apiKey: options.blog?.apiKey,
                format: 'markdown',
                maxLength: 50000
            },
            twitter: {
                enabled: options.twitter?.enabled !== false,
                apiUrl: 'https://api.twitter.com/2',
                apiKey: options.twitter?.apiKey,
                apiSecret: options.twitter?.apiSecret,
                format: 'plain',
                maxLength: 280
            },
            wechat: {
                enabled: options.wechat?.enabled !== false,
                apiUrl: 'https://api.weixin.qq.com',
                appId: options.wechat?.appId,
                appSecret: options.wechat?.appSecret,
                format: 'rich',
                maxLength: 50000
            },
            newsletter: {
                enabled: options.newsletter?.enabled !== false,
                apiUrl: options.newsletter?.apiUrl || 'https://api.newsletter.com',
                apiKey: options.newsletter?.apiKey,
                format: 'html',
                maxLength: 100000
            },
            linkedin: {
                enabled: options.linkedin?.enabled !== false,
                apiUrl: 'https://api.linkedin.com/v2',
                apiKey: options.linkedin?.apiKey,
                format: 'plain',
                maxLength: 3000
            },
            instagram: {
                enabled: options.instagram?.enabled !== false,
                apiUrl: 'https://graph.instagram.com',
                apiKey: options.instagram?.apiKey,
                format: 'image',
                maxLength: 2200
            }
        };
        this.queue = new PublishQueue();
        this.history = new PublishHistory(options.historyPath);
        this.schedules = [];
        this.defaultTags = options.defaultTags || [];
        this.seoConfig = options.seo || { autoGenerate: true, keywordCount: 10 };
        this.scheduledJobs = [];
    }

    formatContent(content, platform, options = {}) {
        const formatters = {
            blog: (c) => {
                let formatted = `# ${c.title || 'Untitled'}\n\n`;
                if (c.excerpt) formatted += `> ${c.excerpt}\n\n`;
                formatted += c.body || c.content || '';
                if (c.tags?.length) formatted += `\n\n---\nTags: ${c.tags.join(', ')}`;
                return formatted;
            },
            twitter: (c) => {
                let text = c.title ? `${c.title}\n\n` : '';
                text += (c.excerpt || c.body || c.content || '').substring(0, 280);
                if (c.url) text += `\n${c.url}`;
                if (text.length > 280) text = text.substring(0, 277) + '...';
                return text;
            },
            newsletter: (c) => {
                return `<h1>${c.title || 'Untitled'}</h1>\n${c.excerpt ? `<p><em>${c.excerpt}</em></p>` : ''}\n<div>${(c.body || c.content || '').replace(/\n/g, '<br>')}</div>`;
            },
            linkedin: (c) => {
                return `${c.title || ''}\n\n${c.excerpt || c.body || c.content || ''}`.substring(0, 3000);
            },
            instagram: (c) => {
                return `${c.title || ''}\n\n${(c.excerpt || c.body || c.content || '').substring(0, 2000)}\n\n${(c.tags || []).map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`;
            },
            default: (c) => c.body || c.content || ''
        };
        const formatter = formatters[platform] || formatters.default;
        return formatter(content);
    }

    generateSEOMetadata(content) {
        const body = (content.title || '') + ' ' + (content.excerpt || '') + ' ' + (content.body || content.content || '');
        const words = body.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const freq = {};
        words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        const keywords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.seoConfig.keywordCount)
            .map(([k]) => k);
        const metaDescription = (content.excerpt || body.substring(0, 160)).substring(0, 160);
        return {
            title: content.title || '',
            description: metaDescription,
            keywords: keywords.join(', '),
            canonical: content.canonicalUrl || content.url || '',
            ogImage: content.ogImage || content.image || '',
            ogType: 'article',
            twitterCard: 'summary_large_image'
        };
    }

    async detectCrossPost(content) {
        const titleHash = crypto.createHash('md5').update(content.title || '').digest('hex');
        const bodyHash = crypto.createHash('md5').update(content.body || content.content || '').digest('hex');
        const duplicates = this.history.records.filter(r => {
            const sameTitle = r.contentHash?.title === titleHash;
            const sameBody = r.contentHash?.body === bodyHash;
            return sameTitle || sameBody;
        });
        return {
            isDuplicate: duplicates.length > 0,
            duplicates,
            titleHash,
            bodyHash
        };
    }

    async addSchedule(cronExpression, content, platforms, options = {}) {
        const job = new CronJob(cronExpression, async () => {
            console.log(`Executing scheduled publish: ${content.title || 'untitled'}`);
            await this.publish(content, platforms, options);
        });
        this.scheduledJobs.push(job);
        job.start();
        return job;
    }

    removeSchedule(index) {
        if (index >= 0 && index < this.scheduledJobs.length) {
            this.scheduledJobs[index].stop();
            this.scheduledJobs.splice(index, 1);
        }
    }

    listSchedules() {
        return this.scheduledJobs.map((job, i) => ({
            index: i,
            running: job.running,
            nextDate: job.nextDate()?.toISO()
        }));
    }

    async publish(content, platforms = ['blog'], options = {}) {
        const crossPostCheck = options.skipDuplicateCheck ? null : await this.detectCrossPost(content);
        if (crossPostCheck?.isDuplicate && !options.forcePublish) {
            console.warn('Duplicate content detected, skipping. Use forcePublish: true to override.');
            return { success: false, error: 'DUPLICATE_CONTENT', duplicates: crossPostCheck.duplicates };
        }

        const queueItem = {
            id: `pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            content,
            platforms,
            options,
            priority: options.priority || 0,
            status: 'queued',
            createdAt: Date.now()
        };

        if (options.draft) {
            queueItem.status = 'draft';
            this.history.addRecord({
                ...queueItem,
                status: 'draft',
                contentHash: crossPostCheck ? { title: crossPostCheck.titleHash, body: crossPostCheck.bodyHash } : undefined
            });
            return { success: true, draft: true, id: queueItem.id, previewUrl: await this.generatePreview(content, platforms) };
        }

        this.queue.enqueue(queueItem);
        if (!options.defer) {
            return await this.processQueue();
        }
        return { success: true, queued: true, id: queueItem.id };
    }

    async processQueue() {
        const results = [];
        while (this.queue.getNext()) {
            const item = this.queue.dequeue();
            const platformResults = [];
            for (const platform of item.platforms) {
                try {
                    const formatted = this.formatContent(item.content, platform);
                    const seo = this.generateSEOMetadata(item.content);
                    const platformResult = await this.publishToPlatform(formatted, platform, { ...item.options, seo, originalContent: item.content });
                    platformResults.push(platformResult);
                    this.history.addRecord({
                        id: item.id,
                        platform,
                        status: platformResult.success ? 'published' : 'failed',
                        content: item.content,
                        contentHash: { title: crypto.createHash('md5').update(item.content.title || '').digest('hex'), body: crypto.createHash('md5').update(item.content.body || item.content.content || '').digest('hex') },
                        formattedLength: formatted.length,
                        seo,
                        error: platformResult.error,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    platformResults.push({ success: false, platform, error: e.message });
                    this.history.addRecord({
                        id: item.id, platform, status: 'failed', error: e.message, timestamp: Date.now()
                    });
                }
            }
            const allOk = platformResults.every(r => r.success);
            results.push({ id: item.id, success: allOk, platforms: platformResults });
        }
        this.emit('queue-processed', results);
        return results;
    }

    async publishToPlatform(formattedContent, platform, options = {}) {
        const config = this.platforms[platform];
        if (!config || !config.enabled) throw new Error(`Platform ${platform} is not configured or disabled`);

        switch (platform) {
            case 'blog': return await this._publishBlog(formattedContent, config, options);
            case 'twitter': return await this._publishTwitter(formattedContent, config, options);
            case 'wechat': return await this._publishWechat(formattedContent, config, options);
            case 'newsletter': return await this._publishNewsletter(formattedContent, config, options);
            case 'linkedin': return await this._publishLinkedIn(formattedContent, config, options);
            case 'instagram': return await this._publishInstagram(formattedContent, config, options);
            default: throw new Error(`Unknown platform: ${platform}`);
        }
    }

    async _publishBlog(content, config, options) {
        console.log(`Publishing to blog (${config.apiUrl})`);
        const payload = {
            title: options.seo?.title || options.originalContent?.title || 'Untitled',
            content,
            excerpt: options.originalContent?.excerpt || content.substring(0, 200),
            tags: [...new Set([...(options.originalContent?.tags || []), ...this.defaultTags])],
            seo: options.seo,
            status: options.draft ? 'draft' : 'publish'
        };
        if (config.apiKey) {
            const resp = await axios.post(`${config.apiUrl}/posts`, payload, {
                headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
                timeout: 15000
            });
            return { success: true, platform: 'blog', url: resp.data?.url || `${config.apiUrl}/posts/${resp.data?.id}`, id: resp.data?.id };
        }
        return { success: true, platform: 'blog', url: `${config.apiUrl}/posts/sim_${Date.now()}` };
    }

    async _publishTwitter(content, config, options) {
        if (content.length > 280) content = content.substring(0, 277) + '...';
        console.log(`Publishing to Twitter: ${content.substring(0, 50)}...`);
        if (config.apiKey) {
            const resp = await axios.post(`${config.apiUrl}/tweets`, { text: content }, {
                headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
                timeout: 10000
            });
            return { success: true, platform: 'twitter', id: resp.data?.data?.id, url: `https://twitter.com/i/web/status/${resp.data?.data?.id}` };
        }
        return { success: true, platform: 'twitter', url: `https://twitter.com/i/web/status/sim_${Date.now()}` };
    }

    async _publishWechat(content, config, options) {
        console.log(`Publishing to WeChat`);
        if (config.appId && config.appSecret) {
            const tokenResp = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`);
            const token = tokenResp.data?.access_token;
            if (token) {
                const draftPayload = {
                    title: options.seo?.title || options.originalContent?.title || 'Untitled',
                    content,
                    thumb_media_id: options.imageId || '',
                    need_open_comment: 1,
                    only_fans_can_comment: 0
                };
                await axios.post(`https://api.weixin.qq.com/cgi-bin/draft/create?access_token=${token}`, draftPayload);
                return { success: true, platform: 'wechat', message: 'Draft created' };
            }
        }
        return { success: true, platform: 'wechat', url: `https://mp.weixin.qq.com/s/sim_${Date.now()}` };
    }

    async _publishNewsletter(content, config, options) {
        console.log(`Publishing to newsletter`);
        const payload = {
            subject: options.seo?.title || options.originalContent?.title || 'Newsletter Update',
            html: content,
            tags: options.originalContent?.tags || this.defaultTags
        };
        if (config.apiKey) {
            const resp = await axios.post(`${config.apiUrl}/campaigns`, payload, {
                headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
                timeout: 15000
            });
            return { success: true, platform: 'newsletter', id: resp.data?.id, url: resp.data?.url };
        }
        return { success: true, platform: 'newsletter', url: `https://newsletter.example.com/campaign/sim_${Date.now()}` };
    }

    async _publishLinkedIn(content, config, options) {
        console.log(`Publishing to LinkedIn`);
        if (config.apiKey) {
            const payload = {
                author: `urn:li:person:${config.authorId || 'me'}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: content.substring(0, 3000) },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC' }
            };
            const resp = await axios.post(`${config.apiUrl}/ugcPosts`, payload, {
                headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
                timeout: 10000
            });
            return { success: true, platform: 'linkedin', id: resp.data?.id };
        }
        return { success: true, platform: 'linkedin', url: `https://linkedin.com/feed/update/sim_${Date.now()}` };
    }

    async _publishInstagram(content, config, options) {
        console.log(`Publishing to Instagram`);
        const imageUrl = options.imageUrl || options.originalContent?.image;
        if (!imageUrl) throw new Error('Instagram publish requires an image URL');
        if (config.apiKey) {
            const mediaResp = await axios.post(`${config.apiUrl}/me/media`, {
                image_url: imageUrl,
                caption: content.substring(0, 2200)
            }, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
            const creationId = mediaResp.data?.id;
            if (creationId) {
                await axios.post(`${config.apiUrl}/me/media_publish`, { creation_id: creationId }, {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                });
                return { success: true, platform: 'instagram', id: creationId };
            }
        }
        return { success: true, platform: 'instagram', url: `https://instagram.com/p/sim_${Date.now()}` };
    }

    async generatePreview(content, platforms) {
        const previews = {};
        for (const platform of platforms) {
            const formatted = this.formatContent(content, platform);
            previews[platform] = {
                formatted,
                length: formatted.length,
                platform
            };
        }
        return previews;
    }

    async rollback(publishId) {
        const record = this.history.records.find(r => r.id === publishId);
        if (!record) throw new Error(`Publish record ${publishId} not found`);
        if (record.status !== 'published') throw new Error(`Cannot rollback: status is ${record.status}`);

        try {
            if (record.platform === 'blog') {
                await axios.delete(`${this.platforms.blog.apiUrl}/posts/${record.platformId || record.id}`, {
                    headers: { 'Authorization': `Bearer ${this.platforms.blog.apiKey}` }
                });
            }
            this.history.updateRecord(publishId, { status: 'rolled_back', rolledBackAt: Date.now() });
            return { success: true, rolledBackId: publishId };
        } catch (e) {
            throw new Error(`Rollback failed: ${e.message}`);
        }
    }

    async updateAnalytics(publishId, analytics) {
        return this.history.updateRecord(publishId, { analytics: { ...analytics, updatedAt: Date.now() } });
    }

    getAnalytics() {
        return this.history.getAnalytics();
    }

    getPlatformStatus(platform) {
        const config = this.platforms[platform];
        if (!config) return { platform, status: 'unknown' };
        return { platform, enabled: config.enabled, status: config.apiKey ? 'configured' : 'not_configured' };
    }

    getAllPlatformStatus() {
        return Object.keys(this.platforms).map(p => this.getPlatformStatus(p));
    }

    async generateSocialImage(content, platform) {
        this.emit('image-generate', { content, platform });
        return { url: `https://images.example.com/social/sim_${Date.now()}.png`, width: 1200, height: 630 };
    }
}

module.exports = { AutoPublish, PublishQueue, PublishHistory };
