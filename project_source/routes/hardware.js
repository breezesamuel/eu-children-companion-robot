const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let hardwareManager = null;
try { hardwareManager = require('../hardware/hardware-manager'); } catch (_) {}

const VoiceChatClass = (() => { try { return require('../services/voice-chat'); } catch (_) { return null; } })();
let voiceChatService = null;
try {
  if (VoiceChatClass && typeof VoiceChatClass === 'function' && VoiceChatClass.prototype) {
    voiceChatService = new VoiceChatClass();
    const llmSvc = require('../services/llm-service');
    voiceChatService.setLLMService(llmSvc);
  } else if (VoiceChatClass && VoiceChatClass.getStatus) {
    voiceChatService = VoiceChatClass;
  }
} catch (_) {}

let videoCallService = null;
try { videoCallService = require('../services/video-call'); } catch (_) {}

// ─── Proximity / Presence Sensors (5) ────────────────────────────
router.get('/proximity/infrared', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const val = hardwareManager.readSensor('proximity_infrared');
  res.json({ success: true, sensor: 'proximity_infrared', value: val ? val.value : 0, detected: val ? val.value > 0.7 : false });
});

router.get('/proximity/ultrasonic', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const val = hardwareManager.readSensor('proximity_ultrasonic');
  res.json({ success: true, sensor: 'proximity_ultrasonic', value: val ? val.value : 0 });
});

router.get('/proximity/lidar', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const val = hardwareManager.readSensor('proximity_lidar');
  res.json({ success: true, sensor: 'proximity_lidar', value: val ? val.value : 0 });
});

router.get('/presence/pir', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const val = hardwareManager.readSensor('presence_pir');
  res.json({ success: true, sensor: 'presence_pir', value: val ? val.value : 0, motion: val ? val.value > 0.5 : false });
});

router.get('/presence/microwave', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const val = hardwareManager.readSensor('presence_microwave');
  res.json({ success: true, sensor: 'presence_microwave', value: val ? val.value : 0 });
});

// ─── Proximity Auto-Wake ─────────────────────────────────────────
let _proxMonitoring = false;
router.post('/proximity/auto-wake/start', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  const interval = req.body.interval || 500;
  hardwareManager.startProximityMonitoring(interval);
  _proxMonitoring = true;
  hardwareManager.on('person-detected', (data) => {
    logger.info('Person detected via ' + data.source + ', auto-waking chat...');
    if (voiceChatService && voiceChatService.simulateWakeWord) voiceChatService.simulateWakeWord();
  });
  res.json({ success: true, message: 'Proximity monitoring started', interval });
});

router.post('/proximity/auto-wake/stop', (req, res) => {
  if (!hardwareManager) return res.json({ success: false, error: 'Hardware manager unavailable' });
  hardwareManager.stopProximityMonitoring();
  _proxMonitoring = false;
  res.json({ success: true, message: 'Proximity monitoring stopped' });
});

router.get('/proximity/auto-wake/status', (req, res) => {
  res.json({ success: true, monitoring: _proxMonitoring, detected: _proxMonitoring ? hardwareManager.autoWakeOnProximity() : false });
});

// ─── Audio / Voice (8) ───────────────────────────────────────────
router.get('/mic/internal', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('mic_internal') : null;
  res.json({ success: true, feature: feature || { status: 'simulated' }, reading: hardwareManager ? hardwareManager.readSensor('mic_internal') : null });
});

router.get('/mic/external', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('mic_external') : null;
  res.json({ success: true, feature: feature || { status: 'simulated' } });
});

router.get('/mic/array', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('mic_array') : null;
  res.json({ success: true, feature: feature || { status: 'simulated' } });
});

router.get('/speaker/internal', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('speaker_internal') : null;
  res.json({ success: true, feature: feature || { status: 'simulated' } });
});

router.get('/speaker/external', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('speaker_external') : null;
  res.json({ success: true, feature: feature || { status: 'simulated' } });
});

