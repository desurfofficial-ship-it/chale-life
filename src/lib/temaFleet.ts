/**
 * Tema Port ground fleet — placement data for the static dressing vehicles
 * (O-audit: the port had cargo ships / cranes / containers but ZERO ground
 * vehicles on its service roads).
 *
 * PURE DATA (no three.js) so the clearance contract is unit-testable against
 * the T13 layout arrays (containers / cranes / roads).
 *
 * Contract (all units metres, world axes; rot = Y rotation, 0 = facing +x):
 *  - Every vehicle rect must clear every T13 container, crane leg and crane
 *    sill beam by ≥ 0.3 m (≥ the 0.25 m capsule-margin bar the world tests pin).
 *  - Wheels touch ground: every vehicle's axle height == wheel radius 0.5.
 *  - Road vehicles sit inside their road/apron band; the portal tractor sits
 *    inside crane 2's portal lane (between the sill beams).
 *  - DRESSING ONLY: nothing here is captured into colliders.json (same policy
 *    as DaaviPlotDressing) and none of the footprints intersect a walk route
 *    (the port is outside every robot corridor).
 */
export interface FleetVehicle {
  /** world x of the vehicle centre */
  x: number;
  /** world z of the vehicle centre */
  z: number;
  /** Y rotation (0 = facing +x; +π/2 = facing −z; −π/2 = facing +z) */
  rot: number;
  kind: 'containerTruck' | 'tanker' | 'trailer' | 'reachStacker';
  /** footprint: length (local X) × width (local Z), including mirrors */
  len: number;
  wid: number;
  /** highest point above ground (clearance checks vs the crane boom) */
  top: number;
}

export const WHEEL_R = 0.5;

export const TEMA_FLEET: FleetVehicle[] = [
  // Gate road (x 217.5–226.5, w 9): inbound lane x ≈ 220 heading +z (rot −π/2),
  // outbound lane x ≈ 224.5 heading −z (rot +π/2). Clear of the TEMA PORT
  // gate banner (z −22.5) and of yard block A (first row x ≥ 242.9).
  { x: 220, z: 10, rot: -Math.PI / 2, kind: 'containerTruck', len: 10.2, wid: 2.5, top: 4.35 },
  { x: 224.5, z: -12, rot: Math.PI / 2, kind: 'containerTruck', len: 10.2, wid: 2.5, top: 4.35 },
  // Tractor creeping out of crane 2's portal (crane at 251: portal lane
  // x 248.35…253.65 between the sill beams; boom at y 17.6 clears top 4.35;
  // z 40 keeps the tail 0.9 m clear of the quay-wall band z 46…47.2).
  { x: 251, z: 40, rot: Math.PI / 2, kind: 'containerTruck', len: 10.2, wid: 2.5, top: 4.35 },
  // Fuel tanker parallel to the coastal road on the quay apron (z 32.5–45.6),
  // 7 m west of crane 3's legs (x ≥ 307).
  { x: 300, z: 34.5, rot: 0, kind: 'tanker', len: 10.6, wid: 2.5, top: 3.35 },
  // Two container trailers staged in the B|C yard lane (x 271.1…296.9),
  // aligned with the container rows (rot π/2, length along z). Trailer 1
  // sits east of the lane's mid-shadow line (the 3-tier B-row casts a hard
  // shadow across the west half) so both read in daylight.
  { x: 285, z: 8, rot: Math.PI / 2, kind: 'trailer', len: 8.3, wid: 2.5, top: 3.2 },
  { x: 288, z: 2, rot: Math.PI / 2, kind: 'trailer', len: 8.3, wid: 2.5, top: 3.2 },
  // Reach stacker working the pier staging lane, 0.43 m west of the row-1
  // container faces (x ≥ 282.48) and ≥ 5 m off the pier's west bollards.
  { x: 280.3, z: 57.5, rot: 0.35, kind: 'reachStacker', len: 3.1, wid: 1.7, top: 3.7 },
];

/** World-axis-aligned footprint of a vehicle (for clearance tests). */
export function fleetRect(v: FleetVehicle): { minX: number; minZ: number; maxX: number; maxZ: number } {
  const c = Math.abs(Math.cos(v.rot));
  const s = Math.abs(Math.sin(v.rot));
  const ex = (v.len / 2) * c + (v.wid / 2) * s;
  const ez = (v.len / 2) * s + (v.wid / 2) * c;
  return { minX: v.x - ex, maxX: v.x + ex, minZ: v.z - ez, maxZ: v.z + ez };
}

/** True when two rects are separated by at least `bar` metres on some axis. */
export function clears(
  a: { minX: number; minZ: number; maxX: number; maxZ: number },
  b: { minX: number; minZ: number; maxX: number; maxZ: number },
  bar: number,
): boolean {
  return a.maxX + bar <= b.minX || b.maxX + bar <= a.minX || a.maxZ + bar <= b.minZ || b.maxZ + bar <= a.minZ;
}
