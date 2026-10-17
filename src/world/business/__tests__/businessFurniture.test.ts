import { describe, expect, it } from 'vitest';
import { findBusiness, BUSINESSES } from '../../../data/worldBusinesses';
import { propsFor } from '../businessFurniture';

describe('businessFurniture propsFor', () => {
  it('returns props for every business without throwing', () => {
    for (const b of BUSINESSES) {
      const props = propsFor(b);
      expect(props.length).toBeGreaterThan(0);
      for (const p of props) {
        expect(p.path).toContain('models/furniture');
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    }
  });

  it('barber layout reuses existing living/office assets', () => {
    const barber = findBusiness('BIZ_KWAME_BARBER')!;
    const props = propsFor(barber);
    const paths = props.map((p) => p.path).join(' ');
    expect(paths).toMatch(/mirror-stand|office-chair|sofa/);
  });
});
