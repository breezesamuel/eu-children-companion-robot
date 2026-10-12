const axios = require('axios');
const fs = require('fs');
const net = require('net');
const dns = require('dns');
const EventEmitter = require('events');

class ProxyManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.proxies = [];
        this.currentIndex = 0;
        this.validProxies = [];
        this.strategy = options.strategy || 'round-robin';
        this.healthCheckInterval = options.healthCheckInterval || 60000;
        this.healthCheckUrl = options.healthCheckUrl || 'http://httpbin.org/ip';
        this.healthCheckTimeout = options.healthCheckTimeout || 5000;
        this.maxFailCount = options.maxFailCount || 3;
        this.rateLimitPerProxy = options.rateLimitPerProxy || 0;
        this.scoringEnabled = options.scoringEnabled !== false;
        this.pools = { default: [] };
        this.authCredentials = {};
        this.blacklist = new Set();
        this.fallbackChains = [];
        this.stats = {
            totalRequests: 0,
            totalBytesTransferred: 0,
            perProxy: {}
        };
        this._healthTimer = null;
    }

    setStrategy(strategy) {
        const valid = ['round-robin', 'random', 'latency-based', 'score-based'];
        if (!valid.includes(strategy)) throw new Error(`Invalid strategy: ${strategy}. Use: ${valid.join(', ')}`);
        this.strategy = strategy;
    }

    addProxy(proxy, options = {}) {
        if (this.blacklist.has(proxy)) return false;
        if (this.proxies.some(p => p.address === proxy)) return false;

        const parsed = this._parseProxy(proxy);
        if (!parsed) return false;

        const entry = {
            address: proxy,
            host: parsed.host,
            port: parsed.port,
            protocol: parsed.protocol || 'http',
            username: options.username || this.authCredentials[proxy]?.username || null,
            password: options.password || this.authCredentials[proxy]?.password || null,
            country: options.country || 'unknown',
            anonymity: options.anonymity || 'unknown',
            addedAt: Date.now(),
            lastUsed: null,
            failCount: 0,
            successCount: 0,
            totalRequests: 0,
            avgLatency: 0,
            totalBytes: 0,
            score: options.score || 100,
            enabled: true,
            lastChecked: null,
            status: 'unknown'
        };

        this.proxies.push(entry);
        const poolName = options.country || 'default';
        if (!this.pools[poolName]) this.pools[poolName] = [];
        this.pools[poolName].push(entry);

        if (options.validate !== false) {
            this.validateProxy(proxy).then(valid => {
                if (valid) {
                    entry.status = 'valid';
                    if (!this.validProxies.includes(entry)) this.validProxies.push(entry);
                } else {
                    entry.status = 'invalid';
                }
            });
        }
        this.emit('proxy-added', { proxy, pool: poolName });
        return true;
    }

    addProxies(proxies) {
        proxies.forEach(p => this.addProxy(p));
    }

    _parseProxy(proxyStr) {
        const patterns = [
            /^(?:(\w+):\/\/)?([^:@]+):?([^:@]*)?@?([^:]+):(\d+)$/,
            /^(\d+\.\d+\.\d+\.\d+):(\d+)$/
        ];
        for (const pattern of patterns) {
            const m = proxyStr.match(pattern);
            if (m) {
                if (m[4]) return { protocol: m[1] || 'http', host: m[4], port: parseInt(m[5]), username: m[2], password: m[3] };
                if (m[1] && m[2]) return { protocol: m[1] || 'http', host: m[1], port: parseInt(m[2]) };
                return { protocol: 'http', host: m[1], port: parseInt(m[2]) };
            }
        }
        return null;
    }

    async validateProxy(proxy) {
        const entry = this.proxies.find(p => p.address === proxy);
        const target = entry || { address: proxy, host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]), username: null, password: null };

        const startTime = Date.now();
        try {
            const proxyConfig = { host: target.host, port: target.port };
            if (target.username) {
                proxyConfig.auth = { username: target.username, password: target.password };
            }
            if (target.protocol === 'socks5' || target.protocol === 'socks4') {
                return await this._validateSOCKS(target);
            }
            const response = await axios.get(this.healthCheckUrl, {
                proxy: proxyConfig,
                timeout: this.healthCheckTimeout,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const latency = Date.now() - startTime;
            if (entry) {
                entry.lastChecked = Date.now();
                entry.lastUsed = Date.now();
                entry.avgLatency = entry.avgLatency ? (entry.avgLatency + latency) / 2 : latency;
                entry.status = response.status === 200 ? 'valid' : 'invalid';
                if (response.status === 200 && !this.validProxies.includes(entry)) {
                    this.validProxies.push(entry);
                }
            }
            return response.status === 200;
        } catch {
            if (entry) {
                entry.status = 'invalid';
                entry.lastChecked = Date.now();
            }
            return false;
        }
    }

    async _validateSOCKS(entry) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(this.healthCheckTimeout);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(entry.port, entry.host);
        });
    }

    async validateAllProxies(concurrency = 20) {
        const valid = [];
        for (let i = 0; i < this.proxies.length; i += concurrency) {
            const batch = this.proxies.slice(i, i + concurrency);
            const results = await Promise.all(batch.map(p => this.validateProxy(p.address)));
            results.forEach((isValid, idx) => {
                if (isValid) valid.push(this.proxies[i + idx]);
            });
            this.emit('validation-progress', { validated: Math.min(i + concurrency, this.proxies.length), total: this.proxies.length, valid: valid.length });
        }
        this.validProxies = valid;
        this.emit('validation-complete', { total: this.proxies.length, valid: valid.length });
        return valid.length;
    }

    getProxy(options = {}) {
        const poolName = options.country || 'default';
        const pool = this.pools[poolName] || this.pools.default;
        const activeProxies = pool.filter(p => p.enabled && p.status !== 'invalid' && !this.blacklist.has(p.address));
        if (!activeProxies.length) {
            return this._tryFallbackChain(options);
        }

        let selected;
        switch (this.strategy) {
            case 'random':
                selected = activeProxies[Math.floor(Math.random() * activeProxies.length)];
                break;
            case 'latency-based': {
                const sorted = [...activeProxies].sort((a, b) => (a.avgLatency || 9999) - (b.avgLatency || 9999));
                selected = sorted[0];
                break;
            }
            case 'score-based': {
                const sorted = [...activeProxies].sort((a, b) => (b.score || 0) - (a.score || 0));
                selected = sorted[0];
                break;
            }
            case 'round-robin':
            default:
                selected = activeProxies[this.currentIndex % activeProxies.length];
                this.currentIndex = (this.currentIndex + 1) % activeProxies.length;
                break;
        }

        if (selected) {
            selected.lastUsed = Date.now();
            selected.totalRequests++;
            this.stats.totalRequests++;
            this._updatePerProxyStats(selected.address, 'requests', 1);
        }
        return selected ? selected.address : null;
    }

    getRandomProxy() {
        return this.getProxy({ strategy: 'random' });
    }

    getNextProxy() {
        return this.getProxy({ strategy: 'round-robin' });
    }

    _tryFallbackChain(options) {
        for (const chain of this.fallbackChains) {
            for (const proxy of chain) {
                if (!this.blacklist.has(proxy)) {
                    const entry = this.proxies.find(p => p.address === proxy);
                    if (entry && entry.enabled) return proxy;
                }
            }
        }
        return null;
    }

    addFallbackChain(chain) {
        this.fallbackChains.push(chain);
    }

    async fetchFreeProxies() {
        const sources = [
            'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/proxy-list/data.txt',
            'https://raw.githubusercontent.com/proxy4parsing/proxy-list/main/http.txt',
            'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
        ];

        const allProxies = new Set();
        for (const source of sources) {
            try {
                const response = await axios.get(source, { timeout: 10000 });
                const proxies = response.data.split('\n')
                    .map(l => l.trim())
                    .filter(l => l && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l));
                proxies.forEach(p => allProxies.add(p));
                console.log(`Fetched ${proxies.length} proxies from ${source}`);
            } catch (e) {
                console.warn(`Failed to fetch from ${source}: ${e.message}`);
            }
        }
        this.proxies = [];
        this.pools = { default: [] };
        allProxies.forEach(p => this.addProxy(p, { validate: false }));
        console.log(`Total unique proxies: ${this.proxies.length}`);
        return this.proxies.length;
    }

    blacklistProxy(proxy) {
        this.blacklist.add(proxy);
        const entry = this.proxies.find(p => p.address === proxy);
        if (entry) {
            entry.enabled = false;
            this.validProxies = this.validProxies.filter(v => v.address !== proxy);
        }
        this.emit('proxy-blacklisted', { proxy });
    }

    recordSuccess(proxy, bytesTransferred = 0) {
        const entry = this.proxies.find(p => p.address === proxy);
        if (entry) {
            entry.successCount++;
            entry.totalBytes += bytesTransferred;
            entry.failCount = Math.max(0, entry.failCount - 1);
            if (this.scoringEnabled) {
                entry.score = Math.min(100, entry.score + 2);
            }
            this.stats.totalBytesTransferred += bytesTransferred;
            this._updatePerProxyStats(proxy, 'bytes', bytesTransferred);
        }
    }

    recordFailure(proxy) {
        const entry = this.proxies.find(p => p.address === proxy);
        if (entry) {
            entry.failCount++;
            if (entry.failCount >= this.maxFailCount) {
                this.blacklistProxy(proxy);
            }
            if (this.scoringEnabled) {
                entry.score = Math.max(0, entry.score - 10);
            }
        }
    }

    _updatePerProxyStats(address, field, value) {
        if (!this.stats.perProxy[address]) {
            this.stats.perProxy[address] = { requests: 0, bytes: 0, failures: 0, successes: 0 };
        }
        if (field === 'requests') this.stats.perProxy[address].requests += value;
        if (field === 'bytes') this.stats.perProxy[address].bytes += value;
    }

    getStatistics() {
        const proxyStats = this.proxies.map(p => ({
            address: p.address,
            country: p.country,
            protocol: p.protocol,
            score: p.score,
            status: p.status,
            failCount: p.failCount,
            successCount: p.successCount,
            totalRequests: p.totalRequests,
            avgLatency: p.avgLatency,
            totalBytes: p.totalBytes
        }));
        const totalValid = this.validProxies.length;
        const avgScore = this.validProxies.length ? this.validProxies.reduce((s, p) => s + p.score, 0) / this.validProxies.length : 0;
        return {
            total: this.proxies.length,
            valid: totalValid,
            blacklisted: this.blacklist.size,
            invalid: this.proxies.length - totalValid - this.blacklist.size,
            avgScore: Math.round(avgScore * 10) / 10,
            totalRequests: this.stats.totalRequests,
            totalBytesTransferred: this.stats.totalBytesTransferred,
            perProxy: proxyStats,
            pools: Object.entries(this.pools).map(([name, proxies]) => ({
                name,
                count: proxies.length,
                valid: proxies.filter(p => p.status === 'valid').length
            })),
            strategy: this.strategy
        };
    }

    getBandwidthUsage() {
        return {
            totalBytes: this.stats.totalBytesTransferred,
            totalMB: (this.stats.totalBytesTransferred / (1024 * 1024)).toFixed(2),
            perProxy: Object.entries(this.stats.perProxy).map(([addr, s]) => ({
                address: addr,
                requests: s.requests,
                bytes: s.bytes,
                mb: (s.bytes / (1024 * 1024)).toFixed(2)
            }))
        };
    }

    async testProxy(proxy) {
        const entry = this.proxies.find(p => p.address === proxy);
        const target = entry || { address: proxy, host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) };
        const results = { address: proxy, reachable: false, latency: null, anonymity: 'unknown', protocol: target.protocol || 'http' };

        const startTime = Date.now();
        try {
            const resp = await axios.get('http://httpbin.org/ip', {
                proxy: { host: target.host, port: target.port },
                timeout: 10000
            });
            results.reachable = true;
            results.latency = Date.now() - startTime;
            results.ip = resp.data?.origin;
            results.headers = resp.headers;

            const headersResp = await axios.get('http://httpbin.org/headers', {
                proxy: { host: target.host, port: target.port },
                timeout: 10000
            });
            if (headersResp.data?.headers?.['X-Forwarded-For']) {
                results.anonymity = 'transparent';
            } else {
                results.anonymity = 'anonymous';
            }
        } catch {
            results.reachable = false;
            results.error = 'Connection failed';
        }
        return results;
    }

    setProxyAuth(proxy, username, password) {
        this.authCredentials[proxy] = { username, password };
        const entry = this.proxies.find(p => p.address === proxy);
        if (entry) {
            entry.username = username;
            entry.password = password;
        }
    }

    enableRateLimiting(requestsPerMinute = 60) {
        this.rateLimitPerProxy = requestsPerMinute;
        this._rateLimitBuckets = {};
        this._rateLimitInterval = setInterval(() => {
            this._rateLimitBuckets = {};
        }, 60000);
    }

    _checkRateLimit(proxy) {
        if (!this.rateLimitPerProxy) return true;
        if (!this._rateLimitBuckets) this._rateLimitBuckets = {};
        const now = Date.now();
        if (!this._rateLimitBuckets[proxy]) {
            this._rateLimitBuckets[proxy] = { count: 0, resetAt: now + 60000 };
        }
        const bucket = this._rateLimitBuckets[proxy];
        if (now > bucket.resetAt) {
            bucket.count = 0;
            bucket.resetAt = now + 60000;
        }
        bucket.count++;
        return bucket.count <= this.rateLimitPerProxy;
    }

    startHealthChecks() {
        if (this._healthTimer) clearInterval(this._healthTimer);
        this._healthTimer = setInterval(async () => {
            for (const proxy of this.proxies) {
                if (proxy.status === 'valid' || proxy.status === 'unknown') {
                    const valid = await this.validateProxy(proxy.address);
                    if (!valid && proxy.status === 'valid') {
                        this.emit('proxy-lost', { proxy: proxy.address });
                    }
                }
            }
        }, this.healthCheckInterval);
    }

    stopHealthChecks() {
        if (this._healthTimer) {
            clearInterval(this._healthTimer);
            this._healthTimer = null;
        }
        if (this._rateLimitInterval) {
            clearInterval(this._rateLimitInterval);
            this._rateLimitInterval = null;
        }
    }

    getPoolByCountry(country) {
        return (this.pools[country] || []).filter(p => p.enabled).map(p => p.address);
    }

    async discoverProxiesFromEndpoint(endpoint) {
        try {
            const response = await axios.get(endpoint, { timeout: 10000 });
            const proxyList = response.data.proxies || response.data || [];
            proxyList.forEach(p => {
                if (typeof p === 'string') this.addProxy(p, { validate: false });
                else if (p.ip && p.port) this.addProxy(`${p.ip}:${p.port}`, { country: p.country, anonymity: p.anonymity, validate: false });
            });
            return proxyList.length;
        } catch (e) {
            console.error(`Discovery failed for ${endpoint}: ${e.message}`);
            return 0;
        }
    }

    getProxiesCount() {
        return { total: this.proxies.length, valid: this.validProxies.length, blacklisted: this.blacklist.size };
    }

    clearProxies() {
        this.proxies = [];
        this.validProxies = [];
        this.blacklist.clear();
        this.pools = { default: [] };
        this.currentIndex = 0;
        this.stats.perProxy = {};
    }

    loadProxiesFromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            lines.forEach(line => this.addProxy(line.trim()));
            console.log(`Loaded ${lines.length} proxies from ${filePath}`);
            return lines.length;
        } catch (e) {
            console.error(`Failed to load proxies from ${filePath}: ${e.message}`);
            return 0;
        }
    }

    saveProxiesToFile(filePath) {
        const content = this.proxies.map(p => p.address).join('\n');
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Saved ${this.proxies.length} proxies to ${filePath}`);
    }

    destroy() {
        this.stopHealthChecks();
        this.proxies = [];
        this.validProxies = [];
        this.blacklist.clear();
        this.pools = {};
        this.fallbackChains = [];
    }
}

module.exports = ProxyManager;
