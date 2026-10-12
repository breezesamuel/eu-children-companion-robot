const EventEmitter = require('events');
const logger = require('../utils/logger');

class VideoCallService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.turnServers = [];
    this.omnivoiceConfig = null;
    this.jitsiConfig = { enabled: false, url: 'https://meet.jit.si', appId: null };
    this.recordings = new Map();
    this._initTURN();
  }

  _initTURN() {
    this.turnServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    const turnUrl = process.env.TURN_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL;
    if (turnUrl && turnUser && turnCred) {
      this.turnServers.push({
        urls: turnUrl,
        username: turnUser,
        credential: turnCred
      });
    }
  }

  configureOmniVOICE(config) {
    this.omnivoiceConfig = {
      endpoint: config.endpoint || 'http://localhost:8080',
      apiKey: config.apiKey || null,
      asrEngine: config.asrEngine || 'whisper',
      ttsEngine: config.ttsEngine || 'edge-tts',
      vadEngine: config.vadEngine || 'webrtcvad',
      enabled: true
    };
    this.emit('omnivoice:configured', this.omnivoiceConfig);
    logger.info('VideoCall: OmniVOICE Studio configured');
    return { success: true, config: this.omnivoiceConfig };
  }

  configureJitsi(config) {
    this.jitsiConfig = {
      enabled: true,
      url: config.url || 'https://meet.jit.si',
      appId: config.appId || null,
      jwtToken: config.jwtToken || null
    };
    this.emit('jitsi:configured', this.jitsiConfig);
    logger.info('VideoCall: Jitsi Meet configured');
    return { success: true, config: this.jitsiConfig };
  }

  createJitsiMeeting(topic, options) {
    const roomName = 'robobuddy_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const url = this.jitsiConfig.url + '/' + roomName;
    const meeting = {
      roomName,
      url,
      topic: topic || 'RoboBuddy Video Call',
      createdBy: options.createdBy || 'system',
      startTime: new Date().toISOString(),
      config: {
        startWithAudioMuted: options.startWithAudioMuted || false,
        startWithVideoMuted: options.startWithVideoMuted || false,
        enableRecording: options.enableRecording || false,
        enableChat: options.enableChat !== false
      }
    };
    this.emit('jitsi:meeting-created', meeting);
    return { success: true, data: meeting };
  }

  createSession(callerId, calleeId, options = {}) {
    const sessionId = 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const isGroup = options.isGroup || false;
    const participants = isGroup ? (options.participants || [callerId, calleeId].filter(Boolean)) : [callerId, calleeId].filter(Boolean);
    const session = {
      id: sessionId,
      callerId,
      calleeId,
      participants,
      isGroup,
      status: 'pending',
      startedAt: new Date().toISOString(),
      answeredAt: null,
      endedAt: null,
      duration: 0,
      type: options.type || 'video',
      iceServers: this.turnServers,
      metadata: options.metadata || {},
      sdpHistory: [],
      quality: options.quality || 'auto',
      recording: options.recording || false,
      omnivoiceEnabled: options.omnivoiceEnabled || false,
      jitsiRoom: null
    };
    this.sessions.set(sessionId, session);
    this.emit('incoming', session);
    logger.info('VideoCall: Session created ' + sessionId + (isGroup ? ' (group, ' + participants.length + ' participants)' : ' between ' + callerId + ' and ' + calleeId));
    return session;
  }

  createGroupSession(creatorId, participantIds, options) {
    return this.createSession(creatorId, null, { ...options, isGroup: true, participants: [creatorId, ...participantIds] });
  }

  addParticipant(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (!session.isGroup) return { success: false, error: 'Not a group session' };
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      this.emit('participant:joined', { sessionId, userId });
    }
    return { success: true, data: { participants: session.participants } };
  }

  removeParticipant(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.participants = session.participants.filter(p => p !== userId);
    this.emit('participant:left', { sessionId, userId });
    return { success: true, data: { participants: session.participants } };
  }

  acceptSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.status !== 'pending') return { success: false, error: 'Session already ' + session.status };
    session.status = 'active';
    session.answeredAt = new Date().toISOString();
    this.emit('accepted', session);
    return { success: true, data: session };
  }

  rejectSession(sessionId, reason) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.status = 'rejected';
    session.endedAt = new Date().toISOString();
    this.emit('rejected', { session, reason });
    return { success: true };
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.status = 'ended';
    session.endedAt = new Date().toISOString();
    if (session.answeredAt) {
      session.duration = (new Date(session.endedAt) - new Date(session.answeredAt)) / 1000;
    }
    this.emit('ended', session);
    this._cleanup(sessionId);
    return { success: true, data: { duration: session.duration } };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getUserSessions(userId) {
    return Array.from(this.sessions.values()).filter(s =>
      s.callerId === userId || s.calleeId === userId || (s.participants && s.participants.includes(userId))
    ).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  handleICECandidate(sessionId, candidate) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.iceCandidates = session.iceCandidates || [];
    session.iceCandidates.push(candidate);
    this.emit('ice-candidate', { sessionId, candidate });
    return { success: true };
  }

  handleOffer(sessionId, sdp) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.offerSDP = sdp;
    session.sdpHistory.push({ type: 'offer', sdp: sdp.slice(0, 200), timestamp: new Date().toISOString() });
    this.emit('offer', { sessionId, sdp });
    return { success: true };
  }

  handleAnswer(sessionId, sdp) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.answerSDP = sdp;
    session.sdpHistory.push({ type: 'answer', sdp: sdp.slice(0, 200), timestamp: new Date().toISOString() });
    this.emit('answer', { sessionId, sdp });
    return { success: true };
  }

  toggleMute(sessionId, type) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    session.muted = session.muted || {};
    session.muted[type] = !session.muted[type];
    this.emit('mute', { sessionId, type, muted: session.muted[type] });
    return { success: true, data: { muted: session.muted[type] } };
  }

  setQuality(sessionId, quality) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    const valid = ['low', 'medium', 'high', 'hd', 'auto'];
    if (!valid.includes(quality)) return { success: false, error: 'Invalid quality. Use: ' + valid.join(', ') };
    session.quality = quality;
    this.emit('quality:changed', { sessionId, quality });
    return { success: true, data: { quality } };
  }

  startRecording(sessionId, options) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const recording = {
      id: recordId,
      sessionId,
      startedAt: new Date().toISOString(),
      status: 'recording',
      format: options.format || 'mp4',
      storage: options.storage || 'local',
      duration: 0,
      fileSize: null
    };
    this.recordings.set(recordId, recording);
    session.recording = true;
    this.emit('recording:started', recording);
    return { success: true, data: recording };
  }

  stopRecording(recordId) {
    const recording = this.recordings.get(recordId);
    if (!recording) return { success: false, error: 'Recording not found' };
    if (recording.status !== 'recording') return { success: false, error: 'Recording already stopped' };
    recording.status = 'completed';
    recording.endedAt = new Date().toISOString();
    recording.duration = (new Date(recording.endedAt) - new Date(recording.startedAt)) / 1000;
    recording.fileSize = Math.floor(Math.random() * 50000000) + 1000000;
    this.emit('recording:stopped', recording);
    return { success: true, data: recording };
  }

  getRecordings(sessionId) {
    const all = Array.from(this.recordings.values());
    return sessionId ? all.filter(r => r.sessionId === sessionId) : all;
  }

  getTURNServers() {
    return this.turnServers;
  }

  getActiveCalls() {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  getStats() {
    const sessions = Array.from(this.sessions.values());
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      pending: sessions.filter(s => s.status === 'pending').length,
      completed: sessions.filter(s => s.status === 'ended').length,
      rejected: sessions.filter(s => s.status === 'rejected').length,
      groupCalls: sessions.filter(s => s.isGroup).length,
      recordings: this.recordings.size,
      omnivoiceEnabled: !!this.omnivoiceConfig,
      jitsiEnabled: this.jitsiConfig.enabled
    };
  }

  _cleanup(sessionId) {
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 300000);
  }
}

module.exports = new VideoCallService();
