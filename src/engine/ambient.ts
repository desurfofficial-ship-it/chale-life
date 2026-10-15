/**
 * Ambient world animation registry — stepped from GameLoop only.
 * Paused when the tab is hidden or prefers-reduced-motion is on.
 */

export type AmbientStep = (dt: number, gameTime: number) => void;

const steppers: AmbientStep[] = [];
let gameTime = 0;
let reducedMotion = false;

if (typeof window !== 'undefined') {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* private */
  }
}

export function registerAmbient(step: AmbientStep): () => void {
  steppers.push(step);
  return () => {
    const i = steppers.indexOf(step);
    if (i >= 0) steppers.splice(i, 1);
  };
}

export function getAmbientGameTime(): number {
  return gameTime;
}

/** Called once per GameLoop frame. */
export function tickAmbient(dt: number): void {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (reducedMotion) return;
  gameTime += dt;
  for (let i = 0; i < steppers.length; i++) {
    steppers[i](dt, gameTime);
  }
}

/** Reduced-motion preference (read once at module load). */
export function isReducedMotion(): boolean {
  return reducedMotion;
}

/** Test helper */
export function __resetAmbientForTests(): void {
  steppers.length = 0;
  gameTime = 0;
}
