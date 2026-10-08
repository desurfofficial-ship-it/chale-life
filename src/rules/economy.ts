/**
 * Wallet / cash economy rules — pay, buy, canAfford.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * WalletState mirrors the store's `wallet: { balanceGHS: number }` slice
 * so the Engine can commit rule results straight into the store.
 */

export interface WalletState {
  readonly balanceGHS: number;
}

/** Starter wallet — matches the store default (₵20 in pocket). */
export const STARTER_BALANCE_GHS = 20;

export function createStarterWallet(): WalletState {
  return { balanceGHS: STARTER_BALANCE_GHS };
}

/** Money is handled in pesewa precision to kill float drift. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function canAfford(wallet: WalletState, amountGHS: number): boolean {
  return wallet.balanceGHS >= amountGHS;
}

/**
 * Credit cash (job payout, hustle sale, gift). Negative or zero amounts
 * are rejected — payouts go through `pay`, never through `buy`.
 */
export function pay(wallet: WalletState, amountGHS: number): WalletState {
  if (amountGHS <= 0) return wallet;
  return { balanceGHS: round2(wallet.balanceGHS + amountGHS) };
}

export interface BuyResult {
  readonly ok: boolean;
  readonly wallet: WalletState;
  readonly reason?: string;
}

/** Spend cash on something. Refuses (unchanged wallet) when short. */
export function buy(wallet: WalletState, costGHS: number): BuyResult {
  if (costGHS < 0) {
    return { ok: false, wallet, reason: 'Cost cannot be negative.' };
  }
  if (!canAfford(wallet, costGHS)) {
    return {
      ok: false,
      wallet,
      reason: `Not enough cash — need ${formatGHS(costGHS)}, have ${formatGHS(wallet.balanceGHS)}.`,
    };
  }
  return { ok: true, wallet: { balanceGHS: round2(wallet.balanceGHS - costGHS) } };
}

/** `₵12` for whole cedis, `₵12.50` when pesewas matter. */
export function formatGHS(amountGHS: number): string {
  const rounded = round2(amountGHS);
  return Number.isInteger(rounded) ? `₵${rounded}` : `₵${rounded.toFixed(2)}`;
}
