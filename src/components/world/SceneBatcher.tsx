'use client'

// ─── SceneBatcher — merges the static, plain-colored world into few draws ───
// The diorama is ~1800 plain MeshStandardMaterial meshes (posts, rails, walls,
// roofs, props…). This pass merges them into a handful of vertex-colored
// meshes, grouped by spatial cell (64 m grid) and then by (color, roughness,
// metalness, emissive, opacity, side). Textured meshes, instanced meshes,
// sprites, shader meshes and REGISTERED animated subtrees are left untouched.
//
// P2-1 rework:
//  - Per-cell batches: each 64 m cell merges independently, so content that
//    mounts later (lazy districts, offices, purchased tycoon buildings) can
//    batch without re-merging the whole city.
//  - Merged meshes keep frustum culling ON (bounding spheres are computed
//    after the merge) — a cell behind the camera costs nothing again.
//  - Re-batch events: `notifyWorldReady()` re-scans for never-batched cells
//    and `markCellDirty(x, z)` / `markObjectCellDirty(obj)` re-run one cell.
//    A 2 s catch-up scan batches cells that appeared without an event.
//  - Opt-out: set `userData.noBatch` on any group/mesh that toggles its own
//    visibility or material at runtime (e.g. the room's cutaway ceiling) —
//    the whole subtree is excluded, so imperative changes always show up.
//
// Animated components register their moving subtree via useAnimatedRef() so
// their meshes are never frozen into a batch.
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const animatedRoots = new Set<THREE.Object3D>()

export function markAnimated(obj: THREE.Object3D | null | undefined) {
  if (obj) {
    animatedRoots.add(obj)
    // also flag the subtree for the collider exporter (moving parts never
    // become static collision boxes)
    obj.userData.animatedRoot = true
  }
}
export function unmarkAnimated(obj: THREE.Object3D | null | undefined) {
  if (obj) {
    animatedRoots.delete(obj)
    obj.userData.animatedRoot = false
  }
}

// hook for animated components: attach to the moving group
export function useAnimatedRef<T extends THREE.Object3D>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  return ref
}

function isExcluded(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o
  while (p) {
    // animatedRoots: per-frame movers (vehicles, NPCs, fan blades…).
    // noBatch: anything that toggles its own visibility/material later
    // (cutaway groups, night swaps) must never be frozen into a batch.
    if (animatedRoots.has(p) || p.userData?.noBatch === true) return true
    p = p.parent
  }
  return false
}

// ── re-batch events (module-level bus — no window globals) ──────────────────

export const BATCHER_EVENTS = {
  worldReady: 'accra:world-ready',
  cellDirty: 'accra:cell-dirty',
} as const

const batcherBus = new EventTarget()

// ── per-cell bookkeeping ─────────────────────────────────────────────────────

// P2-1 cell size: 128 m balances two budgets. At street level ANY cell
// count culls hard (only nearby cells draw); at overview the whole city is
// in frustum and every visible cell is one draw per bucket, so fewer,
// larger cells keep the overview draw-call budget (e2e ≤450) honest while
// still culling whole districts when the camera looks along the plate.
const CELL_SIZE = 128

interface CellBatch {
  key: string
  batches: THREE.Mesh[] // merged meshes owned by this cell
  hidden: THREE.Mesh[] // originals this cell hid
}

const cells = new Map<string, CellBatch>()
// cells whose merge failed — excluded from the automatic catch-up so a bad
// bucket can't retry every 2 s forever (explicit markCellDirty still retries)
const failedCells = new Set<string>()

const dirtyCells = new Set<string>()
let worldReadyQueued = false
let flushHandle = 0
let activeScene: THREE.Scene | null = null

const _v = new THREE.Vector3()
const _box = new THREE.Box3()

function cellKeyFor(x: number, z: number): string {
  return `${Math.floor(x / CELL_SIZE)}:${Math.floor(z / CELL_SIZE)}`
}

function cellKeyOfMesh(mesh: THREE.Mesh): string {
  mesh.updateWorldMatrix(true, false)
  const g = mesh.geometry
  if (!g.boundingBox) g.computeBoundingBox()
  if (g.boundingBox) {
    _box.copy(g.boundingBox).getCenter(_v)
    _v.applyMatrix4(mesh.matrixWorld)
  } else {
    _v.setFromMatrixPosition(mesh.matrixWorld)
  }
  return cellKeyFor(_v.x, _v.z)
}

