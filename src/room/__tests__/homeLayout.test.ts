/**
 * homeLayout tests — the player's own free-placement rules (Reality-check P2).
 * Pure Node: bounds, door clearance, overlap, rotation footprints, tile
 * snapping, auto-anchor. The store half (persistence) is covered by
 * localStorage round-trips in the homeFurnish e2e.
 */
import { describe, expect, it } from 'vitest'
import {
  blocksDoor,
  findFreeSpot,
  footprintOf,
  insideRoom,
  moveFurniture,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  snapToTile,
  HOME_TILE,
  ROOM_HALF_D,
  ROOM_HALF_W,
} from '../homeLayout'

describe('snapToTile', () => {
  it('snaps to the 0.5 m grid', () => {
    expect(snapToTile(1.23)).toBe(1.0)
    expect(snapToTile(-0.74)).toBe(-0.5)
    expect(snapToTile(2.26)).toBe(2.5)
  })
})

describe('footprintOf', () => {
  it('swaps width/depth on quarter turns', () => {
    const bed = footprintOf('bed_basic', 0)
    const bedRot = footprintOf('bed_basic', 1)
    expect(bedRot.w).toBeCloseTo(bed.d, 5)
    expect(bedRot.d).toBeCloseTo(bed.w, 5)
  })

  it('keeps tiny props placeable with a minimum size', () => {
    const fp = footprintOf('chair_plastic', 0)
    expect(fp.w).toBeGreaterThanOrEqual(0.45)
    expect(fp.d).toBeGreaterThanOrEqual(0.45)
  })
})

describe('insideRoom / blocksDoor', () => {
  it('accepts a piece fully inside', () => {
    expect(insideRoom(0, 0, { w: 1, d: 1 })).toBe(true)
    expect(insideRoom(ROOM_HALF_W - 0.5, 0, { w: 1, d: 1 })).toBe(true)
  })

  it('rejects pieces poking through a wall', () => {
    expect(insideRoom(ROOM_HALF_W, 0, { w: 1, d: 1 })).toBe(false)
    expect(insideRoom(0, -ROOM_HALF_D, { w: 1, d: 1 })).toBe(false)
  })

  it('blocks the door apron at the front wall (x ≈ 2.2)', () => {
    expect(blocksDoor(2.2, ROOM_HALF_D - 0.5, { w: 1, d: 0.5 })).toBe(true)
    expect(blocksDoor(2.2, ROOM_HALF_D - 1.5, { w: 1, d: 0.5 })).toBe(false)
    expect(blocksDoor(-2.0, ROOM_HALF_D - 0.5, { w: 1, d: 0.5 })).toBe(false)
  })
})

describe('placeFurniture', () => {
  it('places inside the room and rejects outside spots with a reason', () => {
    const r = placeFurniture([], { uid: 'a', id: 'chair_plastic' }, 0, 0)
    expect(r.ok).toBe(true)
    const bad = placeFurniture([], { uid: 'a', id: 'chair_plastic' }, 99, 0)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.reason).toMatch(/Outside/)
  })

  it('rejects a placement that blocks the door', () => {
    const bad = placeFurniture([], { uid: 'a', id: 'sofa_basic' }, 2.2, 2.5)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.reason).toMatch(/door/)
  })

  it('rejects overlapping a placed piece but allows rug overlap (flat)', () => {
    const l0 = placeFurniture([], { uid: 'bed', id: 'bed_basic' }, 2.5, -2.0)
    expect(l0.ok).toBe(true)
    const layout = l0.ok ? l0.layout : []
    const overlap = placeFurniture(layout, { uid: 'stool', id: 'wooden_stool' }, 2.5, -2.0)
    expect(overlap.ok).toBe(false)
    if (!overlap.ok) expect(overlap.reason).toMatch(/Overlaps/)
    const rug = placeFurniture(layout, { uid: 'rug', id: 'rug' }, 0, 0)
    expect(rug.ok).toBe(true)
  })

  it('snaps positions to the grid', () => {
    const r = placeFurniture([], { uid: 'a', id: 'chair_plastic' }, 0.83, -1.11)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.layout[0].x).toBeCloseTo(1.0, 5)
      expect(r.layout[0].z).toBeCloseTo(-1.0, 5)
    }
  })
})

describe('moveFurniture', () => {
  it('moves on the tile grid', () => {
    const l0 = placeFurniture([], { uid: 'a', id: 'chair_plastic' }, 0, 0)
    expect(l0.ok).toBe(true)
    const layout = l0.ok ? l0.layout : []
    const r = moveFurniture(layout, 'a', HOME_TILE, 0)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.layout[0].x).toBeCloseTo(0.5, 5)
  })

  it('rejects a move outside the room (unchanged layout)', () => {
    const l0 = placeFurniture([], { uid: 'a', id: 'chair_plastic' }, 3.0, 0)
    expect(l0.ok).toBe(true)
    const layout = l0.ok ? l0.layout : []
    const r = moveFurniture(layout, 'a', HOME_TILE, 0)
    expect(r.ok).toBe(false)
    expect(r.layout).toBe(layout)
  })

  it('rejects a move into another piece', () => {
    const a = placeFurniture([], { uid: 'a', id: 'wooden_stool' }, 0, 0)
    const b = placeFurniture(a.ok ? a.layout : [], { uid: 'b', id: 'wooden_stool' }, 1.0, 0)
    expect(b.ok).toBe(true)
    const layout = b.ok ? b.layout : []
    // move b onto a's tile (adjacent half-steps are allowed — touching, not overlapping)
    const r = moveFurniture(layout, 'b', -2 * HOME_TILE, 0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/Overlaps/)
  })
})

describe('rotateFurniture', () => {
  it('swaps the footprint and can push a piece into a wall', () => {
    // long bed along x near the east wall: rotation makes it poke out
    const l0 = placeFurniture([], { uid: 'bed', id: 'bed_basic' }, 2.0, -1.5, 0)
    expect(l0.ok).toBe(true)
    const layout = l0.ok ? l0.layout : []
    const r = rotateFurniture(layout, 'bed')
    // either it rotates cleanly or is rejected — but never corrupts the layout
    if (!r.ok) expect(r.layout).toBe(layout)
    if (r.ok) expect(r.layout[0].rot).toBe(1)
  })
})

describe('removeFurniture', () => {
  it('removes and frees the spot', () => {
    const a = placeFurniture([], { uid: 'a', id: 'wooden_stool' }, 0, 0)
    const layout = a.ok ? a.layout : []
    const r = removeFurniture(layout, 'a')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.layout).toHaveLength(0)
    const again = removeFurniture(layout, 'a')
    expect(again.ok).toBe(true)
  })
})

describe('findFreeSpot', () => {
  it('prefers the category anchor then scans the grid', () => {
    const spot = findFreeSpot([], 'bed_basic', 'bed#0')
    expect(spot).not.toBeNull()
    if (spot) {
      // bed preferred anchor is the back-right corner
      expect(spot.z).toBeLessThan(0)
      expect(spot.x).toBeGreaterThan(0)
    }
  })

  it('avoids already-placed pieces', () => {
    const first = findFreeSpot([], 'bed_basic', 'bed#0')
    expect(first).not.toBeNull()
    if (!first) return
    const placed = placeFurniture([], { uid: 'bed#0', id: 'bed_basic' }, first.x, first.z, first.rot)
    expect(placed.ok).toBe(true)
    const layout = placed.ok ? placed.layout : []
    const second = findFreeSpot(layout, 'bed_basic', 'bed#1')
    expect(second).not.toBeNull()
    if (!second) return
    expect(second.x).not.toBe(first.x)
  })
})
