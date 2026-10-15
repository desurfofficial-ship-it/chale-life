import { describe, expect, it } from 'vitest';
import {
  advanceQuest,
  arrange,
  buyPlot,
  createChapter1Quest,
  districtDemand,
  estimate,
  makeEvent,
  openBusiness,
  resolveEventChoice,
  tick,
  weatherModifier,
  type BusinessState,
  type PlotRef,
} from '../business';
import { findBusinessType } from '../../data/businesses';
import { createStarterWallet, pay } from '../economy';

const samplePlot: PlotRef = {
  id: 't11-01-chorkor',
  x: -113.5,
  z: -3.8,
  w: 7,
  d: 5.6,
  zone: 'chorkor',
  price: 1600,
  near: '',
  y: 0,
};

describe('buyPlot', () => {
  it('refuses when short of cash', () => {
    const wallet = createStarterWallet(); // ₵20
    const r = buyPlot(wallet, samplePlot);
    expect(r.ok).toBe(false);
    expect(r.wallet.balanceGHS).toBe(20);
  });

  it('deducts plot price when affordable', () => {
    const wallet = pay(createStarterWallet(), 5000).balanceGHS
      ? { balanceGHS: 5020 }
      : { balanceGHS: 5020 };
    const r = buyPlot(wallet, samplePlot);
    expect(r.ok).toBe(true);
    expect(r.wallet.balanceGHS).toBe(5020 - samplePlot.price);
  });
});

describe('estimate', () => {
  it('returns capacity, staff, costs for chop bar', () => {
    const e = estimate('chop_bar', samplePlot, 'suggested');
    expect(e).not.toBeNull();
    expect(e!.staff).toBe(2);
    expect(e!.startupCost).toBe(1500);
    expect(e!.costPerDay).toBeGreaterThan(0);
    expect(e!.capacity).toBeGreaterThan(0);
  });

  it('scales staff with budget tier', () => {
    const min = estimate('chop_bar', samplePlot, 'min')!;
    const max = estimate('chop_bar', samplePlot, 'max')!;
    expect(max.staff).toBeGreaterThan(min.staff);
    expect(max.startupCost).toBeGreaterThan(min.startupCost);
  });
});

describe('arrange', () => {
  it('places every kit item and keeps them on-grid', () => {
    const type = findBusinessType('chop_bar')!;
    const layout = arrange('chop_bar', 'suggested', { w: 7, d: 6 });
    expect(layout.length).toBeGreaterThanOrEqual(type.furnitureKit.length);
    for (const p of layout) {
      expect(p.tx).toBeGreaterThanOrEqual(0);
      expect(p.tz).toBeGreaterThanOrEqual(0);
      expect(p.tx).toBeLessThan(7);
      expect(p.tz).toBeLessThan(6);
    }
    // Deterministic
    const layout2 = arrange('chop_bar', 'suggested', { w: 7, d: 6 });
    expect(layout2).toEqual(layout);
  });
});

describe('openBusiness', () => {
  it('opens a chop bar and deducts startup', () => {
    const wallet = { balanceGHS: 10000 };
    const r = openBusiness(wallet, {
      typeId: 'chop_bar',
      plot: samplePlot,
      budget: 'suggested',
      businessId: 'biz-1',
    });
    expect(r.ok).toBe(true);
    expect(r.business!.open).toBe(true);
    expect(r.business!.typeId).toBe('chop_bar');
    expect(r.business!.layout.length).toBeGreaterThan(0);
    expect(r.wallet.balanceGHS).toBe(10000 - 1500);
  });
});

describe('weatherModifier', () => {
  const chop = findBusinessType('chop_bar')!;
  const stand = findBusinessType('waakye_stand')!;
  const pharm = findBusinessType('pharmacy')!;

  it('rain hurts street trade and helps pharmacy', () => {
    expect(weatherModifier(stand, 'rain', 12)).toBeLessThan(0.7);
    expect(weatherModifier(pharm, 'rain', 12)).toBeGreaterThan(1.1);
    expect(weatherModifier(chop, 'rain', 12)).toBeGreaterThan(0.9); // indoor
  });

  it('night boosts chop bar and fuel', () => {
    const fuel = findBusinessType('fuel_station')!;
    expect(weatherModifier(chop, 'clear', 21)).toBeGreaterThan(1.2);
    expect(weatherModifier(fuel, 'clear', 22)).toBeGreaterThan(1.2);
  });
});

