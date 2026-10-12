const logger = require('../utils/logger');
const registry = require('./registry');
const cron = require('node-cron');

class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.running = new Map();
    this.triggers = new Map();
    this.cronJobs = new Map();
    this.templates = new Map();
    this.variables = new Map();
    this._register();
    this._loadTemplates();
  }

  _register() {
    registry.registerIntegration('workflow-engine', {
      name: 'Workflow Engine', type: 'workflow',
      description: 'n8n-like visual workflow automation', enabled: true,
      category: 'automation/workflow'
    }, this);

    registry.registerTool('workflow:create', { name: 'Create Workflow', description: 'Create a new automation workflow' }, async (params) => this.create(params));
    registry.registerTool('workflow:run', { name: 'Run Workflow', description: 'Execute a workflow' }, async (params) => this.run(params.id, params.data));
    registry.registerTool('workflow:list', { name: 'List Workflows', description: 'List all workflows' }, async () => this.list());
    registry.registerTool('workflow:get', { name: 'Get Workflow', description: 'Get workflow details' }, async (params) => this.get(params.id));
    registry.registerTool('workflow:delete', { name: 'Delete Workflow', description: 'Delete a workflow' }, async (params) => this.delete(params.id));
    registry.registerTool('workflow:export', { name: 'Export Workflow', description: 'Export workflow as JSON' }, async (params) => this.exportWorkflow(params.id));
    registry.registerTool('workflow:import', { name: 'Import Workflow', description: 'Import workflow from JSON' }, async (params) => this.importWorkflow(params.json));
    registry.registerTool('workflow:schedule', { name: 'Schedule Workflow', description: 'Set cron schedule for workflow' }, async (params) => this.schedule(params.id, params.cronExpression));
    registry.registerTool('workflow:list-templates', { name: 'List Templates', description: 'List workflow templates' }, async () => this.listTemplates());
    registry.registerTool('workflow:set-variable', { name: 'Set Variable', description: 'Set workflow variable' }, async (params) => this.setVariable(params.key, params.value, params.scope));
    registry.registerTool('workflow:get-variable', { name: 'Get Variable', description: 'Get workflow variable' }, async (params) => this.getVariable(params.key, params.scope));
  }

  _loadTemplates() {
    this.templates.set('data-pipeline', {
      name: 'Data Pipeline', description: 'Extract, transform, and load data',
      nodes: [
        { id: 'start', type: 'trigger', params: { type: 'manual' } },
        { id: 'extract', type: 'http', params: { method: 'GET', url: 'https://api.example.com/data' } },
        { id: 'transform', type: 'transform', params: { source: 'extract', operation: 'jsonpath', expression: '$.items' } },
        { id: 'load', type: 'code', params: { code: 'return context.transform;' } }
      ],
      edges: [{ from: 'start', to: 'extract' }, { from: 'extract', to: 'transform' }, { from: 'transform', to: 'load' }]
    });
    this.templates.set('ai-chat-workflow', {
      name: 'AI Chat Workflow', description: 'Process messages through LLM with context',
      nodes: [
        { id: 'receive', type: 'trigger', params: { type: 'webhook' } },
        { id: 'check', type: 'condition', params: { source: 'receive', operator: 'contains', value: 'analyze' } },
        { id: 'llm', type: 'llm', params: { prompt: 'Analyze the following: {{receive}}' } },
        { id: 'respond', type: 'webhook', params: { url: '{{receive.callback}}' } }
      ],
      edges: [{ from: 'receive', to: 'check' }, { from: 'check', to: 'llm', condition: true }, { from: 'llm', to: 'respond' }]
    });
    this.templates.set('daily-report', {
      name: 'Daily Report', description: 'Generate and send daily summary',
      nodes: [
        { id: 'start', type: 'trigger', params: { type: 'cron', expression: '0 8 * * 1-5' } },
        { id: 'collect', type: 'data-aggregate', params: { sources: ['metrics', 'logs', 'alerts'] } },
        { id: 'summarize', type: 'llm', params: { prompt: 'Summarize this data: {{collect}}' } },
        { id: 'notify', type: 'notification', params: { channel: 'email', to: 'admin@example.com', subject: 'Daily Report' } }
      ],
      edges: [{ from: 'start', to: 'collect' }, { from: 'collect', to: 'summarize' }, { from: 'summarize', to: 'notify' }]
    });
    this.templates.set('approval-flow', {
      name: 'Approval Flow', description: 'Human-in-the-loop approval process',
      nodes: [
        { id: 'start', type: 'trigger', params: { type: 'webhook' } },
        { id: 'approval', type: 'approval', params: { assignee: 'manager@example.com', message: 'Please approve: {{start}}' } },
        { id: 'approved', type: 'condition', params: { source: 'approval', operator: 'equals', value: 'approved' } },
        { id: 'process', type: 'code', params: { code: 'return { status: "processed", data: context.start };' } },
        { id: 'reject', type: 'notification', params: { channel: 'email', to: '{{start.submitter}}', subject: 'Request rejected' } }
      ],
      edges: [
        { from: 'start', to: 'approval' },
        { from: 'approval', to: 'approved' },
        { from: 'approved', to: 'process', condition: true },
        { from: 'approved', to: 'reject', condition: false }
      ]
    });
  }

  create(spec) {
    const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const workflow = {
      id, name: spec.name || 'Untitled Workflow',
      description: spec.description || '',
      version: spec.version || 1,
      nodes: spec.nodes || [],
      edges: spec.edges || [],
      triggers: spec.triggers || [],
      tags: spec.tags || [],
      timeout: spec.timeout || 300000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    };
    this.workflows.set(id, workflow);
    logger.info(`Workflow created: ${workflow.name} (${id})`);
    return workflow;
  }

  get(id) { return this.workflows.get(id); }

  list(filters = {}) {
    let all = Array.from(this.workflows.values());
    if (filters.status) all = all.filter(w => w.status === filters.status);
    if (filters.tag) all = all.filter(w => w.tags && w.tags.includes(filters.tag));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      all = all.filter(w => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q));
    }
    return all.map(w => ({
      id: w.id, name: w.name, version: w.version,
      status: w.status, nodeCount: w.nodes.length,
      tags: w.tags, createdAt: w.createdAt, updatedAt: w.updatedAt
    }));
  }

  update(id, updates) {
    const wf = this.workflows.get(id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);
    Object.assign(wf, updates, { updatedAt: new Date().toISOString() });
    if (updates.nodes || updates.edges) {
      wf.version = (wf.version || 1) + 1;
    }
    return wf;
  }

  delete(id) {
    const wf = this.workflows.get(id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);
    if (wf.status === 'running') throw new Error('Cannot delete a running workflow');
    this.unschedule(id);
    this.workflows.delete(id);
    logger.info(`Workflow deleted: ${id}`);
    return true;
  }

  async run(id, data = {}) {
    const wf = this.workflows.get(id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);

    const runId = `${id}_run_${Date.now()}`;
    const timeout = wf.timeout || 300000;
    const execution = {
      id: runId, workflowId: id, status: 'running',
      startedAt: new Date().toISOString(),
      currentNode: null, results: {}, data,
      variables: { ...this.variables.get('global'), ...this.variables.get(`wf:${id}`) },
      errors: []
    };
    this.running.set(runId, execution);

    const timer = setTimeout(() => {
      if (execution.status === 'running') {
        execution.status = 'timed_out';
        execution.error = `Execution timed out after ${timeout}ms`;
        logger.error(`Workflow timed out: ${id} (${runId})`);
      }
    }, timeout);

    try {
      wf.status = 'running';
      await this._executeGraph(wf, execution);
      clearTimeout(timer);
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      wf.status = 'active';
      logger.info(`Workflow completed: ${id} (${runId})`);
    } catch (err) {
      clearTimeout(timer);
      execution.status = 'failed';
      execution.error = err.message;
      wf.status = 'error';
      logger.error(`Workflow failed: ${id}`, { error: err.message });
    }

    return execution;
  }

  async _executeGraph(wf, execution) {
    const nodeMap = new Map(wf.nodes.map(n => [n.id, n]));
    const edgeMap = new Map();
    for (const edge of wf.edges) {
      if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
      edgeMap.get(edge.from).push(edge);
    }

    const startNodes = wf.nodes.filter(n =>
      n.type === 'trigger' || !wf.edges.some(e => e.to === n.id)
    );

    await this._executeNodes(startNodes, nodeMap, edgeMap, execution, new Set());
  }

  async _executeNodes(nodes, nodeMap, edgeMap, execution, visited, branchContext) {
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      execution.currentNode = node.id;

      try {
        const result = await this._executeNodeWithRetry(node, execution);
        execution.results[node.id] = result;

        const outEdges = edgeMap.get(node.id) || [];
        const parallelGroups = this._groupParallelEdges(outEdges, nodeMap);

        for (const group of parallelGroups) {
          if (group.length === 1) {
            const edge = group[0];
            if (this._shouldTraverse(edge, result)) {
              const nextNode = nodeMap.get(edge.to);
              if (nextNode) {
                await this._executeNodes([nextNode], nodeMap, edgeMap, execution, visited, branchContext);
              }
            }
          } else {
            await Promise.all(group.map(async (edge) => {
              if (this._shouldTraverse(edge, result)) {
                const nextNode = nodeMap.get(edge.to);
                if (nextNode) {
                  const branchVisited = new Set(visited);
                  await this._executeNodes([nextNode], nodeMap, edgeMap, execution, branchVisited, branchContext);
                  for (const v of branchVisited) visited.add(v);
                }
              }
            }));
          }
        }
      } catch (err) {
        execution.errors.push({ nodeId: node.id, error: err.message });
        throw err;
      }
    }
  }

  _groupParallelEdges(edges, nodeMap) {
    const groups = [];
    let currentGroup = [];
    for (const edge of edges) {
      if (edge.type === 'parallel') {
        currentGroup.push(edge);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        groups.push([edge]);
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  }

  _shouldTraverse(edge, result) {
    if (edge.condition === undefined) return true;
    const val = typeof result === 'object' ? result.condition ?? result : result;
    return edge.condition ? !!val : !val;
  }

  async _executeNodeWithRetry(node, execution) {
    const retries = node.retries || 0;
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await this._executeNode(node, execution);
      } catch (err) {
        lastError = err;
        if (i < retries) {
          const delay = (node.retryDelay || 1000) * Math.pow(2, i);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  async _executeNode(node, execution) {
    const context = { ...execution.data, ...execution.results, variables: execution.variables };

    switch (node.type) {
      case 'trigger':
        return execution.data || { triggered: true };

      case 'llm':
        const llm = require('./llm-hub');
        const prompt = this._interpolate(node.params.prompt, context);
        return await llm.chat([{ role: 'user', content: prompt }], node.params.options);

      case 'http':
        const axios = require('axios');
        const url = this._interpolate(node.params.url, context);
        const res = await axios({
          method: node.params.method || 'GET',
          url,
          headers: node.params.headers || {},
          data: node.params.body ? this._interpolate(JSON.stringify(node.params.body), context) : undefined,
          timeout: node.params.timeout || 30000
        });
        return res.data;

      case 'condition': {
        const sourceKey = node.params.source;
        const val = context[sourceKey] !== undefined ? context[sourceKey] : context[node.id] || '';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        const match = node.params.operator === 'equals' ? strVal === node.params.value
          : node.params.operator === 'contains' ? strVal.includes(node.params.value)
          : node.params.operator === 'gt' ? parseFloat(strVal) > parseFloat(node.params.value)
          : node.params.operator === 'lt' ? parseFloat(strVal) < parseFloat(node.params.value)
          : node.params.operator === 'regex' ? new RegExp(node.params.value).test(strVal)
          : node.params.operator === 'exists' ? context[node.params.source] !== undefined
          : false;
        return { condition: match, source: strVal, operator: node.params.operator, value: node.params.value };
      }

      case 'transform': {
        const input = context[node.params.source] || context[node.id] || '';
        const raw = typeof input === 'string' ? input : JSON.stringify(input);
        if (node.params.operation === 'jsonpath') {
          try { return this._jsonPath(raw, node.params.expression); } catch (e) { return { error: e.message }; }
        }
        if (node.params.operation === 'truncate') return raw.substring(0, node.params.maxLength || 1000);
        if (node.params.operation === 'uppercase') return raw.toUpperCase();
        if (node.params.operation === 'lowercase') return raw.toLowerCase();
        if (node.params.operation === 'parse-json') { try { return JSON.parse(raw); } catch (e) { return { error: 'Invalid JSON' }; } }
        if (node.params.operation === 'concat') return `${raw}${node.params.append || ''}`;
        return raw.substring(0, node.params.maxLength || 1000);
      }

      case 'delay':
        await new Promise(r => setTimeout(r, node.params.ms || 1000));
        return { delayed: true, ms: node.params.ms || 1000 };

      case 'webhook': {
        const webhookUrl = this._interpolate(node.params.url, context);
        const resp = await require('axios').post(webhookUrl, context, { timeout: 10000 });
        return resp.data;
      }

      case 'code': {
        const code = node.params.code || 'return context;';
        const fn = new Function('context', code);
        return fn(context);
      }

      case 'email': {
        const emailService = require('../services/email');
        await emailService.sendEmail(
          node.params.to, node.params.subject,
          this._interpolate(node.params.body, context)
        );
        return { sent: true, to: node.params.to };
      }

      case 'notification': {
        return await this._sendNotification(node.params, context);
      }

      case 'loop': {
        const iterable = context[node.params.source] || [];
        if (!Array.isArray(iterable)) return { error: 'Source is not iterable' };
        const results = [];
        for (let i = 0; i < Math.min(iterable.length, node.params.maxIterations || 100); i++) {
          execution.results['_loopItem'] = iterable[i];
          execution.results['_loopIndex'] = i;
          for (const subNodeId of node.params.subNodes || []) {
            const subNode = { id: subNodeId, type: node.params.subNodeType, params: node.params.subNodeParams || {} };
            results.push(await this._executeNode(subNode, execution));
          }
        }
        return { loopResults: results, count: results.length };
      }

      case 'sub-workflow': {
        const subWf = this.workflows.get(node.params.workflowId);
        if (!subWf) return { error: `Sub-workflow not found: ${node.params.workflowId}` };
        const subExecution = await this.run(node.params.workflowId, context);
        return subExecution;
      }

      case 'data-aggregate': {
        const sources = node.params.sources || [];
        const aggregated = {};
        for (const src of sources) {
          aggregated[src] = context[src] || null;
        }
        return aggregated;
      }

      case 'approval': {
        logger.info(`Waiting for approval: ${node.params.message}`, { assignee: node.params.assignee });
        return { status: 'pending', message: node.params.message, assignee: node.params.assignee };
      }

      default:
        return { error: `Unknown node type: ${node.type}` };
    }
  }

  async _sendNotification(params, context) {
    const channel = params.channel || 'email';
    const message = this._interpolate(params.message || params.body, context);

    switch (channel) {
      case 'email':
        const emailService = require('../services/email');
        await emailService.sendEmail(params.to, params.subject, message);
        return { sent: true, channel: 'email', to: params.to };

      case 'sms':
        const sms = require('../services/sms');
        if (sms) { await sms.send(params.to, message); return { sent: true, channel: 'sms' }; }
        return { error: 'SMS service not available' };

      case 'webhook':
        await require('axios').post(params.url, { message }, { timeout: 10000 });
        return { sent: true, channel: 'webhook', url: params.url };

      case 'push':
        const push = require('../services/push');
        if (push) { await push.send(params.device, message); return { sent: true, channel: 'push' }; }
        return { error: 'Push service not available' };

      default:
        return { error: `Unknown notification channel: ${channel}` };
    }
  }

  _interpolate(template, context) {
    if (!template) return template;
    return template.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      const trimmed = expr.trim();
      const value = this._resolvePath(context, trimmed);
      return value !== undefined ? String(value) : match;
    });
  }

  _resolvePath(obj, path) {
    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      if (Array.isArray(acc) && !isNaN(part)) return acc[parseInt(part)];
      return acc[part];
    }, obj);
  }

  _jsonPath(obj, expr) {
    if (!expr) return obj;
    const parts = expr.replace(/^\$\.?/, '').split('.');
    let current = typeof obj === 'string' ? JSON.parse(obj) : obj;
    for (const part of parts) {
      const arrMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrMatch) {
        current = current[arrMatch[1]];
        if (Array.isArray(current)) current = current[parseInt(arrMatch[2])];
      } else {
        current = current[part];
      }
      if (current === undefined) return undefined;
    }
    return current;
  }

  getRun(runId) { return this.running.get(runId); }

  listRuns(workflowId) {
    const runs = Array.from(this.running.values());
    return workflowId ? runs.filter(r => r.workflowId === workflowId) : runs.slice(-100);
  }

  async schedule(id, cronExpression) {
    const wf = this.workflows.get(id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);

    if (this.cronJobs.has(id)) {
      this.unschedule(id);
    }

    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const job = cron.schedule(cronExpression, async () => {
      logger.info(`Cron triggered workflow: ${id}`);
      await this.run(id, { trigger: 'cron', cronExpression });
    });

    this.cronJobs.set(id, { job, expression: cronExpression });
    wf.cronExpression = cronExpression;
    logger.info(`Workflow scheduled: ${id} (${cronExpression})`);
    return { scheduled: true, id, cronExpression };
  }

  unschedule(id) {
    const existing = this.cronJobs.get(id);
    if (existing) {
      existing.job.stop();
      this.cronJobs.delete(id);
    }
    const wf = this.workflows.get(id);
    if (wf) delete wf.cronExpression;
  }

  listScheduled() {
    return Array.from(this.cronJobs.entries()).map(([id, job]) => ({
      workflowId: id,
      cronExpression: job.expression
    }));
  }

  setVariable(key, value, scope = 'global') {
    if (!this.variables.has(scope)) this.variables.set(scope, {});
    this.variables.get(scope)[key] = value;
    return { key, value, scope };
  }

  getVariable(key, scope = 'global') {
    const vars = this.variables.get(scope);
    return vars ? vars[key] : undefined;
  }

  listVariables(scope) {
    if (scope) return { scope, variables: this.variables.get(scope) || {} };
    const all = {};
    for (const [s, vars] of this.variables) {
      all[s] = vars;
    }
    return all;
  }

  listTemplates() {
    return Array.from(this.templates.entries()).map(([id, t]) => ({
      id, name: t.name, description: t.description,
      nodeCount: t.nodes.length
    }));
  }

  applyTemplate(templateId, overrides = {}) {
    const tpl = this.templates.get(templateId);
    if (!tpl) throw new Error(`Template not found: ${templateId}`);
    return this.create({
      ...tpl,
      name: overrides.name || tpl.name,
      description: overrides.description || tpl.description,
      tags: overrides.tags || []
    });
  }

  exportWorkflow(id) {
    const wf = this.workflows.get(id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);
    return JSON.stringify({
      version: '1.0',
      workflow: {
        name: wf.name, description: wf.description,
        version: wf.version, nodes: wf.nodes,
        edges: wf.edges, triggers: wf.triggers,
        tags: wf.tags, timeout: wf.timeout
      }
    }, null, 2);
  }

  importWorkflow(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const wfData = data.workflow || data;
      if (!wfData.nodes) throw new Error('Invalid workflow format: missing nodes');
      return this.create({
        name: wfData.name || 'Imported Workflow',
        description: wfData.description || '',
        nodes: wfData.nodes,
        edges: wfData.edges || [],
        triggers: wfData.triggers || [],
        tags: wfData.tags || [],
        timeout: wfData.timeout || 300000
      });
    } catch (e) {
      throw new Error(`Import failed: ${e.message}`);
    }
  }

  onTrigger(type, handler) {
    if (!this.triggers.has(type)) this.triggers.set(type, []);
    this.triggers.get(type).push(handler);
  }

  async fireTrigger(type, data) {
    const handlers = this.triggers.get(type) || [];
    for (const handler of handlers) {
      const wfIds = handler(data);
      for (const wfId of wfIds) {
        await this.run(wfId, data);
      }
    }
  }

  integrateN8n() {
    const endpoint = process.env.N8N_URL || 'http://localhost:5678';
    registry.registerIntegration('n8n', {
      name: 'n8n Workflow', type: 'workflow', endpoint,
      description: 'Connect to n8n for advanced workflows', enabled: true,
      category: 'automation/workflow'
    }, {
      execute: async (workflowId, data) => {
        const axios = require('axios');
        const res = await axios.post(`${endpoint}/webhook/${workflowId}`, data, { timeout: 30000 });
        return res.data;
      }
    });
  }
}

module.exports = new WorkflowEngine();
