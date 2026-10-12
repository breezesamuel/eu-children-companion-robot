const EventEmitter = require('events');
const logger = require('../utils/logger');

class SmartHomeService extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.scenes = new Map();
    this.automations = [];
    this.roomDefinitions = [];
  }

  registerDevice(device) {
    const id = device.id || 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const entry = {
      id,
      name: device.name || 'Unknown Device',
      type: device.type || 'unknown',
      room: device.room || 'general',
      capabilities: device.capabilities || [],
      state: device.state || {},
      online: true,
      manufacturer: device.manufacturer || 'generic',
      protocol: device.protocol || 'wifi',
      lastSeen: new Date().toISOString(),
      metadata: device.metadata || {}
    };
    this.devices.set(id, entry);
    this.emit('device:registered', entry);
    return entry;
  }

  removeDevice(id) {
    const device = this.devices.get(id);
    if (!device) return { success: false, error: 'Device not found' };
    this.devices.delete(id);
    this.emit('device:removed', { id });
    return { success: true };
  }

  getDevice(id) {
    return this.devices.get(id) || null;
  }

  getDevices(filters = {}) {
    let results = Array.from(this.devices.values());
    if (filters.type) results = results.filter(d => d.type === filters.type);
    if (filters.room) results = results.filter(d => d.room === filters.room);
    if (filters.online !== undefined) results = results.filter(d => d.online === filters.online);
    return results;
  }

  setDeviceState(id, state) {
    const device = this.devices.get(id);
    if (!device) return { success: false, error: 'Device not found' };
    Object.assign(device.state, state);
    device.lastSeen = new Date().toISOString();
    this.emit('device:state', { id, state });
    return { success: true, data: device.state };
  }

  setDeviceOnline(id, online) {
    const device = this.devices.get(id);
    if (!device) return { success: false, error: 'Device not found' };
    device.online = online;
    device.lastSeen = new Date().toISOString();
    this.emit('device:online', { id, online });
    return { success: true };
  }

  createScene(name, actions) {
    const id = 'scene_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const scene = { id, name, actions, createdAt: new Date().toISOString() };
    this.scenes.set(id, scene);
    return scene;
  }

  activateScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return { success: false, error: 'Scene not found' };
    const results = [];
    for (const action of scene.actions) {
      if (action.type === 'device_state') {
        const r = this.setDeviceState(action.deviceId, action.state);
        results.push(r);
      }
    }
    this.emit('scene:activated', { sceneId, results });
    return { success: true, data: results };
  }

  addAutomation(name, trigger, condition, action) {
    const id = 'auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const automation = { id, name, trigger, condition, action, enabled: true, createdAt: new Date().toISOString() };
    this.automations.push(automation);
    return automation;
  }

  setRoom(name, devices) {
    const existing = this.roomDefinitions.findIndex(r => r.name === name);
    const room = { name, devices };
    if (existing >= 0) this.roomDefinitions[existing] = room;
    else this.roomDefinitions.push(room);
    return room;
  }

  getRoom(name) {
    return this.roomDefinitions.find(r => r.name === name) || null;
  }

  getRooms() {
    return this.roomDefinitions;
  }

  getStats() {
    const allDevices = Array.from(this.devices.values());
    return {
      totalDevices: allDevices.length,
      onlineDevices: allDevices.filter(d => d.online).length,
      offlineDevices: allDevices.filter(d => !d.online).length,
      byType: this._groupBy(allDevices, 'type'),
      byRoom: this._groupBy(allDevices, 'room'),
      scenes: this.scenes.size,
      automations: this.automations.length,
      rooms: this.roomDefinitions.length
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

  discoverDevices() {
    const simulatedDevices = [
      { id: 'light_living', name: 'Living Room Light', type: 'light', room: 'living_room', capabilities: ['on_off', 'brightness', 'color'], state: { on: false, brightness: 80, color: '#FFFFFF' } },
      { id: 'light_bedroom', name: 'Bedroom Light', type: 'light', room: 'bedroom', capabilities: ['on_off', 'brightness', 'color'], state: { on: false, brightness: 60, color: '#FFE4B5' } },
      { id: 'light_kitchen', name: 'Kitchen Light', type: 'light', room: 'kitchen', capabilities: ['on_off', 'brightness'], state: { on: false, brightness: 100 } },
      { id: 'thermostat_main', name: 'Main Thermostat', type: 'thermostat', room: 'living_room', capabilities: ['temperature', 'mode', 'fan'], state: { temperature: 21, targetTemp: 22, mode: 'auto', fan: 'auto' } },
      { id: 'thermostat_bedroom', name: 'Bedroom Thermostat', type: 'thermostat', room: 'bedroom', capabilities: ['temperature', 'mode'], state: { temperature: 20, targetTemp: 20, mode: 'eco' } },
      { id: 'curtain_living', name: 'Living Room Curtain', type: 'curtain', room: 'living_room', capabilities: ['open_close', 'position'], state: { open: true, position: 100 } },
      { id: 'curtain_bedroom', name: 'Bedroom Curtain', type: 'curtain', room: 'bedroom', capabilities: ['open_close', 'position'], state: { open: false, position: 0 } },
      { id: 'plug_tv', name: 'TV Plug', type: 'smart_plug', room: 'living_room', capabilities: ['on_off', 'power_monitor'], state: { on: false, power: 0 } },
      { id: 'plug_robot', name: 'Robot Charger', type: 'smart_plug', room: 'playroom', capabilities: ['on_off', 'power_monitor'], state: { on: true, power: 45 } },
      { id: 'sensor_door', name: 'Front Door Sensor', type: 'sensor', room: 'entrance', capabilities: ['contact', 'battery'], state: { open: false, battery: 85 } },
      { id: 'sensor_motion', name: 'Motion Sensor', type: 'sensor', room: 'living_room', capabilities: ['motion', 'battery'], state: { motion: false, battery: 72 } },
      { id: 'camera_nursery', name: 'Nursery Camera', type: 'camera', room: 'bedroom', capabilities: ['video', 'audio', 'pan_tilt'], state: { recording: false, audio: true, pan: 0, tilt: 0 } },
      { id: 'air_purifier', name: 'Air Purifier', type: 'air_purifier', room: 'living_room', capabilities: ['on_off', 'fan_speed', 'air_quality'], state: { on: false, fanSpeed: 'auto', pm25: 12 } },
      { id: 'speaker_playroom', name: 'Playroom Speaker', type: 'speaker', room: 'playroom', capabilities: ['playback', 'volume', 'source'], state: { playing: false, volume: 50, source: 'robot' } }
    ];
    for (const dev of simulatedDevices) {
      if (!this.devices.has(dev.id)) this.registerDevice(dev);
    }
    return simulatedDevices;
  }
}

module.exports = new SmartHomeService();
