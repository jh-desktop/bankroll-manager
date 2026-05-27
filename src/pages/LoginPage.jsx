import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signIn()
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('로그인에 실패했습니다. 다시 시도해주세요.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      {/* 배경 장식 */}
      <div className="login-deco login-deco-tl">♠</div>
      <div className="login-deco login-deco-tr">♥</div>
      <div className="login-deco login-deco-bl">♦</div>
      <div className="login-deco login-deco-br">♣</div>

      <div className="login-card">
        {/* 로고 */}
        <div className="login-logo">
          <div className="login-logo-icon">💰</div>
          <h1 className="login-title">그라인더</h1>
          <p className="login-sub">홀덤 뱅크롤 관리</p>
        </div>

        {/* 구분선 */}
        <div className="login-divider" />

        {/* 안내 문구 */}
        <div className="login-desc">
          로그인하면 내 기록을 직접 관리하고<br />
          개인 알림을 받을 수 있어요.
        </div>

        {/* 구글 로그인 */}
        <button
          className="login-google-btn"
          onClick={handleSignIn}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6.1C12.4 13 17.8 9.5 24 9.5z"/>
            <path fill="#34A853" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8-5.9z"/>
            <path fill="#EA4335" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 5.9C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          {loading ? '로그인 중…' : 'Google로 로그인'}
        </button>

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}
