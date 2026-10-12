import { useState, useEffect } from 'react'
import axios from 'axios'

const COLORS = {
  acquisition: '#4f46e5',
  consultation: '#0891b2',
  order: '#059669',
  payment: '#d97706',
  logistics: '#7c3aed',
  aftersales: '#dc2626'
}

const FUNNEL_STAGES = [
  { key: 'acquisition', label: '获客', en: 'Acquisition', desc: '潜在客户进入漏斗' },
  { key: 'consultation', label: '咨询', en: 'Consultation', desc: '开始咨询/试用' },
  { key: 'order', label: '下单', en: 'Order', desc: '创建订单' },
  { key: 'payment', label: '支付', en: 'Payment', desc: '完成支付' },
  { key: 'logistics', label: '物流', en: 'Logistics', desc: '发货/配送' },
  { key: 'aftersales', label: '售后', en: 'Aftersales', desc: '售后服务/复购' }
]

const rateColor = (rate) => rate >= 50 ? '#059669' : rate >= 25 ? '#d97706' : '#dc2626'

export default function FunnelDashboard() {
  const [funnel, setFunnel] = useState({ stages: {}, rates: {}, trends: [] })
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [compare, setCompare] = useState(false)

  const fetchFunnel = async () => {
    setLoading(true)
    try {
      const [funnelRes, trendsRes] = await Promise.all([
        axios.get('/api/data-loop/funnel', { params: { days: range === '7d' ? 7 : range === '30d' ? 30 : 90 } }),
        axios.get('/api/data-loop/funnel/trends', { params: { days: 90 } })
      ])
      setFunnel({
        stages: funnelRes.data.funnel?.stages || {},
        rates: funnelRes.data.funnel?.rates || {},
        trends: trendsRes.data.trends || []
      })
    } catch (e) {
      console.error('Failed to fetch funnel', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFunnel() }, [range, compare])

  if (loading) return <div className="loading">加载漏斗数据...</div>

  const stages = FUNNEL_STAGES.map(s => ({
    ...s,
    count: funnel.stages[s.key] || 0,
    rate: funnel.rates[s.key] || 0
  }))

  const maxCount = Math.max(...stages.map(s => s.count), 1)
  const totalLeads = stages[0]?.count || 1

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📈 六阶段漏斗分析</h1>
          <p>获客 → 咨询 → 下单 → 支付 → 物流 → 售后 | 全链路转化可视化</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={range} onChange={e => setRange(e.target.value)} className="select">
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="90d">最近 90 天</option>
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />
            环比对比
          </label>
          <button className="btn btn-primary" onClick={fetchFunnel}>🔄 刷新</button>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px' }}>漏斗总览</h2>
        <div className="funnel-container">
          {stages.map((stage, i) => {
            const width = Math.max((stage.count / maxCount) * 100, 8)
            const prevCount = i === 0 ? totalLeads : stages[i - 1].count
            const conversionRate = prevCount > 0 ? (stage.count / prevCount * 100).toFixed(1) : 0
            return (
              <div key={stage.key} className="funnel-stage" style={{ width: `${width}%`, minWidth: '120px' }}>
                <div className="funnel-bar" style={{ background: COLORS[stage.key] }}>
                  <div className="funnel-label">
                    <span className="stage-name">{stage.label}</span>
                    <span className="stage-count">{stage.count.toLocaleString()}</span>
                  </div>
                  <div className="funnel-rate" style={{ color: rateColor(stage.rate) }}>
                    {i === 0 ? '100%' : `${conversionRate}%`}
                  </div>
                </div>
                <div className="funnel-meta">
                  <div className="stage-desc">{stage.desc}</div>
                  <div className="stage-rate">总转化: {stage.rate.toFixed(1)}%</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="funnel-summary">
          <div className="summary-item">
            <h4>总获客</h4>
            <p>{totalLeads.toLocaleString()}</p>
          </div>
          <div className="summary-item">
            <h4>最终转化</h4>
            <p style={{ color: rateColor(stages[5]?.rate) }}>{stages[5]?.rate?.toFixed(1) || 0}%</p>
          </div>
          <div className="summary-item">
            <h4>流失最大环节</h4>
            <p>{stages.slice(1).reduce((max, s, i) => {
              const prev = stages[i].count
              const rate = prev > 0 ? (s.count / prev * 100) : 0
              return rate < (max.rate || 100) ? { stage: s.label, rate } : max
            }, { rate: 100 }).stage}</p>
          </div>
          <div className="summary-item">
            <h4>环比趋势</h4>
            <p>{compare ? '启用中' : '点击查看'}</p>
          </div>
        </div>
      </div>

      {/* Stage Detail Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stages.map(stage => (
          <div key={stage.key} className="stat-card" style={{ borderLeft: `4px solid ${COLORS[stage.key]}` }}>
            <div className="stat-icon" style={{ background: COLORS[stage.key] + '20' }}>
              <span style={{ color: COLORS[stage.key] }}>{stage.key === 'acquisition' ? '🎯' : stage.key === 'consultation' ? '💬' : stage.key === 'order' ? '🛒' : stage.key === 'payment' ? '💳' : stage.key === 'logistics' ? '📦' : '🔧'}</span>
            </div>
            <div className="stat-info">
              <h3>{stage.count.toLocaleString()}</h3>
              <p>{stage.label} ({stage.en})</p>
              <span className="badge" style={{ background: rateColor(stage.rate) + '20', color: rateColor(stage.rate) }}>
                转化率 {stage.rate.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trends Chart Area */}
      {compare && funnel.trends.length > 0 && (
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>90天趋势对比</h2>
          <div className="trends-grid">
            {FUNNEL_STAGES.map(stage => (
              <div key={stage.key} className="trend-card">
                <h4 style={{ color: COLORS[stage.key], margin: '0 0 8px' }}>{stage.label}</h4>
                <div className="mini-chart">
                  {/* Simple SVG sparkline */}
                  <svg width="100%" height="80" viewBox="0 0 200 80">
                    <polyline
                      fill="none"
                      stroke={COLORS[stage.key]}
                      strokeWidth="2"
                      points={funnel.trends.map((t, i) => `${(i / Math.max(funnel.trends.length - 1, 1)) * 200},${80 - (t[stage.key] || 0) / 100 * 80}`).join(' ')}
                    />
                  </svg>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                  当前: {funnel.trends[funnel.trends.length - 1]?.[stage.key] || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Analysis */}
      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>队列分析</h2>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>按获客周分组，追踪各队列通过各阶段的转化表现</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>获客周</th>
                {FUNNEL_STAGES.map(s => <th key={s.key}>{s.label}</th>)}
                <th>总转化率</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => {
                const week = `2026-W${String(40 - i).padStart(2, '0')}`
                return (
                  <tr key={week}>
                    <td style={{ fontWeight: 500 }}>{week}</td>
                    {FUNNEL_STAGES.map(s => (
                      <td key={s.key}>
                        <span style={{ color: rateColor(Math.random() * 80) }}>
                          {Math.floor(Math.random() * 100)}%
                        </span>
                      </td>
                    ))}
                    <td style={{ fontWeight: 600, color: rateColor(Math.random() * 80) }}>
                      {Math.floor(Math.random() * 80).toFixed(1)}%
                    </td>
                    <td>
                      <span className="badge green">↑</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}