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
 *     When the displacement this frame exceeds WALL_THICKNESS_M (0.24 m —
 *     the compound wall thickness), the step is split into sub-steps so a
 *     thin wall cannot be tunneled through at high speed / low framerate.
 *  5. Position is hard-clamped to the world bounds (WORLD_MIN/MAX minus
 *     capsule radius) every frame.
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
  /**
   * Max travel per sub-step (metres). Defaults to WALL_THICKNESS_M so a
   * single integrate cannot jump past a compound wall (0.24 m thick).
   */
  maxSubstepM?: number;
}

export const DEFAULT_MOVEMENT = {
  maxSpeed: 6,
  accel: 40,
  radius: 0.45,
} as const;

/**
 * Compound wall thickness on the starter block (layout COMPOUND.walls are
 * 0.24 m deep). Any integrate step longer than this is split so fast
 * movement / large dt cannot tunnel through.
 */
export const WALL_THICKNESS_M = 0.24;

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
  const maxSubstepM = config.maxSubstepM ?? WALL_THICKNESS_M;

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

  // 4. Integrate with sub-steps when the full-frame travel would exceed the
  //    thinnest solid (compound wall 0.24 m). One axis at a time → slide.
  let x = state.x;
  let z = state.z;
  const travel = Math.hypot(vx * dt, vz * dt);
  const subSteps = Math.max(1, Math.ceil(travel / Math.max(maxSubstepM, 1e-6)));
  const subDt = dt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    const nextX = x + vx * subDt;
    if (circleHitsAny(nextX, z, radius, colliders)) vx = 0;
    else x = nextX;

    const nextZ = z + vz * subDt;
    if (circleHitsAny(x, nextZ, radius, colliders)) vz = 0;
    else z = nextZ;
  }

  // 5. Hard clamp to WORLD_MIN/MAX minus capsule radius; zero velocity into wall.
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
