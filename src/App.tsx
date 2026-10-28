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
import { addLook, input, isTouch } from './game/input'
import { pick } from './game/picking'
import { useGame } from './game/store'

type TouchTrack = { id: number; x: number; y: number; sx: number; sy: number; t: number }

export default function App() {
  const wrap = useRef<HTMLDivElement>(null)
  const touch = useRef<TouchTrack | null>(null)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)
  // Tablets starten ohne Ambient Occlusion; bei niedriger Bildrate wird automatisch reduziert
  // ?q=high|medium|low in der URL erzwingt eine Stufe (zum Testen)
  const [quality, setQuality] = useState<Quality>(
    (new URLSearchParams(location.search).get('q') as Quality | null) ?? (isTouch ? 'medium' : 'high'),
  )
  const overlay = useGame((s) => s.overlay)
  const completed = useGame((s) => s.completed)

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

  const lock = () => {
    initAudio()
    setStarted(true)
    if (isTouch) return
    wrap.current?.querySelector('canvas')?.requestPointerLock()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    initAudio()
    const st = useGame.getState()
    if (st.overlay || st.completed) return
    if (e.pointerType === 'mouse') {
      if (!document.pointerLockElement) return lock()
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

      <HUD locked={locked} />
      {isTouch && started && !overlay && !completed && <Joystick />}
      <Overlay />

      {!completed && !overlay && (isTouch ? !started : !locked) && (
        <div className="screen" onPointerDown={(e) => { e.stopPropagation(); lock() }}>
          <div className="card">
            <h1>Labor 1</h1>
            <p>Löse alle Aufgaben im Labor, um den Raum zu verlassen.</p>
            {isTouch ? (
              <ul>
                <li>Joystick links: laufen</li>
                <li>Wischen: umsehen</li>
                <li>Gegenstand antippen: untersuchen</li>
              </ul>
            ) : (
              <ul>
                <li>WASD / Pfeiltasten: laufen</li>
                <li>Maus: umsehen</li>
                <li>Klick: Gegenstand untersuchen</li>
                <li>Esc: Pause</li>
              </ul>
            )}
            <button>{started ? 'Weiter' : 'Los geht’s'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
