import { describe, expect, it } from 'vitest';
import {
  buildSegments,
  loopLength,
  poseAt,
  laneOffset,
  maxPoseJump,
  CITY_LOOPS,
  LANE_WIDTH,
  type Pose,
} from '../roadGraph';

describe('roadGraph poseAt', () => {
  const segs = buildSegments(CITY_LOOPS[0].points, true);
  const total = loopLength(segs);

  it('has positive loop length', () => {
    expect(total).toBeGreaterThan(100);
    expect(segs.length).toBe(4);
  });

  it('is continuous at corner joins (no large jumps)', () => {
    const jump = maxPoseJump(segs, total, 0.5);
    // step 0.5 m → jump should be ~0.5, never a teleport across the loop
    expect(jump).toBeLessThan(2.5);
  });

  it('wraps distance modulo length', () => {
    const a: Pose = { x: 0, z: 0, yaw: 0 };
    const b: Pose = { x: 0, z: 0, yaw: 0 };
    poseAt(segs, total, 0, a);
    poseAt(segs, total, total, b);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.05);
  });

  it('moves at constant speed along straights', () => {
    const p0: Pose = { x: 0, z: 0, yaw: 0 };
    const p1: Pose = { x: 0, z: 0, yaw: 0 };
    poseAt(segs, total, 5, p0);
    poseAt(segs, total, 15, p1);
    const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    expect(dist).toBeGreaterThan(9);
    expect(dist).toBeLessThan(11);
  });

  it('lane offsets do not overlap (opposite lanes)', () => {
    const base: Pose = { x: 0, z: 0, yaw: 0 };
    const left: Pose = { x: 0, z: 0, yaw: 0 };
    const right: Pose = { x: 0, z: 0, yaw: 0 };
    poseAt(segs, total, 20, base);
    laneOffset(base, LANE_WIDTH / 2, right);
    laneOffset(base, -LANE_WIDTH / 2, left);
    const gap = Math.hypot(right.x - left.x, right.z - left.z);
    expect(gap).toBeGreaterThan(LANE_WIDTH * 0.95);
    expect(gap).toBeLessThan(LANE_WIDTH * 1.05);
  });
});
