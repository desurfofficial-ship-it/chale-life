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
  footprint: box(-6, -1.575, 8, 6.85),
  wall: 'skyBlue',
  height: 3.4,
};

export const BLOCK_SHOPS: BuildingSpec[] = [
  { id: 'shopA', footprint: box(1.3, -0.775, 4.6, 5.25), wall: 'mint', height: 2.9 },
  { id: 'shopB', footprint: box(5.9, -0.775, 4.6, 5.25), wall: 'cream', height: 2.9 },
  { id: 'shopC', footprint: box(10.5, -0.775, 4.6, 5.25), wall: 'creamFaded', height: 2.9 },
];

export const WAAKYE_KIOSK: BuildingSpec = {
  id: 'waakyeKiosk',
  footprint: box(15.5, -0.1, 3.2, 3.2),
  wall: 'kioskYellow',
  height: 2.5,
};

export const NORTH_YARD_HOUSE: BuildingSpec = {
  id: 'northYardHouse',
  footprint: box(22, -5.4, 8.8, 6),
  wall: 'mint',
  height: 3.2,
};

export const WEST_HOUSE: BuildingSpec = {
  id: 'westHouse',
  footprint: box(-27.7, -3, 4.6, 6.8),
  wall: 'skyBlue',
  height: 3.0,
};

// ------------------------------------------------------ buildings (S side) --
export const COMPOUND: { walls: Box2D[]; house: Box2D; leanTo: Box2D; gate: { cx: number; z: number; width: number } } = {
  walls: [
    { x0: -16, z0: 15, x1: -11, z1: 15.24 },
    { x0: -8, z0: 15, x1: -4, z1: 15.24 },
    { x0: -16, z0: 26.76, x1: -4, z1: 27 },
    { x0: -16, z0: 15, x1: -15.76, z1: 27 },
    { x0: -4.24, z0: 15, x1: -4, z1: 27 },
  ],
  house: box(-10, 21.5, 8, 6),
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
  footprint: box(3.5, 17.9, 9.4, 6.2),
  wall: 'chopBar',
  height: 3.2,
};

export const BLUE_HOUSE: BuildingSpec = {
  id: 'blueHouse',
  footprint: box(15, 17.9, 8.4, 6.2),
  wall: 'skyBlue',
  height: 3.1,
};

// ------------------------------------------------------------- trotro stop --
export const TROTRO_STOP = {
  roof: box(22.5, 13.25, 3.8, 1.6),
  posts: [
    { x: 21.0, z: 13.9 },
    { x: 24.0, z: 13.9 },
  ],
  bench: box(22.5, 13.55, 3.2, 0.5),
  sign: { x: 25.2, z: 12.9 },
};

// --------------------------------------------------------------- props -----
export const UTILITY_POLES: { x: number; z: number }[] = [
  // Road-edge of the south pavement — walk centre z≈13.4 stays clear for the
  // 0.45 m player capsule. Pole east of the trotro stop (x=26) keeps ≥2 m
  // from the trotro footprint and off the x≈15 path to the waakye joint.
  { x: -28, z: 12.4 },
  { x: -12, z: 12.4 },
  { x: 4, z: 12.4 },
  { x: 26, z: 12.4 },
];

export const WIRE_SPANS: { from: { x: number; z: number }; to: { x: number; z: number } }[] = [
  { from: { x: -30, z: 12.4 }, to: { x: -28, z: 12.4 } },
  { from: { x: -28, z: 12.4 }, to: { x: -12, z: 12.4 } },
  { from: { x: -12, z: 12.4 }, to: { x: 4, z: 12.4 } },
  { from: { x: 4, z: 12.4 }, to: { x: 26, z: 12.4 } },
  { from: { x: 26, z: 12.4 }, to: { x: 30, z: 12.4 } },
];

export interface TreeSpot {
  x: number;
  z: number;
  s: number;
}

export const NEEM_TREES: TreeSpot[] = [
  { x: -16.5, z: 3.0, s: 1.15 },
  { x: 12.5, z: 3.0, s: 0.95 },
  { x: 26.5, z: 2.9, s: 1.2 },
  { x: -2.0, z: 13.2, s: 1.0 },
  { x: -26, z: 13.1, s: 1.1 },
  { x: -13, z: 26, s: 1.25 },
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
  ry: number;
  color: PaletteKey;
}

