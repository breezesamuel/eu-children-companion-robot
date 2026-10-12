class LLMEngine {
    constructor() {
        this.providers = {};
        this.currentProvider = 'deepseek';
        this.conversationHistory = [];
        this.maxHistory = 20;
        this.circuitBreakers = {};
        this.tools = [];
        this.onToken = null; // 流式输出回调
        this.onComplete = null; // 完成回调
        this.onError = null; // 错误回调
    }

    // 初始化提供商
    initProviders(config) {
        for (const [name, cfg] of Object.entries(config.llm)) {
            this.providers[name] = { ...cfg, available: false };
            this.circuitBreakers[name] = new CircuitBreaker(3, 30000);
            // 检查可用性
            this.checkProvider(name);
        }
    }

    // 检查提供商可用性
    async checkProvider(name) {
        const provider = this.providers[name];
        if (!provider || !provider.apiKey) {
            provider.available = false;
            return false;
        }
        try {
            const response = await fetch(`${provider.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${provider.apiKey}` },
                signal: AbortSignal.timeout(5000)
            });
            provider.available = response.ok;
        } catch {
            provider.available = false;
        }
        return provider.available;
    }

    // 发送消息
    async chat(messages, options = {}) {
        const provider = this.providers[this.currentProvider];
        if (!provider || !provider.apiKey) {
            return this._fallbackResponse(messages, options);
        }

        const breaker = this.circuitBreakers[this.currentProvider];

        try {
            return await breaker.execute(async () => {
                const body = {
                    model: options.model || provider.model,
                    messages: messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? 2048,
                    stream: options.stream ?? false
                };

                if (this.tools.length > 0 && options.enableTools) {
                    body.tools = this.tools;
                    body.tool_choice = 'auto';
                }

                const response = await fetch(`${provider.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${provider.apiKey}`
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(options.timeout ?? 30000)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                if (options.stream) {
                    return this._handleStream(response, options);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';

                if (options.addToHistory !== false) {
                    this.conversationHistory.push(
                        { role: 'user', content: messages[messages.length - 1].content },
                        { role: 'assistant', content }
                    );
                    this._trimHistory();
                }

                return { content, provider: this.currentProvider, usage: data.usage };
            });
        } catch (error) {
            console.error(`[LLM] ${this.currentProvider} failed:`, error);
            // 故障转移到下一个可用提供商
            return this._failover(messages, options);
        }
    }

    // 流式处理
    async _handleStream(response, options) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content || '';
                    if (token) {
                        fullContent += token;
                        if (this.onToken) this.onToken(token, fullContent);
                    }
                } catch {}
            }
        }

        if (this.onComplete) this.onComplete(fullContent);
        return { content: fullContent, provider: this.currentProvider, streamed: true };
    }

    // 故障转移
    async _failover(messages, options) {
        for (const name of Object.keys(this.providers)) {
            if (name === this.currentProvider) continue;
            if (!this.providers[name].apiKey) continue;
            if (this.circuitBreakers[name].state === 'OPEN') continue;

            const prevProvider = this.currentProvider;
            this.currentProvider = name;
            try {
                const result = await this.chat(messages, { ...options, addToHistory: false });
                console.log(`[LLM] Failover to ${name} succeeded`);
                return result;
            } catch {
                this.currentProvider = prevProvider;
            }
        }
        return this._fallbackResponse(messages, options);
    }

    // 本地回退响应
    _fallbackResponse(messages, options) {
        const lastMsg = messages[messages.length - 1]?.content || '';
        const lang = (typeof currentLanguage !== 'undefined' && currentLanguage === 'zh') ? 'zh' : 'en';
        const responses = lang === 'zh' ? [
            '我理解你的问题。让我想想...',
            '这是一个很好的问题！根据我的知识...',
            '让我为你解答这个问题。',
            '我正在思考你的问题，请稍等...'
        ] : [
            'I understand your question. Let me think...',
            'That\'s a great question! Based on my knowledge...',
            'Let me help you with that.',
            'I\'m processing your question, please wait...'
        ];
        const content = responses[Math.floor(Math.random() * responses.length)];
        return { content, provider: 'local', fallback: true };
    }

    // 设置当前提供商
    setProvider(name) {
        if (this.providers[name]) {
            this.currentProvider = name;
            return true;
        }
        return false;
    }

    // 设置API密钥
    setApiKey(provider, apiKey) {
        if (this.providers[provider]) {
            this.providers[provider].apiKey = apiKey;
            this.checkProvider(provider);
            return true;
        }
        return false;
    }

    // 注册工具
    registerTool(tool) {
        this.tools.push(tool);
    }

    // 清除历史
    clearHistory() {
        this.conversationHistory = [];
    }

    // 修剪历史
    _trimHistory() {
        if (this.conversationHistory.length > this.maxHistory * 2) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
        }
    }

    // 获取提供商状态
    getProviderStatus() {
        return Object.entries(this.providers).map(([name, cfg]) => ({
            name,
            model: cfg.model,
            available: cfg.available,
            hasApiKey: !!cfg.apiKey,
            circuitState: this.circuitBreakers[name]?.state || 'CLOSED'
        }));
    }
}

window.LLMEngine = LLMEngine;
