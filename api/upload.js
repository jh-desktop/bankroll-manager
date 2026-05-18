import admin from 'firebase-admin'
import crypto from 'crypto'

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    })
  } catch (e) {
    console.error('Admin init error:', e.message)
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { base64, filename, mimeType } = req.body ?? {}
  if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename required' })

  // VITE_FIREBASE_STORAGE_BUCKET 환경변수 우선, 없으면 프로젝트 ID에서 유추
  const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET
    ?? `${JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id}.firebasestorage.app`

  try {
    const buffer = Buffer.from(base64, 'base64')
    const token  = crypto.randomUUID()
    const path   = `board_images/${Date.now()}_${filename}`

    // 버킷 이름 명시적으로 전달
    const bucket = admin.storage().bucket(bucketName)
    const file   = bucket.file(path)

    await file.save(buffer, {
      metadata: {
        contentType: mimeType ?? 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    })

    const encodedPath = encodeURIComponent(path)
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`

    console.log(`[upload] ok: ${path}, bucket: ${bucketName}`)
    res.json({ url })
  } catch (e) {
    console.error('[upload] error:', e.message, '| bucket:', bucketName)
    res.status(500).json({ error: e.message, bucket: bucketName })
  }
}