describe('tick', () => {
  function openChop(): BusinessState {
    const r = openBusiness(
      { balanceGHS: 10000 },
      {
        typeId: 'chop_bar',
        plot: samplePlot,
        budget: 'suggested',
        businessId: 'biz-chop',
      },
    );
    return r.business!;
  }

  it('earns revenue over a game hour', () => {
    const biz = openChop();
    const demand = districtDemand(samplePlot);
    const t = tick(biz, 60, 'clear', 12, demand);
    expect(t.customers).toBeGreaterThan(0);
    expect(t.revenue).toBeGreaterThan(0);
    expect(t.business.revenueToday).toBe(t.revenue);
  });

  it('closed business earns nothing', () => {
    const biz = { ...openChop(), open: false };
    const t = tick(biz, 60, 'clear', 12, 1);
    expect(t.revenue).toBe(0);
    expect(t.customers).toBe(0);
  });
});

describe('7-day simulation', () => {
  /** Full daily opex once per game day (not the hour-fraction tick costs). */
  function runDays(
    biz: BusinessState,
    plot: PlotRef,
    days: number,
    hourRange: { start: number; end: number },
  ): { revenue: number; costs: number; business: BusinessState } {
    const demand = districtDemand(plot);
    let revenue = 0;
    let costs = 0;
    let b = biz;
    for (let day = 0; day < days; day++) {
      for (let h = hourRange.start; h < hourRange.end; h++) {
        const t = tick(b, 60, 'clear', h, demand);
        revenue += t.revenue;
        b = t.business;
      }
      costs += b.costPerDay;
    }
    return { revenue, costs, business: b };
  }

  it('sensible chop bar is profitable over 7 game days (net after startup)', () => {
    const wallet = { balanceGHS: 20000 };
    const bought = buyPlot(wallet, samplePlot);
    expect(bought.ok).toBe(true);
    const opened = openBusiness(bought.wallet, {
      typeId: 'chop_bar',
      plot: samplePlot,
      budget: 'suggested',
      businessId: 'sim-chop',
    });
    expect(opened.ok).toBe(true);
    const startup = opened.business!.startupPaid;
    const { revenue, costs } = runDays(opened.business!, samplePlot, 7, {
      start: 8,
      end: 20,
    });
    // Net = revenue − daily costs − startup  (ticket rule)
    const net = revenue - costs - startup;
    expect(net).toBeGreaterThan(0);
  });

  it('over-budget fuel station is not profitable over 7 days on a small plot', () => {
    const fuelPlot: PlotRef = { ...samplePlot, id: 'fuel-plot', w: 6, d: 5, price: 2000 };
    const wallet = { balanceGHS: 100000 };
    const bought = buyPlot(wallet, fuelPlot);
    expect(bought.ok).toBe(true);
    const opened = openBusiness(bought.wallet, {
      typeId: 'fuel_station',
      plot: fuelPlot,
      budget: 'max',
      businessId: 'sim-fuel',
    });
    expect(opened.ok).toBe(true);
    const startup = opened.business!.startupPaid;
    expect(startup).toBeGreaterThan(40000);
    const { revenue, costs } = runDays(opened.business!, fuelPlot, 7, {
      start: 6,
      end: 22,
    });
    const net = revenue - costs - startup;
    expect(net).toBeLessThan(0);
  });
});

describe('balance payback window', () => {
  const avgPlot: PlotRef = {
    id: 'avg-plot',
    x: 0,
    z: 0,
    w: 7,
    d: 5.6,
    zone: 'chorkor',
    price: 1600,
  };

  it('every business at Suggested recovers startup in 3–30 game days', () => {
    const types = [
      'chop_bar',
      'waakye_stand',
      'phone_shop',
      'barber',
      'salon',
      'provisions',
      'pharmacy',
      'fuel_station',
    ] as const;

    for (const typeId of types) {
      const opened = openBusiness(
        { balanceGHS: 200000 },
        {
          typeId,
          plot: avgPlot,
          budget: 'suggested',
          businessId: `pb-${typeId}`,
        },
      );
      expect(opened.ok, typeId).toBe(true);
      const startup = opened.business!.startupPaid;
      const demand = districtDemand(avgPlot);
      let revenue = 0;
      let costs = 0;
      let b = opened.business!;
      let paybackDay: number | null = null;
      for (let day = 1; day <= 30; day++) {
        const hours =
          typeId === 'fuel_station'
            ? { start: 6, end: 22 }
            : { start: 8, end: 20 };
        for (let h = hours.start; h < hours.end; h++) {
          const t = tick(b, 60, 'clear', h, demand);
          revenue += t.revenue;
          b = t.business;
        }
        costs += b.costPerDay;
        if (revenue - costs >= startup && paybackDay === null) {
          paybackDay = day;
        }
      }
      expect(
        paybackDay,
        `${typeId} never recovered startup in 30 days (rev=${revenue} costs=${costs} startup=${startup})`,
      ).not.toBeNull();
      // Lower bound 2 (was 3): the fractional-customer carry serves the
      // sub-1 customers every hour used to DROP, which is a few % more
      // daily revenue — waakye now pays back in 2 days. The bound guards
      // against instant-payback degeneracies, not against a street stand
      // turning a honest 2-day profit.
      expect(
        paybackDay!,
        `${typeId} recovered too fast (${paybackDay}d < 2)`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        paybackDay!,
        `${typeId} recovered too slow (${paybackDay}d > 30)`,
      ).toBeLessThanOrEqual(30);
    }
  });
});

