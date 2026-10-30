import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Sparkles, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { C, Collider, Cyl, Glow, Hit, RBox, Screen, Solid, damp, type V3 } from './kit'
import { LOWPOLY, seg } from './style'
import { exitSignTexture, floorTexture, plaqueTexture } from './textures'
import { OBJECTS } from '../game/config'
import { Decor } from './Decor'
import { DOOR_HALF, FX_LAYER, HX, HZ, PROP_SCALE, ROOM, WINDOW } from './layout'
import { Park } from './Park'
import { LanguageEngine } from './LanguageEngine'

// ---------- Licht & Atmosphäre ----------

/**
 * Staub im Licht. Liegt auf einer eigenen Render-Ebene: Die Spielerkamera sieht
 * sie (siehe Player.tsx), die Kamera der Kontaktschatten nicht – sonst werfen die
 * Partikel quadratische Schatten.
 */
function Dust() {
  const ref = useRef<THREE.Points>(null)
  useEffect(() => {
    ref.current?.layers.set(FX_LAYER)
  }, [])
  return <Sparkles ref={ref} count={70} scale={[ROOM.w - 0.5, ROOM.h - 0.4, ROOM.d - 0.5]} position={[0, ROOM.h / 2, 0]} size={1.6} speed={0.15} opacity={0.35} color="#fff4d6" />
}

