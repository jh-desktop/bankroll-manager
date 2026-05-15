import { useEffect, useState, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useBroadcast() {
  const [banner, setBanner] = useState(null) // { title, body, id }
  const mountTimeRef = useRef(Date.now())

  useEffect(() => {
    const q = query(
      collection(db, 'admin_broadcasts'),
      orderBy('sentAt', 'desc'),
      limit(1)
    )
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) return
      const doc = snap.docs[0]
      const data = doc.data()
      const sentAt = new Date(data.sentAt).getTime()
      // 페이지 열기 이전에 발송된 건 무시
      if (sentAt < mountTimeRef.current) return
      setBanner({ id: doc.id, title: data.title, body: data.body })
    })
    return unsub
  }, [])

  const dismiss = () => setBanner(null)
  return { banner, dismiss }
}
