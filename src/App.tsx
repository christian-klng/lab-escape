import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { Effects, type Quality } from './scene/Effects'
import { FOV } from './scene/layout'
import { initAudio } from './game/audio'
import { Lab } from './scene/Lab'
import { Player } from './scene/Player'
import { HUD } from './ui/HUD'
import { Overlay } from './ui/Overlay'
import { Joystick } from './ui/Joystick'
import { Menu } from './ui/Menu'
import { addLook, input, isTouch } from './game/input'
import { pick } from './game/picking'
import { useGame } from './game/store'

type TouchTrack = { id: number; x: number; y: number; sx: number; sy: number; t: number }

export default function App() {
  const wrap = useRef<HTMLDivElement>(null)
  const touch = useRef<TouchTrack | null>(null)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)
  // Tablet: Menü wird über den Pause-Knopf geöffnet (Desktop: über Esc, also fehlende Maussperre)
  const [touchMenu, setTouchMenu] = useState(true)
  // Tablets starten ohne Ambient Occlusion; bei niedriger Bildrate wird automatisch reduziert
  // ?q=high|medium|low in der URL erzwingt eine Stufe (zum Testen)
  const [quality, setQuality] = useState<Quality>(
    (new URLSearchParams(location.search).get('q') as Quality | null) ?? (isTouch ? 'medium' : 'high'),
  )
  const overlay = useGame((s) => s.overlay)
  const completed = useGame((s) => s.completed)
  const menuOpen = !completed && !overlay && (isTouch ? touchMenu : !locked)

  // Menü offen = Pause: Steuerung sperren, Sound anhalten, laufende Eingaben verwerfen
  useEffect(() => {
    useGame.getState().setPaused(menuOpen)
    if (!menuOpen) return
    input.joy.x = 0
    input.joy.y = 0
    input.keys.clear()
    touch.current = null
  }, [menuOpen])

  useEffect(() => {
    const down = (e: KeyboardEvent) => input.keys.add(e.code)
    const up = (e: KeyboardEvent) => input.keys.delete(e.code)
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) addLook(e.movementX, e.movementY, 0.0022)
    }
    const lockChange = () => {
      setLocked(!!document.pointerLockElement)
      if (!document.pointerLockElement) input.keys.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    document.addEventListener('pointerlockchange', lockChange)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
      document.removeEventListener('pointerlockchange', lockChange)
    }
  }, [])

  // Overlay oder Abschluss: Maus freigeben
  useEffect(() => {
    if ((overlay || completed) && document.pointerLockElement) document.exitPointerLock()
  }, [overlay, completed])

  // Desktop: nach dem Schließen eines Rätsel-Fensters direkt weiterspielen (statt Pausenmenü)
  const hadOverlay = useRef(false)
  useEffect(() => {
    if (overlay) hadOverlay.current = true
    else if (hadOverlay.current && !isTouch && started && !completed) {
      hadOverlay.current = false
      requestLock()
    }
  }, [overlay, started, completed])

  const requestLock = () => {
    try {
      const p = wrap.current?.querySelector('canvas')?.requestPointerLock() as unknown as Promise<void> | undefined
      p?.catch?.(() => {}) // abgelehnt (z. B. zu schnell nach Esc) → Pausenmenü bleibt offen
    } catch {
      /* ältere Browser */
    }
  }

  const resume = () => {
    // iOS erlaubt das Fortsetzen des Sounds nur direkt im Tipp-Ereignis –
    // deshalb die Pause hier sofort aufheben, nicht erst im nächsten Render
    if (isTouch) useGame.getState().setPaused(false)
    initAudio()
    setStarted(true)
    if (isTouch) setTouchMenu(false)
    else requestLock()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    initAudio()
    const st = useGame.getState()
    if (st.overlay || st.completed || st.paused) return
    if (e.pointerType === 'mouse') {
      if (!document.pointerLockElement) return requestLock()
      const id = pick(0, 0)
      if (id) st.interact(id)
      return
    }
    if (touch.current) return
    touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: e.timeStamp }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const t = touch.current
    if (!t || t.id !== e.pointerId) return
    addLook(e.clientX - t.x, e.clientY - t.y, 0.005)
    t.x = e.clientX
    t.y = e.clientY
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current
    if (!t || t.id !== e.pointerId) return
    touch.current = null
    const isTap = Math.hypot(e.clientX - t.sx, e.clientY - t.sy) < 12 && e.timeStamp - t.t < 350
    if (!isTap || !wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    const id = pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (!id) return
    const st = useGame.getState()
    st.setHovered(id)
    setTimeout(() => useGame.getState().setHovered(null), 400)
    st.interact(id)
  }

  return (
    <div
      ref={wrap}
      className="stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (touch.current = null)}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: FOV, near: 0.05, far: 250 }}
        gl={{ powerPreference: 'high-performance', antialias: false, stencil: false }}
        onCreated={({ gl }) => {
          // greift nur, wenn kein Post-Processing aktiv ist (Stufe „low“)
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <color attach="background" args={['#cfd8d4']} />
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setQuality((q) => (q === 'high' ? 'medium' : 'low'))}
          onFallback={() => setQuality('low')}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Lab />
            <Player />
          </Physics>
          <Effects quality={quality} />
        </Suspense>
      </Canvas>

      <HUD locked={locked} showPause={isTouch && started && !menuOpen && !overlay && !completed} onPause={() => setTouchMenu(true)} />
      {isTouch && !menuOpen && !overlay && !completed && <Joystick />}
      <Overlay />
      {menuOpen && <Menu started={started} onResume={resume} />}

    </div>
  )
}
