import { useState } from 'react'
import axios from 'axios'

export default function PlayWidget({ userId = 'child_001' }) {
  const [queue, setQueue] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const play = async (contentId) => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await axios.post('/api/entertainment/play', {
        content_id: contentId, user_id: userId
      })
      setMessage({ type: 'success', text: `正在播放: ${res.data.data?.title || contentId}` })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  const toggleFav = async (contentId) => {
    try {
      const res = await axios.post('/api/entertainment/favorite', {
        user_id: userId, content_id: contentId
      })
      setMessage({ type: 'success', text: res.data.data?.message || '收藏已更新' })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const addToQueue = async (contentId) => {
    try {
      await axios.post('/api/entertainment/queue/add', {
        user_id: userId, content_id: contentId
      })
      loadQueue()
      setMessage({ type: 'success', text: '已加入播放队列' })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const loadQueue = async () => {
    try {
      const res = await axios.get(`/api/entertainment/queue/${userId}`)
      setQueue(res.data.data || [])
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="card">
      <h2>🎮 娱乐控制</h2>
      
      {message && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12,
          background: message.type === 'success' ? '#e6f7e6' : '#fff1f0',
          color: message.type === 'success' ? '#52c41a' : '#f5222d',
          fontSize: '0.9em'
        }}>
          {message.text}
        </div>
      )}

      <div className="tab-bar" style={{ marginBottom: 12 }}>
        <button className="tab active" onClick={() => setMessage(null)}>
          ▶ 播放
        </button>
        <button className="tab" onClick={() => { loadQueue(); setMessage(null) }}>
          📋 队列 ({queue.length})
        </button>
      </div>

      {queue.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>播放队列:</strong>
          {queue.map((item, i) => (
            <div key={i} style={{ padding: '4px 8px', fontSize: '0.9em', color: '#666' }}>
              {i+1}. {item.title || item.content_id || item}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => play('story_cinderella')} disabled={loading}>
          📖 灰姑娘
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => play('story_three_little_pigs')} disabled={loading}>
          🐷 三只小猪
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => play('music_twinkle')} disabled={loading}>
          ⭐ 小星星
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => play('game_riddle')} disabled={loading}>
          🤔 猜谜语
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => play('quiz_math_fun')} disabled={loading}>
          ➗ 趣味数学
        </button>
      </div>
    </div>
  )
}
