import 'package:flutter/material.dart';

class EmotionTrackerScreen extends StatefulWidget {
  const EmotionTrackerScreen({super.key});

  @override
  State<EmotionTrackerScreen> createState() => _EmotionTrackerScreenState();
}

class _EmotionTrackerScreenState extends State<EmotionTrackerScreen> {
  final List<Map<String, dynamic>> _emotions = [];
  String _selectedEmotion = 'happy';
  String _selectedReason = '';
  final TextEditingController _noteController = TextEditingController();

  static const _emotionsList = [
    {'emoji': '😊', 'label': 'happy', 'color': Color(0xFF4CAF50)},
    {'emoji': '😢', 'label': 'sad', 'color': Color(0xFF2196F3)},
    {'emoji': '😡', 'label': 'angry', 'color': Color(0xFFF44336)},
    {'emoji': '😨', 'label': 'scared', 'color': Color(0xFF9C27B0)},
    {'emoji': '😴', 'label': 'tired', 'color': Color(0xFF607D8B)},
    {'emoji': '🤗', 'label': 'loved', 'color': Color(0xFFE91E63)},
    {'emoji': '😌', 'label': 'calm', 'color': Color(0xFF009688)},
    {'emoji': '😄', 'label': 'excited', 'color': Color(0xFFFF9800)},
    {'emoji': '😔', 'label': 'lonely', 'color': Color(0xFF795548)},
    {'emoji': '🤔', 'label': 'confused', 'color': Color(0xFF673AB7)},
  ];

  static const _reasons = [
    'Playtime', 'Learning', 'Meal time', 'Bedtime', 'School', 'Friends',
    'Family', 'Game', 'Outside', 'Screen time', 'Sibling', 'Pet',
  ];

  String _getEmoji(String label) {
    return _emotionsList.firstWhere((e) => e['label'] == label, orElse: () => _emotionsList[0])['emoji'] as String;
  }

  Color _getColor(String label) {
    return _emotionsList.firstWhere((e) => e['label'] == label, orElse: () => _emotionsList[0])['color'] as Color;
  }

  void _addEmotion() {
    if (_selectedReason.isEmpty) return;
    setState(() {
      _emotions.insert(0, {
        'emotion': _selectedEmotion,
        'reason': _selectedReason,
        'note': _noteController.text,
        'time': DateTime.now(),
      });
    });
    _selectedReason = '';
    _noteController.clear();
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('How are you feeling?')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 10, runSpacing: 10,
            children: _emotionsList.map((e) {
              final selected = _selectedEmotion == e['label'];
              return GestureDetector(
                onTap: () => setState(() => _selectedEmotion = e['label'] as String),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? e['color'] as Color : e['color'].withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: selected ? e['color'] as Color : Colors.transparent, width: 2),
                  ),
                  child: Text('${e['emoji']} ${e['label']}',
                    style: TextStyle(color: selected ? Colors.white : e['color'] as Color, fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          const Text('What happened?', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _reasons.map((r) => ChoiceChip(
              label: Text(r),
              selected: _selectedReason == r,
              onSelected: (v) => setState(() => _selectedReason = v ? r : ''),
            )).toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            decoration: const InputDecoration(
              labelText: 'Add a note (optional)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.edit_note),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _selectedReason.isEmpty ? null : _addEmotion,
            icon: const Icon(Icons.add_reaction),
            label: const Text('Log Emotion'),
          ),
          const SizedBox(height: 24),
          if (_emotions.isEmpty)
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 48),
                  Icon(Icons.mood, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  Text('No emotions logged yet', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
                  Text('Tap an emotion above to start tracking!',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                ],
              ),
            )
          else ...[
            Row(children: [
              Text('History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
              const Spacer(),
              Text('${_emotions.length} entries', style: TextStyle(color: Colors.grey.shade500)),
            ]),
            const SizedBox(height: 8),
            ..._emotions.map((e) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _getColor(e['emotion'] as String).withValues(alpha: 0.2),
                  child: Text(_getEmoji(e['emotion'] as String), style: const TextStyle(fontSize: 24)),
                ),
                title: Text('${(e['emotion'] as String).toUpperCase()} - ${e['reason']}',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: e['note'] != null && (e['note'] as String).isNotEmpty
                  ? Text(e['note'] as String, maxLines: 1, overflow: TextOverflow.ellipsis) : null,
                trailing: Text(_timeAgo(e['time'] as DateTime), style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ),
            )),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }
}
