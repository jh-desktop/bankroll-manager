import { useState, useEffect } from 'react'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useNotification } from '../hooks/useNotification'

export default function WorkspaceHome({ onSignOut, notifPermission, onEnableNotif }) {
  const { user } = useAuth()
  const {
    workspaces, personalWsId, selectWorkspace,
    createSharedWorkspace, joinWorkspace, leaveWorkspace, deleteWorkspace,
    kickMember, regenerateKey, renameWorkspace,
  } = useWorkspace()

  const [showJoin, setShowJoin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [joinKey, setJoinKey] = useState('')
  const [createName, setCreateName] = useState('')
  const [createdKey, setCreatedKey] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Settings modal
  const [settingsWs, setSettingsWs] = useState(null) // workspace being configured
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [regenKey, setRegenKey] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // 삭제 확인 모달
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Load members when settings modal opens
  useEffect(() => {
    if (!settingsWs) { setMembers([]); return }
    setMembersLoading(true)
    setRenameVal(settingsWs.name)
    setRegenKey(null)
    getDocs(collection(db, 'workspaces', settingsWs.id, 'members')).then(snap => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
      setMembersLoading(false)
    })
  }, [settingsWs?.id])

  const handleJoin = async () => {
    if (!joinKey.trim()) return
    setActionLoading(true); setActionError('')
    try {
      await joinWorkspace(joinKey)
      setJoinKey(''); setShowJoin(false)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createName.trim()) return
    setActionLoading(true); setActionError('')
    try {
      const result = await createSharedWorkspace(createName.trim())
      setCreateName(''); setShowCreate(false)
      if (result?.key) setCreatedKey(result.key)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRename = async () => {
    if (!renameVal.trim() || !settingsWs) return
    setSettingsLoading(true)
    await renameWorkspace(settingsWs.id, renameVal.trim())
    setSettingsLoading(false)
  }

  const handleRegenKey = async () => {
    if (!settingsWs || !confirm('시크릿 코드를 재발급하면 기존 코드는 무효화됩니다. 계속하시겠습니까?')) return
    setSettingsLoading(true)
    const newKey = await regenerateKey(settingsWs.id)
    setRegenKey(newKey)
    setSettingsLoading(false)
  }

  const handleKick = async (uid, name) => {
    if (!confirm(`"${name}"을 방에서 내보내시겠습니까?`)) return
    setSettingsLoading(true)
    await kickMember(settingsWs.id, uid)
    setMembers(prev => prev.filter(m => m.uid !== uid))
    setSettingsLoading(false)
  }

  const handleLeave = async () => {
    if (!settingsWs || !confirm(`"${settingsWs.name}" 워크스페이스에서 나가시겠습니까?`)) return
    setSettingsLoading(true)
    await leaveWorkspace(settingsWs.id)
    setSettingsWs(null)
    setSettingsLoading(false)
  }

  const handleDeleteWorkspace = async () => {
    if (!settingsWs || deleteConfirmText !== '삭제합니다') return
    setDeleting(true)
    try {
      await deleteWorkspace(settingsWs.id)
      setSettingsWs(null)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  const isOwner = (ws) => ws.ownerId === user?.uid
  const isPersonal = (ws) => ws.id === personalWsId

  return (
    <div style={{ minHeight: '100dvh', background: '#192436', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>💰</span>
          <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>그라인더</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {notifPermission !== 'granted' && (
            <button onClick={onEnableNotif} style={iconBtn} title="알림 허용">🔔</button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #00e5a0' }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1e3a5f', border: '2px solid #00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#93c5fd' }}>
                    {user?.displayName?.[0] ?? '?'}
                  </div>
              }
            </button>
            {showUserMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowUserMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.6rem', minWidth: 160, zIndex: 200 }}>
                  <div style={{ padding: '0.65rem 0.875rem', borderBottom: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 700 }}>{user?.displayName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{user?.email}</div>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onSignOut() }}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
          내 워크스페이스 ({workspaces.length})
        </div>

        {workspaces.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#334155' }}>워크스페이스가 없습니다.</div>
        )}

        {/* Workspace cards */}
        {workspaces
          .sort((a, b) => {
            if (a.id === personalWsId) return -1
            if (b.id === personalWsId) return 1
            return 0
          })
          .map(ws => (
            <div key={ws.id} style={{
              background: isPersonal(ws)
                ? 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.06))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.06))',
              border: isPersonal(ws)
                ? '1.5px solid rgba(59,130,246,0.45)'
                : '1.5px solid rgba(245,158,11,0.45)',
              borderRadius: '16px', padding: '1rem 1.125rem', marginBottom: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              boxShadow: isPersonal(ws)
                ? '0 2px 16px rgba(59,130,246,0.12)'
                : '0 2px 16px rgba(245,158,11,0.12)',
            }}>
              <button
                onClick={() => selectWorkspace(ws)}
                style={{ flex: 1, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{isPersonal(ws) ? '👤' : '👥'}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e8f0' }}>{ws.name}</span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '999px',
                    background: isPersonal(ws) ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                    color: isPersonal(ws) ? '#93c5fd' : '#fbbf24',
                  }}>
                    {isPersonal(ws) ? '개인' : '공용'}
                  </span>
                  {isOwner(ws) && !isPersonal(ws) && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                      방장
                    </span>
                  )}
                </div>
                {ws.type === 'shared' && isOwner(ws) && ws.secretKey && (
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                    코드: <span style={{ color: '#f59e0b', fontWeight: 700, letterSpacing: '2px' }}>{ws.secretKey}</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => setSettingsWs(ws)}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#475569', cursor: 'pointer', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                title="설정"
              >
                ⚙️
              </button>
            </div>
          ))}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => { setShowCreate(true); setShowJoin(false); setActionError('') }} style={{ ...actionBtn, flex: 1 }}>
            + 공용 방 만들기
          </button>
          <button onClick={() => { setShowJoin(true); setShowCreate(false); setActionError('') }} style={{ ...actionBtn, flex: 1 }}>
            🔑 코드로 참여
          </button>
        </div>

        {/* Join form */}
        {showJoin && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>시크릿 코드 입력</div>
            <input
              style={{ ...formInput, textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
              value={joinKey} onChange={e => setJoinKey(e.target.value.toUpperCase())}
              placeholder="예: AB3K7P" maxLength={6}
            />
            {actionError && <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.4rem' }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={{ ...actionBtn, flex: 1 }} onClick={() => { setShowJoin(false); setJoinKey(''); setActionError('') }}>취소</button>
              <button style={{ ...joinBtn, flex: 1 }} onClick={handleJoin} disabled={actionLoading || joinKey.length < 6}>
                {actionLoading ? '…' : '참여'}
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>공용 방 이름</div>
            <input
              style={formInput} value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="예: 다이비하우스" maxLength={30}
            />
            {actionError && <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.4rem' }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={{ ...actionBtn, flex: 1 }} onClick={() => { setShowCreate(false); setCreateName(''); setActionError('') }}>취소</button>
              <button style={{ ...joinBtn, flex: 1 }} onClick={handleCreate} disabled={actionLoading || !createName.trim()}>
                {actionLoading ? '…' : '만들기'}
              </button>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="https://bankroll-manager-gamma.vercel.app/privacy"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.75rem', color: '#475569', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '1px' }}
          >
            개인정보처리방침
          </a>
        </div>
      </div>

      {/* Created key popup */}
      {createdKey && (
        <div style={overlay} onClick={() => setCreatedKey(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem' }}>🎉 공용 방 생성 완료!</div>
            <div style={{ background: '#0f172a', border: '2px dashed #f59e0b', borderRadius: '12px', padding: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.3rem' }}>시크릿 코드</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '6px' }}>{createdKey}</div>
            </div>
            <button style={{ ...joinBtn, width: '100%', marginBottom: '0.5rem' }}
              onClick={() => navigator.clipboard.writeText(createdKey).then(() => setCreatedKey(null))}>
              📋 코드 복사 후 닫기
            </button>
            <button style={{ ...actionBtn, width: '100%' }} onClick={() => setCreatedKey(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && settingsWs && (
        <div style={{ ...overlay, zIndex: 400 }} onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
          <div style={{ ...modal, maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f87171' }}>워크스페이스 삭제</div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '0.875rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.6 }}>
              <strong style={{ color: '#f87171' }}>"{settingsWs.name}"</strong> 워크스페이스와<br />
              모든 기록·이력·게시글이 <strong style={{ color: '#f87171' }}>영구 삭제</strong>됩니다.<br />
              이 작업은 되돌릴 수 없습니다.
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              확인을 위해 아래에 <strong style={{ color: '#f87171' }}>삭제합니다</strong> 를 입력하세요
            </div>
            <input
              style={{ ...formInput, border: deleteConfirmText === '삭제합니다' ? '1.5px solid #f87171' : '1.5px solid rgba(255,255,255,0.1)' }}
              placeholder="삭제합니다"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
              <button style={{ ...actionBtn, flex: 1 }} onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
                취소
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={deleteConfirmText !== '삭제합니다' || deleting}
                style={{
                  flex: 1, padding: '0.6rem 0.875rem', borderRadius: '10px', border: 'none',
                  cursor: deleteConfirmText === '삭제합니다' ? 'pointer' : 'not-allowed',
                  background: deleteConfirmText === '삭제합니다' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'rgba(239,68,68,0.2)',
                  color: deleteConfirmText === '삭제합니다' ? '#fff' : '#f87171',
                  fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
                  opacity: deleting ? 0.6 : 1, transition: 'all 0.15s',
                }}
              >
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsWs && (
        <div style={overlay} onClick={() => { setSettingsWs(null); setRegenKey(null) }}>
          <div style={{ ...modal, maxHeight: '80dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                {isPersonal(settingsWs) ? '👤' : '👥'} {settingsWs.name}
              </div>
              <button onClick={() => { setSettingsWs(null); setRegenKey(null) }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {/* Rename (owner only) */}
            {isOwner(settingsWs) && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={settingsLabel}>이름 변경</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={{ ...formInput, flex: 1 }} value={renameVal}
                    onChange={e => setRenameVal(e.target.value)} maxLength={30} />
                  <button style={{ ...joinBtn, padding: '0.6rem 0.875rem' }}
                    onClick={handleRename} disabled={settingsLoading || !renameVal.trim()}>
                    변경
                  </button>
                </div>
              </div>
            )}

            {/* Secret key management (shared workspace owner) */}
            {settingsWs.type === 'shared' && isOwner(settingsWs) && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={settingsLabel}>시크릿 코드</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.875rem', flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '4px' }}>
                      {regenKey ?? settingsWs.secretKey}
                    </span>
                  </div>
                  <button style={{ ...actionBtn, padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => navigator.clipboard.writeText(regenKey ?? settingsWs.secretKey)}>
                    복사
                  </button>
                </div>
                <button style={{ ...actionBtn, width: '100%', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={handleRegenKey} disabled={settingsLoading}>
                  🔄 코드 재발급
                </button>
              </div>
            )}

            {/* Members */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={settingsLabel}>멤버 {membersLoading ? '' : `(${members.length})`}</div>
              {membersLoading ? (
                <div style={{ color: '#475569', fontSize: '0.82rem' }}>불러오는 중…</div>
              ) : members.map(m => (
                <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {m.photoURL
                    ? <img src={m.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#93c5fd' }}>{m.displayName?.[0] ?? '?'}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: m.role === 'owner' ? 700 : 400 }}>
                      {m.displayName ?? '(이름 없음)'}
                      {m.role === 'owner' && <span style={{ fontSize: '0.65rem', color: '#fca5a5', marginLeft: '0.4rem' }}>방장</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#475569' }}>{m.email}</div>
                  </div>
                  {isOwner(settingsWs) && m.uid !== user?.uid && (
                    <button onClick={() => handleKick(m.uid, m.displayName)} disabled={settingsLoading}
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.75rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                      내보내기
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Leave (non-owner, non-personal) */}
            {!isPersonal(settingsWs) && !isOwner(settingsWs) && (
              <button style={{ ...actionBtn, width: '100%', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                onClick={handleLeave} disabled={settingsLoading}>
                나가기
              </button>
            )}

            {/* Delete (owner only, non-personal) */}
            {!isPersonal(settingsWs) && isOwner(settingsWs) && (
              <>
                <div style={{ borderTop: '1px solid rgba(239,68,68,0.2)', marginTop: '0.75rem', paddingTop: '0.75rem' }} />
                <button
                  style={{ ...actionBtn, width: '100%', color: '#f87171', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}
                  onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}
                  disabled={settingsLoading}
                >
                  🗑 워크스페이스 삭제
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem',
  padding: '0.25rem 0.4rem', borderRadius: '6px', color: '#64748b',
}
const actionBtn = {
  padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer',
  fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
}
const joinBtn = {
  padding: '0.6rem 0.875rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff',
  fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700, transition: 'opacity 0.15s',
}
const formInput = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '0.65rem 0.875rem', color: '#e2e8f0',
  fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
}
const modal = {
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px', padding: '1.25rem', width: '100%', maxWidth: '360px',
}
const settingsLabel = {
  fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px',
  marginBottom: '0.5rem', textTransform: 'uppercase',
}
