const http = require('http');
const https = require('https');
const logger = require('../utils/logger');
const registry = require('./registry');

const KNOWN_SERVERS = {
  'filesystem': { command: 'npx', args: ['-y','@modelcontextprotocol/server-filesystem'], description: 'File system operations', capabilities: ['read','write','list'] },
  'git': { command: 'npx', args: ['-y','@modelcontextprotocol/server-git'], description: 'Git repository management', capabilities: ['git','status','log','diff'] },
  'github': { command: 'npx', args: ['-y','@modelcontextprotocol/server-github'], description: 'GitHub API integration', capabilities: ['github','issues','prs'] },
  'shell': { command: 'npx', args: ['-y','@modelcontextprotocol/server-shell'], description: 'Shell command execution', capabilities: ['shell','exec'] },
  'docker': { command: 'npx', args: ['-y','@modelcontextprotocol/server-docker'], description: 'Docker container management', capabilities: ['docker','containers'] },
  'sqlite': { command: 'npx', args: ['-y','@modelcontextprotocol/server-sqlite'], description: 'SQLite database access', capabilities: ['sql','database'] },
  'postgres': { command: 'npx', args: ['-y','@modelcontextprotocol/server-postgres'], description: 'PostgreSQL database access', capabilities: ['sql','database','postgres'] },
  'mysql': { command: 'npx', args: ['-y','@modelcontextprotocol/server-mysql'], description: 'MySQL database access', capabilities: ['sql','database','mysql'] },
  'redis': { command: 'npx', args: ['-y','@modelcontextprotocol/server-redis'], description: 'Redis cache operations', capabilities: ['cache','redis'] },
  'memory': { command: 'npx', args: ['-y','@modelcontextprotocol/server-memory'], description: 'Knowledge graph memory', capabilities: ['memory','knowledge-graph'] },
  'playwright': { command: 'npx', args: ['-y','@modelcontextprotocol/server-playwright'], description: 'Browser automation', capabilities: ['browser','automation'] },
  'puppeteer': { command: 'npx', args: ['-y','@modelcontextprotocol/server-puppeteer'], description: 'Headless browser', capabilities: ['browser','headless'] },
  'fetch': { command: 'npx', args: ['-y','@modelcontextprotocol/server-fetch'], description: 'Web fetching', capabilities: ['fetch','http'] },
  'firecrawl': { command: 'npx', args: ['-y','@modelcontextprotocol/server-firecrawl'], description: 'Web crawling', capabilities: ['crawl','scrape'] },
  'notion': { command: 'npx', args: ['-y','@modelcontextprotocol/server-notion'], description: 'Notion API', capabilities: ['notion','notes'] },
  'slack': { command: 'npx', args: ['-y','@modelcontextprotocol/server-slack'], description: 'Slack messaging', capabilities: ['slack','messaging'] },
  'discord': { command: 'npx', args: ['-y','@modelcontextprotocol/server-discord'], description: 'Discord bot', capabilities: ['discord','messaging'] },
  'weather': { command: 'npx', args: ['-y','@modelcontextprotocol/server-weather'], description: 'Weather forecast', capabilities: ['weather','forecast'] },
  'time': { command: 'npx', args: ['-y','@modelcontextprotocol/server-time'], description: 'Time and date', capabilities: ['time','date'] },
  'search': { command: 'npx', args: ['-y','@modelcontextprotocol/server-search'], description: 'Web search', capabilities: ['search','web'] },
  'youtube': { command: 'npx', args: ['-y','@modelcontextprotocol/server-youtube'], description: 'YouTube data', capabilities: ['youtube','video'] },
  'pdf-reader': { command: 'npx', args: ['-y','@modelcontextprotocol/server-pdf'], description: 'PDF reading', capabilities: ['pdf','document'] },
  'excel': { command: 'npx', args: ['-y','@modelcontextprotocol/server-excel'], description: 'Excel spreadsheets', capabilities: ['excel','spreadsheet'] },
  'word': { command: 'npx', args: ['-y','@modelcontextprotocol/server-word'], description: 'Word documents', capabilities: ['word','document'] },
  'obsidian': { command: 'npx', args: ['-y','@modelcontextprotocol/server-obsidian'], description: 'Obsidian vault', capabilities: ['obsidian','notes'] },
  'code-runner': { command: 'npx', args: ['-y','@modelcontextprotocol/server-code-runner'], description: 'Code execution sandbox', capabilities: ['code','exec','sandbox'] },
  'browser-use': { command: 'npx', args: ['-y','@modelcontextprotocol/server-browser-use'], description: 'Browser use automation', capabilities: ['browser','automation'] },
  'n8n': { description: 'n8n workflow automation', type: 'http', endpoint: process.env.N8N_URL, capabilities: ['workflow','automation'] },
  'scraping': { description: 'ScrapeGraphAI web scraping', type: 'http', endpoint: process.env.SCRAPING_API_URL, capabilities: ['scrape','web'] },
  'selenium': { description: 'Selenium Grid', type: 'http', endpoint: process.env.SELENIUM_GRID_URL, capabilities: ['browser','selenium'] },
  'easy-spider': { description: 'EasySpider visual crawler', type: 'http', endpoint: process.env.EASY_SPIDER_URL, capabilities: ['crawl','visual'] }
};

