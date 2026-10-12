import { useState, useEffect } from 'react'
import axios from 'axios'

const PLANS = [
  { id: 'SUB-STD-M', name: 'Standard Monthly', price: 29.90, interval: '月' },
  { id: 'SUB-STD-Y', name: 'Standard Yearly', price: 299.00, interval: '年' },
  { id: 'SUB-PRO-M', name: 'Pro Monthly', price: 49.90, interval: '月' },
  { id: 'SUB-PRO-Y', name: 'Pro Yearly', price: 499.00, interval: '年' },
]

export default function SubscriptionDashboard() {
  const [m, setM] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    axios.get('/api/subscriptions/metrics')
      .then(r => setM(r.data?.metrics || {}))
      .catch(() => setM({}))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载订阅数据...</div>

  const dist = m.plans_distribution || {}
  const mrr = ((m.mrr_cents || 0) / 100).toFixed(2)
  const arr = ((m.arr_cents || 0) / 100).toFixed(2)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🔁 订阅计费闭环</h1>
          <p>试用 → 升降级(按比例计费) → 暂停/催收 dunning 5 段 → 恢复 → 发票 | MRR/ARR 实时</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>🔁</div>
          <div className="stat-info"><h3>{m.total_subscriptions || 0}</h3><p>订阅总数</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>✅</div>
          <div className="stat-info"><h3>{m.active || 0}</h3><p>活跃</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>🧪</div>
          <div className="stat-info"><h3>{m.trialing || 0}</h3><p>试用中</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon" style={{ background: '#fde8e8' }}>⚠️</div>
          <div className="stat-info"><h3>{m.past_due || 0}</h3><p>催收中 (dunning)</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>💰</div>
          <div className="stat-info"><h3>€{mrr}</h3><p>MRR</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>📅</div>
          <div className="stat-info"><h3>€{arr}</h3><p>ARR</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>套餐分布（活跃）</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>套餐</th><th>价格</th><th>活跃订阅</th></tr></thead>
              <tbody>
                {PLANS.map(p => (
                  <tr key={p.id}>
                    <td>{p.name} <span style={{ color: '#6b7280', fontSize: 12 }}>({p.id})</span></td>
                    <td>€{p.price}/{p.interval}</td>
                    <td style={{ fontWeight: 600 }}>{dist[p.id] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>健康指标</h2>
          <div className="health-check-grid">
            <div className={`health-check-item ${(m.churn_rate_30d || 0) <= 0.05 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{(m.churn_rate_30d || 0) <= 0.05 ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>30 天流失率 ≤ 5%</h4>
                <p>当前: {((m.churn_rate_30d || 0) * 100).toFixed(2)}%</p>
              </div>
            </div>
            <div className={`health-check-item ${(m.dunning_active || 0) === 0 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{(m.dunning_active || 0) === 0 ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>催收队列清空</h4>
                <p>当前催收中: {m.dunning_active || 0}</p>
              </div>
            </div>
            <div className={`health-check-item ${(m.mrr_cents || 0) > 0 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{(m.mrr_cents || 0) > 0 ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>MRR &gt; 0</h4>
                <p>当前: €{mrr}</p>
              </div>
            </div>
            <div className={`health-check-item ${(m.active || 0) >= (m.past_due || 0) ? 'pass' : 'fail'}`}>
              <div className="check-icon">{(m.active || 0) >= (m.past_due || 0) ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>活跃 ≥ 催收</h4>
                <p>{m.active || 0} ≥ {m.past_due || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
