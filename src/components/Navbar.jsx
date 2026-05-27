import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const mainLinks = [
  { path: '/',       label: '달력', icon: '📅' },
  { path: '/status', label: '현황', icon: '📊' },
  { path: '/stats',  label: '그래프', icon: '📈' },
  { path: '/board',  label: '게시판', icon: '📋' },
]
const adminLinks = [
  { path: '/history', label: '이력', icon: '🕐' },
  { path: '/admin',   label: '알림', icon: '📢' },
]

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

export default function Navbar({ notifPermission, onEnableNotif, onSignOut, onGoHome }) {
  const { adminMode, isAdminUser, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm } = useAdmin()
  const { user } = useAuth()
  const { currentWs } = useWorkspace()
  const location = useLocation()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const granted = notifPermission === 'granted'

  const handleBell = async () => {
    if (isIOS && !isStandalone) { setShowIosGuide(true); return }
    setEnabling(true)
    await onEnableNotif()
    setEnabling(false)
  }

  const closeMobile = () => setShowMobileMenu(false)

  return (
    <>
      <nav className="navbar">
        {/* 왼쪽: 뒤로 + 워크스페이스명 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
          <button
            onClick={onGoHome}
            title="워크스페이스 홈"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-1)',
              fontSize: '1rem',
              fontWeight: 700,
              width: '32px', height: '32px',
              flexShrink: 0,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
          >
            ‹
          </button>
          <span className="nav-brand" title={currentWs?.name}>
            <span style={{ marginRight: '0.3rem', fontSize: '0.85rem' }}>{currentWs?.type === 'personal' ? '👤' : '👥'}</span>
            {currentWs?.name ?? '그라인더'}
          </span>
        </div>

        {/* 데스크톱 링크 */}
        <div className="nav-links nav-links-desktop">
          {mainLinks.map(l => (
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
            <button className="nav-link" onClick={handleBell} disabled={enabling}
              title="알림 허용"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', fontSize: '1rem', opacity: enabling ? 0.5 : 1 }}>
              🔔
            </button>
          )}

          {isAdminUser && (
            <button
              className="nav-link"
              onClick={() => adminMode ? exitAdmin() : openModal()}
              style={{ background: adminMode ? 'rgba(245,158,11,0.12)' : 'none', color: adminMode ? '#f59e0b' : 'var(--text-2)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
              🔑
            </button>
          )}

          {user && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #34d399' }} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--card-hi)', border: '1.5px solid #34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#34d399' }}>
                      {user.displayName?.[0] ?? '?'}
                    </div>
                }
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', minWidth: 168, zIndex: 200, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  onClick={() => setShowUserMenu(false)}>
                  <div style={{ padding: '0.65rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', fontWeight: 700 }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button onClick={onSignOut}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', background: 'none', border: 'none', color: 'var(--loss)', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모바일: 아바타 + 햄버거 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" className="nav-hamburger" style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #34d399', display: 'flex', cursor: 'default' }} />
                : null
              }
            </div>
          )}
          <button
            className={`nav-hamburger${showMobileMenu ? ' open' : ''}`}
            onClick={() => setShowMobileMenu(p => !p)}
            aria-label="메뉴"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={closeMobile}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-section">메뉴</div>
            {mainLinks.map(l => (
              <NavLink key={l.path} to={l.path} end={l.path === '/'}
                className={({ isActive }) => 'mobile-menu-link' + (isActive ? ' active' : '')}
                onClick={closeMobile}>
                <span style={{ fontSize: '1rem', width: '1.4rem' }}>{l.icon}</span>
                {l.label}
              </NavLink>
            ))}

            {adminMode && (
              <>
                <div className="mobile-menu-divider" />
                <div className="mobile-menu-section">관리자</div>
                {adminLinks.map(l => (
                  <NavLink key={l.path} to={l.path}
                    className={({ isActive }) => 'mobile-menu-link' + (isActive ? ' active' : '')}
                    style={{ color: '#f59e0b' }}
                    onClick={closeMobile}>
                    <span style={{ fontSize: '1rem', width: '1.4rem' }}>{l.icon}</span>
                    {l.label}
                  </NavLink>
                ))}
              </>
            )}

            <div className="mobile-menu-divider" />
            <div className="mobile-menu-bottom">
              {!granted && (
                <button onClick={() => { handleBell(); closeMobile() }} disabled={enabling}>
                  🔔 알림 허용
                </button>
              )}
              {isAdminUser && (
                <button
                  className={adminMode ? 'active' : ''}
                  onClick={() => { adminMode ? exitAdmin() : openModal(); closeMobile() }}>
                  🔑 {adminMode ? '관리자 OFF' : '관리자'}
                </button>
              )}
              <button className="danger" onClick={() => { onSignOut(); closeMobile() }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 비밀번호 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <div className="modal-title">🔑 관리자 인증</div>
            <input className="input" type="password" placeholder="비밀번호" value={input} autoFocus
              onChange={e => { setInput(e.target.value); setErr(false) }}
              onKeyDown={e => e.key === 'Enter' && confirm()}
              style={{ border: err ? '1.5px solid var(--loss)' : undefined, marginBottom: '0.4rem' }} />
            {err && <div style={{ color: 'var(--loss)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>비밀번호가 틀렸습니다.</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirm}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* iOS 안내 모달 */}
      {showIosGuide && (
        <div className="modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowIosGuide(false)}>✕</button>
            <div className="modal-title" style={{ fontSize: '1rem' }}>📱 아이폰 알림 설정</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.7, marginTop: '0.5rem' }}>
              아이폰에서 알림을 받으려면:<br />
              <strong style={{ color: 'var(--text-1)' }}>1.</strong> Safari 하단 공유 버튼 탭<br />
              <strong style={{ color: 'var(--text-1)' }}>2.</strong> "홈 화면에 추가" 선택<br />
              <strong style={{ color: 'var(--text-1)' }}>3.</strong> 홈화면 아이콘으로 앱 열기<br />
              <strong style={{ color: 'var(--text-1)' }}>4.</strong> 🔔 버튼 눌러서 알림 허용
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-3)' }}>iOS 16.4 이상 필요</div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowIosGuide(false)}>확인</button>
          </div>
        </div>
      )}

      {(showUserMenu || showMobileMenu) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => { setShowUserMenu(false) }} />
      )}
    </>
  )
}
