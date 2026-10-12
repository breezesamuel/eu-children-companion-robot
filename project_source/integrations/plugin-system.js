const logger = require('../utils/logger');
const registry = require('./registry');
const path = require('path');
const fs = require('fs');

class PluginSystem {
  constructor() {
    this.plugins = registry;
    this.pluginConfigs = new Map();
    this.activated = new Map();
    this.pluginMetrics = new Map();
    this.conflicts = new Map();
    this._loadBuiltinPlugins();
    this._loadPersistedState();
  }

  _loadBuiltinPlugins() {
    const plugins = [
      { id: 'langchain', name: 'LangChain', version: '0.3.0', description: 'AI agent framework with tool calling, memory, middleware', category: 'ai-framework', capabilities: ['llm','memory','tools'], dependencies: [] },
      { id: 'langgraph', name: 'LangGraph', version: '0.2.0', description: 'Graph-driven workflow engine for agent orchestration', category: 'ai-framework', capabilities: ['workflow','orchestration'], dependencies: ['langchain'] },
      { id: 'autogpt', name: 'AutoGPT', version: '1.0.0', description: 'Autonomous AI agent for task planning and execution', category: 'ai-agent', capabilities: ['planning','execution'], dependencies: ['langchain'] },
      { id: 'agent-reach', name: 'AgentReach', version: '1.0.0', description: 'Multi-agent communication and coordination', category: 'ai-agent', capabilities: ['multi-agent','communication'], dependencies: [] },
      { id: 'open-swarm', name: 'OpenSwarm', version: '1.0.0', description: 'Swarm intelligence multi-agent system', category: 'ai-agent', capabilities: ['swarm','multi-agent'], dependencies: ['agent-reach'] },
      { id: 'page-agent', name: 'PageAgent', version: '1.0.0', description: 'Web page AI agent for automation', category: 'browser', capabilities: ['browser','automation'], dependencies: [] },
      { id: 'scrapegraph', name: 'ScrapeGraphAI', version: '1.0.0', description: 'AI-powered web scraping pipeline', category: 'scraping', capabilities: ['scraping','ai'], dependencies: [] },
      { id: 'browser-harness', name: 'Browser Harness', version: '2.0.0', description: 'Browser automation and testing', category: 'browser', capabilities: ['browser','testing'], dependencies: ['page-agent'] },
      { id: 'playwright', name: 'Playwright', version: '1.60.0', description: 'Cross-browser automation framework', category: 'browser', capabilities: ['browser','automation','testing'], dependencies: [] },
      { id: 'selenium', name: 'Selenium', version: '4.0.0', description: 'WebDriver browser automation', category: 'browser', capabilities: ['browser','automation'], dependencies: [] },
      { id: 'n8n', name: 'n8n', version: '1.0.0', description: 'Workflow automation with 400+ integrations', category: 'workflow', capabilities: ['workflow','automation','integration'], dependencies: [] },
      { id: 'nodered', name: 'Node-RED', version: '4.0.0', description: 'Flow-based visual programming', category: 'workflow', capabilities: ['workflow','visual-programming'], dependencies: [] },
      { id: 'apijson', name: 'APIJSON', version: '1.0.0', description: 'Auto-generation REST API framework', category: 'api', capabilities: ['api','rest'], dependencies: [] },
      { id: 'apilayer', name: 'API Layer', version: '1.0.0', description: 'REST API marketplace and aggregator', category: 'api', capabilities: ['api','marketplace'], dependencies: [] },
      { id: 'fastapi', name: 'FastAPI', version: '0.115.0', description: 'High-performance Python API framework', category: 'api', capabilities: ['api','python'], dependencies: [] },
      { id: 'deepseek', name: 'DeepSeek', version: '1.0.0', description: 'DeepSeek LLM integration', category: 'llm', capabilities: ['llm','chat'], dependencies: [] },
      { id: 'mistral', name: 'Mistral AI', version: '1.0.0', description: 'Mistral large language models', category: 'llm', capabilities: ['llm','chat'], dependencies: [] },
      { id: 'funasr', name: 'FunASR', version: '1.0.0', description: 'Speech recognition by Alibaba DAMO', category: 'voice', capabilities: ['asr','speech'], dependencies: [] },
      { id: 'sherpa-onnx', name: 'SherpaONNX', version: '1.10.0', description: 'ONNX-based speech processing', category: 'voice', capabilities: ['asr','tts','vad'], dependencies: [] },
      { id: 'indextts', name: 'IndexTTS', version: '1.0.0', description: 'Zero-shot text-to-speech', category: 'voice', capabilities: ['tts','voice-cloning'], dependencies: [] },
      { id: 'moss-tts', name: 'MossTTS', version: '1.0.0', description: 'Chinese speech synthesis', category: 'voice', capabilities: ['tts','chinese'], dependencies: [] },
      { id: 'capcut-mate', name: 'CapCut Mate', version: '1.0.0', description: 'Video editing automation', category: 'media', capabilities: ['video','editing'], dependencies: [] },
      { id: 'lossless-cut', name: 'LosslessCut', version: '3.0.0', description: 'Lossless video cutting', category: 'media', capabilities: ['video','cutting'], dependencies: [] },
      { id: 'remotion', name: 'Remotion', version: '4.0.0', description: 'Programmatic video creation with React', category: 'media', capabilities: ['video','react','rendering'], dependencies: [] },
      { id: 'hypeframes', name: 'HyperFrames', version: '1.0.0', description: 'AI video frame interpolation', category: 'media', capabilities: ['video','interpolation','ai'], dependencies: [] },
      { id: 'pixelle', name: 'Pixelle', version: '1.0.0', description: 'AI image generation and editing', category: 'image', capabilities: ['image','generation','editing'], dependencies: [] },
      { id: 'beads', name: 'Beads', version: '1.0.0', description: 'AI image-to-prompt tool', category: 'image', capabilities: ['image','prompt'], dependencies: [] },
      { id: 'better-design', name: 'Better Design', version: '1.0.0', description: 'AI-powered design suggestion engine', category: 'design', capabilities: ['design','ai'], dependencies: [] },
      { id: 'figma', name: 'Figma', version: '1.0.0', description: 'Figma design API integration', category: 'design', capabilities: ['design','api','collaboration'], dependencies: [] },
      { id: 'freemocap', name: 'FreeMoCap', version: '1.0.0', description: 'Free motion capture from video', category: 'motion', capabilities: ['motion-capture','pose'], dependencies: [] },
      { id: 'wifi-densepose', name: 'WiFi DensePose', version: '1.0.0', description: 'WiFi-based pose estimation', category: 'motion', capabilities: ['pose','wifi-sensing'], dependencies: [] },
      { id: 'chartdb', name: 'ChartDB', version: '1.0.0', description: 'Database schema visualization', category: 'data', capabilities: ['database','visualization'], dependencies: [] },
      { id: 'redbox', name: 'RedBox', version: '1.0.0', description: 'Cloud file management and sharing', category: 'storage', capabilities: ['storage','cloud'], dependencies: [] },
      { id: 'supermemory', name: 'SuperMemory', version: '1.0.0', description: 'AI-powered memory and knowledge graph', category: 'memory', capabilities: ['memory','knowledge-graph','ai'], dependencies: [] },
      { id: 'tabpfn', name: 'TabPFN', version: '1.0.0', description: 'Tabular data prediction foundation model', category: 'ml', capabilities: ['ml','tabular','prediction'], dependencies: [] },
      { id: 'openlovable', name: 'OpenLovable', version: '1.0.0', description: 'No-code app builder', category: 'nocode', capabilities: ['nocode','builder'], dependencies: [] },
      { id: 'cc-switch', name: 'CC-Switch', version: '1.0.0', description: 'Creative coding framework', category: 'creative', capabilities: ['creative','coding'], dependencies: [] },
      { id: 'symphony', name: 'SYMphony', version: '1.0.0', description: 'Multi-modal AI orchestration', category: 'ai-orchestration', capabilities: ['orchestration','multi-modal','ai'], dependencies: ['langchain'] },
      { id: 'dothething', name: 'DoTheThing', version: '1.0.0', description: 'Task automation platform', category: 'automation', capabilities: ['automation','task'], dependencies: [] },
      { id: 'baklib', name: 'Baklib', version: '1.0.0', description: 'Knowledge base management', category: 'content', capabilities: ['knowledge','content'], dependencies: [] },
      { id: 'juggle', name: 'Juggle', version: '1.0.0', description: 'Multi-tasking orchestration', category: 'automation', capabilities: ['orchestration','multitasking'], dependencies: [] },
      { id: 'bootloader', name: 'BootLoader', version: '1.0.0', description: 'System boot and deployment tool', category: 'devops', capabilities: ['deployment','system'], dependencies: [] },
      { id: 'scada', name: 'SCADA System', version: '1.0.0', description: 'Industrial control system monitoring', category: 'iot', capabilities: ['iot','monitoring','control'], dependencies: [] },
      { id: 'awareness', name: 'Awareness', version: '1.0.0', description: 'System monitoring and alerting', category: 'monitoring', capabilities: ['monitoring','alerting'], dependencies: [] },
      { id: 'cli-anything', name: 'CLI Anything', version: '1.0.0', description: 'Natural language to CLI commands', category: 'cli', capabilities: ['cli','nlp'], dependencies: [] },
      { id: 'oh-my-mermaid', name: 'Oh My Mermaid', version: '1.0.0', description: 'AI diagram generation with Mermaid', category: 'visualization', capabilities: ['visualization','diagram'], dependencies: [] },
      { id: 'openclaw', name: 'OpenClaw', version: '1.0.0', description: 'Multi-modal AI assistant framework', category: 'ai-framework', capabilities: ['ai','multi-modal','assistant'], dependencies: [] },
      { id: 'tunnelto', name: 'TunnelTo', version: '1.0.0', description: 'Secure tunnel for local servers', category: 'network', capabilities: ['network','tunnel'], dependencies: [] },
      { id: 'obscura', name: 'Obscura', version: '1.0.0', description: 'Privacy-focused image processing', category: 'privacy', capabilities: ['privacy','image'], dependencies: [] },
    ];

    for (const p of plugins) {
      registry.registerPlugin(p.id, p, { name: p.name, category: p.category, capabilities: p.capabilities, dependencies: p.dependencies, version: p.version });
    }

    logger.info(`Plugin system loaded: ${plugins.length} plugins registered`);
  }

