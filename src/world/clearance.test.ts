/**
 * World clearance tests (G-008d item 10).
 *
 * The design split Daavi's joint into a FOOD COUNTER (LOC-001) and a JOB
 * SPOT (LOC-001-JOB) and moved the step-2 bench off the road onto the
 * north pavement. This suite pins the world side of that contract:
 *
 *   1. EVERY location (src/data/locations.ts, including LOC-001-JOB) sits
 *      outside MAIN_ROAD and both gutters, and outside every solid
 *      footprint (buildings, walls, vehicles, poles, benches, props).
 *   2. The bench waypoint (layout.DAAVI_BENCH_SPOT — rules/proximity.ts
 *      DAAVI_BENCH must match) is on the pavement, off the road, clear of
 *      every footprint, and not covered by its own bench mesh.
 *   3. The job spot (18.0, 0.0) is walkable with the 0.35 m player capsule
 *      even though the crate/pan stack stands right beside it.
 *   4. The counter and job-spot zones cannot overlap at the agreed radii.
 *   5. The job spot → bench straight-line walk hits no solid footprint.
 *
 * G-008b lesson (jobs.test.ts): W-004 parked an okada on the bench line
 * and walled the forced walk off — positions used by gameplay must be
 * pinned against the SAME SOLID_FOOTPRINTS the colliders serve, here in
 * the world package where those footprints are defined.
 */
import { describe, expect, it } from 'vitest';
import { locations } from '../data/locations';
import {
  DAAVI_BENCH_MESH,
  DAAVI_BENCH_SPOT,
  JOB_SPOT_PROPS,
  MAIN_ROAD,
  NORTH_GUTTER,
  NORTH_PAVEMENT,
  SOLID_FOOTPRINTS,
  SOUTH_GUTTER,
  WAAKYE_KIOSK,
  type Box2D,
} from './starter/layout';

/** Kerb/footprint margin for "outside" checks (metres). */
const MARGIN = 0.1;
/** Player capsule radius (engine movement uses the same number). */
const CAPSULE = 0.35;
/** Inflation for the straight-line walk test (metres). */
const WALK_PAD = 0.05;

/** True when (x, z) is inside `f` inflated by `pad`. */
function inBox(x: number, z: number, f: Box2D, pad = 0): boolean {
  return (
    x >= f.x0 - pad && x <= f.x1 + pad && z >= f.z0 - pad && z <= f.z1 + pad
  );
}

/**
 * Parametric (Liang–Barsky) segment vs AABB: true when the segment from
 * (ax, az) to (bx, bz) intersects the box inflated by `pad`.
 */
