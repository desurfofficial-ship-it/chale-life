import { describe, expect, it } from 'vitest';
import { catalogIdFromUid, uidFor } from '../homeLayout';
import { findFurnitureById } from '../../data/furniture';

describe('catalogIdFromUid', () => {
  it('strips the instance suffix so catalogue lookup works', () => {
    expect(catalogIdFromUid(uidFor('lp_sofa_00', 0))).toBe('lp_sofa_00');
    expect(catalogIdFromUid(uidFor('lp_sofa_00', 3))).toBe('lp_sofa_00');
    expect(catalogIdFromUid('lp_sofa_00')).toBe('lp_sofa_00');
  });

  it('instance uids resolve to a real catalogue row with modelPath', () => {
    const uid = uidFor('lp_sofa_00', 0);
    const item = findFurnitureById(catalogIdFromUid(uid));
    expect(item, 'uid must not be used raw against the catalogue').toBeTruthy();
    expect(item?.modelPath).toMatch(/\.glb$/);
    // regression: the pre-fix path passed uid straight to findFurnitureById
    expect(findFurnitureById(uid)).toBeUndefined();
  });
});
