const PexelsAPI = require('./pexels_api');
const BrowserScraper = require('./browser_scraper');
const ProxyManager = require('./proxy_manager');
const CaptchaHandler = require('./captcha_handler');
const AIWriter = require('./ai_writer');
const AutoPublish = require('./auto_publish');
const DataSync = require('./data_sync');

class OperationsSystem {
    constructor(options = {}) {
        this.config = {
            pexelsApiKey: options.pexelsApiKey || 'geV0E1YXCHmfkvjJU2WandyrQXzs7JnhhgdYdQXFmaM88zQcUZM4IQbd',
            openaiApiKey: options.openaiApiKey,
            proxyEnabled: options.proxyEnabled || false,
            platforms: options.platforms || {}
        };

        this.pexels = new PexelsAPI(this.config.pexelsApiKey);
        this.browser = null;
        this.proxyManager = new ProxyManager();
        this.captchaHandler = new CaptchaHandler();
        this.aiWriter = new AIWriter({ apiKey: this.config.openaiApiKey });
        this.autoPublish = new AutoPublish(this.config.platforms);
        this.dataSync = new DataSync();

        this.stats = {
            totalProducts: 0,
            publishedProducts: 0,
            syncedProducts: 0,
            generatedDescriptions: 0,
            fetchedImages: 0
        };
    }

    async initialize() {
        console.log('正在初始化AI全智能全托管运营系统...');

        if (this.config.proxyEnabled) {
            await this.proxyManager.fetchFreeProxies();
            await this.proxyManager.validateAllProxies();
            console.log(`代理管理器已初始化，有效代理数: ${this.proxyManager.getProxiesCount().valid}`);
        }

        console.log('AI全智能全托管运营系统初始化完成！');
        return true;
    }

    async createProductFromSource(sourceUrl, options = {}) {
        console.log(`开始从 ${sourceUrl} 创建产品...`);

        const result = {
            success: false,
            product: null,
            steps: []
        };

        try {
            const scrapeResult = await this.scrapeSource(sourceUrl);
            result.steps.push({ name: '抓取源数据', success: scrapeResult.success });
            
            if (!scrapeResult.success) {
                throw new Error('抓取源数据失败');
            }

            const images = await this.fetchProductImages(scrapeResult.data.title);
            result.steps.push({ name: '获取产品图片', success: images.length > 0 });
            this.stats.fetchedImages += images.length;

            const description = await this.generateDescription({
                name: scrapeResult.data.title,
                category: scrapeResult.data.category,
                features: scrapeResult.data.features,
                highlights: scrapeResult.data.highlights
            });
            result.steps.push({ name: '生成产品描述', success: !!description });
            this.stats.generatedDescriptions++;

            const keywords = await this.generateKeywords({
                name: scrapeResult.data.title,
                category: scrapeResult.data.category
            });

            const product = {
                title: scrapeResult.data.title,
                description: description,
                keywords: keywords,
                images: images,
                price: scrapeResult.data.price || this.generatePrice(),
                stock: scrapeResult.data.stock || 100,
                category: scrapeResult.data.category || '未分类',
                sourceUrl: sourceUrl,
                createdAt: new Date().toISOString(),
                status: 'draft'
            };

            result.product = product;
            result.success = true;
            this.stats.totalProducts++;

            console.log(`产品创建成功: ${product.title}`);
        } catch (error) {
            result.error = error.message;
            console.error(`产品创建失败: ${error.message}`);
        }

        return result;
    }

    async scrapeSource(url) {
        const browserOptions = {
            headless: true
        };

        if (this.config.proxyEnabled && this.proxyManager.getProxiesCount().valid > 0) {
            browserOptions.proxy = this.proxyManager.getNextProxy();
        }

        const scraper = new BrowserScraper(browserOptions);
        let result = { success: false, data: null };

        try {
            await scraper.launch();
            await scraper.navigate(url);
            await scraper.waitForTimeout(2000);

            const title = await scraper.getElementText('h1') || 
                         await scraper.getElementText('.product-title') ||
                         await scraper.getElementText('.title');
            
            const price = await scraper.getElementText('.price') || 
                         await scraper.getElementText('.product-price');
            
            const description = await scraper.getElementText('.description') ||
                             await scraper.getElementText('.product-description');

            const images = await scraper.extractImages('img');
            const features = await scraper.extractLinks('.feature');

            result.data = {
                title: title || '未命名产品',
                price: price ? this.extractPrice(price) : null,
                description: description || '',
                images: images.slice(0, 5).map(img => img.src),
                features: features.slice(0, 5).map(f => f.text),
                highlights: []
            };
            result.success = true;
        } catch (error) {
            result.error = error.message;
        } finally {
            await scraper.close();
        }

        return result;
    }

