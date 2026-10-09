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
import { clampNeed, drainNeeds } from '../rules/needs';

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
  /**
   * G-008c round 2: lastWaterAt is the epoch ms of the most recent sachet
   * water — the anchor the 20 s per-sachet rest counts from (rules read
   * it as pure data, paired with the press-time nowMs). Undefined =
   * never drunk this run. Threaded exactly like job.lastPayoutAt.
   */
  needs: { hunger: number; energy: number; lastWaterAt?: number };
  /**
   * E-004: completedIds = ids of shifts fully worked this run (G-004).
   * readonly like the rules' JobState — the store replaces the reference,
   * it never mutates the array in place.
   * G-008c: lastPayoutAt = epoch ms of the most recent payout — the anchor
   * the job's cooldownSeconds rests from (rules read it as pure data,
   * paired with the press-time nowMs). Undefined = never paid this run.
   */
  job: {
    activeId: string | null;
    step: number;
    completedIds: readonly string[];
    lastPayoutAt?: number;
  };
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

/**
 * Act input guards (G-008b item 3, reworked by G-008c items 3/4) — the
 * iPhone burst bug bought TWO waakyes with one flurry of taps (₵44 →
 * ₵20). Two module-level gates in requestAct, so EVERY input path (HUD
 * pill, keyboard, future joystick) is covered without new state fields:
 *   - ACT_DEBOUNCE_MS: a press within 600 ms of the last press that
 *       FIRED is dropped. G-008c: dropped presses no longer re-stamp the
 *       window (that used to make taps under 600 ms apart never fire at
 *       all) — only a press that actually commits moves the reference,
 *       so a steady 400 ms tap rhythm fires every other tap and a mash
 *       on an enabled button commits once per 600 ms.
 *   - PURCHASE_LOCKOUT_MS: a press that would SPEND money is refused
 *       within 1000 ms of a payout — the payout burst can't roll
 *       straight into a purchase. G-008c: "would spend" and "just paid"
 *       come from resolveAct's typed purchased / paidOut flags, NOT from
 *       regex-matching the toast text (−₵ / +₵ was fragile). Sleep, hire
 *       and step presses are unaffected by this gate.
 */
const ACT_DEBOUNCE_MS = 600;
const PURCHASE_LOCKOUT_MS = 1000;
let lastFiredAt = 0;
let lastPayoutAt = 0;

/**
 * The guards are live in dev/production/e2e (vite preview builds run with
 * MODE=production). Vitest unit suites default them OFF — some store suites
 * press requestAct back-to-back synchronously and assert every step — and
 * the guard suite below opts back in explicitly.
 */
const ACT_GUARDS_DEFAULT = import.meta.env.MODE !== 'test';
let guardsForTests = false;

/** Test-only toggle (used by src/store/__tests__/actGuards.test.ts). */
export function __setActGuardsForTests(on: boolean): void {
  guardsForTests = on;
  lastFiredAt = 0;
  lastPayoutAt = 0;
}

/**
 * Test-only needs override (G-008c round 2) — the guard suite re-arms the
 * body between paced taps so a cooldown-free act (sleep) can count FIRED
 * presses; never reachable in normal play, same spirit as the ?e2e=1 hook.
 */
