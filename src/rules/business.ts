/**
 * Pure tycoon business rules (G-009 / T-001).
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * Engine wires results into the store; World renders layouts from arrange().
 *
 * All money is GH₵ as pure numbers.
 */

import {
  BUSINESS_TYPES,
  findBusinessType,
  type BudgetTier,
  type BusinessTypeDef,
} from '../data/businesses';
import { findFurnitureById } from '../data/furniture';

export type { BudgetTier } from '../data/businesses';
import { buy, canAfford, type WalletState } from './economy';

// ── Types (published for Agents 2 & 3) ───────────────────────────────────────

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'night';

export interface PlotRef {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly zone: string;
  readonly price: number;
  readonly near?: string;
  readonly y?: number;
}

export interface FurniturePlacement {
  readonly id: string;
  readonly furnitureId: string;
  /** Tile coords relative to plot origin (tile = 1 m) */
  readonly tx: number;
  readonly tz: number;
  readonly rot: 0 | 90 | 180 | 270;
}

export interface BusinessState {
  readonly id: string;
  readonly plotId: string;
  readonly typeId: string;
  readonly budgetTier: BudgetTier;
  readonly startupPaid: number;
  readonly staff: number;
  readonly capacity: number;
  readonly costPerDay: number;
  readonly layout: readonly FurniturePlacement[];
  readonly open: boolean;
  readonly revenueToday: number;
  readonly costsToday: number;
  readonly customersToday: number;
}

export interface EstimateResult {
  readonly capacity: number;
  readonly staff: number;
  readonly costPerDay: number;
  readonly expectedDailyProfit: number;
  readonly startupCost: number;
}

export interface TickResult {
  readonly revenue: number;
  readonly costs: number;
  readonly customers: number;
  readonly business: BusinessState;
}

export type BusinessEventKind =
  | 'power_outage'
  | 'supplier_late'
  | 'inspector'
  | 'rush_hour';

export interface BusinessEvent {
  readonly kind: BusinessEventKind;
  readonly title: string;
  readonly body: string;
  readonly choices: readonly {
    readonly id: string;
    readonly label: string;
    readonly costGHS: number;
  }[];
}