function Lighting() {
  return (
    <>
      {/* Umgebungslicht aus „Lichtflächen“ – liefert weiche Beleuchtung und Reflexionen */}
      {/* Low-Poly: weniger Rundum-Licht, dafür ein klares Hauptlicht – so heben sich die Facetten ab */}
      <Environment resolution={128} frames={1} environmentIntensity={LOWPOLY ? 0.45 : 1}>
        <Lightformer form="rect" intensity={1.6} color="#fff4e2" position={[0, ROOM.h + 1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[ROOM.w, ROOM.d, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#cfe9ff" position={[HX + 1, 1.6, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#ffffff" position={[0, 1.4, -HZ - 1.5]} scale={[ROOM.w, ROOM.h, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#ffe9cf" position={[0, 1.4, HZ + 1.5]} rotation={[0, Math.PI, 0]} scale={[ROOM.w, ROOM.h, 1]} />
        {/* simuliertes Streulicht vom hellen Boden */}
        <Lightformer form="rect" intensity={0.7} color="#f3e6d2" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[ROOM.w, ROOM.d, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[-HX - 1, 1.4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[ROOM.d, ROOM.h, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4e0', '#b9ad9c', LOWPOLY ? 0.55 : 0.75]} />
      {/* Sonnenlicht durchs Fenster */}
      <directionalLight position={[HX + 3, 4, -1]} intensity={LOWPOLY ? 1.3 : 0.9} color="#ffe2b8" />
      {/* Hauptlicht von schräg oben (nur Low-Poly) */}
      {LOWPOLY && <directionalLight position={[-3, 6, 4]} intensity={1.5} color="#fff6ea" />}
      {/* Weiche Kontaktschatten – werden nur einmal berechnet */}
      <ContactShadows position={[0, 0.003, 0]} scale={[ROOM.w, ROOM.d]} resolution={1024} far={1.6} blur={2.2} opacity={0.55} color="#2d3440" frames={1} />
      <ContactShadows position={[0, 0.912, 0]} scale={[2.4, 1.2]} resolution={512} far={0.45} blur={1.6} opacity={0.6} color="#10161c" frames={1} />
      <ContactShadows position={[0.9, 0.922, -2.1]} scale={[2, 0.7]} resolution={512} far={0.5} blur={1.6} opacity={0.5} color="#2d3440" frames={1} />
      {/* Staub im Licht */}
      <Dust />
    </>
  )
}

// ---------- Raum ----------

function Room() {
  const floor = useMemo(() => {
    const t = floorTexture()
    t.repeat.set(ROOM.w / 2, ROOM.d / 2) // 50-cm-Fliesen
    return t
  }, [])
  const fw = HX - DOOR_HALF // Breite der Wandstücke links und rechts der Tür
  return (
    <>
      {/* Boden */}
      <Collider position={[0, -0.05, 0]} size={[ROOM.w, 0.1, ROOM.d]} />
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[ROOM.w, 0.1, ROOM.d]} />
        <meshStandardMaterial flatShading={LOWPOLY} map={floor} roughness={0.55} />
      </mesh>

      {/* Decke */}
      <mesh position={[0, ROOM.h + 0.05, 0]}>
        <boxGeometry args={[ROOM.w + 0.2, 0.1, ROOM.d + 0.2]} />
        <meshStandardMaterial color={C.ceiling} roughness={0.9} emissive="#d9d4c8" emissiveIntensity={0.35} />
      </mesh>

      {/* Wände */}
      <Solid position={[0, ROOM.h / 2, -HZ - 0.05]} size={[ROOM.w + 0.2, ROOM.h, 0.1]} color={C.wall} radius={0.01} />
      <Solid position={[-HX - 0.05, ROOM.h / 2, 0]} size={[0.1, ROOM.h, ROOM.d + 0.2]} color={C.wall} radius={0.01} />
      {/* rechte Wand mit Fensteröffnung: Kollision über die ganze Wand, Optik in vier Stücken */}
      <RightWall />
      {/* Vorderwand mit Türöffnung */}
      <Solid position={[-(DOOR_HALF + fw / 2), ROOM.h / 2, HZ + 0.05]} size={[fw, ROOM.h, 0.1]} color={C.wall} radius={0.002} />
      <Solid position={[DOOR_HALF + fw / 2, ROOM.h / 2, HZ + 0.05]} size={[fw, ROOM.h, 0.1]} color={C.wall} radius={0.002} />
      <Solid position={[0, (2.2 + ROOM.h) / 2, HZ + 0.05]} size={[1.6, ROOM.h - 2.2, 0.1]} color={C.wall} radius={0.002} />
      <Collider position={[0, 1.1, HZ + 0.05]} size={[DOOR_HALF * 2, 2.2, 0.1]} />
      {/* Licht hinter der Tür (sichtbar, wenn sie aufgeht) */}
      <mesh position={[0, 1.1, HZ + 0.09]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.3, 2.25]} />
        <Glow color="#fff6e4" intensity={3} />
      </mesh>

      <Wainscot />

      {/* Deckenleuchten */}
      {[-1.4, 1.4].map((x) => [-1.1, 1.1].map((z) => <Lamp key={`${x}${z}`} position={[x, ROOM.h - 0.03, z]} flicker={x > 0 && z > 0} />))}
    </>
  )
}

/** Rechte Wand mit echter Öffnung, damit man in den Park hinausschauen kann */
function RightWall() {
  const z0 = WINDOW.z - WINDOW.w / 2
  const z1 = WINDOW.z + WINDOW.w / 2
  const y0 = WINDOW.y - WINDOW.h / 2
  const y1 = WINDOW.y + WINDOW.h / 2
  const zMin = -HZ - 0.1
  const zMax = HZ + 0.1
  const x = HX + 0.05
  const pieces: { p: V3; s: V3 }[] = [
    { p: [x, ROOM.h / 2, (zMin + z0) / 2], s: [0.1, ROOM.h, z0 - zMin] },
    { p: [x, ROOM.h / 2, (z1 + zMax) / 2], s: [0.1, ROOM.h, zMax - z1] },
    // Stücke über und unter dem Fenster überlappen die Seitenteile leicht – sonst blitzen Fugen
    { p: [x, y0 / 2, WINDOW.z], s: [0.1, y0, WINDOW.w + 0.06] },
    { p: [x, (y1 + ROOM.h) / 2, WINDOW.z], s: [0.1, ROOM.h - y1, WINDOW.w + 0.06] },
  ]
  return (
    <>
      <Collider position={[x, ROOM.h / 2, 0]} size={[0.1, ROOM.h, ROOM.d + 0.2]} />
      {pieces.map((pc, i) => (
        <mesh key={i} position={pc.p}>
          <boxGeometry args={pc.s} />
          <meshStandardMaterial color={C.wall} roughness={0.85} flatShading={LOWPOLY} />
        </mesh>
      ))}
    </>
  )
}

/** Wandsockel in Petrol mit Abschlussleiste und Fußleiste */
function Wainscot() {
  const h = 1.05
  const fw = HX - DOOR_HALF
  const parts: { p: V3; s: V3 }[] = [
    { p: [0, h / 2, -HZ + 0.01], s: [ROOM.w, h, 0.02] },
    { p: [-HX + 0.01, h / 2, 0], s: [0.02, h, ROOM.d] },
    { p: [HX - 0.01, h / 2, 0], s: [0.02, h, ROOM.d] },
    { p: [-(DOOR_HALF + fw / 2), h / 2, HZ - 0.01], s: [fw, h, 0.02] },
    { p: [DOOR_HALF + fw / 2, h / 2, HZ - 0.01], s: [fw, h, 0.02] },
  ]
  const thick = (v: number, t: number) => (v === 0.02 ? t : v)
  return (
    <>
      {parts.map(({ p, s }, i) => (
        <group key={i}>
          <mesh position={p}>
            <boxGeometry args={s} />
            <meshStandardMaterial flatShading={LOWPOLY} color={C.teal} roughness={0.7} />
          </mesh>
          <mesh position={[p[0], h, p[2]]}>
            <boxGeometry args={[thick(s[0], 0.045), 0.04, thick(s[2], 0.045)]} />
            <meshStandardMaterial flatShading={LOWPOLY} color={C.tealDark} roughness={0.6} />
          </mesh>
          <mesh position={[p[0], 0.05, p[2]]}>
            <boxGeometry args={[thick(s[0], 0.04), 0.1, thick(s[2], 0.04)]} />
            <meshStandardMaterial flatShading={LOWPOLY} color={C.slate} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Lamp({ position, flicker }: { position: V3; flicker?: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (!flicker || !mat.current) return
    // Gelegentliches Flackern einer Röhre
    const t = clock.elapsedTime % 7
    mat.current.emissiveIntensity = t > 6.2 && Math.sin(t * 60) > 0 ? 0.4 : 2.2
  })
  return (
    <group position={position}>
      <RBox size={[1.5, 0.06, 0.5]} color={C.cream} radius={0.02} />
      <mesh position={[0, -0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.38, 0.38]} />
        <meshStandardMaterial ref={mat} color="#000000" emissive="#fff3dc" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Table() {
  return (
    <group>
      <Collider position={[0, 0.46, 0]} size={[2.4, 0.92, 1.2]} />
      <RBox position={[0, 0.88, 0]} size={[2.4, 0.06, 1.2]} color={C.slate} radius={0.02} roughness={0.45} />
      <RBox position={[0, 0.83, 0]} size={[2.25, 0.05, 1.05]} color={C.creamDark} radius={0.015} />
      {[[-1.08, -0.48], [1.08, -0.48], [-1.08, 0.48], [1.08, 0.48]].map(([x, z]) => (
        <RBox key={`${x}${z}`} position={[x, 0.41, z]} size={[0.07, 0.82, 0.07]} color={C.cream} radius={0.03} />
      ))}
      <RBox position={[0, 0.18, -0.48]} size={[2.1, 0.04, 0.04]} color={C.creamDark} radius={0.015} />
      <RBox position={[0, 0.18, 0.48]} size={[2.1, 0.04, 0.04]} color={C.creamDark} radius={0.015} />
    </group>
  )
}

// ---------- Interaktive Gegenstände ----------

function Microscope() {
  const id = 'mikroskop'
  return (
    <Hit id={id} position={[-0.6, 0.91, -0.1]} scale={PROP_SCALE}>
      <RBox id={id} position={[0, 0.03, 0]} size={[0.3, 0.06, 0.24]} color={C.slate} radius={0.025} />
      <RBox id={id} position={[0, 0.22, -0.08]} rotation={[0.18, 0, 0]} size={[0.07, 0.36, 0.08]} color={C.cream} radius={0.03} />
      <RBox id={id} position={[0, 0.15, 0.03]} size={[0.2, 0.025, 0.17]} color={C.slate} radius={0.01} />
      <RBox id={id} position={[0, 0.168, 0.03]} size={[0.07, 0.005, 0.11]} color="#ffffff" radius={0.002} />
      <Cyl id={id} args={[0.04, 0.045, 0.24]} position={[0, 0.33, 0.0]} rotation={[0.45, 0, 0]} color={C.cream} />
      <Cyl id={id} args={[0.03, 0.03, 0.06]} position={[0, 0.44, -0.05]} rotation={[0.45, 0, 0]} color={C.slate} />
      <Cyl id={id} args={[0.02, 0.012, 0.05]} position={[0, 0.215, 0.05]} color={C.slate} />
      {[-1, 1].map((s) => (
        <Cyl key={s} id={id} args={[0.035, 0.035, 0.03]} position={[s * 0.055, 0.12, -0.08]} rotation={[0, 0, Math.PI / 2]} color={C.orange} />
      ))}
    </Hit>
  )
}

function CodeBox() {
  const id = 'box'
  const solved = useGame((s) => !!s.solved[id])
  const lid = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (lid.current) lid.current.rotation.x = damp(lid.current.rotation.x, solved ? -1.9 : 0, 4, dt)
  })
  return (
    <Hit id={id} position={[0.55, 0.91, 0.05]} rotation={[0, -0.25, 0]} scale={PROP_SCALE}>
      <RBox id={id} position={[0, 0.1, 0]} size={[0.42, 0.2, 0.3]} color={C.orange} radius={0.03} />
      <group ref={lid} position={[0, 0.2, -0.15]}>
        <RBox id={id} position={[0, 0.02, 0.15]} size={[0.43, 0.045, 0.31]} color={C.orangeDark} radius={0.02} />
        <RBox id={id} position={[0, 0.05, 0.15]} size={[0.16, 0.025, 0.03]} color={C.slate} radius={0.01} />
      </group>
      {/* Tastenfeld */}
      <RBox id={id} position={[0.1, 0.1, 0.152]} size={[0.15, 0.13, 0.012]} color={C.slate} radius={0.01} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <RBox key={`${r}${c}`} position={[0.06 + c * 0.04, 0.135 - r * 0.033, 0.16]} size={[0.03, 0.024, 0.008]} color={C.cream} radius={0.004} />
        )),
      )}
      <mesh position={[-0.1, 0.15, 0.152]}>
        <sphereGeometry args={[0.012, seg(12), seg(12)]} />
        <Glow color={solved ? C.green : C.red} intensity={3} />
      </mesh>
      {solved && <RBox position={[0, 0.03, 0]} size={[0.12, 0.008, 0.08]} color={C.blue} radius={0.003} />}
    </Hit>
  )
}

function Cabinet() {
  const id = 'schrank'
  const solved = useGame((s) => !!s.solved[id])
  const door = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (door.current) door.current.rotation.y = damp(door.current.rotation.y, solved ? -1.9 : 0, 3, dt)
  })
  const c = C.cream
  const bottles: [number, string][] = [[-0.3, C.yellow], [0, C.blue], [0.3, C.red]]
  return (
    <group position={[-1.3, 0, -HZ + 0.35]}>
      <Collider position={[0, 1, 0]} size={[1.2, 2, 0.6]} />
      <Hit id={id}>
        <RBox id={id} position={[0, 1, -0.28]} size={[1.2, 2, 0.04]} color={c} radius={0.015} />
        <RBox id={id} position={[-0.58, 1, 0]} size={[0.04, 2, 0.6]} color={c} radius={0.015} />
        <RBox id={id} position={[0.58, 1, 0]} size={[0.04, 2, 0.6]} color={c} radius={0.015} />
        <RBox id={id} position={[0, 2.0, 0]} size={[1.24, 0.06, 0.64]} color={C.teal} radius={0.02} />
        <RBox id={id} position={[0, 0.04, 0]} size={[1.2, 0.08, 0.6]} color={C.slate} radius={0.02} />
        <RBox position={[0, 1.0, 0]} size={[1.1, 0.03, 0.5]} color={C.creamDark} radius={0.01} />
        <RBox position={[0, 1.5, 0]} size={[1.1, 0.03, 0.5]} color={C.creamDark} radius={0.01} />
        {bottles.map(([x, col]) => (
          <group key={x} position={[x, 1.015, 0]}>
            <Cyl args={[0.07, 0.07, 0.2]} position={[0, 0.1, 0]} color={col} roughness={0.35} />
            <Cyl args={[0.035, 0.035, 0.05]} position={[0, 0.225, 0]} color={C.slate} />
          </group>
        ))}
        <group ref={door} position={[-0.6, 1, 0.3]}>
          <RBox id={id} position={[0.6, 0, 0.02]} size={[1.2, 1.96, 0.045]} color={c} radius={0.02} />
          {/* Milchglasfenster */}
          <RBox position={[0.6, 0.35, 0.045]} size={[0.8, 0.9, 0.01]} color="#cfe6ee" roughness={0.15} metalness={0.1} radius={0.004} />
          <RBox id={id} position={[1.08, -0.05, 0.07]} size={[0.035, 0.28, 0.04]} color={C.slate} radius={0.015} />
          <RBox id={id} position={[1.08, -0.28, 0.05]} size={[0.06, 0.08, 0.012]} color={C.orange} radius={0.006} />
        </group>
      </Hit>
    </group>
  )
}

function Sideboard() {
  const id = 'schublade'
  const solved = useGame((s) => !!s.solved[id])
  const drawer = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (drawer.current) drawer.current.position.z = damp(drawer.current.position.z, solved ? 0.45 : 0, 4, dt)
  })
  return (
    <group position={[0.9, 0, -HZ + 0.4]}>
      <Collider position={[0, 0.45, 0]} size={[2, 0.9, 0.7]} />
      <RBox position={[0, 0.45, 0]} size={[2, 0.88, 0.7]} color={C.cream} radius={0.02} />
      <RBox position={[0, 0.9, 0.01]} size={[2.06, 0.045, 0.74]} color={C.slate} radius={0.015} roughness={0.45} />
      <RBox position={[0, 0.04, 0.02]} size={[1.96, 0.08, 0.66]} color={C.slate} radius={0.02} />
      {/* Deko-Schublade */}
      <RBox position={[-0.5, 0.36, 0.36]} size={[0.86, 0.3, 0.03]} color={C.teal} radius={0.015} />
      <RBox position={[-0.5, 0.42, 0.385]} size={[0.24, 0.03, 0.03]} color={C.slate} radius={0.012} />
      {/* Türen rechts */}
      {[0.27, 0.73].map((x) => (
        <group key={x}>
          <RBox position={[x, 0.47, 0.36]} size={[0.44, 0.7, 0.03]} color={C.teal} radius={0.015} />
          <RBox position={[x + (x < 0.5 ? 0.16 : -0.16), 0.55, 0.385]} size={[0.03, 0.16, 0.03]} color={C.slate} radius={0.012} />
        </group>
      ))}
      {/* Interaktive Schublade */}
      <Hit id={id}>
        <group ref={drawer} position={[-0.5, 0.72, 0]}>
          <RBox id={id} position={[0, 0, 0.36]} size={[0.86, 0.22, 0.03]} color={C.teal} radius={0.015} />
          <RBox id={id} position={[0, 0.02, 0.385]} size={[0.24, 0.03, 0.03]} color={C.slate} radius={0.012} />
          <RBox position={[0, -0.02, 0.03]} size={[0.78, 0.15, 0.6]} color={C.creamDark} radius={0.01} />
          <RBox position={[0.1, 0.06, 0.15]} size={[0.22, 0.004, 0.16]} color="#ffffff" radius={0.002} rotation={[0, 0.2, 0]} />
          <RBox position={[-0.2, 0.065, 0.05]} size={[0.14, 0.012, 0.012]} color={C.yellow} radius={0.005} rotation={[0, 0.6, 0]} />
        </group>
      </Hit>
    </group>
  )
}