    extractPrice(text) {
        const match = text.match(/(\d+(?:\.\d{1,2})?)/);
        return match ? parseFloat(match[1]) : null;
    }

    async fetchProductImages(query, count = 5) {
        try {
            const result = await this.pexels.searchPhotos(query, count);
            return result.photos?.map(photo => ({
                url: photo.src.medium,
                thumbnail: photo.src.tiny,
                photographer: photo.photographer
            })) || [];
        } catch (error) {
            console.error('获取图片失败:', error.message);
            return [];
        }
    }

    async generateDescription(productInfo) {
        try {
            const description = await this.aiWriter.generateProductDescription(productInfo);
            return description;
        } catch (error) {
            console.error('生成描述失败:', error.message);
            return this.aiWriter.generateFallbackDescription(productInfo);
        }
    }

    async generateKeywords(productInfo) {
        try {
            const keywords = await this.aiWriter.generateSEOKeywords(productInfo);
            return keywords;
        } catch (error) {
            console.error('生成关键词失败:', error.message);
            return this.aiWriter.generateFallbackKeywords(productInfo);
        }
    }

    generatePrice() {
        return (Math.random() * 999 + 10).toFixed(2);
    }

    async publishProduct(product, platforms = ['local']) {
        console.log(`开始发布产品: ${product.title}`);

        const result = await this.autoPublish.publishToAllPlatforms(product, platforms);
        
        if (result.success) {
            this.stats.publishedProducts++;
            console.log(`产品发布成功，已发布到 ${platforms.length} 个平台`);
        }

        return result;
    }

    async syncAllData(sourceUrl) {
        console.log('开始同步所有数据...');

        const result = {
            success: false,
            steps: []
        };

        try {
            const productsResult = await this.dataSync.syncProducts(sourceUrl);
            result.steps.push({ name: '同步产品', ...productsResult });
            
            const categoriesResult = await this.dataSync.syncCategories(sourceUrl);
            result.steps.push({ name: '同步分类', ...categoriesResult });

            const inventoryResult = await this.dataSync.syncInventory(sourceUrl);
            result.steps.push({ name: '同步库存', ...inventoryResult });

            if (productsResult.success && categoriesResult.success && inventoryResult.success) {
                result.success = true;
                this.stats.syncedProducts += productsResult.statistics?.success || 0;
                console.log('数据同步完成');
            }
        } catch (error) {
            result.error = error.message;
            console.error(`数据同步失败: ${error.message}`);
        }

        return result;
    }

    async processBatchSources(sourceUrls, options = {}) {
        console.log(`开始批量处理 ${sourceUrls.length} 个源...`);

        const results = [];
        let successCount = 0;

        for (const url of sourceUrls) {
            console.log(`处理: ${url}`);
            
            try {
                const createResult = await this.createProductFromSource(url);
                
                if (createResult.success && options.autoPublish) {
                    const publishResult = await this.publishProduct(
                        createResult.product, 
                        options.platforms || ['local']
                    );
                    createResult.publishResult = publishResult;
                }

                results.push(createResult);
                successCount++;
            } catch (error) {
                results.push({
                    success: false,
                    sourceUrl: url,
                    error: error.message
                });
            }
        }

        return {
            success: successCount === sourceUrls.length,
            total: sourceUrls.length,
            successCount,
            failedCount: sourceUrls.length - successCount,
            results
        };
    }

    getStats() {
        return {
            ...this.stats,
            proxyCount: this.proxyManager.getProxiesCount(),
            lastSyncTime: this.dataSync.getSyncStatus().lastSyncTime
        };
    }

    async exportProducts(format = 'json') {
        return await this.dataSync.exportData(format);
    }

    startAutoSync(interval = 3600000) {
        this.dataSync.setSyncInterval(interval);
        this.dataSync.startAutoSync();
    }

    stopAutoSync() {
        this.dataSync.stopAutoSync();
    }
}

module.exports = OperationsSystem;