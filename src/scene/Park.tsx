import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HX, WINDOW } from './layout'
import { LOWPOLY, seg } from './style'
import { skyDomeTexture } from './textures'
import type { V3 } from './kit'

/**
 * Außenwelt hinter dem Fenster: ein kleiner Low-Poly-Park.
 *
 * Bewusst echte 3D-Geometrie statt eines Bildes: Nur so stimmt die Perspektive aus
 * jedem Blickwinkel, und beim Gehen verschieben sich nahe Dinge stärker als ferne
 * (Parallaxe). Aufgebaut in drei Tiefenebenen:
 * - nah (1–3 m vor dem Fenster): Hecke und Büsche
 * - mittel (5–25 m): Wiese, Weg, Teich, Bank, Laterne, Bäume
 * - fern (30–90 m): Hügel, Berge, Wolken, Sonne, Himmelskuppel – plus Nebel für Tiefe
 *
 * Bäume und Büsche sind Instanzen (ein Draw Call je Form), damit das Tablet nicht leidet.
 */

const X0 = HX + 0.1 // Außenseite der rechten Wand

/** Reproduzierbarer Zufall, damit der Park bei jedem Laden gleich aussieht */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function OutMat({ color }: { color: string }) {
  return <meshStandardMaterial color={color} flatShading={LOWPOLY} roughness={0.95} />
}

type Item = { p: V3; s: V3; r?: number; c: string }

/** Viele gleiche Formen mit eigener Position, Größe und Farbe in einem Draw Call */
function Many({ items, children }: { items: Item[]; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.scale.set(...it.s)
      o.rotation.set(0, it.r ?? 0, 0)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, col.set(it.c))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {children}
      <meshStandardMaterial flatShading={LOWPOLY} roughness={0.95} />
    </instancedMesh>
  )
}

function useVegetation() {
  return useMemo(() => {
    const rand = rng(7)
    const trunks: Item[] = []
    const crowns: Item[] = []
    const pines: Item[] = []
    const bushes: Item[] = []
    const greens = ['#5fae55', '#6cbf5e', '#4f9e4c', '#7ccb63', '#58a95a']
    const pineGreens = ['#3f8a52', '#357a49', '#4a9659']

    // nah: Hecke direkt vor dem Fenster
    for (let z = WINDOW.z - 2.6; z <= WINDOW.z + 2.6; z += 0.55) {
      const s = 0.45 + rand() * 0.25
      bushes.push({ p: [X0 + 1.3 + rand() * 0.4, s * 0.8, z], s: [s, s * 1.1, s], r: rand() * 6, c: greens[Math.floor(rand() * greens.length)] })
    }
    // mittel: Bäume – vor dem Fenster eine Sichtachse zum Teich freilassen
    let tries = 0
    while (trunks.length + pines.length < 26 && tries++ < 500) {
      const x = X0 + 5 + rand() * 20
      const z = WINDOW.z - 18 + rand() * 36
      const inView = Math.abs(z - WINDOW.z) < 4 && x < X0 + 15
      const onPath = Math.abs(z - pathZ(x)) < 1.6
      if (inView || onPath) continue
      const h = 1.6 + rand() * 1.4
      if (rand() < 0.6) {
        trunks.push({ p: [x, h / 2, z], s: [0.18, h, 0.18], c: '#8a5a3c' })
        const cr = 1 + rand() * 0.7
        crowns.push({ p: [x, h + cr * 0.7, z], s: [cr, cr * 1.15, cr], r: rand() * 6, c: greens[Math.floor(rand() * greens.length)] })
        if (rand() < 0.5)
          crowns.push({ p: [x + 0.4, h + cr * 1.5, z - 0.3], s: [cr * 0.7, cr * 0.8, cr * 0.7], r: rand() * 6, c: greens[Math.floor(rand() * greens.length)] })
      } else {
        trunks.push({ p: [x, 0.4, z], s: [0.16, 0.8, 0.16], c: '#7a4e34' })
        const ph = 2.4 + rand() * 1.8
        pines.push({ p: [x, 0.6 + ph / 2, z], s: [1.1, ph, 1.1], r: rand() * 6, c: pineGreens[Math.floor(rand() * pineGreens.length)] })
        pines.push({ p: [x, 0.6 + ph * 0.85, z], s: [0.75, ph * 0.6, 0.75], r: rand() * 6, c: pineGreens[Math.floor(rand() * pineGreens.length)] })
      }
    }
    // ein paar Büsche in der Wiese
    for (let i = 0; i < 10; i++) {
      const x = X0 + 6 + rand() * 14
      const z = WINDOW.z - 12 + rand() * 24
      if (Math.abs(z - pathZ(x)) < 1.4) continue
      const s = 0.4 + rand() * 0.4
      bushes.push({ p: [x, s * 0.6, z], s: [s * 1.3, s, s * 1.3], r: rand() * 6, c: greens[Math.floor(rand() * greens.length)] })
    }
    return { trunks, crowns, pines, bushes }
  }, [])
}

/** Verlauf des Parkwegs (z in Abhängigkeit von der Entfernung x) */
function pathZ(x: number) {
  return WINDOW.z + 3.2 + Math.sin((x - X0) * 0.25) * 2.2
}

function Path() {
  const segs = useMemo(() => {
    const out: { p: V3; r: number }[] = []
    for (let x = X0 + 4; x < X0 + 30; x += 1.6) {
      const z = pathZ(x)
      const dz = pathZ(x + 0.1) - z
      out.push({ p: [x, 0.005, z], r: -Math.atan2(dz, 0.1) })
    }
    return out
  }, [])
  return (
    <>
      {segs.map((s, i) => (
        <mesh key={i} position={s.p} rotation={[0, s.r, 0]}>
          <boxGeometry args={[1.8, 0.02, 1.1]} />
          <OutMat color="#e3cf9e" />
        </mesh>
      ))}
    </>
  )
}

