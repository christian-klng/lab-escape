// Synthetischer Sound per Web Audio API – ganz ohne Audiodateien.
// Der AudioContext darf erst nach einer Nutzeraktion starten (Browser-Regel).

export type Sfx = 'click' | 'key' | 'error' | 'success' | 'pickup' | 'open' | 'complete'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = readMuted()

function readMuted() {
  try {
    return localStorage.getItem('lab-escape-muted') === '1'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('lab-escape-muted', m ? '1' : '0')
  } catch {
    /* egal */
  }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05)
}

let paused = false

/**
 * Sound pausieren (Pause-Menü) oder fortsetzen. Pausiert wird der ganze
 * AudioContext – also auch das Raumrauschen – statt nur leiser gestellt.
 */
export function setAudioPaused(p: boolean) {
  paused = p
  if (!ctx) return
  if (p) void ctx.suspend()
  else unlock()
}

/** Bei der ersten Nutzeraktion aufrufen */
export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    // iOS/iPadOS: Web Audio gilt sonst als „Umgebungsgeräusch“ und bleibt im
    // Stumm-Modus des iPads still. „playback“ verhält sich wie ein Spiel/Video.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.8
    master.connect(ctx.destination)
    startAmbience()
  }
  unlock()
}

/**
 * Startet bzw. setzt den AudioContext fort. Safari auf iPad/iPhone lässt das nur
 * innerhalb bestimmter Nutzeraktionen zu (Tippen loslassen, Klick, Taste) – nicht
 * beim ersten Berühren. Ein kurzer stummer Ton im selben Moment „entsperrt“ die Ausgabe.
 */
function unlock() {
  if (!ctx || paused || document.hidden) return
  if (ctx.state !== 'running') void ctx.resume()
  const buf = ctx.createBuffer(1, 1, 22050)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start(0)
}

if (typeof window !== 'undefined') {
  // Jede gültige Nutzeraktion darf den Sound (wieder) freischalten – wichtig für iOS,
  // wo der erste Versuch beim Berühren des Start-Knopfs noch abgelehnt wird.
  for (const ev of ['touchend', 'click', 'keydown'])
    window.addEventListener(ev, () => ctx && ctx.state !== 'running' && unlock(), { passive: true, capture: true })
  // App im Hintergrund oder Tab gewechselt: Sound anhalten
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else unlock()
  })
}

/** Leises Raumrauschen (Lüftung) plus tiefes Brummen */
function startAmbience() {
  if (!ctx || !master) return
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380
  const ng = ctx.createGain()
  ng.gain.value = 0.1
  noise.connect(lp).connect(ng).connect(master)
  noise.start()

  const hum = ctx.createOscillator()
  hum.frequency.value = 55
  const hg = ctx.createGain()
  hg.gain.value = 0.018
  hum.connect(hg).connect(master)
  hum.start()
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  if (!ctx || !master) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(master)
  o.start(start)
  o.stop(start + dur + 0.05)
}

export function sfx(name: Sfx, delay = 0) {
  if (!ctx || !master) return
  const t = ctx.currentTime + delay
  switch (name) {
    case 'click':
      tone(880, t, 0.06, 'triangle', 0.12)
      break
    case 'key':
      tone(1250, t, 0.05, 'square', 0.05)
      break
    case 'error':
      tone(180, t, 0.18, 'sawtooth', 0.09)
      tone(130, t + 0.12, 0.22, 'sawtooth', 0.09)
      break
    case 'success':
      tone(660, t, 0.16, 'triangle', 0.18)
      tone(990, t + 0.1, 0.28, 'triangle', 0.16)
      break
    case 'pickup':
      tone(1320, t, 0.12, 'sine', 0.14)
      tone(1760, t + 0.08, 0.25, 'sine', 0.12)
      break
    case 'open':
      tone(240, t, 0.35, 'triangle', 0.12, 90)
      break
    case 'complete':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.13, 0.5, 'triangle', 0.16))
      break
  }
}

// Zum Debuggen in der Browser-Konsole (nur im Entwicklungsmodus): __audio() → 'running' | 'suspended' | …
if (import.meta.env?.DEV) (window as unknown as { __audio: () => string }).__audio = () => ctx?.state ?? 'nicht gestartet'
