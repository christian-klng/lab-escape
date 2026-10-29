import professorClever from '../assets/professor-clever.webp'

// Raum-Konfiguration: Hier werden alle Gegenstände und Rätsel definiert.
// Neue Rätsel = neuer Eintrag hier + ein 3D-Objekt in scene/Lab.tsx mit derselben id.

export type ItemId = 'schluessel' | 'probe' | 'karte'

export const ITEMS: Record<ItemId, { name: string; icon: string }> = {
  schluessel: { name: 'Schrankschlüssel', icon: '🔑' },
  probe: { name: 'Blutprobe', icon: '🧪' },
  karte: { name: 'Zugangskarte', icon: '💳' },
}

type Base = {
  id: string
  name: string
  /** Zählt für den Raumabschluss */
  required?: boolean
  /** Gegenstände, die im Inventar sein müssen */
  requires?: ItemId[]
  /** Meldung, wenn Voraussetzungen fehlen */
  lockedText?: string
  /** Gegenstände, die man beim Lösen erhält */
  reward?: ItemId[]
  /** Benötigte Gegenstände werden beim Lösen verbraucht */
  consumes?: boolean
  /** Meldung nach dem Lösen */
  successText?: string
}

export type Interactable =
  | (Base & { type: 'quiz'; question: string; answers: string[]; correct: number })
  | (Base & { type: 'code'; prompt: string; code: string })
  | (Base & { type: 'info'; text: string })
  /** Reine Info mit Bild (z. B. Porträt an der Wand) – wird nie „gelöst“ */
  | (Base & { type: 'portrait'; image: string; subtitle: string; text: string })
  | (Base & { type: 'use' })
  | (Base & { type: 'toggle' })
  | (Base & { type: 'exit' })

export const ROOM: { id: string; title: string; objects: Interactable[] } = {
  id: 'labor-1',
  title: 'Labor 1',
  objects: [
    {
      id: 'mikroskop',
      type: 'quiz',
      name: 'Mikroskop',
      required: true,
      question: 'Was gehört zur Grundausstattung, bevor du mit Chemikalien arbeitest?',
      answers: ['Kopfhörer', 'Laborkittel und Schutzbrille', 'Sonnenbrille', 'Gar nichts'],
      correct: 1,
      reward: ['schluessel'],
      successText: 'Richtig! Unter dem Objektträger lag ein kleiner Schlüssel. 🔑',
    },
    {
      id: 'schrank',
      type: 'use',
      name: 'Laborschrank',
      required: true,
      requires: ['schluessel'],
      consumes: true,
      lockedText: 'Der Schrank ist abgeschlossen.',
      reward: ['probe'],
      successText: 'Der Schlüssel passt. Im Schrank findest du eine Blutprobe. 🧪',
    },
    {
      id: 'schublade',
      type: 'info',
      name: 'Schublade',
      text: 'In der Schublade liegt ein Zettel. Darauf steht: „Box-Code: 4 – 7 – 1 – 1“',
    },
    {
      id: 'box',
      type: 'code',
      name: 'Verschlossene Box',
      required: true,
      prompt: 'Die Box hat ein Zahlenschloss mit 4 Stellen.',
      code: '4711',
      reward: ['karte'],
      successText: 'Klick! In der Box liegt eine Zugangskarte. 💳',
    },
    {
      id: 'zentrifuge',
      type: 'toggle',
      name: 'Zentrifuge',
    },
    {
      id: 'analysegeraet',
      type: 'use',
      name: 'Analysegerät',
      required: true,
      requires: ['probe'],
      consumes: true,
      lockedText: 'Das Analysegerät wartet auf eine Probe.',
      successText: 'Analyse abgeschlossen: Probe unauffällig ✔',
    },
    {
      id: 'portrait',
      type: 'portrait',
      name: 'Professor Clever',
      image: professorClever,
      subtitle: 'Gründer dieses Labors',
      text: 'Professor Clever erforscht seit über dreißig Jahren künstliche Intelligenz und hat dieses Labor gegründet, um Maschinen das Lernen beizubringen. Kaum taucht irgendwo eine neue Technik auf, probiert er sie schon aus – sehr zur Freude seiner Studierenden und manchmal zum Leidwesen der Laborgeräte.',
    },
    {
      id: 'tuer',
      type: 'exit',
      name: 'Ausgangstür',
      requires: ['karte'],
      lockedText: 'Die Tür braucht eine Zugangskarte.',
    },
  ],
}

export const OBJECTS: Record<string, Interactable> = Object.fromEntries(
  ROOM.objects.map((o) => [o.id, o]),
)

export const REQUIRED_IDS = ROOM.objects
  .filter((o) => o.required && o.type !== 'exit')
  .map((o) => o.id)
