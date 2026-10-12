const EventEmitter = require('events');
const tts = require('../services/tts');
const contentService = require('../services/content-service');

const SENSOR_DEFAULTS = {
  camera: { active: false, resolution: '1080p', lastFrame: null },
  microphone: { active: false, sampleRate: 16000, lastAudio: null },
  temperature: { value: 24.5, unit: 'celsius' },
  touch: { head: false, hand: false, chest: false },
  infrared: { left: false, right: false, front: false },
  accelerometer: { x: 0.0, y: 0.0, z: 9.8 },
  ultrasonic: { front: 0, left: 0, right: 0 },
  battery: { level: 85, charging: false, voltage: 3.7 },
  gyroscope: { pitch: 0, roll: 0, yaw: 0 }
};

const ACTUATOR_DEFAULTS = {
  speaker: { volume: 70, playing: false, currentTrack: null },
  ledMatrix: { brightness: 80, pattern: 'idle', color: '#FF6B35' },
  wheels: { leftSpeed: 0, rightSpeed: 0, direction: 'stopped' },
  arm: { position: 'rest', angle: 0, grip: 'closed' },
  display: { brightness: 75, screenOn: true, currentView: 'home' },
  head: { pan: 0, tilt: 0 }
};

const EXPRESSIONS = {
  happy: '😊', sad: '😢', thinking: '🤔', excited: '🎉',
  love: '❤️', surprised: '😮', sleepy: '😴', confused: '😕',
  proud: '😌', listening: '👂', talking: '💬', idle: '😐'
};

const STATES = ['offline', 'booting', 'online', 'sleeping', 'busy', 'error', 'charging'];

class RobotHAL extends EventEmitter {
  constructor(robotId = 'robomate-001') {
    super();
    this.robotId = robotId;
    this.state = 'offline';
    this.sensors = JSON.parse(JSON.stringify(SENSOR_DEFAULTS));
    this.actuators = JSON.parse(JSON.stringify(ACTUATOR_DEFAULTS));
    this.expression = 'idle';
    this.health = { cpu: 0, memory: 0, storage: 0, uptime: 0 };
    this.commandLog = [];
    this._heartbeatInterval = null;
    this._simulationInterval = null;
    this.bootTime = null;
  }

  start() {
    this.state = 'booting';
    this.emit('state', { robotId: this.robotId, state: 'booting' });
    setTimeout(() => {
      this.state = 'online';
      this.bootTime = Date.now();
      this.emit('state', { robotId: this.robotId, state: 'online' });
      this._startHeartbeat();
      this._startSimulation();
      this.expression = 'happy';
      this._log('System booted successfully');
    }, 2000);
    return this;
  }

  shutdown() {
    this.state = 'offline';
    this._stopHeartbeat();
    this._stopSimulation();
    this.emit('state', { robotId: this.robotId, state: 'offline' });
    this._log('System shutdown');
    return { success: true, state: 'offline' };
  }

  sleep() {
    if (this.state !== 'online') return { success: false, error: 'Can only sleep from online state', state: this.state };
    this.state = 'sleeping';
    this.actuators.display.screenOn = false;
    this.actuators.ledMatrix.brightness = 5;
    this.expression = 'sleepy';
    this.emit('state', { robotId: this.robotId, state: 'sleeping' });
    this._log('Entering sleep mode');
    return { success: true, state: 'sleeping' };
  }

  wake() {
    if (this.state !== 'sleeping') return { success: false, error: 'Can only wake from sleeping state', state: this.state };
    this.state = 'online';
    this.actuators.display.screenOn = true;
    this.actuators.ledMatrix.brightness = 80;
    this.expression = 'happy';
    this.emit('state', { robotId: this.robotId, state: 'online' });
    this._log('Woke from sleep');
    return { success: true, state: 'online' };
  }

  startCharging() {
    this.sensors.battery.charging = true;
    this.state = 'charging';
    this.emit('state', { robotId: this.robotId, state: 'charging' });
    this._log('Charging started');
    return { success: true, state: 'charging', battery: this.sensors.battery };
  }

