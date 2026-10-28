import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { LOWPOLY, facetJitter, seg } from './style'

// Gemeinsame Bausteine für den stilisierten Look.

export type V3 = [number, number, number]
export const damp = THREE.MathUtils.damp

/** Farbpalette: warmes Creme, Mint/Petrol als Hauptfarbe, Orange und Gelb als Akzente */
export const C = {
  cream: '#f3efe6',
  creamDark: '#e0d9ca',
  wall: '#edf3ef',
  ceiling: '#f7f4ee',
  teal: '#6fb3a3',
  tealDark: '#3f7f74',
  slate: '#34414b',
  slateLight: '#5a6873',
  orange: '#f28c38',
  orangeDark: '#cf6a1f',
  yellow: '#f6c445',
  blue: '#4f8ef7',
  red: '#e5533d',
  green: '#4cc38a',
  steel: '#c5cdd2',
  door: '#4d7f95',
}

export function useHovered(id?: string) {
  return useGame((s) => !!id && s.hovered === id)
}

type MatProps = { id?: string; color: string; roughness?: number; metalness?: number }

/** Standardmaterial; leuchtet warm auf, wenn der Gegenstand angezielt wird */
export function Mat({ id, color, roughness = 0.6, metalness = 0 }: MatProps) {
  const hovered = useHovered(id)
  return (
    <meshStandardMaterial
      color={color}
      roughness={LOWPOLY ? Math.max(roughness, 0.7) : roughness}
      metalness={metalness}
      flatShading={LOWPOLY}
      onBeforeCompile={LOWPOLY ? facetJitter : undefined}
      customProgramCacheKey={LOWPOLY ? () => 'lp-facet' : undefined}
      emissive="#ffcf8a"
      emissiveIntensity={hovered ? 0.35 : 0}
    />
  )
}

/** Selbstleuchtendes Material (Bildschirme, LEDs, Lampen) – erzeugt Bloom */
export function Glow({ color, intensity = 2 }: { color: string; intensity?: number }) {
  return <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={intensity} toneMapped={false} />
}

export function Glass() {
  return <meshStandardMaterial color="#e3f4ff" transparent opacity={0.3} roughness={0.05} depthWrite={false} flatShading={LOWPOLY} />
}

function HoverOutline({ id }: { id?: string }) {
  const hovered = useHovered(id)
  // Hinweis: In drei 10.7.x ist ohne `screenspace` die Dicke in Pixeln (Shader-Zweige vertauscht).
  return hovered ? <Outlines thickness={3.5} color="#ffffff" /> : null
}

type BoxProps = MatProps & { size: V3; position?: V3; rotation?: V3; radius?: number; children?: ReactNode }

/** Box mit abgerundeten Kanten */
export function RBox({ size, position, rotation, radius = 0.025, children, ...mat }: BoxProps) {
  // Low-Poly: eine einzige Fase statt runder Kante (etwas breiter, damit sie sichtbar bleibt)
  const want = LOWPOLY ? radius * 2.2 : radius
  const r = Math.max(0.002, Math.min(want, Math.min(...size) / 2 - 0.002))
  return (
    <RoundedBox
      args={size}
      radius={r}
      smoothness={LOWPOLY ? 1 : 3}
      bevelSegments={LOWPOLY ? 1 : 4}
      position={position}
      rotation={rotation}
    >
      <Mat {...mat} />
      <HoverOutline id={mat.id} />
      {children}
    </RoundedBox>
  )
}

/** Zylinder: args = [Radius oben, Radius unten, Höhe, Segmente] */
export function Cyl({
  args,
  position,
  rotation,
  ...mat
}: MatProps & { args: [number, number, number, number?]; position?: V3; rotation?: V3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[args[0], args[1], args[2], seg(args[3] ?? 28)]} />
      <Mat {...mat} />
      <HoverOutline id={mat.id} />
    </mesh>
  )
}

/** Statischer Block mit Kollision */
export function Solid({ position, size, color, radius = 0.02 }: { position: V3; size: V3; color: string; radius?: number }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
      <RBox position={position} size={size} color={color} radius={radius} roughness={0.85} />
    </RigidBody>
  )
}

/** Nur Kollision, ohne Darstellung */
export function Collider({ position, size }: { position: V3; size: V3 }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
    </RigidBody>
  )
}

/** Markiert alles darin als interaktiv (für den Raycast) */
export function Hit({
  id,
  position,
  rotation,
  scale,
  children,
}: {
  id: string
  position?: V3
  rotation?: V3
  scale?: number
  children: ReactNode
}) {
  return (
    <group userData={{ interactId: id }} position={position} rotation={rotation} scale={scale}>
      {children}
    </group>
  )
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void

/** Animierter Bildschirm: zeichnet per Canvas 2D mit ca. 15 fps */
export function Screen({
  width,
  height,
  draw,
  position,
  rotation,
  brightness = 1.4,
}: {
  width: number
  height: number
  draw: DrawFn
  position?: V3
  rotation?: V3
  brightness?: number
}) {
  const { tex, ctx, cw, ch } = useMemo(() => {
    const cw = 320
    const ch = Math.round((cw * height) / width)
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')!
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { tex, ctx, cw, ch }
  }, [width, height])
  const drawRef = useRef(draw)
  drawRef.current = draw
  const acc = useRef(1)
  useFrame((state, dt) => {
    acc.current += dt
    if (acc.current < 1 / 15) return
    acc.current = 0
    drawRef.current(ctx, cw, ch, state.clock.elapsedTime)
    tex.needsUpdate = true
  })
  const color = useMemo(() => new THREE.Color(brightness, brightness, brightness), [brightness])
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} color={color} toneMapped={false} />
    </mesh>
  )
}
