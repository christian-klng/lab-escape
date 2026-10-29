import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ITEMS, OBJECTS, REQUIRED_IDS, type ItemId } from './config'
import { isMuted, setAudioPaused, setMuted, sfx } from './audio'

type GameState = {
  // persistent
  solved: Record<string, boolean>
  toggles: Record<string, boolean>
  inventory: ItemId[]
  completed: boolean
  // flüchtig
  hovered: string | null
  overlay: string | null
  message: string | null
  msgKey: number
  /** Menü offen (Start oder Pause): Steuerung gesperrt, Sound angehalten */
  paused: boolean
  muted: boolean
  /** Zählt bei jedem Neustart hoch – der Spieler wird dann an den Start gesetzt */
  round: number

  setHovered: (id: string | null) => void
  interact: (id: string) => void
  solve: (id: string) => void
  closeOverlay: () => void
  say: (text: string | null) => void
  reset: () => void
  setPaused: (p: boolean) => void
  toggleMute: () => void
}

const initial = { solved: {}, toggles: {}, inventory: [] as ItemId[], completed: false }

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      hovered: null,
      overlay: null,
      message: null,
      msgKey: 0,
      paused: true,
      muted: isMuted(),
      round: 0,

      setPaused: (p) => {
        if (get().paused === p) return
        setAudioPaused(p)
        set({ paused: p })
      },

      toggleMute: () => {
        const m = !get().muted
        setMuted(m)
        set({ muted: m })
      },

      setHovered: (id) => set({ hovered: id }),

      say: (text) => set((s) => ({ message: text, msgKey: s.msgKey + 1 })),

      interact: (id) => {
        const o = OBJECTS[id]
        const s = get()
        if (!o || s.completed || s.overlay) return

        if (o.type === 'toggle') {
          sfx('click')
          set({ toggles: { ...s.toggles, [id]: !s.toggles[id] } })
          return
        }

        const missing = (o.requires ?? []).filter((i) => !s.inventory.includes(i))

        if (o.type === 'exit') {
          if (missing.length) {
            sfx('error')
            return s.say(o.lockedText ?? 'Verschlossen.')
          }
          const open = REQUIRED_IDS.filter((r) => !s.solved[r])
          if (open.length) {
            sfx('error')
            return s.say(`Die Tür bleibt zu – noch ${open.length} Aufgabe(n) offen.`)
          }
          sfx('open')
          sfx('complete', 0.4)
          set({ completed: true })
          return
        }

        if (s.solved[id] && o.type !== 'info') {
          sfx('click')
          return s.say(`${o.name}: bereits erledigt.`)
        }

        if (missing.length) {
          sfx('error')
          return s.say(
            o.lockedText ?? `Dafür brauchst du: ${missing.map((i) => ITEMS[i].name).join(', ')}`,
          )
        }

        if (o.type === 'use') return get().solve(id)

        // quiz, code, info öffnen ein Overlay
        sfx('click')
        set({ overlay: id })
      },

      solve: (id) => {
        const o = OBJECTS[id]
        set((s) => {
          let inv = s.inventory
          if (o.consumes) inv = inv.filter((i) => !(o.requires ?? []).includes(i))
          for (const r of o.reward ?? []) if (!inv.includes(r)) inv = [...inv, r]
          return { solved: { ...s.solved, [id]: true }, inventory: inv, overlay: null }
        })
        if (o.type === 'use' || o.type === 'code') sfx('open')
        sfx('success', 0.05)
        if (o.reward?.length) sfx('pickup', 0.35)
        if (o.successText) get().say(o.successText)
      },

      closeOverlay: () => set({ overlay: null }),

      reset: () => set((s) => ({ ...initial, overlay: null, hovered: null, message: null, round: s.round + 1 })),
    }),
    {
      name: 'lab-escape-v1',
      partialize: (s) => ({
        solved: s.solved,
        toggles: s.toggles,
        inventory: s.inventory,
        completed: s.completed,
      }),
    },
  ),
)

// Zum Debuggen in der Browser-Konsole (nur im Entwicklungsmodus): __game.getState()
if (import.meta.env?.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame
