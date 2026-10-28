import { useState } from 'react'
import { isTouch } from '../game/input'
import { useGame } from '../game/store'

/** Start- und Pausenbildschirm */
export function Menu({ started, onResume }: { started: boolean; onResume: () => void }) {
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
  const reset = useGame((s) => s.reset)
  const [confirmRestart, setConfirmRestart] = useState(false)

  return (
    // Klicks im Menü nicht an das Spielfeld weiterreichen
    <div className="screen" onPointerDown={(e) => e.stopPropagation()}>
      <div className="card">
        <h1>{started ? 'Pause' : 'Labor 1'}</h1>
        {!started && <p>Löse alle Aufgaben im Labor, um den Raum zu verlassen.</p>}
        {isTouch ? (
          <ul>
            <li>Joystick links: laufen</li>
            <li>Wischen: umsehen</li>
            <li>Gegenstand antippen: untersuchen</li>
            <li>Pause-Knopf oben rechts: Pause</li>
          </ul>
        ) : (
          <ul>
            <li>WASD / Pfeiltasten: laufen</li>
            <li>Maus: umsehen</li>
            <li>Klick: Gegenstand untersuchen</li>
            <li>Esc: Pause</li>
          </ul>
        )}
        <button onClick={onResume}>{started ? 'Weiter' : 'Los geht’s'}</button>
        {started && (
          <div className="menu-row">
            <button className="secondary" onClick={toggleMute}>
              {muted ? '🔈 Ton an' : '🔇 Ton aus'}
            </button>
            {confirmRestart ? (
              <button
                className="danger"
                onClick={() => {
                  reset()
                  setConfirmRestart(false)
                  onResume()
                }}
              >
                Wirklich neu starten?
              </button>
            ) : (
              <button className="secondary" onClick={() => setConfirmRestart(true)}>
                ↺ Neu starten
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
