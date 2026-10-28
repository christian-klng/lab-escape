// Visueller Stil, umschaltbar per URL: ?style=lowpoly (Standard) oder ?style=soft
// Low-Poly: facettierte Flächen (Flat Shading), abgeschrägte statt runder Kanten,
// wenige Segmente bei Zylindern und Kugeln.

export type Style = 'lowpoly' | 'soft'

export const STYLE: Style =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('style') === 'soft' ? 'soft' : 'lowpoly'

export const LOWPOLY = STYLE === 'lowpoly'

/** Segmentzahl für runde Formen: im Low-Poly-Stil etwa ein Drittel, mindestens 5 */
export function seg(n: number) {
  return LOWPOLY ? Math.max(5, Math.round(n / 3)) : n
}

/**
 * Leichte Helligkeitsvariation pro Facette – typisch für Low-Poly-Art.
 * Die Facette wird über ihre Ausrichtung in Weltkoordinaten bestimmt,
 * damit sich die Farbe beim Umsehen nicht verändert.
 */
export function facetJitter(shader: { vertexShader: string; fragmentShader: string }) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLpWorld;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLpWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLpWorld;')
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      {
        vec3 fn = normalize(cross(dFdx(vLpWorld), dFdy(vLpWorld)));
        // gerundet statt abgeschnitten: achsparallele Flächen (Komponente ≈ 0) bleiben stabil
        float h = fract(sin(dot(floor(fn * 8.0 + 0.5), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb *= 0.94 + h * 0.12;
      }`,
    )
}
