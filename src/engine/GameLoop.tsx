/**
 * THE single useFrame game loop (team rule: no second loops — hook systems in
 * here as pure steps). Each frame:
 *   movementInput (src/input) → movementStep (pure, src/engine/movement.ts)
 *   → setPlayerTransform (silent store write)
 *   → nearest-location probe (≤2.5 m, store write ONLY on enter/leave, E-003)
 *   → needs-drain accumulation (starter profile, committed ~1 Hz via the
 *     store's tickNeedsDrain, paused while the tab is hidden, E-003)
 *   → throttled HUD publish ≤10 Hz.
 *
 * dt is clamped so a tab-switch spike can't teleport the player through
 * geometry (max 50 ms per step; at 6 m/s that's 0.3 m < capsule radius).
 * The same clamp feeds the drain accumulator, and drainNeeds' own
 * MAX_TICK_SECONDS guard backs it up — a stuck clock can never drain more
 * than a second's worth per commit.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { movementStep, type Kinematics } from './movement';
import { colliders, worldBounds } from '../world/colliders';
import { locations } from '../data/locations';
import { MAX_TICK_SECONDS } from '../rules/needs';
import {
  getZoom,
  getState,
  HUD_INTERVAL_S,
  movementInput,
  NEEDS_DRAIN_INTERVAL_S,
  NEAR_LOCATION_RADIUS_M,
  publishHud,
  setNearLocationId,
  setPlayerTransform,
  tickNeedsDrain,
} from '../store/gameStore';

const MAX_DT = 1 / 20;

export function GameLoop() {
  // Start from the store transform — src/engine/spawn.ts has already placed
  // the player at the starter compound gate before App rendered, so frame 1
  // continues from the spawn instead of telekinetically dragging the capsule
  // from the world origin.
  const start = getState().player;
  const kin = useRef<Kinematics>({
    x: start.position.x,
    z: start.position.z,
    vx: 0,
    vz: 0,
    yaw: start.yaw,
  });
  const hudTimer = useRef(0);
  const fps = useRef(60);
  const drainAcc = useRef(0);

  // E-003: pause the needs drain while the tab is hidden. rAF stops when
  // hidden anyway; dropping the half-accumulated second here means a hidden
  // tab never drains and resume never commits a stale burst.
  useEffect(() => {
    const onVisibility = (): void => {
      drainAcc.current = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT);

    kin.current = movementStep(kin.current, movementInput, dt, colliders, {
      bounds: worldBounds,
    });
    const k = kin.current;
    setPlayerTransform(k.x, k.z, k.yaw);

    // E-003 proximity: nearest location within NEAR_LOCATION_RADIUS_M of the
    // player (6 locations → 6 squared-distance checks, allocation-free).
    // setNearLocationId no-ops while unchanged, so this is free most frames.
    let nearest: string | null = null;
    let bestD2 = NEAR_LOCATION_RADIUS_M * NEAR_LOCATION_RADIUS_M;
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const dx = loc.x - k.x;
      const dz = loc.z - k.z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= bestD2) {
        bestD2 = d2;
        nearest = loc.id;
      }
    }
    setNearLocationId(nearest);

    // E-003 needs drain: accumulate clamped dt, commit at ~1 Hz. Each
    // frame's contribution is additionally capped at MAX_TICK_SECONDS so
    // even a pathological timer can't push one tick past the guard.
    if (!document.hidden) {
      drainAcc.current += Math.min(dt, MAX_TICK_SECONDS);
      if (drainAcc.current >= NEEDS_DRAIN_INTERVAL_S) {
        tickNeedsDrain(drainAcc.current);
        drainAcc.current = 0;
      }
    }

    // FPS EMA for the debug overlay.
    fps.current += (1 / Math.max(dt, 1e-4) - fps.current) * 0.05;

    // HUD budget: at most one notification per HUD_INTERVAL_S (~10/s).
    hudTimer.current += dt;
    if (hudTimer.current >= HUD_INTERVAL_S) {
      hudTimer.current = 0;
      publishHud({
        fps: fps.current,
        x: k.x,
        z: k.z,
        yaw: k.yaw,
        inputX: movementInput.x,
        inputZ: movementInput.z,
        zoom: getZoom(),
        // Draw calls of the LAST completed render (info auto-resets each
        // frame) — the ?debug=1 perf number for the ≤150 budget.
        drawCalls: state.gl.info.render.calls,
      });
    }
  });

  return null;
}
