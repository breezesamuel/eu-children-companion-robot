const logger = require('../utils/logger');
const registry = require('./registry');
const db = require('../utils/database');

const PLATFORMS = {
  jd: { name: 'JD.com', baseUrl: 'https://www.jd.com', country: 'CN', currency: 'CNY' },
  taobao: { name: 'Taobao', baseUrl: 'https://www.taobao.com', country: 'CN', currency: 'CNY' },
  amazon: { name: 'Amazon', baseUrl: 'https://www.amazon.com', country: 'US', currency: 'USD' },
  aliexpress: { name: 'AliExpress', baseUrl: 'https://www.aliexpress.com', country: 'CN', currency: 'USD' },
  ebay: { name: 'eBay', baseUrl: 'https://www.ebay.com', country: 'US', currency: 'USD' },
  mediamarkt: { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.de', country: 'DE', currency: 'EUR' },
  fnac: { name: 'Fnac', baseUrl: 'https://www.fnac.com', country: 'FR', currency: 'EUR' },
  amazon_de: { name: 'Amazon DE', baseUrl: 'https://www.amazon.de', country: 'DE', currency: 'EUR' },
  amazon_fr: { name: 'Amazon FR', baseUrl: 'https://www.amazon.fr', country: 'FR', currency: 'EUR' },
  amazon_it: { name: 'Amazon IT', baseUrl: 'https://www.amazon.it', country: 'IT', currency: 'EUR' },
  amazon_es: { name: 'Amazon ES', baseUrl: 'https://www.amazon.es', country: 'ES', currency: 'EUR' },
};

const EU_VAT_RATES = {
  DE: 19, FR: 20, IT: 22, ES: 21, NL: 21, BE: 21, AT: 20,
  PT: 23, IE: 23, FI: 24, SE: 25, DK: 25, PL: 23, CZ: 21,
  SK: 20, HU: 27, SI: 22, HR: 25, RO: 19, BG: 20, EL: 24,
  LT: 21, LV: 21, EE: 20, MT: 18, CY: 19, LU: 17
};

const CURRENCY_RATES = {
  USD: 1, EUR: 0.92, CNY: 7.24, GBP: 0.79, JPY: 149.5,
  KRW: 1320, INR: 83.2, CAD: 1.36, AUD: 1.53, CHF: 0.88
};

class ECommerceTools {
  constructor() {
    this.wishlists = new Map();
    this.priceAlerts = new Map();
    this.orders = new Map();
    this.purchaseHistory = [];
    this.paymentMethods = new Map();
    this.suppliers = new Map();
    this._register();
  }

  _register() {
    registry.registerIntegration('ecommerce-jd', { name: 'JD Shopper', type: 'ecommerce', description: '京东自动下单', enabled: true, category: 'ecommerce/cn', priority: 10 }, this);
    registry.registerIntegration('ecommerce-taobao', { name: 'Taobao AutoBuy', type: 'ecommerce', description: '淘宝抢购自动化', enabled: true, category: 'ecommerce/cn', priority: 10 }, this);
    registry.registerIntegration('ecommerce-amazon', { name: 'Amazon Integration', type: 'ecommerce', description: 'Amazon shopping', enabled: true, category: 'ecommerce/global', priority: 8 }, this);
    registry.registerIntegration('ecommerce-scraper', { name: 'ScrapeGraphAI', type: 'ecommerce', description: 'AI-powered web scraping', enabled: true, apiKey: process.env.SCRAPING_API_KEY, category: 'ecommerce/scraping', priority: 5 }, this);
    registry.registerIntegration('ecommerce-api', { name: 'API Layer', type: 'ecommerce', description: 'REST API marketplace', enabled: true, apiKey: process.env.APILAYER_KEY, category: 'ecommerce/api', priority: 5 }, this);

    registry.registerTool('ec:search', { name: 'Search Products', description: 'Search products across platforms' }, async (p) => this.searchProducts(p.query, p.platforms, p.options));
    registry.registerTool('ec:compare', { name: 'Compare Prices', description: 'Compare product prices' }, async (p) => this.comparePrices(p.product, p.platforms));
    registry.registerTool('ec:order-status', { name: 'Order Status', description: 'Check order status' }, async (p) => this.getOrderStatus(p.orderId, p.platform));
    registry.registerTool('ec:inventory', { name: 'Check Inventory', description: 'Check product inventory' }, async (p) => this.checkInventory(p.sku, p.platform));
    registry.registerTool('ec:shipping', { name: 'Shipping Cost', description: 'Calculate shipping cost' }, async (p) => this.calculateShipping(p.weight, p.destination, p.options));
    registry.registerTool('ec:return', { name: 'Return Request', description: 'Request return/refund' }, async (p) => this.requestReturn(p.orderId, p.reason, p.options));
    registry.registerTool('ec:price-alert', { name: 'Price Alert', description: 'Set automated price alert' }, async (p) => this.setPriceAlert(p.product, p.targetPrice, p.platforms));
    registry.registerTool('ec:convert-currency', { name: 'Convert Currency', description: 'Convert between currencies' }, async (p) => this.convertCurrency(p.amount, p.from, p.to));
    registry.registerTool('ec:tax', { name: 'Calculate Tax', description: 'Calculate EU VAT' }, async (p) => this.calculateTax(p.amount, p.countryCode));
    registry.registerTool('ec:receipt', { name: 'Generate Receipt', description: 'Generate invoice/receipt' }, async (p) => this.generateReceipt(p.items, p.options));
    registry.registerTool('ec:wishlist', { name: 'Wishlist', description: 'Manage wishlist' }, async (p) => this.manageWishlist(p.action, p.product, p.listName));
    registry.registerTool('ec:purchase-history', { name: 'Purchase History', description: 'Get purchase history' }, async (p) => this.getPurchaseHistory(p.platform, p.limit));
  }

  async searchProducts(query, platforms = ['jd','taobao','amazon'], options = {}) {
    const results = [];
    for (const platform of platforms) {
      try {
        const platMeta = PLATFORMS[platform];
        if (!platMeta) continue;
        const url = `${platMeta.baseUrl}/search?q=${encodeURIComponent(query)}`;
        const BrowserHarness = require('./browser');
        const browser = new BrowserHarness();
        await browser.launch({ headless: true });
        try {
          await browser.goto(url);
          const content = await browser.text('body');
          await browser.close();
          results.push({
            platform, name: platMeta.name,
            url, country: platMeta.country,
            currency: platMeta.currency,
            snippet: content.substring(0, 500)
          });
        } catch (e) {
          await browser.close();
          results.push({ platform, error: e.message });
        }
      } catch (e) {
        results.push({ platform, error: e.message });
      }
    }
    return results;
  }

  async comparePrices(product, platforms = ['jd','taobao','amazon','amazon_de','amazon_fr']) {
    const results = [];
    for (const platform of platforms) {
      const platMeta = PLATFORMS[platform];
      if (!platMeta) continue;
      results.push({
        platform: platMeta.name,
        url: `${platMeta.baseUrl}/s?k=${encodeURIComponent(product)}`,
        currency: platMeta.currency,
        price: await this._estimatePrice(product, platform),
        inEUR: await this._toEUR(null, platMeta.currency, 0)
      });
    }
    return results.sort((a, b) => (a.inEUR || Infinity) - (b.inEUR || Infinity));
  }

  async getOrderStatus(orderId, platform) {
    const key = `${platform}:${orderId}`;
    if (this.orders.has(key)) {
      return this.orders.get(key);
    }
    return { orderId, platform, status: 'unknown', message: 'Order not tracked locally. Check directly on platform website.' };
  }

  async checkInventory(sku, platform) {
    const platMeta = PLATFORMS[platform];
    if (!platMeta) return { error: `Unknown platform: ${platform}` };
    try {
      const BrowserHarness = require('./browser');
      const browser = new BrowserHarness();
      await browser.launch({ headless: true });
      await browser.goto(`${platMeta.baseUrl}/item/${sku}`);
      const inStock = await browser.text('.in-stock, .stock, [data-stock]');
      await browser.close();
      return { sku, platform, inStock: !!inStock, details: inStock?.substring(0, 200) };
    } catch (e) {
      return { sku, platform, error: e.message };
    }
  }

  async calculateShipping(weight, destination, options = {}) {
    const baseRates = { local: 5, regional: 15, international: 35 };
    const weightFactor = Math.max(1, weight / 0.5);
    const speedFactor = options.speed === 'express' ? 2.5 : options.speed === 'priority' ? 1.8 : 1;
    const country = destination.substring(0, 2).toUpperCase();
    const zone = EU_VAT_RATES[country] ? 'regional' : 'international';
    const cost = baseRates[zone] * weightFactor * speedFactor;
    return {
      weight: `${weight}kg`,
      destination,
      zone,
      estimatedCost: Math.round(cost * 100) / 100,
      currency: 'EUR',
      estimatedDays: zone === 'local' ? '1-2' : zone === 'regional' ? '3-7' : '7-21',
      speed: options.speed || 'standard'
    };
  }

  async requestReturn(orderId, reason, options = {}) {
    const key = `${options.platform || 'unknown'}:${orderId}`;
    const record = {
      orderId, reason, platform: options.platform,
      status: 'pending', createdAt: new Date().toISOString(),
      refundMethod: options.refundMethod || 'original',
      expectedProcessing: '3-5 business days'
    };
    if (!this.orders.has(key)) this.orders.set(key, {});
    this.orders.get(key).returnRequest = record;
    logger.info(`Return requested: ${orderId}`, { reason });
    return record;
  }

  manageWishlist(action, product, listName = 'default') {
    if (!this.wishlists.has(listName)) {
      this.wishlists.set(listName, { name: listName, items: [], createdAt: new Date().toISOString() });
    }
    const list = this.wishlists.get(listName);
    if (action === 'add') {
      const exists = list.items.find(i => i.id === product.id || i.name === product.name);
      if (!exists) {
        list.items.push({ ...product, addedAt: new Date().toISOString() });
        return { action: 'added', list: listName, itemCount: list.items.length };
      }
      return { action: 'exists', list: listName };
    }
    if (action === 'remove') {
      list.items = list.items.filter(i => i.id !== product.id && i.name !== product.name);
      return { action: 'removed', list: listName, itemCount: list.items.length };
    }
    if (action === 'list') {
      return { list: listName, items: list.items };
    }
    if (action === 'clear') {
      list.items = [];
      return { action: 'cleared', list: listName };
    }
    return { error: `Unknown action: ${action}` };
  }

  getPurchaseHistory(platform, limit = 50) {
    let history = this.purchaseHistory;
    if (platform) history = history.filter(h => h.platform === platform);
    return history.slice(-limit);
  }

  async setPriceAlert(product, targetPrice, platforms) {
    const alert = {
      id: `alert_${Date.now()}`,
      product, targetPrice, platforms: platforms || ['jd', 'taobao', 'amazon'],
      createdAt: new Date().toISOString(),
      triggered: false,
      lastChecked: null
    };
    this.priceAlerts.set(alert.id, alert);
    logger.info(`Price alert set: ${product} <= ${targetPrice}`);
    return alert;
  }

  async checkPriceAlerts() {
    const triggered = [];
    for (const [id, alert] of this.priceAlerts) {
      if (alert.triggered) continue;
      for (const platform of alert.platforms) {
        const price = await this._estimatePrice(alert.product, platform);
        alert.lastChecked = new Date().toISOString();
        if (price !== null && price <= alert.targetPrice) {
          alert.triggered = true;
          triggered.push({ ...alert, matchedPrice: price, platform });
          break;
        }
      }
    }
    return triggered;
  }

  addPurchaseRecord(record) {
    this.purchaseHistory.push({
      ...record,
      timestamp: new Date().toISOString()
    });
  }

  async managePaymentMethods(action, method) {
    if (action === 'add') {
      const id = `pm_${Date.now()}`;
      this.paymentMethods.set(id, { ...method, id, addedAt: new Date().toISOString() });
      return { id, message: 'Payment method added' };
    }
    if (action === 'remove') {
      this.paymentMethods.delete(method.id);
      return { message: 'Payment method removed' };
    }
    if (action === 'list') {
      return Array.from(this.paymentMethods.values()).map(m => ({
        id: m.id, type: m.type,
        lastFour: m.lastFour,
        expiryDate: m.expiryDate,
        isDefault: m.isDefault
      }));
    }
    return { error: `Unknown action: ${action}` };
  }

  async generateReceipt(items, options = {}) {
    const subtotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const taxRate = EU_VAT_RATES[options.countryCode] || 0;
    const tax = subtotal * (taxRate / 100);
    const shipping = options.shipping || 0;
    const total = subtotal + tax + shipping;

    const receipt = {
      id: `RCP-${Date.now()}`,
      date: new Date().toISOString(),
      seller: options.seller || 'Online Store',
      buyer: options.buyer || 'Customer',
      items: items.map(i => ({
        name: i.name, sku: i.sku, quantity: i.quantity || 1,
        unitPrice: i.price, total: i.price * (i.quantity || 1)
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate: `${taxRate}%`,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: options.currency || 'EUR',
      countryCode: options.countryCode
    };
    this.purchaseHistory.push({ type: 'receipt', receipt, timestamp: new Date().toISOString() });
    return receipt;
  }

  async manageSupplier(action, supplier) {
    if (action === 'add') {
      const id = `supp_${Date.now()}`;
      this.suppliers.set(id, { ...supplier, id, addedAt: new Date().toISOString(), rating: supplier.rating || 0 });
      return { id, message: 'Supplier added' };
    }
    if (action === 'update') {
      const existing = this.suppliers.get(supplier.id);
      if (!existing) return { error: 'Supplier not found' };
      Object.assign(existing, supplier, { updatedAt: new Date().toISOString() });
      return { message: 'Supplier updated' };
    }
    if (action === 'list') {
      return Array.from(this.suppliers.values()).map(s => ({
        id: s.id, name: s.name, category: s.category,
        rating: s.rating, leadTime: s.leadTime,
        minOrder: s.minOrder
      }));
    }
    if (action === 'rate') {
      const existing = this.suppliers.get(supplier.id);
      if (!existing) return { error: 'Supplier not found' };
      existing.rating = supplier.rating;
      existing.ratedAt = new Date().toISOString();
      return { message: 'Rating updated', rating: existing.rating };
    }
    return { error: `Unknown action: ${action}` };
  }

  async convertCurrency(amount, from, to) {
    const fromRate = CURRENCY_RATES[from];
    const toRate = CURRENCY_RATES[to];
    if (!fromRate || !toRate) {
      return { error: `Unsupported currency: ${from} or ${to}` };
    }
    const inUSD = amount / fromRate;
    const converted = Math.round(inUSD * toRate * 100) / 100;
    return {
      amount, from, to,
      result: converted,
      rate: Math.round(toRate / fromRate * 10000) / 10000,
      timestamp: new Date().toISOString()
    };
  }

  async calculateTax(amount, countryCode) {
    const code = countryCode.toUpperCase();
    const rate = EU_VAT_RATES[code];
    if (rate === undefined) {
      return { error: `Unknown or non-EU country: ${code}` };
    }
    const tax = Math.round(amount * (rate / 100) * 100) / 100;
    return {
      amount,
      countryCode: code,
      vatRate: `${rate}%`,
      vatAmount: tax,
      totalWithVAT: Math.round((amount + tax) * 100) / 100,
      note: `Standard VAT rate for ${code} is ${rate}%`
    };
  }

  async _estimatePrice(product, platform) {
    return null;
  }

  async _toEUR(amount, currency, value) {
    if (!amount && value) amount = value;
    if (!amount) return null;
    if (currency === 'EUR') return amount;
    const rate = CURRENCY_RATES[currency];
    if (!rate) return null;
    return amount / rate * CURRENCY_RATES.EUR;
  }

  async jdAddToCart(params) {
    return { message: 'JD automation requires Selenium WebDriver. Configure SELENIUM_GRID_URL.', params };
  }

  async jdCheckout(params) {
    return this._seleniumAction('JD Checkout', params);
  }

  async taobaoBuy(params) {
    return this._seleniumAction('Taobao Flash Buy', params);
  }

  async _seleniumAction(name, params) {
    const seleniumUrl = process.env.SELENIUM_GRID_URL;
    if (!seleniumUrl) {
      return { error: `${name} requires SELENIUM_GRID_URL env var. Start Selenium Grid and set URL.` };
    }
    try {
      const axios = require('axios');
      const res = await axios.post(`${seleniumUrl}/wd/hub/session`, {
        desiredCapabilities: { browserName: 'chrome', platform: 'WINDOWS' }
      }, { timeout: 15000 });

      const sessionId = res.data.sessionId;
      const actions = [];

      if (params.url) {
        await axios.post(`${seleniumUrl}/wd/hub/session/${sessionId}/url`, { url: params.url }, { timeout: 10000 });
        actions.push(`Navigated to ${params.url}`);
      }
      if (params.clickSelector) {
        await axios.post(`${seleniumUrl}/wd/hub/session/${sessionId}/element/${params.clickSelector}/click`, {}, { timeout: 10000 });
        actions.push(`Clicked ${params.clickSelector}`);
      }
      if (params.waitMs) {
        await new Promise(r => setTimeout(r, params.waitMs));
      }

      await axios.delete(`${seleniumUrl}/wd/hub/session/${sessionId}`, { timeout: 5000 });
      return { success: true, sessionId, actions };
    } catch (e) {
      return { error: `Selenium action failed: ${e.message}` };
    }
  }

  async scrapePage(params) {
    const apiKey = process.env.SCRAPING_API_KEY;
    if (apiKey) {
      try {
        const axios = require('axios');
        const res = await axios.post('https://api.scrapingapi.com/v1/scrape', {
          url: params.url, api_key: apiKey
        }, { timeout: 30000 });
        return { data: res.data };
      } catch (e) {
        return { error: e.message };
      }
    }
    const BrowserHarness = require('./browser');
    const browser = new BrowserHarness();
    await browser.launch();
    try {
      const result = await browser.goto(params.url);
      const content = await browser.text(params.selector || 'body');
      await browser.close();
      return { url: result.url, title: result.title, content: content.substring(0, 5000) };
    } catch (e) {
      await browser.close();
      return { error: e.message };
    }
  }

  async callApi(params) {
    try {
      const axios = require('axios');
      const res = await axios({
        method: params.method || 'GET',
        url: params.url,
        headers: params.headers || {},
        data: params.body,
        timeout: 30000
      });
      return { status: res.status, data: res.data };
    } catch (e) {
      return { error: e.message };
    }
  }
}

module.exports = new ECommerceTools();