const ERROR_CLASSIFICATION = {
  transient: [429, 500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
  permanent: [400, 401, 403, 404, 405, 409, 'INVALID_REQUEST', 'UNSUPPORTED_TOOL']
};

class MCPClient {
  constructor() {
    this.servers = new Map();
    this.serverConfigs = new Map();
    this.toolCache = new Map();
    this.serverMetrics = new Map();
    this.connections = new Map();
    this.authTokens = new Map();
    this.protocolVersions = new Map();
    this._register();
  }

  _register() {
    for (const [id, meta] of Object.entries(KNOWN_SERVERS)) {
      registry.registerIntegration(`mcp-${id}`, {
        name: `MCP ${id}`,
        type: 'mcp',
        description: meta.description,
        enabled: true,
        needsKey: false,
        category: 'mcp/server',
        capabilities: meta.capabilities || []
      }, this);
    }
  }

  listServers() {
    return Object.entries(KNOWN_SERVERS).map(([id, meta]) => ({
      id, name: `MCP ${id}`, description: meta.description,
      type: meta.type || 'stdio',
      capabilities: meta.capabilities || [],
      available: !!meta.endpoint || !meta.type || meta.type === 'stdio',
      connected: this.servers.has(id),
      connectionState: this.connections.get(id) || 'disconnected',
      metrics: this.serverMetrics.get(id) || this._emptyMetrics()
    }));
  }

  getServerConfig(serverId) {
    return this.serverConfigs.get(serverId) || KNOWN_SERVERS[serverId] || null;
  }

  setServerConfig(serverId, config) {
    this.serverConfigs.set(serverId, { ...KNOWN_SERVERS[serverId], ...config });
    return true;
  }

  async connect(serverId) {
    const meta = this.serverConfigs.get(serverId) || KNOWN_SERVERS[serverId];
    if (!meta) throw new Error(`Unknown MCP server: ${serverId}`);
    if (this.connections.get(serverId) === 'connected') return this.servers.get(serverId);

    this.connections.set(serverId, 'connecting');

    if (meta.type === 'http') {
      if (!meta.endpoint) throw new Error(`No endpoint for ${serverId}`);
      const server = { type: 'http', endpoint: meta.endpoint };
      this.servers.set(serverId, server);
      this.connections.set(serverId, 'connected');
      this._initMetrics(serverId);
      logger.info(`MCP connected (HTTP): ${serverId}`);
      registry.emit('mcp:connected', { serverId });
      return server;
    }

    if (meta.command) {
      const server = { type: 'stdio', command: meta.command, args: meta.args };
      this.servers.set(serverId, server);
      this.connections.set(serverId, 'connected');
      this.protocolVersions.set(serverId, '2024-11-05');
      this._initMetrics(serverId);
      logger.info(`MCP connected (stdio): ${serverId}`);
      registry.emit('mcp:connected', { serverId });
      return server;
    }

    throw new Error(`Cannot connect ${serverId}: no type specified`);
  }

  async disconnect(serverId) {
    if (this.servers.has(serverId)) {
      this.servers.delete(serverId);
      this.connections.set(serverId, 'disconnected');
      this.toolCache.delete(serverId);
      logger.info(`MCP disconnected: ${serverId}`);
      registry.emit('mcp:disconnected', { serverId });
      return true;
    }
    return false;
  }

  async reconnect(serverId) {
    logger.info(`Reconnecting MCP: ${serverId}`);
    await this.disconnect(serverId);
    const backoff = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < backoff.length; i++) {
      try {
        await this.connect(serverId);
        logger.info(`MCP reconnected: ${serverId} (attempt ${i + 1})`);
        return true;
      } catch (e) {
        if (i < backoff.length - 1) {
          logger.warn(`MCP reconnect attempt ${i + 1} failed`, { error: e.message });
          await new Promise(r => setTimeout(r, backoff[i]));
        }
      }
    }
    throw new Error(`Failed to reconnect ${serverId} after ${backoff.length} attempts`);
  }

  async listTools(serverId) {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not connected`);

    const cacheKey = `tools:${serverId}`;
    const cached = this.toolCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 60000) {
      return cached.tools;
    }

    if (server.type === 'http') {
      try {
        const axios = require('axios');
        const res = await axios.get(`${server.endpoint}/api/tools`, { timeout: 10000 });
        const tools = res.data.tools || res.data || [];
        this.toolCache.set(cacheKey, { tools, timestamp: Date.now() });
        return tools;
      } catch (err) {
        logger.error(`List tools error: ${serverId}`, { error: err.message });
        return [];
      }
    }

    return [];
  }

  async call(serverId, tool, params) {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not connected. Call connect() first.`);

    const start = Date.now();
    const timeout = this.serverConfigs.get(serverId)?.timeout || 30000;
    const metrics = this._initMetrics(serverId);

    try {
      let result;
      if (server.type === 'http') {
        const axios = require('axios');
        const headers = { 'Content-Type': 'application/json' };
        const authToken = this.authTokens.get(serverId);
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await axios.post(`${server.endpoint}/api/tools/${tool}/execute`, params, {
          headers,
          timeout,
          validateStatus: status => status < 500
        });

        if (res.status >= 400) {
          throw { response: { status: res.status, data: res.data } };
        }
        result = res.data;
      } else {
        result = await this._execStdioTool(server, tool, params, timeout);
      }

      metrics.callCount++;
      metrics.lastCall = new Date().toISOString();
      metrics.lastSuccess = new Date().toISOString();
      metrics.totalTime += Date.now() - start;
      metrics.avgTime = Math.round(metrics.totalTime / metrics.callCount * 100) / 100;

      registry.emit('mcp:called', { serverId, tool, duration: Date.now() - start });
      return result;

    } catch (err) {
      metrics.callCount++;
      metrics.errorCount++;
      metrics.lastError = err.message;
      metrics.lastErrorAt = new Date().toISOString();

      const errorType = this._classifyError(err);
      logger.error(`MCP call error: ${serverId}/${tool}`, { error: err.message, type: errorType });

      if (errorType === 'transient' && this.connections.get(serverId) === 'connected') {
        setTimeout(() => this.reconnect(serverId).catch(() => {}), 1000);
      }

      return { error: err.message, errorType, tool };
    }
  }

  async callTool(toolName, params) {
    const results = [];
    for (const [serverId] of this.servers) {
      try {
        const meta = this.serverConfigs.get(serverId) || KNOWN_SERVERS[serverId];
        if (meta && meta.capabilities) {
          const toolCategory = toolName.split(':')[0] || toolName;
          if (!meta.capabilities.some(c => toolName.includes(c) || c.includes(toolCategory))) {
            continue;
          }
        }
        const result = await this.call(serverId, toolName, params);
        if (result && !result.error) {
          return { result, server: serverId };
        }
        results.push({ server: serverId, error: result?.error });
      } catch (e) {
        results.push({ server: serverId, error: e.message });
      }
    }

    const fallbackChain = this._getFallbackChain(toolName);
    for (const fbServerId of fallbackChain) {
      if (this.servers.has(fbServerId)) continue;
      try {
        await this.connect(fbServerId);
        const result = await this.call(fbServerId, toolName, params);
        if (result && !result.error) {
          return { result, server: fbServerId, fallback: true };
        }
      } catch (e) { continue; }
    }

    return { error: `No server available for tool: ${toolName}`, attempts: results };
  }

  _getFallbackChain(toolName) {
    const chains = {
      search: ['search', 'fetch'],
      fetch: ['fetch', 'search'],
      browser: ['playwright', 'puppeteer', 'browser-use'],
      sql: ['sqlite', 'postgres', 'mysql'],
      doc: ['pdf-reader', 'word', 'excel'],
      code: ['code-runner', 'shell']
    };
    for (const [category, servers] of Object.entries(chains)) {
      if (toolName.includes(category)) return servers;
    }
    return [];
  }

  async batchExecute(calls) {
    const results = [];
    for (const call of calls) {
      try {
        const result = await this.call(call.serverId, call.tool, call.params);
        results.push({ serverId: call.serverId, tool: call.tool, result, success: !result.error });
      } catch (e) {
        results.push({ serverId: call.serverId, tool: call.tool, error: e.message, success: false });
      }
    }
    return { results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length };
  }

  async readResource(serverId, uri) {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not connected`);
    if (server.type === 'http') {
      const axios = require('axios');
      const res = await axios.get(`${server.endpoint}/api/resources`, {
        params: { uri },
        timeout: 10000
      });
      return res.data;
    }
    return { error: 'Resource reading only supported for HTTP servers' };
  }

  async listResources(serverId) {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not connected`);
    if (server.type === 'http') {
      const axios = require('axios');
      const res = await axios.get(`${server.endpoint}/api/resources`, { timeout: 10000 });
      return res.data.resources || res.data || [];
    }
    return [];
  }

  getPrompts(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return [];
    return this._promptsCache?.get(serverId) || [];
  }

  async setAuthToken(serverId, token) {
    this.authTokens.set(serverId, token);
    return true;
  }

  clearAuthToken(serverId) {
    this.authTokens.delete(serverId);
  }

  getServerMetrics(serverId) {
    return this.serverMetrics.get(serverId) || this._emptyMetrics();
  }

  getAllMetrics() {
    const all = {};
    for (const [id] of this.servers) {
      all[id] = this.serverMetrics.get(id) || this._emptyMetrics();
    }
    return all;
  }

  getConnectionStatus(serverId) {
    return {
      serverId,
      status: this.connections.get(serverId) || 'disconnected',
      protocolVersion: this.protocolVersions.get(serverId),
      config: this.serverConfigs.get(serverId) || KNOWN_SERVERS[serverId],
      metrics: this.serverMetrics.get(serverId) || this._emptyMetrics()
    };
  }

  healthCheck(serverId) {
    const connected = this.connections.get(serverId) === 'connected';
    return {
      serverId,
      connected,
      status: connected ? 'healthy' : 'unhealthy',
      toolCount: this.toolCache.get(`tools:${serverId}`)?.tools?.length || 0,
      lastCall: this.serverMetrics.get(serverId)?.lastCall,
      errorRate: this._getErrorRate(serverId)
    };
  }

  _getErrorRate(serverId) {
    const m = this.serverMetrics.get(serverId);
    if (!m || m.callCount === 0) return 0;
    return Math.round(m.errorCount / m.callCount * 10000) / 100;
  }

  saveConfig(filePath) {
    const config = {
      servers: Object.fromEntries(this.serverConfigs),
      auth: Object.fromEntries(this.authTokens),
      connections: Object.fromEntries(
        Array.from(this.connections.entries()).filter(([_, v]) => v === 'connected')
      )
    };
    const outputPath = filePath || path.join(__dirname, '..', 'data', 'mcp-config.json');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
    return { path: outputPath };
  }

  loadConfig(filePath) {
    if (!fs.existsSync(filePath)) return { error: 'Config file not found' };
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (config.servers) {
      for (const [id, cfg] of Object.entries(config.servers)) {
        this.serverConfigs.set(id, cfg);
      }
    }
    if (config.auth) {
      for (const [id, token] of Object.entries(config.auth)) {
        this.authTokens.set(id, token);
      }
    }
    if (config.connections) {
      for (const [id] of Object.entries(config.connections)) {
        this.connect(id).catch(() => {});
      }
    }
    return { loaded: true, serverCount: Object.keys(config.servers || {}).length };
  }

  async _execStdioTool(server, tool, params, timeout) {
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const proc = spawn(server.command, [...(server.args || []), tool, JSON.stringify(params)], {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);
      proc.on('close', (code) => {
        if (code === 0) {
          try { resolve(JSON.parse(stdout)); } catch (e) { resolve({ output: stdout }); }
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr.substring(0, 200)}`));
        }
      });
      proc.on('error', reject);
    });
  }

  _classifyError(err) {
    const status = err.response?.status || err.statusCode || err.code;
    if (ERROR_CLASSIFICATION.transient.includes(status)) return 'transient';
    if (ERROR_CLASSIFICATION.permanent.includes(status)) return 'permanent';
    if (typeof status === 'string' && status.startsWith('E')) return 'transient';
    return 'unknown';
  }

  _initMetrics(serverId) {
    if (!this.serverMetrics.has(serverId)) {
      this.serverMetrics.set(serverId, {
        callCount: 0, errorCount: 0, totalTime: 0, avgTime: 0,
        lastCall: null, lastSuccess: null, lastError: null, lastErrorAt: null
      });
    }
    return this.serverMetrics.get(serverId);
  }

  _emptyMetrics() {
    return { callCount: 0, errorCount: 0, totalTime: 0, avgTime: 0, lastCall: null, lastSuccess: null, lastError: null, lastErrorAt: null };
  }

  async search(query) {
    try {
      const axios = require('axios');
      const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`, { timeout: 10000 });
      return res.data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async fetch(url) {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { timeout: 15000 }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 100000) }));
      }).on('error', (e) => resolve({ error: e.message }));
    });
  }

  async readFile(filepath) {
    try {
      const fs = require('fs');
      return { content: fs.readFileSync(filepath, 'utf-8') };
    } catch (e) {
      return { error: e.message };
    }
  }

  async writeFile(filepath, content) {
    try {
      const fs = require('fs');
      fs.writeFileSync(filepath, content, 'utf-8');
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  async runCode(code, language = 'javascript') {
    try {
      if (language === 'javascript' || language === 'js') {
        const result = eval(code);
        return { result: String(result) };
      }
      return { error: `Language ${language} execution not available` };
    } catch (e) {
      return { error: e.message };
    }
  }
}

const mcpClient = new MCPClient();
module.exports = mcpClient;
