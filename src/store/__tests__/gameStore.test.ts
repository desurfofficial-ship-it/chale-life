/**
 * Store-level Earn-and-eat tests (E-003). The store is a module singleton,
 * so this file runs ONE deliberately ordered session:
 *
 *   defaults → Act far from any location (no-op) → proximity notify-on-change
 *   → the ₵20 → ₵35 → ₵23 loop at LOC-001 → sachet water at LOC-003 with
 *   toast timestamp + expiry → needs drain (guards, starter rate, zero clamp)
 *
 * Vitest isolates module registries per FILE, so importing gameStore here
 * starts pristine: ₵20 / hunger 72 / energy 80 / no job / near null.
 */

import { describe, expect, it, vi } from 'vitest';
import { DECAY_PER_SECOND } from '../../rules/needs';
import {
  getState,
  NEAR_LOCATION_RADIUS_M,
  NEEDS_DRAIN_INTERVAL_S,
  requestAct,
  setNearLocationId,
  subscribe,
  tickNeedsDrain,
  TOAST_LINGER_MS,
} from '../gameStore';

const AUNTY_BA = 'HUSTLE_AUNTY_BA_STARTER';

describe('gameStore: E-003 defaults', () => {
  it('starts exactly like the product session: ₵20 / 72 / 80, no job, nothing near', () => {
    const s = getState();
    expect(s.wallet.balanceGHS).toBe(20);
    expect(s.needs).toEqual({ hunger: 72, energy: 80 });
    expect(s.job).toEqual({ activeId: null, step: 0 });
    expect(s.nearLocationId).toBeNull();
    expect(s.toast).toEqual({ message: null, at: 0 });
    expect(s.hasWorked).toBe(false);
  });

  it('requestAct far from any location is a full no-op (no commit, no notify, no toast)', () => {
    expect(getState().nearLocationId).toBeNull();
    let notifications = 0;
    const unsubscribe = subscribe(() => {
      notifications += 1;
    });
    requestAct();
    unsubscribe();
    expect(notifications).toBe(0);

    const s = getState();
    expect(s.wallet.balanceGHS).toBe(20);
    expect(s.job).toEqual({ activeId: null, step: 0 });
    expect(s.toast.message).toBeNull();
    expect(s.hasWorked).toBe(false);
  });

  it('setNearLocationId notifies only when the value CHANGES', () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => {
      notifications += 1;
    });

    setNearLocationId('LOC-001');
    setNearLocationId('LOC-001'); // same value — silent
    setNearLocationId(null);
    setNearLocationId('LOC-001'); // back in — one more

    unsubscribe();
    // enter LOC-001 (+1) · leave to null (+1) · re-enter (+1); the repeat is silent.
    expect(notifications).toBe(3);
    expect(getState().nearLocationId).toBe('LOC-001');
    expect(NEAR_LOCATION_RADIUS_M).toBe(2.5);
  });
});

describe('gameStore: the ₵20 → ₵35 → ₵23 loop at Aunty Ba’s joint', () => {
  it('Act 1 starts the starter hustle at step 0 for ₵0 capital', () => {
    requestAct();
    const s = getState();
    expect(s.job).toEqual({ activeId: AUNTY_BA, step: 0 });
    expect(s.wallet.balanceGHS).toBe(20); // zero-capital hustle
    expect(s.toast.message).toContain('Job accepted');
    expect(s.toast.at).toBeGreaterThan(0);
    expect(s.hasWorked).toBe(false);
  });

  it('Act 2 and Act 3 advance steps 1/3 → 2/3 with step toasts', () => {
    requestAct();
    let s = getState();
    expect(s.job).toEqual({ activeId: AUNTY_BA, step: 1 });
    expect(s.toast.message).toContain('Two more lifts');

    requestAct();
    s = getState();
    expect(s.job).toEqual({ activeId: AUNTY_BA, step: 2 });
    expect(s.toast.message).toContain('One more lift');
    expect(s.wallet.balanceGHS).toBe(20); // pay only on completion
  });

  it('the final Act pays ₵15 and takes the work energy/hunger toll', () => {
    requestAct();
    const s = getState();
    // 20 + 15 = 35
    expect(s.wallet.balanceGHS).toBe(35);
    // work cost: −8 hunger, −18 energy from the starter 72/80
    expect(s.needs).toEqual({ hunger: 64, energy: 62 });
    // shift cleared, hasWorked latched for the objective marker
    expect(s.job).toEqual({ activeId: null, step: 0 });
    expect(s.hasWorked).toBe(true);
    expect(s.toast.message).toContain('+₵15');
  });

  it('the next Act at the joint buys waakye: ₵35 → ₵23, hunger rises 45 (clamped)', () => {
    requestAct();
    const s = getState();
    expect(s.wallet.balanceGHS).toBe(23);
    // 64 + 45 = 109 → clamped to 100; energy untouched by the meal
    expect(s.needs.hunger).toBe(100);
    expect(s.needs.energy).toBe(62);
    expect(s.toast.message).toContain('Waakye');
    expect(s.hasWorked).toBe(true); // unchanged by eating
  });
});

describe('gameStore: sachet water at the provisions store + toast lifetime', () => {
  it('Act at LOC-003 buys water (₵23 → ₵22, +10 energy) and the toast auto-expires', () => {
    vi.useFakeTimers();
    try {
      setNearLocationId('LOC-003');
      requestAct();

      const s = getState();
      expect(s.wallet.balanceGHS).toBe(22);
      expect(s.needs).toEqual({ hunger: 100, energy: 72 }); // +10 energy, hunger clamped
      expect(s.toast.message).toContain('Sachet water');
      expect(s.toast.at).toBe(Date.now()); // timestamp recorded on arrival

      // Store-side linger outlives the HUD's own 2 s window, then clears.
      vi.advanceTimersByTime(TOAST_LINGER_MS - 100);
      expect(getState().toast.message).toBe('Sachet water — +10 energy (−₵1)');
      vi.advanceTimersByTime(200);
      expect(getState().toast.message).toBeNull();
    } finally {
      vi.useRealTimers();
      setNearLocationId('LOC-001');
    }
  });
});

describe('gameStore: needs drain (tickNeedsDrain, starter profile)', () => {
  it('ignores zero, negative and over-MAX_TICK_SECONDS ticks (spike guard)', () => {
    const before = { ...getState().needs };
    tickNeedsDrain(0);
    tickNeedsDrain(-1);
    tickNeedsDrain(3); // > MAX_TICK_SECONDS (2 s)
    expect(getState().needs).toEqual(before);
    expect(NEEDS_DRAIN_INTERVAL_S).toBe(1); // ~1 Hz commit cadence
  });

  it('drains 3 hunger / 2 energy per minute in 1 s commits (60 × 1 s)', () => {
    // Snapshot — getState().needs is the live object; tickNeedsDrain mutates it.
    const before = { ...getState().needs };
    for (let i = 0; i < 60; i++) tickNeedsDrain(1);
    const after = getState().needs;
    expect(after.hunger).toBeCloseTo(before.hunger - 3, 5);
    // starter energy rate is 0.0333/s (≈2/min) — compare against the constant
    expect(after.energy).toBeCloseTo(before.energy - DECAY_PER_SECOND.starter.energy * 60, 10);
  });

  it('never goes negative — long sessions clamp both needs at 0', () => {
    for (let i = 0; i < 1200; i++) tickNeedsDrain(2);
    const s = getState().needs;
    expect(s.hunger).toBe(0);
    expect(s.energy).toBe(0);
  });
});
