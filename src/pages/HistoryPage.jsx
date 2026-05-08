import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const fmt = (n) => {
  if (n === undefined || n === null) return '-'
  const abs = Math.abs(n).toLocaleString('ko-KR')
  return (n >= 0 ? '+$' : '-$') + abs
}

const ACTION_LABEL = { create: '생성', update: '수정', delete: '삭제' }
const ACTION_CLASS = { create: 'action-create', update: 'action-update', delete: 'action-delete' }

const PAGE_SIZE = 20

const toDateStr = (d) => d.toISOString().slice(0, 10)

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [nameFilter, setNameFilter] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [updateDate, setUpdateDate] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const q = query(collection(db, 'bankroll_history'), orderBy('timestamp', 'desc'))
    return onSnapshot(q, snap =>
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  useEffect(() => { setPage(1) }, [nameFilter, recordDate, updateDate])

  const filtered = history.filter(h => {
    if (nameFilter && !h.userName?.includes(nameFilter)) return false
    if (recordDate && h.date !== recordDate) return false
    if (updateDate) {
      const ts = h.timestamp?.toDate()
      if (!ts || toDateStr(ts) !== updateDate) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilter = nameFilter || recordDate || updateDate

  return (
    <div className="page">
      <div className="page-title">변경 이력</div>

      {/* 검색 필터 */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: '1 1 100px' }}
            placeholder="이름 검색"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
          />
          <input
            type="date"
            className="input"
            style={{ flex: '1 1 120px' }}
            value={recordDate}
            onChange={e => setRecordDate(e.target.value)}
            title="수정한 날짜"
          />
          <input
            type="date"
            className="input"
            style={{ flex: '1 1 120px' }}
            value={updateDate}
            onChange={e => setUpdateDate(e.target.value)}
            title="업데이트한 날짜"
          />
          {hasFilter && (
            <button
              className="btn"
              style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid #334155' }}
              onClick={() => { setNameFilter(''); setRecordDate(''); setUpdateDate('') }}
            >
              초기화
            </button>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
          {hasFilter ? `검색 결과 ${filtered.length}건` : `전체 ${history.length}건`}
          {totalPages > 1 && ` · ${page}/${totalPages} 페이지`}
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="empty-state">이력이 없습니다.</div>
      ) : (
        <>
          {paginated.map(h => {
            const ts = h.timestamp?.toDate()
            const timeStr = ts
              ? `${ts.getFullYear()}.${ts.getMonth()+1}.${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`
              : ''

            return (
              <div key={h.id} className="history-item">
                <span className={`history-action ${ACTION_CLASS[h.action]}`}>
                  {ACTION_LABEL[h.action]}
                </span>
                <div className="history-meta">
                  {h.userName} · {h.date} · {timeStr}
                </div>
                <div className="history-detail">
                  {h.action === 'create' && (
                    <span className="pos">{fmt(h.after?.amount)}{h.after?.note ? ` (${h.after.note})` : ''}</span>
                  )}
                  {h.action === 'update' && (
                    <>
                      <span className={h.before?.amount >= 0 ? 'pos' : 'neg'}>{fmt(h.before?.amount)}</span>
                      {h.before?.note ? ` (${h.before.note})` : ''}
                      <span className="history-arrow">→</span>
                      <span className={h.after?.amount >= 0 ? 'pos' : 'neg'}>{fmt(h.after?.amount)}</span>
                      {h.after?.note ? ` (${h.after.note})` : ''}
                    </>
                  )}
                  {h.action === 'delete' && (
                    <span className="neg">{fmt(h.before?.amount)}{h.before?.note ? ` (${h.before.note})` : ''} 삭제됨</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', paddingBottom: '1rem' }}>
              <button
                className="btn"
                style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem', border: '1px solid #334155', color: page === 1 ? '#334155' : '#94a3b8' }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ color: '#475569', lineHeight: '2.2' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className="btn"
                      style={{
                        padding: '0.45rem 0.75rem', fontSize: '0.85rem',
                        border: '1px solid #334155',
                        background: p === page ? '#3b82f6' : 'transparent',
                        color: p === page ? '#fff' : '#94a3b8',
                      }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                className="btn"
                style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem', border: '1px solid #334155', color: page === totalPages ? '#334155' : '#94a3b8' }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
