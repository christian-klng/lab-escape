import * as THREE from 'three'

// Raycast von der Kamera aus, um interaktive Gegenstände zu finden.
let cam: THREE.Camera | null = null
let scn: THREE.Scene | null = null

export function registerView(c: THREE.Camera, s: THREE.Scene) {
  cam = c
  scn = s
}

const ray = new THREE.Raycaster()
ray.far = 3 // Reichweite in Metern
const ndc = new THREE.Vector2()

/** ndcX/ndcY in [-1, 1]; (0, 0) = Bildschirmmitte */
export function pick(ndcX: number, ndcY: number): string | null {
  if (!cam || !scn) return null
  ndc.set(ndcX, ndcY)
  ray.setFromCamera(ndc, cam)
  // Nur echte, sichtbare Meshes zählen. Partikel (Points) würden sonst mit ihrer
  // großzügigen Trefferzone fast jeden Strahl abfangen.
  const hit = ray
    .intersectObjects(scn.children, true)
    .find((h) => (h.object as THREE.Mesh).isMesh && !(h.object as THREE.InstancedMesh).isInstancedMesh && h.object.visible)
  let o: THREE.Object3D | null = hit?.object ?? null
  while (o) {
    if (o.userData.interactId) return o.userData.interactId as string
    o = o.parent
  }
  return null
}