export interface BuyPlotResult {
  readonly ok: boolean;
  readonly wallet: WalletState;
  readonly reason?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function tierIndex(tier: BudgetTier): 0 | 1 | 2 {
  return tier === 'min' ? 0 : tier === 'suggested' ? 1 : 2;
}

function startupFor(type: BusinessTypeDef, tier: BudgetTier): number {
  const vals = [type.startupMin, type.startupSuggested, type.startupMax];
  return vals[tierIndex(tier)];
}

function staffFor(type: BusinessTypeDef, tier: BudgetTier): number {
  const vals = [type.staffByTier.min, type.staffByTier.suggested, type.staffByTier.max];
  return vals[tierIndex(tier)];
}

/** Capacity scales with budget tier and plot area (tiles ≈ w×d). */
function capacityFor(type: BusinessTypeDef, tier: BudgetTier, plotTiles: number): number {
  const base = type.baseCustomersPerHour;
  const tierMult = [0.7, 1.0, 1.35][tierIndex(tier)];
  // Difficulty-3 (fuel) needs a larger plot for full throughput; small plots hurt hard.
  const areaDenom = type.difficulty >= 3 ? 55 : 32;
  const areaMult = Math.min(1.35, Math.max(0.28, plotTiles / areaDenom));
  return Math.max(1, Math.round(base * tierMult * areaMult * 8)); // ~8h operating capacity
}

/**
 * Suggested-tier costPerDay from the catalogue is the baseline opex.
 * Budget scales: min 0.8×, suggested 1.0×, max 1.5× (max is intentionally expensive).
 */
function costPerDayFor(type: BusinessTypeDef, tier: BudgetTier): number {
  const tierOpEx = [0.8, 1.0, 1.5][tierIndex(tier)];
  return round2(type.costPerDay * tierOpEx);
}

/** District demand 0.6–1.4 from zone + near landmark. */
export function districtDemand(plot: PlotRef): number {
  const zoneBoost: Record<string, number> = {
    jamestown: 1.1,
    chorkor: 1.05,
    nima: 1.15,
    adabraka: 1.2,
    cbd: 1.3,
    nungua: 0.95,
    teshie: 1.0,
    blacksquare: 1.25,
    trotro: 1.1,
  };
  let d = zoneBoost[plot.zone] ?? 1.0;
  if (plot.near) d = Math.min(1.4, d + 0.1);
  return d;
}

/** Weather × hour modifiers on customer flow. */
export function weatherModifier(
  type: BusinessTypeDef,
  weather: WeatherKind,
  hour: number,
): number {
  let m = 1;
  const isNight = hour >= 20 || hour < 5;
  if (isNight || weather === 'night') {
    m *= type.nightBoost;
  }
  if (weather === 'rain') {
    if (type.id === 'pharmacy') m *= 1.25;
    else if (type.indoor) m *= 1.05;
    else m *= 0.55; // street trade collapses
  } else if (weather === 'cloudy') {
    m *= 0.92;
  }
  // Midday lunch bump for food
  if (type.category === 'food_drink' && hour >= 11 && hour <= 14) m *= 1.2;
  // Morning commute bump for fuel
  if (type.id === 'fuel_station' && ((hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19))) {
    m *= 1.3;
  }
  return m;
}

// ── buyPlot ──────────────────────────────────────────────────────────────────

export function buyPlot(wallet: WalletState, plot: PlotRef): BuyPlotResult {
  if (plot.price <= 0) {
    return { ok: false, wallet, reason: 'Plot is not for sale.' };
  }
  if (!canAfford(wallet, plot.price)) {
    return {
      ok: false,
      wallet,
      reason: `Not enough cash — need ₵${plot.price}, have ₵${wallet.balanceGHS}.`,
    };
  }
  const result = buy(wallet, plot.price);
  return { ok: result.ok, wallet: result.wallet, reason: result.reason };
}

// ── estimate ─────────────────────────────────────────────────────────────────

export function estimate(
  typeId: string,
  plot: PlotRef,
  budget: BudgetTier,
): EstimateResult | null {
  const type = findBusinessType(typeId);
  if (!type) return null;
  const plotTiles = Math.max(1, Math.round(plot.w * plot.d));
  const startupCost = startupFor(type, budget);
  const staff = staffFor(type, budget);
  const capacity = capacityFor(type, budget, plotTiles);
  const costPerDay = costPerDayFor(type, budget);
  const demand = districtDemand(plot);
  // Expected: ~10 operating hours × customers/hour × ticket × demand − costs
  const customersPerDay = type.baseCustomersPerHour * 10 * demand * [0.7, 1, 1.3][tierIndex(budget)];
  const revenue = customersPerDay * type.averageTicket;
  const expectedDailyProfit = round2(revenue - costPerDay);
  return { capacity, staff, costPerDay, expectedDailyProfit, startupCost };
}

// ── arrange ──────────────────────────────────────────────────────────────────

/**
 * Deterministic furniture layout on a tile grid.
 * Every item is reachable (no blocking walls — simple row/aisle pattern).
 */
export function arrange(
  typeId: string,
  budget: BudgetTier,
  plotTiles: { w: number; d: number },
): FurniturePlacement[] {
  const type = findBusinessType(typeId);
  if (!type) return [];

  const kit = type.furnitureKit.filter((id) => {
    if (!findFurnitureById(id)) {
      if (typeof console !== 'undefined') console.warn(`[arrange] unknown furniture ${id} in ${type.id}`);
      return false;
    }
    return true;
  });
  const w = Math.max(3, Math.floor(plotTiles.w));
  const d = Math.max(3, Math.floor(plotTiles.d));
  const placements: FurniturePlacement[] = [];
  let idx = 0;

  // Counter along the front (z=0 row), staff side
  const counterId = kit.find((k) => k.includes('counter')) ?? kit[0];
  if (counterId) {
    placements.push({
      id: `p${idx++}`,
      furnitureId: counterId,
      tx: Math.floor(w / 2),
      tz: 1,
      rot: 0,
    });
  }

  // Specialty item (pump / barber chair / cooker) near centre-back
  const specialty = kit.find(
    (k) =>
      k.includes('pump') ||
      k.includes('barber') ||
      k.includes('salon') ||
      k.includes('cooker') ||
      k.includes('fridge'),
  );
  if (specialty && specialty !== counterId) {
    placements.push({
      id: `p${idx++}`,
      furnitureId: specialty,
      tx: Math.floor(w / 2),
      tz: Math.max(2, d - 2),
      rot: 0,
    });
  }

  // Shelves / displays along left wall
  const storage = kit.filter((k) => k.includes('shelf') || k.includes('display'));
  storage.forEach((fid, i) => {
    placements.push({
      id: `p${idx++}`,
      furnitureId: fid,
      tx: 1,
      tz: Math.min(d - 1, 2 + i),
      rot: 90,
    });
  });

  // Seating / stools along right
  const seats = kit.filter(
    (k) => k.includes('stool') || k.includes('bench') || k.includes('chair'),
  );
  const seatCount = budget === 'min' ? 1 : budget === 'suggested' ? 2 : 3;
  seats.slice(0, seatCount).forEach((fid, i) => {
    placements.push({
      id: `p${idx++}`,
      furnitureId: fid,
      tx: Math.max(1, w - 2),
      tz: Math.min(d - 1, 2 + i),
      rot: 270,
    });
  });

  // Fill remaining kit items in open cells (deterministic scan)
  const used = new Set(placements.map((p) => `${p.tx},${p.tz}`));
  for (const fid of kit) {
    if (placements.some((p) => p.furnitureId === fid)) continue;
    outer: for (let tz = 1; tz < d - 1; tz++) {
      for (let tx = 1; tx < w - 1; tx++) {
        const key = `${tx},${tz}`;
        if (used.has(key)) continue;
        used.add(key);
        placements.push({ id: `p${idx++}`, furnitureId: fid, tx, tz, rot: 0 });
        break outer;
      }
    }
  }

  return placements;
}

// ── openBusiness ─────────────────────────────────────────────────────────────

export interface OpenBusinessInput {
  readonly typeId: string;
  readonly plot: PlotRef;
  readonly budget: BudgetTier;
  readonly businessId: string;
}

export interface OpenBusinessResult {
  readonly ok: boolean;
  readonly wallet: WalletState;
  readonly business?: BusinessState;
  readonly reason?: string;
}

export function openBusiness(
  wallet: WalletState,
  input: OpenBusinessInput,
): OpenBusinessResult {
  const type = findBusinessType(input.typeId);
  if (!type) return { ok: false, wallet, reason: 'Unknown business type.' };

  const est = estimate(input.typeId, input.plot, input.budget);
  if (!est) return { ok: false, wallet, reason: 'Could not estimate.' };

  const paid = buy(wallet, est.startupCost);
  if (!paid.ok) return { ok: false, wallet: paid.wallet, reason: paid.reason };

  const layout = arrange(input.typeId, input.budget, {
    w: input.plot.w,
    d: input.plot.d,
  });

  const business: BusinessState = {
    id: input.businessId,
    plotId: input.plot.id,
    typeId: input.typeId,
    budgetTier: input.budget,
    startupPaid: est.startupCost,
    staff: est.staff,
    capacity: est.capacity,
    costPerDay: est.costPerDay,
    layout,
    open: true,
    revenueToday: 0,
    costsToday: 0,
    customersToday: 0,
  };

  return { ok: true, wallet: paid.wallet, business };
}

// ── tick ─────────────────────────────────────────────────────────────────────

/**
 * Advance a business by `gameMinutes`.
 * Returns incremental revenue/costs/customers and updated business state.
 */
export function tick(
  business: BusinessState,
  gameMinutes: number,
  weather: WeatherKind,
  hour: number,
  demand: number,
): TickResult {
  if (!business.open || gameMinutes <= 0) {
    return { revenue: 0, costs: 0, customers: 0, business };
  }

  const type = findBusinessType(business.typeId);
  if (!type) {
    return { revenue: 0, costs: 0, customers: 0, business };
  }

  const hours = gameMinutes / 60;
  const wMod = weatherModifier(type, weather, hour);
  const staffMod = Math.min(1.2, 0.6 + business.staff * 0.15);
  const rawCustomers =
    type.baseCustomersPerHour * hours * demand * wMod * staffMod;
  // Capacity gate: can't serve more than capacity scaled to the tick window
  const capacityThisTick = (business.capacity / 8) * hours;
  const customers = Math.max(0, Math.floor(Math.min(rawCustomers, capacityThisTick)));
  const revenue = round2(customers * type.averageTicket);
  // Costs accrue continuously (day rate × fraction of day)
  const costs = round2(business.costPerDay * (hours / 24));

  const next: BusinessState = {
    ...business,
    revenueToday: round2(business.revenueToday + revenue),
    costsToday: round2(business.costsToday + costs),
    customersToday: business.customersToday + customers,
  };

  return { revenue, costs, customers, business: next };
}

// ── Events ───────────────────────────────────────────────────────────────────

export function makeEvent(kind: BusinessEventKind): BusinessEvent {
  switch (kind) {
    case 'power_outage':
      return {
        kind,
        title: 'Dumsor',
        body: 'Lights out in the neighbourhood. Generator or wait it out?',
        choices: [
          { id: 'generator', label: 'Run generator (₵80)', costGHS: 80 },
          { id: 'wait', label: 'Wait it out (lose customers)', costGHS: 0 },
        ],
      };
    case 'supplier_late':
      return {
        kind,
        title: 'Supplier late',
        body: 'Stock is running low. Pay for a rush delivery?',
        choices: [
          { id: 'rush', label: 'Rush delivery (₵50)', costGHS: 50 },
          { id: 'skip', label: 'Make do (lower sales)', costGHS: 0 },
        ],
      };
    case 'inspector':
      return {
        kind,
        title: 'Inspector visit',
        body: 'FDA / assembly inspector is at the door.',
        choices: [
          { id: 'comply', label: 'Pay fine / fee (₵120)', costGHS: 120 },
          { id: 'charm', label: 'Talk it through (₵40)', costGHS: 40 },
        ],
      };
    case 'rush_hour':
      return {
        kind,
        title: 'Rush hour',
        body: 'A wave of customers is forming outside.',
        choices: [
          { id: 'extra_staff', label: 'Call extra help (₵30)', costGHS: 30 },
          { id: 'solo', label: 'Handle it yourself', costGHS: 0 },
        ],
      };
  }
}

/** Apply event choice — returns updated wallet + optional demand multiplier. */
export function resolveEventChoice(
  wallet: WalletState,
  event: BusinessEvent,
  choiceId: string,
): { wallet: WalletState; demandMult: number; toast: string } {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { wallet, demandMult: 1, toast: 'No action taken.' };
  }
  const paid = choice.costGHS > 0 ? buy(wallet, choice.costGHS) : { ok: true, wallet };
  const nextWallet = paid.ok ? paid.wallet : wallet;

