/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk
 * (G-008e follow-up: the 2.2 MB single-bundle build).
 *
 * W-007: ?tycoonDemo=1 injects four open businesses so World can prove the
 * tycoon layer before E-010 wires the store. Props are pure view data —
 * no store imports inside AccraWorld / TycoonLayer.
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { AccraWorld } from '../world';
import { buildTycoonDemoProps, type TycoonWorldProps } from '../world/tycoon';

function readTycoonProps(): TycoonWorldProps | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get('tycoonDemo') === '1') return buildTycoonDemoProps();
  return null;
}

export default function GameCanvas() {
  const tycoon = useMemo(() => readTycoonProps(), []);

  return (
    <Canvas
      orthographic
      shadows="percentage"
      dpr={[1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 60, 60], zoom: INITIAL_ZOOM, near: 0.1, far: 900 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Background + fog owned by Lighting (B-003b — no duplicate). */}
      <GameLoop />
      <AccraWorld tycoon={tycoon} />
      <Player />
      <ObjectiveMarker />
      <CameraRig />
    </Canvas>
  );
}
