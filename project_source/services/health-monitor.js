const EventEmitter = require('events');
const logger = require('../utils/logger');
const os = require('os');

class HealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.checks = {};
    this.intervals = {};
    this.maxHistory = 10000;
    this.startTime = Date.now();
  }

  start(checkInterval = 30000) {
    this._runCheck();
    this.intervals.main = setInterval(() => this._runCheck(), checkInterval);
    logger.info('HealthMonitor: Started with interval ' + checkInterval + 'ms');
    return this;
  }

  stop() {
    Object.values(this.intervals).forEach(clearInterval);
    this.intervals = {};
    return this;
  }

  registerCheck(name, fn, interval = 60000) {
    this.checks[name] = { fn, lastRun: null, lastResult: null, lastError: null };
    if (interval > 0) {
      this.intervals['check_' + name] = setInterval(async () => {
        await this._runNamedCheck(name);
      }, interval);
    }
    return this;
  }

  async _runNamedCheck(name) {
    const check = this.checks[name];
    if (!check) return;
    try {
      check.lastRun = new Date().toISOString();
      check.lastResult = await check.fn();
      check.lastError = null;
    } catch (err) {
      check.lastError = err.message;
      logger.warn('HealthMonitor check failed: ' + name + ' - ' + err.message);
    }
  }

  _runCheck() {
    const entry = {
      timestamp: new Date().toISOString(),
      cpu: {
        loadAvg: os.loadavg(),
        cpus: os.cpus().length,
        usedPercent: this._calculateCpuPercent()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentUsed: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1),
        process: process.memoryUsage()
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
        service: (Date.now() - this.startTime) / 1000
      },
      network: os.networkInterfaces()
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.emit('sample', entry);
    const memPct = parseFloat(entry.memory.percentUsed);
    if (memPct > 90) this.emit('critical', { type: 'memory', value: memPct, message: 'Memory usage > 90%' });
    if (entry.cpu.loadAvg[0] > os.cpus().length * 0.9) this.emit('critical', { type: 'cpu', value: entry.cpu.loadAvg[0], message: 'CPU load critical' });
  }

  _calculateCpuPercent() {
    try {
      const cpus = os.cpus();
      let idle = 0, total = 0;
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          total += cpu.times[type];
        }
        idle += cpu.times.idle;
      }
      return ((1 - idle / total) * 100).toFixed(1);
    } catch (e) {
      return '0.0';
    }
  }

  getLatest() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(minutes = 5) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.history.filter(h => new Date(h.timestamp).getTime() > cutoff);
  }

  getSummary() {
    const latest = this.getLatest();
    const mem = os.totalmem() - os.freemem();
    return {
      status: mem < os.totalmem() * 0.9 ? 'healthy' : 'warning',
      uptime: process.uptime(),
      cpuLoad: latest ? latest.cpu.loadAvg[0] : 0,
      memoryUsed: (mem / 1024 / 1024).toFixed(1) + 'MB',
      memoryPercent: (mem / os.totalmem() * 100).toFixed(1) + '%',
      totalChecks: Object.keys(this.checks).length,
      failedChecks: Object.values(this.checks).filter(c => c.lastError).length,
      samples: this.history.length,
      checks: this.checks,
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    };
  }

  async runDiagnostic() {
    const results = {};
    for (const [name, check] of Object.entries(this.checks)) {
      try {
        results[name] = await check.fn();
      } catch (err) {
        results[name] = { error: err.message };
      }
    }
    return {
      timestamp: new Date().toISOString(),
      system: this.getSummary(),
      checks: results
    };
  }
}

module.exports = new HealthMonitor();
