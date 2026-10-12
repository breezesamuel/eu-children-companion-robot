import 'dart:math';
import 'package:flutter/material.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  String _selectedRarity = 'All';
  bool _isGridView = true;
  int? _selectedAchievementIndex;
  String _selectedCategory = 'All';

  int _totalXP = 2350;
  int _xpToNextLevel = 3000;
  int _currentLevel = 12;

  final List<String> _rarities = ['All', 'Common', 'Uncommon', 'Rare', 'Epic'];

  final List<String> _categories = ['All', 'Learning', 'Social', 'Creative', 'Physical', 'Explorer'];

  final List<Map<String, dynamic>> _allAchievements = [
    {'icon': Icons.chat, 'title': 'First Chat', 'desc': 'Complete first conversation', 'points': 10, 'rarity': 'common', 'color': 0xFF4CAF50, 'unlocked': true, 'progress': 1.0, 'category': 'Social', 'date': '2026-01-10'},
    {'icon': Icons.school, 'title': 'Learning Star', 'desc': 'Complete 10 lessons', 'points': 50, 'rarity': 'common', 'color': 0xFF4CAF50, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-01-15'},
    {'icon': Icons.calculate, 'title': 'Math Whiz', 'desc': 'Answer 10 math questions correctly', 'points': 100, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-02-01'},
    {'icon': Icons.auto_stories, 'title': 'Story Collector', 'desc': 'Listen to 10 stories', 'points': 50, 'rarity': 'common', 'color': 0xFF4CAF50, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-01-20'},
    {'icon': Icons.emoji_emotions, 'title': 'Happy Kid', 'desc': '7 days of positive mood', 'points': 150, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': true, 'progress': 1.0, 'category': 'Social', 'date': '2026-02-10'},
    {'icon': Icons.explore, 'title': 'Explorer', 'desc': 'Unlock all subjects', 'points': 200, 'rarity': 'epic', 'color': 0xFF9C27B0, 'unlocked': true, 'progress': 1.0, 'category': 'Explorer', 'date': '2026-03-01'},
    {'icon': Icons.star, 'title': 'Bright Mind', 'desc': 'Score 100% on any quiz', 'points': 75, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-02-15'},
    {'icon': Icons.favorite, 'title': 'Kind Heart', 'desc': 'Share 5 kind messages', 'points': 30, 'rarity': 'common', 'color': 0xFF4CAF50, 'unlocked': true, 'progress': 1.0, 'category': 'Social', 'date': '2026-01-25'},
    {'icon': Icons.music_note, 'title': 'Music Lover', 'desc': 'Learn 3 songs', 'points': 60, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': true, 'progress': 1.0, 'category': 'Creative', 'date': '2026-02-05'},
    {'icon': Icons.palette, 'title': 'Creative Artist', 'desc': 'Complete 5 art activities', 'points': 60, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': true, 'progress': 1.0, 'category': 'Creative', 'date': '2026-02-08'},
    {'icon': Icons.lightbulb, 'title': 'Curious Mind', 'desc': 'Ask 20 questions', 'points': 80, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-02-20'},
    {'icon': Icons.timer, 'title': 'Focus Master', 'desc': 'Stay focused for 30 minutes', 'points': 120, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': true, 'progress': 1.0, 'category': 'Learning', 'date': '2026-03-05'},
    {'icon': Icons.directions_run, 'title': 'Active Kid', 'desc': 'Complete 10 physical activities', 'points': 80, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': true, 'progress': 1.0, 'category': 'Physical', 'date': '2026-03-10'},
    {'icon': Icons.group, 'title': 'Team Player', 'desc': 'Participate in 5 group activities', 'points': 90, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': false, 'progress': 0.6, 'category': 'Social'},
    {'icon': Icons.terrain, 'title': 'Mountain Climber', 'desc': 'Complete 20 physical challenges', 'points': 200, 'rarity': 'epic', 'color': 0xFF9C27B0, 'unlocked': false, 'progress': 0.35, 'category': 'Physical'},
    {'icon': Icons.brush, 'title': 'Master Artist', 'desc': 'Complete 20 art activities', 'points': 150, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': false, 'progress': 0.25, 'category': 'Creative'},
    {'icon': Icons.language, 'title': 'World Explorer', 'desc': 'Explore all geography topics', 'points': 250, 'rarity': 'epic', 'color': 0xFF9C27B0, 'unlocked': false, 'progress': 0.4, 'category': 'Explorer'},
    {'icon': Icons.eco, 'title': 'Nature Lover', 'desc': 'Complete nature study series', 'points': 100, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': false, 'progress': 0.7, 'category': 'Explorer'},
    {'icon': Icons.fitness_center, 'title': 'Strong Body', 'desc': 'Exercise for 30 days straight', 'points': 300, 'rarity': 'epic', 'color': 0xFF9C27B0, 'unlocked': false, 'progress': 0.15, 'category': 'Physical'},
    {'icon': Icons.celebration, 'title': 'Spring Festival', 'desc': 'Complete spring seasonal challenges', 'points': 100, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': false, 'progress': 0.5, 'category': 'Explorer'},
    {'icon': Icons.help, 'title': 'Helper Bee', 'desc': 'Help friends 10 times', 'points': 70, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': false, 'progress': 0.8, 'category': 'Social'},
    {'icon': Icons.self_improvement, 'title': 'Zen Master', 'desc': 'Complete mindfulness exercises', 'points': 120, 'rarity': 'rare', 'color': 0xFF2196F3, 'unlocked': false, 'progress': 0.45, 'category': 'Physical'},
    {'icon': Icons.theater_comedy, 'title': 'Little Performer', 'desc': 'Perform in front of family', 'points': 90, 'rarity': 'uncommon', 'color': 0xFFFF9800, 'unlocked': true, 'progress': 1.0, 'category': 'Creative', 'date': '2026-03-15'},
  ];

  List<Map<String, dynamic>> get _filteredAchievements {
    return _allAchievements.where((a) {
      final matchesRarity = _selectedRarity == 'All' || a['rarity'] == _selectedRarity.toLowerCase();
      final matchesCategory = _selectedCategory == 'All' || a['category'] == _selectedCategory;
      return matchesRarity && matchesCategory;
    }).toList();
  }

  List<Map<String, dynamic>> get _recentlyUnlocked {
    return _allAchievements.where((a) => a['unlocked'] == true).toList()
      ..sort((a, b) {
        final dateA = a['date'] as String? ?? '';
        final dateB = b['date'] as String? ?? '';
        return dateB.compareTo(dateA);
      });
  }

  Map<String, dynamic>? get _nextAchievement {
    final locked = _allAchievements.where((a) => a['unlocked'] == false).toList();
    if (locked.isEmpty) return null;
    locked.sort((a, b) => (b['progress'] as double).compareTo(a['progress'] as double));
    return locked.first;
  }

  Color _rarityColor(String rarity) {
    switch (rarity.toLowerCase()) {
      case 'common': return const Color(0xFF4CAF50);
      case 'uncommon': return const Color(0xFFFF9800);
      case 'rare': return const Color(0xFF2196F3);
      case 'epic': return const Color(0xFF9C27B0);
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final achievements = _filteredAchievements;
    final recentlyUnlocked = _recentlyUnlocked;
    final next = _nextAchievement;
    final levelProgress = _totalXP / _xpToNextLevel;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Achievements'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(_isGridView ? Icons.view_list : Icons.grid_view),
            onPressed: () => setState(() => _isGridView = !_isGridView),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLevelCard(levelProgress),
            const SizedBox(height: 16),
            _buildRecentlyUnlocked(recentlyUnlocked),
            const SizedBox(height: 16),
            if (next != null) _buildNextSuggestion(next),
            const SizedBox(height: 16),
            _buildFilters(),
            const SizedBox(height: 12),
            _buildCategoryTabs(),
            const SizedBox(height: 12),
            _buildAchievementCount(achievements.length),
            const SizedBox(height: 8),
            _isGridView ? _buildGridView(achievements) : _buildListView(achievements),
            const SizedBox(height: 16),
            _buildNotificationHistory(),
          ],
        ),
      ),
      floatingActionButton: _selectedAchievementIndex != null
          ? FloatingActionButton.extended(
              onPressed: () => setState(() => _selectedAchievementIndex = null),
              icon: const Icon(Icons.close),
              label: const Text('Close Detail'),
            )
          : null,
    );
  }

  Widget _buildLevelCard(double levelProgress) {
    return Card(
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.emoji_events, size: 36, color: Colors.amber),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Level $_currentLevel Explorer', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('$_totalXP / $_xpToNextLevel XP', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: levelProgress.clamp(0.0, 1.0),
                          minHeight: 10,
                          backgroundColor: Colors.grey[200],
                          color: Colors.amber,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _xpStat('Total XP', '$_totalXP', Colors.amber),
                _xpStat('Unlocked', '${_allAchievements.where((a) => a['unlocked'] == true).length}', Colors.green),
                _xpStat('To Next', '${_xpToNextLevel - _totalXP}', Colors.blue),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _xpStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildRecentlyUnlocked(List<Map<String, dynamic>> recent) {
    if (recent.isEmpty) return const SizedBox.shrink();
    final display = recent.take(5).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Recently Unlocked', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            Text('+${display.fold(0, (s, a) => s + (a['points'] as int))} XP', style: const TextStyle(fontSize: 12, color: Colors.green)),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 70,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: display.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final a = display[i];
              final color = Color(a['color'] as int);
              return Container(
                width: 70,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color.withOpacity(0.3)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(a['icon'] as IconData, size: 22, color: color),
                    const SizedBox(height: 2),
                    Text('${a['points']} XP', style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.bold)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNextSuggestion(Map<String, dynamic> next) {
    final color = Color(next['color'] as int);
    return Card(
      color: color.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(next['icon'] as IconData, size: 20, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Next: ${next['title']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 6),
                      Text('${next['points']} XP', style: TextStyle(fontSize: 11, color: color)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (next['progress'] as double).clamp(0.0, 1.0),
                      minHeight: 6,
                      backgroundColor: Colors.grey[200],
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: _rarities.map((r) {
          final selected = _selectedRarity == r;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(r, style: const TextStyle(fontSize: 12)),
              selected: selected,
              onSelected: (_) => setState(() => _selectedRarity = r),
              visualDensity: VisualDensity.compact,
              selectedColor: _selectedRarity == r ? _rarityColor(r).withOpacity(0.2) : null,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: _categories.map((c) {
          final selected = _selectedCategory == c;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(c, style: const TextStyle(fontSize: 12)),
              selected: selected,
              onSelected: (_) => setState(() => _selectedCategory = c),
              visualDensity: VisualDensity.compact,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAchievementCount(int count) {
    return Text('$count achievements', style: const TextStyle(fontSize: 12, color: Colors.grey));
  }

  Widget _buildGridView(List<Map<String, dynamic>> achievements) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisAmount(
        crossAxisCount: 2, childAspectRatio: 0.95, crossAxisSpacing: 10, mainAxisSpacing: 10,
      ),
      itemCount: achievements.length,
      itemBuilder: (_, i) => _achievementCard(achievements[i], i),
    );
  }

  Widget _buildListView(List<Map<String, dynamic>> achievements) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: achievements.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, i) => _achievementTile(achievements[i], i),
    );
  }

  Widget _achievementCard(Map<String, dynamic> a, int index) {
    final unlocked = a['unlocked'] as bool;
    final color = Color(a['color'] as int);
    final isSelected = _selectedAchievementIndex == index;
    final progress = (a['progress'] as double).clamp(0.0, 1.0);

    return GestureDetector(
      onTap: () => setState(() => _selectedAchievementIndex = isSelected ? null : index),
      child: Card(
        elevation: isSelected ? 6 : 2,
        color: isSelected ? color.withOpacity(0.08) : null,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(a['icon'] as IconData, size: 22, color: unlocked ? color : Colors.grey),
                  const Spacer(),
                  Icon(_rarityIcon(a['rarity'] as String), size: 14, color: unlocked ? _rarityColor(a['rarity'] as String) : Colors.grey),
                ],
              ),
              const Spacer(),
              Text(a['title'] as String, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: unlocked ? null : Colors.grey)),
              const SizedBox(height: 2),
              Text(a['desc'] as String, style: TextStyle(fontSize: 10, color: unlocked ? Colors.grey[600] : Colors.grey[400]), maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              if (!unlocked)
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(value: progress, minHeight: 4, backgroundColor: Colors.grey[200]),
                ),
              if (unlocked && a['date'] != null)
                Text(a['date'] as String, style: const TextStyle(fontSize: 9, color: Colors.grey)),
              Text('${a['points']} XP', style: TextStyle(fontSize: 10, color: unlocked ? color : Colors.grey, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _achievementTile(Map<String, dynamic> a, int index) {
    final unlocked = a['unlocked'] as bool;
    final color = Color(a['color'] as int);
    final isSelected = _selectedAchievementIndex == index;
    final progress = (a['progress'] as double).clamp(0.0, 1.0);

    return GestureDetector(
      onTap: () => setState(() => _selectedAchievementIndex = isSelected ? null : index),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        color: isSelected ? color.withOpacity(0.05) : null,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: (unlocked ? color : Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(a['icon'] as IconData, size: 20, color: unlocked ? color : Colors.grey),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(a['title'] as String, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: unlocked ? null : Colors.grey)),
                      const SizedBox(width: 6),
                      Icon(_rarityIcon(a['rarity'] as String), size: 12, color: _rarityColor(a['rarity'] as String)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(a['desc'] as String, style: TextStyle(fontSize: 11, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (!unlocked)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(value: progress, minHeight: 4, backgroundColor: Colors.grey[200]),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('${(progress * 100).round()}%', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Column(
              children: [
                Text('${a['points']}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: unlocked ? color : Colors.grey)),
                const Text('XP', style: TextStyle(fontSize: 9, color: Colors.grey)),
              ],
            ),
            const SizedBox(width: 8),
            Icon(unlocked ? Icons.check_circle : Icons.lock_outline, size: 18, color: unlocked ? Colors.green : Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationHistory() {
    final recentNotifications = [
      {'title': 'Achievement Unlocked: Little Performer', 'time': '2 days ago', 'icon': Icons.theater_comedy},
      {'title': 'Level 12 Reached!', 'time': '5 days ago', 'icon': Icons.arrow_upward},
      {'title': 'Achievement Unlocked: Focus Master', 'time': '1 week ago', 'icon': Icons.timer},
      {'title': 'Seasonal Challenge Started: Spring Festival', 'time': '2 weeks ago', 'icon': Icons.celebration},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Notification History', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...recentNotifications.map((n) => ListTile(
          dense: true,
          leading: Icon(n['icon'] as IconData, size: 18, color: Colors.blue),
          title: Text(n['title'] as String, style: const TextStyle(fontSize: 13)),
          trailing: Text(n['time'] as String, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        )),
      ],
    );
  }

  IconData _rarityIcon(String rarity) {
    switch (rarity.toLowerCase()) {
      case 'common': return Icons.circle;
      case 'uncommon': return Icons.diamond;
      case 'rare': return Icons.star;
      case 'epic': return Icons.auto_awesome;
      default: return Icons.circle;
    }
  }
}
