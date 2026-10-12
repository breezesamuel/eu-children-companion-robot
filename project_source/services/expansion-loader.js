const path = require('path');
const fs = require('fs');

class ExpansionLoader {
  constructor(app) {
    this.app = app;
    this.stats = {};
  }

  loadAll() {
    this._loadServiceRegistry();
    this._loadExtendedRoutes();
    this._loadScrapingSources();
    this._loadFreeAPIs();
    this._loadLLMProviders();
    this._loadUtilityTools();
    this._loadDynamicTools();
    this._loadIntents();
    this._loadRules();
    this._loadWorkflows();
    this._loadSchoolContent();
    this._loadLifestyle();
    this._loadLanguages();
    this._loadSTM32Commands();
    this._loadHardware();
    this._loadAdminRoutes();
    this._loadToolControls();
    this._printSummary();
    return this.stats;
  }

  _loadJSON(filename, label) {
    const p = path.join(__dirname, '..', 'data', filename);
    try {
      if (!fs.existsSync(p)) { this.stats[label] = 0; return []; }
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      this.stats[label] = Array.isArray(data) ? data.length : Object.keys(data).length;
      return data;
    } catch(e) {
      this.stats[label] = 0;
      return [];
    }
  }

  _loadServiceRegistry() {
    const data = this._loadJSON(path.join('..', 'services', 'registry', 'service-registry.json'), 'services');
    this.app.set('serviceRegistry', data);
    this.app.get('/api/system/services', (req, res) => res.json({ total: data.length, services: data }));
  }

  _loadExtendedRoutes() {
    const data = this._loadJSON(path.join('..', 'routes', 'extended', 'routes.json'), 'apiEndpoints');
    this.app.set('extendedRoutes', data);
    // Register route listing endpoint
    this.app.get('/api/system/routes', (req, res) => res.json({ total: data.length, routes: data }));
    // Register all route stubs
    if (Array.isArray(data)) {
      data.forEach(route => {
        const method = (route.method || 'GET').toLowerCase();
        const handler = (req, res) => res.json({
          success: true, endpoint: route.id, message: route.description || 'Stub endpoint',
          path: route.path, method: route.method, timestamp: Date.now()
        });
        try { this.app[method](route.path, handler); } catch(e) { /* route may conflict */ }
      });
    }
    console.log(`[Expansion] Registered ${data.length} API endpoints`);
  }

  _loadScrapingSources() {
    const data = this._loadJSON(path.join('..', 'data', 'apis', 'scraping-sources.json'), 'scrapingSources');
    this.app.set('scrapingSources', data);
  }

  _loadFreeAPIs() {
    const data = this._loadJSON(path.join('..', 'data', 'apis', 'free-apis.json'), 'freeAPIs');
    this.app.set('freeAPIs', data);
    this.app.get('/api/apis', (req, res) => res.json({ total: data.length, apis: data }));
  }

  _loadLLMProviders() {
    const data = this._loadJSON(path.join('..', 'services', 'registry', 'llm-providers.json'), 'llmProviders');
    this.app.set('llmProviders', data);
  }

  _loadUtilityTools() {
    const data = this._loadJSON(path.join('..', 'services', 'registry', 'utility-tools.json'), 'utilityTools');
    this.app.set('utilityTools', data);
    this.app.get('/api/tools/utilities', (req, res) => res.json({ total: data.length, tools: data }));
  }

  _loadDynamicTools() {
    const data = this._loadJSON(path.join('..', 'data', 'tools', 'tools.json'), 'dynamicTools');
    this.app.set('dynamicTools', data);
    this.app.get('/api/tools/dynamic', (req, res) => res.json({ total: data.length, tools: data }));
  }

  _loadIntents() {
    const data = this._loadJSON(path.join('..', 'data', 'intents', 'intents.json'), 'intents');
    this.app.set('intentPatterns', data);
  }

  _loadRules() {
    const data = this._loadJSON(path.join('..', 'data', 'rules', 'rules.json'), 'rules');
    this.app.set('automationRules', data);
    this.app.get('/api/automation/rules', (req, res) => res.json({ total: data.length, rules: data }));
  }

  _loadWorkflows() {
    const data = this._loadJSON(path.join('..', 'data', 'workflows', 'workflows.json'), 'workflows');
    this.app.set('workflows', data);
    this.app.get('/api/automation/workflows', (req, res) => res.json({ total: data.length, workflows: data }));
  }

  _loadSchoolContent() {
    const data = this._loadJSON(path.join('..', 'data', 'school', 'school-content.json'), 'schoolContent');
    this.app.set('schoolContent', data);
    this.app.get('/api/content/school', (req, res) => res.json({ total: data.length, items: data }));
  }

  _loadLifestyle() {
    const data = this._loadJSON(path.join('..', 'data', 'lifestyle', 'lifestyle.json'), 'lifestyle');
    this.app.set('lifestyleContent', data);
    this.app.get('/api/content/lifestyle', (req, res) => res.json({ total: data.length, items: data }));
  }

