import { useState } from 'react'
import axios from 'axios'

export default function QuizWidget({ skillId = 'math', userId = 'child_001' }) {
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startQuiz = async () => {
    setLoading(true)
    setResult(null)
    setAnswers({})
    try {
      const res = await axios.get(`/api/education/quiz/${skillId}?count=3`)
      const data = res.data.data
      if (data.questions && data.questions.length > 0) {
        setQuiz(data)
      } else {
        setQuiz({ questions: [
          { id: 1, question: '2+3=?', options: ['4','5','6','7'], correct: 1 },
          { id: 2, question: '4+4=?', options: ['6','7','8','9'], correct: 2 },
          { id: 3, question: '10-3=?', options: ['6','7','8','9'], correct: 1 },
        ]})
      }
    } catch (e) {
      setError(e.message)
      setQuiz({ questions: [
        { id: 1, question: '2+3=?', options: ['4','5','6','7'], correct: 1 },
        { id: 2, question: '4+4=?', options: ['6','7','8','9'], correct: 2 },
        { id: 3, question: '10-3=?', options: ['6','7','8','9'], correct: 1 },
      ]})
    }
    setLoading(false)
  }

  const submitQuiz = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/api/education/quiz/submit', {
        skill_id: skillId, user_id: userId, answers
      })
      setResult(res.data.data)
    } catch (e) {
      setResult({ score: Object.values(answers).filter((v, i) => v === quiz.questions[i]?.correct).length })
    }
    setLoading(false)
  }

  const selectAnswer = (qIdx, optIdx) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  return (
    <div className="card">
      <h2>📝 趣味测验 ({skillId})</h2>
      {!quiz ? (
        <button className="btn btn-primary" onClick={startQuiz} disabled={loading}>
          {loading ? '加载中...' : '开始测验'}
        </button>
      ) : result ? (
        <div>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: '3em', marginBottom: 10 }}>
              {result.score >= 80 ? '🎉' : result.score >= 50 ? '👍' : '💪'}
            </div>
            <h3>得分: {result.score}%</h3>
            <p style={{ color: '#666', marginTop: 8 }}>
              {result.message || (result.score >= 80 ? '太棒了！' : result.score >= 50 ? '继续加油！' : '再试一次！')}
            </p>
          </div>
          {result.details && result.details.map((d, i) => (
            <div key={i} style={{
              padding: '8px 12px', margin: '4px 0', borderRadius: 8,
              background: d.correct ? '#e6f7e6' : '#fff1f0',
              fontSize: '0.9em'
            }}>
              <strong>第{i+1}题：</strong>
              {d.correct ? '✅ 正确' : `❌ 错误 (正确答案: ${d.correct_answer})`}
            </div>
          ))}
          <button className="btn btn-primary" onClick={startQuiz} style={{ marginTop: 16 }}>
            再来一次
          </button>
        </div>
      ) : (
        <div>
          {quiz.questions.map((q, qi) => (
            <div key={qi} style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                第{qi+1}题: {q.question}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    className={`btn ${answers[qi] === oi ? 'btn-primary' : ''}`}
                    style={{
                      background: answers[qi] === oi ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f2f5',
                      color: answers[qi] === oi ? 'white' : '#333',
                      minWidth: 60
                    }}
                    onClick={() => selectAnswer(qi, oi)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn" style={{ background: '#f0f2f5' }} onClick={() => setQuiz(null)}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={submitQuiz}
              disabled={Object.keys(answers).length < quiz.questions.length || loading}
            >
              {loading ? '提交中...' : '提交答案'}
            </button>
          </div>
        </div>
      )}
      {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}
