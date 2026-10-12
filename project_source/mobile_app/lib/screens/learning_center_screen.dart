import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class LearningCenterScreen extends StatefulWidget {
  const LearningCenterScreen({super.key});

  @override
  State<LearningCenterScreen> createState() => _LearningCenterScreenState();
}

class _LearningCenterScreenState extends State<LearningCenterScreen> {
  List<Map<String, dynamic>> _subjects = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSubjects();
  }

  Future<void> _loadSubjects() async {
    try {
      final res = await http.get(Uri.parse('/api/v1/content/subjects')).timeout(const Duration(seconds: 5));
      if (mounted) {
        final body = jsonDecode(res.body);
        if (body['success'] == true) {
          setState(() { _subjects = List<Map<String, dynamic>>.from(body['data']); _loading = false; });
          return;
        }
      }
    } catch (_) {}
    if (mounted) setState(() {
      _subjects = [
        {'id': 'math', 'itemCount': 200}, {'id': 'science', 'itemCount': 180},
        {'id': 'stories', 'itemCount': 154}, {'id': 'music', 'itemCount': 89},
        {'id': 'arts', 'itemCount': 80}, {'id': 'coding', 'itemCount': 161},
      ];
      _loading = false;
    });
  }

  IconData _iconFor(String id) {
    switch (id) {
      case 'math': return Icons.calculate;
      case 'science': return Icons.science;
      case 'stories': return Icons.auto_stories;
      case 'music': return Icons.music_note;
      case 'arts': return Icons.palette;
      case 'coding': return Icons.code;
      case 'biology': return Icons.biotech;
      case 'geography': return Icons.public;
      case 'history': return Icons.history_edu;
      case 'tech': return Icons.computer;
      case 'physics': return Icons.physics;
      case 'chemistry': return Icons.science_outlined;
      default: return Icons.school;
    }
  }

  Color _colorFor(String id) {
    final colors = [Colors.blue, Colors.green, Colors.orange, Colors.purple, Colors.pink, Colors.teal, Colors.indigo, Colors.cyan, Colors.deepOrange, Colors.brown, Colors.lime, Colors.amber];
    return colors[id.hashCode % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Learning Center'), centerTitle: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Subjects', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.85,
                    ),
                    itemCount: _subjects.length,
                    itemBuilder: (_, i) {
                      final s = _subjects[i];
                      final id = s['id'] as String;
                      final count = s['itemCount'] ?? 0;
                      final color = _colorFor(id);
                      return InkWell(
                        onTap: () => _openSubject(context, id),
                        borderRadius: BorderRadius.circular(12),
                        child: Card(
                          elevation: 3,
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(_iconFor(id), size: 32, color: color),
                                const SizedBox(height: 8),
                                Text(id[0].toUpperCase() + id.substring(1), textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                const SizedBox(height: 4),
                                Text('$count items', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  const Text('Recent Progress', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Weekly Learning Hours'),
                          Text('${_subjects.length * 2}.5 hours', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text('Quick Activities', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 2,
                    child: Column(
                      children: [
                        ListTile(leading: const Icon(Icons.quiz, color: Colors.blue), title: const Text('Daily Quiz'), subtitle: const Text('5 quick questions'), trailing: const Icon(Icons.arrow_forward_ios, size: 16), onTap: () {}),
                        const Divider(height: 1),
                        ListTile(leading: const Icon(Icons.headphones, color: Colors.green), title: const Text('Listen & Learn'), subtitle: const Text('Audio lessons'), trailing: const Icon(Icons.arrow_forward_ios, size: 16), onTap: () {}),
                        const Divider(height: 1),
                        ListTile(leading: const Icon(Icons.emoji_events, color: Colors.orange), title: const Text('Challenge Mode'), subtitle: const Text('Test your skills'), trailing: const Icon(Icons.arrow_forward_ios, size: 16), onTap: () {}),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  void _openSubject(BuildContext context, String id) {
    showModalBottomSheet(
      context: context,
      builder: (_) => _SubjectDetailSheet(subjectId: id),
    );
  }
}

class _SubjectDetailSheet extends StatefulWidget {
  final String subjectId;
  const _SubjectDetailSheet({required this.subjectId});

  @override
  State<_SubjectDetailSheet> createState() => _SubjectDetailSheetState();
}

class _SubjectDetailSheetState extends State<_SubjectDetailSheet> {
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await http.get(Uri.parse('/api/v1/content/${widget.subjectId}?limit=20')).timeout(const Duration(seconds: 5));
      if (mounted) {
        final body = jsonDecode(res.body);
        if (body['success'] == true) setState(() { _items = body['data']; _loading = false; });
        else setState(() => _loading = false);
      }
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, scrollController) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 12),
            Text(widget.subjectId[0].toUpperCase() + widget.subjectId.substring(1), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _items.isEmpty
                      ? const Center(child: Text('No content available'))
                      : ListView.separated(
                          controller: scrollController,
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final item = _items[i];
                            return ListTile(
                              leading: const Icon(Icons.article_outlined),
                              title: Text(item['title'] ?? 'Untitled', style: const TextStyle(fontWeight: FontWeight.w500)),
                              subtitle: Text(item['category'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              trailing: Text(item['level'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.blue)),
                              onTap: () {},
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