  let demandMult = 1;
  let toast = choice.label;
  if (event.kind === 'power_outage') {
    demandMult = choiceId === 'generator' ? 0.95 : 0.4;
    toast =
      choiceId === 'generator'
        ? 'Generator on — business keeps running.'
        : 'Power out — customers drift away.';
  } else if (event.kind === 'supplier_late') {
    demandMult = choiceId === 'rush' ? 1 : 0.7;
  } else if (event.kind === 'rush_hour') {
    demandMult = choiceId === 'extra_staff' ? 1.5 : 1.1;
  } else if (event.kind === 'inspector') {
    demandMult = 1;
    toast = choiceId === 'comply' ? 'Papers sorted. Inspector leaves.' : 'Talked it through.';
  }

  return { wallet: nextWallet, demandMult, toast };
}

// ── Quest helpers (Chapter 1: First hustle) ───────────────────────────────────

export type QuestStepId =
  | 'buy_plot'
  | 'open_business'
  | 'earn_500'
  | 'hire_second';

export interface QuestProgress {
  readonly chapter: number;
  readonly title: string;
  readonly step: QuestStepId;
  readonly stepsDone: readonly QuestStepId[];
  readonly earnTarget: number;
  readonly earnedToward: number;
}

export function createChapter1Quest(): QuestProgress {
  return {
    chapter: 1,
    title: 'First hustle',
    step: 'buy_plot',
    stepsDone: [],
    earnTarget: 500,
    earnedToward: 0,
  };
}

