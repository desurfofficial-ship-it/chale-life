/**
 * homeLayout.ts — free furniture placement rules for the PLAYER'S OWN HOUSE.
 *
 * The Reality-Check directive (PRIORITY 2): the starter room begins empty,
 * bought pieces are placed / moved / rotated / removed by the player, invalid
 * placements are rejected, and the layout persists. This module is the pure
 * rule half (no three.js, no React, no storage) so it unit-tests in Node —
 * the same pattern as furnitureLayout.ts and rules/business.ts' layout edit.
 *
 * Coordinates: room-local metres, origin at the floor centre — x ∈ [-3.3, 3.3],
 * z ∈ [-3.0, 3.0], +z = street side (front wall with the door). Mirrors ROOM
 * in GyanRoom.tsx. The front door sits at x ≈ +2.2 (GYAN_HOUSE_WORLD
 * .doorLocalX) with a 1.15 m opening — placements may not block it.
 *
 * Positions live on a 0.5 m tile grid and rotations are quarter turns, so the
 * touch controls (N/E/S/W tiles + rotate, the T-003 pattern) map 1:1.
 */
import { categoryOf } from './furnitureLayout'
import { furnitureSizeMeters } from '../data/furniture'

/** Room interior half-extents (metres) — mirrors ROOM in GyanRoom.tsx. */
export const ROOM_HALF_W = 3.3
export const ROOM_HALF_D = 3.0

/** Placement grid step (metres) — one tap of the N/E/S/W move buttons. */
export const HOME_TILE = 0.5

/** Door (local x centre, opening width) + the keep-clear apron depth. */
export const DOOR = { x: 2.2, width: 1.15, apron: 1.0 } as const

export type Quarter = 0 | 1 | 2 | 3
/** radians for a quarter-turn index (clockwise). */
export function quarterToRotY(q: Quarter): number {
  return (q * Math.PI) / 2
}
export function rotYToQuarter(rotY: number): Quarter {
  const q = Math.round(rotY / (Math.PI / 2)) & 3
  return q as Quarter
}

export interface HomePlacement {
  /** Stable per-instance key (catalog id + purchase index). */
  readonly uid: string
  /** Catalog id (data/furniture). */
  readonly id: string
  /** Tile-grid centre, metres, room-local. */
  readonly x: number
  readonly z: number
  /** Quarter-turn index (0..3) — converted to radians at render time. */
  readonly rot: Quarter
}

/** Flat pieces never block other placements (and may overlap anything). */
const FLAT_CATEGORIES = new Set(['rug', 'kente'])

/** Footprint after rotation: [w, d] in metres (0.5 m minimum, rounded to tiles). */
export function footprintOf(id: string, rot: Quarter): { w: number; d: number } {
  const [w0, , d0] = furnitureSizeMeters(id)
  const min = 0.45 // keep the smallest props placeable on the 0.5 m grid
  const w = Math.max(min, w0)
  const d = Math.max(min, d0)
  return rot % 2 === 0 ? { w, d } : { w: d, d: w }
}

function cellOf(v: number): number {
  return Math.round(v / HOME_TILE)
}

export function snapToTile(v: number): number {
  return cellOf(v) * HOME_TILE
}

/** True when the AABB (centre + footprint) is fully inside the room. */
export function insideRoom(x: number, z: number, fp: { w: number; d: number }): boolean {
  return (
    x - fp.w / 2 >= -ROOM_HALF_W - 1e-6 &&
    x + fp.w / 2 <= ROOM_HALF_W + 1e-6 &&
    z - fp.d / 2 >= -ROOM_HALF_D - 1e-6 &&
    z + fp.d / 2 <= ROOM_HALF_D + 1e-6
  )
}

/** True when the AABB blocks the front-door apron. */
export function blocksDoor(x: number, z: number, fp: { w: number; d: number }): boolean {
  const inDoorX = x + fp.w / 2 > DOOR.x - DOOR.width / 2 - 0.15 && x - fp.w / 2 < DOOR.x + DOOR.width / 2 + 0.15
  const inApron = z + fp.d / 2 > ROOM_HALF_D - DOOR.apron
  return inDoorX && inApron
}

function overlaps(
  a: { x: number; z: number; w: number; d: number },
  b: { x: number; z: number; w: number; d: number },
): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6
}

export type HomeMoveResult =
  | { ok: true; layout: readonly HomePlacement[] }
  | { ok: false; layout: readonly HomePlacement[]; reason: string }

function validate(
  layout: readonly HomePlacement[],
  next: HomePlacement,
  exceptUid?: string,
): string | null {
  const fp = footprintOf(next.id, next.rot)
  if (!insideRoom(next.x, next.z, fp)) return 'Outside the room.'
  if (blocksDoor(next.x, next.z, fp)) return 'Blocks the door.'
  for (const p of layout) {
    if (p.uid === exceptUid) continue
    if (FLAT_CATEGORIES.has(categoryKey(p.id)) || FLAT_CATEGORIES.has(categoryKey(next.id))) continue
    const ofp = footprintOf(p.id, p.rot)
    if (overlaps({ x: next.x, z: next.z, ...fp }, { x: p.x, z: p.z, ...ofp })) {
      return 'Overlaps another piece.'
    }
  }
  return null
}

