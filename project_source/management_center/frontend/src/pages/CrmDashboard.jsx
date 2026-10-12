import { useState, useEffect } from 'react'
import axios from 'axios'

export default function CrmDashboard() {
  const [funnel, setFunnel] = useState({})
  const [contacts, setContacts] = useState([])
  const [sequences, setSequences] = useState([])
  const [dueOutreach, setDueOutreach] = useState([])
  const [dueFollowups, setDueFollowups] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/crm/funnel').catch(() => ({ data: {} })),
      axios.get('/api/crm/contacts').catch(() => ({ data: {} })),
      axios.get('/api/crm/sequences').catch(() => ({ data: {} })),
      axios.get('/api/crm/outreach/due').catch(() => ({ data: {} })),
      axios.get('/api/crm/followups/due').catch(() => ({ data: {} })),
    ]).then(([f, c, s, o, fu]) => {
      setFunnel(f.data?.funnel || f.data || {})
      setContacts(c.data?.contacts || [])
      setSequences(s.data?.sequences || [])
      setDueOutreach(o.data?.due || o.data?.messages || [])
      setDueFollowups(fu.data?.followups || fu.data?.due || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载 CRM 数据...</div>

  const stages = funnel.stages || funnel || {}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📣 外联与跟进闭环</h1>
          <p>同意校验(GDPR) → 外联序列 → 到期发送 → 跟进任务 | 喂漏斗 获取/咨询 阶段</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>👥</div>
          <div className="stat-info"><h3>{contacts.length}</h3><p>联系人</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>🔁</div>
          <div className="stat-info"><h3>{sequences.length}</h3><p>外联序列</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>📤</div>
          <div className="stat-info"><h3>{dueOutreach.length}</h3><p>待发外联</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>📋</div>
          <div className="stat-info"><h3>{dueFollowups.length}</h3><p>待办跟进</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>CRM 漏斗阶段</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>阶段</th><th>数量</th></tr></thead>
              <tbody>
                {Object.keys(stages).length === 0 ? (
                  <tr><td colSpan="2" style={{ color: '#6b7280' }}>暂无数据</td></tr>
                ) : Object.entries(stages).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>外联序列</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>序列 ID</th><th>名称</th><th>步骤</th></tr></thead>
              <tbody>
                {sequences.length === 0 ? (
                  <tr><td colSpan="3" style={{ color: '#6b7280' }}>暂无序列</td></tr>
                ) : sequences.map(s => (
                  <tr key={s.sequence_id || s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.sequence_id || s.id}</td>
                    <td>{s.name}</td>
                    <td>{(s.steps || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>到期跟进任务</h2>
        {dueFollowups.length === 0 ? <p style={{ color: '#6b7280' }}>暂无到期跟进</p> : (
          <div className="table-container">
            <table>
              <thead><tr><th>任务 ID</th><th>联系人</th><th>说明</th><th>到期</th></tr></thead>
              <tbody>
                {dueFollowups.map(t => (
                  <tr key={t.task_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.task_id}</td>
                    <td>{t.contact_id}</td>
                    <td>{t.note || t.description}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{t.due_at}</td>
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
