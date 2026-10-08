/**
 * movementStep — the pure walking rule for the player capsule.
 *
 *   movementStep(state, input, dt, colliders, config?) => newState
 *
 * Deterministic and side-effect free: same inputs → same output, the state you
 * pass in is never mutated. That is what makes it unit-testable (direction,
 * speed cap, collision stop, bounds) and what lets gameplay rules later compose
 * with it as `(state, input) => newState`.
 *
 * Behaviour:
 *  1. Input magnitude is clamped to 1, so diagonal/analog-overshoot never runs
 *     faster than straight input (speed cap).
 *  2. The screen-space input vector is rotated into camera-relative world
 *     direction (`config.cameraYaw`). With the default yaw 0 (camera looking
 *     from +Z, as in src/app/App.tsx) screen-up = world −Z.
 *  3. Velocity accelerates toward `input magnitude × maxSpeed` with a limited
 *     acceleration (analog stick pressure = slower walk; release = braking).
 *  4. Movement integrates one axis at a time against circle-vs-box collision —
 *     blocking an axis while the other still moves gives free wall sliding.
 *  5. Position is hard-clamped to the world bounds (minus capsule radius).
 *  6. Yaw follows the direction of travel (three.js convention: yaw 0 = +Z).
 *
 * Tuning lives in DEFAULT_MOVEMENT; the visual capsule radius in
 * src/player/Player.tsx must stay in sync with `radius`.
 */

import { circleHitsAny, clampToBounds, type Box } from './collision';
import { worldBounds } from '../world/colliders';

/** Analog move vector, screen-space: +x = right, +z = down/toward camera. */
export interface MoveVector {
  x: number;
  z: number;
}

/** Integrable kinematic state of the player capsule. */
export interface Kinematics {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Facing angle in radians; 0 = +Z, grows toward +X (three.js Y-rotation). */
  yaw: number;
}

export interface MovementConfig {
  /** Camera yaw in radians; input is rotated into this frame. Default 0. */
  cameraYaw?: number;
  /** Top speed in m/s. Default 6. */
  maxSpeed?: number;
  /** Acceleration toward target velocity in m/s². Default 40. */
  accel?: number;
  /** Capsule (collision) radius in m. Default 0.45. */
  radius?: number;
  /** Hard world bounds. Defaults to the World contract's `worldBounds`. */
  bounds?: Box;
}

export const DEFAULT_MOVEMENT = {
  maxSpeed: 6,
  accel: 40,
  radius: 0.45,
} as const;

export function movementStep(
  state: Kinematics,
  input: MoveVector,
  dt: number,
  colliders: readonly Box[],
  config: MovementConfig = {},
): Kinematics {
  if (!(dt > 0)) return { ...state };

  const maxSpeed = config.maxSpeed ?? DEFAULT_MOVEMENT.maxSpeed;
  const accel = config.accel ?? DEFAULT_MOVEMENT.accel;
  const radius = config.radius ?? DEFAULT_MOVEMENT.radius;
  const cameraYaw = config.cameraYaw ?? 0;
  const bounds = config.bounds ?? worldBounds;

  // 1. Clamp input magnitude to 1 — diagonals are never faster than straight.
  let ix = Number.isFinite(input.x) ? input.x : 0;
  let iz = Number.isFinite(input.z) ? input.z : 0;
  const mag = Math.hypot(ix, iz);
  if (mag > 1) {
    ix /= mag;
    iz /= mag;
  } else if (mag < 1e-6) {
    ix = 0;
    iz = 0;
  }

  // 2. Rotate screen-space input into the camera-relative world direction.
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  const dirX = ix * cos + iz * sin;
  const dirZ = iz * cos - ix * sin;

  // 3. Accelerate velocity toward the target (analog magnitude × top speed).
  const targetVx = dirX * maxSpeed;
  const targetVz = dirZ * maxSpeed;
  let vx = state.vx;
  let vz = state.vz;
  const dvx = targetVx - vx;
  const dvz = targetVz - vz;
  const dvLen = Math.hypot(dvx, dvz);
  const maxDv = accel * dt;
  if (dvLen <= maxDv || dvLen === 0) {
    vx = targetVx;
    vz = targetVz;
  } else {
    vx += (dvx / dvLen) * maxDv;
    vz += (dvz / dvLen) * maxDv;
  }

  // 4. Integrate + resolve one axis at a time (blocked axis stops, the other
  //    keeps moving → wall sliding falls out for free).
  let x = state.x;
  let z = state.z;
  const nextX = x + vx * dt;
  if (circleHitsAny(nextX, z, radius, colliders)) vx = 0;
  else x = nextX;
  const nextZ = z + vz * dt;
  if (circleHitsAny(x, nextZ, radius, colliders)) vz = 0;
  else z = nextZ;

  // 5. Hard clamp to the world bounds, zeroing velocity into the wall.
  const bounded = clampToBounds(x, z, radius, bounds);
  x = bounded.x;
  z = bounded.z;
  if (bounded.hitX) vx = 0;
  if (bounded.hitZ) vz = 0;

  // 6. Face the direction of travel (deadband avoids jitter around 0 speed).
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.05 ? Math.atan2(vx, vz) : state.yaw;

  return { x, z, vx, vz, yaw };
}
