const EventEmitter = require('events');
const logger = require('../utils/logger');

class AlertService extends EventEmitter {
  constructor() {
    super();
    this.alerts = [];
    this.parentSubscriptions = new Map();
    this.emailQueue = [];
    this.pushQueue = [];
    this.smsQueue = [];
    this.alertChannels = ['in_app', 'push', 'email', 'sms'];
    this.escalationRules = [];
    this.maxAlerts = 2000;
  }

  sendAlert(userId, alert) {
    const entry = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      userId,
      type: alert.type || 'info',
      category: alert.category || 'general',
      title: alert.title,
      message: alert.message,
      priority: alert.priority || 'normal',
      robotId: alert.robotId || null,
      data: alert.data || null,
      channels: alert.channels || ['in_app'],
      read: false,
      acknowledged: false,
      createdAt: new Date().toISOString(),
      expiresAt: alert.expiresAt || null
    };

    this.alerts.push(entry);
    if (this.alerts.length > this.maxAlerts) this.alerts.shift();
    this.emit('alert', entry);
    this._dispatch(entry);
    return entry;
  }

  _dispatch(alert) {
    for (const channel of alert.channels) {
      if (channel === 'email') this.emailQueue.push(alert);
      else if (channel === 'push') this.pushQueue.push(alert);
      else if (channel === 'sms') this.smsQueue.push(alert);
    }
    const userSubs = this.parentSubscriptions.get(alert.userId);
    if (userSubs) {
      for (const cb of userSubs) {
        try { cb(alert); } catch (e) {}
      }
    }
  }

  sendChildAlert(parentId, childName, type, details, priority) {
    const alertTypes = {
      safety: { title: '⚠️ Safety Alert: ' + childName, priority: 'critical', category: 'safety' },
      emotion: { title: '❤️ Emotion Update: ' + childName, priority: 'high', category: 'emotion' },
      learning: { title: '📚 Learning Update: ' + childName, priority: 'normal', category: 'learning' },
      health: { title: '🏥 Health Alert: ' + childName, priority: 'high', category: 'health' },
      location: { title: '📍 Location Alert: ' + childName, priority: 'critical', category: 'safety' },
      achievement: { title: '🏆 Achievement: ' + childName, priority: 'low', category: 'learning' },
      routine: { title: '⏰ Routine: ' + childName, priority: 'normal', category: 'routine' }
    };
    const config = alertTypes[type] || { title: '🔔 Notification: ' + childName, priority: 'normal', category: 'general' };
    return this.sendAlert(parentId, {
      type, category: config.category, priority: priority || config.priority,
      title: config.title, message: details, robotId: 'robomate-001',
      channels: ['in_app', 'push']
    });
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) { alert.acknowledged = true; alert.read = true; }
    return alert;
  }

  getAlerts(userId, filters = {}) {
    let results = this.alerts.filter(a => a.userId === userId);
    if (filters.type) results = results.filter(a => a.type === filters.type);
    if (filters.category) results = results.filter(a => a.category === filters.category);
    if (filters.priority) results = results.filter(a => a.priority === filters.priority);
    if (filters.unread) results = results.filter(a => !a.read);
    if (filters.acknowledged !== undefined) results = results.filter(a => a.acknowledged === filters.acknowledged);
    const limit = parseInt(filters.limit) || 50;
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  getUnreadCount(userId) {
    return this.alerts.filter(a => a.userId === userId && !a.read).length;
  }

  markRead(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) alert.read = true;
    return alert;
  }

  markAllRead(userId) {
    this.alerts.filter(a => a.userId === userId).forEach(a => { a.read = true; });
  }

  subscribeParent(parentId, callback) {
    if (!this.parentSubscriptions.has(parentId)) this.parentSubscriptions.set(parentId, []);
    this.parentSubscriptions.get(parentId).push(callback);
  }

  unsubscribeParent(parentId, callback) {
    const subs = this.parentSubscriptions.get(parentId);
    if (subs) {
      this.parentSubscriptions.set(parentId, subs.filter(cb => cb !== callback));
    }
  }

  getRecentAlerts(userId, minutes = 60) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.alerts.filter(a => a.userId === userId && new Date(a.createdAt).getTime() > cutoff);
  }

  addEscalationRule(name, condition, actions) {
    const rule = { id: 'esc_' + Date.now(), name, condition, actions, enabled: true, createdAt: new Date().toISOString() };
    this.escalationRules.push(rule);
    return rule;
  }

  getEscalationRules() {
    return this.escalationRules;
  }

  getAlertStats(userId) {
    const userAlerts = userId ? this.alerts.filter(a => a.userId === userId) : this.alerts;
    return {
      total: userAlerts.length,
      unread: userAlerts.filter(a => !a.read).length,
      acknowledged: userAlerts.filter(a => a.acknowledged).length,
      byType: this._groupBy(userAlerts, 'type'),
      byPriority: this._groupBy(userAlerts, 'priority'),
      byCategory: this._groupBy(userAlerts, 'category'),
      emailPending: this.emailQueue.length,
      pushPending: this.pushQueue.length
    };
  }

  _groupBy(arr, key) {
    const result = {};
    for (const item of arr) {
      const k = item[key] || 'unknown';
      result[k] = (result[k] || 0) + 1;
    }
    return result;
  }

  clearOldAlerts(days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => new Date(a.createdAt).getTime() > cutoff || !a.read);
  }
}

module.exports = new AlertService();
