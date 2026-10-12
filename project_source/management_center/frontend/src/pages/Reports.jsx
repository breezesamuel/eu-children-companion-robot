import React, { useState, useEffect, useMemo } from 'react';

const COLORS = { primary: '#4f46e5', success: '#059669', warning: '#d97706', danger: '#dc2626', info: '#0891b2' };

const style = document.createElement('style');
style.textContent = [
  '@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
  '@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }',
  '@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }',
].join('\n');
document.head.appendChild(style);

const inputStyle = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };
const btnStyle = (bg) => ({ padding: '8px 16px', border: 'none', borderRadius: 6, background: bg || COLORS.primary, color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 12 });

const reportTypes = [
  { key: 'learning_summary', label: 'Learning Summary', icon: '\uD83D\uDCDA', desc: 'Overall learning progress and scores' },
  { key: 'health', label: 'Health Report', icon: '\uD83C\uDFE5', desc: 'Device health and battery analytics' },
  { key: 'device', label: 'Device Report', icon: '\uD83E\uDD16', desc: 'Device usage and status overview' },
  { key: 'usage', label: 'Usage Report', icon: '\uD83D\uDCCA', desc: 'Platform usage metrics and trends' },
];

const childrenList = [
  { id: 1, name: 'Emma', group: 'Group A' },
  { id: 2, name: 'Liam', group: 'Group A' },
  { id: 3, name: 'Sophia', group: 'Group B' },
  { id: 4, name: 'Noah', group: 'Group B' },
  { id: 5, name: 'Mia', group: 'Group C' },
  { id: 6, name: 'Lucas', group: 'Group C' },
];

const sampleReportHistory = [
  { id: 1, type: 'learning_summary', child: 'Emma', date: '2026-05-26', format: 'PDF', status: 'generated', size: '2.3 MB' },
  { id: 2, type: 'learning_summary', child: 'Liam', date: '2026-05-25', format: 'CSV', status: 'generated', size: '1.8 MB' },
  { id: 3, type: 'health', child: 'All', date: '2026-05-24', format: 'PDF', status: 'generated', size: '3.1 MB' },
  { id: 4, type: 'device', child: 'All', date: '2026-05-23', format: 'PDF', status: 'generated', size: '4.2 MB' },
  { id: 5, type: 'usage', child: 'All', date: '2026-05-22', format: 'JSON', status: 'generated', size: '1.5 MB' },
  { id: 6, type: 'learning_summary', child: 'Sophia', date: '2026-05-21', format: 'PDF', status: 'scheduled', size: '-' },
];

const reportTemplates = [
  { id: 1, name: 'Weekly Learning Summary', type: 'learning_summary', schedule: 'weekly', recipients: ['parent@example.com'], lastUsed: '2026-05-26' },
  { id: 2, name: 'Monthly Device Health', type: 'health', schedule: 'monthly', recipients: ['admin@robotcare.local'], lastUsed: '2026-05-01' },
  { id: 3, name: 'Daily Usage Overview', type: 'usage', schedule: 'daily', recipients: ['admin@robotcare.local'], lastUsed: '2026-05-26' },
];

