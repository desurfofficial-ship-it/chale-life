/**
 * B-001 — Pure rules for world-run shops & restaurants.
 * No store, no three.js, no React.
 */
import type { BusinessDef, MenuItem } from '../data/worldBusinesses';

export function isBusinessOpen(def: BusinessDef, hour: number): boolean {
  const h = ((hour % 24) + 24) % 24;
  const open = def.openHour;
  const close = def.closeHour;
  // overnight (e.g. Spot 21 14→02)
  if (close < open) return h >= open || h < close;
  return h >= open && h < close;
}

/** Lunch 12–14 and evening 18–21 boost restaurants. */
export function customerArrivalRate(def: BusinessDef, hour: number): number {
  if (!isBusinessOpen(def, hour)) return 0;
  let m = 1;
  if (def.kind === 'restaurant') {
    if (hour >= 12 && hour < 14) m = 2.2;
    else if (hour >= 18 && hour < 21) m = 1.8;
    else if (hour >= 7 && hour < 9) m = 1.4;
  } else {
    if (hour >= 17 && hour < 19) m = 1.5;
    else if (hour >= 10 && hour < 12) m = 1.2;
  }
  return def.customersPerHour * m;
}

export interface BusinessStaffState {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly onShift: boolean;
}

export interface CustomerState {
  readonly id: string;
  readonly phase: 'queue' | 'seated' | 'leaving';
  readonly sinceMin: number;
  readonly seat?: number;
}

export interface BusinessSimState {
  readonly queue: number;
  readonly seated: number;
  readonly stock: Record<string, number>;
  readonly dayRevenueGHS: number;
  readonly staff: readonly BusinessStaffState[];
  readonly customers: readonly CustomerState[];
  readonly log: readonly string[];
}

export function createBusinessSim(def: BusinessDef): BusinessSimState {
  const staff: BusinessStaffState[] = [];
  let i = 0;
  for (const r of def.staffRoles) {
    for (let k = 0; k < r.count; k++) {
      staff.push({
        id: `${def.id}_S${i}`,
        name: r.names[k] ?? `${r.role}-${k + 1}`,
        role: r.role,
        onShift: true,
      });
      i++;
    }
  }
  const stock: Record<string, number> = {};
  for (const m of def.menu) stock[m.id] = def.kind === 'shop' ? 40 : 999;
  return {
    queue: 0,
    seated: 0,
    stock,
    dayRevenueGHS: 0,
    staff,
    customers: [],
    log: [],
  };
}

/** Tick one business by dtGameMin game-minutes at hour. */

/**
 * Staff on shift scales service capacity. Zero on-shift staff → capacity 0
 * (no seating). Full roster → catalogue capacity. Linear in between.
 */
export function effectiveCapacity(def: BusinessDef, state: BusinessSimState): number {
  const total = state.staff.length;
  if (total === 0) return def.capacity;
  const on = state.staff.filter((s) => s.onShift).length;
  if (on <= 0) return 0;
  return Math.max(1, Math.round((def.capacity * on) / total));
}

