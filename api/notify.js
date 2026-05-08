import admin from 'firebase-admin'

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    })
  } catch (e) {
    console.error('Admin init error:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { title, body } = req.body ?? {}
  if (!title) return res.status(400).json({ error: 'title required' })

  try {
    const db = admin.firestore()
    const snap = await db.collection('bankroll_fcm_tokens').get()
    const tokens = snap.docs.map(d => d.id).filter(Boolean)

    console.log(`[notify] tokens: ${tokens.length}, title: ${title}`)

    if (tokens.length === 0) return res.json({ sent: 0, tokens: 0 })

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body: body ?? '' },
      webpush: {
        notification: { title, body: body ?? '', icon: '/icon-192.png' },
        fcm_options: { link: '/' },
      },
    })

    console.log(`[notify] success: ${result.successCount}, fail: ${result.failureCount}`)
    result.responses.forEach((r, i) => {
      if (!r.success) console.error(`[notify] token[${i}] fail:`, r.error?.message)
    })

    const toDelete = tokens.filter((_, i) => !result.responses[i].success)
    if (toDelete.length > 0) {
      const batch = db.batch()
      toDelete.forEach(t => batch.delete(db.collection('bankroll_fcm_tokens').doc(t)))
      await batch.commit()
    }

    res.json({ sent: result.successCount, failed: result.failureCount, total: tokens.length })
  } catch (e) {
    console.error('[notify] error:', e)
    res.status(500).json({ error: e.message })
  }
}
