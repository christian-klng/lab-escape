import { useEffect, useRef, useState } from 'react'
import { OBJECTS } from '../game/config'
import { useGame } from '../game/store'
import { sfx } from '../game/audio'
import { MAX_N, MAX_TOKENS, display, generate, train, type Model, type Result } from '../game/ngram'

// Fenster der Sprachmaschine: Text laden → Prompt mit n = 1 … 5 ausprobieren → Abschlussfrage.

const MIN_WORDS = 50 // darunter lernt die Maschine nichts Sinnvolles
const FEW_WORDS = 2000 // darunter Hinweis, dass die Ergebnisse dürftig ausfallen

const EXPLAIN: Record<number, string> = {
  1: 'n = 1 schaut gar nicht auf die vorherigen Wörter. Jedes Wort wird nur nach seiner Häufigkeit im ganzen Text gewürfelt – häufige Wörter wie „und“ oder „der“ kommen deshalb ständig vor. Das Ergebnis ist Wortsalat.',
  2: 'n = 2 berücksichtigt nur das letzte Wort. Wortpaare passen schon zusammen, aber der Satz verliert schnell den Faden.',
  3: 'n = 3 schaut auf die letzten 2 Wörter. Kurze Satzstücke klingen schon richtig, der ganze Satz ergibt aber oft noch keinen Sinn.',
  4: 'n = 4 schaut auf die letzten 3 Wörter. Die Sätze werden flüssiger – dafür gibt es oft nur noch wenige mögliche Fortsetzungen.',
  5: 'n = 5 schaut auf die letzten 4 Wörter. Oft kennt die Maschine nur noch eine einzige Fortsetzung und schreibt den Originaltext fast wörtlich ab. Mehr Kontext macht ein statistisches Modell nicht automatisch klüger – es bräuchte riesige Textmengen.',
}

const SUGGESTIONS = ['Es war einmal ein', 'Da sprach der König', 'Am andern Morgen']

/** Gelerntes Modell bleibt erhalten, solange die Seite offen ist (wird nicht gespeichert) */
let cached: { model: Model; source: string } | null = null

const fmt = (n: number) => n.toLocaleString('de-DE')

async function readFile(f: File): Promise<string> {
  const name = f.name.toLowerCase()
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })
    return value
  }
  if (name.endsWith('.doc')) throw new Error('Alte Word-Dateien (.doc) gehen leider nicht – bitte als .docx oder .txt speichern.')
  if (name.endsWith('.txt') || f.type.startsWith('text/')) {
    const buf = await f.arrayBuffer()
    const utf8 = new TextDecoder('utf-8').decode(buf)
    // Ältere Windows-Textdateien sind oft nicht UTF-8 kodiert
    return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8
  }
  throw new Error('Bitte eine Textdatei (.txt) oder ein Word-Dokument (.docx) wählen.')
}

