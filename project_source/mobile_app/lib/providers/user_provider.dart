import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;

class ChildProfile {
  final String id;
  final String name;
  final int age;
  final String avatar;
  final String gender;
  final String? photoUrl;
  final DateTime? birthday;
  final List<String> interests;
  final String? notes;

  ChildProfile({
    required this.id,
    required this.name,
    required this.age,
    this.avatar = '👶',
    this.gender = 'other',
    this.photoUrl,
    this.birthday,
    this.interests = const [],
    this.notes,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'age': age, 'avatar': avatar,
    'gender': gender, 'photoUrl': photoUrl, 'birthday': birthday?.toIso8601String(),
    'interests': interests, 'notes': notes,
  };

  factory ChildProfile.fromJson(Map<String, dynamic> json) => ChildProfile(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    age: json['age'] ?? 0,
    avatar: json['avatar'] ?? '👶',
    gender: json['gender'] ?? 'other',
    photoUrl: json['photoUrl'],
    birthday: json['birthday'] != null ? DateTime.tryParse(json['birthday']) : null,
    interests: List<String>.from(json['interests'] ?? []),
    notes: json['notes'],
  );
}

class LoginHistoryEntry {
  final DateTime timestamp;
  final String ipAddress;
  final String deviceName;
  final bool success;

  LoginHistoryEntry({
    required this.timestamp,
    required this.ipAddress,
    required this.deviceName,
    required this.success,
  });

  Map<String, dynamic> toJson() => {
    'timestamp': timestamp.toIso8601String(), 'ipAddress': ipAddress,
    'deviceName': deviceName, 'success': success,
  };

  factory LoginHistoryEntry.fromJson(Map<String, dynamic> json) => LoginHistoryEntry(
    timestamp: DateTime.parse(json['timestamp']),
    ipAddress: json['ipAddress'] ?? '',
    deviceName: json['deviceName'] ?? '',
    success: json['success'] ?? false,
  );
}

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? profileImageUrl;
  final List<ChildProfile> children;
  final bool emailVerified;
  final Map<String, bool> notificationPreferences;
  final List<LoginHistoryEntry> loginHistory;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.profileImageUrl,
    this.children = const [],
    this.emailVerified = false,
    this.notificationPreferences = const {},
    this.loginHistory = const [],
  });
}

class UserProvider extends ChangeNotifier {
  Box? _userBox;
  Box? _settingsBox;
  User? _currentUser;
  bool _isLoggedIn = false;
  bool _isLoading = false;
  String? _accessToken;
  String? _refreshToken;
  DateTime? _tokenExpiry;
  Timer? _sessionTimer;

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _isLoggedIn;
  bool get isLoading => _isLoading;
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  List<ChildProfile> get children => _currentUser?.children ?? [];
  bool get emailVerified => _currentUser?.emailVerified ?? false;

  UserProvider() {
    _initBoxes();
  }

  Future<void> _initBoxes() async {
    try {
      _userBox = Hive.box('userBox');
      _settingsBox = Hive.box('settingsBox');
    } catch (_) {}
    await _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    final token = _userBox?.get('accessToken');
    final refresh = _userBox?.get('refreshToken');
    final expiry = _userBox?.get('tokenExpiry');
    final userData = _userBox?.get('currentUser');

    if (token != null && expiry != null) {
      _accessToken = token;
      _refreshToken = refresh;
      _tokenExpiry = DateTime.tryParse(expiry);

      if (_tokenExpiry != null && DateTime.now().isBefore(_tokenExpiry!)) {
        if (userData != null) {
          _currentUser = _userFromJson(userData);
          _isLoggedIn = true;
          _startSessionTimer();
          notifyListeners();
          return;
        }
      } else if (refresh != null) {
        await _refreshAccessToken(refresh);
        return;
      }
    }

    final savedData = _userBox?.get('currentUser');
    if (savedData != null) {
      _currentUser = _userFromJson(savedData);
      _isLoggedIn = true;
      notifyListeners();
    }
  }

