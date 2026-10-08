/**
 * Input layer — everything that moves the player converges on the store's
 * `movementInput` here, and only here:
 *   - on-screen joystick (touch, bottom-left) — analog magnitude 0..1
 *   - keyboard WASD / arrows — normalised so diagonals are not faster
 * The stick wins while it is active; keyboard drives otherwise.
 *
 * Components never write `movementInput` directly — they call
 * `setJoystickVector` / mount `initKeyboardInput`, keeping the merge in one
 * place. No window globals: only event listeners, cleaned up on dispose.
 */

import { movementInput, requestAct } from '../store/gameStore';

/** Fraction of full deflection ignored before the stick reports movement. */
export const JOYSTICK_DEAD_ZONE = 0.12;

const keyboard = { x: 0, z: 0 };
const stick = { x: 0, z: 0, active: false };

function publish(): void {
  const src = stick.active ? stick : keyboard;
  movementInput.x = src.x;
  movementInput.z = src.z;
}

/* ── Keyboard (WASD + arrows) ── */

const KEY_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/* ── Keyboard Act (E-003): E / Space fire requestAct for desktop testing ── */

const ACT_KEYS: ReadonlySet<string> = new Set(['KeyE', 'Space']);
/** Ignore key ghosts / double taps: one Act per this window (button taps are
 * handled by the HUD itself; this path is keyboard-only). */
const ACT_DEBOUNCE_MS = 250;
let lastActAt = 0;

const pressed = new Set<string>();

function syncKeyboard(): void {
  let x = 0;
  let z = 0;
  if (pressed.has('left')) x -= 1;
  if (pressed.has('right')) x += 1;
  if (pressed.has('up')) z -= 1;
  if (pressed.has('down')) z += 1;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  keyboard.x = x;
  keyboard.z = z;
  publish();
}

function onKeyDown(e: KeyboardEvent): void {
  if (ACT_KEYS.has(e.code)) {
    // Space would scroll the page or re-click a focused button — eat it.
    e.preventDefault();
    if (e.repeat) return; // held-key auto-repeat never spams Acts
    const now = performance.now();
    if (now - lastActAt < ACT_DEBOUNCE_MS) return;
    lastActAt = now;
    requestAct();
    return;
  }
  const dir = KEY_MAP[e.code];
  if (!dir) return;
  if (e.code.startsWith('Arrow')) e.preventDefault(); // stop page scrolling
  if (pressed.has(dir)) return;
  pressed.add(dir);
  syncKeyboard();
}

function onKeyUp(e: KeyboardEvent): void {
  const dir = KEY_MAP[e.code];
  if (!dir) return;
  pressed.delete(dir);
  syncKeyboard();
}

/** Mount once from the app root; returns the dispose function. */
export function initKeyboardInput(): () => void {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const onBlur = (): void => {
    // Don't let keys or the stick stick when the tab loses focus mid-press.
    pressed.clear();
    stick.active = false;
    stick.x = 0;
    stick.z = 0;
    syncKeyboard();
  };
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    pressed.clear();
    keyboard.x = 0;
    keyboard.z = 0;
    stick.active = false;
    stick.x = 0;
    stick.z = 0;
    publish();
  };
}

/* ── On-screen joystick ── */

/**
 * Called by src/input/Joystick.tsx. `x`/`z` are screen-space with magnitude
 * ≤ 1 (already dead-zoned and rescaled by the component); +z = toward camera.
 */
export function setJoystickVector(x: number, z: number, active: boolean): void {
  stick.x = x;
  stick.z = z;
  stick.active = active;
  publish();
}
