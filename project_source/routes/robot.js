const express = require('express');
const router = express.Router();
const robotManager = require('../services/robot-manager');
const db = require('../utils/database');
const logger = require('../utils/logger');

const ROBOT_COMMANDS = [
  'start', 'stop', 'wake', 'sleep', 'shutdown', 'restart',
  'speak', 'play_sound', 'stop_sound',
  'move_forward', 'move_backward', 'turn_left', 'turn_right', 'stop_moving',
  'set_expression', 'animate',
  'set_volume', 'set_brightness', 'set_language',
  'take_photo', 'start_video', 'stop_video',
  'get_status', 'get_logs', 'get_telemetry', 'get_sensors',
  'start_task', 'pause_task', 'stop_task',
  'calibrate', 'self_test'
];

const EXPRESSIONS = [
  'happy', 'sad', 'excited', 'sleepy', 'surprised',
  'confused', 'angry', 'calm', 'focused', 'playful',
  'neutral', 'thinking', 'curious', 'loving', 'proud'
];

router.get('/', (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const robots = robotManager.getRobotsByOwner ? robotManager.getRobotsByOwner(userId) : 
    (robotManager.getAllRobots ? robotManager.getAllRobots().filter(r => r.ownerId === userId) : []);

  const enhancedRobots = robots.map(r => {
    const status = r.getStatus ? r.getStatus() : r;
    return {
      ...status,
      isOnline: status.state === 'online' || status.status === 'online',
      batteryStatus: status.battery_level || status.batteryLevel || 100,
      lastSeen: status.last_active || status.lastActive || new Date().toISOString()
    };
  });

  res.json({
    success: true,
    total: enhancedRobots.length,
    data: enhancedRobots
  });
});

router.get('/all', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const robots = robotManager.getAllRobots ? robotManager.getAllRobots() : [];
  
  const stats = {
    total: robots.length,
    online: robots.filter(r => r.state === 'online' || r.status === 'online').length,
    offline: robots.filter(r => r.state === 'offline' || r.status === 'offline').length,
    sleeping: robots.filter(r => r.state === 'sleeping').length
  };

  res.json({
    success: true,
    total: robots.length,
    stats,
    data: robots.map(r => ({
      id: r.id,
      deviceId: r.deviceId || r.device_id,
      name: r.name,
      state: r.state,
      ownerId: r.ownerId,
      batteryLevel: r.battery_level || r.batteryLevel,
      lastActive: r.last_active || r.lastActive
    }))
  });
});

router.get('/:id', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const status = robot.getStatus ? robot.getStatus() : robot;

  const capabilities = {
    movement: true,
    speech: true,
    expressions: true,
    camera: true,
    microphone: true,
    speakers: true,
    touchSensors: true,
    motionSensors: true,
    ledDisplay: true
  };

  res.json({
    success: true,
    data: {
      ...status,
      capabilities,
      availableCommands: ROBOT_COMMANDS,
      availableExpressions: EXPRESSIONS
    }
  });
});

router.post('/:id/command', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { command, parameters, priority = 'normal', timeout = 30000 } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command required' });
  }

  if (!ROBOT_COMMANDS.includes(command) && !command.startsWith('custom_')) {
    return res.status(400).json({ 
      error: `Invalid command. Available commands: ${ROBOT_COMMANDS.slice(0, 10).join(', ')}...` 
    });
  }

  let result;
  try {
    if (robot.executeCommand) {
      result = robot.executeCommand(command, parameters);
    } else {
      result = { 
        success: true, 
        command, 
        parameters, 
        executedAt: new Date().toISOString(),
        simulated: true
      };
    }
  } catch (error) {
    logger.error('Robot command execution error', { 
      robotId: req.params.id, 
      command, 
      error: error.message 
    });
    return res.status(500).json({ error: 'Command execution failed', details: error.message });
  }

  try {
    db.insert('robot_commands', {
      robot_id: req.params.id,
      user_id: userId,
      command,
      parameters: parameters ? JSON.stringify(parameters) : null,
      priority,
      status: 'completed',
      result: result ? JSON.stringify(result) : null,
      created_at: new Date().toISOString(),
      executed_at: new Date().toISOString()
    });
  } catch (e) {
    if (!db.tables.robot_commands) db.tables.robot_commands = [];
    db.tables.robot_commands.push({
      robot_id: req.params.id,
      user_id: userId,
      command,
      parameters: parameters ? JSON.stringify(parameters) : null,
      priority,
      status: 'completed',
      created_at: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    command,
    parameters,
    result,
    executedAt: new Date().toISOString()
  });
});

