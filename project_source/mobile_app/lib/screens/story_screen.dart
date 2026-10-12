import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StoryScreen extends StatefulWidget {
  const StoryScreen({super.key});

  @override
  State<StoryScreen> createState() => _StoryScreenState();
}

class _StoryScreenState extends State<StoryScreen> with TickerProviderStateMixin {
  int _currentIndex = 0;
  String _searchQuery = '';
  String _selectedCategory = 'All';
  double _fontSize = 17;
  bool _isNightMode = false;
  bool _isReadAloud = false;
  bool _isAutoScrolling = false;
  double _autoScrollSpeed = 1.0;
  Timer? _autoScrollTimer;
  Timer? _readAloudTimer;
  int _readAloudWordIndex = 0;
  List<String> _currentWords = [];
  Set<String> _favorites = {};
  Map<String, int> _readingProgress = {};
  Set<String> _completedStories = {};
  int _totalReadingTimeSeconds = 0;
  Timer? _readingTimer;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  AnimationController? _highlightAnimController;

  final List<Map<String, String>> _allStories = [
    {'title': 'The Brave Little Turtle', 'content': 'Once upon a time, in a sunny pond, lived a little turtle named Timmy. Timmy was afraid of everything. He hid in his shell when the wind blew and when the fish swam by. One day, a baby duck fell into the pond and couldn\'t swim. Timmy knew he had to be brave. He swam as fast as he could and helped the duckling reach a lily pad. From that day on, Timmy learned that being brave means helping others even when you\'re scared.', 'age': '3-5', 'time': '3 min', 'category': 'Adventure', 'emoji': '🐢'},
    {'title': 'The Magic Paintbrush', 'content': 'Lily found a magic paintbrush in her grandmother\'s attic. Everything she painted came to life! She painted a butterfly that flew off the paper. She painted a flower that filled the room with fragrance. But when she painted a storm by accident, she had to quickly paint a rainbow to calm it. Lily learned that creativity is powerful and she must use it wisely.', 'age': '5-7', 'time': '4 min', 'category': 'Fairy Tale', 'emoji': '🖌️'},
    {'title': 'The Starship Adventure', 'content': 'Captain Nova and her robot friend Zip explored the galaxy in their starship. They visited a planet made of candy, a moon that sang, and a ring of floating crystals. When their ship broke down near a black hole, Zip used his repair skills to fix the engine just in time. They learned that teamwork and friendship can overcome any challenge in the universe.', 'age': '6-9', 'time': '5 min', 'category': 'Adventure', 'emoji': '🚀'},
    {'title': 'The Kindness Garden', 'content': 'In a small village, there was a garden that only grew when people were kind to each other. Each act of kindness made a flower bloom. When the villagers argued, the garden wilted. A young girl named Sara started being kind to everyone and encouraged others to do the same. Soon the garden was the most beautiful it had ever been. The village learned that kindness makes the world grow.', 'age': '4-6', 'time': '3 min', 'category': 'Fairy Tale', 'emoji': '🌸'},
    {'title': 'The Little Scientist', 'content': 'Max loved asking questions. Why is the sky blue? Why do plants grow? His parents gave him a science kit for his birthday. He mixed colors, grew crystals, and built a volcano that erupted. Max discovered that science is about exploring and asking questions. Every answer led to more exciting questions. He decided he would be a scientist when he grew up.', 'age': '5-8', 'time': '4 min', 'category': 'Science', 'emoji': '🔬'},
    {'title': 'The Dinosaur Discovery', 'content': 'Emma and Jack were digging in their backyard when they found a fossil. It was a dinosaur bone! They called the museum and a paleontologist came to help. They uncovered a whole T-Rex skeleton. Emma and Jack became junior paleontologists and learned that history is hidden everywhere, just waiting to be discovered.', 'age': '5-9', 'time': '5 min', 'category': 'Science', 'emoji': '🦕'},
    {'title': 'The Little Historian', 'content': 'Tim loved visiting his grandfather who told stories about the olden days. He learned about ancient Egypt, the Great Wall of China, and the first moon landing. Tim realized that history is not just dates and facts, it is a collection of amazing stories about people who came before us.', 'age': '6-10', 'time': '5 min', 'category': 'History', 'emoji': '📜'},
    {'title': 'Sleepy Moon Adventure', 'content': 'It was bedtime but Luna could not sleep. She looked out her window and saw the moon smiling at her. The moon invited her on a magical adventure through the night sky. They floated past stars that whispered lullabies and clouds that felt like cotton candy. When Luna returned to her bed, she felt cozy and sleepy.', 'age': '3-5', 'time': '3 min', 'category': 'Bedtime', 'emoji': '🌙'},
    {'title': 'The Great Castle Adventure', 'content': 'Prince Oliver and Princess Maya explored an old castle in the forest. They found secret passages, a hidden treasure room, and a friendly ghost named Casper. The ghost showed them the castle\'s history and they learned that every old building has wonderful stories to tell.', 'age': '4-7', 'time': '4 min', 'category': 'Adventure', 'emoji': '🏰'},
    {'title': 'The Dancing Fairies', 'content': 'In a magical forest, fairies danced every night under the moonlight. A little girl named Chloe saw them and wanted to join. The fairy queen said she could if she believed in magic. Chloe closed her eyes, believed with all her heart, and grew beautiful fairy wings. She danced with the fairies all night long.', 'age': '3-6', 'time': '3 min', 'category': 'Fairy Tale', 'emoji': '🧚'},
    {'title': 'How Planes Fly', 'content': 'Sophie was fascinated by airplanes. Her dad, a pilot, explained how planes fly using lift, thrust, and aerodynamics. She built paper airplanes and learned about wing shapes. Sophie discovered that science helps us understand amazing things like how a heavy airplane can fly through the sky.', 'age': '6-9', 'time': '4 min', 'category': 'Science', 'emoji': '✈️'},
    {'title': 'Ancient Egypt Adventure', 'content': 'A group of friends found a time machine in their school library. They traveled to ancient Egypt and met Pharaoh Ramses. They learned about pyramids, hieroglyphics, and the Nile River. When they returned, they built a model pyramid for their class project and became history experts.', 'age': '7-10', 'time': '5 min', 'category': 'History', 'emoji': '🗿'},
    {'title': 'The Cozy Bear Cave', 'content': 'Little bear Benny could not find a cozy place to hibernate. He tried caves that were too wet, too cold, or too noisy. Finally, his mother showed him a perfect cave with soft leaves and a warm breeze. Benny learned that home is where you feel safe and loved.', 'age': '2-4', 'time': '3 min', 'category': 'Bedtime', 'emoji': '🐻'},
    {'title': 'The Pirate Treasure', 'content': 'Captain Redbeard and his crew sailed the seven seas looking for treasure. They followed an old map through storms and past sea monsters. The treasure was not gold or jewels, but a chest full of books from around the world. They learned that knowledge is the greatest treasure.', 'age': '5-8', 'time': '4 min', 'category': 'Adventure', 'emoji': '🏴‍☠️'},
    {'title': 'The Princess and the Dragon', 'content': 'Princess Amelia was not afraid of the dragon that lived on the hill. She brought it tea and cakes. The dragon was lonely, not scary. They became best friends and the dragon protected the kingdom. The people learned not to judge by appearances.', 'age': '4-7', 'time': '4 min', 'category': 'Fairy Tale', 'emoji': '🐉'},
    {'title': 'Space Explorers', 'content': 'Three friends built a rocket in their treehouse and flew to Mars. They met friendly aliens who taught them about Martian culture. They shared Earth stories and learned that friendship can cross any distance, even between planets.', 'age': '5-9', 'time': '5 min', 'category': 'Science', 'emoji': '👽'},
    {'title': 'Medieval Knights', 'content': 'Young squire Thomas dreamed of becoming a knight. He trained hard, learned to ride horses, and studied chivalry. When the kingdom was threatened, Thomas bravely defended the castle and was knighted by the king. He learned that courage comes from the heart.', 'age': '6-9', 'time': '5 min', 'category': 'History', 'emoji': '⚔️'},
    {'title': 'Goodnight Forest', 'content': 'The forest animals were getting ready for bed. Rabbit brushed his teeth, Fox put on her pajamas, and Owl said goodnight to the stars. Mama Deer sang a lullaby and all the animals fell asleep under the big moon.', 'age': '2-4', 'time': '2 min', 'category': 'Bedtime', 'emoji': '🌲'},
    {'title': 'The Rainbow Bridge', 'content': 'After a big rain, a rainbow appeared over the village. Two children, Mia and Leo, decided to find where it ended. They walked across the rainbow bridge and found a world full of colors where everything was made of light and joy.', 'age': '4-6', 'time': '3 min', 'category': 'Fairy Tale', 'emoji': '🌈'},
    {'title': 'The Robot Helper', 'content': 'A little robot named Botty wanted to help people. He tried cooking but burned the toast. He tried cleaning but bumped into things. Finally, he helped an old lady cross the street and found that the best way to help is to be kind and caring.', 'age': '3-6', 'time': '3 min', 'category': 'Adventure', 'emoji': '🤖'},
    {'title': 'The Time Travelers', 'content': 'Two siblings discovered a pocket watch that could travel through time. They visited the Renaissance, the Industrial Revolution, and the future. They saw how inventions changed the world and returned home inspired to create their own.', 'age': '7-10', 'time': '5 min', 'category': 'History', 'emoji': '⏰'},
    {'title': 'Dreamy Starfish', 'content': 'A little starfish named Stella wished she could touch the stars. A friendly wave carried her to the surface where she saw the night sky reflected in the ocean. Stella realized she was already surrounded by stars every night.', 'age': '3-5', 'time': '3 min', 'category': 'Bedtime', 'emoji': '⭐'},
  ];

