import 'dart:math';
import 'package:flutter/material.dart';

class GrowthRecordScreen extends StatefulWidget {
  const GrowthRecordScreen({super.key});

  @override
  State<GrowthRecordScreen> createState() => _GrowthRecordScreenState();
}

class _GrowthRecordScreenState extends State<GrowthRecordScreen> with TickerProviderStateMixin {
  int _selectedChildIndex = 0;
  String _activeSection = 'milestones';
  AnimationController? _celebrationController;

  final List<String> _children = ['Emma', 'Liam', 'Sophia'];

  final List<Map<String, dynamic>> _heightData = [
    {'age': 2, 'height': 86, 'weight': 12.5},
    {'age': 3, 'height': 95, 'weight': 14.2},
    {'age': 4, 'height': 103, 'weight': 16.0},
    {'age': 5, 'height': 110, 'weight': 18.1},
    {'age': 6, 'height': 116, 'weight': 20.3},
  ];

  final List<Map<String, dynamic>> _whoPercentiles = [
    {'age': 2, 'p3': 82, 'p50': 87, 'p97': 93},
    {'age': 3, 'p3': 90, 'p50': 96, 'p97': 102},
    {'age': 4, 'p3': 98, 'p50': 104, 'p97': 110},
    {'age': 5, 'p3': 105, 'p50': 111, 'p97': 118},
    {'age': 6, 'p3': 112, 'p50': 118, 'p97': 125},
  ];

  final List<Map<String, dynamic>> _milestones = [
    {'name': 'First smile', 'age': '0-2 months', 'checked': true, 'icon': Icons.face},
    {'name': 'Rolls over', 'age': '3-5 months', 'checked': true, 'icon': Icons.swap_horiz},
    {'name': 'Sits without support', 'age': '6-8 months', 'checked': true, 'icon': Icons.accessible},
    {'name': 'Crawls', 'age': '7-10 months', 'checked': true, 'icon': Icons.fitness_center},
    {'name': 'First words', 'age': '10-14 months', 'checked': true, 'icon': Icons.record_voice_over},
    {'name': 'Walks alone', 'age': '12-15 months', 'checked': true, 'icon': Icons.directions_walk},
    {'name': 'Runs and jumps', 'age': '18-24 months', 'checked': true, 'icon': Icons.run_circle},
    {'name': 'Uses 2-3 word sentences', 'age': '2-3 years', 'checked': true, 'icon': Icons.chat},
    {'name': 'Rides a tricycle', 'age': '3-4 years', 'checked': false, 'icon': Icons.pedal_bike},
    {'name': 'Knows colors and shapes', 'age': '3-4 years', 'checked': false, 'icon': Icons.palette},
    {'name': 'Can count to 10', 'age': '4-5 years', 'checked': false, 'icon': Icons.numbers},
    {'name': 'Writes name', 'age': '4-5 years', 'checked': false, 'icon': Icons.edit},
    {'name': 'Ties shoelaces', 'age': '5-6 years', 'checked': false, 'icon': Icons.link},
    {'name': 'Reads simple words', 'age': '5-6 years', 'checked': false, 'icon': Icons.book},
  ];

  final List<Map<String, dynamic>> _immunizations = [
    {'name': 'Hepatitis B (1st)', 'age': 'Birth', 'date': '2022-06-15', 'completed': true, 'notes': 'Well tolerated'},
    {'name': 'DTaP (1st)', 'age': '2 months', 'date': '2022-08-10', 'completed': true, 'notes': ''},
    {'name': 'Polio (IPV 1st)', 'age': '2 months', 'date': '2022-08-10', 'completed': true, 'notes': ''},
    {'name': 'Hib (1st)', 'age': '2 months', 'date': '2022-08-10', 'completed': true, 'notes': ''},
    {'name': 'PCV13 (1st)', 'age': '2 months', 'date': '2022-08-10', 'completed': true, 'notes': ''},
    {'name': 'Rotavirus (1st)', 'age': '2 months', 'date': '2022-08-10', 'completed': true, 'notes': ''},
    {'name': 'MMR (1st)', 'age': '12 months', 'date': '2023-06-20', 'completed': true, 'notes': ''},
    {'name': 'Varicella', 'age': '12 months', 'date': '2023-06-20', 'completed': true, 'notes': ''},
    {'name': 'Hepatitis A', 'age': '12 months', 'date': '2023-06-20', 'completed': true, 'notes': ''},
    {'name': 'DTaP (booster)', 'age': '4-6 years', 'date': null, 'completed': false, 'notes': 'Due soon'},
    {'name': 'MMR (2nd)', 'age': '4-6 years', 'date': null, 'completed': false, 'notes': ''},
    {'name': 'Polio (IPV booster)', 'age': '4-6 years', 'date': null, 'completed': false, 'notes': ''},
  ];

