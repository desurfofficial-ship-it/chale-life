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
    // ACCRA MAP: the DAAVI_PLOT kiosk front (Jamestown), on the plot
    // pavement — engine/markers depend on them.
    expect(daavi.x).toBe(-126.5);
    expect(daavi.z).toBe(-1.85);
  });

  it('every location sits inside the Accra plate bounds (x −280…340, z −116…116)', () => {
    for (const l of locations) {
      expect(l.x).toBeGreaterThanOrEqual(-280);
      expect(l.x).toBeLessThanOrEqual(340);
      expect(l.z).toBeGreaterThanOrEqual(-116);
      expect(l.z).toBeLessThanOrEqual(116);
    }
  });

  it('types are from the known LocationType set', () => {
    const valid = new Set(['food', 'home', 'shop', 'transport', 'landmark', 'job']);
    for (const l of locations) {
      expect(valid.has(l.type)).toBe(true);
    }
  });
});

describe('locations: G-008d split zones', () => {
  it('LOC-001-JOB is the kiosk-side job spot at (−122.9, −2.4)', () => {
    const job = locations.find((l) => l.id === 'LOC-001-JOB')!;
    expect(job.name).toBe("Daavi's Job Spot");
    expect(job.type).toBe('job');
    expect(job.x).toBe(-122.9); // just off the kiosk east wall (kiosk x1 = −125)
    expect(job.z).toBe(-2.4); // inside the plot, 3.61 m from the counter
  });

  it('LOC-006 marks the James Town lighthouse, off the carriageway', () => {
    const junction = locations.find((l) => l.id === 'LOC-006')!;
    expect(junction.name).toBe('James Town Lighthouse');
    expect(junction.x).toBe(-146);
    expect(junction.z).toBe(22.5); // the real lighthouse, south of Daavi St
  });
});
