import { useState, useEffect } from 'react'
import axios from 'axios'

export default function SupportDashboard() {
  const [stats, setStats] = useState({})
  const [sla, setSla] = useState({})
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/support/stats').catch(() => ({ data: {} })),
      axios.get('/api/support/sla').catch(() => ({ data: {} })),
      axios.get('/api/support/overdue').catch(() => ({ data: {} })),
    ]).then(([s, sl, ov]) => {
      setStats(s.data?.stats || {})
      setSla(sl.data?.sla || {})
      setOverdue(ov.data?.overdue || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载客服数据...</div>

  const byStatus = stats.by_status || {}
  const byCategory = stats.by_category || {}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🎧 客服工单闭环</h1>
          <p>自动分诊 → 知识库拦截 → SLA → 首响 → 解决 → CSAT | 低分喂自学习 support</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>🎫</div>
          <div className="stat-info"><h3>{stats.total_tickets || 0}</h3><p>工单总数</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon" style={{ background: '#fde8e8' }}>📥</div>
          <div className="stat-info"><h3>{stats.open_backlog || 0}</h3><p>待处理积压</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>🤖</div>
          <div className="stat-info"><h3>{(stats.auto_deflection_rate || 0).toFixed(1)}%</h3><p>知识库拦截率</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>😊</div>
          <div className="stat-info"><h3>{(stats.csat_avg || 0).toFixed(2)}</h3><p>CSAT 均分</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>⏱️</div>
          <div className="stat-info"><h3>{sla.avg_first_response_hours ?? 0}h</h3><p>平均首响</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>✅</div>
          <div className="stat-info"><h3>{(sla.resolution_sla_pct ?? 100)}%</h3><p>解决 SLA 达标率</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>按状态</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>状态</th><th>数量</th></tr></thead>
              <tbody>
                {Object.entries(byStatus).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>按分类</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>分类</th><th>数量</th></tr></thead>
              <tbody>
                {Object.entries(byCategory).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px', color: overdue.length ? '#dc2626' : '#059669' }}>
          ⚠️ 超时工单（SLA 告警）{overdue.length ? `— ${overdue.length} 个` : '— 无'}
        </h2>
        {overdue.length === 0 ? <p style={{ color: '#6b7280' }}>所有工单均在 SLA 内 ✅</p> : (
          <div className="table-container">
            <table>
              <thead><tr><th>工单</th><th>分类</th><th>优先级</th><th>状态</th><th>已开时长(h)</th><th>首响超时</th><th>解决超时</th></tr></thead>
              <tbody>
                {overdue.map(t => (
                  <tr key={t.ticket_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_id}</td>
                    <td>{t.category}</td>
                    <td><span className="badge red">{t.priority}</span></td>
                    <td>{t.status}</td>
                    <td>{t.age_hours}</td>
                    <td>{t.first_response_overdue ? '❌' : '✅'}</td>
                    <td>{t.resolve_overdue ? '❌' : '✅'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
