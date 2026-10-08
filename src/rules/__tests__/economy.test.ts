import { describe, expect, it } from 'vitest';
import {
  buy,
  canAfford,
  createStarterWallet,
  formatGHS,
  pay,
  type WalletState,
} from '../economy';

const wallet = (balanceGHS: number): WalletState => ({ balanceGHS });

describe('economy: starter wallet', () => {
  it('starter wallet holds ₵20 (the store default)', () => {
    expect(createStarterWallet().balanceGHS).toBe(20);
  });
});

describe('economy: canAfford', () => {
  it('canAfford is true when the balance covers the amount', () => {
    expect(canAfford(wallet(20), 20)).toBe(true);
    expect(canAfford(wallet(20), 12)).toBe(true);
  });

  it('canAfford is false when the balance is short', () => {
    expect(canAfford(wallet(20), 20.01)).toBe(false);
    expect(canAfford(wallet(0), 1)).toBe(false);
  });
});

describe('economy: pay', () => {
  it('pay credits the wallet with the payout amount', () => {
    expect(pay(wallet(20), 15).balanceGHS).toBe(35);
  });

  it('pay ignores zero and negative amounts (payouts only)', () => {
    expect(pay(wallet(20), 0).balanceGHS).toBe(20);
    expect(pay(wallet(20), -5).balanceGHS).toBe(20);
  });

  it('pay keeps pesewa precision without float drift', () => {
    expect(pay(wallet(0.1), 0.2).balanceGHS).toBeCloseTo(0.3, 10);
  });
});

describe('economy: buy', () => {
  it('buy debits the wallet when affordable', () => {
    const result = buy(wallet(20), 12);
    expect(result.ok).toBe(true);
    expect(result.wallet.balanceGHS).toBe(8);
  });

  it('buy refuses and keeps the balance when unaffordable', () => {
    const result = buy(wallet(5), 12);
    expect(result.ok).toBe(false);
    expect(result.wallet.balanceGHS).toBe(5);
    expect(result.reason).toContain('Not enough cash');
  });

  it('buy allows spending the exact balance down to zero', () => {
    const result = buy(wallet(12), 12);
    expect(result.ok).toBe(true);
    expect(result.wallet.balanceGHS).toBe(0);
  });

  it('buy refuses negative costs instead of crediting the wallet', () => {
    const result = buy(wallet(20), -5);
    expect(result.ok).toBe(false);
    expect(result.wallet.balanceGHS).toBe(20);
  });
});

describe('economy: formatGHS', () => {
  it('renders whole cedi amounts without decimals', () => {
    expect(formatGHS(20)).toBe('₵20');
    expect(formatGHS(35)).toBe('₵35');
  });

  it('renders pesewas with two decimals', () => {
    expect(formatGHS(12.5)).toBe('₵12.50');
    expect(formatGHS(0.99)).toBe('₵0.99');
  });
});