/** Coarse category via furnitureLayout's id→category map (bed/sofa/rug…). */
function categoryKey(id: string): string {
  return categoryOf(id)
}

/** Place a bought piece. Positions snap to the tile grid. */
export function placeFurniture(
  layout: readonly HomePlacement[],
  item: { uid: string; id: string },
  x: number,
  z: number,
  rot: Quarter = 0,
): HomeMoveResult {
  if (layout.some((p) => p.uid === item.uid)) return { ok: false, layout, reason: 'Already placed.' }
  const next: HomePlacement = { uid: item.uid, id: item.id, x: snapToTile(x), z: snapToTile(z), rot }
  const why = validate(layout, next)
  if (why) return { ok: false, layout, reason: why }
  return { ok: true, layout: [...layout, next] }
}

/** Move an existing piece (tile step, fully validated). */
export function moveFurniture(
  layout: readonly HomePlacement[],
  uid: string,
  dx: number,
  dz: number,
): HomeMoveResult {
  const p = layout.find((q) => q.uid === uid)
  if (!p) return { ok: false, layout, reason: 'Unknown piece.' }
  const next: HomePlacement = { ...p, x: snapToTile(p.x + dx), z: snapToTile(p.z + dz) }
  const why = validate(layout, next, uid)
  if (why) return { ok: false, layout, reason: why }
  return { ok: true, layout: layout.map((q) => (q.uid === uid ? next : q)) }
}

/** Rotate an existing piece 90° clockwise (validated — footprints swap). */
export function rotateFurniture(layout: readonly HomePlacement[], uid: string): HomeMoveResult {
  const p = layout.find((q) => q.uid === uid)
  if (!p) return { ok: false, layout, reason: 'Unknown piece.' }
  const next: HomePlacement = { ...p, rot: ((p.rot + 1) & 3) as Quarter }
  const why = validate(layout, next, uid)
  if (why) return { ok: false, layout, reason: why }
  return { ok: true, layout: layout.map((q) => (q.uid === uid ? next : q)) }
}

/** Remove a piece from the layout (the purchase stays owned in the ledger). */
export function removeFurniture(layout: readonly HomePlacement[], uid: string): HomeMoveResult {
  if (!layout.some((q) => q.uid === uid)) return { ok: false, layout, reason: 'Unknown piece.' }
  return { ok: true, layout: layout.filter((q) => q.uid !== uid) }
}

// ── auto-anchor: where a fresh purchase lands before the player arranges it ──

/** Preferred spots per coarse category (room-local metres), tried in order. */
const PREFERRED: Record<string, Array<{ x: number; z: number; rot: Quarter }>> = {
  bed: [{ x: 2.5, z: -1.5, rot: 0 }],
  sofa: [{ x: -1.5, z: -2.5, rot: 0 }],
  wardrobe: [{ x: -3.0, z: -2.0, rot: 1 }],
  desk: [{ x: -3.0, z: 1.0, rot: 1 }],
  tv: [{ x: 1.5, z: -2.5, rot: 0 }],
  fridge: [{ x: -3.0, z: 2.5, rot: 1 }],
  cooker: [{ x: -3.0, z: 1.5, rot: 1 }],
  table: [{ x: 0, z: 0.5, rot: 0 }],
  chair: [{ x: 0.5, z: 0, rot: 0 }],
  stool: [{ x: -0.5, z: 0, rot: 0 }],
}

/**
 * First valid spot for a piece: preferred anchors for its kind, then a
 * 0.5 m grid scan from the back-left corner. Never throws — worst case the
 * room is packed and the piece stays unplaced (the UI surfaces it).
 */
export function findFreeSpot(
  layout: readonly HomePlacement[],
  id: string,
  uid: string,
): { x: number; z: number; rot: Quarter } | null {
  const cat = categoryKey(id)
  const preferred = PREFERRED[cat] ?? []
  for (const spot of preferred) {
    const probe: HomePlacement = { uid, id, x: snapToTile(spot.x), z: snapToTile(spot.z), rot: spot.rot }
    if (!validate(layout, probe)) return { x: probe.x, z: probe.z, rot: probe.rot }
  }
  for (let z = -ROOM_HALF_D + 0.5; z <= ROOM_HALF_D - 0.5; z += HOME_TILE) {
    for (let x = -ROOM_HALF_W + 0.5; x <= ROOM_HALF_W - 0.5; x += HOME_TILE) {
      const probe: HomePlacement = { uid, id, x: snapToTile(x), z: snapToTile(z), rot: 0 }
      if (!validate(layout, probe)) return { x: probe.x, z: probe.z, rot: 0 }
    }
  }
  return null
}

/** uid for the n-th purchase of a catalog id. */
export function uidFor(id: string, index: number): string {
  return `${id}#${index}`
}

/** Inverse of uidFor — catalogue lookup must use the bare id, never `id#n`. */
export function catalogIdFromUid(uid: string): string {
  const i = uid.lastIndexOf('#')
  return i >= 0 ? uid.slice(0, i) : uid
}