function Centrifuge() {
  const id = 'zentrifuge'
  const on = useGame((s) => !!s.toggles[id])
  const rotor = useRef<THREE.Group>(null)
  const speed = useRef(0)
  useFrame((_, dt) => {
    speed.current = damp(speed.current, on ? 18 : 0, 1.2, dt)
    if (rotor.current) rotor.current.rotation.y += speed.current * dt
  })
  return (
    <Hit id={id} position={[1.5, 0.925, -HZ + 0.4]} scale={PROP_SCALE}>
      <Cyl id={id} args={[0.25, 0.27, 0.22]} position={[0, 0.11, 0]} color="#e8eef0" roughness={0.35} />
      <Cyl id={id} args={[0.255, 0.255, 0.025]} position={[0, 0.23, 0]} color={C.slate} />
      <group ref={rotor} position={[0, 0.26, 0]}>
        <Cyl args={[0.04, 0.04, 0.04]} color={C.steel} metalness={0.6} roughness={0.3} />
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <RBox position={[0.1, 0, 0]} size={[0.18, 0.025, 0.04]} color={C.steel} metalness={0.6} roughness={0.3} radius={0.01} />
            <Cyl args={[0.025, 0.02, 0.07]} position={[0.19, 0.01, 0]} color={i % 2 ? C.orange : C.blue} />
          </group>
        ))}
      </group>
      <RBox id={id} position={[0, 0.08, 0.25]} size={[0.16, 0.08, 0.04]} color={C.slate} radius={0.012} />
      <mesh position={[0.045, 0.08, 0.272]}>
        <sphereGeometry args={[0.012, seg(10), seg(10)]} />
        <Glow color={on ? C.green : '#556066'} intensity={on ? 3 : 0.4} />
      </mesh>
    </Hit>
  )
}

