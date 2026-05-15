import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAdmin } from '../context/AdminContext'

export default function AdminPage() {
  const { adminMode } = useAdmin()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [history, setHistory] = useState([])

  // 발송 이력 불러오기
  useEffect(() => {
    const q = query(
      collection(db, 'admin_broadcasts'),
      orderBy('sentAt', 'desc'),
      limit(20)
    )
    return onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  if (!adminMode) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
        <div style={{ color: '#64748b', fontSize: '0.95rem' }}>관리자 모드에서만 접근 가능합니다.</div>
        <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.5rem' }}>우측 상단 🔑 버튼으로 인증하세요.</div>
      </div>
    )
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    try {
      // FCM 푸시 발송 (앱 닫혀있어도 수신)
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      const data = await res.json()

      // Firestore에 이력 저장
      await addDoc(collection(db, 'admin_broadcasts'), {
        title: title.trim(),
        body: body.trim(),
        sentAt: new Date().toISOString(),
        sentCount: data.sent ?? 0,
        totalTokens: data.total ?? 0,
      })

      setSent(data.sent ?? 0)
      setTitle('')
      setBody('')
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      alert('발송 실패: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <div className="page-title">📢 알림 발송</div>

      {/* 작성 카드 */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              알림 제목
            </label>
            <input
              className="input"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              알림 내용
            </label>
            <textarea
              className="input"
              placeholder="내용을 입력하세요"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              maxLength={200}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem' }}>
              {body.length}/200
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            style={{ width: '100%' }}
          >
            {sent !== false ? `✓ ${sent}명에게 발송 완료` : sending ? '발송 중…' : '📢 전체 유저에게 발송'}
          </button>

          <div style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'center' }}>
            알림을 허용한 모든 유저에게 푸시 알림이 전송됩니다.
          </div>
        </div>
      </div>

      {/* 발송 이력 */}
      {history.length > 0 && (
        <>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>
            발송 이력
          </div>
          {history.map(item => (
            <div key={item.id} className="card" style={{ padding: '0.875rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {item.title}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {item.body}
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>
                    {item.sentAt ? new Date(item.sentAt).toLocaleString('ko-KR', {
                      month: 'numeric', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </div>
                  {item.sentCount != null && (
                    <div style={{ color: '#10b981', marginTop: '2px' }}>{item.sentCount}명 수신</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
