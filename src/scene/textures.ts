import * as THREE from 'three'

// Prozedurale Texturen (per Canvas gezeichnet, keine Bilddateien nötig).

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Fliesenboden: 4×4 Fliesen pro Textur (bei repeat 5×4 → 50 cm Fliesen) */
export function floorTexture() {
  const t = canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = '#b7b0a3'
    ctx.fillRect(0, 0, 512, 512)
    const tones = ['#e0dbd1', '#d6d0c4']
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = tones[(x + y) % 2]
        roundRect(ctx, x * 128 + 3, y * 128 + 3, 122, 122, 6)
        ctx.fill()
      }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(5, 4)
  return t
}

/** Poster „Schutzbrille tragen“ */
export function safetyPoster() {
  return canvasTex(280, 400, (ctx) => {
    ctx.fillStyle = '#f6c445'
    ctx.fillRect(0, 0, 280, 400)
    ctx.strokeStyle = '#2b2b2b'
    ctx.lineWidth = 12
    ctx.strokeRect(10, 10, 260, 380)
    // Gesicht mit Schutzbrille
    ctx.fillStyle = '#fbe3c8'
    ctx.beginPath()
    ctx.arc(140, 160, 80, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4f8ef7'
    roundRect(ctx, 70, 128, 140, 50, 22)
    ctx.fill()
    ctx.fillStyle = '#bcd8ff'
    roundRect(ctx, 82, 136, 52, 34, 14)
    ctx.fill()
    roundRect(ctx, 146, 136, 52, 34, 14)
    ctx.fill()
    ctx.strokeStyle = '#2b2b2b'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(140, 200, 26, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = '#2b2b2b'
    ctx.font = 'bold 34px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SCHUTZ-', 140, 300)
    ctx.fillText('BRILLE!', 140, 340)
  })
}

/** Poster: stilisiertes Periodensystem */
export function periodicPoster() {
  return canvasTex(480, 320, (ctx) => {
    ctx.fillStyle = '#f3efe6'
    ctx.fillRect(0, 0, 480, 320)
    ctx.fillStyle = '#34414b'
    ctx.font = 'bold 26px system-ui, sans-serif'
    ctx.fillText('PERIODENSYSTEM', 24, 42)
    const cols = ['#f28c38', '#6fb3a3', '#4f8ef7', '#f6c445', '#e5533d', '#9b7be0']
    const sym = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar']
    let k = 0
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 12; c++) {
        if (r === 0 && c > 0 && c < 11) continue
        if (r === 1 && c > 1 && c < 7) continue
        const x = 24 + c * 36
        const y = 64 + r * 48
        ctx.fillStyle = cols[(c + r * 2) % cols.length]
        roundRect(ctx, x, y, 32, 42, 5)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px system-ui, sans-serif'
        ctx.fillText(sym[k++ % sym.length], x + 6, y + 26)
      }
  })
}

/** Warnstreifen für den Boden vor der Tür */
export function hazardTexture() {
  return canvasTex(512, 128, (ctx) => {
    ctx.fillStyle = '#f6c445'
    ctx.fillRect(0, 0, 512, 128)
    ctx.fillStyle = '#2b2b2b'
    for (let x = -128; x < 640; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 128)
      ctx.lineTo(x + 32, 128)
      ctx.lineTo(x + 160, 0)
      ctx.lineTo(x + 128, 0)
      ctx.fill()
    }
  })
}

/** Himmel für das Fenster */
export function skyTexture() {
  return canvasTex(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#7cc4f2')
    g.addColorStop(0.7, '#cdeaf7')
    g.addColorStop(1, '#fff1d6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 256)
  })
}

/** Leuchtschild über der Tür */
export function exitSignTexture() {
  return canvasTex(320, 110, (ctx) => {
    ctx.fillStyle = '#1f9d61'
    ctx.fillRect(0, 0, 320, 110)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 50px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AUSGANG', 160, 58)
  })
}

/** Himmelsverlauf für die Himmelskuppel (oben tiefblau, Horizont hell) */
export function skyDomeTexture() {
  return canvasTex(16, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#4f9fe0')
    g.addColorStop(0.38, '#8cc8f0')
    g.addColorStop(0.5, '#e4f3f8')
    g.addColorStop(0.52, '#d3e9f3')
    g.addColorStop(1, '#d3e9f3')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 256)
  })
}

/** Messingschild mit eingravierter Schrift (z. B. unter dem Porträt) */
export function plaqueTexture(text: string) {
  return canvasTex(256, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, '#e9c46a')
    g.addColorStop(1, '#b8892f')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#5b4214'
    ctx.font = 'bold 30px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 34)
  })
}

/** Zifferblatt für ein Manometer: vergilbtes Papier, Skala über 270°, rote Zone am Ende */
export function gaugeTexture(labels: string[], caption: string) {
  return canvasTex(256, 256, (ctx) => {
    const c = 128
    const g = ctx.createRadialGradient(c, c, 20, c, c, 128)
    g.addColorStop(0, '#f6ecd2')
    g.addColorStop(1, '#dcc89a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const a0 = Math.PI * 0.75
    const span = Math.PI * 1.5
    // rote Zone
    ctx.strokeStyle = '#b8402c'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(c, c, 96, a0 + span * 0.8, a0 + span)
    ctx.stroke()
    ctx.strokeStyle = '#3b2a14'
    ctx.fillStyle = '#3b2a14'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 30px Georgia, serif'
    const steps = (labels.length - 1) * 4
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (span * i) / steps
      const major = i % 4 === 0
      ctx.lineWidth = major ? 5 : 2
      ctx.beginPath()
      ctx.moveTo(c + Math.cos(a) * (major ? 82 : 90), c + Math.sin(a) * (major ? 82 : 90))
      ctx.lineTo(c + Math.cos(a) * 104, c + Math.sin(a) * 104)
      ctx.stroke()
      if (major) ctx.fillText(labels[i / 4], c + Math.cos(a) * 60, c + Math.sin(a) * 60)
    }
    ctx.font = 'italic 22px Georgia, serif'
    ctx.fillText(caption, c, c + 70)
  })
}