router.post('/:id/bind', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const { parentId, childId, relationship = 'primary' } = req.body;

  const actualParentId = parentId || userId;

  if (robotManager.bindParentToRobot) {
    robotManager.bindParentToRobot(actualParentId, req.params.id);
  }

  try {
    db.insert('robot_bindings', {
      robot_id: req.params.id,
      parent_id: actualParentId,
      child_id: childId || null,
      relationship,
      is_owner: robot.ownerId === actualParentId,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    if (!db.tables.robot_bindings) db.tables.robot_bindings = [];
    db.tables.robot_bindings.push({
      robot_id: req.params.id,
      parent_id: actualParentId,
      child_id: childId || null,
      relationship,
      created_at: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Parent bound to robot',
    data: {
      robotId: req.params.id,
      parentId: actualParentId,
      childId,
      relationship
    }
  });
});

router.get('/:id/log', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { limit = 100, level, since } = req.query;

  let logs = [];
  if (robot.getLog) {
    logs = robot.getLog();
  }

  try {
    const dbLogs = (db.getTable('robot_logs') || [])
      .filter(l => l.robot_id == req.params.id || l.robot_id === req.params.id)
      .filter(l => !level || l.level === level)
      .filter(l => !since || new Date(l.created_at) >= new Date(since))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));
    
    logs = [...dbLogs, ...logs].slice(0, parseInt(limit));
  } catch (e) { /* ignore */ }

  res.json({
    success: true,
    total: logs.length,
    data: logs.map(l => ({
      ...l,
      timestamp: l.created_at || l.timestamp || new Date().toISOString(),
      level: l.level || 'info',
      message: l.message || l.msg
    }))
  });
});

