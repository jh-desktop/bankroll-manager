import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db } from '../firebase'
import { useAdmin } from '../context/AdminContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function AdminPage() {
  const { adminMode } = useAdmin()
  const { currentWs } = useWorkspace()
  const wsId = currentWs?.id

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [history, setHistory] = useState([])

  // 개인 발송
  const [tokenUsers, setTokenUsers] = useState([])
  const [selectedUid, setSelectedUid] = useState(null)
  const [indivTitle, setIndivTitle] = useState('')
  const [indivBody, setIndivBody] = useState('')
  const [indivSending, setIndivSending] = useState(false)
  const [indivSent, setIndivSent] = useState(false)

  // Excel export
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'admin_broadcasts'), orderBy('sentAt', 'desc'), limit(20))
    return onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  useEffect(() => {
    if (!adminMode) return
    getDocs(collection(db, 'bankroll_fcm_tokens')).then(snap => {
      const byUid = {}
      snap.docs.forEach(d => {
        const { uid, displayName, email } = d.data()
        if (!uid) return
        if (!byUid[uid]) byUid[uid] = { uid, displayName, email, count: 0 }
        byUid[uid].count++
      })
      setTokenUsers(Object.values(byUid))
    })
  }, [adminMode])

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
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      const data = await res.json()
      await addDoc(collection(db, 'admin_broadcasts'), {
        title: title.trim(), body: body.trim(),
        sentAt: new Date().toISOString(),
        sentCount: data.sent ?? 0, totalTokens: data.total ?? 0,
      })
      setSent(data.sent ?? 0)
      setTitle(''); setBody('')
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      alert('발송 실패: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const handleIndivSend = async () => {
    if (!selectedUid || !indivTitle.trim() || !indivBody.trim()) return
    setIndivSending(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: indivTitle.trim(), body: indivBody.trim(), targetUid: selectedUid }),
      })
      const data = await res.json()
      setIndivSent(data.sent ?? 0)
      setIndivTitle(''); setIndivBody('')
      setTimeout(() => setIndivSent(false), 3000)
    } catch (e) {
      alert('발송 실패: ' + e.message)
    } finally {
      setIndivSending(false)
    }
  }

  const handleExport = async () => {
    if (!wsId) { alert('워크스페이스를 선택해주세요'); return }
    setExporting(true)
    try {
      const [playersSnap, recordsSnap, historySnap] = await Promise.all([
        getDocs(collection(db, 'workspaces', wsId, 'players')),
        getDocs(collection(db, 'workspaces', wsId, 'records')),
        getDocs(collection(db, 'workspaces', wsId, 'history')),
      ])

      const wb = XLSX.utils.book_new()

      // 플레이어 시트
      const playersData = playersSnap.docs
        .map(d => d.data())
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(p => ({ '이름': p.name, '순서': p.order ?? 0 }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playersData), '플레이어')

      // 기록 시트
      const recordsData = recordsSnap.docs
        .map(d => d.data())
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        .map(r => ({
          '날짜': r.date ?? '',
          '이름': r.userName ?? '',
          '금액': r.amount ?? 0,
          '메모': r.note ?? '',
        }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recordsData), '기록')

      // 이력 시트
      const historyData = historySnap.docs
        .map(d => d.data())
        .sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0))
        .map(h => ({
          '일시': h.timestamp?.toDate().toLocaleString('ko-KR') ?? '',
          '이름': h.userName ?? '',
          '날짜': h.date ?? '',
          '동작': h.action === 'create' ? '생성' : h.action === 'update' ? '수정' : '삭제',
          '이전 금액': h.before?.amount ?? '',
          '이후 금액': h.after?.amount ?? '',
          '메모': h.after?.note || h.before?.note || '',
        }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData), '이력')

      const fileName = `${currentWs?.name ?? '뱅크롤'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (e) {
      alert('내보내기 실패: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-title">📢 알림 발송</div>

      {/* Excel 내보내기 */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
          데이터 내보내기
        </div>
        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          현재 워크스페이스 <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{currentWs?.name}</span>의<br />
          플레이어·기록·이력을 Excel로 내보냅니다.
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting || !wsId}
          style={{ width: '100%', background: 'linear-gradient(135deg, #065f46, #10b981)' }}
        >
          {exporting ? '내보내는 중…' : '📥 Excel 내보내기'}
        </button>
      </div>

      {/* 전체 발송 */}
      <div className="card">
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
          전체 유저 발송
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>알림 제목</label>
            <input className="input" placeholder="제목을 입력하세요" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>알림 내용</label>
            <textarea className="input" placeholder="내용을 입력하세요" value={body} onChange={e => setBody(e.target.value)}
              rows={3} maxLength={200} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem' }}>{body.length}/200</div>
          </div>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} style={{ width: '100%' }}>
            {sent !== false ? `✓ ${sent}명에게 발송 완료` : sending ? '발송 중…' : '📢 전체 유저에게 발송'}
          </button>
        </div>
      </div>

      {/* 개인 발송 */}
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
          개인 발송
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {tokenUsers.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.82rem' }}>알림 허용한 유저가 없습니다.</div>
          ) : tokenUsers.map(u => (
            <button key={u.uid} onClick={() => setSelectedUid(selectedUid === u.uid ? null : u.uid)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 0.875rem', borderRadius: '10px', cursor: 'pointer',
              border: `1px solid ${selectedUid === u.uid ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
              background: selectedUid === u.uid ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              textAlign: 'left', transition: 'all 0.15s',
            }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>{u.displayName ?? '이름 없음'}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{u.email ?? u.uid}</div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>토큰 {u.count}개</div>
            </button>
          ))}
        </div>

        {selectedUid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>알림 제목</label>
              <input className="input" placeholder="제목을 입력하세요" value={indivTitle} onChange={e => setIndivTitle(e.target.value)} maxLength={60} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>알림 내용</label>
              <textarea className="input" placeholder="내용을 입력하세요" value={indivBody} onChange={e => setIndivBody(e.target.value)}
                rows={3} maxLength={200} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem' }}>{indivBody.length}/200</div>
            </div>
            <button className="btn btn-primary" onClick={handleIndivSend}
              disabled={indivSending || !indivTitle.trim() || !indivBody.trim()}
              style={{ width: '100%', background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
              {indivSent !== false
                ? `✓ ${indivSent}개 기기에 발송 완료`
                : indivSending ? '발송 중…'
                : `📩 ${tokenUsers.find(u => u.uid === selectedUid)?.displayName ?? '선택된 유저'}에게 발송`}
            </button>
          </div>
        )}
      </div>

      {/* 발송 이력 */}
      {history.length > 0 && (
        <>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, margin: '1rem 0 0.5rem' }}>발송 이력</div>
          {history.map(item => (
            <div key={item.id} className="card" style={{ padding: '0.875rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>{item.body}</div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>
                    {item.sentAt ? new Date(item.sentAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
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
