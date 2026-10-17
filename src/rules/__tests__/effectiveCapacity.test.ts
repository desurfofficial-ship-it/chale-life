
import { describe, expect, it } from 'vitest';
import {
  createBusinessSim,
  setStaffOnShift,
  effectiveCapacity,
  tickBusiness,
} from '../worldBusiness';
import { findBusiness } from '../../data/worldBusinesses';

describe('effectiveCapacity from staff', () => {
  it('full roster matches catalogue capacity', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    const sim = createBusinessSim(def);
    expect(effectiveCapacity(def, sim)).toBe(def.capacity);
  });

  it('half staff reduces capacity proportionally', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    let sim = createBusinessSim(def);
    const half = Math.ceil(sim.staff.length / 2);
    for (let i = 0; i < half; i++) {
      sim = setStaffOnShift(sim, sim.staff[i].id, false);
    }
    const on = sim.staff.filter((s) => s.onShift).length;
    const expected = Math.max(1, Math.round((def.capacity * on) / sim.staff.length));
    expect(effectiveCapacity(def, sim)).toBe(expected);
    expect(effectiveCapacity(def, sim)).toBeLessThan(def.capacity);
  });

  it('zero staff stays zero across open ticks (no auto-restore)', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    let sim = createBusinessSim(def);
    for (const s of [...sim.staff]) {
      sim = setStaffOnShift(sim, s.id, false);
    }
    expect(effectiveCapacity(def, sim)).toBe(0);
    sim = tickBusiness(def, sim, 5, 12);
    expect(sim.staff.every((s) => !s.onShift)).toBe(true);
    expect(effectiveCapacity(def, sim)).toBe(0);
  });

  it('closed hour does not wipe roster for next open', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    let sim = createBusinessSim(def);
    const id = sim.staff[0].id;
    sim = setStaffOnShift(sim, id, false);
    sim = tickBusiness(def, sim, 2, 3); // closed for barber (opens 8)
    expect(sim.staff.find((s) => s.id === id)?.onShift).toBe(false);
    expect(sim.staff.filter((s) => s.onShift).length).toBe(sim.staff.length - 1);
  });
});