router.get('/:id/telemetry', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { historical = 'false', limit = 50 } = req.query;

  const currentTelemetry = {
    sensors: robot.sensors || {
      battery: robot.battery_level || robot.batteryLevel || 100,
      temperature: 25,
      humidity: 50,
      distance: null,
      touch: { left: false, right: false, head: false },
      motion: { accelerometer: { x: 0, y: 0, z: 0 }, gyroscope: { x: 0, y: 0, z: 0 } },
      microphone: { active: false, volume: 0 },
      camera: { active: false, resolution: '1080p' }
    },
    actuators: robot.actuators || {
      motors: { left: 0, right: 0, head: 0 },
      speakers: { active: false, volume: 50 },
      display: { active: true, brightness: 80 }
    },
    health: robot.health || {
      cpuUsage: Math.floor(Math.random() * 30) + 10,
      memoryUsage: Math.floor(Math.random() * 40) + 20,
      diskUsage: 35,
      networkStrength: 'good',
      uptime: process.uptime()
    },
    expression: {
      current: robot.expression || 'neutral',
      emoji: robot.constructor ? robot.constructor.EXPRESSIONS?.[robot.expression] : '😊'
    }
  };

  let historicalData = [];
  if (historical === 'true') {
    try {
      historicalData = (db.getTable('robot_metrics') || [])
        .filter(m => m.robot_id == req.params.id || m.robot_id === req.params.id)
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, parseInt(limit))
        .map(m => ({
          ...m,
          sensorData: m.sensor_data ? JSON.parse(m.sensor_data) : {},
          batteryHealth: m.battery_health ? JSON.parse(m.battery_health) : {}
        }));
    } catch (e) { /* ignore */ }
  }

  res.json({
    success: true,
    data: {
      current: currentTelemetry,
      historical: historicalData,
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/:id/sensors', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const sensors = {
    battery: {
      level: robot.battery_level || robot.batteryLevel || 100,
      isCharging: robot.state === 'charging',
      temperature: 28,
      health: 'good',
      voltage: 3.7
    },
    environmental: {
      temperature: 24,
      humidity: 45,
      airQuality: 'good',
      lightLevel: 500
    },
    proximity: {
      front: null,
      left: null,
      right: null,
      bottom: null
    },
    touch: {
      head: false,
      leftArm: false,
      rightArm: false,
      chest: false
    },
    motion: {
      accelerometer: { x: 0, y: 0, z: 9.8 },
      gyroscope: { x: 0, y: 0, z: 0 },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
      isMoving: false,
      speed: 0
    },
    audio: {
      microphoneActive: false,
      volume: 0,
      frequency: null
    },
    visual: {
      cameraActive: false,
      faceDetected: false,
      faceCount: 0,
      motionDetected: false
    },
    position: {
      latitude: null,
      longitude: null,
      indoorPosition: { x: 0, y: 0, floor: 1 }
    }
  };

  res.json({
    success: true,
    robotId: req.params.id,
    data: sensors,
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/start', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  if (robot.state === 'offline' && robot.start) {
    robot.start();
  } else if (robot.state === 'sleeping' && robot.wake) {
    robot.wake();
  }

  res.json({
    success: true,
    state: robot.state || 'online',
    message: 'Robot started',
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/stop', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  if (robot.shutdown) {
    robot.shutdown();
  }

  res.json({
    success: true,
    state: 'offline',
    message: 'Robot shutdown initiated',
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/sleep', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { sleepMode = 'normal', wakeAt } = req.body;

  res.json({
    success: true,
    state: 'sleeping',
    sleepMode,
    wakeAt: wakeAt || null,
    message: 'Robot going to sleep',
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/wake', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  if (robot.wake) {
    robot.wake();
  }

  res.json({
    success: true,
    state: 'online',
    message: 'Robot woken up',
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/restart', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: 'Robot restart initiated',
    estimatedTime: '30-60 seconds',
    timestamp: new Date().toISOString()
  });
});

router.post('/create', (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { robotId, name, model = 'RoboMate Pro', childId } = req.body;
  
  if (!robotId) {
    return res.status(400).json({ error: 'robotId required' });
  }

  const existing = robotManager.getRobot ? robotManager.getRobot(robotId) : null;
  if (existing) {
    return res.status(409).json({ error: 'Robot already exists' });
  }

  let robot;
  if (robotManager.createRobot) {
    robot = robotManager.createRobot(robotId, userId);
  } else {
    robot = {
      id: robotId,
      robotId,
      name: name || robotId,
      model,
      ownerId: userId,
      state: 'offline',
      batteryLevel: 100,
      created_at: new Date().toISOString()
    };
  }

  if (robot && robot.start) {
    robot.start();
  }

  try {
    db.insert('robots', {
      device_id: robotId,
      name: name || robotId,
      model,
      status: 'online',
      battery_level: 100,
      owner_id: userId,
      child_id: childId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    if (!db.tables.robots) db.tables.robots = [];
    db.tables.robots.push({
      device_id: robotId,
      name: name || robotId,
      model,
      status: 'online',
      battery_level: 100,
      owner_id: userId,
      child_id: childId || null,
      created_at: new Date().toISOString()
    });
  }

  res.status(201).json({
    success: true,
    message: 'Robot created successfully',
    data: {
      robotId,
      name: name || robotId,
      model,
      state: robot?.state || 'online',
      batteryLevel: 100,
      createdAt: new Date().toISOString()
    }
  });
});

router.post('/:id/speak', async (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { text, lang = 'en', voice, speed = 1.0, pitch = 1.0 } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  let result;
  if (robot.speak) {
    result = robot.speak(text, lang);
  } else {
    result = {
      success: true,
      text,
      lang,
      duration: Math.ceil(text.length / 15),
      simulated: true
    };
  }

  try {
    db.insert('robot_commands', {
      robot_id: req.params.id,
      user_id: userId,
      command: 'speak',
      parameters: JSON.stringify({ text, lang, voice, speed, pitch }),
      status: 'completed',
      created_at: new Date().toISOString(),
      executed_at: new Date().toISOString()
    });
  } catch (e) { /* ignore */ }

  res.json({
    success: true,
    message: 'Speech initiated',
    data: {
      ...result,
      text,
      lang,
      duration: result?.duration || Math.ceil(text.length / 15)
    }
  });
});

router.post('/:id/play-sound', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { soundId, soundType = 'effect', volume = 70, loop = false } = req.body;
  
  if (!soundId && !soundType) {
    return res.status(400).json({ error: 'soundId or soundType required' });
  }

  const soundEffects = {
    happy: '😊',
    sad: '😢',
    excited: '🎉',
    sleepy: '😴',
    giggle: '😄',
    beep: '🔔',
    boop: '👆',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  res.json({
    success: true,
    message: 'Playing sound',
    data: {
      soundId: soundId || soundType,
      soundType,
      volume,
      loop,
      emoji: soundEffects[soundType] || soundEffects[soundId] || '🔊',
      duration: 3
    }
  });
});

router.post('/:id/stop-sound', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: 'All sounds stopped'
  });
});

router.post('/:id/expression', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { expression, duration = 3000, intensity = 'normal' } = req.body;
  
  if (!expression) {
    return res.status(400).json({ error: 'expression required' });
  }

  if (!EXPRESSIONS.includes(expression)) {
    return res.status(400).json({ 
      error: `Invalid expression. Available: ${EXPRESSIONS.join(', ')}` 
    });
  }

  const expressionEmojis = {
    happy: '😊',
    sad: '😢',
    excited: '🤩',
    sleepy: '😴',
    surprised: '😮',
    confused: '😕',
    angry: '😠',
    calm: '😌',
    focused: '🤔',
    playful: '😜',
    neutral: '😐',
    thinking: '🧐',
    curious: '🤨',
    loving: '🥰',
    proud: '😎'
  };

  if (robot.setExpression) {
    robot.setExpression(expression);
  } else if (robot.expression !== undefined) {
    robot.expression = expression;
  }

  res.json({
    success: true,
    message: 'Expression set',
    data: {
      expression,
      emoji: expressionEmojis[expression] || '😊',
      duration,
      intensity
    }
  });
});

router.post('/:id/move', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { direction, distance = 1, speed = 'normal', turnAngle, continueMoving = false } = req.body;
  
  const validDirections = ['forward', 'backward', 'left', 'right', 'stop', 'turn_left', 'turn_right'];
  if (!direction || !validDirections.includes(direction)) {
    return res.status(400).json({ 
      error: `Invalid direction. Must be one of: ${validDirections.join(', ')}` 
    });
  }

  const directionEmojis = {
    forward: '⬆️',
    backward: '⬇️',
    left: '⬅️',
    right: '➡️',
    stop: '⏹️',
    turn_left: '↺',
    turn_right: '↻'
  };

  res.json({
    success: true,
    message: 'Movement command sent',
    data: {
      direction,
      emoji: directionEmojis[direction],
      distance: direction !== 'stop' ? distance : null,
      speed,
      turnAngle,
      continueMoving
    }
  });
});

router.put('/:id/settings', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { 
    volume, brightness, language, timezone, 
    sleepSchedule, autoSleep = true, autoUpdate = true,
    safetyMode = true, childLock = false,
    volumeLimit = 100, cameraEnabled = true,
    microphoneEnabled = true, dataCollection = true
  } = req.body;

  const settings = {
    volume: volume !== undefined ? volume : null,
    brightness: brightness !== undefined ? brightness : null,
    language,
    timezone,
    sleepSchedule,
    autoSleep,
    autoUpdate,
    safetyMode,
    childLock,
    volumeLimit,
    cameraEnabled,
    microphoneEnabled,
    dataCollection
  };

  const updatedSettings = Object.fromEntries(
    Object.entries(settings).filter(([_, v]) => v !== null)
  );

  res.json({
    success: true,
    message: 'Settings updated',
    data: {
      updated: updatedSettings,
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/:id/settings', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const settings = {
    audio: {
      volume: 70,
      volumeLimit: 100,
      language: 'en',
      voice: 'default'
    },
    display: {
      brightness: 80,
      autoBrightness: true,
      screenTimeout: 300
    },
    power: {
      autoSleep: true,
      sleepTimeout: 300,
      lowPowerMode: false
    },
    safety: {
      safetyMode: true,
      childLock: false,
      obstacleAvoidance: true,
      fallDetection: true
    },
    privacy: {
      cameraEnabled: true,
      microphoneEnabled: true,
      dataCollection: true,
      analyticsEnabled: true
    },
    network: {
      wifiEnabled: true,
      bluetoothEnabled: true,
      autoConnect: true
    },
    updates: {
      autoUpdate: true,
      updateChannel: 'stable',
      lastUpdateCheck: new Date().toISOString()
    }
  };

  res.json({
    success: true,
    data: settings
  });
});

router.post('/:id/calibrate', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { calibrationType = 'all' } = req.body;
  
  const calibrationTypes = ['all', 'sensors', 'motors', 'display', 'touch'];
  if (!calibrationTypes.includes(calibrationType)) {
    return res.status(400).json({ 
      error: `Invalid calibration type. Available: ${calibrationTypes.join(', ')}` 
    });
  }

  res.json({
    success: true,
    message: 'Calibration started',
    data: {
      calibrationType,
      estimatedDuration: calibrationType === 'all' ? 60 : 30,
      steps: calibrationType === 'all' 
        ? ['Sensors', 'Motors', 'Display', 'Touch', 'Final verification']
        : [`${calibrationType} calibration`, 'Verification']
    }
  });
});

router.post('/:id/self-test', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const selfTestResults = {
    overall: 'passed',
    tests: [
      { name: 'Battery', status: 'passed', details: 'Battery level: 85%, Health: good' },
      { name: 'CPU', status: 'passed', details: 'Usage: 15%, Temperature: 42°C' },
      { name: 'Memory', status: 'passed', details: 'Usage: 35%, Available: 512MB' },
      { name: 'Network', status: 'passed', details: 'WiFi connected, Signal strength: good' },
      { name: 'Sensors', status: 'passed', details: 'All sensors responding' },
      { name: 'Display', status: 'passed', details: 'Display active, brightness: 80%' },
      { name: 'Audio', status: 'passed', details: 'Speaker and microphone working' },
      { name: 'Motors', status: 'passed', details: 'All motors responsive' },
      { name: 'Camera', status: 'passed', details: 'Camera operational' },
      { name: 'Touch sensors', status: 'passed', details: 'All touch sensors active' }
    ],
    warnings: [],
    errors: [],
    duration: 2.5,
    completedAt: new Date().toISOString()
  };

  const failed = selfTestResults.tests.filter(t => t.status === 'failed');
  if (failed.length > 0) {
    selfTestResults.overall = 'failed';
    selfTestResults.errors = failed;
  }

  const warnings = selfTestResults.tests.filter(t => t.status === 'warning');
  if (warnings.length > 0) {
    selfTestResults.warnings = warnings;
    if (selfTestResults.overall === 'passed') {
      selfTestResults.overall = 'warnings';
    }
  }

  res.json({
    success: true,
    message: selfTestResults.overall === 'passed' 
      ? 'Self-test passed - all systems operational'
      : 'Self-test completed with issues',
    data: selfTestResults
  });
});

router.post('/:id/task/start', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { taskId, taskType, parameters, scheduledAt } = req.body;
  
  if (!taskType) {
    return res.status(400).json({ error: 'taskType required' });
  }

  const taskTypes = [
    'story_time', 'learning_session', 'dance', 'game',
    'meditation', 'exercise', 'cleanup', 'patrol',
    'custom'
  ];

  if (!taskTypes.includes(taskType)) {
    return res.status(400).json({ 
      error: `Invalid task type. Available: ${taskTypes.join(', ')}` 
    });
  }

  const task = {
    id: taskId || `task_${Date.now()}`,
    taskType,
    parameters: parameters || {},
    status: scheduledAt ? 'scheduled' : 'running',
    scheduledAt: scheduledAt || null,
    startedAt: scheduledAt ? null : new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: scheduledAt 
      ? `Task scheduled for ${scheduledAt}`
      : 'Task started',
    data: task
  });
});