  final List<Map<String, dynamic>> _doctorVisits = [
    {'date': '2026-03-15', 'doctor': 'Dr. Smith', 'reason': 'Annual checkup', 'notes': 'Healthy, all vitals normal', 'type': 'checkup'},
    {'date': '2026-01-10', 'doctor': 'Dr. Lee', 'reason': 'Cold symptoms', 'notes': 'Mild cold, rest recommended', 'type': 'sick'},
    {'date': '2025-11-05', 'doctor': 'Dr. Smith', 'reason': 'Vision screening', 'notes': 'Normal vision', 'type': 'checkup'},
    {'date': '2025-09-20', 'doctor': 'Dr. Chen', 'reason': 'Allergy test', 'notes': 'Mild pollen allergy', 'type': 'specialist'},
  ];

  final List<Map<String, dynamic>> _sleepData = [
    {'date': 'Mon', 'hours': 9.5, 'quality': 4},
    {'date': 'Tue', 'hours': 10.0, 'quality': 5},
    {'date': 'Wed', 'hours': 8.5, 'quality': 3},
    {'date': 'Thu', 'hours': 9.0, 'quality': 4},
    {'date': 'Fri', 'hours': 10.0, 'quality': 5},
    {'date': 'Sat', 'hours': 9.5, 'quality': 4},
    {'date': 'Sun', 'hours': 10.5, 'quality': 5},
  ];

  final List<Map<String, dynamic>> _dietLog = [
    {'date': 'Today', 'breakfast': 'Oatmeal, banana', 'lunch': 'Chicken sandwich, apple', 'dinner': 'Pasta with vegetables', 'snacks': 'Yogurt'},
    {'date': 'Yesterday', 'breakfast': 'Eggs, toast', 'lunch': 'Rice bowl with fish', 'dinner': 'Vegetable soup', 'snacks': 'Fruit cup'},
    {'date': '2 days ago', 'breakfast': 'Pancakes, berries', 'lunch': 'Turkey wrap', 'dinner': 'Salmon with rice', 'snacks': 'Cheese stick'},
  ];

