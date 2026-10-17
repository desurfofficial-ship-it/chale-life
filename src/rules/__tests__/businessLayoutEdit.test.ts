import { describe, expect, it } from 'vitest';
import { arrange, moveFurniture, rotateFurniture, removeFurniture, isValidFurnitureTile } from '../business';
import { findFurnitureById } from '../../data/furniture';

describe('layout edit', () => {
  it('rejects tiles outside the room margin', () => {
    expect(isValidFurnitureTile({ w: 7, d: 6 }, 0, 1)).toBe(false);
    expect(isValidFurnitureTile({ w: 7, d: 6 }, 1, 1)).toBe(true);
    expect(isValidFurnitureTile({ w: 7, d: 6 }, 6, 1)).toBe(false);
  });

  it('moves an item to a free valid tile', () => {
    const layout = arrange('chop_bar', 'suggested', { w: 7, d: 6 });
    expect(layout.length).toBeGreaterThan(0);
    const id = layout[0].id;
    const r = moveFurniture(layout, id, 2, 2, { w: 7, d: 6 });
    expect(r.ok).toBe(true);
    expect(r.layout.find((p) => p.id === id)?.tx).toBe(2);
  });

  it('rejects move onto an occupied tile', () => {
    const layout = arrange('chop_bar', 'suggested', { w: 7, d: 6 });
    if (layout.length < 2) return;
    const a = layout[0];
    const b = layout[1];
    const r = moveFurniture(layout, a.id, b.tx, b.tz, { w: 7, d: 6 });
    expect(r.ok).toBe(false);
  });

  it('rotates and removes', () => {
    const layout = arrange('barber', 'min', { w: 6, d: 5 });
    const id = layout[0]?.id;
    if (!id) return;
    const rotated = rotateFurniture(layout, id, 90);
    expect(rotated.ok).toBe(true);
    expect(rotated.layout.find((p) => p.id === id)?.rot).toBe(90);
    const removed = removeFurniture(rotated.layout, id);
    expect(removed.ok).toBe(true);
    expect(removed.layout.some((p) => p.id === id)).toBe(false);
  });
});

describe('biz kit modelPath', () => {
  it('maps common kit ids to existing GLB paths', () => {
    for (const id of [
      'biz_counter',
      'biz_bench',
      'biz_cooker',
      'biz_chair',
      'biz_barber_chair',
      'biz_mirror',
    ] as const) {
      const f = findFurnitureById(id);
      expect(f?.modelPath, id).toBeTruthy();
      expect(f!.modelPath!.startsWith('models/furniture/')).toBe(true);
    }
  });

  it('fuel pump and canopy stay box-only (no false GLB)', () => {
    expect(findFurnitureById('biz_fuel_pump')?.modelPath).toBeUndefined();
    expect(findFurnitureById('biz_canopy')?.modelPath).toBeUndefined();
  });
});