// ─── Voice Wake Word ──────────────────────────────────────────────
router.post('/voice-wake/enable', (req, res) => {
  if (voiceChatService && voiceChatService.startWakeWordDetection) {
    voiceChatService.startWakeWordDetection();
    res.json({ success: true, message: 'Wake word detection enabled', wakeWord: voiceChatService.opts ? voiceChatService.opts.wakeWord : 'hey robobuddy' });
  } else {
    res.json({ success: true, message: 'Wake word simulated (service not loaded)' });
  }
});

router.post('/voice-wake/disable', (req, res) => {
  if (voiceChatService && voiceChatService.stopWakeWordDetection) {
    voiceChatService.stopWakeWordDetection();
  }
  res.json({ success: true, message: 'Wake word detection disabled' });
});

router.post('/voice-wake/trigger', (req, res) => {
  if (voiceChatService && voiceChatService.simulateWakeWord) {
    voiceChatService.simulateWakeWord();
  }
  res.json({ success: true, message: 'Wake word triggered, starting chat...' });
});

router.get('/voice-wake/status', (req, res) => {
  const status = voiceChatService ? voiceChatService.getStatus() : { status: 'unavailable' };
  res.json({ success: true, wakeEnabled: voiceChatService ? voiceChatService.isWakeWordEnabled : false, status });
});

// ─── Audio Playback / Recording ──────────────────────────────────
router.post('/audio/play', (req, res) => {
  const { text, language, voice } = req.body;
  if (!text) return res.json({ success: false, error: 'text required' });
  if (voiceChatService && voiceChatService.speak) {
    voiceChatService.speak(text, language, voice);
    res.json({ success: true, message: 'Speaking...' });
  } else {
    res.json({ success: true, simulated: true, message: 'Simulated speak: ' + text.substring(0, 50) });
  }
});

router.post('/audio/record/start', (req, res) => {
  if (voiceChatService && voiceChatService.startRecording) {
    voiceChatService.startRecording();
    res.json({ success: true, message: 'Recording started' });
  } else {
    res.json({ success: true, simulated: true, message: 'Simulated recording start' });
  }
});

router.post('/audio/record/stop', (req, res) => {
  if (voiceChatService && voiceChatService.stopRecording) {
    const data = voiceChatService.stopRecording();
    res.json({ success: true, data: data ? 'Audio captured' : null });
  } else {
    res.json({ success: true, simulated: true, message: 'Simulated recording stop' });
  }
});

// ─── TTS ──────────────────────────────────────────────────────────
let ttsService = null;
try { ttsService = require('../services/tts'); } catch (_) {}

router.post('/tts/speak', async (req, res) => {
  const { text, lang, rate, pitch } = req.body;
  if (!text) return res.json({ success: false, error: 'text required' });
  if (ttsService && ttsService.isAvailable) {
    const result = await ttsService.speak(text, { lang, rate, pitch });
    res.json(result);
  } else {
    res.json({ success: true, simulated: true, text: text.substring(0, 50) });
  }
});

router.get('/tts/voices', (req, res) => {
  const voices = ttsService ? ttsService.getVoices() : {};
  res.json({ success: true, voices });
});

// ─── Video Call ───────────────────────────────────────────────────
router.post('/video-call/create', (req, res) => {
  const { callerId, calleeId, options } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const session = videoCallService.createSession(callerId, calleeId, options);
  res.json({ success: true, data: session });
});

router.post('/video-call/create-group', (req, res) => {
  const { creatorId, participantIds, options } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const session = videoCallService.createGroupSession(creatorId, participantIds, options);
  res.json({ success: true, data: session });
});

router.post('/video-call/accept', (req, res) => {
  const { sessionId } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.acceptSession(sessionId);
  res.json(result);
});

router.post('/video-call/reject', (req, res) => {
  const { sessionId, reason } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.rejectSession(sessionId, reason);
  res.json(result);
});

