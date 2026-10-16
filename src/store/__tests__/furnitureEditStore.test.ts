import { describe, expect, it, beforeEach } from 'vitest';
import {
  __resetTycoonForTests,
  getTycoonState,
  setFurnitureEditBusinessId,
} from '../tycoonStore';

describe('furniture edit mode flag', () => {
  beforeEach(() => {
    __resetTycoonForTests();
  });

  it('tracks which business is being edited', () => {
    expect(getTycoonState().furnitureEditBusinessId).toBeNull();
    setFurnitureEditBusinessId('biz-1');
    expect(getTycoonState().furnitureEditBusinessId).toBe('biz-1');
    setFurnitureEditBusinessId(null);
    expect(getTycoonState().furnitureEditBusinessId).toBeNull();
  });
});