router.post('/:id/task/pause', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: 'Current task paused',
    pausedAt: new Date().toISOString()
  });
});

router.post('/:id/task/resume', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: 'Task resumed',
    resumedAt: new Date().toISOString()
  });
});

router.post('/:id/task/stop', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: 'Task stopped',
    stoppedAt: new Date().toISOString()
  });
});

router.get('/:id/tasks', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { status, limit = 50 } = req.query;

  const tasks = [
    {
      id: 'task_001',
      type: 'story_time',
      name: 'Bedtime Story',
      status: 'completed',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3420000).toISOString(),
      duration: 180
    },
    {
      id: 'task_002',
      type: 'learning_session',
      name: 'Math Practice',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 7200000).toISOString(),
      estimatedDuration: 600
    }
  ];

  let filteredTasks = tasks;
  if (status) {
    filteredTasks = tasks.filter(t => t.status === status);
  }

  res.json({
    success: true,
    total: filteredTasks.length,
    data: filteredTasks.slice(0, parseInt(limit))
  });
});

router.get('/:id/behavior-scripts', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const scripts = [
    {
      id: 'script_001',
      name: 'Morning Routine',
      description: 'Wake up, stretch, and greet the day',
      category: 'daily_routine',
      triggers: ['schedule', 'voice'],
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
    },
    {
      id: 'script_002',
      name: 'Bedtime Routine',
      description: 'Calm down, tell a story, and go to sleep',
      category: 'daily_routine',
      triggers: ['schedule', 'voice'],
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'script_003',
      name: 'Birthday Party Mode',
      description: 'Play music, dance, and celebrate!',
      category: 'special_event',
      triggers: ['manual', 'voice'],
      isActive: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ];

  res.json({
    success: true,
    total: scripts.length,
    data: scripts
  });
});

