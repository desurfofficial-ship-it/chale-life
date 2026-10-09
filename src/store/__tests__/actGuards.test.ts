import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setActGuardsForTests,
  __setNeedsForTests,
  getState,
  requestAct,
  setNearLocationId,
  setPlayerTransform,
} from '../gameStore';
import { AUNTY_BA_HUSTLE_ID, SLEEP_LOCATION_ID, WATER_LOCATION_ID, WAAKYE_LOCATION_ID } from '../../rules/act';

/**
 * G-008b item 3 — the Act input guards live in requestAct so every input
 * path is covered — REWORKED by G-008c item 3: the 600 ms debounce window
 * counts from the last press that FIRED, and dropped presses no longer
 * re-stamp it (the old attempt-stamp made taps under 600 ms apart never
 * fire at all). The 1000 ms purchase lockout after a payout now reads
 * resolveAct's typed purchased / paidOut flags instead of the toast text.
 *
 * G-008c round 2: the cadence counter moved from sachet water to the
 * compound sleep — water now rests 20 s per sachet, so the old
 * three-waters-in-2.4 s cadence is exactly the exploit the rest kills.
 * Sleep is free and cooldown-free; __setNeedsForTests re-arms the body
 * between taps so every FIRED sleep moves energy 40 → 95 and the
 * dropped ones provably do not.
 *
 * The guards default OFF under vitest (other store suites press Act
 * synchronously) — this suite opts in explicitly. Like the other store
 * suites, the tests form ONE ordered session on the module state.
 */

/** Kiosk / bench / provisions / yard-inside-the-AABB coordinates. */
const KIOSK = { x: 15.2, z: 2.4 };
const BENCH = { x: 18.6, z: 2.4 };
const PROVISIONS = { x: -6.2, z: 2.6 };
const YARD = { x: -9.5, z: 17.4 };

function standAt(pos: { x: number; z: number }, locationId: string | null): void {
  setPlayerTransform(pos.x, pos.z, 0);
  setNearLocationId(locationId);
}

/** One window forward (fake timers — Date.now is mocked too). */
function wait(ms: number): void {
  vi.advanceTimersByTime(ms);
}

describe('store: Act input guards (G-008b + G-008c rework, one ordered session)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __setActGuardsForTests(true);
  });

  afterEach(() => {
    __setActGuardsForTests(false);
    vi.useRealTimers();
  });

  it('the 600 ms debounce: a burst commits once, and dropped taps never re-arm the window', () => {
    standAt(KIOSK, WAAKYE_LOCATION_ID);
    requestAct(); // accept the hustle — this press FIRES (stamps t0)
    expect(getState().job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(getState().job.step).toBe(0);

    for (let i = 0; i < 10; i++) {
      requestAct(); // 10 taps at the same fake instant — all dropped
    }
    expect(getState().job.step).toBe(0); // bursts never slip through

    wait(600); // 600 ms since the last FIRED press (the accept), not the last tap
    requestAct();
    expect(getState().job.step).toBe(1); // exactly one legal commit
  });

  it('G-008c item 6: taps every 400 ms fire every other tap', () => {
    // The old attempt-stamp made this cadence fire ONCE and then never
    // again (every 400 ms tap re-armed the 600 ms window). Fire-stamping
    // lets every second tap through: __setActGuardsForTests zeroed the
    // window, so tap 1 is legal, taps at +400 / +1200 / +2000 drop (they
    // land 400 ms after a FIRED tap) and +800 / +1600 / +2400 fire. The
    // counter is the free compound SLEEP (water now rests 20 s a sachet
    // — round 2): each FIRED tap moves energy 40 → 95; a dropped tap
    // provably leaves the freshly-pinned 40 in place.
    standAt(YARD, SLEEP_LOCATION_ID); // inside the yard AABB, mid-shift
    const fired: number[] = [];
    for (let i = 1; i <= 6; i++) {
      wait(400);
      __setNeedsForTests(50, 40); // re-arm the bed before every tap
      requestAct();
      if (getState().needs.energy === 95) fired.push(i); // this tap FIRED
    }
    expect(fired).toEqual([1, 3, 5]); // every OTHER tap
    expect(getState().toast.message).toContain('Slept at the compound');
  });

  it('the payout lockout: a purchase inside 1000 ms of a payout is refused whole', () => {
    // Continue the session: step 2 happens at Daavi's bench (the forced
    // walk), step 3 back at the kiosk pays ₵15. The sleep cadence spent
    // nothing, so the wallet rides at the starting ₵20.
    standAt(BENCH, 'LOC-001-BENCH');
    wait(600);
    requestAct();
    expect(getState().job.step).toBe(2);

    standAt(KIOSK, WAAKYE_LOCATION_ID);
    wait(600);
    requestAct();
    const payout = getState();
    expect(payout.wallet.balanceGHS).toBe(20 + 15); // 35 — the cadence sleeps free
    expect(payout.toast.message).toContain('+₵15'); // lastPayoutAt armed
    expect(payout.job.lastPayoutAt).toBe(Date.now()); // G-008c: the stamp, threaded

    // Past the debounce (600 ms) but INSIDE the 1000 ms purchase lockout:
    // the water press must be refused — not a single cedi moves, no
    // purchase toast commits, and (G-008c) the refusal stamps NOTHING.
    standAt(PROVISIONS, WATER_LOCATION_ID);
    wait(600);
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(35);
    expect(getState().toast.message).toContain('+₵15'); // the refusal is a full no-op

    // Retry 200 ms later: still inside the lockout, still refused — and
    // STILL unstamped, so the next press is measured from the payout.
    wait(200);
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(35);

    wait(400); // payout + 1200 ms — both gates expired
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(34); // the water commits now
    expect(getState().toast.message).toContain('Sachet water');
    // G-008c round 2: the sachet rest is armed at the press clock —
    // threaded through the needs slice like the payout stamp.
    expect(getState().needs.lastWaterAt).toBe(Date.now());

    // One debounce window later the RULES refuse the next sachet: the
    // 20 s rest is live even though every store-level gate has expired.
    wait(700);
    requestAct();
    expect(getState().wallet.balanceGHS).toBe(34); // "Water again in 20s"
    expect(getState().needs.lastWaterAt).toBe(Date.now() - 700); // untouched
  });
});