export function NgramMachine({ id }: { id: string }) {
  const o = OBJECTS[id]
  const solved = useGame((s) => !!s.solved[id])
  const tried = useGame((s) => s.ngramTried)
  const n = useGame((s) => s.engineN)
  const [model, setModel] = useState(cached)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<(Result & { n: number; prompt: string }) | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  if (o.type !== 'ngram') return null

  const load = async (source: string, getText: () => Promise<string>) => {
    setError(null)
    setProgress(0)
    useGame.getState().pulseEngine()
    sfx('steam')
    try {
      const text = await getText()
      const m = await train(text, (p) => setProgress(p))
      if (m.words < MIN_WORDS) throw new Error(`Der Text ist zu kurz (${m.words} Wörter). Die Maschine braucht mehr Futter.`)
      cached = { model: m, source }
      setModel(cached)
      setResult(null)
      useGame.getState().pulseEngine()
      sfx('piston')
    } catch (e) {
      sfx('error')
      setError(e instanceof Error ? e.message : 'Die Datei ließ sich nicht lesen.')
    } finally {
      setProgress(null)
    }
  }

  const loadSample = () =>
    load('Grimms Märchen', async () => (await import('../assets/grimm-maerchen.txt?raw')).default)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // dieselbe Datei darf erneut gewählt werden
    if (f) void load(f.name, () => readFile(f))
  }

  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!model) return
    const r = generate(model.model, prompt, n)
    setResult({ ...r, n, prompt })
    useGame.getState().pulseEngine()
    useGame.getState().markNgram(n)
    sfx('piston')
  }

  const answer = (i: number) => {
    if (i === o.correct) useGame.getState().solve(id)
    else {
      sfx('error')
      if (!wrong.includes(i)) setWrong([...wrong, i])
    }
  }

  const fileButton = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={onFile}
      />
      <button className="secondary" onClick={() => fileInput.current?.click()}>
        📄 Eigenen Text hochladen (.txt, .docx)
      </button>
    </>
  )

  return (
    <div className="card steam-card">
      <div className="steam-head">
        <span className="steam-kicker">Sprachmaschine · Baujahr 1913</span>
        <h2>{o.title}</h2>
      </div>

      {solved && <p className="steam-done">✔ Übung abgeschlossen – du kannst trotzdem weiter experimentieren.</p>}

      {progress !== null ? (
        <div className="steam-loading">
          <p>{progress < 0.02 ? 'Text wird eingelesen …' : 'Kessel wird angeheizt – Wortfolgen werden gezählt …'}</p>
          <div className="steam-bar">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      ) : !model ? (
        <>
          <p>
            Füttere die Maschine mit einem Text. Sie zählt, welche Wörter wie oft aufeinander folgen – und schreibt mit
            diesen Häufigkeiten neue Sätze. So funktioniert ein <strong>statistisches Sprachmodell</strong>.
          </p>
          <div className="steam-choice">
            {fileButton}
            <button onClick={loadSample}>📚 Beispieltext nutzen: Grimms Märchen</button>
          </div>
          <p className="steam-note">
            Der Beispieltext enthält 52 Märchen der Brüder Grimm (Ausgabe 1857, gemeinfrei, Quelle: Wikisource).
          </p>
        </>
      ) : (
        <>
          <div className="steam-source">
            <span>
              <strong>{model.source}</strong> · {fmt(model.model.words)} Wörter
            </span>
            <button className="link" onClick={() => { setModel(null); setResult(null) }}>
              Anderer Text
            </button>
          </div>
          {model.model.truncated && <p className="steam-note">Sehr langer Text – gelernt wurden die ersten {fmt(MAX_TOKENS)} Wörter.</p>}
          {model.model.words < FEW_WORDS && (
            <p className="steam-note">Kurzer Text: Bei wenig Futter schreibt die Maschine vor allem ab.</p>
          )}

          <label className="steam-slider">
            <span>
              n = <strong>{n}</strong>
              <em>{n === 1 ? 'nur Worthäufigkeit, ohne Kontext' : `nächstes Wort aus den ${n - 1} vorherigen`}</em>
            </span>
            <input
              type="range"
              min={1}
              max={MAX_N}
              step={1}
              value={n}
              onChange={(e) => {
                sfx('key')
                useGame.getState().setEngineN(Number(e.target.value))
              }}
            />
            <span className="steam-ticks">
              {Array.from({ length: MAX_N }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </span>
          </label>

          <form className="steam-prompt" onSubmit={send}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Satzanfang eingeben …"
              enterKeyHint="send"
              autoComplete="off"
            />
            <button type="submit">Senden</button>
          </form>
          <div className="steam-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>

          {result && <Output model={model.model} result={result} />}

          <div className="steam-valves" aria-label="Fortschritt">
            {Array.from({ length: MAX_N }, (_, i) => (
              <span key={i} className={tried.includes(i + 1) ? 'on' : ''}>
                n={i + 1}
              </span>
            ))}
            <em>{tried.length < MAX_N ? `Aufgabe: Sende einmal mit jedem n (${tried.length}/${MAX_N}).` : 'Alle n ausprobiert!'}</em>
          </div>

          {tried.length >= MAX_N && !solved && (
            <div className="steam-quiz">
              <p>
                <strong>{o.question}</strong>
              </p>
              <div className="answers">
                {o.answers.map((a, i) => (
                  <button key={i} className={wrong.includes(i) ? 'wrong' : ''} onClick={() => answer(i)}>
                    {a}
                  </button>
                ))}
              </div>
              {wrong.length > 0 && <p className="error">Leider falsch – versuch es nochmal.</p>}
            </div>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}

      <button className="secondary" onClick={() => useGame.getState().closeOverlay()}>
        Schließen
      </button>
    </div>
  )
}

function Output({ model, result }: { model: Model; result: Result & { n: number; prompt: string } }) {
  const { steps, n } = result
  const first = steps[0]
  const word = (w: string) => `„${['.', '!', '?'].includes(w) ? w : display(model, w)}“`
  const ctx = (c: string[]) => c.map((w) => (['.', '!', '?'].includes(w) ? '[Satzanfang]' : display(model, w))).join(' ')
  const only = steps.filter((s) => s.options === 1).length
  const backoff = steps.filter((s) => s.context.length < s.wanted).length
  const head = result.prompt.trim()
  const glue = head === '' || /^[.,;:!?]/.test(result.text) ? '' : ' '
  // Erklärung als Tooltip am Lochstreifen: Antippen öffnet/schließt, Tippen daneben schließt
  const [open, setOpen] = useState(false)
  const tape = useRef<HTMLDivElement>(null)
  useEffect(() => setOpen(false), [result])
  useEffect(() => {
    if (!open) return
    // Capture-Phase: Das Fenster stoppt pointerdown, bevor es nach oben steigt
    const close = (e: PointerEvent) => !tape.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close, true)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close, true)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div className="steam-tape" ref={tape}>
      <span className="prompt">{head}</span>
      {glue}
      <span className="gen">{result.text}</span>
      <button
        className={`steam-info ${open ? 'open' : ''}`}
        aria-label="Erklärung anzeigen"
        aria-expanded={open}
        onClick={() => {
          sfx('click')
          setOpen(!open)
        }}
      >
        i
      </button>
      {open && (
        <div className="steam-tip" role="tooltip">
          <p>{EXPLAIN[n]}</p>
          {first && (
            <p>
              {n === 1 ? (
                <>Die häufigsten Wörter im ganzen Text: </>
              ) : (
                <>
                  {first.context.length < first.wanted && (
                    <>Diese Wortfolge kommt im Text nicht vor – die Maschine ist auf weniger Wörter ausgewichen. </>
                  )}
                  {first.context.length === 0 ? (
                    <>Ohne Kontext gewürfelt aus: </>
                  ) : (
                    <>
                      Nach „{ctx(first.context)}“ folgte im Text {fmt(first.total)}-mal ein Wort, {fmt(first.options)} verschiedene:{' '}
                    </>
                  )}
                </>
              )}
              {first.top.map(([w, c], i) => (
                <span key={w}>
                  {i > 0 && ', '}
                  {word(w)} {fmt(c)}×
                </span>
              ))}
              {first.options > first.top.length && ' …'} Gewürfelt wurde {word(first.chosen)}.
            </p>
          )}
          {n >= 3 && steps.length > 1 && (
            <p>
              Bei {only} von {steps.length} Schritten gab es nur eine einzige Möglichkeit
              {only > steps.length / 2 ? ' – hier hat die Maschine großteils abgeschrieben.' : '.'}
              {backoff > 0 && ` ${backoff}-mal musste sie auf kürzeren Kontext ausweichen.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
