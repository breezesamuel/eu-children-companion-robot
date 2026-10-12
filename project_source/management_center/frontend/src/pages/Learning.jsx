import { useState, useEffect } from 'react'
import axios from 'axios'
import QuizWidget from '../components/QuizWidget'

export default function Learning() {
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSubject, setActiveSubject] = useState('math')

  useEffect(() => {
    Promise.all([
      axios.get('/api/learning/courses'),
      axios.get('/api/admin/stats'),
    ]).then(([c, s]) => {
      setCourses(c.data.data || [])
      setStats(s.data.data)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中...</div>

  const subjectIcons = { math: '🔢', english: '🌍', chinese: '📝', science: '🔬', history: '📜', geography: '🌏', art: '🎨' }

  return (
    <div>
      <div className="page-header">
        <h1>学习管理</h1>
        <p>课程管理和趣味测验</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#e6f0ff'}}>📚</div>
          <div className="stat-info">
            <h3>{courses.length}</h3>
            <p>课程总数</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#e6f7e6'}}>👨‍🎓</div>
          <div className="stat-info">
            <h3>{stats?.total_users || 0}</h3>
            <p>学生总数</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#fff7e6'}}>📊</div>
          <div className="stat-info">
            <h3>{stats?.avg_age || '-'}</h3>
            <p>平均年龄</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2>课程列表</h2>
          <select value={activeSubject} onChange={e => setActiveSubject(e.target.value)}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid #d9d9d9'}}>
            <option value="">全部科目</option>
            <option value="math">数学</option>
            <option value="english">英语</option>
            <option value="chinese">语文</option>
            <option value="science">科学</option>
            <option value="history">历史</option>
            <option value="geography">地理</option>
            <option value="art">艺术</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>课程</th>
              <th>科目</th>
              <th>年级</th>
              <th>课时</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody>
            {(courses.length === 0 ? [] : courses.filter(c => !activeSubject || c.subject === activeSubject)).length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center',color:'#999',padding:40}}>暂无课程</td></tr>
            ) : courses.filter(c => !activeSubject || c.subject === activeSubject).map(c => (
              <tr key={c.id}>
                <td>{subjectIcons[c.subject] || '📄'} {c.name || c.title}</td>
                <td><span className="badge purple">{c.subject}</span></td>
                <td>{c.grade || c.grade_level || '-'}</td>
                <td>{c.lessons || c.total_lessons || '-'}</td>
                <td style={{color:'#666',fontSize:'0.9em'}}>{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuizWidget skillId={activeSubject || 'math'} />
    </div>
  )
}
