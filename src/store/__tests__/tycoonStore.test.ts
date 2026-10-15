import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetTycoonForTests,
  advanceClock,
  getTycoonState,
  loadTycoon,
  requestBuyPlot,
  requestOpenBusiness,
  saveTycoon,
  setSaveBackend,
  setTycoonMode,
} from '../tycoonStore';
import { setWalletBalanceGHS } from '../gameStore';
import type { PlotRef } from '../../rules/business';

const plot: PlotRef = {
  id: 'test-plot-1',
  x: 0,
  z: 0,
  w: 7,
  d: 6,
  zone: 'chorkor',
  price: 500,
};

beforeEach(() => {
  const mem = new Map<string, string>();
  setSaveBackend({
    load: () => mem.get('s') ?? null,
    save: (j) => {
      mem.set('s', j);
    },
  });
  __resetTycoonForTests();
  setWalletBalanceGHS(50000);
});

describe('tycoonStore', () => {
  it('buys a plot and opens a chop bar', () => {
    const ok = requestBuyPlot(plot);
    expect(ok).toBe(true);
    expect(getTycoonState().ownedPlotIds).toContain(plot.id);

    const opened = requestOpenBusiness(plot, 'chop_bar', 'suggested');
    expect(opened).toBe(true);
    expect(getTycoonState().businesses.length).toBe(1);
    expect(getTycoonState().businesses[0].open).toBe(true);
  });

  it('accumulates sub-second rAF dts into full minutes', () => {
    const before = getTycoonState().clock.minutes;
    // 60 × 1/60 s at 1× → 1 game minute
    for (let i = 0; i < 60; i++) advanceClock(1 / 60);
    expect(getTycoonState().clock.minutes).toBe(before + 1);
  });

  it('advanceClock advances minutes', () => {
    requestBuyPlot({ ...plot, id: 'earn-plot' });
    requestOpenBusiness({ ...plot, id: 'earn-plot' }, 'chop_bar', 'suggested');
    const beforeMin = getTycoonState().clock.minutes;
    advanceClock(120);
    expect(getTycoonState().clock.minutes).toBe(beforeMin + 120);
  });

  it('tycoonMode toggles', () => {
    setTycoonMode(true);
    expect(getTycoonState().tycoonMode).toBe(true);
    setTycoonMode(false);
    expect(getTycoonState().tycoonMode).toBe(false);
  });

  it('save and load round-trips owned plots', () => {
    requestBuyPlot(plot);
    saveTycoon();
    __resetTycoonForTests();
    expect(getTycoonState().ownedPlotIds).toEqual([]);
    loadTycoon();
    expect(getTycoonState().ownedPlotIds).toContain(plot.id);
  });

  // E-011: a corrupt-but-valid-JSON save used to flow into advanceClock's
  // tick() every frame — one bad business row crashed the game permanently.
  it('loadTycoon drops garbage business rows instead of crashing the clock', () => {
    const mem = {
      s: JSON.stringify({
        ownedPlotIds: [plot.id],
        // second row is garbage from a corrupted write; first row is valid
        businesses: [
          {
            id: 'biz-ok',
            plotId: plot.id,
            typeId: 'chop_bar',
            budgetTier: 'min',
            startupPaid: 100,
            staff: 1,
            capacity: 10,
            costPerDay: 5,
            layout: [],
            open: true,
            revenueToday: 0,
            costsToday: 0,
            customersToday: 0,
          },
          { id: 42 },
          { plotId: plot.id, revenueToday: 'lots' },
          null,
        ],
        clock: { day: 3, minutes: 999999, speed: 4 }, // garbage clock fields
      }),
    };
    setSaveBackend({ load: () => mem.s, save: () => {} });
    __resetTycoonForTests();
    expect(() => loadTycoon()).not.toThrow();
    const s = getTycoonState();
    expect(s.businesses.length).toBe(1);
    expect(s.businesses[0].id).toBe('biz-ok');
    expect(s.ownedPlotIds).toContain(plot.id);
    // clock clamped into its domain (minutes 0..1439, speed valid, day ≥ 1)
    expect(s.clock.minutes).toBe(1439);
    expect(s.clock.day).toBe(3);
    expect(s.clock.speed).toBe(1);
    // the clock keeps advancing on the surviving row without throwing
    expect(() => advanceClock(5)).not.toThrow();
  });
});
