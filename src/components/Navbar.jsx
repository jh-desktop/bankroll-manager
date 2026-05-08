import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'

const links = [
  { path: '/',        label: '달력' },
  { path: '/status',  label: '현황' },
  { path: '/stats',   label: '그래프' },
  { path: '/users',   label: '사용자' },
  { path: '/history', label: '이력' },
]

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

export default function Navbar({ notifPermission, onEnableNotif }) {
  const { adminMode, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm } = useAdmin()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [enabling, setEnabling] = useState(false)

  const handleBell = async () => {
    if (isIOS && !isStandalone) {
      setShowIosGuide(true)
      return
    }
    setEnabling(true)
    await onEnableNotif()
    setEnabling(false)
  }

  const granted = notifPermission === 'granted'

  return (
    <>
      <nav className="navbar">
        <span className="nav-brand">💰 뱅크롤</span>
        <div className="nav-links">
          {links.map(l => (
            <NavLink
              key={l.path}
              to={l.path}
              end={l.path === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
          {!granted && (
            <button
              className="nav-link"
              onClick={handleBell}
              disabled={enabling}
              title="알림 허용"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '0.5rem', color: '#64748b', fontSize: '1rem',
                opacity: enabling ? 0.5 : 1,
              }}
            >
              🔔
            </button>
          )}
          <button
            className="nav-link"
            onClick={() => adminMode ? exitAdmin() : openModal()}
            style={{
              background: adminMode ? '#f59e0b22' : 'none',
              color: adminMode ? '#f59e0b' : '#64748b',
              border: 'none', cursor: 'pointer',
              borderRadius: '0.5rem',
            }}
          >
            🔑
          </button>
        </div>
      </nav>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <div className="modal-title">🔑 관리자 인증</div>
            <input
              className="input"
              type="password"
              placeholder="비밀번호"
              value={input}
              autoFocus
              onChange={e => { setInput(e.target.value); setErr(false) }}
              onKeyDown={e => e.key === 'Enter' && confirm()}
              style={{ border: err ? '1.5px solid #ef4444' : undefined, marginBottom: '0.4rem' }}
            />
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
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569' }}>
              iOS 16.4 이상 필요
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setShowIosGuide(false)}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}
