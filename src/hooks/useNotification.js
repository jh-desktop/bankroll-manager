import { useEffect, useState, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { messaging, db } from '../firebase'

export function useNotification() {
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

  // Auto-register token if already granted (e.g. page reload)
  useEffect(() => {
    if (!messaging || permission !== 'granted') return
    ;(async () => {
      try {
        const swReg = await navigator.serviceWorker.register('/sw.js')
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })
        if (token) {
          await setDoc(doc(db, 'bankroll_fcm_tokens', token), {
            updatedAt: new Date().toISOString(),
          })
        }
      } catch (e) { void e }
    })()
  }, [permission])

  // Must be called from a user gesture (button click) — required for iOS
  const enable = useCallback(async () => {
    if (!messaging || !('Notification' in window)) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return false

      const swReg = await navigator.serviceWorker.register('/sw.js')
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      })
      if (token) {
        await setDoc(doc(db, 'bankroll_fcm_tokens', token), {
          updatedAt: new Date().toISOString(),
        })
      }
      return true
    } catch (e) {
      return false
    }
  }, [])

  return { permission, enable }
}
