/**
 * Robot Hardware Simulator (Digital Twin)
 * Run: node robot/simulator.js [--scenario <name>] [--headless]
 *
 * Simulates a complete robot hardware environment on PC:
 *  - Virtual sensors (camera, ultrasonic, temperature, touch, IMU, battery)
 *  - Virtual actuators (speaker, LED matrix, wheels, arm, display, head)
 *  - Scenario scripting (battery drain, obstacle, face detection, network loss)
 *  - Telemetry streaming via stdout/WebSocket
 *  - No physical hardware required
 */
const RobotHAL = require('./hal');
const EventEmitter = require('events');

// ── Simulation Modes ──────────────────────────────────────
const SCENARIOS = {
  'normal-operation': {
    desc: 'Standard daily operation with occasional events',
    duration: 60000,
    script: [
      { at: 0, action: 'boot' },
      { at: 2000, action: 'teach', topic: 'dinosaurs' },
      { at: 5000, action: 'move', dir: 'forward', speed: 50, dur: 3000 },
      { at: 10000, action: 'detect' },
      { at: 15000, action: 'photo' },
      { at: 20000, action: 'express', name: 'happy' },
      { at: 25000, action: 'speak', text: 'I love learning about dinosaurs!' },
      { at: 30000, action: 'temperature' },
      { at: 35000, action: 'distance' },
      { at: 40000, action: 'sleep' },
      { at: 42000, action: 'wake' },
      { at: 50000, action: 'touch' },
      { at: 55000, action: 'shutdown' },
    ]
  },
  'battery-drain': {
    desc: 'Battery depletion from 100% to 0% with auto-sleep',
    script: [
      { at: 0, action: 'boot' },
      { at: 3000, action: 'move', dir: 'forward', speed: 80, dur: 5000 },
      { at: 10000, action: 'force-drain', level: 3 },
    ]
  },
  'obstacle-course': {
    desc: 'Navigates obstacles with real-time distance readings',
    script: [
      { at: 0, action: 'boot' },
      { at: 3000, action: 'move', dir: 'forward', speed: 40, dur: 2000 },
      { at: 6000, action: 'sim-obstacle', dist: 15 },
      { at: 7000, action: 'move', dir: 'left', speed: 50, dur: 2000 },
      { at: 10000, action: 'sim-obstacle', dist: 10 },
      { at: 11000, action: 'move', dir: 'right', speed: 50, dur: 2000 },
    ]
  },
  'network-loss': {
    desc: 'Simulates network disconnection and reconnection',
    script: [
      { at: 0, action: 'boot' },
      { at: 5000, action: 'speak', text: 'Checking connection...' },
      { at: 8000, action: 'sim-network', status: 'offline' },
      { at: 12000, action: 'speak', text: 'No network, using offline mode' },
      { at: 18000, action: 'sim-network', status: 'online' },
      { at: 22000, action: 'speak', text: 'Connection restored!' },
    ]
  },
  'sensor-overload': {
    desc: 'Rapid sensor readings to test overflow handling',
    script: [
      { at: 0, action: 'boot' },
      { at: 3000, action: 'burst-sensors', count: 100, interval: 10 },
      { at: 5000, action: 'burst-commands', count: 50, interval: 5 },
    ]
  },
  'face-interaction': {
    desc: 'Face detection and emotion tracking over time',
    script: [
      { at: 0, action: 'boot' },
      { at: 3000, action: 'detect-face' },
      { at: 6000, action: 'express', name: 'happy' },
      { at: 10000, action: 'detect-face' },
      { at: 15000, action: 'speak', text: 'I see you! How are you today?' },
      { at: 20000, action: 'detect-face' },
    ]
  },
  'full-system-stress': {
    desc: 'All systems running simultaneously with stress',
    duration: 120000,
    script: [
      { at: 0, action: 'boot' },
      { at: 3000, action: 'speak', text: 'System self-test initiated...' },
      { at: 5000, action: 'stress-move', patterns: 10 },
      { at: 15000, action: 'stress-sensors', rounds: 20 },
      { at: 30000, action: 'speak', text: 'Stress test in progress, all nominal.' },
      { at: 45000, action: 'burst-sensors', count: 200, interval: 5 },
      { at: 60000, action: 'speak', text: 'Starting second phase...' },
      { at: 70000, action: 'burst-commands', count: 100, interval: 2 },
      { at: 90000, action: 'speak', text: 'Stress test complete, all systems operational.' },
    ]
  }
};

// ── Simulator Class ───────────────────────────────────────
class RobotSimulator extends EventEmitter {
  constructor(robotId = 'sim-001') {
    super();
    this.robot = new RobotHAL(robotId);
    this.robotId = robotId;
    this.scenario = null;
    this.scenarioTimer = null;
    this.telemetryInterval = null;
    this.networkStatus = 'online';
    this.running = false;
    this.stats = { commands: 0, sensorReadings: 0, telemetrySent: 0, errors: 0 };
  }

