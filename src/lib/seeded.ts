/**
 * seeded.ts — deterministic pseudo-randomness for world dressing (P2-3).
 *
 * Math.random() in render paths breaks the "stable across reloads" rule:
 * screenshots, e2e pixel probes and visual audits must see the same world on
 * every load, and Fast Refresh re-rolled every `useMemo(() => Math.random())`
 * phase during development. These helpers hash a STABLE id (landmark id or
 * world position) into a float, so dressing stays varied per instance but
 * identical across reloads.
 */

/** FNV-1a 32-bit hash of a string id (well-distributed, no deps). */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic float in [0, 1) from a stable id. */
export function seededUnit(id: string): number {
  return hashId(id) / 0x100000000;
}

/** Deterministic float in [0, span) — e.g. phase = seededSpan(id, Math.PI * 2). */
export function seededSpan(id: string, span: number): number {
  return seededUnit(id) * span;
}

/** Position-keyed variant: two props at the same spot hash the same. */
export function seededSpanAt(
  position: readonly (number | undefined)[],
  span: number,
): number {
  return seededSpan(`${position[0]}|${position[1]}|${position[2]}`, span);
}

/**
 * mulberry32 — tiny deterministic PRNG for procedural texture painting.
 * Create one per texture with a stable name (`mulberry32(hashId('ground'))`)
 * and use it instead of Math.random() so canvas noise is identical on every
 * load (screenshots / pixel probes stay comparable).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}
