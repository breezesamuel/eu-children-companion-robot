import { useState, useEffect } from 'react'
import axios from 'axios'

export default function PaymentsDashboard() {
  const [reconcile, setReconcile] = useState({})
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/payments/reconcile').catch(() => ({ data: {} })),
      axios.get('/api/payments/list').catch(() => ({ data: {} })),
    ]).then(([r, p]) => {
      setReconcile(r.data?.reconcile || r.data || {})
      setPayments(p.data?.payments || p.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载支付数据...</div>

  const net = reconcile.net_cents || 0
  const captured = reconcile.captured_cents || 0
  const refunded = reconcile.refunded_cents || 0
  const fees = reconcile.fees_cents || 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💳 支付/收单仪表板</h1>
          <p>实时对账 | 净收入 = 捕获 - 手续费 - 退款 | PSP: {reconcile.psp || 'mock'}</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>💰</div>
          <div className="stat-info"><h3>€{(net / 100).toFixed(2)}</h3><p>净收入</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>📥</div>
          <div className="stat-info"><h3>€{(captured / 100).toFixed(2)}</h3><p>捕获总额</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon" style={{ background: '#fde8e8' }}>💸</div>
          <div className="stat-info"><h3>€{(refunded / 100).toFixed(2)}</h3><p>退款总额</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>🏦</div>
          <div className="stat-info"><h3>€{(fees / 100).toFixed(2)}</h3><p>手续费</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>📊</div>
          <div className="stat-info"><h3>{reconcile.payments || 0}</h3><p>交易笔数</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>⚡</div>
          <div className="stat-info"><h3>{reconcile.mock ? 'Mock' : 'Live'}</h3><p>PSP 模式</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>按状态</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>状态</th><th>笔数</th></tr></thead>
              <tbody>
                {Object.entries(reconcile.by_status || {}).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>健康检查</h2>
          <div className="health-check-grid">
            <div className={`health-check-item ${net > 0 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{net > 0 ? '✅' : '❌'}</div>
              <div className="check-info"><h4>{"净收入 > 0"}</h4><p>当前: €{(net / 100).toFixed(2)}</p></div>
            </div>
            <div className={`health-check-item ${refunded / Math.max(captured, 1) < 0.05 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{refunded / Math.max(captured, 1) < 0.05 ? '✅' : '❌'}</div>
              <div className="check-info"><h4>{"退款率 < 5%"}</h4><p>当前: {(refunded / Math.max(captured, 1) * 100).toFixed(2)}%</p></div>
            </div>
            <div className={`health-check-item ${fees / Math.max(captured, 1) < 0.03 ? 'pass' : 'fail'}`}>
              <div className="check-icon">{fees / Math.max(captured, 1) < 0.03 ? '✅' : '❌'}</div>
              <div className="check-info"><h4>{"手续费率 < 3%"}</h4><p>当前: {(fees / Math.max(captured, 1) * 100).toFixed(2)}%</p></div>
            </div>
            <div className={`health-check-item ${!reconcile.mock ? 'pass' : 'warn'}`}>
              <div className="check-icon">{!reconcile.mock ? '✅' : '⚠️'}</div>
              <div className="check-info"><h4>Live PSP 已接入</h4><p>当前: {reconcile.psp || 'mock'}</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>最近交易</h2>
        {payments.length === 0 ? <p style={{ color: '#6b7280' }}>暂无交易记录</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>支付 ID</th><th>订单</th><th>方式</th><th>金额(€)</th><th>手续费(€)</th><th>净额(€)</th><th>状态</th><th>时间</th></tr>
              </thead>
              <tbody>
                {payments.slice(0, 50).map(p => (
                  <tr key={p.payment_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.payment_id}</td>
                    <td>{p.order_id}</td>
                    <td>{p.method}</td>
                    <td>€{(p.amount_cents / 100).toFixed(2)}</td>
                    <td>€{(p.fee_cents / 100).toFixed(2)}</td>
                    <td>€{(p.net_cents / 100).toFixed(2)}</td>
                    <td><span className="badge">{p.status}</span></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{p.created_at?.split('T')[0]}</td>
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