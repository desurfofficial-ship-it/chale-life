/**
 * src/data/locations.ts — CONTRACT MODULE (do not break).
 *
 * Named points of interest on the Accra map (v6) — anchored on the reserved DAAVI_PLOT in James Town, in world metres
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
    // ACCRA MAP: the reserved DAAVI_PLOT kiosk (Jamestown, map x −126.5,−3.6)
    // fronts the plot pavement (z −1.3…0.5); the counter zone sits 0.4 m in
    // front of it — FOOD COUNTER only, clear of the Daavi St carriageway
    // (z 0.5…7.5).
    x: -126.5,
    z: -1.85,
  },
  {
    id: 'LOC-001-JOB',
    name: "Daavi's Job Spot",
    type: 'job',
    // ACCRA MAP: the kiosk's east side on the plot (kiosk x −128…−125). WORK
    // only — hire, "grab pans" (step 1) and "get paid" (step 3) happen here;
    // food never does. 3.61 m from LOC-001 so the counter's 2.5 m reach and
    // this zone's 0.9 m radius stay disjoint (2.5 + 0.9 = 3.4 < 3.61).
    x: -122.9,
    z: -2.4,
  },
  {
    id: 'LOC-002',
    name: 'Daavi Compound Yard',
    type: 'home',
    // ACCRA MAP: the reserved plot's open sleep yard (mats, clothesline,
    // bench and drum between x −142…−130) — the player spawn, at the yard's
    // pavement edge.
    x: -136.0,
    z: -2.0,
  },
  {
    id: 'LOC-003',
    name: 'Yard Water Drum',
    type: 'shop',
    // ACCRA MAP: beside the sleep-yard drum (collider −130.5,−6.2), just
    // outside the sleep zone so the water purchase can resolve there.
    x: -130.6,
    z: -5.1,
  },
  {
    id: 'LOC-004',
    name: 'Daavi Street Trotro Stop',
    type: 'transport',
    // ACCRA MAP: the Daavi St pavement east of the plot.
    x: -121.0,
    z: -0.4,
  },
  {
    id: 'LOC-005',
    name: 'Maame Esi Chop Bar',
    type: 'food',
    // ACCRA MAP: the real Nima chop bar (lib/businesses.ts nim_chop) — a
    // far landmark for now; the plot kiosk feeds the player.
    x: -2.75,
    z: -41.2,
  },
  {
    id: 'LOC-006',
    name: 'James Town Lighthouse',
    type: 'landmark',
    // ACCRA MAP: the real Jamestown lighthouse south of Daavi St.
    x: -146.0,
    z: 22.5,
  },
];