export const PLASTIC_CHAIRS: ChairSpot[] = [
  { x: 15.0, z: 2.9, ry: Math.PI - 0.15, color: 'plasticBlue' },
  { x: 16.6, z: 2.7, ry: Math.PI + 0.25, color: 'plasticRed' },
  { x: -4.5, z: 2.8, ry: Math.PI, color: 'plasticGreen' },
  { x: 2.6, z: 22.6, ry: 0.2, color: 'plasticRed' },
  { x: 4.3, z: 22.9, ry: -0.15, color: 'plasticBlue' },
  { x: 6.2, z: 22.6, ry: 0.3, color: 'plasticGreen' },
  { x: 7.4, z: 22.4, ry: 0.1, color: 'plasticRed' },
  { x: -12.4, z: 13.1, ry: 0.4, color: 'plasticBlue' },
  { x: -6.9, z: 13.3, ry: -0.3, color: 'plasticGreen' },
  { x: 24.9, z: 15.1, ry: Math.PI * 0.75, color: 'plasticRed' },
];

export interface UmbrellaSpot {
  x: number;
  z: number;
  color: PaletteKey;
}

export const UMBRELLAS: UmbrellaSpot[] = [
  // G-008e: moved from (16.9, 3.1) — the canopy sat right on the south
  // camera line to the job spot (18, 0) and hid the player + the ring
  // from the top-down view. West of the kiosk front it still shades the
  // counter queue's west end but leaves every gameplay camera line free.
  { x: 14.3, z: 2.3, color: 'umbrellaGreen' },
  { x: 3.5, z: 22.5, color: 'umbrellaRed' },
  { x: 6.5, z: 22.7, color: 'umbrellaGreen' },
];

export const POLYTANKS: { x: number; z: number; s: number }[] = [
  { x: -5.3, z: 20.6, s: 1.0 },
];

export const DIRT_PATCHES: Box2D[] = [
  box(-9.5, 13.3, 7, 2.4),
  box(15.5, 2.2, 6, 2.2),
  box(4, 22.5, 9, 4),
  box(-21, 0.8, 4.5, 2.2),
  // G-008d: worn ground at Daavi's job spot (east of the kiosk) — the
  // visible part starts at the kiosk's east wall (x 17.1); the overlap
  // under the kiosk floor deck is hidden.
  box(17.9, 0.0, 2.0, 1.6),
];

// ------------------------------------------------------ kenney road tiles --
/**
 * W-003 pipeline proof. B-002: NOT rendered on the 7 m main road — a 4 m
 * strip inside a 7 m road looks wrong. Pipeline, GLBs and ledger rows stay.
 * Re-add placements only when a whole street is rebuilt at kit width (W-007).
 */
export type KenneyRoadTile = 'straight' | 'crossroad';

export interface KenneyTileSpot {
  tile: KenneyRoadTile;
  x: number;
  z: number;
  ry: number;
}

export const KENNEY_TILE_METRES = 4;
export const KENNEY_TILE_Y = 0.012;

/** Empty until W-007 rebuilds a street at kit width. */
export const KENNEY_ROAD_TILES: KenneyTileSpot[] = [];

// --------------------------------------------------------------- vehicles --
/**
 * W-004 vehicle pack. Sizes (W×H×L m) from the producer brief / loaded GLB:
 *   trotro 2.48×2.39×5.00, okada 1.92×2.12×2.54 (GLB AABB), van 2.46×1.80×4.30.
 *
 * Native forward axis for ALL three models is ±Z (length along Z at ry=0).
 * Left-hand traffic: north curb = eastbound, south curb = westbound.
 * Van parks parallel to the north curb facing east → ry = −π/2.
 * Trotro sits in the south lane, clear of the stop shelter / bench / pole
 * by ≥ 0.3 m → z = 9.0 (north edge of the south lane).
 */
export type VehicleModel = 'trotro' | 'okada' | 'van';

export interface VehicleSpot {
  model: VehicleModel;
  x: number;
  z: number;
  ry: number;
}

/** Producer-brief / GLB dimensions: width (X at ry=0), height, length (Z at ry=0). */
export const VEHICLE_DIMS: Record<VehicleModel, { w: number; h: number; l: number }> = {
  // w/l from loaded GLB AABB (meshopt-decoded); okada brief was undersized.
  trotro: { w: 2.48, h: 2.39, l: 5.0 },
  okada: { w: 1.92, h: 2.12, l: 2.54 },
  van: { w: 2.46, h: 1.8, l: 4.3 },
};

