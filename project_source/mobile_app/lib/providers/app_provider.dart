import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';

class NotificationModuleSettings {
  bool dashboardAlerts;
  bool storyReminders;
  bool achievementAlerts;
  bool growthReminders;
  bool deviceAlerts;
  bool systemUpdates;

  NotificationModuleSettings({
    this.dashboardAlerts = true,
    this.storyReminders = true,
    this.achievementAlerts = true,
    this.growthReminders = true,
    this.deviceAlerts = true,
    this.systemUpdates = true,
  });

  Map<String, dynamic> toJson() => {
    'dashboardAlerts': dashboardAlerts, 'storyReminders': storyReminders,
    'achievementAlerts': achievementAlerts, 'growthReminders': growthReminders,
    'deviceAlerts': deviceAlerts, 'systemUpdates': systemUpdates,
  };

  factory NotificationModuleSettings.fromJson(Map<String, dynamic> json) => NotificationModuleSettings(
    dashboardAlerts: json['dashboardAlerts'] ?? true,
    storyReminders: json['storyReminders'] ?? true,
    achievementAlerts: json['achievementAlerts'] ?? true,
    growthReminders: json['growthReminders'] ?? true,
    deviceAlerts: json['deviceAlerts'] ?? true,
    systemUpdates: json['systemUpdates'] ?? true,
  );
}

class FeatureFlags {
  final bool storyReadAloud;
  final bool growthCharts;
  final bool achievementSharing;
  final bool deviceGroups;
  final bool multiChildAnalytics;
  final bool darkMode;
  final bool exportData;
  final bool autoRefresh;

  FeatureFlags({
    this.storyReadAloud = true,
    this.growthCharts = true,
    this.achievementSharing = false,
    this.deviceGroups = true,
    this.multiChildAnalytics = true,
    this.darkMode = true,
    this.exportData = true,
    this.autoRefresh = true,
  });

  Map<String, dynamic> toJson() => {
    'storyReadAloud': storyReadAloud, 'growthCharts': growthCharts,
    'achievementSharing': achievementSharing, 'deviceGroups': deviceGroups,
    'multiChildAnalytics': multiChildAnalytics, 'darkMode': darkMode,
    'exportData': exportData, 'autoRefresh': autoRefresh,
  };

  factory FeatureFlags.fromJson(Map<String, dynamic> json) => FeatureFlags(
    storyReadAloud: json['storyReadAloud'] ?? true,
    growthCharts: json['growthCharts'] ?? true,
    achievementSharing: json['achievementSharing'] ?? false,
    deviceGroups: json['deviceGroups'] ?? true,
    multiChildAnalytics: json['multiChildAnalytics'] ?? true,
    darkMode: json['darkMode'] ?? true,
    exportData: json['exportData'] ?? true,
    autoRefresh: json['autoRefresh'] ?? true,
  );
}

class AppProvider extends ChangeNotifier {
  Box? _settingsBox;
  int _currentIndex = 0;
  String _currentLanguage = 'en';
  Locale? _locale;
  ThemeMode _themeMode = ThemeMode.system;
  double _textScaleFactor = 1.0;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  bool _dataSaverMode = false;
  int _backgroundRefreshIntervalMinutes = 15;
  bool _onboardingComplete = false;
  String? _lastKnownAppVersion;
  bool _isFirstLaunch = true;
  FeatureFlags _featureFlags = FeatureFlags();
  NotificationModuleSettings _notificationSettings = NotificationModuleSettings();

  int get currentIndex => _currentIndex;
  String get currentLanguage => _currentLanguage;
  Locale? get locale => _locale;
  ThemeMode get themeMode => _themeMode;
  double get textScaleFactor => _textScaleFactor;
  bool get isDarkMode => _themeMode == ThemeMode.dark;
  bool get soundEnabled => _soundEnabled;
  bool get vibrationEnabled => _vibrationEnabled;
  bool get dataSaverMode => _dataSaverMode;
  int get backgroundRefreshIntervalMinutes => _backgroundRefreshIntervalMinutes;
  bool get onboardingComplete => _onboardingComplete;
  String? get lastKnownAppVersion => _lastKnownAppVersion;
  bool get isFirstLaunch => _isFirstLaunch;
  FeatureFlags get featureFlags => _featureFlags;
  NotificationModuleSettings get notificationSettings => _notificationSettings;

  AppProvider() {
    _init();
  }

  Future<void> _init() async {
    try {
      _settingsBox = Hive.box('settingsBox');
    } catch (_) {}
    await _loadSettings();
  }