function Bench({ position }: { position: V3 }) {
  return (
    <group position={position} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.45, 0.06, 1.5]} />
        <OutMat color="#b3733f" />
      </mesh>
      <mesh position={[0.2, 0.75, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.06, 0.4, 1.5]} />
        <OutMat color="#b3733f" />
      </mesh>
      {[-0.6, 0.6].map((z) => (
        <mesh key={z} position={[0, 0.22, z]}>
          <boxGeometry args={[0.4, 0.44, 0.06]} />
          <OutMat color="#3b4650" />
        </mesh>
      ))}
    </group>
  )
}

function Lamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 2.8, seg(12)]} />
        <OutMat color="#3b4650" />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 0.3, seg(12)]} />
        <OutMat color="#fff3c4" />
      </mesh>
    </group>
  )
}

function Clouds() {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rand = rng(3)
    return Array.from({ length: 6 }, () => ({
      p: [X0 + 35 + rand() * 30, 16 + rand() * 8, WINDOW.z - 50 + rand() * 100] as V3,
      s: 2.5 + rand() * 2.5,
    }))
  }, [])
  useFrame((_, dt) => {
    // Wolken ziehen langsam vorbei
    group.current?.children.forEach((c) => {
      c.position.z += dt * 0.5
      if (c.position.z > WINDOW.z + 60) c.position.z = WINDOW.z - 60
    })
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={c.p}>
          {[[0, 0, 0, 1], [0.2, 0.15, 1.1, 0.75], [-0.1, 0.1, -1.0, 0.7]].map(([x, y, z, k], j) => (
            <mesh key={j} position={[x * c.s, y * c.s, z * c.s]} scale={[c.s * k * 0.8, c.s * k * 0.5, c.s * k]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" flatShading={LOWPOLY} emissive="#ffffff" emissiveIntensity={0.45} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Distance() {
  const hills = useMemo(() => {
    const rand = rng(11)
    const cols = ['#78b46a', '#6aa864', '#82bb73', '#71ad6c']
    return Array.from({ length: 9 }, (_, i) => ({
      p: [X0 + 30 + rand() * 16, -1.5, WINDOW.z - 48 + i * 12 + rand() * 4] as V3,
      s: [10 + rand() * 6, 3 + rand() * 2.5, 9 + rand() * 5] as V3,
      c: cols[i % cols.length],
    }))
  }, [])
  const mountains = useMemo(() => {
    const rand = rng(21)
    return Array.from({ length: 7 }, (_, i) => {
      const h = 14 + rand() * 12
      return { p: [X0 + 62 + rand() * 10, h / 2 - 1, WINDOW.z - 60 + i * 20 + rand() * 6] as V3, h, r: 9 + rand() * 6 }
    })
  }, [])
  return (
    <>
      {hills.map((h, i) => (
        <mesh key={i} position={h.p} scale={h.s}>
          <icosahedronGeometry args={[1, 1]} />
          <OutMat color={h.c} />
        </mesh>
      ))}
      {mountains.map((m, i) => (
        <mesh key={i} position={m.p} rotation={[0, i, 0]}>
          <coneGeometry args={[m.r, m.h, 5]} />
          <OutMat color="#8faabb" />
        </mesh>
      ))}
    </>
  )
}

export function Park() {
  const veg = useVegetation()
  const sky = useMemo(() => skyDomeTexture(), [])
  return (
    <group>
      {/* Nebel gibt der Ferne Tiefe; der Innenraum (unter 20 m) bleibt unberührt */}
      <fog attach="fog" args={['#d3e9f3', 20, 120]} />

      {/* Himmelskuppel */}
      <mesh>
        <sphereGeometry args={[110, 24, 12]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} toneMapped={false} />
      </mesh>
      {/* Sonne – passend zum Sonnenlicht, das durchs Fenster fällt */}
      <mesh position={[X0 + 80, 38, WINDOW.z - 30]}>
        <icosahedronGeometry args={[5, 1]} />
        <meshBasicMaterial color={new THREE.Color(2.2, 2.0, 1.4)} fog={false} toneMapped={false} />
      </mesh>

      {/* Wiese (nur außerhalb des Raums, damit sie nicht mit dem Laborboden flimmert) */}
      <mesh position={[X0 + 60, -0.02, WINDOW.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 220]} />
        <OutMat color="#86c46e" />
      </mesh>

      <Path />
      {/* Teich */}
      <mesh position={[X0 + 11, 0.01, WINDOW.z - 1]} scale={[1, 1, 1.4]}>
        <cylinderGeometry args={[2.4, 2.4, 0.02, 7]} />
        <meshStandardMaterial color="#5fb7d9" roughness={0.2} metalness={0.1} flatShading={LOWPOLY} />
      </mesh>
      <Bench position={[X0 + 8, 0, pathZ(X0 + 8) - 1.3]} />
      <Lamp position={[X0 + 12.5, 0, pathZ(X0 + 12.5) - 1.1]} />

      <Many items={veg.trunks}>
        <cylinderGeometry args={[0.5, 0.7, 1, 5]} />
      </Many>
      <Many items={veg.crowns}>
        <icosahedronGeometry args={[1, 0]} />
      </Many>
      <Many items={veg.pines}>
        <coneGeometry args={[1, 1, 6]} />
      </Many>
      <Many items={veg.bushes}>
        <icosahedronGeometry args={[1, 0]} />
      </Many>

      <Clouds />
      <Distance />
    </group>
  )
}
