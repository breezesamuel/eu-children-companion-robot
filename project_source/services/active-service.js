const EventEmitter = require('events');
const logger = require('../utils/logger');

class ActiveService extends EventEmitter {
  constructor() {
    super();
    this.schedules = new Map();
    this.reminders = [];
    this.intervals = {};
    this.userPreferences = new Map();
    this.maxReminders = 1000;
  }

  start() {
    this.intervals.main = setInterval(() => this._tick(), 15000);
    this.intervals.cleanup = setInterval(() => this._cleanup(), 3600000);
    logger.info('ActiveService: Started');
    return this;
  }

  stop() {
    Object.values(this.intervals).forEach(clearInterval);
    this.intervals = {};
    return this;
  }

  _tick() {
    const now = Date.now();
    for (const [id, sched] of this.schedules) {
      if (sched.disabled) continue;
      if (sched.type === 'interval') {
        const elapsed = now - (sched.lastFired || sched.createdAt);
        if (elapsed >= sched.interval) {
          sched.lastFired = now;
          this._fireSchedule(id, sched);
        }
      } else if (sched.type === 'cron') {
        const timeStr = new Date().toTimeString().slice(0, 5);
        if (sched.times.includes(timeStr) && sched.lastFired !== timeStr) {
          sched.lastFired = timeStr;
          this._fireSchedule(id, sched);
        }
      }
    }
    const pendingReminders = this.reminders.filter(r => r.status === 'pending' && new Date(r.fireAt).getTime() <= now);
    for (const reminder of pendingReminders) {
      reminder.status = 'fired';
      reminder.firedAt = new Date().toISOString();
      this.emit('reminder', reminder);
      logger.info('ActiveService: Reminder fired for user ' + reminder.userId + ': ' + reminder.title);
      if (reminder.repeatInterval && reminder.repeatInterval > 0) {
        const nextFireAt = new Date(Date.now() + reminder.repeatInterval).toISOString();
        this.addReminder(reminder.userId, reminder.title, {
          message: reminder.message,
          type: reminder.type,
          priority: reminder.priority,
          repeatInterval: reminder.repeatInterval,
          category: reminder.category,
          metadata: reminder.metadata,
          fireAt: nextFireAt
        });
      }
    }
  }

  _fireSchedule(id, sched) {
    this.emit('schedule', { id, action: sched.action, data: sched.data });
    logger.info('ActiveService: Schedule fired ' + id + ' action=' + sched.action);
  }

  addSchedule(userId, action, options = {}) {
    const id = 'sched_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const schedule = {
      id,
      userId,
      action,
      type: options.type || 'interval',
      interval: options.interval || 3600000,
      times: options.times || [],
      data: options.data || {},
      disabled: false,
      createdAt: Date.now(),
      lastFired: null
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  removeSchedule(id) {
    return this.schedules.delete(id);
  }

  getSchedules(userId) {
    return Array.from(this.schedules.values()).filter(s => s.userId === userId);
  }

  addReminder(userId, title, options = {}) {
    const id = 'rem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const fireAt = options.fireAt || new Date(Date.now() + 3600000).toISOString();
    const reminder = {
      id,
      userId,
      title,
      message: options.message || title,
      type: options.type || 'general',
      fireAt,
      status: 'pending',
      priority: options.priority || 'normal',
      repeatInterval: options.repeatInterval || null,
      category: options.category || 'general',
      metadata: options.metadata || {},
      createdAt: new Date().toISOString(),
      firedAt: null
    };
    this.reminders.push(reminder);
    if (this.reminders.length > this.maxReminders) this.reminders.shift();
    return reminder;
  }

  cancelReminder(id) {
    const idx = this.reminders.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.reminders[idx].status = 'cancelled';
    return true;
  }

  getUserReminders(userId, status) {
    let results = this.reminders.filter(r => r.userId === userId);
    if (status) results = results.filter(r => r.status === status);
    return results.sort((a, b) => new Date(a.fireAt) - new Date(b.fireAt));
  }

  setUserPreference(userId, key, value) {
    if (!this.userPreferences.has(userId)) this.userPreferences.set(userId, {});
    this.userPreferences.get(userId)[key] = value;
    return { success: true };
  }

  getUserPreference(userId, key) {
    const prefs = this.userPreferences.get(userId);
    return prefs ? prefs[key] : null;
  }

  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {};
  }

  getUpcomingReminders(userId, max = 5) {
    const now = new Date().toISOString();
    return this.reminders
      .filter(r => r.userId === userId && r.status === 'pending' && r.fireAt >= now)
      .sort((a, b) => new Date(a.fireAt) - new Date(b.fireAt))
      .slice(0, max);
  }

  getMissedReminders(userId) {
    const now = Date.now();
    return this.reminders.filter(r =>
      r.userId === userId && r.status === 'pending' && new Date(r.fireAt).getTime() <= now
    );
  }

  suggestActivity(userId, age, context) {
    const hour = new Date().getHours();
    const suggestions = [];
    if (hour >= 6 && hour < 8) {
      suggestions.push({ type: 'morning_routine', title: 'Morning Stretch', desc: 'Time to wake up and stretch!', duration: 5 });
      suggestions.push({ type: 'morning_routine', title: 'Brush Your Teeth', desc: 'Start the day with a clean smile!', duration: 2 });
    } else if (hour >= 8 && hour < 12) {
      suggestions.push({ type: 'learning', title: 'Learning Time', desc: 'Let\'s learn something new today!', duration: 20 });
      suggestions.push({ type: 'activity', title: 'Outdoor Play', desc: 'Time to play outside!', duration: 30 });
    } else if (hour >= 12 && hour < 14) {
      suggestions.push({ type: 'meal', title: 'Lunch Time', desc: 'Eat a healthy lunch!', duration: 20 });
      suggestions.push({ type: 'rest', title: 'Quiet Time', desc: 'Time to rest and relax.', duration: 15 });
    } else if (hour >= 14 && hour < 17) {
      suggestions.push({ type: 'creative', title: 'Creative Time', desc: 'Draw, paint, or build something!', duration: 25 });
      suggestions.push({ type: 'learning', title: 'Reading Time', desc: 'Let\'s read a story together!', duration: 15 });
    } else if (hour >= 17 && hour < 19) {
      suggestions.push({ type: 'dinner', title: 'Dinner Time', desc: 'Time for a healthy dinner!', duration: 20 });
      suggestions.push({ type: 'family', title: 'Family Time', desc: 'Spend time with your family.', duration: 30 });
    } else if (hour >= 19 && hour < 21) {
      suggestions.push({ type: 'wind_down', title: 'Wind Down', desc: 'Quiet activities before bedtime.', duration: 20 });
      suggestions.push({ type: 'bedtime', title: 'Bedtime Story', desc: 'Let me read you a bedtime story!', duration: 10 });
    } else {
      suggestions.push({ type: 'rest', title: 'Sleep Time', desc: 'Time to get a good night\'s sleep!', duration: 0 });
    }
    return { success: true, data: suggestions };
  }

  getStats() {
    return {
      activeSchedules: this.schedules.size,
      pendingReminders: this.reminders.filter(r => r.status === 'pending').length,
      firedReminders: this.reminders.filter(r => r.status === 'fired').length,
      usersWithPreferences: this.userPreferences.size
    };
  }

  _cleanup() {
    const cutoff = Date.now() - 7 * 24 * 3600000;
    this.reminders = this.reminders.filter(r =>
      !(r.status === 'fired' && new Date(r.firedAt).getTime() < cutoff)
    );
  }
}

module.exports = new ActiveService();
