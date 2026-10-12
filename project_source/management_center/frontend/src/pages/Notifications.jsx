import React, { useState, useEffect } from 'react';

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

const notificationTypes = [
  { key: 'system', label: 'System', icon: '\u2699\uFE0F', color: COLORS.info },
  { key: 'alert', label: 'Alert', icon: '\u26A0\uFE0F', color: COLORS.danger },
  { key: 'info', label: 'Info', icon: '\u2139\uFE0F', color: COLORS.primary },
  { key: 'success', label: 'Success', icon: '\u2705', color: COLORS.success },
  { key: 'achievement', label: 'Achievement', icon: '\uD83C\uDFC6', color: '#d97706' },
  { key: 'reminder', label: 'Reminder', icon: '\u23F0', color: '#7c3aed' },
];

const templates = [
  { id: 1, name: 'Weekly Progress Report', type: 'info', message: 'Your child completed {sessions} sessions with {score}% average this week.', category: 'learning' },
  { id: 2, name: 'Low Battery Alert', type: 'alert', message: 'Device {device_name} battery is critically low at {battery}%.', category: 'device' },
  { id: 3, name: 'Achievement Unlocked', type: 'achievement', message: 'Congratulations! {child} unlocked the "{achievement}" achievement!', category: 'learning' },
  { id: 4, name: 'New Content Available', type: 'info', message: 'New {subject} lessons are now available for {child}.', category: 'content' },
  { id: 5, name: 'Session Reminder', type: 'reminder', message: 'Reminder: {child} has a {subject} session scheduled in 30 minutes.', category: 'learning' },
];

const sampleSentHistory = [
  { id: 1, type: 'info', title: 'New Content Added', message: '36 new lessons added to Nature & Science.', audience: 'All Parents', sent: '2026-05-26 09:00', sentCount: 45, opens: 32, clicks: 18, status: 'sent' },
  { id: 2, type: 'alert', title: 'Low Battery Alert', message: 'RoboBuddy Gamma battery critically low.', audience: 'Sarah Wilson', sent: '2026-05-26 07:15', sentCount: 1, opens: 1, clicks: 1, status: 'sent' },
  { id: 3, type: 'success', title: 'Weekly Report Ready', message: 'Weekly report for May 19-25 is available.', audience: 'All Users', sent: '2026-05-25 08:00', sentCount: 187, opens: 142, clicks: 89, status: 'sent' },
  { id: 4, type: 'system', title: 'Firmware Update', message: 'New firmware v2.2.0 available for Pro-X.', audience: 'Admin', sent: '2026-05-24 14:00', sentCount: 3, opens: 3, clicks: 3, status: 'sent' },
  { id: 5, type: 'reminder', title: 'Session Reminder', message: 'Emma has Mathematics in 30 minutes.', audience: 'Emma', sent: '2026-05-23 08:30', sentCount: 1, opens: 0, clicks: 0, status: 'scheduled' },
];

const initialNotifications = [
  { id: 1, type: 'system', title: 'Firmware Update Available', message: 'New firmware v2.2.0 is available for Pro-X models. 3 devices pending update.', time: '1 hour ago', read: false },
  { id: 2, type: 'alert', title: 'Low Battery Alert', message: 'RoboBuddy Gamma (RB-1234) battery is critically low at 12%.', time: '2 hours ago', read: false },
  { id: 3, type: 'info', title: 'New Content Added', message: '36 new lessons added to the Nature & Science curriculum.', time: '5 hours ago', read: false },
  { id: 4, type: 'success', title: 'Session Completed', message: 'Emma completed Mathematics: Advanced Addition with 95% score.', time: '6 hours ago', read: false },
  { id: 5, type: 'system', title: 'Device Registration', message: 'New robot RB-9987 registered and assigned to Lucas.', time: '1 day ago', read: true },
  { id: 6, type: 'alert', title: 'Connectivity Issue', message: 'RoboBuddy Delta (RB-5678) experienced 3 disconnects in the last hour.', time: '1 day ago', read: true },
  { id: 7, type: 'info', title: 'Achievement Unlocked', message: 'Sophia unlocked the "Learning Star" achievement - 10 lessons completed!', time: '2 days ago', read: true },
  { id: 8, type: 'success', title: 'Weekly Report Ready', message: 'Weekly learning report for May 19-25 is now available for review.', time: '2 days ago', read: true },
];