function Analyzer() {
  const id = 'analysegeraet'
  const solved = useGame((s) => !!s.solved[id])
  const lamp = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (lamp.current) lamp.current.emissiveIntensity = solved ? 2.5 : 1.5 + Math.sin(clock.elapsedTime * 4) * 1.2
  })
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    ctx.fillStyle = '#0a2324'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#123f3c'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    const col = solved ? '#5cffa8' : '#ffb347'
    ctx.strokeStyle = col
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = 0; x <= w; x += 4) {
      const y = solved
        ? h * 0.62 + Math.sin(x * 0.07 - t * 4) * h * 0.14 + Math.sin(x * 0.19 - t * 7) * h * 0.04
        : h * 0.68 + Math.sin(x * 0.05 - t * 2) * 4 + Math.sin(x * 1.7 + t * 30) * 2
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = col
    if (solved || Math.sin(t * 4) > -0.3) ctx.fillText(solved ? 'ANALYSE OK ✔' : 'PROBE EINLEGEN', 14, 32)
  }
  return (
    <group position={[HX - 0.55, 0, 0.9]}>
      <Collider position={[0, 0.65, 0]} size={[1, 1.3, 0.9]} />
      <Hit id={id}>
        <RBox id={id} position={[0, 0.66, 0]} size={[1, 1.24, 0.9]} color="#e8eef0" radius={0.07} roughness={0.4} />
        <RBox id={id} position={[0, 0.04, 0]} size={[0.96, 0.08, 0.86]} color={C.slate} radius={0.03} />
        <RBox id={id} position={[-0.49, 0.3, 0]} size={[0.04, 0.12, 0.9]} color={C.teal} radius={0.015} />
        {/* Bildschirm */}
        <RBox id={id} position={[-0.5, 0.95, 0]} size={[0.04, 0.42, 0.68]} color={C.slate} radius={0.02} />
        <Screen width={0.6} height={0.34} position={[-0.522, 0.95, 0]} rotation={[0, -Math.PI / 2, 0]} draw={draw} />
        {/* Probenschacht */}
        <RBox id={id} position={[-0.5, 0.6, 0]} size={[0.04, 0.1, 0.36]} color={C.slate} radius={0.015} />
        <mesh position={[-0.522, 0.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.3, 0.035]} />
          <Glow color={solved ? C.green : '#5ad1c0'} intensity={2.2} />
        </mesh>
        {/* Statuslampe */}
        <Cyl args={[0.05, 0.06, 0.05]} position={[0.2, 1.3, 0.25]} color={C.slate} />
        <mesh position={[0.2, 1.36, 0.25]}>
          <sphereGeometry args={[0.045, seg(16), seg(12)]} />
          <meshStandardMaterial ref={lamp} color="#000000" emissive={solved ? C.green : C.orange} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </Hit>
    </group>
  )
}