const GeneratedReportPreview = ({ type, child, dateRange }) => {
  const previewData = {
    learning_summary: {
      title: 'Learning Summary Report',
      metrics: { totalSessions: 24, avgScore: 87.5, completedLessons: 18, timeSpent: '12h 30m' },
      details: [
        { subject: 'Mathematics', sessions: 8, avgScore: 92, trend: '+5%' },
        { subject: 'English', sessions: 6, avgScore: 85, trend: '+2%' },
        { subject: 'Science', sessions: 5, avgScore: 88, trend: '+8%' },
        { subject: 'Art & Music', sessions: 3, avgScore: 78, trend: '-3%' },
      ],
    },
    health: {
      title: 'Health Report',
      metrics: { totalDevices: 7, onlineDevices: 5, avgBattery: 72, alertsResolved: 3 },
      details: [
        { device: 'RB-1234', battery: 87, temp: 38.2, status: 'healthy' },
        { device: 'RB-5678', battery: 45, temp: 36.8, status: 'healthy' },
        { device: 'RB-3456', battery: 12, temp: 34.1, status: 'warning' },
      ],
    },
    device: {
      title: 'Device Report',
      metrics: { activeDevices: 5, offlineDevices: 2, avgUptime: '14d 6h', firmwareUpdates: 3 },
      details: [
        { model: 'Pro-X', count: 4, online: 3, avgBattery: 78 },
        { model: 'Standard', count: 3, online: 2, avgBattery: 55 },
      ],
    },
    usage: {
      title: 'Usage Report',
      metrics: { activeUsers: 187, totalSessions: 892, avgDuration: '24.3 min', peakHour: '10:00' },
      details: [
        { metric: 'Daily Active Users', value: '847', change: '+12%' },
        { metric: 'Weekly Active Users', value: '1,892', change: '+8%' },
        { metric: 'Monthly Active Users', value: '3,456', change: '+15%' },
      ],
    },
  };

  const data = previewData[type] || previewData.learning_summary;
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{data.title}</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>PDF</button>
          <button style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>CSV</button>
          <button style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>JSON</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {Object.entries(data.metrics).map(([key, val]) => (
          <div key={key} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{val}</div>
          </div>
        ))}
      </div>
      {data.details && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {Object.keys(data.details[0]).map(k => (
              <th key={k} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.details.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                {Object.values(row).map((v, j) => (
                  <td key={j} style={{ padding: '8px 10px' }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', display: 'flex', gap: 16 }}>
        <span>Report period: {dateRange.start || 'N/A'} - {dateRange.end || 'N/A'}</span>
        <span>Child: {child || 'All'}</span>
        <span>Generated: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

const SchedulingModal = ({ template, onClose, onSave }) => {
  const [form, setForm] = useState(template || { name: '', type: 'learning_summary', schedule: 'weekly', recipients: '', time: '08:00' });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 450, animation: 'fadeIn 0.2s ease' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{template ? 'Edit Schedule' : 'New Schedule'}</h3>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={labelStyle}>Report Name</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label style={labelStyle}>Report Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{reportTypes.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div><label style={labelStyle}>Schedule</label><select style={inputStyle} value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          <div><label style={labelStyle}>Recipients (comma-separated)</label><input style={inputStyle} value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} /></div>
          <div><label style={labelStyle}>Time</label><input type="time" style={inputStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} style={btnStyle()}>Save Schedule</button>
        </div>
      </div>
    </div>
  );
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('learning_summary');
  const [selectedChild, setSelectedChild] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [activeTab, setActiveTab] = useState('generate');
  const [showPreview, setShowPreview] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templates, setTemplates] = useState(reportTemplates);
  const [reportHistory, setReportHistory] = useState(sampleReportHistory);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/learning/records').then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/v1/analytics/subjects').then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([recordsRes]) => {
      if (recordsRes.success && recordsRes.data) {
        setReports(recordsRes.data.slice(0, 20));
      } else {
        setReports([
          { id: 1, child_name: 'Emma', subject: 'Mathematics', score: 95, time: '15 min', date: '2026-05-26', completed: true },
          { id: 2, child_name: 'Liam', subject: 'English', score: 82, time: '20 min', date: '2026-05-26', completed: true },
          { id: 3, child_name: 'Emma', subject: 'Science', score: 78, time: '12 min', date: '2026-05-25', completed: true },
          { id: 4, child_name: 'Noah', subject: 'Art', score: 91, time: '18 min', date: '2026-05-25', completed: true },
          { id: 5, child_name: 'Sophia', subject: 'Music', score: 88, time: '22 min', date: '2026-05-24', completed: true },
        ]);
      }
    });
  }, []);

  const handleGenerate = () => {
    setShowPreview(true);
    const newReport = {
      id: Date.now(), type: selectedReportType, child: selectedChild, date: new Date().toISOString().split('T')[0],
      format: 'PDF', status: 'generated', size: (Math.random() * 4 + 1).toFixed(1) + ' MB',
    };
    setReportHistory(prev => [newReport, ...prev]);
  };

  const handleDownload = (format) => {
    alert('Downloading report as ' + format + '...');
  };

  const handleShare = () => {
    const link = window.location.origin + '/shared/report/' + Date.now();
    navigator.clipboard.writeText(link).then(() => alert('Share link copied: ' + link));
  };

  const handleEmail = () => {
    const email = prompt('Enter recipient email:');
    if (email) alert('Report will be emailed to ' + email);
  };

  const handleSaveTemplate = (template) => {
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...template } : t));
    } else {
      setTemplates(prev => [...prev, { ...template, id: Date.now(), lastUsed: '-' }]);
    }
    setEditingTemplate(null);
  };

  const scoreColor = s => s >= 90 ? '#059669' : s >= 75 ? '#d97706' : '#dc2626';

  const tabs = [
    { key: 'generate', label: 'Generate' },
    { key: 'preview', label: 'Preview' },
    { key: 'history', label: 'History' },
    { key: 'templates', label: 'Templates' },
    { key: 'compare', label: 'Compare' },
    { key: 'analytics', label: 'Analytics' },
  ];

  const tabStyle = (active) => ({
    padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
    fontWeight: active ? 600 : 400, color: active ? COLORS.primary : '#6b7280',
    borderBottom: active ? '2px solid ' + COLORS.primary : '2px solid transparent',
  });

  const reportTypeIcons = { learning_summary: '\uD83D\uDCDA', health: '\uD83C\uDFE5', device: '\uD83E\uDD16', usage: '\uD83D\uDCCA' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Reports</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Generate, schedule, and manage reports</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowScheduleModal(true)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Schedule Report</button>
          <button onClick={() => setCompareMode(!compareMode)} style={{
            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
            background: compareMode ? COLORS.primary : '#fff', color: compareMode ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12,
          }}>Compare Mode</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(activeTab === t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
            {reportTypes.map(r => (
              <div key={r.key} onClick={() => setSelectedReportType(r.key)} style={{
                padding: 16, borderRadius: 10, cursor: 'pointer',
                background: selectedReportType === r.key ? '#eef2ff' : '#fff',
                border: '2px solid ' + (selectedReportType === r.key ? COLORS.primary : '#e5e7eb'),
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Report Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle}>Child</label>
                <select style={inputStyle} value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
                  <option value="All">All Children</option>
                  {childrenList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" style={inputStyle} value={dateStart} onChange={e => setDateStart(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" style={inputStyle} value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>&nbsp;</label>
                <button onClick={handleGenerate} style={btnStyle()}>Generate Report</button>
              </div>
            </div>
          </div>

          {showPreview && (
            <GeneratedReportPreview type={selectedReportType} child={selectedChild} dateRange={{ start: dateStart, end: dateEnd }} />
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => handleDownload('PDF')} style={btnStyle()}>Download PDF</button>
            <button onClick={() => handleDownload('CSV')} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Download CSV</button>
            <button onClick={() => handleDownload('JSON')} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Download JSON</button>
            <button onClick={handleShare} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Share Link</button>
            <button onClick={handleEmail} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Email Report</button>
          </div>
          <GeneratedReportPreview type={selectedReportType} child={selectedChild} dateRange={{ start: dateStart, end: dateEnd }} />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px' }}>Type</th><th style={{ padding: '12px 14px' }}>Child</th>
              <th style={{ padding: '12px 14px' }}>Date</th><th style={{ padding: '12px 14px' }}>Format</th>
              <th style={{ padding: '12px 14px' }}>Status</th><th style={{ padding: '12px 14px' }}>Size</th>
            </tr></thead>
            <tbody>
              {reportHistory.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ marginRight: 6 }}>{reportTypeIcons[r.type]}</span>
                    {reportTypes.find(t => t.key === r.type)?.label || r.type}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{r.child}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.date}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', background: '#eef2ff', borderRadius: 4, fontSize: 11, fontWeight: 600, color: COLORS.primary }}>{r.format}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: r.status === 'generated' ? COLORS.success : COLORS.warning, fontWeight: 500 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditingTemplate(null); setShowScheduleModal(true); }} style={btnStyle()}>+ New Template</button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {templates.map(t => (
              <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {reportTypes.find(r => r.key === t.type)?.label} | {t.schedule} | Recipients: {t.recipients?.join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditingTemplate(t); setShowScheduleModal(true); }} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Edit</button>
                  <button style={{ padding: '6px 12px', background: COLORS.success, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Run Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Report Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Period 1</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="date" style={inputStyle} placeholder="Start" />
                <input type="date" style={inputStyle} placeholder="End" />
              </div>
              <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div><strong>Sessions:</strong> 421</div>
                <div><strong>Avg Score:</strong> 82.4%</div>
                <div><strong>Active Users:</strong> 143</div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Period 2</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="date" style={inputStyle} placeholder="Start" />
                <input type="date" style={inputStyle} placeholder="End" />
              </div>
              <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div><strong>Sessions:</strong> 584</div>
                <div><strong>Avg Score:</strong> 84.3%</div>
                <div><strong>Active Users:</strong> 156</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#eef2ff', borderRadius: 8, fontSize: 13 }}>
            <strong>Summary:</strong> Sessions increased by 38.7%, avg score improved by 1.9 points, active users grew by 9.1%.
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Report Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary }}>{reportHistory.length}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Reports Generated</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.success }}>82%</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Download Rate</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.info }}>{reportTypes.find(r => r.key === selectedReportType)?.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Most Requested</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.warning }}>4</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Scheduled Reports</div>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && <SchedulingModal template={editingTemplate} onClose={() => { setShowScheduleModal(false); setEditingTemplate(null); }} onSave={handleSaveTemplate} />}
    </div>
  );
}
