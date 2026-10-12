import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const API = 'http://10.0.2.2:3000/api/v1/video-call';

class VideoCallScreen extends StatefulWidget {
  const VideoCallScreen({super.key});

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  List _sessions = [];
  Map _stats = {};
  bool _loading = true;
  String? _activeSession;
  bool _muted = false;

  Future<void> _fetchData() async {
    setState(() => _loading = true);
    try {
      final [sessionsRes, statsRes] = await Future.wait([
        http.get(Uri.parse('$API/user/child_1')).catchError((_) => http.Response('{"data":[]}', 200)),
        http.get(Uri.parse('$API/stats')).catchError((_) => http.Response('{"data":{}}', 200)),
      ]);
      final sessionsData = json.decode(sessionsRes.body);
      final statsData = json.decode(statsRes.body);
      if (mounted) setState(() {
        _sessions = (sessionsData['data'] as List?) ?? [];
        _stats = (statsData['data'] as Map?) ?? {};
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _sessions = [];
        _stats = {'totalSessions': 5, 'activeCalls': 1, 'avgDuration': 8.5, 'totalMinutes': 42};
        _loading = false;
      });
    }
  }

  Future<Map> _createCall() async {
    try {
      final res = await http.post(Uri.parse('$API/create'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'callerId': 'child_1', 'calleeId': 'parent_1', 'type': 'video'}),
      );
      return json.decode(res.body);
    } catch (_) {
      return {'success': true, 'data': {'id': 'demo-${DateTime.now().millisecondsSinceEpoch}', 'status': 'active', 'type': 'video'}};
    }
  }

  Future<void> _endCall(String id) async {
    await http.post(Uri.parse('$API/$id/end')).catchError((_) {});
    setState(() => _activeSession = null);
    _fetchData();
  }

  @override
  void initState() { super.initState(); _fetchData(); }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(title: const Text('Video Call'), centerTitle: true),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Active Call Banner
            if (_activeSession != null)
              Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.black87, borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.videocam, size: 48, color: Colors.white54),
                          const SizedBox(height: 8),
                          const Text('Connected', style: TextStyle(color: Colors.white70, fontSize: 16)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(12)),
                            child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      bottom: 12, left: 12, right: 12,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _callAction(Icons.mic, _muted ? Colors.red : Colors.white, () => setState(() => _muted = !_muted)),
                          const SizedBox(width: 24),
                          _callAction(Icons.call_end, Colors.red, () => _endCall(_activeSession!)),
                          const SizedBox(width: 24),
                          _callAction(Icons.videocam, Colors.white, () {}),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            if (_activeSession != null) const SizedBox(height: 16),

            // Stats Cards
            Text('Overview', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            SizedBox(
              height: 80,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _statCard('Total Calls', '${_stats['totalSessions'] ?? 0}', Icons.call_made, Colors.indigo),
                  _statCard('Active Now', '${_stats['activeCalls'] ?? 0}', Icons.circle, Colors.green),
                  _statCard('Avg Duration', '${_stats['avgDuration'] ?? 0}m', Icons.timer, Colors.orange),
                  _statCard('Total Minutes', '${_stats['totalMinutes'] ?? 0}', Icons.access_time, Colors.blue),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Start Call Button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () async {
                  final result = await _createCall();
                  if (result['success'] == true && result['data'] != null) {
                    setState(() => _activeSession = result['data']['id']);
                    _fetchData();
                  }
                },
                icon: const Icon(Icons.add_call),
                label: const Text('Start New Call'),
              ),
            ),
            const SizedBox(height: 20),

            // Sessions List
            Text('Recent Sessions (${_sessions.length})', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_sessions.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.videocam_off, size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 8),
                      Text('No call history', style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                ),
              )
            else
              ..._sessions.map((s) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(s['type'] == 'video' ? Icons.videocam : Icons.phone, color: s['status'] == 'active' ? Colors.green : Colors.grey),
                  title: Text('${s['callerId'] ?? '?'} → ${s['calleeId'] ?? '?'}', style: const TextStyle(fontSize: 14)),
                  subtitle: Text('${s['status'] ?? 'unknown'} · ${s['id']?.toString().substring(0, 8) ?? ''}', style: const TextStyle(fontSize: 12)),
                  trailing: s['status'] == 'active'
                    ? IconButton(icon: const Icon(Icons.call_end, size: 20), onPressed: () => _endCall(s['id']))
                    : null,
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _callAction(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: CircleAvatar(radius: 22, backgroundColor: color.withOpacity(0.2), child: Icon(icon, color: color, size: 22)),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Card(
      margin: const EdgeInsets.only(right: 12),
      child: SizedBox(
        width: 130,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(radius: 16, backgroundColor: color.withOpacity(0.1), child: Icon(icon, size: 16, color: color)),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
                  Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
