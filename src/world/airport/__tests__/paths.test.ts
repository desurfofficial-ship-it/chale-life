import { describe, expect, it } from 'vitest';
import {
  buildSegments,
  gapSpeedScale,
  laneOffset,
  pathLength,
  poseAt,
  roundCorners,
  type Pose,
} from '../paths';

describe('airport paths', () => {
  const box = [
    { x: 0, z: 0 },
    { x: 40, z: 0 },
    { x: 40, z: 30 },
    { x: 0, z: 30 },
  ];

  it('pose is continuous around the loop', () => {
    const pts = roundCorners(box, 4);
    const segs = buildSegments(pts, true);
    const L = pathLength(segs);
    const out: Pose = { x: 0, z: 0, yaw: 0 };
    const a = poseAt(segs, L, 0, { ...out });
    const b = poseAt(segs, L, L - 1e-4, { ...out });
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.5);
  });

  it('constant-ish speed: equal Δs → similar Δdistance', () => {
    const segs = buildSegments(roundCorners(box, 3), true);
    const L = pathLength(segs);
    const out: Pose = { x: 0, z: 0, yaw: 0 };
    const step = L / 40;
    let prev = poseAt(segs, L, 0, { ...out });
    const dists: number[] = [];
    for (let i = 1; i <= 40; i++) {
      const p = poseAt(segs, L, i * step, { ...out });
      dists.push(Math.hypot(p.x - prev.x, p.z - prev.z));
      prev = { ...p };
    }
    const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
    for (const d of dists) {
      expect(d).toBeGreaterThan(mean * 0.4);
      expect(d).toBeLessThan(mean * 2.2);
    }
  });

  it('lane offsets do not overlap for ±1.8 m', () => {
    const segs = buildSegments(box, true);
    const L = pathLength(segs);
    const out: Pose = { x: 0, z: 0, yaw: 0 };
    const mid = poseAt(segs, L, L * 0.25, { ...out });
    const left = laneOffset(mid, 1.8);
    const right = laneOffset(mid, -1.8);
    expect(Math.hypot(left.x - right.x, left.z - right.z)).toBeGreaterThan(3.5);
  });

  it('gap-keeping slows when leader is close', () => {
    const dists = [0, 2, 20];
    const speeds = [1, 1, 1];
    expect(gapSpeedScale(dists, 0, 40, 4, speeds)).toBeLessThan(1);
    expect(gapSpeedScale(dists, 0, 40, 4, speeds)).toBeGreaterThanOrEqual(0.15);
    expect(gapSpeedScale([0, 15], 0, 40, 4, [1, 1])).toBe(1);
  });
});
