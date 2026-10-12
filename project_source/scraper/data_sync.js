const axios = require('axios');

class DataSync {
    constructor(options = {}) {
        this.localApiUrl = options.localApiUrl || 'http://localhost:3000/api';
        this.remoteApiUrl = options.remoteApiUrl;
        this.syncInterval = options.syncInterval || 3600000;
        this.lastSyncTime = null;
        this.syncing = false;
    }

    async syncProducts(sourceUrl = null) {
        if (this.syncing) {
            return { success: false, message: '正在同步中' };
        }

        this.syncing = true;
        const startTime = Date.now();

        try {
            const url = sourceUrl || this.remoteApiUrl;
            if (!url) {
                throw new Error('未配置数据源URL');
            }

            console.log(`开始从 ${url} 同步产品数据...`);

            const response = await axios.get(`${url}/products`);
            const remoteProducts = response.data.data || [];

            console.log(`获取到 ${remoteProducts.length} 个产品`);

            let successCount = 0;
            let failCount = 0;

            for (const product of remoteProducts) {
                try {
                    await this.upsertProduct(product);
                    successCount++;
                } catch (error) {
                    console.error(`同步产品失败 ${product.title}:`, error.message);
                    failCount++;
                }
            }

            this.lastSyncTime = Date.now();
            const duration = Math.round((this.lastSyncTime - startTime) / 1000);

            return {
                success: true,
                message: `同步完成，耗时 ${duration} 秒`,
                statistics: {
                    total: remoteProducts.length,
                    success: successCount,
                    failed: failCount
                },
                lastSyncTime: this.lastSyncTime
            };
        } catch (error) {
            return {
                success: false,
                message: `同步失败: ${error.message}`
            };
        } finally {
            this.syncing = false;
        }
    }

    async upsertProduct(product) {
        try {
            const existing = await axios.get(`${this.localApiUrl}/products/${product.id}`);
            
            if (existing.data.success) {
                await axios.put(`${this.localApiUrl}/products/${product.id}`, product);
                console.log(`更新产品: ${product.title}`);
            } else {
                await axios.post(`${this.localApiUrl}/products`, product);
                console.log(`创建产品: ${product.title}`);
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                await axios.post(`${this.localApiUrl}/products`, product);
                console.log(`创建产品: ${product.title}`);
            } else {
                throw error;
            }
        }
    }

    async syncCategories(sourceUrl = null) {
        if (this.syncing) {
            return { success: false, message: '正在同步中' };
        }

        this.syncing = true;

        try {
            const url = sourceUrl || this.remoteApiUrl;
            if (!url) {
                throw new Error('未配置数据源URL');
            }

            const response = await axios.get(`${url}/categories`);
            const remoteCategories = response.data.data || [];

            let successCount = 0;
            for (const category of remoteCategories) {
                try {
                    await this.upsertCategory(category);
                    successCount++;
                } catch (error) {
                    console.error(`同步分类失败 ${category.name}:`, error.message);
                }
            }

            return {
                success: true,
                message: `同步完成，成功 ${successCount}/${remoteCategories.length}`,
                statistics: {
                    total: remoteCategories.length,
                    success: successCount
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `同步分类失败: ${error.message}`
            };
        } finally {
            this.syncing = false;
        }
    }

    async upsertCategory(category) {
        try {
            const existing = await axios.get(`${this.localApiUrl}/categories/${category.id}`);
            
            if (existing.data.success) {
                await axios.put(`${this.localApiUrl}/categories/${category.id}`, category);
            } else {
                await axios.post(`${this.localApiUrl}/categories`, category);
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                await axios.post(`${this.localApiUrl}/categories`, category);
            } else {
                throw error;
            }
        }
    }

    async syncInventory(sourceUrl = null) {
        if (this.syncing) {
            return { success: false, message: '正在同步中' };
        }

        this.syncing = true;

        try {
            const url = sourceUrl || this.remoteApiUrl;
            if (!url) {
                throw new Error('未配置数据源URL');
            }

            const response = await axios.get(`${url}/inventory`);
            const inventoryData = response.data.data || [];

            let successCount = 0;
            for (const item of inventoryData) {
                try {
                    await axios.put(`${this.localApiUrl}/inventory/${item.productId}`, item);
                    successCount++;
                } catch (error) {
                    console.error(`同步库存失败 ${item.productId}:`, error.message);
                }
            }

            return {
                success: true,
                message: `库存同步完成，成功 ${successCount}/${inventoryData.length}`
            };
        } catch (error) {
            return {
                success: false,
                message: `库存同步失败: ${error.message}`
            };
        } finally {
            this.syncing = false;
        }
    }

    async exportData(format = 'json') {
        try {
            const [products, categories] = await Promise.all([
                axios.get(`${this.localApiUrl}/products`),
                axios.get(`${this.localApiUrl}/categories`)
            ]);

            const exportData = {
                exportTime: new Date().toISOString(),
                products: products.data.data || [],
                categories: categories.data.data || []
            };

            if (format === 'csv') {
                return this.convertToCSV(exportData);
            }

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            throw new Error(`导出数据失败: ${error.message}`);
        }
    }

    convertToCSV(data) {
        let csv = '';

        if (data.products.length > 0) {
            const headers = Object.keys(data.products[0]).join(',');
            csv += `${headers}\n`;
            
            for (const product of data.products) {
                const values = Object.values(product).map(v => {
                    if (typeof v === 'string') {
                        return `"${v.replace(/"/g, '""')}"`;
                    }
                    return v;
                }).join(',');
                csv += `${values}\n`;
            }
        }

        return csv;
    }

    getSyncStatus() {
        return {
            lastSyncTime: this.lastSyncTime,
            isSyncing: this.syncing,
            syncInterval: this.syncInterval
        };
    }

    setSyncInterval(interval) {
        this.syncInterval = interval;
    }

    startAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
        }

        this.autoSyncTimer = setInterval(async () => {
            console.log('自动同步任务开始...');
            await this.syncProducts();
        }, this.syncInterval);

        console.log(`自动同步已启动，间隔 ${this.syncInterval / 1000} 秒`);
    }

    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
            console.log('自动同步已停止');
        }
    }
}

module.exports = DataSync;