/** Queue a single cell for re-batching (debounced to the next frame). */
export function markCellDirty(x: number, z: number): void {
  dirtyCells.add(cellKeyFor(x, z))
  scheduleFlush()
}

/** Queue the cell containing `obj` (world position of its bounds centre). */
export function markObjectCellDirty(obj: THREE.Object3D): void {
  obj.updateWorldMatrix(true, false)
  _v.setFromMatrixPosition(obj.matrixWorld)
  markCellDirty(_v.x, _v.z)
}

/** Batch any cells that appeared since the last pass (lazy mounts etc). */
export function notifyWorldReady(): void {
  worldReadyQueued = true
  scheduleFlush()
}

function scheduleFlush(): void {
  if (flushHandle || !activeScene) return
  flushHandle = requestAnimationFrame(() => {
    flushHandle = 0
    if (!activeScene) return
    if (worldReadyQueued) {
      worldReadyQueued = false
      batchCells(activeScene, (k) => !cells.has(k) && !failedCells.has(k))
    }
    if (dirtyCells.size > 0) {
      const want = new Set(dirtyCells)
      dirtyCells.clear()
      batchCells(activeScene, (k) => want.has(k))
    }
  })
}

function undoCell(key: string): void {
  const c = cells.get(key)
  if (!c) return
  for (const m of c.batches) {
    m.removeFromParent()
    m.geometry.dispose()
    // facade batches share the original atlas material — never dispose it
    if (!m.userData.facadeBatch) (m.material as THREE.Material).dispose()
  }
  for (const h of c.hidden) h.visible = true
  cells.delete(key)
}

function undoBatch(): void {
  if (cells.size === 0) return
  for (const key of [...cells.keys()]) undoCell(key)
}

// ── facade atlas merge ───────────────────────────────────────────────────────
// Every Building shell shares one of two atlas materials (wall / glass). Their
// geometries already carry atlas UVs + wall vertex colors, so a straight
// world-transform merge collapses the whole city's facades into 2 draws
// (per cell here, so late shells can join their own cell's batch).

interface FacadeGroup {
  parts: THREE.BufferGeometry[]
  cast: boolean
  receive: boolean
  orig: THREE.Mesh[]
}

function mergeFacadeCell(
  scene: THREE.Scene,
  groups: Map<string, FacadeGroup>,
  cell: CellBatch,
) {
  for (const [tag, grp] of groups) {
    let geo: THREE.BufferGeometry | null = null
    try {
      geo = grp.parts.length === 1 ? grp.parts[0] : mergeGeometries(grp.parts, false)
    } catch {
      geo = null
    }
    if (!geo) {
      console.warn('[batch] facade merge failed, kept individual shells:', tag)
      // restore ONLY this group's shells and keep going — they stay out of
      // the cell's hidden list so undoBatch won't fight their visibility
      for (const o of grp.orig) o.visible = true
      failedCells.add(cell.key)
      continue
    }
    // reuse the SAME shared material (tag → wall/glass/signs)
    const mat = grp.orig[0].material as THREE.MeshStandardMaterial
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = grp.cast
    mesh.receiveShadow = grp.receive
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix() // geometry is world-space; identity local matrix
    geo.computeBoundingSphere() // frustum culling stays ON
    mesh.frustumCulled = true
    mesh.userData.facadeBatch = true
    mesh.name = 'facade-batch:' + cell.key + ':' + tag
    scene.add(mesh)
    cell.batches.push(mesh)
    cell.hidden.push(...grp.orig)
  }
}

// ── per-cell batch pass ──────────────────────────────────────────────────────

interface Bucket {
  key: string
  color: THREE.Color
  roughness: number
  metalness: number
  emissive: THREE.Color
  emissiveIntensity: number
  transparent: boolean
  opacity: number
  side: THREE.Side
  parts: THREE.BufferGeometry[]
  orig: THREE.Mesh[]
  cast: boolean
  receive: boolean
}

