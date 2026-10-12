const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PexelsAPI {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.PEXELS_API_KEY || 'geV0E1YXCHmfkvjJU2WandyrQXzs7JnhhgdYdQXFmaM88zQcUZM4IQbd';
        this.baseURL = 'https://api.pexels.com/v1';
        this.videoBaseURL = 'https://api.pexels.com/videos';
        this.headers = { 'Authorization': this.apiKey, 'Accept': 'application/json' };
        this.cacheDir = path.join(process.cwd(), '.pexels_cache');
        this.cache = new Map();
        this._initCache();
    }

    _initCache() {
        if (!fs.existsSync(this.cacheDir)) {
            try { fs.mkdirSync(this.cacheDir, { recursive: true }); } catch {}
        }
        this._loadCache();
    }

    _loadCache() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            files.forEach(f => {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(this.cacheDir, f), 'utf-8'));
                    this.cache.set(f.replace('.json', ''), data);
                } catch {}
            });
        } catch {}
    }

    _cacheKey(endpoint, params) {
        return crypto.createHash('md5').update(`${endpoint}:${JSON.stringify(params)}`).digest('hex');
    }

    _getCached(key, ttlMs = 300000) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttlMs) {
            return cached.data;
        }
        return null;
    }

    _setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
        try {
            fs.writeFileSync(path.join(this.cacheDir, `${key}.json`), JSON.stringify({ data, timestamp: Date.now() }));
        } catch {}
    }

    _clearExpiredCache(maxAgeMs = 86400000) {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > maxAgeMs) {
                this.cache.delete(key);
                try { fs.unlinkSync(path.join(this.cacheDir, `${key}.json`)); } catch {}
            }
        }
    }

    clearCache() {
        this.cache.clear();
        try {
            const files = fs.readdirSync(this.cacheDir);
            files.forEach(f => fs.unlinkSync(path.join(this.cacheDir, f)));
        } catch {}
    }

    async _request(endpoint, params = {}, baseUrl = null, cacheTtlMs = 300000) {
        const key = this._cacheKey(endpoint, params);
        const cached = this._getCached(key, cacheTtlMs);
        if (cached) return cached;

        try {
            const url = `${baseUrl || this.baseURL}${endpoint}`;
            const response = await axios.get(url, { headers: this.headers, params, timeout: 15000 });
            this._setCache(key, response.data);
            return response.data;
        } catch (error) {
            console.error(`Pexels API error (${endpoint}):`, error.message);
            throw error;
        }
    }

    async searchPhotos(query, options = {}) {
        const perPage = options.perPage || 15;
        const page = options.page || 1;
        const params = { query, per_page: perPage, page };
        if (options.orientation) params.orientation = options.orientation;
        if (options.size) params.size = options.size;
        if (options.color) params.color = options.color;
        if (options.locale) params.locale = options.locale;
        return await this._request('/search', params, this.baseURL, options.cacheTtlMs);
    }

    async searchVideos(query, options = {}) {
        const perPage = options.perPage || 15;
        const page = options.page || 1;
        const params = { query, per_page: perPage, page };
        if (options.orientation) params.orientation = options.orientation;
        if (options.size) params.size = options.size;
        if (options.locale) params.locale = options.locale;
        return await this._request('/search', params, this.videoBaseURL, options.cacheTtlMs);
    }

    async getCuratedPhotos(options = {}) {
        const params = { per_page: options.perPage || 15, page: options.page || 1 };
        return await this._request('/curated', params, this.baseURL, options.cacheTtlMs);
    }

    async getCuratedVideos(options = {}) {
        const params = { per_page: options.perPage || 15, page: options.page || 1 };
        return await this._request('/popular', params, this.videoBaseURL, options.cacheTtlMs);
    }

    async getPopularImages(options = {}) {
        return await this.getCuratedPhotos(options);
    }

    async getPopularVideos(options = {}) {
        return await this.getCuratedVideos(options);
    }

    async getPhotoById(id) {
        try {
            const response = await axios.get(`${this.baseURL}/photos/${id}`, { headers: this.headers, timeout: 10000 });
            return response.data;
        } catch {
            return null;
        }
    }

    async getVideoById(id) {
        try {
            const response = await axios.get(`${this.videoBaseURL}/videos/${id}`, { headers: this.headers, timeout: 10000 });
            return response.data;
        } catch {
            return null;
        }
    }

    async getPhotoCollections(options = {}) {
        const params = { per_page: options.perPage || 15, page: options.page || 1 };
        return await this._request('/collections', params, this.baseURL, options.cacheTtlMs);
    }

    async getCollectionMedia(collectionId, options = {}) {
        const params = { per_page: options.perPage || 15, page: options.page || 1, type: options.type || 'photos' };
        return await this._request(`/collections/${collectionId}`, params, this.baseURL, options.cacheTtlMs);
    }

    async createCollection(title, description = '') {
        try {
            const response = await axios.post(`${this.baseURL}/collections`, { title, description }, {
                headers: { ...this.headers, 'Content-Type': 'application/json' },
                timeout: 10000
            });
            return response.data;
        } catch (e) {
            console.error('Create collection error:', e.message);
            return null;
        }
    }

    async addToCollection(collectionId, mediaId, mediaType = 'photo') {
        try {
            const response = await axios.post(`${this.baseURL}/collections/${collectionId}/add`, {
                media_id: mediaId,
                media_type: mediaType
            }, { headers: { ...this.headers, 'Content-Type': 'application/json' }, timeout: 10000 });
            return response.data;
        } catch (e) {
            console.error('Add to collection error:', e.message);
            return null;
        }
    }

    async removeFromCollection(collectionId, mediaId) {
        try {
            const response = await axios.delete(`${this.baseURL}/collections/${collectionId}/remove`, {
                headers: this.headers,
                data: { media_id: mediaId },
                timeout: 10000
            });
            return response.data;
        } catch (e) {
            console.error('Remove from collection error:', e.message);
            return null;
        }
    }

    async listCollections(options = {}) {
        return await this.getPhotoCollections(options);
    }

    async deleteCollection(collectionId) {
        try {
            const response = await axios.delete(`${this.baseURL}/collections/${collectionId}`, {
                headers: this.headers,
                timeout: 10000
            });
            return response.status === 204;
        } catch (e) {
            console.error('Delete collection error:', e.message);
            return false;
        }
    }

    async getFeaturedCollections(options = {}) {
        const params = { per_page: options.perPage || 15, page: options.page || 1 };
        return await this._request('/collections/featured', params, this.baseURL, options.cacheTtlMs);
    }

    async downloadPhoto(photo, destDir = './downloads', options = {}) {
        const photoUrl = photo.src?.[options.size || 'original'] || photo.url || photo;
        const filename = path.basename(new URL(photoUrl).pathname);
        const destPath = path.join(destDir, filename);

        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        try {
            const writer = fs.createWriteStream(destPath);
            const response = await axios({ url: photoUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    const stats = fs.statSync(destPath);
                    resolve({ path: destPath, size: stats.size, filename });
                });
                writer.on('error', reject);
            });
        } catch (e) {
            console.error(`Download failed for ${photoUrl}:`, e.message);
            return null;
        }
    }

    async batchDownload(photos, destDir = './downloads', options = {}) {
        const results = [];
        const concurrency = options.concurrency || 3;
        for (let i = 0; i < photos.length; i += concurrency) {
            const batch = photos.slice(i, i + concurrency);
            const batchResults = await Promise.all(batch.map(p => this.downloadPhoto(p, destDir, options)));
            results.push(...batchResults.filter(Boolean));
        }
        return results;
    }

    compressImage(inputPath, options = {}) {
        const quality = options.quality || 80;
        const maxWidth = options.maxWidth || 1920;
        return new Promise((resolve) => {
            try {
                const sharp = require('sharp');
                const outputPath = path.join(
                    path.dirname(inputPath),
                    `compressed_${path.basename(inputPath)}`
                );
                sharp(inputPath)
                    .resize({ width: maxWidth, withoutEnlargement: true })
                    .jpeg({ quality })
                    .toFile(outputPath)
                    .then(() => {
                        const stats = fs.statSync(outputPath);
                        resolve({ path: outputPath, size: stats.size });
                    })
                    .catch(() => resolve({ path: inputPath, size: fs.statSync(inputPath).size }));
            } catch {
                resolve({ path: inputPath, size: fs.statSync(inputPath).size });
            }
        });
    }

    getAttribution(photo) {
        if (!photo) return '';
        const photographer = photo.photographer || 'Unknown';
        const photographerUrl = photo.photographer_url || '';
        const pexelsUrl = photo.url || '';
        return {
            text: `Photo by ${photographer} on Pexels`,
            html: `Photo by <a href="${photographerUrl}" target="_blank">${photographer}</a> on <a href="${pexelsUrl}" target="_blank">Pexels</a>`,
            photographer,
            photographerUrl,
            pexelsUrl,
            license: 'https://www.pexels.com/license/'
        };
    }

    async getSearchSuggestions(query) {
        try {
            const response = await axios.get(`${this.baseURL}/search/suggestions`, {
                headers: this.headers,
                params: { query },
                timeout: 5000
            });
            return response.data?.suggestions || [];
        } catch {
            return [];
        }
    }

    async getRelatedPhotos(photoId, options = {}) {
        try {
            const params = { per_page: options.perPage || 10 };
            const response = await axios.get(`${this.baseURL}/photos/${photoId}/related`, {
                headers: this.headers,
                params,
                timeout: 10000
            });
            return response.data?.photos || [];
        } catch {
            return [];
        }
    }

    async getRelatedVideos(videoId, options = {}) {
        try {
            const params = { per_page: options.perPage || 10 };
            const response = await axios.get(`${this.videoBaseURL}/videos/${videoId}/related`, {
                headers: this.headers,
                params,
                timeout: 10000
            });
            return response.data?.videos || [];
        } catch {
            return [];
        }
    }

    async trackDownload(photoId) {
        try {
            const response = await axios.post(`${this.baseURL}/photos/${photoId}/download`, {}, {
                headers: this.headers,
                timeout: 5000
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    getDownloadHistory() {
        const historyFile = path.join(this.cacheDir, 'download_history.json');
        try {
            return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
        } catch {
            return [];
        }
    }

    _recordDownload(photo, destPath) {
        const historyFile = path.join(this.cacheDir, 'download_history.json');
        const history = this.getDownloadHistory();
        history.push({
            photoId: photo.id,
            photographer: photo.photographer,
            url: photo.url,
            downloadedAt: new Date().toISOString(),
            path: destPath,
            size: photo.width && photo.height ? `${photo.width}x${photo.height}` : 'unknown'
        });
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    }

    async uploadImage(imagePath, options = {}) {
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));
            if (options.title) form.append('title', options.title);
            if (options.description) form.append('description', options.description);
            if (options.tags) form.append('tags', options.tags.join(','));

            const response = await axios.post(`${this.baseURL}/upload`, form, {
                headers: { ...this.headers, ...form.getHeaders() },
                timeout: 60000
            });
            return response.data;
        } catch (e) {
            console.error('Upload error:', e.message);
            return null;
        }
    }
}

module.exports = PexelsAPI;
