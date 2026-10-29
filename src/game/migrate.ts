// Einmalige Übernahme gespeicherter Daten nach der Umbenennung „Labor Escape“ → „Lab Escape“.
// Wird in main.tsx als Erstes geladen – vor Spielstand und Sound.

const RENAMED: [oldKey: string, newKey: string][] = [
  ['labor-escape-v1', 'lab-escape-v1'], // Spielfortschritt
  ['labor-muted', 'lab-escape-muted'], // Ton an/aus
]

try {
  for (const [oldKey, newKey] of RENAMED) {
    const value = localStorage.getItem(oldKey)
    if (value === null) continue
    if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value)
    localStorage.removeItem(oldKey)
  }
} catch {
  /* Speicher nicht verfügbar (z. B. privater Modus) – nichts zu übernehmen */
}

export {}
