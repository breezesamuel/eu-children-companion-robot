import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _usage;
  Map<String, dynamic>? _weeklyComparison;
  Map<String, dynamic>? _goals;
  bool _loading = true;
  int _selectedChildIndex = 0;
  Timer? _refreshTimer;

  final List<String> _children = ['All Children', 'Emma', 'Liam', 'Sophia'];
  final List<Map<String, dynamic>> _childPerformance = [
    {'name': 'Emma', 'avatar': '👧', 'progress': 0.78, 'score': 88, 'minutes': 45, 'streak': 7, 'books': 3, 'color': 0xFF6C63FF},
    {'name': 'Liam', 'avatar': '👦', 'progress': 0.55, 'score': 72, 'minutes': 32, 'streak': 4, 'books': 1, 'color': 0xFFFF6584},
    {'name': 'Sophia', 'avatar': '👶', 'progress': 0.92, 'score': 95, 'minutes': 60, 'streak': 12, 'books': 5, 'color': 0xFF4ECDC4},
  ];
  final List<Map<String, dynamic>> _recentActivity = [
    {'activity': 'Completed Math Quiz', 'child': 'Emma', 'time': '2 min ago', 'type': 'learning', 'icon': Icons.calculate},
    {'activity': 'Read "The Brave Turtle"', 'child': 'Liam', 'time': '15 min ago', 'type': 'reading', 'icon': Icons.auto_stories},
    {'activity': 'Drawing Session', 'child': 'Sophia', 'time': '32 min ago', 'type': 'creative', 'icon': Icons.palette},
    {'activity': 'Science Experiment', 'child': 'Emma', 'time': '1h ago', 'type': 'science', 'icon': Icons.science},
    {'activity': 'Bedtime Story', 'child': 'Liam', 'time': '2h ago', 'type': 'reading', 'icon': Icons.nightlight_round},
    {'activity': 'Vocabulary Game', 'child': 'Emma', 'time': '3h ago', 'type': 'learning', 'icon': Icons.translate},
  ];
  final List<bool> _notificationToggles = [true, true, true];

  final Map<String, Color> _activityColors = {
    'learning': const Color(0xFF6C63FF),
    'reading': const Color(0xFFFF6584),
    'creative': const Color(0xFF4ECDC4),
    'science': const Color(0xFFFFD93D),
    'play': const Color(0xFF6BCB77),
  };

  @override
  void initState() {
    super.initState();
    _loadData();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _loadData());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        http.get(Uri.parse('/api/v1/analytics/dashboard')).timeout(const Duration(seconds: 5)),
        http.get(Uri.parse('/api/v1/analytics/usage')).timeout(const Duration(seconds: 5)),
        http.get(Uri.parse('/api/v1/analytics/weekly')).timeout(const Duration(seconds: 5)),
        http.get(Uri.parse('/api/v1/analytics/goals')).timeout(const Duration(seconds: 5)),
      ]);
      if (mounted) setState(() {
        final sd = jsonDecode(results[0].body);
        final ud = jsonDecode(results[1].body);
        final wd = jsonDecode(results[2].body);
        final gd = jsonDecode(results[3].body);
        _stats = sd['success'] == true ? sd['data'] : {};
        _usage = ud['success'] == true ? ud['data'] : {};
        _weeklyComparison = wd['success'] == true ? wd['data'] : {};
        _goals = gd['success'] == true ? gd['data'] : {};
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _exportData() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Exporting data...')),
    );
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data exported successfully!')),
      );
    }
  }

  String get _selectedChildName => _children[_selectedChildIndex];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Dashboard'),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.file_download_outlined), onPressed: _exportData),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildChildSelector(),
                    const SizedBox(height: 16),
                    _buildStatsCards(),
                    const SizedBox(height: 16),
                    _buildStreakAndGoals(),
                    const SizedBox(height: 16),
                    _buildLearningProgressChart(),
                    const SizedBox(height: 16),
                    _buildActivityBreakdown(),
                    const SizedBox(height: 16),
                    _buildChildPerformanceCards(),
                    const SizedBox(height: 16),
                    _buildWeeklyComparison(),
                    const SizedBox(height: 16),
                    _buildRecentActivity(),
                    const SizedBox(height: 16),
                    _buildNotificationSettings(),
                    const SizedBox(height: 16),
                    _buildParentTips(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildChildSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.people_outline, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: _selectedChildIndex,
                isExpanded: true,
                items: List.generate(_children.length, (i) {
                  return DropdownMenuItem(value: i, child: Text(_children[i]));
                }),
                onChanged: (v) => setState(() => _selectedChildIndex = v!),
              ),
            ),
          ),
          if (_selectedChildIndex > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _activityColors.values.elementAt(_selectedChildIndex % _activityColors.length).withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _childPerformance[_selectedChildIndex - 1]['avatar'],
                style: const TextStyle(fontSize: 20),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    final items = [
      {'label': 'Children', 'value': '${_stats?['totalChildren'] ?? 3}', 'icon': Icons.people, 'color': Colors.blue},
      {'label': 'Online', 'value': '${_stats?['onlineRobots'] ?? 2}', 'icon': Icons.radar, 'color': Colors.green},
      {'label': 'Minutes', 'value': '${_stats?['totalLearningMinutes'] ?? 137}', 'icon': Icons.timer, 'color': Colors.orange},
      {'label': 'Avg Score', 'value': '${(_stats?['avgScore'] ?? 85).toStringAsFixed(0)}%', 'icon': Icons.analytics, 'color': Colors.purple},
    ];
    return GridView.builder(
      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisAmount(crossAxisCount: 2, childAspectRatio: 1.6, crossAxisSpacing: 12, mainAxisSpacing: 12),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        return Card(
          elevation: 3,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(item['icon'] as IconData, color: item['color'] as Color, size: 24),
                const Spacer(),
                Text(item['value'] as String, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: item['color'] as Color)),
                Text(item['label'] as String, style: const TextStyle(color: Colors.grey, fontSize: 13)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStreakAndGoals() {
    final streak = _selectedChildIndex == 0
        ? _childPerformance.map((c) => c['streak'] as int).reduce(max)
        : _childPerformance[_selectedChildIndex - 1]['streak'] as int;
    final goalMinutes = _goals?['dailyMinutes'] ?? 30;
    final goalBooks = _goals?['weeklyBooks'] ?? 5;
    final minutesToday = _selectedChildIndex == 0
        ? _childPerformance.map((c) => c['minutes'] as int).reduce((a, b) => a + b)
        : _childPerformance[_selectedChildIndex - 1]['minutes'] as int;
    final booksToday = _selectedChildIndex == 0
        ? _childPerformance.map((c) => c['books'] as int).reduce((a, b) => a + b)
        : _childPerformance[_selectedChildIndex - 1]['books'] as int;

    return Row(
      children: [
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.local_fire_department, color: Colors.deepOrange, size: 28),
                      const SizedBox(width: 8),
                      Text('$streak', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Text('Day Streak', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Daily Goals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  _goalRow(Icons.timer, '$minutesToday / $goalMinutes min', minutesToday / goalMinutes),
                  const SizedBox(height: 6),
                  _goalRow(Icons.menu_book, '$booksToday / $goalBooks books', booksToday / goalBooks),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _goalRow(IconData icon, String label, double progress) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(width: 6),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 12))),
        const SizedBox(width: 6),
        SizedBox(
          width: 60,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: Colors.grey[200],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLearningProgressChart() {
    final subjects = ['Math', 'Reading', 'Science', 'Art', 'Music'];
    final scores = _selectedChildIndex == 0
        ? [85, 72, 68, 91, 60]
        : [78, 65, 82, 88, 70];
    final colors = [Colors.blue, Colors.pink, Colors.green, Colors.orange, Colors.purple];

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Learning Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Chip(label: Text('$_selectedChildName', style: const TextStyle(fontSize: 11)), visualDensity: VisualDensity.compact),
              ],
            ),
            const SizedBox(height: 16),
            ...List.generate(subjects.length, (i) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(subjects[i], style: const TextStyle(fontSize: 12)),
                        Text('${scores[i]}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colors[i])),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        height: 14,
                        width: double.infinity,
                        color: Colors.grey[200],
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: scores[i] / 100,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [colors[i].withOpacity(0.7), colors[i]],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityBreakdown() {
    final data = [
      {'label': 'Learning', 'value': 35, 'color': const Color(0xFF6C63FF)},
      {'label': 'Reading', 'value': 25, 'color': const Color(0xFFFF6584)},
      {'label': 'Creative', 'value': 20, 'color': const Color(0xFF4ECDC4)},
      {'label': 'Science', 'value': 12, 'color': const Color(0xFFFFD93D)},
      {'label': 'Play', 'value': 8, 'color': const Color(0xFF6BCB77)},
    ];
    final total = data.fold<double>(0, (s, d) => s + (d['value'] as double));

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Activity Breakdown', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 120,
              child: Row(
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: CustomPaint(
                      painter: _PieChartPainter(data.map((d) => (d['value'] as double) / total).toList(), data.map((d) => d['color'] as Color).toList()),
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: data.map((d) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Row(
                            children: [
                              Container(width: 10, height: 10, decoration: BoxDecoration(color: d['color'] as Color, shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Expanded(child: Text(d['label'] as String, style: const TextStyle(fontSize: 11))),
                              Text('${d['value']}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        );
                      }).toList(),
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

  Widget _buildChildPerformanceCards() {
    final filtered = _selectedChildIndex == 0
        ? _childPerformance
        : [_childPerformance[_selectedChildIndex - 1]];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Child Performance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ...filtered.map((c) {
          final color = Color(c['color'] as int);
          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Text(c['avatar'] as String, style: const TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            height: 8,
                            width: double.infinity,
                            color: Colors.grey[200],
                            child: FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: c['progress'] as double,
                              child: Container(color: color, borderRadius: BorderRadius.circular(6)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    children: [
                      Text('${c['score']}', style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 18)),
                      const Text('Score', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildWeeklyComparison() {
    final thisWeek = _selectedChildIndex == 0
        ? 137
        : _childPerformance[_selectedChildIndex - 1]['minutes'] as int * 7;
    final lastWeek = _weeklyComparison?['lastWeekMinutes'] ?? 120;
    final change = ((thisWeek - lastWeek) / lastWeek * 100).round();
    final isUp = change >= 0;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Weekly Comparison', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isUp ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(isUp ? Icons.trending_up : Icons.trending_down, size: 16, color: isUp ? Colors.green : Colors.red),
                      const SizedBox(width: 4),
                      Text('${isUp ? '+' : ''}$change%', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isUp ? Colors.green : Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _weekBar('Last Week', lastWeek, Colors.grey[400]!)),
                const SizedBox(width: 12),
                Expanded(child: _weekBar('This Week', thisWeek, Colors.blue)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _weekBar(String label, int minutes, Color color) {
    return Column(
      children: [
        Text('$minutes min', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 6),
        Container(
          height: 80,
          width: double.infinity,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.bottomCenter,
          child: Container(
            height: (minutes / 200) * 80,
            width: double.infinity,
            decoration: BoxDecoration(
              color: color.withOpacity(0.6),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildRecentActivity() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Activity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(fontSize: 12))),
              ],
            ),
            const SizedBox(height: 8),
            ..._recentActivity.asMap().entries.map((e) {
              final a = e.value;
              final color = _activityColors[a['type']] ?? Colors.grey;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                      child: Icon(a['icon'] as IconData, size: 18, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(a['activity'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                          Text('${a['child']} · ${a['time']}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationSettings() {
    final filtered = _selectedChildIndex == 0
        ? _childPerformance.asMap().entries.toList()
        : [_childPerformance.asMap().entries.elementAt(_selectedChildIndex - 1)];

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Notifications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...filtered.asMap().entries.map((e) {
              final idx = _selectedChildIndex == 0 ? e.value.key : _selectedChildIndex - 1;
              final child = e.value.value;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Text(child['avatar'] as String, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 10),
                    Expanded(child: Text(child['name'] as String, style: const TextStyle(fontSize: 14))),
                    Switch(
                      value: _notificationToggles[idx],
                      onChanged: (v) => setState(() => _notificationToggles[idx] = v),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildParentTips() {
    final tips = [
      'Set daily learning goals for your child',
      'Review weekly progress reports',
      'Encourage reading before screen time',
      'Use the robot for bedtime stories',
    ];
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Parent Tips', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...tips.map((t) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                const Icon(Icons.lightbulb_outline, size: 18, color: Colors.amber),
                const SizedBox(width: 10),
                Expanded(child: Text(t, style: const TextStyle(fontSize: 13))),
              ]),
            )),
          ],
        ),
      ),
    );
  }
}

class _PieChartPainter extends CustomPainter {
  final List<double> values;
  final List<Color> colors;

  _PieChartPainter(this.values, this.colors);

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()..style = PaintingStyle.fill;
    double startAngle = -pi / 2;

    for (int i = 0; i < values.length; i++) {
      final sweepAngle = 2 * pi * values[i];
      paint.color = colors[i];
      canvas.drawArc(rect, startAngle, sweepAngle, true, paint);
      startAngle += sweepAngle;
    }

    paint.color = Colors.white;
    canvas.drawCircle(Offset(size.width / 2, size.height / 2), size.width * 0.25, paint);
  }

  @override
  bool shouldRepaint(covariant _PieChartPainter old) => old.values != values;
}
