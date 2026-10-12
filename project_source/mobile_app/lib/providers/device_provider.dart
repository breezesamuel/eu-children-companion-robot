import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

class NetworkInfo {
  final String ipAddress;
  final String wifiSSID;
  final int signalStrength;
  final String macAddress;

  NetworkInfo({
    required this.ipAddress,
    required this.wifiSSID,
    this.signalStrength = 0,
    this.macAddress = '',
  });

  Map<String, dynamic> toJson() => {
    'ipAddress': ipAddress, 'wifiSSID': wifiSSID,
    'signalStrength': signalStrength, 'macAddress': macAddress,
  };

  factory NetworkInfo.fromJson(Map<String, dynamic> json) => NetworkInfo(
    ipAddress: json['ipAddress'] ?? '',
    wifiSSID: json['wifiSSID'] ?? '',
    signalStrength: json['signalStrength'] ?? 0,
    macAddress: json['macAddress'] ?? '',
  );
}

class StorageInfo {
  final int totalStorageMB;
  final int usedStorageMB;
  final int totalMemoryMB;
  final int usedMemoryMB;
  final int cpuUsage;

  StorageInfo({
    required this.totalStorageMB,
    required this.usedStorageMB,
    required this.totalMemoryMB,
    required this.usedMemoryMB,
    this.cpuUsage = 0,
  });

  double get storagePercent => totalStorageMB > 0 ? usedStorageMB / totalStorageMB : 0;
  double get memoryPercent => totalMemoryMB > 0 ? usedMemoryMB / totalMemoryMB : 0;

  Map<String, dynamic> toJson() => {
    'totalStorageMB': totalStorageMB, 'usedStorageMB': usedStorageMB,
    'totalMemoryMB': totalMemoryMB, 'usedMemoryMB': usedMemoryMB, 'cpuUsage': cpuUsage,
  };

  factory StorageInfo.fromJson(Map<String, dynamic> json) => StorageInfo(
    totalStorageMB: json['totalStorageMB'] ?? 0,
    usedStorageMB: json['usedStorageMB'] ?? 0,
    totalMemoryMB: json['totalMemoryMB'] ?? 0,
    usedMemoryMB: json['usedMemoryMB'] ?? 0,
    cpuUsage: json['cpuUsage'] ?? 0,
  );
}

class DeviceCommand {
  final String id;
  final String command;
  final DateTime timestamp;
  final String status;
  final Map<String, dynamic>? params;
  final String? result;

  DeviceCommand({
    required this.id,
    required this.command,
    required this.timestamp,
    this.status = 'pending',
    this.params,
    this.result,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'command': command, 'timestamp': timestamp.toIso8601String(),
    'status': status, 'params': params, 'result': result,
  };

  factory DeviceCommand.fromJson(Map<String, dynamic> json) => DeviceCommand(
    id: json['id'] ?? '',
    command: json['command'] ?? '',
    timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
    status: json['status'] ?? 'pending',
    params: json['params'],
    result: json['result'],
  );
}

class DeviceAlert {
  final String id;
  final String type;
  final String message;
  final DateTime timestamp;
  final String severity;
  final bool acknowledged;

  DeviceAlert({
    required this.id,
    required this.type,
    required this.message,
    required this.timestamp,
    this.severity = 'info',
    this.acknowledged = false,
  });
}

class ScheduledCommand {
  final String id;
  final String command;
  final DateTime scheduledAt;
  final bool isRecurring;
  final String? cronExpression;
  bool enabled;

  ScheduledCommand({
    required this.id,
    required this.command,
    required this.scheduledAt,
    this.isRecurring = false,
    this.cronExpression,
    this.enabled = true,
  });
}

class DeviceGroup {
  final String id;
  final String name;
  final List<String> deviceIds;
  final String? icon;

  DeviceGroup({
    required this.id,
    required this.name,
    this.deviceIds = const [],
    this.icon,
  });
}

class DeviceLocation {
  final double latitude;
  final double longitude;
  final String? roomName;
  final DateTime lastUpdated;

