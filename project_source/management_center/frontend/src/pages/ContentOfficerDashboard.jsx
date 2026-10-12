import { useState, useEffect } from 'react'
import axios from 'axios'

const statusColor = (s) => ({
  draft: '#6b7280', submitted: '#3b82f6', approved: '#059669',
  rejected: '#dc2626', published: '#7c3aed'
}[s] || '#6b7280')

const entityLabel = (e) => ({
  course: '课程', lesson: '课时', product: '产品', page: '页面'
}[e] || e)

export default function ContentOfficerDashboard() {
  const [drafts, setDrafts] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/content/drafts').catch(() => ({ data: {} })),
      axios.get('/api/content/stats').catch(() => ({ data: {} })),
    ]).then(([d, s]) => {
      setDrafts(d.data?.drafts || d.data || [])
      setStats(s.data?.stats || {})
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = drafts.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (langFilter !== 'all' && d.lang !== langFilter) return false
    return true
  })

  const action = (draftId, action) => {
    axios.post('/api/content/action', { draft_id: draftId, action })
      .then(fetchAll).catch(() => {})
  }

  if (loading) return <div className="loading">加载内容工作台...</div>

  const langs = [...new Set(drafts.map(d => d.lang))].sort()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📝 内容官工作台</h1>
          <p>草稿 → 提交 → 审核 → 发布 | 多语言 Schema.org | DSA 透明度审计链</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>📄</div>
          <div className="stat-info"><h3>{stats.total_drafts || 0}</h3><p>草稿总数</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon" style={{ background: '#e6e6ff' }}>📤</div>
          <div className="stat-info"><h3>{stats.submitted || 0}</h3><p>待审核</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>✅</div>
          <div className="stat-info"><h3>{stats.approved || 0}</h3><p>已通过</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="stat-icon" style={{ background: '#f5f0ff' }}>🌐</div>
          <div className="stat-info"><h3>{stats.published || 0}</h3><p>已发布</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon" style={{ background: '#fde8e8' }}>❌</div>
          <div className="stat-info"><h3>{stats.rejected || 0}</h3><p>已驳回</p></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: '#fff7e6' }}>🌍</div>
          <div className="stat-info"><h3>{stats.languages_covered || 0}</h3><p>覆盖语言</p></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="submitted">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="published">已发布</option>
        </select>
        <select className="input" value={langFilter} onChange={e => setLangFilter(e.target.value)} style={{ width: 140 }}>
          <option value="all">全部语言</option>
          {langs.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px' }}>草稿列表</h2>
        {filtered.length === 0 ? <p style={{ color: '#6b7280' }}>暂无草稿</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>ID</th><th>类型</th><th>实体</th><th>语言</th><th>状态</th><th>关键词</th><th>创建/更新</th><th>操作</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.draft_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.draft_id}</td>
                    <td>{entityLabel(d.entity_type)}</td>
                    <td>{d.entity_id}</td>
                    <td><span className="badge">{d.lang}</span></td>
                    <td><span className="badge" style={{ background: statusColor(d.status), color: 'white' }}>{d.status}</span></td>
                    <td style={{ fontSize: 11, color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(d.keywords || []).slice(0, 5).join(', ')}
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {d.updated_at?.split('T')[0]} / {d.created_at?.split('T')[0]}
                    </td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      {d.status === 'draft' && <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'submit')}>提交</button>}
                      {d.status === 'submitted' && (
                        <>
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'approve')}>通过</button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'reject')}>驳回</button>
                        </>
                      )}
                      {d.status === 'approved' && <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'publish')}>发布</button>}
                      {d.status === 'published' && <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'unpublish')}>下架</button>}
                      {d.status === 'rejected' && <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => action(d.draft_id, 'resubmit')}>修改重提</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 16px' }}>发布预览 (Schema.org JSON-LD)</h2>
        <div style={{ fontSize: 11, fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300 }}>
          {filtered[0]?.schema_json ? JSON.stringify(filtered[0].schema_json, null, 2) : '选择一个已通过/已发布草稿查看结构化数据'}
        </div>
      </div>
    </div>
  )
}