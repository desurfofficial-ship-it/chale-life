import { describe, expect, it } from 'vitest';
import { isInsideGyanHouse, GYAN_HOUSE_WORLD } from '../colliders';

describe('isInsideGyanHouse', () => {
  it('true at room centre', () => {
    const { x, z } = GYAN_HOUSE_WORLD;
    expect(isInsideGyanHouse(x, z)).toBe(true);
  });
  it('false on the street in front of the door', () => {
    const { x, z, d, doorLocalX } = GYAN_HOUSE_WORLD;
    expect(isInsideGyanHouse(x + doorLocalX, z + d / 2 + 2)).toBe(false);
  });
});