  DeviceLocation({
    required this.latitude,
    required this.longitude,
    this.roomName,
    required this.lastUpdated,
  });
}

class Device {
  final String id;
  final String name;
  final String status;
  final int batteryLevel;
  final String lastOnline;
  final bool isConnected;
  final String firmwareVersion;
  final NetworkInfo? networkInfo;
  final StorageInfo? storageInfo;
  final bool cameraEnabled;
  final bool micEnabled;
  final DeviceLocation? location;
  final String? groupId;

  Device({
    required this.id,
    required this.name,
    required this.status,
    required this.batteryLevel,
    required this.lastOnline,
    required this.isConnected,
    this.firmwareVersion = '1.0.0',
    this.networkInfo,
    this.storageInfo,
    this.cameraEnabled = false,
    this.micEnabled = false,
    this.location,
    this.groupId,
  });
}

class DeviceProvider extends ChangeNotifier {
  Box? _deviceBox;
  List<Device> _devices = [];
  Device? _currentDevice;
  List<DeviceCommand> _commandHistory = [];
  List<DeviceAlert> _alerts = [];
  List<ScheduledCommand> _scheduledCommands = [];
  List<DeviceGroup> _groups = [];
  List<String> _deviceLogs = [];
  String _mqttConnectionStatus = 'disconnected';
  String _webrtcSignalingState = 'idle';

  List<Device> get devices => _devices;
  Device? get currentDevice => _currentDevice;
  List<DeviceCommand> get commandHistory => _commandHistory;
  List<DeviceAlert> get alerts => _alerts;
  List<ScheduledCommand> get scheduledCommands => _scheduledCommands;
  List<DeviceGroup> get groups => _groups;
  List<String> get deviceLogs => _deviceLogs;
  String get mqttConnectionStatus => _mqttConnectionStatus;
  String get webrtcSignalingState => _webrtcSignalingState;

  int get unreadAlertCount => _alerts.where((a) => !a.acknowledged).length;

  DeviceProvider() {
    _loadDevices();
    _loadPersistedData();
  }

  void _loadDevices() {
    _devices = [
      Device(
        id: 'robot_001', name: 'Little Joy', status: 'online',
        batteryLevel: 85, lastOnline: 'Just now', isConnected: true,
        firmwareVersion: '2.1.3',
        networkInfo: NetworkInfo(ipAddress: '192.168.1.42', wifiSSID: 'HomeWiFi', signalStrength: 85),
        storageInfo: StorageInfo(totalStorageMB: 32000, usedStorageMB: 12000, totalMemoryMB: 4096, usedMemoryMB: 1800, cpuUsage: 45),
        cameraEnabled: true, micEnabled: true,
        location: DeviceLocation(latitude: 48.8566, longitude: 2.3522, roomName: 'Living Room', lastUpdated: DateTime.now()),
      ),
      Device(
        id: 'robot_002', name: 'Robo Friend', status: 'offline',
        batteryLevel: 45, lastOnline: '2 hours ago', isConnected: false,
        firmwareVersion: '1.9.8',
        networkInfo: NetworkInfo(ipAddress: '192.168.1.75', wifiSSID: 'HomeWiFi', signalStrength: 60),
        storageInfo: StorageInfo(totalStorageMB: 32000, usedStorageMB: 22000, totalMemoryMB: 4096, usedMemoryMB: 3100, cpuUsage: 72),
        cameraEnabled: false, micEnabled: false,
        location: DeviceLocation(latitude: 48.8570, longitude: 2.3530, roomName: 'Bedroom', lastUpdated: DateTime.now().subtract(const Duration(hours: 2))),
      ),
      Device(
        id: 'robot_003', name: 'Mini Buddy', status: 'charging',
        batteryLevel: 92, lastOnline: '5 min ago', isConnected: true,
        firmwareVersion: '2.0.1',
        networkInfo: NetworkInfo(ipAddress: '192.168.1.100', wifiSSID: 'HomeWiFi', signalStrength: 78),
        storageInfo: StorageInfo(totalStorageMB: 16000, usedStorageMB: 8000, totalMemoryMB: 2048, usedMemoryMB: 1024, cpuUsage: 30),
        cameraEnabled: true, micEnabled: true,
        location: DeviceLocation(latitude: 48.8568, longitude: 2.3525, roomName: 'Charging Station', lastUpdated: DateTime.now().subtract(const Duration(minutes: 5))),
      ),
    ];

    try {
      _deviceBox = Hive.box('deviceBox');
    } catch (_) {}

    if (_devices.isNotEmpty) {
      _currentDevice = _devices.first;
    }

    _groups = [
      DeviceGroup(id: 'group_all', name: 'All Devices', deviceIds: ['robot_001', 'robot_002', 'robot_003'], icon: '🏠'),
      DeviceGroup(id: 'group_playroom', name: 'Playroom', deviceIds: ['robot_001'], icon: '🎮'),
      DeviceGroup(id: 'group_bedroom', name: 'Bedroom', deviceIds: ['robot_002'], icon: '🛏️'),
    ];
  }

