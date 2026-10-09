/**
 * One game store — position, wallet, needs, job, home, time.
 * The 3D world and the HUD both read from here. No window bridges.
 *
 * Owner: Agent 2 (Engine & Platform). Reading rules (see src/store/README.md):
 *  - `position` / `yaw` are written EVERY FRAME by the engine loop via
 *    `setPlayerTransform` (silent — no notifications). Systems that need them
 *    poll `getState()` inside their own frame callback; React components must
 *    never subscribe to them (it would re-render at 60 fps).
 *  - HUD / debug UI subscribes ONLY to the throttled HUD channel:
 *    `subscribeHud` / `getHud` — republished at most ~10×/s by the engine loop.
 *  - The notifying setters (`setPlayerPosition`, `setPlayerYaw`) stay for
 *    teleports / gameplay wiring; the frame loop must not use them.
 *  - Gameplay rules (Agent 4) are pure `(state, input) => newState` functions;
 *    Engine wires them into this store when asked (G-001 handshake).
 *  - E-002: the HUD (src/ui) is mounted by src/app/App.tsx and fed from the
 *    slices below.
 *  - E-003: Earn-and-eat is wired. `requestAct()` samples the store into a
 *    rules/act.ts ActSession, calls the pure `resolveAct` and commits the
 *    result back; `nearLocationId` is the ≤2.5 m location probe the GameLoop
 *    maintains; `toast` carries the last Act toast + its arrival timestamp
 *    (auto-expires). `tickNeedsDrain` is the store-side drain commit the
 *    GameLoop calls ~1 Hz with the starter profile.
 *  - E-004: the job slice is `{ activeId, step, completedIds }` —
 *    completedIds is the run's completed-shift history (G-004 earn-first
 *    flag) and the ONE source of truth for "worked before"; the E-003
 *    `hasWorked` latch is retired (the objective marker reads
 *    completedIds.length).
 */

import { resolveAct, type ActSession } from '../rules/act';
import { drainNeeds } from '../rules/needs';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GameState {
  player: {
    position: Vec3;
    yaw: number;
  };
  wallet: { balanceGHS: number };
  needs: { hunger: number; energy: number };
  /**
   * E-004: completedIds = ids of shifts fully worked this run (G-004).
   * readonly like the rules' JobState — the store replaces the reference,
   * it never mutates the array in place.
   */
  job: { activeId: string | null; step: number; completedIds: readonly string[] };
  home: { tierId: string };
  time: { hour: number };
  /** E-003: id of the location within NEAR_LOCATION_RADIUS_M, else null. */
  nearLocationId: string | null;
  /** E-003: last Act toast and the Date.now() it arrived (auto-expires). */
  toast: { message: string | null; at: number };
}

type Listener = () => void;

const state: GameState = {
  player: { position: { x: 0, y: 0, z: 0 }, yaw: 0 },
  wallet: { balanceGHS: 20 },
  // Product start values (E-002): hunger begins at 72 (salvage NeedsSystem's
  // `hunger = 72`), energy full — full enough to hustle, hungry enough that
  // the waakye loop matters. Engine spawns the player onto LOC-002 at boot
  // via src/engine/spawn.ts; the origin here is just the pre-spawn neutral.
  needs: { hunger: 72, energy: 80 },
  job: { activeId: null, step: 0, completedIds: [] },
  home: { tierId: 'single_room' },
  time: { hour: 7 },
  nearLocationId: null,
  toast: { message: null, at: 0 },
};

const listeners = new Set<Listener>();

export function getState(): Readonly<GameState> {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function setPlayerPosition(x: number, y: number, z: number): void {
  state.player.position.x = x;
  state.player.position.y = y;
  state.player.position.z = z;
  notify();
}

export function setPlayerYaw(yaw: number): void {
  state.player.yaw = yaw;
  notify();
}

/**
 * Silent per-frame transform write used by the engine loop. No notification —
 * the HUD channel (≤10 Hz) is the only React-visible projection of the
 * transform. `y` stays 0 while movement is plane-walking (E-001 scope).
 */
export function setPlayerTransform(x: number, z: number, yaw: number): void {
  state.player.position.x = x;
  state.player.position.y = 0;
  state.player.position.z = z;
  state.player.yaw = yaw;
}

/** Joystick / keyboard input written each frame by the input layer. */
export const movementInput = { x: 0, z: 0, sprint: false };

/* ───────────────────────── E-001 additions (Engine) ───────────────────────── */

/** Orthographic camera zoom limits (zoom = px → world-m scale factor). */
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 70;
/** Initial zoom: ~28 m visible vertically on a 844 px-tall iPhone viewport. */
export const INITIAL_ZOOM = 30;
/** Max HUD notification rate: the engine loop republishes at most every 0.1 s. */
export const HUD_INTERVAL_S = 0.1;

let zoom = INITIAL_ZOOM;
let recenterToken = 0;

export function getZoom(): number {
  return zoom;
}

/** Clamped zoom write (pinch / wheel / Recenter-zoom all funnel through here). */
export function setZoom(next: number): void {
  if (!Number.isFinite(next)) return;
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
}

export function getRecenterToken(): number {
  return recenterToken;
}

/** Recenter button → bumps a token; CameraRig polls it each frame and snaps. */
export function requestRecenter(): void {
  recenterToken += 1;
}

/* ───────────────────────── E-003 additions (Engine) ─────────────────────── */

/** A location is "near" while the player stands within this radius (E-003). */
export const NEAR_LOCATION_RADIUS_M = 2.5;
/**
 * Needs drain cadence: the GameLoop accumulates clamped dt and commits at
 * most once per this many seconds (E-003: "commit at most ~1 Hz").
 */
export const NEEDS_DRAIN_INTERVAL_S = 1;
/**
 * Store-side toast linger. The HUD hides the toast after its own 2 s; the
 * store clears a little later so a REPEATED identical message re-triggers
 * the HUD's timer (null → message flip) instead of being swallowed.
 */
export const TOAST_LINGER_MS = 2200;

/**
 * Proximity write (E-003, called every frame by the GameLoop). No-op while
 * the value is unchanged, so walking around never spams notifications —
 * App's actPromptFor selectors only re-render on enter/leave.
 */
export function setNearLocationId(id: string | null): void {
  if (state.nearLocationId === id) return;
  state.nearLocationId = id;
  notify();
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** Commit an Act toast + arrival timestamp; schedule the store-side clear. */
function pushToast(message: string): void {
  const at = Date.now();
  state.toast = { message, at };
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastTimer = null;
    // Only clear OUR toast — a newer pushToast replaced the payload.
    if (state.toast.at === at && state.toast.message !== null) {
      state.toast = { message: null, at };
      notify();
    }
  }, TOAST_LINGER_MS);
}