/**
 * (Re-)merge the meshes of every cell matching `want`.
 * `want` is evaluated against cell keys: `() => true` batches everything,
 * `(k) => !cells.has(k)` batches only never-batched cells (catch-up), and
 * `(k) => dirty.has(k)` re-runs individual cells.
 */
function batchCells(scene: THREE.Scene, want: (cellKey: string) => boolean) {
  // undo the cells being re-run first: their originals come back visible so
  // the traversal below can re-capture them
  for (const key of cells.keys()) {
    if (want(key)) undoCell(key)
  }

  const buckets = new Map<string, Bucket>()
  const facade = new Map<string, Map<string, FacadeGroup>>() // cellKey → tag → group
  const cellKeys = new Set<string>()

  scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return
    const mesh = o as THREE.Mesh
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) return
    // our own merged output (plain + facade) must never be re-captured
    if (mesh.userData.isBatchMesh === true || mesh.userData.facadeBatch === true) return
    if (!mesh.visible) return
    if (isExcluded(mesh)) return
    const key = cellKeyOfMesh(mesh)
    if (!want(key)) return
    const m = mesh.material as THREE.MeshStandardMaterial
    if (Array.isArray(m)) return
    if (!(m instanceof THREE.MeshStandardMaterial)) return
    cellKeys.add(key)
    // facade-tagged shells (shared atlas material) merge separately, keeping
    // UVs ('signs' = the Task 12 business signboard atlas, lib/signAtlas.ts)
    if (
      m.userData.facadeTag === 'wall' ||
      m.userData.facadeTag === 'glass' ||
      m.userData.facadeTag === 'signs'
    ) {
      let byTag = facade.get(key)
      if (!byTag) {
        byTag = new Map()
        facade.set(key, byTag)
      }
      let grp = byTag.get(m.userData.facadeTag)
      if (!grp) {
        grp = { parts: [], cast: false, receive: false, orig: [] }
        byTag.set(m.userData.facadeTag, grp)
      }
      let g = mesh.geometry.clone()
      if (g.index) g = g.toNonIndexed()
      g.morphAttributes = {}
      g.clearGroups()
      const mat4 = new THREE.Matrix4().copy(mesh.matrixWorld)
      g.applyMatrix4(mat4)
      grp.parts.push(g)
      grp.orig.push(mesh)
      if (mesh.castShadow) grp.cast = true
      if (mesh.receiveShadow) grp.receive = true
      mesh.visible = false
      return
    }
    if (m.map || m.emissiveMap || m.alphaMap || m.roughnessMap || m.metalnessMap || m.normalMap)
      return

    // bucket ONLY by material behavior — colors are baked into vertex
    // attributes so dozens of differently-tinted parts share one material
    const bucketKey = [
      m.roughness.toFixed(2),
      m.metalness.toFixed(2),
      m.emissive.getHexString(),
      m.emissiveIntensity.toFixed(2),
      m.transparent ? 1 : 0,
      m.opacity.toFixed(2),
      m.side,
    ].join('|')

    let b = buckets.get(key + '|' + bucketKey)
    if (!b) {
      b = {
        key: bucketKey,
        color: new THREE.Color(0xffffff),
        roughness: m.roughness,
        metalness: m.metalness,
        emissive: m.emissive.clone(),
        emissiveIntensity: m.emissiveIntensity,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        parts: [],
        orig: [],
        cast: false,
        receive: false,
      }
      buckets.set(key + '|' + bucketKey, b)
    }
    const g0 = mesh.geometry.clone()
    // normalize attributes: batched material is untextured → keep only
    // position/normal/color, and mergeGeometries requires all-indexed or
    // all-non-indexed
    g0.deleteAttribute('uv')
    g0.deleteAttribute('uv1')
    g0.deleteAttribute('uv2')
    const g = g0.index ? g0.toNonIndexed() : g0
    const keep = new Set(['position', 'normal', 'color'])
    for (const name of Object.keys(g.attributes)) {
      if (!keep.has(name)) g.deleteAttribute(name)
    }
    g.morphAttributes = {}
    g.clearGroups()
    const mat4 = new THREE.Matrix4().copy(mesh.matrixWorld)
    g.applyMatrix4(mat4)
    {
      // always (re)write the color attribute from the material color
      const n = g.attributes.position.count
      const c = m.color
      const existing = g.getAttribute('color')
      if (m.vertexColors && existing) {
        // keep baked vertex colors as-is
      } else {
        const arr = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) {
          arr[i * 3] = c.r
          arr[i * 3 + 1] = c.g
          arr[i * 3 + 2] = c.b
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
      }
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    b.parts.push(g)
    b.orig.push(mesh)
    if (mesh.castShadow) b.cast = true
    if (mesh.receiveShadow) b.receive = true
    mesh.visible = false
  })

  // build the merged meshes per cell
  for (const key of cellKeys) {
    const cell: CellBatch = { key, batches: [], hidden: [] }
    let madeAny = false

    // facade groups of this cell
    const byTag = facade.get(key)
    if (byTag && byTag.size > 0) {
      const before = cell.batches.length
      mergeFacadeCell(scene, byTag, cell)
      madeAny = madeAny || cell.batches.length > before
    }

    // plain buckets of this cell
    for (const [fullKey, b] of buckets) {
      if (!fullKey.startsWith(key + '|')) continue
      if (b.parts.length === 0) continue
      let geo: THREE.BufferGeometry | null = null
      try {
        geo = b.parts.length === 1 ? b.parts[0] : mergeGeometries(b.parts, false)
      } catch {
        geo = null
      }
      if (!geo) {
        // merge failed — restore ONLY this bucket's meshes and keep going
        console.warn('[batch] bucket merge failed, kept individual meshes:', b.key)
        for (const h of b.orig) h.visible = true
        failedCells.add(key)
        continue
      }
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        color: 0xffffff,
        roughness: b.roughness,
        metalness: b.metalness,
        emissive: b.emissive,
        emissiveIntensity: b.emissiveIntensity,
        transparent: b.transparent,
        opacity: b.opacity,
        side: b.side,
      })
      mat.userData.batchMaterial = true
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = b.cast
      mesh.receiveShadow = b.receive
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix() // geometry is world-space; identity local matrix
      geo.computeBoundingSphere() // frustum culling stays ON
      mesh.frustumCulled = true
      mesh.userData.isBatchMesh = true
      mesh.name = 'batch:' + key + '|' + b.key
      scene.add(mesh)
      cell.batches.push(mesh)
      cell.hidden.push(...b.orig)
      madeAny = true
    }

    if (madeAny || cell.hidden.length > 0) cells.set(key, cell)
  }
}

