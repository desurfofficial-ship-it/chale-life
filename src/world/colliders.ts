/**
 * colliders.ts — CONTRACT MODULE (do not break).
 *
 * Exports axis-aligned collider boxes in world metres (1 unit = 1 m):
 *   - `colliders`: building + compound-wall footprints players cannot cross
 *   - `worldBounds`: the playable 60 × 60 m block limit
 *
 * Boxes are { minX, minZ, maxX, maxZ } — NO three.js / engine imports, so
 * engine and rules code can consume this module from anywhere.
 *
 * Data flows from starter/layout.ts, which is also the source of truth for
 * the visible geometry — colliders and visuals cannot drift apart.
 *
 * Owned by Agent 3 (World & Art).
 */
import { SOLID_FOOTPRINTS, WORLD_MAX, WORLD_MIN } from './starter/layout';

export interface ColliderBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export const colliders: ColliderBox[] = SOLID_FOOTPRINTS.map((f) => ({
  minX: f.x0,
  minZ: f.z0,
  maxX: f.x1,
  maxZ: f.z1,
}));

export const worldBounds: ColliderBox = {
  minX: WORLD_MIN,
  minZ: WORLD_MIN,
  maxX: WORLD_MAX,
  maxZ: WORLD_MAX,
};

/**
 * Alias kept from the E-001 placeholder so either type name resolves to the
 * same shape. Engine keeps its own `Box` in src/engine/collision.ts — the two
 * are structurally identical.
 */
export type Box = ColliderBox;
