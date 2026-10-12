const EventEmitter = require('events');

class HardwareManager extends EventEmitter {
  constructor() {
    super();
    this.features = {};
    this.sensorStates = {};
    this.eventLog = [];
    this.simulationActive = true;
    this._initAllFeatures();
    this._startSimulationLoop();
  }

  _initAllFeatures() {
    const defs = [
      { id:'proximity_infrared', name:'Infrared Proximity', type:'sensor', pins:['PA0','PA1'], protocol:'GPIO', range:[0,1], unit:'ratio', autoTrigger:true },
      { id:'proximity_ultrasonic', name:'Ultrasonic Distance', type:'sensor', pins:['PB6','PB7'], protocol:'GPIO', range:[2,400], unit:'cm' },
      { id:'presence_microwave', name:'Microwave Presence', type:'sensor', pins:['PC0'], protocol:'GPIO', range:[0,1], unit:'ratio' },
      { id:'presence_pir', name:'PIR Motion', type:'sensor', pins:['PC1'], protocol:'GPIO', range:[0,1], unit:'ratio' },
      { id:'temp_humidity', name:'Temperature & Humidity', type:'sensor', pins:['PL0'], protocol:'DHT', range:[[-10,50],[0,100]], unit:'°C/%' },
      { id:'air_quality', name:'Air Quality (VOC)', type:'sensor', pins:['PL1','PL2'], protocol:'I2C', range:[0,500], unit:'ppb' },
      { id:'light_ambient', name:'Ambient Light', type:'sensor', pins:['PL3','PL4'], protocol:'I2C', range:[0,65535], unit:'lux' },
      { id:'barometer', name:'Barometric Pressure', type:'sensor', pins:['PL5','PL6'], protocol:'I2C', range:[300,1100], unit:'hPa' },
      { id:'gas_detector', name:'Gas Detection', type:'sensor', pins:['PL7'], protocol:'ADC', range:[0,1], unit:'ratio' },
      { id:'sound_level', name:'Sound Level', type:'sensor', pins:['PL9'], protocol:'ADC', range:[0,100], unit:'dB' },
      { id:'imu_accel', name:'IMU Accelerometer', type:'sensor', pins:['PM0','PM1'], protocol:'I2C', range:[-16,16], unit:'g' },
      { id:'imu_gyro', name:'IMU Gyroscope', type:'sensor', pins:['PM0','PM1'], protocol:'I2C', range:[-2000,2000], unit:'°/s' },
      { id:'battery_voltage', name:'Battery Voltage', type:'power', pins:['PP0'], protocol:'ADC', range:[3.0,4.2], unit:'V' },
      { id:'battery_current', name:'Battery Current', type:'power', pins:['PP1'], protocol:'ADC', range:[-2000,2000], unit:'mA' },
      { id:'motor_dc_left', name:'Left DC Motor', type:'actuator', pins:['PM2','PM3','PM4'], protocol:'PWM', range:[-100,100], unit:'%' },
      { id:'motor_dc_right', name:'Right DC Motor', type:'actuator', pins:['PM5','PM6','PM7'], protocol:'PWM', range:[-100,100], unit:'%' },
      { id:'servo_head_pan', name:'Head Pan Servo', type:'actuator', pins:['PN0'], protocol:'PWM', range:[-90,90], unit:'°' },
      { id:'servo_head_tilt', name:'Head Tilt Servo', type:'actuator', pins:['PN1'], protocol:'PWM', range:[-45,45], unit:'°' },
      { id:'led_rgb', name:'RGB LED Strip', type:'actuator', pins:['PK0','PK1','PK2'], protocol:'GPIO', range:[0,255], unit:'RGB' },
      { id:'speaker', name:'Speaker', type:'actuator', pins:['PF0','PF1'], protocol:'SAI', range:[0,100], unit:'%' },
      { id:'touchscreen', name:'Touchscreen', type:'hmi', pins:['PJ0','PJ1','PJ2','PJ3','PJ4','PJ5'], protocol:'LTDC' },
      { id:'wifi', name:'WiFi', type:'comms', pins:[], protocol:'SDIO' },
      { id:'bluetooth', name:'Bluetooth BLE', type:'comms', pins:[], protocol:'UART' },
      { id:'rtc', name:'RTC', type:'system', pins:['PQ0','PQ1'], protocol:'I2C' },
    ];

    defs.forEach(d => {
      d.status = 'idle';
      d.enabled = true;
      d.lastRead = null;
      d.lastValue = null;
      d.error = null;
      d.config = { pollInterval: 1000, threshold: null, smoothing: false };
      this.features[d.id] = d;
      this.sensorStates[d.id] = this._getInitialState(d);
    });
  }

