/**
 * THE single useFrame game loop (team rule: no second loops — hook systems in
 * here as pure steps). Each frame:
 *   movementInput (src/input) → movementStep (pure, src/engine/movement.ts)
 *   → setPlayerTransform (silent store write) → throttled HUD publish ≤10 Hz.
 *
 * dt is clamped so a tab-switch spike can't teleport the player through
 * geometry (max 50 ms per step; at 6 m/s that's 0.3 m < capsule radius).
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { movementStep, type Kinematics } from './movement';
import { colliders, worldBounds } from '../world/colliders';
import {
  getZoom,
  HUD_INTERVAL_S,
  movementInput,
  publishHud,
  setPlayerTransform,
} from '../store/gameStore';

const MAX_DT = 1 / 20;

export function GameLoop() {
  const kin = useRef<Kinematics>({ x: 0, z: 0, vx: 0, vz: 0, yaw: 0 });
  const hudTimer = useRef(0);
  const fps = useRef(60);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT);

    kin.current = movementStep(kin.current, movementInput, dt, colliders, {
      bounds: worldBounds,
    });
    const k = kin.current;
    setPlayerTransform(k.x, k.z, k.yaw);

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
      });
    }
  });

  return null;
}
