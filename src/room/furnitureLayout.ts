/**
 * furnitureLayout.ts — where bought furniture stands in Gyan's room.
 *
 * Pure placement rules: no three.js, no React, no store. Given the owned
 * furniture ids it returns a deterministic list of placements that never
 * overlap the room's fixed dressing (or each other) and always sit inside
 * the 6.6 × 6.0 m floor.
 *
 * Replacement model — the room already ships with starter pieces (bed, sofa,
 * wardrobe, desk, coffee table, rug, fan, shelf). Buying an item of a
 * replaceable category SWAPS the starter piece out at the same anchor
 * instead of spawning a duplicate next to it: buy "Sofa" → the starter sofa
 * is gone and yours stands there. Everything else lands on the first free
 * curated anchor, then on a fine floor-scan fallback (so every owned id is
 * always placeable).
 */
import { furnitureSizeMeters, findFurnitureById } from '../data/furniture'

/** Room interior — mirrors ROOM in GyanRoom.tsx (kept local: this module
 *  must stay pure Node for unit tests, GyanRoom pulls three.js + React). */
export const ROOM_W = 6.6
export const ROOM_D = 6.0

export type RoomMode = 'world' | 'dollhouse'

export interface Rect {
  x: number
  z: number
  w: number
  d: number
}

export interface Placement {
  id: string
  category: string
  x: number
  z: number
  rotY: number
  /** Wall-mounted pieces render at their anchor height on a wall. */
  wall?: 'back' | 'right'
  /** True when this item took over a starter piece's anchor. */
  replacesFixed: boolean
}

/** Categories that take over a fixed starter piece's spot. */
export const REPLACE_CATEGORIES = [
  'bed',
  'sofa',
  'wardrobe',
  'desk',
  'coffee_table',
  'rug',
  'fan',
  'bookshelf',
] as const

/** id → category. Covers every home catalogue id (see layout unit test). */
const CATEGORY: Record<string, string> = {
  // legacy basics (procedural)
  chair_plastic: 'chair',
  chair_plastic_legacy: 'chair',
  wooden_stool: 'stool',
  table_small: 'table',
  table_dining: 'table',
  table_veranda_legacy: 'table',
  bed_basic: 'bed',
  bed_queen_legacy: 'bed',
  wardrobe_basic: 'wardrobe',
  sofa_basic: 'sofa',
  tv_basic: 'tv',
  fridge_basic: 'fridge',
  fridge_double_legacy: 'fridge',
  fan_standing: 'fan',
  rug: 'rug',
  flower_pots: 'plant',
  kente_cloth: 'kente',
  sound_box: 'speaker',
  cooker_gas: 'cooker',
  shower_basic: 'bucket_bath',
  toilet_basic: 'toilet',
  generator: 'generator',
  // low-poly GLB range
  sofa_lp: 'sofa',
  office_chair_lp: 'chair',
  office_desk_lp: 'desk',
  coffee_table_lp: 'coffee_table',
  bookshelf_lp: 'bookshelf',
  floor_lamp_lp: 'floor_lamp',
  potted_plant_lp: 'plant',
  filing_cabinet_lp: 'cabinet',
  water_cooler_lp: 'water_cooler',
  lp_office_chair_00: 'chair',
  lp_office_desk_00: 'desk',
  lp_filing_cabinet_00: 'cabinet',
  lp_sofa_00: 'sofa',
  lp_armchair_00: 'armchair',
  lp_coffee_table_00: 'coffee_table',
  lp_tv_stand_00: 'tv',
  lp_bookshelf_00: 'bookshelf',
  lp_side_table_00: 'side_table',
  lp_floor_lamp_00: 'floor_lamp',
  lp_rug_00: 'rug',
  lp_cushion_pouf_00: 'pouf',
  lp_display_cabinet_00: 'cabinet',
  lp_bed_00: 'bed',
  lp_wardrobe_00: 'wardrobe',
  lp_dresser_00: 'dresser',
  lp_nightstand_00: 'nightstand',
  lp_mirror_stand_00: 'mirror',
  lp_mattress_roll_00: 'mattress_roll',
  lp_baby_cot_00: 'cot',
  lp_clothes_rack_00: 'clothes_rack',
  lp_trunk_chest_00: 'trunk',
  lp_mosquito_net_frame_00: 'net',
  lp_toilet_00: 'toilet',
  lp_sink_basin_00: 'sink',
  lp_shower_stall_00: 'shower_stall',
  lp_bathtub_00: 'bathtub',
  lp_bucket_bath_00: 'bucket_bath',
  lp_towel_rail_00: 'towel_rail',
  lp_bath_cabinet_00: 'bath_cabinet',
  lp_mop_bucket_00: 'mop_bucket',
  lp_laundry_basket_00: 'laundry_basket',
  lp_water_heater_00: 'water_heater',
}

