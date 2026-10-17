/**
 * W-009 props data invariants — the generator (scripts/emit-placements.mjs)
 * enforces these at emit time; this test keeps the COMMITTED data honest
 * even if someone edits it by hand.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PROP_KITS, PROP_URLS } from '../propsKit';
import { PROP_PLACEMENTS } from '../propPlacements';

const ROOT = path.resolve(__dirname, '../../../..');

describe('props kit manifest', () => {
  it('ships 60+ archetypes across the 10 categories', () => {
    expect(Object.keys(PROP_KITS).length).toBeGreaterThanOrEqual(60);
  });

  it('every kit file exists under public/models/props/ and is meshopt GLB', () => {
    for (const files of Object.values(PROP_KITS)) {
      for (const f of files) {
        const p = path.join(ROOT, 'public', f);
        expect(existsSync(p), `missing ${p}`).toBe(true);
        const head = readFileSync(p).subarray(0, 4).toString('binary');
        expect(head, `${f} is not a GLB`).toBe('glTF');
      }
    }
  });

  it('PROP_URLS resolves one URL per shipped file', () => {
    const fileCount = Object.values(PROP_KITS).flat().length;
    expect(PROP_URLS.length).toBe(fileCount);
  });
});

describe('prop placements', () => {
  it('references only kits that exist in the manifest', () => {
    const unknown = new Set(PROP_PLACEMENTS.filter((p) => !(p.k in PROP_KITS)).map((p) => p.k));
    expect([...unknown], 'placements reference unknown kits').toEqual([]);
  });

  it('never dresses the sea band or the Daavi plot / sleep-yard frontage', () => {
    for (const p of PROP_PLACEMENTS) {
      expect(p.z, `sea violation at ${p.d}/${p.k}`).toBeLessThan(44.5);
      const inFrontage = p.x >= -160 && p.x <= -122 && p.z >= -22 && p.z <= 8;
      expect(inFrontage, `Daavi frontage violation at ${p.d}/${p.k}`).toBe(false);
    }
  });

  it('stays on the diorama plate', () => {
    for (const p of PROP_PLACEMENTS) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(340);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(116);
    }
  });

  it('dresses a meaningful number of spots without exploding the budget', () => {
    expect(PROP_PLACEMENTS.length).toBeGreaterThanOrEqual(300);
    expect(PROP_PLACEMENTS.length).toBeLessThanOrEqual(600);
    const districts = new Set(PROP_PLACEMENTS.map((p) => p.d));
    expect(districts.size).toBeGreaterThanOrEqual(15);
  });
});
