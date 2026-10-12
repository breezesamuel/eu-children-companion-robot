import React, { useState } from 'react';

const COLORS = { primary: '#4f46e5', success: '#059669', warning: '#d97706', danger: '#dc2626', info: '#0891b2' };

const style = document.createElement('style');
style.textContent = [
  '@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
  '@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }',
].join('\n');
document.head.appendChild(style);

const inputStyle = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };
const btnStyle = (bg) => ({ padding: '8px 16px', border: 'none', borderRadius: 6, background: bg || COLORS.primary, color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 12 });

const initialForm = {
  language: 'en', logLevel: 'info', maintenanceMode: false, sessionTimeout: '30', maxLoginAttempts: '5',
  apiRateLimit: '100', maxDevicesPerChild: '3', autoUpdates: true, retentionDays: '90',
  backupEnabled: true, backupTime: '02:00', notificationEmail: 'admin@robotcare.local',
  passwordMinLength: '8', passwordRequireSymbols: true, mfaEnabled: false, mfaMethod: 'email',
};

const featureFlags = [
  { key: 'new_dashboard', name: 'New Dashboard UI', enabled: true },
  { key: 'advanced_analytics', name: 'Advanced Analytics', enabled: true },
  { key: 'learning_recommendations', name: 'AI Learning Recommendations', enabled: false },
  { key: 'parent_portal', name: 'Parent Portal', enabled: true },
  { key: 'device_telemetry', name: 'Real-time Device Telemetry', enabled: true },
  { key: 'bulk_operations', name: 'Bulk Operations', enabled: true },
  { key: 'report_scheduling', name: 'Report Scheduling', enabled: false },
  { key: 'push_notifications', name: 'Push Notifications', enabled: true },
];

const apiKeys = [
  { id: 1, name: 'Production API Key', key: 'sk-prod-a1b2c3d4e5f6...', created: '2026-01-15', lastUsed: '2026-05-26', status: 'active' },
  { id: 2, name: 'Development Key', key: 'sk-dev-9x8y7z6w5v4u...', created: '2026-03-20', lastUsed: '2026-05-25', status: 'active' },
  { id: 3, name: 'Integration Key', key: 'sk-int-1q2w3e4r5t6y...', created: '2026-04-10', lastUsed: '2026-05-20', status: 'revoked' },
];

const auditLog = [
  { id: 1, user: 'Dr. Chen', action: 'Changed session timeout to 30 min', time: '2026-05-26 11:00', category: 'Security' },
  { id: 2, user: 'Admin User', action: 'Updated backup schedule to 02:00', time: '2026-05-25 09:30', category: 'Data & Backup' },
  { id: 3, user: 'Dr. Chen', action: 'Enabled MFA for admin accounts', time: '2026-05-24 14:15', category: 'Security' },
  { id: 4, user: 'System', action: 'Auto-backup completed successfully', time: '2026-05-26 02:00', category: 'System' },
  { id: 5, user: 'Admin User', action: 'Created new API key: Integration Key', time: '2026-04-10 16:00', category: 'API' },
  { id: 6, user: 'Dr. Chen', action: 'Revoked API key: Integration Key', time: '2026-05-20 10:00', category: 'API' },
];

const envInfo = {
  nodeVersion: 'v20.11.0', dbStatus: 'Connected', uptime: '14d 6h 32m', apiVersion: 'v2.1.0',
  platform: 'Windows Server 2022', memoryUsage: '45%', storageUsed: '78%', lastBackup: '2026-05-26 02:00',
};

const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? COLORS.primary : '#d1d5db', padding: 2, cursor: 'pointer', transition: 'background .2s', display: 'inline-block' }}>
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', marginLeft: value ? 20 : 0, transition: 'margin .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 14, color: '#374151', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>{title}</h3>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 12 }}>
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</div>}
    </div>
    {children}
  </div>
);