  _loadPersistedState() {
    const statePath = this._statePath();
    try {
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        if (state.activated) {
          for (const [id, val] of Object.entries(state.activated)) {
            this.activated.set(id, val);
          }
        }
        if (state.configs) {
          for (const [id, cfg] of Object.entries(state.configs)) {
            this.pluginConfigs.set(id, cfg);
          }
        }
        if (state.metrics) {
          for (const [id, m] of Object.entries(state.metrics)) {
            this.pluginMetrics.set(id, m);
          }
        }
        logger.info(`Persisted plugin state loaded (${this.activated.size} activated)`);
      }
    } catch (e) {
      logger.warn('Could not load persisted plugin state', { error: e.message });
    }
  }

  _saveState() {
    const statePath = this._statePath();
    try {
      const state = {
        activated: Object.fromEntries(this.activated),
        configs: Object.fromEntries(this.pluginConfigs),
        metrics: Object.fromEntries(this.pluginMetrics)
      };
      const dir = path.dirname(statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      logger.warn('Could not save plugin state', { error: e.message });
    }
  }

  _statePath() {
    return path.join(process.env.PLUGIN_STATE_DIR || path.join(__dirname, '..', 'data', 'plugins'), 'plugin-state.json');
  }

  _pluginDataDir(pluginId) {
    const base = process.env.PLUGIN_DATA_DIR || path.join(__dirname, '..', 'data', 'plugins');
    const dir = path.join(base, pluginId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async load(pluginId) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    if (plugin.impl && typeof plugin.impl.onLoad === 'function') {
      try {
        await plugin.impl.onLoad({ dataDir: this._pluginDataDir(pluginId), config: this.getConfig(pluginId) });
        logger.info(`Plugin loaded: ${pluginId}`);
      } catch (e) {
        logger.error(`Plugin load error: ${pluginId}`, { error: e.message });
        throw e;
      }
    } else {
      logger.info(`Plugin loaded (no onLoad hook): ${pluginId}`);
    }
    this._initMetrics(pluginId);
    return true;
  }

  async unload(pluginId) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    if (plugin.impl && typeof plugin.impl.onUnload === 'function') {
      try { await plugin.impl.onUnload(); } catch (e) { logger.error(`Plugin unload error: ${pluginId}`, { error: e.message }); }
    }
    this.activated.delete(pluginId);
    logger.info(`Plugin unloaded: ${pluginId}`);
  }

  async enable(pluginId) {
    this._checkDependencies(pluginId);
    this._checkConflicts(pluginId);
    try {
      registry.enablePlugin(pluginId);
      this.activated.set(pluginId, { enabledAt: new Date().toISOString() });
      const plugin = registry.getPlugin(pluginId);
      if (plugin.impl && typeof plugin.impl.onEnable === 'function') {
        await plugin.impl.onEnable({ config: this.getConfig(pluginId) });
      }
      this._saveState();
      logger.info(`Plugin enabled: ${pluginId}`);
      return true;
    } catch (e) {
      logger.error(`Plugin enable failed: ${pluginId}`, { error: e.message });
      throw e;
    }
  }

  async disable(pluginId) {
    try {
      registry.disablePlugin(pluginId);
      this.activated.delete(pluginId);
      const plugin = registry.getPlugin(pluginId);
      if (plugin.impl && typeof plugin.impl.onDisable === 'function') {
        await plugin.impl.onDisable();
      }
      this._saveState();
      logger.info(`Plugin disabled: ${pluginId}`);
      return true;
    } catch (e) {
      logger.error(`Plugin disable failed: ${pluginId}`, { error: e.message });
      throw e;
    }
  }

  isEnabled(pluginId) {
    return this.activated.has(pluginId);
  }

  _checkDependencies(pluginId) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) return;
    const deps = plugin.dependencies || [];
    for (const dep of deps) {
      if (!this.activated.has(dep)) {
        throw new Error(`Dependency not enabled: ${dep} (required by ${pluginId})`);
      }
    }
  }

  _checkConflicts(pluginId) {
    const plugin = registry.getPlugin(pluginId);
    if (!plugin) return;
    const capabilities = plugin.capabilities || [];
    for (const [activeId, _] of this.activated) {
      if (activeId === pluginId) continue;
      const activePlugin = registry.getPlugin(activeId);
      if (!activePlugin) continue;
      const activeCaps = activePlugin.capabilities || [];
      const shared = capabilities.filter(c => activeCaps.includes(c));
      if (shared.length > 0) {
        if (!this.conflicts.has(pluginId)) this.conflicts.set(pluginId, []);
        this.conflicts.get(pluginId).push({ with: activeId, sharedCapabilities: shared });
        logger.warn(`Plugin ${pluginId} may conflict with ${activeId} on: ${shared.join(', ')}`);
      }
    }
  }

  getConflicts(pluginId) {
    return this.conflicts.get(pluginId) || [];
  }

  getAllConflicts() {
    return Array.from(this.conflicts.entries()).map(([id, conflicts]) => ({ pluginId: id, conflicts }));
  }

  setConfig(pluginId, config) {
    this.pluginConfigs.set(pluginId, { ...config, updatedAt: new Date().toISOString() });
    this._saveState();
  }

  getConfig(pluginId) {
    return this.pluginConfigs.get(pluginId) || {};
  }

  updatePlugin(pluginId, newMeta) {
    const existing = registry.getPlugin(pluginId);
    if (!existing) throw new Error(`Plugin not found: ${pluginId}`);
    Object.assign(existing, newMeta, { updatedAt: new Date().toISOString() });
    logger.info(`Plugin updated: ${pluginId}`, { version: newMeta.version });
    return existing;
  }

  async hotReload(pluginId) {
    logger.info(`Hot-reloading plugin: ${pluginId}`);
    await this.unload(pluginId);
    const plugin = registry.getPlugin(pluginId);
    if (plugin && plugin.impl && typeof plugin.impl.onLoad === 'function') {
      await plugin.impl.onLoad({ dataDir: this._pluginDataDir(pluginId), config: this.getConfig(pluginId) });
    }
    if (this.activated.has(pluginId)) {
      if (plugin && plugin.impl && typeof plugin.impl.onEnable === 'function') {
        await plugin.impl.onEnable({ config: this.getConfig(pluginId) });
      }
    }
    logger.info(`Plugin hot-reloaded: ${pluginId}`);
    return true;
  }

  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const [id, plugin] of registry.plugins) {
      let score = 0;
      if (id.includes(q)) score += 3;
      if (plugin.name && plugin.name.toLowerCase().includes(q)) score += 2;
      if (plugin.description && plugin.description.toLowerCase().includes(q)) score += 1;
      const caps = plugin.capabilities || [];
      if (caps.some(c => c.includes(q))) score += 1.5;
      if (score > 0) {
        results.push({ id, name: plugin.name, description: plugin.description, category: plugin.category, score });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  getByCategory(category) {
    const parts = category.split('/');
    return Array.from(registry.plugins.values())
      .filter(p => {
        if (p.category === category) return true;
        if (p.subCategory && `${p.category}/${p.subCategory}` === category) return true;
        return false;
      })
      .map(p => ({ id: p.id, name: p.name, description: p.description, category: p.category, subCategory: p.subCategory }));
  }

  listCategories() {
    const cats = {};
    for (const p of registry.plugins.values()) {
      const cat = p.category || 'uncategorized';
      if (!cats[cat]) cats[cat] = { name: cat, count: 0, subCategories: {} };
      cats[cat].count++;
      if (p.subCategory) {
        if (!cats[cat].subCategories[p.subCategory]) cats[cat].subCategories[p.subCategory] = 0;
        cats[cat].subCategories[p.subCategory]++;
      }
    }
    return Object.values(cats);
  }

  getMetrics(pluginId) {
    if (pluginId) return this.pluginMetrics.get(pluginId) || this._emptyMetrics();
    const all = {};
    for (const [id] of registry.plugins) {
      all[id] = this.pluginMetrics.get(id) || this._emptyMetrics();
    }
    return all;
  }

  recordUsage(pluginId) {
    const m = this._initMetrics(pluginId);
    m.usageCount++;
    m.lastUsed = new Date().toISOString();
    this._saveState();
  }

  recordResponseTime(pluginId, timeMs) {
    const m = this._initMetrics(pluginId);
    m.totalResponseTime += timeMs;
    m.responseCount++;
    m.avgResponseTime = Math.round(m.totalResponseTime / m.responseCount * 100) / 100;
  }

  _initMetrics(pluginId) {
    if (!this.pluginMetrics.has(pluginId)) {
      this.pluginMetrics.set(pluginId, {
        usageCount: 0, lastUsed: null,
        totalResponseTime: 0, responseCount: 0, avgResponseTime: 0,
        loadCount: 0, errorCount: 0
      });
    }
    return this.pluginMetrics.get(pluginId);
  }

  _emptyMetrics() {
    return { usageCount: 0, lastUsed: null, totalResponseTime: 0, responseCount: 0, avgResponseTime: 0, loadCount: 0, errorCount: 0 };
  }
}

module.exports = new PluginSystem();
