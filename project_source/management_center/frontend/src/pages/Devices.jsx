import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cmdResult, setCmdResult] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [deviceDetail, setDeviceDetail] = useState(null)
  const [deviceLogs, setDeviceLogs] = useState([])

  const fetchDevices = () => {
    setLoading(true)
    axios.get('/api/admin/devices')
      .then(res => setDevices(res.data.data?.devices || res.data.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDevices() }, [])

  const handleCommand = async (deviceId, command, params = {}) => {
    setCmdResult({ deviceId, command, status: '发送中...' })
    try {
      const res = await axios.post(`/api/device/${deviceId}/control`, { command, params })
      setCmdResult({ deviceId, command, status: '成功', data: res.data.data })
    } catch (e) {
      setCmdResult({ deviceId, command, status: '失败', error: e.message })
    }
    setTimeout(() => setCmdResult(null), 5000)
  }

  const showDetail = async (deviceId) => {
    setSelectedDevice(deviceId)
    try {
      const [detailRes, logRes] = await Promise.all([
        axios.get(`/api/device/${deviceId}/status`),
        axios.get(`/api/device/${deviceId}/logs?limit=10`).catch(() => ({ data: { data: [] } }))
      ])
      setDeviceDetail(detailRes.data.data)
      setDeviceLogs(logRes.data.data || [])
    } catch (e) {
      setDeviceDetail(null)
      setError(e.message)
    }
  }

  if (loading) return <div className="loading">加载中...</div>

  const commands = ['switch_mode', 'set_volume', 'set_brightness', 'get_status', 'restart', 'wake_up']

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>设备管理</h1>
          <p>监控和管理所有机器人设备</p>
        </div>
        <button className="btn btn-primary" onClick={fetchDevices}>🔄 刷新</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {cmdResult && (
        <div style={{
          padding: '8px 16px', borderRadius: 8, marginBottom: 12,
          background: cmdResult.status === '成功' ? '#e6f7e6' : cmdResult.status === '发送中...' ? '#fff7e6' : '#fff1f0',
          color: cmdResult.status === '成功' ? '#52c41a' : cmdResult.status === '发送中...' ? '#fa8c16' : '#f5222d',
          fontSize: '0.9em'
        }}>
          [{cmdResult.deviceId}] {cmdResult.command}: {cmdResult.status}
          {cmdResult.data && ` - ${JSON.stringify(cmdResult.data).slice(0, 100)}`}
          {cmdResult.error && ` - ${cmdResult.error}`}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e6f7e6' }}>📶</div>
          <div className="stat-info">
            <h3>{devices.filter(d => d.status === 'online').length}</h3>
            <p>在线</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff1f0' }}>⚡</div>
          <div className="stat-info">
            <h3>{devices.filter(d => d.status === 'offline').length}</h3>
            <p>离线</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff7e6' }}>🔋</div>
          <div className="stat-info">
            <h3>{devices.length}</h3>
            <p>总计</p>
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>设备ID</th>
              <th>名称</th>
              <th>状态</th>
              <th>电量</th>
              <th>模式</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无设备</td></tr>
            ) : devices.map(d => (
              <tr key={d.device_id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{d.device_id}</td>
                <td>
                  <a href="#" onClick={(e) => { e.preventDefault(); showDetail(d.device_id) }}
                    style={{ color: '#667eea', textDecoration: 'none' }}>
                    {d.name || d.device_id}
                  </a>
                </td>
                <td><span className={`badge ${d.status === 'online' ? 'green' : d.status === 'offline' ? 'red' : 'orange'}`}>{d.status}</span></td>
                <td>
                  <span style={{ color: (d.battery || 0) < 20 ? '#f5222d' : (d.battery || 0) < 50 ? '#fa8c16' : '#52c41a' }}>
                    {d.battery != null ? `${d.battery}%` : '-'}
                  </span>
                </td>
                <td>{d.mode || '-'}</td>
                <td>
                  <select onChange={(e) => { if (e.target.value) handleCommand(d.device_id, e.target.value) }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d9d9d9' }}>
                    <option value="">命令...</option>
                    {commands.map(cmd => <option key={cmd} value={cmd}>{cmd}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDevice && deviceDetail && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>📊 {selectedDevice} 详情</h2>
            <button className="btn btn-sm" style={{ background: '#f0f2f5' }} onClick={() => setSelectedDevice(null)}>关闭</button>
          </div>
          <div className="health-grid">
            {Object.entries(deviceDetail).slice(0, 8).map(([key, val]) => (
              <div className="health-item" key={key}>
                <h3>{key}</h3>
                <div className="health-value" style={{ fontSize: '1.2em' }}>
                  {typeof val === 'object' ? JSON.stringify(val).slice(0, 30) : String(val)}
                </div>
              </div>
            ))}
          </div>
          {deviceLogs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>最近日志</h3>
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>命令</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceLogs.slice(0, 10).map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.85em', color: '#666' }}>{log.timestamp || '-'}</td>
                      <td>{log.command || log.action || '-'}</td>
                      <td style={{ fontSize: '0.9em', color: '#666' }}>{log.result || log.status || JSON.stringify(log).slice(0, 50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
