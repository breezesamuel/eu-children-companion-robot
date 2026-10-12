const express = require('express');
const router = express.Router();
const videoCall = require('../services/video-call');

const callHistory = new Map();
const callSchedules = new Map();
const feedbackEntries = new Map();
const qualityMetrics = new Map();
const virtualBackgrounds = new Map();
const participantStore = new Map();

router.get('/servers', (req, res) => {
  res.json({ success: true, data: videoCall.getTURNServers() });
});

router.post('/create', (req, res) => {
  const { callerId, calleeId, type } = req.body;
  if (!callerId || !calleeId) return res.status(400).json({ success: false, error: 'callerId and calleeId required' });
  const session = videoCall.createSession(callerId, calleeId, { type });
  res.status(201).json({ success: true, data: session });
});

router.post('/:sessionId/accept', (req, res) => {
  const result = videoCall.acceptSession(req.params.sessionId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.post('/:sessionId/reject', (req, res) => {
  const result = videoCall.rejectSession(req.params.sessionId, req.body.reason);
  res.json(result);
});

router.post('/:sessionId/end', (req, res) => {
  const result = videoCall.endSession(req.params.sessionId);
  res.json(result);
});

router.post('/:sessionId/ice-candidate', (req, res) => {
  const result = videoCall.handleICECandidate(req.params.sessionId, req.body.candidate);
  res.json(result);
});

router.post('/:sessionId/offer', (req, res) => {
  const result = videoCall.handleOffer(req.params.sessionId, req.body.sdp);
  res.json(result);
});

router.post('/:sessionId/answer', (req, res) => {
  const result = videoCall.handleAnswer(req.params.sessionId, req.body.sdp);
  res.json(result);
});

router.post('/:sessionId/mute', (req, res) => {
  const result = videoCall.toggleMute(req.params.sessionId, req.body.type || 'audio');
  res.json(result);
});

router.get('/:sessionId', (req, res) => {
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: session });
});

router.get('/user/:userId', (req, res) => {
  res.json({ success: true, data: videoCall.getUserSessions(req.params.userId) });
});

router.get('/stats/all', (req, res) => {
  res.json({ success: true, data: videoCall.getStats() });
});

router.put('/stun-turn', (req, res) => {
  const { stunServers, turnServers } = req.body;
  const config = videoCall.configureSTUNTURN ? videoCall.configureSTUNTURN({ stunServers, turnServers }) : { stunServers, turnServers };
  res.json({ success: true, data: config });
});

router.get('/stun-turn', (req, res) => {
  const config = videoCall.getSTUNTURNConfig ? videoCall.getSTUNTURNConfig() : { stunServers: ['stun:stun.l.google.com:19302'], turnServers: [] };
  res.json({ success: true, data: config });
});

router.post('/:sessionId/quality', (req, res) => {
  const { bitrate, framerate, resolution, rtt, packetLoss } = req.body;
  qualityMetrics.set(req.params.sessionId, { sessionId: req.params.sessionId, bitrate, framerate, resolution, rtt, packetLoss, timestamp: new Date().toISOString() });
  res.json({ success: true, data: qualityMetrics.get(req.params.sessionId) });
});

router.get('/:sessionId/quality', (req, res) => {
  res.json({ success: true, data: qualityMetrics.get(req.params.sessionId) || { message: 'No metrics yet' } });
});

router.post('/:sessionId/recording/start', (req, res) => {
  const { format, quality } = req.body;
  const result = videoCall.startRecording ? videoCall.startRecording(req.params.sessionId, { format: format || 'mp4', quality: quality || 'hd' }) : { recording: true, sessionId: req.params.sessionId, format: format || 'mp4' };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/recording/stop', (req, res) => {
  const result = videoCall.stopRecording ? videoCall.stopRecording(req.params.sessionId) : { recording: false, sessionId: req.params.sessionId, duration: 0 };
  res.json({ success: true, data: result });
});

router.get('/:sessionId/recording', (req, res) => {
  const status = videoCall.getRecordingStatus ? videoCall.getRecordingStatus(req.params.sessionId) : { recording: false };
  res.json({ success: true, data: status });
});

router.post('/:sessionId/background', (req, res) => {
  const { backgroundId, type, url } = req.body;
  const uid = req.session?.userId || req.params.sessionId;
  virtualBackgrounds.set(uid, { userId: uid, backgroundId: backgroundId || 'blur', type: type || 'image', url: url || '', sessionId: req.params.sessionId });
  res.json({ success: true, data: virtualBackgrounds.get(uid) });
});

router.get('/:sessionId/background', (req, res) => {
  const uid = req.session?.userId || req.params.sessionId;
  res.json({ success: true, data: virtualBackgrounds.get(uid) || { backgroundId: 'none' } });
});

router.get('/backgrounds', (req, res) => {
  const defaults = [
    { id: 'blur', name: 'Blur', type: 'effect' },
    { id: 'office', name: 'Office', type: 'image', url: '/bg/office.jpg' },
    { id: 'beach', name: 'Beach', type: 'image', url: '/bg/beach.jpg' },
    { id: 'space', name: 'Space', type: 'image', url: '/bg/space.jpg' }
  ];
  res.json({ success: true, data: defaults });
});

router.post('/:sessionId/screen-share/start', (req, res) => {
  const result = videoCall.startScreenShare ? videoCall.startScreenShare(req.params.sessionId) : { screenSharing: true, sessionId: req.params.sessionId };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/screen-share/stop', (req, res) => {
  const result = videoCall.stopScreenShare ? videoCall.stopScreenShare(req.params.sessionId) : { screenSharing: false };
  res.json({ success: true, data: result });
});

router.get('/:sessionId/screen-share', (req, res) => {
  const status = videoCall.getScreenShareStatus ? videoCall.getScreenShareStatus(req.params.sessionId) : { active: false };
  res.json({ success: true, data: status });
});

router.post('/:sessionId/participants', (req, res) => {
  const { userId, name, role } = req.body;
  if (!userId || !name) return res.status(400).json({ success: false, error: 'userId and name required' });
  if (!participantStore.has(req.params.sessionId)) participantStore.set(req.params.sessionId, []);
  participantStore.get(req.params.sessionId).push({ userId, name, role: role || 'participant', joinedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: { sessionId: req.params.sessionId, participants: participantStore.get(req.params.sessionId) } });
});

router.get('/:sessionId/participants', (req, res) => {
  res.json({ success: true, data: participantStore.get(req.params.sessionId) || [] });
});

router.delete('/:sessionId/participants/:userId', (req, res) => {
  const participants = participantStore.get(req.params.sessionId);
  if (!participants) return res.status(404).json({ success: false, error: 'Session not found' });
  const idx = participants.findIndex(p => p.userId === req.params.userId);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Participant not found' });
  participants.splice(idx, 1);
  res.json({ success: true });
});

router.post('/schedule', (req, res) => {
  const { title, participants, startTime, endTime, type } = req.body;
  if (!title || !startTime) return res.status(400).json({ success: false, error: 'title and startTime required' });
  const scheduleId = 'sched-' + Date.now();
  callSchedules.set(scheduleId, { id: scheduleId, title, participants: participants || [], startTime, endTime: endTime || null, type: type || 'video', status: 'scheduled', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: callSchedules.get(scheduleId) });
});

router.get('/schedule', (req, res) => {
  const { status, userId } = req.query;
  let items = Array.from(callSchedules.values());
  if (status) items = items.filter(s => s.status === status);
  if (userId) items = items.filter(s => s.participants.includes(userId));
  res.json({ success: true, data: items });
});

router.put('/schedule/:id', (req, res) => {
  const sched = callSchedules.get(req.params.id);
  if (!sched) return res.status(404).json({ success: false, error: 'Schedule not found' });
  Object.assign(sched, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: sched });
});

