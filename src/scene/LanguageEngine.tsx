import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { C, Collider, Cyl, Hit, RBox, damp, type V3 } from './kit'
import { FX_LAYER, HZ } from './layout'
import { seg } from './style'
import { gaugeTexture, plaqueTexture } from './textures'

// Sprachmaschine: ältere Dampfmaschine im Steampunk-Stil (Kessel, Hydraulik, Zahnräder,
// Manometer). Steht vorne links neben der Ausgangstür, leicht zur Raummitte gedreht.
// Ruhig: langsames Pumpen, ab und zu Dampf. Bei jeder Verarbeitung (enginePulse) pumpen
// die Kolben schnell, die Zahnräder drehen sich und es dampft kräftig.

const BUSY_SECONDS = 2.4
const PIVOT_Y = 1.52 // Drehpunkt des Balanciers über den Hydraulikzylindern
const ARM = 0.16 // halbe Länge des Balanciers

function Gear({ radius, teeth, color, id }: { radius: number; teeth: number; color: string; id?: string }) {
  return (
    <group>
      <Cyl id={id} args={[radius, radius, 0.03, teeth * 2]} rotation={[Math.PI / 2, 0, 0]} color={color} metalness={0.5} roughness={0.4} />
      <Cyl args={[radius * 0.3, radius * 0.3, 0.045]} rotation={[Math.PI / 2, 0, 0]} color={C.iron} />
      {Array.from({ length: teeth }, (_, i) => {
        const a = (i / teeth) * Math.PI * 2
        return (
          <RBox
            key={i}
            position={[Math.cos(a) * (radius + 0.012), Math.sin(a) * (radius + 0.012), 0]}
            rotation={[0, 0, a]}
            size={[0.03, 0.024, 0.03]}
            color={color}
            metalness={0.5}
            roughness={0.4}
            radius={0.004}
          />
        )
      })}
    </group>
  )
}