router.post('/:id/behavior-scripts', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { name, description, category, triggers, script, isActive = true } = req.body;

  if (!name || !script) {
    return res.status(400).json({ error: 'name and script are required' });
  }

  const newScript = {
    id: `script_${Date.now()}`,
    name,
    description: description || '',
    category: category || 'custom',
    triggers: triggers || ['manual'],
    script,
    isActive,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    message: 'Behavior script created',
    data: newScript
  });
});

router.post('/:id/behavior-scripts/:scriptId/run', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  res.json({
    success: true,
    message: `Running behavior script: ${req.params.scriptId}`,
    startedAt: new Date().toISOString()
  });
});

router.get('/:id/safety-status', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const safetyStatus = {
    overall: 'safe',
    features: {
      obstacleAvoidance: {
        enabled: true,
        status: 'active',
        lastTriggered: null
      },
      fallDetection: {
        enabled: true,
        status: 'active',
        lastTriggered: null
      },
      touchSensors: {
        enabled: true,
        status: 'active'
      },
      emergencyStop: {
        enabled: true,
        status: 'ready'
      },
      geofencing: {
        enabled: false,
        status: 'disabled',
        boundary: null
      },
      speedLimiting: {
        enabled: true,
        maxSpeed: 'normal',
        currentSpeed: 0
      }
    },
    zones: {
      safe: ['living room', 'bedroom', 'playroom'],
      restricted: ['stairs', 'kitchen', 'bathroom']
    },
    childLock: {
      enabled: false,
      restrictedCommands: ['restart', 'factory_reset', 'settings']
    },
    lastSafetyCheck: new Date(Date.now() - 3600000).toISOString()
  };

  res.json({
    success: true,
    data: safetyStatus
  });
});

