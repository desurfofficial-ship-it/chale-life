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
  it('sensible chop bar is profitable over 7 game days', () => {
    let wallet = { balanceGHS: 20000 };
    // buy plot
    const bought = buyPlot(wallet, samplePlot);
    expect(bought.ok).toBe(true);
    wallet = bought.wallet;

    const opened = openBusiness(wallet, {
      typeId: 'chop_bar',
      plot: samplePlot,
      budget: 'suggested',
      businessId: 'sim-chop',
    });
    expect(opened.ok).toBe(true);
    wallet = opened.wallet;
    let biz = opened.business!;
    const demand = districtDemand(samplePlot);

    let totalRevenue = 0;
    let totalCosts = 0;
    // 7 days × 12 operating hours × 60 min, midday clear weather
    for (let day = 0; day < 7; day++) {
      for (let h = 8; h < 20; h++) {
        const t = tick(biz, 60, 'clear', h, demand);
        totalRevenue += t.revenue;
        totalCosts += t.costs;
        biz = t.business;
        wallet = { balanceGHS: wallet.balanceGHS + t.revenue - t.costs };
      }
    }

    expect(totalRevenue).toBeGreaterThan(totalCosts);
    expect(wallet.balanceGHS).toBeGreaterThan(20000 - samplePlot.price - 1500);
  });

  it('over-budget fuel station is not profitable in 7 days on a small plot', () => {
    let wallet = { balanceGHS: 100000 };
    const fuelPlot: PlotRef = { ...samplePlot, id: 'fuel-plot', w: 6, d: 5, price: 2000 };
    wallet = buyPlot(wallet, fuelPlot).wallet;

    const opened = openBusiness(wallet, {
      typeId: 'fuel_station',
      plot: fuelPlot,
      budget: 'max', // over-budget
      businessId: 'sim-fuel',
    });
    expect(opened.ok).toBe(true);
    wallet = opened.wallet;
    let biz = opened.business!;
    const demand = districtDemand(fuelPlot);

    let totalRevenue = 0;
    let totalCosts = 0;
    for (let day = 0; day < 7; day++) {
      for (let h = 6; h < 22; h++) {
        const t = tick(biz, 60, 'clear', h, demand);
        totalRevenue += t.revenue;
        biz = t.business;
      }
      // Full daily opex (rent, staff, utilities) — not just the open-hour fraction
      totalCosts += biz.costPerDay;
    }

    // Over-budget fuel on a small plot: operating net is negative (high cost/day)
    expect(opened.business!.startupPaid).toBeGreaterThan(40000);
    expect(totalRevenue - totalCosts).toBeLessThan(0);
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