  _loadLanguages() {
    const data = this._loadJSON(path.join('..', 'data', 'languages', 'translations.json'), 'languages');
    this.app.set('translations', data);
    const langCount = (data && data.languages) ? Object.keys(data.languages).length : 0;
    this.stats.languages = langCount;
    this.app.get('/api/system/languages', (req, res) => res.json({ languages: data.languages || {}, count: langCount }));
  }

  _loadSTM32Commands() {
    const data = this._loadJSON(path.join('..', 'data', 'stm32', 'stm32-commands.json'), 'stm32Commands');
    this.app.set('stm32Commands', data);
    this.app.get('/api/hardware/commands', (req, res) => res.json({ total: data.length }));
    this.app.get('/api/hardware/commands/search', (req, res) => {
      const q = (req.query.q || '').toLowerCase();
      if (!q) return res.json({ total: 0, results: [] });
      const results = data.filter(c => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
      res.json({ total: results.length, results: results.slice(0, 50) });
    });
  }

  _loadHardware() {
    try {
      const hw = require('../hardware/hardware-manager');
      this.app.set('hardwareManager', hw);
      this.app.get('/api/hardware/status', (req, res) => res.json({ success: true, ...hw.getStatus() }));
      this.app.get('/api/hardware/features', (req, res) => res.json(hw.getAllFeatures()));
      this.app.get('/api/hardware/features/:type', (req, res) => res.json(hw.getFeaturesByType(req.params.type)));
      this.app.post('/api/hardware/features/:id/enable', (req, res) => res.json({ success: hw.enableFeature(req.params.id) }));
      this.app.post('/api/hardware/features/:id/disable', (req, res) => res.json({ success: hw.disableFeature(req.params.id) }));
      this.app.post('/api/hardware/diagnostic', (req, res) => res.json(hw.runDiagnostic()));
      this.app.post('/api/hardware/monitoring/start', (req, res) => { hw.startProximityMonitoring(req.body.interval); res.json({ success: true }); });
      this.app.post('/api/hardware/monitoring/stop', (req, res) => { hw.stopProximityMonitoring(); res.json({ success: true }); });
      this.stats.hardwareFeatures = hw.getStatus().totalFeatures;
      console.log(`[Expansion] Hardware: ${hw.getStatus().totalFeatures} features`);
    } catch(e) {
      this.stats.hardwareFeatures = 0;
      console.log('[Expansion] Hardware module not loaded:', e.message);
    }
  }

  _loadAdminRoutes() {
    try {
      const admin = require('../admin/admin-routes');
      this.app.use('/api', admin.router);
      this.stats.adminFeatures = admin.count;
      console.log(`[Expansion] Admin: ${admin.count} features`);
    } catch(e) {
      this.stats.adminFeatures = 0;
      console.log('[Expansion] Admin module not loaded:', e.message);
    }
  }

  _loadToolControls() {
    const data = this._loadJSON(path.join('..', 'data', 'tools', 'tool-controls.json'), 'toolControls');
    this.app.set('toolControls', data);
    this.app.get('/api/hardware/controls', (req, res) => res.json({ total: data.length, controls: data }));
    this.app.get('/api/hardware/controls/:category', (req, res) => {
      const cat = req.params.category;
      const filtered = data.filter(c => c.category === cat);
      res.json({ total: filtered.length, controls: filtered });
    });
  }

  _printSummary() {
    console.log('\n========== EXPANSION LOAD SUMMARY ==========');
    const items = [
      ['Backend Services', 'services'],
      ['API Endpoints', 'apiEndpoints'],
      ['Scraping Sources', 'scrapingSources'],
      ['Free APIs', 'freeAPIs'],
      ['LLM Providers', 'llmProviders'],
      ['Utility Tools', 'utilityTools'],
      ['Dynamic Tools', 'dynamicTools'],
      ['Intent Patterns', 'intents'],
      ['Automation Rules', 'rules'],
      ['Workflows', 'workflows'],
      ['School Content', 'schoolContent'],
      ['Lifestyle Content', 'lifestyle'],
      ['Languages', 'languages'],
      ['STM32 Commands', 'stm32Commands'],
      ['Hardware Features', 'hardwareFeatures'],
      ['Admin Features', 'adminFeatures'],
      ['Tool Controls', 'toolControls']
    ];
    let grandTotal = 0;
    items.forEach(([label, key]) => {
      const count = this.stats[key] || 0;
      grandTotal += count;
      console.log(`  ${label.padEnd(22)} ${String(count).padStart(8)}`);
    });
    console.log('  ' + '-'.repeat(32));
    console.log(`  TOTAL${' '.repeat(18)} ${String(grandTotal).padStart(8)}`);
    console.log('============================================');
  }
}

module.exports = ExpansionLoader;
