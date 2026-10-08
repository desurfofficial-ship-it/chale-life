/**
 * Composition root for the game (E-001 moved the old src/r3f/World.tsx shell
 * in here; E-002 mounts the real World and the real HUD).
 *
 * Canvas is orthographic: R3F keeps the frustum correct on resize while the
 * rig (src/engine/CameraRig.tsx) owns zoom/follow at runtime. Component order
 * inside the Canvas matters — <GameLoop /> mounts (and subscribes) first so
 * the transform it writes this frame is what <Player /> and <CameraRig />
 * consume this same frame. <StarterBlock /> owns ALL scene lighting (its
 * Lighting component) — this file adds no lights.
 *
 * `shadows="percentage"` enables the shadow-map pass the World's Lighting
 * expects (its meshes set castShadow/receiveShadow) — three r186 only ships
 * PCF shadow maps, so this is the closest match to the intended soft look.
 * Cost: one extra draw pass, still far under the 150-call budget (?debug=1).
 *
 * DOM overlays (HUD, joystick, Recenter, ?debug=1) are plain siblings above
 * the canvas — no <Html distanceFactor> under the ortho camera, ever (CI
 * guards this in scripts/check-html-labels.sh).
 */

import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { initializePlayerSpawn } from '../engine/spawn';
import { initKeyboardInput } from '../input/inputManager';
import { Joystick } from '../input/Joystick';
import { RecenterButton } from '../input/RecenterButton';
import { Player } from '../player/Player';
import { INITIAL_ZOOM, requestAct } from '../store/gameStore';
import { Hud } from '../ui';
import { StarterBlock } from '../world';
import { DebugOverlay } from './DebugOverlay';
import { isWebGLAvailable } from './webgl';

// Spawn ONCE at composition-root import, before React renders: the store,
// camera and HUD start at the starter compound gate (LOC-002), never inside
// a collider (see src/engine/spawn.ts).
initializePlayerSpawn();

export function App() {
  const [webglOk] = useState(isWebGLAvailable);

  // Keyboard input for the whole app; disposed on unmount (StrictMode-safe).
  useEffect(() => initKeyboardInput(), []);

  if (!webglOk) return <WebGLFallback />;

  return (
    <>
      <Canvas
        orthographic
        shadows="percentage"
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 30, 30], zoom: INITIAL_ZOOM, near: 0.1, far: 200 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#090d16']} />
        <GameLoop />
        <StarterBlock />
        <Player />
        <CameraRig />
      </Canvas>
      {/* G-001's HUD, fed from the store only; Act is a no-op store action
          until the Earn-and-eat wiring task (src/store requestAct). */}
      <Hud onAct={requestAct} />
      <Joystick />
      <RecenterButton />
      <DebugOverlay />
    </>
  );
}

/** Shown when WebGL is missing (see src/app/webgl.ts). */
function WebGLFallback() {
  return (
    <div className="fallback">
      <div className="fallback__card">
        <h1>Chalé Life needs WebGL</h1>
        <p>
          This game draws its world with WebGL, and your browser couldn&apos;t
          create a WebGL context.
        </p>
        <p>
          Try a current version of Chrome, Safari or Firefox with hardware
          acceleration enabled, then reload this page.
        </p>
      </div>
    </div>
  );
}
