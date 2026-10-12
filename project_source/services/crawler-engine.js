const logger = require('../utils/logger');

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* optional */ }

const UI_NOISE = [
  '登录', '注册', '密码', '验证码', '验证码登录', '密码登录', '设置密码',
  '用户名', '手机号', '设置', '退出', '返回',
  '关注公众号', 'APP下载', '扫一扫', '扫码',
  '用户协议', '隐私政策', '未注册的手机号',
  '下载 OurTeacher', '客户端', 'iOS客户端', 'Android客户端',
  '沪ICP备', '沪公网安备', 'All rights reserved',
];

function isMostlyNavigation(text) {
  if (!text || text.length < 80) return true;
  const lines = text.split('\n').filter(l => l.trim().length > 1);
  if (lines.length === 0) return true;
  const uiLines = lines.filter(l => UI_NOISE.some(n => l.includes(n)));
  return uiLines.length / lines.length > 0.5;
}

function filterContent(text) {
  if (!text) return '';
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 1).join('\n');
}

class CrawlerEngine {
  constructor() {
    this.browser = null;
    this.isReady = false;
    this._initPromise = null;
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    if (!playwright) {
      logger.warn('Playwright not available - JS rendering disabled');
      this.isReady = false;
      return;
    }
    this._initPromise = (async () => {
      try {
        this.browser = await playwright.chromium.launch({
          headless: true,
          ignoreHTTPSErrors: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security', '--ignore-certificate-errors']
        });
        this.isReady = true;
        logger.info('CrawlerEngine: Playwright browser launched');
      } catch (err) {
        logger.error('CrawlerEngine init failed', { error: err.message });
        this.isReady = false;
      }
    })();
    return this._initPromise;
  }

  async renderPage(url, options = {}) {
    if (!this.isReady) {
      await this.init();
      if (!this.isReady) return { success: false, error: 'Playwright unavailable', html: null };
    }
    const timeout = options.timeout || 15000;
    const waitUntil = options.waitUntil || 'domcontentloaded';
    const scrollPage = options.scroll !== false;

    const tryNavigate = async (waitEvt) => {
      const ctx = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });
      const p = await ctx.newPage();
      try {
        await p.goto(url, { waitUntil: waitEvt, timeout: Math.min(timeout, 20000) });
        await p.waitForTimeout(300);

        if (scrollPage) {
          await p.evaluate(async () => {
            const delay = ms => new Promise(r => setTimeout(r, ms));
            for (let y = 0; y < 3000; y += 800) {
              window.scrollTo(0, y);
              await delay(150);
            }
            window.scrollTo(0, 0);
          });
        }

        const title = await p.title().catch(() => '');
        const html = await p.content().catch(() => '');

        let text = '';
        try {
          const selectors = ['main', 'article', '[role="main"]', '.main-content', '#content', '.content'];
          for (const sel of selectors) {
            const hasEl = await p.$(sel);
            if (hasEl) {
              text = await p.evaluate((s) => {
                const el = document.querySelector(s);
                return el ? el.innerText : '';
              }, sel);
              if (text && text.length > 100) break;
            }
          }
          if (!text || text.length < 50) {
            text = await p.evaluate(() => document.body?.innerText || '');
          }
        } catch (_) { text = text || ''; }

        let links = [], images = [], metaDesc = '';
        try { links = await p.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith('http'))); } catch (_) {}
        try { images = await p.evaluate(() => Array.from(document.querySelectorAll('img[src]')).map(img => img.src).filter(s => s.startsWith('http'))); } catch (_) {}
        try { metaDesc = await p.evaluate(() => { const m = document.querySelector('meta[name="description"]'); return m ? (m.content || '') : ''; }); } catch (_) {}

        const cleaned = filterContent(text);
        return { success: true, title, html, text: cleaned, links, images, metaDesc, url, __ctx: ctx, __page: p };
      } catch (e) {
        await p.close().catch(() => {});
        await ctx.close().catch(() => {});
        throw e;
      }
    };

    try {
      let result;
      try {
        result = await tryNavigate(waitUntil);
      } catch (firstErr) {
        const fallbackWait = waitUntil === 'networkidle' ? 'load' : 'domcontentloaded';
        logger.warn('Retry with fallback wait', { url, fallbackWait, error: firstErr.message });
        result = await tryNavigate(fallbackWait);
      }
      if (result.__page) await result.__page.close().catch(() => {});
      if (result.__ctx) await result.__ctx.close().catch(() => {});
      const { __ctx, __page, ...clean } = result;
      return clean;
    } catch (err) {
      logger.warn('Playwright render failed', { url, error: err.message });
      return { success: false, error: err.message, html: null, text: null, links: [] };
    }
  }

  async crawlSource(sourceUrl, options = {}) {
    if (!this.isReady) {
      await this.init();
      if (!this.isReady) return { success: false, error: 'Playwright unavailable', pages: [] };
    }
    const maxPages = options.maxPages || 50;
    const depth = options.depth || 2;
    const minContentLength = options.minContentLength || 150;
    const concurrency = 2;
    const domain = new URL(sourceUrl).hostname;
    const visited = new Set();
    const queue = [{ url: sourceUrl, depth: 0 }];
    const pages = [];

    while (queue.length > 0 && visited.size < maxPages) {
      const batch = [];
      while (queue.length > 0 && batch.length < concurrency) {
        const item = queue.shift();
        if (!visited.has(item.url) && item.depth <= depth) batch.push(item);
      }
      await Promise.all(batch.map(async (item) => {
        visited.add(item.url);
        try {
          const result = await this.renderPage(item.url, { timeout: 15000, waitUntil: 'domcontentloaded', scroll: true });
          const filteredText = result.text || '';
          if (result.success && filteredText.length > minContentLength && !isMostlyNavigation(filteredText)) {
            pages.push({
              url: item.url, title: result.title, text: filteredText.substring(0, 30000),
              metaDesc: result.metaDesc || '',
              linksCount: (result.links || []).length,
              depth: item.depth, scrapedAt: new Date().toISOString()
            });
          }
          if (item.depth < depth && result.links) {
            for (const link of result.links) {
              try {
                const u = new URL(link);
                if (u.hostname === domain && !visited.has(link) && !link.includes('#') && !link.match(/\.(pdf|zip|mp3|mp4|jpg|png)$/i)) {
                  queue.push({ url: link, depth: item.depth + 1 });
                }
              } catch(e) { /* skip */ }
            }
          }
        } catch (err) { /* skip */ }
      }));
      await new Promise(r => setTimeout(r, 200));
    }
    return { success: true, pages, totalVisited: visited.size, totalExtracted: pages.length };
  }

  async close() {
    if (this.browser) {
      try { await this.browser.close(); } catch(e) {}
      this.browser = null;
      this.isReady = false;
    }
  }
}

module.exports = new CrawlerEngine();