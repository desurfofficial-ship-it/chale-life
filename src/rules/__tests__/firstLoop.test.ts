import { describe, expect, it } from 'vitest';
import { findFoodById } from '../../data/foods';
import {
  advanceStep,
  completeJob,
  createStarterJobState,
  startJob,
} from '../jobs';
import { buy, formatGHS } from '../economy';
import {
  applyMeal,
  createStarterNeeds,
  drainNeeds,
  MEAL_HUNGER_RESTORE,
  WATER_ENERGY_RESTORE,
  WATER_HUNGER_RESTORE,
} from '../needs';

/**
 * THE FIRST LOOP — the exact session a brand-new guest plays:
 * start with ₵20 → work Aunty Ba's 3-step starter hustle → +₵15 →
 * buy waakye → hunger rises, wallet drops.
 * This is the integration test for rules + data working together.
 */
describe('the first loop (₵20 → Aunty Ba → waakye)', () => {
  it('pays ₵15 for three Acts, then waakye fills hunger and drains the wallet', () => {
    // Fresh session: store defaults — ₵20, 72 hunger, 80 energy
    // (E-002 product start values, mirrored by createStarterNeeds).
    let wallet = { balanceGHS: 20 };
    let needs = createStarterNeeds();
    let job = createStarterJobState();
    expect(wallet.balanceGHS).toBe(20);
    expect(needs).toEqual({ hunger: 72, energy: 80 });

    // Aunty Ba offers the zero-capital starter hustle at the waakye joint.
    const started = startJob(job, wallet, 'HUSTLE_AUNTY_BA_STARTER');
    expect(started.ok).toBe(true);
    job = started.job;
    expect(job.activeId).toBe('HUSTLE_AUNTY_BA_STARTER');

    // Three Acts — each step at the food_vendor marker.
    const step1 = advanceStep(job, 'food_vendor');
    expect(step1.ok).toBe(true);
    expect(step1.message).toContain('Two more lifts');
    job = step1.job;

    const step2 = advanceStep(job, 'food_vendor');
    expect(step2.ok).toBe(true);
    expect(step2.message).toContain('One more lift');
    job = step2.job;

    const step3 = advanceStep(job, 'food_vendor');
    expect(step3.ok).toBe(true);
    expect(step3.completed).toBe(true);
    job = step3.job;

    // Aunty Ba pays ₵15 on the spot.
    const paid = completeJob(job, wallet);
    expect(paid.ok).toBe(true);
    expect(paid.payoutGHS).toBe(15);
    wallet = paid.wallet;
    job = paid.job;
    expect(wallet.balanceGHS).toBe(35);
    expect(job.activeId).toBeNull();

    // Time passes: 10 minutes of starter-profile decay (~3/min hunger),
    // ticked per-frame in legal ≤2s steps. 72 − 0.05 × 600 = 42;
    // 80 − 0.0333 × 600 = 60.02.
    for (let i = 0; i < 300; i++) {
      needs = drainNeeds(needs, 2, 'starter');
    }
    expect(needs.hunger).toBeCloseTo(42, 3);
    expect(needs.energy).toBeCloseTo(60.02, 3);

    // Buy waakye for ₵12 — wallet drops.
    const waakye = findFoodById('FOOD_WAAKYE')!;
    const purchase = buy(wallet, waakye.priceGHS);
    expect(purchase.ok).toBe(true);
    wallet = purchase.wallet;
    expect(wallet.balanceGHS).toBe(23);

    // Eat: hunger RISES by the meal restore (no cap hit from 42).
    expect(waakye.hungerRestore).toBe(MEAL_HUNGER_RESTORE);
    const fed = applyMeal(needs);
    expect(fed.hunger).toBeCloseTo(87, 6);
    expect(fed.hunger).toBeGreaterThan(needs.hunger);
    expect(wallet.balanceGHS).toBeLessThan(35);
  });

  it('a broke player can still sip sachet water (+6 hunger, +10 energy)', () => {
    const water = findFoodById('FOOD_SACHET_WATER')!;
    expect(water.hungerRestore).toBe(WATER_HUNGER_RESTORE);
    expect(water.energyRestore).toBe(WATER_ENERGY_RESTORE);

    let wallet = { balanceGHS: 1 };
    const needs = { hunger: 10, energy: 10 };

    const purchase = buy(wallet, water.priceGHS);
    expect(purchase.ok).toBe(true);
    wallet = purchase.wallet;
    expect(wallet.balanceGHS).toBe(0);

    // Free compound water matches sachet effects — recovery always exists.
    const sipped = {
      hunger: needs.hunger + WATER_HUNGER_RESTORE,
      energy: needs.energy + WATER_ENERGY_RESTORE,
    };
    expect(sipped.hunger).toBe(16);
    expect(sipped.energy).toBe(20);
  });

  it('formatGHS prices the street menu the way the HUD shows it', () => {
    expect(formatGHS(findFoodById('FOOD_WAAKYE')!.priceGHS)).toBe('₵12');
    expect(formatGHS(findFoodById('FOOD_KELEWELE')!.priceGHS)).toBe('₵5');
    expect(formatGHS(findFoodById('FOOD_SACHET_WATER')!.priceGHS)).toBe('₵1');
  });
});
