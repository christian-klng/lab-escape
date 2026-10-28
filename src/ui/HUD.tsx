import { useEffect, useState } from 'react'
import { ITEMS, OBJECTS, REQUIRED_IDS } from '../game/config'
import { isTouch } from '../game/input'
import { useGame } from '../game/store'

export function HUD({ locked, showPause, onPause }: { locked: boolean; showPause: boolean; onPause: () => void }) {
  const solved = useGame((s) => s.solved)
  const inventory = useGame((s) => s.inventory)
  const hovered = useGame((s) => s.hovered)
  const message = useGame((s) => s.message)
  const msgKey = useGame((s) => s.msgKey)
  const completed = useGame((s) => s.completed)
  const reset = useGame((s) => s.reset)
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
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

      <div className="topright">
        <div className="inventory">
          {inventory.length === 0 && <span className="empty">Inventar leer</span>}
          {inventory.map((i) => (
            <span key={i} className="slot" title={ITEMS[i].name}>
              {ITEMS[i].icon}
            </span>
          ))}
        </div>
        <button className="iconbtn" title={muted ? 'Ton an' : 'Ton aus'} onClick={toggleMute}>
          {muted ? '🔇' : '🔊'}
        </button>
        {showPause && (
          <button className="iconbtn pause" title="Pause" aria-label="Pause" onClick={onPause}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
            </svg>
          </button>
        )}
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

    </div>
  )
}
