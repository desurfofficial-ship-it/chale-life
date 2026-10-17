import { describe, expect, it } from 'vitest';
import { circleHitsAny } from '../../engine/collision';
import { colliders, GYAN_HOUSE_WORLD } from '../colliders';
import { loadColliderFixture } from '../../test-support/colliderFixture';
// P2-2: the capture is fetched (not bundled) — node tests ingest from disk
loadColliderFixture();

describe('Gyan house door', () => {
  it('door centre is walkable (no collider hit for player radius)', () => {
    const { x, z, d, doorLocalX } = GYAN_HOUSE_WORLD;
    const doorX = x + doorLocalX;
    const doorZ = z + d / 2; // on the threshold
    // step just inside
    const insideZ = z + d / 2 - 0.8;
    expect(circleHitsAny(doorX, doorZ, 0.4, colliders)).toBe(false);
    expect(circleHitsAny(doorX, insideZ, 0.4, colliders)).toBe(false);
  });

  it('side wall still blocks', () => {
    const { x, z, w } = GYAN_HOUSE_WORLD;
    // centre of left wall
    expect(circleHitsAny(x - w / 2, z, 0.4, colliders)).toBe(true);
  });
});
