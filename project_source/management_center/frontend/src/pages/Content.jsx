import { useState, useEffect } from 'react'
import axios from 'axios'
import PlayWidget from '../components/PlayWidget'

export default function Content() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    axios.get('/api/entertainment/skills')
      .then(res => setItems(res.data.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? items.filter(i => i.type === filter) : items

  const typeIcons = { story: '📖', music: '🎵', game: '🎮', riddle: '🤔', quiz: '📝' }

  return (
    <div>
      <div className="page-header">
        <h1>内容管理</h1>
        <p>管理娱乐和学习内容库</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tab-bar">
        <button className={`tab ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>全部</button>
        <button className={`tab ${filter === 'story' ? 'active' : ''}`} onClick={() => setFilter('story')}>故事</button>
        <button className={`tab ${filter === 'music' ? 'active' : ''}`} onClick={() => setFilter('music')}>音乐</button>
        <button className={`tab ${filter === 'game' ? 'active' : ''}`} onClick={() => setFilter('game')}>游戏</button>
        <button className={`tab ${filter === 'quiz' ? 'active' : ''}`} onClick={() => setFilter('quiz')}>测验</button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <PlayWidget />
          <div className="content-grid">
            {filtered.length === 0 ? (
              <div style={{color:'#999',gridColumn:'1/-1',textAlign:'center',padding:40}}>暂无内容</div>
            ) : filtered.map(item => (
              <div className="content-card" key={item.content_id}>
                <div className="icon">{typeIcons[item.type] || '📄'}</div>
                <div className="title">{item.title}</div>
                <div className="type">{item.type}</div>
                {item.tags && <div style={{marginTop:8,display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center'}}>
                  {item.tags.map(t => <span key={t} style={{fontSize:'0.7em',background:'rgba(255,255,255,0.2)',padding:'2px 6px',borderRadius:4}}>{t}</span>)}
                </div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
