/**
 * Unit tests for the pure movementStep rule (E-001 acceptance):
 * direction (incl. camera-relative rotation), speed cap, collision stop +
 * wall slide, world bounds, and purity (no mutation of inputs).
 */

import { describe, expect, it } from 'vitest';
import type { Box } from './collision';
import { movementStep, type Kinematics, type MoveVector } from './movement';

const FLAT_BOUNDS: Box = { minX: -30, minZ: -30, maxX: 30, maxZ: 30 };
const NO_BOXES: readonly Box[] = [];
const DT = 1 / 60;

function spawn(at?: Partial<Kinematics>): Kinematics {
  return { x: 0, z: 0, vx: 0, vz: 0, yaw: 0, ...at };
}

function run(
  input: MoveVector,
  frames: number,
  config: { bounds?: Box; colliders?: readonly Box[]; cameraYaw?: number } = {},
  start: Kinematics = spawn(),
): Kinematics {
  let k = start;
  for (let i = 0; i < frames; i++) {
    k = movementStep(k, input, DT, config.colliders ?? NO_BOXES, {
      bounds: config.bounds ?? FLAT_BOUNDS,
      cameraYaw: config.cameraYaw,
    });
  }
  return k;
}

describe('movementStep — direction', () => {
  it('screen-up moves away from the camera (world −Z at default yaw)', () => {
    const k = run({ x: 0, z: -1 }, 60); // 1 second
    expect(k.z).toBeLessThan(-4); // ~5.5 m after the accel ramp
    expect(Math.abs(k.x)).toBeLessThan(1e-6);
  });

  it('screen-right moves along +X at default yaw', () => {
    const k = run({ x: 1, z: 0 }, 60);
    expect(k.x).toBeGreaterThan(4);
    expect(Math.abs(k.z)).toBeLessThan(1e-6);
  });

  it('rotates input into the camera frame: yaw 90° maps screen-up to −X', () => {
    const k = run({ x: 0, z: -1 }, 60, { cameraYaw: Math.PI / 2 });
    expect(k.x).toBeLessThan(-4);
    expect(Math.abs(k.z)).toBeLessThan(1e-6);
  });

  it('faces the direction of travel (yaw 0 = +Z, π/2 = +X)', () => {
    expect(run({ x: 0, z: 1 }, 30).yaw).toBeCloseTo(0, 5);
    expect(run({ x: 1, z: 0 }, 30).yaw).toBeCloseTo(Math.PI / 2, 5);
  });

  it('keeps the previous yaw when stopped (no jitter at ~0 speed)', () => {
    const moving = run({ x: 1, z: 0 }, 60);
    const stopped = run({ x: 0, z: 0 }, 60, {}, moving);
    expect(stopped.yaw).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('movementStep — speed cap', () => {
  it('never exceeds maxSpeed even with diagonal input clamped to 1', () => {
    let k = spawn();
    for (let i = 0; i < 300; i++) {
      k = movementStep(k, { x: 1, z: 1 }, DT, NO_BOXES, { bounds: FLAT_BOUNDS });
      const speed = Math.hypot(k.vx, k.vz);
      expect(speed).toBeLessThanOrEqual(6 + 1e-9);
    }
    expect(Math.hypot(k.vx, k.vz)).toBeCloseTo(6, 1); // converged at the cap
  });

  it('analog magnitude scales speed below the cap (half stick ≈ half speed)', () => {
    const k = run({ x: 0.5, z: 0 }, 120);
    expect(Math.hypot(k.vx, k.vz)).toBeCloseTo(3, 1);
  });

  it('accelerates smoothly instead of snapping to top speed', () => {
    const k = movementStep(spawn(), { x: 1, z: 0 }, DT, NO_BOXES, {
      bounds: FLAT_BOUNDS,
    });
    const speed = Math.hypot(k.vx, k.vz);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(6);
  });

  it('brakes to a stop after input is released', () => {
    const moving = run({ x: 1, z: 0 }, 60);
    const stopped = run({ x: 0, z: 0 }, 60, {}, moving);
    expect(Math.hypot(stopped.vx, stopped.vz)).toBe(0);
    // Braking distance is bounded (~0.45 m at 6 m/s, 40 m/s²) — no coasting.
    expect(Math.hypot(stopped.x - moving.x, stopped.z - moving.z)).toBeLessThan(1);
  });
});

describe('movementStep — collision stop', () => {
  // A box the player walks into from the left, head-on along +X.
  const WALL: Box = { minX: 4, minZ: -2, maxX: 8, maxZ: 2 };

  it('stops at the box face and never penetrates (circle radius respected)', () => {
    const k = run({ x: 1, z: 0 }, 240, { colliders: [WALL] });
    expect(k.x).toBeLessThanOrEqual(WALL.minX - 0.45 + 1e-9);
    expect(k.vx).toBe(0); // blocked axis velocity is zeroed
  });

  it('slides along the wall when moving diagonally into it', () => {
    // Long wall face: the diagonal walker stays inside its z-range while
    // pressing into it (a short box would be walked around at the corner).
    const LONG_WALL: Box = { minX: 4, minZ: -20, maxX: 8, maxZ: 2 };
    const k = run({ x: 1, z: -1 }, 240, { colliders: [LONG_WALL] });
    expect(k.x).toBeLessThanOrEqual(LONG_WALL.minX - 0.45 + 1e-9); // X blocked…
    expect(k.z).toBeLessThan(-4); // …but Z kept moving along the face
  });

  it('stays stopped while input keeps pressing into the wall', () => {
    const atWall = run({ x: 1, z: 0 }, 240, { colliders: [WALL] });
    const stillThere = run({ x: 1, z: 0 }, 120, { colliders: [WALL] }, atWall);
    expect(stillThere.x).toBeLessThanOrEqual(WALL.minX - 0.45 + 1e-9);
  });

  it('does not block movement away from the wall', () => {
    const atWall = run({ x: 1, z: 0 }, 240, { colliders: [WALL] });
    const away = run({ x: -1, z: 0 }, 30, { colliders: [WALL] }, atWall);
    expect(away.x).toBeLessThan(atWall.x - 1);
    expect(away.vx).toBeLessThan(0);
  });
});

describe('movementStep — bounds', () => {
  it('clamps position to worldBounds minus radius on every side', () => {
    const r = 0.45;
    const cases: Array<{ start: Partial<Kinematics>; input: MoveVector; edge: number }> = [
      { start: { x: 29.8, z: 0 }, input: { x: 1, z: 0 }, edge: FLAT_BOUNDS.maxX - r },
      { start: { x: -29.8, z: 0 }, input: { x: -1, z: 0 }, edge: FLAT_BOUNDS.minX + r },
      { start: { x: 0, z: 29.8 }, input: { x: 0, z: 1 }, edge: FLAT_BOUNDS.maxZ - r },
      { start: { x: 0, z: -29.8 }, input: { x: 0, z: -1 }, edge: FLAT_BOUNDS.minZ + r },
    ];
    for (const c of cases) {
      const k = run(c.input, 120, {}, spawn(c.start));
      const pos = c.input.x !== 0 ? k.x : k.z;
      expect(pos).toBeCloseTo(c.edge, 9);
    }
  });

  it('zeroes velocity into the bound so speed reads honestly', () => {
    const k = run({ x: 1, z: 0 }, 120, {}, spawn({ x: 29.8, z: 0 }));
    expect(k.vx).toBe(0);
  });
});

describe('movementStep — contract hygiene', () => {
  it('does not mutate the state or input it is given (pure function)', () => {
    const before: Kinematics = { x: 1, z: 2, vx: 0.5, vz: -0.5, yaw: 0.3 };
    const input: MoveVector = { x: 1, z: -0.25 };
    const snapshot = { ...before };
    const inputSnapshot = { ...input };

    movementStep(before, input, DT, NO_BOXES, { bounds: FLAT_BOUNDS });

    expect(before).toEqual(snapshot);
    expect(input).toEqual(inputSnapshot);
  });

  it('returns an unchanged copy when dt is zero or negative', () => {
    const k = spawn({ x: 3, z: 4, vx: 1, vz: 1, yaw: 0.5 });
    expect(movementStep(k, { x: 1, z: 1 }, 0, NO_BOXES, { bounds: FLAT_BOUNDS })).toEqual(k);
    expect(movementStep(k, { x: 1, z: 1 }, -1 / 60, NO_BOXES, { bounds: FLAT_BOUNDS })).toEqual(k);
  });
});
