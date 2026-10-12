const logger = require('../utils/logger');
const registry = require('./registry');
const path = require('path');
const fs = require('fs');

class BrowserHarness {
  constructor() {
    this.browser = null;
    this.context = null;
    this.pages = new Map();
    this.activePageId = null;
    this.recording = false;
    this.recordedActions = [];
    this.consoleLogs = [];
    this.performanceMetrics = {};
    this.screenshotHistory = [];
    this.profile = null;
    this.pageCounter = 0;
  }

  async launch(options = {}) {
    try {
      const { chromium } = require('playwright');
      const launchOptions = {
        headless: options.headless ?? true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };

      if (options.proxy) {
        launchOptions.args.push(`--proxy-server=${options.proxy}`);
      }

      if (options.channel) {
        launchOptions.channel = options.channel;
      }

      if (options.args) {
        launchOptions.args.push(...options.args);
      }

      this.browser = await chromium.launch(launchOptions);

      const contextOptions = {
        viewport: options.viewport || { width: 1280, height: 720 },
        userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 RoboBuddy/2.0',
        locale: options.locale || 'zh-CN',
        timezoneId: options.timezone || 'Asia/Shanghai',
        geolocation: options.geolocation
      };

      if (options.device) {
        const devices = require('playwright').devices;
        if (devices[options.device]) {
          Object.assign(contextOptions, devices[options.device]);
        }
      }

      this.context = await this.browser.newContext(contextOptions);
      const page = await this.context.newPage();
      this.activePageId = `page_${++this.pageCounter}`;
      this.pages.set(this.activePageId, page);

      this._setupPageListeners(page);

      if (options.extensions && Array.isArray(options.extensions)) {
        logger.info('Extensions not supported in headless context, use headed mode');
      }

      logger.info('Browser launched', { viewport: contextOptions.viewport, device: options.device });
      registry.emit('browser:launched', {});
      return { success: true, pageId: this.activePageId };
    } catch (err) {
      logger.error('Browser launch failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  _setupPageListeners(page) {
    page.on('console', msg => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
      if (this.consoleLogs.length > 1000) this.consoleLogs.shift();
    });

    page.on('pageerror', err => {
      logger.warn('Page error', { error: err.message });
    });

    page.on('requestfailed', req => {
      logger.warn('Request failed', { url: req.url(), error: req.failure()?.errorText });
    });
  }

  get activePage() {
    return this.pages.get(this.activePageId);
  }

  async newPage(options = {}) {
    if (!this.context) await this.launch();
    const page = await this.context.newPage();
    const pageId = `page_${++this.pageCounter}`;
    this.pages.set(pageId, page);
    this.activePageId = pageId;
    this._setupPageListeners(page);

    if (options.url) {
      await page.goto(options.url, { waitUntil: 'networkidle', timeout: 30000 });
    }

    return { pageId, url: options.url };
  }

  listPages() {
    return Array.from(this.pages.entries()).map(([id, page]) => ({
      id,
      url: page.url(),
      title: page.url() ? undefined : '(no page)',
      isActive: id === this.activePageId
    }));
  }

  switchPage(pageId) {
    if (!this.pages.has(pageId)) throw new Error(`Page not found: ${pageId}`);
    this.activePageId = pageId;
    return { pageId, url: this.activePage.url() };
  }

  closePage(pageId) {
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page not found: ${pageId}`);
    page.close();
    this.pages.delete(pageId);
    if (this.activePageId === pageId) {
      this.activePageId = this.pages.keys().next().value || null;
    }
    return { closed: pageId };
  }

  async goto(url, options = {}) {
    if (!this.activePage) await this.launch();
    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    const waitStrategies = {
      visible: async () => { if (options.selector) await this.activePage.waitForSelector(options.selector, { timeout }); },
      stable: async () => { await this.activePage.waitForLoadState('networkidle', { timeout }); },
      network_idle: async () => { await this.activePage.waitForLoadState('networkidle', { timeout }); },
      domcontentloaded: async () => { await this.activePage.waitForLoadState('domcontentloaded', { timeout }); }
    };

    const strategy = waitStrategies[waitUntil] || waitStrategies.network_idle;
    await this.activePage.goto(url, { waitUntil: 'load', timeout });

    if (options.waitFor) {
      if (typeof options.waitFor === 'number') {
        await new Promise(r => setTimeout(r, options.waitFor));
      } else if (typeof options.waitFor === 'string') {
        await this.activePage.waitForSelector(options.waitFor, { timeout });
      }
    }

    await strategy();

    this._recordAction('goto', { url, waitUntil });
    const perf = await this._capturePerformance();
    return { url: this.activePage.url(), title: await this.activePage.title(), performance: perf };
  }

  async click(selector, options = {}) {
    await this.activePage.click(selector, {
      timeout: options.timeout || 10000,
      force: options.force || false,
      delay: options.delay || 0
    });
    this._recordAction('click', { selector });
    return { clicked: selector };
  }

  async type(selector, text, options = {}) {
    if (options.clearFirst !== false) {
      await this.activePage.fill(selector, text);
    } else {
      await this.activePage.type(selector, text, { delay: options.delay || 0 });
    }
    this._recordAction('type', { selector, textLength: text.length });
    return { typed: text, selector };
  }

  async screenshot(name, options = {}) {
    const buf = await this.activePage.screenshot({
      fullPage: options.fullPage !== false,
      type: options.type || 'png',
      quality: options.quality
    });
    const record = {
      name: name || `screenshot_${Date.now()}`,
      buffer: buf.toString('base64'),
      size: buf.length,
      timestamp: new Date().toISOString()
    };
    this.screenshotHistory.push(record);
    if (this.screenshotHistory.length > 100) this.screenshotHistory.shift();
    return record;
  }

  async screenshotDiff(name1, name2) {
    const s1 = this.screenshotHistory.find(s => s.name === name1);
    const s2 = this.screenshotHistory.find(s => s.name === name2);
    if (!s1 || !s2) return { error: 'Screenshot not found in history' };

    try {
      const Jimp = require('jimp');
      const img1 = await Jimp.read(Buffer.from(s1.buffer, 'base64'));
      const img2 = await Jimp.read(Buffer.from(s2.buffer, 'base64'));

      const diff = Jimp.diff(img1, img2);
      const buf = await diff.image.getBufferAsync(Jimp.MIME_PNG);
      return {
        percent: diff.percent,
        identical: diff.percent === 0,
        diffImage: buf.toString('base64')
      };
    } catch (e) {
      return { error: `Diff failed: ${e.message}` };
    }
  }

  async evaluate(code, args = []) {
    const result = await this.activePage.evaluate(code, ...args);
    return result;
  }

  async html(selector) {
    if (selector) return await this.activePage.innerHTML(selector);
    return await this.activePage.content();
  }

  async text(selector) {
    if (!selector) return await this.activePage.textContent('body');
    return await this.activePage.textContent(selector);
  }

  async pdf(options = {}) {
    return await this.activePage.pdf({
      format: options.format || 'A4',
      landscape: options.landscape || false,
      printBackground: options.printBackground ?? true,
      margin: options.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      scale: options.scale || 1
    });
  }

  async getCookies(urls) {
    return await this.context.cookies(urls);
  }

  async setCookie(cookie) {
    await this.context.addCookies([cookie]);
    return { set: cookie.name };
  }

  async clearCookies(urls) {
    await this.context.clearCookies();
    return { cleared: true };
  }

  async exportCookies(filePath) {
    const cookies = await this.context.cookies();
    const outputPath = filePath || path.join(__dirname, '..', 'data', `cookies_${Date.now()}.json`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(cookies, null, 2));
    return { exported: outputPath, count: cookies.length };
  }

  async importCookies(filePath) {
    if (!fs.existsSync(filePath)) return { error: 'Cookie file not found' };
    const cookies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    await this.context.addCookies(cookies);
    return { imported: cookies.length };
  }

  async localStorage(key) {
    if (key) {
      return await this.activePage.evaluate(`localStorage.getItem('${key}')`);
    }
    return await this.activePage.evaluate('JSON.stringify(Object.keys(localStorage).reduce((a,k)=>(a[k]=localStorage.getItem(k),a),{}))');
  }

  async setLocalStorage(key, value) {
    await this.activePage.evaluate(`localStorage.setItem('${key}', '${value}')`);
    return { key, value };
  }

  async interceptNetwork(patterns) {
    await this.context.route('**/*', (route) => {
      const url = route.request().url();
      for (const pattern of patterns) {
        if (pattern.url && url.includes(pattern.url)) {
          if (pattern.block) {
            route.abort();
            return;
          }
          if (pattern.mockResponse) {
            route.fulfill({
              status: pattern.status || 200,
              contentType: pattern.contentType || 'application/json',
              body: JSON.stringify(pattern.mockResponse)
            });
            return;
          }
          if (pattern.redirectUrl) {
            route.fulfill({
              status: 302,
              headers: { Location: pattern.redirectUrl }
            });
            return;
          }
        }
      }
      route.continue();
    });
    return { intercepting: patterns.length };
  }

  async setGeolocation(lat, lng) {
    await this.context.setGeolocation({ latitude: lat, longitude: lng });
    return { latitude: lat, longitude: lng };
  }

  async setTimezone(timezoneId) {
    await this.context.grantPermissions(['geolocation']);
    await this.context.setGeolocation({ latitude: 0, longitude: 0 });
    return { timezone: timezoneId };
  }

  async downloadFile(selector, options = {}) {
    const [download] = await Promise.all([
      this.activePage.waitForEvent('download', { timeout: options.timeout || 30000 }),
      this.activePage.click(selector)
    ]);
    const downloadPath = options.downloadPath || path.join(__dirname, '..', 'data', 'downloads');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
    const filePath = path.join(downloadPath, download.suggestedFilename());
    await download.saveAs(filePath);
    return { path: filePath, filename: download.suggestedFilename(), size: fs.statSync(filePath).size };
  }

  async autoFill(formData) {
    for (const [selector, value] of Object.entries(formData)) {
      await this.activePage.fill(selector, value);
    }
    return { filled: Object.keys(formData).length };
  }

  async waitForElement(selector, options = {}) {
    const state = options.state || 'visible';
    await this.activePage.waitForSelector(selector, {
      state,
      timeout: options.timeout || 30000
    });
    return { selector, state, found: true };
  }

  getConsoleLogs(filter) {
    let logs = this.consoleLogs;
    if (filter) {
      logs = logs.filter(l => l.type === filter || l.text.includes(filter));
    }
    return logs;
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  async _capturePerformance() {
    try {
      const metrics = await this.activePage.evaluate(() => {
        const perf = performance;
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          LCP: null,
          FCP: null,
          TTFB: nav ? nav.responseStart - nav.requestStart : null,
          domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
          loadComplete: nav ? nav.loadEventEnd : null,
          domInteractive: nav ? nav.domInteractive : null
        };
      });
      this.performanceMetrics = {
        ...this.performanceMetrics,
        ...metrics,
        capturedAt: new Date().toISOString()
      };
      return metrics;
    } catch (e) {
      return { error: e.message };
    }
  }

  async startRecording() {
    this.recording = true;
    this.recordedActions = [];
    this.activePage.on('click', () => this._recordAction('click_detected', {}));
    return { recording: true };
  }

  async stopRecording() {
    this.recording = false;
    const actions = [...this.recordedActions];
    this.recordedActions = [];
    return { actions, count: actions.length };
  }

  _recordAction(type, data) {
    if (!this.recording) return;
    this.recordedActions.push({
      type, data, timestamp: new Date().toISOString()
    });
  }

  async sessionReplay(sessionData) {
    const actions = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    const results = [];
    for (const action of actions.actions || actions) {
      try {
        switch (action.type) {
          case 'goto':
            await this.goto(action.data.url);
            results.push({ type: 'goto', success: true, url: action.data.url });
            break;
          case 'click':
            await this.click(action.data.selector);
            results.push({ type: 'click', success: true, selector: action.data.selector });
            break;
          case 'type':
            await this.type(action.data.selector, action.data.text);
            results.push({ type: 'type', success: true, selector: action.data.selector });
            break;
          case 'wait':
            await new Promise(r => setTimeout(r, action.data.ms || 1000));
            results.push({ type: 'wait', success: true });
            break;
          default:
            results.push({ type: action.type, success: false, error: 'Unknown action type' });
        }
      } catch (e) {
        results.push({ type: action.type, success: false, error: e.message });
      }
    }
    return { results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length };
  }

  async saveProfile(profileName) {
    const profilePath = path.join(__dirname, '..', 'data', 'browser-profiles', profileName);
    await this.context.storageState({ path: path.join(profilePath, 'state.json') });
    return { profile: profileName, path: profilePath };
  }

  async loadProfile(profileName) {
    const profilePath = path.join(__dirname, '..', 'data', 'browser-profiles', profileName, 'state.json');
    if (!fs.existsSync(profilePath)) return { error: 'Profile not found' };
    const state = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    if (this.context) {
      await this.context.close();
    }
    this.context = await this.browser.newContext({
      storageState: profilePath
    });
    const page = await this.context.newPage();
    this.activePageId = `page_${++this.pageCounter}`;
    this.pages.set(this.activePageId, page);
    return { profile: profileName, loaded: true };
  }

  async close() {
    if (this.browser) await this.browser.close();
    this.browser = null;
    this.context = null;
    this.pages.clear();
    this.activePageId = null;
    logger.info('Browser closed');
  }
}

module.exports = BrowserHarness;
