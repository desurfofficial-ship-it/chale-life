/**
 * Daily needs rules (hunger + energy) — pure port of
 * salvage/game/Needs/NeedsSystem.ts constants and behaviors.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * Every function takes a NeedsState and returns a NEW NeedsState —
 * the Engine owns the store and decides when to commit these results.
 *
 * Salvage fidelity:
 *   - survival drain 0.35 hunger / 0.22 energy per second
 *   - starter (Level-1) drain 0.05 hunger / 0.0333 energy per second
 *     (~3/min + ~2/min — the playability patch that keeps a ₵0 guest
 *     from soft-locking before the first payout)
 *   - low threshold 25, meal +45 hunger, water +4 hunger / +2 energy
 *     (G-008c round 2 — the salvage +6/+10 made ₵1 water a needs-juice
 *     that out-competed sleep and waakye alike), sleep +55 energy / −8
 *     hunger (G-006: you wake up hungry), work −18 energy (and −8
 *     hunger, as in salvage)
 */

export interface NeedsState {
  /** 0–100 (100 = full). */
  readonly hunger: number;
  /** 0–100 (100 = rested). */
  readonly energy: number;
  /**
   * Epoch ms of the most recent sachet-water purchase (G-008c round 2) —
   * the anchor the 20 s water rest counts from. Optional so every
   * pre-water slice keeps compiling; undefined reads as "never drunk".
   * Threaded exactly like JobState.lastPayoutAt: stamped by drinkWater,
   * preserved by every other needs transform, and read as pure data
   * paired with the session's nowMs — no rule ever calls Date.now().
   */
  readonly lastWaterAt?: number;
}

/** Named decay profiles — Engine picks which one is active. */
export type DecayProfile = 'survival' | 'starter';

/** ~5 min to empty if idle (survival profile). */
export const DECAY_PER_SECOND: Readonly<Record<DecayProfile, NeedsState>> = {
  survival: { hunger: 0.35, energy: 0.22 },
  starter: { hunger: 0.05, energy: 0.0333 }, // 3.0 / min and 2.0 / min
};

export const LOW_THRESHOLD = 25;

/** Hunger restored by a proper meal (waakye & friends). */
export const MEAL_HUNGER_RESTORE = 45;

/**
 * Sachet-water effect — G-008c round 2 nerf: a sip, not a needs-juice.
 * The salvage +6 hunger / +10 energy let ₵5 buy energy 60→100 and hunger
 * 60→90, making both sleep and waakye pointless; now energy comes
 * mainly from sleep and hunger from meals.
 */
export const WATER_HUNGER_RESTORE = 4;
export const WATER_ENERGY_RESTORE = 2;

/**
 * At or above this hunger the provisions shop refuses water — the Act
 * button greys out with "Not thirsty" (G-008c round 2, mirror of the
 * sleep gate). Rounded, like the waakye Full gate.
 */
export const WATER_MAX_HUNGER = 80;

/** Energy restored by sleeping at the compound (no bed bonus). */
export const SLEEP_ENERGY_RESTORE = 55;

/** Sleeping costs this much hunger — you wake up hungry (G-006). */
export const SLEEP_HUNGER_COST = 8;

/**
 * At or above this energy the compound bed refuses you — the Act button
 * greys out with the hint "Not tired yet" (G-006).
 */
export const SLEEP_GATE_ENERGY = 90;

/** Energy cost of finishing a work shift. */
export const WORK_ENERGY_COST = 18;
/** Salvage also drains a little hunger with every completed shift. */
export const WORK_HUNGER_COST = 8;

/** canWork gates (salvage NeedsSystem.canWork). */
export const CAN_WORK_MIN_ENERGY = 12;
export const CAN_WORK_MIN_HUNGER = 10;

/**
 * Waakye is only offered while rounded hunger is at or below this (G-008b):
 * above it the joint's Act label reads "Full" and the button is disabled —
 * a meal bought at hunger 92+ used to waste most of its restore.
 */
export const WAAKYE_MAX_HUNGER = 55;

/** Frame-spike guard: ticks longer than 2 s are ignored (salvage tick). */
export const MAX_TICK_SECONDS = 2;

/**
 * Starter needs — matches the store's initial values (G-001c alignment):
 * hunger 72 (salvage NeedsSystem's start — full enough to hustle, hungry
 * enough that the waakye loop matters), energy 80. The store commits these
 * same numbers (src/store/gameStore.ts, E-002); the two must not drift.
 */
