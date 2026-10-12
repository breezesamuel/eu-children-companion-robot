const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const levelNames = Object.keys(levels);

const currentLevel = process.env.LOG_LEVEL || 'info';
const isDev = process.env.NODE_ENV !== 'production';
const HOSTNAME = os.hostname();
const PID = process.pid;

const piiPatterns = [
    { pattern: /\bemail\s*[=:]\s*['"]?([^'"&\s,;@]+@[^'"&\s,;]+\.[a-z]{2,})['"]?/gi, replacement: 'email=***@***.***' },
    { pattern: /\bpassword\s*[=:]\s*['"]?([^'"&\s,;]+)['"]?/gi, replacement: 'password=***' },
    { pattern: /\b(ssn|social.security)\s*[=:]\s*['"]?(\d{3}-\d{2}-\d{4})['"]?/gi, replacement: '$1=***-**-****' },
    { pattern: /\b(credit.?card|cc|cvv)\s*[=:]\s*['"]?(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})['"]?/gi, replacement: '$1=****-****-****-****' },
    { pattern: /\b(token|apikey|api_key|secret)\s*[=:]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/gi, replacement: '$1=***' },
    { pattern: /\bphone\s*[=:]\s*['"]?(\+?\d{1,3}[\s-]?\d{3,4}[\s-]?\d{4})['"]?/gi, replacement: 'phone=***-***-****' },
];

class LoggerTransport {
    constructor(config = {}) {
        this.level = config.level || 'debug';
        this.enabled = config.enabled !== false;
    }
    shouldLog(level) { return this.enabled && levels[level] !== undefined && levels[level] <= levels[this.level]; }
    async write(entry) { }
    async flush() { }
}

class ConsoleTransport extends LoggerTransport {
    constructor(config = {}) {
        super(config);
        this.pretty = config.pretty !== undefined ? config.pretty : isDev;
    }
    async write(entry) {
        if (!this.shouldLog(entry.level)) return;
        if (this.pretty) {
            const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context || 'root'}]`;
            const color = entry.level === 'error' ? '\x1b[31m' : entry.level === 'warn' ? '\x1b[33m' : entry.level === 'info' ? '\x1b[36m' : '\x1b[90m';
            const reset = '\x1b[0m';
            const method = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;
            const metaStr = entry.meta && Object.keys(entry.meta).length > 0 ? ' ' + JSON.stringify(entry.meta, null, isDev ? 2 : 0) : '';
            method(`${color}${prefix}${reset} ${entry.message}${metaStr}`);
        } else {
            console.log(JSON.stringify(entry));
        }
    }
}

class FileTransport extends LoggerTransport {
    constructor(config = {}) {
        super(config);
        this.filename = config.filename || 'app.log';
        this.dir = config.dir || path.join(process.cwd(), 'logs');
        this.maxSize = config.maxSize || 50 * 1024 * 1024;
        this.maxFiles = config.maxFiles || 10;
        this.rotateDaily = config.rotateDaily !== false;
        this.currentDate = new Date().toISOString().slice(0, 10);
        this.stream = null;
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
        this._openStream();
    }
    _getFilePath() {
        const base = path.basename(this.filename, path.extname(this.filename));
        const ext = path.extname(this.filename);
        if (this.rotateDaily) return path.join(this.dir, `${base}-${this.currentDate}${ext}`);
        return path.join(this.dir, this.filename);
    }
    _openStream() {
        const filePath = this._getFilePath();
        if (this.stream) this.stream.end();
        this.stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
        this._checkSize();
    }
    _checkSize() {
        try {
            const stats = fs.statSync(this._getFilePath());
            if (stats.size >= this.maxSize) this._rotate();
        } catch (e) { }
    }
    _rotate() {
        const base = path.basename(this.filename, path.extname(this.filename));
        const ext = path.extname(this.filename);
        const dir = this.dir;
        const files = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith(ext)).sort();
        while (files.length >= this.maxFiles) {
            const oldest = files.shift();
            fs.unlinkSync(path.join(dir, oldest));
        }
        if (this.stream) this.stream.end();
        const oldPath = this._getFilePath();
        const rotatedPath = path.join(dir, `${base}-${Date.now()}${ext}`);
        fs.renameSync(oldPath, rotatedPath);
        this.stream = fs.createWriteStream(oldPath, { flags: 'a', encoding: 'utf8' });
    }
    async write(entry) {
        if (!this.shouldLog(entry.level)) return;
        const date = new Date().toISOString().slice(0, 10);
        if (this.rotateDaily && date !== this.currentDate) {
            this.currentDate = date;
            this._openStream();
        }
        this._checkSize();
        this.stream.write(JSON.stringify(entry) + '\n');
    }
    async flush() {
        return new Promise(resolve => {
            if (this.stream) this.stream.end(resolve);
            else resolve();
        });
    }
}

class HttpTransport extends LoggerTransport {
    constructor(config = {}) {
        super(config);
        this.url = config.url;
        this.headers = config.headers || { 'Content-Type': 'application/json' };
        this.batchSize = config.batchSize || 50;
        this.flushInterval = config.flushInterval || 5000;
        this.buffer = [];
        this._timer = setInterval(() => this._flushBatch(), this.flushInterval);
    }
    async write(entry) {
        if (!this.shouldLog(entry.level)) return;
        this.buffer.push(entry);
        if (this.buffer.length >= this.batchSize) await this._flushBatch();
    }
    async _flushBatch() {
        if (this.buffer.length === 0) return;
        const batch = this.buffer.splice(0);
        return new Promise((resolve) => {
            const body = JSON.stringify(batch);
            const opts = new URL(this.url);
            const req = http.request({
                hostname: opts.hostname, port: opts.port, path: opts.pathname,
                method: 'POST', headers: { ...this.headers, 'Content-Length': Buffer.byteLength(body) }
            }, (res) => { res.resume(); resolve(); });
            req.on('error', () => resolve());
            req.write(body);
            req.end();
        });
    }
    async flush() { await this._flushBatch(); }
}

class Logger {
    constructor(config = {}) {
        this.name = config.name || 'root';
        this.context = config.context || {};
        this.sampleRate = config.sampleRate || 1;
        this.bufferSize = config.bufferSize || 0;
        this.bufferFlushInterval = config.bufferFlushInterval || 1000;
        this.transports = [];
        this.buffer = [];
        this._bufferTimer = null;
        this._counter = 0;
        if (this.bufferSize > 0) {
            this._bufferTimer = setInterval(() => this._flushBuffer(), this.bufferFlushInterval);
        }
        this._addDefaultTransports(config);
    }
    _addDefaultTransports(config) {
        this.addTransport(new ConsoleTransport({
            level: config.consoleLevel || (isDev ? 'debug' : 'info'),
            pretty: config.pretty !== undefined ? config.pretty : isDev
        }));
        if (config.file) {
            this.addTransport(new FileTransport(typeof config.file === 'string' ? { filename: config.file } : config.file));
        }
        if (config.http) {
            this.addTransport(new HttpTransport(config.http));
        }
    }
    addTransport(transport) {
        this.transports.push(transport);
        return this;
    }
    child(context) {
        const child = new Logger({ name: `${this.name} > ${context.name || 'child'}`, sampleRate: this.sampleRate, bufferSize: this.bufferSize });
        child.transports = this.transports.map(t => t);
        child.context = { ...this.context, ...context };
        return child;
    }
    _redactPII(message) {
        let redacted = message;
        for (const { pattern, replacement } of piiPatterns) {
            redacted = redacted.replace(pattern, replacement);
        }
        return redacted;
    }
    _shouldSample() {
        if (this.sampleRate >= 1) return true;
        this._counter = (this._counter + 1) % 1000000;
        return (this._counter % Math.round(1 / this.sampleRate)) === 0;
    }
    _buildEntry(level, message, meta = {}) {
        const correlationId = meta.correlationId || uuidv4();
        const safeMeta = { ...meta };
        delete safeMeta.correlationId;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: this._redactPII(String(message)),
            context: this.name,
            correlationId,
            hostname: HOSTNAME,
            pid: PID,
            meta: Object.keys(safeMeta).length > 0 ? safeMeta : undefined
        };
        return entry;
    }
    async _write(level, message, meta = {}) {
        if (levels[level] === undefined || levels[level] > levels[currentLevel]) return;
        if (!this._shouldSample()) return;
        const entry = this._buildEntry(level, message, meta);
        if (this.bufferSize > 0) {
            this.buffer.push(entry);
            if (this.buffer.length >= this.bufferSize) await this._flushBuffer();
            return;
        }
        const promises = this.transports.map(t => t.write(entry).catch(() => { }));
        await Promise.all(promises);
    }
    async _flushBuffer() {
        if (this.buffer.length === 0) return;
        const batch = this.buffer.splice(0);
        const promises = this.transports.map(t => Promise.all(batch.map(e => t.write(e).catch(() => {}))));
        await Promise.all(promises);
    }
    trace(msg, meta) { return this._write('trace', msg, meta); }
    debug(msg, meta) { return this._write('debug', msg, meta); }
    info(msg, meta) { return this._write('info', msg, meta); }
    warn(msg, meta) { return this._write('warn', msg, meta); }
    error(msg, meta) { return this._write('error', msg, meta); }
    log(level, msg, meta) { return this._write(level, msg, meta); }
    async flush() {
        if (this._bufferTimer) clearInterval(this._bufferTimer);
        await this._flushBuffer();
        await Promise.all(this.transports.map(t => t.flush().catch(() => {})));
    }
    perf(name, startTime, meta = {}) {
        const duration = Date.now() - (typeof startTime === 'number' ? startTime : startTime.getTime());
        this.info(`PERF: ${name}`, { ...meta, duration_ms: duration, event: 'perf' });
        return duration;
    }
    measure(name, fn) {
        if (typeof fn === 'function') {
            const start = Date.now();
            const result = fn();
            this.perf(name, start);
            return result;
        }
        const start = Date.now();
        return {
            end: (extraMeta) => {
                const duration = Date.now() - start;
                this.info(`PERF: ${name}`, { ...extraMeta, duration_ms: duration, event: 'perf' });
                return duration;
            }
        };
    }
    async measureAsync(name, fn) {
        const start = Date.now();
        try {
            const result = await fn();
            this.perf(name, start);
            return result;
        } catch (err) {
            this.perf(name, start, { error: err.message });
            throw err;
        }
    }
}

let defaultLogger = new Logger();

function createLogger(correlationId) {
    return defaultLogger.child({ correlationId });
}

module.exports = {
    Logger, ConsoleTransport, FileTransport, HttpTransport,
    info: (msg, meta) => defaultLogger.info(msg, meta),
    warn: (msg, meta) => defaultLogger.warn(msg, meta),
    error: (msg, meta) => defaultLogger.error(msg, meta),
    debug: (msg, meta) => defaultLogger.debug(msg, meta),
    trace: (msg, meta) => defaultLogger.trace(msg, meta),
    createLogger,
    setDefaultLogger: (logger) => { defaultLogger = logger; },
    getDefaultLogger: () => defaultLogger,
    perf: (name, startTime, meta) => defaultLogger.perf(name, startTime, meta),
    measure: (name, fn) => defaultLogger.measure(name, fn),
    measureAsync: (name, fn) => defaultLogger.measureAsync(name, fn),
    flush: () => defaultLogger.flush()
};
