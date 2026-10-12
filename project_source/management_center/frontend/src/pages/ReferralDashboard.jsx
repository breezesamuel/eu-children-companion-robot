import { useState, useEffect } from 'react'
import axios from 'axios'

export default function ReferralDashboard() {
  const [stats, setStats] = useState({})
  const [myStats, setMyStats] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/referral/admin/stats').catch(() => ({ data: {} })),
      axios.get('/api/referral/stats?household_id=hh-1').catch(() => ({ data: {} })),
    ]).then(([a, m]) => {
      setStats(a.data?.stats || {})
      setMyStats(m.data?.stats || {})
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载推荐数据...</div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🤝 推荐分佣闭环</h1>
          <p>分享链接 → 归因转化 → 阶梯佣金 → 自动提现 → 飞轮加速</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>🔗</div>
          <div className="stat-info"><h3>{stats.active_codes || 0}</h3><p>活跃推荐码</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>🔄</div>
          <div className="stat-info"><h3>{stats.total_conversions || 0}</h3><p>累计转化</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>💰</div>
          <div className="stat-info"><h3>€{(stats.total_gmv_cents / 100).toFixed(2)}</h3><p>GMV</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>💵</div>
          <div className="stat-info"><h3>€{(stats.total_commission_cents / 100).toFixed(2)}</h3><p>累计佣金</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>⏳</div>
          <div className="stat-info"><h3>€{(stats.pending_payout_cents / 100).toFixed(2)}</h3><p>待发佣金</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>我的推荐码</h2>
          {myStats.has_code ? (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, background: '#f3f4f6', padding: '12px 16px', borderRadius: 8 }}>
                  {myStats.code}
                </div>
                <span className="badge purple">{myStats.tier}</span>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>指标</th><th>数值</th></tr></thead>
                  <tbody>
                    <tr><td>等级</td><td><strong>{myStats.tier}</strong> ({myStats.commission_rate_pct}% + 奖励)</td></tr>
                    <tr><td>累计 GMV</td><td>€{(myStats.total_gmv_cents / 100).toFixed(2)}</td></tr>
                    <tr><td>转化数</td><td>{myStats.total_conversions}</td></tr>
                    <tr><td>累计佣金</td><td>€{(myStats.total_commission_cents / 100).toFixed(2)}</td></tr>
                    {myStats.next_tier && (
                      <tr><td>下一等级</td><td>{myStats.next_tier} (还需 €{((myStats.next_tier_gmv_cents - myStats.total_gmv_cents) / 100).toFixed(2)})</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>暂无推荐码，点击刷新生成</p>
          )}
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>等级分布</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>等级</th><th>人数</th><th>佣金率</th><th>单单奖励</th></tr></thead>
              <tbody>
                {Object.entries(stats.by_tier || {}).map(([tier, count]) => {
                  const cfg = {BRONZE: {r: 5, b: 0}, SILVER: {r: 7, b: 2}, GOLD: {r: 10, b: 5}, PLATINUM: {r: 12, b: 10}}[tier] || {r: 0, b: 0}
                  return (
                    <tr key={tier}>
                      <td><span className="badge">{tier}</span></td>
                      <td>{count}</td>
                      <td>{cfg.r}%</td>
                      <td>€{(cfg.b / 100).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>健康检查</h2>
        <div className="health-check-grid">
          <div className={`health-check-item ${stats.total_conversions > 0 ? 'pass' : 'fail'}`}>
            <div className="check-icon">{stats.total_conversions > 0 ? '✅' : '❌'}</div>
            <div className="check-info"><h4>有转化发生</h4><p>总转化: {stats.total_conversions}</p></div>
          </div>
          <div className={`health-check-item ${stats.active_codes > 0 ? 'pass' : 'fail'}`}>
            <div className="check-icon">{stats.active_codes > 0 ? '✅' : '❌'}</div>
            <div className="check-info"><h4>有活跃推荐码</h4><p>{stats.active_codes} 个</p></div>
          </div>
          <div className={`health-check-item ${stats.pending_payout_cents < stats.total_commission_cents * 0.5 ? 'pass' : 'warn'}`}>
            <div className="check-icon">{stats.pending_payout_cents < stats.total_commission_cents * 0.5 ? '✅' : '⚠️'}</div>
            <div className="check-info"><h4>{"待发佣金 < 50% 累计"}</h4><p>待发: €{(stats.pending_payout_cents / 100).toFixed(2)}</p></div>
          </div>
          <div className={`health-check-item ${Object.keys(stats.by_tier || {}).length >= 2 ? 'pass' : 'warn'}`}>
            <div className="check-icon">{Object.keys(stats.by_tier || {}).length >= 2 ? '✅' : '⚠️'}</div>
            <div className="check-info"><h4>多等级分布</h4><p>{Object.keys(stats.by_tier || {}).length} 个等级</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}