// Statistisches Sprachmodell (n-Gramm) – reine Logik, ohne React.
//
// Für jedes n von 1 bis 5 wird gezählt, welches Wort wie oft auf die n−1 vorherigen
// Wörter folgt. Beim Schreiben wird das nächste Wort nach diesen Häufigkeiten gewürfelt.
// Kommt eine Wortfolge im Text nicht vor, schaut das Modell auf weniger Wörter („Backoff“).

export const MAX_N = 5
/** Höchstens so viele Wörter werden gelernt (sehr große Dokumente würden sonst zu langsam) */
export const MAX_TOKENS = 400_000
const MAX_WORDS_OUT = 40

const SENTENCE_END = new Set(['.', '!', '?'])
const PUNCT = new Set([...SENTENCE_END, ',', ';', ':'])

type Counts = Map<string, Map<string, number>>

export type Model = {
  /** counts[n]: Kontext (n−1 Wörter, klein geschrieben) → Folgewort → Anzahl */
  counts: Counts[]
  /** häufigste Schreibweise je Wort, z. B. „könig“ → „König“ */
  surface: Map<string, string>
  tokens: number
  words: number
  truncated: boolean
}

export type Step = {
  /** tatsächlich benutzter Kontext (nach Backoff) */
  context: string[]
  /** gewünschte Länge des Kontexts (n−1) */
  wanted: number
  /** häufigste Folgewörter mit Anzahl */
  top: [string, number][]
  total: number
  options: number
  chosen: string
}

export type Result = { text: string; steps: Step[] }

/** Zerlegt Text in Wörter und Satzzeichen; Anführungszeichen, Klammern usw. fallen weg */
export function tokenize(text: string): string[] {
  const norm = text.replace(/…/g, '.').replace(/[„“”"«»‚‘()[\]{}]/g, ' ')
  return norm.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[.!?,;:]/gu) ?? []
}

const key = (ctx: string[]) => ctx.join(' ')

/**
 * Lernt das Modell. Läuft in Etappen, damit Animation und Fortschrittsbalken
 * flüssig bleiben (wichtig auf dem Tablet).
 */
export async function train(text: string, onProgress?: (p: number) => void): Promise<Model> {
  let raw = tokenize(text)
  const truncated = raw.length > MAX_TOKENS
  if (truncated) raw = raw.slice(0, MAX_TOKENS)
  const low = raw.map((t) => t.toLowerCase())

  // häufigste Schreibweise je Wort – Satzanfänge zählen weniger, sonst hieße es mitten im Satz „Da“
  const forms = new Map<string, Map<string, number>>()
  raw.forEach((t, i) => {
    const m = forms.get(low[i]) ?? new Map<string, number>()
    const atStart = i === 0 || SENTENCE_END.has(raw[i - 1])
    m.set(t, (m.get(t) ?? 0) + (atStart ? 0.01 : 1))
    forms.set(low[i], m)
  })
  const surface = new Map<string, string>()
  for (const [w, m] of forms) surface.set(w, [...m].sort((a, b) => b[1] - a[1])[0][0])

  // Satzanfang wie nach einem Punkt behandeln
  const seq = ['.', ...low]
  const counts: Counts[] = Array.from({ length: MAX_N + 1 }, () => new Map())
  const CHUNK = 20_000
  for (let start = 1; start < seq.length; start += CHUNK) {
    const end = Math.min(seq.length, start + CHUNK)
    for (let i = start; i < end; i++) {
      const next = seq[i]
      for (let n = 1; n <= MAX_N; n++) {
        if (i - (n - 1) < 0) break
        const k = key(seq.slice(i - (n - 1), i))
        let m = counts[n].get(k)
        if (!m) counts[n].set(k, (m = new Map()))
        m.set(next, (m.get(next) ?? 0) + 1)
      }
    }
    onProgress?.(end / seq.length)
    await new Promise((r) => setTimeout(r, 0))
  }

  return {
    counts,
    surface,
    tokens: raw.length,
    words: raw.filter((t) => !PUNCT.has(t)).length,
    truncated,
  }
}

function pickWeighted(m: Map<string, number>, total: number, rnd: () => number) {
  let r = rnd() * total
  for (const [w, c] of m) {
    r -= c
    if (r < 0) return w
  }
  return [...m.keys()].pop()!
}

/** Setzt den Prompt mit dem Modell der Ordnung n fort, bis ein Satz zu Ende ist */
export function generate(model: Model, prompt: string, n: number, rnd: () => number = Math.random): Result {
  const promptTokens = tokenize(prompt)
  const history = ['.', ...promptTokens.map((t) => t.toLowerCase())]
  const out: string[] = []
  const steps: Step[] = []
  let words = 0
  let rerolls = 0

  while (words < MAX_WORDS_OUT) {
    // Bei kurzem Prompt stehen noch nicht n−1 Wörter zur Verfügung – das ist kein Backoff
    const wanted = Math.min(n - 1, history.length)
    let order = Math.min(n, history.length + 1)
    let m: Map<string, number> | undefined
    let ctx: string[] = []
    for (; order >= 1; order--) {
      ctx = order > 1 ? history.slice(-(order - 1)) : []
      m = model.counts[order].get(key(ctx))
      if (m) break
    }
    if (!m) break
    let total = 0
    for (const c of m.values()) total += c
    const chosen = pickWeighted(m, total, rnd)
    // Ganz am Anfang kein Satzzeichen erzeugen
    if (out.length === 0 && promptTokens.length === 0 && PUNCT.has(chosen) && rerolls++ < 50) continue
    steps.push({
      context: ctx,
      wanted,
      top: [...m].sort((a, b) => b[1] - a[1]).slice(0, 5),
      total,
      options: m.size,
      chosen,
    })
    history.push(chosen)
    out.push(chosen)
    if (SENTENCE_END.has(chosen)) break
    if (!PUNCT.has(chosen)) words++
  }
  if (!SENTENCE_END.has(out[out.length - 1] ?? '')) out.push('.')

  return { text: detokenize(model, promptTokens, out), steps }
}

/** Fügt Wörter wieder zu einem lesbaren Satz zusammen */
function detokenize(model: Model, promptTokens: string[], out: string[]) {
  let s = ''
  let capital = promptTokens.length === 0 || SENTENCE_END.has(promptTokens[promptTokens.length - 1])
  for (const t of out) {
    let w = model.surface.get(t) ?? t
    if (capital && !PUNCT.has(w)) {
      w = w.charAt(0).toUpperCase() + w.slice(1)
      capital = false
    }
    if (SENTENCE_END.has(t)) capital = true
    s += PUNCT.has(t) || s === '' ? w : ' ' + w
  }
  return s
}

/** Schreibweise für die Anzeige („könig“ → „König“) */
export function display(model: Model, w: string) {
  return model.surface.get(w) ?? w
}
