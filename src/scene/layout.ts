import type { V3 } from './kit'

/**
 * Raumgröße und „Bühnen“-Tricks.
 *
 * Das Labor ist bewusst unrealistisch kompakt – wie ein Bühnenbild oder Diorama:
 * kleine Grundfläche, niedrige Decke, alle Stationen ein bis zwei Schritte von
 * der Raummitte entfernt. Dazu zwei Kniffe, die in vielen Spielen üblich sind:
 * - PROP_SCALE: Gegenstände, mit denen man interagiert, sind etwas größer als echt
 *   („Hero-Props“) und damit besser lesbar und leichter zu treffen.
 * - FOV: ein engerer Blickwinkel als üblich lässt alles näher wirken und verzerrt
 *   die Ränder weniger.
 */
export const ROOM = { w: 6, d: 5, h: 2.6 } // vorher 10 × 8 × 3 m
export const HX = ROOM.w / 2
export const HZ = ROOM.d / 2
export const DOOR_HALF = 0.64 // halbe Breite der Türöffnung
export const PROP_SCALE = 1.3
export const FOV = 58 // vorher 70
export const PLAYER_START: V3 = [0, 1, 1.8]

/** Render-Ebene für Effekte, die keine Schatten werfen sollen (Staub) */
export const FX_LAYER = 1

/** Fensteröffnung in der rechten Wand (Mitte z/y, Breite, Höhe) */
export const WINDOW = { z: -1, y: 1.6, w: 1.6, h: 1.0 }
