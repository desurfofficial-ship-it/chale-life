import { describe, expect, it } from 'vitest';
import {
  FURNITURE_CATALOG,
  findFurnitureById,
  comfortPctFromOwned,
  sleepEnergyBonusFromOwned,
  validateFurnitureKit,
  listHomeFurniture,
  listBusinessFurniture,
  furnitureSizeMeters,
} from '../furniture';
import { BUSINESS_TYPES } from '../businesses';

describe('furniture catalogue', () => {
  it('has unique ids', () => {
    const ids = FURNITURE_CATALOG.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every business kit id resolves in the catalogue', () => {
    for (const t of BUSINESS_TYPES) {
      const missing = validateFurnitureKit(t.furnitureKit);
      expect(missing, `${t.id} missing ${missing.join(',')}`).toEqual([]);
    }
  });

  it('comfort ramps with owned home furniture', () => {
    expect(comfortPctFromOwned([])).toBe(0);
    const chair = comfortPctFromOwned(['chair_plastic']);
    expect(chair).toBeGreaterThan(0);
    expect(comfortPctFromOwned(['chair_plastic', 'table_small'])).toBeGreaterThan(chair);
  });

  it('ignores business kit items for comfort', () => {
    expect(comfortPctFromOwned(['biz_counter', 'biz_stool'])).toBe(0);
  });

  it('sleep bonus reads catalogue effects', () => {
    // bed items if any
    const withBed = FURNITURE_CATALOG.filter((f) => f.effects.sleepEnergyBonus);
    if (withBed.length) {
      expect(sleepEnergyBonusFromOwned([withBed[0].id])).toBeGreaterThan(0);
    } else {
      expect(sleepEnergyBonusFromOwned(['chair_plastic'])).toBe(0);
    }
  });

  it('size helper returns positive dimensions', () => {
    const [w, h, d] = furnitureSizeMeters('biz_counter');
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    expect(d).toBeGreaterThan(0);
    expect(findFurnitureById('nope')).toBeUndefined();
  });

  it('splits home vs business lists', () => {
    expect(listHomeFurniture().every((f) => !f.businessKit)).toBe(true);
    expect(listBusinessFurniture().every((f) => f.businessKit)).toBe(true);
  });
});
