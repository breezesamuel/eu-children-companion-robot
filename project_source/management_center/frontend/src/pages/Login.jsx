import { useState } from 'react'
import axios from 'axios'
import { setToken } from '../api'

const box = { maxWidth: 360, margin: '80px auto', padding: 28, borderRadius: 12, background: '#111827', color: '#e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }
const field = { width: '100%', padding: '10px 12px', marginTop: 6, marginBottom: 14, borderRadius: 8, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb', boxSizing: 'border-box' }
const btn = { width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }

// Operator sign-in. The admin-gated console pages (用户/设备/学习/安全/系统健康)
// call /api/admin/*, which the backend protects with RBAC. A successful login
// stores the JWT that src/api.js attaches to every request.
export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await axios.post('/api/auth/login', { username, password })
      const d = (r.data && r.data.data) || {}
      const token = d.token || d.access_token
      if (!token) throw new Error(d.error || '服务器未返回 token')
      setToken(token)
      window.location.assign(import.meta.env.BASE_URL || '/console/')
    } catch (x) {
      const apiErr = x && x.response && x.response.data && (x.response.data.data || {}).error
      setErr(apiErr || x.message || '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form style={box} onSubmit={submit}>
      <h2 style={{ margin: '0 0 6px' }}>🔐 管理员登录</h2>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#9ca3af' }}>
        用户 / 设备 / 学习 / 安全 等管理页面需要管理员权限
      </p>
      <label style={{ fontSize: 13 }}>用户名
        <input style={field} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
      </label>
      <label style={{ fontSize: 13 }}>密码
        <input style={field} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {err && <p style={{ color: '#f87171', fontSize: 13, marginTop: -6 }}>{err}</p>}
      <button style={btn} type="submit" disabled={busy}>{busy ? '登录中…' : '登录'}</button>
    </form>
  )
}
