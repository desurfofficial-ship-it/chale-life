/**
 * Proximity / interact zones — pure rules for "where can the player Act".
 *
 * G-008: LOC-002 (sleep) is not a 2.5 m point. The interact area is the
 * whole compound yard (walls x −16..−4, z 15..27) plus the gate apron
 * south of the gate, with the house door as the objective-marker anchor.
 *
 * Also hosts the Daavi bench waypoint (G-008 step-2 walk ≥ 3 m from the
 * kiosk) so the hustle forces a short walk without editing locations.ts.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 */

import { locations, type Location } from '../data/locations';

/** Default point-radius for named locations (metres). */
export const DEFAULT_NEAR_RADIUS_M = 2.5;

/**
 * Compound yard AABB from starter layout walls (x −16..−4, z 15..27)
 * plus the gate apron so the designed spawn at z≈13.4 can Act.
 */
export const SLEEP_ZONE = {
  locationId: 'LOC-002' as const,
  x0: -16,
  x1: -4,
  /** Includes the designed spawn at the gate (z≈13.4). */
  z0: 13.0,
  z1: 27,
};

/** House door on the south face of the compound house — marker anchor. */
export const COMPOUND_DOOR = { x: -10, z: 18.5 };

/**
 * Daavi’s bench waypoint — ≥ 3 m east of the kiosk (LOC-001 at 15.5, 2.4).
 * G-008b: parked at (20.5, 5.5) on the south-east diagonal — the okada
 * (W-004: 18.3, 2.85, footprint x 17.3..19.3 / z 1.6..4.1) walls off the
 * whole straight-east band, so the bench sits past its south face where
 * the forced step-2 walk is unobstructed (pinned by the jobs
 * data-contract clearance test against every solid footprint).
 */
export const DAAVI_BENCH = {
  locationId: 'LOC-001-BENCH' as const,
  x: 20.5,
  z: 5.5,
  radius: DEFAULT_NEAR_RADIUS_M,
};

/** True when (x, z) is inside the compound sleep zone (yard + gate apron). */
export function isInSleepZone(x: number, z: number): boolean {
  return (
    x >= SLEEP_ZONE.x0 &&
    x <= SLEEP_ZONE.x1 &&
    z >= SLEEP_ZONE.z0 &&
    z <= SLEEP_ZONE.z1
  );
}

/**
 * Nearest actionable location id for the player at (x, z).
 * Priority: sleep zone > Daavi bench > point locations within radius.
 */
export function nearestLocationId(
  x: number,
  z: number,
  locs: readonly Location[] = locations
): string | null {
  if (isInSleepZone(x, z)) return SLEEP_ZONE.locationId;

  const benchDx = x - DAAVI_BENCH.x;
  const benchDz = z - DAAVI_BENCH.z;
  if (benchDx * benchDx + benchDz * benchDz <= DAAVI_BENCH.radius * DAAVI_BENCH.radius) {
    return DAAVI_BENCH.locationId;
  }

  let nearest: string | null = null;
  let bestD2 = DEFAULT_NEAR_RADIUS_M * DEFAULT_NEAR_RADIUS_M;
  for (let i = 0; i < locs.length; i++) {
    const loc = locs[i];
    const dx = loc.x - x;
    const dz = loc.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 <= bestD2) {
      bestD2 = d2;
      nearest = loc.id;
    }
  }
  return nearest;
}

/** World position for the objective marker for a location / waypoint id. */
export function markerPositionFor(
  locationId: string | null
): { x: number; z: number } | null {
  if (!locationId) return null;
  if (locationId === SLEEP_ZONE.locationId) return COMPOUND_DOOR;
  if (locationId === DAAVI_BENCH.locationId) {
    return { x: DAAVI_BENCH.x, z: DAAVI_BENCH.z };
  }
  const loc = locations.find((l) => l.id === locationId);
  return loc ? { x: loc.x, z: loc.z } : null;
}
