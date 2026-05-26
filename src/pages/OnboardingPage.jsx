import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useNotification } from '../hooks/useNotification'

export default function OnboardingPage() {
  const { user } = useAuth()
  const { setupNewUser, createSharedWorkspace, joinWorkspace } = useWorkspace()
  const { permission, enable } = useNotification(user)

  const [step, setStep] = useState(0)
  const [wsName, setWsName] = useState(`${user?.displayName ?? '나'}의 뱅크롤`)
  const [sharedOption, setSharedOption] = useState('skip') // 'skip' | 'create' | 'join'
  const [sharedName, setSharedName] = useState('')
  const [joinKey, setJoinKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState(null)

  const handleNotifAndNext = async () => {
    if (permission === 'default') await enable().catch(() => {})
    setStep(1)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      await setupNewUser(wsName.trim() || `${user?.displayName}의 뱅크롤`)
      if (sharedOption === 'create' && sharedName.trim()) {
        const result = await createSharedWorkspace(sharedName.trim())
        if (result?.key) { setCreatedKey(result.key); return }
      } else if (sharedOption === 'join' && joinKey.trim()) {
        await joinWorkspace(joinKey)
      }
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (createdKey) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#e2e8f0', marginBottom: '0.5rem' }}>공용 방 생성 완료!</div>
          <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            아래 시크릿 코드를 팀원들에게 공유하세요.
          </div>
          <div style={{ background: '#0f172a', border: '2px dashed #f59e0b', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.35rem' }}>시크릿 코드</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '6px' }}>{createdKey}</div>
          </div>
          <button
            style={{ ...btnPrimary, width: '100%' }}
            onClick={() => navigator.clipboard.writeText(createdKey).then(() => setCreatedKey(null))}
          >
            📋 코드 복사 후 시작
          </button>
          <button style={{ ...btnGhost, width: '100%', marginTop: '0.5rem' }} onClick={() => setCreatedKey(null)}>
            그냥 시작하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {step === 0 ? (
        <div style={card}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💰</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#e2e8f0', marginBottom: '0.25rem' }}>
            안녕하세요, {user?.displayName}님!
          </div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            뱅크롤에 오신 것을 환영해요.<br />
            시작 전에 빠른 설정이 필요해요.
          </div>

          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>알림 설정</div>
            {permission === 'granted' ? (
              <div style={{ fontSize: '0.88rem', color: '#10b981' }}>✓ 알림이 허용되어 있습니다</div>
            ) : permission === 'denied' ? (
              <div style={{ fontSize: '0.88rem', color: '#64748b' }}>알림이 거부되어 있습니다 (설정에서 변경 가능)</div>
            ) : (
              <div style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
                달력 기록 시 팀원들에게 알림을 보낼 수 있어요.
              </div>
            )}
          </div>

          {permission === 'default' && (
            <button style={{ ...btnSecondary, width: '100%', marginBottom: '0.75rem' }} onClick={() => enable().catch(() => {})}>
              🔔 알림 허용하기
            </button>
          )}
          <button style={{ ...btnPrimary, width: '100%' }} onClick={handleNotifAndNext}>
            계속 →
          </button>
        </div>
      ) : (
        <div style={{ ...card, gap: '0' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#e2e8f0', marginBottom: '0.25rem' }}>워크스페이스 설정</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>나만의 개인 공간과 팀 공용 공간을 만들어요</div>

          {/* 개인 워크스페이스 이름 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>개인 뱅크롤 이름</label>
            <input
              style={inputStyle}
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              maxLength={30}
              placeholder="나만의 뱅크롤 이름"
            />
          </div>

          {/* 공용 방 옵션 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>공용 방 설정 (선택)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[
                { val: 'skip', label: '건너뛰기' },
                { val: 'create', label: '방 만들기' },
                { val: 'join', label: '코드로 참여' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setSharedOption(opt.val)}
                  style={{
                    flex: 1, padding: '0.5rem 0', borderRadius: '8px', fontSize: '0.8rem',
                    border: `1px solid ${sharedOption === opt.val ? '#f59e0b' : '#334155'}`,
                    background: sharedOption === opt.val ? 'rgba(245,158,11,0.12)' : '#1e293b',
                    color: sharedOption === opt.val ? '#f59e0b' : '#94a3b8',
                    cursor: 'pointer', fontWeight: sharedOption === opt.val ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sharedOption === 'create' && (
              <input
                style={inputStyle}
                value={sharedName}
                onChange={e => setSharedName(e.target.value)}
                placeholder="공용 방 이름 (예: 다이비하우스)"
                maxLength={30}
              />
            )}
            {sharedOption === 'join' && (
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
                value={joinKey}
                onChange={e => setJoinKey(e.target.value.toUpperCase())}
                placeholder="시크릿 코드 입력"
                maxLength={6}
              />
            )}
          </div>

          {error && <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}

          <button
            style={{ ...btnPrimary, width: '100%' }}
            onClick={handleFinish}
            disabled={loading || !wsName.trim() || (sharedOption === 'create' && !sharedName.trim()) || (sharedOption === 'join' && joinKey.length < 6)}
          >
            {loading ? '설정 중…' : '🚀 시작하기'}
          </button>
          <button style={{ ...btnGhost, width: '100%', marginTop: '0.5rem' }} onClick={() => setStep(0)}>
            ← 이전
          </button>
        </div>
      )}
    </div>
  )
}

const wrap = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px 16px', background: '#0a0f1e',
}
const card = {
  width: '100%', maxWidth: '360px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px', padding: '2rem 1.5rem',
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
}
const btnPrimary = {
  padding: '0.85rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff',
  fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
  transition: 'opacity 0.15s',
}
const btnSecondary = {
  padding: '0.75rem', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer',
  background: '#1e293b', color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'inherit',
}
const btnGhost = {
  padding: '0.65rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
  background: 'transparent', color: '#475569', fontSize: '0.85rem', fontFamily: 'inherit',
}
const labelStyle = {
  display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700,
  marginBottom: '0.4rem', textAlign: 'left',
}
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '0.7rem 0.875rem', color: '#e2e8f0', fontSize: '0.95rem',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