function Gauge({ position, labels, caption, needle }: { position: V3; labels: string[]; caption: string; needle: React.RefObject<THREE.Group | null> }) {
  const face = useMemo(() => gaugeTexture(labels, caption), [labels, caption])
  return (
    <group position={position}>
      <Cyl args={[0.085, 0.085, 0.03]} rotation={[Math.PI / 2, 0, 0]} color={C.brass} metalness={0.6} roughness={0.35} />
      <mesh position={[0, 0, 0.016]}>
        <circleGeometry args={[0.072, seg(32)]} />
        <meshStandardMaterial map={face} roughness={0.8} />
      </mesh>
      <group ref={needle} position={[0, 0, 0.02]}>
        <RBox position={[0.03, 0, 0]} size={[0.065, 0.007, 0.004]} color="#8b1e12" radius={0.002} />
      </group>
      <mesh position={[0, 0, 0.024]}>
        <sphereGeometry args={[0.008, seg(8), seg(6)]} />
        <meshStandardMaterial color={C.brassDark} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Winkel für einen Zeiger: Anteil 0 … 1 über die 270°-Skala des Zifferblatts */
const needleAngle = (f: number) => -(Math.PI * 0.75 + Math.PI * 1.5 * THREE.MathUtils.clamp(f, 0, 1))

type Puff = { age: number; alive: boolean; dx: number; dz: number }

/** Dampfwölkchen aus dem Schornstein */
function Steam({ position, busy }: { position: V3; busy: React.RefObject<number> }) {
  const COUNT = 10
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const puffs = useRef<Puff[]>(Array.from({ length: COUNT }, () => ({ age: 0, alive: false, dx: 0, dz: 0 })))
  const timer = useRef(0)
  useEffect(() => {
    for (const m of meshes.current) m?.layers.set(FX_LAYER)
  }, [])
  useFrame((_, dt) => {
    const act = busy.current ?? 0
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = act > 0.3 ? 0.11 : 1.4 + Math.random() * 1.2
      const free = puffs.current.find((p) => !p.alive)
      if (free) Object.assign(free, { age: 0, alive: true, dx: (Math.random() - 0.5) * 0.25, dz: (Math.random() - 0.5) * 0.15 })
    }
    puffs.current.forEach((p, i) => {
      const m = meshes.current[i]
      if (!m) return
      if (p.alive) p.age += dt / 1.8
      if (p.age >= 1) p.alive = false
      m.visible = p.alive
      if (!p.alive) return
      m.position.set(p.dx * p.age, p.age * 0.55, p.dz * p.age)
      m.scale.setScalar(0.03 + p.age * 0.1)
      ;(m.material as THREE.MeshStandardMaterial).opacity = 0.45 * (1 - p.age)
    })
  })
  return (
    <group position={position}>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} visible={false}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#f4f1ea" transparent opacity={0} depthWrite={false} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function LanguageEngine() {
  const id = 'sprachmaschine'
  const solved = useGame((s) => !!s.solved[id])
  const plaque = useMemo(() => plaqueTexture('Sprachmaschine'), [])
  const nLabels = useMemo(() => ['1', '2', '3', '4', '5'], [])
  const pLabels = useMemo(() => ['0', '1', '2', '3', '4'], [])

  const beam = useRef<THREE.Group>(null)
  const rodL = useRef<THREE.Group>(null)
  const rodR = useRef<THREE.Group>(null)
  const gearBig = useRef<THREE.Group>(null)
  const gearSmall = useRef<THREE.Group>(null)
  const pressure = useRef<THREE.Group>(null)
  const nNeedle = useRef<THREE.Group>(null)
  const lever = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.MeshStandardMaterial>(null)

  const busy = useRef(0) // 0 = Ruhe, 1 = volle Kraft
  const busyUntil = useRef(0)
  const lastPulse = useRef(useGame.getState().enginePulse)
  const phase = useRef(0)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const st = useGame.getState()
    if (st.enginePulse !== lastPulse.current) {
      lastPulse.current = st.enginePulse
      busyUntil.current = t + BUSY_SECONDS
    }
    busy.current = damp(busy.current, t < busyUntil.current ? 1 : 0, 3, dt)
    const act = busy.current

    // Hydraulik: Balancier wippt, die Kolbenstangen folgen seinen Enden
    phase.current += dt * (1.2 + act * 9)
    const theta = 0.33 * Math.sin(phase.current)
    if (beam.current) beam.current.rotation.z = theta
    const lift = ARM * Math.sin(theta)
    if (rodL.current) rodL.current.position.y = PIVOT_Y - lift
    if (rodR.current) rodR.current.position.y = PIVOT_Y + lift

    // Zahnräder: kleines Rad dreht gegenläufig und schneller
    const spin = dt * (0.25 + act * 4)
    if (gearBig.current) gearBig.current.rotation.z += spin
    if (gearSmall.current) gearSmall.current.rotation.z -= spin * (0.11 / 0.07)

    // Manometer: Druck steigt beim Arbeiten (mit leichtem Zittern), zweiter Zeiger zeigt n
    if (pressure.current) {
      const target = needleAngle(0.15 + act * 0.7 + Math.sin(t * 23) * 0.015 * (0.3 + act))
      pressure.current.rotation.z = damp(pressure.current.rotation.z, target, 6, dt)
    }
    if (nNeedle.current) nNeedle.current.rotation.z = damp(nNeedle.current.rotation.z, needleAngle((st.engineN - 1) / 4), 5, dt)

    if (lever.current) lever.current.rotation.x = damp(lever.current.rotation.x, act > 0.2 ? 0.7 : -0.35, 5, dt)
    if (lamp.current) lamp.current.emissiveIntensity = solved ? 2.6 : 1.2 + act * 2 + Math.sin(t * 3) * 0.5
  })

  return (
    <group position={[-2.05, 0, HZ - 0.55]} rotation={[0, Math.PI - 0.45, 0]}>
      <Collider position={[0, 0.7, -0.02]} size={[1.02, 1.4, 0.62]} />
      <Hit id={id}>
        {/* Sockel aus Gusseisen mit Nieten und Messingschild */}
        <RBox id={id} position={[0, 0.06, 0]} size={[1.0, 0.12, 0.6]} color={C.iron} radius={0.02} roughness={0.7} />
        {[-0.44, -0.3, 0.3, 0.44].map((x) => (
          <mesh key={x} position={[x, 0.06, 0.302]}>
            <sphereGeometry args={[0.012, seg(8), seg(6)]} />
            <meshStandardMaterial color={C.brass} metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        <RBox position={[0, 0.06, 0.3]} size={[0.3, 0.075, 0.008]} color={C.brassDark} metalness={0.6} roughness={0.35} radius={0.003} />
        <mesh position={[0, 0.06, 0.3045]}>
          <planeGeometry args={[0.28, 0.065]} />
          <meshStandardMaterial map={plaque} metalness={0.4} roughness={0.4} />
        </mesh>

        {/* Kessel aus Kupfer mit Messingbändern, Haube und Schornstein */}
        <group position={[-0.24, 0, 0]}>
          <Cyl id={id} args={[0.22, 0.22, 0.74, 20]} position={[0, 0.49, 0]} color={C.copper} metalness={0.55} roughness={0.4} />
          {[0.24, 0.74].map((y) => (
            <Cyl key={y} args={[0.228, 0.228, 0.045, 20]} position={[0, y, 0]} color={C.brass} metalness={0.6} roughness={0.35} />
          ))}
          <Cyl id={id} args={[0.09, 0.22, 0.14, 20]} position={[0, 0.93, 0]} color={C.copper} metalness={0.55} roughness={0.4} />
          <Cyl id={id} args={[0.045, 0.05, 0.42, 12]} position={[0, 1.2, 0]} color={C.iron} roughness={0.6} />
          <Cyl args={[0.062, 0.062, 0.04, 12]} position={[0, 1.41, 0]} color={C.brass} metalness={0.6} roughness={0.35} />
          {/* Wartungsklappe */}
          <RBox position={[0, 0.5, 0.212]} size={[0.15, 0.2, 0.02]} color={C.brass} metalness={0.6} roughness={0.35} radius={0.008} />
          {[[-0.055, 0.58], [0.055, 0.58], [-0.055, 0.42], [0.055, 0.42]].map(([x, y]) => (
            <mesh key={`${x}${y}`} position={[x, y, 0.224]}>
              <sphereGeometry args={[0.009, seg(8), seg(6)]} />
              <meshStandardMaterial color={C.brassDark} metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          {/* Rohr nach oben in die Decke */}
          <Cyl args={[0.03, 0.03, 2.0, 12]} position={[-0.1, 1.6, -0.2]} color={C.copper} metalness={0.55} roughness={0.4} />
          {[1.0, 1.8, 2.4].map((y) => (
            <Cyl key={y} args={[0.04, 0.04, 0.035, 12]} position={[-0.1, y, -0.2]} color={C.brass} metalness={0.6} roughness={0.35} />
          ))}
        </group>
        <Steam position={[-0.24, 1.44, 0]} busy={busy} />

        {/* Steuerkasten mit Zahnrädern und Lochstreifen */}
        <RBox id={id} position={[0.24, 0.45, 0]} size={[0.46, 0.66, 0.44]} color={C.iron} radius={0.02} roughness={0.65} />
        <RBox position={[0.24, 0.8, 0]} size={[0.5, 0.04, 0.48]} color={C.brass} metalness={0.6} roughness={0.35} radius={0.01} />
        <group ref={gearBig} position={[0.15, 0.44, 0.235]}>
          <Gear id={id} radius={0.11} teeth={12} color={C.brass} />
        </group>
        <group ref={gearSmall} position={[0.34, 0.6, 0.235]}>
          <Gear radius={0.07} teeth={8} color={C.copper} />
        </group>
        <RBox position={[0.27, 0.2, 0.222]} size={[0.18, 0.035, 0.02]} color="#1d1a18" radius={0.006} />
        <RBox position={[0.27, 0.165, 0.29]} rotation={[0.55, 0, 0]} size={[0.12, 0.003, 0.16]} color="#efe4c8" radius={0.001} />
        {/* Hebel an der Seite */}
        <RBox position={[0.475, 0.55, 0]} size={[0.03, 0.08, 0.08]} color={C.brassDark} metalness={0.6} roughness={0.4} radius={0.008} />
        <group ref={lever} position={[0.5, 0.55, 0]}>
          <Cyl args={[0.012, 0.012, 0.24]} position={[0, 0.12, 0]} color={C.steel} metalness={0.7} roughness={0.3} />
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.03, seg(12), seg(8)]} />
            <meshStandardMaterial color={C.red} roughness={0.5} />
          </mesh>
        </group>

        {/* Messingpult mit zwei Manometern und Statuslampe */}
        <group position={[0.24, 0.98, 0.1]} rotation={[-0.15, 0, 0]}>
          <RBox id={id} size={[0.48, 0.3, 0.05]} color={C.brass} metalness={0.55} roughness={0.4} radius={0.015} />
          <Gauge position={[-0.11, -0.01, 0.03]} labels={pLabels} caption="Druck" needle={pressure} />
          <Gauge position={[0.11, -0.01, 0.03]} labels={nLabels} caption="n" needle={nNeedle} />
          <mesh position={[0, 0.17, 0]}>
            <sphereGeometry args={[0.03, seg(14), seg(10)]} />
            <meshStandardMaterial ref={lamp} color="#000000" emissive={solved ? C.green : '#ffaa33'} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </group>

        {/* Hydraulik: zwei Zylinder, Kolbenstangen und wippender Balancier */}
        <RBox position={[0.24, 1.17, -0.12]} size={[0.04, 0.72, 0.04]} color={C.iron} radius={0.01} />
        {[0.24 - ARM, 0.24 + ARM].map((x) => (
          <group key={x}>
            <Cyl id={id} args={[0.05, 0.05, 0.4, 14]} position={[x, 1.02, -0.12]} color={C.iron} roughness={0.55} metalness={0.3} />
            <Cyl args={[0.056, 0.056, 0.035, 14]} position={[x, 1.22, -0.12]} color={C.brass} metalness={0.6} roughness={0.35} />
            <Cyl args={[0.056, 0.056, 0.035, 14]} position={[x, 0.84, -0.12]} color={C.brass} metalness={0.6} roughness={0.35} />
          </group>
        ))}
        {[rodL, rodR].map((ref, i) => (
          <group key={i} ref={ref} position={[0.24 + (i ? ARM : -ARM), PIVOT_Y, -0.12]}>
            <Cyl args={[0.018, 0.018, 0.34]} position={[0, -0.17, 0]} color={C.steel} metalness={0.8} roughness={0.2} />
            <mesh>
              <sphereGeometry args={[0.026, seg(10), seg(8)]} />
              <meshStandardMaterial color={C.brass} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        ))}
        <group ref={beam} position={[0.24, PIVOT_Y, -0.12]}>
          <RBox id={id} size={[ARM * 2 + 0.06, 0.035, 0.05]} color={C.copper} metalness={0.5} roughness={0.4} radius={0.01} />
          <Cyl args={[0.025, 0.025, 0.07]} rotation={[Math.PI / 2, 0, 0]} color={C.brass} metalness={0.6} roughness={0.35} />
        </group>
        {/* Dampfleitung vom Kessel zur Hydraulik */}
        <Cyl args={[0.024, 0.024, 0.22, 10]} position={[-0.02, 1.0, -0.12]} rotation={[0, 0, Math.PI / 2]} color={C.copper} metalness={0.55} roughness={0.4} />
        <Cyl args={[0.024, 0.024, 0.12, 10]} position={[-0.13, 0.95, -0.12]} color={C.copper} metalness={0.55} roughness={0.4} />
      </Hit>
    </group>
  )
}