/** Bilderrahmen mit Porträt an der Rückwand – öffnet beim Anklicken ein Info-Fenster */
function Portrait() {
  const id = 'portrait'
  const o = OBJECTS[id]
  const image = useTexture(o.type === 'portrait' ? o.image : '')
  image.colorSpace = THREE.SRGBColorSpace
  image.anisotropy = 4
  const plaque = useMemo(() => plaqueTexture('Prof. Clever'), [])
  // Bild 3:4 (0,33 × 0,44 m), Passepartout und Holzrahmen drumherum
  return (
    <Hit id={id} position={[-0.4, 1.62, -HZ + 0.03]}>
      <RBox id={id} position={[0, 0, 0]} size={[0.47, 0.6, 0.035]} color="#8a5a3c" radius={0.012} roughness={0.7} />
      <mesh position={[0, 0, 0.019]}>
        <planeGeometry args={[0.39, 0.51]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[0.33, 0.44]} />
        <meshStandardMaterial map={image} roughness={0.6} />
      </mesh>
      {/* Messingschild */}
      <RBox position={[0, -0.37, 0.004]} size={[0.22, 0.055, 0.01]} color="#c99a3c" metalness={0.6} roughness={0.35} radius={0.004} />
      <mesh position={[0, -0.37, 0.0095]}>
        <planeGeometry args={[0.21, 0.05]} />
        <meshStandardMaterial map={plaque} metalness={0.4} roughness={0.4} />
      </mesh>
    </Hit>
  )
}

