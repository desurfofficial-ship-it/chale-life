/**
 * PLACEHOLDER — owned by Agent 3 (World & Art), to be replaced by ticket W-001.
 * Created by Agent 2 (E-001) so the engine could ship against the contract.
 *
 * World → Engine contract (do not change the export shapes):
 *   colliders: { minX; minZ; maxX; maxZ }[]  — metres, 1 unit = 1 m
 *   worldBounds: { minX; minZ; maxX; maxZ }
 * Engine (src/engine) reads this file for collision every frame.
 * World never imports engine code.
 */

export interface Box {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** 60 × 60 m playable area centred on the origin. */
export const worldBounds: Box = { minX: -30, minZ: -30, maxX: 30, maxZ: 30 };

/** No obstacles yet — W-001 authors these alongside the world geometry. */
export const colliders: Box[] = [];
