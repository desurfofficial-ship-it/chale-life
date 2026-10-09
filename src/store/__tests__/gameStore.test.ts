/**
 * Store-level Earn-and-eat tests (E-003, updated for the E-004 job slice).
 * The store is a module singleton, so this file runs ONE deliberately
 * ordered session:
 *
 *   defaults → Act far from any location (no-op) → proximity notify-on-change
 *   → the ₵20 → ₵35 → ₵23 loop at LOC-001 → sachet water at LOC-003 with
 *   toast timestamp + expiry → needs drain (guards, starter rate, zero clamp)
 *
 * The drain-to-60 earn-first session lives in its own file
 * (`gameStoreEarnFirst.test.ts`) so both start from a pristine store.
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

const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';

describe('gameStore: E-003 defaults', () => {
  it('starts exactly like the product session: ₵20 / 72 / 80, no job, nothing near', () => {
    const s = getState();
    expect(s.wallet.balanceGHS).toBe(20);
    expect(s.needs).toEqual({ hunger: 72, energy: 80 });
    expect(s.job).toEqual({ activeId: null, step: 0, completedIds: [] });
    expect(s.nearLocationId).toBeNull();
    expect(s.toast).toEqual({ message: null, at: 0 });
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
    expect(s.job).toEqual({ activeId: null, step: 0, completedIds: [] });
    expect(s.toast.message).toBeNull();
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

describe('gameStore: the ₵20 → ₵35 → ₵23 loop at Daavi’s spots (G-008d split)', () => {
  it('Act 1 starts the starter hustle at step 0 for ₵0 capital (at the JOB SPOT)', () => {
    // G-008d: hiring happens at the job spot (LOC-001-JOB), never the
    // front counter — the counter sells food only.
    setNearLocationId('LOC-001-JOB');
    requestAct();
    const s = getState();
    expect(s.job).toEqual({ activeId: HUSTLE_ID, step: 0, completedIds: [] });
    expect(s.wallet.balanceGHS).toBe(20); // zero-capital hustle
    expect(s.toast.message).toContain('Job accepted');
    expect(s.toast.at).toBeGreaterThan(0);
  });

  it('Act 2 and Act 3 advance steps 1/3 → 2/3 with step toasts', () => {
    requestAct();
    let s = getState();
    expect(s.job).toEqual({ activeId: HUSTLE_ID, step: 1, completedIds: [] });
    expect(s.toast.message).toContain('Two more lifts');

    // G-008b: step 2 happens at Daavi's bench — the walk is part of the
    // shift. G-008d: the bench is on the north pavement. The probe reads
    // the waypoint, the player presses, then heads back to the job spot
    // for the last lift.
    setNearLocationId('LOC-001-BENCH');
    requestAct();
    s = getState();
    expect(s.job).toEqual({ activeId: HUSTLE_ID, step: 2, completedIds: [] });
    expect(s.toast.message).toContain('One more lift');
    expect(s.wallet.balanceGHS).toBe(20); // pay only on completion
    setNearLocationId('LOC-001-JOB');
  });

  it('the final Act pays ₵15 and takes the work energy/hunger toll', () => {
    requestAct();
    const s = getState();
    // 20 + 15 = 35
    expect(s.wallet.balanceGHS).toBe(35);
    // work cost: −8 hunger, −18 energy from the starter 72/80
    expect(s.needs).toEqual({ hunger: 64, energy: 62 });
    // shift cleared, the run latched the completed hustle (G-004 earn-first
    // flag — the ONE "worked before" source of truth since E-004), and the
    // payout stamped the cooldown anchor (G-008c lastPayoutAt).
    expect(s.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [HUSTLE_ID],
      lastPayoutAt: expect.any(Number),
    });
    expect(s.toast.message).toContain('+₵15');
  });

  it('the next Act at the COUNTER buys waakye: ₵35 → ₵23, hunger rises 45 (clamped)', () => {
    // G-008d: the counter sells whenever round(hunger) ≤ 80 — the paid
    // guest (hunger 64) can buy right away. The 3-min drift below is now
    // belt-and-braces (it also proves a drained guest still buys).
    setNearLocationId('LOC-001');
    for (let i = 0; i < 90; i++) tickNeedsDrain(2);
    requestAct();
    const s = getState();
    expect(s.wallet.balanceGHS).toBe(23);
    // 55 + 45 ≈ 100 — still clamped; energy only drifted on the walk
    expect(s.needs.hunger).toBeCloseTo(100, 5);
    expect(s.needs.energy).toBeCloseTo(62 - DECAY_PER_SECOND.starter.energy * 180, 2);
    expect(s.toast.message).toContain('Waakye');
    expect(s.job.completedIds).toEqual([HUSTLE_ID]); // unchanged by eating
  });
});

describe('gameStore: sachet water at the provisions store + toast lifetime', () => {
  it('Act at LOC-003 buys water (₵23 → ₵22, sip effects) and the toast auto-expires', () => {
    vi.useFakeTimers();
    try {
      // G-008c round 2, G-008d gate: water is refused with "Not thirsty"
      // at hunger ≥ 90 — the meal above clamped hunger at 100, so the
      // guest drinks only after ~7 starter minutes of drift bring hunger
      // under the gate (100 − 0.05 × 420 = 79).
      for (let i = 0; i < 210; i++) tickNeedsDrain(2);
      setNearLocationId('LOC-003');
      requestAct();

      const s = getState();
      expect(s.wallet.balanceGHS).toBe(22);
      // A SIP now (+4 hunger / +2 energy — G-008c round 2): hunger 79 →
      // 83, energy +2 over the drifted value.
      expect(s.needs.hunger).toBeCloseTo(83, 5);
      expect(s.needs.energy).toBeCloseTo(62 - DECAY_PER_SECOND.starter.energy * 600 + 2, 2);
      // The sachet rest is armed at the press clock (threaded needs field).
      const waterStamp = Date.now();
      expect(s.needs.lastWaterAt).toBe(waterStamp);
      expect(s.toast.message).toContain('Sachet water');
      expect(s.toast.at).toBe(waterStamp); // timestamp recorded on arrival

      // Store-side linger outlives the HUD's own 2 s window, then clears.
      vi.advanceTimersByTime(TOAST_LINGER_MS - 100);
      expect(getState().toast.message).toBe('Sachet water — +2 energy (−₵1)');
      vi.advanceTimersByTime(200);
      expect(getState().toast.message).toBeNull();

      // A second sachet while the 20 s rest runs is refused by the RULES
      // (all store-level gates are off here): wallet and stamp untouched.
      vi.advanceTimersByTime(700);
      requestAct();
      expect(getState().wallet.balanceGHS).toBe(22);
      expect(getState().needs.lastWaterAt).toBe(waterStamp);
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
