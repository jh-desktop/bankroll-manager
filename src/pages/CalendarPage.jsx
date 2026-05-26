import { useState, useEffect, useCallback } from 'react'
import {
  collection, doc, onSnapshot, query, where,
  deleteDoc, addDoc, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useWorkspace } from '../context/WorkspaceContext'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const fmt = (n) => {
  if (n === 0) return '$0'
  const abs = Math.abs(n).toLocaleString('ko-KR')
  return (n > 0 ? '+$' : '-$') + abs
}
const dateStr = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`

function getDays(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const total = new Date(year, month, 0).getDate()
  return { firstDay, total }
}

const COLORS = ['#3b82f6','#a855f7','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4','#84cc16']

export default function CalendarPage() {
  const { currentWs } = useWorkspace()
  const wsId = currentWs?.id
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [users, setUsers] = useState([])
  const [records, setRecords] = useState({}) // { date: { userId: [entries] } }
  const [selected, setSelected] = useState(null)
  const [addForm, setAddForm] = useState(null) // { userId, amount, note, amountErr }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!wsId) return
    const q = query(collection(db, 'workspaces', wsId, 'players'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [wsId])

  useEffect(() => {
    if (!wsId) return
    const q = query(
      collection(db, 'workspaces', wsId, 'records'),
      where('year', '==', year),
      where('month', '==', month),
    )
    return onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() }
        if (!map[data.date]) map[data.date] = {}
        if (!map[data.date][data.userId]) map[data.date][data.userId] = []
        map[data.date][data.userId].push(data)
      })
      setRecords(map)
    })
  }, [year, month])

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1) } else setMonth(m => m+1) }

  const selectDay = (day) => {
    const date = dateStr(year, month, day)
    setSelected(prev => prev === date ? null : date)
    setAddForm(null)
  }

  const sendNotification = (title, body) => {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    }).catch(() => {})
  }

  const addEntry = useCallback(async () => {
    if (!addForm || !selected) return
    const amount = parseFloat(addForm.amount)
    if (isNaN(amount)) {
      setAddForm(p => ({ ...p, amountErr: true }))
      setTimeout(() => setAddForm(p => p ? { ...p, amountErr: false } : p), 500)
      return
    }
    const user = users.find(u => u.id === addForm.userId)
    const [y, m, d] = selected.split('-').map(Number)
    const note = addForm.note.trim()

    setSaving(true)
    try {
      const ref = await addDoc(collection(db, 'workspaces', wsId, 'records'), {
        userId: user.id, userName: user.name,
        date: selected, year: y, month: m, day: d,
        amount, note,
        createdAt: serverTimestamp(),
      })
      await addDoc(collection(db, 'workspaces', wsId, 'history'), {
        recordId: ref.id, userId: user.id, userName: user.name, date: selected,
        action: 'create', before: null, after: { amount, note },
        timestamp: serverTimestamp(),
      })
      const fmtAmt = amount >= 0 ? `+$${amount.toLocaleString('ko-KR')}` : `-$${Math.abs(amount).toLocaleString('ko-KR')}`
      sendNotification(`${user.name} 기록`, `${selected} · ${fmtAmt}${note ? ` (${note})` : ''}`)
      setAddForm(null)
    } finally {
      setSaving(false)
    }
  }, [addForm, selected, users])

  const deleteEntry = useCallback(async (entryId, userId, entry) => {
    if (!confirm('삭제하시겠습니까?')) return
    const user = users.find(u => u.id === userId)
    await deleteDoc(doc(db, 'workspaces', wsId, 'records', entryId))
    await addDoc(collection(db, 'workspaces', wsId, 'history'), {
      recordId: entryId, userId, userName: user?.name, date: selected,
      action: 'delete',
      before: { amount: entry.amount, note: entry.note || '' },
      after: null,
      timestamp: serverTimestamp(),
    })
    sendNotification(`${user?.name} 삭제`, `${selected} 기록이 삭제됐습니다`)
  }, [users, selected])

  const { firstDay, total } = getDays(year, month)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  const todayStr = dateStr(today.getFullYear(), today.getMonth()+1, today.getDate())
  const userColor = (uid) => COLORS[users.findIndex(u => u.id === uid) % COLORS.length]

  const ranked = users.map(u => {
    const net = Object.values(records)
      .flatMap(dayRecs => Object.values(dayRecs).flat())
      .filter(r => r.userId === u.id)
      .reduce((s, r) => s + (r.amount || 0), 0)
    return { ...u, net }
  }).sort((a, b) => b.net - a.net)

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-month">{year}년 {month}월</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      {/* 요일 */}
      <div className="cal-grid" style={{ marginBottom: '3px' }}>
        {DAY_LABELS.map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>

      {/* 날짜 셀 */}
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="cal-cell empty" />
          const date = dateStr(year, month, day)
          const dayRecords = records[date] || {}
          const dow = (firstDay + day - 1) % 7
          const allEntries = Object.values(dayRecords).flat()
          const dayTotal = allEntries.reduce((s, r) => s + (r.amount || 0), 0)
          const userIds = Object.keys(dayRecords)
          const cls = ['cal-cell',
            dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
            date === todayStr ? 'today' : '',
            date === selected ? 'selected' : '',
          ].filter(Boolean).join(' ')

          return (
            <div key={day} className={cls} onClick={() => selectDay(day)}>
              <div className="cal-day">{day}</div>
              {allEntries.length > 0 && (
                <>
                  <div className="cal-dots">
                    {userIds.map(uid => (
                      <div key={uid} className="cal-dot" style={{ background: userColor(uid) }} />
                    ))}
                  </div>
                  <div className={`cal-total ${dayTotal >= 0 ? 'pos' : 'neg'}`}>
                    {fmt(dayTotal)}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 일별 상세 패널 */}
      {selected && (
        <div className="day-detail">
          <div className="day-detail-header">
            <span className="day-detail-date">
              {selected.replace(/(\d+)-(\d+)-(\d+)/, '$1년 $2월 $3일')}
            </span>
            <button className="day-detail-close" onClick={() => { setSelected(null); setAddForm(null) }}>✕</button>
          </div>

          {users.length === 0 && (
            <div className="empty-state" style={{ padding: '1rem' }}>사용자를 먼저 추가해주세요.</div>
          )}

          {users.map(user => {
            const userEntries = (records[selected]?.[user.id] || [])
              .slice().sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
            const userTotal = userEntries.reduce((s, e) => s + e.amount, 0)
            const isAdding = addForm?.userId === user.id

            return (
              <div key={user.id} className="day-detail-user">
                <div className="day-detail-user-header">
                  <span style={{ color: userColor(user.id), fontWeight: 700, fontSize: '0.875rem' }}>
                    {user.name}
                  </span>
                  {userEntries.length > 0 && (
                    <span className={`day-user-total ${userTotal >= 0 ? 'pos' : 'neg'}`}>
                      합계 {fmt(userTotal)}
                    </span>
                  )}
                </div>

                {userEntries.map(entry => (
                  <div key={entry.id} className="day-entry-row">
                    <span className={`day-entry-amt ${entry.amount >= 0 ? 'pos' : 'neg'}`}>
                      {fmt(entry.amount)}
                    </span>
                    {entry.note
                      ? <span className="day-entry-note">{entry.note}</span>
                      : <span className="day-entry-note" style={{ opacity: 0 }}>-</span>
                    }
                    <button className="day-entry-del" onClick={() => deleteEntry(entry.id, user.id, entry)}>
                      🗑
                    </button>
                  </div>
                ))}

                {isAdding ? (
                  <div className="day-add-form">
                    <div className="day-add-inputs">
                      <input
                        className={`input input-amount${addForm.amountErr ? ' input-error' : ''}`}
                        type="number"
                        placeholder="💰 금액 (+/-)"
                        value={addForm.amount}
                        autoFocus
                        onChange={e => setAddForm(p => ({ ...p, amount: e.target.value, amountErr: false }))}
                        onKeyDown={e => e.key === 'Enter' && addEntry()}
                      />
                      <input
                        className="input"
                        placeholder="메모 (선택)"
                        value={addForm.note}
                        onChange={e => setAddForm(p => ({ ...p, note: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addEntry()}
                      />
                    </div>
                    <div className="day-add-actions">
                      <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setAddForm(null)}>
                        취소
                      </button>
                      <button
                        className={`btn btn-primary${saving ? ' btn-saving' : ''}`}
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                        onClick={addEntry}
                      >
                        {saving && <span className="btn-spinner" />}
                        {saving ? '저장 중' : '저장'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="day-add-btn"
                    onClick={() => setAddForm({ userId: user.id, amount: '', note: '', amountErr: false })}
                  >
                    + 추가
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 이달 순위표 */}
      {users.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏆 {month}월 순위표
          </div>
          {ranked.map((u, i) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0.875rem',
              background: i === 0 ? 'linear-gradient(90deg,#1e293b,#1a2e1a)' : '#1e293b',
              borderRadius: '0.6rem', marginBottom: '0.4rem',
              border: `1px solid ${i === 0 ? '#4ade8044' : '#263045'}`,
            }}>
              <span style={{ fontSize: '1.2rem', width: '1.6rem', textAlign: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
              </span>
              <span style={{ flex: 1, fontWeight: 600, color: userColor(u.id), fontSize: '0.95rem' }}>{u.name}</span>
              <span style={{ fontWeight: 800, fontSize: '1rem' }} className={u.net >= 0 ? 'pos' : 'neg'}>
                {fmt(u.net)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