  stopCharging() {
    this.sensors.battery.charging = false;
    if (this.state === 'charging') {
      this.state = 'online';
      this.emit('state', { robotId: this.robotId, state: 'online' });
    }
    this._log('Charging stopped');
    return { success: true, state: this.state, battery: this.sensors.battery };
  }

  move(direction, speed = 50) {
    if (this.state !== 'online') return { error: 'Robot not online' };
    speed = Math.max(0, Math.min(100, speed));
    const dirMap = {
      forward: { leftSpeed: speed, rightSpeed: speed, direction: 'forward' },
      backward: { leftSpeed: -speed, rightSpeed: -speed, direction: 'backward' },
      left: { leftSpeed: -speed * 0.5, rightSpeed: speed, direction: 'left' },
      right: { leftSpeed: speed, rightSpeed: -speed * 0.5, direction: 'right' },
      stop: { leftSpeed: 0, rightSpeed: 0, direction: 'stopped' }
    };
    const cmd = dirMap[direction] || dirMap.stop;
    Object.assign(this.actuators.wheels, cmd);
    this.expression = 'excited';
    this._log(`Move: ${direction} speed=${speed}`);
    this.emit('command', { type: 'move', direction, speed });
    this.emit('telemetry', { wheels: this.actuators.wheels });
    return { success: true, direction, speed, state: this.actuators.wheels };
  }

  speak(text, lang = 'en') {
    if (this.state === 'offline') return { error: 'Robot offline' };
    this.actuators.speaker.playing = true;
    this.actuators.speaker.currentTrack = text.slice(0, 50);
    this.expression = 'talking';
    this._log(`Speak: "${text.slice(0, 60)}..." [${lang}]`);
    this.emit('speech', { text, lang });
    tts.speak(text, { lang }).then(result => {
      if (result.success) {
        this.actuators.speaker.audioData = result.audio;
        this.emit('telemetry', { speaker: { ...this.actuators.speaker, ttsResult: 'ok' } });
      }
    }).catch(() => {});
    const duration = Math.max(1000, text.length * 60);
    setTimeout(() => {
      this.actuators.speaker.playing = false;
      this.actuators.speaker.currentTrack = null;
      this.expression = 'idle';
      this.emit('telemetry', { speaker: this.actuators.speaker });
    }, duration);
    return { success: true, duration, text: text.slice(0, 60), ttsAvailable: tts.isAvailable };
  }

  showExpression(name) {
    if (!EXPRESSIONS[name]) return { error: `Unknown expression: ${name}` };
    this.expression = name;
    this.actuators.ledMatrix.pattern = name;
    this.emit('expression', { expression: name, emoji: EXPRESSIONS[name] });
    this._log(`Expression: ${name}`);
    return { success: true, expression: name, emoji: EXPRESSIONS[name] };
  }

  capturePhoto() {
    if (this.sensors.camera.active === false && this.state === 'online') {
      this.sensors.camera.active = true;
    }
    const photo = {
      id: `photo_${Date.now()}`,
      timestamp: new Date().toISOString(),
      resolution: this.sensors.camera.resolution,
      size: `${Math.floor(Math.random() * 2000 + 500)}KB`,
      simulated: true
    };
    this.sensors.camera.lastFrame = photo.id;
    this._log(`Photo captured: ${photo.id}`);
    this.emit('sensor', { camera: photo });
    return { success: true, photo };
  }

  detectObjects() {
    const objects = [
      { name: 'person', confidence: 0.95, bbox: [120, 80, 300, 450] },
      { name: 'chair', confidence: 0.88, bbox: [400, 200, 150, 200] },
      { name: 'table', confidence: 0.76, bbox: [50, 300, 500, 100] }
    ];
    const person = objects.find(o => o.name === 'person');
    if (person) this.expression = 'happy';
    this._log(`Detected ${objects.length} objects`);
    this.emit('sensor', { objects });
    return { success: true, objects, count: objects.length, personDetected: !!person };
  }

