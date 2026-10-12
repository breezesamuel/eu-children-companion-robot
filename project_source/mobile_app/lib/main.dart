import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';

import 'providers/app_provider.dart';
import 'providers/device_provider.dart';
import 'providers/user_provider.dart';
import 'screens/home_screen.dart';
import 'screens/device_control_screen.dart';
import 'screens/learning_center_screen.dart';
import 'screens/growth_record_screen.dart';
import 'screens/parent_dashboard_screen.dart';
import 'screens/games_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/story_screen.dart';
import 'screens/achievements_screen.dart';
import 'screens/video_call_screen.dart';
import 'screens/emotion_tracker_screen.dart';
import 'screens/habit_tracker_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('userBox');
  await Hive.openBox('deviceBox');
  await Hive.openBox('settingsBox');
  await Hive.openBox('appBox');
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const LearningCompanionApp());
}

class LearningCompanionApp extends StatelessWidget {
  const LearningCompanionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AppProvider>(create: (_) => AppProvider()),
        ChangeNotifierProvider<DeviceProvider>(create: (_) => DeviceProvider()),
        ChangeNotifierProvider<UserProvider>(create: (_) => UserProvider()),
      ],
      child: MaterialApp(
        title: 'Learning Companion',
        debugShowCheckedModeBanner: false,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en'), Locale('de'), Locale('fr'), Locale('nl'), Locale('zh'),
        ],
        localeResolutionCallback: (locale, supportedLocales) {
          for (final supported in supportedLocales) {
            if (supported.languageCode == locale?.languageCode) return supported;
          }
          return const Locale('en');
        },
        home: const MainScreen(),
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    DeviceControlScreen(),
    LearningCenterScreen(),
    GrowthRecordScreen(),
    ParentDashboardScreen(),
    GamesScreen(),
    SettingsScreen(),
  ];

  final List<String> _titles = [
    'Home', 'Device', 'Learning', 'Growth', 'Dashboard', 'Games', 'Settings',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_currentIndex]),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () => _showNotifications(context),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.smart_toy, size: 48),
                  SizedBox(height: 8),
                  Text('Learning Companion', style: TextStyle(fontSize: 18)),
                  Text('Explore & Grow', style: TextStyle(fontSize: 13)),
                ],
              ),
            ),
            ListTile(leading: const Icon(Icons.menu_book), title: const Text('Story Time'), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const StoryScreen())); }),
            ListTile(leading: const Icon(Icons.emoji_events), title: const Text('Achievements'), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const AchievementsScreen())); }),
            ListTile(leading: const Icon(Icons.videocam), title: const Text('Video Call'), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const VideoCallScreen())); }),
            const Divider(),
            ListTile(leading: const Icon(Icons.mood), title: const Text('Emotion Tracker'), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const EmotionTrackerScreen())); }),
            ListTile(leading: const Icon(Icons.repeat), title: const Text('Habit Tracker'), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const HabitTrackerScreen())); }),
            const Divider(),
            ListTile(leading: const Icon(Icons.info_outline), title: const Text('About'), onTap: () => Navigator.pop(context)),
          ],
        ),
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() { _currentIndex = index; });
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.devices_outlined), selectedIcon: Icon(Icons.devices), label: 'Device'),
          NavigationDestination(icon: Icon(Icons.school_outlined), selectedIcon: Icon(Icons.school), label: 'Learning'),
          NavigationDestination(icon: Icon(Icons.child_care_outlined), selectedIcon: Icon(Icons.child_care), label: 'Growth'),
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Parent'),
          NavigationDestination(icon: Icon(Icons.sports_esports_outlined), selectedIcon: Icon(Icons.sports_esports), label: 'Games'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }

  void _showNotifications(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ListTile(leading: const Icon(Icons.check_circle, color: Colors.green), title: const Text('Learning session completed'), subtitle: const Text('2 min ago')),
              ListTile(leading: const Icon(Icons.info, color: Colors.blue), title: const Text('New content available'), subtitle: const Text('1 hour ago')),
              ListTile(leading: const Icon(Icons.warning, color: Colors.orange), title: const Text('Battery low on RoboBuddy'), subtitle: const Text('3 hours ago')),
            ],
          ),
        ),
      ),
    );
  }
}