export function createStarterNeeds(): NeedsState {
  return { hunger: 72, energy: 80 };
}

export function clampNeed(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Passive decay for one frame. `dtSeconds` outside (0, 2] leaves the
 * needs untouched — same spike guard as the salvage NeedsSystem.tick.
 */
export function drainNeeds(
  state: NeedsState,
  dtSeconds: number,
  profile: DecayProfile = 'survival'
): NeedsState {
  if (dtSeconds <= 0 || dtSeconds > MAX_TICK_SECONDS) return state;
  const rate = DECAY_PER_SECOND[profile];
  return {
    ...(state.lastWaterAt !== undefined ? { lastWaterAt: state.lastWaterAt } : {}),
    hunger: clampNeed(state.hunger - rate.hunger * dtSeconds),
    energy: clampNeed(state.energy - rate.energy * dtSeconds),
  };
}

/**
 * Generic clamped restore — the primitive behind meal/water/sleep/work.
 * Carries an existing water stamp forward: eating, sleeping or working
 * can never un-arm a running 20 s water rest (same rule as payouts and
 * JobState.lastPayoutAt).
 */
export function applyRestore(
  state: NeedsState,
  delta: { hunger?: number; energy?: number }
): NeedsState {
  return {
    ...(state.lastWaterAt !== undefined ? { lastWaterAt: state.lastWaterAt } : {}),
    hunger: clampNeed(state.hunger + (delta.hunger ?? 0)),
    energy: clampNeed(state.energy + (delta.energy ?? 0)),
  };
}

/** Buy / eat a proper meal: +45 hunger (MEAL_HUNGER_RESTORE). */
export function applyMeal(state: NeedsState): NeedsState {
  return applyRestore(state, { hunger: MEAL_HUNGER_RESTORE });
}

/**
 * Water: +4 hunger and +2 energy (WATER_* constants), G-008c round 2.
 * `nowMs` (the session's press clock, pure data) stamps `lastWaterAt` —
 * the instant the 20 s per-sachet rest counts from. Omitted (legacy
 * callers) any prior stamp is preserved, so a clockless re-drink can
 * never un-arm a running cooldown.
 */
export function drinkWater(state: NeedsState, nowMs?: number): NeedsState {
  const sipped = applyRestore(state, {
    hunger: WATER_HUNGER_RESTORE,
    energy: WATER_ENERGY_RESTORE,
  });
  return nowMs === undefined ? sipped : { ...sipped, lastWaterAt: nowMs };
}

/**
 * Sleep at the compound: +55 energy (plus any bed/tier bonus), and —
 * since G-006 — −8 hunger (you wake up hungry). Free.
 */
export function applySleep(state: NeedsState, bonusEnergy = 0): NeedsState {
  return applyRestore(state, {
    energy: SLEEP_ENERGY_RESTORE + Math.max(0, bonusEnergy),
    hunger: -SLEEP_HUNGER_COST,
  });
}

/** After finishing a work shift: −18 energy (and −8 hunger, as salvage). */
export function applyWorkCost(state: NeedsState): NeedsState {
  return applyRestore(state, { hunger: -WORK_HUNGER_COST, energy: -WORK_ENERGY_COST });
}

export function isLow(value: number): boolean {
  return value < LOW_THRESHOLD;
}

export function isHungry(state: NeedsState): boolean {
  return isLow(state.hunger);
}

export function isTired(state: NeedsState): boolean {
  return isLow(state.energy);
}

/**
 * The NeedsCard's low-stat hint lines (G-008b item 5):
 *   - hungry → "eat waakye" (food outranks rest — sleep costs hunger)
 *   - energy low → "LOW ENERGY — sleep at the compound"
 * Both lines show when both stats are low; empty when the guest is fine.
 */
export function lowNeedsHints(state: NeedsState): readonly string[] {
  const hints: string[] = [];
  if (isHungry(state)) hints.push('eat waakye');
  if (isTired(state)) hints.push('LOW ENERGY — sleep at the compound');
  return hints;
}

export interface CanWorkResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Salvage gate: too tired below 12 energy, too hungry below 10 hunger. */
export function canWork(state: NeedsState): CanWorkResult {
  if (state.energy < CAN_WORK_MIN_ENERGY) {
    return { ok: false, reason: 'Too tired. Sleep at the compound.' };
  }
  if (state.hunger < CAN_WORK_MIN_HUNGER) {
    return { ok: false, reason: 'Too hungry. Eat first — try waakye or cook at home.' };
  }
  return { ok: true };
}
