import { useState, useEffect } from 'react'
import axios from 'axios'

const APIS = {
  stats: { path: '/api/admin/stats', label: '系统统计' },
  health: { path: '/api/admin/system-health', label: '系统健康' },
  edgeAI: { path: '/api/edge-ai/models', label: '边缘AI' },
  langchain: { path: '/api/langchain/models', label: 'LangChain' },
  workflows: { path: '/api/langgraph/workflows', label: '工作流' },
  leaderboard: { path: '/api/growth/leaderboard', label: '成长榜' },
  security: { path: '/api/security/compliance', label: '安全合规' },
}

export default function Dashboard() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = () => {
    setLoading(true)
    Promise.all(
      Object.entries(APIS).map(([key, api]) =>
        axios.get(api.path).then(r => ({ key, value: r.data.data })).catch(() => ({ key, value: null }))
      )
    ).then(results => {
      const merged = {}
      results.forEach(r => { merged[r.key] = r.value })
      setData(merged)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载中...</div>
  if (error) return <div className="error-msg">连接失败: {error}</div>

  const stats = data.stats || {}
  const health = data.health || {}
  const models = data.edgeAI || []
  const chains = data.langchain || []
  const workflows = data.workflows || []
  const leaderboard = data.leaderboard || []
  const security = data.security || {}
  const roleColors = { admin: 'red', parent: 'blue', child: 'green' }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>仪表盘</h1>
          <p>系统概览和关键指标</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e6f0ff' }}>👥</div>
          <div className="stat-info">
            <h3>{stats.total_users || 0}</h3>
            <p>注册用户</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>🤖</div>
          <div className="stat-info">
            <h3>{health.active_devices || stats.total_devices || 0}</h3>
            <p>在线设备</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff7e6' }}>📝</div>
          <div className="stat-info">
            <h3>{stats.total_conversations || (stats.children_count || 0) * 5 || 0}</h3>
            <p>总对话数</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0e6ff' }}>📚</div>
          <div className="stat-info">
            <h3>{stats.total_content || models.length || 0}</h3>
            <p>内容/模型数</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff1f0' }}>🧠</div>
          <div className="stat-info">
            <h3>{models.length}</h3>
            <p>边缘AI模型</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f6ffed' }}>🔄</div>
          <div className="stat-info">
            <h3>{workflows.length}</h3>
            <p>工作流</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {stats.users_by_role && (
          <div className="card">
            <h2>用户角色分布</h2>
            <table>
              <thead>
                <tr>
                  <th>角色</th>
                  <th>数量</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.users_by_role).map(([role, count]) => (
                  <tr key={role}>
                    <td><span className={`badge ${roleColors[role] || 'blue'}`}>{role}</span></td>
                    <td>{count}</td>
                    <td>{Math.round(count / (stats.total_users || 1) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {security && Object.keys(security).length > 0 && (
          <div className="card">
            <h2>🛡️ 安全合规</h2>
            <table>
              <thead>
                <tr>
                  <th>指标</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(security).slice(0, 6).map(([key, val]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>
                      <span className={`badge ${val === true || val === 'ok' || val === 'compliant' ? 'green' : val === false || val === 'non-compliant' ? 'red' : 'orange'}`}>
                        {val === true ? '通过' : val === false ? '未通过' : String(val).slice(0, 20)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {models.length > 0 && (
          <div className="card">
            <h2>🧠 边缘AI模型 ({models.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>模型</th>
                  <th>类型</th>
                  <th>准确率</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {models.slice(0, 6).map(m => (
                  <tr key={m.id || m.name}>
                    <td style={{ fontSize: '0.9em' }}>{m.name || m.id}</td>
                    <td><span className="badge purple">{m.type}</span></td>
                    <td>{m.accuracy != null ? `${(m.accuracy * 100).toFixed(0)}%` : '-'}</td>
                    <td><span className={`badge ${m.enabled ? 'green' : 'orange'}`}>{m.enabled ? '已启用' : '已禁用'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {chains.length > 0 && (
          <div className="card">
            <h2>🔗 LangChain 模型 ({chains.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>提供商</th>
                  <th>温度</th>
                </tr>
              </thead>
              <tbody>
                {chains.slice(0, 6).map(m => (
                  <tr key={m.id || m.name}>
                    <td style={{ fontSize: '0.9em' }}>{m.name || m.id}</td>
                    <td><span className="badge blue">{m.provider || m.model?.split('/')[0] || '-'}</span></td>
                    <td>{m.temperature ?? m.params?.temperature ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {workflows.length > 0 && (
          <div className="card">
            <h2>🔄 LangGraph 工作流 ({workflows.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>节点数</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(w => (
                  <tr key={w.id || w.workflow_id}>
                    <td>{w.name}</td>
                    <td>{w.nodes?.length || w.node_count || '-'}</td>
                    <td style={{ fontSize: '0.9em', color: '#666' }}>{w.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {leaderboard.length > 0 && (
          <div className="card">
            <h2>🏆 成长榜 TOP 5</h2>
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>用户</th>
                  <th>成就数</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((u, i) => (
                  <tr key={u.user_id || i}>
                    <td style={{ fontWeight: 700, color: i < 3 ? '#fa8c16' : '#666' }}>#{i + 1}</td>
                    <td>{u.name || u.user_id}</td>
                    <td>{u.total_achievements || u.achievements || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {health && Object.keys(health).length > 0 && (
        <div className="card">
          <h2>💚 系统状态</h2>
          <div className="health-grid">
            {Object.entries(health).map(([key, val]) => {
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
              const isOk = str === 'ok' || str === 'true' || str === 'healthy' || val === true || val?.status === 'ok'
              const isWarn = str === 'warn' || val?.status === 'warn'
              return (
                <div className="health-item" key={key}>
                  <h3>{key}</h3>
                  <div className={`health-value ${isOk ? 'ok' : isWarn ? 'warn' : 'err'}`}>
                    {str.length > 30 ? str.slice(0, 30) + '...' : str}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
