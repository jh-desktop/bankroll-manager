import { useEffect, useRef } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'
import Navbar from './components/Navbar'
import BroadcastBanner from './components/BroadcastBanner'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import WorkspaceHome from './pages/WorkspaceHome'
import CalendarPage from './pages/CalendarPage'
import StatusPage from './pages/StatusPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import AdminPage from './pages/AdminPage'
import BoardPage from './pages/BoardPage'
import PostDetailPage from './pages/PostDetailPage'
import { useNotification } from './hooks/useNotification'
import { useBroadcast } from './hooks/useBroadcast'
import './App.css'

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { wsLoading, isNewUser, currentWs, goHome } = useWorkspace()
  const { permission, enable } = useNotification(user ?? null)
  const { banner, dismiss } = useBroadcast()
  const exitingRef = useRef(false)

  // refs로 최신 값 유지 (popstate 핸들러가 클로저 문제 없이 참조)
  const currentWsRef = useRef(currentWs)
  const goHomeRef    = useRef(goHome)
  useEffect(() => { currentWsRef.current = currentWs }, [currentWs])
  useEffect(() => { goHomeRef.current    = goHome    }, [goHome])

  // 워크스페이스 진입 시 히스토리 스택 추가 → 백버튼이 WorkspaceHome으로 돌아올 수 있게
  useEffect(() => {
    if (currentWs) {
      window.history.pushState(null, '')
    }
  }, [currentWs?.id])

  // 안드로이드 백버튼 처리 (stable - refs 사용)
  useEffect(() => {
    window.history.pushState(null, '')
    const handlePopState = () => {
      if (exitingRef.current) { window.history.back(); return }
      if (currentWsRef.current) {
        // 워크스페이스 안 → WorkspaceHome으로
        goHomeRef.current()
        window.history.pushState(null, '')
        return
      }
      // WorkspaceHome에서 → 앱 종료 확인
      const exit = window.confirm('앱을 종료하시겠습니까?')
      if (!exit) { window.history.pushState(null, '') }
      else { exitingRef.current = true; window.history.back() }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  if (authLoading || wsLoading) return null
  if (!user) return <LoginPage />
  if (isNewUser) return <OnboardingPage />

  return (
    <MemoryRouter>
      {currentWs ? (
        <>
          <Navbar notifPermission={permission} onEnableNotif={enable} onSignOut={handleSignOut} onGoHome={goHome} />
          <BroadcastBanner banner={banner} onDismiss={dismiss} />
          <div className="nav-pt">
            <Routes>
              <Route path="/"          element={<CalendarPage />} />
              <Route path="/status"    element={<StatusPage />} />
              <Route path="/history"   element={<HistoryPage />} />
              <Route path="/stats"     element={<StatsPage />} />
              <Route path="/admin"     element={<AdminPage />} />
              <Route path="/board"     element={<BoardPage />} />
              <Route path="/board/:id" element={<PostDetailPage />} />
            </Routes>
          </div>
        </>
      ) : (
        <WorkspaceHome
          onSignOut={handleSignOut}
          notifPermission={permission}
          onEnableNotif={enable}
        />
      )}
    </MemoryRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AdminProvider>
          <AppInner />
        </AdminProvider>
      </WorkspaceProvider>
    </AuthProvider>
  )
}