/** Flat / soft pieces that may sit on the mat or rug. */
const SOFT_CATEGORIES = new Set([
  'rug', 'chair', 'stool', 'pouf', 'speaker', 'mop_bucket', 'laundry_basket', 'plant', 'floor_lamp',
])

export function categoryOf(id: string): string {
  return CATEGORY[id] ?? 'table'
}

export function replacesFixed(category: string): boolean {
  return (REPLACE_CATEGORIES as readonly string[]).includes(category)
}

/** Categories allowed to overlap fixed dressing (net frames stand over beds). */
const OVERLAP_OK = new Set(['net'])

export function isSoftCategory(category: string): boolean {
  return SOFT_CATEGORIES.has(category)
}

// ── fixed dressing the placer must respect (metres, room-local) ─────────────
// Room interior: x ∈ [-3.3, 3.3], z ∈ [-3.0, 3.0]; front (street) = +z.
// `big` rects (bed/sofa/wardrobe/desk/coffee/fan) block REPLACEMENTS too;
// `dress` rects (buckets, plants, chairs…) are small props a new big piece
// may sit beside — same as the starter pieces already do.
interface FixedRect extends Rect {
  tag: string
  big: boolean
}

const FIXED_DOLLHOUSE: FixedRect[] = [
  { x: -1.55, z: -2.45, w: 2.2, d: 0.95, tag: 'sofa', big: true },
  { x: -1.55, z: -1.25, w: 1.05, d: 1.05, tag: 'coffee_table', big: true },
  { x: 0.15, z: -2.45, w: 0.55, d: 0.55, tag: 'fan', big: true },
  { x: 1.75, z: -1.85, w: 1.75, d: 2.15, tag: 'bed', big: true },
  { x: 0.55, z: -2.6, w: 0.5, d: 0.45, tag: 'dress', big: false },
  { x: 2.95, z: -2.6, w: 0.5, d: 0.45, tag: 'dress', big: false },
  { x: 2.94, z: 1.25, w: 0.7, d: 1.55, tag: 'wardrobe', big: true },
  { x: -2.9, z: 1.75, w: 0.7, d: 1.35, tag: 'desk', big: true },
  { x: -2.25, z: 1.8, w: 0.55, d: 0.55, tag: 'dress', big: false },
  { x: -2.95, z: -2.65, w: 0.5, d: 0.5, tag: 'dress', big: false },
  { x: 2.9, z: -0.2, w: 0.5, d: 0.5, tag: 'dress', big: false },
  { x: -0.7, z: 2.6, w: 0.5, d: 0.5, tag: 'dress', big: false },
]

const FIXED_WORLD: FixedRect[] = [
  { x: 1.6, z: -2.0, w: 1.9, d: 1.1, tag: 'bed', big: true },
  { x: -1.8, z: -1.4, w: 0.95, d: 0.6, tag: 'dress', big: false },
  { x: -1.9, z: 1.2, w: 0.75, d: 0.55, tag: 'dress', big: false },
  { x: 0.15, z: -0.2, w: 0.5, d: 0.5, tag: 'dress', big: false },
  { x: 2.2, z: 1.6, w: 0.6, d: 0.45, tag: 'dress', big: false },
  { x: 2.2, z: -1.8, w: 0.85, d: 0.75, tag: 'dress', big: false },
  { x: 1.5, z: 1.8, w: 0.35, d: 0.25, tag: 'dress', big: false },
  { x: 0.15, z: -2.6, w: 0.55, d: 0.55, tag: 'fan', big: true },
]

