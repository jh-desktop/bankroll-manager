import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useWorkspace } from '../context/WorkspaceContext'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'

const COLORS = ['#3b82f6','#a855f7','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4','#84cc16']
const toDateStr = (d) => d.toISOString().slice(0, 10)
const today = () => toDateStr(new Date())
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return toDateStr(d) }

const fmtAmt = (v) => {
  if (v === 0) return '$0'
  return (v > 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('ko-KR')
}
const fmtShort = (v) => {
  const abs = Math.abs(v)
  if (abs >= 1000000) return (v > 0 ? '+' : '-') + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 1000) return (v > 0 ? '+' : '-') + (abs / 1000).toFixed(0) + 'K'
  return (v > 0 ? '+' : '-') + abs
}

const CustomTooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{fmtAmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color: v >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmtAmt(v)}</div>
    </div>
  )
}

export default function StatsPage() {
  const { currentWs } = useWorkspace()
  const wsId = currentWs?.id
  const [users, setUsers] = useState([])
  const [records, setRecords] = useState([])
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [allTime, setAllTime] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    if (!wsId) return
    const q = query(collection(db, 'workspaces', wsId, 'members'), orderBy('joinedAt', 'asc'))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().displayName, ...d.data() }))
      setUsers(list)
      setSelectedUser(null)
      if (list.length > 0) setSelectedUser(list[0].id)
    })
  }, [wsId])

  useEffect(() => {
    if (!wsId) return
    return onSnapshot(collection(db, 'workspaces', wsId, 'records'), snap =>
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [wsId])

  const filtered = useMemo(() =>
    allTime ? records : records.filter(r => r.date >= from && r.date <= to),
    [records, from, to, allTime]
  )

  // 전체 날짜 목록 (오름차순)
  const allDates = useMemo(() =>
    [...new Set(filtered.map(r => r.date))].sort(),
    [filtered]
  )

  // 누적 손익 라인 차트 데이터 (사용자별 누적합)
  const lineData = useMemo(() => {
    const cum = {}
    users.forEach(u => cum[u.id] = 0)
    return allDates.map(date => {
      const point = { date: date.slice(5) } // MM-DD
      users.forEach(u => {
        const dayTotal = filtered
          .filter(r => r.userId === u.id && r.date === date)
          .reduce((s, r) => s + r.amount, 0)
        cum[u.id] += dayTotal
        point[u.id] = cum[u.id]
      })
      return point
    })
  }, [filtered, users, allDates])

  // 선택 유저 일별 손익 바 차트 데이터
  const barData = useMemo(() => {
    if (!selectedUser) return []
    return allDates.map(date => {
      const dayTotal = filtered
        .filter(r => r.userId === selectedUser && r.date === date)
        .reduce((s, r) => s + r.amount, 0)
      return { date: date.slice(5), amount: dayTotal }
    }).filter(d => d.amount !== 0)
  }, [filtered, selectedUser, allDates])

  // 선택 유저 요약
  const selectedStats = useMemo(() => {
    if (!selectedUser) return null
    const ur = filtered.filter(r => r.userId === selectedUser)
    const wins  = ur.filter(r => r.amount > 0)
    const losses = ur.filter(r => r.amount < 0)
    const net = ur.reduce((s, r) => s + r.amount, 0)
    const totalIn  = wins.reduce((s, r) => s + r.amount, 0)
    const totalOut = losses.reduce((s, r) => s + r.amount, 0)
    const total = totalIn + Math.abs(totalOut)
    return {
      net, totalIn, totalOut,
      winCount: wins.length, lossCount: losses.length, count: ur.length,
      winRate: total > 0 ? (totalIn / total * 100).toFixed(1) : '0.0',
    }
  }, [filtered, selectedUser])

  const userColor = (uid) => COLORS[users.findIndex(u => u.id === uid) % COLORS.length]
  const selectedUserName = users.find(u => u.id === selectedUser)?.name ?? ''

  if (users.length === 0) {
    return <div className="page"><div className="empty-state">사용자를 먼저 추가해주세요.</div></div>
  }

  return (
    <div className="page">
      <div className="page-title">손익 그래프</div>

      {/* 기간 필터 */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="input" style={{ flex: '1 1 120px' }}
            value={from} onChange={e => { setFrom(e.target.value); setAllTime(false) }} disabled={allTime} />
          <span style={{ color: '#475569', fontSize: '0.85rem' }}>~</span>
          <input type="date" className="input" style={{ flex: '1 1 120px' }}
            value={to} onChange={e => { setTo(e.target.value); setAllTime(false) }} disabled={allTime} />
          <button className="btn" onClick={() => setAllTime(p => !p)}
            style={{ padding: '0.55rem 0.875rem', fontSize: '0.8rem', border: '1px solid #334155', background: allTime ? '#3b82f6' : '#1e293b', color: allTime ? '#fff' : '#94a3b8' }}>
            전체
          </button>
        </div>
      </div>

      {/* ── 누적 손익 라인 차트 ── */}
      <div className="graph-card">
        <div className="graph-card-title">📈 누적 손익 추이 (전체)</div>
        {lineData.length < 2 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>데이터가 부족해요 (2일 이상 필요)</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={fmtShort} width={52} />
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltipLine />} />
              <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '0.5rem' }}
                formatter={(value) => users.find(u => u.id === value)?.name ?? value} />
              {users.map(u => (
                <Line key={u.id} dataKey={u.id} name={u.id}
                  stroke={userColor(u.id)} strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 사용자 선택 ── */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
        {users.map(u => (
          <button key={u.id}
            className="btn"
            onClick={() => setSelectedUser(u.id)}
            style={{
              padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: '1px solid',
              borderColor: selectedUser === u.id ? userColor(u.id) : '#334155',
              background: selectedUser === u.id ? userColor(u.id) + '22' : '#1e293b',
              color: selectedUser === u.id ? userColor(u.id) : '#94a3b8',
              fontWeight: selectedUser === u.id ? 700 : 400,
            }}>
            {u.name}
          </button>
        ))}
      </div>

      {/* ── 선택 유저 요약 ── */}
      {selectedStats && (
        <div className="graph-card" style={{ marginBottom: '0.875rem' }}>
          <div className="graph-card-title">👤 {selectedUserName} 요약</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="stat-chip">
              <div className="stat-chip-label">순손익</div>
              <div className={`stat-chip-val ${selectedStats.net >= 0 ? 'pos' : 'neg'}`}>{fmtAmt(selectedStats.net)}</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">수익 합계</div>
              <div className="stat-chip-val pos">+${selectedStats.totalIn.toLocaleString('ko-KR')}</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">손실 합계</div>
              <div className="stat-chip-val neg">-${Math.abs(selectedStats.totalOut).toLocaleString('ko-KR')}</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">수익 비율</div>
              <div className="stat-chip-val" style={{ color: '#f59e0b' }}>{selectedStats.winRate}%</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">총 기록</div>
              <div className="stat-chip-val" style={{ color: '#94a3b8' }}>{selectedStats.count}건</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 일별 손익 바 차트 ── */}
      <div className="graph-card">
        <div className="graph-card-title">📊 {selectedUserName} · 일별 손익</div>
        {barData.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>해당 기간에 기록이 없어요</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={fmtShort} width={52} />
              <ReferenceLine y={0} stroke="#334155" />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.amount >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
