import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, Collider, Cyl, Glass, Glow, RBox, Screen, type V3 } from './kit'
import { LOWPOLY, seg } from './style'
import { hazardTexture, periodicPoster, safetyPoster } from './textures'
import { HX, HZ, PROP_SCALE, ROOM, WINDOW } from './layout'

// Nicht-interaktive Details, die den Raum lebendig machen.

// ---------- Regal mit Kolben ----------

type FlaskKind = 'erlen' | 'round' | 'tube'
const SHELF_POS: V3 = [-HX + 0.25, 0, 0.3]
const FLASKS: { y: number; z: number; color: string; kind: FlaskKind }[] = [
  { y: 0.635, z: -0.72, color: '#5ad1c0', kind: 'erlen' },
  { y: 0.635, z: -0.3, color: '#f6c445', kind: 'round' },
  { y: 0.635, z: 0.15, color: '#ff7a59', kind: 'erlen' },
  { y: 0.635, z: 0.6, color: '#9b7be0', kind: 'round' },
  { y: 1.235, z: -0.6, color: '#7fd36b', kind: 'round' },
  { y: 1.235, z: -0.1, color: '#4f8ef7', kind: 'erlen' },
  { y: 1.235, z: 0.45, color: '#ff5fa2', kind: 'erlen' },
]

function Flask({ position, color, kind }: { position: V3; color: string; kind: FlaskKind }) {
  if (kind === 'round')
    return (
      <group position={position}>
        <mesh position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.085, seg(20), seg(16)]} />
          <Glass />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.08, seg(14)]} />
          <Glass />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.075, seg(20), seg(12), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <Glow color={color} intensity={1.1} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.075, seg(20)]} />
          <Glow color={color} intensity={1.3} />
        </mesh>
      </group>
    )
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 0.18, seg(20)]} />
        <Glass />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.06, seg(14)]} />
        <Glass />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <cylinderGeometry args={[0.064, 0.083, 0.08, seg(20)]} />
        <Glow color={color} intensity={1.1} />
      </mesh>
    </group>
  )
}

/** Aufsteigende Bläschen in allen Kolben – ein einziger Draw Call */
function Bubbles({ sources }: { sources: V3[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const per = 3
  const n = sources.length * per
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const phases = useMemo(() => Array.from({ length: n }, () => Math.random()), [n])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < n; i++) {
      const s = sources[Math.floor(i / per)]
      const p = (t * 0.4 + phases[i]) % 1
      dummy.position.set(s[0] + Math.sin(i * 12.9 + t * 2) * 0.018, s[1] - 0.04 + p * 0.08, s[2] + Math.cos(i * 7.1) * 0.018)
      dummy.scale.setScalar(0.005 + 0.006 * Math.sin(p * Math.PI))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, seg(8), seg(6)]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} transparent opacity={0.75} />
    </instancedMesh>
  )
}

function Shelf() {
  const books: { y: number; z: number; h: number; c: string; r: number }[] = [
    { y: 1.835, z: -0.8, h: 0.28, c: C.red, r: 0 },
    { y: 1.835, z: -0.73, h: 0.25, c: C.blue, r: 0 },
    { y: 1.835, z: -0.66, h: 0.3, c: C.yellow, r: 0 },
    { y: 1.835, z: -0.56, h: 0.26, c: C.teal, r: 0.25 },
    { y: 0.065, z: 0.55, h: 0.3, c: C.orange, r: 0 },
    { y: 0.065, z: 0.63, h: 0.27, c: C.slateLight, r: 0 },
  ]
  return (
    <group position={SHELF_POS}>
      <Collider position={[0, 0.95, 0]} size={[0.45, 1.9, 2.04]} />
      <RBox position={[-0.2, 0.95, 0]} size={[0.04, 1.9, 2]} color={C.creamDark} radius={0.01} />
      {[-1, 1].map((s) => (
        <RBox key={s} position={[0, 0.95, s * 1.0]} size={[0.45, 1.9, 0.04]} color={C.cream} radius={0.015} />
      ))}
      {[0.05, 0.62, 1.22, 1.82].map((y) => (
        <RBox key={y} position={[0, y, 0]} size={[0.45, 0.03, 2]} color={C.cream} radius={0.01} />
      ))}
      {FLASKS.map((f, i) => (
        <Flask key={i} position={[0.02, f.y, f.z]} color={f.color} kind={f.kind} />
      ))}
      {books.map((b, i) => (
        <RBox key={i} position={[-0.02, b.y + b.h / 2, b.z]} rotation={[b.r, 0, 0]} size={[0.24, b.h, 0.06]} color={b.c} radius={0.01} />
      ))}
      {/* Kiste unten */}
      <RBox position={[0, 0.2, -0.45]} size={[0.38, 0.28, 0.6]} color={C.teal} radius={0.03} />
    </group>
  )
}