  async runScenario(scenarioName) {
    const scenario = SCENARIOS[scenarioName];
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioName}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
    
    this.scenario = scenarioName;
    this.running = true;
    this._log(`Starting scenario: ${scenarioName} - ${scenario.desc}`);

    // Start telemetry streaming
    this._startTelemetry();

    // Forward robot events
    const wrap = (event) => (data) => this.emit(event, { ...data, simulator: true, scenario: scenarioName });
    this.robot.on('heartbeat', wrap('heartbeat'));
    this.robot.on('state', wrap('state'));
    this.robot.on('sensor', wrap('sensor'));
    this.robot.on('command', wrap('command'));
    this.robot.on('speech', wrap('speech'));
    this.robot.on('event', wrap('event'));
    this.robot.on('telemetry', wrap('telemetry'));

    // Execute script
    if (scenario.script) {
      for (const step of scenario.script) {
        if (!this.running) break;
        await this._delay(step.at - (this._scriptElapsed || 0));
        this._scriptElapsed = step.at;
        await this._executeAction(step);
      }
    }

    // Run for duration then shutdown
    const dur = scenario.duration || 30000;
    this._log(`Scenario running for ${dur}ms...`);
    await this._delay(dur - (this._scriptElapsed || 0));

    if (this.running) {
      this.robot.shutdown();
      this._stopTelemetry();
      this.running = false;
      this._log(`Scenario "${scenarioName}" complete. Stats: ${JSON.stringify(this.stats)}`);
    }

    return this.stats;
  }

  async _executeAction(step) {
    try {
      switch (step.action) {
        case 'boot':
          this.robot.start();
          this._log('System booting...');
          break;
        case 'shutdown':
          this.robot.shutdown();
          this._log('System shutdown');
          break;
        case 'move':
          this.robot.move(step.dir, step.speed);
          this._log(`Moving ${step.dir} at speed ${step.speed}`);
          if (step.dur) {
            await this._delay(step.dur);
            this.robot.move('stop');
            this._log('Stopped');
          }
          break;
        case 'speak':
          this.robot.speak(step.text);
          this._log(`Speaking: "${step.text.slice(0, 40)}..."`);
          break;
        case 'express':
          this.robot.showExpression(step.name);
          this._log(`Expression: ${step.name}`);
          break;
        case 'detect':
          this.robot.detectObjects();
          this._log('Object detection');
          break;
        case 'detect-face':
          this.robot.detectFace();
          this._log('Face detection');
          break;
        case 'photo':
          this.robot.capturePhoto();
          this._log('Photo captured');
          break;
        case 'temperature':
          this.robot.readTemperature();
          this._log(`Temperature: ${this.robot.sensors.temperature.value}°C`);
          break;
        case 'distance':
          this.robot.readDistance();
          this._log(`Distance front: ${this.robot.sensors.ultrasonic.front}cm`);
          break;
        case 'touch':
          this.robot.detectTouch();
          this._log(`Touch head:${this.robot.sensors.touch.head} hand:${this.robot.sensors.touch.hand} chest:${this.robot.sensors.touch.chest}`);
          break;
        case 'sleep':
          this.robot.sleep();
          this._log('Sleep mode');
          break;
        case 'wake':
          this.robot.wake();
          this._log('Wake up');
          break;
        case 'teach':
          const result = this.robot._teach(step.topic);
          this._log(`Teach: "${step.topic}" - ${result.message || 'Lesson found'}`);
          break;
        case 'force-drain':
          this.robot.sensors.battery.level = step.level;
          this._log(`Battery forced to ${step.level}%`);
          break;
        case 'sim-obstacle':
          this.robot.sensors.ultrasonic.front = step.dist;
          this._log(`Obstacle at ${step.dist}cm`);
          break;
        case 'sim-network':
          this.networkStatus = step.status;
          if (step.status === 'offline') {
            this.robot.state = 'offline';
            this._log('Network DISCONNECTED');
          } else {
            this.robot.state = 'online';
            this._log('Network RECONNECTED');
          }
          this.emit('network', { status: step.status, timestamp: Date.now() });
          break;
        case 'burst-sensors':
          this._log(`Burst: reading sensors ${step.count}x @ ${step.interval}ms`);
          for (let i = 0; i < step.count && this.running; i++) {
            this.robot.readTemperature();
            this.robot.readDistance();
            this.robot.detectTouch();
            this.stats.sensorReadings += 3;
            await this._delay(step.interval);
          }
          this._log(`Burst complete: ${step.count} sensor cycles`);
          break;
        case 'burst-commands':
          this._log(`Burst: ${step.count} rapid commands @ ${step.interval}ms`);
          const cmds = ['say hello', 'move forward', 'express happy', 'temperature', 'distance', 'status'];
          for (let i = 0; i < step.count && this.running; i++) {
            const cmd = cmds[i % cmds.length];
            this.robot.executeCommand(cmd);
            this.stats.commands++;
            await this._delay(step.interval);
          }
          this._log(`Burst complete: ${step.count} commands`);
          break;
        case 'stress-move':
          const dirs = ['forward', 'backward', 'left', 'right', 'stop'];
          for (let i = 0; i < step.patterns; i++) {
            const dir = dirs[i % dirs.length];
            this.robot.move(dir, 30 + Math.random() * 70);
            await this._delay(500);
          }
          this._log(`Stress move: ${step.patterns} patterns`);
          break;
        case 'stress-sensors':
          for (let i = 0; i < step.rounds; i++) {
            this.robot.readTemperature();
            this.robot.readDistance();
            this.robot.detectTouch();
            this.robot.capturePhoto();
            this.robot.detectObjects();
            this.stats.sensorReadings += 5;
            await this._delay(200);
          }
          this._log(`Stress sensors: ${step.rounds} rounds`);
          break;
        default:
          this._log(`Unknown action: ${step.action}`);
      }
      this.stats.commands++;
    } catch (err) {
      this.stats.errors++;
      this._log(`Action error: ${err.message}`);
    }
  }

  _startTelemetry() {
    this.telemetryInterval = setInterval(() => {
      if (!this.running) return;
      const status = this.robot.getStatus();
      status.simulator = true;
      status.scenario = this.scenario;
      status.networkStatus = this.networkStatus;
      status.stats = this.stats;
      this.stats.telemetrySent++;
      this.emit('telemetry-sample', status);
    }, 2000);
  }

  _stopTelemetry() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  stop() {
    this.running = false;
    this.robot.shutdown();
    this._stopTelemetry();
    if (this.scenarioTimer) { clearTimeout(this.scenarioTimer); this.scenarioTimer = null; }
    this._log('Simulator stopped');
  }

  _delay(ms) { return new Promise(r => { this.scenarioTimer = setTimeout(r, ms); }); }
  _log(msg) { console.log(`[SIM ${new Date().toLocaleTimeString()}] ${msg}`); }

  getStatus() {
    return {
      robotId: this.robotId,
      running: this.running,
      scenario: this.scenario,
      network: this.networkStatus,
      state: this.robot.state,
      battery: this.robot.sensors.battery,
      stats: this.stats
    };
  }
}