  _getInitialState(def) {
    if (def.type === 'sensor') {
      if (def.id === 'temp_humidity') return { temperature: 25, humidity: 50 };
      if (def.id === 'battery_voltage') return { voltage: 4.0, level: 85 };
      return { value: this._randomInRange(def.range), raw: 0 };
    }
    if (def.type === 'actuator') return { value: 0, active: false };
    return {};
  }

  _randomInRange(range) {
    if (!range) return Math.random();
    if (Array.isArray(range[0])) return range.map(r => r[0] + Math.random() * (r[1] - r[0]));
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  // -----------------------------------------------------------------------
  // Simulation loop — generates realistic sensor data
  // -----------------------------------------------------------------------
  _startSimulationLoop() {
    this._simInterval = setInterval(() => {
      if (!this.simulationActive) return;
      Object.values(this.features).forEach(f => {
        if (f.type !== 'sensor' && f.type !== 'power') return;
        if (!f.enabled) return;
        this.sensorStates[f.id] = this._simulateReading(f);
        f.lastRead = Date.now();
        f.status = 'running';
        this.emit('sensor-update', { id: f.id, data: this.sensorStates[f.id], timestamp: f.lastRead });
      });
    }, 2000);
  }

  _simulateReading(f) {
    const prev = this.sensorStates[f.id] || {};
    const drift = () => (Math.random() - 0.5) * 0.05;

    switch (f.id) {
      case 'temp_humidity':
        const t = (prev.temperature || 25) + drift() * 2;
        const h = (prev.humidity || 50) + drift() * 1.5;
        return { temperature: Math.round(t * 10) / 10, humidity: Math.round(Math.min(100, Math.max(0, h))) };
      case 'proximity_infrared':
        return { value: Math.round(Math.random() * 100) / 100 };
      case 'proximity_ultrasonic':
        const d = (prev.value || 100) + (Math.random() - 0.5) * 5;
        return { value: Math.round(Math.max(2, Math.min(400, d))) };
      case 'light_ambient':
        return { value: Math.round(100 + Math.random() * 50000) };
      case 'sound_level':
        return { value: Math.round(20 + Math.random() * 60) };
      case 'battery_voltage':
        const currentVoltage = prev.voltage || 4.0;
        const drain = Math.random() * 0.001;
        const newVoltage = Math.max(3.0, currentVoltage - drain);
        const level = Math.round(((newVoltage - 3.0) / 1.2) * 100);
        return { voltage: Math.round(newVoltage * 100) / 100, level: Math.min(100, Math.max(0, level)) };
      case 'imu_accel':
        return { x: Math.round((Math.random() - 0.5) * 2 * 100) / 100, y: Math.round((Math.random() - 0.5) * 2 * 100) / 100, z: Math.round((0.98 + Math.random() * 0.04) * 100) / 100 };
      case 'imu_gyro':
        return { x: Math.round((Math.random() - 0.5) * 10 * 100) / 100, y: Math.round((Math.random() - 0.5) * 10 * 100) / 100, z: Math.round((Math.random() - 0.5) * 10 * 100) / 100 };
      case 'barometer':
        return { pressure: Math.round((1013 + (Math.random() - 0.5) * 20) * 10) / 10, altitude: Math.round(Math.random() * 200) };
      case 'air_quality':
        return { voc: Math.round(Math.random() * 300), eco2: Math.round(400 + Math.random() * 800) };
      default:
        return { value: this._randomInRange(f.range) };
    }
  }

  // -----------------------------------------------------------------------
  // Sensor & Actuator API
  // -----------------------------------------------------------------------
  getFeature(id) { return this.features[id] || null; }
  getAllFeatures() { return Object.values(this.features); }
  getFeaturesByType(type) { return Object.values(this.features).filter(f => f.type === type); }

  readSensor(id) {
    const f = this.features[id];
    if (!f || !f.enabled) return null;
    if (f.type !== 'sensor' && f.type !== 'power') return null;
    const data = this._simulateReading(f);
    this.sensorStates[f.id] = data;
    f.lastRead = Date.now();
    f.lastValue = data;
    this._logEvent('sensor_read', { id, data });
    return { id, data, timestamp: f.lastRead };
  }

  readAllSensors() {
    const result = {};
    Object.values(this.features).forEach(f => {
      if (f.type !== 'sensor' && f.type !== 'power') return;
      result[f.id] = this.sensorStates[f.id] || {};
    });
    return result;
  }

  setActuator(id, value) {
    const f = this.features[id];
    if (!f || !f.enabled) return false;
    if (f.type !== 'actuator') return false;
    this.sensorStates[f.id] = { value, active: true, setAt: Date.now() };
    f.lastValue = value;
    this._logEvent('actuator_set', { id, value });
    this.emit('actuator-set', { id, value, timestamp: Date.now() });
    return true;
  }

  setMotor(left, right) {
    const l = this.setActuator('motor_dc_left', Math.max(-100, Math.min(100, left)));
    const r = this.setActuator('motor_dc_right', Math.max(-100, Math.min(100, right)));
    this.emit('motor-command', { left, right, timestamp: Date.now() });
    return l && r;
  }

  setHead(pan, tilt) {
    this.setActuator('servo_head_pan', Math.max(-90, Math.min(90, pan || 0)));
    this.setActuator('servo_head_tilt', Math.max(-45, Math.min(45, tilt || 0)));
    this.emit('head-move', { pan: pan || 0, tilt: tilt || 0 });
    return true;
  }

  setLED(r, g, b) {
    if (r !== undefined) this.setActuator('led_rgb', { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g || 0)), b: Math.max(0, Math.min(255, b || 0)) });
    this.emit('led-update', { r, g, b });
    return true;
  }

  playTone(frequency, duration) {
    this._logEvent('tone_play', { frequency, duration });
    this.emit('tone', { frequency, duration });
    return true;
  }

  // -----------------------------------------------------------------------
  // Proximity monitoring
  // -----------------------------------------------------------------------
  autoWakeOnProximity() {
    const ir = this.features['proximity_infrared'];
    if (ir && ir.enabled) {
      const data = this._simulateReading(ir);
      if (data.value > 0.7) {
        this.emit('person-detected', { source: 'infrared', confidence: data.value });
        return true;
      }
    }
    return false;
  }

  startProximityMonitoring(intervalMs = 500) {
    if (this._proxInterval) clearInterval(this._proxInterval);
    this._proxInterval = setInterval(() => this.autoWakeOnProximity(), intervalMs);
    this.emit('monitoring-started', { type: 'proximity', interval: intervalMs });
  }

  stopProximityMonitoring() {
    if (this._proxInterval) { clearInterval(this._proxInterval); this._proxInterval = null; }
    this.emit('monitoring-stopped', { type: 'proximity' });
  }

  // -----------------------------------------------------------------------
  // Configuration & Calibration
  // -----------------------------------------------------------------------
  configureFeature(id, config) {
    const f = this.features[id];
    if (!f) return false;
    Object.assign(f.config, config);
    this._logEvent('feature_configured', { id, config });
    return true;
  }

  calibrateSensor(id) {
    const f = this.features[id];
    if (!f) return null;
    this.sensorStates[id] = this._getInitialState(f);
    f.status = 'calibrated';
    this._logEvent('sensor_calibrated', { id });
    return { id, status: 'calibrated' };
  }

  // -----------------------------------------------------------------------
  // Diagnostics
  // -----------------------------------------------------------------------
  getStatus() {
    return {
      totalFeatures: Object.keys(this.features).length,
      enabled: Object.values(this.features).filter(f => f.enabled).length,
      byType: Object.values(this.features).reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {}),
      simulationActive: this.simulationActive,
      monitoring: !!this._proxInterval,
      eventLogCount: this.eventLog.length,
      battery: this.sensorStates['battery_voltage'],
      temperature: this.sensorStates['temp_humidity'],
      uptime: process.uptime(),
    };
  }

  runDiagnostic() {
    const results = {};
    Object.values(this.features).forEach(f => {
      const state = this.sensorStates[f.id] || {};
      results[f.id] = {
        status: f.enabled ? 'ok' : 'disabled',
        type: f.type,
        lastRead: f.lastRead,
        value: state.value || state,
        errors: f.error ? [f.error] : [],
      };
    });
    return { timestamp: Date.now(), features: results, total: Object.keys(results).length, healthy: Object.values(results).filter(r => r.status === 'ok').length };
  }

  resetAll() {
    this.sensorStates = {};
    Object.values(this.features).forEach(f => {
      this.sensorStates[f.id] = this._getInitialState(f);
      f.status = 'idle';
      f.error = null;
    });
    this.eventLog = [];
    this.emit('system-reset', { timestamp: Date.now() });
    return true;
  }

  // -----------------------------------------------------------------------
  // Event log
  // -----------------------------------------------------------------------
  getEventLog(limit = 100) { return this.eventLog.slice(-limit); }

  _logEvent(type, data) {
    this.eventLog.push({ type, data, timestamp: Date.now() });
    if (this.eventLog.length > 10000) this.eventLog = this.eventLog.slice(-5000);
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  destroy() {
    if (this._simInterval) clearInterval(this._simInterval);
    if (this._proxInterval) clearInterval(this._proxInterval);
    this.simulationActive = false;
    this.removeAllListeners();
  }
}

module.exports = new HardwareManager();