router.delete('/schedule/:id', (req, res) => {
  if (!callSchedules.has(req.params.id)) return res.status(404).json({ success: false, error: 'Schedule not found' });
  callSchedules.delete(req.params.id);
  res.json({ success: true });
});

router.get('/history', (req, res) => {
  const { userId, from, to, status, limit } = req.query;
  let history = Array.from(callHistory.values());
  if (userId) history = history.filter(h => h.callerId === userId || h.calleeId === userId);
  if (from) history = history.filter(h => new Date(h.startedAt) >= new Date(from));
  if (to) history = history.filter(h => new Date(h.startedAt) <= new Date(to));
  if (status) history = history.filter(h => h.status === status);
  res.json({ success: true, data: history.sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0)).slice(0, parseInt(limit) || 50) });
});

router.post('/history', (req, res) => {
  const { sessionId, callerId, calleeId, status, duration, startedAt } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
  callHistory.set(sessionId, { sessionId, callerId, calleeId, status: status || 'completed', duration: duration || 0, startedAt: startedAt || new Date().toISOString(), endedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: callHistory.get(sessionId) });
});

router.post('/:sessionId/emergency', (req, res) => {
  const { reason, location } = req.body;
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const emergencyRoute = videoCall.emergencyRoute ? videoCall.emergencyRoute(req.params.sessionId, { reason, location }) : { routed: true, to: 'emergency-services', reason, location };
  res.json({ success: true, data: emergencyRoute });
});

