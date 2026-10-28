import { useRef, useState } from 'react'
import { input } from '../game/input'

const R = 55

export function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > R) {
      dx = (dx / len) * R
      dy = (dy / len) * R
    }
    setKnob({ x: dx, y: dy })
    input.joy.x = dx / R
    input.joy.y = dy / R
  }

  const end = () => {
    pid.current = null
    setKnob({ x: 0, y: 0 })
    input.joy.x = 0
    input.joy.y = 0
  }

  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        e.stopPropagation()
        pid.current = e.pointerId
        base.current!.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        if (pid.current === e.pointerId) update(e)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        end()
      }}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}
