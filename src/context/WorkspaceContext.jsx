import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc,
  getDocs, query, where, arrayUnion, arrayRemove, serverTimestamp, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)

const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function generateKey() {
  return Array.from({ length: 6 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('')
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [userDocState, setUserDocState] = useState('loading') // 'loading' | 'new' | 'exists'
  const [userDocData, setUserDocData] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [currentWs, setCurrentWs] = useState(null)

  const wsLoading = !!(user && userDocState === 'loading')
  const isNewUser = userDocState === 'new'

  // Listen to user document
  useEffect(() => {
    if (!user) {
      setUserDocState('loading')
      setUserDocData(null)
      setWorkspaces([])
      setCurrentWs(null)
      return
    }
    setUserDocState('loading')
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) {
        setUserDocState('exists')
        setUserDocData(snap.data())
      } else {
        setUserDocState('new')
        setUserDocData(null)
      }
    })
    return unsub
  }, [user?.uid])

  // Listen to all workspaces the user belongs to
  useEffect(() => {
    const ids = userDocData?.workspaceIds ?? []
    if (!user || ids.length === 0) { setWorkspaces([]); return }
    const wsMap = {}
    const unsubscribers = []
    ids.forEach(wsId => {
      const unsub = onSnapshot(doc(db, 'workspaces', wsId), snap => {
        if (snap.exists()) wsMap[wsId] = { id: snap.id, ...snap.data() }
        else delete wsMap[wsId]
        setWorkspaces(Object.values(wsMap))
      })
      unsubscribers.push(unsub)
    })
    return () => unsubscribers.forEach(u => u())
  }, [user?.uid, JSON.stringify(userDocData?.workspaceIds)])

  // Keep currentWs in sync when workspace data updates
  useEffect(() => {
    if (!currentWs) return
    const updated = workspaces.find(w => w.id === currentWs.id)
    if (updated) setCurrentWs(updated)
  }, [workspaces])

  // Restore last selected workspace when workspaces load
  useEffect(() => {
    if (workspaces.length === 0 || currentWs) return
    const lastId = localStorage.getItem('lastWorkspaceId')
    if (lastId) {
      const ws = workspaces.find(w => w.id === lastId)
      if (ws) setCurrentWs(ws)
    }
  }, [workspaces])

  const selectWorkspace = useCallback(ws => {
    setCurrentWs(ws)
    localStorage.setItem('lastWorkspaceId', ws.id)
  }, [])

  const goHome = useCallback(() => setCurrentWs(null), [])

  const setupNewUser = useCallback(async personalName => {
    if (!user) return
    const wsRef = doc(collection(db, 'workspaces'))
    await setDoc(wsRef, {
      name: personalName || `${user.displayName}의 뱅크롤`,
      type: 'personal', ownerId: user.uid,
      secretKey: null, createdAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'workspaces', wsRef.id, 'members', user.uid), {
      displayName: user.displayName, email: user.email,
      photoURL: user.photoURL ?? null, role: 'owner',
      joinedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName, email: user.email,
      photoURL: user.photoURL ?? null,
      personalWorkspaceId: wsRef.id,
      workspaceIds: [wsRef.id],
      createdAt: serverTimestamp(),
    })
    return wsRef.id
  }, [user])

  const createSharedWorkspace = useCallback(async name => {
    if (!user) return null
    const key = generateKey()
    const wsRef = doc(collection(db, 'workspaces'))
    await setDoc(wsRef, {
      name, type: 'shared', ownerId: user.uid,
      secretKey: key, createdAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'workspaces', wsRef.id, 'members', user.uid), {
      displayName: user.displayName, email: user.email,
      photoURL: user.photoURL ?? null, role: 'owner',
      joinedAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'users', user.uid), { workspaceIds: arrayUnion(wsRef.id) })
    return { id: wsRef.id, key }
  }, [user])

  const joinWorkspace = useCallback(async secretKey => {
    if (!user) return
    const k = secretKey.toUpperCase().trim()
    const q = query(collection(db, 'workspaces'), where('secretKey', '==', k))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('유효하지 않은 시크릿 코드입니다')
    const wsId = snap.docs[0].id
    const memSnap = await getDoc(doc(db, 'workspaces', wsId, 'members', user.uid))
    if (memSnap.exists()) throw new Error('이미 참여 중인 워크스페이스입니다')
    await setDoc(doc(db, 'workspaces', wsId, 'members', user.uid), {
      displayName: user.displayName, email: user.email,
      photoURL: user.photoURL ?? null, role: 'member',
      joinedAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'users', user.uid), { workspaceIds: arrayUnion(wsId) })
    return wsId
  }, [user])

  const leaveWorkspace = useCallback(async wsId => {
    if (!user) return
    await deleteDoc(doc(db, 'workspaces', wsId, 'members', user.uid))
    await updateDoc(doc(db, 'users', user.uid), { workspaceIds: arrayRemove(wsId) })
    if (currentWs?.id === wsId) setCurrentWs(null)
  }, [user, currentWs])

  const kickMember = useCallback(async (wsId, uid) => {
    await deleteDoc(doc(db, 'workspaces', wsId, 'members', uid))
    try {
      await updateDoc(doc(db, 'users', uid), { workspaceIds: arrayRemove(wsId) })
    } catch {}
  }, [])

  const regenerateKey = useCallback(async wsId => {
    const key = generateKey()
    await updateDoc(doc(db, 'workspaces', wsId), { secretKey: key })
    return key
  }, [])

  const renameWorkspace = useCallback(async (wsId, name) => {
    await updateDoc(doc(db, 'workspaces', wsId), { name })
  }, [])

  return (
    <WorkspaceContext.Provider value={{
      workspaces, currentWs, wsLoading, isNewUser,
      personalWsId: userDocData?.personalWorkspaceId,
      selectWorkspace, goHome,
      setupNewUser, createSharedWorkspace, joinWorkspace,
      leaveWorkspace, kickMember, regenerateKey, renameWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
