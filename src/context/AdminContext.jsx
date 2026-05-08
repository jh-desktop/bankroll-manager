import { createContext, useContext, useState } from 'react'

const ADMIN_PW = '0000'
const Ctx = createContext(null)

export function AdminProvider({ children }) {
  const [adminMode, setAdminMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)

  const openModal = () => { setShowModal(true); setInput(''); setErr(false) }
  const closeModal = () => { setShowModal(false); setInput(''); setErr(false) }
  const exitAdmin = () => setAdminMode(false)

  const confirm = () => {
    if (input === ADMIN_PW) { setAdminMode(true); closeModal() }
    else { setErr(true) }
  }

  return (
    <Ctx.Provider value={{ adminMode, openModal, exitAdmin, showModal, closeModal, input, setInput, err, setErr, confirm }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAdmin = () => useContext(Ctx)