export function __setNeedsForTests(hunger: number, energy: number): void {
  state.needs.hunger = clampNeed(hunger);
  state.needs.energy = clampNeed(energy);
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
 * completedIds run history — G-004 earn-first, the player position —
 * G-008b zone-exact decisions, and nowMs — G-008c's cooldown clock),
 * runs resolveAct against the current nearLocationId, and commits the
 * returned wallet, needs and job slices back (identity-checked:
 * resolveAct returns the SAME session when the act was disabled/refused,
 * so a no-op press never notifies). The returned completedIds array is
 * stored by reference: rules hand back the SAME array while a shift just
 * advances (no re-render churn) and a fresh, deduped array only when a
 * payout latches a shift (E-004).
 *
 * G-008c round 2: the needs slice also threads lastWaterAt (the 20 s
 * sachet-water rest's anchor) — sampled onto the session, committed from
 * resolveAct's returned needs, preserved by the drain.
 */
export function requestAct(): void {
  const now = Date.now();
  const guardsActive = ACT_GUARDS_DEFAULT || guardsForTests;

  // G-008c item 3: the debounce window counts from the last press that
  // FIRED. A dropped press returns here WITHOUT stamping — it never
  // moves the window, so paced taps keep firing every other beat.
  if (guardsActive && now - lastFiredAt < ACT_DEBOUNCE_MS) return;
  const purchaseLocked = guardsActive && now - lastPayoutAt < PURCHASE_LOCKOUT_MS;

  const session: ActSession = {
    wallet: { balanceGHS: state.wallet.balanceGHS },
    needs: {
      hunger: state.needs.hunger,
      energy: state.needs.energy,
      // G-008c round 2: the sachet rest's anchor rides with the needs.
      lastWaterAt: state.needs.lastWaterAt,
    },
    job: {
      activeId: state.job.activeId,
      step: state.job.step,
      completedIds: state.job.completedIds,
      lastPayoutAt: state.job.lastPayoutAt,
    },
    // G-008b: press-time position — act.ts re-checks the sleep zone and
    // the bench waypoint against the REAL position, not the probe frame.
    position: { x: state.player.position.x, z: state.player.position.z },
    // G-008c: press-time clock — the cooldown counts against THIS number,
    // keeping the rules pure (no Date.now() below src/store).
    nowMs: now,
  };

  const { session: next, toast, purchased, paidOut } = resolveAct(session, state.nearLocationId);

  // A purchase within 1000 ms of a payout is refused before any commit —
  // G-008c item 4: detected via resolveAct's typed `purchased` flag, not
  // the toast text. resolveAct is pure, so dropping the result is a true
  // no-op (and, being a refusal, it stamps neither gate).
  if (purchaseLocked && purchased) return;

  let changed = false;
  if (next.wallet !== session.wallet) {
    state.wallet.balanceGHS = next.wallet.balanceGHS;
    changed = true;
  }
  if (next.needs !== session.needs) {
    state.needs.hunger = next.needs.hunger;
    state.needs.energy = next.needs.energy;
    // G-008c round 2: the water stamp — the sachet rest's anchor,
    // threaded like job.lastPayoutAt (undefined until the first sip).
    state.needs.lastWaterAt = next.needs.lastWaterAt;
    changed = true;
  }
  if (next.job !== session.job) {
    state.job.activeId = next.job.activeId;
    state.job.step = next.job.step;
    // G-004 run history: rules return the same array while a shift advances
    // and a fresh deduped array when completeJob latches a payout.
    state.job.completedIds = next.job.completedIds ?? [];
    // G-008c: the payout stamp — the cooldown's anchor, threaded like
    // completedIds (undefined until the first payout commits one).
    state.job.lastPayoutAt = next.job.lastPayoutAt;
    changed = true;
  }
  if (toast) {
    pushToast(toast);
    changed = true;
  }

  // Only a press that FIRED stamps the debounce (same reference ⇒ no-op
  // ⇒ no stamp), and a payout additionally arms the purchase lockout —
  // detected via the typed `paidOut` flag, not the "+₵" toast.
  if (guardsActive && next !== session) {
    lastFiredAt = now;
    if (paidOut) lastPayoutAt = now;
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
  // G-008c round 2: drainNeeds preserves the water stamp — commit it
  // back (a no-op value-wise, but keeps the slice shape honest).
  state.needs.lastWaterAt = next.lastWaterAt;
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

/**
 * G-008b e2e hook — reachable only under `?e2e=1` (never in normal play).
 * The CI robot pins exact needs values so assertions can be deterministic:
 * the sleep test needs an uncapped +55 (energy ≤ 45 at the door), the Full
 * gate pins hunger 92. No secrets, no state exports beyond this setter.
 */
if (
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('e2e') === '1'
) {
  (window as unknown as Record<string, unknown>).__chaleTest = {
    setNeeds: (hunger: number, energy: number): void => {
      state.needs.hunger = clampNeed(hunger);
      state.needs.energy = clampNeed(energy);
      notify();
    },
  };
}
