const { chromium, firefox, webkit } = require('playwright');

class BrowserScraper {
    constructor(options = {}) {
        this.options = {
            browserType: options.browserType || 'chromium',
            headless: options.headless !== undefined ? options.headless : true,
            proxy: options.proxy || null,
            userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: options.viewport || { width: 1920, height: 1080 },
            slowMo: options.slowMo || 0,
            timeout: options.timeout || 30000
        };
        this.browser = null;
        this.page = null;
    }

    async launch() {
        try {
            const launchOptions = {
                headless: this.options.headless,
                slowMo: this.options.slowMo,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    `--user-agent=${this.options.userAgent}`
                ]
            };

            if (this.options.proxy) {
                launchOptions.proxy = {
                    server: this.options.proxy
                };
            }

            switch (this.options.browserType) {
                case 'firefox':
                    this.browser = await firefox.launch(launchOptions);
                    break;
                case 'webkit':
                    this.browser = await webkit.launch(launchOptions);
                    break;
                default:
                    this.browser = await chromium.launch(launchOptions);
            }

            this.page = await this.browser.newPage({
                viewport: this.options.viewport,
                userAgent: this.options.userAgent
            });

            await this.setupAntiDetection();

            console.log('Browser launched successfully');
            return true;
        } catch (error) {
            console.error('Failed to launch browser:', error.message);
            return false;
        }
    }

    async setupAntiDetection() {
        if (!this.page) return;

        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'zh-CN', 'zh']
            });

            window.chrome = {
                runtime: {}
            };
        });
    }

    async navigate(url, options = {}) {
        if (!this.page) return false;

        try {
            await this.page.goto(url, {
                timeout: options.timeout || this.options.timeout,
                waitUntil: options.waitUntil || 'networkidle'
            });
            return true;
        } catch (error) {
            console.error('Navigation failed:', error.message);
            return false;
        }
    }

    async waitForSelector(selector, options = {}) {
        if (!this.page) return null;

        try {
            return await this.page.waitForSelector(selector, {
                timeout: options.timeout || this.options.timeout,
                state: options.state || 'visible'
            });
        } catch (error) {
            console.error('Wait for selector failed:', error.message);
            return null;
        }
    }

    async getElementText(selector) {
        if (!this.page) return null;

        try {
            const element = await this.page.$(selector);
            if (!element) return null;
            return await element.textContent();
        } catch (error) {
            console.error('Get element text failed:', error.message);
            return null;
        }
    }

    async getElementAttribute(selector, attribute) {
        if (!this.page) return null;

        try {
            const element = await this.page.$(selector);
            if (!element) return null;
            return await element.getAttribute(attribute);
        } catch (error) {
            console.error('Get element attribute failed:', error.message);
            return null;
        }
    }

    async getAllElements(selector) {
        if (!this.page) return [];

        try {
            return await this.page.$$(selector);
        } catch (error) {
            console.error('Get all elements failed:', error.message);
            return [];
        }
    }

    async extractLinks(selector = 'a') {
        if (!this.page) return [];

        try {
            const links = await this.page.$$eval(selector, anchors =>
                anchors.map(a => ({
                    href: a.href,
                    text: a.textContent?.trim() || ''
                }))
            );
            return links;
        } catch (error) {
            console.error('Extract links failed:', error.message);
            return [];
        }
    }

    async extractImages(selector = 'img') {
        if (!this.page) return [];

        try {
            const images = await this.page.$$eval(selector, imgs =>
                imgs.map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    width: img.width,
                    height: img.height
                }))
            );
            return images;
        } catch (error) {
            console.error('Extract images failed:', error.message);
            return [];
        }
    }

    async extractTableData(tableSelector) {
        if (!this.page) return [];

        try {
            const table = await this.page.$(tableSelector);
            if (!table) return [];

            return await table.$$eval('tr', rows =>
                rows.map(row => {
                    const cells = row.querySelectorAll('td, th');
                    return Array.from(cells).map(cell => cell.textContent?.trim() || '');
                })
            );
        } catch (error) {
            console.error('Extract table data failed:', error.message);
            return [];
        }
    }

    async fillForm(selector, value) {
        if (!this.page) return false;

        try {
            await this.page.fill(selector, value);
            return true;
        } catch (error) {
            console.error('Fill form failed:', error.message);
            return false;
        }
    }

    async clickElement(selector) {
        if (!this.page) return false;

        try {
            await this.page.click(selector, {
                delay: Math.random() * 100 + 50
            });
            return true;
        } catch (error) {
            console.error('Click element failed:', error.message);
            return false;
        }
    }

    async typeText(selector, text, options = {}) {
        if (!this.page) return false;

        try {
            await this.page.type(selector, text, {
                delay: options.delay || Math.random() * 50 + 20,
                ...options
            });
            return true;
        } catch (error) {
            console.error('Type text failed:', error.message);
            return false;
        }
    }

    async waitForTimeout(milliseconds) {
        await this.page?.waitForTimeout(milliseconds);
    }

    async scrollToBottom() {
        if (!this.page) return;

        try {
            await this.page.evaluate(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            });
            await this.waitForTimeout(1000);
        } catch (error) {
            console.error('Scroll to bottom failed:', error.message);
        }
    }

    async takeScreenshot(path) {
        if (!this.page) return false;

        try {
            await this.page.screenshot({
                path,
                fullPage: true
            });
            return true;
        } catch (error) {
            console.error('Take screenshot failed:', error.message);
            return false;
        }
    }

    async getPageContent() {
        if (!this.page) return null;

        try {
            return await this.page.content();
        } catch (error) {
            console.error('Get page content failed:', error.message);
            return null;
        }
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
                console.log('Browser closed successfully');
            }
        } catch (error) {
            console.error('Failed to close browser:', error.message);
        }
    }

    async executeScript(script) {
        if (!this.page) return null;

        try {
            return await this.page.evaluate(script);
        } catch (error) {
            console.error('Execute script failed:', error.message);
            return null;
        }
    }
}

module.exports = BrowserScraper;