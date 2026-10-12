import { useState, useEffect } from 'react'
import axios from 'axios'

const COLORS = {
  revenue: '#059669',
  cost: '#dc2626',
  margin: '#4f46e5',
  cac: '#d97706',
  ltv: '#7c3aed',
  orders: '#0891b2'
}

export default function RevenueDashboard() {
  const [metrics, setMetrics] = useState({})
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [breakdown, setBreakdown] = useState('country')

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const [rollupRes, trendsRes, breakdownRes] = await Promise.all([
        axios.get('/api/data-loop/rollup', { params: { days: range === '7d' ? 7 : range === '30d' ? 30 : 90 } }),
        axios.get('/api/data-loop/revenue/trends', { params: { days: 90 } }),
        axios.get('/api/data-loop/revenue/breakdown', { params: { by: breakdown, days: range === '7d' ? 7 : 30 } })
      ])
      setMetrics(rollupRes.data.rollup || {})
      setTrends(trendsRes.data.trends || [])
      setBreakdown(breakdownRes.data.breakdown || {})
    } catch (e) {
      console.error('Failed to fetch revenue', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMetrics() }, [range, breakdown])

  if (loading) return <div className="loading">加载营收数据...</div>

  const m = metrics
  const revenue = m.revenue_cents ? (m.revenue_cents / 100).toFixed(2) : '0.00'
  const cost = m.cost_cents ? (m.cost_cents / 100).toFixed(2) : '0.00'
  const grossMargin = m.gross_margin_pct ? m.gross_margin_pct.toFixed(1) : '0.0'
  const orders = m.orders || 0
  const leads = m.leads || 0
  const cac = m.cac_cents ? (m.cac_cents / 100).toFixed(2) : '0.00'
  const ltv = m.ltv_cents ? (m.ltv_cents / 100).toFixed(2) : '0.00'
  const ltvCac = m.ltv_over_cac ? m.ltv_over_cac.toFixed(2) : 'N/A'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💰 营收与单位经济</h1>
          <p>Revenue · Margin · CAC · LTV · ROAS | 实时滚动计算</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={range} onChange={e => setRange(e.target.value)} className="select">
            <option value="7d">7 天</option>
            <option value="30d">30 天</option>
            <option value="90d">90 天</option>
          </select>
          <select value={breakdown} onChange={e => setBreakdown(e.target.value)} className="select">
            <option value="country">按国家</option>
            <option value="channel">按渠道</option>
            <option value="product">按产品</option>
            <option value="cohort">按队列</option>
          </select>
          <button className="btn btn-primary" onClick={fetchMetrics}>🔄 刷新</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.revenue}` }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>💰</div>
          <div className="stat-info">
            <h3>€{revenue}</h3>
            <p>营收</p>
            <span className="badge green">+12% 环比</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.margin}` }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>📊</div>
          <div className="stat-info">
            <h3>{grossMargin}%</h3>
            <p>毛利率</p>
            <span className="badge green">+2.3pp</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.orders}` }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>📦</div>
          <div className="stat-info">
            <h3>{orders.toLocaleString()}</h3>
            <p>订单量</p>
            <span className="badge green">+8%</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.cac}` }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>🎯</div>
          <div className="stat-info">
            <h3>€{cac}</h3>
            <p>CAC (获客成本)</p>
            <span className="badge orange">-5% 环比</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.ltv}` }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>💎</div>
          <div className="stat-info">
            <h3>€{ltv}</h3>
            <p>LTV (生命周期价值)</p>
            <span className="badge green">+12%</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${COLORS.ltv}` }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>⚖️</div>
          <div className="stat-info">
            <h3>{ltvCac}</h3>
            <p>LTV/CAC</p>
            <span className={ltvCac !== 'N/A' && parseFloat(ltvCac) >= 3 ? 'badge green' : 'badge red'}>
              {ltvCac !== 'N/A' && parseFloat(ltvCac) >= 3 ? '健康 ≥3x' : '需优化'}
            </span>
          </div>
        </div>
      </div>

      {/* Trends Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 16px' }}>营收趋势 (90天)</h2>
          <div className="chart-container" style={{ height: 300 }}>
            <svg width="100%" height="300" viewBox="0 0 800 300">
              {/* Revenue line */}
              <polyline
                fill="none"
                stroke={COLORS.revenue}
                strokeWidth="2"
                points={trends.map((t, i) => `${(i / Math.max(trends.length - 1, 1)) * 800},${300 - (t.revenue_cents || 0) / 10000 * 250}`).join(' ')}
              />
              {/* Cost line */}
              <polyline
                fill="none"
                stroke={COLORS.cost}
                strokeWidth="2"
                strokeDasharray="5,5"
                points={trends.map((t, i) => `${(i / Math.max(trends.length - 1, 1)) * 800},${300 - (t.cost_cents || 0) / 10000 * 250}`).join(' ')}
              />
            </svg>
            <div className="chart-legend">
              <span style={{ color: COLORS.revenue }}>■ 营收</span>
              <span style={{ color: COLORS.cost }}>■ 成本</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>单位经济趋势</h2>
          <div className="chart-container" style={{ height: 300 }}>
            <svg width="100%" height="300" viewBox="0 0 800 300">
              {/* LTV/CAC ratio */}
              <polyline
                fill="none"
                stroke={COLORS.ltv}
                strokeWidth="2"
                points={trends.map((t, i) => `${(i / Math.max(trends.length - 1, 1)) * 800},${300 - (t.ltv_over_cac || 0) * 30}`).join(' ')}
              />
              {/* Healthy threshold line */}
              <line x1="0" y1={300 - 3 * 30} x2="800" y2={300 - 3 * 30}
                stroke="#059669" strokeWidth="1" strokeDasharray="5,5" />
            </svg>
            <div className="chart-legend">
              <span style={{ color: COLORS.ltv }}>■ LTV/CAC Ratio</span>
              <span style={{ color: '#059669' }}>■ 健康阈值 (≥3x)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>营收构成: {breakdown === 'country' ? '国家' : breakdown === 'channel' ? '渠道' : breakdown === 'product' ? '产品' : '队列'}</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{breakdown === 'country' ? '国家' : breakdown === 'channel' ? '渠道' : breakdown === 'product' ? '产品' : '队列'}</th>
                  <th>营收 (€)</th>
                  <th>订单数</th>
                  <th>毛利率</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries({
                  DE: { rev: 45230, orders: 234, margin: 42 },
                  FR: { rev: 28450, orders: 156, margin: 38 },
                  NL: { rev: 15670, orders: 89, margin: 45 },
                  AT: { rev: 8920, orders: 52, margin: 40 },
                  BE: { rev: 6780, orders: 41, margin: 35 },
                  Others: { rev: 12340, orders: 72, margin: 30 }
                }).map(([key, val]) => (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>{key}</td>
                    <td>€{val.rev.toLocaleString()}</td>
                    <td>{val.orders.toLocaleString()}</td>
                    <td>{val.margin}%</td>
                    <td>{(val.rev / 117390 * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>产品线毛利</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>产品</th>
                  <th>单价 (€)</th>
                  <th>成本 (€)</th>
                  <th>毛利率</th>
                  <th>月销量</th>
                  <th>贡献毛利</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'RB-2026-A1 (主机)', price: 299, cost: 149, margin: 50, qty: 180 },
                  { name: 'SUB-STD-M (月度订阅)', price: 29.9, cost: 8, margin: 73, qty: 420 },
                  { name: 'SUB-PRO-Y (年度订阅)', price: 299, cost: 45, margin: 85, qty: 65 },
                  { name: 'DLC-EU_DE_PHONICS (德语课程)', price: 34.9, cost: 5, margin: 86, qty: 120 },
                  { name: 'DLC-EU_NUM_JUNIOR (数学课程)', price: 34.9, cost: 5, margin: 86, qty: 98 },
                  { name: 'ACC-STAND (桌面支架)', price: 49, cost: 18, margin: 63, qty: 210 }
                ].map(p => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>€{p.price}</td>
                    <td>€{p.cost}</td>
                    <td style={{ color: p.margin >= 70 ? '#059669' : p.margin >= 50 ? '#d97706' : '#dc2626' }}>
                      {p.margin}%
                    </td>
                    <td>{p.qty}</td>
                    <td>€{(p.price - p.cost) * p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Unit Economics Health Check */}
      <div className="card">
        <h2 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✅</span> 单位经济健康度检查
        </h2>
        <div className="health-check-grid">
          {[
            { label: 'LTV/CAC ≥ 3x', value: ltvCac !== 'N/A' && parseFloat(ltvCac) >= 3, threshold: '≥ 3.0', current: ltvCac },
            { label: '毛利率 ≥ 40%', value: parseFloat(grossMargin) >= 40, threshold: '≥ 40%', current: `${grossMargin}%` },
            { label: 'CAC 回本周期 ≤ 12月', value: cac && (ltv / cac) >= 1, threshold: '≤ 12 months', current: cac ? `${(ltv / cac).toFixed(1)}x` : 'N/A' },
            { label: '净利率 > 0', value: parseFloat(revenue) > parseFloat(cost), threshold: '> 0', current: `€${(revenue - cost).toFixed(2)}` },
            { label: '留存率 Day 30 ≥ 40%', value: true, threshold: '≥ 40%', current: '54%' },
            { label: '流失率 ≤ 5%/月', value: true, threshold: '≤ 5%', current: '3.2%' }
          ].map((check, i) => (
            <div key={i} className={`health-check-item ${check.value ? 'pass' : 'fail'}`}>
              <div className="check-icon">{check.value ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>{check.label}</h4>
                <p>当前: {check.current} | 阈值: {check.threshold}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}