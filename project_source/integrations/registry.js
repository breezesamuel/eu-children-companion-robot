const logger = require('../utils/logger');

class PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.integrations = new Map();
    this.tools = new Map();
    this.hooks = new Map();
    this.metrics = { registrations: 0, calls: 0, errors: 0, byType: {} };
    this.changeLog = [];
    this.pluginDeps = new Map();
    this.pluginBlacklist = new Set();
    this.pluginAllowlist = new Set();
    this.toolHistory = [];
    this._loadConfig();
  }

  _loadConfig() {
    try {
      const fs = require('fs');
      const configPath = process.env.REGISTRY_CONFIG_PATH;
      if (configPath && fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.blacklist) config.blacklist.forEach(id => this.pluginBlacklist.add(id));
        if (config.allowlist) config.allowlist.forEach(id => this.pluginAllowlist.add(id));
        logger.info(`Registry config loaded from ${configPath}`);
      }
    } catch (e) {
      logger.warn('Could not load registry config', { error: e.message });
    }
  }

  registerPlugin(id, meta, impl) {
    if (this.pluginBlacklist.has(id)) {
      logger.warn(`Plugin ${id} is blacklisted, skipping`);
      return;
    }
    if (this.pluginAllowlist.size > 0 && !this.pluginAllowlist.has(id)) {
      logger.warn(`Plugin ${id} not in allowlist, skipping`);
      return;
    }
    if (this.plugins.has(id)) {
      logger.warn(`Plugin ${id} already registered, skipping`);
      return;
    }
    const entry = {
      ...meta, id, impl, enabled: true,
      loadedAt: new Date().toISOString(),
      lastUsed: null, usageCount: 0,
      isolationLevel: meta.isolationLevel || 'sandbox',
      capabilities: meta.capabilities || [],
      dependencies: meta.dependencies || []
    };
    this.plugins.set(id, entry);
    if (entry.dependencies.length > 0) {
      this.pluginDeps.set(id, entry.dependencies);
    }
    this.metrics.registrations++;
    this._addChangeLog('register', 'plugin', id);
    logger.info(`Plugin registered: ${meta.name || id}`);
  }

  unregisterPlugin(id) {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin not found: ${id}`);
    if (plugin.impl && typeof plugin.impl.onUnload === 'function') {
      try { plugin.impl.onUnload(); } catch (e) { logger.error(`Plugin unload error: ${id}`, { error: e.message }); }
    }
    this.plugins.delete(id);
    this.pluginDeps.delete(id);
    this._addChangeLog('unregister', 'plugin', id);
    logger.info(`Plugin unregistered: ${id}`);
  }

  enablePlugin(id) {
    const p = this.plugins.get(id);
    if (!p) throw new Error(`Plugin not found: ${id}`);
    if (p.dependencies && p.dependencies.length > 0) {
      for (const dep of p.dependencies) {
        const depPlugin = this.plugins.get(dep);
        if (!depPlugin || !depPlugin.enabled) {
          throw new Error(`Dependency ${dep} not available for plugin ${id}`);
        }
      }
    }
    p.enabled = true;
    if (p.impl && typeof p.impl.onEnable === 'function') {
      try { p.impl.onEnable(); } catch (e) { logger.error(`Plugin onEnable error: ${id}`, { error: e.message }); }
    }
    this._addChangeLog('enable', 'plugin', id);
  }

  disablePlugin(id) {
    const p = this.plugins.get(id);
    if (!p) throw new Error(`Plugin not found: ${id}`);
    const dependents = this._findDependents(id);
    if (dependents.length > 0) {
      throw new Error(`Cannot disable ${id}: depended on by ${dependents.join(', ')}`);
    }
    if (p.impl && typeof p.impl.onDisable === 'function') {
      try { p.impl.onDisable(); } catch (e) { logger.error(`Plugin onDisable error: ${id}`, { error: e.message }); }
    }
    p.enabled = false;
    this._addChangeLog('disable', 'plugin', id);
  }

  _findDependents(pluginId) {
    const deps = [];
    for (const [id, depList] of this.pluginDeps) {
      if (depList.includes(pluginId)) deps.push(id);
    }
    return deps;
  }

  bulkEnable(ids) {
    const results = [];
    for (const id of ids) {
      try { this.enablePlugin(id); results.push({ id, success: true }); }
      catch (e) { results.push({ id, success: false, error: e.message }); }
    }
    return results;
  }

  bulkDisable(ids) {
    const results = [];
    for (const id of ids) {
      try { this.disablePlugin(id); results.push({ id, success: true }); }
      catch (e) { results.push({ id, success: false, error: e.message }); }
    }
    return results;
  }

  getDependencyGraph() {
    const graph = {};
    for (const [id, p] of this.plugins) {
      graph[id] = {
        name: p.name,
        dependencies: p.dependencies || [],
        dependents: this._findDependents(id),
        enabled: p.enabled
      };
    }
    return graph;
  }

  registerIntegration(id, meta, client) {
    const entry = {
      ...meta, id, client,
      enabled: !!meta.apiKey || !meta.needsKey,
      status: meta.needsKey && !meta.apiKey ? 'missing_key' : 'ready',
      category: meta.category || 'uncategorized',
      priority: meta.priority || 0,
      registeredAt: new Date().toISOString(),
      lastHealthCheck: null, healthOk: true,
      callCount: 0, errorCount: 0
    };
    this.integrations.set(id, entry);
    this.metrics.registrations++;
    this.metrics.byType[meta.type] = (this.metrics.byType[meta.type] || 0) + 1;
    this._addChangeLog('register', 'integration', id);
  }

  unregisterIntegration(id) {
    if (this.integrations.delete(id)) {
      this._addChangeLog('unregister', 'integration', id);
    }
  }

  registerTool(id, meta, handler) {
    this.tools.set(id, {
      ...meta, id, handler,
      enabled: true,
      registeredAt: new Date().toISOString(),
      callCount: 0, errorCount: 0, totalTime: 0
    });
  }

  unregisterTool(id) {
    if (this.tools.delete(id)) {
      this._addChangeLog('unregister', 'tool', id);
    }
  }

  getPlugin(id) { return this.plugins.get(id); }

  getIntegration(id) { return this.integrations.get(id); }

  getTool(id) { return this.tools.get(id); }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id, name: p.name, version: p.version,
      enabled: p.enabled, category: p.category,
      usageCount: p.usageCount, lastUsed: p.lastUsed,
      isolationLevel: p.isolationLevel,
      dependencies: p.dependencies
    }));
  }

  listIntegrations(category) {
    const all = Array.from(this.integrations.values());
    const filtered = category ? all.filter(i => i.category === category) : all;
    return filtered.map(i => ({
      id: i.id, name: i.name, type: i.type,
      enabled: i.enabled, status: i.status,
      category: i.category, priority: i.priority,
      callCount: i.callCount, errorCount: i.errorCount
    }));
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      id: t.id, name: t.name, description: t.description,
      enabled: t.enabled, callCount: t.callCount
    }));
  }

  getCategories(hierarchy) {
    const cats = {};
    for (const i of this.integrations.values()) {
      const cat = i.category || 'uncategorized';
      if (hierarchy && cat.includes('/')) {
        const parts = cat.split('/');
        let current = cats;
        for (const p of parts) {
          if (!current[p]) current[p] = {};
          current = current[p];
        }
        current._items = current._items || [];
        current._items.push(i.id);
      } else {
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(i.id);
      }
    }
    return cats;
  }

  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const [id, p] of this.plugins) {
      const score = this._matchScore(q, id, p.name, p.description);
      if (score > 0) results.push({ type: 'plugin', id, name: p.name, score, category: p.category });
    }
    for (const [id, i] of this.integrations) {
      const score = this._matchScore(q, id, i.name, i.description);
      if (score > 0) results.push({ type: 'integration', id, name: i.name, score, category: i.category });
    }
    for (const [id, t] of this.tools) {
      const score = this._matchScore(q, id, t.name, t.description);
      if (score > 0) results.push({ type: 'tool', id, name: t.name, score });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  _matchScore(q, id, name, description) {
    let score = 0;
    if (id && id.includes(q)) score += 3;
    if (name && name.toLowerCase().includes(q)) score += 2;
    if (description && description.toLowerCase().includes(q)) score += 1;
    return score;
  }

  validateToolParams(toolId, params) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool not found: ${toolId}`);
    if (tool.paramsSchema) {
      const errors = [];
      for (const [key, rules] of Object.entries(tool.paramsSchema)) {
        if (rules.required && (params[key] === undefined || params[key] === null)) {
          errors.push(`Missing required param: ${key}`);
        }
        if (params[key] !== undefined && rules.type) {
          const actualType = typeof params[key];
          if (actualType !== rules.type) {
            errors.push(`Param ${key} expected ${rules.type}, got ${actualType}`);
          }
        }
      }
      return { valid: errors.length === 0, errors };
    }
    return { valid: true, errors: [] };
  }

  async callTool(toolId, params) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool not found: ${toolId}`);
    if (!tool.enabled) throw new Error(`Tool disabled: ${toolId}`);
    const validation = this.validateToolParams(toolId, params);
    if (!validation.valid) throw new Error(`Param validation failed: ${validation.errors.join(', ')}`);

    const start = Date.now();
    this.metrics.calls++;
    tool.callCount++;
    this.toolHistory.push({ toolId, params, timestamp: new Date().toISOString() });
    if (this.toolHistory.length > 1000) this.toolHistory.shift();

    try {
      const result = await tool.handler(params);
      tool.totalTime += Date.now() - start;
      return result;
    } catch (e) {
      tool.errorCount++;
      this.metrics.errors++;
      this._addChangeLog('error', 'tool', toolId, e.message);
      throw e;
    }
  }

  on(event, handler) {
    if (!this.hooks.has(event)) this.hooks.set(event, []);
    this.hooks.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.hooks.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  emit(event, data) {
    const handlers = this.hooks.get(event) || [];
    for (const h of handlers) {
      try { h(data); } catch (e) { logger.error(`Hook error: ${event}`, { error: e.message }); }
    }
  }

  async runHealthCheck(integrationId) {
    const integration = this.integrations.get(integrationId);
    if (!integration) throw new Error(`Integration not found: ${integrationId}`);
    if (!integration.client || typeof integration.client.healthCheck !== 'function') {
      integration.healthOk = true;
      integration.lastHealthCheck = new Date().toISOString();
      return { id: integrationId, ok: true, skipped: true };
    }
    try {
      const result = await integration.client.healthCheck();
      integration.healthOk = result.ok !== false;
      integration.lastHealthCheck = new Date().toISOString();
      return { id: integrationId, ok: integration.healthOk, data: result };
    } catch (e) {
      integration.healthOk = false;
      integration.lastHealthCheck = new Date().toISOString();
      integration.errorCount++;
      return { id: integrationId, ok: false, error: e.message };
    }
  }

  async runAllHealthChecks() {
    const results = [];
    for (const [id] of this.integrations) {
      results.push(await this.runHealthCheck(id));
    }
    return results;
  }

  snapshot() {
    return {
      timestamp: new Date().toISOString(),
      plugins: Array.from(this.plugins.entries()).map(([id, p]) => ({
        id, name: p.name, version: p.version, enabled: p.enabled,
        category: p.category, isolationLevel: p.isolationLevel,
        capabilities: p.capabilities, dependencies: p.dependencies
      })),
      integrations: Array.from(this.integrations.entries()).map(([id, i]) => ({
        id, name: i.name, type: i.type, enabled: i.enabled,
        status: i.status, category: i.category, priority: i.priority
      })),
      tools: Array.from(this.tools.entries()).map(([id, t]) => ({
        id, name: t.name, description: t.description, enabled: t.enabled
      })),
      metrics: { ...this.metrics },
      blacklist: Array.from(this.pluginBlacklist),
      allowlist: Array.from(this.pluginAllowlist)
    };
  }

  restore(snapshot) {
    if (!snapshot || !snapshot.plugins) throw new Error('Invalid snapshot');
    this.plugins.clear();
    this.integrations.clear();
    this.tools.clear();
    this.pluginDeps.clear();
    for (const p of snapshot.plugins) {
      this.plugins.set(p.id, {
        ...p, impl: null, loadedAt: new Date().toISOString(),
        lastUsed: null, usageCount: 0
      });
      if (p.dependencies && p.dependencies.length > 0) {
        this.pluginDeps.set(p.id, p.dependencies);
      }
    }
    for (const i of snapshot.integrations) {
      this.integrations.set(i.id, {
        ...i, client: null, registeredAt: new Date().toISOString(),
        callCount: 0, errorCount: 0
      });
    }
    for (const t of snapshot.tools) {
      this.tools.set(t.id, {
        ...t, handler: null, registeredAt: new Date().toISOString(),
        callCount: 0, errorCount: 0, totalTime: 0
      });
    }
    if (snapshot.blacklist) snapshot.blacklist.forEach(id => this.pluginBlacklist.add(id));
    if (snapshot.allowlist) snapshot.allowlist.forEach(id => this.pluginAllowlist.add(id));
    logger.info('Registry restored from snapshot');
    return true;
  }

  exportConfig() {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  importConfig(jsonStr) {
    try {
      const config = JSON.parse(jsonStr);
      this.restore(config);
      return true;
    } catch (e) {
      logger.error('Config import failed', { error: e.message });
      return false;
    }
  }

  addToBlacklist(id) {
    this.pluginBlacklist.add(id);
    if (this.plugins.has(id)) {
      this.disablePlugin(id);
    }
    this._addChangeLog('blacklist', 'plugin', id);
  }

  removeFromBlacklist(id) {
    this.pluginBlacklist.delete(id);
    this._addChangeLog('unblacklist', 'plugin', id);
  }

  addToAllowlist(id) {
    this.pluginAllowlist.add(id);
    this._addChangeLog('allowlist', 'plugin', id);
  }

  removeFromAllowlist(id) {
    this.pluginAllowlist.delete(id);
    this._addChangeLog('unallowlist', 'plugin', id);
  }

  getMetrics() {
    return {
      ...this.metrics,
      byType: { ...this.metrics.byType },
      toolHistory: this.toolHistory.slice(-50),
      changeLogCount: this.changeLog.length
    };
  }

  getChangeLog(limit = 100) {
    return this.changeLog.slice(-limit);
  }

  _addChangeLog(action, type, id, detail) {
    this.changeLog.push({
      action, type, id, detail,
      timestamp: new Date().toISOString()
    });
    if (this.changeLog.length > 10000) this.changeLog.splice(0, 1000);
  }

  getStatus() {
    const plugins = this.listPlugins();
    const integrations = this.listIntegrations();
    const tools = this.listTools();
    return {
      totalPlugins: plugins.length,
      totalIntegrations: integrations.length,
      totalTools: tools.length,
      enabledPlugins: plugins.filter(p => p.enabled).length,
      activeIntegrations: integrations.filter(i => i.enabled && i.status === 'ready').length,
      totalCalls: this.metrics.calls,
      totalErrors: this.metrics.errors,
      plugins, integrations, tools
    };
  }
}

const registry = new PluginRegistry();
module.exports = registry;
