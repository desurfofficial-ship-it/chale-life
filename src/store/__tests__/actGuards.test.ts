import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setActGuardsForTests,
  getState,
  requestAct,
  setNearLocationId,
  setPlayerTransform,
} from '../gameStore';
import { AUNTY_BA_HUSTLE_ID, WATER_LOCATION_ID, WAAKYE_LOCATION_ID } from '../../rules/act';

/**
 * G-008b item 3 — the Act input guards live in requestAct so every input
 * path is covered: a 600 ms debounce after ANY press attempt, and a
 * 1000 ms purchase lockout after a payout (the iPhone burst bought TWO
 * waakyes with one flurry: ₵44 → ₵20).
 *
 * The guards default OFF under vitest (other store suites press Act
 * synchronously) — this suite opts in explicitly. Like the other store
 * suites, the tests form ONE ordered session on the module state.
 */

/** Kiosk / bench / provisions coordinates (proximity.ts / locations.ts). */
const KIOSK = { x: 15.2, z: 2.4 };
const BENCH = { x: 18.6, z: 2.4 };
const PROVISIONS = { x: -6.2, z: 2.6 };

function standAt(pos: { x: number; z: number }, locationId: string | null): void {
  setPlayerTransform(pos.x, pos.z, 0);
  setNearLocationId(locationId);
}

/** One window forward (fake timers — Date.now is mocked too). */
function wait(ms: number): void {
  vi.advanceTimersByTime(ms);
}

describe('store: Act input guards (G-008b item 3, one ordered session)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __setActGuardsForTests(true);
  });

  afterEach(() => {
    __setActGuardsForTests(false);
    vi.useRealTimers();
  });

  it('the 600 ms debounce: a burst commits once, ignored presses refresh the window', () => {
    standAt(KIOSK, WAAKYE_LOCATION_ID);
    requestAct(); // accept the hustle
    expect(getState().job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(getState().job.step).toBe(0);

    for (let i = 0; i < 10; i++) {
      requestAct(); // 10 taps at the same fake instant — all swallowed
    }
    expect(getState().job.step).toBe(0); // bursts never slip through

    wait(600); // 600 ms of quiet since the LAST (ignored) attempt
    requestAct();
    expect(getState().job.step).toBe(1); // exactly one legal commit
  });

  it('the payout lockout: a purchase inside 1000 ms of a payout is refused whole', () => {
    // Continue the session: step 2 happens at Daavi's bench (the forced
    // walk), step 3 back at the kiosk pays ₵15 (wallet 20 → 35).
    standAt(BENCH, 'LOC-001-BENCH');
    wait(600);
    requestAct();
    expect(getState().job.step).toBe(2);

    standAt(KIOSK, WAAKYE_LOCATION_ID);
    wait(600);
    requestAct();
    const payout = getState();
    expect(payout.wallet.balanceGHS).toBe(35);
    expect(payout.toast.message).toContain('+₵15'); // lastPayoutAt armed

    // Past the debounce (600 ms) but INSIDE the 1000 ms purchase lockout:
    // the water press must be refused — not a single cedi moves, and no
    // purchase toast ever commits (the payout toast is still the live one).
    standAt(PROVISIONS, WATER_LOCATION_ID);
    wait(600);
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(35);
    expect(getState().toast.message).toContain('+₵15'); // the refusal is a full no-op

    wait(600); // payout + ~1200 ms — the lockout has expired
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(34); // the water commits now
    expect(getState().toast.message).toContain('Sachet water');
  });
});
