/**
 * Vehicle placement contract (W-005):
 *  - Each VEHICLE_SPOTS footprint matches the producer-brief model dimensions
 *    after rotation, within 0.2 m on every axis.
 *  - Trotro clears TROTRO_STOP roof, bench and nearest pole by ≥ 0.3 m.
 *  - Van faces east (length along X) on the north curb.
 */
import { describe, expect, it } from 'vitest';
import {
  TROTRO_STOP,
  UTILITY_POLES,
  VEHICLE_DIMS,
  VEHICLE_SPOTS,
  vehicleFootprint,
  type VehicleSpot,
} from './layout';

const TOL = 0.2; // metres — footprint vs model bbox after rotation

/** Expected AABB size after yaw (length swaps onto X when |sin ry| > 0.5). */
function expectedSize(spot: VehicleSpot): { sx: number; sz: number } {
  const d = VEHICLE_DIMS[spot.model];
  const alongX = Math.abs(Math.sin(spot.ry)) > 0.5;
  return alongX ? { sx: d.l, sz: d.w } : { sx: d.w, sz: d.l };
}

describe('VEHICLE_SPOTS footprints match model dims after rotation', () => {
  for (const spot of VEHICLE_SPOTS) {
    it(`${spot.model} footprint within ${TOL} m of rotated dims`, () => {
      const fp = vehicleFootprint(spot);
      const { sx, sz } = expectedSize(spot);
      const fw = fp.x1 - fp.x0;
      const fd = fp.z1 - fp.z0;
      expect(Math.abs(fw - sx), `${spot.model} width ${fw} vs ${sx}`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(fd - sz), `${spot.model} depth ${fd} vs ${sz}`).toBeLessThanOrEqual(TOL);
      expect((fp.x0 + fp.x1) / 2).toBeCloseTo(spot.x, 5);
      expect((fp.z0 + fp.z1) / 2).toBeCloseTo(spot.z, 5);
    });
  }
});

describe('van parks parallel to north curb facing east', () => {
  it('length runs along X (east–west) and sits in the north half of the road', () => {
    const van = VEHICLE_SPOTS.find((s) => s.model === 'van')!;
    expect(van).toBeDefined();
    const { sx, sz } = expectedSize(van);
    expect(sx).toBeGreaterThan(sz);
    expect(van.z).toBeLessThan(8);
    expect(van.z).toBeGreaterThan(4.5);
    expect(Math.abs(Math.abs(van.ry) - Math.PI / 2)).toBeLessThan(0.01);
  });
});

describe('trotro clears the stop geometry by ≥ 0.3 m', () => {
  it('south-lane footprint stays clear of roof, bench and nearest pole', () => {
    const trotro = VEHICLE_SPOTS.find((s) => s.model === 'trotro')!;
    const fp = vehicleFootprint(trotro);
    const CLEAR = 0.3;

    const roof = TROTRO_STOP.roof;
    const clearRoof =
      fp.x1 + CLEAR <= roof.x0 ||
      fp.x0 - CLEAR >= roof.x1 ||
      fp.z1 + CLEAR <= roof.z0 ||
      fp.z0 - CLEAR >= roof.z1;
    expect(clearRoof, 'trotro vs roof').toBe(true);

    const bench = TROTRO_STOP.bench;
    const clearBench =
      fp.x1 + CLEAR <= bench.x0 ||
      fp.x0 - CLEAR >= bench.x1 ||
      fp.z1 + CLEAR <= bench.z0 ||
      fp.z0 - CLEAR >= bench.z1;
    expect(clearBench, 'trotro vs bench').toBe(true);

    let minPole = Infinity;
    for (const p of UTILITY_POLES) {
      const dx = Math.max(fp.x0 - p.x, 0, p.x - fp.x1);
      const dz = Math.max(fp.z0 - p.z, 0, p.z - fp.z1);
      minPole = Math.min(minPole, Math.hypot(dx, dz));
    }
    expect(minPole, `nearest pole distance ${minPole}`).toBeGreaterThanOrEqual(CLEAR);
  });
});
