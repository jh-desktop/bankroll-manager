import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import Navbar from './components/Navbar'
import BroadcastBanner from './components/BroadcastBanner'
import LoginPage from './pages/LoginPage'
import CalendarPage from './pages/CalendarPage'
import StatusPage from './pages/StatusPage'
import UsersPage from './pages/UsersPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import AdminPage from './pages/AdminPage'
import { useNotification } from './hooks/useNotification'
import { useBroadcast } from './hooks/useBroadcast'
import './App.css'

function AppInner() {
  const { user, loading } = useAuth()
  const { permission, enable } = useNotification(user?.uid ?? null)
  const { banner, dismiss } = useBroadcast()
  const exitingRef = useRef(false)

  // 비로그인으로 계속하기를 선택했는지 (세션 유지)
  const [skipped, setSkipped] = useState(
    () => sessionStorage.getItem('login_skipped') === 'true'
  )

  const handleSkip = () => {
    sessionStorage.setItem('login_skipped', 'true')
    setSkipped(true)
  }

  useEffect(() => {
    window.history.pushState(null, '')
    const handlePopState = () => {
      if (exitingRef.current) { window.history.back(); return }
      const exit = window.confirm('앱을 종료하시겠습니까?')
      if (!exit) { window.history.pushState(null, '') }
      else { exitingRef.current = true; window.history.back() }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 로딩 중
  if (loading) return null

  // 비로그인이고 스킵도 안 했으면 로그인 페이지
  if (!user && !skipped) {
    return <LoginPage onSkip={handleSkip} />
  }

  return (
    <BrowserRouter>
      <Navbar notifPermission={permission} onEnableNotif={enable} />
      <BroadcastBanner banner={banner} onDismiss={dismiss} />
      <div className="nav-pt">
        <Routes>
          <Route path="/"        element={<CalendarPage />} />
          <Route path="/status"  element={<StatusPage />} />
          <Route path="/users"   element={<UsersPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats"   element={<StatsPage />} />
          <Route path="/admin"   element={<AdminPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <AppInner />
      </AdminProvider>
    </AuthProvider>
  )
}
