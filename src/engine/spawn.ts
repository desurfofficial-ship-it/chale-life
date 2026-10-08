/**
 * spawn.ts — where the player starts, resolved from the World → Gameplay
 * location contract (src/data/locations.ts).
 *
 * E-002: the designed spawn is the starter compound gate (LOC-002, type
 * 'home' — "Starter Compound"). resolveSpawn() reads the location registry
 * and GUARANTEES the point is not inside any World collider (expanded by the
 * capsule radius): if World art ever moves on top of the marked spot, the
 * spawn nudges outward on a deterministic nearest-first ring search, with a
 * full-block nearest-free-cell scan as the paranoid fallback. A player who
 * spawns inside geometry would be permanently stuck (both movement axes
 * blocked), so this failure mode is worth the ~40 lines.
 *
 * initializePlayerSpawn() commits the spawn to the store once at
 * composition-root import time (src/app/App.tsx), before first render — so
 * the camera, HUD and ?debug=1 overlay all start on the compound gate.
 */

import { locations } from '../data/locations';
import { colliders, worldBounds } from '../world/colliders';
import { circleHitsAny, clampToBounds, type Box } from './collision';
import { DEFAULT_MOVEMENT } from './movement';
import {
  getHud,
  publishHud,
  setPlayerPosition,
  setPlayerYaw,
} from '../store/gameStore';

/** The spawn is the home location in the registry (LOC-002 on main). */
const SPAWN_LOCATION_TYPE = 'home';

/**
 * Initial facing: yaw π = towards −Z (north) — out of the compound gate,
 * across the road towards the shops. Yaw 0 would face the compound wall.
 */
export const SPAWN_YAW = Math.PI;

/** Ring-search step and range (metres) for the nudge fallback. */
const NUDGE_STEP = 0.5;
const NUDGE_MAX_RADIUS = 5;
const NUDGE_DIRECTIONS = 16;

export interface SpawnPoint {
  x: number;
  z: number;
  /** Which location entry the spawn came from (tests / ?debug=1 context). */
  locationId: string;
}

/**
 * Resolve the player spawn: the home location from the registry, moved out
 * of any collider (nearest-first) and clamped inside the world bounds.
 * Pure — no store writes — so it is directly unit-testable with fake boxes.
 */
export function resolveSpawn(
  radius: number = DEFAULT_MOVEMENT.radius,
  boxes: readonly Box[] = colliders,
): SpawnPoint {
  const home = locations.find((l) => l.type === SPAWN_LOCATION_TYPE);
  const base = home
    ? { x: home.x, z: home.z, locationId: home.id }
    : { x: 0, z: 0, locationId: 'origin' };

  if (!circleHitsAny(base.x, base.z, radius, boxes)) {
    const clamped = clampToBounds(base.x, base.z, radius, worldBounds);
    return { ...base, x: clamped.x, z: clamped.z };
  }

  // 1. Nearest-first outward ring around the marked spot.
  for (let r = NUDGE_STEP; r <= NUDGE_MAX_RADIUS; r += NUDGE_STEP) {
    for (let i = 0; i < NUDGE_DIRECTIONS; i++) {
      const angle = (i / NUDGE_DIRECTIONS) * Math.PI * 2;
      const x = base.x + Math.cos(angle) * r;
      const z = base.z + Math.sin(angle) * r;
      if (!circleHitsAny(x, z, radius, boxes)) {
        const clamped = clampToBounds(x, z, radius, worldBounds);
        return { ...base, x: clamped.x, z: clamped.z };
      }
    }
  }

  // 2. Paranoid fallback: nearest free cell on a 1 m grid over the block.
  //    (Unreachable with real data — the road grid always has free cells —
  //    but keeps the guarantee unconditional.)
  let best: { x: number; z: number; d: number } | null = null;
  for (let z = worldBounds.minZ + radius; z <= worldBounds.maxZ - radius; z += 1) {
    for (let x = worldBounds.minX + radius; x <= worldBounds.maxX - radius; x += 1) {
      if (circleHitsAny(x, z, radius, boxes)) continue;
      const d = (x - base.x) ** 2 + (z - base.z) ** 2;
      if (!best || d < best.d) best = { x, z, d };
    }
  }
  if (best) return { ...base, x: best.x, z: best.z };

  // Truly degenerate world (every cell blocked): return the clamped mark and
  // let the PR report carry the contract gap — do not throw at boot.
  const clamped = clampToBounds(base.x, base.z, radius, worldBounds);
  return { ...base, x: clamped.x, z: clamped.z };
}

/**
 * Commit the spawn to the store — called ONCE at composition-root import
 * (src/app/App.tsx), before React renders. Uses the notifying setters (this
 * is exactly the teleport-style write they exist for) and republishes the
 * HUD snapshot so the first ?debug=1 paint already shows the spawn, not the
 * store's pre-spawn origin.
 */
export function initializePlayerSpawn(): void {
  const spawn = resolveSpawn();
  setPlayerPosition(spawn.x, 0, spawn.z);
  setPlayerYaw(SPAWN_YAW);
  publishHud({ ...getHud(), x: spawn.x, z: spawn.z, yaw: SPAWN_YAW });
}
