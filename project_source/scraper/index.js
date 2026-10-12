const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, 'package.json');
const pkg = fs.existsSync(PACKAGE_JSON) ? require(PACKAGE_JSON) : { version: 'unknown' };

const VERSION = pkg.version || '1.0.0';
const NAME = pkg.name || 'robomate-scraper';

const modules = {
    PexelsAPI: require('./pexels_api'),
    BrowserScraper: require('./browser_scraper'),
    ProxyManager: require('./proxy_manager'),
    CaptchaHandler: require('./captcha_handler'),
    ContentScraper: require('./content_scraper'),
    AIWriter: require('./ai_writer'),
    AutoPublish: require('./auto_publish'),
    DataSync: require('./data_sync'),
    OperationsSystem: require('./operations_system')
};

const config = {};

function loadConfig(configPath) {
    const resolvedPath = path.resolve(configPath || process.env.SCRAPER_CONFIG || './scraper.config.json');
    try {
        if (fs.existsSync(resolvedPath)) {
            const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
            Object.assign(config, data);
            console.log(`Configuration loaded from ${resolvedPath}`);
            return config;
        }
    } catch (e) {
        console.warn(`Failed to load config from ${resolvedPath}: ${e.message}`);
    }
    return config;
}

function getConfig(key, defaultValue = undefined) {
    return key ? (config[key] !== undefined ? config[key] : defaultValue) : config;
}

function setupLogging(options = {}) {
    const { level = 'info', file } = options;
    const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = logLevels[level] ?? 2;

    const logger = {
        error: (...args) => { if (currentLevel >= 0) console.error('[ERROR]', ...args); },
        warn: (...args) => { if (currentLevel >= 1) console.warn('[WARN]', ...args); },
        info: (...args) => { if (currentLevel >= 2) console.log('[INFO]', ...args); },
        debug: (...args) => { if (currentLevel >= 3) console.log('[DEBUG]', ...args); }
    };

    if (file) {
        const logStream = fs.createWriteStream(file, { flags: 'a' });
        ['error', 'warn', 'info', 'debug'].forEach(method => {
            const original = logger[method];
            logger[method] = (...args) => {
                original(...args);
                logStream.write(`[${method.toUpperCase()}] ${new Date().toISOString()} - ${args.join(' ')}\n`);
            };
        });
    }
    return logger;
}

function withErrorHandler(fn, context = '') {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const prefix = context ? `[${context}] ` : '';
            console.error(`${prefix}Error:`, error.message);
            if (error.stack) console.error(`${prefix}Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
            return { success: false, error: error.message, context };
        }
    };
}

function getStats() {
    const stats = {};
    Object.entries(modules).forEach(([name, mod]) => {
        if (typeof mod === 'function' || typeof mod === 'object') {
            stats[name] = { available: true };
            if (mod.default) mod = mod.default;
            if (mod.AutoPublish) stats.AutoPublish = { available: true };
            if (mod.PublishQueue) stats['AutoPublish.Queue'] = { available: true };
        }
    });
    stats.version = VERSION;
    stats.name = NAME;
    return stats;
}

function healthCheck() {
    const results = {};
    Object.entries(modules).forEach(([name, mod]) => {
        try {
            results[name] = { status: 'ok', loaded: true };
        } catch {
            results[name] = { status: 'error', loaded: false };
        }
    });
    results.config = { loaded: Object.keys(config).length > 0 };
    results.timestamp = new Date().toISOString();
    return results;
}

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace(/^--/, '');
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                parsed[key] = args[++i];
            } else {
                parsed[key] = true;
            }
        }
    }
    return parsed;
}

module.exports = {
    ...modules,
    VERSION,
    NAME,
    config,
    loadConfig,
    getConfig,
    setupLogging,
    withErrorHandler,
    getStats,
    healthCheck,
    parseArgs
};