function ExitDoor() {
  const id = 'tuer'
  const completed = useGame((s) => s.completed)
  const hasCard = useGame((s) => s.inventory.includes('karte'))
  const door = useRef<THREE.Group>(null)
  const sign = useMemo(() => exitSignTexture(), [])
  const signColor = useMemo(() => new THREE.Color(1.8, 1.8, 1.8), [])
  useFrame((_, dt) => {
    if (door.current) door.current.rotation.y = damp(door.current.rotation.y, completed ? 1.5 : 0, 2, dt)
  })
  return (
    <group>
      <Hit id={id} position={[0, 0, HZ - 0.03]}>
        <RBox position={[-0.6, 1.1, 0]} size={[0.09, 2.22, 0.12]} color={C.slate} radius={0.02} />
        <RBox position={[0.6, 1.1, 0]} size={[0.09, 2.22, 0.12]} color={C.slate} radius={0.02} />
        <RBox position={[0, 2.22, 0]} size={[1.29, 0.09, 0.12]} color={C.slate} radius={0.02} />
        <group ref={door} position={[-0.55, 1.09, 0]}>
          <RBox id={id} position={[0.55, 0, 0]} size={[1.12, 2.18, 0.06]} color={C.door} radius={0.02} />
          <RBox id={id} position={[0.55, 0.45, -0.031]} size={[0.4, 0.55, 0.01]} color="#d6ecf3" roughness={0.15} radius={0.01} />
          <Cyl id={id} args={[0.02, 0.02, 0.7]} position={[0.55, -0.05, -0.08]} rotation={[0, 0, Math.PI / 2]} color={C.steel} metalness={0.7} roughness={0.25} />
          {[0.25, 0.85].map((x) => (
            <RBox key={x} position={[x, -0.05, -0.05]} size={[0.04, 0.05, 0.06]} color={C.steel} metalness={0.7} roughness={0.25} radius={0.01} />
          ))}
        </group>
        {/* Kartenleser */}
        <RBox id={id} position={[0.85, 1.2, -0.04]} size={[0.13, 0.2, 0.04]} color={C.slate} radius={0.015} />
        <RBox position={[0.85, 1.17, -0.062]} size={[0.08, 0.08, 0.005]} color={C.slateLight} radius={0.005} />
        <mesh position={[0.85, 1.27, -0.063]}>
          <sphereGeometry args={[0.012, seg(10), seg(10)]} />
          <Glow color={completed || hasCard ? C.green : C.red} intensity={3} />
        </mesh>
      </Hit>
      {/* Leuchtschild */}
      <RBox position={[0, 2.4, HZ - 0.05]} size={[0.62, 0.22, 0.06]} color={C.slate} radius={0.02} />
      <mesh position={[0, 2.4, HZ - 0.082]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.56, 0.18]} />
        <meshBasicMaterial map={sign} color={signColor} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Lab() {
  return (
    <>
      <Lighting />
      <Room />
      <Table />
      <Decor />
      <Microscope />
      <CodeBox />
      <Cabinet />
      <Sideboard />
      <Centrifuge />
      <Analyzer />
      <ExitDoor />
      <Portrait />
      <LanguageEngine />
      <Park />
    </>
  )
}
