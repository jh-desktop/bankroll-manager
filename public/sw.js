importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const CACHE = 'grinder-v1'

firebase.initializeApp({
  apiKey: 'AIzaSyAigIL0cqFsG9Y85Bc0krf6suLa9YQ_KZY',
  authDomain: 'schedule-manager-df97f.firebaseapp.com',
  projectId: 'schedule-manager-df97f',
  storageBucket: 'schedule-manager-df97f.firebasestorage.app',
  messagingSenderId: '786717259938',
  appId: '1:786717259938:web:8197a01285216d57607ffb',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? '그라인더'
  const body = payload.notification?.body ?? ''
  self.registration.showNotification(title, { body, icon: '/icon-192.png' })
})

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.json'])))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = e.request.url

  // Skip: non-http(s), POST/HEAD/etc., API calls, chrome-extension
  if (!url.startsWith('http') || e.request.method !== 'GET' || url.includes('/api/')) return

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')))
    return
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && res.type !== 'opaque') {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }))
  )
})
