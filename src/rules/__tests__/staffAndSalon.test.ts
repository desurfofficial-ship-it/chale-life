import { describe, expect, it } from 'vitest';
import { createBusinessSim, setStaffOnShift, tickBusiness } from '../worldBusiness';
import { findBusiness, BUSINESSES } from '../../data/worldBusinesses';

describe('staff on-shift management', () => {
  it('toggles a staff member without losing others', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    let sim = createBusinessSim(def);
    const id = sim.staff[0].id;
    sim = setStaffOnShift(sim, id, false);
    expect(sim.staff.find((s) => s.id === id)?.onShift).toBe(false);
    expect(sim.staff.filter((s) => s.onShift).length).toBe(sim.staff.length - 1);
  });

  it('preserves off-shift while open across a tick', () => {
    const def = findBusiness('BIZ_KWAME_BARBER')!;
    let sim = createBusinessSim(def);
    const id = sim.staff[0].id;
    sim = setStaffOnShift(sim, id, false);
    sim = tickBusiness(def, sim, 1, 12);
    expect(sim.staff.find((s) => s.id === id)?.onShift).toBe(false);
  });
});

describe('salon and gym world shells', () => {
  it('exist without footprint overlap', () => {
    for (const id of ['BIZ_AUNTIE_SALON', 'BIZ_FIT_ZONE_GYM'] as const) {
      expect(findBusiness(id)).toBeTruthy();
    }
    const boxes = BUSINESSES.map((b) => ({
      id: b.id,
      x0: b.site.x - b.site.w / 2,
      x1: b.site.x + b.site.w / 2,
      z0: b.site.z - b.site.d / 2,
      z1: b.site.z + b.site.d / 2,
    }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const hit = a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
        expect(hit, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });
});