  detectFace() {
    const faces = [
      { age: 7, emotion: 'happy', confidence: 0.92, name: null },
      { age: 35, emotion: 'smiling', confidence: 0.85, name: null }
    ];
    this._log(`Detected ${faces.length} faces`);
    this.emit('sensor', { faces });
    return { success: true, faces, count: faces.length };
  }

  readTemperature() {
    const variance = (Math.random() - 0.5) * 2;
    this.sensors.temperature.value = +(24.5 + variance).toFixed(1);
    this.emit('sensor', { temperature: this.sensors.temperature });
    return { success: true, ...this.sensors.temperature };
  }

  readDistance() {
    this.sensors.ultrasonic.front = Math.floor(Math.random() * 300 + 20);
    this.sensors.ultrasonic.left = Math.floor(Math.random() * 200 + 10);
    this.sensors.ultrasonic.right = Math.floor(Math.random() * 200 + 10);
    this.emit('sensor', { ultrasonic: this.sensors.ultrasonic });
    return { success: true, ...this.sensors.ultrasonic };
  }

  detectTouch() {
    this.sensors.touch.head = Math.random() > 0.7;
    this.sensors.touch.hand = Math.random() > 0.8;
    this.sensors.touch.chest = Math.random() > 0.9;
    this.emit('sensor', { touch: this.sensors.touch });
    return { success: true, ...this.sensors.touch };
  }

  getStatus() {
    return {
      robotId: this.robotId,
      state: this.state,
      uptime: this.bootTime ? Math.floor((Date.now() - this.bootTime) / 1000) : 0,
      battery: this.sensors.battery,
      sensors: {
        camera: this.sensors.camera.active,
        microphone: this.sensors.microphone.active,
        temperature: this.sensors.temperature.value,
        touch: Object.values(this.sensors.touch).some(v => v === true),
        ultrasonic: this.sensors.ultrasonic.front
      },
      actuators: {
        speaker: this.actuators.speaker.playing,
        wheels: this.actuators.wheels.direction,
        display: this.actuators.display.screenOn,
        ledMatrix: this.actuators.ledMatrix.pattern
      },
      expression: this.expression,
      emoji: EXPRESSIONS[this.expression],
      health: this.health
    };
  }

  executeCommand(cmd) {
    const [action, ...args] = cmd.toLowerCase().split(/\s+/);
    switch (action) {
      case 'move': case 'go': case 'walk': case 'drive':
        return this.move(args[0] || 'forward', parseInt(args[1]) || 50);
      case 'stop': case 'halt':
        return this.move('stop');
      case 'speak': case 'say': case 'tell': case 'sing':
        return this.speak(args.join(' ') || 'Hello!');
      case 'express': case 'show': case 'face':
        if (args[0] === 'emotion' || args[0] === 'expression') args.shift();
        return this.showExpression(args[0] || 'happy');
      case 'photo': case 'capture': case 'picture': case 'take':
        return this.capturePhoto();
      case 'detect': case 'look': case 'see': case 'scan':
        if (args.includes('face') || args.includes('person')) return this.detectFace();
        return this.detectObjects();
      case 'temperature': case 'temp': case 'hot': case 'cold':
        return this.readTemperature();
      case 'distance': case 'ultrasonic': case 'obstacle':
        return this.readDistance();
      case 'touch': case 'feel': case 'pat':
        return this.detectTouch();
      case 'sleep': case 'rest': case 'nap':
        return this.sleep();
      case 'wake': case 'awake': case 'hello':
        return this.wake();
      case 'charge': case 'battery':
        if (args[0] === 'stop' || args[0] === 'off') return this.stopCharging();
        return this.startCharging();
      case 'status': case 'state': case 'health':
        return this.getStatus();
      case 'shutdown': case 'poweroff': case 'off':
        return this.shutdown();
      case 'teach': case 'learn': case 'explain': case 'lesson':
        return this._teach(args.join(' '));
      case 'head':
        if (args[0] === 'pan' && args[1] !== undefined) {
          this.actuators.head.pan = Math.max(-90, Math.min(90, parseInt(args[1]) || 0));
        } else if (args[0] === 'tilt' && args[1] !== undefined) {
          this.actuators.head.tilt = Math.max(-30, Math.min(30, parseInt(args[1]) || 0));
        } else if (args.length === 2 && !isNaN(parseInt(args[0]))) {
          this.actuators.head.pan = Math.max(-90, Math.min(90, parseInt(args[0]) || 0));
          this.actuators.head.tilt = Math.max(-30, Math.min(30, parseInt(args[1]) || 0));
        }
        this._log(`Head: pan=${this.actuators.head.pan} tilt=${this.actuators.head.tilt}`);
        return { success: true, position: { pan: this.actuators.head.pan, tilt: this.actuators.head.tilt } };
      default:
        return { error: `Unknown command: "${action}". Try: move, speak, teach, express, photo, detect, temperature, touch, sleep, status` };
    }
  }