/** Starter mat / dollhouse rug — flat, so soft items may stand on it. */
const SOFT_RECTS: Rect[] = [
  { x: 0.2, z: 0.3, w: 2.4, d: 1.8 }, // world mat
  { x: -1.55, z: -1.35, w: 2.6, d: 2.0 }, // dollhouse lounge rug
]

/** Where a replacement item takes over (per mode). */
const REPLACE_ANCHOR: Record<string, Record<RoomMode, { x: number; z: number; rotY: number }>> = {
  bed: {
    dollhouse: { x: 1.75, z: -1.85, rotY: Math.PI },
    world: { x: 1.6, z: -1.88, rotY: Math.PI },
  },
  sofa: {
    dollhouse: { x: -1.55, z: -2.45, rotY: 0 },
    world: { x: -1.55, z: -2.46, rotY: 0 },
  },
  wardrobe: {
    dollhouse: { x: 2.94, z: 1.25, rotY: -Math.PI / 2 },
    world: { x: 2.94, z: 0.6, rotY: -Math.PI / 2 },
  },
  desk: {
    dollhouse: { x: -2.85, z: 1.75, rotY: Math.PI / 2 },
    world: { x: -2.7, z: -0.1, rotY: Math.PI / 2 },
  },
  coffee_table: {
    dollhouse: { x: -1.55, z: -1.25, rotY: 0 },
    world: { x: 2.6, z: -0.9, rotY: 0 },
  },
  rug: {
    dollhouse: { x: -1.55, z: -1.35, rotY: 0 },
    world: { x: 0.2, z: 0.3, rotY: 0 },
  },
  fan: {
    dollhouse: { x: 0.15, z: -2.45, rotY: 0 },
    world: { x: 0.15, z: -2.6, rotY: 0 },
  },
  bookshelf: {
    dollhouse: { x: 0.15, z: -2.62, rotY: 0 },
    world: { x: 2.62, z: -0.55, rotY: -Math.PI / 2 },
  },
}

/** Curated first-choice anchors (tried in order, per mode). */
const CURATED: Record<string, Record<RoomMode, { x: number; z: number; rotY: number; wall?: 'back' | 'right' }>> = {
  tv: {
    dollhouse: { x: -1.9, z: 2.55, rotY: Math.PI },
    world: { x: -1.9, z: 2.55, rotY: Math.PI },
  },
  fridge: {
    dollhouse: { x: 2.75, z: 2.5, rotY: -Math.PI / 2 },
    world: { x: 2.75, z: 2.5, rotY: -Math.PI / 2 },
  },
  kente: {
    dollhouse: { x: 2.3, z: 0, rotY: 0, wall: 'back' },
    world: { x: 2.3, z: 0, rotY: 0, wall: 'back' },
  },
  towel_rail: {
    dollhouse: { x: 0, z: -1.0, rotY: -Math.PI / 2, wall: 'right' },
    world: { x: 0, z: -1.0, rotY: -Math.PI / 2, wall: 'right' },
  },
  cooker: {
    dollhouse: { x: 0.9, z: 2.6, rotY: 0 },
    world: { x: -1.8, z: -1.9, rotY: 0 },
  },
  bucket_bath: {
    dollhouse: { x: 1.75, z: 2.55, rotY: 0 },
    world: { x: 1.75, z: 2.55, rotY: 0 },
  },
  toilet: {
    dollhouse: { x: 1.75, z: 2.55, rotY: Math.PI },
    world: { x: 1.75, z: 2.55, rotY: Math.PI },
  },
  generator: {
    dollhouse: { x: -2.95, z: 0.4, rotY: Math.PI / 2 },
    world: { x: -2.8, z: -2.55, rotY: Math.PI / 2 },
  },
  floor_lamp: {
    dollhouse: { x: -2.85, z: -0.75, rotY: 0 },
    world: { x: -2.85, z: -0.75, rotY: 0 },
  },
  table: {
    dollhouse: { x: 0.5, z: 1.55, rotY: 0 },
    world: { x: 0.5, z: 1.55, rotY: 0 },
  },
  water_cooler: {
    dollhouse: { x: 2.45, z: 2.7, rotY: Math.PI },
    world: { x: 2.45, z: 2.7, rotY: Math.PI },
  },
  net: {
    // a mosquito net frame stands OVER the bed — same anchor, bed stays
    dollhouse: { x: 1.75, z: -1.72, rotY: 0 },
    world: { x: 1.6, z: -1.75, rotY: 0 },
  },
}

