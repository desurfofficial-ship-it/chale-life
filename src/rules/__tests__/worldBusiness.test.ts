import { describe, expect, it } from 'vitest';
import { BUSINESSES, SPAWN_XZ, businessesNear, findBusiness } from '../../data/worldBusinesses';
import {
  isBusinessOpen,
  customerArrivalRate,
  createBusinessSim,
  tickBusiness,
  canBuyItem,
  footprintsOverlap,
  busyLabel,
} from '../worldBusiness';

describe('B-001 business rules', () => {
  it('defines businesses (restaurants + shops including service slice)', () => {
    expect(BUSINESSES.length).toBeGreaterThanOrEqual(10);
    expect(BUSINESSES.filter((b) => b.kind === 'restaurant')).toHaveLength(5);
    expect(BUSINESSES.filter((b) => b.kind === 'shop').length).toBeGreaterThanOrEqual(5);
    expect(BUSINESSES.some((b) => b.sub === 'barber')).toBe(true);
  });

  it('places at least 3 businesses within 60 m of Daavi spawn', () => {
    const near = businessesNear(SPAWN_XZ.x, SPAWN_XZ.z, 60);
    expect(near.length).toBeGreaterThanOrEqual(3);
  });

  it('every business is findable by id and has menu + staff', () => {
    for (const b of BUSINESSES) {
      expect(findBusiness(b.id)?.name).toBe(b.name);
      expect(b.menu.length).toBeGreaterThan(0);
      expect(b.staffRoles.length).toBeGreaterThan(0);
      expect(b.site.w).toBeGreaterThan(0);
      expect(b.site.d).toBeGreaterThan(0);
    }
  });

  it('business footprints do not overlap each other', () => {
    for (let i = 0; i < BUSINESSES.length; i++) {
      for (let j = i + 1; j < BUSINESSES.length; j++) {
        const a = BUSINESSES[i].site;
        const b = BUSINESSES[j].site;
        expect(footprintsOverlap(a, b)).toBe(false);
      }
    }
  });

  it('open/closed respects overnight hours', () => {
    const spot = findBusiness('BIZ_SPOT_21')!;
    expect(isBusinessOpen(spot, 15)).toBe(true);
    expect(isBusinessOpen(spot, 1)).toBe(true);
    expect(isBusinessOpen(spot, 10)).toBe(false);
  });

  it('lunch rush boosts restaurant arrival rate', () => {
    const chop = findBusiness('BIZ_MAMA_AFIA_CHOP')!;
    const lunch = customerArrivalRate(chop, 12.5);
    const mid = customerArrivalRate(chop, 15);
    expect(lunch).toBeGreaterThan(mid);
    expect(customerArrivalRate(chop, 3)).toBe(0);
  });

  it('tick moves customers queue → seated and earns revenue', () => {
    const chop = findBusiness('BIZ_MAMA_AFIA_CHOP')!;
    let sim = createBusinessSim(chop);
    for (let i = 0; i < 40; i++) sim = tickBusiness(chop, sim, 5, 12.5);
    expect(sim.seated + sim.queue).toBeGreaterThan(0);
    // after enough dwell time revenue climbs
    for (let i = 0; i < 20; i++) sim = tickBusiness(chop, sim, 10, 12.5);
    expect(sim.dayRevenueGHS).toBeGreaterThan(0);
  });

  it('canBuyItem gates on closed / cash / stock', () => {
    const prov = findBusiness('BIZ_KOFI_PROVISION')!;
    const sim = createBusinessSim(prov);
    const item = prov.menu[0];
    expect(canBuyItem(prov, sim, item, 100, 10).ok).toBe(true);
    expect(canBuyItem(prov, sim, item, 0, 10).ok).toBe(false);
    expect(canBuyItem(prov, sim, item, 100, 3).ok).toBe(false);
  });

  it('busyLabel reflects load', () => {
    const sim = createBusinessSim(findBusiness('BIZ_MAMA_AFIA_CHOP')!);
    expect(busyLabel({ ...sim, seated: 0, queue: 0 }, 12)).toBe('Quiet');
    expect(busyLabel({ ...sim, seated: 11, queue: 2 }, 12)).toBe('Packed');
  });
});


describe('P0 canBuyItem integrity', () => {
  it('rejects non-finite and negative menu prices', () => {
    const prov = findBusiness('BIZ_KOFI_PROVISION')!;
    const sim = createBusinessSim(prov);
    const base = prov.menu[0];
    expect(canBuyItem(prov, sim, { ...base, priceGHS: Number.NaN }, 100, 10).ok).toBe(false);
    expect(canBuyItem(prov, sim, { ...base, priceGHS: -5 }, 100, 10).ok).toBe(false);
  });

  it('rejects non-finite wallet balances', () => {
    const prov = findBusiness('BIZ_KOFI_PROVISION')!;
    const sim = createBusinessSim(prov);
    expect(canBuyItem(prov, sim, prov.menu[0], Number.NaN, 10).ok).toBe(false);
  });
});


describe('service interior props', () => {
  it('barber business has a menu and is near spawn', () => {
    const barber = findBusiness('BIZ_KWAME_BARBER');
    expect(barber).toBeTruthy();
    expect(barber!.sub).toBe('barber');
    expect(barber!.menu.length).toBeGreaterThan(0);
    const dist = Math.hypot(barber!.site.x - SPAWN_XZ.x, barber!.site.z - SPAWN_XZ.z);
    expect(dist).toBeLessThan(60);
  });
});

describe('service vertical slice near spawn', () => {
  it('salon and gym exist with menus and stay near spawn', () => {
    for (const id of ['BIZ_AUNTIE_SALON', 'BIZ_FIT_ZONE_GYM'] as const) {
      const b = findBusiness(id);
      expect(b).toBeTruthy();
      expect(b!.menu.length).toBeGreaterThan(0);
      const dist = Math.hypot(b!.site.x - SPAWN_XZ.x, b!.site.z - SPAWN_XZ.z);
      expect(dist).toBeLessThan(80);
    }
  });
});
