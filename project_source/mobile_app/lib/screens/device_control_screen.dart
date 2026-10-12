import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/device_provider.dart';

class DeviceControlScreen extends StatelessWidget {
  const DeviceControlScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Control'),
        centerTitle: true,
      ),
      body: Consumer<DeviceProvider>(
        builder: (context, provider, child) {
          if (provider.currentDevice == null) {
            return const Center(child: Text('No device selected'));
          }

          final device = provider.currentDevice!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                DeviceHeader(device: device),
                const SizedBox(height: 24),
                const ControlSection(),
                const SizedBox(height: 24),
                const ModeSelector(),
                const SizedBox(height: 24),
                const AdvancedControls(),
              ],
            ),
          );
        },
      ),
    );
  }
}

class DeviceHeader extends StatelessWidget {
  final Device device;

  const DeviceHeader({super.key, required this.device});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            const Icon(Icons.robot, size: 64),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    device.name,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: device.status == 'online' 
                            ? Colors.green 
                            : Colors.grey,
                        radius: 8,
                      ),
                      const SizedBox(width: 8),
                      Text(device.status == 'online' ? 'Online' : 'Offline'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Battery: ${device.batteryLevel}%'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ControlSection extends StatelessWidget {
  const ControlSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Basic Controls',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ControlButton(
                    icon: Icons.power_settings_new,
                    label: 'Power',
                    color: Colors.red,
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Powering off...')),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ControlButton(
                    icon: Icons.restart_alt,
                    label: 'Restart',
                    color: Colors.orange,
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Restarting...')),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ControlButton(
                    icon: Icons.volume_up,
                    label: 'Volume',
                    color: Colors.blue,
                    onTap: () => _showVolumeDialog(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ControlButton(
                    icon: Icons.sunny,
                    label: 'Brightness',
                    color: Colors.yellow,
                    onTap: () => _showBrightnessDialog(context),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ControlButton(
                    icon: Icons.camera_alt,
                    label: 'Camera',
                    color: Colors.purple,
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening camera...')),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ControlButton(
                    icon: Icons.mic,
                    label: 'Microphone',
                    color: Colors.green,
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Microphone toggled')),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showVolumeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Volume Control'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Adjust volume level'),
            SizedBox(height: 16),
            Slider(value: 0.7, onChanged: (v) {}, min: 0, max: 1),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showBrightnessDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Brightness Control'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Adjust screen brightness'),
            SizedBox(height: 16),
            Slider(value: 0.7, onChanged: (v) {}, min: 0, max: 1),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const ControlButton({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class ModeSelector extends StatelessWidget {
  const ModeSelector({super.key});

  final List<Map<String, dynamic>> modes = [
    {'name': 'Learning', 'icon': Icons.book, 'color': Colors.blue},
    {'name': 'Entertainment', 'icon': Icons.gamepad, 'color': Colors.purple},
    {'name': 'Rest', 'icon': Icons.bed, 'color': Colors.green},
  ];

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Mode Selection',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: modes.map((mode) {
                return Expanded(
                  child: ModeButton(
                    icon: mode['icon'],
                    label: mode['name'],
                    color: mode['color'],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class ModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const ModeButton({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Switching to $label mode...')),
      ),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class AdvancedControls extends StatelessWidget {
  const AdvancedControls({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Advanced Controls',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.monitor),
              title: const Text('Remote Monitoring'),
              subtitle: const Text('View camera feed'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening remote monitor...')),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.update),
              title: const Text('Check for Updates'),
              subtitle: const Text('System version 1.0.0'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Checking for updates...')),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.file_copy),
              title: const Text('View Logs'),
              subtitle: const Text('System and activity logs'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening logs...')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}