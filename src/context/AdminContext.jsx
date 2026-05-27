import { createContext, useContext, useState } from 'react'
import { useAuth } from './AuthContext'

const ADMIN_PW    = '7730'
const ADMIN_EMAIL = 'yoonjea123123@gmail.com'
const Ctx = createContext(null)

export function AdminProvider({ children }) {
  const { user } = useAuth()
  const isAdminUser = user?.email === ADMIN_EMAIL

  const [adminMode, setAdminMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)

  const openModal = () => { if (!isAdminUser) return; setShowModal(true); setInput(''); setErr(false) }
  const closeModal = () => { setShowModal(false); setInput(''); setErr(false) }
  const exitAdmin = () => setAdminMode(false)

  const confirm = () => {
    if (!isAdminUser) return
    if (input === ADMIN_PW) { setAdminMode(true); closeModal() }
    else { setErr(true) }
  }

  return (
    <Ctx.Provider value={{ adminMode, isAdminUser, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAdmin = () => useContext(Ctx)