/** Generic fallbacks (tried after curated, before the fine scan). */
const FALLBACKS: { x: number; z: number; rotY: number }[] = [
  { x: 0.55, z: 2.5, rotY: Math.PI },
  { x: -1.15, z: 2.55, rotY: Math.PI },
  { x: 1.85, z: 2.55, rotY: Math.PI },
  { x: -2.45, z: 2.4, rotY: Math.PI },
  { x: -2.45, z: 0.55, rotY: Math.PI / 2 },
  { x: 2.55, z: -0.55, rotY: -Math.PI / 2 },
  { x: 0.15, z: -1.1, rotY: 0 },
  { x: -2.7, z: -1.35, rotY: Math.PI / 2 },
  { x: 2.8, z: -1.55, rotY: -Math.PI / 2 },
  { x: 1.1, z: 0.9, rotY: 0 },
  { x: -0.85, z: 0.4, rotY: Math.PI / 2 },
  { x: 1.3, z: 1.5, rotY: 0 },
  { x: -1.2, z: -1.9, rotY: 0 },
  { x: 2.85, z: 1.85, rotY: -Math.PI / 2 },
]

function itemSize(id: string): { w: number; d: number } {
  const [w, , d] = furnitureSizeMeters(id)
  return { w: Math.max(0.3, w), d: Math.max(0.3, d) }
}

/** Footprint in ROOM space — a quarter-turned item swaps w and d. */
export function roomFootprint(id: string, rotY: number): { w: number; d: number } {
  const { w, d } = itemSize(id)
  const quarter = Math.abs(Math.sin(rotY)) > 0.5
  return quarter ? { w: d, d: w } : { w, d }
}

function rectsOverlap(a: Rect, b: Rect, margin = 0.06): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margin && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + margin
  )
}

function inRoom(r: Rect): boolean {
  return (
    r.x - r.w / 2 >= -ROOM_W / 2 + 0.05 &&
    r.x + r.w / 2 <= ROOM_W / 2 - 0.05 &&
    r.z - r.d / 2 >= -ROOM_D / 2 + 0.05 &&
    r.z + r.d / 2 <= ROOM_D / 2 - 0.05
  )
}

function hitsFixed(r: Rect, mode: RoomMode, soft: boolean): boolean {
  const fixed = mode === 'dollhouse' ? FIXED_DOLLHOUSE : FIXED_WORLD
  for (const f of fixed) if (rectsOverlap(r, f)) return true
  if (soft) return false
  for (const s of SOFT_RECTS) if (rectsOverlap(r, s)) return true
  return false
}

/**
 * Big fixed pieces a REPLACEMENT must clear (own category excluded — the
 * starter piece it replaces is hidden). Small dressing never blocks a big
 * replacement: the starter bed already sits beside the wash buckets.
 */
function hitsCore(r: Rect, mode: RoomMode, ownCategory: string): boolean {
  const fixed = mode === 'dollhouse' ? FIXED_DOLLHOUSE : FIXED_WORLD
  for (const f of fixed) {
    if (!f.big || f.tag === ownCategory) continue
    if (rectsOverlap(r, f)) return true
  }
  return false
}

/** Last resort: fine first-fit scan so every owned id gets a spot. */
function scanFor(r: Rect, placed: Rect[], mode: RoomMode, soft: boolean): { x: number; z: number } | null {
  const step = 0.25
  for (let z = -ROOM_D / 2 + r.d / 2 + 0.1; z <= ROOM_D / 2 - r.d / 2 - 0.1; z += step) {
    for (let x = -ROOM_W / 2 + r.w / 2 + 0.1; x <= ROOM_W / 2 - r.w / 2 - 0.1; x += step) {
      const c = { ...r, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 }
      if (!inRoom(c)) continue
      if (hitsFixed(c, mode, soft)) continue
      if (placed.some((p) => rectsOverlap(c, p))) continue
      return { x: c.x, z: c.z }
    }
  }
  return null
}