  User _userFromJson(Map<String, dynamic> data) {
    return User(
      id: data['id'] ?? '',
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      role: data['role'] ?? '',
      profileImageUrl: data['profileImageUrl'],
      children: (data['children'] as List?)?.map((c) => ChildProfile.fromJson(c is Map ? c : {})).toList() ?? [],
      emailVerified: data['emailVerified'] ?? false,
      notificationPreferences: Map<String, bool>.from(data['notificationPreferences'] ?? {}),
      loginHistory: (data['loginHistory'] as List?)?.map((h) => LoginHistoryEntry.fromJson(h)).toList() ?? [],
    );
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('/api/v1/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password, 'deviceName': 'Mobile App'}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final userData = data['user'];
          _accessToken = data['accessToken'];
          _refreshToken = data['refreshToken'];
          _tokenExpiry = DateTime.now().add(Duration(seconds: data['expiresIn'] ?? 3600));

          _currentUser = User(
            id: userData['id'] ?? '',
            name: userData['name'] ?? '',
            email: userData['email'] ?? '',
            role: userData['role'] ?? 'parent',
            profileImageUrl: userData['profileImageUrl'],
            children: (userData['children'] as List?)?.map((c) => ChildProfile.fromJson(c)).toList() ?? [],
            emailVerified: userData['emailVerified'] ?? false,
            notificationPreferences: Map<String, bool>.from(userData['notificationPreferences'] ?? {}),
          );

          _isLoggedIn = true;
          _isLoading = false;
          await _persistUserData(userData);
          _startSessionTimer();
          notifyListeners();
          return true;
        }
      }

      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _refreshAccessToken(String refresh) async {
    try {
      final response = await http.post(
        Uri.parse('/api/v1/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _accessToken = data['accessToken'];
        _refreshToken = data['refreshToken'];
        _tokenExpiry = DateTime.now().add(Duration(seconds: data['expiresIn'] ?? 3600));
        await _userBox?.put('accessToken', _accessToken);
        await _userBox?.put('refreshToken', _refreshToken);
        await _userBox?.put('tokenExpiry', _tokenExpiry!.toIso8601String());
      } else {
        await logout();
      }
    } catch (_) {
      await logout();
    }
  }

  Future<void> _persistUserData(Map<String, dynamic> userData) async {
    await _userBox?.put('currentUser', userData);
    await _userBox?.put('accessToken', _accessToken);
    await _userBox?.put('refreshToken', _refreshToken);
    await _userBox?.put('tokenExpiry', _tokenExpiry?.toIso8601String());
  }

  void _startSessionTimer() {
    _sessionTimer?.cancel();
    if (_tokenExpiry != null) {
      final duration = _tokenExpiry!.difference(DateTime.now());
      if (duration.isPositive) {
        _sessionTimer = Timer(duration, () {
          if (_refreshToken != null) {
            _refreshAccessToken(_refreshToken!);
          } else {
            logout();
          }
        });
      }
    }
  }

  Future<void> logout() async {
    if (_accessToken != null) {
      try {
        await http.post(
          Uri.parse('/api/v1/auth/logout'),
          headers: {'Authorization': 'Bearer $_accessToken'},
        );
      } catch (_) {}
    }

    _currentUser = null;
    _isLoggedIn = false;
    _accessToken = null;
    _refreshToken = null;
    _tokenExpiry = null;
    _sessionTimer?.cancel();

    await _userBox?.delete('currentUser');
    await _userBox?.delete('accessToken');
    await _userBox?.delete('refreshToken');
    await _userBox?.delete('tokenExpiry');
    notifyListeners();
  }

  Future<bool> changePassword(String currentPassword, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('/api/v1/auth/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_accessToken',
        },
        body: jsonEncode({'currentPassword': currentPassword, 'newPassword': newPassword}),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void updateProfile(String name, String? photoUrl) {
    if (_currentUser != null) {
      _currentUser = User(
        id: _currentUser!.id,
        name: name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: photoUrl ?? _currentUser!.profileImageUrl,
        children: _currentUser!.children,
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: _currentUser!.notificationPreferences,
        loginHistory: _currentUser!.loginHistory,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  void updateNotificationPreference(String key, bool value) {
    if (_currentUser != null) {
      final prefs = Map<String, bool>.from(_currentUser!.notificationPreferences);
      prefs[key] = value;
      _currentUser = User(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: _currentUser!.profileImageUrl,
        children: _currentUser!.children,
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: prefs,
        loginHistory: _currentUser!.loginHistory,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  void addChild(ChildProfile child) {
    if (_currentUser != null) {
      _currentUser = User(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: _currentUser!.profileImageUrl,
        children: [..._currentUser!.children, child],
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: _currentUser!.notificationPreferences,
        loginHistory: _currentUser!.loginHistory,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  void updateChild(String childId, ChildProfile updated) {
    if (_currentUser != null) {
      _currentUser = User(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: _currentUser!.profileImageUrl,
        children: _currentUser!.children.map((c) => c.id == childId ? updated : c).toList(),
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: _currentUser!.notificationPreferences,
        loginHistory: _currentUser!.loginHistory,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  void removeChild(String childId) {
    if (_currentUser != null) {
      _currentUser = User(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: _currentUser!.profileImageUrl,
        children: _currentUser!.children.where((c) => c.id != childId).toList(),
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: _currentUser!.notificationPreferences,
        loginHistory: _currentUser!.loginHistory,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  Future<bool> sendEmailVerification() async {
    try {
      final response = await http.post(
        Uri.parse('/api/v1/auth/send-verification'),
        headers: {'Authorization': 'Bearer $_accessToken'},
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void addLoginHistoryEntry(LoginHistoryEntry entry) {
    if (_currentUser != null) {
      final history = [..._currentUser!.loginHistory, entry];
      if (history.length > 20) history.removeAt(0);
      _currentUser = User(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        profileImageUrl: _currentUser!.profileImageUrl,
        children: _currentUser!.children,
        emailVerified: _currentUser!.emailVerified,
        notificationPreferences: _currentUser!.notificationPreferences,
        loginHistory: history,
      );
      _saveCurrentUser();
      notifyListeners();
    }
  }

  void _saveCurrentUser() {
    _userBox?.put('currentUser', _currentUser != null ? {
      'id': _currentUser!.id,
      'name': _currentUser!.name,
      'email': _currentUser!.email,
      'role': _currentUser!.role,
      'profileImageUrl': _currentUser!.profileImageUrl,
      'children': _currentUser!.children.map((c) => c.toJson()).toList(),
      'emailVerified': _currentUser!.emailVerified,
      'notificationPreferences': _currentUser!.notificationPreferences,
      'loginHistory': _currentUser!.loginHistory.map((h) => h.toJson()).toList(),
    } : null);
  }

  @override
  void dispose() {
    _sessionTimer?.cancel();
    super.dispose();
  }
}
