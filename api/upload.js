import admin from 'firebase-admin'
import crypto from 'crypto'

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    })
  } catch (e) {
    console.error('Admin init error:', e.message)
  }
}

// base64 인코딩된 이미지를 받아 Firebase Storage에 서버 측 업로드 (CORS 우회)
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { base64, filename, mimeType } = req.body ?? {}
  if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename required' })

  try {
    const buffer = Buffer.from(base64, 'base64')
    const token  = crypto.randomUUID()
    const path   = `board_images/${Date.now()}_${filename}`

    const bucket = admin.storage().bucket()
    const file   = bucket.file(path)

    await file.save(buffer, {
      metadata: {
        contentType: mimeType ?? 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    })

    const encodedPath = encodeURIComponent(path)
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`

    console.log(`[upload] ok: ${path}`)
    res.json({ url })
  } catch (e) {
    console.error('[upload] error:', e)
    res.status(500).json({ error: e.message })
  }
}