  final List<String> _categories = ['All', 'Adventure', 'Fairy Tale', 'Science', 'History', 'Bedtime'];

  List<Map<String, String>> get _filteredStories {
    return _allStories.where((s) {
      final matchesCategory = _selectedCategory == 'All' || s['category'] == _selectedCategory;
      final matchesSearch = _searchQuery.isEmpty ||
          (s['title']?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  int get _totalPages => _filteredStories.length;

  @override
  void initState() {
    super.initState();
    _highlightAnimController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _loadPreferences();
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _readAloudTimer?.cancel();
    _readingTimer?.cancel();
    _scrollController.dispose();
    _searchController.dispose();
    _highlightAnimController?.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _favorites = (prefs.getStringList('story_favorites') ?? []).toSet();
      _readingProgress = (prefs.getString('story_progress') ?? '{}').split(',').where((s) => s.contains(':')).fold<Map<String, int>>({}, (map, s) {
        final parts = s.split(':');
        if (parts.length == 2) map[parts[0]] = int.tryParse(parts[1]) ?? 0;
        return map;
      });
      _completedStories = (prefs.getStringList('story_completed') ?? []).toSet();
      _totalReadingTimeSeconds = prefs.getInt('story_reading_time') ?? 0;
      _isNightMode = prefs.getBool('story_night_mode') ?? false;
      _fontSize = prefs.getDouble('story_font_size') ?? 17;
    });
  }

  Future<void> _saveFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('story_favorites', _favorites.toList());
  }

  Future<void> _saveProgress() async {
    final prefs = await SharedPreferences.getInstance();
    final progressStr = _readingProgress.entries.map((e) => '${e.key}:${e.value}').join(',');
    await prefs.setString('story_progress', progressStr);
  }

  Future<void> _toggleFavorite(String title) async {
    setState(() {
      if (_favorites.contains(title)) {
        _favorites.remove(title);
      } else {
        _favorites.add(title);
      }
    });
    await _saveFavorites();
  }

  void _startAutoScroll() {
    _isAutoScrolling = true;
    _autoScrollTimer = Timer.periodic(Duration(milliseconds: (200 / _autoScrollSpeed).round()), (_) {
      final maxScroll = _scrollController.position.maxScrollExtent;
      if (_scrollController.offset < maxScroll) {
        _scrollController.animateBy(2 * _autoScrollSpeed, duration: const Duration(milliseconds: 50), curve: Curves.linear);
      } else {
        _stopAutoScroll();
      }
    });
    setState(() {});
  }

  void _stopAutoScroll() {
    _isAutoScrolling = false;
    _autoScrollTimer?.cancel();
    setState(() {});
  }

  String _getStoryKey(Map<String, String> story) => story['title'] ?? '';

  void _startReadAloud() {
    final story = _filteredStories[_currentIndex];
    _currentWords = (story['content'] ?? '').split(' ');
    _readAloudWordIndex = 0;
    _isReadAloud = true;
    _highlightAnimController?.repeat(reverse: true);
    _readAloudTimer = Timer.periodic(const Duration(milliseconds: 400), (_) {
      if (_readAloudWordIndex < _currentWords.length) {
        setState(() => _readAloudWordIndex++);
      } else {
        _stopReadAloud();
      }
    });
    setState(() {});
  }

  void _stopReadAloud() {
    _isReadAloud = false;
    _readAloudTimer?.cancel();
    _highlightAnimController?.stop();
    _readAloudWordIndex = 0;
    setState(() {});
  }

  void _completeCurrentStory() {
    final story = _filteredStories[_currentIndex];
    final key = _getStoryKey(story);
    setState(() => _completedStories.add(key));
    SharedPreferences.getInstance().then((prefs) => prefs.setStringList('story_completed', _completedStories.toList()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Story completed! 🎉'), duration: Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stories = _filteredStories;
    final currentStory = _currentIndex < stories.length ? stories[_currentIndex] : null;

    return Theme(
      data: _isNightMode ? theme.copyWith(brightness: Brightness.dark) : theme,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Story Time'),
          centerTitle: true,
          actions: [
            IconButton(
              icon: Icon(_isNightMode ? Icons.light_mode : Icons.nightlight_round),
              onPressed: () {
                setState(() => _isNightMode = !_isNightMode);
                SharedPreferences.getInstance().then((prefs) => prefs.setBool('story_night_mode', _isNightMode));
              },
            ),
          ],
        ),
        body: Column(
          children: [
            _buildSearchBar(),
            _buildCategoryTabs(),
            _buildReadingStats(),
            Expanded(
              child: _currentIndex >= stories.length
                  ? const Center(child: Text('No stories match your search'))
                  : _buildStoryContent(currentStory!),
            ),
            _buildControls(stories.length),
            if (currentStory != null) _buildToolbar(currentStory),
          ],
        ),
        floatingActionButton: FloatingActionButton.small(
          onPressed: () => _showStoryList(stories),
          child: const Icon(Icons.list),
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search stories...',
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                })
              : null,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onChanged: (v) {
          setState(() {
            _searchQuery = v;
            _currentIndex = 0;
          });
        },
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: _categories.map((cat) {
          final selected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text(cat, style: const TextStyle(fontSize: 12)),
              selected: selected,
              onSelected: (_) => setState(() {
                _selectedCategory = cat;
                _currentIndex = 0;
              }),
              visualDensity: VisualDensity.compact,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildReadingStats() {
    final totalRead = _completedStories.length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _statChip(Icons.check_circle, '$totalRead Read', Colors.green),
          _statChip(Icons.favorite, '${_favorites.length} Favorites', Colors.red),
          _statChip(Icons.timer, '${_totalReadingTimeSeconds ~/ 60} min', Colors.blue),
          _statChip(Icons.auto_stories, '${_filteredStories.length} Stories', Colors.purple),
        ],
      ),
    );
  }

  Widget _statChip(IconData icon, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: color)),
      ],
    );
  }

  Widget _buildStoryContent(Map<String, String> story) {
    final progress = _readingProgress[_getStoryKey(story)] ?? 0;
    final isComplete = _completedStories.contains(_getStoryKey(story));
    final words = (story['content'] ?? '').split(' ');

    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(story['emoji'] ?? '', style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 8),
              Chip(label: Text('Ages ${story['age']}', style: const TextStyle(fontSize: 11)), visualDensity: VisualDensity.compact),
              const SizedBox(width: 6),
              Chip(label: Text(story['time'] ?? '', style: const TextStyle(fontSize: 11)), visualDensity: VisualDensity.compact),
              const Spacer(),
              if (isComplete)
                const Icon(Icons.check_circle, color: Colors.green, size: 20),
            ],
          ),
          const SizedBox(height: 12),
          Text(story['title']!, style: TextStyle(fontSize: _fontSize + 7, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          if (_isReadAloud)
            _buildReadAloudText(words)
          else
            Text(
              story['content']!,
              style: TextStyle(fontSize: _fontSize, height: 1.6, color: _isNightMode ? Colors.grey[300] : null),
            ),
          if (progress > 0 && progress < 100)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Row(
                children: [
                  const Icon(Icons.trending_flat, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text('Continue reading (${progress}%)', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  const Spacer(),
                  Text('$progress%', style: const TextStyle(fontSize: 12, color: Colors.blue)),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton.icon(
              onPressed: _completedStories.contains(_getStoryKey(story)) ? null : _completeCurrentStory,
              icon: const Icon(Icons.celebration_outlined, size: 18),
              label: Text(isComplete ? 'Completed!' : 'Mark as Complete'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReadAloudText(List<String> words) {
    return RichText(
      text: TextSpan(
        style: TextStyle(fontSize: _fontSize, height: 1.6, color: _isNightMode ? Colors.grey[300] : Colors.black87),
        children: words.asMap().entries.map((e) {
          final isCurrent = _isReadAloud && e.key == _readAloudWordIndex;
          return TextSpan(
            text: '${e.value} ',
            style: TextStyle(
              backgroundColor: isCurrent ? Colors.yellow.withOpacity(0.5) : null,
              fontWeight: isCurrent ? FontWeight.bold : null,
              fontSize: isCurrent ? _fontSize + 2 : _fontSize,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildControls(int total) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, -2))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton.icon(
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Prev', style: TextStyle(fontSize: 13)),
            onPressed: _currentIndex > 0 ? () {
              setState(() => _currentIndex--);
              _scrollController.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
              _stopReadAloud();
              _stopAutoScroll();
            } : null,
          ),
          Text('${_currentIndex + 1} / $total', style: const TextStyle(fontSize: 13)),
          TextButton.icon(
            icon: const Icon(Icons.arrow_forward, size: 18),
            label: const Text('Next', style: TextStyle(fontSize: 13)),
            onPressed: _currentIndex < total - 1 ? () {
              setState(() => _currentIndex++);
              _scrollController.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
              _stopReadAloud();
              _stopAutoScroll();
            } : null,
          ),
        ],
      ),
    );
  }

  Widget _buildToolbar(Map<String, String> story) {
    final key = _getStoryKey(story);
    final isFav = _favorites.contains(key);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.2))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _toolButton(Icons.favorite, isFav ? Colors.red : Colors.grey, () => _toggleFavorite(key)),
          _toolButton(Icons.font_download, Colors.blue, () => _showFontSizeDialog()),
          _toolButton(_isReadAloud ? Icons.record_voice_over : Icons.voice_over_off, _isReadAloud ? Colors.orange : Colors.grey, () {
            if (_isReadAloud) _stopReadAloud(); else _startReadAloud();
          }),
          _toolButton(_isAutoScrolling ? Icons.pause : Icons.play_arrow, _isAutoScrolling ? Colors.green : Colors.grey, () {
            if (_isAutoScrolling) _stopAutoScroll(); else _startAutoScroll();
          }),
          if (_isAutoScrolling)
            PopupMenuButton<double>(
              icon: const Icon(Icons.speed, size: 20),
              onSelected: (v) => setState(() => _autoScrollSpeed = v),
              itemBuilder: (_) => [0.5, 1.0, 1.5, 2.0, 3.0].map((s) => PopupMenuItem(value: s, child: Text('${s}x'))).toList(),
            ),
          _toolButton(Icons.share, Colors.grey, () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Sharing "${story['title']}"...')),
            );
          }),
        ],
      ),
    );
  }

  Widget _toolButton(IconData icon, Color color, VoidCallback onPressed) {
    return IconButton(icon: Icon(icon, size: 20, color: color), onPressed: onPressed, constraints: const BoxConstraints(minWidth: 36, minHeight: 36), padding: EdgeInsets.zero);
  }

  void _showFontSizeDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Font Size'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(icon: const Icon(Icons.text_decrease), onPressed: () => setState(() => _fontSize = (_fontSize - 2).clamp(12, 30).toDouble())),
                Text('${_fontSize.round()}', style: const TextStyle(fontSize: 20)),
                IconButton(icon: const Icon(Icons.text_increase), onPressed: () => setState(() => _fontSize = (_fontSize + 2).clamp(12, 30).toDouble())),
              ],
            ),
            Slider(
              value: _fontSize,
              min: 12,
              max: 30,
              onChanged: (v) => setState(() => _fontSize = v.roundToDouble()),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              SharedPreferences.getInstance().then((prefs) => prefs.setDouble('story_font_size', _fontSize));
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  void _showStoryList(List<Map<String, String>> stories) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(vertical: Radius.circular(20)),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scroll) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${stories.length} Stories', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: scroll,
                itemCount: stories.length,
                itemBuilder: (_, i) {
                  final s = stories[i];
                  final key = _getStoryKey(s);
                  final isFav = _favorites.contains(key);
                  final isComp = _completedStories.contains(key);
                  return ListTile(
                    leading: Text(s['emoji'] ?? '', style: const TextStyle(fontSize: 24)),
                    title: Text(s['title'] ?? '', style: TextStyle(fontWeight: _currentIndex == i ? FontWeight.bold : FontWeight.normal)),
                    subtitle: Text('${s['category']} · ${s['time']} · Ages ${s['age']}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isComp) const Icon(Icons.check_circle, size: 16, color: Colors.green),
                        if (isFav) const Icon(Icons.favorite, size: 16, color: Colors.red),
                      ],
                    ),
                    selected: _currentIndex == i,
                    onTap: () {
                      setState(() => _currentIndex = i);
                      _scrollController.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                      Navigator.pop(context);
                    },
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
