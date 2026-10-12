const logger = require('../utils/logger');
const registry = require('./registry');

const NEGATIVE_PROMPTS = {
  default: 'nsfw, low quality, blurry, distorted, ugly, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
  portrait: 'nsfw, low quality, blurry, bad anatomy, double face, extra eyes, deformed, ugly, mutation, bad proportions',
  landscape: 'nsfw, low quality, blurry, ugly, distorted, watermark, signature, text, frame',
  anime: 'nsfw, low quality, blurry, bad anatomy, extra limbs, ugly, deformed, bad proportions, text, watermark, signature, realistic, photorealistic',
  realistic: 'nsfw, low quality, blurry, cartoon, anime, illustration, 3d render, painting, sketch, drawing, abstract'
};

const SAFETY_CONFIG = {
  enabled: true,
  blockedTerms: ['nsfw', 'explicit', 'violent', 'gore', 'sexual', 'adult', 'porn', 'xxx'],
  maxPromptLength: 1000,
  allowChildSafeOnly: true
};

const OUTPUT_FORMATS = ['png', 'jpeg', 'webp', 'avif'];

class ImageGenEngine {
  constructor() {
    this.providers = {
      openai: { name: 'DALL-E 3', endpoint: 'https://api.openai.com/v1/images/generations', key: process.env.OPENAI_API_KEY, supportsEdit: true, supportsVariation: true },
      stability: { name: 'Stable Diffusion', endpoint: 'https://api.stability.ai/v2beta/stable-image/generate/sd3', key: process.env.STABILITY_API_KEY, supportsEdit: true, supportsUpscale: true },
      together: { name: 'Together AI', endpoint: 'https://api.together.xyz/v1/images/generations', key: process.env.TOGETHER_API_KEY, supportsEdit: false, supportsVariation: false },
      replicate: { name: 'Replicate (Flux)', endpoint: 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', key: process.env.REPLICATE_API_KEY, supportsUpscale: true },
      local: { name: 'Local SD', endpoint: 'http://localhost:7860/sdapi/v1/txt2img', local: true, supportsEdit: true, supportsUpscale: true }
    };
    this.history = [];
    this.safetyFilter = { ...SAFETY_CONFIG };
    this._register();
  }

  _register() {
    for (const [id, meta] of Object.entries(this.providers)) {
      registry.registerIntegration(`image-${id}`, {
        name: meta.name, type: 'image', needsKey: !meta.local,
        apiKey: meta.key, endpoint: meta.endpoint,
        category: 'media/image', priority: id === 'openai' ? 10 : 5
      }, this);
    }
    registry.registerTool('image:generate', { name: 'Generate Image', description: 'Text-to-image generation', paramsSchema: { prompt: { required: true, type: 'string' } } }, async (p) => this.generate(p.prompt, p.options));
    registry.registerTool('image:edit', { name: 'Edit Image', description: 'Image-to-image editing' }, async (p) => this.edit(p.image, p.prompt, p.options));
    registry.registerTool('image:inpaint', { name: 'Inpaint Image', description: 'Inpaint masked area' }, async (p) => this.inpaint(p.image, p.mask, p.prompt, p.options));
    registry.registerTool('image:upscale', { name: 'Upscale Image', description: 'Increase image resolution' }, async (p) => this.upscale(p.image, p.scale, p.options));
    registry.registerTool('image:variation', { name: 'Image Variation', description: 'Generate variations' }, async (p) => this.variation(p.image, p.options));
    registry.registerTool('image:composite', { name: 'Composite Images', description: 'Merge two images' }, async (p) => this.composite(p.images, p.options));
    registry.registerTool('image:remove-bg', { name: 'Remove Background', description: 'Remove image background' }, async (p) => this.removeBackground(p.image, p.options));
    registry.registerTool('image:analyze', { name: 'Analyze Image', description: 'AI image analysis' }, async (p) => this.analyze(p.image));
    registry.registerTool('image:batch', { name: 'Batch Generate', description: 'Generate multiple images' }, async (p) => this.batchGenerate(p.prompts, p.options));
    registry.registerTool('image:style-transfer', { name: 'Style Transfer', description: 'Apply style to image' }, async (p) => this.styleTransfer(p.image, p.style, p.options));
    registry.registerTool('image:enhance-prompt', { name: 'Enhance Prompt', description: 'Improve prompt with LLM' }, async (p) => this.enhancePrompt(p.prompt));
  }

  getProviders() {
    return Object.entries(this.providers).map(([id, m]) => ({
      id, name: m.name, hasKey: !!m.key, local: !!m.local,
      supportsEdit: !!m.supportsEdit,
      supportsVariation: !!m.supportsVariation,
      supportsUpscale: !!m.supportsUpscale
    }));
  }

  async generate(prompt, options = {}) {
    prompt = this._applySafetyFilter(prompt);
    if (!prompt) return { error: 'Prompt blocked by safety filter' };

    if (options.enhancePrompt) {
      prompt = await this.enhancePrompt(prompt);
    }

    const providerId = options.provider || 'openai';
    const provider = this.providers[providerId];
    if (!provider) return { error: `Unknown provider: ${providerId}` };

    if (!provider.key && !provider.local) {
      return this._localGenerate(prompt);
    }

    const negativePrompt = options.negativePrompt || NEGATIVE_PROMPTS[options.style] || NEGATIVE_PROMPTS.default;
    const outputFormat = options.format || 'png';
    if (!OUTPUT_FORMATS.includes(outputFormat)) return { error: `Unsupported format: ${outputFormat}` };

    try {
      const axios = require('axios');
      let result;

      if (providerId === 'openai') {
        const body = {
          model: options.model || 'dall-e-3',
          prompt,
          n: options.n || 1,
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          response_format: options.responseFormat || 'url'
        };
        if (options.style) body.style = options.style;
        const res = await axios.post(provider.endpoint, body, {
          headers: { 'Authorization': `Bearer ${provider.key}`, 'Content-Type': 'application/json' },
          timeout: 60000
        });
        result = {
          images: res.data.data.map(d => ({
            url: d.url, revisedPrompt: d.revised_prompt,
            b64_json: d.b64_json
          })),
          provider: providerId
        };
      } else if (providerId === 'stability') {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('prompt', prompt);
        form.append('negative_prompt', negativePrompt);
        form.append('output_format', outputFormat);
        form.append('aspect_ratio', options.aspectRatio || '1:1');
        if (options.cfgScale) form.append('cfg_scale', options.cfgScale);
        if (options.steps) form.append('steps', options.steps);
        if (options.seed) form.append('seed', options.seed);
        const res = await axios.post(provider.endpoint, form, {
          headers: { ...form.getHeaders(), 'Authorization': `Bearer ${provider.key}` },
          responseType: 'arraybuffer', timeout: 60000
        });
        result = {
          images: [{ image: Buffer.from(res.data).toString('base64'), format: outputFormat }],
          provider: providerId
        };
      } else if (providerId === 'replicate') {
        const res = await axios.post(provider.endpoint, {
          input: { prompt, ...options.replicateParams }
        }, {
          headers: { 'Authorization': `Bearer ${provider.key}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
          timeout: 120000
        });
        result = {
          images: [{ url: res.data.output?.[0] || res.data.urls?.get }],
          provider: providerId
        };
      } else {
        return await this._localGenerate(prompt, options);
      }

      this._addHistory({ type: 'generate', prompt, provider: providerId, result });
      registry.emit('image:generated', { provider: providerId, prompt: prompt.substring(0, 50) });
      return result;

    } catch (err) {
      logger.error(`Image gen error (${providerId})`, { error: err.message });
      return this._localGenerate(prompt, options);
    }
  }

  async batchGenerate(prompts, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 2;
    const chunks = [];
    for (let i = 0; i < prompts.length; i += concurrency) {
      chunks.push(prompts.slice(i, i + concurrency));
    }
    for (const chunk of chunks) {
      const batch = chunk.map(p => this.generate(p, options));
      const batchResults = await Promise.allSettled(batch);
      for (const r of batchResults) {
        results.push(r.status === 'fulfilled' ? r.value : { error: r.reason?.message });
      }
    }
    return { batch: results, total: results.length, succeeded: results.filter(r => !r.error).length };
  }

  async edit(imageBuffer, prompt, options = {}) {
    prompt = this._applySafetyFilter(prompt);
    if (!prompt) return { error: 'Prompt blocked by safety filter' };

    const providerId = options.provider || 'openai';
    const provider = this.providers[providerId];
    if (!provider || !provider.supportsEdit) return { error: `Edit not supported by ${providerId}` };

    if (!provider.key && !provider.local) return { error: 'No API key configured' };

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', imageBuffer, { filename: 'edit.png', contentType: 'image/png' });
      form.append('prompt', prompt);
      if (options.mask) form.append('mask', options.mask, { filename: 'mask.png', contentType: 'image/png' });
      if (options.n) form.append('n', options.n);
      if (options.size) form.append('size', options.size);

      const axios = require('axios');
      const res = await axios.post('https://api.openai.com/v1/images/edits', form, {
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${provider.key}` },
        timeout: 60000
      });
      const result = {
        images: res.data.data.map(d => ({ url: d.url })),
        provider: providerId
      };
      this._addHistory({ type: 'edit', prompt, provider: providerId });
      return result;
    } catch (err) {
      return { error: err.message };
    }
  }

  async inpaint(imageBuffer, maskBuffer, prompt, options = {}) {
    return this.edit(imageBuffer, prompt, { ...options, mask: maskBuffer, provider: options.provider || 'openai' });
  }

  async upscale(imageBuffer, scale = 2, options = {}) {
    const providerId = options.provider || 'stability';
    const provider = this.providers[providerId];
    if (!provider || !provider.supportsUpscale) return { error: `Upscale not supported by ${providerId}` };

    if (providerId === 'stability') {
      try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', imageBuffer, { filename: 'input.png', contentType: 'image/png' });
        form.append('width', options.width || 1024);
        const axios = require('axios');
        const res = await axios.post('https://api.stability.ai/v2beta/stable-image/upscale/creative', form, {
          headers: { ...form.getHeaders(), 'Authorization': `Bearer ${provider.key}` },
          responseType: 'arraybuffer', timeout: 120000
        });
        return { image: Buffer.from(res.data).toString('base64'), format: 'png', scale };
      } catch (err) {
        return { error: err.message };
      }
    }

    return { error: 'Upscale requires Stability AI key or local SD upscaler' };
  }

  async variation(imageBuffer, options = {}) {
    const providerId = options.provider || 'openai';
    const provider = this.providers[providerId];
    if (!provider || !provider.supportsVariation) return { error: `Variation not supported by ${providerId}` };

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', imageBuffer, { filename: 'variation.png', contentType: 'image/png' });
      form.append('n', options.n || 1);
      form.append('size', options.size || '1024x1024');

      const axios = require('axios');
      const res = await axios.post('https://api.openai.com/v1/images/variations', form, {
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${provider.key}` },
        timeout: 60000
      });
      return { images: res.data.data.map(d => ({ url: d.url })), provider: providerId };
    } catch (err) {
      return { error: err.message };
    }
  }

  async composite(images, options = {}) {
    if (!images || images.length < 2) return { error: 'Need at least 2 images' };
    const mode = options.mode || 'horizontal';
    try {
      const Jimp = require('jimp');
      const loaded = await Promise.all(images.map(img => Jimp.read(img)));
      const maxW = Math.max(...loaded.map(i => i.bitmap.width));
      const maxH = Math.max(...loaded.map(i => i.bitmap.height));

      let composite;
      if (mode === 'horizontal') {
        const totalW = loaded.reduce((s, i) => s + i.bitmap.width, 0);
        composite = new Jimp(totalW, maxH, 0x00000000);
        let x = 0;
        for (const img of loaded) {
          composite.composite(img, x, Math.round((maxH - img.bitmap.height) / 2));
          x += img.bitmap.width;
        }
      } else if (mode === 'vertical') {
        const totalH = loaded.reduce((s, i) => s + i.bitmap.height, 0);
        composite = new Jimp(maxW, totalH, 0x00000000);
        let y = 0;
        for (const img of loaded) {
          composite.composite(img, Math.round((maxW - img.bitmap.width) / 2), y);
          y += img.bitmap.height;
        }
      } else if (mode === 'overlay') {
        composite = loaded[0].clone();
        for (let i = 1; i < loaded.length; i++) {
          composite.composite(loaded[i], options.offsetX || 0, options.offsetY || 0, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: options.opacity || 0.5
          });
        }
      }

      const format = options.format || 'png';
      const buf = await composite.getBufferAsync(Jimp.MIME_PNG);
      return { image: buf.toString('base64'), format, width: composite.bitmap.width, height: composite.bitmap.height };
    } catch (err) {
      return { error: `Image composite failed: ${err.message}` };
    }
  }

  async removeBackground(imageBuffer, options = {}) {
    try {
      const Jimp = require('jimp');
      const image = await Jimp.read(imageBuffer);
      const threshold = options.threshold || 0;
      // Simple chroma-key based removal (green screen)
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const r = this.bitmap.data[idx];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        if (g > r * 1.4 && g > b * 1.4 && g > threshold) {
          this.bitmap.data[idx + 3] = 0;
        }
      });
      const buf = await image.getBufferAsync(Jimp.MIME_PNG);
      return { image: buf.toString('base64'), format: 'png' };
    } catch (err) {
      return { error: `Background removal failed: ${err.message}` };
    }
  }

  async styleTransfer(imageBuffer, style, options = {}) {
    const prompt = `Apply ${style} style to this image. Keep the original content but transform it to ${style} style.`;
    return this.edit(imageBuffer, prompt, options);
  }

  async enhancePrompt(prompt) {
    try {
      const llm = require('./llm-hub');
      const result = await llm.chat([
        { role: 'system', content: 'You are an expert prompt engineer. Enhance the following image generation prompt. Make it more detailed and descriptive. Return ONLY the enhanced prompt, no explanations.' },
        { role: 'user', content: `Enhance this prompt: "${prompt}"` }
      ], { model: 'gpt-4o-mini', maxTokens: 300 });
      const enhanced = result.trim();
      return enhanced || prompt;
    } catch (e) {
      return prompt;
    }
  }

  async analyze(imageBuffer) {
    const llmHub = require('./llm-hub');
    const base64 = imageBuffer.toString('base64');
    return await llmHub.chat([
      { role: 'user', content: [
        { type: 'text', text: 'Describe this image in detail. What do you see? List objects, colors, text, and composition.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]}
    ], { model: 'gpt-4o' });
  }

  addTextOverlay(imageBuffer, text, options = {}) {
    try {
      const Jimp = require('jimp');
      const JimpFont = require('jimp').loadFont;
      return Jimp.read(imageBuffer).then(async (image) => {
        const font = await (options.font ? JimpFont(options.font) : JimpFont(Jimp.FONT_SANS_32_BLACK));
        const x = options.x || 10;
        const y = options.y || 10;
        const maxWidth = options.maxWidth || image.bitmap.width - 20;
        image.print(font, x, y, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, maxWidth);
        const buf = await image.getBufferAsync(Jimp.MIME_PNG);
        return { image: buf.toString('base64'), format: 'png' };
      });
    } catch (err) {
      return { error: `Text overlay failed: ${err.message}` };
    }
  }

  applyFilter(imageBuffer, filter, options = {}) {
    try {
      const Jimp = require('jimp');
      return Jimp.read(imageBuffer).then(async (image) => {
        switch (filter) {
          case 'grayscale': image.grayscale(); break;
          case 'sepia': image.sepia(); break;
          case 'invert': image.invert(); break;
          case 'blur': image.blur(options.radius || 5); break;
          case 'pixelate': image.pixelate(options.size || 10); break;
          case 'brightness': image.brightness(options.value || 0.3); break;
          case 'contrast': image.contrast(options.value || 0.3); break;
          case 'opacity': image.opacity(options.value || 0.5); break;
          case 'posterize': image.posterize(options.levels || 4); break;
          default: return { error: `Unknown filter: ${filter}` };
        }
        const format = options.format || 'png';
        const mime = format === 'jpeg' ? Jimp.MIME_JPEG : format === 'webp' ? Jimp.MIME_WEBP : Jimp.MIME_PNG;
        const buf = await image.getBufferAsync(mime);
        return { image: buf.toString('base64'), format };
      });
    } catch (err) {
      return { error: `Filter failed: ${err.message}` };
    }
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  clearHistory() {
    this.history = [];
  }

  setSafetyConfig(config) {
    Object.assign(this.safetyFilter, config);
  }

  getNegativePrompts() {
    return Object.entries(NEGATIVE_PROMPTS).map(([k, v]) => ({
      name: k, preview: v.substring(0, 80)
    }));
  }

  _applySafetyFilter(prompt) {
    if (!this.safetyFilter.enabled) return prompt;
    const lower = prompt.toLowerCase();
    for (const term of this.safetyFilter.blockedTerms) {
      if (lower.includes(term)) return null;
    }
    if (prompt.length > this.safetyFilter.maxPromptLength) {
      return prompt.substring(0, this.safetyFilter.maxPromptLength);
    }
    return prompt;
  }

  _addHistory(entry) {
    this.history.push({
      ...entry, timestamp: new Date().toISOString()
    });
    if (this.history.length > 200) this.history.shift();
  }

  _localGenerate(prompt, options = {}) {
    try {
      const axios = require('axios');
      return axios.post('http://localhost:7860/sdapi/v1/txt2img', {
        prompt,
        negative_prompt: options.negativePrompt || NEGATIVE_PROMPTS.default,
        steps: options.steps || 20,
        width: options.width || 512,
        height: options.height || 512,
        cfg_scale: options.cfgScale || 7,
        seed: options.seed || -1,
        sampler_name: options.sampler || 'Euler a'
      }, { timeout: 120000 }).then(res => {
        return { images: [{ image: res.data.images[0], format: 'png' }], provider: 'local' };
      }).catch(e => {
        return { error: `No image provider available. Configure API key or start local SD at :7860. Details: ${e.message}` };
      });
    } catch (e) {
      return { error: e.message };
    }
  }
}

module.exports = new ImageGenEngine();