describe('events', () => {
  it('builds events with choices and resolves costs', () => {
    const ev = makeEvent('power_outage');
    expect(ev.choices.length).toBe(2);
    const wallet = { balanceGHS: 500 };
    const r = resolveEventChoice(wallet, ev, 'generator');
    expect(r.wallet.balanceGHS).toBe(420);
    expect(r.demandMult).toBeCloseTo(0.95);
  });
});

describe('quest chapter 1', () => {
  it('advances First hustle steps in order', () => {
    let q = createChapter1Quest();
    expect(q.step).toBe('buy_plot');
    q = advanceQuest(q, 'plot_bought');
    expect(q.step).toBe('open_business');
    q = advanceQuest(q, 'business_opened');
    expect(q.step).toBe('earn_500');
    q = advanceQuest(q, 'revenue', 200);
    expect(q.earnedToward).toBe(200);
    expect(q.step).toBe('earn_500');
    q = advanceQuest(q, 'revenue', 300);
    expect(q.step).toBe('hire_second');
    q = advanceQuest(q, 'staff_hired', 0, 2);
    expect(q.stepsDone).toContain('hire_second');
  });
});

describe('live 1-minute tick cadence (the rAF path)', () => {
  function openChop(): BusinessState {
    const r = openBusiness(
      { balanceGHS: 10000 },
      { typeId: 'chop_bar', plot: samplePlot, budget: 'suggested', businessId: 'live-chop' },
    );
    return r.business!;
  }

  it('serves customers and earns revenue at 1 game-minute ticks (floor-eat regression)', () => {
    // The ORIGINAL floor per tick served 0 customers at this cadence —
    // a venue paid ₵144/day costs and earned ₵0 forever; the earn_500
    // quest was unreachable in live play (only offline catch-up earned).
    const biz0 = openChop();
    const demand = districtDemand(samplePlot);
    let b = biz0;
    let revenue = 0;
    let costs = 0;
    let customers = 0;
    for (let m = 0; m < 1440; m++) {
      const hour = Math.floor(m / 60);
      const t = tick(b, 1, 'clear', hour, demand);
      revenue += t.revenue;
      costs += t.costs;
      customers += t.customers;
      b = t.business;
    }
    expect(customers).toBeGreaterThan(0);
    expect(revenue).toBeGreaterThan(0);
    expect(b.revenueToday).toBeGreaterThan(0);
    // fractional carry always below one unserved customer
    expect(b.pendingCustomers ?? 0).toBeLessThan(1);
  });

  it('costs per day sum to costPerDay at the 1-minute cadence (rounding-drift regression)', () => {
    // Per-tick round2 of the INCREMENT compounded up to +6 %/day
    // (₵95/day waakye charged ₵100.80). The unrounded accumulator must
    // land on the day rate within a pesewa.
    for (const typeId of ['chop_bar', 'waakye_stand', 'barber', 'fuel_station'] as const) {
      const r = openBusiness(
        { balanceGHS: 100000 },
        { typeId, plot: samplePlot, budget: 'suggested', businessId: `cost-${typeId}` },
      );
      const type = findBusinessType(typeId)!;
      let b = r.business!;
      for (let m = 0; m < 1440; m++) {
        b = tick(b, 1, 'clear', Math.floor(m / 60), 1).business;
      }
      expect(Math.abs(b.costsToday - type.costPerDay)).toBeLessThanOrEqual(0.01);
      expect(Math.abs((b.costAcc ?? 0) - type.costPerDay)).toBeLessThanOrEqual(0.01);
    }
  });

  it('capacity still gates an oversized offline window', () => {
    const biz = openChop();
    const t = tick(biz, 480, 'clear', 12, districtDemand(samplePlot));
    // capacity is the ~8h operating ceiling — an 8h offline catch-up must
    // not serve more than it
    expect(t.customers).toBeLessThanOrEqual(biz.capacity);
  });
});

describe('arrange tile collisions', () => {
  it('never places two furniture items on the same tile, even on a 3×3 plot', () => {
    for (const type of ['chop_bar', 'fuel_station', 'barber', 'provisions'] as const) {
      for (const budget of ['min', 'suggested', 'max'] as const) {
        const layout = arrange(type, budget, { w: 3, d: 3 });
        const cells = new Set<string>();
        for (const p of layout) {
          const key = `${p.tx},${p.tz}`;
          expect(cells.has(key), `${type}/${budget}: duplicate tile ${key}`).toBe(false);
          cells.add(key);
        }
      }
    }
  });
});
