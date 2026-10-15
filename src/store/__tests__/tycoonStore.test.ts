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
});

describe('tycoonStore regressions (deep-sweep)', () => {
  it('notify() swaps the snapshot identity — useSyncExternalStore re-renders on commit', () => {
    const before = getTycoonState();
    setTycoonMode(true);
    const after = getTycoonState();
    expect(after).not.toBe(before); // in-place mutation used to keep one identity forever
    expect(after.tycoonMode).toBe(true);
    setTycoonMode(false);
  });

  it('earns revenue through the LIVE 1-minute advanceClock cadence', () => {
    requestBuyPlot(plot);
    requestOpenBusiness(plot, 'chop_bar', 'suggested');
    const before = getTycoonState().clock;
    // 3 game hours at the rAF cadence (60 × 1/60 s per game-minute)
    for (let m = 0; m < 180; m++) {
      for (let i = 0; i < 60; i++) advanceClock(1 / 60);
    }
    const chop = getTycoonState().businesses.find((b) => b.typeId === 'chop_bar')!;
    expect(getTycoonState().clock.minutes).toBe((before.minutes + 180) % 1440);
    expect(chop.revenueToday).toBeGreaterThan(0);
    expect(chop.customersToday).toBeGreaterThan(0);
  });

  it('loadTycoon normalizes a corrupt clock and weather', () => {
    requestBuyPlot(plot);
    saveTycoon();
    const bad = {
      ownedPlotIds: ['ok', 42, null],
      businesses: 'not-an-array',
      clock: { day: 0, minutes: 9999, speed: 99 },
      weather: 'monsoon',
    };
    setSaveBackend({ load: () => JSON.stringify(bad), save: () => {} });
    __resetTycoonForTests();
    loadTycoon();
    const s = getTycoonState();
    expect(s.clock.day).toBe(1);
    expect(s.clock.minutes).toBeLessThanOrEqual(1439);
    expect(s.clock.speed).toBe(1); // falls back to the default speed
    expect(s.weather).toBe('clear'); // unknown kind rejected
    expect(s.ownedPlotIds).toEqual(['ok']); // non-strings dropped
    expect(s.businesses).toEqual([]); // non-array ignored
  });

  it('a day roll resets the day counters AND the fractional accumulators', () => {
    requestBuyPlot(plot);
    requestOpenBusiness(plot, 'chop_bar', 'suggested');
    // 8:00 → 16:00 (offline cap is 480 game-minutes per call)
    advanceClock(480);
    const midday = getTycoonState().businesses.find((b) => b.typeId === 'chop_bar')!;
    expect(midday.costAcc ?? 0).toBeGreaterThan(0);
    // 16:00 → 24:00 rolls mid-call, then the remaining calls tick 16h into
    // day 2 (8h post-roll in call 2 + 8h in call 3)
    advanceClock(480);
    advanceClock(480);
    const chop = getTycoonState().businesses.find((b) => b.typeId === 'chop_bar')!;
    expect(getTycoonState().clock.day).toBe(2);
    // The reset is proven by the accumulator: costAcc holds ONLY the 16h
    // post-roll window (₵140 × 16/24 ≈ 93.33). Without the reset it would
    // carry day-1's 16h (₵93.33) on top — ₵186.67.
    expect(chop.costAcc ?? 0).toBeCloseTo(93.33, 1);
    expect(chop.pendingCustomers ?? 0).toBeLessThan(1);
  });
});
