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
 * Source of truth: public/data/colliders.json — captured from the live
 * AccraScene with ?capture=1 (lib/colliderExport.ts) during the v6 map
 * integration; regenerate after world edits and re-run the map's sim suite.
 *
 * P2-2: the capture (766 KB) is no longer bundled into JS — it is fetched
 * at boot from BASE_URL + 'data/colliders.json'. `colliders` starts as the
 * code-derived Gyan-house walls and is replaced IN PLACE (same array
 * identity) once the capture lands; movement gates on `collidersReady()`.
 * Node tests ingest the capture directly via applyColliderCapture().
 */

export interface ColliderBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface RawBox {
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
  const { x, z } = GYAN_HOUSE_WORLD;
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

/**
 * The live collider set. Starts as the code-derived Gyan-house walls only;
 * `applyColliderCapture` replaces the contents IN PLACE (callers hold the
 * same array reference — the World → Engine contract stays identity-stable).
 */
export const colliders: ColliderBox[] = [...gyanHouseWallColliders()];

function applyMapped(mapped: ColliderBox[]): void {
  colliders.length = 0;
  colliders.push(...mapped.filter((b) => !isGyanHouseSolid(b)), ...gyanHouseWallColliders());
}

/**
 * Ingest a captured payload ({ boxes: RawBox[] }) — the same transform the
 * static import used to run at module load (head-height filter + Gyan-house
 * solid exclusion). Used by the boot fetch and by node tests directly.
 */
export function applyColliderCapture(raw: { boxes: RawBox[] }): void {
  const mapped = raw.boxes
    .filter((b) => b.min[1] <= 1.2 && b.max[1] >= 0.3)
    .map((b) => ({
      minX: b.min[0],
      minZ: b.min[2],
      maxX: b.max[0],
      maxZ: b.max[2],
    }));
  applyMapped(mapped);
}

let captureLoaded = false;
let capturePromise: Promise<void> | null = null;

/** True once the fetched capture has replaced the boot-time wall set. */
export function collidersReady(): boolean {
  return captureLoaded;
}

/**
 * Fetch the captured collider set at boot (P2-2 — keeps 766 KB of data out
 * of the JS bundle; parse cost moves off the critical thread too).
 * Idempotent. Resolves even on failure (loud console.error) so the game
 * degrades to walkable-instead-of-frozen, never to a movement deadlock.
 */
export function loadColliders(): Promise<void> {
  if (capturePromise) return capturePromise;
  const url = import.meta.env.BASE_URL + 'data/colliders.json';
  capturePromise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ boxes: RawBox[] }>;
    })
    .then((raw) => {
      applyColliderCapture(raw);
      captureLoaded = true;
    })
    .catch((err: unknown) => {
      // Movement is gated on collidersReady() — a missing/broken capture
      // must never softlock the walker, so we go ready-but-degraded.
      console.error(`[colliders] failed to load ${url}:`, err);
      captureLoaded = true;
    });
  return capturePromise;
}

// Boot fetch — browsers load the capture immediately; node tests ingest
// the fixture by hand via applyColliderCapture().
if (typeof window !== 'undefined') {
  void loadColliders();
}

/**
 * Playable plate. PLATE is x −280…340, z −116…116, but NorthReach offices
 * sit at z ≈ −152 (O-001). Bounds extend north so Offices Go + walking stay
 * valid there (P1 map integrity).
 */
export const worldBounds: ColliderBox = {
  minX: -280,
  minZ: -170,
  maxX: 340,
  maxZ: 116,
};

/** Alias kept from the E-001 placeholder so either type name resolves. */
export type Collider = ColliderBox;

/** True when (x,z) is inside Gyan's room (past the door, not on the street). */
export function isInsideGyanHouse(x: number, z: number): boolean {
  const { x: hx, z: hz, w, d, wall } = GYAN_HOUSE_WORLD;
  // Small margin so the door threshold still counts as "inside"
  const margin = Math.max(0.05, wall - 0.05);
  return (
    x > hx - w / 2 + margin &&
    x < hx + w / 2 - margin &&
    z > hz - d / 2 + margin &&
    z < hz + d / 2 - margin
  );
}
