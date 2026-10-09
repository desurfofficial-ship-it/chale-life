import { describe, expect, it } from 'vitest';
import {
  applyMeal,
  applyRestore,
  applySleep,
  applyWorkCost,
  canWork,
  createStarterNeeds,
  DECAY_PER_SECOND,
  drinkWater,
  drainNeeds,
  isHungry,
  isLow,
  isTired,
  LOW_THRESHOLD,
  MAX_TICK_SECONDS,
  MEAL_HUNGER_RESTORE,
  lowNeedsHints,
  SLEEP_ENERGY_RESTORE,
  SLEEP_GATE_ENERGY,
  SLEEP_HUNGER_COST,
  WAAKYE_MAX_HUNGER,
  WATER_ENERGY_RESTORE,
  WATER_HUNGER_RESTORE,
  WATER_MAX_HUNGER,
  WORK_ENERGY_COST,
  type NeedsState,
} from '../needs';

const at = (hunger: number, energy: number): NeedsState => ({ hunger, energy });

describe('needs: starter profile', () => {
  it('starter needs begin at 72 hunger / 80 energy matching the store defaults (E-002)', () => {
    expect(createStarterNeeds()).toEqual({ hunger: 72, energy: 80 });
  });

  it('survival drain removes 0.35 hunger and 0.22 energy per second', () => {
    expect(DECAY_PER_SECOND.survival.hunger).toBe(0.35);
    expect(DECAY_PER_SECOND.survival.energy).toBe(0.22);
    const drained = drainNeeds(at(80, 80), 1, 'survival');
    expect(drained.hunger).toBeCloseTo(80 - 0.35, 10);
    expect(drained.energy).toBeCloseTo(80 - 0.22, 10);
  });

  it('starter profile drains ~3 hunger and ~2 energy per minute (ticked per frame)', () => {
    expect(DECAY_PER_SECOND.starter.hunger).toBe(0.05);
    expect(DECAY_PER_SECOND.starter.energy).toBe(0.0333);
    let drained = at(80, 80);
    for (let i = 0; i < 30; i++) drained = drainNeeds(drained, 2, 'starter'); // 30 × 2s = 60s
    expect(drained.hunger).toBeCloseTo(80 - 3.0, 5);
    expect(drained.energy).toBeCloseTo(80 - DECAY_PER_SECOND.starter.energy * 60, 10);
  });

  it('default drain profile is survival', () => {
    const drained = drainNeeds(at(80, 80), 1);
    expect(drained.hunger).toBeCloseTo(80 - DECAY_PER_SECOND.survival.hunger, 10);
  });
});

describe('needs: drain guards', () => {
  it('drain never takes a need below zero', () => {
    const drained = drainNeeds(at(0.1, 0.1), 2, 'survival'); // 2s × 0.35 drains past 0
    expect(drained.hunger).toBe(0);
    expect(drained.energy).toBe(0);
  });

  it('drain never exceeds 100 when needs are already full', () => {
    const drained = drainNeeds(at(100, 100), 0);
    expect(drained.hunger).toBeLessThanOrEqual(100);
    expect(drained.energy).toBeLessThanOrEqual(100);
  });

  it('ticks longer than 2 seconds are ignored (frame-spike guard)', () => {
    expect(MAX_TICK_SECONDS).toBe(2);
    const before = at(80, 80);
    expect(drainNeeds(before, 2.1, 'survival')).toBe(before);
    expect(drainNeeds(before, 10, 'survival')).toBe(before);
  });

  it('non-positive dt leaves needs unchanged', () => {
    const before = at(80, 80);
    expect(drainNeeds(before, 0, 'survival')).toBe(before);
    expect(drainNeeds(before, -1, 'survival')).toBe(before);
  });

  it('a 2-second tick still applies (boundary inclusive)', () => {
    const drained = drainNeeds(at(80, 80), 2, 'survival');
    expect(drained.hunger).toBeCloseTo(80 - 0.7, 10);
  });
});

