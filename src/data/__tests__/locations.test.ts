import { describe, expect, it } from 'vitest';
import { locations } from '../locations';

describe('locations: contract invariants (W-002)', () => {
  it('ids are unique and keep their W-001 numbering', () => {
    const ids = locations.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const expected of ['LOC-001', 'LOC-002', 'LOC-003', 'LOC-004', 'LOC-005', 'LOC-006']) {
      expect(ids).toContain(expected);
    }
  });

  it('LOC-001 is Daavi (G-005/W-002 display rename), still the waakye food stop', () => {
    const daavi = locations.find((l) => l.id === 'LOC-001')!;
    expect(daavi.name).toBe("Daavi's Waakye Joint");
    expect(daavi.type).toBe('food');
    // Coordinates are unchanged from W-001 — engine/markers depend on them.
    expect(daavi.x).toBe(15.5);
    expect(daavi.z).toBe(2.4);
  });

  it('every location sits inside the 60 × 60 m world bounds', () => {
    for (const l of locations) {
      expect(Math.abs(l.x)).toBeLessThanOrEqual(30);
      expect(Math.abs(l.z)).toBeLessThanOrEqual(30);
    }
  });

  it('types are from the known LocationType set', () => {
    const valid = new Set(['food', 'home', 'shop', 'transport', 'landmark']);
    for (const l of locations) {
      expect(valid.has(l.type)).toBe(true);
    }
  });
});
