/**
 * colliders.ts — CONTRACT MODULE (do not break).
 *
 * Exports axis-aligned collider boxes in world metres (1 unit = 1 m):
 *   - `colliders`: every solid footprint on the Accra plate players cannot
 *     cross (5,400+ boxes — the map viewer's own captured set, same data the
 *     map's headless movement simulation runs on)
 *   - `worldBounds`: the playable plate (x −280…340, z −116…116)
 *
 * Boxes are { minX, minZ, maxX, maxZ } — NO three.js / engine imports, so
 * engine and rules code can consume this module from anywhere.
 *
 * Source of truth: src/world/accra/data/colliders.json — captured from the
 * live AccraScene with ?capture=1 (lib/colliderExport.ts) during the v6 map
 * integration; regenerate after world edits and re-run the map's sim suite.
 *
 * The old 60 × 60 m starter-block footprints are gone along with the starter
 * map itself (the Accra map replaces it wholesale).
 */
import rawBoxes from './accra/data/colliders.json';

export interface ColliderBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

interface RawBox {
  min: [number, number, number];
  max: [number, number, number];
  kind: string;
}

/**
 * Solid AABBs on the plate (x/z extents of every captured solid that blocks a
 * walker): boxes whose top is below 0.3 m (mats, ground decals — step-overs)
 * or whose base is above 1.2 m (head-height signs, awnings — walk-under)
 * are excluded, exactly like the map sim's own head-height rule.
 */
/** Gyan house (Daavi plot) — exterior shell in world metres. */
export const GYAN_HOUSE_WORLD = {
  x: -146.8,
  z: -7,
  /** outer width / depth including walls */
  w: 6.92,
  d: 6.32,
  wall: 0.22,
  /** door centre in local space (matches GyanHouse door mesh) */
  doorLocalX: 2.2,
  doorWidth: 1.15,
} as const;

function gyanHouseWallColliders(): ColliderBox[] {
  const { x, z, w, d, wall: t, doorLocalX, doorWidth } = GYAN_HOUSE_WORLD;
  const minX = x - w / 2;
  const maxX = x + w / 2;
  const minZ = z - d / 2;
  const maxZ = z + d / 2;
  const doorCx = x + doorLocalX;
  const doorL = doorCx - doorWidth / 2;
  const doorR = doorCx + doorWidth / 2;
  // slight pad so the capsule (r≈0.45) can clear the jamb
  const pad = 0.08;
  const walls: ColliderBox[] = [
    // back
    { minX: minX - pad, minZ: minZ - pad, maxX: maxX + pad, maxZ: minZ + t },
    // left
    { minX: minX - pad, minZ: minZ, maxX: minX + t, maxZ: maxZ },
    // right
    { minX: maxX - t, minZ: minZ, maxX: maxX + pad, maxZ: maxZ },
    // front left of door
    { minX: minX - pad, minZ: maxZ - t, maxX: doorL, maxZ: maxZ + pad },
    // front right of door
    { minX: doorR, minZ: maxZ - t, maxX: maxX + pad, maxZ: maxZ + pad },
  ];
  return walls;
}

/** True if a captured box is the solid Gyan-house shell (blocks the whole room). */
function isGyanHouseSolid(b: ColliderBox): boolean {
  const { x, z, w, d } = GYAN_HOUSE_WORLD;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const bw = b.maxX - b.minX;
  const bd = b.maxZ - b.minZ;
  // the captured mesh AABB is ~7.25 × 6.67 centred on the house
  return (
    Math.abs(cx - x) < 1.5 &&
    Math.abs(cz - z) < 1.5 &&
    bw > 5 &&
    bd > 5
  );
}

const mapped: ColliderBox[] = (rawBoxes as unknown as { boxes: RawBox[] }).boxes
  .filter((b) => b.min[1] <= 1.2 && b.max[1] >= 0.3)
  .map((b) => ({
    minX: b.min[0],
    minZ: b.min[2],
    maxX: b.max[0],
    maxZ: b.max[2],
  }));

export const colliders: ColliderBox[] = [
  ...mapped.filter((b) => !isGyanHouseSolid(b)),
  ...gyanHouseWallColliders(),
];

/** The playable plate — PLATE from the map config (x −280…340, z −116…116). */
export const worldBounds: ColliderBox = {
  minX: -280,
  minZ: -116,
  maxX: 340,
  maxZ: 116,
};

/** Alias kept from the E-001 placeholder so either type name resolves. */
export type Collider = ColliderBox;

/** True when (x,z) is inside Gyan's room (past the door, not on the street). */
export function isInsideGyanHouse(x: number, z: number): boolean {
  const { x: hx, z: hz, w, d, wall } = GYAN_HOUSE_WORLD;
  const margin = wall + 0.15;
  return (
    x > hx - w / 2 + margin &&
    x < hx + w / 2 - margin &&
    z > hz - d / 2 + margin &&
    z < hz + d / 2 - margin
  );
}
