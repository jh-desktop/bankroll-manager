import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db } from '../firebase'
import { useAdmin } from '../context/AdminContext'
import { useWorkspace } from '../context/WorkspaceContext'

const fmtAmt = (n) => {
  if (n === 0) return '$0'
  const abs = Math.abs(n).toLocaleString('ko-KR')
  return (n > 0 ? '+$' : '-$') + abs
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase', margin: '1.25rem 0 0.5rem' }}>
    {children}
  </div>
)

export default function AdminPage() {
  const { adminMode } = useAdmin()
  const { currentWs } = useWorkspace()
  const wsId = currentWs?.id

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [history, setHistory] = useState([])

  const [tokenUsers, setTokenUsers] = useState([])
  const [selectedUid, setSelectedUid] = useState(null)
  const [indivTitle, setIndivTitle] = useState('')
  const [indivBody, setIndivBody] = useState('')
  const [indivSending, setIndivSending] = useState(false)
  const [indivSent, setIndivSent] = useState(false)

  const [exporting, setExporting] = useState(false)

  // 워크스페이스 현황
  const [allWorkspaces, setAllWorkspaces] = useState([])
  const [expandedWs, setExpandedWs] = useState(null)
  const [wsDetails, setWsDetails] = useState({})

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

  useEffect(() => {
    if (!adminMode) return
    const q = query(collection(db, 'workspaces'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setAllWorkspaces(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [adminMode])

  const toggleWsExpand = async (id) => {
    if (expandedWs === id) { setExpandedWs(null); return }
    setExpandedWs(id)
    if (wsDetails[id] && !wsDetails[id].loading) return
    setWsDetails(prev => ({ ...prev, [id]: { loading: true } }))
    try {
      const [membersSnap, recordsSnap] = await Promise.all([
        getDocs(query(collection(db, 'workspaces', id, 'members'), orderBy('joinedAt', 'asc'))),
        getDocs(collection(db, 'workspaces', id, 'records')),
      ])
      const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const records = recordsSnap.docs.map(d => d.data())

      const totals = {}
      members.forEach(m => { totals[m.id] = { name: m.displayName, total: 0, count: 0 } })
      records.forEach(r => {
        if (!totals[r.userId]) totals[r.userId] = { name: r.userName, total: 0, count: 0 }
        totals[r.userId].total += r.amount ?? 0
        totals[r.userId].count++
      })

      const recentRecords = [...records]
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        .slice(0, 10)

      setWsDetails(prev => ({
        ...prev,
        [id]: { loading: false, members, totals, recentRecords, recordCount: records.length },
      }))
    } catch (e) {
      setWsDetails(prev => ({ ...prev, [id]: { loading: false, error: e.message } }))
    }
  }

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
      const [membersSnap, recordsSnap, historySnap] = await Promise.all([
        getDocs(collection(db, 'workspaces', wsId, 'members')),
        getDocs(collection(db, 'workspaces', wsId, 'records')),
        getDocs(collection(db, 'workspaces', wsId, 'history')),
      ])

      const wb = XLSX.utils.book_new()

      const playersData = membersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.joinedAt?.seconds ?? 0) - (b.joinedAt?.seconds ?? 0))
        .map(m => ({ '이름': m.displayName, '이메일': m.email ?? '', '역할': m.role === 'owner' ? '방장' : '멤버' }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playersData), '멤버')

      const recordsData = recordsSnap.docs
        .map(d => d.data())
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        .map(r => ({ '날짜': r.date ?? '', '이름': r.userName ?? '', '금액': r.amount ?? 0, '메모': r.note ?? '' }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recordsData), '기록')

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

  const sharedCount   = allWorkspaces.filter(w => w.type === 'shared').length
  const personalCount = allWorkspaces.filter(w => w.type === 'personal').length

  return (
    <div className="page">

      {/* ── 워크스페이스 현황 ── */}
      <SectionLabel>
        워크스페이스 현황
        <span style={{ fontWeight: 400, marginLeft: '0.5rem', textTransform: 'none' }}>
          전체 {allWorkspaces.length}개 (공용 {sharedCount} / 개인 {personalCount})
        </span>
      </SectionLabel>

      {allWorkspaces.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', padding: '1.5rem' }}>
          워크스페이스가 없습니다.
        </div>
      )}

      {allWorkspaces.map(ws => {
        const isExpanded = expandedWs === ws.id
        const detail     = wsDetails[ws.id]
        const isShared   = ws.type === 'shared'

        return (
          <div key={ws.id} className="card" style={{ marginBottom: '0.5rem', padding: 0, overflow: 'hidden' }}>
            {/* 헤더 */}
            <button onClick={() => toggleWsExpand(ws.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.875rem 1rem', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', flexShrink: 0,
                background: isShared ? 'rgba(168,85,247,0.18)' : 'rgba(59,130,246,0.18)',
                color: isShared ? '#c084fc' : '#60a5fa',
              }}>
                {isShared ? '공용' : '개인'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ws.name}
                </div>
                {isShared && ws.secretKey && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    코드: <span style={{ color: '#f59e0b', fontFamily: 'monospace', letterSpacing: '1px' }}>{ws.secretKey}</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {detail && !detail.loading && !detail.error && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    멤버 {detail.members.length} · 기록 {detail.recordCount}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: '#334155', marginTop: '2px' }}>
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>
            </button>

            {/* 상세 */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '0.875rem 1rem' }}>
                {!detail || detail.loading ? (
                  <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                    불러오는 중…
                  </div>
                ) : detail.error ? (
                  <div style={{ color: '#f87171', fontSize: '0.82rem' }}>{detail.error}</div>
                ) : (
                  <>
                    {/* 멤버별 합산 */}
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700,
                      letterSpacing: '0.4px', marginBottom: '0.45rem' }}>
                      멤버별 합산
                    </div>
                    {detail.members.length === 0 ? (
                      <div style={{ color: '#334155', fontSize: '0.82rem', marginBottom: '0.75rem' }}>멤버 없음</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {detail.members.map(m => {
                          const t = detail.totals[m.id]
                          return (
                            <div key={m.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.45rem 0.75rem', borderRadius: '8px',
                              background: 'rgba(255,255,255,0.04)',
                            }}>
                              <div>
                                <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
                                  {m.displayName}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#475569', marginLeft: '0.4rem' }}>
                                  {m.role === 'owner' ? '방장' : '멤버'}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {t?.count > 0 ? (
                                  <>
                                    <span style={{
                                      fontSize: '0.88rem', fontWeight: 700,
                                      color: t.total > 0 ? '#34d399' : t.total < 0 ? '#f87171' : '#94a3b8',
                                    }}>
                                      {fmtAmt(t.total)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#475569', marginLeft: '0.3rem' }}>
                                      ({t.count}건)
                                    </span>
                                  </>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#334155' }}>기록 없음</span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* 합계 */}
                        {detail.recordCount > 0 && (() => {
                          const grandTotal = Object.values(detail.totals).reduce((s, t) => s + t.total, 0)
                          return (
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.45rem 0.75rem', borderRadius: '8px',
                              background: 'rgba(74,142,255,0.08)',
                              border: '1px solid rgba(74,142,255,0.18)',
                            }}>
                              <span style={{ fontSize: '0.8rem', color: '#8aacc8', fontWeight: 700 }}>합계</span>
                              <span style={{
                                fontSize: '0.9rem', fontWeight: 700,
                                color: grandTotal > 0 ? '#34d399' : grandTotal < 0 ? '#f87171' : '#4a8eff',
                              }}>
                                {fmtAmt(grandTotal)}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* 최근 기록 */}
                    {detail.recentRecords.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700,
                          letterSpacing: '0.4px', marginBottom: '0.45rem' }}>
                          최근 기록 (최대 10건)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {detail.recentRecords.map((r, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.35rem 0.75rem', borderRadius: '6px',
                              background: 'rgba(255,255,255,0.025)',
                            }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 0 }}>
                                <span style={{ fontSize: '0.73rem', color: '#64748b', flexShrink: 0 }}>{r.date}</span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.userName}
                                </span>
                                {r.note && (
                                  <span style={{ fontSize: '0.7rem', color: '#475569',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    ({r.note})
                                  </span>
                                )}
                              </div>
                              <span style={{
                                fontSize: '0.82rem', fontWeight: 600, flexShrink: 0, marginLeft: '0.5rem',
                                color: r.amount > 0 ? '#34d399' : r.amount < 0 ? '#f87171' : '#94a3b8',
                              }}>
                                {fmtAmt(r.amount ?? 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {detail.recordCount === 0 && detail.members.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: '#334155', textAlign: 'center', padding: '0.5rem 0' }}>
                        아직 기록이 없습니다.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── 데이터 내보내기 ── */}
      <SectionLabel>데이터 내보내기</SectionLabel>
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          현재 워크스페이스 <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{currentWs?.name}</span>의<br />
          플레이어·기록·이력을 Excel로 내보냅니다.
        </div>
        <button className="btn btn-primary" onClick={handleExport}
          disabled={exporting || !wsId}
          style={{ width: '100%', background: 'linear-gradient(135deg, #065f46, #10b981)' }}>
          {exporting ? '내보내는 중…' : '📥 Excel 내보내기'}
        </button>
      </div>

      {/* ── 알림 발송 ── */}
      <SectionLabel>알림 발송</SectionLabel>
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
          <button className="btn btn-primary" onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()} style={{ width: '100%' }}>
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

      {/* ── 발송 이력 ── */}
      {history.length > 0 && (
        <>
          <SectionLabel>발송 이력</SectionLabel>
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
