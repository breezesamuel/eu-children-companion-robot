import 'dart:math';
import 'package:flutter/material.dart';

class GamesScreen extends StatefulWidget {
  const GamesScreen({super.key});

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Games & Fun'), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Educational Games', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _GameCard(
              icon: Icons.calculate, title: 'Math Challenge', subtitle: 'Solve problems against the clock',
              color: Colors.blue, onTap: () => _startGame(context, 'math'),
            ),
            const SizedBox(height: 12),
            _GameCard(
              icon: Icons.spellcheck, title: 'Word Builder', subtitle: 'Spell words correctly',
              color: Colors.green, onTap: () => _startGame(context, 'spelling'),
            ),
            const SizedBox(height: 12),
            _GameCard(
              icon: Icons.memory, title: 'Memory Match', subtitle: 'Find matching pairs',
              color: Colors.purple, onTap: () => _startGame(context, 'memory'),
            ),
            const SizedBox(height: 12),
            _GameCard(
              icon: Icons.public, title: 'Quiz World', subtitle: 'Geography and science trivia',
              color: Colors.orange, onTap: () => _startGame(context, 'quiz'),
            ),
            const SizedBox(height: 12),
            _GameCard(
              icon: Icons.palette, title: 'Color & Draw', subtitle: 'Free drawing canvas',
              color: Colors.pink, onTap: () => _startGame(context, 'draw'),
            ),
            const SizedBox(height: 24),
            const Text('Leaderboard', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              elevation: 2,
              child: Column(
                children: [
                  _LeaderRow(rank: 1, name: 'Alex', score: 1250, medal: Colors.amber),
                  const Divider(height: 1),
                  _LeaderRow(rank: 2, name: 'Sarah', score: 980, medal: Colors.grey),
                  const Divider(height: 1),
                  _LeaderRow(rank: 3, name: 'Mike', score: 720, medal: Colors.brown),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _startGame(BuildContext context, String type) {
    if (type == 'memory') {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const _MemoryMatchGame()));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Starting $type game...')));
    }
  }
}

class _GameCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _GameCard({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withOpacity(0.2), child: Icon(icon, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.play_circle_fill, color: Colors.blue),
        onTap: onTap,
      ),
    );
  }
}

class _LeaderRow extends StatelessWidget {
  final int rank;
  final String name;
  final int score;
  final Color medal;

  const _LeaderRow({required this.rank, required this.name, required this.score, required this.medal});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: rank <= 3 ? Icon(Icons.emoji_events, color: medal) : Text('$rank'),
      title: Text(name),
      trailing: Text('$score pts', style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}

class _MemoryMatchGame extends StatefulWidget {
  const _MemoryMatchGame();

  @override
  State<_MemoryMatchGame> createState() => _MemoryMatchGameState();
}

class _MemoryMatchGameState extends State<_MemoryMatchGame> {
  static const List<String> _emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
  late List<_CardData> _cards;
  int? _firstIndex;
  bool _isProcessing = false;
  int _moves = 0;
  int _matchedPairs = 0;

  @override
  void initState() {
    super.initState();
    _initGame();
  }

  void _initGame() {
    final shuffled = [..._emojis, ..._emojis]..shuffle(Random());
    _cards = shuffled.map((e) => _CardData(emoji: e, isFlipped: false, isMatched: false)).toList();
    _firstIndex = null;
    _moves = 0;
    _matchedPairs = 0;
  }

  void _onTap(int index) {
    if (_isProcessing || _cards[index].isFlipped || _cards[index].isMatched) return;

    setState(() {
      _cards[index].isFlipped = true;
      if (_firstIndex == null) {
        _firstIndex = index;
      } else {
        _moves++;
        _isProcessing = true;
        final first = _firstIndex!;
        if (_cards[first].emoji == _cards[index].emoji) {
          _cards[first].isMatched = true;
          _cards[index].isMatched = true;
          _matchedPairs++;
          _firstIndex = null;
          _isProcessing = false;
          if (_matchedPairs == _emojis.length) _showWinDialog();
        } else {
          Future.delayed(const Duration(milliseconds: 800), () {
            if (mounted) setState(() {
              _cards[first].isFlipped = false;
              _cards[index].isFlipped = false;
              _firstIndex = null;
              _isProcessing = false;
            });
          });
        }
      }
    });
  }

  void _showWinDialog() {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('You Win! 🎉'),
      content: Text('Completed in $_moves moves!'),
      actions: [TextButton(onPressed: () { Navigator.pop(context); _initGame(); setState(() {}); }, child: const Text('Play Again'))],
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory Match'),
        centerTitle: true,
        actions: [
          Center(child: Text('Moves: $_moves', style: const TextStyle(fontSize: 16))),
          const SizedBox(width: 16),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4, crossAxisSpacing: 8, mainAxisSpacing: 8,
          ),
          itemCount: _cards.length,
          itemBuilder: (_, i) {
            final card = _cards[i];
            return GestureDetector(
              onTap: () => _onTap(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                decoration: BoxDecoration(
                  color: card.isFlipped || card.isMatched ? Colors.white : Colors.blue,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: card.isMatched ? Colors.green : Colors.grey.shade300, width: 2),
                ),
                child: Center(
                  child: (card.isFlipped || card.isMatched)
                      ? Text(card.emoji, style: const TextStyle(fontSize: 32))
                      : const Icon(Icons.help_outline, color: Colors.white, size: 28),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _CardData {
  final String emoji;
  bool isFlipped;
  bool isMatched;

  _CardData({required this.emoji, this.isFlipped = false, this.isMatched = false});
}
