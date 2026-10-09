/**
 * Proximity / interact zones — pure rules for "where can the player Act".
 *
 * G-008: LOC-002 (sleep) is not a 2.5 m point. The interact area is the
 * whole compound yard (walls x −16..−4, z 15..27) plus the gate apron
 * south of the gate, with the house door as the objective-marker anchor.
 *
 * Also hosts Daavi's two G-008d work/food waypoints so the hustle forces
 * short walks without editing locations.ts:
 *   - DAAVI_BENCH — the step-2 set-down, moved OFF the road onto the
 *     north pavement (21.5, 2.45); the old (20.5, 5.5) spot pointed the
 *     "carry the pans" hint into MAIN_ROAD (z 4.5–11.5). G-008e nudged
 *     it 0.45 m north again so the standing point keeps the full
 *     capsule + margin (0.6 m) from the bench mesh (z 3.15–3.65).
 *   - DAAVI_JOB_SPOT — the kiosk's east side (18.0, 0.0), just off the
 *     east wall (kiosk footprint x 13.9–17.1, z −1.7–1.5). Hiring and
 *     job steps 1/3 happen HERE; food happens ONLY at the LOC-001 front
 *     counter. One Act press can never again mean both "eat" and "work".
 *
 * G-008e ZONE-BACKED IDS: LOC-001-JOB and LOC-001-BENCH resolve ONLY
 * through their own zone checks above — never through the generic
 * point-location loop. LOC-001-JOB is ALSO a locations.ts entry (Agent
 * 3's data, so the world clearance/marker suites can pin it); without
 * the skip its default 2.5 m point reach shadowed the real 0.9 m job
 * zone and swallowed the east half of the food counter (the #28+#29
 * merge-collision bug).
 *
 * ZONE DISJOINTNESS (G-008d, pinned by tests): the counter (LOC-001,
 * 15.5, 2.4, r 2.5) and the job spot are 3.47 m apart — 2.5 + 0.9 = 3.4
 * < 3.466, so no point is within reach of both. The bench zone (r 2.5,
 * at 21.5, 2.45) is 4.27 m from the job spot (2.5 + 0.9 = 3.4 < 4.27)
 * and 6.0 m from the counter. Priority below only orders the probe;
 * geometry already keeps the zones apart.
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
 * Daavi's bench waypoint — the hustle's step-2 set-down. G-008d: MOVED
 * off the road onto the north pavement (z 1.85–3.85, layout.ts) — the
 * old (20.5, 5.5) waypoint made the objective marker point into
 * MAIN_ROAD. G-008e: pinned at (21.5, 2.45) — 0.70 m south of the bench
 * mesh (layout.DAAVI_BENCH_MESH, z0 3.15), which keeps the full
 * capsule + margin (0.35 + 0.25 = 0.6 m) bar the jobs data-contract
 * test enforces. The wooden bench MESH stays where Agent 3 built it;
 * the player stands just south of the seat.
 */
export const DAAVI_BENCH = {
  locationId: 'LOC-001-BENCH' as const,
  x: 21.5,
  z: 2.45,
  radius: DEFAULT_NEAR_RADIUS_M,
};

/**
 * Daavi's JOB SPOT (G-008d) — the kiosk's east side, just off the east
 * wall (kiosk footprint x 13.9–17.1, z −1.7–1.5; this point is 0.9 m
 * east of the wall face). Hiring ("Help Daavi") and the hustle's steps
 * 1 and 3 happen here; the LOC-001 front counter 3.47 m west-south of it
 * sells food ONLY. Radius 0.9 is picked so no point on the map is within
 * reach of both zones (2.5 + 0.9 = 3.4 < 3.466 — asserted by tests).
 * Agent 3 marks it visually with crates / a pan stack against the east
 * wall near (17.6, 0.0), leaving (18.0, 0.0) walkable (item 8).
 */
export const DAAVI_JOB_SPOT = {
  locationId: 'LOC-001-JOB' as const,
  x: 18.0,
  z: 0.0,
  radius: 0.9,
};

/**
 * Zone-backed ids — the point loop below SKIPS these (G-008e). They
 * resolve only through their own zone checks, so a zone's reach is
 * exactly its declared radius, never the locations entry's default
 * 2.5 m. LOC-001-BENCH is not even a locations.ts entry today; both ids
 * are listed so a future data row can never re-arm the shadowing.
 */
const ZONE_BACKED_IDS: ReadonlySet<string> = new Set<string>([
  DAAVI_BENCH.locationId,
  DAAVI_JOB_SPOT.locationId,
]);

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
 * Priority (G-008d): sleep zone > Daavi bench > Daavi job spot >
 * point locations within radius. The zones are geometrically disjoint
 * (see the header), so the order only decides exact boundary ties.
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

  const jobDx = x - DAAVI_JOB_SPOT.x;
  const jobDz = z - DAAVI_JOB_SPOT.z;
  if (jobDx * jobDx + jobDz * jobDz <= DAAVI_JOB_SPOT.radius * DAAVI_JOB_SPOT.radius) {
    return DAAVI_JOB_SPOT.locationId;
  }

  let nearest: string | null = null;
  let bestD2 = DEFAULT_NEAR_RADIUS_M * DEFAULT_NEAR_RADIUS_M;
  for (let i = 0; i < locs.length; i++) {
    const loc = locs[i];
    // G-008e: zone-backed ids never win the point loop — their own zone
    // checks above already ran with the true radius.
    if (ZONE_BACKED_IDS.has(loc.id)) continue;
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
  // G-008d: the job spot is its own marker anchor — steps 1/3 and the
  // find-work beacon point at the crates by the kiosk's east wall.
  if (locationId === DAAVI_JOB_SPOT.locationId) {
    return { x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z };
  }
  const loc = locations.find((l) => l.id === locationId);
  return loc ? { x: loc.x, z: loc.z } : null;
}