// ── CLI Entry ─────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const scenarioName = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : 'normal-operation';
  const headless = args.includes('--headless');
  const listScenarios = args.includes('--list');

  if (listScenarios) {
    console.log('\nAvailable Scenarios:');
    for (const [name, s] of Object.entries(SCENARIOS)) {
      console.log(`  ${name.padEnd(25)} ${s.desc}${s.duration ? ` (${s.duration/1000}s)` : ''}`);
    }
    process.exit(0);
  }

  console.log(`\n═══ Robot Hardware Simulator (Digital Twin) ═══`);
  console.log(`Scenario: ${scenarioName}`);
  console.log(`Headless: ${headless}`);
  console.log(`Starting...\n`);

  const sim = new RobotSimulator('sim-robomate');
  
  sim.on('telemetry-sample', (status) => {
    if (!headless) {
      process.stdout.clearLine?.();
      process.stdout.cursorTo?.(0);
      process.stdout.write(`State:${status.state} Bat:${status.battery.level}% CPU:${status.health.cpu}% Mem:${status.health.memory}% Cmds:${status.stats.commands} Sensors:${status.stats.sensorReadings}`);
    }
  });

  sim.on('heartbeat', (h) => {
    // Every 5th heartbeat log detail
    if (sim.stats.telemetrySent % 5 === 0) {
      console.log(`\n[TELE] Robot=${h.robotId} State=${h.status?.state} Bat=${h.status?.battery?.level}%`);
    }
  });

  sim.on('event', (e) => {
    if (e.type === 'ambient') {
      console.log(`\n[EVENT] ${e.message} (confidence: ${e.confidence?.toFixed(2)})`);
    }
  });

  sim.on('network', (n) => {
    console.log(`\n[NET] Connection: ${n.status}`);
  });

  sim.on('error', (e) => console.error(`\n[ERR] ${e.message}`));

  sim.runScenario(scenarioName).then(stats => {
    console.log(`\n\n═══ Simulation Complete ═══`);
    console.log(`Commands: ${stats.commands}`);
    console.log(`Sensor readings: ${stats.sensorReadings}`);
    console.log(`Telemetry samples: ${stats.telemetrySent}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(stats.errors > 0 ? 1 : 0);
  }).catch(err => {
    console.error(`\nScenario failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { RobotSimulator, SCENARIOS };