// ---------- Fenster ----------

function Window() {
  return (
    <group position={[HX - 0.03, WINDOW.y, WINDOW.z]}>
      {/* Glasscheibe: kaum sichtbar, spiegelt nur leicht – der Park dahinter ist echte 3D-Geometrie */}
      <mesh position={[0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[WINDOW.w, WINDOW.h]} />
        <meshStandardMaterial color="#e6f6ff" transparent opacity={0.08} roughness={0.05} depthWrite={false} />
      </mesh>
      {/* Rahmen */}
      <RBox position={[0, 0.54, 0]} size={[0.08, 0.08, 1.76]} color={C.cream} radius={0.02} />
      <RBox position={[0, -0.54, 0]} size={[0.08, 0.08, 1.76]} color={C.cream} radius={0.02} />
      <RBox position={[0, 0, 0.84]} size={[0.08, 1.16, 0.08]} color={C.cream} radius={0.02} />
      <RBox position={[0, 0, -0.84]} size={[0.08, 1.16, 0.08]} color={C.cream} radius={0.02} />
      <RBox position={[0, 0, 0]} size={[0.04, 1.0, 0.04]} color={C.cream} radius={0.01} />
      <RBox position={[0, 0.1, 0]} size={[0.04, 0.04, 1.6]} color={C.cream} radius={0.01} />
      <RBox position={[-0.08, -0.6, 0]} size={[0.2, 0.04, 1.84]} color={C.creamDark} radius={0.015} />
      {/* Topfpflanze auf der Fensterbank */}
      <group position={[-0.08, -0.58, 0.55]}>
        <Cyl args={[0.07, 0.055, 0.12]} position={[0, 0.06, 0]} color={C.orange} />
        {[[0, 0.18, 0], [0.04, 0.22, 0.03], [-0.03, 0.2, -0.04]].map((p, i) => (
          <mesh key={i} position={p as V3} scale={[0.07, 0.09, 0.07]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i % 2 ? '#4caf6a' : '#6cc483'} flatShading roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ---------- Wand-Details ----------

function Posters() {
  const safety = useMemo(() => safetyPoster(), [])
  const table = useMemo(() => periodicPoster(), [])
  return (
    <>
      <mesh position={[-HX + 0.015, 1.6, -1.25]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.6, 0.86]} />
        <meshStandardMaterial flatShading={LOWPOLY} map={safety} roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 1.9, -HZ + 0.015]}>
        <planeGeometry args={[0.96, 0.64]} />
        <meshStandardMaterial flatShading={LOWPOLY} map={table} roughness={0.9} />
      </mesh>
    </>
  )
}

function Clock() {
  const hour = useRef<THREE.Group>(null)
  const minute = useRef<THREE.Group>(null)
  const second = useRef<THREE.Group>(null)
  useFrame(() => {
    const d = new Date()
    const s = d.getSeconds() + d.getMilliseconds() / 1000
    const m = d.getMinutes() + s / 60
    const h = (d.getHours() % 12) + m / 60
    if (second.current) second.current.rotation.z = -(s / 60) * Math.PI * 2
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2
  })
  return (
    <group position={[2.4, 1.85, -HZ + 0.03]}>
      <Cyl args={[0.24, 0.24, 0.05]} rotation={[Math.PI / 2, 0, 0]} color={C.slate} />
      <Cyl args={[0.21, 0.21, 0.055]} rotation={[Math.PI / 2, 0, 0]} color={C.cream} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.17, Math.cos((i / 12) * Math.PI * 2) * 0.17, 0.03]}>
          <boxGeometry args={[0.012, 0.012, 0.005]} />
          <meshStandardMaterial flatShading={LOWPOLY} color={C.slate} />
        </mesh>
      ))}
      <group ref={hour} position={[0, 0, 0.032]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.018, 0.1, 0.004]} />
          <meshStandardMaterial flatShading={LOWPOLY} color={C.slate} />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0, 0.035]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.012, 0.15, 0.004]} />
          <meshStandardMaterial flatShading={LOWPOLY} color={C.slate} />
        </mesh>
      </group>
      <group ref={second} position={[0, 0, 0.038]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.005, 0.16, 0.003]} />
          <meshStandardMaterial flatShading={LOWPOLY} color={C.orange} />
        </mesh>
      </group>
    </group>
  )
}