router.post('/video-call/end', (req, res) => {
  const { sessionId } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.endSession(sessionId);
  res.json(result);
});

router.post('/video-call/mute', (req, res) => {
  const { sessionId, type } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.toggleMute(sessionId, type || 'audio');
  res.json(result);
});

router.post('/video-call/quality', (req, res) => {
  const { sessionId, quality } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.setQuality(sessionId, quality);
  res.json(result);
});

router.post('/video-call/recording/start', (req, res) => {
  const { sessionId, options } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.startRecording(sessionId, options);
  res.json(result);
});

router.post('/video-call/recording/stop', (req, res) => {
  const { recordId } = req.body;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.stopRecording(recordId);
  res.json(result);
});

router.get('/video-call/recordings', (req, res) => {
  const { sessionId } = req.query;
  if (!videoCallService) return res.json({ success: false, error: 'Video call service unavailable' });
  const result = videoCallService.getRecordings(sessionId);
  res.json({ success: true, data: result });
});

// ─── Environmental Sensors (8) ───────────────────────────────────
router.get('/environment/temperature', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('temp_humidity') : { value: 22 + Math.random() * 5 };
  res.json({ success: true, sensor: 'temperature', celsius: val ? 20 + val.value * 15 : 22, humidity: val ? 40 + val.value * 30 : 50 });
});

router.get('/environment/air-quality', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('air_quality') : { value: Math.random() * 0.5 };
  res.json({ success: true, sensor: 'air_quality', co2: val ? 400 + val.value * 1000 : 450, voc: val ? val.value * 100 : 50 });
});

router.get('/environment/light', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('light_ambient') : { value: Math.random() };
  res.json({ success: true, sensor: 'light_ambient', lux: val ? 10 + val.value * 990 : 500 });
});

router.get('/environment/barometer', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('barometer') : { value: 0.5 };
  res.json({ success: true, sensor: 'barometer', pressure: val ? 950 + val.value * 100 : 1013, altitude: val ? val.value * 500 : 250 });
});

router.get('/environment/gas', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('gas_detector') : { value: 0.1 };
  res.json({ success: true, sensor: 'gas_detector', detected: val ? val.value > 0.3 : false, value: val ? val.value : 0 });
});

router.get('/environment/flame', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('flame_detector') : { value: 0.05 };
  res.json({ success: true, sensor: 'flame_detector', detected: val ? val.value > 0.5 : false });
});

router.get('/environment/sound-level', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('sound_level') : { value: Math.random() * 0.5 };
  res.json({ success: true, sensor: 'sound_level', db: val ? 30 + val.value * 70 : 45 });
});

router.get('/environment/uv', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('uv_index') : { value: Math.random() * 0.5 };
  res.json({ success: true, sensor: 'uv_index', index: val ? val.value * 11 : 5 });
});

// ─── Vision / Camera (6) ─────────────────────────────────────────
router.get('/camera/main', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('camera_main') : null;
  res.json({ success: true, camera: 'main', status: feature ? feature.status : 'simulated', resolution: '5MP' });
});

router.get('/camera/front', (req, res) => {
  const feature = hardwareManager ? hardwareManager.getFeature('camera_front') : null;
  res.json({ success: true, camera: 'front', status: feature ? feature.status : 'simulated', resolution: '2MP' });
});

router.post('/camera/detect-face', (req, res) => {
  res.json({ success: true, faces: Math.floor(Math.random() * 3), detected: true, confidence: 0.85 + Math.random() * 0.15 });
});

router.post('/camera/detect-object', (req, res) => {
  const objects = ['book', 'toy', 'person', 'pet', 'furniture'];
  res.json({ success: true, objects: objects.slice(0, Math.floor(Math.random() * 3) + 1) });
});