/**
 * Place every owned id. Deterministic: same input → same output.
 * Replaceable categories swap the starter piece at its anchor; the rest
 * take the first free curated anchor, then fallbacks, then the fine scan.
 */
export function layoutOwnedFurniture(ownedIds: readonly string[], mode: RoomMode): Placement[] {
  const out: Placement[] = []
  const placed: Rect[] = []
  const claimed = new Set<string>() // replaceable categories already taken over

  // Pass 1 places replaceable categories first: a bought bed ALWAYS takes
  // over the starter bed's anchor, even in a dense room — generic pieces
  // then fit around them. Pass 2 handles everything else in owned order.
  const replaceFirst = ownedIds.filter(
    (id) => findFurnitureById(id) && CATEGORY[id] !== undefined && replacesFixed(CATEGORY[id]),
  )
  const rest = ownedIds.filter((id) => !replaceFirst.includes(id))

  for (const id of [...replaceFirst, ...rest]) {
    if (!findFurnitureById(id) || CATEGORY[id] === undefined) continue
    const cat = CATEGORY[id]
    const soft = SOFT_CATEGORIES.has(cat)

    let spot: { x: number; z: number; rotY: number; replaces: boolean; wall?: 'back' | 'right' } | null = null

    const curated = CURATED[cat]?.[mode]
    if (curated && !curated.wall) {
      const fp = roomFootprint(id, curated.rotY)
      const c = { x: curated.x, z: curated.z, ...fp }
      const clear = OVERLAP_OK.has(cat) || !hitsFixed(c, mode, soft)
      if (inRoom(c) && clear && !placed.some((p) => rectsOverlap(c, p))) {
        spot = { x: curated.x, z: curated.z, rotY: curated.rotY, replaces: false }
      }
    }

    if (!spot && replacesFixed(cat) && !claimed.has(cat)) {
      const a = REPLACE_ANCHOR[cat][mode]
      const fp = roomFootprint(id, a.rotY)
      const c = { x: a.x, z: a.z, ...fp }
      // a replacement must fit inside the room and clear the other big
      // pieces; the starter it replaces is hidden and small dressing may sit
      // beside it (exactly how the starter room is dressed today)
      const blocked = !inRoom(c) || hitsCore(c, mode, cat) || placed.some((p) => rectsOverlap(c, p))
      if (!blocked) {
        spot = { x: a.x, z: a.z, rotY: a.rotY, replaces: true }
        claimed.add(cat)
      }
    }

    if (!spot && curated?.wall) {
      spot = { x: curated.x, z: curated.z, rotY: curated.rotY, replaces: false, wall: curated.wall }
    }

    if (!spot) {
      for (const f of FALLBACKS) {
        const fp = roomFootprint(id, f.rotY)
        const c = { x: f.x, z: f.z, ...fp }
        if (!inRoom(c)) continue
        if (hitsFixed(c, mode, soft)) continue
        if (placed.some((p) => rectsOverlap(c, p))) continue
        spot = { x: f.x, z: f.z, rotY: f.rotY, replaces: false }
        break
      }
    }

    if (!spot) {
      const { w, d } = itemSize(id)
      const scan = scanFor({ x: 0, z: 0, w, d }, placed, mode, soft)
      if (scan) spot = { x: scan.x, z: scan.z, rotY: 0, replaces: false }
    }

    if (!spot) continue // impossible for the current catalogue (room is big)

    out.push({ id, category: cat, x: spot.x, z: spot.z, rotY: spot.rotY, wall: spot.wall, replacesFixed: spot.replaces })
    if (!spot.wall) {
      const fp = roomFootprint(id, spot.rotY)
      placed.push({ x: spot.x, z: spot.z, ...fp })
    }
  }

  return out
}

/** Fixed starter pieces a given owned list should swap out (per mode). */
export function replacedFixedCategories(ownedIds: readonly string[]): Set<string> {
  const cats = new Set<string>()
  for (const id of ownedIds) {
    const cat = CATEGORY[id]
    if (cat && replacesFixed(cat)) cats.add(cat)
  }
  return cats
}