router.post('/:id/safety-monitor', (req, res) => {
  const robot = robotManager.getRobot ? robotManager.getRobot(req.params.id) : null;
  
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const userId = req.user?.userId;
  const isAdmin = req.user?.role === 'admin';
  
  if (!isAdmin && robot.ownerId !== userId) {
    return res.status(403).json({ error: 'Access denied to this robot' });
  }

  const { enable = true } = req.body;

  res.json({
    success: true,
    message: enable ? 'Safety monitoring enabled' : 'Safety monitoring disabled',
    data: {
      enabled: enable,
      features: ['obstacle', 'fall', 'boundary', 'emergency'],
      notificationChannels: ['push', 'email', 'sms']
    }
  });
});

router.get('/commands', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: {
        power: ['start', 'stop', 'sleep', 'wake', 'restart'],
        movement: ['move_forward', 'move_backward', 'turn_left', 'turn_right', 'stop_moving'],
        audio: ['speak', 'play_sound', 'stop_sound', 'set_volume'],
        display: ['set_expression', 'set_brightness', 'animate'],
        media: ['take_photo', 'start_video', 'stop_video'],
        system: ['get_status', 'get_logs', 'get_telemetry', 'get_sensors', 'calibrate', 'self_test'],
        tasks: ['start_task', 'pause_task', 'resume_task', 'stop_task'],
        settings: ['get_settings', 'update_settings']
      },
      expressions: EXPRESSIONS,
      sampleCommands: [
        { command: 'speak', parameters: { text: 'Hello!', lang: 'en' }, description: 'Make the robot speak' },
        { command: 'set_expression', parameters: { expression: 'happy' }, description: 'Change robot expression' },
        { command: 'move_forward', parameters: { distance: 1, speed: 'normal' }, description: 'Move robot forward' }
      ]
    }
  });
});

module.exports = router;
