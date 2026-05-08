import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

const fmt = (n) => {
  const abs = Math.abs(n).toLocaleString('ko-KR')
  return (n >= 0 ? '+$' : '-$') + abs
}
const COLORS = ['#3b82f6','#a855f7','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4','#84cc16']

const toDateStr = (d) => d.toISOString().slice(0, 10)
const today = () => toDateStr(new Date())
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return toDateStr(d) }

// entries[] → { date: entries[] }[], 날짜 최신순
const groupByDate = (entries) => {
  const map = {}
  entries.forEach(r => {
    if (!map[r.date]) map[r.date] = []
    map[r.date].push(r)
  })
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function StatusPage() {
  const [users, setUsers] = useState([])
  const [records, setRecords] = useState([])
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [allTime, setAllTime] = useState(false)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'bankroll_users'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'bankroll_records'), snap =>
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const toggleExpand = (uid) => setExpanded(p => ({ ...p, [uid]: !p[uid] }))

  const filtered = allTime ? records : records.filter(r => r.date >= from && r.date <= to)

  const stats = users.map((user, idx) => {
    const ur = filtered.filter(r => r.userId === user.id)
    const wins   = ur.filter(r => r.amount > 0)
    const losses = ur.filter(r => r.amount < 0)
    const totalIn  = wins.reduce((s, r) => s + r.amount, 0)
    const totalOut = losses.reduce((s, r) => s + r.amount, 0)
    const net = totalIn + totalOut
    const absIn = totalIn, absOut = Math.abs(totalOut), total = absIn + absOut
    const posW = total > 0 ? (absIn / total) * 100 : 0
    const negW = total > 0 ? (absOut / total) * 100 : 0
    return {
      ...user,
      net, totalIn, totalOut, posW, negW,
      winGroups: groupByDate(wins),
      lossGroups: groupByDate(losses),
      winCount: wins.length,
      lossCount: losses.length,
      count: ur.length,
      color: COLORS[idx % COLORS.length],
    }
  })

  if (users.length === 0) {
    return <div className="page"><div className="empty-state">사용자를 먼저 추가해주세요.</div></div>
  }

  return (
    <div className="page">
      <div className="page-title">사용자별 현황</div>

      {/* 기간 필터 */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="input" style={{ flex: '1 1 120px' }}
            value={from} onChange={e => { setFrom(e.target.value); setAllTime(false) }} disabled={allTime} />
          <span style={{ color: '#475569', fontSize: '0.85rem' }}>~</span>
          <input type="date" className="input" style={{ flex: '1 1 120px' }}
            value={to} onChange={e => { setTo(e.target.value); setAllTime(false) }} disabled={allTime} />
          <button className="btn"
            style={{ padding: '0.55rem 0.875rem', fontSize: '0.8rem', background: allTime ? '#3b82f6' : '#1e293b', color: allTime ? '#fff' : '#94a3b8', border: '1px solid #334155' }}
            onClick={() => setAllTime(p => !p)}>
            전체
          </button>
        </div>
        {!allTime && (
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
            {from} ~ {to} · {filtered.length}건
          </div>
        )}
      </div>

      {stats.map(s => (
        <div key={s.id} className="status-card">
          <div className="status-name" style={{ color: s.color }}>{s.name}</div>
          <div className={`status-balance ${s.net >= 0 ? 'pos' : 'neg'}`}>{fmt(s.net)}</div>

          <div className="status-stats">
            <div className="stat-item">
              <div className="stat-label">수익 합계</div>
              <div className="stat-val pos">+${s.totalIn.toLocaleString('ko-KR')}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{s.winCount}건</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">손실 합계</div>
              <div className="stat-val neg">-${Math.abs(s.totalOut).toLocaleString('ko-KR')}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{s.lossCount}건</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">총 기록</div>
              <div className="stat-val" style={{ color: '#94a3b8' }}>{s.count}건</div>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-pos" style={{ width: `${s.posW}%` }} />
            <div className="progress-neg" style={{ width: `${s.negW}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>수익 {s.posW.toFixed(0)}%</span>
            <span style={{ fontSize: '0.7rem', color: '#f87171' }}>손실 {s.negW.toFixed(0)}%</span>
          </div>

          {s.count > 0 && (
            <>
              <button className="detail-toggle" onClick={() => toggleExpand(s.id)}>
                세부 내역 {expanded[s.id] ? '▲' : '▼'}
              </button>

              {expanded[s.id] && (
                <div className="detail-body">

                  {/* ✅ 수익 내역 */}
                  {s.winGroups.length > 0 && (
                    <div className="detail-group">
                      <div className="detail-group-label pos">
                        <span>✅ 수익 내역</span>
                        <span className="detail-group-sum">
                          합계 +${s.totalIn.toLocaleString('ko-KR')} · {s.winCount}건
                        </span>
                      </div>
                      {s.winGroups.map(([date, entries]) => {
                        const daySum = entries.reduce((a, r) => a + r.amount, 0)
                        return (
                          <div key={date} className="detail-date-group">
                            <div className="detail-date-header">
                              <span className="detail-date-label">{date}</span>
                              {entries.length > 1 && (
                                <span className="detail-date-sum pos">소계 +${daySum.toLocaleString('ko-KR')}</span>
                              )}
                            </div>
                            {entries.map(r => (
                              <div key={r.id} className="detail-row">
                                <span className="detail-amt pos">+${r.amount.toLocaleString('ko-KR')}</span>
                                <span className="detail-note">{r.note || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ❌ 손실 내역 */}
                  {s.lossGroups.length > 0 && (
                    <div className="detail-group">
                      <div className="detail-group-label neg">
                        <span>❌ 손실 내역</span>
                        <span className="detail-group-sum">
                          합계 -${Math.abs(s.totalOut).toLocaleString('ko-KR')} · {s.lossCount}건
                        </span>
                      </div>
                      {s.lossGroups.map(([date, entries]) => {
                        const daySum = entries.reduce((a, r) => a + r.amount, 0)
                        return (
                          <div key={date} className="detail-date-group">
                            <div className="detail-date-header">
                              <span className="detail-date-label">{date}</span>
                              {entries.length > 1 && (
                                <span className="detail-date-sum neg">소계 -${Math.abs(daySum).toLocaleString('ko-KR')}</span>
                              )}
                            </div>
                            {entries.map(r => (
                              <div key={r.id} className="detail-row">
                                <span className="detail-amt neg">-${Math.abs(r.amount).toLocaleString('ko-KR')}</span>
                                <span className="detail-note">{r.note || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
