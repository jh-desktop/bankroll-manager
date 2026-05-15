import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import { useAuth } from '../context/AuthContext'

const links = [
  { path: '/',        label: '달력' },
  { path: '/status',  label: '현황' },
  { path: '/stats',   label: '그래프' },
  { path: '/users',   label: '사용자' },
  { path: '/history', label: '이력' },
]

const adminLinks = [
  { path: '/admin', label: '📢 알림발송' },
]

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

export default function Navbar({ notifPermission, onEnableNotif }) {
  const { adminMode, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm } = useAdmin()
  const { user, loading, signIn, signOut } = useAuth()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleBell = async () => {
    if (isIOS && !isStandalone) { setShowIosGuide(true); return }
    setEnabling(true)
    await onEnableNotif()
    setEnabling(false)
  }

  const handleSignIn = async () => {
    setSigningIn(true)
    try { await signIn() } catch (e) { void e }
    setSigningIn(false)
  }

  const granted = notifPermission === 'granted'

  return (
    <>
      <nav className="navbar">
        <span className="nav-brand">💰 뱅크롤</span>
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

          {/* 알림 버튼 */}
          {!granted && (
            <button className="nav-link" onClick={handleBell} disabled={enabling} title="알림 허용"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.5rem', color: '#64748b', fontSize: '1rem', opacity: enabling ? 0.5 : 1 }}>
              🔔
            </button>
          )}

          {/* 관리자 버튼 */}
          <button className="nav-link" onClick={() => adminMode ? exitAdmin() : openModal()}
            style={{ background: adminMode ? '#f59e0b22' : 'none', color: adminMode ? '#f59e0b' : '#64748b', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}>
            🔑
          </button>

          {/* 구글 로그인 / 프로필 */}
          {!loading && (
            user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowUserMenu(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 6px', borderRadius: '0.5rem' }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #00e5a0' }} />
                    : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1e3a5f', border: '1.5px solid #00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#93c5fd' }}>
                        {user.displayName?.[0] ?? '?'}
                      </div>
                  }
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName?.split(' ')[0] ?? '유저'}
                  </span>
                </button>
                {showUserMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', minWidth: 140, zIndex: 200, overflow: 'hidden' }}
                    onClick={() => setShowUserMenu(false)}>
                    <div style={{ padding: '0.6rem 0.875rem', borderBottom: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>{user.displayName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 2 }}>{user.email}</div>
                    </div>
                    <button onClick={signOut}
                      style={{ width: '100%', padding: '0.6rem 0.875rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={handleSignIn} disabled={signingIn}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.65rem', background: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', opacity: signingIn ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                <svg width="14" height="14" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6.1C12.4 13 17.8 9.5 24 9.5z"/>
                  <path fill="#34A853" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17z"/>
                  <path fill="#FBBC05" d="M10.5 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8-5.9-.0-.1z"/>
                  <path fill="#EA4335" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 5.9C6.7 42.6 14.7 48 24 48z"/>
                </svg>
                {signingIn ? '로그인 중…' : '구글 로그인'}
              </button>
            )
          )}
        </div>
      </nav>

      {/* 관리자 인증 모달 */}
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

      {/* iOS 가이드 모달 */}
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

      {/* 유저 메뉴 닫기 오버레이 */}
      {showUserMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowUserMenu(false)} />
      )}
    </>
  )
}
