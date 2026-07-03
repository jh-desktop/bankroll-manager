const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'store-assets')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

// ── Color palette ──────────────────────────────────────────────
const C = {
  bg:       '#0f1b2d',
  surface:  '#192436',
  card:     '#243654',
  cardHi:   '#2c4264',
  border:   '#2e4a70',
  gold:     '#f5c018',
  goldDim:  '#c88800',
  blue:     '#3b82f6',
  blueDim:  '#1d4ed8',
  text1:    '#e2e8f0',
  text2:    '#94a3b8',
  text3:    '#64748b',
  green:    '#10b981',
  red:      '#f87171',
  amber:    '#f59e0b',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return {r,g,b}
}
function rgba(hex, a) {
  const {r,g,b} = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ── Helpers ────────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}

function fillRrect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; rrect(ctx,x,y,w,h,r); ctx.fill()
}

function text(ctx, str, x, y, size, color, align='left', weight='normal', font='sans-serif') {
  ctx.font = `${weight} ${size}px ${font}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(str, x, y)
}

function spade(ctx, cx, cy, size, color) {
  const t = (size * 0.72) / 75
  const tx = cx, ty = cy
  const sg = ctx.createLinearGradient(tx, ty - 37.5*t, tx, ty + 37.5*t)
  if (typeof color === 'string') { sg.addColorStop(0, color); sg.addColorStop(1, color) }
  else { color.forEach(([s,c]) => sg.addColorStop(s,c)) }
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.moveTo(tx, ty - 37.5*t)
  ctx.bezierCurveTo(tx-14*t, ty-31.5*t, tx-30*t, ty-20.5*t, tx-30*t, ty-4.5*t)
  ctx.bezierCurveTo(tx-30*t, ty+11.5*t, tx-16*t, ty+17.5*t, tx-2*t, ty+14.5*t)
  ctx.lineTo(tx-6*t, ty+29.5*t); ctx.lineTo(tx-15*t, ty+37.5*t)
  ctx.lineTo(tx+15*t, ty+37.5*t); ctx.lineTo(tx+6*t, ty+29.5*t)
  ctx.lineTo(tx+2*t, ty+14.5*t)
  ctx.bezierCurveTo(tx+16*t, ty+17.5*t, tx+30*t, ty+11.5*t, tx+30*t, ty-4.5*t)
  ctx.bezierCurveTo(tx+30*t, ty-20.5*t, tx+14*t, ty-31.5*t, tx, ty-37.5*t)
  ctx.closePath(); ctx.fill()
}

// ── 1. Feature Graphic 1024×500 ────────────────────────────────
function featureGraphic() {
  const W=1024, H=500
  const cv = createCanvas(W, H)
  const ctx = cv.getContext('2d')

  // background
  const bg = ctx.createLinearGradient(0,0,W,H)
  bg.addColorStop(0, '#0f1b2d'); bg.addColorStop(1, '#0b2040')
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H)

  // subtle grid lines
  ctx.strokeStyle = rgba('#3b82f6', 0.06); ctx.lineWidth = 1
  for (let x=0; x<W; x+=60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y=0; y<H; y+=60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  // left glow
  const gl = ctx.createRadialGradient(200,250,0,200,250,300)
  gl.addColorStop(0, rgba('#f5c018', 0.12)); gl.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gl; ctx.fillRect(0,0,W,H)

  // spade icon (large, left)
  ctx.shadowColor = rgba('#f5c018', 0.5); ctx.shadowBlur = 50
  spade(ctx, 210, 250, 220, [[0,'#fffccc'],[0.15,'#ffe566'],[0.45,'#f5c018'],[0.85,'#c88800'],[1,'#8a5800']])
  ctx.shadowBlur = 0

  // divider line
  ctx.strokeStyle = rgba('#f5c018', 0.18); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(380, 80); ctx.lineTo(380, 420); ctx.stroke()

  // app name
  text(ctx, '그라인더', 430, 170, 72, C.gold, 'left', '900')
  text(ctx, '홀덤 뱅크롤 관리', 432, 235, 30, C.text2, 'left', '400')

  // feature bullets
  const bullets = ['📅  캘린더 수익/손실 기록', '👥  팀 워크스페이스 공유', '🏆  월별 멤버 순위표', '🔔  실시간 푸시 알림']
  bullets.forEach((b, i) => {
    text(ctx, b, 432, 305 + i*38, 20, C.text1, 'left', '500')
  })

  // bottom tag
  text(ctx, 'PWA · Firebase · 무료', 432, 455, 16, C.text3, 'left', '400')

  fs.writeFileSync(path.join(OUT, 'feature-graphic.png'), cv.toBuffer('image/png'))
  console.log('✓ feature-graphic.png')
}

// ── 2. Phone Screenshot helper (1080×1920) ─────────────────────
function makeScreenshot(name, drawFn) {
  const W=1080, H=1920
  const cv = createCanvas(W, H)
  const ctx = cv.getContext('2d')
  ctx.fillStyle = C.bg; ctx.fillRect(0,0,W,H)
  drawFn(ctx, W, H)
  fs.writeFileSync(path.join(OUT, `screenshot-${name}.png`), cv.toBuffer('image/png'))
  console.log(`✓ screenshot-${name}.png`)
}

// ── Status bar ─────────────────────────────────────────────────
function statusBar(ctx, W) {
  text(ctx, '9:41', 60, 50, 26, C.text2, 'left', '600')
  text(ctx, '● ● ▲', W-80, 50, 20, C.text2, 'right', '400')
}

// ── Navbar ─────────────────────────────────────────────────────
function navbar(ctx, W, title, showBack=false) {
  ctx.fillStyle = C.surface
  ctx.fillRect(0, 80, W, 100)
  ctx.strokeStyle = C.border; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(W, 180); ctx.stroke()
  if (showBack) text(ctx, '←', 60, 130, 32, C.text1, 'left', '700')
  text(ctx, '♠', showBack ? 160 : 60, 130, 36, C.gold, 'left', '900')
  text(ctx, title, W/2, 130, 30, C.text1, 'center', '700')
}

// ── Card ───────────────────────────────────────────────────────
function card(ctx, x, y, w, h, r=20) {
  fillRrect(ctx, x, y, w, h, r, C.card)
  ctx.strokeStyle = C.border; ctx.lineWidth = 1.5
  rrect(ctx, x, y, w, h, r); ctx.stroke()
}

// ── Screenshot 1: 워크스페이스 홈 ─────────────────────────────
function screenshot1(ctx, W, H) {
  statusBar(ctx, W)
  navbar(ctx, W, '그라인더')

  const pad = 48

  // 제목
  text(ctx, '안녕하세요, 박윤재님 👋', pad, 260, 36, C.text1, 'left', '700')
  text(ctx, '워크스페이스를 선택하세요', pad, 315, 28, C.text2, 'left', '400')

  // 개인 워크스페이스 카드
  card(ctx, pad, 370, W-pad*2, 200, 24)
  const blueG = ctx.createLinearGradient(pad, 370, pad+100, 570)
  blueG.addColorStop(0, rgba('#3b82f6', 0.12)); blueG.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = blueG; rrect(ctx, pad, 370, W-pad*2, 200, 24); ctx.fill()
  ctx.strokeStyle = rgba('#3b82f6', 0.5); rrect(ctx, pad, 370, W-pad*2, 200, 24); ctx.stroke()
  text(ctx, '🏠  나의 그라인더', pad+40, 450, 34, C.text1, 'left', '700')
  text(ctx, '개인 워크스페이스', pad+40, 500, 24, C.text2, 'left', '400')
  text(ctx, '→', W-pad-60, 470, 40, C.blue, 'left', '700')

  // 공용 워크스페이스 카드
  card(ctx, pad, 600, W-pad*2, 200, 24)
  const amberG = ctx.createLinearGradient(pad, 600, pad+100, 800)
  amberG.addColorStop(0, rgba('#f59e0b', 0.12)); amberG.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = amberG; rrect(ctx, pad, 600, W-pad*2, 200, 24); ctx.fill()
  ctx.strokeStyle = rgba('#f59e0b', 0.5); rrect(ctx, pad, 600, W-pad*2, 200, 24); ctx.stroke()
  text(ctx, '♠  다이비하우스', pad+40, 680, 34, C.text1, 'left', '700')
  text(ctx, '멤버 4명 · 공용 워크스페이스', pad+40, 730, 24, C.text2, 'left', '400')
  text(ctx, '→', W-pad-60, 700, 40, C.amber, 'left', '700')

  // 하단 버튼들
  fillRrect(ctx, pad, 850, (W-pad*2-30)/2, 110, 16, C.blueDim)
  text(ctx, '+ 방 만들기', pad + (W-pad*2-30)/4, 905, 28, '#fff', 'center', '700')
  fillRrect(ctx, pad+(W-pad*2-30)/2+30, 850, (W-pad*2-30)/2, 110, 16, C.cardHi)
  text(ctx, '코드로 참여', pad+(W-pad*2-30)/2+30+(W-pad*2-30)/4, 905, 28, C.text1, 'center', '700')

  // 하단 캡션
  text(ctx, '나만의 공간과 팀 공간을 자유롭게 관리', W/2, 1100, 30, C.text3, 'center', '400')

  // 하단 장식
  ctx.shadowColor = rgba('#f5c018', 0.2); ctx.shadowBlur = 80
  spade(ctx, W/2, 1500, 320, rgba('#f5c018', 0.05))
  ctx.shadowBlur = 0

  // 앱 이름 하단
  text(ctx, '♠  그라인더', W/2, 1820, 32, rgba('#f5c018', 0.35), 'center', '700')
}

// ── Screenshot 2: 캘린더 기록 ──────────────────────────────────
function screenshot2(ctx, W, H) {
  statusBar(ctx, W)
  navbar(ctx, W, '5월 캘린더', true)

  const pad = 48

  // 월 이동
  text(ctx, '< 2026년 5월 >', W/2, 235, 30, C.text1, 'center', '700')

  // 캘린더 그리드
  const days = ['일','월','화','수','목','금','토']
  const colW = (W - pad*2) / 7
  const startY = 290
  days.forEach((d,i) => {
    const color = i===0 ? C.red : i===6 ? C.blue : C.text2
    text(ctx, d, pad + colW*i + colW/2, startY, 24, color, 'center', '700')
  })

  const calData = [
    [null,null,null,null,1,2,3],
    [4,5,6,7,8,9,10],
    [11,12,13,14,15,16,17],
    [18,19,20,21,22,23,24],
    [25,26,27,28,29,30,31],
  ]
  const amounts = { 3:'+180,000', 6:'-50,000', 9:'+320,000', 12:'+90,000', 15:'-120,000', 18:'+210,000', 21:'+450,000', 24:'-80,000', 27:'+150,000', 28:'+280,000' }

  calData.forEach((week, wi) => {
    const rowY = 360 + wi * 170
    week.forEach((day, di) => {
      if (!day) return
      const cx2 = pad + colW*di + colW/2
      const isToday = day === 28
      if (isToday) { fillRrect(ctx, cx2-48, rowY-32, 96, 140, 12, C.blueDim) }
      text(ctx, String(day), cx2, rowY, 26, isToday ? '#fff' : C.text1, 'center', isToday?'700':'400')
      const amt = amounts[day]
      if (amt) {
        const isPlus = amt.startsWith('+')
        text(ctx, amt, cx2, rowY+52, 15, isPlus ? C.green : C.red, 'center', '600')
      }
    })
  })

  // 이번 달 요약
  card(ctx, pad, 1260, W-pad*2, 200, 20)
  text(ctx, '5월 합계', pad+40, 1330, 28, C.text2, 'left', '400')
  text(ctx, '+1,430,000원', W-pad-40, 1330, 38, C.green, 'right', '800')
  text(ctx, '기록 10건', pad+40, 1400, 24, C.text3, 'left', '400')
  text(ctx, '승률 70%', W-pad-40, 1400, 24, C.blue, 'right', '600')

  text(ctx, '♠  그라인더', W/2, 1820, 32, rgba('#f5c018', 0.35), 'center', '700')
}

// ── Screenshot 3: 순위표 ───────────────────────────────────────
function screenshot3(ctx, W, H) {
  statusBar(ctx, W)
  navbar(ctx, W, '5월 순위표', true)

  const pad = 48

  text(ctx, '다이비하우스', pad, 240, 28, C.text2, 'left', '400')
  text(ctx, '2026년 5월', W-pad, 240, 24, C.text3, 'right', '400')

  const members = [
    { rank:1, name:'박윤재', amount:'+1,430,000', games:10, emoji:'🥇' },
    { rank:2, name:'김철수', amount:'+980,000',  games:8,  emoji:'🥈' },
    { rank:3, name:'이민지', amount:'+340,000',  games:12, emoji:'🥉' },
    { rank:4, name:'최준호', amount:'-120,000',  games:6,  emoji:'4' },
  ]

  members.forEach((m, i) => {
    const y = 320 + i*230
    const isMe = i===0
    card(ctx, pad, y, W-pad*2, 200, 20)
    if (isMe) {
      const hl = ctx.createLinearGradient(pad, y, W-pad, y+200)
      hl.addColorStop(0, rgba('#3b82f6', 0.15)); hl.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = hl; rrect(ctx, pad, y, W-pad*2, 200, 20); ctx.fill()
      ctx.strokeStyle = rgba('#3b82f6', 0.45); rrect(ctx, pad, y, W-pad*2, 200, 20); ctx.stroke()
    }

    // rank
    text(ctx, m.emoji, pad+40, y+100, 48, '#fff', 'left', '700')
    // avatar circle
    fillRrect(ctx, pad+130, y+56, 88, 88, 44, C.cardHi)
    text(ctx, m.name[0], pad+174, y+100, 36, C.text1, 'center', '700')
    // name
    text(ctx, m.name + (isMe ? ' (나)' : ''), pad+240, y+80, 32, isMe ? C.blue : C.text1, 'left', isMe?'700':'500')
    text(ctx, `${m.games}게임`, pad+240, y+128, 24, C.text3, 'left', '400')
    // amount
    const isPlus = m.amount.startsWith('+')
    text(ctx, m.amount, W-pad-40, y+100, 34, isPlus ? C.green : C.red, 'right', '800')
  })

  text(ctx, '♠  그라인더', W/2, 1820, 32, rgba('#f5c018', 0.35), 'center', '700')
}

// ── Screenshot 4: 게시판 ───────────────────────────────────────
function screenshot4(ctx, W, H) {
  statusBar(ctx, W)
  navbar(ctx, W, '게시판', true)

  const pad = 48

  // 탭
  const tabs = ['전체','공지','핸드리뷰']
  tabs.forEach((t, i) => {
    const active = i===0
    const tx2 = pad + i*220
    if (active) {
      fillRrect(ctx, tx2, 200, 180, 60, 10, C.blueDim)
      text(ctx, t, tx2+90, 230, 24, '#fff', 'center', '700')
    } else {
      text(ctx, t, tx2+90, 230, 24, C.text3, 'center', '400')
    }
  })

  const posts = [
    { title:'오늘 버블 핸드 리뷰', author:'박윤재', time:'방금 전', comments:3, likes:5, tag:'핸드리뷰' },
    { title:'이번 달 목표 달성!', author:'김철수', time:'1시간 전', comments:7, likes:12, tag:'자유' },
    { title:'BTN vs BB 3bet 팟 대응법', author:'이민지', time:'3시간 전', comments:2, likes:8, tag:'전략' },
    { title:'주말 세션 참여자 구해요', author:'최준호', time:'어제', comments:4, likes:3, tag:'모집' },
  ]

  posts.forEach((p, i) => {
    const y = 300 + i*320
    card(ctx, pad, y, W-pad*2, 290, 20)
    // tag
    fillRrect(ctx, pad+30, y+30, 130, 50, 8, rgba('#3b82f6', 0.2))
    text(ctx, p.tag, pad+95, y+55, 22, C.blue, 'center', '600')
    // title
    text(ctx, p.title, pad+30, y+120, 30, C.text1, 'left', '700')
    // meta
    text(ctx, p.author, pad+30, y+180, 24, C.text3, 'left', '400')
    text(ctx, p.time, pad+200, y+180, 24, C.text3, 'left', '400')
    // reactions
    text(ctx, `💬 ${p.comments}`, W-pad-200, y+180, 24, C.text3, 'left', '400')
    text(ctx, `❤️ ${p.likes}`, W-pad-90, y+180, 24, C.text3, 'left', '400')
  })

  text(ctx, '♠  그라인더', W/2, 1820, 32, rgba('#f5c018', 0.35), 'center', '700')
}

// ── Run all ────────────────────────────────────────────────────
featureGraphic()
makeScreenshot('1-workspace',  screenshot1)
makeScreenshot('2-calendar',   screenshot2)
makeScreenshot('3-leaderboard',screenshot3)
makeScreenshot('4-board',      screenshot4)

console.log('\n✅ All store assets saved to /store-assets/')
