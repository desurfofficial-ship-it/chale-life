/**
 * B-001 — Business simulation store. Tick via registerAmbient (shared ambient step).
 */
import { BUSINESSES, findBusiness, type BusinessDef, type MenuItem } from '../data/worldBusinesses';
import {
  createBusinessSim,
  tickBusiness,
  canBuyItem,
  setStaffOnShift as applyStaffOnShift,
  type BusinessSimState,
} from '../rules/worldBusiness';
import { getAmbientHour } from './ambientClock';

const SIM_INTERVAL_S = 0.25;
const GAME_MIN_PER_REAL_SEC = 1; // match office scale lightly

export interface BusinessStoreState {
  readonly sims: Record<string, BusinessSimState>;
  readonly selectedBusinessId: string | null;
}

let state: BusinessStoreState = { sims: {}, selectedBusinessId: null };
const listeners = new Set<() => void>();
let simAcc = 0;

function ensureSims(): void {
  if (Object.keys(state.sims).length) return;
  const sims: Record<string, BusinessSimState> = {};
  for (const b of BUSINESSES) sims[b.id] = createBusinessSim(b);
  state = { ...state, sims };
}

ensureSims();

function emit(): void {
  for (const l of listeners) l();
}

export function getBusinessState(): BusinessStoreState {
  return state;
}

export function subscribeBusiness(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function selectBusiness(id: string | null): void {
  if (state.selectedBusinessId === id) return;
  state = { ...state, selectedBusinessId: id };
  emit();
}

/**
 * Full sim for businesses near the camera (radiusM); cheap tick for the rest.
 */
export function tickBusinesses(dtReal: number, hourOverride?: number, focus?: { x: number; z: number }): void {
  simAcc += dtReal;
  if (simAcc < SIM_INTERVAL_S) return;
  const dtGameMin = simAcc * GAME_MIN_PER_REAL_SEC;
  simAcc = 0;
  const hour = hourOverride ?? getAmbientHour();
  const sims: Record<string, BusinessSimState> = { ...state.sims };
  let changed = false;
  for (const b of BUSINESSES) {
    const before = sims[b.id] ?? createBusinessSim(b);
    const near =
      !focus || Math.hypot(b.site.x - focus.x, b.site.z - focus.z) < 80;
    // far: tick at 1/4 rate by skipping 3/4 of calls via id hash — always tick but with less customer resolution
    const after = tickBusiness(b, before, near ? dtGameMin : dtGameMin * 0.5, hour);
    if (after !== before) {
      sims[b.id] = after;
      changed = true;
    }
  }
  if (changed) {
    state = { ...state, sims };
    emit();
  }
}

export interface BuyResult {
  ok: boolean;
  reason?: string;
  item?: MenuItem;
  hungerRestore?: number;
  thirstRestore?: number;
  priceGHS?: number;
}

/** Validate purchase; caller debits wallet + applies needs. */
export function tryBuy(businessId: string, itemId: string, walletGHS: number): BuyResult {
  const def = findBusiness(businessId);
  if (!def) return { ok: false, reason: 'Unknown shop' };
  const item = def.menu.find((m) => m.id === itemId);
  if (!item) return { ok: false, reason: 'Unknown item' };
  const sim = state.sims[businessId] ?? createBusinessSim(def);
  const hour = getAmbientHour();
  const gate = canBuyItem(def, sim, item, walletGHS, hour);
  if (!gate.ok) return { ok: false, reason: gate.reason };
  // decrement stock + revenue
  const stock = { ...sim.stock, [item.id]: Math.max(0, (sim.stock[item.id] ?? 1) - 1) };
  const next: BusinessSimState = {
    ...sim,
    stock,
    dayRevenueGHS: sim.dayRevenueGHS + item.priceGHS,
  };
  state = { ...state, sims: { ...state.sims, [businessId]: next } };
  emit();
  return {
    ok: true,
    item,
    hungerRestore: item.hungerRestore,
    thirstRestore: item.thirstRestore,
    priceGHS: item.priceGHS,
  };
}

export function businessJobsFor(businessId: string) {
  return findBusiness(businessId)?.jobs ?? [];
}

export function __resetBusinessesForTests(): void {
  state = { sims: {}, selectedBusinessId: null };
  simAcc = 0;
  ensureSims();
}


/** Player toggles a staff member on/off shift for a world business. */
export function requestSetStaffOnShift(businessId: string, staffId: string, onShift: boolean): boolean {
  const sim = state.sims[businessId];
  if (!sim) return false;
  const next = applyStaffOnShift(sim, staffId, onShift);
  if (next === sim) return false;
  state = { ...state, sims: { ...state.sims, [businessId]: next } };
  for (const l of listeners) l();
  return true;
}
