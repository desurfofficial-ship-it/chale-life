import { describe, expect, it } from 'vitest';

import { hashId, mulberry32, seededSpan, seededSpanAt, seededUnit } from '../seeded';

// P2-3: world dressing must be stable across reloads — Math.random() in
// render paths is replaced by seeded hashes of stable ids.

describe('seeded hashes', () => {
  it('hashId is deterministic and 32-bit unsigned', () => {
    expect(hashId('LOC-002')).toBe(hashId('LOC-002'));
    expect(hashId('a')).not.toBe(hashId('b'));
    for (let i = 0; i < 50; i++) {
      const h = hashId(`id-${i}`);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('seededUnit stays in [0, 1) and repeats exactly for the same id', () => {
    for (let i = 0; i < 200; i++) {
      const u = seededUnit(`landmark-${i}`);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      expect(seededUnit(`landmark-${i}`)).toBe(u);
    }
  });

  it('seededSpan scales into [0, span)', () => {
    for (let i = 0; i < 100; i++) {
      const p = seededSpan(`flag-${i}`, Math.PI * 2);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(Math.PI * 2);
    }
  });

  it('seededSpanAt keys on position, not call order', () => {
    const a = seededSpanAt([1.5, 0, -3.25], Math.PI * 2);
    const b = seededSpanAt([1.5, 0, -3.25], Math.PI * 2);
    const c = seededSpanAt([1.5, 0, -3.26], Math.PI * 2);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('does not collide pathologically across a realistic id set', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(hashId(`walker-${i}`));
    // FNV-1a over 1000 sequential ids: expect a handful of collisions at most
    expect(seen.size).toBeGreaterThan(990);
  });

  it('mulberry32 streams are deterministic, uniform-ish and seed-sensitive', () => {
    const a = mulberry32(hashId('accra-ground-v1'));
    const b = mulberry32(hashId('accra-ground-v1'));
    const c = mulberry32(hashId('other-texture'));
    const seqA: number[] = [];
    for (let i = 0; i < 64; i++) {
      const v = a();
      seqA.push(v);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    for (let i = 0; i < 64; i++) expect(b()).toBe(seqA[i]);
    // a different seed must not reproduce the same stream
    expect(c()).not.toBe(seqA[0]);
    // mean of the stream is nowhere near 0 or 1 (uniformity smoke check)
    const mean = seqA.reduce((s, v) => s + v, 0) / seqA.length;
    expect(mean).toBeGreaterThan(0.25);
    expect(mean).toBeLessThan(0.75);
  });
});