  void _loadPersistedData() {
    final historyData = _deviceBox?.get('commandHistory');
    if (historyData != null) {
      _commandHistory = (jsonDecode(historyData) as List).map((c) => DeviceCommand.fromJson(c)).toList();
    }
  }

  void _persistCommandHistory() {
    _deviceBox?.put('commandHistory', jsonEncode(_commandHistory.map((c) => c.toJson()).toList()));
  }

  List<Device> getDevicesByGroup(String groupId) {
    final group = _groups.firstWhere((g) => g.id == groupId, orElse: () => DeviceGroup(id: '', name: '', deviceIds: []));
    return _devices.where((d) => group.deviceIds.contains(d.id)).toList();
  }

  void addDevice(Device device) {
    _devices.add(device);
    notifyListeners();
  }

  void removeDevice(String deviceId) {
    _devices.removeWhere((d) => d.id == deviceId);
    if (_currentDevice?.id == deviceId) {
      _currentDevice = _devices.isNotEmpty ? _devices.first : null;
    }
    notifyListeners();
  }

  void setCurrentDevice(Device device) {
    _currentDevice = device;
    notifyListeners();
  }

  void setCurrentDeviceById(String deviceId) {
    final device = _devices.firstWhere((d) => d.id == deviceId, orElse: () => _devices.first);
    _currentDevice = device;
    notifyListeners();
  }