describe('needs: restores', () => {
  it('meal restores +45 hunger capped at 100', () => {
    expect(MEAL_HUNGER_RESTORE).toBe(45);
    const fed = applyMeal(at(70, 50));
    expect(fed.hunger).toBe(100);
    expect(fed.energy).toBe(50);
    const capped = applyMeal(at(90, 50));
    expect(capped.hunger).toBe(100);
  });

  it('water is a ₵1 sip: +4 hunger / +2 energy (G-008c round 2 nerf)', () => {
    // The salvage +6/+10 let ₵5 buy energy 60→100 and hunger 60→90 —
    // water out-competed sleep AND waakye. Now it is a small top-up.
    expect(WATER_HUNGER_RESTORE).toBe(4);
    expect(WATER_ENERGY_RESTORE).toBe(2);
    const sipped = drinkWater(at(50, 50));
    expect(sipped.hunger).toBe(54);
    expect(sipped.energy).toBe(52);
  });

  it('drinkWater stamps lastWaterAt from the caller\u2019s clock, key-free without one', () => {
    // Pure data in/out — the store's press clock rides through the rules.
    const stamped = drinkWater(at(50, 50), 123_456);
    expect(stamped.lastWaterAt).toBe(123_456);
    // Legacy clockless callers keep the slice shape exactly as before.
    const legacy = drinkWater(at(50, 50));
    expect('lastWaterAt' in legacy).toBe(false);
    // A re-drink re-stamps (the rest counts from the NEW purchase).
    const again = drinkWater(legacy, 200_000);
    expect(again.lastWaterAt).toBe(200_000);
  });

  it('no needs transform ever un-arms a running water rest (stamp preserved)', () => {
    const stamped = drinkWater(at(50, 50), 123_456);
    expect(applyMeal(stamped).lastWaterAt).toBe(123_456);
    expect(applySleep(stamped).lastWaterAt).toBe(123_456);
    expect(applyWorkCost(stamped).lastWaterAt).toBe(123_456);
    expect(applyRestore(stamped, { hunger: -10 }).lastWaterAt).toBe(123_456);
    expect(drainNeeds(stamped, 1, 'starter').lastWaterAt).toBe(123_456);
    // …and stamp-free states stay key-free (E-002 slice shapes keep comparing equal).
    expect('lastWaterAt' in drainNeeds(at(50, 50), 1, 'starter')).toBe(false);
    expect('lastWaterAt' in applyMeal(at(50, 50))).toBe(false);
  });

  it('sleep restores +55 energy capped at 100 and wakes you hungry (−8, G-006)', () => {
    expect(SLEEP_ENERGY_RESTORE).toBe(55);
    expect(SLEEP_HUNGER_COST).toBe(8);
    expect(SLEEP_GATE_ENERGY).toBe(90); // the “Not tired yet” gate
    const rested = applySleep(at(50, 30));
    expect(rested.energy).toBe(85);
    expect(rested.hunger).toBe(42); // 50 − 8 — you wake up hungry
    const capped = applySleep(at(50, 80));
    expect(capped.energy).toBe(100); // 80 + 55, capped
    expect(capped.hunger).toBe(42);
  });

  it('sleep floors hunger at zero and still honours the bed bonus', () => {
    const starving = applySleep(at(3, 30));
    expect(starving.hunger).toBe(0); // floored, never negative
    expect(starving.energy).toBe(85);
    const withBed = applySleep(at(50, 30), 20);
    expect(withBed.energy).toBe(100); // 30 + 55 + 20, capped
    expect(withBed.hunger).toBe(42);
  });

  it('work costs 18 energy (and salvage’s 8 hunger), floored at zero', () => {
    expect(WORK_ENERGY_COST).toBe(18);
    const tired = applyWorkCost(at(80, 60));
    expect(tired.energy).toBe(42);
    expect(tired.hunger).toBe(72);
    const floored = applyWorkCost(at(2, 10));
    expect(floored.energy).toBe(0);
    expect(floored.hunger).toBe(0);
  });

  it('applyRestore clamps arbitrary deltas into 0–100', () => {
    const up = applyRestore(at(95, 95), { hunger: 20, energy: 20 });
    expect(up.hunger).toBe(100);
    expect(up.energy).toBe(100);
    const down = applyRestore(at(5, 5), { hunger: -20, energy: -20 });
    expect(down.hunger).toBe(0);
    expect(down.energy).toBe(0);
  });
});

describe('needs: low thresholds and work gate', () => {
  it('low threshold is 25 and flags needs strictly below it', () => {
    expect(LOW_THRESHOLD).toBe(25);
    expect(isLow(25)).toBe(false);
    expect(isLow(24.9)).toBe(true);
  });

  it('isHungry / isTired mirror the threshold helpers', () => {
    expect(isHungry(at(20, 80))).toBe(true);
    expect(isHungry(at(80, 20))).toBe(false);
    expect(isTired(at(80, 20))).toBe(true);
  });

  it('canWork refuses below 12 energy with the salvage message', () => {
    const result = canWork(at(80, 11));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Too tired');
  });

  it('canWork refuses below 10 hunger with the salvage message', () => {
    const result = canWork(at(9, 80));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Too hungry');
  });

  it('canWork allows a fed and rested player', () => {
    expect(canWork(at(80, 80)).ok).toBe(true);
    expect(canWork(at(10, 12)).ok).toBe(true); // exactly at the gates
  });
});

describe('needs: waakye Full gate + water gate + low-stat hints (G-008b/c)', () => {
  it('WAAKYE_MAX_HUNGER is 55 — meals above it clamp most of their restore away', () => {
    expect(WAAKYE_MAX_HUNGER).toBe(55);
  });

  it('WATER_MAX_HUNGER is 80 — the "Not thirsty" gate (G-008c round 2)', () => {
    expect(WATER_MAX_HUNGER).toBe(80);
  });

  it('lowNeedsHints: hungry → "eat waakye" (food outranks rest)', () => {
    expect(lowNeedsHints({ hunger: 20, energy: 80 })).toEqual(['eat waakye']);
    expect(lowNeedsHints({ hunger: 25, energy: 80 })).toEqual([]); // threshold is exclusive
  });

  it('lowNeedsHints: low energy → "LOW ENERGY — sleep at the compound"', () => {
    expect(lowNeedsHints({ hunger: 80, energy: 24 })).toEqual([
      'LOW ENERGY — sleep at the compound',
    ]);
  });

  it('lowNeedsHints: both low → both lines, hungry first', () => {
    expect(lowNeedsHints({ hunger: 10, energy: 5 })).toEqual([
      'eat waakye',
      'LOW ENERGY — sleep at the compound',
    ]);
    expect(lowNeedsHints({ hunger: 80, energy: 80 })).toEqual([]);
  });
});
