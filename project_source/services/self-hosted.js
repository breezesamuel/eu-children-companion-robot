const EventEmitter = require('events');
const logger = require('../utils/logger');

class SelfHostedHub extends EventEmitter {
  constructor() {
    super();

    this.services = {
      ha: { enabled: false, url: 'http://homeassistant.local:8123', token: null },
      omv: { enabled: false, url: 'http://omv.local:80', apiKey: null },
      matrix: { enabled: false, url: 'https://matrix.local', token: null, serverName: 'robobuddy.local' },
      jitsi: { enabled: false, url: 'https://jitsi.local', appId: null },
      nextcloud: { enabled: false, url: 'https://nextcloud.local', username: null, password: null },
      grafana: { enabled: false, url: 'https://grafana.local:3000', apiKey: null },
    };

    this.serviceNames = Object.keys(this.services);
    logger.info('SelfHostedHub initialized with 6 service integrations');
  }

  /** Configure a service. Validates name, merges config, emits service:configured. */
  configure(service, config) {
    try {
      if (!this.services[service]) { logger.warn(`Unknown service: ${service}`); return null; }
      this.services[service] = { ...this.services[service], ...config };
      this.services[service].enabled = true;
      logger.info(`Service configured: ${service}`);
      this.emit('service:configured', { service, config: this.services[service] });
      return this.services[service];
    } catch (err) {
      logger.error(`Failed to configure service ${service}: ${err.message}`);
      return null;
    }
  }

  /** Get config for a service. Returns null if not found. */
  getConfig(service) {
    try { return this.services[service] || null; } catch (err) { logger.error(`Failed to get config for ${service}: ${err.message}`); return null; }
  }

  /** Return all service configs. */
  getAllConfigs() { return { ...this.services }; }

  /** Simulated HTTP GET. */
  async _httpGet(url) {
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    return { ok: true, status: 200, latency: 0 };
  }

  /** Health check for a single service. Returns { status, service, latency, timestamp }. */
  async healthCheck(service) {
    try {
      const cfg = this.services[service];
      const ts = new Date().toISOString();
      if (!cfg) return { status: 'unknown', service, latency: 0, timestamp: ts };
      const start = Date.now();
      if (cfg.url) {
        try {
          const res = await this._httpGet(cfg.url);
          const latency = Date.now() - start;
          if (res.ok) { logger.info(`${service.toUpperCase()} health check passed (${latency}ms)`); return { status: 'ok', service, latency, timestamp: ts }; }
        } catch { /* fall through */ }
        return { status: 'error', service, latency: Date.now() - start, timestamp: ts };
      }
      return { status: 'unknown', service, latency: 0, timestamp: ts };
    } catch (err) {
      logger.error(`healthCheck error for ${service}: ${err.message}`);
      return { status: 'error', service, latency: 0, timestamp: new Date().toISOString() };
    }
  }

  /** Run health checks for all configured services. */
  async healthCheckAll() {
    try { return await Promise.all(this.serviceNames.map((s) => this.healthCheck(s))); } catch (err) { logger.error(`healthCheckAll failed: ${err.message}`); return []; }
  }

  // ── Home Assistant ────────────────────────────────────────

