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
 */

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
  job: { activeId: string | null; step: number };
  home: { tierId: string };
  time: { hour: number };
}

type Listener = () => void;

const state: GameState = {
  player: { position: { x: 0, y: 0, z: 0 }, yaw: 0 },
  wallet: { balanceGHS: 20 },
  needs: { hunger: 80, energy: 80 },
  job: { activeId: null, step: 0 },
  home: { tierId: 'single_room' },
  time: { hour: 7 },
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

export interface HudSnapshot {
  fps: number;
  x: number;
  z: number;
  yaw: number;
  inputX: number;
  inputZ: number;
  zoom: number;
}

let hud: Readonly<HudSnapshot> = {
  fps: 0,
  x: state.player.position.x,
  z: state.player.position.z,
  yaw: state.player.yaw,
  inputX: 0,
  inputZ: 0,
  zoom: INITIAL_ZOOM,
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
