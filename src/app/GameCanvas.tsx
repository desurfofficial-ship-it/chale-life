/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk
 * (G-008e follow-up: the 2.2 MB single-bundle build).
 *
 * Everything that pulls three.js / @react-three/fiber / the Accra map
 * lives HERE: the Canvas, the loop, the player rig, the objective marker,
 * the camera and the whole world. App.tsx lazy-loads this module, so:
 *   - the DOM shell (store, rules, HUD, joystick, keyboard, debug
 *     overlay) paints FIRST while this chunk streams in;
 *   - a visitor without WebGL never downloads it at all — App checks
 *     isWebGLAvailable() before ever importing this module;
 *   - the main chunk drops to the shell's own weight.
 *
 * The Canvas contract is unchanged from when it lived in App.tsx:
 * orthographic R3F frustum (resize-correct), `shadows="percentage"` for
 * the shadow-map pass the world's Lighting expects, dpr capped at 1.25,
 * and component order — <GameLoop /> mounts (and subscribes) first so the
 * transform it writes this frame is what <Player />, <CameraRig /> and
 * <ObjectiveMarker /> consume this same frame. <AccraWorld /> (the Accra
 * map, v6) owns ALL scene lighting — this file adds no lights.
 *
 * Spawn does NOT happen here: initializePlayerSpawn() runs at App's
 * module-import time so the store, camera and HUD start on the compound
 * gate even before this chunk arrives.
 */

import { Canvas } from '@react-three/fiber';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { AccraWorld } from '../world';

export default function GameCanvas() {
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
      <AccraWorld />
      <Player />
      <ObjectiveMarker />
      <CameraRig />
    </Canvas>
  );
}
