/**
 * Composition root for the game (E-001 moved the old src/r3f/World.tsx shell
 * in here; E-002 mounts the real World and the real HUD; E-003 wires the
 * Earn-and-eat loop through it).
 *
 * G-008e follow-up — CODE-SPLIT: the whole 3D subtree (three.js + R3F + the
 * Accra map, ~2 MB of the old single bundle) moved to GameCanvas.tsx and is
 * lazy-loaded below. This file stays the light shell: WebGL gate, store
 * wiring, HUD, joystick, keyboard, debug overlay. The HUD paints while the
 * world chunk streams in, and a no-WebGL visitor never downloads it.
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

import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { initializePlayerSpawn } from '../engine/spawn';
import { isOnboardingActive, OnboardingOverlay } from '../onboarding/Onboarding';
import SetTheMood from '../room/SetTheMood';
import { initKeyboardInput } from '../input/inputManager';
import { Joystick } from '../input/Joystick';
import { RecenterButton } from '../input/RecenterButton';
import { actPromptFor, promptCooldownLive } from '../rules/act';
import {
  getActPromptOverride,
  getState,
  requestAct,
  subscribe,
  type ActPromptOverride,
  type GameState,
  requestRotate90,
  setZoom,
  getZoom,
} from '../store/gameStore';
import {
  advanceClock,
  clockLabel,
  getTycoonState,
  landPlotToRef,
  onVisibilityChange,
  requestBuyPlot,
  requestOpenBusiness,
  setActiveTab,
  setSelectedPlotId,
  setTycoonMode,
  requestFitCity,
  requestFitMyBusinesses,
  requestFocusPlot,
  requestFocusPlot,

  subscribeTycoon,
  weatherIcon,
} from '../store/tycoonStore';
import { LAND_PLOTS } from '../lib/mapConfig';
import { onWorldEvent } from '../world/tycoon/worldEvents';
import { Hud, TycoonHud, useCountdownNow } from '../ui';
import { CameraRail } from '../ui/tycoon/CameraRail';
import type { PlotRef } from '../rules/business';
import { DebugOverlay } from './DebugOverlay';
import { isWebGLAvailable } from './webgl';

// The 3D world — three.js + R3F + the whole Accra map live behind this
// boundary (see GameCanvas.tsx). Loaded only after first paint, and never
// for a no-WebGL visitor (the WebGL gate below returns before rendering it).
const GameCanvas = lazy(() => import('./GameCanvas'));

// Spawn ONCE at composition-root import, before React renders: the store,
// camera and HUD start at the starter compound gate (LOC-002), never inside
// a collider (see src/engine/spawn.ts).
initializePlayerSpawn();

/** Primitive-selector store read — mirrors the Hud's own plumbing. */
function useStoreValue<T>(select: (state: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()));
}

/** Tycoon store subscribe (primitive selector). */
function useTycoonValue<T>(select: (s: ReturnType<typeof getTycoonState>) => T): T {
  return useSyncExternalStore(subscribeTycoon, () => select(getTycoonState()));
}

function plotById(id: string | null): PlotRef | null {
  if (!id) return null;
  const raw = LAND_PLOTS.find((p) => (p.id ?? '') === id);
  return raw ? landPlotToRef(raw) : null;
}


/** Merge the e2e prompt override over the rules prompt (field-by-field). */
function applyPromptOverride(
  base: ReturnType<typeof actPromptFor>,
  override: ActPromptOverride | null
): ReturnType<typeof actPromptFor> {
  if (!override) return base;
  return {
    label: override.label ?? base.label,
    enabled: override.enabled ?? base.enabled,
    ...(override.reason !== undefined
      ? override.reason !== null
        ? { reason: override.reason }
        : {} // null clears the line
      : base.reason !== undefined
        ? { reason: base.reason }
        : {}),
  };
}

