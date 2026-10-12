import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';
import '../providers/app_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const UserSection(),
            const SizedBox(height: 24),
            const AccountSection(),
            const SizedBox(height: 24),
            const AppSettings(),
            const SizedBox(height: 24),
            const PrivacySection(),
            const SizedBox(height: 24),
            const AboutSection(),
          ],
        ),
      ),
    );
  }
}

class UserSection extends StatelessWidget {
  const UserSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, provider, child) {
        if (provider.currentUser == null) {
          return const SizedBox();
        }

        return Card(
          elevation: 4,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 32,
                  child: Icon(Icons.person, size: 32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        provider.currentUser!.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(provider.currentUser!.email),
                      const SizedBox(height: 4),
                      Text(
                        'Role: ${provider.currentUser!.role}',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios),
              ],
            ),
          ),
        );
      },
    );
  }
}

class AccountSection extends StatelessWidget {
  const AccountSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.family_restroom),
            title: const Text('Family Members'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening family members...')),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.notifications),
            title: const Text('Notifications'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening notifications...')),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.lock),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening password settings...')),
            ),
          ),
        ],
      ),
    );
  }
}

class AppSettings extends StatelessWidget {
  const AppSettings({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Column(
        children: [
          Consumer<AppProvider>(
            builder: (context, provider, child) {
              return ListTile(
                leading: const Icon(Icons.language),
                title: const Text('Language'),
                subtitle: Text(provider.currentLanguage.toUpperCase()),
                trailing: const Icon(Icons.arrow_forward_ios),
                onTap: () => _showLanguageDialog(context),
              );
            },
          ),
          const Divider(),
          Consumer<AppProvider>(
            builder: (context, provider, child) {
              return ListTile(
                leading: const Icon(Icons.dark_mode),
                title: const Text('Dark Mode'),
                trailing: Switch(
                  value: provider.isDarkMode,
                  onChanged: (value) => provider.toggleDarkMode(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Language'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _languageOption(context, 'English', 'en'),
            _languageOption(context, 'Deutsch', 'de'),
            _languageOption(context, 'Français', 'fr'),
            _languageOption(context, 'Nederlands', 'nl'),
            _languageOption(context, '中文', 'zh'),
          ],
        ),
      ),
    );
  }

  Widget _languageOption(BuildContext context, String label, String code) {
    return ListTile(
      title: Text(label),
      onTap: () {
        Provider.of<AppProvider>(context, listen: false).setLanguage(code);
        Navigator.pop(context);
      },
    );
  }
}

class PrivacySection extends StatelessWidget {
  const PrivacySection({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.privacy_tip),
            title: const Text('Privacy Settings'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening privacy settings...')),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.data_usage),
            title: const Text('Data Usage'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening data usage...')),
            ),
          ),
        ],
      ),
    );
  }
}

class AboutSection extends StatelessWidget {
  const AboutSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.info),
            title: const Text('About App'),
            subtitle: const Text('Version 1.0.0'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('About Robot Companion v1.0.0')),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.help),
            title: const Text('Help & Support'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening help center...')),
            ),
          ),
          const Divider(),
          Consumer<UserProvider>(
            builder: (context, provider, child) {
              return ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Logout'),
                textColor: Colors.red,
                onTap: () => provider.logout(),
              );
            },
          ),
        ],
      ),
    );
  }
}