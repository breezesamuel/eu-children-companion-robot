import { useState, useEffect } from 'react'
import axios from 'axios'

export default function RmaDashboard() {
  const [stats, setStats] = useState({})
  const [rmas, setRmas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/rma/stats').catch(() => ({ data: {} })),
      axios.get('/api/rma/list').catch(() => ({ data: {} })),
    ]).then(([s, r]) => {
      setStats(s.data?.stats || {})
      setRmas(r.data?.rmas || r.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载 RMA 数据...</div>

  const statusColor = (s) => ({
    requested: '#6b7280', approved: '#3b82f6', shipped: '#8b5cf6',
    received: '#f59e0b', inspected: '#0891b2', resolved: '#059669',
    rejected: '#dc2626'
  }[s] || '#6b7280')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🔧 RMA 售后闭环</h1>
          <p>申请 → 审核 → 发货 → 收货 → 检测 → 结案 | 退款/维修/换新全链路</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>📋</div>
          <div className="stat-info"><h3>{stats.total_rmas || 0}</h3><p>RMA 总数</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>⏳</div>
          <div className="stat-info"><h3>{stats.pending_count || 0}</h3><p>待处理</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>✅</div>
          <div className="stat-info"><h3>{stats.resolved_count || 0}</h3><p>已结案</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>💰</div>
          <div className="stat-info"><h3>€{((stats.total_refunded_cents || 0) / 100).toFixed(2)}</h3><p>累计退款</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>🔄</div>
          <div className="stat-info"><h3>{((stats.avg_cycle_days || 0).toFixed(1))} 天</h3><p>平均周期</p></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>RMA 列表</h2>
        {rmas.length === 0 ? <p style={{ color: '#6b7280' }}>暂无 RMA 记录</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>RMA ID</th><th>订单</th><th>SKU</th><th>原因</th><th>状态</th><th>退款(€)</th><th>创建时间</th></tr>
              </thead>
              <tbody>
                {rmas.map(r => (
                  <tr key={r.rma_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.rma_id}</td>
                    <td>{r.order_id}</td>
                    <td>{r.sku}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.reason}</td>
                    <td><span className="badge" style={{ background: statusColor(r.status), color: 'white' }}>{r.status}</span></td>
                    <td>{((r.refund_cents || 0) / 100).toFixed(2)}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 16px' }}>按状态分布</h2>
        <div className="table-container">
          <table>
            <thead><tr><th>状态</th><th>数量</th></tr></thead>
            <tbody>
              {Object.entries(stats.by_status || {}).map(([k, v]) => (
                <tr key={k}><td><span className="badge" style={{ background: statusColor(k), color: 'white' }}>{k}</span></td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}