function segHitsBox(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  f: Box2D,
  pad = 0
): boolean {
  const x0 = f.x0 - pad;
  const x1 = f.x1 + pad;
  const z0 = f.z0 - pad;
  const z1 = f.z1 + pad;
  const dx = bx - ax;
  const dz = bz - az;
  let t0 = 0;
  let t1 = 1;
  // Slab clipping — for each axis, shrink [t0, t1] to the slab's span.
  for (const [p, d, lo, hi] of [
    [ax, dx, x0, x1],
    [az, dz, z0, z1],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false; // parallel and outside the slab
      continue;
    }
    let ta = (lo - p) / d;
    let tb = (hi - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

describe('clearance: every location is off the road and out of solids (G-008d item 10)', () => {
  const ZONES: { name: string; box: Box2D }[] = [
    { name: 'MAIN_ROAD', box: MAIN_ROAD },
    { name: 'NORTH_GUTTER', box: NORTH_GUTTER },
    { name: 'SOUTH_GUTTER', box: SOUTH_GUTTER },
  ];

  it('no location sits inside the road or a gutter', () => {
    for (const l of locations) {
      for (const zone of ZONES) {
        expect(
          inBox(l.x, l.z, zone.box, MARGIN),
          `${l.id} (${l.x}, ${l.z}) must stay ${MARGIN} m clear of ${zone.box}`
        ).toBe(false);
      }
    }
  });

  it('no location sits inside (or on the skin of) a solid footprint', () => {
    for (const l of locations) {
      for (const f of SOLID_FOOTPRINTS) {
        expect(
          inBox(l.x, l.z, f, MARGIN),
          `${l.id} (${l.x}, ${l.z}) must stay ${MARGIN} m clear of footprint ${JSON.stringify(f)}`
        ).toBe(false);
      }
    }
  });
});

describe('clearance: Daavi bench waypoint (G-008d item 9)', () => {
  it('the waypoint is on the north pavement, off the road and the gutter', () => {
    expect(DAAVI_BENCH_SPOT.z).toBeGreaterThanOrEqual(NORTH_PAVEMENT.z0);
    expect(DAAVI_BENCH_SPOT.z).toBeLessThanOrEqual(NORTH_PAVEMENT.z1);
    expect(inBox(DAAVI_BENCH_SPOT.x, DAAVI_BENCH_SPOT.z, MAIN_ROAD, MARGIN)).toBe(false);
    expect(inBox(DAAVI_BENCH_SPOT.x, DAAVI_BENCH_SPOT.z, NORTH_GUTTER, MARGIN)).toBe(false);
  });

  it('the waypoint is outside every solid footprint — including its own bench mesh', () => {
    for (const f of SOLID_FOOTPRINTS) {
      expect(
        inBox(DAAVI_BENCH_SPOT.x, DAAVI_BENCH_SPOT.z, f, MARGIN),
        `bench waypoint (${DAAVI_BENCH_SPOT.x}, ${DAAVI_BENCH_SPOT.z}) must clear footprint ${JSON.stringify(f)}`
      ).toBe(false);
    }
    // The bench mesh sits just NORTH of the waypoint (the player stands
    // beside the bench, not inside it) — keep that gap honest.
    expect(DAAVI_BENCH_SPOT.z + MARGIN).toBeLessThanOrEqual(DAAVI_BENCH_MESH.z0);
  });

  it('the bench mesh footprint is registered as a solid', () => {
    expect(
      SOLID_FOOTPRINTS.some(
        (f) =>
          f.x0 === DAAVI_BENCH_MESH.x0 &&
          f.z0 === DAAVI_BENCH_MESH.z0 &&
          f.x1 === DAAVI_BENCH_MESH.x1 &&
          f.z1 === DAAVI_BENCH_MESH.z1
      )
    ).toBe(true);
  });
});

describe('clearance: Daavi job spot (G-008d item 8)', () => {
  const JOB = locations.find((l) => l.id === 'LOC-001-JOB')!;

  it('LOC-001-JOB exists on the kiosk east side at the agreed (18.0, −0.1)', () => {
    expect(JOB).toBeDefined();
    expect(JOB.x).toBe(18.0);
    expect(JOB.z).toBe(-0.1); // 0.1 south of the design point — see locations.ts
    expect(JOB.type).toBe('job');
  });

  it('the standing point is walkable — capsule clear of the crate/pan stack', () => {
    // JOB_SPOT_PROPS ends at x 17.62 → 0.38 m bare clearance ≥ capsule.
    expect(JOB.x - JOB_SPOT_PROPS.x1).toBeGreaterThanOrEqual(CAPSULE);
    expect(
      inBox(JOB.x, JOB.z, JOB_SPOT_PROPS, MARGIN),
      'job spot must stay clear of its own props'
    ).toBe(false);
  });

  it('the props stay flush against the kiosk east wall and are registered as solids', () => {
    expect(JOB_SPOT_PROPS.x0).toBeCloseTo(WAAKYE_KIOSK.footprint.x1, 5);
    expect(
      SOLID_FOOTPRINTS.some(
        (f) =>
          f.x0 === JOB_SPOT_PROPS.x0 &&
          f.z0 === JOB_SPOT_PROPS.z0 &&
          f.x1 === JOB_SPOT_PROPS.x1 &&
          f.z1 === JOB_SPOT_PROPS.z1
      )
    ).toBe(true);
  });

  it('counter and job-spot zones cannot overlap at the agreed radii', () => {
    const counter = locations.find((l) => l.id === 'LOC-001')!;
    const d = Math.hypot(JOB.x - counter.x, JOB.z - counter.z);
    // √(2.5² + 2.4²) ≈ 3.47 m apart. With the counter's default 2.5 m
    // reach, the job-spot zone radius must stay ≤ ~0.9 m (Agent 4's
    // DAAVI_JOB_SPOT) so no point is within reach of both.
    expect(d).toBeGreaterThanOrEqual(3.4);
    expect(d - 2.5).toBeGreaterThanOrEqual(0.9);
  });
});

describe('clearance: the forced walks (G-008d item 10)', () => {
  const JOB = locations.find((l) => l.id === 'LOC-001-JOB')!;

  it('job spot → bench straight-line walk hits no solid footprint', () => {
    for (const f of SOLID_FOOTPRINTS) {
      expect(
        segHitsBox(JOB.x, JOB.z, DAAVI_BENCH_SPOT.x, DAAVI_BENCH_SPOT.z, f, WALK_PAD),
        `job spot → bench walk must not cross footprint ${JSON.stringify(f)}`
      ).toBe(false);
    }
  });
});
