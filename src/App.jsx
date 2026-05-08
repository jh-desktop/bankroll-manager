import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import Navbar from './components/Navbar'
import CalendarPage from './pages/CalendarPage'
import StatusPage from './pages/StatusPage'
import UsersPage from './pages/UsersPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import { useNotification } from './hooks/useNotification'
import './App.css'

function AppInner() {
  const { permission, enable } = useNotification()
  const exitingRef = useRef(false)

  useEffect(() => {
    window.history.pushState(null, '')
    const handlePopState = () => {
      if (exitingRef.current) {
        window.history.back()
        return
      }
      const exit = window.confirm('앱을 종료하시겠습니까?')
      if (!exit) {
        window.history.pushState(null, '')
      } else {
        exitingRef.current = true
        window.history.back()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <BrowserRouter>
      <Navbar notifPermission={permission} onEnableNotif={enable} />
      <div className="nav-pt">
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats"   element={<StatsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AdminProvider>
      <AppInner />
    </AdminProvider>
  )
}
