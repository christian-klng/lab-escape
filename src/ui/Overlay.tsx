import { useEffect, useState } from 'react'
import { OBJECTS } from '../game/config'
import { useGame } from '../game/store'
import { sfx } from '../game/audio'

export function Overlay() {
  const id = useGame((s) => s.overlay)
  // Kurz blockieren, damit der Klick, der das Fenster geöffnet hat (Touch-„Ghost-Click“),
  // nicht sofort eine Antwort auslöst.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(false)
    if (!id) return
    const t = setTimeout(() => setReady(true), 400)
    return () => clearTimeout(t)
  }, [id])
  if (!id) return null
  const o = OBJECTS[id]
  return (
    <div
      className="screen"
      style={{ pointerEvents: ready ? 'auto' : 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {o.type === 'portrait' ? (
        <div className="card portrait-card">
          <div className="portrait-frame">
            <img src={o.image} alt={o.name} width={600} height={800} />
          </div>
          <div className="portrait-text">
            <h2>{o.name}</h2>
            <span className="portrait-subtitle">{o.subtitle}</span>
            <p>{o.text}</p>
            <button className="secondary" onClick={() => useGame.getState().closeOverlay()}>
              Schließen
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>{o.name}</h2>
          {o.type === 'quiz' && <Quiz key={id} id={id} />}
          {o.type === 'code' && <CodeLock key={id} id={id} />}
          {o.type === 'info' && <Info id={id} />}
          <button className="secondary" onClick={() => useGame.getState().closeOverlay()}>
            Schließen
          </button>
        </div>
      )}
    </div>
  )
}

function Quiz({ id }: { id: string }) {
  const o = OBJECTS[id]
  const [wrong, setWrong] = useState<number | null>(null)
  if (o.type !== 'quiz') return null
  return (
    <>
      <p>{o.question}</p>
      <div className="answers">
        {o.answers.map((a, i) => (
          <button
            key={i}
            className={wrong === i ? 'wrong' : ''}
            onClick={() => {
              if (i === o.correct) useGame.getState().solve(id)
              else {
                sfx('error')
                setWrong(i)
              }
            }}
          >
            {a}
          </button>
        ))}
      </div>
      {wrong !== null && <p className="error">Leider falsch – versuch es nochmal.</p>}
    </>
  )
}

function CodeLock({ id }: { id: string }) {
  const o = OBJECTS[id]
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  if (o.type !== 'code') return null
  const press = (d: string) => {
    sfx('key')
    setError(false)
    if (value.length < o.code.length) setValue(value + d)
  }
  const submit = () => {
    if (value === o.code) useGame.getState().solve(id)
    else {
      sfx('error')
      setError(true)
      setValue('')
    }
  }
  return (
    <>
      <p>{o.prompt}</p>
      <div className={`display ${error ? 'wrong' : ''}`}>
        {value.padEnd(o.code.length, '·')}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>{d}</button>
        ))}
        <button onClick={() => { sfx('key'); setValue(value.slice(0, -1)) }}>⌫</button>
        <button onClick={() => press('0')}>0</button>
        <button className="ok" onClick={submit}>OK</button>
      </div>
      {error && <p className="error">Falscher Code.</p>}
    </>
  )
}

function Info({ id }: { id: string }) {
  const o = OBJECTS[id]
  if (o.type !== 'info') return null
  return (
    <>
      <p>{o.text}</p>
      <button onClick={() => useGame.getState().solve(id)}>Verstanden</button>
    </>
  )
}