export function tickBusiness(
  def: BusinessDef,
  state: BusinessSimState,
  dtGameMin: number,
  hour: number,
): BusinessSimState {
  const open = isBusinessOpen(def, hour);
  let queue = state.queue;
  let seated = state.seated;
  let revenue = state.dayRevenueGHS;
  let stock = state.stock;
  const log = state.log;
  let customers = state.customers.map((c) => ({ ...c, sinceMin: c.sinceMin + dtGameMin }));

  // Preserve player onShift roster always. While closed, capacity/arrivals use
  // an effective off-shift view without wiping the saved roster.
  const staff = state.staff;
  const staffForOps = open
    ? staff
    : staff.map((s) => ({ ...s, onShift: false }));

  if (!open) {
    // clear floor slowly — keep roster for next open
    queue = 0;
    seated = Math.max(0, seated - dtGameMin * 0.5);
    customers = customers
      .map((c) => (c.phase === 'leaving' ? c : { ...c, phase: 'leaving' as const }))
      .filter((c) => c.sinceMin < 8);
    return { ...state, queue, seated, staff, customers, log };
  }

  // arrivals
  const staffRatio =
    staffForOps.length === 0
      ? 1
      : staffForOps.filter((s) => s.onShift).length / staffForOps.length;
  const rate = customerArrivalRate(def, hour) * staffRatio; // per hour, staff-scaled
  const arrive = (rate * dtGameMin) / 60;
  // deterministic fractional from revenue cents (floor + frac, no Math.random)
  const frac = (revenue * 10 + seated * 3 + queue) % 1;
  const nNew = Math.floor(arrive + frac);
  if (nNew > 0) {
    queue += nNew;
    for (let i = 0; i < nNew; i++) {
      customers = [
        ...customers,
        {
          id: `c_${def.id}_${Math.floor(revenue * 100 + customers.length + i)}`,
          phase: 'queue',
          sinceMin: 0,
        },
      ];
    }
  }

  // seat from queue
  const cap = effectiveCapacity(def, { ...state, staff: staffForOps });
  const free = Math.max(0, cap - seated);
  const seatN = Math.min(free, queue, Math.max(1, Math.floor(dtGameMin / 2)));
  if (seatN > 0 && queue > 0) {
    let left = seatN;
    customers = customers.map((c) => {
      if (c.phase === 'queue' && left > 0) {
        left--;
        return { ...c, phase: 'seated' as const, sinceMin: 0, seat: cap - free + (seatN - left) };
      }
      return c;
    });
    queue -= seatN - left;
    seated += seatN - left;
  }

  // seated customers finish (avg 25 min restaurant, 8 min shop)
  const dwell = def.kind === 'restaurant' ? 25 : 8;
  const finished: CustomerState[] = [];
  customers = customers.filter((c) => {
    if (c.phase === 'seated' && c.sinceMin >= dwell) {
      finished.push(c);
      return false;
    }
    if (c.phase === 'leaving' && c.sinceMin >= 5) return false;
    return true;
  });
  if (finished.length) {
    seated = Math.max(0, seated - finished.length);
    // spend average menu price
    const avg =
      def.menu.reduce((s, m) => s + m.priceGHS, 0) / Math.max(1, def.menu.length);
    revenue += finished.length * avg;
    // shops decrement stock
    if (def.kind === 'shop') {
      stock = { ...stock };
      const item = def.menu[Math.floor(revenue) % def.menu.length];
      if (item) stock[item.id] = Math.max(0, (stock[item.id] ?? 0) - finished.length);
    }
  }

  // restock shops slowly when low
  if (def.kind === 'shop') {
    stock = { ...stock };
    for (const m of def.menu) {
      if ((stock[m.id] ?? 0) < 5) stock[m.id] = (stock[m.id] ?? 0) + Math.floor(dtGameMin / 30);
    }
  }

  // trim customer list
  if (customers.length > 40) customers = customers.slice(-30);

  return { queue, seated, stock, dayRevenueGHS: revenue, staff, customers, log };
}

export function canBuyItem(
  def: BusinessDef,
  state: BusinessSimState,
  item: MenuItem,
  walletGHS: number,
  hour: number,
): { ok: true } | { ok: false; reason: string } {
  if (!isBusinessOpen(def, hour)) return { ok: false, reason: 'Closed' };
  if (!Number.isFinite(item.priceGHS) || item.priceGHS < 0) {
    return { ok: false, reason: 'Invalid item price' };
  }
  if (!Number.isFinite(walletGHS) || walletGHS < item.priceGHS) {
    return { ok: false, reason: 'Need cash' };
  }
  if (def.kind === 'shop' && (state.stock[item.id] ?? 0) <= 0) return { ok: false, reason: 'Out of stock' };
  return { ok: true };
}

export function busyLabel(state: BusinessSimState, capacity: number): string {
  const load = (state.seated + state.queue) / Math.max(1, capacity);
  if (load < 0.2) return 'Quiet';
  if (load < 0.5) return 'Steady';
  if (load < 0.85) return 'Busy';
  return 'Packed';
}

/** Axis-aligned footprint overlap test (world XZ). */
export function footprintsOverlap(
  a: { x: number; z: number; w: number; d: number },
  b: { x: number; z: number; w: number; d: number },
  pad = 0.5,
): boolean {
  const ax0 = a.x - a.w / 2 - pad;
  const ax1 = a.x + a.w / 2 + pad;
  const az0 = a.z - a.d / 2 - pad;
  const az1 = a.z + a.d / 2 + pad;
  const bx0 = b.x - b.w / 2;
  const bx1 = b.x + b.w / 2;
  const bz0 = b.z - b.d / 2;
  const bz1 = b.z + b.d / 2;
  return ax0 < bx1 && ax1 > bx0 && az0 < bz1 && az1 > bz0;
}


/** Toggle one staff member on/off shift (player management). */
export function setStaffOnShift(
  state: BusinessSimState,
  staffId: string,
  onShift: boolean,
): BusinessSimState {
  if (!state.staff.some((s) => s.id === staffId)) return state;
  return {
    ...state,
    staff: state.staff.map((s) => (s.id === staffId ? { ...s, onShift } : s)),
  };
}