router.post('/feedback', (req, res) => {
  const { sessionId, rating, comment, userId } = req.body;
  if (!sessionId || !rating) return res.status(400).json({ success: false, error: 'sessionId and rating required' });
  const fid = 'fb-' + Date.now();
  feedbackEntries.set(fid, { id: fid, sessionId, userId: userId || 'anon', rating: Math.min(5, Math.max(1, parseInt(rating))), comment: comment || '', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: feedbackEntries.get(fid) });
});

router.get('/feedback', (req, res) => {
  const { sessionId, userId } = req.query;
  let items = Array.from(feedbackEntries.values());
  if (sessionId) items = items.filter(f => f.sessionId === sessionId);
  if (userId) items = items.filter(f => f.userId === userId);
  const avg = items.length > 0 ? items.reduce((a, f) => a + f.rating, 0) / items.length : 0;
  res.json({ success: true, data: { feedbacks: items, averageRating: avg, count: items.length } });
});

router.put('/:sessionId/layout', (req, res) => {
  const { layout } = req.body;
  if (!layout) return res.status(400).json({ success: false, error: 'layout required' });
  const result = videoCall.setLayout ? videoCall.setLayout(req.params.sessionId, layout) : { sessionId: req.params.sessionId, layout };
  res.json({ success: true, data: result });
});

router.get('/:sessionId/layout', (req, res) => {
  const layout = videoCall.getLayout ? videoCall.getLayout(req.params.sessionId) : { layout: 'grid' };
  res.json({ success: true, data: layout });
});

router.post('/:sessionId/raise-hand', (req, res) => {
  const { userId } = req.body;
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const result = videoCall.raiseHand ? videoCall.raiseHand(req.params.sessionId, userId || 'anon') : { handRaised: true };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/lower-hand', (req, res) => {
  const { userId } = req.body;
  const result = videoCall.lowerHand ? videoCall.lowerHand(req.params.sessionId, userId || 'anon') : { handRaised: false };
  res.json({ success: true, data: result });
});

router.get('/:sessionId/raised-hands', (req, res) => {
  const hands = videoCall.getRaisedHands ? videoCall.getRaisedHands(req.params.sessionId) : [];
  res.json({ success: true, data: hands });
});

router.post('/:sessionId/transfer', (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ success: false, error: 'targetUserId required' });
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const result = videoCall.transferCall ? videoCall.transferCall(req.params.sessionId, targetUserId) : { transferred: true, to: targetUserId };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/hold', (req, res) => {
  const result = videoCall.holdCall ? videoCall.holdCall(req.params.sessionId) : { onHold: true };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/resume', (req, res) => {
  const result = videoCall.resumeCall ? videoCall.resumeCall(req.params.sessionId) : { onHold: false };
  res.json({ success: true, data: result });
});

router.get('/:sessionId/network-stats', (req, res) => {
  const stats = videoCall.getNetworkStats ? videoCall.getNetworkStats(req.params.sessionId) : { rtt: 0, packetLoss: 0, bitrate: 0, jitter: 0 };
  res.json({ success: true, data: stats });
});

router.put('/:sessionId/bitrate', (req, res) => {
  const { maxBitrate } = req.body;
  if (!maxBitrate) return res.status(400).json({ success: false, error: 'maxBitrate required' });
  const result = videoCall.setMaxBitrate ? videoCall.setMaxBitrate(req.params.sessionId, parseInt(maxBitrate)) : { maxBitrate: parseInt(maxBitrate) };
  res.json({ success: true, data: result });
});

router.put('/:sessionId/participants/:userId/role', (req, res) => {
  const participants = participantStore.get(req.params.sessionId);
  if (!participants) return res.status(404).json({ success: false, error: 'Session not found' });
  const participant = participants.find(p => p.userId === req.params.userId);
  if (!participant) return res.status(404).json({ success: false, error: 'Participant not found' });
  participant.role = req.body.role || participant.role;
  participant.updatedAt = new Date().toISOString();
  res.json({ success: true, data: participant });
});

router.post('/:sessionId/participants/:userId/mute', (req, res) => {
  const { audio, video } = req.body;
  const result = videoCall.muteParticipant ? videoCall.muteParticipant(req.params.sessionId, req.params.userId, { audio: audio !== false, video: video !== false }) : { muted: true, audio, video };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/participants/:userId/unmute', (req, res) => {
  const result = videoCall.unmuteParticipant ? videoCall.unmuteParticipant(req.params.sessionId, req.params.userId) : { muted: false };
  res.json({ success: true, data: result });
});

