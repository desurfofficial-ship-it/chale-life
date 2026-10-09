/**
 * src/data/locations.ts — CONTRACT MODULE (do not break).
 *
 * Named points of interest on the starter block, in world metres
 * (1 unit = 1 m, origin at block centre, +x east, +z south).
 * Agent 3 (World & Art) owns this file; other data files belong to Agent 4.
 */

export type LocationType = 'food' | 'home' | 'shop' | 'transport' | 'landmark' | 'job';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  /** World x (metres). */
  x: number;
  /** World z (metres). */
  z: number;
}

export const locations: Location[] = [
  {
    id: 'LOC-001',
    name: "Daavi's Waakye Joint",
    type: 'food',
    x: 15.5, // front of the yellow kiosk, north pavement — FOOD COUNTER only
    z: 2.4,
  },
  {
    id: 'LOC-001-JOB',
    name: "Daavi's Job Spot",
    type: 'job',
    // G-008d: the kiosk's east side, just off the east wall (kiosk
    // x 13.9–17.1), beside the crate/pan stack (world props ~x ≤ 17.62).
    // WORK only — hire, "grab pans" (step 1) and "get paid" (step 3) happen
    // here; food never does. Zones must not overlap: this spot is
    // √(2.5² + 2.5²) ≈ 3.54 m from LOC-001, so with the counter's default
    // 2.5 m reach the job-spot zone radius must stay ≤ 0.9 m (Agent 4's
    // DAAVI_JOB_SPOT in rules/proximity.ts). z sits 0.1 south of the
    // (18.0, 0.0) design point so the whole bench-approach band (z ≥ 2.4,
    // e.g. 18.6, 2.4) stays outside this zone's default 2.5 m point reach —
    // the special small-radius DAAVI_JOB_SPOT zone is unaffected.
    x: 18.0,
    z: -0.1,
  },
  {
    id: 'LOC-002',
    name: 'Starter Compound',
    type: 'home',
    x: -9.5, // at the compound gate — player spawn
    z: 13.4,
  },
  {
    id: 'LOC-003',
    name: 'Maame Effia Provisions Store',
    type: 'shop',
    x: -6, // shop front, north pavement
    z: 2.6,
  },
  {
    id: 'LOC-004',
    name: 'Trotro Stop',
    type: 'transport',
    x: 22.5, // shelter on the south pavement
    z: 13.0,
  },
  {
    id: 'LOC-005',
    name: 'Maame Esi Chop Bar',
    type: 'food',
    x: 3.5, // front door, south side
    z: 14.2,
  },
  {
    id: 'LOC-006',
    name: 'Laterite Junction',
    type: 'landmark',
    // G-008d: moved off the carriageway to the north pavement at the
    // junction (was (-21, 8), mid-road). It still marks where the laterite
    // street meets the main road — the player now stands beside it, not in
    // it — so every location passes the world clearance test
    // (src/world/clearance.test.ts: no location inside MAIN_ROAD/gutters).
    x: -21,
    z: 3.2,
  },
];
