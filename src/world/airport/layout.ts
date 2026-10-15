/**
 * Kotoka airside layout — world metres.
 * Terminal landside faces +z (city road); airside / apron faces −z (runway).
 */

export const AIRPORT = {
  /** Terminal centre */
  terminal: { x: 20, z: -88, w: 78, d: 12, h: 8 },
  /** Runway centreline z, width, length along x */
  runway: { z: -118, width: 32, x0: -90, x1: 130 },
  /** Apron band between terminal airside and taxiway */
  apron: { z0: -108, z1: -94 },
  /** Gate stands — nose toward terminal (+z), spaced for wingspan+6 */
  gates: [
    { id: 'A1', x: -20, z: -100, yaw: Math.PI / 2 }, // nose +z
    { id: 'A2', x: 0, z: -100, yaw: Math.PI / 2 },
    { id: 'A3', x: 20, z: -100, yaw: Math.PI / 2 },
    { id: 'A4', x: 40, z: -100, yaw: Math.PI / 2 },
    { id: 'A5', x: 60, z: -100, yaw: Math.PI / 2 },
  ],
  /** Plane size used for stand checks */
  plane: { length: 11.5, wingspan: 12.5, height: 3.6 },
  tower: { x: 62, z: -90 },
  hangar: { x: -50, z: -100 },
  cargo: { x: -65, z: -92 },
  depot: { x: 75, z: -105 },
};

/** Min gate spacing must exceed wingspan + 6 */
export function gateSpacingOk(): boolean {
  const g = AIRPORT.gates;
  for (let i = 1; i < g.length; i++) {
    if (Math.abs(g[i].x - g[i - 1].x) < AIRPORT.plane.wingspan + 6) return false;
  }
  return true;
}