export default function SystemSettings() {
  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [flags, setFlags] = useState(featureFlags);
  const [keys, setKeys] = useState(apiKeys);
  const [showAudit, setShowAudit] = useState(false);
  const [showEnvInfo, setShowEnvInfo] = useState(false);

  const handleChange = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setSaved(false); };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const handleFlagToggle = (key) => { setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f)); };

  const handleGenerateKey = () => {
    const name = prompt('Enter API key name:');
    if (name) {
      const newKey = { id: Date.now(), name, key: 'sk-' + Math.random().toString(36).substr(2, 20) + '...', created: new Date().toISOString().split('T')[0], lastUsed: 'Never', status: 'active' };
      setKeys(prev => [newKey, ...prev]);
    }
  };

  const handleRevokeKey = (id) => { setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k)); };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ settings: form, featureFlags: flags }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'settings-backup-' + new Date().toISOString().split('T')[0] + '.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.settings) setForm(data.settings);
        if (data.featureFlags) setFlags(data.featureFlags);
        alert('Settings imported successfully');
      } catch { alert('Invalid settings file'); }
    };
    input.click();
  };

  const handleReset = (section) => {
    if (confirm('Reset all settings in this section to defaults?')) {
      setForm(initialForm);
    }
  };

  const clearCache = () => {
    if (confirm('Clear all cached data? This will refresh all data on next load.')) {
      alert('Cache cleared');
    }
  };

  const categories = [
    { key: 'general', label: 'General', icon: '\u2699\uFE0F' },
    { key: 'security', label: 'Security', icon: '\uD83D\uDD12' },
    { key: 'email', label: 'Email & Notifications', icon: '\u2709\uFE0F' },
    { key: 'content', label: 'Content', icon: '\uD83D\uDCDA' },
    { key: 'api', label: 'API & Rate Limits', icon: '\uD83D\uDD17' },
    { key: 'data', label: 'Data & Backup', icon: '\uD83D\uDCBE' },
    { key: 'maintenance', label: 'Maintenance', icon: '\uD83D\uDD27' },
  ];

  const catStyle = (active) => ({
    display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
    background: active ? '#eef2ff' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? COLORS.primary : '#374151', borderLeft: active ? '3px solid ' + COLORS.primary : '3px solid transparent',
  });

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>System Settings</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Configure system parameters and preferences</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
            background: showAdvanced ? COLORS.primary : '#fff', color: showAdvanced ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12,
          }}>{showAdvanced ? 'Basic Mode' : 'Advanced Mode'}</button>
          <button onClick={handleExport} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Export</button>
          <button onClick={handleImport} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Import</button>
          <button onClick={handleSave} style={{
            padding: '8px 24px', border: 'none', borderRadius: 8, background: saved ? '#059669' : COLORS.primary,
            color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all .2s',
          }}>{saved ? 'Saved!' : 'Save Changes'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {categories.map(c => (
              <button key={c.key} onClick={() => setActiveCategory(c.key)} style={catStyle(activeCategory === c.key)}>
                <span style={{ marginRight: 8 }}>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowAudit(!showAudit)} style={catStyle(false)}>
              <span style={{ marginRight: 8 }}>📋</span>Audit Log
            </button>
            <button onClick={() => setShowEnvInfo(!showEnvInfo)} style={catStyle(false)}>
              <span style={{ marginRight: 8 }}>🖥</span>Environment
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {showAudit && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Change History / Audit Log</h3>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {auditLog.map(a => (
                  <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{a.action}</span>
                      <span style={{ padding: '2px 6px', background: COLORS.primary + '15', color: COLORS.primary, borderRadius: 4, fontSize: 10 }}>{a.category}</span>
                    </div>
                    <div style={{ color: '#6b7280', marginTop: 2 }}>by {a.user} · {a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showEnvInfo && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Environment Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {Object.entries(envInfo).map(([key, val]) => (
                  <div key={key} style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {activeCategory === 'general' && (
              <Section title="General Settings">
                <Field label="Language" hint="Default interface language">
                  <select value={form.language} onChange={e => handleChange('language', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 180 }}>
                    <option value="en">English</option><option value="zh">中文</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="nl">Nederlands</option>
                  </select>
                </Field>
                <Field label="Log Level" hint="Minimum log severity">
                  <select value={form.logLevel} onChange={e => handleChange('logLevel', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 180 }}>
                    <option value="debug">Debug</option><option value="info">Info</option><option value="warn">Warning</option><option value="error">Error</option>
                  </select>
                </Field>
                <Field label="Maintenance Mode" hint="Disable non-admin access">
                  <Toggle value={form.maintenanceMode} onChange={v => handleChange('maintenanceMode', v)} />
                </Field>
                {showAdvanced && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                    <button onClick={() => handleReset('general')} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: COLORS.danger }}>Reset Section</button>
                  </div>
                )}
              </Section>
            )}

            {activeCategory === 'security' && (
              <Section title="Security Settings">
                <Field label="Session Timeout" hint="Minutes before auto-logout">
                  <input type="number" value={form.sessionTimeout} onChange={e => handleChange('sessionTimeout', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Max Login Attempts" hint="Before temporary lockout">
                  <input type="number" value={form.maxLoginAttempts} onChange={e => handleChange('maxLoginAttempts', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Min Password Length" hint="Minimum characters">
                  <input type="number" value={form.passwordMinLength} onChange={e => handleChange('passwordMinLength', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Require Symbols" hint="Special characters in passwords">
                  <Toggle value={form.passwordRequireSymbols} onChange={v => handleChange('passwordRequireSymbols', v)} />
                </Field>
                <Field label="Multi-Factor Auth" hint="Extra security layer">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Toggle value={form.mfaEnabled} onChange={v => handleChange('mfaEnabled', v)} />
                    {form.mfaEnabled && (
                      <select value={form.mfaMethod} onChange={e => handleChange('mfaMethod', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                        <option value="email">Email</option><option value="sms">SMS</option><option value="app">Authenticator App</option>
                      </select>
                    )}
                  </div>
                </Field>
                {showAdvanced && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                    <button onClick={() => handleReset('security')} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: COLORS.danger }}>Reset Section</button>
                  </div>
                )}
              </Section>
            )}

            {activeCategory === 'email' && (
              <Section title="Email & Notifications">
                <Field label="Notification Email" hint="Alerts recipient">
                  <input type="email" value={form.notificationEmail} onChange={e => handleChange('notificationEmail', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 250 }} />
                </Field>
                <Field label="Email Delivery" hint="SMTP server status">
                  <span style={{ fontSize: 13, color: COLORS.success }}>Configured (smtp.robotcare.local)</span>
                </Field>
                <button style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Send Test Email</button>
              </Section>
            )}

            {activeCategory === 'content' && (
              <Section title="Content Settings">
                <Field label="Default Content Level" hint="When creating new content">
                  <select style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option>Beginner</option><option>Elementary</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </Field>
                <Field label="Auto-Archive" hint="Archive content after days">
                  <input type="number" defaultValue="180" style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
              </Section>
            )}

            {activeCategory === 'api' && (
              <Section title="API & Rate Limits">
                <Field label="API Rate Limit" hint="Requests per minute per IP">
                  <input type="number" value={form.apiRateLimit} onChange={e => handleChange('apiRateLimit', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Max Devices / Child" hint="Hard limit">
                  <input type="number" value={form.maxDevicesPerChild} onChange={e => handleChange('maxDevicesPerChild', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Auto Updates" hint="Push firmware automatically">
                  <Toggle value={form.autoUpdates} onChange={v => handleChange('autoUpdates', v)} />
                </Field>
                {showAdvanced && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>API Key Management</h4>
                    <button onClick={handleGenerateKey} style={{ ...btnStyle(), marginBottom: 8 }}>Generate New Key</button>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Name</th><th style={{ padding: '6px 8px' }}>Key</th>
                        <th style={{ padding: '6px 8px' }}>Created</th><th style={{ padding: '6px 8px' }}>Status</th><th style={{ padding: '6px 8px' }}>Action</th>
                      </tr></thead>
                      <tbody>
                        {keys.map(k => (
                          <tr key={k.id} style={{ borderTop: '1px solid #eee' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{k.name}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#6b7280' }}>{k.key}</td>
                            <td style={{ padding: '6px 8px', color: '#6b7280' }}>{k.created}</td>
                            <td style={{ padding: '6px 8px' }}><span style={{ color: k.status === 'active' ? COLORS.success : COLORS.danger }}>{k.status}</span></td>
                            <td style={{ padding: '6px 8px' }}>
                              {k.status === 'active' && <button onClick={() => handleRevokeKey(k.id)} style={{ padding: '3px 8px', border: '1px solid #fca5a5', borderRadius: 4, background: '#fef2f2', cursor: 'pointer', fontSize: 10, color: COLORS.danger }}>Revoke</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {activeCategory === 'data' && (
              <Section title="Data & Backup">
                <Field label="Data Retention" hint="Days before purging old logs">
                  <input type="number" value={form.retentionDays} onChange={e => handleChange('retentionDays', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 100 }} />
                </Field>
                <Field label="Automatic Backup" hint="Daily database backup">
                  <Toggle value={form.backupEnabled} onChange={v => handleChange('backupEnabled', v)} />
                </Field>
                <Field label="Backup Time" hint="24-hour format">
                  <input type="time" value={form.backupTime} onChange={e => handleChange('backupTime', e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </Field>
                {showAdvanced && (
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => alert('Backup initiated')} style={btnStyle(COLORS.info)}>Run Backup Now</button>
                    <button onClick={() => alert('Restore dialog would open')} style={{ marginLeft: 8, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Restore from Backup</button>
                  </div>
                )}
              </Section>
            )}

            {activeCategory === 'maintenance' && (
              <Section title="Maintenance">
                <Field label="Cache Management" hint="Clear application cache">
                  <button onClick={clearCache} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Clear Cache</button>
                </Field>
                <Field label="Backup / Restore" hint="Full system backup">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleExport} style={btnStyle()}>Export Settings</button>
                    <button onClick={handleImport} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Import Settings</button>
                  </div>
                </Field>
                {showAdvanced && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>Feature Flags</h4>
                    {flags.map(f => (
                      <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div>
                          <div style={{ fontSize: 13 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{f.key}</div>
                        </div>
                        <Toggle value={f.enabled} onChange={() => handleFlagToggle(f.key)} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