export function App() {
  // Room dresser (Gyan house interior) — standalone mode from onboarding CTA
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mood') === '1') {
    return <SetTheMood />;
  }

  const [webglOk] = useState(isWebGLAvailable);

  // E-010: ?tycoon=1 enables the overlay; World emits plotSelected (W-007)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('tycoon') === '1' || q.get('tycoonDemo') === '1') {
      setTycoonMode(true);
      // Don't pre-select when demo — wait for plotSelected / e2e
      if (q.get('tycoon') === '1' && q.get('e2e') !== '1') {
        const first = LAND_PLOTS[0];
        if (first?.id) setSelectedPlotId(first.id);
      }
    }
    return onWorldEvent('plotSelected', ({ plotId }) => {
      setTycoonMode(true);
      setSelectedPlotId(plotId);
      setActiveTab('property');
    });
  }, []);

  // E-010: game clock + offline catch-up
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (getTycoonState().tycoonMode) advanceClock(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => onVisibilityChange(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);


  // Keyboard input for the whole app (WASD/arrows + E/Space Act, E-003);
  // disposed on unmount (StrictMode-safe).
  useEffect(() => initKeyboardInput(), []);

  // Act-prompt inputs — primitive selectors, so this component only
  // re-renders when one of them actually flips (enter/leave a location,
  // job state change, wallet/needs commit, toast arrive/expire).
  const balance = useStoreValue((s) => s.wallet.balanceGHS);
  const hunger = useStoreValue((s) => s.needs.hunger);
  const energy = useStoreValue((s) => s.needs.energy);
  // G-008c round 2: the sachet-water rest's anchor — the Act pill near
  // Maame Effia's counts the 20 s rest down from the same data the store
  // presses against (flips exactly when a water purchase commits).
  const lastWaterAt = useStoreValue((s) => s.needs.lastWaterAt);
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

  // G-008e follow-up: the prompt clock is a STANDALONE 1 Hz tick, not the
  // drain cadence — both countdown reasons ("Daavi needs you again in Ns",
  // "Water again in Ns") must tick every second even when the needs drain
  // is paused (capped needs commit nothing, and the old Date.now() read
  // only re-evaluated on a re-render). With no countdown live the clock
  // is frozen and no timer runs at all.
  const nowMs = useCountdownNow(lastPayoutAt ?? lastWaterAt, (t) =>
    promptCooldownLive(t, lastPayoutAt, lastWaterAt)
  );

  // Pure rules projection of the store snapshot — what the Act button says.
  // G-008c: nowMs is the wall-clock NOW the job cooldown counts against;
  // the standalone 1 Hz prompt clock keeps this component re-rendering
  // while a countdown is live, so the "Daavi needs you again in Ns" reason
  // ticks down live under the pill.
  const rulesPrompt = actPromptFor(
    {
      wallet: { balanceGHS: balance },
      needs: { hunger, energy, lastWaterAt },
      job: { activeId, step, completedIds, lastPayoutAt },
      nowMs,
    },
    nearLocationId
  );
  // G-008d item 7: the ?e2e=1 layout hook may re-dress the prompt (the
  // longest label/reason, forced deterministically). Presentation-only —
  // requestAct always decides from the real rules below this.
  const override = useStoreValue(() => getActPromptOverride());
  const prompt = applyPromptOverride(rulesPrompt, override);

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


  const tycoonMode = useTycoonValue((s) => s.tycoonMode);
  const tycoonCash = useStoreValue((s) => s.wallet.balanceGHS);
  const tycoonDay = useTycoonValue((s) => s.clock.day);
  const tycoonClock = useTycoonValue((s) => s.clock);
  const tycoonWeather = useTycoonValue((s) => s.weather);
  const tycoonQuest = useTycoonValue((s) => s.quest);
  const tycoonSelectedId = useTycoonValue((s) => s.selectedPlotId);
  const tycoonOwned = useTycoonValue((s) => s.ownedPlotIds);
  const tycoonBiz = useTycoonValue((s) => s.businesses);
  const tycoonAlerts = useTycoonValue((s) => s.alerts);
  const tycoonTab = useTycoonValue((s) => s.activeTab);
  const selectedPlot = plotById(tycoonSelectedId);

  if (!webglOk) return <WebGLFallback />;

  return (
    <>
      {/* Code-split world: the shell (HUD, joystick, debug) paints while
          this chunk streams in; the fallback disappears with it. */}
      <Suspense fallback={<CanvasLoading />}>
        <GameCanvas />
      </Suspense>
      {/* G-001 HUD + E-003 Act wiring: label/enabled from actPromptFor on the
          store snapshot, toast from resolveAct via the store (2 s lifetime
          is the Hud's own). */}
      {isOnboardingActive() ? <OnboardingOverlay /> : hud}
      {!tycoonMode && !isOnboardingActive() ? (
        <button
          type="button"
          onClick={() => setTycoonMode(true)}
          style={{
            position: 'absolute',
            right: 12,
            top: 'max(12px, env(safe-area-inset-top))',
            zIndex: 30,
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 12,
            border: 'none',
            background: '#2d5a3d',
            color: '#f5f0e6',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          City
        </button>
      ) : null}
      {tycoonMode ? (
        <button
          type="button"
          onClick={() => setTycoonMode(false)}
          style={{
            position: 'absolute',
            left: 12,
            top: 'max(12px, env(safe-area-inset-top))',
            zIndex: 45,
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 12,
            border: 'none',
            background: '#c4a035',
            color: '#1a1a1a',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          Walk
        </button>
      ) : null}

      {/* During cinematic, skip joystick/recenter — cards own the taps */}
      {tycoonMode ? (
        <TycoonHud
          cashGHS={tycoonCash}
          day={tycoonDay}
          clockLabel={clockLabel(tycoonClock)}
          weatherIcon={weatherIcon(tycoonWeather)}
          quest={tycoonQuest}
          selectedPlot={selectedPlot}
          ownedPlotIds={tycoonOwned}
          businesses={tycoonBiz}
          alerts={tycoonAlerts}
          activeTab={tycoonTab}
          onTab={setActiveTab}
          onBuyPlot={requestBuyPlot}
          onOpenBusiness={requestOpenBusiness}
          onCloseSheet={() => setSelectedPlotId(null)}
        />
      ) : null}
      {tycoonMode ? (
        <CameraRail
          onZoomIn={() => setZoom(getZoom() * 1.25)}
          onZoomOut={() => setZoom(getZoom() / 1.25)}
          onRotate={() => requestRotate90()}
          onFitCity={() => requestFitCity()}
        />
      ) : null}
      {!isOnboardingActive() ? (
        <>
          <Joystick />
          <RecenterButton />
        </>
      ) : null}
      <DebugOverlay />
    </>
  );
}

/** Chunk-load placeholder — paints while the world code-split streams in. */
function CanvasLoading() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      Loading Accra…
    </div>
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
