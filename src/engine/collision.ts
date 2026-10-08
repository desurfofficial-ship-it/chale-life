/**
 * Collision primitives for the engine. Units: metres, 1 world unit = 1 m.
 * Boxes come from the World → Engine contract: src/world/colliders.ts.
 * Pure math only — no three.js, no DOM — so it stays unit-testable in node.
 */

export interface Box {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** True when a circle (centre x,z; radius r) overlaps an axis-aligned box. */
export function circleIntersectsBox(x: number, z: number, r: number, box: Box): boolean {
  const nearestX = clamp(x, box.minX, box.maxX);
  const nearestZ = clamp(z, box.minZ, box.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < r * r;
}

/** True when the circle overlaps any box in the list. */
export function circleHitsAny(x: number, z: number, r: number, boxes: readonly Box[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    if (circleIntersectsBox(x, z, r, boxes[i])) return true;
  }
  return false;
}

/**
 * Clamp a position into the world bounds, respecting a capsule radius.
 * Returns which axes were clamped so callers can zero velocity into the wall.
 * (If the caller was already outside the bounds, the clamp also pulls them
 * back in — velocity is zeroed either way, so the next frames re-accelerate
 * normally instead of fighting the wall.)
 */
export function clampToBounds(
  x: number,
  z: number,
  r: number,
  bounds: Box,
): { x: number; z: number; hitX: boolean; hitZ: boolean } {
  const cx = clamp(x, bounds.minX + r, bounds.maxX - r);
  const cz = clamp(z, bounds.minZ + r, bounds.maxZ - r);
  return { x: cx, z: cz, hitX: cx !== x, hitZ: cz !== z };
}
