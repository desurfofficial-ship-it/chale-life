import { describe, expect, it } from 'vitest';
import {
  findHousingTierById,
  HOUSING_TIERS,
  STARTER_HOUSING_TIER_ID,
} from '../../data/housing';
import { type WalletState } from '../economy';
import { applyUpgrade, canUpgrade, nextHousingTier, upgradeCost } from '../housing';

const wallet = (balanceGHS: number): WalletState => ({ balanceGHS });

describe('housing: tier ladder', () => {
  it('starter tier is the 14 m² single room', () => {
    expect(STARTER_HOUSING_TIER_ID).toBe('single_room');
    const starter = findHousingTierById(STARTER_HOUSING_TIER_ID)!;
    expect(starter.areaM2).toBe(14);
    expect(starter.costGHS).toBe(0);
  });

  it('ladder follows the documented sizes and prices', () => {
    const areas = HOUSING_TIERS.map((t) => t.areaM2);
    const costs = HOUSING_TIERS.map((t) => t.costGHS);
    expect(areas).toEqual([14, 25, 38, 55, 80, 140]);
    expect(costs).toEqual([0, 650, 1600, 3600, 7800, 16000]);
  });

  it('each rung is exactly one step above the previous one', () => {
    for (let i = 0; i < HOUSING_TIERS.length - 1; i++) {
      const cost = upgradeCost(HOUSING_TIERS[i].id, HOUSING_TIERS[i + 1].id);
      expect(cost).toBe(HOUSING_TIERS[i + 1].costGHS);
    }
  });

  it('nextHousingTier returns null at the top of the ladder', () => {
    expect(nextHousingTier('luxury_house')).toBeNull();
  });

  it('upgradeCost refuses skipping tiers or moving down', () => {
    expect(upgradeCost('single_room', 'self_contained')).toBeNull();
    expect(upgradeCost('chamber_kitchen_bath', 'single_room')).toBeNull();
    expect(upgradeCost('single_room', 'nope')).toBeNull();
  });
});

describe('housing: canUpgrade', () => {
  it('allows single room → chamber & bath at ₵650 with enough cash', () => {
    const check = canUpgrade(wallet(650), 'single_room', 'chamber_kitchen_bath', 48);
    expect(check.ok).toBe(true);
  });

  it('refuses when the wallet is short', () => {
    const check = canUpgrade(wallet(649.99), 'single_room', 'chamber_kitchen_bath');
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('₵650');
  });

  it('refuses skipping a rung of the ladder', () => {
    const check = canUpgrade(wallet(16000), 'single_room', 'luxury_house');
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('one rung');
  });

  it('refuses when comfort is below the tier minimum', () => {
    const check = canUpgrade(wallet(650), 'single_room', 'chamber_kitchen_bath', 47.9);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('48% comfort');
  });

  it('ignores comfort when no comfort value is provided', () => {
    expect(canUpgrade(wallet(650), 'single_room', 'chamber_kitchen_bath').ok).toBe(true);
  });

  it('refuses unknown tiers', () => {
    expect(canUpgrade(wallet(9999), 'single_room', 'boat').ok).toBe(false);
  });
});

describe('housing: applyUpgrade', () => {
  it('debits ₵650 and moves into the chamber & bath tier', () => {
    const result = applyUpgrade(wallet(700), 'single_room', 'chamber_kitchen_bath', 50);
    expect(result.ok).toBe(true);
    expect(result.wallet.balanceGHS).toBe(50);
    expect(result.tierId).toBe('chamber_kitchen_bath');
  });

  it('keeps the current tier and wallet when the upgrade is refused', () => {
    const result = applyUpgrade(wallet(10), 'single_room', 'chamber_kitchen_bath');
    expect(result.ok).toBe(false);
    expect(result.wallet.balanceGHS).toBe(10);
    expect(result.tierId).toBe('single_room');
    expect(result.reason).toContain('₵650');
  });

  it('pays the ₵16,000 luxury house from a healthy wallet', () => {
    const result = applyUpgrade(wallet(16500), 'premium_apartment', 'luxury_house', 100);
    expect(result.ok).toBe(true);
    expect(result.wallet.balanceGHS).toBe(500);
    expect(result.tierId).toBe('luxury_house');
  });
});
