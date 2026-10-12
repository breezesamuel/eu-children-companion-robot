import React, { useState, useMemo } from 'react';

const COLORS = { primary: '#4f46e5', success: '#059669', warning: '#d97706', danger: '#dc2626', info: '#0891b2' };

const style = document.createElement('style');
style.textContent = [
  '@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
  '@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }',
].join('\n');
document.head.appendChild(style);

const btnStyle = (bg) => ({ padding: '8px 16px', border: 'none', borderRadius: 6, background: bg || COLORS.primary, color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 12 });

const subjects = ['Mathematics', 'English', 'Science', 'Art & Music', 'Social Studies', 'Physical Education'];
const subjectColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

const MiniBarChart = ({ data, height = 150, label }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', background: d.color || COLORS.primary, borderRadius: '4px 4px 0 0', height: Math.max((d.value / max) * height, 4), transition: 'height 0.5s ease', opacity: 0.85, minWidth: 12 }} title={d.label + ': ' + d.value} />
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const subjectsPerformance = subjects.map((s, i) => ({
  label: s, value: Math.floor(Math.random() * 40) + 60, color: subjectColors[i],
}));
const usageTrend = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => ({ label: m, value: Math.floor(Math.random() * 200) + 300 }));
const userGrowth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => ({ label: m, value: Math.floor(Math.random() * 50) + 100 }));
const devicePeakHours = Array.from({ length: 12 }, (_, i) => ({ label: (i + 8) + ':00', value: Math.floor(Math.random() * 40) + 10 }));
const geoData = [
  { country: 'USA', users: 45, pct: 35 },
  { country: 'UK', users: 22, pct: 17 },
  { country: 'Germany', users: 18, pct: 14 },
  { country: 'Canada', users: 15, pct: 12 },
  { country: 'Australia', users: 12, pct: 9 },
  { country: 'Others', users: 16, pct: 13 },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [anomalies, setAnomalies] = useState([
    { id: 1, metric: 'Avg Session Duration', value: 'Drop of 23%', severity: 'medium', date: '2026-05-25' },
    { id: 2, metric: 'Login Failures', value: 'Spike of 340%', severity: 'high', date: '2026-05-24' },
    { id: 3, metric: 'API Response Time', value: 'Increased by 150ms', severity: 'low', date: '2026-05-23' },
  ]);

  const completionRates = [
    { label: 'Mathematics', value: 78 }, { label: 'English', value: 85 },
    { label: 'Science', value: 72 }, { label: 'Art & Music', value: 91 },
    { label: 'Social Studies', value: 68 }, { label: 'Physical Ed', value: 95 },
  ];

  const retentionData = { day1: 92, day7: 78, day30: 54 };

  const rangeOptions = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'custom', label: 'Custom' },
  ];

  const exportCSV = () => {
    const rows = [['Metric', 'Value', 'Period']];
    subjectsPerformance.forEach(s => rows.push([s.label, s.value, dateRange]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analytics-' + dateRange + '-' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { key: 'overview', label: 'Overview' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'usage', label: 'Usage' },
    { key: 'content', label: 'Content' },
    { key: 'users', label: 'Users' },
    { key: 'devices', label: 'Devices' },
    { key: 'retention', label: 'Retention' },
    { key: 'geo', label: 'Geo' },
    { key: 'anomalies', label: 'Anomalies' },
  ];

  const tabStyle = (active) => ({
    padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
    fontWeight: active ? 600 : 400, color: active ? COLORS.primary : '#6b7280',
    borderBottom: active ? '2px solid ' + COLORS.primary : '2px solid transparent',
  });

  const contentAnalysis = [
    { title: 'Algebra Basics', views: 534, rating: 4.7, subject: 'Mathematics' },
    { title: 'Grammar Fundamentals', views: 289, rating: 4.5, subject: 'English' },
    { title: 'Biology: Cells', views: 423, rating: 4.8, subject: 'Science' },
    { title: 'Ancient Civilizations', views: 212, rating: 4.6, subject: 'Social Studies' },
    { title: 'Creative Drawing', views: 156, rating: 4.3, subject: 'Art & Music' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Analytics</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Data-driven insights and metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rangeOptions.map(r => (
            <button key={r.key} onClick={() => { setDateRange(r.key); setShowCustom(r.key === 'custom'); }}
              style={{
                padding: '6px 14px', border: '1px solid ' + (dateRange === r.key ? COLORS.primary : '#d1d5db'), borderRadius: 6,
                background: dateRange === r.key ? COLORS.primary : '#fff', color: dateRange === r.key ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>{r.label}</button>
          ))}
          <button onClick={exportCSV} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Export CSV</button>
        </div>
      </div>

      {showCustom && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12 }}>From:</label>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
          <label style={{ fontSize: 12 }}>To:</label>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
          <button style={btnStyle()}>Apply</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb', overflow: 'auto' }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)} style={tabStyle(activeSection === s.key)}>{s.label}</button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Active Users</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>1,247</div>
              <div style={{ fontSize: 12, color: COLORS.success }}>+12% vs last period</div>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total Sessions</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>8,932</div>
              <div style={{ fontSize: 12, color: COLORS.success }}>+8% vs last period</div>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Avg Session Duration</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>24.3 min</div>
              <div style={{ fontSize: 12, color: COLORS.danger }}>-3% vs last period</div>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Completion Rate</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>81.5%</div>
              <div style={{ fontSize: 12, color: COLORS.success }}>+5% vs last period</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Usage Trend</h3>
              <MiniBarChart data={usageTrend} label="Sessions per month" />
            </div>
            <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>User Growth</h3>
              <MiniBarChart data={userGrowth} label="New users per month" color={COLORS.success} />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'subjects' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Subject Performance Comparison</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 20px' }}>
            {subjectsPerformance.map((s, i) => (
              <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{s.value}%</div>
                <div style={{
                  width: '100%', background: s.color, borderRadius: '6px 6px 0 0',
                  height: (s.value / 100) * 180, minHeight: 8, transition: 'height 0.6s ease', opacity: 0.85,
                }} />
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 8, textAlign: 'center', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 13, marginBottom: 8 }}>Completion Rates</h4>
            {completionRates.map(c => (
              <div key={c.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span>{c.label}</span><span style={{ fontWeight: 600 }}>{c.value}%</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: c.value + '%', background: c.value >= 80 ? COLORS.success : c.value >= 60 ? COLORS.warning : COLORS.danger, height: '100%', borderRadius: 6, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'usage' && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Usage Trend (6 months)</h3>
            <MiniBarChart data={usageTrend} />
          </div>
          <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Avg Session Duration (min)</h3>
            <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary, textAlign: 'center', padding: '20px 0' }}>24.3</div>
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>vs 25.1 last period (-3.2%)</div>
            <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end', marginTop: 16 }}>
              {[22, 24, 23, 26, 25, 24, 23, 25, 24, 26, 24, 23].map((v, i) => (
                <div key={i} style={{ flex: 1, background: COLORS.info, height: (v / 30) * 60 + 'px', borderRadius: '3px 3px 0 0', opacity: 0.7 }} title={v + 'min'} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'content' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Content Item Analysis</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Title</th><th style={{ padding: '10px 12px' }}>Subject</th>
              <th style={{ padding: '10px 12px' }}>Views</th><th style={{ padding: '10px 12px' }}>Rating</th>
            </tr></thead>
            <tbody>
              {contentAnalysis.sort((a, b) => b.views - a.views).map(c => (
                <tr key={c.title} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.title}</td>
                  <td style={{ padding: '10px 12px' }}>{c.subject}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.views}</td>
                  <td style={{ padding: '10px 12px' }}>{'\u2605'} {c.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'users' && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>User Growth</h3>
            <MiniBarChart data={userGrowth} />
          </div>
          <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Active Users</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[
                { label: 'Daily', value: '847' },
                { label: 'Weekly', value: '1,892' },
                { label: 'Monthly', value: '3,456' },
              ].map(a => (
                <div key={a.label} style={{ flex: 1, textAlign: 'center', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}>{a.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'devices' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Device Usage Patterns - Peak Hours</h3>
          <MiniBarChart data={devicePeakHours} label="Active devices per hour" height={180} />
          <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            Peak usage: {devicePeakHours.reduce((max, h) => h.value > max.value ? h : max).label} ({devicePeakHours.reduce((max, h) => h.value > max.value ? h : max).value} devices)
          </div>
        </div>
      )}

      {activeSection === 'retention' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Retention Analysis</h3>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'flex-end', height: 200, padding: '20px 0' }}>
            {[
              { label: 'Day 1', value: retentionData.day1 },
              { label: 'Day 7', value: retentionData.day7 },
              { label: 'Day 30', value: retentionData.day30 },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{r.value}%</div>
                <div style={{
                  width: 80, background: r.value >= 80 ? COLORS.success : r.value >= 60 ? COLORS.warning : COLORS.danger,
                  borderRadius: '8px 8px 0 0', height: (r.value / 100) * 160, transition: 'height 0.5s ease', opacity: 0.85,
                }} />
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'geo' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Geographic Distribution</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {geoData.map(g => (
              <div key={g.country} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 120, fontSize: 13, textAlign: 'right' }}>{g.country}</div>
                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                  <div style={{ width: g.pct + '%', background: COLORS.primary, height: '100%', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#fff', fontSize: 11, fontWeight: 600, transition: 'width 0.5s ease' }}>
                    {g.users} users
                  </div>
                </div>
                <div style={{ width: 40, fontSize: 12, color: '#6b7280' }}>{g.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'anomalies' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>
            Anomaly Detection
            {anomalies.filter(a => a.severity === 'high').length > 0 && (
              <span style={{ marginLeft: 8, padding: '2px 8px', background: COLORS.danger, color: '#fff', borderRadius: 10, fontSize: 11 }}>{anomalies.filter(a => a.severity === 'high').length} critical</span>
            )}
          </h3>
          {anomalies.map(a => (
            <div key={a.id} style={{
              padding: '12px 16px', marginBottom: 8, borderRadius: 8,
              background: a.severity === 'high' ? '#fef2f2' : a.severity === 'medium' ? '#fffbeb' : '#f0f9ff',
              border: '1px solid ' + (a.severity === 'high' ? '#fecaca' : a.severity === 'medium' ? '#fde68a' : '#bae6fd'),
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{a.metric}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 8, fontSize: 11,
                  background: a.severity === 'high' ? COLORS.danger : a.severity === 'medium' ? COLORS.warning : COLORS.info,
                  color: '#fff', fontWeight: 500,
                }}>{a.severity}</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151' }}>{a.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{a.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
