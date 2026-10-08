/**
 * layout.ts — starter block layout data (pure, no three.js, no engine).
 *
 * 60 × 60 m block, 1 unit = 1 m, +Y up, origin at block centre.
 *   x: west (-30) → east (+30)
 *   z: north (-30) → south (+30)
 *
 * The tarred main road runs west–east (z 4.5 → 11.5). Open drains flank it.
 * The laterite side street runs north–south (x -24 → -18).
 * Shop fronts face the road from the north pavement (z 1.85 → 3.85).
 * Compound / chop bar / blue house sit on the south pavement (z 12.15 → 14.15).
 *
 * This module is the single source of truth for footprints, wall segments
 * and prop positions. colliders.ts derives the physics AABBs from it, the
 * geometry builder derives the meshes from it — they cannot drift apart.
 *
 * Owned by Agent 3 (World & Art).
 */
import type { PaletteKey } from '../palette';

export interface Box2D {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Half-extent helper: build a Box2D from a centre + size. */
export function box(cx: number, cz: number, w: number, d: number): Box2D {
  return { x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 };
}

export const WORLD_SIZE = 60;
export const WORLD_MIN = -WORLD_SIZE / 2; // -30
export const WORLD_MAX = WORLD_SIZE / 2; //  30

// ---------------------------------------------------------------- roads ----
export const MAIN_ROAD: Box2D = { x0: WORLD_MIN, z0: 4.5, x1: WORLD_MAX, z1: 11.5 };
export const NORTH_GUTTER: Box2D = { x0: WORLD_MIN, z0: 3.85, x1: WORLD_MAX, z1: 4.5 };
export const SOUTH_GUTTER: Box2D = { x0: WORLD_MIN, z0: 11.5, x1: WORLD_MAX, z1: 12.15 };
export const NORTH_PAVEMENT: Box2D = { x0: WORLD_MIN, z0: 1.85, x1: WORLD_MAX, z1: 3.85 };
export const SOUTH_PAVEMENT: Box2D = { x0: WORLD_MIN, z0: 12.15, x1: WORLD_MAX, z1: 14.15 };
export const LATERITE_STREET: Box2D = { x0: -24, z0: WORLD_MIN, x1: -18, z1: WORLD_MAX };

/** Concrete crossovers bridging the open drains. */
export const CROSSOVERS: { x: number; z: number }[] = [
  { x: -9.5, z: 4.175 },
  { x: -3.0, z: 4.175 },
  { x: 15.5, z: 4.175 },
  { x: 22.5, z: 4.175 },
  { x: 3.5, z: 11.825 },
  { x: -9.5, z: 11.825 },
];

/** Centre-line dashes (x start positions, dash length 1.6 m, at z = 8). */
export const ROAD_DASHES: number[] = [-28.4, -24.4, -20.4, -16.4, -12.4, -8.4, -4.4, -0.4, 3.6, 7.6, 11.6, 15.6, 19.6, 23.6, 27.6];

// ------------------------------------------------------ buildings (N side) --
export interface BuildingSpec {
  id: string;
  footprint: Box2D;
  /** Wall colour palette key. */
  wall: PaletteKey;
  /** Wall height in metres. */
  height: number;
}

export const PROVISIONS: BuildingSpec = {
  id: 'provisions',
  footprint: box(-6, -1.575, 8, 6.85), // x -10..-2, z -5..1.85
  wall: 'skyBlue',
  height: 3.4,
};

export const BLOCK_SHOPS: BuildingSpec[] = [
  { id: 'shopA', footprint: box(1.3, -0.775, 4.6, 5.25), wall: 'mint', height: 2.9 }, // x -1..3.6
  { id: 'shopB', footprint: box(5.9, -0.775, 4.6, 5.25), wall: 'cream', height: 2.9 }, // x 3.6..8.2
  { id: 'shopC', footprint: box(10.5, -0.775, 4.6, 5.25), wall: 'creamFaded', height: 2.9 }, // x 8.2..12.8
];

export const WAAKYE_KIOSK: BuildingSpec = {
  id: 'waakyeKiosk',
  footprint: box(15.5, -0.1, 3.2, 3.2), // x 13.9..17.1, z -1.7..1.5
  wall: 'kioskYellow',
  height: 2.5,
};

export const NORTH_YARD_HOUSE: BuildingSpec = {
  id: 'northYardHouse',
  footprint: box(22, -5.4, 8.8, 6), // x 17.6..26.4, z -8.4..-2.4
  wall: 'mint',
  height: 3.2,
};

export const WEST_HOUSE: BuildingSpec = {
  id: 'westHouse',
  footprint: box(-27.7, -3, 4.6, 6.8), // x -30..-25.4, z -6.4..0.4
  wall: 'skyBlue',
  height: 3.0,
};

// ------------------------------------------------------ buildings (S side) --
export const COMPOUND: { walls: Box2D[]; house: Box2D; leanTo: Box2D; gate: { cx: number; z: number; width: number } } = {
  // Wall ring x -16..-4, z 15..27, gate gap x -11..-8 on the north wall.
  walls: [
    { x0: -16, z0: 15, x1: -11, z1: 15.24 }, // north wall, west of gate
    { x0: -8, z0: 15, x1: -4, z1: 15.24 }, // north wall, east of gate
    { x0: -16, z0: 26.76, x1: -4, z1: 27 }, // south wall
    { x0: -16, z0: 15, x1: -15.76, z1: 27 }, // west wall
    { x0: -4.24, z0: 15, x1: -4, z1: 27 }, // east wall
  ],
  house: box(-10, 21.5, 8, 6), // x -14..-6, z 18.5..24.5
  leanTo: box(-5.2, 23.3, 1.8, 2.6),
  gate: { cx: -9.5, z: 15.12, width: 3 },
};

export const COMPOUND_HOUSE: BuildingSpec = {
  id: 'compoundHouse',
  footprint: COMPOUND.house,
  wall: 'cream',
  height: 3.3,
};

export const CHOP_BAR: BuildingSpec = {
  id: 'chopBar',
  footprint: box(3.5, 17.9, 9.4, 6.2), // x -1.2..8.2, z 14.8..21
  wall: 'chopBar',
  height: 3.2,
};

export const BLUE_HOUSE: BuildingSpec = {
  id: 'blueHouse',
  footprint: box(15, 17.9, 8.4, 6.2), // x 10.8..19.2, z 14.8..21
  wall: 'skyBlue',
  height: 3.1,
};

// ------------------------------------------------------------- trotro stop --
export const TROTRO_STOP = {
  roof: box(22.5, 13.25, 3.8, 1.6), // x 20.6..24.4
  posts: [
    { x: 21.0, z: 13.9 },
    { x: 24.0, z: 13.9 },
  ],
  bench: box(22.5, 13.55, 3.2, 0.5),
  sign: { x: 25.2, z: 12.9 },
};

// --------------------------------------------------------------- props -----
export const UTILITY_POLES: { x: number; z: number }[] = [
  { x: -28, z: 13.55 },
  { x: -12, z: 13.55 },
  { x: 4, z: 13.55 },
  { x: 20, z: 13.55 },
];

/** Wire spans between consecutive poles (indices into UTILITY_POLES) + edge stubs. */
export const WIRE_SPANS: { from: { x: number; z: number }; to: { x: number; z: number } }[] = [
  { from: { x: -30, z: 13.55 }, to: { x: -28, z: 13.55 } },
  { from: { x: -28, z: 13.55 }, to: { x: -12, z: 13.55 } },
  { from: { x: -12, z: 13.55 }, to: { x: 4, z: 13.55 } },
  { from: { x: 4, z: 13.55 }, to: { x: 20, z: 13.55 } },
  { from: { x: 20, z: 13.55 }, to: { x: 30, z: 13.55 } },
];

export interface TreeSpot {
  x: number;
  z: number;
  /** Uniform scale variation. */
  s: number;
}

export const NEEM_TREES: TreeSpot[] = [
  { x: -16.5, z: 3.0, s: 1.15 },
  { x: 12.5, z: 3.0, s: 0.95 },
  { x: 26.5, z: 2.9, s: 1.2 },
  { x: -2.0, z: 13.2, s: 1.0 },
  { x: -26, z: 13.1, s: 1.1 },
  { x: -13, z: 26, s: 1.25 }, // inside compound yard
];

export const PALM_TREES: TreeSpot[] = [
  { x: 9.5, z: 24, s: 1.1 },
  { x: 15, z: 22.8, s: 0.95 },
  { x: 27, z: 16, s: 1.2 },
  { x: 19, z: -11, s: 1.0 },
  { x: -12.5, z: -9, s: 1.15 },
];

export interface ChairSpot {
  x: number;
  z: number;
  /** Facing (radians, 0 = towards +z). */
  ry: number;
  color: PaletteKey;
}

export const PLASTIC_CHAIRS: ChairSpot[] = [
  { x: 15.0, z: 2.9, ry: Math.PI - 0.15, color: 'plasticBlue' }, // at waakye kiosk
  { x: 16.6, z: 2.7, ry: Math.PI + 0.25, color: 'plasticRed' },
  { x: -4.5, z: 2.8, ry: Math.PI, color: 'plasticGreen' }, // provisions front
  { x: 2.6, z: 22.6, ry: 0.2, color: 'plasticRed' }, // chop bar
  { x: 4.3, z: 22.9, ry: -0.15, color: 'plasticBlue' },
  { x: 6.2, z: 22.6, ry: 0.3, color: 'plasticGreen' },
  { x: 7.4, z: 22.4, ry: 0.1, color: 'plasticRed' },
  { x: -12.4, z: 13.1, ry: 0.4, color: 'plasticBlue' }, // compound gate
  { x: -6.9, z: 13.3, ry: -0.3, color: 'plasticGreen' },
  { x: 24.9, z: 15.1, ry: Math.PI * 0.75, color: 'plasticRed' }, // near trotro stop
];

export interface UmbrellaSpot {
  x: number;
  z: number;
  color: PaletteKey;
}

export const UMBRELLAS: UmbrellaSpot[] = [
  { x: 16.9, z: 3.1, color: 'umbrellaGreen' }, // waakye corner
  { x: 3.5, z: 22.5, color: 'umbrellaRed' }, // chop bar tables
  { x: 6.5, z: 22.7, color: 'umbrellaGreen' },
];

export const POLYTANKS: { x: number; z: number; s: number }[] = [
  { x: -5.3, z: 20.6, s: 1.0 }, // inside compound, by east wall
];

/** Dirt-yard wear patches (x, z, w, d) — soften the base plane. */
export const DIRT_PATCHES: Box2D[] = [
  box(-9.5, 13.3, 7, 2.4), // compound gate front
  box(15.5, 2.2, 6, 2.2), // waakye kiosk front
  box(4, 22.5, 9, 4), // chop bar seating
  box(-21, 0.8, 4.5, 2.2), // laterite street beside the main road
];

// ------------------------------------------------------ kenney road tiles --
/**
 * W-003 pipeline proof: optimised Kenney City Kit (Roads) tiles (CC0,
 * public/models/roads/, meshopt + KTX2 via `npm run assets`), rendered
 * instanced ON TOP of the existing procedural road — the procedural road
 * stays and is not replaced by them.
 *
 * Kenney tiles ship as 1×1 units representing 4 m street sections; the
 * pipeline normalises each GLB to a 4 × 4 m footprint. A 4 m tile fits
 * inside the 7 m main road (z 4.5..11.5, centre z 8). The crossroad marks
 * the laterite side-street junction (x -24..-18), straights continue east
 * of it edge-to-edge on the 4 m grid.
 */
export type KenneyRoadTile = 'straight' | 'crossroad';

export interface KenneyTileSpot {
  tile: KenneyRoadTile;
  x: number;
  z: number;
  /** Y rotation (radians). */
  ry: number;
}

export const KENNEY_TILE_METRES = 4;
export const KENNEY_TILE_Y = 0.012; // lift above the procedural asphalt (z-fight guard)

export const KENNEY_ROAD_TILES: KenneyTileSpot[] = [
  { tile: 'crossroad', x: -21, z: 8, ry: 0 },
  { tile: 'straight', x: -25, z: 8, ry: 0 },
  { tile: 'straight', x: -17, z: 8, ry: 0 },
  { tile: 'straight', x: -13, z: 8, ry: 0 },
  { tile: 'straight', x: -9, z: 8, ry: 0 },
  { tile: 'straight', x: -5, z: 8, ry: 0 },
  { tile: 'straight', x: -1, z: 8, ry: 0 },
];

// ------------------------------------------------------------- colliders ---
/** Building + wall footprints that block movement (AABBs, metres). */
export const SOLID_FOOTPRINTS: Box2D[] = [
  PROVISIONS.footprint,
  ...BLOCK_SHOPS.map((s) => s.footprint),
  WAAKYE_KIOSK.footprint,
  NORTH_YARD_HOUSE.footprint,
  WEST_HOUSE.footprint,
  COMPOUND_HOUSE.footprint,
  ...COMPOUND.walls,
  CHOP_BAR.footprint,
  BLUE_HOUSE.footprint,
  TROTRO_STOP.bench,
];
