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
export const colliders: ColliderBox[] = (rawBoxes as unknown as { boxes: RawBox[] }).boxes
  .filter((b) => b.min[1] <= 1.2 && b.max[1] >= 0.3)
  .map((b) => ({
    minX: b.min[0],
    minZ: b.min[2],
    maxX: b.max[0],
    maxZ: b.max[2],
  }));

/** The playable plate — PLATE from the map config (x −280…340, z −116…116). */
export const worldBounds: ColliderBox = {
  minX: -280,
  minZ: -116,
  maxX: 340,
  maxZ: 116,
};

/** Alias kept from the E-001 placeholder so either type name resolves. */
export type Collider = ColliderBox;