const NotificationForm = ({ onClose, onSend }) => {
  const [form, setForm] = useState({ type: 'info', title: '', message: '', audience: 'all', targetUser: '', scheduleType: 'now', scheduleTime: '' });
  const [useTemplate, setUseTemplate] = useState('');

  const loadTemplate = (id) => {
    const t = templates.find(t => t.id === parseInt(id));
    if (t) { setForm({ ...form, type: t.type, message: t.message, title: t.name }); }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 520, maxHeight: '85vh', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Create Notification</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Use Template</label>
          <select style={inputStyle} value={useTemplate} onChange={e => { setUseTemplate(e.target.value); if (e.target.value) loadTemplate(e.target.value); }}>
            <option value="">-- Select Template --</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {notificationTypes.map(t => (
                <span key={t.key} onClick={() => setForm({ ...form, type: t.key })}
                  style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    background: form.type === t.key ? t.color + '20' : '#f3f4f6',
                    border: '1px solid ' + (form.type === t.key ? t.color : '#e5e7eb'),
                    color: form.type === t.key ? t.color : '#6b7280',
                  }}>{t.icon} {t.label}</span>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notification title" />
          </div>
          <div>
            <label style={labelStyle}>Message *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Notification message" />
          </div>
          <div>
            <label style={labelStyle}>Target Audience</label>
            <select style={inputStyle} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
              <option value="all">All Users</option>
              <option value="parents">All Parents</option>
              <option value="children">All Children</option>
              <option value="admins">All Admins</option>
              <option value="group">Specific Group</option>
              <option value="user">Specific User</option>
            </select>
            {form.audience === 'user' && (
              <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Enter username or email" value={form.targetUser} onChange={e => setForm({ ...form, targetUser: e.target.value })} />
            )}
          </div>
          <div>
            <label style={labelStyle}>Schedule</label>
            <select style={inputStyle} value={form.scheduleType} onChange={e => setForm({ ...form, scheduleType: e.target.value })}>
              <option value="now">Send Now</option>
              <option value="scheduled">Schedule for Later</option>
            </select>
            {form.scheduleType === 'scheduled' && (
              <input type="datetime-local" style={{ ...inputStyle, marginTop: 8 }} value={form.scheduleTime} onChange={e => setForm({ ...form, scheduleTime: e.target.value })} />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          <button onClick={() => onSend(form)} style={btnStyle()}>Send Notification</button>
        </div>
      </div>
    </div>
  );
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [sentHistory, setSentHistory] = useState(sampleSentHistory);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [typeFilter, setTypeFilter] = useState('All');

  const colors = { system: '#0891b2', alert: '#dc2626', info: '#4f46e5', success: '#059669', achievement: '#d97706', reminder: '#7c3aed' };
  const icons = { system: '\u2699\uFE0F', alert: '\u26A0\uFE0F', info: '\u2139\uFE0F', success: '\u2705', achievement: '\uD83C\uDFC6', reminder: '\u23F0' };

  const unread = notifications.filter(n => !n.read).length;

  const handleSend = (form) => {
    const newNotif = {
      id: Date.now(), type: form.type, title: form.title, message: form.message,
      time: 'just now', read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    setSentHistory(prev => [{
      id: Date.now(), type: form.type, title: form.title, message: form.message,
      audience: form.audience, sent: new Date().toLocaleString(), sentCount: form.audience === 'user' ? 1 : 187,
      opens: 0, clicks: 0, status: form.scheduleType === 'now' ? 'sent' : 'scheduled',
    }, ...prev]);
    setShowForm(false);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = typeFilter === 'All' ? notifications : notifications.filter(n => n.type === typeFilter);

  const tabs = [
    { key: 'inbox', label: 'Inbox (' + unread + ')' },
    { key: 'create', label: 'Create' },
    { key: 'sent', label: 'Sent History' },
    { key: 'templates', label: 'Templates' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Push Config' },
  ];

  const tabStyle = (active) => ({
    padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
    fontWeight: active ? 600 : 400, color: active ? COLORS.primary : '#6b7280',
    borderBottom: active ? '2px solid ' + COLORS.primary : '2px solid transparent',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Notifications</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
            {unread} unread | {sentHistory.length} sent
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowForm(true)} style={btnStyle()}>+ New Notification</button>
          <button onClick={markAllRead} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Mark All Read</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb', overflow: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(activeTab === t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'inbox' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span onClick={() => setTypeFilter('All')} style={{
              padding: '4px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 500,
              background: typeFilter === 'All' ? COLORS.primary : '#f3f4f6', color: typeFilter === 'All' ? '#fff' : '#374151',
            }}>All</span>
            {notificationTypes.map(t => (
              <span key={t.key} onClick={() => setTypeFilter(t.key)} style={{
                padding: '4px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                background: typeFilter === t.key ? t.color + '20' : '#f3f4f6',
                color: typeFilter === t.key ? t.color : '#374151',
              }}>{t.icon} {t.label}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(n => (
              <div key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{
                background: n.read ? '#fff' : '#eef2ff', borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid', borderColor: n.read ? '#f0f0f0' : '#c7d2fe',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 18 }}>{icons[n.type] || '\u2139\uFE0F'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>{n.message}</div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[n.type] || '#6b7280', flexShrink: 0, marginTop: 6, opacity: n.read ? 0.3 : 1 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Quick Create</h3>
          <NotificationForm onClose={() => {}} onSend={handleSend} />
        </div>
      )}

      {activeTab === 'sent' && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Type</th><th style={{ padding: '10px 12px' }}>Title</th>
              <th style={{ padding: '10px 12px' }}>Audience</th><th style={{ padding: '10px 12px' }}>Sent</th>
              <th style={{ padding: '10px 12px' }}>Sent/Opens/Clicks</th><th style={{ padding: '10px 12px' }}>Status</th>
            </tr></thead>
            <tbody>
              {sentHistory.map(n => (
                <tr key={n.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 14 }}>{icons[n.type]}</span></td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{n.title}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{n.audience}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{n.sent}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: COLORS.primary, fontWeight: 600 }}>{n.sentCount}</span>
                    <span style={{ color: '#9ca3af' }}> / </span>
                    <span style={{ color: COLORS.success, fontWeight: 600 }}>{n.opens}</span>
                    <span style={{ color: '#9ca3af' }}> / </span>
                    <span style={{ color: COLORS.info, fontWeight: 600 }}>{n.clicks}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: n.status === 'sent' ? COLORS.success : COLORS.warning, fontWeight: 500 }}>{n.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: colors[t.type] + '20', color: colors[t.type], borderRadius: 8, fontSize: 10, fontWeight: 600 }}>{t.type}</span>
                </div>
                <button onClick={() => { setShowForm(true); }} style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Use</button>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t.message}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Category: {t.category}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Notification Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary }}>{sentHistory.length}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Total Sent</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.success }}>68%</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Open Rate</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.info }}>42%</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Click Rate</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.warning }}>{notificationTypes.reduce((max, t) => sentHistory.filter(n => n.type === t.key).length > max.count ? { type: t.key, count: sentHistory.filter(n => n.type === t.key).length } : max, { type: '', count: 0 }).type}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Most Used Type</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, marginBottom: 8 }}>Open Rate by Type</h4>
            <div style={{ display: 'flex', gap: 6, height: 100, alignItems: 'flex-end' }}>
              {notificationTypes.map(t => {
                const count = sentHistory.filter(n => n.type === t.key).length;
                const opens = sentHistory.filter(n => n.type === t.key).reduce((s, n) => s + n.opens, 0);
                const rate = count > 0 ? Math.round(opens / count) : 0;
                return (
                  <div key={t.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, marginBottom: 2 }}>{rate}%</div>
                    <div style={{ width: '100%', background: t.color, borderRadius: '4px 4px 0 0', height: rate + 'px', minHeight: 4, maxHeight: 100 }} />
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{t.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Push Notification Configuration</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={labelStyle}>Platform</label>
              <select style={inputStyle}><option value="all">All Platforms</option><option value="ios">iOS</option><option value="android">Android</option><option value="web">Web</option></select>
            </div>
            <div>
              <label style={labelStyle}>Default Sound</label>
              <select style={inputStyle}><option>Default</option><option>Chime</option><option>Alert</option><option>None</option></select>
            </div>
            <div>
              <label style={labelStyle}>Badge Count</label>
              <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />Show unread badge
            </div>
            <div>
              <label style={labelStyle}>Quiet Hours</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="time" defaultValue="22:00" style={inputStyle} />
                <span style={{ alignSelf: 'center', color: '#6b7280' }}>to</span>
                <input type="time" defaultValue="07:00" style={inputStyle} />
              </div>
            </div>
            <button style={{ ...btnStyle(), alignSelf: 'flex-start' }}>Save Configuration</button>
          </div>
        </div>
      )}

      {showForm && <NotificationForm onClose={() => setShowForm(false)} onSend={handleSend} />}
    </div>
  );
}
