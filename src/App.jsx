import { useEffect, useRef } from 'react'
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
import BoardPage from './pages/BoardPage'
import PostDetailPage from './pages/PostDetailPage'
import { useNotification } from './hooks/useNotification'
import { useBroadcast } from './hooks/useBroadcast'
import './App.css'

function AppInner() {
  const { user, loading, signOut } = useAuth()
  const { permission, enable } = useNotification(user ?? null)
  const { banner, dismiss } = useBroadcast()
  const exitingRef = useRef(false)

  const handleSignOut = async () => {
    await signOut()
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

  if (!user) {
    return <LoginPage />
  }

  return (
    <BrowserRouter>
      <Navbar notifPermission={permission} onEnableNotif={enable} onSignOut={handleSignOut} />
      <BroadcastBanner banner={banner} onDismiss={dismiss} />
      <div className="nav-pt">
        <Routes>
          <Route path="/"        element={<CalendarPage />} />
          <Route path="/status"  element={<StatusPage />} />
          <Route path="/users"   element={<UsersPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats"   element={<StatsPage />} />
          <Route path="/admin"   element={<AdminPage />} />
          <Route path="/board"   element={<BoardPage />} />
          <Route path="/board/:id" element={<PostDetailPage />} />
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