  Future<void> _loadSettings() async {
    final data = _settingsBox?.get('appSettings');
    if (data != null) {
      try {
        final map = jsonDecode(data);
        _currentLanguage = map['language'] ?? 'en';
        _locale = map['locale'] != null ? Locale(map['locale']) : null;
        _themeMode = ThemeMode.values[map['themeMode'] ?? 1];
        _textScaleFactor = (map['textScaleFactor'] ?? 1.0).toDouble();
        _soundEnabled = map['soundEnabled'] ?? true;
        _vibrationEnabled = map['vibrationEnabled'] ?? true;
        _dataSaverMode = map['dataSaverMode'] ?? false;
        _backgroundRefreshIntervalMinutes = map['backgroundRefreshIntervalMinutes'] ?? 15;
        _onboardingComplete = map['onboardingComplete'] ?? false;
        _lastKnownAppVersion = map['lastKnownAppVersion'];
        _isFirstLaunch = map['isFirstLaunch'] ?? false;
        if (map['featureFlags'] != null) {
          _featureFlags = FeatureFlags.fromJson(map['featureFlags']);
        }
        if (map['notificationSettings'] != null) {
          _notificationSettings = NotificationModuleSettings.fromJson(map['notificationSettings']);
        }
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> _persistSettings() async {
    try {
      await _settingsBox?.put('appSettings', jsonEncode({
        'language': _currentLanguage,
        'locale': _locale?.languageCode,
        'themeMode': _themeMode.index,
        'textScaleFactor': _textScaleFactor,
        'soundEnabled': _soundEnabled,
        'vibrationEnabled': _vibrationEnabled,
        'dataSaverMode': _dataSaverMode,
        'backgroundRefreshIntervalMinutes': _backgroundRefreshIntervalMinutes,
        'onboardingComplete': _onboardingComplete,
        'lastKnownAppVersion': _lastKnownAppVersion,
        'isFirstLaunch': _isFirstLaunch,
        'featureFlags': _featureFlags.toJson(),
        'notificationSettings': _notificationSettings.toJson(),
      }));
    } catch (_) {}
  }

  void setCurrentIndex(int index) {
    _currentIndex = index;
    notifyListeners();
  }

  void setLanguage(String language) {
    _currentLanguage = language;
    _locale = Locale(language);
    _persistSettings();
    notifyListeners();
  }

  void setLocale(Locale locale) {
    _locale = locale;
    _currentLanguage = locale.languageCode;
    _persistSettings();
    notifyListeners();
  }

  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    _persistSettings();
    notifyListeners();
  }

  void toggleDarkMode() {
    _themeMode = isDarkMode ? ThemeMode.light : ThemeMode.dark;
    _persistSettings();
    notifyListeners();
  }

  void setTextScaleFactor(double factor) {
    _textScaleFactor = factor.clamp(0.8, 2.0);
    _persistSettings();
    notifyListeners();
  }

  void setSoundEnabled(bool enabled) {
    _soundEnabled = enabled;
    _persistSettings();
    notifyListeners();
  }

  void setVibrationEnabled(bool enabled) {
    _vibrationEnabled = enabled;
    _persistSettings();
    notifyListeners();
  }

  void setDataSaverMode(bool enabled) {
    _dataSaverMode = enabled;
    _persistSettings();
    notifyListeners();
  }

  void setBackgroundRefreshInterval(int minutes) {
    _backgroundRefreshIntervalMinutes = minutes.clamp(5, 60);
    _persistSettings();
    notifyListeners();
  }

  void completeOnboarding() {
    _onboardingComplete = true;
    _isFirstLaunch = false;
    _persistSettings();
    notifyListeners();
  }

  void resetOnboarding() {
    _onboardingComplete = false;
    _isFirstLaunch = true;
    _persistSettings();
    notifyListeners();
  }

  void setAppVersion(String version) {
    _lastKnownAppVersion = version;
    _persistSettings();
    notifyListeners();
  }

  bool isFeatureEnabled(String feature) {
    final flagMap = _featureFlags.toJson();
    return flagMap[feature] ?? true;
  }

  void setFeatureFlag(String key, bool value) {
    final current = _featureFlags.toJson();
    current[key] = value;
    _featureFlags = FeatureFlags.fromJson(current);
    _persistSettings();
    notifyListeners();
  }

  void updateNotificationModule(String key, bool value) {
    final current = _notificationSettings.toJson();
    current[key] = value;
    _notificationSettings = NotificationModuleSettings.fromJson(current);
    _persistSettings();
    notifyListeners();
  }

  bool isNotificationEnabled(String module) {
    final current = _notificationSettings.toJson();
    return current[module] ?? true;
  }

  Future<void> clearCache() async {
    try {
      final appBox = Hive.box('appBox');
      await appBox.clear();
    } catch (_) {}
    notifyListeners();
  }

  Future<void> clearAllData() async {
    try {
      await Hive.box('settingsBox').clear();
      await Hive.box('userBox').clear();
      await Hive.box('deviceBox').clear();
    } catch (_) {}
    _themeMode = ThemeMode.system;
    _currentLanguage = 'en';
    _locale = null;
    _textScaleFactor = 1.0;
    _soundEnabled = true;
    _vibrationEnabled = true;
    _dataSaverMode = false;
    _onboardingComplete = false;
    _isFirstLaunch = true;
    notifyListeners();
  }
}
