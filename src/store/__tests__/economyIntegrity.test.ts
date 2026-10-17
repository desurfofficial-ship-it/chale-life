/**
 * P0 — Gameplay state integrity regression tests.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getState,
  setWalletBalanceGHS,
  buyHomeFurniture,
  requestTeleport,
  consumeTeleport,
  setPlayerPosition,
} from '../gameStore';
import { findFurnitureById } from '../../data/furniture';
import { worldBounds } from '../../world/colliders';

describe('P0 store integrity: wallet', () => {
  beforeEach(() => {
    setWalletBalanceGHS(20);
  });

  it('rejects NaN and Infinity wallet writes', () => {
    setWalletBalanceGHS(Number.NaN);
    expect(getState().wallet.balanceGHS).toBe(20);
    setWalletBalanceGHS(Number.POSITIVE_INFINITY);
    expect(getState().wallet.balanceGHS).toBe(20);
  });

  it('clamps negative wallet writes to 0', () => {
    setWalletBalanceGHS(-50);
    expect(getState().wallet.balanceGHS).toBe(0);
  });
});

describe('P0 store integrity: buyHomeFurniture', () => {
  beforeEach(() => {
    setWalletBalanceGHS(500);
    // clear owned furniture if test helpers exist — buy known cheap item
  });

  it('rejects unknown catalogue ids', () => {
    const before = getState().wallet.balanceGHS;
    expect(buyHomeFurniture('not_a_real_item_xyz', 1)).toBe(false);
    expect(getState().wallet.balanceGHS).toBe(before);
  });

  it('uses trusted catalogue price, ignoring negative caller cost', () => {
    const item = findFurnitureById('chair_plastic');
    expect(item).toBeTruthy();
    setWalletBalanceGHS(500);
    const owned = getState().home.furnitureIds.includes('chair_plastic');
    if (owned) return; // already owned in this process — skip mutation assert
    const before = getState().wallet.balanceGHS;
    // attacker-style negative cost must not mint cash
    const ok = buyHomeFurniture('chair_plastic', -9999);
    if (ok) {
      expect(getState().wallet.balanceGHS).toBe(before - item!.costGHS);
      expect(getState().wallet.balanceGHS).toBeLessThan(before);
    }
  });

  it('refuses purchase when underfunded at catalogue price', () => {
    const item = findFurnitureById('fridge_basic');
    expect(item).toBeTruthy();
    setWalletBalanceGHS(1);
    expect(buyHomeFurniture('fridge_basic', 1)).toBe(false);
    expect(getState().wallet.balanceGHS).toBe(1);
  });
});

describe('P0 store integrity: teleport', () => {
  it('ignores non-finite coordinates', () => {
    const before = { ...getState().player.position };
    requestTeleport(Number.NaN, 0);
    expect(consumeTeleport()).toBeNull();
    expect(getState().player.position.x).toBe(before.x);
  });

  it('clamps out-of-bounds teleports into worldBounds', () => {
    requestTeleport(99999, -99999);
    const req = consumeTeleport();
    expect(req).not.toBeNull();
    expect(req!.x).toBeLessThanOrEqual(worldBounds.maxX);
    expect(req!.x).toBeGreaterThanOrEqual(worldBounds.minX);
    expect(req!.z).toBeLessThanOrEqual(worldBounds.maxZ);
    expect(req!.z).toBeGreaterThanOrEqual(worldBounds.minZ);
  });

  it('setPlayerPosition ignores NaN', () => {
    setPlayerPosition(10, 0, 10);
    setPlayerPosition(Number.NaN, 0, 20);
    expect(getState().player.position.x).toBe(10);
    expect(getState().player.position.z).toBe(10);
  });
});


describe('P1 worldBounds covers Offices Go destinations', () => {
  it('NorthReach bank z≈-152 is inside worldBounds after plate extension', () => {
    // Gold Coast Bank site.z = -152 (src/data/offices.ts)
    const bankZ = -152;
    expect(bankZ).toBeGreaterThanOrEqual(worldBounds.minZ);
    expect(bankZ).toBeLessThanOrEqual(worldBounds.maxZ);
  });

  it('teleport to NorthReach office door is not clamped away', () => {
    requestTeleport(163, -152);
    const req = consumeTeleport();
    expect(req).not.toBeNull();
    expect(req!.z).toBe(-152);
    expect(req!.x).toBe(163);
  });
});
