/**
 * outfits.ts — the clothing system for the AccraLife character.
 *
 * The GLB has a single flat skin-tone texture (palette-sampled: one colour,
 * 99.99% of pixels) — there is NOTHING baked to recolour. So clothing is real
 * geometry: low-poly tee + trousers built as capsules/cylinders, SKINNED to
 * the character's own 19-joint armature with segment-projection weights, and
 * rendered just outside the body surface (per-outfit shell offset). Changing
 * outfit = swapping two material colour sets — visibly different at every
 * angle, zero texture surgery, no new assets required.
 *
 * Bind pose is the T-pose (arms along ±X); garments are authored in model
 * space (origin at the hips, +Y up, +Z forward) and follow every animation
 * because they share the skeleton.
 */
import * as THREE from 'three'

export interface Outfit {
  readonly id: string
  readonly label: string
  readonly shirt: string
  readonly sleeves: string
  readonly trousers: string
  readonly accent: string
}

export const OUTFITS: readonly Outfit[] = [
  { id: 'classic', label: 'Classic White', shirt: '#f2efe7', sleeves: '#f2efe7', trousers: '#2c3a55', accent: '#c8a24a' },
  { id: 'kente', label: 'Kente Gold', shirt: '#d9a62e', sleeves: '#b8860b', trousers: '#4a3620', accent: '#1a6b3c' },
  { id: 'azonto', label: 'Azonto Red', shirt: '#c0392b', sleeves: '#a03024', trousers: '#23262e', accent: '#f0c419' },
  { id: 'labadi', label: 'Labadi Blue', shirt: '#2a6fb0', sleeves: '#245d95', trousers: '#e8e4da', accent: '#f2f0ea' },
  { id: 'night', label: 'Night Market', shirt: '#3a3f4a', sleeves: '#333842', trousers: '#1c1f26', accent: '#8f9aa8' },
]

export const DEFAULT_OUTFIT_ID = 'classic'

const OUTFIT_PREFS_ID = 'chale-outfit-v1' // not a secret: localStorage key name (gitleaks generic-api-key FP)

// ── tiny live store: the HUD wardrobe chips write; the 3D character reads ──
let currentOutfitId = DEFAULT_OUTFIT_ID
const outfitListeners = new Set<() => void>()

export function getOutfitId(): string {
  return currentOutfitId
}

export function subscribeOutfit(fn: () => void): () => void {
  outfitListeners.add(fn)
  return () => {
    outfitListeners.delete(fn)
  }
}

export function setOutfitId(id: string): void {
  if (!OUTFITS.some((o) => o.id === id)) return
  if (currentOutfitId === id) return
  currentOutfitId = id
  saveOutfitId(id)
  for (const l of outfitListeners) l()
}

export function loadOutfitId(): string {
  currentOutfitId = loadSavedOutfitId()
  return currentOutfitId
}

function loadSavedOutfitId(): string {
  try {
    const v = localStorage.getItem(OUTFIT_PREFS_ID)
    return v && OUTFITS.some((o) => o.id === v) ? v : DEFAULT_OUTFIT_ID
  } catch {
    return DEFAULT_OUTFIT_ID
  }
}

export function saveOutfitId(id: string): void {
  try {
    if (OUTFITS.some((o) => o.id === id)) localStorage.setItem(OUTFIT_PREFS_ID, id)
  } catch {
    /* private mode — outfit choice just isn't saved */
  }
}

// restore the saved choice once at boot (browser only)
if (typeof window !== 'undefined') {
  currentOutfitId = loadSavedOutfitId()
}

// ── geometry helpers ─────────────────────────────────────────────────────────

function tubeGeo(topY: number, bottomY: number, rTop: number, rBot: number, radial = 12): THREE.CylinderGeometry {
  const midY = (topY + bottomY) / 2
  const h = Math.max(0.01, topY - bottomY)
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, radial, 3, true)
  geo.translate(0, midY, 0)
  return geo
}

/**
 * Assign skin weights by projecting each vertex onto a bone segment chain.
 * `chain`: bone name → [start, end] in model space; each vertex binds to the
 * two nearest segments with linear falloff — simple, stable, good enough for
 * loose clothing.
 */
function skinByProjection(
  geo: THREE.BufferGeometry,
  chain: Array<{ bone: string; a: THREE.Vector3; b: THREE.Vector3 }>,
): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const n = pos.count
  const idx = new Uint16Array(n * 4)
  const w = new Float32Array(n * 4)
  const p = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ap = new THREE.Vector3()
  const best: Array<{ i: number; d: number }> = [
    { i: 0, d: Infinity },
    { i: 0, d: Infinity },
  ]
  for (let v = 0; v < n; v++) {
    p.set(pos.getX(v), pos.getY(v), pos.getZ(v))
    best[0].i = 0
    best[0].d = Infinity
    best[1].i = 0
    best[1].d = Infinity
    for (let s = 0; s < chain.length; s++) {
      const seg = chain[s]
      ab.subVectors(seg.b, seg.a)
      ap.subVectors(p, seg.a)
      const len2 = Math.max(1e-6, ab.lengthSq())
      const t = Math.max(0, Math.min(1, ap.dot(ab) / len2))
      const cx = seg.a.x + ab.x * t
      const cy = seg.a.y + ab.y * t
      const cz = seg.a.z + ab.z * t
      const d = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2
      if (d < best[0].d) {
        best[1].i = best[0].i
        best[1].d = best[0].d
        best[0].i = s
        best[0].d = d
      } else if (d < best[1].d) {
        best[1].i = s
        best[1].d = d
      }
    }
    const d0 = Math.sqrt(best[0].d)
    const d1 = Math.sqrt(best[1].d)
    // falloff: nearest segment dominates; 1 cm of separation ≈ 40% weight loss
    const w0 = 1 / (1 + d0 / 0.025)
    const w1 = 1 / (1 + d1 / 0.025)
    const sum = w0 + w1
    idx[v * 4] = best[0].i
    w[v * 4] = w0 / sum
    idx[v * 4 + 1] = best[1].i
    w[v * 4 + 1] = w1 / sum
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4))
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4))
}

