import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { input, isTouch } from '../game/input'
import { pick, registerView } from '../game/picking'
import { useGame } from '../game/store'
import { FX_LAYER, HZ, PLAYER_START } from './layout'

const SPEED = 3
const EYE_OFFSET = 0.65
const DOOR = { x: 0, z: HZ - 0.03 }

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const { camera, scene } = useThree()
  const frame = useRef(0)

  useEffect(() => {
    registerView(camera, scene)
    camera.layers.enable(FX_LAYER) // Staubpartikel sichtbar machen
    // Zum Debuggen in der Browser-Konsole (nur im Entwicklungsmodus): __teleport(1.5, -1)
    if (import.meta.env?.DEV)
      (window as unknown as { __teleport: (x: number, z: number) => void }).__teleport = (x, z) =>
        body.current?.setTranslation({ x, y: 1, z }, true)
    camera.rotation.order = 'YXZ'
  }, [camera, scene])

  useFrame((_, dt) => {
    const b = body.current
    if (!b) return
    const st = useGame.getState()
    const blocked = !!st.overlay || st.completed

    let f = 0
    let r = 0
    if (!blocked) {
      const k = input.keys
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1
      if (k.has('KeyD') || k.has('ArrowRight')) r += 1
      if (k.has('KeyA') || k.has('ArrowLeft')) r -= 1
      f -= input.joy.y
      r += input.joy.x
    }
    const len = Math.hypot(f, r)
    if (len > 1) {
      f /= len
      r /= len
    }

    const sin = Math.sin(input.yaw)
    const cos = Math.cos(input.yaw)
    const v = b.linvel()
    b.setLinvel(
      { x: (-sin * f + cos * r) * SPEED, y: v.y, z: (-cos * f - sin * r) * SPEED },
      true,
    )

    const t = b.translation()

    // Beim Abschluss die Kamera sanft zur Ausgangstür drehen
    if (st.completed) {
      const target = Math.atan2(-(DOOR.x - t.x), -(DOOR.z - t.z))
      let diff = target - input.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      input.yaw += diff * Math.min(1, dt * 2.5)
      input.pitch += (0.05 - input.pitch) * Math.min(1, dt * 2.5)
    }

    camera.position.set(t.x, t.y + EYE_OFFSET, t.z)
    camera.rotation.set(input.pitch, input.yaw, 0)

    // Desktop: Gegenstand unter dem Fadenkreuz hervorheben
    if (!isTouch && ++frame.current % 4 === 0) {
      const id = document.pointerLockElement && !blocked ? pick(0, 0) : null
      if (id !== st.hovered) st.setHovered(id)
    }
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={PLAYER_START}
      enabledRotations={[false, false, false]}
      friction={0}
      canSleep={false}
    >
      <CapsuleCollider args={[0.5, 0.3]} />
    </RigidBody>
  )
}