/**
 * HUD Act button / keyboard Act key → Earn-and-eat handshake (E-003).
 * Samples the store into a pure rules/act.ts ActSession (including the
 * completedIds run history — G-004 earn-first), runs resolveAct against the
 * current nearLocationId, and commits the returned wallet, needs and job
 * slices back (identity-checked: resolveAct returns the SAME session when
 * the act was disabled/refused, so a no-op press never notifies). The
 * returned completedIds array is stored by reference: rules hand back the
 * SAME array while a shift just advances (no re-render churn) and a fresh,
 * deduped array only when a payout latches a shift (E-004).
 */
export function requestAct(): void {
  const session: ActSession = {
    wallet: { balanceGHS: state.wallet.balanceGHS },
    needs: { hunger: state.needs.hunger, energy: state.needs.energy },
    job: {
      activeId: state.job.activeId,
      step: state.job.step,
      completedIds: state.job.completedIds,
    },
  };

  const { session: next, toast } = resolveAct(session, state.nearLocationId);

  let changed = false;
  if (next.wallet !== session.wallet) {
    state.wallet.balanceGHS = next.wallet.balanceGHS;
    changed = true;
  }
  if (next.needs !== session.needs) {
    state.needs.hunger = next.needs.hunger;
    state.needs.energy = next.needs.energy;
    changed = true;
  }
  if (next.job !== session.job) {
    state.job.activeId = next.job.activeId;
    state.job.step = next.job.step;
    // G-004 run history: rules return the same array while a shift advances
    // and a fresh deduped array when completeJob latches a payout.
    state.job.completedIds = next.job.completedIds ?? [];
    changed = true;
  }
  if (toast) {
    pushToast(toast);
    changed = true;
  }
  if (changed) notify();
}

/**
 * Store-side needs drain commit (E-003): the GameLoop accumulates clamped
 * dt and calls this ~1 Hz with the starter profile (3 hunger / 2 energy per
 * minute). dt ≤ 0 or > MAX_TICK_SECONDS leaves the state untouched (same
 * frame-spike guard as drainNeeds), so a stuck clock can't nuke the needs.
 */
export function tickNeedsDrain(dtSeconds: number): void {
  const next = drainNeeds(state.needs, dtSeconds, 'starter');
  if (next === state.needs) return; // guard tripped — nothing to commit
  state.needs.hunger = next.hunger;
  state.needs.energy = next.energy;
  notify();
}

export interface HudSnapshot {
  fps: number;
  x: number;
  z: number;
  yaw: number;
  inputX: number;
  inputZ: number;
  zoom: number;
  /** renderer.info.render.calls from the previous frame (perf budget ≤150). */
  drawCalls: number;
  /** Player projected to canvas CSS px (CameraRig, every frame via GameLoop). */
  screenX: number;
  screenY: number;
}

let hud: Readonly<HudSnapshot> = {
  fps: 0,
  x: state.player.position.x,
  z: state.player.position.z,
  yaw: state.player.yaw,
  inputX: 0,
  inputZ: 0,
  zoom: INITIAL_ZOOM,
  drawCalls: 0,
  screenX: 0,
  screenY: 0,
};

const hudListeners = new Set<(snapshot: Readonly<HudSnapshot>) => void>();

/** Snapshot for HUD / debug UI — the ONLY React-facing view of the transform. */
export function getHud(): Readonly<HudSnapshot> {
  return hud;
}

/**
 * Subscribe to HUD updates (≤ ~10/s). Signature matches React's
 * `useSyncExternalStore(subscribe, getSnapshot)` for selector-style reads.
 */
export function subscribeHud(fn: (snapshot: Readonly<HudSnapshot>) => void): () => void {
  hudListeners.add(fn);
  return () => hudListeners.delete(fn);
}

/** Called by the engine loop at most every HUD_INTERVAL_S seconds. */
export function publishHud(snapshot: HudSnapshot): void {
  hud = snapshot;
  for (const fn of hudListeners) fn(hud);
}
