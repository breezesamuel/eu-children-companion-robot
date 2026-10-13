import { useState, useEffect } from 'react'
import axios from 'axios'

const phaseLabels = {
  collect: '采集', ingest: '入库', publish: '上架', price: '定价',
  route: '路由', payment: '支付', fulfill: '物流', aftersales: '售后',
  outreach: '外联', followup: '跟进', learn: '自学习', evolve: '自进化', engage: '留存'
}

export default function LoopDashboard() {
  const [history, setHistory] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/console/loop/history').catch(() => ({ data: {} })),
      axios.get('/api/console/loop/status').catch(() => ({ data: {} })),
    ]).then(([h, c]) => {
      setHistory(h.data?.history || h.data?.cycles || [])
      setCurrent(c.data?.status || c.data || null)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 30000)
    return () => clearInterval(timer)
  }, [])

  if (loading) return <div className="loading">加载循环状态...</div>

  const lastCycle = history[0] || {}
  const ok = current?.ok ?? lastCycle.ok ?? false
  const phases = current?.phases ?? lastCycle.phases ?? {}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🔄 自主运营循环</h1>
          <p>24/7 无人值守编排 | {Object.keys(phases).length} 阶段 | 最近周期: #{lastCycle.cycle || '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${ok ? 'green' : 'red'}`}>{ok ? '🟢 健康' : '🔴 异常'}</span>
          <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>🔢</div>
          <div className="stat-info"><h3>{lastCycle.cycle || 0}</h3><p>周期号</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${ok ? '#059669' : '#dc2626'}` }}>
          <div className="stat-icon" style={{ background: ok ? '#e6f7e6' : '#fde8e8' }}>{ok ? '✅' : '❌'}</div>
          <div className="stat-info"><h3>{ok ? '通过' : '失败'}</h3><p>整体状态</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>⏱️</div>
          <div className="stat-info"><h3>{lastCycle.duration_ms || 0} ms</h3><p>耗时</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>📅</div>
          <div className="stat-info"><h3>{lastCycle.finished_at ? new Date(lastCycle.finished_at).toLocaleString() : '—'}</h3><p>完成时间</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>💾</div>
          <div className="stat-info"><h3>{current?.persistence?.backend || 'file'}</h3><p>持久化后端</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>阶段执行详情</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>阶段</th><th>状态</th><th>耗时</th><th>错误</th></tr></thead>
              <tbody>
                {Object.entries(phases).map(([k, v]) => (
                  <tr key={k}>
                    <td>{phaseLabels[k] || k}</td>
                    <td><span className={`badge ${v.status === 'ok' ? 'green' : 'red'}`}>{v.status === 'ok' ? '✅' : '❌'}</span></td>
                    <td>{v.duration_ms || 0} ms</td>
                    <td style={{ color: '#dc2626', fontSize: 12 }}>{v.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>最近 10 周期</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>周期</th><th>状态</th><th>耗时</th><th>时间</th></tr></thead>
              <tbody>
                {history.slice(0, 10).map(c => (
                  <tr key={c.cycle}>
                    <td>#{c.cycle}</td>
                    <td><span className={`badge ${c.ok ? 'green' : 'red'}`}>{c.ok ? '✅' : '❌'}</span></td>
                    <td>{c.duration_ms} ms</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{c.finished_at ? new Date(c.finished_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>阶段成功率趋势</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {Object.keys(phaseLabels).map(k => {
            const runs = history.filter(h => h.phases?.[k])
            const okCount = runs.filter(h => h.phases[k]?.status === 'ok').length
            const pct = runs.length ? Math.round(okCount / runs.length * 100) : 0
            return (
              <div key={k} style={{ flex: '1 1 120px', textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{phaseLabels[k]}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: pct === 100 ? '#059669' : pct >= 80 ? '#d97706' : '#dc2626' }}>{pct}%</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{okCount}/{runs.length}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}