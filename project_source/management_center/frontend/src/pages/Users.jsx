import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ user_id: '', name: '', age: 8, role: 'child', parent_id: '' })

  const fetchUsers = () => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (roleFilter) params.role = roleFilter
    axios.get('/api/admin/users', { params })
      .then(res => setUsers(res.data.data?.users || res.data.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [search, roleFilter])

  const handleCreate = async () => {
    try {
      await axios.post('/api/admin/users', form)
      setShowModal(false)
      setForm({ user_id: '', name: '', age: 8, role: 'child', parent_id: '' })
      fetchUsers()
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (userId) => {
    if (!confirm(`确定删除用户 ${userId}？`)) return
    try {
      await axios.delete(`/api/admin/users/${userId}`)
      fetchUsers()
    } catch (e) { setError(e.message) }
  }

  const roleColors = { admin: 'red', parent: 'blue', child: 'green' }

  return (
    <div>
      <div className="page-header">
        <h1>用户管理</h1>
        <p>管理所有注册用户</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="search-bar">
        <input placeholder="搜索用户..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="parent">家长</option>
          <option value="child">儿童</option>
        </select>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 添加用户</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>姓名</th>
                <th>年龄</th>
                <th>角色</th>
                <th>家长ID</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign:'center',color:'#999',padding:40}}>暂无用户</td></tr>
              ) : users.map(u => (
                <tr key={u.user_id}>
                  <td style={{fontFamily:'monospace',fontSize:'0.9em'}}>{u.user_id}</td>
                  <td>{u.name}</td>
                  <td>{u.age}</td>
                  <td><span className={`badge ${roleColors[u.role] || 'blue'}`}>{u.role}</span></td>
                  <td>{u.parent_id || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.user_id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>添加用户</h2>
            <div className="form-group">
              <label>用户ID</label>
              <input value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} placeholder="输入用户ID" />
            </div>
            <div className="form-group">
              <label>姓名</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="输入姓名" />
            </div>
            <div className="form-group">
              <label>年龄</label>
              <input type="number" value={form.age} onChange={e => setForm({...form, age: parseInt(e.target.value) || 0})} />
            </div>
            <div className="form-group">
              <label>角色</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="child">儿童</option>
                <option value="parent">家长</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div className="form-group">
              <label>家长ID（可选）</label>
              <input value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})} placeholder="输入家长用户ID" />
            </div>
            <div className="modal-actions">
              <button className="btn" style={{background:'#f0f2f5'}} onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