// ─── Motion / Movement (6) ───────────────────────────────────────
router.get('/imu', (req, res) => {
  res.json({ success: true, accel: { x: Math.random() - 0.5, y: Math.random() - 0.5, z: 0.98 + Math.random() * 0.04 }, gyro: { x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 } });
});

router.post('/motor/left', (req, res) => {
  const { speed } = req.body;
  res.json({ success: true, motor: 'left', speed: speed || 0 });
});

router.post('/motor/right', (req, res) => {
  const { speed } = req.body;
  res.json({ success: true, motor: 'right', speed: speed || 0 });
});

router.post('/servo/head', (req, res) => {
  const { pan, tilt } = req.body;
  res.json({ success: true, servo: 'head', pan: pan || 0, tilt: tilt || 0 });
});

// ─── Power / Battery (5) ─────────────────────────────────────────
router.get('/battery', (req, res) => {
  const val = hardwareManager ? hardwareManager.readSensor('battery_monitor') : { value: 0.7 + Math.random() * 0.2 };
  res.json({ success: true, battery: val ? Math.round(val.value * 100) : 75, charging: val ? val.value < 0.5 : false, voltage: val ? 3.3 + val.value * 0.9 : 3.7 });
});

router.post('/charge/start', (req, res) => {
  res.json({ success: true, message: 'Charging started' });
});

router.post('/charge/stop', (req, res) => {
  res.json({ success: true, message: 'Charging stopped' });
});

// ─── Chat Features (10+) ─────────────────────────────────────────
router.get('/chat/voice-status', (req, res) => {
  const s = voiceChatService ? voiceChatService.getStatus() : {};
  res.json({ success: true, status: s.status || 'unavailable', isWakeWordEnabled: s.isWakeWordEnabled || false, audioLevel: s.audioLevel || 0, language: s.language || 'en', sessionCount: s.sessionCount || 0 });
});

router.get('/chat/all-features', (req, res) => {
  res.json({
    success: true,
    features: {
      proximity: ['infrared', 'ultrasonic', 'lidar', 'pir_motion', 'microwave'],
      audio: ['internal_mic', 'external_mic', 'mic_array', 'internal_speaker', 'external_speaker', 'voice_wake_word', 'audio_playback', 'audio_recording'],
      vision: ['main_camera', 'front_camera', 'video_encoding', 'video_decoding', 'face_detection', 'object_detection'],
      communication: ['wifi_dual_band', 'bluetooth_ble', 'ethernet', 'cellular_4g', 'lora', 'zigbee'],
      hmi: ['touchscreen', 'led_indicators', 'power_button', 'volume_buttons', 'sos_button'],
      environment: ['temperature', 'humidity', 'air_quality', 'ambient_light', 'barometer', 'gas_detector', 'flame_detector', 'sound_level', 'uv_index'],
      motion: ['9dof_imu', 'left_motor', 'right_motor', 'left_encoder', 'right_encoder', 'head_servo'],
      power: ['battery_monitor', 'smart_charger', 'power_management', 'rtc', 'watchdog'],
      chat: ['voice_chat', 'video_call', 'text_chat', 'tts', 'stt', 'emotion_recognition', 'context_memory', 'adaptive_learning', 'knowledge_graph', 'forgetting_curve']
    },
    total: 46
  });
});

// ─── Hardware Diagnostic ──────────────────────────────────────────
router.get('/diagnostic', (req, res) => {
  if (hardwareManager) {
    const diag = hardwareManager.runDiagnostic();
    res.json({ success: true, diagnostic: diag });
  } else {
    res.json({ success: true, diagnostic: { status: 'simulated', features: [] } });
  }
});

router.get('/status', (req, res) => {
  const hwStatus = hardwareManager ? hardwareManager.getStatus() : {};
  const voiceStatus = voiceChatService ? voiceChatService.getStatus() : {};
  res.json({
    success: true,
    hardware: hwStatus,
    voice: voiceStatus,
    monitoring: _proxMonitoring
  });
});

module.exports = router;
