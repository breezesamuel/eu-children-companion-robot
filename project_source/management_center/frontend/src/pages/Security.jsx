import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Security() {
  const [status, setStatus] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('status')

  useEffect(() => {
    Promise.all([
      axios.get('/api/security/compliance'),
      axios.get('/api/security/audit-log'),
    ]).then(([s, a]) => {
      setStatus(s.data.data)
      setAuditLog(a.data.data || [])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中...</div>

  return (
    <div>
      <div className="page-header">
        <h1>安全管理</h1>
        <p>安全合规与审计</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tab-bar">
        <button className={`tab ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>安全状态</button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>审计日志</button>
      </div>

      {tab === 'status' && (
        <div className="card">
          <h2>安全合规状态</h2>
          {status ? (
            <div className="health-grid">
              {Object.entries(status).map(([key, val]) => (
                <div className="health-item" key={key}>
                  <h3>{key}</h3>
                  <div className={`health-value ${val === true || val === 'ok' || val === 'compliant' ? 'ok' : val === false || val === 'non-compliant' ? 'err' : 'warn'}`}>
                    {val === true ? '✅ 通过' : val === false ? '❌ 未通过' : String(val)}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{color:'#999'}}>暂无安全状态信息</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card">
          <h2>审计日志</h2>
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>操作</th>
                <th>用户</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign:'center',color:'#999',padding:40}}>暂无日志</td></tr>
              ) : auditLog.slice(0, 30).map((log, i) => (
                <tr key={i}>
                  <td style={{fontSize:'0.85em',color:'#666'}}>{log.timestamp || log.time || '-'}</td>
                  <td>{log.action || log.type || '-'}</td>
                  <td style={{fontFamily:'monospace',fontSize:'0.9em'}}>{log.user_id || '-'}</td>
                  <td style={{fontSize:'0.9em',color:'#666'}}>{log.detail || log.message || JSON.stringify(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
