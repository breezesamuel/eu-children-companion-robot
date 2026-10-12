const axios = require('axios');
const EventEmitter = require('events');

class AIWriter extends EventEmitter {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        this.baseURL = options.baseURL || 'https://api.openai.com/v1';
        this.model = options.model || 'gpt-3.5-turbo';
        this.maxTokens = options.maxTokens || 2000;
        this.temperature = options.temperature ?? 0.7;
        this.tone = options.tone || 'professional';
        this.persona = options.persona || 'default';
        this.language = options.language || 'en';
        this.templates = {};
    }

    _buildHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async _callAPI(messages, options = {}) {
        try {
            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: options.model || this.model,
                messages,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature ?? this.temperature,
                top_p: options.topP ?? 0.95,
                n: options.n || 1
            }, { headers: this._buildHeaders(), timeout: 30000 });
            return response.data.choices.map(c => c.message.content.trim());
        } catch (e) {
            this.emit('error', e);
            return options.n > 1 ? [] : null;
        }
    }

    _getTonePrompt() {
        const tones = {
            professional: 'Use professional, formal language suitable for business contexts.',
            friendly: 'Use warm, friendly, and approachable language.',
            playful: 'Use fun, engaging, and playful language suitable for children.',
            authoritative: 'Use confident, authoritative language that establishes expertise.',
            empathetic: 'Use empathetic, understanding, and compassionate language.',
            persuasive: 'Use persuasive, compelling language designed to convince.',
            academic: 'Use scholarly, academic language with proper citations.'
        };
        return tones[this.tone] || tones.professional;
    }

    _getPersonaPrompt() {
        const personas = {
            default: 'Write as a knowledgeable content creator.',
            teacher: 'Write as an experienced educator explaining concepts clearly.',
            storyteller: 'Write as a captivating storyteller.',
            expert: 'Write as a subject matter expert with deep knowledge.',
            journalist: 'Write as an objective journalist presenting facts.'
        };
        return personas[this.persona] || personas.default;
    }

    async generateOutline(topic, options = {}) {
        const prompt = `Create a detailed article outline for the topic: "${topic}"

${this._getTonePrompt()}
${this._getPersonaPrompt()}

Generate a structured outline with:
1. Main title (catchy and SEO-friendly)
2. Introduction hook
3. 4-6 main sections with subsections
4. Key points for each section
5. Conclusion summary points

Format as a JSON object with: { "title": "", "sections": [{ "heading": "", "subsections": [""], "keyPoints": [""] }], "conclusion": [""] }`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are an expert content strategist. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: 1500 });
        if (!result) return null;
        try {
            return JSON.parse(result[0]);
        } catch {
            return { title: topic, sections: [], conclusion: [] };
        }
    }

    async writeArticle(topic, options = {}) {
        const outline = options.outline || await this.generateOutline(topic, options);
        const sections = [];
        for (const section of outline.sections || []) {
            const sectionPrompt = `Write the section "${section.heading}" for an article about "${topic}".

${this._getTonePrompt()}
${this._getPersonaPrompt()}

Key points to cover: ${(section.keyPoints || []).join(', ')}
Subsections: ${(section.subsections || []).join(', ')}

Write 2-3 detailed paragraphs. Include relevant facts, examples, and smooth transitions.`;

            const sectionText = await this._callAPI([
                { role: 'system', content: 'You are an expert content writer.' },
                { role: 'user', content: sectionPrompt }
            ], { ...options, maxTokens: this.maxTokens });
            if (sectionText) {
                sections.push({ heading: section.heading, content: sectionText[0] });
            }
        }
        return { title: outline.title, sections, conclusion: outline.conclusion || [] };
    }

    async generateProductDescription(product, options = {}) {
        const prompt = `Write a professional e-commerce product description:

Product Name: ${product.name || 'Unnamed Product'}
Category: ${product.category || 'General'}
Features: ${(product.features || []).join(', ')}
Specifications: ${product.specs ? JSON.stringify(product.specs) : 'N/A'}
Target Audience: ${product.targetAudience || 'General'}
Unique Selling Points: ${product.highlights || 'N/A'}

${this._getTonePrompt()}

Provide:
1. Compelling product title
2. Short description (under 30 words)
3. Detailed description (300-500 words highlighting benefits)
4. 3-5 key selling points
5. Use cases
6. Target audience description`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are an expert e-commerce copywriter.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: this.maxTokens });
        return result ? result[0] : this.generateFallbackDescription(product);
    }

    async generateSocialMediaPost(content, platform = 'wechat', options = {}) {
        const platformStyles = {
            wechat: 'Warm, personal style suitable for WeChat Moments. Use Chinese. Include hashtags.',
            weibo: 'Lively, engaging style suitable for Weibo. Use Chinese. Include trending topics.',
            douyin: 'Short, punchy style suitable for Douyin. Use Chinese. Include emojis.',
            twitter: 'Concise, impactful style max 280 chars. Use English. Include hashtags.',
            instagram: 'Visual, descriptive style. Use English. Include emojis and hashtags.',
            facebook: 'Conversational, community-focused style. Use English.',
            linkedin: 'Professional, insight-driven style. Use English. Include industry hashtags.'
        };

        const prompt = `Create a ${platform} social media post for:

Title: ${content.title || 'N/A'}
Content: ${content.excerpt || content.body || content.content || 'N/A'}
Highlights: ${content.highlights || 'N/A'}

Style: ${platformStyles[platform] || platformStyles.wechat}

Format:
1. Main post text (optimized for platform)
2. Image suggestions
3. Hashtags (5-10 relevant tags)`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are a social media marketing expert.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: 500, temperature: 0.8 });
        return result ? result[0] : this.generateFallbackSocialPost(content, platform);
    }

    async generateHeadline(topic, options = {}) {
        const prompt = `Generate 10 compelling headlines for: "${topic}"

${this._getTonePrompt()}

Each headline should:
- Be under 70 characters
- Include power words
- Be SEO-friendly
- Spark curiosity or emotion

Return as a JSON array of strings.`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are a headline writing expert. Respond with valid JSON.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: 500, temperature: 0.8 });
        if (!result) return [topic];
        try { return JSON.parse(result[0]); } catch { return [topic]; }
    }

    async generateMetaDescription(content, options = {}) {
        const text = content.body || content.content || content.excerpt || content.title || '';
        const prompt = `Write an SEO meta description (max 160 characters) for:

Title: ${content.title || ''}
Content: ${text.substring(0, 500)}

Requirements:
- Include target keywords naturally
- Compelling call to action
- Under 160 characters
- Match search intent

Return just the meta description text.`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are an SEO specialist.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: 100, temperature: 0.4 });
        return result ? result[0].substring(0, 160) : (content.excerpt || '').substring(0, 160);
    }

    async generateSEOKeywords(product) {
        const prompt = `Generate 10-15 SEO keywords for:

Product: ${product.name || 'N/A'}
Category: ${product.category || 'N/A'}
Features: ${(product.features || []).join(', ')}

Include:
- Primary keywords (high volume)
- Long-tail keywords (specific)
- LSI keywords (related terms)

Return comma-separated keywords only.`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are an SEO keyword research expert.' },
            { role: 'user', content: prompt }
        ], { maxTokens: 100, temperature: 0.5 });
        if (result) return result[0].split(',').map(k => k.trim());
        return this.generateFallbackKeywords(product);
    }

    optimizeKeywordDensity(content, keywords, options = {}) {
        let text = content;
        const targetDensity = options.targetDensity || 0.02;
        const words = text.split(/\s+/);
        const totalWords = words.length;

        keywords.forEach(keyword => {
            const keywordRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const currentCount = (text.match(keywordRegex) || []).length;
            const targetCount = Math.floor(totalWords * targetDensity);

            if (currentCount < targetCount) {
                for (let i = 0; i < targetCount - currentCount; i++) {
                    const insertPoints = [
                        ` ${keyword}`,
                        `, ${keyword},`,
                        ` ${keyword} `
                    ];
                    text += insertPoints[i % insertPoints.length];
                }
            }
        });
        return text;
    }

    async summarizeContent(content, options = {}) {
        const maxLength = options.maxLength || 200;
        const prompt = `Summarize the following content in ${maxLength} words or less:

${(content.body || content.content || content).substring(0, 3000)}

Return: A clear, concise summary that captures the main points. Keep it under ${maxLength} words.`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are a skilled editor specializing in content summarization.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: maxLength + 50, temperature: 0.4 });
        return result ? result[0] : '';
    }

    async generateMultipleDrafts(topic, count = 3, options = {}) {
        const drafts = [];
        for (let i = 0; i < count; i++) {
            const tempVariation = 0.6 + (i * 0.15);
            const draft = await this._callAPI([
                { role: 'system', content: `${this._getTonePrompt()}\n${this._getPersonaPrompt()}\nWrite a unique version of this content.` },
                { role: 'user', content: `Write an article about: ${topic}. This is version ${i + 1}. Use a different angle and structure.` }
            ], { ...options, temperature: tempVariation, maxTokens: this.maxTokens });
            if (draft) drafts.push(draft[0]);
        }
        return drafts;
    }

    async translateText(text, targetLang = 'zh', options = {}) {
        const langNames = { zh: 'Chinese', en: 'English', de: 'German', fr: 'French', nl: 'Dutch', ja: 'Japanese', ko: 'Korean', es: 'Spanish' };
        const targetName = langNames[targetLang] || targetLang;
        const prompt = `Translate the following text to ${targetName}. Return only the translation, no additional text.

${text}`;

        const result = await this._callAPI([
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: this.maxTokens, temperature: 0.3 });
        return result ? result[0] : text;
    }

    async checkPlagiarism(text) {
        const segments = text.match(/.{1,500}/g) || [];
        const results = [];
        for (const segment of segments) {
            try {
                const resp = await axios.post('https://api.plagiarismchecker.com/check', {
                    text: segment,
                    apiKey: process.env.PLAGIARISM_API_KEY
                }, { timeout: 10000 });
                results.push({ segment: segment.substring(0, 50), similarity: resp.data?.similarity || 0, sources: resp.data?.sources || [] });
            } catch {
                results.push({ segment: segment.substring(0, 50), similarity: 0, sources: [] });
            }
        }
        return { overallSimilarity: results.reduce((s, r) => s + r.similarity, 0) / results.length, details: results };
    }

    async addCitations(content, options = {}) {
        const style = options.citationStyle || 'APA';
        const prompt = `Add ${style} style citations to the following content. Find credible sources and cite them properly.

${content}

Return the content with inline citations and a references section.`;

        const result = await this._callAPI([
            { role: 'system', content: 'You are a research assistant with expertise in academic citations.' },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: this.maxTokens + 500 });
        return result ? result[0] : content;
    }

    async factCheck(text) {
        const claims = text.match(/[^.!?]+[.!?]+/g) || [];
        const results = [];
        for (const claim of claims.slice(0, 10)) {
            const prompt = `Fact-check the following claim. Respond with: { "claim": "...", "verdict": "true|false|unverifiable|partially_true|partially_false", "confidence": 0.0-1.0, "explanation": "..." }

Claim: "${claim.trim()}"`;

            const result = await this._callAPI([
                { role: 'system', content: 'You are a fact-checking assistant. Respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { maxTokens: 200, temperature: 0.2 });
            if (result) {
                try { results.push(JSON.parse(result[0])); } catch { results.push({ claim: claim.substring(0, 50), verdict: 'unverifiable', confidence: 0 }); }
            }
        }
        return results;
    }

    scoreContent(content, options = {}) {
        const text = (content.body || content.content || content.title || '') + ' ' + (content.excerpt || '');
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length ? wordCount / sentences.length : 0;
        const readabilityScore = Math.max(0, Math.min(100, 100 - (avgSentenceLength * 1.5)));
        const hasKeywords = options.keywords ? options.keywords.some(k => text.toLowerCase().includes(k.toLowerCase())) : true;
        const seoScore = hasKeywords ? Math.min(100, readabilityScore + 15) : readabilityScore;
        const engagementScore = Math.min(100, (sentences.filter(s => s.includes('?') || s.includes('!')).length / Math.max(1, sentences.length)) * 100 + 40);
        return {
            overall: Math.round((readabilityScore * 0.3 + seoScore * 0.4 + engagementScore * 0.3) * 10) / 10,
            readability: Math.round(readabilityScore * 10) / 10,
            seo: Math.round(seoScore * 10) / 10,
            engagement: Math.round(engagementScore * 10) / 10,
            wordCount,
            sentenceCount: sentences.length,
            avgSentenceLength: Math.round(avgSentenceLength * 10) / 10
        };
    }

    adaptLanguage(text, targetStyle, options = {}) {
        const adaptPrompt = `Adapt the following text to a ${targetStyle} style while preserving all key information:

Original: ${text}

Target style: ${targetStyle}
${this._getTonePrompt()}

Rewrite to match the target style naturally.`;

        return this._callAPI([
            { role: 'system', content: 'You are a style adaptation expert.' },
            { role: 'user', content: adaptPrompt }
        ], { ...options, maxTokens: this.maxTokens });
    }

    addTemplate(name, template) {
        this.templates[name] = template;
    }

    removeTemplate(name) {
        delete this.templates[name];
    }

    async writeFromTemplate(templateName, variables = {}, options = {}) {
        const template = this.templates[templateName];
        if (!template) throw new Error(`Template "${templateName}" not found`);
        let prompt = template;
        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        const result = await this._callAPI([
            { role: 'system', content: `Follow this template exactly. ${this._getTonePrompt()}` },
            { role: 'user', content: prompt }
        ], { ...options, maxTokens: this.maxTokens });
        return result ? result[0] : null;
    }

    async batchGenerate(items, options = {}) {
        const results = [];
        const concurrency = options.concurrency || 3;
        for (let i = 0; i < items.length; i += concurrency) {
            const batch = items.slice(i, i + concurrency);
            const batchResults = await Promise.all(batch.map(item => {
                if (item.type === 'product') return this.generateProductDescription(item.data, options);
                if (item.type === 'social') return this.generateSocialMediaPost(item.data, item.platform, options);
                if (item.type === 'headline') return this.generateHeadline(item.data, options);
                if (item.type === 'article') return this.writeArticle(item.data, options);
                return null;
            }));
            results.push(...batchResults);
            this.emit('batch-progress', { completed: results.length, total: items.length });
        }
        return results;
    }

    generateFallbackDescription(product) {
        return `1. Product Title: Premium ${product.name || 'Product'} - Quality Choice
2. Short Description: ${product.name || 'Product'}, worth having
3. Detailed Description: This product${product.category ? ` belongs to ${product.category}` : ''} with ${(product.features || ['multiple excellent features']).join(', ')}. We carefully craft every product for the best experience.
4. Key Selling Points:
- Quality assurance
- Thoughtful design
- Excellent service
- Great value
5. Use Cases: Suitable for daily use
6. Target Audience: Everyone seeking quality life`;
    }

    generateFallbackKeywords(product) {
        return [
            product.name,
            product.category,
            `${product.name} original`,
            `${product.name} sale`,
            `${product.category} ${product.name}`
        ].filter(Boolean);
    }

    generateFallbackSocialPost(product, platform) {
        return `1. Main Text: New arrival! ${product.name || 'Quality Product'} is here! Quality guaranteed, trustworthy!
2. Image Suggestions: Product photos, usage scenarios
3. Hashtags: #NewArrival #QualityLife #ProductRecommendation`;
    }
}

module.exports = AIWriter;
