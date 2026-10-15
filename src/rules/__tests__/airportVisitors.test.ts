import { describe, expect, it } from 'vitest';
import { countLandingsInWindow, visitorBoostFromLanding } from '../airportVisitors';

describe('airport visitor boost', () => {
  it('no landings → no boost', () => {
    expect(visitorBoostFromLanding(0)).toBe(0);
  });
  it('scales with landings then soft-caps', () => {
    const a = visitorBoostFromLanding(1);
    const b = visitorBoostFromLanding(4);
    const c = visitorBoostFromLanding(8);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(b * 2.5);
  });
  it('counts landings in window', () => {
    const ev = [
      { t: 100, kind: 'landing' },
      { t: 200, kind: 'takeoff' },
      { t: 500, kind: 'landing' },
    ];
    expect(countLandingsInWindow(ev, 4000, 3600)).toBe(1);
    expect(countLandingsInWindow(ev, 600, 600)).toBe(2);
    expect(countLandingsInWindow(ev, 400, 50)).toBe(0);
  });
});
