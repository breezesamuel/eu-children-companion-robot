/**
 * 多LLM提供商集成管理器
 * 支持：DeepSeek、智谱AI、NVIDIA NIM、阿里通义千问、Ollama、LocalAI、vLLM
 * 功能：统一接口、自动故障转移、熔断机制、负载均衡、流式响应、本地缓存
 */

class LLMProvider {
    constructor() {
        // 提供商配置
        this.providers = {};
        // 熔断器状态 { providerName: { state, failures, lastFailure, openTime } }
        this.circuitBreakers = {};
        // 本地缓存
        this.cache = new Map();
        // 缓存最大条目数
        this.cacheMaxSize = 200;
        // 当前默认提供商
        this.currentProvider = 'deepseek';
        // 提供商优先级列表（用于故障转移）
        this.providerPriority = ['deepseek', 'zhipu', 'nvidia', 'alibaba', 'ollama', 'localai', 'vllm'];
        // 轮询计数器（负载均衡）
        this.roundRobinIndex = 0;
        // 熔断器参数
        this.breakerThreshold = 5;      // 连续失败5次触发熔断
        this.breakerTimeout = 60000;    // 熔断持续60秒
        // 请求超时
        this.requestTimeout = 30000;
        // 加载配置
        this.loadConfig();
        // 初始化熔断器
        this.initCircuitBreakers();
    }

    /**
     * 从localStorage加载API密钥配置
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('llm_config');
            if (saved) {
                this.config = JSON.parse(saved);
            } else {
                this.config = this.getDefaultConfig();
            }
        } catch (e) {
            console.warn('[LLMProvider] 加载配置失败，使用默认配置:', e);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * 获取默认配置（API密钥留空，由用户在设置面板输入）
     */
    getDefaultConfig() {
        return {
            deepseek: {
                apiKey: '',
                baseUrl: 'https://api.deepseek.com',
                model: 'deepseek-chat',
                enabled: true,
                priority: 1
            },
            zhipu: {
                apiKey: '',
                baseUrl: 'https://open.bigmodel.cn/api/paas',
                model: 'glm-4',
                enabled: true,
                priority: 2
            },
            nvidia: {
                apiKey: '',
                baseUrl: 'https://integrate.api.nvidia.com',
                model: 'meta/llama-3.1-8b-instruct',
                enabled: true,
                priority: 3
            },
            alibaba: {
                apiKey: '',
                baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
                model: 'qwen-turbo',
                enabled: true,
                priority: 4
            },
            ollama: {
                apiKey: '',
                baseUrl: 'http://localhost:11434',
                model: 'llama3.2',
                enabled: true,
                priority: 5
            },
            localai: {
                apiKey: '',
                baseUrl: 'http://localhost:8080',
                model: 'gpt-3.5-turbo',
                enabled: true,
                priority: 6
            },
            vllm: {
                apiKey: '',
                baseUrl: 'http://localhost:8000',
                model: 'default',
                enabled: true,
                priority: 7
            }
        };
    }

    /**
     * 保存配置到localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('llm_config', JSON.stringify(this.config));
        } catch (e) {
            console.error('[LLMProvider] 保存配置失败:', e);
        }
    }

    /**
     * 初始化所有提供商的熔断器
     */
    initCircuitBreakers() {
        for (const name of this.providerPriority) {
            this.circuitBreakers[name] = {
                state: 'closed',       // closed=正常, open=熔断, half-open=半开
                failures: 0,           // 连续失败次数
                lastFailure: 0,        // 上次失败时间戳
                openTime: 0            // 熔断开启时间
            };
        }
    }

    /**
     * 统一的聊天接口
     * @param {Array} messages - 消息数组 [{role, content}]
     * @param {Object} options - 可选参数 {stream, temperature, maxTokens, provider}
     * @returns {Object|string} - 响应内容或流式读取器
     */
    async chat(messages, options = {}) {
        const {
            stream = false,
            temperature,
            maxTokens,
            provider,
            useCache = true,
            onChunk
        } = options;

        // 生成缓存键
        const cacheKey = this.generateCacheKey(messages, options);

        // 缓存检查（仅非流式请求使用缓存）
        if (useCache && !stream && this.cache.has(cacheKey)) {
            console.log('[LLMProvider] 命中缓存');
            return this.cache.get(cacheKey);
        }

        // 确定要使用的提供商
        const targetProvider = provider || this.currentProvider;

        // 检查熔断状态
        if (this.isCircuitOpen(targetProvider)) {
            console.warn(`[LLMProvider] 提供商 ${targetProvider} 熔断中，尝试故障转移`);
            // 故障转移：尝试其他可用提供商
            return this.fallbackChat(messages, options, targetProvider);
        }

        try {
            const result = await this.callProvider(targetProvider, messages, {
                stream,
                temperature,
                maxTokens,
                onChunk
            });

            // 成功则重置熔断器
            this.resetCircuitBreaker(targetProvider);

            // 缓存结果（仅非流式）
            if (!stream && useCache) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            // 失败则记录熔断
            this.recordFailure(targetProvider, error);
            console.error(`[LLMProvider] 提供商 ${targetProvider} 调用失败:`, error.message);

            // 故障转移
            return this.fallbackChat(messages, options, targetProvider);
        }
    }

