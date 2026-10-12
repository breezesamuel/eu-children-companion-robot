import { useState, useEffect } from 'react'
import axios from 'axios'

const scoreColor = (s) => s >= 4.6 ? '#059669' : s >= 3.4 ? '#d97706' : '#dc2626'

export default function ContentQualityDashboard() {
  const [stats, setStats] = useState({})
  const [low, setLow] = useState([])
  const [hero, setHero] = useState([])
  const [queue, setQueue] = useState([])
  const [nps, setNps] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/content-quality/stats').catch(() => ({ data: {} })),
      axios.get('/api/content-quality/low-quality').catch(() => ({ data: {} })),
      axios.get('/api/content-quality/hero').catch(() => ({ data: {} })),
      axios.get('/api/content-quality/redraft-queue').catch(() => ({ data: {} })),
      axios.get('/api/content-quality/nps').catch(() => ({ data: {} })),
    ]).then(([s, l, h, q, n]) => {
      setStats(s.data?.stats || {})
      setLow(l.data?.items || [])
      setHero(h.data?.items || [])
      setQueue(q.data?.queue || [])
      setNps(n.data?.nps || {})
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载内容质量数据...</div>

  const resolve = (request_id) => {
    axios.post('/api/content-quality/redraft/resolve', { request_id, status: 'redrafted' })
      .then(fetchAll).catch(() => {})
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>⭐ 内容质量闭环</h1>
          <p>家长评分 → 贝叶斯质量分 → 低质重写队列 → 再上架 | 喂给自学习 content.quality</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>🗳️</div>
          <div className="stat-info"><h3>{stats.total_reviews || 0}</h3><p>累计评分</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>📈</div>
          <div className="stat-info"><h3>{(stats.avg_rating || 0).toFixed(2)}</h3><p>平均评分 (/5)</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon" style={{ background: '#fde8e8' }}>⚠️</div>
          <div className="stat-info"><h3>{stats.low_quality_flagged || 0}</h3><p>低质标记</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>🏆</div>
          <div className="stat-info"><h3>{stats.hero_content || 0}</h3><p>王牌内容</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>📝</div>
          <div className="stat-info"><h3>{stats.redraft_queue_depth || 0}</h3><p>重写队列</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${nps.nps >= 0 ? '#059669' : '#dc2626'}` }}>
          <div className="stat-icon" style={{ background: '#eef2ff' }}>💬</div>
          <div className="stat-info"><h3>{nps.nps ?? 0}</h3><p>NPS ({nps.responses || 0} 回应)</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>🔴 低质内容（待重写）</h2>
          {low.length === 0 ? <p style={{ color: '#6b7280' }}>暂无低质内容 🎉</p> : (
            <div className="table-container">
              <table>
                <thead><tr><th>内容 ID</th><th>平滑分</th><th>原始均分</th><th>评分数</th></tr></thead>
                <tbody>
                  {low.map(i => (
                    <tr key={i.content_id}>
                      <td>{i.content_id}</td>
                      <td style={{ color: scoreColor(i.smoothed), fontWeight: 600 }}>{i.smoothed}</td>
                      <td>{i.raw_avg}</td>
                      <td>{i.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px' }}>🏆 王牌内容（加推）</h2>
          {hero.length === 0 ? <p style={{ color: '#6b7280' }}>评分还不够，暂无王牌内容</p> : (
            <div className="table-container">
              <table>
                <thead><tr><th>内容 ID</th><th>平滑分</th><th>评分数</th></tr></thead>
                <tbody>
                  {hero.map(i => (
                    <tr key={i.content_id}>
                      <td>{i.content_id}</td>
                      <td style={{ color: scoreColor(i.smoothed), fontWeight: 600 }}>{i.smoothed}</td>
                      <td>{i.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>📝 重写请求队列</h2>
        {queue.length === 0 ? <p style={{ color: '#6b7280' }}>队列为空</p> : (
          <div className="table-container">
            <table>
              <thead><tr><th>请求 ID</th><th>内容 ID</th><th>原因</th><th>质量分</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {queue.map(r => (
                  <tr key={r.request_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.request_id}</td>
                    <td>{r.content_id}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.reason}</td>
                    <td>{r.quality_score}</td>
                    <td><span className="badge orange">{r.status}</span></td>
                    <td><button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolve(r.request_id)}>标记已重写</button></td>
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
