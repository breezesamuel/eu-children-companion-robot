// 安全配置管理 - API密钥通过环境变量或用户输入配置
// 不要在此文件中硬编码任何API密钥！

const AppConfig = {
    // LLM提供商配置
    llm: {
        deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '' },
        zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', apiKey: '' },
        nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-8b-instruct', apiKey: '' },
        alibaba: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', apiKey: '' },
        ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3', apiKey: 'ollama' },
        localai: { baseUrl: 'http://localhost:8080/v1', model: 'gpt-3.5-turbo', apiKey: 'localai' }
    },

    // 支付配置
    payment: {
        moltspay: { apiKey: '', secret: '' },
        paypal: { clientId: '', secret: '' }
    },

    // MCP服务器配置
    mcp: {
        servers: {
            filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
            sqlite: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite'] },
            fetch: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
            memory: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] },
            git: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-git'] },
            playwright: { command: 'npx', args: ['-y', '@playwright/mcp'] },
            braveSearch: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'] },
            puppeteer: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] }
        }
    },

    // 自托管服务配置
    selfHosted: {
        homeAssistant: { url: 'http://localhost:8123', token: '' },
        nextcloud: { url: 'http://localhost:8080', username: '', password: '' },
        grafana: { url: 'http://localhost:3000', apiKey: '' },
        jitsi: { url: 'http://localhost:8443' },
        matrix: { url: 'http://localhost:8008', token: '' },
        openMediaVault: { url: 'http://localhost:8081', token: '' }
    },

    // 看门狗配置
    watchdog: {
        cpuThreshold: 90,        // CPU占用阈值(%)
        memoryThreshold: 85,     // 内存占用阈值(%)
        checkInterval: 10000,    // 检查间隔(毫秒)
        sustainedDuration: 10000, // 持续时间阈值(毫秒)
        restartDelay: 5000,      // 重启延迟(毫秒)
        maxRestarts: 3,          // 最大重启次数
        cooldownPeriod: 60000    // 冷却期(毫秒)
    },

    // 语音配置
    voice: {
        languages: ['zh-CN', 'en-US', 'fr-FR', 'de-DE', 'es-ES', 'ja-JP', 'ko-KR'],
        defaultRate: 0.85,
        defaultPitch: 1.0,
        voices: {
            female_young: { rate: 0.9, pitch: 1.1 },
            female_mature: { rate: 0.8, pitch: 0.95 },
            male_young: { rate: 0.9, pitch: 0.9 },
            male_mature: { rate: 0.8, pitch: 0.8 },
            elderly_friendly: { rate: 0.7, pitch: 0.9 }
        }
    },

    // 从localStorage加载用户配置
    load() {
        const saved = localStorage.getItem('appConfig');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this._mergeConfig(this, parsed);
            } catch(e) {}
        }
    },

    // 保存配置到localStorage
    save() {
        localStorage.setItem('appConfig', JSON.stringify(this._serializable()));
    },

    _mergeConfig(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this._mergeConfig(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    },

    _serializable() {
        const obj = {};
        for (const key of ['llm', 'payment', 'mcp', 'selfHosted', 'watchdog', 'voice']) {
            obj[key] = JSON.parse(JSON.stringify(this[key]));
        }
        return obj;
    }
};

AppConfig.load();
window.AppConfig = AppConfig;