  /** Simulate getting entity states from Home Assistant. */
  async haGetStates() {
    try {
      const entities = [
        { entity_id: 'light.living_room', state: 'on', attributes: { brightness: 180 } },
        { entity_id: 'light.bedroom', state: 'off', attributes: { brightness: 0 } },
        { entity_id: 'switch.kitchen', state: 'on', attributes: {} },
        { entity_id: 'sensor.temperature', state: 22.5, attributes: { unit: '°C' } },
        { entity_id: 'sensor.humidity', state: 58, attributes: { unit: '%' } },
        { entity_id: 'lock.front_door', state: 'locked', attributes: {} },
        { entity_id: 'cover.living_room_blind', state: 'open', attributes: { position: 80 } },
      ];
      logger.info('HA: fetched simulated entity states');
      return entities;
    } catch (err) {
      logger.error(`haGetStates failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate calling a Home Assistant service. */
  async haCallService(domain, service, entityId, data) {
    try {
      logger.info(`HA: calling ${domain}.${service} on ${entityId}`);
      return { success: true, domain, service, entityId, data: data || {} };
    } catch (err) {
      logger.error(`haCallService failed: ${err.message}`);
      return { success: false, domain, service, entityId };
    }
  }

  /** Simulate getting history for an entity. */
  async haGetHistory(entityId, hours) {
    try {
      const h = hours || 24;
      const now = Date.now();
      const states = ['on', 'off'];
      const history = Array.from({ length: Math.min(h, 48) }, (_, i) => ({
        state: states[Math.floor(Math.random() * states.length)],
        last_changed: new Date(now - i * 3600000).toISOString(),
      }));
      logger.info(`HA: fetched ${history.length} history entries for ${entityId}`);
      return { entity_id: entityId, hours: h, history };
    } catch (err) {
      logger.error(`haGetHistory failed: ${err.message}`);
      return { entity_id: entityId, hours: hours || 24, history: [] };
    }
  }

  // ── OpenMediaVault ────────────────────────────────────────

  /** Simulate listing disks. */
  async omvGetDisks() {
    try {
      return [
        { device: '/dev/sda', size: '2TB', used: '1.2TB', available: '800GB', filesystem: 'ext4' },
        { device: '/dev/sdb', size: '4TB', used: '3.1TB', available: '900GB', filesystem: 'ext4' },
      ];
    } catch (err) {
      logger.error(`omvGetDisks failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate listing shared folders. */
  async omvGetShares() {
    try {
      return [
        { name: 'MedicalRecords', path: '/export/MedicalRecords', privilege: 'rw' },
        { name: 'Backups', path: '/export/Backups', privilege: 'ro' },
        { name: 'Media', path: '/export/Media', privilege: 'rw' },
      ];
    } catch (err) {
      logger.error(`omvGetShares failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate health/medical data status. */
  async omvGetHealth() {
    try {
      return { overall: 'good', last_check: new Date().toISOString(), storage_used_percent: 62, disk_temp_c: 38, smart_status: 'PASS', uptime_days: 14.3 };
    } catch (err) {
      logger.error(`omvGetHealth failed: ${err.message}`);
      return { overall: 'unknown' };
    }
  }

  /** Simulate creating a backup. */
  async omvCreateBackup(path) {
    try {
      return { success: true, path, backup_id: `backup-${Date.now()}`, started_at: new Date().toISOString(), estimated_size_mb: Math.floor(Math.random() * 5000 + 100) };
    } catch (err) {
      logger.error(`omvCreateBackup failed: ${err.message}`);
      return { success: false, path, error: err.message };
    }
  }

  // ── Matrix Synapse ────────────────────────────────────────

  /** Simulate creating a Matrix room. */
  async matrixCreateRoom(name, topic) {
    try {
      return { room_id: `!${Date.now().toString(36)}:${this.services.matrix.serverName}`, name, topic: topic || '', created_at: new Date().toISOString() };
    } catch (err) {
      logger.error(`matrixCreateRoom failed: ${err.message}`);
      return { room_id: null, name, error: err.message };
    }
  }

  /** Simulate sending a Matrix message. */
  async matrixSendMessage(roomId, content) {
    try {
      const eventId = `$${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      logger.info(`Matrix: message sent to ${roomId}`);
      return { success: true, room_id: roomId, event_id: eventId, content };
    } catch (err) {
      logger.error(`matrixSendMessage failed: ${err.message}`);
      return { success: false, room_id: roomId, error: err.message };
    }
  }

  /** Simulate listing Matrix rooms. */
  async matrixGetRooms() {
    try {
      return [
        { room_id: '!abc123:robobuddy.local', name: 'General', member_count: 4 },
        { room_id: '!def456:robobuddy.local', name: 'Health Updates', member_count: 3 },
        { room_id: '!ghi789:robobuddy.local', name: 'Emergency Alerts', member_count: 5 },
      ];
    } catch (err) {
      logger.error(`matrixGetRooms failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate registering a Matrix user. */
  async matrixRegisterUser(username) {
    try {
      const user_id = `@${username}:${this.services.matrix.serverName}`;
      return { success: true, user_id, username, created_at: new Date().toISOString() };
    } catch (err) {
      logger.error(`matrixRegisterUser failed: ${err.message}`);
      return { success: false, username, error: err.message };
    }
  }

  // ── Jitsi Meet ────────────────────────────────────────────

  /** Simulate creating a Jitsi meeting. */
  async jitsiCreateMeeting(topic, options) {
    try {
      const roomName = `RoboBuddy-${Date.now().toString(36).toUpperCase()}`;
      return { url: `${this.services.jitsi.url}/${roomName}`, roomName, topic, options: options || {}, created_at: new Date().toISOString() };
    } catch (err) {
      logger.error(`jitsiCreateMeeting failed: ${err.message}`);
      return { url: null, roomName: null, topic, error: err.message };
    }
  }

  /** Simulate listing active Jitsi meetings. */
  async jitsiGetActiveMeetings() {
    try {
      return [
        { roomName: 'RoboBuddy-A1B2C', topic: 'Morning Check-in', participants: 2, started: new Date(Date.now() - 1800000).toISOString() },
        { roomName: 'RoboBuddy-D3E4F', topic: 'Therapy Session', participants: 1, started: new Date(Date.now() - 600000).toISOString() },
      ];
    } catch (err) {
      logger.error(`jitsiGetActiveMeetings failed: ${err.message}`);
      return [];
    }
  }

  // ── Nextcloud ─────────────────────────────────────────────

  /** Simulate uploading a file. */
  async nextcloudUploadFile(filename, content) {
    try {
      const size = typeof content === 'string' ? Buffer.byteLength(content) : (content ? content.length : 0);
      return { success: true, filename, size, path: `/remote.php/dav/files/${this.services.nextcloud.username || 'admin'}/${filename}`, uploaded_at: new Date().toISOString() };
    } catch (err) {
      logger.error(`nextcloudUploadFile failed: ${err.message}`);
      return { success: false, filename, error: err.message };
    }
  }

  /** Simulate listing files. */
  async nextcloudListFiles(path) {
    try {
      return [
        { name: 'README.txt', type: 'file', size: 2048, modified: new Date().toISOString() },
        { name: 'Photos', type: 'dir', size: 0, modified: new Date().toISOString() },
        { name: 'Reports', type: 'dir', size: 0, modified: new Date().toISOString() },
        { name: 'health_data.csv', type: 'file', size: 15780, modified: new Date(Date.now() - 86400000).toISOString() },
      ];
    } catch (err) {
      logger.error(`nextcloudListFiles failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate sharing a file/folder. */
  async nextcloudShareFile(path, shareType) {
    try {
      return { success: true, path, share_type: shareType || 'link', token: `share-${Date.now().toString(36)}`, url: `${this.services.nextcloud.url}/s/${Date.now().toString(36)}`, created_at: new Date().toISOString() };
    } catch (err) {
      logger.error(`nextcloudShareFile failed: ${err.message}`);
      return { success: false, path, error: err.message };
    }
  }

  /** Simulate getting storage quota. */
  async nextcloudGetUserStorage(username) {
    try {
      const user = username || this.services.nextcloud.username || 'admin';
      return { user, used_bytes: 2_147_483_648, quota_bytes: 10_737_418_240, used_human: '2 GB', quota_human: '10 GB', usage_percent: 20 };
    } catch (err) {
      logger.error(`nextcloudGetUserStorage failed: ${err.message}`);
      return { user: username, used_bytes: 0, quota_bytes: 0 };
    }
  }

  // ── Grafana ───────────────────────────────────────────────

  /** Simulate creating a dashboard. */
  async grafanaCreateDashboard(title, panels) {
    try {
      return { success: true, dashboard: { id: Math.floor(Math.random() * 10000), uid: `uid-${Date.now().toString(36)}`, title, panels: panels || [], url: `${this.services.grafana.url}/d/${Date.now().toString(36)}`, created_at: new Date().toISOString() } };
    } catch (err) {
      logger.error(`grafanaCreateDashboard failed: ${err.message}`);
      return { success: false, title, error: err.message };
    }
  }

  /** Simulate listing dashboards. */
  async grafanaGetDashboards() {
    try {
      return [
        { id: 1, uid: 'abc', title: 'Robot Sensors', starred: true },
        { id: 2, uid: 'def', title: 'Child Activity', starred: false },
        { id: 3, uid: 'ghi', title: 'System Health', starred: true },
      ];
    } catch (err) {
      logger.error(`grafanaGetDashboards failed: ${err.message}`);
      return [];
    }
  }

  /** Simulate creating an alert rule. */
  async grafanaCreateAlert(name, query, condition) {
    try {
      return { success: true, alert: { id: Math.floor(Math.random() * 10000), name, query, condition, state: 'pending', created_at: new Date().toISOString() } };
    } catch (err) {
      logger.error(`grafanaCreateAlert failed: ${err.message}`);
      return { success: false, name, error: err.message };
    }
  }

  /** Simulate fetching annotations. */
  async grafanaGetAnnotations() {
    try {
      return [
        { id: 1, text: 'Sensor timeout detected', tags: ['robot', 'error'], time: Date.now() - 7200000 },
        { id: 2, text: 'Backup completed', tags: ['system', 'backup'], time: Date.now() - 14400000 },
      ];
    } catch (err) {
      logger.error(`grafanaGetAnnotations failed: ${err.message}`);
      return [];
    }
  }

  // ── Discovery ─────────────────────────────────────────────

  /** Auto-discover all configured services by attempting to connect. Returns discovery results. */
  async discoverAll() {
    try {
      logger.info('Starting auto-discovery of self-hosted services...');
      const results = await Promise.all(
        this.serviceNames.map(async (name) => {
          const cfg = this.services[name];
          if (!cfg.enabled || !cfg.url) return { service: name, reachable: false, reason: 'not configured' };
          try {
            const res = await this._httpGet(cfg.url);
            return { service: name, reachable: res.ok, latency: res.latency };
          } catch {
            return { service: name, reachable: false, reason: 'connection failed' };
          }
        }),
      );
      this.emit('discovery:complete', results);
      return results;
    } catch (err) {
      logger.error(`discoverAll failed: ${err.message}`);
      return [];
    }
  }

  /** Return a markdown-formatted integration map with status for each service. */
  getIntegrationMap() {
    try {
      const header = '| Service | Enabled | URL | Status |\n|---------|---------|-----|--------|';
      const rows = this.serviceNames.map((name) => {
        const cfg = this.services[name];
        const enabled = cfg.enabled ? '✅' : '❌';
        return `| ${name} | ${enabled} | ${cfg.url} | ${cfg.enabled ? 'configured' : 'disabled'} |`;
      });
      return `${header}\n${rows.join('\n')}`;
    } catch (err) {
      logger.error(`getIntegrationMap failed: ${err.message}`);
      return '';
    }
  }
}

module.exports = SelfHostedHub;