  final List<Map<String, dynamic>> _photoMemories = [
    {'date': '2026-03-01', 'caption': 'First bike ride!', 'icon': Icons.directions_bike, 'color': 0xFF6C63FF},
    {'date': '2026-02-14', 'caption': 'Valentine art project', 'icon': Icons.favorite, 'color': 0xFFFF6584},
    {'date': '2026-01-20', 'caption': 'Snow day fun', 'icon': Icons.ac_unit, 'color': 0xFF4ECDC4},
    {'date': '2025-12-25', 'caption': 'Christmas morning', 'icon': Icons.celebration, 'color': 0xFFFFD93D},
    {'date': '2025-11-10', 'caption': 'First lost tooth', 'icon': Icons.emoji_emotions, 'color': 0xFF6BCB77},
  ];

  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _celebrationController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
  }

  @override
  void dispose() {
    _celebrationController?.dispose();
    _noteController.dispose();
    super.dispose();
  }

  String get _selectedChildName => _children[_selectedChildIndex];

  Color _sectionColor(String section) {
    switch (section) {
      case 'milestones': return Colors.blue;
      case 'growth': return Colors.green;
      case 'immunization': return Colors.orange;
      case 'doctor': return Colors.purple;
      case 'sleep': return Colors.indigo;
      case 'diet': return Colors.teal;
      case 'photos': return Colors.pink;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Growth Record'),
        centerTitle: true,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.file_download_outlined),
            onSelected: (v) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(v == 'report' ? 'Generating report...' : 'Exporting data...')),
              );
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'report', child: Text('Generate Report')),
              const PopupMenuItem(value: 'export', child: Text('Export Data')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          _buildChildSelector(),
          _buildSectionTabs(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildActiveSection(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChildSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
        ],
      ),
    );
  }

  Widget _buildSectionTabs() {
    final sections = [
      {'key': 'milestones', 'icon': Icons.flag, 'label': 'Milestones'},
      {'key': 'growth', 'icon': Icons.trending_up, 'label': 'Growth'},
      {'key': 'immunization', 'icon': Icons.vaccines, 'label': 'Shots'},
      {'key': 'doctor', 'icon': Icons.local_hospital, 'label': 'Doctor'},
      {'key': 'sleep', 'icon': Icons.bedtime, 'label': 'Sleep'},
      {'key': 'diet', 'icon': Icons.restaurant, 'label': 'Diet'},
      {'key': 'photos', 'icon': Icons.photo_library, 'label': 'Memories'},
    ];
    return SizedBox(
      height: 64,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        children: sections.map((s) {
          final key = s['key'] as String;
          final active = _activeSection == key;
          final color = _sectionColor(key);
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: GestureDetector(
              onTap: () => setState(() => _activeSection = key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: active ? color.withOpacity(0.12) : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  border: active ? Border.all(color: color.withOpacity(0.4)) : null,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(s['icon'] as IconData, size: 20, color: active ? color : Colors.grey),
                    const SizedBox(height: 2),
                    Text(s['label'] as String, style: TextStyle(fontSize: 10, color: active ? color : Colors.grey, fontWeight: active ? FontWeight.bold : FontWeight.normal)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildActiveSection() {
    switch (_activeSection) {
      case 'milestones':
        return _buildMilestonesSection();
      case 'growth':
        return _buildGrowthSection();
      case 'immunization':
        return _buildImmunizationSection();
      case 'doctor':
        return _buildDoctorSection();
      case 'sleep':
        return _buildSleepSection();
      case 'diet':
        return _buildDietSection();
      case 'photos':
        return _buildPhotosSection();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildMilestonesSection() {
    final completed = _milestones.where((m) => m['checked'] == true).length;
    final total = _milestones.length;
    final progress = completed / total;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: Colors.blue.withOpacity(0.05),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Column(
                  children: [
                    Text('$completed/$total', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.blue)),
                    const Text('Completed', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(value: progress, minHeight: 12, backgroundColor: Colors.grey[200], color: Colors.blue),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ..._milestones.asMap().entries.map((e) {
          final m = e.value;
          final checked = m['checked'] as bool;
          return Card(
            elevation: checked ? 1 : 0,
            color: checked ? null : Colors.grey.withOpacity(0.03),
            margin: const EdgeInsets.only(bottom: 6),
            child: CheckboxListTile(
              dense: true,
              secondary: Icon(m['icon'] as IconData, size: 22, color: checked ? Colors.blue : Colors.grey),
              title: Text(m['name'] as String, style: TextStyle(fontSize: 14, decoration: checked ? TextDecoration.lineThrough : null, color: checked ? null : Colors.grey)),
              subtitle: Text(m['age'] as String, style: const TextStyle(fontSize: 11)),
              value: checked,
              onChanged: (v) {
                setState(() => m['checked'] = v);
                if (v == true) {
                  _celebrationController?.forward(from: 0);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('🎉 ${m['name']} achieved!'), duration: const Duration(seconds: 2)),
                  );
                }
              },
            ),
          );
        }),
        const SizedBox(height: 16),
        const Text('Notes & Journal', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(
          controller: _noteController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Write a note about $_selectedChildName\'s development...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: Colors.grey.withOpacity(0.05),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            icon: const Icon(Icons.save, size: 16),
            label: const Text('Save Note'),
            onPressed: () {
              if (_noteController.text.isNotEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Note saved!')));
                _noteController.clear();
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildGrowthSection() {
    final current = _heightData.isNotEmpty ? _heightData.last : null;
    final previous = _heightData.length > 1 ? _heightData[_heightData.length - 2] : null;
    final maxHeight = _whoPercentiles.fold<double>(0, (m, d) => m > (d['p97'] as int).toDouble() ? m : (d['p97'] as int).toDouble()) + 5;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (current != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _growthStat('Height', '${current['height']}', 'cm', previous != null ? '${current['height'] - previous['height']} cm' : null, Colors.green),
                  Container(height: 40, width: 1, color: Colors.grey[300]),
                  _growthStat('Weight', '${current['weight']}', 'kg', previous != null ? '${(current['weight'] - previous['weight']).toStringAsFixed(1)} kg' : null, Colors.blue),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        const Text('Height Chart vs WHO Standards', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        SizedBox(
          height: 200,
          child: CustomPaint(
            size: Size(double.infinity, 200),
            painter: _GrowthChartPainter(
              data: _heightData,
              percentiles: _whoPercentiles,
              maxY: maxHeight,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _legendDot(Colors.red, 'P97'),
            _legendDot(Colors.green, 'P50'),
            _legendDot(Colors.blue, 'P3'),
            _legendDot(Colors.black, _selectedChildName),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Growth History', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DataTable(
          columnSpacing: 20,
          columns: const [DataColumn(label: Text('Age')), DataColumn(label: Text('Height')), DataColumn(label: Text('Weight'))],
          rows: _heightData.map((d) => DataRow(cells: [
            DataCell(Text('${d['age']} yrs')),
            DataCell(Text('${d['height']} cm')),
            DataCell(Text('${d['weight']} kg')),
          ])).toList(),
        ),
      ],
    );
  }

  Widget _growthStat(String label, String value, String unit, String? change, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(width: 2),
            Padding(padding: const EdgeInsets.only(bottom: 4), child: Text(unit, style: const TextStyle(fontSize: 12, color: Colors.grey))),
          ],
        ),
        if (change != null)
          Text('+$change', style: TextStyle(fontSize: 11, color: color.withOpacity(0.7))),
      ],
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10)),
      ],
    );
  }

  Widget _buildImmunizationSection() {
    final completed = _immunizations.where((i) => i['completed'] == true).length;
    final total = _immunizations.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: Colors.orange.withOpacity(0.05),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.vaccines, size: 36, color: Colors.orange),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$completed of $total vaccines', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('${total - completed} remaining', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                const Spacer(),
                Text('${(completed / total * 100).round()}%', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.orange)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ..._immunizations.map((imm) {
          final done = imm['completed'] as bool;
          return Card(
            margin: const EdgeInsets.only(bottom: 6),
            child: ListTile(
              dense: true,
              leading: Icon(done ? Icons.check_circle : Icons.radio_button_unchecked, color: done ? Colors.green : Colors.grey),
              title: Text(imm['name'] as String, style: TextStyle(fontSize: 14, color: done ? null : Colors.grey)),
              subtitle: Text('Age: ${imm['age']}${imm['date'] != null ? ' · ${imm['date']}' : ''}',
                style: const TextStyle(fontSize: 11)),
              trailing: imm['notes'] != null && (imm['notes'] as String).isNotEmpty
                  ? Tooltip(message: imm['notes'] as String, child: const Icon(Icons.info_outline, size: 16, color: Colors.grey))
                  : null,
            ),
          );
        }),
      ],
    );
  }

  Widget _buildDoctorSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Doctor Visits', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            TextButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Log Visit'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('New visit logging coming soon')),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._doctorVisits.map((v) {
          final icon = v['type'] == 'checkup' ? Icons.favorite : v['type'] == 'sick' ? Icons.sick : Icons.medical_services;
          final color = v['type'] == 'checkup' ? Colors.green : v['type'] == 'sick' ? Colors.red : Colors.purple;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                    child: Icon(icon, size: 20, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(v['reason'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('${v['doctor']} · ${v['date']}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        Text(v['notes'] as String, style: const TextStyle(fontSize: 11, color: Colors.grey[600])),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSleepSection() {
    final avgHours = _sleepData.fold<double>(0, (s, d) => s + (d['hours'] as double)) / _sleepData.length;
    final avgQuality = _sleepData.fold<double>(0, (s, d) => s + (d['quality'] as int)) / _sleepData.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Column(children: [
                  Text('${avgHours.toStringAsFixed(1)}h', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.indigo)),
                  const Text('Avg Sleep', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ]),
                Column(children: [
                  Row(
                    children: List.generate(5, (i) => Icon(Icons.star, size: 16, color: i < avgQuality.round() ? Colors.amber : Colors.grey[300])),
                  ),
                  const Text('Sleep Quality', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ]),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text('This Week', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ..._sleepData.map((d) {
          final height = (d['hours'] as double) / 12 * 60;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(width: 30, child: Text(d['date'] as String, style: const TextStyle(fontSize: 11))),
                const SizedBox(width: 8),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 20,
                      color: Colors.grey[200],
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: (d['hours'] as double) / 12,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.indigo.withOpacity(0.5), Colors.indigo],
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text('${d['hours']}h', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildDietSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Dietary Log', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            TextButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Log Meal'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Meal logging coming soon')),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._dietLog.map((d) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(d['date'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                _dietRow('🌅 Breakfast', d['breakfast'] as String),
                _dietRow('🌤️ Lunch', d['lunch'] as String),
                _dietRow('🌙 Dinner', d['dinner'] as String),
                _dietRow('🍿 Snacks', d['snacks'] as String),
              ],
            ),
          ),
        )),
      ],
    );
  }

  Widget _dietRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildPhotosSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Photo Memories', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            TextButton.icon(
              icon: const Icon(Icons.add_a_photo, size: 16),
              label: const Text('Add Photo'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Camera/gallery integration coming soon')),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._photoMemories.map((p) {
          final color = Color(p['color'] as int);
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(p['icon'] as IconData, size: 28, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p['caption'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text(p['date'] as String, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 16),
        Center(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.photo_library_outlined, size: 18),
            label: const Text('View Full Timeline'),
            onPressed: () {},
          ),
        ),
      ],
    );
  }
}

class _GrowthChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> data;
  final List<Map<String, dynamic>> percentiles;
  final double maxY;

  _GrowthChartPainter({required this.data, required this.percentiles, required this.maxY});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5;
    final fillPaint = Paint()..style = PaintingStyle.fill;

    final padding = const EdgeInsets.only(left: 40, bottom: 30, top: 10, right: 10);
    final chartWidth = size.width - padding.left - padding.right;
    final chartHeight = size.height - padding.top - padding.bottom;

    if (percentiles.isEmpty) return;

    final ages = percentiles.map((d) => d['age'] as int).toList();
    final minAge = ages.first.toDouble();
    final maxAge = ages.last.toDouble();
    final ageRange = maxAge - minAge;

    Point<double> toPoint(int age, double value) {
      final x = padding.left + ((age - minAge) / ageRange) * chartWidth;
      final y = padding.top + chartHeight - ((value / maxY) * chartHeight);
      return Point(x, y);
    }

    for (final percentileKey in ['p3', 'p50', 'p97']) {
      final color = percentileKey == 'p97' ? Colors.red : percentileKey == 'p50' ? Colors.green : Colors.blue;
      paint.color = color.withOpacity(0.5);
      paint.strokeWidth = 1;

      final path = Path();
      for (int i = 0; i < percentiles.length; i++) {
        final pt = toPoint(percentiles[i]['age'] as int, (percentiles[i][percentileKey] as int).toDouble());
        if (i == 0) path.moveTo(pt.x, pt.y);
        else path.lineTo(pt.x, pt.y);
      }
      canvas.drawPath(path, paint);
    }

    for (int i = 0; i < percentiles.length; i++) {
      final label = '${percentiles[i]['age']}';
      final textPainter = TextPainter(
        text: TextSpan(text: label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        textDirection: TextDirection.ltr,
      );
      final pt = toPoint(percentiles[i]['age'] as int, 0);
      textPainter.layout();
      textPainter.paint(canvas, Offset(pt.x - textPainter.width / 2, size.height - 20));
    }

    paint.color = Colors.black;
    paint.strokeWidth = 2.5;
    final dataPath = Path();
    for (int i = 0; i < data.length; i++) {
      final pt = toPoint(data[i]['age'] as int, (data[i]['height'] as int).toDouble());
      if (i == 0) dataPath.moveTo(pt.x, pt.y);
      else dataPath.lineTo(pt.x, pt.y);
    }
    canvas.drawPath(dataPath, paint);

    for (int i = 0; i < data.length; i++) {
      final pt = toPoint(data[i]['age'] as int, (data[i]['height'] as int).toDouble());
      fillPaint.color = Colors.black;
      canvas.drawCircle(Offset(pt.x, pt.y), 4, fillPaint);
      fillPaint.color = Colors.white;
      canvas.drawCircle(Offset(pt.x, pt.y), 2, fillPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GrowthChartPainter old) => old.data != data;
}
