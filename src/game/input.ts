// Gemeinsamer Eingabezustand für Tastatur, Maus, Touch-Look und Joystick.
export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  yaw: 0,
  pitch: 0,
}

export const isTouch =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function addLook(dx: number, dy: number, sens: number) {
  input.yaw -= dx * sens
  input.pitch = Math.max(-1.4, Math.min(1.4, input.pitch - dy * sens))
}

// Zum Debuggen in der Browser-Konsole (nur im Entwicklungsmodus): __input.yaw = 1.5
if (import.meta.env?.DEV) (window as unknown as { __input: typeof input }).__input = input