    /**
     * 故障转移：尝试其他可用提供商
     */
    async fallbackChat(messages, options, excludeProvider) {
        const availableProviders = this.providerPriority.filter(
            name => name !== excludeProvider &&
                    this.config[name]?.enabled &&
                    !this.isCircuitOpen(name) &&
                    this.hasApiKey(name)
        );

        if (availableProviders.length === 0) {
            throw new Error('[LLMProvider] 所有提供商均不可用，请检查API密钥配置');
        }

        // 轮询选择下一个提供商
        this.roundRobinIndex = this.roundRobinIndex % availableProviders.length;
        const fallbackProvider = availableProviders[this.roundRobinIndex];
        this.roundRobinIndex++;

        console.log(`[LLMProvider] 故障转移到 ${fallbackProvider}`);

        try {
            const result = await this.callProvider(fallbackProvider, messages, options);
            this.resetCircuitBreaker(fallbackProvider);

            // 缓存结果
            if (!options.stream) {
                const cacheKey = this.generateCacheKey(messages, options);
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            this.recordFailure(fallbackProvider, error);
            // 递归尝试下一个
            const remaining = availableProviders.filter(n => n !== fallbackProvider);
            if (remaining.length > 0) {
                return this.fallbackChat(messages, options, fallbackProvider);
            }
            throw new Error('[LLMProvider] 所有故障转移提供商均失败: ' + error.message);
        }
    }

    /**
     * 调用指定提供商（统一OpenAI兼容格式）
     */
    async callProvider(providerName, messages, options = {}) {
        const config = this.config[providerName];
        if (!config) {
            throw new Error(`[LLMProvider] 未知提供商: ${providerName}`);
        }

        if (!this.hasApiKey(providerName)) {
            throw new Error(`[LLMProvider] 提供商 ${providerName} 未配置API密钥`);
        }

        const { stream, temperature, maxTokens, onChunk } = options;

        // 构建请求体
        const body = {
            model: config.model,
            messages: messages,
            stream: stream || false
        };

        if (temperature !== undefined) body.temperature = temperature;
        if (maxTokens !== undefined) body.max_tokens = maxTokens;

        // 构建请求URL
        let url = config.baseUrl;
        if (providerName === 'ollama') {
            url = `${config.baseUrl}/api/chat`;
        } else {
            // OpenAI兼容格式
            url = `${config.baseUrl}/v1/chat/completions`;
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json'
        };

        if (providerName === 'ollama') {
            // Ollama不需要Authorization头
        } else {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        // 智谱AI特殊处理
        if (providerName === 'zhipu') {
            url = `${config.baseUrl}/v4/chat/completions`;
        }

        // 发起请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // 流式响应处理
            if (stream) {
                return this.handleStreamResponse(response, onChunk);
            }

            // 非流式响应
            const data = await response.json();

            // Ollama格式适配
            if (providerName === 'ollama' && data.message) {
                return {
                    content: data.message.content,
                    model: data.model,
                    provider: providerName
                };
            }

            // OpenAI兼容格式
            if (data.choices && data.choices[0]) {
                return {
                    content: data.choices[0].message?.content || '',
                    model: data.model,
                    provider: providerName,
                    usage: data.usage
                };
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`[LLMProvider] 请求超时 (${this.requestTimeout}ms)`);
            }
            throw error;
        }
    }

    /**
     * 处理流式响应（SSE）
     */
    async handleStreamResponse(response, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        const streamIterator = {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || trimmed === 'data: [DONE]') continue;
                            if (!trimmed.startsWith('data: ')) continue;

                            try {
                                const json = JSON.parse(trimmed.slice(6));
                                const content = json.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    fullContent += content;
                                    if (onChunk) onChunk(content, fullContent);
                                    yield content;
                                }
                            } catch (e) {
                                // 忽略解析错误，继续处理
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }
        };

        return {
            stream: streamIterator,
            getFullContent: () => fullContent,
            provider: 'streaming'
        };
    }

    /**
     * 检查熔断器是否开启
     */
    isCircuitOpen(providerName) {
        const breaker = this.circuitBreakers[providerName];
        if (!breaker) return false;

        if (breaker.state === 'open') {
            // 检查是否超过熔断超时时间
            const elapsed = Date.now() - breaker.openTime;
            if (elapsed >= this.breakerTimeout) {
                // 转为半开状态，允许一次尝试
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }

        return false;
    }

    /**
     * 记录失败
     */
    recordFailure(providerName, error) {
        const breaker = this.circuitBreakers[providerName];
        if (!breaker) return;

        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.state === 'half-open') {
            // 半开状态下失败，重新开启熔断
            breaker.state = 'open';
            breaker.openTime = Date.now();
            console.warn(`[LLMProvider] 提供商 ${providerName} 半开状态失败，重新熔断`);
        } else if (breaker.failures >= this.breakerThreshold) {
            // 达到阈值，开启熔断
            breaker.state = 'open';
            breaker.openTime = Date.now();
            console.warn(`[LLMProvider] 提供商 ${providerName} 连续失败 ${breaker.failures} 次，熔断开启 ${this.breakerTimeout / 1000} 秒`);
        }
    }

    /**
     * 重置熔断器
     */
    resetCircuitBreaker(providerName) {
        const breaker = this.circuitBreakers[providerName];
        if (!breaker) return;
        breaker.state = 'closed';
        breaker.failures = 0;
        breaker.lastFailure = 0;
        breaker.openTime = 0;
    }

    /**
     * 检查提供商是否配置了API密钥
     */
    hasApiKey(providerName) {
        const config = this.config[providerName];
        if (!config) return false;
        // 本地提供商（ollama、localai、vllm）不需要API密钥
        if (['ollama', 'localai', 'vllm'].includes(providerName)) return true;
        return !!config.apiKey && config.apiKey.length > 0;
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(messages, options) {
        const key = JSON.stringify({
            messages,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            model: this.config[options.provider || this.currentProvider]?.model
        });
        // 简单哈希
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'llm_cache_' + Math.abs(hash).toString(36);
    }

    /**
     * 设置缓存
     */
    setCache(key, value) {
        // 超过最大缓存数时清理最旧的
        if (this.cache.size >= this.cacheMaxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 更新提供商配置
     */
    updateProviderConfig(provider, config) {
        if (!this.config[provider]) {
            console.warn(`[LLMProvider] 未知提供商: ${provider}`);
            return;
        }
        this.config[provider] = { ...this.config[provider], ...config };
        this.saveConfig();
    }

    /**
     * 设置默认提供商
     */
    setDefaultProvider(provider) {
        if (!this.config[provider]) {
            console.warn(`[LLMProvider] 未知提供商: ${provider}`);
            return;
        }
        this.currentProvider = provider;
        console.log(`[LLMProvider] 默认提供商切换为: ${provider}`);
    }

    /**
     * 获取所有提供商状态
     */
    getProviderStatus() {
        const status = {};
        for (const name of this.providerPriority) {
            const config = this.config[name];
            const breaker = this.circuitBreakers[name];
            status[name] = {
                enabled: config?.enabled || false,
                hasApiKey: this.hasApiKey(name),
                model: config?.model || '',
                circuitState: breaker?.state || 'closed',
                failures: breaker?.failures || 0,
                isAvailable: config?.enabled && !this.isCircuitOpen(name) && this.hasApiKey(name)
            };
        }
        return status;
    }

    /**
     * 获取当前可用的提供商列表
     */
    getAvailableProviders() {
        return this.providerPriority.filter(
            name => this.config[name]?.enabled && this.hasApiKey(name) && !this.isCircuitOpen(name)
        );
    }

    /**
     * 测试提供商连接
     */
    async testConnection(providerName) {
        try {
            const result = await this.callProvider(providerName, [
                { role: 'user', content: '你好，请回复"连接成功"' }
            ], { stream: false });
            return { success: true, message: '连接成功', result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 负载均衡：轮询选择下一个可用提供商
     */
    getNextProvider() {
        const available = this.getAvailableProviders();
        if (available.length === 0) return null;
        this.roundRobinIndex = this.roundRobinIndex % available.length;
        return available[this.roundRobinIndex++];
    }
}

// 暴露到全局
window.llmProvider = new LLMProvider();
