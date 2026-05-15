import { useEffect, useState, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { messaging, db } from '../firebase'

async function saveToken(token, uid) {
  await setDoc(doc(db, 'bankroll_fcm_tokens', token), {
    updatedAt: new Date().toISOString(),
    uid: uid ?? null,
  })
}

async function getAndSaveToken(uid) {
  const swReg = await navigator.serviceWorker.register('/sw.js')
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: swReg,
  })
  if (token) await saveToken(token, uid)
  return token
}

export function useNotification(uid = null) {
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )

  // Foreground message listener
  useEffect(() => {
    if (!messaging) return
    return onMessage(messaging, payload => {
      const title = payload.notification?.title
      const body = payload.notification?.body
      if (title && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' })
      }
    })
  }, [])

  // 권한이 있을 때, 또는 uid가 바뀔 때(로그인/로그아웃) 토큰 재저장
  useEffect(() => {
    if (!messaging || permission !== 'granted') return
    getAndSaveToken(uid).catch(() => {})
  }, [permission, uid])

  // Must be called from a user gesture — required for iOS
  const enable = useCallback(async () => {
    if (!messaging || !('Notification' in window)) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return false
      await getAndSaveToken(uid)
      return true
    } catch (e) {
      return false
    }
  }, [uid])

  return { permission, enable }
}
