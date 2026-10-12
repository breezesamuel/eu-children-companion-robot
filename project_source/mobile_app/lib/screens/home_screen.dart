import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_provider.dart';
import '../providers/device_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Robot Companion'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'My Devices',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Consumer<DeviceProvider>(
              builder: (context, provider, child) {
                if (provider.devices.isEmpty) {
                  return const Center(child: Text('No devices found'));
                }
                
                return GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: provider.devices.length,
                  itemBuilder: (context, index) {
                    final device = provider.devices[index];
                    return DeviceCard(device: device);
                  },
                );
              },
            ),
            const SizedBox(height: 24),
            const Text(
              'Quick Actions',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const QuickActions(),
            const SizedBox(height: 24),
            const Text(
              'Recent Activities',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const ActivityList(),
          ],
        ),
      ),
    );
  }
}

class DeviceCard extends StatelessWidget {
  final Device device;

  const DeviceCard({super.key, required this.device});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Icon(Icons.robot, size: 40),
                CircleAvatar(
                  backgroundColor: device.status == 'online' 
                      ? Colors.green 
                      : Colors.grey,
                  radius: 8,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              device.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              device.status == 'online' ? 'Online' : 'Offline',
              style: TextStyle(
                color: device.status == 'online' ? Colors.green : Colors.grey,
              ),
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: device.batteryLevel / 100,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                device.batteryLevel > 30 ? Colors.green : Colors.red,
              ),
            ),
            const SizedBox(height: 4),
            Text('${device.batteryLevel}% battery'),
          ],
        ),
      ),
    );
  }
}

class QuickActions extends StatelessWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ActionButton(
            icon: Icons.play_arrow,
            label: 'Wake',
            color: Colors.blue,
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Waking robot...')),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ActionButton(
            icon: Icons.stop,
            label: 'Stop',
            color: Colors.red,
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Stopping robot...')),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ActionButton(
            icon: Icons.settings,
            label: 'Settings',
            color: Colors.orange,
            onTap: () => Provider.of<AppProvider>(context, listen: false)
                .setCurrentIndex(4),
          ),
        ),
      ],
    );
  }
}

class ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const ActionButton({
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

class ActivityList extends StatelessWidget {
  const ActivityList({super.key});

  final List<Map<String, String>> activities = [
    {'icon': 'story', 'title': 'Story Time', 'time': '10 min ago'},
    {'icon': 'math', 'title': 'Math Practice', 'time': '30 min ago'},
    {'icon': 'music', 'title': 'Music Session', 'time': '1 hour ago'},
    {'icon': 'game', 'title': 'Interactive Game', 'time': '2 hours ago'},
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      itemCount: activities.length,
      itemBuilder: (context, index) {
        final activity = activities[index];
        return ListTile(
          leading: const Icon(Icons.play_circle_outline),
          title: Text(activity['title']!),
          subtitle: Text(activity['time']!),
          trailing: const Icon(Icons.arrow_forward_ios),
        );
      },
    );
  }
}