const RobotHAL = require('../robot/hal');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class RobotManager extends EventEmitter {
  constructor() {
    super();
    this.robots = new Map();
    this.parentBinds = new Map();
    this.commandLog = [];
    this.telemetryArchive = new Map();
    this.maxCommandLog = 5000;
    this.maxTelemetrySamples = 10000;
  }

  createRobot(robotId, ownerId) {
    if (this.robots.has(robotId)) return this.robots.get(robotId);
    const robot = new RobotHAL(robotId);
    robot.ownerId = ownerId;
    robot.on('heartbeat', (status) => this.emit('heartbeat', { robotId, status }));
    robot.on('state', (data) => { this.emit('state', { robotId, ...data }); this._archiveTelemetry(robotId, 'state', data); });
    robot.on('command', (data) => this.emit('command', { robotId, ...data }));
    robot.on('sensor', (data) => { this.emit('sensor', { robotId, ...data }); this._archiveTelemetry(robotId, 'sensor', data); });
    robot.on('speech', (data) => this.emit('speech', { robotId, ...data }));
    robot.on('expression', (data) => this.emit('expression', { robotId, ...data }));
    robot.on('event', (data) => this.emit('event', { robotId, ...data }));
    robot.on('telemetry', (data) => { this.emit('telemetry', { robotId, ...data }); this._archiveTelemetry(robotId, 'telemetry', data); });
    robot.on('error', (data) => { this.emit('error', { robotId, ...data }); this._logCommand(robotId, 'system_error', data); });
    this.robots.set(robotId, robot);
    logger.info('Robot created: ' + robotId + ' owner=' + ownerId);
    return robot;
  }

  getRobot(robotId) {
    return this.robots.get(robotId) || null;
  }

  executeCommand(robotId, command, params) {
    const robot = this.robots.get(robotId);
    if (!robot) return { success: false, error: 'Robot not found' };
    try {
      let result;
      switch (command) {
        case 'move': result = robot.move(params.direction, params.speed); break;
        case 'stop': result = robot.stop(); break;
        case 'speak': result = robot.speak(params.text, params.lang); break;
        case 'express': result = robot.showExpression(params.name); break;
        case 'head': result = robot.moveHead(params.pan, params.tilt); break;
        case 'photo': result = robot.takePhoto(); break;
        case 'detect': result = robot.detectObjects(); break;
        case 'detect_face': result = robot.detectFace(); break;
        case 'temperature': result = robot.readTemperature(); break;
        case 'distance': result = robot.readDistance(params.sensor || 'front'); break;
        case 'wake': result = robot.wake(); break;
        case 'sleep': result = robot.sleep(); break;
        case 'shutdown': result = robot.shutdown(); break;
        case 'charge': result = robot.startCharging(); break;
        case 'charge_stop': result = robot.stopCharging(); break;
        case 'teach': {
          const topic = params.topic || 'general';
          const LESSONS = require('./ai').LESSONS || {};
          const lessonData = LESSONS[topic] || LESSONS[Object.keys(LESSONS).find(k => topic.includes(k))];
          if (lessonData) {
            result = robot.speak(lessonData.summary + (lessonData.example ? ' For example: ' + lessonData.example : '') + (lessonData.tip ? ' Tip: ' + lessonData.tip : ''), params.lang);
          } else {
            result = robot.speak('Let me teach you about ' + topic + '! I have lessons on: ' + Object.keys(LESSONS).slice(0, 8).join(', ') + ' and more.', params.lang);
          }
          break;
        }
        case 'status': result = { success: true, data: robot.getStatus() }; break;
        default: result = { success: false, error: 'Unknown command: ' + command, suggestion: 'Use: move, stop, speak, express, head, photo, detect, wake, sleep, status' };
      }
      this._logCommand(robotId, command, { params, result, timestamp: new Date().toISOString() });
      return result;
    } catch (err) {
      this._logCommand(robotId, command, { params, error: err.message });
      return { success: false, error: err.message };
    }
  }

  getCommandHistory(robotId, limit = 50) {
    const commands = robotId ? this.commandLog.filter(c => c.robotId === robotId) : this.commandLog;
    return commands.slice(-limit).reverse();
  }

  getTelemetryHistory(robotId, type, limit = 100) {
    const archive = this.telemetryArchive.get(robotId);
    if (!archive) return [];
    const samples = type ? archive.filter(s => s.type === type) : archive;
    return samples.slice(-limit);
  }

  getRobotAnalytics(robotId) {
    const robot = this.robots.get(robotId);
    if (!robot) return null;
    const commands = this.commandLog.filter(c => c.robotId === robotId);
    const status = robot.getStatus();
    return {
      robotId,
      state: status.state,
      battery: status.battery,
      uptime: status.uptime || process.uptime(),
      totalCommands: commands.length,
      commandBreakdown: this._groupBy(commands, 'command'),
      successRate: commands.length > 0 ? (commands.filter(c => c.result && c.result.success !== false).length / commands.length * 100).toFixed(1) + '%' : 'N/A',
      lastCommand: commands.length > 0 ? commands[commands.length - 1] : null,
      expression: status.expression,
      health: status.health
    };
  }

  getSystemHealth() {
    const allRobots = Array.from(this.robots.values());
    const statuses = allRobots.map(r => r.getStatus());
    return {
      totalRobots: allRobots.length,
      online: statuses.filter(s => s.state !== 'offline').length,
      offline: statuses.filter(s => s.state === 'offline').length,
      charging: statuses.filter(s => s.charging).length,
      avgBattery: statuses.length > 0 ? (statuses.reduce((sum, s) => sum + (s.battery || 0), 0) / statuses.length).toFixed(0) : 0,
      totalCommands: this.commandLog.length,
      errors24h: this.commandLog.filter(c => c.timestamp && new Date(c.timestamp).getTime() > Date.now() - 86400000 && c.result && c.result.success === false).length
    };
  }

  getAllRobots() {
    return Array.from(this.robots.values()).map(r => ({
      robotId: r.robotId, state: r.state, ownerId: r.ownerId,
      battery: r.sensors ? r.sensors.battery.level : 0,
      expression: r.expression, lastHeartbeat: new Date().toISOString()
    }));
  }

  getRobotsByOwner(ownerId) {
    return Array.from(this.robots.values()).filter(r => r.ownerId === ownerId).map(r => r.getStatus());
  }

  bindParentToRobot(parentId, robotId) {
    if (!this.parentBinds.has(parentId)) this.parentBinds.set(parentId, new Set());
    this.parentBinds.get(parentId).add(robotId);
  }

  unbindParentFromRobot(parentId, robotId) {
    const binds = this.parentBinds.get(parentId);
    if (binds) { binds.delete(robotId); if (binds.size === 0) this.parentBinds.delete(parentId); }
  }

  getRobotsForParent(parentId) {
    const binds = this.parentBinds.get(parentId);
    if (!binds) return [];
    return Array.from(binds).map(id => this.robots.get(id)).filter(Boolean).map(r => r.getStatus());
  }

  removeRobot(robotId) {
    const robot = this.robots.get(robotId);
    if (robot) { robot.shutdown(); this.robots.delete(robotId); logger.info('Robot removed: ' + robotId); }
  }

  _logCommand(robotId, command, data) {
    this.commandLog.push({ robotId, command, ...data, timestamp: data.timestamp || new Date().toISOString() });
    if (this.commandLog.length > this.maxCommandLog) this.commandLog.shift();
  }

  _archiveTelemetry(robotId, type, data) {
    if (!this.telemetryArchive.has(robotId)) this.telemetryArchive.set(robotId, []);
    const archive = this.telemetryArchive.get(robotId);
    archive.push({ type, data, timestamp: new Date().toISOString() });
    if (archive.length > this.maxTelemetrySamples) archive.shift();
  }

  _groupBy(arr, key) {
    const result = {};
    for (const item of arr) {
      const k = item[key] || 'unknown';
      result[k] = (result[k] || 0) + 1;
    }
    return result;
  }
}

module.exports = new RobotManager();
