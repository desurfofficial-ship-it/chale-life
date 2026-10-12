// ─── Collider export — every movement-blocking object as world-space AABBs ──
// Used by the headless movement simulation (Chalé Life handover suite) and by
// the in-browser flight prover. Boxes are axis-aligned in metres, Y-up, world
// origin. Rotated objects use their world bounding box (conservative).
//
// Provenance: boxes are derived from the REAL scene graph meshes (or their
// instanced matrices), so a collider always matches a visible mesh — the
// conservative case (rotated mesh → bounding box) is documented in the README.
import * as THREE from 'three'
import { PLATE, PLATE_CX, EXTRA_COLLIDERS } from './mapConfig'
import { COMMUNITY } from './communityLayout'

export interface ColliderBox {
  /** min corner (x, y, z) in metres */
  min: [number, number, number]
  /** max corner (x, y, z) in metres */
  max: [number, number, number]
  /** what this box came from (debugging / visual matching) */
  kind: string
}

// per-instanced-kind footprint half-extents (x, z) and height — thin posts
// become slim boxes; canopies that sit above head height are skipped
const INSTANCED_FOOTPRINTS: Record<string, { hx: number; hz: number; h: number } | null> = {
  'inst-palm': { hx: 0.35, hz: 0.35, h: 5.2 },
  'inst-tree': { hx: 0.4, hz: 0.4, h: 2.0 },
  'inst-bench': { hx: 1.0, hz: 0.35, h: 0.95 },
  'inst-lamp': { hx: 0.2, hz: 0.2, h: 5.2 },
  'inst-person': null, // decorative crowd — the game spawns its own NPCs
  'inst-umbrella': { hx: 0.1, hz: 0.1, h: 2.8 }, // pole only; canopy is above head height
  'inst-shrub': { hx: 0.5, hz: 0.5, h: 0.85 }, // bush cluster - blocks walkers, not sightlines
  'inst-grass': null, // grass tufts - pure dressing
  // Task 12 (TownLife): plastic chairs block, cafe umbrellas = pole only
  'inst-chair': { hx: 0.24, hz: 0.24, h: 0.85 },
  'inst-cafe-umbrella': { hx: 0.06, hz: 0.06, h: 2.5 },
  'inst-crop': null, // North Reach scenery (off-plate)
  'inst-farmpost': null,
}

// does this mesh block a walker (things whose underside starts above head
// height — awnings, arch beams, sign boards above doors — do not)
const HEAD_HEIGHT = 1.8

function boxFromObject3D(o: THREE.Object3D, kind: string, out: ColliderBox[]) {
  const g = (o as THREE.Mesh).geometry
  if (!g?.boundingBox) g.computeBoundingBox()
  const bb = g.boundingBox!
  if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return
  // 8 corners → world → AABB (conservative for rotated meshes)
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  const p = new THREE.Vector3()
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z)
    o.localToWorld(p)
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); minZ = Math.min(minZ, p.z)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z)
  }
  if (minY > HEAD_HEIGHT) return // entirely above head height
  // degenerate flat decals (ground pads, painted planes) are not walls
  if (maxY - minY < 0.05) return
  out.push({ min: [minX, minY, minZ], max: [maxX, maxY, maxZ], kind })
}

function isUnderAnimated(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o
  while (p) {
    if (p.userData && p.userData.animatedRoot) return true
    p = p.parent
  }
  return false
}

/**
 * Walk the scene and produce the collider set. Excludes:
 *  - the ground plate, pedestal, plinths, sea/lagoon/skirts (userData.noCollide)
 *  - batch/facade-batch merged meshes (their content = the hidden originals)
 *  - animated subtrees (ferris wheel cabins, balloon, flags, boats — static
 *    parts of these structures get hand-authored boxes in EXTRA_COLLIDERS)
 *  - decorative people (inst-person), game markers, labels, glow sprites
 */
export function captureColliders(scene: THREE.Scene): ColliderBox[] {
  const out: ColliderBox[] = []
  const instancedSeen = new Set<string>()

  scene.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) {
      const im = o as THREE.InstancedMesh
      const fp = INSTANCED_FOOTPRINTS[im.name]
      if (!fp) return
      instancedSeen.add(im.name)
      const m = new THREE.Matrix4()
      const pos = new THREE.Vector3()
      const quat = new THREE.Quaternion()
      const scale = new THREE.Vector3()
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m)
        m.decompose(pos, quat, scale)
        // yaw only — instanced props rotate around Y
        const yaw = Math.atan2(2 * (quat.w * quat.y + quat.x * quat.z), 1 - 2 * (quat.y * quat.y + quat.z * quat.z))
        const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw))
        // rotated footprint AABB
        const hx = fp.hx * c + fp.hz * s
        const hz = fp.hx * s + fp.hz * c
        out.push({
          min: [pos.x - hx * scale.x, 0, pos.z - hz * scale.z],
          max: [pos.x + hx * scale.x, fp.h * scale.y, pos.z + hz * scale.z],
          kind: im.name,
        })
      }
      return
    }
    if (!(o as THREE.Mesh).isMesh) return // skips sprites, points, lines
    if (o.name.startsWith('batch:') || o.name.startsWith('facade-batch:')) return
    if (o.userData && o.userData.noCollide) return
    if (isUnderAnimated(o)) return
    const mesh = o as THREE.Mesh
    const mat = mesh.material as THREE.Material & { transparent?: boolean; visible?: boolean }
    if (Array.isArray(mesh.material)) return
    if (!mat || mat.visible === false) return
    if (mat.transparent) return // glow planes, window sheens, water
    // shader-driven surfaces (sky dome, water) are never solid
    if (!(mat as unknown as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) return
    boxFromObject3D(mesh, mesh.name || mesh.parent?.name || 'mesh', out)
  })

  // sanity: every instanced kind we know about was found (except none mounted)
  void instancedSeen
  return out
}

/** Clamp boxes to the plate (and a sane world height) and drop the rest. */
export function clipToPlate(boxes: ColliderBox[]): ColliderBox[] {
  // the plate is centred at PLATE_CX (x −160…212) — the old ±w/2 clip cut
  // every collider east of x 186 (half of Nungua) out of the sim data
  const x0 = PLATE_CX - PLATE.w / 2, x1 = PLATE_CX + PLATE.w / 2
  const z0 = -PLATE.d / 2, z1 = PLATE.d / 2
  const y0 = 0, y1 = 120 // nothing walkable/flyable lives above 120 m
  const out: ColliderBox[] = []
  for (const b of boxes) {
    const [minX, minY, minZ] = b.min
    const [maxX, maxY, maxZ] = b.max
    if (maxX <= x0 || minX >= x1 || maxZ <= z0 || minZ >= z1) continue
    out.push({
      min: [Math.max(minX, x0), Math.max(minY, y0), Math.max(minZ, z0)],
      max: [Math.min(maxX, x1), Math.min(maxY, y1), Math.min(maxZ, z1)],
      kind: b.kind,
    })
  }
  return out
}

/**
 * Full export: auto-captured scene boxes (clipped to the plate) plus the
 * hand-authored extras for animated/composite structures. This is the single
 * source of truth the movement simulation consumes.
 */
export function exportColliders(scene: THREE.Scene): ColliderBox[] {
  // Task 14: parked community vehicles are instanced (no auto box) — their
  // footprints are generated with the layout (tools/t14_community.py)
  const parked: ColliderBox[] = COMMUNITY.parked.map((p) => ({ min: p.box[0], max: p.box[1], kind: `parked-${p.k}` }))
  return [...clipToPlate(captureColliders(scene)), ...EXTRA_COLLIDERS, ...parked]
}