/** Axis-aligned footprint for a parked vehicle after its yaw. */
export function vehicleFootprint(spot: VehicleSpot): Box2D {
  const d = VEHICLE_DIMS[spot.model];
  const alongX = Math.abs(Math.sin(spot.ry)) > 0.5;
  return alongX ? box(spot.x, spot.z, d.l, d.w) : box(spot.x, spot.z, d.w, d.l);
}

export const VEHICLE_SPOTS: VehicleSpot[] = [
  // Trotro on the north edge of the south lane (z≈9) so the 45° camera does
  // not draw the shelter roof / pole over it (B-003b).
  { model: 'trotro', x: 22.5, z: 9.0, ry: Math.PI / 2 },
  // Okada: ry=0 (W-004) — nose to the road. G-008d moved it from the north
  // pavement (18.3, 2.85 — it walled off the counter→job-spot walk) to EAST
  // of Daavi's bench (footprint x 22.64–24.56, z 1.58–4.12). The road
  // shoulder was rejected: the e2e bench legs walk the z≈5.5 line both ways
  // and return north at x ≤ 17.0, which any okada in the road would block.
  { model: 'okada', x: 23.6, z: 2.85, ry: 0 },
  { model: 'van', x: 3.5, z: 5.9, ry: -Math.PI / 2 },
];

/** Half-extent of a utility-pole collider (metres). */
export const POLE_COLLIDER_HALF = 0.15; // 0.3 m box

// ------------------------------------------------- daavi job spot / bench --
/**
 * G-008d: Daavi's joint is split into two non-overlapping zones —
 *   FOOD COUNTER  LOC-001     (15.5, 2.4)   kiosk front, food only
 *   JOB SPOT      LOC-001-JOB (18.0, 0.0)   kiosk east side, work only
 *   BENCH         LOC-001-BENCH (21.5, 2.45) step-2 waypoint, north pavement
 * The two standing spots live in src/data/locations.ts; this section holds
 * the physical world side: the crate/pan stack that marks the job spot and
 * the wooden bench mesh at the bench waypoint.
 */

/**
 * Crates + stack of pans against the kiosk's EAST wall (x1 = 17.1). The
 * solid footprint ends at x 17.62 so the standing point (18.0, 0.0) keeps
 * 0.38 m of bare clearance — the 0.35 m player capsule can stand exactly
 * on the spot. Visuals: buildStatic.daaviSpecs().
 */
export const JOB_SPOT_PROPS: Box2D = { x0: 17.1, z0: -0.5, x1: 17.62, z1: 0.5 };

/**
 * Daavi's bench waypoint (G-008d: moved off the road onto the north
 * pavement z 1.85–3.85; was (20.5, 5.5) inside MAIN_ROAD).
 *
 * G-008e: (21.5, 2.45) — 0.70 m south of the bench MESH below, which is
 * exactly the capsule + margin (0.35 + 0.25 = 0.6 m) bar the jobs
 * data-contract clearance test enforces (2.9 left only 0.25 m). The mesh
 * stays where it was built; the player stands just south of the seat.
 *
 * ⚠ AGENT 4 CONTRACT: DAAVI_BENCH in src/rules/proximity.ts must equal
 * this { x: 21.5, z: 2.45 } — the objective marker and the step-2 Act zone
 * anchor here. src/world/clearance.test.ts pins the world side.
 */
export const DAAVI_BENCH_SPOT = { x: 21.5, z: 2.45 };

/**
 * The bench mesh's solid footprint (seat + backrest, faces south). Sits
 * just NORTH of the waypoint so the player stands beside the bench, not
 * inside it — the waypoint itself stays outside every solid footprint.
 */
export const DAAVI_BENCH_MESH: Box2D = { x0: 20.7, z0: 3.15, x1: 22.3, z1: 3.65 };

// --------------------------------------------------------------- apron -----
/** Outer apron depth past WORLD_MIN/MAX on every side (metres). */
export const APRON_DEPTH = 25;

// ------------------------------------------------------------- colliders ---
/** Building + wall + parked-vehicle + pole + prop footprints that block movement. */
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
  JOB_SPOT_PROPS, // G-008d: crates + pans marking the job spot
  DAAVI_BENCH_MESH, // G-008d: the wooden bench at the bench waypoint
  ...VEHICLE_SPOTS.map(vehicleFootprint),
  ...UTILITY_POLES.map((p) =>
    box(p.x, p.z, POLE_COLLIDER_HALF * 2, POLE_COLLIDER_HALF * 2),
  ),
];