  void updateDeviceStatus(String deviceId, String status) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: status,
      batteryLevel: device.batteryLevel,
      lastOnline: status == 'online' ? 'Just now' : device.lastOnline,
      isConnected: status == 'online',
      firmwareVersion: device.firmwareVersion, networkInfo: device.networkInfo,
      storageInfo: device.storageInfo, cameraEnabled: device.cameraEnabled,
      micEnabled: device.micEnabled, location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) {
      _currentDevice = _devices[index];
    }
    notifyListeners();
  }

  void updateFirmware(String deviceId, String version) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: version,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void updateNetworkInfo(String deviceId, NetworkInfo info) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: info, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void updateStorageInfo(String deviceId, StorageInfo info) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: info,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void toggleCamera(String deviceId, bool enabled) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: enabled, micEnabled: device.micEnabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void toggleMic(String deviceId, bool enabled) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: enabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void updateBatteryLevel(String deviceId, int batteryLevel) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: device.location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void updateLocation(String deviceId, DeviceLocation location) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: location, groupId: device.groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void addCommand(DeviceCommand command) {
    _commandHistory.insert(0, command);
    if (_commandHistory.length > 100) {
      _commandHistory = _commandHistory.sublist(0, 100);
    }
    _persistCommandHistory();
    notifyListeners();
  }

  void sendCommand(String deviceId, String command, {Map<String, dynamic>? params}) {
    final cmd = DeviceCommand(
      id: 'cmd_${DateTime.now().millisecondsSinceEpoch}',
      command: command,
      timestamp: DateTime.now(),
      status: 'sent',
      params: params,
    );
    addCommand(cmd);
  }

  void updateCommandStatus(String commandId, String status, {String? result}) {
    final index = _commandHistory.indexWhere((c) => c.id == commandId);
    if (index >= 0) {
      final old = _commandHistory[index];
      _commandHistory[index] = DeviceCommand(
        id: old.id, command: old.command, timestamp: old.timestamp,
        status: status, params: old.params, result: result,
      );
      _persistCommandHistory();
      notifyListeners();
    }
  }

  void addAlert(DeviceAlert alert) {
    _alerts.insert(0, alert);
    if (_alerts.length > 50) {
      _alerts = _alerts.sublist(0, 50);
    }
    notifyListeners();
  }

  void acknowledgeAlert(String alertId) {
    final index = _alerts.indexWhere((a) => a.id == alertId);
    if (index >= 0) {
      _alerts[index] = DeviceAlert(
        id: _alerts[index].id, type: _alerts[index].type,
        message: _alerts[index].message, timestamp: _alerts[index].timestamp,
        severity: _alerts[index].severity, acknowledged: true,
      );
      notifyListeners();
    }
  }

  void acknowledgeAllAlerts() {
    _alerts = _alerts.map((a) => DeviceAlert(
      id: a.id, type: a.type, message: a.message,
      timestamp: a.timestamp, severity: a.severity, acknowledged: true,
    )).toList();
    notifyListeners();
  }

  void addScheduledCommand(ScheduledCommand command) {
    _scheduledCommands.add(command);
    notifyListeners();
  }

  void removeScheduledCommand(String id) {
    _scheduledCommands.removeWhere((s) => s.id == id);
    notifyListeners();
  }

  void toggleScheduledCommand(String id, bool enabled) {
    final index = _scheduledCommands.indexWhere((s) => s.id == id);
    if (index >= 0) {
      _scheduledCommands[index].enabled = enabled;
      notifyListeners();
    }
  }

  void addDeviceGroup(DeviceGroup group) {
    _groups.add(group);
    notifyListeners();
  }

  void removeDeviceGroup(String groupId) {
    _groups.removeWhere((g) => g.id == groupId);
    notifyListeners();
  }

  void addDeviceLog(String log) {
    _deviceLogs.insert(0, '[${DateTime.now().toIso8601String()}] $log');
    if (_deviceLogs.length > 200) {
      _deviceLogs = _deviceLogs.sublist(0, 200);
    }
    notifyListeners();
  }

  void clearLogs() {
    _deviceLogs.clear();
    notifyListeners();
  }

  void setMqttStatus(String status) {
    _mqttConnectionStatus = status;
    notifyListeners();
  }

  void setWebrtcSignalingState(String state) {
    _webrtcSignalingState = state;
    notifyListeners();
  }

  void assignDeviceToGroup(String deviceId, String groupId) {
    final device = _devices.firstWhere((d) => d.id == deviceId);
    final index = _devices.indexOf(device);
    _devices[index] = Device(
      id: device.id, name: device.name, status: device.status,
      batteryLevel: device.batteryLevel, lastOnline: device.lastOnline,
      isConnected: device.isConnected, firmwareVersion: device.firmwareVersion,
      networkInfo: device.networkInfo, storageInfo: device.storageInfo,
      cameraEnabled: device.cameraEnabled, micEnabled: device.micEnabled,
      location: device.location, groupId: groupId,
    );
    if (_currentDevice?.id == deviceId) _currentDevice = _devices[index];
    notifyListeners();
  }

  void syncDeviceSettings(String deviceId, Map<String, dynamic> settings) {
    addCommand(DeviceCommand(
      id: 'sync_${DateTime.now().millisecondsSinceEpoch}',
      command: 'sync_settings',
      timestamp: DateTime.now(),
      status: 'sent',
      params: settings,
    ));
  }

  void fetchDeviceLogs(String deviceId) {
    addDeviceLog('Fetching logs for device $deviceId...');
    addDeviceLog('System: OK, Uptime: 72h, Temp: 38°C');
    addDeviceLog('WiFi: Connected, Signal: 85%');
    addDeviceLog('Camera: Active, Stream: 1080p@30fps');
    addDeviceLog('Audio: OK, Mic Level: 65%');
    addDeviceLog('Battery: 85%, Charging: No');
    addDeviceLog('Storage: 12GB / 32GB used');
    addDeviceLog('Last error: None');
  }
}
