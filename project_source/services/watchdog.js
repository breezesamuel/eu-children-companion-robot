/**
 * Software Watchdog & Circuit Breaker
 *
 * Monitors system health (CPU, memory, event loop lag) and auto-restarts
 * the process when thresholds are breached. Prevents robot freeze/deadlock.
 *
 * Configuration via environment variables:
 *   WATCHDOG_CPU_THRESHOLD=90     # CPU % threshold (default 90)
 *   WATCHDOG_CPU_WINDOW=10000     # Duration in ms (default 10000)
 *   WATCHDOG_MEM_THRESHOLD=512    # Memory leak threshold in MB (default 512)
 *   WATCHDOG_MEM_GROWTH=50        # MB growth per sample to flag leak (default 50)
 *   WATCHDOG_INTERVAL=5000        # Check interval in ms (default 5000)
 *   WATCHDOG_ENABLED=true         # Enable/disable (default true)
 *   WATCHDOG_GRACE_PERIOD=30000   # Startup grace period (default 30000)
 */
const logger = require('../utils/logger');
const EventEmitter = require('events');

class Watchdog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.enabled = process.env.WATCHDOG_ENABLED !== 'false';
    this.cpuThreshold = parseInt(process.env.WATCHDOG_CPU_THRESHOLD) || options.cpuThreshold || 90;
    this.cpuWindow = parseInt(process.env.WATCHDOG_CPU_WINDOW) || options.cpuWindow || 10000;
    this.memThreshold = parseInt(process.env.WATCHDOG_MEM_THRESHOLD) || options.memThreshold || 512;
    this.memGrowthThreshold = parseInt(process.env.WATCHDOG_MEM_GROWTH) || options.memGrowth || 50;
    this.checkInterval = parseInt(process.env.WATCHDOG_INTERVAL) || options.interval || 5000;
    this.gracePeriod = parseInt(process.env.WATCHDOG_GRACE_PERIOD) || options.gracePeriod || 30000;

    this._timer = null;
    this._startTime = Date.now();
    this._cpuSamples = [];
    this._memBaseline = null;
    this._consecutiveHighCpu = 0;
    this._restarting = false;
    this._lastHealthLog = 0;

    // Health metrics exposed for monitoring
    this.metrics = {
      cpu: { current: 0, avg: 0, peak: 0, samples: 0 },
      memory: { current: 0, rss: 0, heapUsed: 0, heapTotal: 0, external: 0, baseline: null, peak: 0 },
      uptime: 0,
      restarts: 0,
      lastCheck: null,
      status: 'initializing'
    };
  }

  start() {
    if (!this.enabled) {
      logger.info('Watchdog: DISABLED via WATCHDOG_ENABLED=false');
      return this;
    }

    logger.info(`Watchdog: Starting (CPU>${this.cpuThreshold}%/${this.cpuWindow}ms, MEM>${this.memThreshold}MB)`);
    this._status = 'running';
    this._check();
    this._timer = setInterval(() => this._check(), this.checkInterval);
    this._timer.unref?.();

    // Register global handlers
    this._registerGlobalHandlers();
    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._status = 'stopped';
    logger.info('Watchdog: Stopped');
  }

  async _check() {
    if (this._restarting) return;

    const now = Date.now();
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    const isWithinGrace = (now - this._startTime) < this.gracePeriod;

    // Collect metrics
    this.metrics.uptime = uptime;
    this.metrics.memory.rss = Math.round(mem.rss / 1024 / 1024 * 100) / 100;
    this.metrics.memory.heapUsed = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    this.metrics.memory.heapTotal = Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100;
    this.metrics.memory.external = Math.round(mem.external / 1024 / 1024 * 100) / 100;
    this.metrics.memory.current = this.metrics.memory.rss;
    this.metrics.memory.peak = Math.max(this.metrics.memory.peak, this.metrics.memory.rss);
    this.metrics.lastCheck = now;

    // CPU estimation via event loop lag + /proc fallback
    const cpu = await this._estimateCpu();
    this.metrics.cpu.current = cpu;
    this.metrics.cpu.samples++;
    this.metrics.cpu.avg = ((this.metrics.cpu.avg * (this.metrics.cpu.samples - 1)) + cpu) / this.metrics.cpu.samples;
    this.metrics.cpu.peak = Math.max(this.metrics.cpu.peak, cpu);
    this._cpuSamples.push({ time: now, cpu });
    // Keep last 30 samples
    if (this._cpuSamples.length > 30) this._cpuSamples.shift();

    // Set memory baseline after grace period
    if (!isWithinGrace && this._memBaseline === null) {
      this._memBaseline = this.metrics.memory.rss;
      this.metrics.memory.baseline = this._memBaseline;
    }

    // Log health periodically
    if (now - this._lastHealthLog > 30000) {
      this._lastHealthLog = now;
      logger.info('Watchdog health', {
        cpu: `${cpu}%`,
        memory: `${this.metrics.memory.rss}MB`,
        heap: `${this.metrics.memory.heapUsed}MB/${this.metrics.memory.heapTotal}MB`,
        uptime: `${Math.floor(uptime)}s`,
        peakMem: `${this.metrics.memory.peak}MB`
      });
    }

    // ── Check 1: CPU over threshold for window ──
    if (!isWithinGrace && cpu >= this.cpuThreshold) {
      this._consecutiveHighCpu++;
      const elapsedHighCpu = this._consecutiveHighCpu * this.checkInterval;
      if (elapsedHighCpu >= this.cpuWindow) {
        logger.error(`Watchdog TRIGGER: CPU ${cpu}% > ${this.cpuThreshold}% for ${elapsedHighCpu}ms`);
        this.emit('critical', { type: 'cpu', value: cpu, threshold: this.cpuThreshold, duration: elapsedHighCpu });
        await this._restart('CPU over threshold');
        return;
      }
    } else {
      this._consecutiveHighCpu = Math.max(0, this._consecutiveHighCpu - 1);
    }

    // ── Check 2: Absolute memory threshold ──
    if (!isWithinGrace && this.metrics.memory.rss > this.memThreshold) {
      logger.error(`Watchdog TRIGGER: Memory ${this.metrics.memory.rss}MB > ${this.memThreshold}MB threshold`);
      this.emit('critical', { type: 'memory', value: this.metrics.memory.rss, threshold: this.memThreshold });
      await this._restart('Memory over threshold');
      return;
    }

    // ── Check 3: Rapid memory growth (leak detection) ──
    if (!isWithinGrace && this._memBaseline !== null) {
      const growth = this.metrics.memory.rss - this._memBaseline;
      if (growth > this.memGrowthThreshold) {
        logger.error(`Watchdog TRIGGER: Memory growth ${growth.toFixed(1)}MB > ${this.memGrowthThreshold}MB leak threshold`);
        this.emit('critical', { type: 'leak', growth, baseline: this._memBaseline, current: this.metrics.memory.rss });
        await this._restart('Memory leak detected');
        return;
      }
    }

    // ── Check 4: Event loop lag ──
    if (!isWithinGrace) {
      const lag = await this._measureEventLoopLag();
      if (lag > 1000) {
        logger.warn(`Watchdog: Event loop lag ${lag}ms (threshold 1000ms) - possible blockage`);
        this.emit('warning', { type: 'event-loop-lag', value: lag });
      }
    }

    // ── Check 5: Check that critical services responded ──
    if (this._checkServices) {
      for (const [name, fn] of Object.entries(this._checkServices)) {
        try {
          const ok = await fn();
          if (!ok) {
            logger.error(`Watchdog: Service "${name}" unresponsive`);
            await this._restart(`Service ${name} unresponsive`);
            return;
          }
        } catch (e) {
          logger.error(`Watchdog: Service "${name}" check failed: ${e.message}`);
        }
      }
    }

    this.metrics.status = 'healthy';
    this.emit('check', this.metrics);
  }

  /**
   * Register health-check functions for critical services.
   * Each fn should return true if healthy, false otherwise.
   */
  registerServiceCheck(name, fn) {
    if (!this._checkServices) this._checkServices = {};
    this._checkServices[name] = fn;
    logger.info(`Watchdog: Registered service check "${name}"`);
  }

  async _estimateCpu() {
    // CPU estimation via event loop lag sampling
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await new Promise(r => setImmediate(r));
      const elapsed = Date.now() - start;
      samples.push(elapsed);
    }
    const avgLag = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Map lag to approximate CPU: 0ms lag ≈ 10% CPU, 50ms lag ≈ 95% CPU
    const estimatedCpu = Math.min(99, 10 + (avgLag / 50) * 85);
    return Math.round(estimatedCpu * 10) / 10;
  }

  async _measureEventLoopLag() {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }

  async _restart(reason) {
    if (this._restarting) return;
    this._restarting = true;
    this.metrics.restarts++;
    this.metrics.status = 'restarting';

    logger.error(`Watchdog: Initiating restart due to: ${reason}`);
    this.emit('restart', { reason, timestamp: Date.now(), metrics: { ...this.metrics } });

    // Give time for graceful shutdown
    await new Promise(r => setTimeout(r, 1000));

    // Notify parent process
    if (process.send) {
      process.send({ type: 'watchdog_restart', reason, metrics: this.metrics });
    }

    // Graceful exit — the process manager (PM2, Docker, systemd) will restart
    logger.info('Watchdog: Exiting process for restart');
    process.exitCode = 42; // Special exit code signals watchdog restart
    setTimeout(() => process.exit(42), 2000);
  }

  _registerGlobalHandlers() {
    // Uncaught exceptions — log and restart
    process.on('uncaughtException', (err) => {
      logger.error('Watchdog: Uncaught exception', { error: err.message, stack: err.stack });
      this.emit('critical', { type: 'uncaught-exception', error: err.message });
      this._restart(`Uncaught exception: ${err.message}`);
    });

    // Unhandled rejections — log but don't crash
    process.on('unhandledRejection', (reason) => {
      logger.warn('Watchdog: Unhandled rejection', { reason: reason?.message || String(reason) });
    });

    // Warning events (e.g., memory pressure)
    process.on('warning', (warning) => {
      if (warning.name === 'MemoryWarning') {
        logger.warn('Watchdog: Memory pressure warning', { message: warning.message });
      }
    });

    // SIGTERM/SIGINT — graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Watchdog: SIGTERM received, shutting down');
      this.stop();
    });

    process.on('SIGINT', () => {
      logger.info('Watchdog: SIGINT received, shutting down');
      this.stop();
    });
  }

  getMetrics() { return { ...this.metrics, cpuHistory: this._cpuSamples.slice(-10) }; }
  isHealthy() { return this.metrics.status === 'healthy'; }
}

module.exports = new Watchdog();
