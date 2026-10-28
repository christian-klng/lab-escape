import { useEffect, useState } from 'react'
import { isMuted, setMuted } from '../game/audio'
import { ITEMS, OBJECTS, REQUIRED_IDS } from '../game/config'
import { isTouch } from '../game/input'
import { useGame } from '../game/store'

export function HUD({ locked }: { locked: boolean }) {
  const solved = useGame((s) => s.solved)
  const inventory = useGame((s) => s.inventory)
  const hovered = useGame((s) => s.hovered)
  const message = useGame((s) => s.message)
  const msgKey = useGame((s) => s.msgKey)
  const completed = useGame((s) => s.completed)
  const reset = useGame((s) => s.reset)
  const [muted, setMutedState] = useState(isMuted())
  // Abschlussfenster erst nach der Tür-Animation zeigen
  const [showEnd, setShowEnd] = useState(false)
  useEffect(() => {
    if (!completed) return setShowEnd(false)
    const t = setTimeout(() => setShowEnd(true), 2400)
    return () => clearTimeout(t)
  }, [completed])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => {
      if (useGame.getState().msgKey === msgKey) useGame.getState().say(null)
    }, 3500)
    return () => clearTimeout(t)
  }, [msgKey, message])

  const done = REQUIRED_IDS.filter((id) => solved[id]).length

  return (
    <div className="hud" onPointerDown={(e) => e.target !== e.currentTarget && e.stopPropagation()}>
      <div className="progress">
        Aufgaben {done} / {REQUIRED_IDS.length}
        <div className="bar">
          <div style={{ width: `${(done / REQUIRED_IDS.length) * 100}%` }} />
        </div>
      </div>

      <div className="inventory">
        {inventory.length === 0 && <span className="empty">Inventar leer</span>}
        {inventory.map((i) => (
          <span key={i} className="slot" title={ITEMS[i].name}>
            {ITEMS[i].icon}
          </span>
        ))}
      </div>

      {!isTouch && locked && <div className="crosshair" />}
      {!isTouch && locked && hovered && (
        <div className="hover-label">{OBJECTS[hovered]?.name} · Klicken</div>
      )}

      {message && (
        <div key={msgKey} className="toast">
          {message}
        </div>
      )}

      {showEnd && (
        <div className="screen">
          <div className="card">
            <h1>🎉 Raum abgeschlossen!</h1>
            <p>Du hast alle Aufgaben im Labor gelöst.</p>
            <button onClick={reset}>Nochmal spielen</button>
          </div>
        </div>
      )}

      <button className="reset" onClick={reset} title="Fortschritt zurücksetzen">
        ↺
      </button>
      <button
        className="reset mute"
        title={muted ? 'Ton an' : 'Ton aus'}
        onClick={() => {
          setMuted(!muted)
          setMutedState(!muted)
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
