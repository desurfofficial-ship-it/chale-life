/**
 * Housing upgrade rules — canUpgrade / upgradeCost over the locked tier
 * ladder from src/data/housing.ts (14 m² → 140 m², ₵650 → ₵16,000).
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * WalletState comes from economy.ts; all functions return new state.
 */

import {
  findHousingTierById,
  housingTierIndex,
  HOUSING_TIERS,
} from '../data/housing';
import { canAfford, formatGHS, type WalletState } from './economy';

export interface UpgradeCheck {
  readonly ok: boolean;
  readonly reason?: string;
}

/** The next tier in the locked ladder, or null at the top. */
export function nextHousingTier(currentTierId: string) {
  const index = housingTierIndex(currentTierId);
  if (index < 0) return null;
  return HOUSING_TIERS[index + 1] ?? null;
}

/** Cost of moving to the target tier (null when the move is invalid). */
export function upgradeCost(currentTierId: string, targetTierId: string): number | null {
  const current = findHousingTierById(currentTierId);
  const target = findHousingTierById(targetTierId);
  if (!current || !target) return null;
  if (housingTierIndex(targetTierId) !== housingTierIndex(currentTierId) + 1) {
    return null;
  }
  return target.costGHS;
}

/**
 * Can the player move from `currentTierId` to `targetTierId`?
 * Rules: tier must exist, be exactly the next rung, comfort (when
 * provided) must clear the tier minimum, and the wallet must cover it.
 */
export function canUpgrade(
  wallet: WalletState,
  currentTierId: string,
  targetTierId: string,
  comfortPct?: number
): UpgradeCheck {
  const target = findHousingTierById(targetTierId);
  if (!target) return { ok: false, reason: 'Unknown housing tier.' };
  const cost = upgradeCost(currentTierId, targetTierId);
  if (cost === null) {
    return { ok: false, reason: 'You can only move up one rung of the housing ladder.' };
  }
  if (comfortPct !== undefined && comfortPct < target.minComfortPct) {
    return {
      ok: false,
      reason: `Needs ${target.minComfortPct}% comfort first (you have ${Math.round(comfortPct)}%).`,
    };
  }
  if (!canAfford(wallet, cost)) {
    return {
      ok: false,
      reason: `${target.title} costs ${formatGHS(cost)} — you have ${formatGHS(wallet.balanceGHS)}.`,
    };
  }
  return { ok: true };
}

export interface UpgradeResult {
  readonly ok: boolean;
  readonly wallet: WalletState;
  readonly tierId: string;
  readonly reason?: string;
}

/** Commit an upgrade: debit the wallet, return the new tier id. */
export function applyUpgrade(
  wallet: WalletState,
  currentTierId: string,
  targetTierId: string,
  comfortPct?: number
): UpgradeResult {
  const check = canUpgrade(wallet, currentTierId, targetTierId, comfortPct);
  if (!check.ok) {
    return { ok: false, wallet, tierId: currentTierId, reason: check.reason };
  }
  const target = findHousingTierById(targetTierId)!;
  const cost = target.costGHS;
  return {
    ok: true,
    wallet: { balanceGHS: Math.round((wallet.balanceGHS - cost) * 100) / 100 },
    tierId: target.id,
  };
}
