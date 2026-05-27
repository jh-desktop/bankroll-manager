const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const s = size
  const cx = s / 2

  // ── Rounded rect helper ──────────────────────────────────────
  const cornerR = s * 0.22
  function rrect(x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // ── Background ───────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, s, s)
  bg.addColorStop(0, '#1c3050')
  bg.addColorStop(1, '#0b1522')
  rrect(0, 0, s, s, cornerR)
  ctx.fillStyle = bg
  ctx.fill()

  ctx.save()
  rrect(0, 0, s, s, cornerR)
  ctx.clip()

  // Inner glow
  const glow = ctx.createRadialGradient(cx, s * 0.38, 0, cx, s * 0.5, s * 0.56)
  glow.addColorStop(0, 'rgba(70,120,220,0.16)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, s, s)

  // Gold border
  const bw = s * 0.036
  const gg = ctx.createLinearGradient(0, 0, s, s)
  gg.addColorStop(0,    '#ffe980')
  gg.addColorStop(0.35, '#f5c520')
  gg.addColorStop(0.7,  '#e09800')
  gg.addColorStop(1,    '#c07800')
  rrect(bw / 2, bw / 2, s - bw, s - bw, cornerR - bw / 2)
  ctx.strokeStyle = gg
  ctx.lineWidth = bw
  ctx.stroke()

  // ── Spade ────────────────────────────────────────────────────
  // Based on the classic playing-card spade SVG path (100×85 units).
  // Original path centered at (50, 42.5):
  //   M 50,5  C 36,11 20,22 20,38  C 20,54 34,60 48,57
  //   L 44,72 L 35,80 L 65,80 L 56,72 L 52,57
  //   C 66,60 80,54 80,38  C 80,22 64,11 50,5  Z
  //
  // After centering (subtract 50, 42.5) → ±30 wide, −37.5 to +37.5 tall.
  // Scale so total height (75 units) → ~72% of icon.

  const t  = (s * 0.72) / 75   // scale factor
  const tx = cx                 // horizontal center
  const ty = s * 0.475          // vertical center of the spade symbol

  const sg = ctx.createLinearGradient(tx - 30 * t, ty - 37.5 * t, tx + 30 * t, ty + 37.5 * t)
  sg.addColorStop(0,    '#fffccc')
  sg.addColorStop(0.12, '#ffe566')
  sg.addColorStop(0.42, '#f5c018')
  sg.addColorStop(0.85, '#c88800')
  sg.addColorStop(1,    '#8a5800')

  ctx.save()
  ctx.shadowColor = 'rgba(255,200,30,0.55)'
  ctx.shadowBlur  = s * 0.07
  ctx.fillStyle   = sg

  ctx.beginPath()
  // Top tip
  ctx.moveTo(tx, ty - 37.5 * t)
  // Upper-left lobe
  ctx.bezierCurveTo(
    tx - 14 * t, ty - 31.5 * t,
    tx - 30 * t, ty - 20.5 * t,
    tx - 30 * t, ty -  4.5 * t
  )
  // Lower-left lobe (returns toward center)
  ctx.bezierCurveTo(
    tx - 30 * t, ty + 11.5 * t,
    tx - 16 * t, ty + 17.5 * t,
    tx -  2 * t, ty + 14.5 * t
  )
  // Stem left, base left, base right, stem right
  ctx.lineTo(tx -  6 * t, ty + 29.5 * t)
  ctx.lineTo(tx - 15 * t, ty + 37.5 * t)
  ctx.lineTo(tx + 15 * t, ty + 37.5 * t)
  ctx.lineTo(tx +  6 * t, ty + 29.5 * t)
  ctx.lineTo(tx +  2 * t, ty + 14.5 * t)
  // Lower-right lobe
  ctx.bezierCurveTo(
    tx + 16 * t, ty + 17.5 * t,
    tx + 30 * t, ty + 11.5 * t,
    tx + 30 * t, ty -  4.5 * t
  )
  // Upper-right lobe (back to tip)
  ctx.bezierCurveTo(
    tx + 30 * t, ty - 20.5 * t,
    tx + 14 * t, ty - 31.5 * t,
    tx,          ty - 37.5 * t
  )
  ctx.closePath()
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.restore()
  ctx.restore()  // end clip

  // Corner accent dots
  const dr = s * 0.018
  const dp = s * 0.078
  ctx.fillStyle = 'rgba(245,192,24,0.22)'
  ;[[dp, dp],[s-dp, dp],[dp, s-dp],[s-dp, s-dp]].forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, dr, 0, Math.PI * 2)
    ctx.fill()
  })

  return canvas
}

const outDir = path.join(__dirname, '..', 'public')
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512).toBuffer('image/png'))
console.log('✓ icon-512.png')
fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192).toBuffer('image/png'))
console.log('✓ icon-192.png')
