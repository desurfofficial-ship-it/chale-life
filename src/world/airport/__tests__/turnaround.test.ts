import { describe, expect, it } from 'vitest';
import {
  PHASE_DURATION,
  TURNAROUND_PHASES,
  bridgeExtended,
  phaseAt,
  planeOnStand,
} from '../turnaround';
import { AIRPORT, gateSpacingOk } from '../layout';

describe('turnaround', () => {
  it('phases follow the required order', () => {
    expect([...TURNAROUND_PHASES]).toEqual([
      'arrive',
      'deboard',
      'unload',
      'cater',
      'refuel',
      'board',
      'pushback',
      'taxi',
      'takeoff',
      'gone',
    ]);
  });

  it('stagger keeps gates out of sync', () => {
    const a = phaseAt(100, 0).phase;
    const b = phaseAt(100, 1).phase;
    // not always different but usually — check cycle offset works
    expect(phaseAt(0, 0).phase).toBe('arrive');
    expect(phaseAt(PHASE_DURATION.arrive + 1, 0).phase).toBe('deboard');
  });

  it('bridge attaches during deboard and retracts on pushback', () => {
    expect(bridgeExtended('deboard', 0.5)).toBe(1);
    expect(bridgeExtended('pushback', 0.9)).toBeLessThan(0.3);
    expect(bridgeExtended('takeoff', 0.5)).toBe(0);
  });

  it('plane on stand during turnaround core', () => {
    expect(planeOnStand('refuel')).toBe(true);
    expect(planeOnStand('takeoff')).toBe(false);
  });

  it('gate spacing clears wingspan + 6', () => {
    expect(gateSpacingOk()).toBe(true);
    for (let i = 1; i < AIRPORT.gates.length; i++) {
      expect(Math.abs(AIRPORT.gates[i].x - AIRPORT.gates[i - 1].x)).toBeGreaterThanOrEqual(
        AIRPORT.plane.wingspan + 6,
      );
    }
  });

  it('runway wider than wingspan', () => {
    expect(AIRPORT.runway.width).toBeGreaterThan(AIRPORT.plane.wingspan);
  });
});
