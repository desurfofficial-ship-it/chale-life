/**
 * src/data/locations.ts — CONTRACT MODULE (do not break).
 *
 * Named points of interest on the starter block, in world metres
 * (1 unit = 1 m, origin at block centre, +x east, +z south).
 * Agent 3 (World & Art) owns this file; other data files belong to Agent 4.
 */

export type LocationType = 'food' | 'home' | 'shop' | 'transport' | 'landmark';

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
    name: "Aunty Ba's Waakye Joint",
    type: 'food',
    x: 15.5, // front of the yellow kiosk, north pavement
    z: 2.4,
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
    x: -21, // where the laterite street meets the main road
    z: 8,
  },
];
