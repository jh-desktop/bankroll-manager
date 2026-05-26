import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAdmin } from '../context/AdminContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function UsersPage() {
  const { adminMode, openModal } = useAdmin()
  const { currentWs } = useWorkspace()
  const wsId = currentWs?.id
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')

  useEffect(() => {
    if (!wsId) return
    const q = query(collection(db, 'workspaces', wsId, 'players'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [wsId])

  const addUser = async () => {
    const n = name.trim()
    if (!n || !adminMode || !wsId) return
    await addDoc(collection(db, 'workspaces', wsId, 'players'), {
      name: n, order: users.length, createdAt: serverTimestamp(),
    })
    setName('')
  }

  const deleteUser = async (id, uname) => {
    if (!adminMode || !wsId) return
    if (!confirm(`"${uname}" 사용자를 삭제하시겠습니까?\n해당 사용자의 기록도 함께 삭제하세요.`)) return
    await deleteDoc(doc(db, 'workspaces', wsId, 'players', id))
  }

  if (!adminMode) {
    return (
      <div className="page">
        <div className="page-title">사용자 관리</div>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
          <div style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>관리자 권한이 필요합니다.</div>
          <button className="btn btn-primary" onClick={openModal}>🔑 관리자 인증</button>
        </div>
        {/* 목록은 읽기 전용으로 표시 */}
        {users.length > 0 && (
          <div className="card">
            {users.map(u => (
              <div key={u.id} className="user-list-item">
                <div className="user-list-name">{u.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-title">사용자 관리 <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>· 관리자</span></div>

      <div className="card">
        <div className="row" style={{ marginBottom: users.length > 0 ? '1rem' : 0 }}>
          <input
            className="input"
            placeholder="이름 입력"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUser()}
          />
          <button className="btn btn-primary" onClick={addUser}>추가</button>
        </div>

        {users.map(u => (
          <div key={u.id} className="user-list-item">
            <div className="user-list-name">{u.name}</div>
            <button className="btn btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
              onClick={() => deleteUser(u.id, u.name)}>
              삭제
            </button>
          </div>
        ))}

        {users.length === 0 && (
          <div className="empty-state" style={{ padding: '1.5rem 0 0' }}>아직 사용자가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
