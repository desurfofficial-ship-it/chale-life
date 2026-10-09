/**
 * Composition root for the game (E-001 moved the old src/r3f/World.tsx shell
 * in here; E-002 mounts the real World and the real HUD; E-003 wires the
 * Earn-and-eat loop through it).
 *
 * Canvas is orthographic: R3F keeps the frustum correct on resize while the
 * rig (src/engine/CameraRig.tsx) owns zoom/follow at runtime. Component order
 * inside the Canvas matters — <GameLoop /> mounts (and subscribes) first so
 * the transform it writes this frame is what <Player />, <CameraRig /> and
 * <ObjectiveMarker /> consume this same frame. <StarterBlock /> owns ALL
 * scene lighting (its Lighting component) — this file adds no lights.
 *
 * `shadows="percentage"` enables the shadow-map pass the World's Lighting
 * expects (its meshes set castShadow/receiveShadow) — three r186 only ships
 * PCF shadow maps, so this is the closest match to the intended soft look.
 * Cost: one extra draw pass, still far under the 150-call budget (?debug=1).
 *
 * DOM overlays (HUD, joystick, Recenter, ?debug=1) are plain siblings above
 * the canvas — no <Html distanceFactor> under the ortho camera, ever (CI
 * guards this in scripts/check-html-labels.sh).
 *
 * E-003 HUD feed: this component reads the store through PRIMITIVE
 * useSyncExternalStore selectors (wallet, needs, job, nearLocationId, toast
 * message), projects them through the pure rules/act.ts `actPromptFor`, and
 * passes the label/enabled/toast into <Hud /> as props. The Hud's own cards
 * still read the store directly — every HUD value ultimately comes from the
 * store, never from component state. The memo keeps the Hud subtree from
 * re-rendering unless one of its props actually changed (needs drain
 * commits ~1 Hz; hunger is a Hud-internal selector, not a prop, so a drain
 * tick alone does not re-render this component at all).
 *
 * E-004: the ActSession projection carries the job's `completedIds` run
 * history, so the G-004 earn-first rules see a completed shift — after the
 * payout the Act offers waakye instead of re-hiring. The array identity is
 * stable while a shift advances; it flips only when a payout latches.
 */

import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { initializePlayerSpawn } from '../engine/spawn';
import { initKeyboardInput } from '../input/inputManager';
import { Joystick } from '../input/Joystick';
import { RecenterButton } from '../input/RecenterButton';
import { Player } from '../player/Player';
import { actPromptFor } from '../rules/act';
import {
  INITIAL_ZOOM,
  getState,
  requestAct,
  subscribe,
  type GameState,
} from '../store/gameStore';
import { Hud } from '../ui';
import { StarterBlock } from '../world';
import { DebugOverlay } from './DebugOverlay';
import { isWebGLAvailable } from './webgl';

// Spawn ONCE at composition-root import, before React renders: the store,
// camera and HUD start at the starter compound gate (LOC-002), never inside
// a collider (see src/engine/spawn.ts).
initializePlayerSpawn();

/** Primitive-selector store read — mirrors the Hud's own plumbing. */
function useStoreValue<T>(select: (state: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()));
}

export function App() {
  const [webglOk] = useState(isWebGLAvailable);

  // Keyboard input for the whole app (WASD/arrows + E/Space Act, E-003);
  // disposed on unmount (StrictMode-safe).
  useEffect(() => initKeyboardInput(), []);

  // Act-prompt inputs — primitive selectors, so this component only
  // re-renders when one of them actually flips (enter/leave a location,
  // job state change, wallet/needs commit, toast arrive/expire).
  const balance = useStoreValue((s) => s.wallet.balanceGHS);
  const hunger = useStoreValue((s) => s.needs.hunger);
  const energy = useStoreValue((s) => s.needs.energy);
  const activeId = useStoreValue((s) => s.job.activeId);
  const step = useStoreValue((s) => s.job.step);
  // E-004: array identity is stable while a shift advances; it flips only on
  // a payout latch, so this selector re-renders exactly when history changes.
  const completedIds = useStoreValue((s) => s.job.completedIds);
  // G-008c: the payout stamp the cooldown counts from (primitive — flips
  // exactly when a payout commits, like completedIds above).
  const lastPayoutAt = useStoreValue((s) => s.job.lastPayoutAt);
  const nearLocationId = useStoreValue((s) => s.nearLocationId);
  const toastMessage = useStoreValue((s) => s.toast.message);

  // Pure rules projection of the store snapshot — what the Act button says.
  // G-008c: nowMs is the wall-clock NOW the job cooldown counts against;
  // the ~1 Hz needs drain keeps this component re-rendering, so the
  // "Daavi needs you again in Ns" reason ticks down live under the pill.
  const prompt = actPromptFor(
    {
      wallet: { balanceGHS: balance },
      needs: { hunger, energy },
      job: { activeId, step, completedIds, lastPayoutAt },
      nowMs: Date.now(),
    },
    nearLocationId
  );

  // The Hud re-renders itself from the store; only prop changes need it to
  // re-render from here (label/enabled flip on enter/leave, toast per Act).
  // G-008b item 6: prompt.reason feeds the disabled hint under the pill.
  const hud = useMemo(
    () => (
      <Hud
        onAct={requestAct}
        actLabel={prompt.label}
        actEnabled={prompt.enabled}
        actReason={prompt.reason ?? null}
        toast={toastMessage}
      />
    ),
    [prompt.label, prompt.enabled, prompt.reason, toastMessage]
  );

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
        {/* Background + fog owned by Lighting (B-003b — no duplicate). */}
        <GameLoop />
        <StarterBlock />
        <Player />
        <ObjectiveMarker />
        <CameraRig />
      </Canvas>
      {/* G-001 HUD + E-003 Act wiring: label/enabled from actPromptFor on the
          store snapshot, toast from resolveAct via the store (2 s lifetime
          is the Hud's own). */}
      {hud}
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
          This game draws its world with WebGL, and your browser couldn't
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