export function advanceQuest(
  q: QuestProgress,
  event: 'plot_bought' | 'business_opened' | 'revenue' | 'staff_hired',
  amount = 0,
  staffCount = 0,
): QuestProgress {
  if (q.chapter !== 1) return q;
  const done = new Set(q.stepsDone);

  if (event === 'plot_bought' && q.step === 'buy_plot') {
    done.add('buy_plot');
    return { ...q, step: 'open_business', stepsDone: [...done] };
  }
  if (event === 'business_opened' && (q.step === 'open_business' || done.has('buy_plot'))) {
    done.add('buy_plot');
    done.add('open_business');
    return { ...q, step: 'earn_500', stepsDone: [...done] };
  }
  if (event === 'revenue' && (q.step === 'earn_500' || done.has('open_business'))) {
    const earned = round2(q.earnedToward + amount);
    done.add('buy_plot');
    done.add('open_business');
    if (earned >= q.earnTarget) {
      done.add('earn_500');
      return {
        ...q,
        step: 'hire_second',
        stepsDone: [...done],
        earnedToward: earned,
      };
    }
    return { ...q, earnedToward: earned, stepsDone: [...done] };
  }
  if (event === 'staff_hired' && staffCount >= 2) {
    done.add('buy_plot');
    done.add('open_business');
    done.add('earn_500');
    done.add('hire_second');
    return { ...q, step: 'hire_second', stepsDone: [...done] };
  }
  return q;
}

export { BUSINESS_TYPES, findBusinessType };
