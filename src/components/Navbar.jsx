import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const links = [
  { path: '/',       label: '달력' },
  { path: '/status', label: '현황' },
  { path: '/stats',  label: '그래프' },
  { path: '/board',  label: '게시판' },
]
const adminLinks = [
  { path: '/users',   label: '사용자' },
  { path: '/history', label: '이력' },
  { path: '/admin',   label: '📢 알림' },
]

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

export default function Navbar({ notifPermission, onEnableNotif, onSignOut, onGoHome }) {
  const { adminMode, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm } = useAdmin()
  const { user } = useAuth()
  const { currentWs } = useWorkspace()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleBell = async () => {
    if (isIOS && !isStandalone) { setShowIosGuide(true); return }
    setEnabling(true)
    await onEnableNotif()
    setEnabling(false)
  }

  const granted = notifPermission === 'granted'

  return (
    <>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.9rem', padding: '2px 4px', flexShrink: 0 }} title="워크스페이스 홈">
            ←
          </button>
          <span className="nav-brand" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px', fontSize: '0.9rem' }} title={currentWs?.name}>
            {currentWs?.type === 'personal' ? '👤' : '👥'} {currentWs?.name ?? '뱅크롤'}
          </span>
        </div>
        <div className="nav-links">
          {links.map(l => (
            <NavLink key={l.path} to={l.path} end={l.path === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {l.label}
            </NavLink>
          ))}
          {adminMode && adminLinks.map(l => (
            <NavLink key={l.path} to={l.path}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              style={{ color: '#f59e0b' }}>
              {l.label}
            </NavLink>
          ))}

          {!granted && (
            <button className="nav-link" onClick={handleBell} disabled={enabling} title="알림 허용"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.5rem', color: '#64748b', fontSize: '1rem', opacity: enabling ? 0.5 : 1 }}>
              🔔
            </button>
          )}

          <button className="nav-link" onClick={() => adminMode ? exitAdmin() : openModal()}
            style={{ background: adminMode ? '#f59e0b22' : 'none', color: adminMode ? '#f59e0b' : '#64748b', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}>
            🔑
          </button>

          {user && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: '0.5rem' }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #00e5a0' }} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1e3a5f', border: '1.5px solid #00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#93c5fd' }}>
                      {user.displayName?.[0] ?? '?'}
                    </div>
                }
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.6rem', minWidth: 160, zIndex: 200, overflow: 'hidden' }}
                  onClick={() => setShowUserMenu(false)}>
                  <div style={{ padding: '0.65rem 0.875rem', borderBottom: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 700 }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button onClick={onSignOut}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <div className="modal-title">🔑 관리자 인증</div>
            <input className="input" type="password" placeholder="비밀번호" value={input} autoFocus
              onChange={e => { setInput(e.target.value); setErr(false) }}
              onKeyDown={e => e.key === 'Enter' && confirm()}
              style={{ border: err ? '1.5px solid #ef4444' : undefined, marginBottom: '0.4rem' }} />
            {err && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>비밀번호가 틀렸습니다.</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirm}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showIosGuide && (
        <div className="modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowIosGuide(false)}>✕</button>
            <div className="modal-title" style={{ fontSize: '1rem' }}>📱 아이폰 알림 설정</div>
            <div style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.7, marginTop: '0.5rem' }}>
              아이폰에서 알림을 받으려면:<br/>
              <strong style={{ color: '#e2e8f0' }}>1.</strong> Safari 하단 공유 버튼 탭<br/>
              <strong style={{ color: '#e2e8f0' }}>2.</strong> "홈 화면에 추가" 선택<br/>
              <strong style={{ color: '#e2e8f0' }}>3.</strong> 홈화면 아이콘으로 앱 열기<br/>
              <strong style={{ color: '#e2e8f0' }}>4.</strong> 🔔 버튼 눌러서 알림 허용
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569' }}>iOS 16.4 이상 필요</div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowIosGuide(false)}>확인</button>
          </div>
        </div>
      )}

      {showUserMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowUserMenu(false)} />
      )}
    </>
  )
}
