/**
 * Composition root for the game (E-001 moved the old src/r3f/World.tsx shell
 * in here and src/r3f was removed).
 *
 * Canvas is orthographic: R3F keeps the frustum correct on resize while the
 * rig (src/engine/CameraRig.tsx) owns zoom/follow at runtime. Component order
 * inside the Canvas matters — <GameLoop /> mounts (and subscribes) first so
 * the transform it writes this frame is what <Player /> and <CameraRig />
 * consume this same frame.
 *
 * DOM overlays (HUD shell, joystick, Recenter, ?debug=1) are plain siblings
 * above the canvas — no <Html distanceFactor> under the ortho camera, ever
 * (CI guards this in scripts/check-html-labels.sh).
 */

import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { initKeyboardInput } from '../input/inputManager';
import { Joystick } from '../input/Joystick';
import { RecenterButton } from '../input/RecenterButton';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { Shell } from '../ui/Shell';
import { DebugOverlay } from './DebugOverlay';
import { GroundPlane } from './GroundPlane';
import { isWebGLAvailable } from './webgl';

export function App() {
  const [webglOk] = useState(isWebGLAvailable);

  // Keyboard input for the whole app; disposed on unmount (StrictMode-safe).
  useEffect(() => initKeyboardInput(), []);

  if (!webglOk) return <WebGLFallback />;

  return (
    <>
      <Canvas
        orthographic
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 30, 30], zoom: INITIAL_ZOOM, near: 0.1, far: 200 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#090d16']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 40, 15]} intensity={1} />
        <GameLoop />
        <GroundPlane />
        <Player />
        <CameraRig />
      </Canvas>
      <Shell />
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
