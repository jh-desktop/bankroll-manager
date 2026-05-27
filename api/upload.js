import crypto from 'crypto'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { base64, mimeType } = req.body ?? {}
  if (!base64) return res.status(400).json({ error: 'base64 required' })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary credentials not configured' })
  }

  try {
    const timestamp = Math.round(Date.now() / 1000)
    const folder    = 'board_images'
    const toSign    = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(toSign).digest('hex')

    const form = new FormData()
    form.append('file',      `data:${mimeType ?? 'image/jpeg'};base64,${base64}`)
    form.append('api_key',   apiKey)
    form.append('timestamp', String(timestamp))
    form.append('signature', signature)
    form.append('folder',    folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: form }
    )

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message ?? 'Upload failed')

    console.log(`[upload] ok: ${data.public_id}`)
    res.json({ url: data.secure_url })
  } catch (e) {
    console.error('[upload] error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
