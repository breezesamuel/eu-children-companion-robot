import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class HabitTrackerScreen extends StatefulWidget {
  const HabitTrackerScreen({super.key});

  @override
  State<HabitTrackerScreen> createState() => _HabitTrackerScreenState();
}

class _HabitTrackerScreenState extends State<HabitTrackerScreen> {
  final List<Map<String, dynamic>> _habits = [
    {'name': 'Brush Teeth', 'icon': Icons.brush, 'color': const Color(0xFF42A5F5), 'days': [true, true, true, true, true, true, false], 'streak': 6},
    {'name': 'Read a Book', 'icon': Icons.menu_book, 'color': const Color(0xFF66BB6A), 'days': [true, true, false, true, true, false, false], 'streak': 2, 'target': 5},
    {'name': 'Drink Water', 'icon': Icons.water_drop, 'color': const Color(0xFF29B6F6), 'days': [true, true, true, true, true, true, true], 'streak': 7, 'target': 8},
    {'name': 'Exercise', 'icon': Icons.fitness_center, 'color': const Color(0xFFFF7043), 'days': [true, false, true, false, true, true, false], 'streak': 2, 'target': 3},
    {'name': 'Vegetables', 'icon': Icons.eco, 'color': const Color(0xFF8BC34A), 'days': [true, true, false, true, false, true, false], 'streak': 1, 'target': 3},
    {'name': 'Bedtime Routine', 'icon': Icons.bedtime, 'color': const Color(0xFF7E57C2), 'days': [true, true, true, false, true, true, true], 'streak': 4},
    {'name': 'Practice Music', 'icon': Icons.music_note, 'color': const Color(0xFFEC407A), 'days': [false, true, false, true, false, true, false], 'streak': 1, 'target': 4},
    {'name': 'Clean Room', 'icon': Icons.cleaning_services, 'color': const Color(0xFF26A69A), 'days': [true, false, false, true, false, false, true], 'streak': 1, 'target': 2},
  ];

  final List<Map<String, dynamic>> _rewards = [
    {'name': 'Extra Playtime', 'cost': 10, 'icon': Icons.sports_esports, 'color': Color(0xFFFF9800)},
    {'name': 'Sticker Pack', 'cost': 5, 'icon': Icons.star, 'color': Color(0xFFE91E63)},
    {'name': 'Movie Night', 'cost': 20, 'icon': Icons.movie, 'color': Color(0xFF9C27B0)},
    {'name': 'Park Trip', 'cost': 15, 'icon': Icons.park, 'color': Color(0xFF4CAF50)},
    {'name': 'Ice Cream', 'cost': 8, 'icon': Icons.icecream, 'color': Color(0xFF795548)},
  ];

  int _points = 42;
  final Set<int> _selectedHabits = {0, 2, 5};

  int _getWeeklyTotal(int index) {
    return _habits[index]['days'].where((d) => d == true).length;
  }

  String _dayLabel(int i) {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return labels[i];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalCompleted = _habits.fold(0, (s, h) => s + (h['days'] as List).where((d) => d).length);
    final totalPossible = _habits.length * 7;

    return Scaffold(
      appBar: AppBar(title: const Text('Habit Tracker')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Points & Summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _statCircle(context, Icons.stars, '$_points pts', Colors.amber, 'This Week'),
                      _statCircle(context, Icons.check_circle, '$totalCompleted/$totalPossible', Colors.green, 'Completed'),
                      _statCircle(context, Icons.local_fire_department, '${_habits.where((h) => h['days']![6]).length}', Colors.orange, 'Today'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 100,
                    child: BarChart(
                      BarChartData(
                        alignment: BarChartAlignment.spaceAround,
                        maxY: _habits.length.toDouble(),
                        barGroups: List.generate(7, (i) => BarChartGroupData(i, [
                          BarChartRoundedRod(
                            toValue: _habits.where((h) => (h['days'] as List)[i]).length.toDouble(),
                            color: theme.colorScheme.primary,
                            width: 16,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                          ),
                        ])),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) => Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(_dayLabel(v.toInt()), style: const TextStyle(fontSize: 12)),
                            )),
                          ),
                        ),
                        gridData: FlGridData(show: false),
                        borderData: FlBorderData(show: false),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Habit list
          Row(children: [
            Text('Habits', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
            const Spacer(),
            Text('${_selectedHabits.length} active', style: TextStyle(color: Colors.grey.shade500)),
          ]),
          const SizedBox(height: 8),
          ...List.generate(_habits.length, (i) {
            final h = _habits[i];
            final selected = _selectedHabits.contains(i);
            final weeklyCount = _getWeeklyTotal(i);
            return Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() {
                  if (selected) { _selectedHabits.remove(i); } else { _selectedHabits.add(i); }
                }),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      Icon(h['icon'] as IconData, color: h['color'] as Color, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(h['name'] as String, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? null : Colors.grey)),
                            Text('$weeklyCount/7 this week · ${h['streak']}-day streak!',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                      Row(
                        children: List.generate(7, (d) => Container(
                          width: 12, height: 12, margin: const EdgeInsets.symmetric(horizontal: 1),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: (h['days'] as List)[d]
                              ? (h['color'] as Color).withValues(alpha: selected ? 1 : 0.4)
                              : Colors.grey.shade200,
                          ),
                        )),
                      ),
                      const SizedBox(width: 8),
                      Icon(selected ? Icons.check_circle : Icons.circle_outlined,
                        color: selected ? h['color'] as Color : Colors.grey.shade300, size: 22),
                    ],
                  ),
                ),
              ),
            );
          }),

          const SizedBox(height: 16),

          // Reward Shop
          Row(children: [
            Text('Reward Shop', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
            const Spacer(),
            Text('$_points pts available', style: TextStyle(color: Colors.grey.shade500)),
          ]),
          const SizedBox(height: 8),
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _rewards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) {
                final r = _rewards[i];
                final canAfford = _points >= (r['cost'] as int);
                return Card(
                  child: Container(
                    width: 130,
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(r['icon'] as IconData, color: r['color'] as Color, size: 36),
                        const SizedBox(height: 8),
                        Text(r['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text('${r['cost']} pts', style: TextStyle(color: canAfford ? Colors.green : Colors.red.shade300, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        FilledButton.tonal(
                          onPressed: canAfford ? () {
                            setState(() => _points -= r['cost'] as int);
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Redeemed ${r['name']}! 🎉'), duration: const Duration(seconds: 2)));
                          } : null,
                          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4), minimumSize: Size.zero),
                          child: Text(canAfford ? 'Redeem' : 'Need ${(r['cost'] as int) - _points} more', style: const TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCircle(BuildContext context, IconData icon, String value, Color color, String label) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      ],
    );
  }
}