  _teach(topic) {
    if (!topic) {
      const cats = contentService.getStats().byCategory;
      const topCats = Object.keys(cats).slice(0, 6);
      return {
        success: true,
        message: 'What would you like to learn about? I can teach: ' + topCats.join(', '),
        categories: Object.keys(cats)
      };
    }
    const results = contentService.search(topic, { limit: 3 });
    if (results.total === 0) {
      return {
        success: true,
        message: `I could not find any lessons about "${topic}". Try asking about: animals, math, science, history, vocabulary, or space!`
      };
    }
    const lesson = results.data[0];
    const ttsResult = this.speak(lesson.title + '. ' + lesson.content.slice(0, 500));
    return {
      success: true,
      topic,
      lesson: {
        title: lesson.title,
        category: lesson.category,
        content: lesson.content,
        wordCount: lesson.wordCount,
        difficulty: lesson.title.includes('(Advanced)') ? 'advanced' : lesson.title.includes('(Intermediate)') ? 'intermediate' : 'basic'
      },
      tts: ttsResult
    };
  }

  _log(msg) {
    const entry = { timestamp: new Date().toISOString(), message: msg };
    this.commandLog.push(entry);
    if (this.commandLog.length > 100) this.commandLog.shift();
  }

  _startHeartbeat() {
    const tick = () => {
      if (this.state === 'offline') return;
      this.health.uptime = this.bootTime ? Math.floor((Date.now() - this.bootTime) / 1000) : 0;
      this.health.cpu = +(Math.random() * 30 + 10).toFixed(1);
      this.health.memory = +(Math.random() * 40 + 20).toFixed(1);
      this.health.storage = +(Math.random() * 10 + 45).toFixed(1);
      if (!this.sensors.battery.charging) {
        this.sensors.battery.level = Math.max(0, this.sensors.battery.level - 0.05 * (1 + this.actuators.wheels.direction !== 'stopped'));
        this.sensors.battery.level = +this.sensors.battery.level.toFixed(1);
      } else {
        this.sensors.battery.level = Math.min(100, this.sensors.battery.level + 0.1);
        this.sensors.battery.level = +this.sensors.battery.level.toFixed(1);
      }
      if (this.sensors.battery.level < 5 && this.state === 'online') {
        this.sleep();
        this._log('Low battery - entering sleep');
      }
      if (this.sensors.battery.level >= 95 && this.sensors.battery.charging) {
        this._log('Battery fully charged');
      }
      this.emit('heartbeat', this.getStatus());
    };
    this._heartbeatInterval = setInterval(tick, 5000);
    tick();
  }

  _stopHeartbeat() { if (this._heartbeatInterval) { clearInterval(this._heartbeatInterval); this._heartbeatInterval = null; } }

  _startSimulation() {
    this._simulationInterval = setInterval(() => {
      if (this.state === 'online' && Math.random() > 0.97) {
        this.emit('event', { type: 'ambient', message: 'Child approaching', confidence: Math.random() * 0.3 + 0.7 });
      }
    }, 10000);
  }

  _stopSimulation() { if (this._simulationInterval) { clearInterval(this._simulationInterval); this._simulationInterval = null; } }

  getLog() { return this.commandLog; }
}

RobotHAL.EXPRESSIONS = EXPRESSIONS;
RobotHAL.STATES = STATES;
module.exports = RobotHAL;