export function SceneBatcher() {
  // The scene comes from the R3F store we're mounted in. (The map viewer's
  // bootstrap used to publish window.__ACCRA.scene — the game never sets
  // that, so relying on it here silently skipped the whole batch pass and
  // left the Accra map at ~4000 draw calls.)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    let cancelled = false
    let raf2 = 0
    const onRebatch = () => scheduleFlush()
    batcherBus.addEventListener(BATCHER_EVENTS.worldReady, onRebatch)
    batcherBus.addEventListener(BATCHER_EVENTS.cellDirty, onRebatch)
    // wait two frames: the whole world must be mounted first
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !scene) return
        const w = window as unknown as { __ACCRA?: { scene?: THREE.Scene } }
        // (Re)publish the debug handle the batch pass already consumes —
        // probes / headless audit tools traverse the graph through it.
        w.__ACCRA = { ...(w.__ACCRA ?? {}), scene }
        activeScene = w.__ACCRA?.scene ?? scene
        batchCells(activeScene, () => true)
      })
    })
    // catch-up: anything mounted later (lazy districts, offices, purchased
    // tycoon buildings) joins its cell's batch without an explicit event
    const iv = window.setInterval(() => {
      if (!cancelled && activeScene && !worldReadyQueued) {
        worldReadyQueued = true
        scheduleFlush()
      }
    }, 2000)
    return () => {
      cancelled = true
      activeScene = null
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (flushHandle) {
        cancelAnimationFrame(flushHandle)
        flushHandle = 0
      }
      window.clearInterval(iv)
      batcherBus.removeEventListener(BATCHER_EVENTS.worldReady, onRebatch)
      batcherBus.removeEventListener(BATCHER_EVENTS.cellDirty, onRebatch)
      undoBatch()
    }
  }, [scene])
  // on final unmount, restore the original meshes
  useEffect(() => {
    return () => undoBatch()
  }, [])
  return null
}
