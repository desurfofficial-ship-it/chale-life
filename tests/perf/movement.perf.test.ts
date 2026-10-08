/**
 * Perf smoke test — guards against catastrophic regressions in movementStep
 * (it runs every frame on mid-range phones). Bounds are deliberately generous
 * so CI jitter never flakes; locally this runs in single-digit milliseconds.
 * Real device-fps profiling stays a manual iPhone pass (see E-001 PR).
 */

import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import { movementStep, type Kinematics } from '../../src/engine/movement';

const FLAT_BOUNDS: Box = { minX: -30, minZ: -30, maxX: 30, maxZ: 30 };
const DT = 1 / 60;

/** A plausible street block: a dozen boxes scattered around the origin. */
function streetBlock(): Box[] {
  const boxes: Box[] = [];
  for (let i = 0; i < 12; i++) {
    const x = ((i % 4) - 1.5) * 8;
    const z = (Math.floor(i / 4) - 1) * 10;
    boxes.push({ minX: x - 2, minZ: z - 1.5, maxX: x + 2, maxZ: z + 1.5 });
  }
  return boxes;
}

describe('movementStep perf smoke', () => {
  it('runs 10,000 steps against 12 colliders well under budget', () => {
    const colliders = streetBlock();
    let k: Kinematics = { x: 0, z: 0, vx: 0, vz: 0, yaw: 0 };

    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      k = movementStep(k, { x: 0.8, z: -0.4 }, DT, colliders, { bounds: FLAT_BOUNDS });
    }
    const elapsedMs = performance.now() - t0;

    // 10k steps ≈ 2.8 game-minutes; real budgets are per-frame (~0.05 ms).
    // 2 s is a ~20× headroom guard against pathological regressions only.
    expect(elapsedMs).toBeLessThan(2_000);
    expect(Number.isFinite(k.x)).toBe(true);
    expect(Number.isFinite(k.z)).toBe(true);
  });
});
