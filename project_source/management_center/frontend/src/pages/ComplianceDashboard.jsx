import { useState, useEffect } from 'react'
import axios from 'axios'

export default function ComplianceDashboard() {
  const [gdpr, setGdpr] = useState({})
  const [coppa, setCoppa] = useState({})
  const [dsa, setDsa] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/compliance/gdpr').catch(() => ({ data: {} })),
      axios.get('/api/compliance/coppa').catch(() => ({ data: {} })),
      axios.get('/api/compliance/dsa').catch(() => ({ data: {} })),
    ]).then(([g, c, s]) => {
      setGdpr(g.data?.gdpr || g.data || {})
      setCoppa(c.data?.coppa || c.data || {})
      setDsa(s.data?.dsa || s.data || {})
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading">加载合规审计...</div>

  const gdprStatus = gdpr.status || 'unknown'
  const coppaStatus = coppa.status || 'unknown'
  const dsaStatus = dsa.status || 'unknown'

  const isOk = s => ['compliant', 'enabled', 'active'].includes(s)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🛡️ 合规审计仪表板</h1>
          <p>GDPR/COPPA/DSA 证据链 | 监管合规状态与违规告警</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>🔄 刷新</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2>GDPR 数据隐私</h2>
          <div className="health-check-grid">
            <div className={`health-check-item ${isOk(gdprStatus) ? 'pass' : 'fail'}`}>
              <div className="check-icon">{isOk(gdprStatus) ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>状态: {gdprStatus}</h4>
                <p>数据保留: {gdpr.retention_days || '—'} 天</p>
                <p>DPIA: {gdpr.dpia_done ? '是' : '否'}</p>
                <p>DPO 指定: {gdpr.dpo_name || '未指定'}</p>
                <p>跨境传输: {gdpr.international_transfer || '无'}</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>项目</th><th>状态</th><th>证据</th></tr></thead>
              <tbody>
                <tr><td>隐私政策链接</td><td>{gdpr.privacy_policy_url || '—'}</td><td><a href={gdpr.privacy_policy_url || '#'} target="_blank">查看</a></td></tr>
                <tr><td>Cookie 同意管理</td><td>{gdpr.cookie_consent || '未配置'}</td><td>{gdpr.cookie_consent_status || '—'}</td></tr>
                <tr><td>用户权请求</td><td>{gdpr.requests_handled || 0}</td><td>{gdpr.avg_resolution_days || '—'} 天</td></tr>
                <tr><td>数据泄露告警</td><td>{gdpr.breaches || 0}</td><td>{gdpr.last_breach || '从未'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>COPPA 儿童隐私</h2>
          <div className="health-check-grid">
            <div className={`health-check-item ${isOk(coppaStatus) ? 'pass' : 'fail'}`}>
              <div className="check-icon">{isOk(coppaStatus) ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>状态: {coppaStatus}</h4>
                <p>验证年龄: {coppa.age_verification || '未实施'}</p>
                <p>家长同意率: {coppa.parental_consent_rate || 0}%</p>
                <p>已获取验证: {coppa.verified_children || 0} 人</p>
                <p>数据最小化: {coppa.data_minimization || '—'}</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>项目</th><th>状态</th><th>证据</th></tr></thead>
              <tbody>
                <tr><td>年龄验证方式</td><td>{coppa.verification_method || '—'}</td><td>{coppa.verification_provider || '—'}</td></tr>
                <tr><td>家长邮件确认</td><td>{coppa.parent_email_confirm || '未配置'}</td><td>{coppa.parent_email_verified || '—'}</td></tr>
                <tr><td>COPPA 合规声明</td><td>{coppa.compliance_declaration || '—'}</td><td>{coppa.declaration_date || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>DSA 数字服务法</h2>
          <div className="health-check-grid">
            <div className={`health-check-item ${isOk(dsaStatus) ? 'pass' : 'fail'}`}>
              <div className="check-icon">{isOk(dsaStatus) ? '✅' : '❌'}</div>
              <div className="check-info">
                <h4>状态: {dsaStatus}</h4>
                <p>透明度报告: {dsa.transparency_report || '未发布'}</p>
                <p>内容 moderation: {dsa.content_moderation_policy || '—'}</p>
                <p>用户投诉处理: {dsa.complaints_handled || 0} 起</p>
                <p>算法审计: {dsa.algorithmic_audit || '未进行'}</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>项目</th><th>状态</th><th>证据</th></tr></thead>
              <tbody>
                <tr><td>DSA 版本</td><td>{dsa.version || '—'}</td><td>{dsa.last_update || '—'}</td></tr>
                <tr><td>非法内容移除</td><td>{dsa.illegal_removal || 0}</td><td>{dsa.last_removal || '—'}</td></tr>
                <tr><td>用户申诉比例</td><td>{dsa.appeal_ratio || 0}</td><td>{dsa.avg_resolution_days || '—'} 天</td></tr>
                <tr><td>跨境合规</td><td>{dsa.cross_border || '—'}</td><td>{dsa.eu_markets || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>总体合规评分</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: isOk(gdprStatus) && isOk(coppaStatus) && isOk(dsaStatus) ? '#059669' : '#dc2626' }}>
            {(isOk(gdprStatus) ? 33 : 0) + (isOk(coppaStatus) ? 33 : 33) + (isOk(dsaStatus) ? 33 : 0) / 3 | 0} / 100
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>合规得分</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          GDPR {gdprStatus}{'  |  '}COPPA {coppaStatus}{'  |  '}DSA {dsaStatus}
        </div>
      </div>
    </div>
  )
}