export interface GarmentSet {
  group: THREE.Group
  apply(outfit: Outfit): void
}

/**
 * Build tee + trousers for ONE character instance (call per clone — the
 * geometry can be shared, the SkinnedMeshes cannot).
 */
export function buildGarments(
  bones: Map<string, THREE.Object3D>,
  skeleton: THREE.Skeleton,
): GarmentSet | null {
  const need = ['Hips', 'Spine', 'Chest', 'LUpperArm', 'RUpperArm', 'LUpperLeg', 'RUpperLeg', 'LLowerLeg', 'RLowerLeg']
  for (const b of need) {
    if (!bones.get(b)) return null
  }
  const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z)

  // model-space landmarks (T-pose, origin at hips ≈ y 1.0 above the feet —
  // garments are relative to the HIPS joint at y 0). Radii sit OUTSIDE the
  // body surface: the body torso half-width is ≈0.17 m (1.256 m T-pose arm
  // span minus the arms), so a 0.165 shell z-fights INSIDE the mesh and the
  // clothes are invisible — measured live in the P3 audit capture.
  const hipY = 0
  const chestY = 0.34
  const shoulderY = 0.46
  const waistR = 0.185
  const chestR = 0.21

  // ── tee: torso tube hips→shoulders ──
  const torso = tubeGeo(shoulderY + 0.03, hipY - 0.12, chestR, waistR)
  skinByProjection(torso, [
    { bone: 'Chest', a: V(0, chestY, 0), b: V(0, shoulderY, 0) },
    { bone: 'Spine', a: V(0, hipY + 0.06, 0), b: V(0, chestY, 0) },
    { bone: 'Hips', a: V(0, hipY - 0.14, 0), b: V(0, hipY + 0.06, 0) },
  ])

  // sleeves: short tubes along the T-posed upper arms (±X)
  const sleeveGeo = tubeGeo(0.06, -0.14, 0.082, 0.072)
  skinByProjection(sleeveGeo, [{ bone: 'LUpperArm', a: V(0, 0, 0), b: V(0.28, 0, 0) }])
  const sleeveGeoR = sleeveGeo.clone()
  skinByProjection(sleeveGeoR, [{ bone: 'RUpperArm', a: V(0, 0, 0), b: V(-0.28, 0, 0) }])

  // ── trousers: two leg tubes + a waist ring ──
  const legGeo = tubeGeo(0.02, -0.86, 0.105, 0.082)
  skinByProjection(legGeo, [
    { bone: 'LUpperLeg', a: V(0.09, 0, 0), b: V(0.09, -0.44, 0) },
    { bone: 'LLowerLeg', a: V(0.09, -0.44, 0), b: V(0.09, -0.84, 0) },
  ])
  const legGeoR = legGeo.clone()
  skinByProjection(legGeoR, [
    { bone: 'RUpperLeg', a: V(-0.09, 0, 0), b: V(-0.09, -0.44, 0) },
    { bone: 'RLowerLeg', a: V(-0.09, -0.44, 0), b: V(-0.09, -0.84, 0) },
  ])
  const waist = tubeGeo(hipY + 0.05, hipY - 0.14, waistR + 0.02, waistR + 0.012)
  skinByProjection(waist, [{ bone: 'Hips', a: V(0, hipY - 0.14, 0), b: V(0, hipY + 0.05, 0) }])

  // skinned meshes share the character's skeleton
  const mk = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial): THREE.SkinnedMesh => {
    const m = new THREE.SkinnedMesh(geo, mat)
    m.bind(skeleton, new THREE.Matrix4())
    m.castShadow = true
    m.receiveShadow = false
    m.frustumCulled = false // skinned bounds lag the skeleton
    return m
  }

  const shirtMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 })
  const sleeveMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 })
  const trouserMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })
  const accentMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })

  const group = new THREE.Group()
  group.name = 'character-garments'
  const torsoMesh = mk(torso, shirtMat)
  const sleeveL = mk(sleeveGeo, sleeveMat)
  sleeveL.position.x = 0.24 // along the T-posed +X arm
  const sleeveR = mk(sleeveGeoR, sleeveMat)
  sleeveR.position.x = -0.24
  const legL = mk(legGeo, trouserMat)
  legL.position.x = 0.09
  const legR = mk(legGeoR, trouserMat)
  legR.position.x = -0.09
  const waistMesh = mk(waist, accentMat)
  group.add(torsoMesh, sleeveL, sleeveR, legL, legR, waistMesh)

  return {
    group,
    apply(outfit: Outfit): void {
      shirtMat.color.set(outfit.shirt)
      sleeveMat.color.set(outfit.sleeves)
      trouserMat.color.set(outfit.trousers)
      accentMat.color.set(outfit.accent)
    },
  }
}

/** bones-by-name map for the garment binder (subset of the full rig scan). */
export function collectBones(root: THREE.Object3D): Map<string, THREE.Object3D> {
  const m = new Map<string, THREE.Object3D>()
  root.traverse((o) => {
    if (o.name && !m.has(o.name)) m.set(o.name, o)
  })
  return m
}
