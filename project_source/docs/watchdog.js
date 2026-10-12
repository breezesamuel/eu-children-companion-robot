class CircuitBreaker {
    constructor(threshold = 5, timeout = 30000) {
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.successCount++;
        if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.threshold) this.state = 'OPEN';
    }
}

class Watchdog {
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.cpuHighSince = null;
        this.memoryHighSince = null;
        this.restartCount = 0;
        this.lastRestartTime = 0;
        this.circuitBreakers = {};
        this.listeners = {};
        this.logs = [];
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log('INFO', '看门狗已启动');
        this._checkInterval = setInterval(() => this.check(), this.config.checkInterval);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this._checkInterval);
        this.log('INFO', '看门狗已停止');
    }

    check() {
        const cpu = this._getCpuUsage();
        const memory = this._getMemoryUsage();

        // CPU检查
        if (cpu > this.config.cpuThreshold) {
            if (!this.cpuHighSince) this.cpuHighSince = Date.now();
            else if (Date.now() - this.cpuHighSince > this.config.sustainedDuration) {
                this.emit('cpu-alert', { cpu, duration: Date.now() - this.cpuHighSince });
                this._handleAlert('CPU', cpu);
            }
        } else {
            this.cpuHighSince = null;
        }

        // 内存检查
        if (memory > this.config.memoryThreshold) {
            if (!this.memoryHighSince) this.memoryHighSince = Date.now();
            else if (Date.now() - this.memoryHighSince > this.config.sustainedDuration) {
                this.emit('memory-alert', { memory, duration: Date.now() - this.memoryHighSince });
                this._handleAlert('Memory', memory);
            }
        } else {
            this.memoryHighSince = null;
        }

        // 心跳检查
        this.emit('heartbeat', { cpu, memory, timestamp: Date.now() });
    }

    _getCpuUsage() {
        // 浏览器环境下使用performance API估算
        const start = performance.now();
        for (let i = 0; i < 1000000; i++) Math.sqrt(i);
        const elapsed = performance.now() - start;
        return Math.min(100, (elapsed / 10) * 100); // 估算值
    }

    _getMemoryUsage() {
        if (performance.memory) {
            return (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        }
        return 0;
    }

    _handleAlert(type, value) {
        this.log('WARN', `${type}过高: ${value.toFixed(1)}%`);

        if (this.restartCount >= this.config.maxRestarts) {
            this.log('ERROR', '已达到最大重启次数，进入冷却期');
            return;
        }

        if (Date.now() - this.lastRestartTime < this.config.cooldownPeriod) return;

        this.restartCount++;
        this.lastRestartTime = Date.now();
        this.emit('restart', { type, value, count: this.restartCount });

        // 尝试清理内存
        if (type === 'Memory') {
            if (typeof gc === 'function') gc();
            this.log('INFO', '已尝试清理内存');
        }
    }

    getCircuitBreaker(name, threshold, timeout) {
        if (!this.circuitBreakers[name]) {
            this.circuitBreakers[name] = new CircuitBreaker(threshold, timeout);
        }
        return this.circuitBreakers[name];
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        (this.listeners[event] || []).forEach(cb => cb(data));
    }

    log(level, message) {
        const entry = { level, message, timestamp: new Date().toISOString() };
        this.logs.push(entry);
        if (this.logs.length > 1000) this.logs.shift();
        console[level === 'WARN' ? 'warn' : level === 'ERROR' ? 'error' : 'log'](`[Watchdog] ${message}`);
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            restartCount: this.restartCount,
            circuitBreakers: Object.keys(this.circuitBreakers).map(k => ({
                name: k, state: this.circuitBreakers[k].state,
                failures: this.circuitBreakers[k].failureCount
            })),
            recentLogs: this.logs.slice(-20)
        };
    }
}

window.Watchdog = Watchdog;
window.CircuitBreaker = CircuitBreaker;