function Pipes() {
  return (
    <group>
      <Cyl args={[0.05, 0.05, ROOM.w]} position={[0, ROOM.h - 0.18, -HZ + 0.12]} rotation={[0, 0, Math.PI / 2]} color={C.orange} roughness={0.4} />
      <Cyl args={[0.035, 0.035, ROOM.w]} position={[0, ROOM.h - 0.3, -HZ + 0.1]} rotation={[0, 0, Math.PI / 2]} color={C.tealDark} roughness={0.4} />
      {[-2, -1, 0, 1, 2].map((x) => (
        <RBox key={x} position={[x, ROOM.h - 0.24, -HZ + 0.07]} size={[0.06, 0.24, 0.06]} color={C.steel} metalness={0.5} roughness={0.35} radius={0.015} />
      ))}
      {/* Rohrbogen nach oben */}
      <Cyl args={[0.05, 0.05, 0.3]} position={[-HX + 0.05, ROOM.h - 0.03, -HZ + 0.12]} color={C.orange} roughness={0.4} />
    </group>
  )
}

// ---------- Möbel & Kleinkram ----------

function Plant() {
  const leaves: [V3, number, string][] = [
    [[0, 0.75, 0], 0.26, '#4caf6a'],
    [[0.12, 0.92, 0.06], 0.2, '#6cc483'],
    [[-0.1, 0.95, -0.05], 0.19, '#3f9a5c'],
    [[0.02, 1.1, 0.02], 0.16, '#6cc483'],
    [[-0.12, 0.72, 0.12], 0.15, '#3f9a5c'],
  ]
  return (
    <group position={[-HX + 0.35, 0, -HZ + 0.35]}>
      <Collider position={[0, 0.5, 0]} size={[0.45, 1, 0.45]} />
      <RBox position={[0, 0.23, 0]} size={[0.42, 0.46, 0.42]} color={C.orange} radius={0.06} />
      <RBox position={[0, 0.465, 0]} size={[0.36, 0.02, 0.36]} color="#6b4b35" radius={0.008} />
      {leaves.map(([p, s, col], i) => (
        <mesh key={i} position={p} scale={s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={col} flatShading roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Stool({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Collider position={[0, 0.33, 0]} size={[0.36, 0.66, 0.36]} />
      <Cyl args={[0.18, 0.18, 0.06]} position={[0, 0.64, 0]} color={C.teal} roughness={0.5} />
      <Cyl args={[0.025, 0.025, 0.6]} position={[0, 0.32, 0]} color={C.steel} metalness={0.6} roughness={0.3} />
      <Cyl args={[0.16, 0.18, 0.03]} position={[0, 0.015, 0]} color={C.slate} />
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.012, seg(8), seg(24)]} />
        <meshStandardMaterial flatShading={LOWPOLY} color={C.steel} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Extinguisher() {
  return (
    <group position={[1.3, 0, HZ - 0.15]}>
      <Collider position={[0, 0.3, 0]} size={[0.22, 0.6, 0.22]} />
      <Cyl args={[0.09, 0.09, 0.48]} position={[0, 0.26, 0]} color={C.red} roughness={0.35} />
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.09, seg(20), seg(10), 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial flatShading={LOWPOLY} color={C.red} roughness={0.35} />
      </mesh>
      <Cyl args={[0.025, 0.03, 0.08]} position={[0, 0.6, 0]} color={C.slate} />
      <RBox position={[0.05, 0.64, 0]} size={[0.12, 0.02, 0.03]} color={C.slate} radius={0.008} />
      <RBox position={[0, 0.3, -0.09]} size={[0.1, 0.12, 0.01]} color={C.cream} radius={0.005} />
    </group>
  )
}

function TableClutter() {
  const tubes = ['#ff7a59', '#5ad1c0', '#f6c445', '#9b7be0']
  return (
    <group position={[0, 0.91, 0]}>
      {/* Notizbuch und Stift */}
      <RBox position={[-0.05, 0.012, 0.32]} rotation={[0, 0.35, 0]} size={[0.26, 0.024, 0.19]} color={C.blue} radius={0.008} />
      <RBox position={[-0.05, 0.026, 0.32]} rotation={[0, 0.35, 0]} size={[0.24, 0.004, 0.17]} color="#fbf8f1" radius={0.002} />
      <Cyl args={[0.007, 0.007, 0.15]} position={[0.12, 0.008, 0.36]} rotation={[0, 0.9, Math.PI / 2]} color={C.yellow} />
      {/* Reagenzglas-Ständer */}
      <group position={[0.05, 0, -0.38]}>
        <RBox position={[0, 0.06, 0]} size={[0.32, 0.02, 0.08]} color={C.cream} radius={0.008} />
        <RBox position={[0, 0.005, 0]} size={[0.32, 0.01, 0.08]} color={C.cream} radius={0.004} />
        {[-1, 1].map((s) => (
          <RBox key={s} position={[s * 0.15, 0.035, 0]} size={[0.02, 0.06, 0.08]} color={C.cream} radius={0.006} />
        ))}
        {tubes.map((col, i) => (
          <group key={i} position={[-0.105 + i * 0.07, 0, 0]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.15, seg(12)]} />
              <Glass />
            </mesh>
            <mesh position={[0, 0.045 + i * 0.006, 0]}>
              <cylinderGeometry args={[0.013, 0.013, 0.07 + i * 0.012, seg(12)]} />
              <Glow color={col} intensity={1.1} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Becherglas */}
      <group position={[-0.95, 0, 0.25]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.14, seg(20), 1, true]} />
          <Glass />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.06, seg(20)]} />
          <Glow color="#5ad1c0" intensity={1.0} />
        </mesh>
      </group>
    </group>
  )
}

function DecoMonitor() {
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    ctx.fillStyle = '#0d1f2e'
    ctx.fillRect(0, 0, w, h)
    const bars = 16
    const bw = (w - 40) / bars
    for (let i = 0; i < bars; i++) {
      const v = 0.35 + 0.3 * Math.sin(t * 2 + i * 0.6) + 0.2 * Math.sin(t * 5.3 + i * 1.7)
      const bh = Math.max(4, v * (h - 60))
      ctx.fillStyle = i % 3 === 0 ? '#f6c445' : '#5ad1c0'
      ctx.fillRect(20 + i * bw + 2, h - 18 - bh, bw - 4, bh)
    }
    ctx.fillStyle = '#9fd8ff'
    ctx.font = 'bold 18px system-ui, sans-serif'
    ctx.fillText('SPEKTRUM', 18, 28)
  }
  return (
    <group position={[0.35, 0.925, -HZ + 0.3]} scale={PROP_SCALE * 0.9}>
      <RBox position={[0, 0.01, 0]} size={[0.24, 0.02, 0.16]} color={C.slate} radius={0.008} />
      <RBox position={[0, 0.13, -0.02]} size={[0.05, 0.24, 0.03]} color={C.slate} radius={0.012} />
      <RBox position={[0, 0.34, 0]} size={[0.64, 0.4, 0.035]} color={C.slate} radius={0.02} />
      <Screen width={0.58} height={0.34} position={[0, 0.34, 0.019]} draw={draw} brightness={1.3} />
    </group>
  )
}

function Hazard() {
  const tex = useMemo(() => hazardTexture(), [])
  return (
    <mesh position={[0, 0.004, HZ - 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.4, 0.35]} />
      <meshStandardMaterial flatShading={LOWPOLY} map={tex} roughness={0.7} />
    </mesh>
  )
}

export function Decor() {
  const bubbleSources = useMemo<V3[]>(
    () =>
      FLASKS.map((f) => [SHELF_POS[0] + 0.02, f.y + (f.kind === 'round' ? 0.09 : 0.08), SHELF_POS[2] + f.z]),
    [],
  )
  return (
    <>
      <Shelf />
      <Bubbles sources={bubbleSources} />
      <Window />
      <Posters />
      <Clock />
      <Pipes />
      <Plant />
      <Stool position={[-0.6, 0, -0.95]} />
      <Stool position={[0.65, 0, -0.9]} />
      <Extinguisher />
      <TableClutter />
      <DecoMonitor />
      <Hazard />
    </>
  )
}
