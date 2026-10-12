import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const sections = [
  { key: 'system', label: '系统健康', icon: '💚', api: '/api/admin/system-health' },
  { key: 'edge', label: '边缘AI', icon: '🧠', api: '/api/edge-ai/stats' },
  { key: 'langchain', label: 'LangChain', icon: '🔗', api: '/api/langchain/models' },
  { key: 'workflows', label: '工作流', icon: '🔄', api: '/api/langgraph/workflows' },
  { key: 'sync', label: '数据同步', icon: '📡', api: '/api/sync/conflicts' },
  { key: 'security', label: '安全审计', icon: '🛡️', api: '/api/security/audit-log?limit=10' },
  { key: 'usage', label: '使用报告', icon: '📊', api: '/api/admin/usage-report' },
  { key: 'analytics', label: '内容分析', icon: '📈', api: '/api/admin/content-analytics' },
]

export default function SystemHealth() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('system')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef(null)

  const fetchData = () => {
    const section = sections.find(s => s.key === activeTab)
    if (!section) return
    setLoading(true)
    axios.get(section.api)
      .then(res => setData(res.data.data || {}))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeTab])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 10000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, activeTab])

  const refreshKey = Date.now()

  const renderValue = (val) => {
    if (val === null || val === undefined) return '-'
    if (typeof val === 'boolean') return val ? '✅ 是' : '❌ 否'
    if (typeof val === 'object') {
      if (Array.isArray(val)) return `[${val.length} 项]`
      const entries = Object.entries(val)
      if (entries.length === 0) return '{}'
      return entries.slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 20) : v}`).join(', ') + (entries.length > 3 ? '...' : '')
    }
    return String(val)
  }

  const getStatus = (val) => {
    if (val === null || val === undefined) return 'warn'
    const str = typeof val === 'object' ? (val.status || val.state || JSON.stringify(val)) : String(val)
    if (str === 'ok' || str === 'true' || str === 'healthy' || str === 'online' || str === 'running' || str === 'compliant' || val === true) return 'ok'
    if (str === 'warn' || str === 'degraded' || str === 'slow') return 'warn'
    if (str === 'error' || str === 'false' || str === 'offline' || str === 'non-compliant' || val === false) return 'err'
    return 'warn'
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>系统健康</h1>
          <p>各子系统运行状态</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9em', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            自动刷新 (10s)
          </label>
          <button className="btn btn-primary" onClick={fetchData}>🔄 刷新</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tab-bar">
        {sections.map(s => (
          <button key={s.key} className={`tab ${activeTab === s.key ? 'active' : ''}`} onClick={() => setActiveTab(s.key)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>{sections.find(s => s.key === activeTab)?.label}</h2>
          <span style={{ fontSize: '0.85em', color: '#999' }}>
            {Object.keys(data).length} 字段 · {loading ? '加载中...' : '已更新'}
          </span>
        </div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="health-grid">
            {Object.keys(data).length === 0 ? (
              <p style={{ color: '#999', gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>暂无数据</p>
            ) : (
              Object.entries(data).map(([key, val]) => {
                const status = getStatus(val)
                return (
                  <div className="health-item" key={key + refreshKey}>
                    <h3 title={key}>{key.length > 20 ? key.slice(0, 20) + '...' : key}</h3>
                    <div className={`health-value ${status}`} title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>
                      {renderValue(val)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