router.post('/:sessionId/participants/:userId/kick', (req, res) => {
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const result = videoCall.kickParticipant ? videoCall.kickParticipant(req.params.sessionId, req.params.userId) : { kicked: true, userId: req.params.userId };
  const participants = participantStore.get(req.params.sessionId);
  if (participants) {
    participantStore.set(req.params.sessionId, participants.filter(p => p.userId !== req.params.userId));
  }
  res.json({ success: true, data: result });
});

router.get('/:sessionId/participants/count', (req, res) => {
  const participants = participantStore.get(req.params.sessionId) || [];
  res.json({ success: true, data: { count: participants.length, participants } });
});

router.post('/recordings', (req, res) => {
  const { sessionId, filename, duration, size, url } = req.body;
  if (!sessionId || !filename) return res.status(400).json({ success: false, error: 'sessionId and filename required' });
  const recordingId = 'rec-' + Date.now();
  const recording = { id: recordingId, sessionId, filename, duration: duration || 0, size: size || 0, url: url || '', createdAt: new Date().toISOString() };
  if (!recordingsStore) var recordingsStore = new Map();
  recordingsStore.set(recordingId, recording);
  res.status(201).json({ success: true, data: recording });
});

router.get('/recordings', (req, res) => {
  const { sessionId, limit } = req.query;
  var recordingsStore = typeof recordingsStore !== 'undefined' ? recordingsStore : new Map();
  let recordings = Array.from(recordingsStore.values());
  if (sessionId) recordings = recordings.filter(r => r.sessionId === sessionId);
  res.json({ success: true, data: recordings.slice(0, parseInt(limit) || 50) });
});

router.delete('/recordings/:id', (req, res) => {
  var recordingsStore = typeof recordingsStore !== 'undefined' ? recordingsStore : new Map();
  if (!recordingsStore.has(req.params.id)) return res.status(404).json({ success: false, error: 'Recording not found' });
  recordingsStore.delete(req.params.id);
  res.json({ success: true });
});

router.get('/:sessionId/recording/download', (req, res) => {
  const session = videoCall.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const downloadUrl = videoCall.getRecordingDownloadUrl ? videoCall.getRecordingDownloadUrl(req.params.sessionId) : { url: '', expiresIn: 3600 };
  res.json({ success: true, data: downloadUrl });
});

router.get('/emergency/contacts', (req, res) => {
  const contacts = videoCall.getEmergencyContacts ? videoCall.getEmergencyContacts() : [{ name: 'Emergency Services', number: '112' }];
  res.json({ success: true, data: contacts });
});

router.post('/emergency/contacts', (req, res) => {
  const { name, number, priority } = req.body;
  if (!name || !number) return res.status(400).json({ success: false, error: 'name and number required' });
  const result = videoCall.addEmergencyContact ? videoCall.addEmergencyContact({ name, number, priority: priority || 1 }) : { added: true, name, number };
  res.json({ success: true, data: result });
});

router.delete('/:sessionId/background', (req, res) => {
  const uid = req.session?.userId || req.params.sessionId;
  virtualBackgrounds.delete(uid);
  res.json({ success: true, data: { backgroundId: 'none' } });
});

router.post('/backgrounds/custom', (req, res) => {
  const { name, url, type } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, error: 'name and url required' });
  const bgId = 'bg-' + Date.now();
  const bg = { id: bgId, name, url, type: type || 'image', custom: true, createdAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: bg });
});

router.get('/feedback/stats', (req, res) => {
  const items = Array.from(feedbackEntries.values());
  const avg = items.length > 0 ? items.reduce((a, f) => a + f.rating, 0) / items.length : 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach(f => { if (distribution[f.rating] !== undefined) distribution[f.rating]++; });
  res.json({ success: true, data: { total: items.length, averageRating: avg, distribution } });
});

router.get('/status', (req, res) => {
  var recordingsStore = typeof recordingsStore !== 'undefined' ? recordingsStore : new Map();
  res.json({
    success: true,
    data: {
      activeSessions: videoCall.getStats ? videoCall.getStats()?.activeSessions || 0 : 0,
      scheduledCalls: callSchedules.size,
      historyEntries: callHistory.size,
      feedbackCount: feedbackEntries.size,
      participants: Array.from(participantStore.values()).reduce((a, p) => a + p.length, 0),
      recordings: recordingsStore.size
    }
  });
});

module.exports = router;
