import { describe, expect, it } from 'vitest';
import { findFoodById, FOOD_SACHET_WATER_ID, FOOD_WAAKYE_ID } from '../../data/foods';
import { findJobById } from '../../data/jobs';
import { locations } from '../../data/locations';
import { createStarterWallet, formatGHS } from '../economy';
import { createStarterNeeds, drainNeeds, WAAKYE_MAX_HUNGER, WATER_MAX_HUNGER } from '../needs';
import { createStarterJobState, idleObjectiveFor, type JobState } from '../jobs';
import {
  actPromptFor,
  AUNTY_BA_HUSTLE_ID,
  DAAVI_JOB_SPOT_ID,
  objectiveMarkerTarget,
  resolveAct,
  SLEEP_LOCATION_ID,
  WATER_LOCATION_ID,
  WAAKYE_LOCATION_ID,
  type ActSession,
} from '../act';
import { DAAVI_BENCH, DAAVI_JOB_SPOT, markerPositionFor } from '../proximity';

const starterSession = (): ActSession => ({
  wallet: createStarterWallet(),
  needs: createStarterNeeds(),
  job: createStarterJobState(),
});

/** The session right after the starter hustle paid out (₵35, work toll taken,
 *   the run remembers the shift — G-004 completedIds). */
const paidSession = (): ActSession => ({
  wallet: { balanceGHS: 35 },
  needs: { hunger: 64, energy: 62 },
  job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
});

/**
 * The paid session mid-cooldown (G-008c): Daavi paid out `elapsedMs` before
 * the press clock `nowMs` — the exact shape the store threads (pure data,
 * no Date.now()). Hunger 70 / ₵35 is the review's dead-end scenario.
 */
const paidSessionCooling = (elapsedMs = 10_000, nowMs = 1_000_000): ActSession => ({
  wallet: { balanceGHS: 35 },
  needs: { hunger: 70, energy: 62 },
  job: {
    activeId: null,
    step: 0,
    completedIds: [AUNTY_BA_HUSTLE_ID],
    lastPayoutAt: nowMs - elapsedMs,
  },
  nowMs,
});

describe('act: data contract (G-002 item 2, G-008b bench walk, G-008d spot split)', () => {
  it('Daavi steps 1/3 happen at the JOB SPOT, step 2 at the bench, for a ₵15 payout', () => {
    const hustle = findJobById(AUNTY_BA_HUSTLE_ID)!;
    expect(hustle.payGHS).toBe(15);
    // G-008c item 2: the data's cooldown has teeth — 45 s enforced by
    // rules/jobs.ts cooldownStatus from the payout stamp.
    expect(hustle.cooldownSeconds).toBe(45);
    expect(hustle.employerName).toBe('Daavi'); // the countdown reason names it
    expect(hustle.steps.length).toBe(3);
    // G-008d item 2: grab + pay happen at the kiosk's east side — the
    // front counter sells food only.
    expect(hustle.steps[0].locationId).toBe(DAAVI_JOB_SPOT_ID);
    expect(hustle.steps[0].locationId).toBe('LOC-001-JOB');
    expect(hustle.steps[0].actionVerb).toBe('Grab pans');
    // G-008b: the second lift happens at Daavi's bench — a real waypoint
    // (proximity.ts). G-008d: on the north pavement, off the road.
    expect(hustle.steps[1].locationId).toBe('LOC-001-BENCH');
    expect(hustle.steps[1].targetLocationName).toContain('bench');
    expect(hustle.steps[1].actionVerb).toBe('Carry Pans');
    expect(hustle.steps[2].locationId).toBe(DAAVI_JOB_SPOT_ID);
    expect(hustle.steps[2].actionVerb).toBe('Get paid');
    expect(locations.some((l) => l.id === WAAKYE_LOCATION_ID)).toBe(true);
    // G-008e: Agent 3's #28 DID add LOC-001-JOB to locations.ts — the
    // data and the name are theirs, kept. But it is a ZONE-BACKED id:
    // nearestLocationId must never let it win the default-2.5 m point
    // loop (that balloons the 0.9 m job zone over the counter's east
    // half — the #28+#29 merge bug at (17.0, 0.5)). The skip and the
    // counter-disc sweep are pinned in g008e-hotfix.test.ts.
    expect(locations.some((l) => l.id === 'LOC-001-JOB')).toBe(true);
  });

  it('LOC-001 is the waakye joint and LOC-003 is the provisions shop', () => {
    const joint = locations.find((l) => l.id === WAAKYE_LOCATION_ID)!;
    const shop = locations.find((l) => l.id === WATER_LOCATION_ID)!;
    expect(joint.type).toBe('food');
    expect(shop.type).toBe('shop');
    expect(findFoodById(FOOD_WAAKYE_ID)!.priceGHS).toBe(12);
    expect(findFoodById(FOOD_SACHET_WATER_ID)!.priceGHS).toBe(1);
  });
  it('the waakye seller is Daavi (G-005 rename) — ids stay stable for the store', () => {
    const hustle = findJobById(AUNTY_BA_HUSTLE_ID)!;
    expect(hustle.employerName).toBe('Daavi');
    expect(hustle.title).toBe('Help Daavi carry pans');
    // The data keys never churn — store slices and completedIds survive.
    expect(hustle.id).toBe('HUSTLE_AUNTY_BA_STARTER');
    expect(hustle.steps.every((s) => s.stepId.startsWith('aunty_ba_'))).toBe(true);
    expect(findFoodById(FOOD_WAAKYE_ID)!.summary).toContain('Daavi');
  });
});

describe('act: the first earn-and-eat loop (₵20 → ₵35 → ₵23)', () => {
  it('starts fresh: "Help Daavi" offered at the JOB SPOT, not the counter', () => {
    const prompt = actPromptFor(starterSession(), DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);
    // G-008d: the front counter is food-only — the same fresh guest there
    // sees the meal offer (hunger 72 is under the 80 gate), never a hire.
    const counter = actPromptFor(starterSession(), WAAKYE_LOCATION_ID);
    expect(counter.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(counter.enabled).toBe(true);
  });

  it('three Acts after accepting pay ₵35 with the work toll applied', () => {
    let session = starterSession();

    // Act 1 — accept the hustle AT THE JOB SPOT.
    const started = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(started.toast).toContain('Job accepted');
    session = started.session;
    expect(session.job).toEqual({
      activeId: AUNTY_BA_HUSTLE_ID,
      step: 0,
      completedIds: [], // run history rides along through the shift
    });
    expect(session.wallet.balanceGHS).toBe(20);

    // Acts 2 and 3 — carry two stacks of pans. Step 1 is at the job spot
    // (the player just pressed there); step 2 happens at Daavi's bench —
    // the shift forces the walk.
    const lift1 = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(lift1.toast).toContain('Two more lifts');
    session = lift1.session;
    expect(session.job.step).toBe(1);

    // Pressing AT THE JOB SPOT for the bench step refuses — with the hint.
    const wrongSpot = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(wrongSpot.enabled).toBe(false);
    expect(wrongSpot.reason).toContain('Wrong spot');
    expect(wrongSpot.reason).toContain('bench');
    expect(resolveAct(session, DAAVI_JOB_SPOT_ID).session).toBe(session);

    const lift2 = resolveAct(session, 'LOC-001-BENCH'); // walked to the bench
    expect(lift2.toast).toContain('get paid');
    session = lift2.session;
    expect(session.job.step).toBe(2);

    // Back at the job spot the button reads the final step's own verb.
    expect(actPromptFor(session, DAAVI_JOB_SPOT_ID).label).toBe('Get paid');

    // Act 4 — final lift back at the job spot: Daavi pays ₵15, the shift
    // takes its toll.
    const final = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(final.toast).toContain('+₵15');
    session = final.session;
    expect(session.wallet.balanceGHS).toBe(35);
    expect(session.needs).toEqual({ hunger: 64, energy: 62 }); // −8 hunger / −18 energy
    expect(session.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [AUNTY_BA_HUSTLE_ID], // the run now remembers the hustle
    });
  });

  it('after the payout, the front counter sells waakye: −₵12, hunger up 45 (clamped)', () => {
    // G-008d: the counter sells whenever round(hunger) ≤ 80 — the paid
    // guest (hunger 64) no longer waits minutes for the drain.
    const hungryPaid: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(hungryPaid, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(hungryPaid, WAAKYE_LOCATION_ID);
    expect(result.toast).toContain('Waakye');
    expect(result.session.wallet.balanceGHS).toBe(23);
    expect(result.session.needs.hunger).toBe(100); // 64 + 45, clamped
    expect(result.session.needs.energy).toBe(62); // applyMeal touches hunger only
    expect(result.session.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [AUNTY_BA_HUSTLE_ID],
    });
  });

  it('closes the loop: ₵20 → work ×3 (job spot ↔ bench) → sleep → drift → waakye ₵23 → sleep', () => {
    let session = starterSession();
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // accept
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2 (bench)
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 3 + payout
    expect(session.wallet.balanceGHS).toBe(35);
    expect(session.needs).toEqual({ hunger: 64, energy: 62 });

    // One yard sleep maxes energy (62 + 55 → capped 100), so the bed now
    // refuses (≥ 90 gate). The JOB SPOT reads "Help Daavi" — hunger 56
    // only gates the MEAL at the counter, never the work.
    session = resolveAct(session, SLEEP_LOCATION_ID).session; // hunger 56, energy 100
    expect(actPromptFor(session, DAAVI_JOB_SPOT_ID).label).toBe('Help Daavi');
    expect(actPromptFor(session, DAAVI_JOB_SPOT_ID).enabled).toBe(true);
    expect(actPromptFor(session, SLEEP_LOCATION_ID).enabled).toBe(false); // Not tired yet

    // The loop CHOOSES the street instead of a second shift: ~5.7 min of
    // starter-profile drift (legal 2 s ticks) brings hunger 56 → 39 and
    // energy 100 → ~88.7 (under the sleep gate).
    for (let i = 0; i < 170; i++) {
      session = { ...session, needs: drainNeeds(session.needs, 2, 'starter') };
    }
    expect(session.needs.energy).toBeLessThan(90);

    const fed = resolveAct(session, WAAKYE_LOCATION_ID); // ₵35 → ₵23
    session = fed.session;
    expect(session.wallet.balanceGHS).toBe(23);
    expect(session.needs.hunger).toBeCloseTo(84, 1); // 39 + 45

    // Home again: the free sleep tops the day off — energy to the cap.
    const slept = resolveAct(session, SLEEP_LOCATION_ID);
    expect(slept.toast).toBe('Slept at the compound — +55 energy');
    expect(slept.session.needs.energy).toBe(100); // ~88.7 + 55, capped
    expect(slept.session.needs.hunger).toBeCloseTo(76, 1); // 84 − 8
    expect(slept.session.wallet.balanceGHS).toBe(23); // sleep is free
    expect(slept.session.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [AUNTY_BA_HUSTLE_ID],
    });
  });

  it('never lets the wallet go negative across a mixed act day', () => {
    // G-008c: the session carries a press clock — the payout stamps
    // lastPayoutAt = 0, so the post-sleep JOB SPOT stop sits MID-COOLDOWN
    // and reads the countdown, a disabled no-op. The wallet only ever
    // moves through the meal and the sip that are actually offered.
    let session: ActSession = { ...starterSession(), nowMs: 0 };
    const walk = [
      DAAVI_JOB_SPOT_ID, // accept
      DAAVI_JOB_SPOT_ID, // step 1
      'LOC-001-BENCH', // step 2 (bench)
      DAAVI_JOB_SPOT_ID, // step 3 + payout → ₵35
      SLEEP_LOCATION_ID, // free sleep
      DAAVI_JOB_SPOT_ID, // mid-cooldown — disabled no-op, wallet pinned
      WAAKYE_LOCATION_ID, // waakye ₵12
      WATER_LOCATION_ID, // water ₵1
    ];
    for (const near of walk) {
      session = resolveAct(session, near).session;
      expect(session.wallet.balanceGHS).toBeGreaterThanOrEqual(0);
    }
    // 35 − ₵12 meal = 23; the water stop is REFUSED (the meal clamped
    // hunger to 100 ≥ the 90 thirst gate) — the gates all did their job.
    expect(session.wallet.balanceGHS).toBe(23);
  });
});

describe('act: the split spots (G-008d — food only at the counter, work only at the spot)', () => {
  it('ITEM 7 PIN — at the counter, hunger 61 with ₵35: "Buy waakye ₵12" enabled', () => {
    // The G-008b gate (55) made food feel unbuyable: after a shift or a
    // sleep the guest waited minutes of drain before Daavi would sell.
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 61, energy: 62 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);
    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.purchased).toBe(true);
    expect(result.session.wallet.balanceGHS).toBe(23);
    expect(result.session.needs.hunger).toBe(100); // 61 + 45, clamped at 100
  });

  it('ITEM 7 PIN — at the job spot, the same state after the cooldown: "Help Daavi" → full shift → ₵50', () => {
    let session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 61, energy: 62 },
      job: {
        activeId: null,
        step: 0,
        completedIds: [AUNTY_BA_HUSTLE_ID],
        lastPayoutAt: 955_000, // 45 s before the press clock — rest just over
      },
      nowMs: 1_000_000,
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    // The FULL SHIFT: hire (job spot) → grab (job spot) → carry (bench)
    // → get paid (job spot) — the spot split forces the same walk.
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // accept
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2
    const payout = resolveAct(session, DAAVI_JOB_SPOT_ID); // step 3 + pay
    expect(payout.paidOut).toBe(true);
    expect(payout.session.wallet.balanceGHS).toBe(50); // 35 + ₵15
  });

  it('Act at the counter NEVER starts or advances a job (resolve-level)', () => {
    // Mid-shift, step 1 pending at the job spot: the counter still just
    // sells food. Even a full meal leaves the job slice untouched.
    const midShift: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 61, energy: 62 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0, completedIds: [] },
    };
    const prompt = actPromptFor(midShift, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`); // food, not 'Grab pans'
    expect(prompt.enabled).toBe(true);
    const result = resolveAct(midShift, WAAKYE_LOCATION_ID);
    expect(result.kind).toBe('waakye');
    expect(result.session.job).toBe(midShift.job); // identity — untouched
    expect(result.session.job.step).toBe(0);
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);

    // And a FULL counter (disabled) also never starts one.
    const full: ActSession = {
      ...midShift,
      needs: { hunger: 92, energy: 62 },
      job: createStarterJobState(),
    };
    const refused = resolveAct(full, WAAKYE_LOCATION_ID);
    expect(refused.kind).toBe('waakye');
    expect(refused.session).toBe(full); // true no-op — no hire happened
  });

  it('Act at the job spot NEVER buys food — even starving with cash', () => {
    // The old anti-soft-lock folded a meal into the work button; the
    // split un-folds it — the job spot's answer to "too hungry to work"
    // is the reason line, and the food is 3 m west at the counter.
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 5, energy: 80 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
    const result = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(result.session).toBe(session); // no-op — no purchase, no hire
    expect(result.session.wallet.balanceGHS).toBe(35);

    // The counter, the same state, feeds them — the escape actually exists.
    const fed = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(fed.purchased).toBe(true);
    expect(fed.session.wallet.balanceGHS).toBe(23);
    expect(fed.session.needs.hunger).toBe(50); // 5 + 45
    // Fed, the job spot hires again — the escape unblocks work.
    expect(actPromptFor(fed.session, DAAVI_JOB_SPOT_ID).enabled).toBe(true);
  });

  it('counter disabled states, in order: "Full" then "Not enough cash"', () => {
    // Full: round(85) > 80 — the meal would clamp-waste its restore.
    const full: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 85, energy: 62 },
      job: createStarterJobState(),
    };
    const fullPrompt = actPromptFor(full, WAAKYE_LOCATION_ID);
    expect(fullPrompt.label).toBe('Full');
    expect(fullPrompt.enabled).toBe(false);
    expect(fullPrompt.reason).toBe('You are full — waakye can wait.');
    const refused = resolveAct(full, WAAKYE_LOCATION_ID);
    expect(refused.session).toBe(full);
    expect(refused.kind).toBe('waakye');

    // Full outranks the purse (the state gate first, like "Not thirsty").
    const fullAndBroke: ActSession = { ...full, wallet: { balanceGHS: 0 } };
    expect(actPromptFor(fullAndBroke, WAAKYE_LOCATION_ID).label).toBe('Full');

    // Under the gate but broke: the purse is the truth.
    const broke: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 61, energy: 62 },
      job: createStarterJobState(),
    };
    const brokePrompt = actPromptFor(broke, WAAKYE_LOCATION_ID);
    expect(brokePrompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(brokePrompt.enabled).toBe(false);
    expect(brokePrompt.reason).toBe('Not enough cash — waakye is ₵12.');
  });

  it('the counter never cooldown-gates or history-gates the meal', () => {
    // A paid guest MID-COOLDOWN with an empty history-free slice: the
    // counter does not even look at the job slice — the meal sells.
    const cooling: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 61, energy: 62 },
      job: {
        activeId: null,
        step: 0,
        completedIds: [AUNTY_BA_HUSTLE_ID],
        lastPayoutAt: 1_000_000,
      },
      nowMs: 1_000_000,
    };
    expect(actPromptFor(cooling, WAAKYE_LOCATION_ID).enabled).toBe(true);
    // A guest with NO run history at all (undefined completedIds) too.
    const legacy: ActSession = { ...cooling, job: { activeId: null, step: 0 } };
    expect(actPromptFor(legacy, WAAKYE_LOCATION_ID).enabled).toBe(true);
  });

  it('spawn-drained hunger (60) at the counter still gets the meal, the job spot the hustle', () => {
    // A few spawn minutes of starter drain: hunger 72 -> 60. The old
    // HUNGER_TOPUP_BELOW proxy flipped the joint to waakye here; the
    // split makes both buttons honest about what they offer.
    const needs = { hunger: 60, energy: 76 };
    const counter = actPromptFor(
      { wallet: createStarterWallet(), needs, job: createStarterJobState() },
      WAAKYE_LOCATION_ID
    );
    expect(counter.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(counter.enabled).toBe(true);

    const spot = actPromptFor(
      { wallet: createStarterWallet(), needs, job: createStarterJobState() },
      DAAVI_JOB_SPOT_ID
    );
    expect(spot.label).toBe('Help Daavi');
    expect(spot.enabled).toBe(true);
    const result = resolveAct(
      { wallet: createStarterWallet(), needs, job: createStarterJobState() },
      DAAVI_JOB_SPOT_ID
    );
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(result.session.wallet.balanceGHS).toBe(20); // nothing spent
  });

  it('undefined completedIds (pre-E-004 store slice) reads as [] — the job spot hires', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 60, energy: 76 },
      job: { activeId: null, step: 0 }, // no completedIds key at all
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);
  });

  it('completed + moneyed + full belly: the JOB SPOT hires — no dead end (G-008d rework)', () => {
    // The G-008b shape read "Full" at the one joint button and refused;
    // the split moves work to its own spot — the counter's Full no
    // longer blocks the hire 3 m away.
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 100, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    // The counter, the same state: Full, disabled.
    const counter = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(counter.label).toBe('Full');
    expect(counter.enabled).toBe(false);
    // The job spot, the same state: Help Daavi, enabled.
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID); // re-hired
    expect(result.session.wallet.balanceGHS).toBe(35); // zero-capital hustle
  });

  it('broke and full? The zero-capital hustle is still the fallback', () => {
    // The counter's Full only blocks the MEAL — a broke guest gets
    // re-hired at the job spot so income can never wall itself off.
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 92, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);
  });

  it('working the hustle again after completion keeps completedIds deduped', () => {
    // Broke after the first shift — Daavi re-hires, and a second full
    // shift must NOT grow completedIds to two entries.
    let session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    expect(actPromptFor(session, DAAVI_JOB_SPOT_ID).label).toBe('Help Daavi');

    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // re-accept
    expect(session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(session.job.completedIds).toEqual([AUNTY_BA_HUSTLE_ID]); // preserved

    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2 (bench)
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 3 + payout
    expect(session.wallet.balanceGHS).toBe(20); // 5 + ₵15, zero-capital loop
    expect(session.job.activeId).toBeNull();
    expect(session.job.completedIds).toEqual([AUNTY_BA_HUSTLE_ID]); // still ONE
  });

  it('ITEM 7 PIN — the counter and job spot ZONES never overlap', () => {
    // Geometry: 2.5 (counter) + 0.9 (job spot) < 3.466 m between centres.
    const counter = locations.find((l) => l.id === WAAKYE_LOCATION_ID)!;
    const dx = DAAVI_JOB_SPOT.x - counter.x;
    const dz = DAAVI_JOB_SPOT.z - counter.z;
    const centreDistance = Math.sqrt(dx * dx + dz * dz);
    expect(centreDistance).toBeGreaterThan(
      DAAVI_JOB_SPOT.radius + 2.5
    );

    // And a fine sweep over the joint's neighbourhood: no point is inside
    // TWO of { counter, job spot, bench } — one press, one meaning.
    const zones = [
      { id: WAAKYE_LOCATION_ID, x: counter.x, z: counter.z, r: 2.5 },
      { id: DAAVI_JOB_SPOT_ID, x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z, r: DAAVI_JOB_SPOT.radius },
      { id: 'LOC-001-BENCH', x: DAAVI_BENCH.x, z: DAAVI_BENCH.z, r: DAAVI_BENCH.radius },
    ];
    for (let x = 10; x <= 26; x += 0.1) {
      for (let z = -4; z <= 8; z += 0.1) {
        let inside = 0;
        for (const zn of zones) {
          const ddx = x - zn.x;
          const ddz = z - zn.z;
          if (ddx * ddx + ddz * ddz <= zn.r * zn.r) inside += 1;
        }
        expect(inside, `point (${x.toFixed(1)}, ${z.toFixed(1)}) in ${inside} zones`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the job spot zone is where the probe says it is (position path)', () => {
    // (18, 0) itself, and points inside r 0.9, resolve to the job spot;
    // (17, 0.5) is counter territory (2.42 m) and outside the job spot.
    for (const pos of [
      { x: 18, z: 0 },
      { x: 17.5, z: 0.5 },
      { x: 18.4, z: -0.4 },
    ]) {
      const prompt = actPromptFor(
        { ...starterSession(), position: pos },
        null // the point probe reads nothing there — the zone decides
      );
      expect(prompt.label, `position ${pos.x},${pos.z}`).toBe('Help Daavi');
    }
    const counterSide = actPromptFor(
      { ...starterSession(), position: { x: 17.0, z: 0.5 } },
      null
    );
    expect(counterSide.label).toBe(`Buy waakye ${formatGHS(12)}`);
  });
});

describe('act: water at the provisions store (LOC-003, G-008c round 2 nerf)', () => {
  it('sells sachet water for ₵1 with the sip effects (+4 hunger / +2 energy)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 40, energy: 30 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WATER_LOCATION_ID);
    expect(prompt.label).toBe('Buy water ₵1');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, WATER_LOCATION_ID);
    expect(result.toast).toContain('+2 energy');
    expect(result.session.wallet.balanceGHS).toBe(4);
    expect(result.session.needs).toEqual({ hunger: 44, energy: 32 });
  });

  it('refuses water without ₵1 and leaves the session untouched', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 0.5 },
      needs: { hunger: 40, energy: 30 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WATER_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('water');

    const result = resolveAct(session, WATER_LOCATION_ID);
    expect(result.session).toBe(session);
    expect(result.toast).toBeNull();
  });

  it('a purchase stamps lastWaterAt from the press clock (pure data)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 40, energy: 30 },
      job: createStarterJobState(),
      nowMs: 1_000_000,
    };
    const result = resolveAct(session, WATER_LOCATION_ID);
    expect(result.purchased).toBe(true);
    expect(result.session.needs.lastWaterAt).toBe(1_000_000);
  });
});

describe('act: the water gates (G-008c round 2 — Not thirsty + 20 s rest)', () => {
  const waterSession = (
    needs: { hunger: number; energy: number },
    extra?: Partial<ActSession>
  ): ActSession => ({
    wallet: { balanceGHS: 5 },
    needs,
    job: createStarterJobState(),
    ...extra,
  });

  it('refuses with "Not thirsty" at hunger ≥ 90 (89 still buys)', () => {
    const quenched = waterSession({ hunger: 90, energy: 30 });
    const prompt = actPromptFor(quenched, WATER_LOCATION_ID);
    expect(prompt.label).toBe('Buy water ₵1');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Not thirsty');
    const refused = resolveAct(quenched, WATER_LOCATION_ID);
    expect(refused.session).toBe(quenched); // identity — the guards never stamp it
    expect(refused.toast).toBeNull();
    expect(refused.kind).toBe('water');

    // Boundary below the gate is open (the mirror of the sleep 89/90 pin).
    // G-008d item 7 pin: hunger 85 still drinks.
    expect(actPromptFor(waterSession({ hunger: 89, energy: 30 }), WATER_LOCATION_ID).enabled).toBe(true);
    expect(actPromptFor(waterSession({ hunger: 85, energy: 30 }), WATER_LOCATION_ID).enabled).toBe(true);
  });

  it('the gate rounds like the Full gate: 89.6 → 90 refuses, 89.4 → 89 buys', () => {
    expect(
      actPromptFor(waterSession({ hunger: 89.6, energy: 30 }), WATER_LOCATION_ID).enabled
    ).toBe(false);
    expect(
      actPromptFor(waterSession({ hunger: 89.4, energy: 30 }), WATER_LOCATION_ID).enabled
    ).toBe(true);
  });

  it('enforces the 20 s per-sachet rest from the purchase stamp', () => {
    const bought = resolveAct(waterSession({ hunger: 40, energy: 30 }, { nowMs: 100_000 }), WATER_LOCATION_ID);
    expect(bought.purchased).toBe(true);

    // 5 s later: still resting — "Water again in 15s".
    const resting: ActSession = { ...bought.session, nowMs: 105_000 };
    const prompt = actPromptFor(resting, WATER_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Water again in 15s');
    const refused = resolveAct(resting, WATER_LOCATION_ID);
    expect(refused.session).toBe(resting);
    expect(refused.toast).toBeNull();

    // The exact boundary is READY — 20 s elapsed leaves 0 ms remaining.
    expect(
      actPromptFor({ ...bought.session, nowMs: 120_000 }, WATER_LOCATION_ID).enabled
    ).toBe(true);
    expect(
      actPromptFor({ ...bought.session, nowMs: 119_999 }, WATER_LOCATION_ID).reason
    ).toBe('Water again in 1s');
  });

  it('sips stop at the thirst gate: 9 from hunger 60, the 10th is "Not thirsty"', () => {
    // The exploit, replayed with the nerf (G-008d gate: 90): hunger 60 /
    // energy 60, one sachet every 20 s (the fastest legal cadence). Each
    // sip is +4/+2; the gate stops the run when rounded hunger hits 90.
    let session: ActSession = {
      ...waterSession({ hunger: 60, energy: 60 }, { nowMs: 0 }),
      wallet: { balanceGHS: 20 }, // deep enough that the thirst gate bites first
    };
    let sips = 0;
    for (let i = 0; i < 20; i++) {
      session = { ...session, nowMs: i * 20_000 };
      const prompt = actPromptFor(session, WATER_LOCATION_ID);
      if (!prompt.enabled) {
        expect(prompt.reason, `sip ${i + 1}`).toBe('Not thirsty');
        expect(resolveAct(session, WATER_LOCATION_ID).session).toBe(session);
        break;
      }
      session = resolveAct(session, WATER_LOCATION_ID).session;
      sips += 1;
    }
    // 60 → 64 → … → 92: eight sips land hunger on 92; the 9th press
    // reads round(92) ≥ 90 and is refused — the gate, not the purse.
    expect(sips).toBe(8);
    expect(session.needs.hunger).toBe(92); // 88 + 4 on the last allowed sip
    expect(session.needs.energy).toBe(76); // 60 + 8 × 2 — +16 for ₵8
    // The energy story holds: even the full sip run is a fraction of ONE
    // free sleep (+55) — the sachet can never out-compete the bed.
    expect(session.needs.energy).toBeLessThan(60 + 55);
  });

  it('reason order: "Not thirsty" first, then the rest, then the purse', () => {
    // Thirsty-but-broke shows the purse (thirst gate open); quenched
    // shows thirst even when broke; quenched AND resting still shows
    // thirst — the gate outranks the countdown by design.
    expect(
      actPromptFor(
        { ...waterSession({ hunger: 40, energy: 30 }), wallet: { balanceGHS: 0 } },
        WATER_LOCATION_ID
      ).reason
    ).toContain('Not enough cash');
    expect(
      actPromptFor(waterSession({ hunger: 92, energy: 30 }), WATER_LOCATION_ID).reason
    ).toBe('Not thirsty');
    const quenchedRestingBroke: ActSession = {
      wallet: { balanceGHS: 0 },
      needs: { hunger: 92, energy: 30, lastWaterAt: 100_000 },
      job: createStarterJobState(),
      nowMs: 105_000,
    };
    expect(actPromptFor(quenchedRestingBroke, WATER_LOCATION_ID).reason).toBe('Not thirsty');
    // Thirsty + resting + broke: the countdown is the useful truth.
    const thirstyRestingBroke: ActSession = {
      ...quenchedRestingBroke,
      needs: { hunger: 40, energy: 30, lastWaterAt: 100_000 },
    };
    expect(actPromptFor(thirstyRestingBroke, WATER_LOCATION_ID).reason).toBe('Water again in 15s');
  });

  it('a session without the press clock never rests (legacy callers)', () => {
    // lastWaterAt without nowMs cannot count — optional-safe like the job
    // cooldown, so pre-round-2 sessions keep compiling and keep buying.
    const stamped: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 40, energy: 30, lastWaterAt: 100_000 },
      job: createStarterJobState(),
    };
    expect(actPromptFor(stamped, WATER_LOCATION_ID).enabled).toBe(true);
  });
});

describe('act: sleep at the Starter Compound (LOC-002, G-006)', () => {
  const tiredSession = (): ActSession => ({
    wallet: { balanceGHS: 23 },
    needs: { hunger: 50, energy: 30 },
    job: createStarterJobState(),
  });

  it('offers free sleep: +55 energy, −8 hunger, wallet untouched', () => {
    const prompt = actPromptFor(tiredSession(), SLEEP_LOCATION_ID);
    expect(prompt.label).toBe('Sleep');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(tiredSession(), SLEEP_LOCATION_ID);
    expect(result.toast).toBe('Slept at the compound — +55 energy');
    expect(result.session.needs).toEqual({ hunger: 42, energy: 85 });
    expect(result.session.wallet.balanceGHS).toBe(23); // free
  });

  it('caps energy at 100 (post-waakye 62 → 100, not 117)', () => {
    const result = resolveAct(paidSession(), SLEEP_LOCATION_ID);
    expect(result.session.needs.energy).toBe(100);
    expect(result.session.needs.hunger).toBe(56); // 64 − 8
  });

  it('floors hunger at zero — sleep never drives a need negative', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 0 },
      needs: { hunger: 3, energy: 40 },
      job: createStarterJobState(),
    };
    const result = resolveAct(session, SLEEP_LOCATION_ID);
    expect(result.session.needs.hunger).toBe(0);
    expect(result.session.needs.energy).toBe(95);
  });

  it('greys out with "Not tired yet" at energy ≥ 90 (89 still sleeps)', () => {
    const rested: ActSession = {
      wallet: { balanceGHS: 23 },
      needs: { hunger: 50, energy: 90 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(rested, SLEEP_LOCATION_ID);
    expect(prompt.label).toBe('Sleep');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Not tired yet');

    const refused = resolveAct(rested, SLEEP_LOCATION_ID);
    expect(refused.session).toBe(rested); // no-op commit
    expect(refused.toast).toBeNull();

    const borderline: ActSession = { ...rested, needs: { hunger: 50, energy: 89 } };
    expect(actPromptFor(borderline, SLEEP_LOCATION_ID).enabled).toBe(true);
  });

  it('sleep stays on offer mid-shift — a nap never touches the live job', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 20 },
      needs: { hunger: 50, energy: 30 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 1, completedIds: [] },
    };
    const prompt = actPromptFor(session, SLEEP_LOCATION_ID);
    expect(prompt.label).toBe('Sleep');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, SLEEP_LOCATION_ID);
    expect(result.session.job).toBe(session.job); // identity preserved
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(result.session.job.step).toBe(1);
    expect(result.session.needs.energy).toBe(85);
  });

  it('LOC-002 is the compound: a real home location', () => {
    const compound = locations.find((l) => l.id === SLEEP_LOCATION_ID)!;
    expect(compound.type).toBe('home');
    expect(compound.name).toBe('Starter Compound');
  });
});

describe('act: disabled cases (G-008d spot routing)', () => {
  it('refuses to work the hustle while too tired (at the job spot)', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 80, energy: 5 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0 },
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too tired');

    const result = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(result.session).toBe(session);
    expect(result.toast).toBeNull();
  });

  it('refuses to work the hustle while too hungry (at the job spot)', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 5, energy: 80 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0 },
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
  });

  it('refuses to start while too tired, even with cash (at the job spot)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 80, energy: 5 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too tired');
  });

  it('hungry and broke cannot start either — with the reason why (at the job spot)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 5, energy: 80 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
  });

  it('broke after the hustle? Daavi still offers the hustle (work-when-broke)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, DAAVI_JOB_SPOT_ID);
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(result.session.wallet.balanceGHS).toBe(5); // zero-capital hustle
  });

  it('another shift in progress blocks the JOB SPOT hire', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: 'JOB_TROTRO_MATE', step: 0 },
    };
    const prompt = actPromptFor(session, DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Finish your current shift');
  });

  it('another shift in progress does NOT block the counter — food is food', () => {
    // G-008d: the counter is food-only; it never even looks at the job
    // slice, whoever employs you right now.
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: 'JOB_TROTRO_MATE', step: 0 },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);
  });
});

describe('act: nothing happens away from act locations', () => {
  it('not near anything: label "Act", disabled, resolve is a no-op', () => {
    const session = paidSession();
    const prompt = actPromptFor(session, null);
    expect(prompt.label).toBe('Act');
    expect(prompt.enabled).toBe(false);

    const result = resolveAct(session, null);
    expect(result.session).toBe(session);
    expect(result.toast).toBeNull();
  });

  it('known locations without an act yet are also idle', () => {
    // LOC-002 sleeps since G-006 — covered in the compound suite above.
    for (const near of ['LOC-004', 'LOC-005', 'LOC-006', 'LOC-999']) {
      const prompt = actPromptFor(paidSession(), near);
      expect(prompt.enabled).toBe(false);
      expect(prompt.reason).toContain('Nothing to do here');
      const result = resolveAct(paidSession(), near);
      expect(result.toast).toBeNull();
    }
  });
});

describe('act: prompt and resolution agree', () => {
  it('a press only does something when the prompt is enabled', () => {
    const scenarios: Array<[ActSession, string | null]> = [
      // G-008d: the fresh guest at the counter sees the meal (enabled);
      // at the job spot the hire.
      [{ ...starterSession(), needs: { hunger: 50, energy: 80 } }, WAAKYE_LOCATION_ID],
      [starterSession(), DAAVI_JOB_SPOT_ID],
      [paidSession(), WAAKYE_LOCATION_ID],
      [paidSession(), null],
      [paidSession(), 'LOC-004'],
      [
        // G-008d: the starving-with-cash guest buys at the counter.
        {
          wallet: { balanceGHS: 20 },
          needs: { hunger: 5, energy: 80 },
          job: createStarterJobState(),
        },
        WAAKYE_LOCATION_ID,
      ],
      [
        {
          wallet: { balanceGHS: 5 },
          needs: { hunger: 80, energy: 5 },
          job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0 },
        },
        DAAVI_JOB_SPOT_ID,
      ],
      [
        {
          wallet: { balanceGHS: 0.5 },
          needs: { hunger: 40, energy: 30 },
          job: createStarterJobState(),
        },
        WATER_LOCATION_ID,
      ],
      [
        // G-006: tired guest at the compound — enabled sleep.
        {
          wallet: { balanceGHS: 23 },
          needs: { hunger: 50, energy: 30 },
          job: createStarterJobState(),
        },
        SLEEP_LOCATION_ID,
      ],
      [
        // G-006: rested guest refuses the bed — disabled no-op sleep.
        {
          wallet: { balanceGHS: 23 },
          needs: { hunger: 50, energy: 95 },
          job: createStarterJobState(),
        },
        SLEEP_LOCATION_ID,
      ],
      // G-008b: position-bearing sessions — the position decides, even
      // with nearLocationId null (the press-time zone-exact path).
      [
        {
          wallet: { balanceGHS: 23 },
          needs: { hunger: 50, energy: 40 },
          job: createStarterJobState(),
          position: { x: -10, z: 20 }, // yard centre, nowhere near a point
        },
        null,
      ],
      [
        {
          wallet: { balanceGHS: 35 },
          needs: { hunger: 50, energy: 62 },
          job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
          position: { x: 15.5, z: 2.4 }, // the counter itself
        },
        null,
      ],
      [
        {
          wallet: { balanceGHS: 35 },
          needs: { hunger: 92, energy: 62 },
          job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
          position: { x: 15.5, z: 2.4 }, // Full gate through the position path
        },
        null,
      ],
      [
        {
          wallet: { balanceGHS: 20 },
          needs: { hunger: 72, energy: 80 },
          job: { activeId: AUNTY_BA_HUSTLE_ID, step: 1, completedIds: [] },
          position: { x: DAAVI_BENCH.x, z: DAAVI_BENCH.z }, // the bench: step 2 advances here
        },
        null,
      ],
      [
        {
          wallet: { balanceGHS: 20 },
          needs: { hunger: 72, energy: 80 },
          job: { activeId: AUNTY_BA_HUSTLE_ID, step: 1, completedIds: [] },
          position: { x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z }, // the job spot: wrong spot for step 2
        },
        null,
      ],
    ];
    for (const [session, near] of scenarios) {
      const prompt = actPromptFor(session, near);
      const result = resolveAct(session, near);
      expect(result.toast !== null).toBe(prompt.enabled);
      if (!prompt.enabled) expect(result.session).toBe(session);
    }
  });
});

// ── G-008b: proximity wiring (items 1, 2, 4, 7) ─────────────────────────────

const YARD_CENTRE = { x: -10, z: 20 };
const YARD_GATE = { x: -9.5, z: 13.4 }; // the designed spawn
const KIOSK = { x: 15.5, z: 2.4 };
const BENCH = { x: DAAVI_BENCH.x, z: DAAVI_BENCH.z }; // the real waypoint
const GATE_POINT_ONLY = { x: -4.5, z: 8 }; // outside the yard, near no point

describe('act: sleep zone is the yard AABB (G-008b item 1)', () => {
  it('the whole yard offers Sleep — not just the 2.5 m gate point', () => {
    for (const pos of [YARD_CENTRE, YARD_GATE, { x: -14, z: 22 }, { x: -4.2, z: 13.2 }]) {
      const prompt = actPromptFor(
        { wallet: { balanceGHS: 20 }, needs: { hunger: 50, energy: 40 }, job: createStarterJobState(), position: pos },
        null // the point probe reads nothing here — the zone decides
      );
      expect(prompt.label, `position ${pos.x},${pos.z}`).toBe('Sleep');
      expect(prompt.enabled).toBe(true);
    }
  });

  it('outside the yard there is no Sleep — the point probe still rules', () => {
    const prompt = actPromptFor(
      { wallet: { balanceGHS: 20 }, needs: { hunger: 50, energy: 40 }, job: createStarterJobState(), position: GATE_POINT_ONLY },
      null
    );
    expect(prompt.label).toBe('Act'); // idle — nothing near
    expect(prompt.enabled).toBe(false);
  });

  it('a position-bearing session overrides a stale nearLocationId', () => {
    // Standing in the yard while the probe (hypothetically) still says
    // LOC-001: the position wins — zone-exact at press time.
    const prompt = actPromptFor(
      { wallet: { balanceGHS: 20 }, needs: { hunger: 50, energy: 40 }, job: createStarterJobState(), position: YARD_CENTRE },
      WAAKYE_LOCATION_ID
    );
    expect(prompt.label).toBe('Sleep');
  });

  it('positionless sessions keep the nearLocationId contract (HUD prompt path)', () => {
    const prompt = actPromptFor(starterSession(), SLEEP_LOCATION_ID);
    expect(prompt.label).toBe('Sleep');
    expect(prompt.enabled).toBe(true);
  });
});

describe('act: waakye Full gate boundary (G-008d gate 80, food-only counter)', () => {
  const completed = (): ActSession => ({
    wallet: { balanceGHS: 35 },
    needs: { hunger: 50, energy: 62 },
    job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
  });

  it('round(hunger) 80.4 → 80: waakye still offered (the restored gate)', () => {
    const s = { ...completed(), needs: { hunger: 80.4, energy: 62 } };
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).enabled).toBe(true);
  });

  it('round(hunger) 80.6 → 81 at the counter: "Full", disabled', () => {
    // The counter is food-only — above the gate it has nothing else to
    // say. The work answer lives 3 m east at the job spot (next test).
    const s: ActSession = { ...completed(), needs: { hunger: 80.6, energy: 62 } };
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Full');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('You are full — waakye can wait.');
    expect(prompt.label).not.toContain('waakye');
    const result = resolveAct(s, WAAKYE_LOCATION_ID);
    expect(result.session).toBe(s); // no-op
    expect(result.toast).toBeNull();
  });

  it('hunger 92 (the iPhone report): the counter Fulls, the JOB SPOT hires — no dead end', () => {
    const s: ActSession = { ...completed(), needs: { hunger: 92, energy: 62 } };
    const counter = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(counter.label).toBe('Full');
    expect(counter.enabled).toBe(false);
    // The dead end died WITH the split: the same state at the job spot
    // is a live hire (G-008c's countdown door, now its own spot).
    const spot = actPromptFor(s, DAAVI_JOB_SPOT_ID);
    expect(spot.label).toBe('Help Daavi');
    expect(spot.enabled).toBe(true);
  });

  it('the sleep door narrows: 92 → sleep → 84 — the street drain re-opens the counter', () => {
    // One sleep from energy 62 caps energy at 100 (the second sleep is
    // gated "Not tired yet"); hunger 92 → 84 is still above the meal
    // gate — the street's drain (3/min) brings it under 80 in ~80 s,
    // and the counter re-opens. The counter NEVER gates on the cooldown
    // or the history — only on the belly and the purse.
    let s: ActSession = { ...completed(), needs: { hunger: 92, energy: 62 } };
    s = resolveAct(s, SLEEP_LOCATION_ID).session;
    expect(s.needs.hunger).toBe(84);
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).label).toBe('Full');
    for (let i = 0; i < 40; i++) {
      s = { ...s, needs: drainNeeds(s.needs, 2, 'starter') }; // 80 s → hunger 80
    }
    expect(s.needs.hunger).toBeCloseTo(80, 5);
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);
  });
});

// ── G-008c cooldowns, re-homed by G-008d: work gates live at the JOB SPOT
// ── (the counter never cooldown-gates — pinned right here).

describe('act: the job spot after the first shift (G-008c items 1/2, G-008d spot)', () => {
  it('₵35 + hunger 70 ten seconds after the payout: disabled with the live countdown', () => {
    // THE review scenario (item 6): after a shift, the moneyed guest waits
    // out the rest — the button says so, counting down; it is never a
    // dead end (the meal stays available at the counter the whole time).
    const prompt = actPromptFor(paidSessionCooling(10_000), DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    // 45 s rest − 10 s elapsed = 35 s to go, counted from the data.
    expect(prompt.reason).toBe('Daavi needs you again in 35s');

    const cooling = paidSessionCooling(10_000);
    const result = resolveAct(cooling, DAAVI_JOB_SPOT_ID);
    expect(result.session).toBe(cooling); // same reference — a true no-op
    expect(result.kind).toBe('start');
    expect(result.toast).toBeNull();
  });

  it('₵35 + hunger 70 forty-five seconds after the payout: "Help Daavi" → second payout ₵50', () => {
    const prompt = actPromptFor(paidSessionCooling(45_000), DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    let session = paidSessionCooling(45_000);
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // accept
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2 (bench)
    const final = resolveAct(session, DAAVI_JOB_SPOT_ID); // step 3 + payout
    expect(final.paidOut).toBe(true);
    expect(final.session.wallet.balanceGHS).toBe(50); // 35 + 15
    // The second payout RE-ARMS the cooldown at the press clock…
    expect(final.session.job.lastPayoutAt).toBe(1_000_000);
    // …so an immediate re-hire is refused with a fresh countdown.
    const again = actPromptFor(final.session, DAAVI_JOB_SPOT_ID);
    expect(again.enabled).toBe(false);
    expect(again.reason).toBe('Daavi needs you again in 45s');
  });

  it('hunger 92 + ₵35 + ON cooldown: the countdown at the spot, "Full" at the counter', () => {
    // The countdown outranks the body at the job spot: the rest is what
    // the wait fixes first. Fullness never shows HERE at all — it is a
    // counter reason now, and the counter shows its own truth.
    const s: ActSession = {
      ...paidSessionCooling(10_000),
      needs: { hunger: 92, energy: 62 },
    };
    const prompt = actPromptFor(s, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Daavi needs you again in 35s');
    expect(prompt.label).not.toContain('waakye');
    const result = resolveAct(s, DAAVI_JOB_SPOT_ID);
    expect(result.session).toBe(s);
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).label).toBe('Full');
  });

  it('waakye is STILL offered during the cooldown — at the counter', () => {
    const s: ActSession = {
      ...paidSessionCooling(10_000),
      needs: { hunger: 50, energy: 62 },
    };
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);
    const result = resolveAct(s, WAAKYE_LOCATION_ID);
    expect(result.purchased).toBe(true);
    expect(result.session.wallet.balanceGHS).toBe(23);
    expect(result.session.needs.hunger).toBe(95);
  });

  it('broke + hungry + on cooldown: the countdown reason shows (at the job spot)', () => {
    const s: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 30, energy: 62 },
      job: {
        activeId: null,
        step: 0,
        completedIds: [AUNTY_BA_HUSTLE_ID],
        lastPayoutAt: 990_000,
      },
      nowMs: 1_000_000,
    };
    const prompt = actPromptFor(s, DAAVI_JOB_SPOT_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Daavi needs you again in 35s');
  });

  it('broke + full + off cooldown: the counter says "Full", the spot hires', () => {
    // G-008d: "Full" is a COUNTER reason — it lives at the food door and
    // never blocks the work door. Off cooldown, the job spot hires.
    const s: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 92, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('You are full — waakye can wait.');
    expect(actPromptFor(s, DAAVI_JOB_SPOT_ID).enabled).toBe(true);
  });

  it('broke + hungry + tired: the canWork reason ("Too tired") at the job spot', () => {
    const s: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 30, energy: 5 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(s, DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too tired');
  });

  it('a session WITHOUT the press clock (legacy caller) is never cooldown-gated', () => {
    // Pre-G-008c sessions (no nowMs) read as ready — optional-safe like
    // completedIds, so old callers and slices keep compiling.
    const prompt = actPromptFor(paidSession(), DAAVI_JOB_SPOT_ID);
    expect(prompt.enabled).toBe(true);
  });
});

describe('act: resolution flags (G-008c item 4 — structural, not toast text)', () => {
  it('a payout press reports kind advance + paidOut, never purchased', () => {
    let session = starterSession();
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // accept
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2
    const payout = resolveAct(session, DAAVI_JOB_SPOT_ID); // step 3 + pay
    expect(payout.kind).toBe('advance');
    expect(payout.paidOut).toBe(true);
    expect(payout.purchased).toBe(false);
    expect(payout.toast).toContain('+₵15');
  });

  it('a mid-shift step reports advance with both flags false', () => {
    let session = starterSession();
    session = resolveAct(session, DAAVI_JOB_SPOT_ID).session; // accept
    const step = resolveAct(session, DAAVI_JOB_SPOT_ID); // step 1
    expect(step.kind).toBe('advance');
    expect(step.paidOut).toBe(false);
    expect(step.purchased).toBe(false);
  });

  it('purchases report purchased=true; hires report neither flag', () => {
    const meal = resolveAct(
      { ...paidSessionCooling(45_000), needs: { hunger: 50, energy: 62 } },
      WAAKYE_LOCATION_ID
    );
    expect(meal.kind).toBe('waakye');
    expect(meal.purchased).toBe(true);
    expect(meal.paidOut).toBe(false);

    const water = resolveAct(
      { wallet: { balanceGHS: 5 }, needs: { hunger: 40, energy: 30 }, job: createStarterJobState() },
      WATER_LOCATION_ID
    );
    expect(water.kind).toBe('water');
    expect(water.purchased).toBe(true);
    expect(water.paidOut).toBe(false);

    const hire = resolveAct(starterSession(), DAAVI_JOB_SPOT_ID);
    expect(hire.kind).toBe('start');
    expect(hire.purchased).toBe(false);
    expect(hire.paidOut).toBe(false);

    const nap = resolveAct(
      {
        wallet: { balanceGHS: 23 },
        needs: { hunger: 50, energy: 30 },
        job: createStarterJobState(),
      },
      SLEEP_LOCATION_ID
    );
    expect(nap.kind).toBe('sleep');
    expect(nap.purchased).toBe(false);
    expect(nap.paidOut).toBe(false);
  });

  it('a disabled press keeps its decided kind with both flags false', () => {
    const full: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 92, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const refused = resolveAct(full, WAAKYE_LOCATION_ID);
    expect(refused.kind).toBe('waakye'); // the Full decision, disabled
    expect(refused.purchased).toBe(false);
    expect(refused.paidOut).toBe(false);
    expect(refused.session).toBe(full);
    expect(refused.toast).toBeNull();
  });
});

describe('act: Daavi bench walk (G-008b item 4, G-008d bench on the pavement)', () => {
  const atStep = (step: number, position?: { x: number; z: number }): ActSession => ({
    wallet: { balanceGHS: 20 },
    needs: { hunger: 72, energy: 80 },
    job: { activeId: AUNTY_BA_HUSTLE_ID, step, completedIds: [] },
    ...(position ? { position } : {}),
  });

  it('step 2 refuses AT THE JOB SPOT with the walk hint (position path)', () => {
    const prompt = actPromptFor(atStep(1, { x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z }), null);
    expect(prompt.label).toBe('Carry Pans');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Wrong spot');
    expect(prompt.reason).toContain('bench');

    const result = resolveAct(atStep(1, { x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z }), null);
    expect(result.session.job.step).toBe(1); // untouched
    expect(result.toast).toBeNull();
  });

  it('the counter with step 2 pending still sells food — the walk hint lives in the card', () => {
    // G-008d: the counter never handles work, so its wrong-spot answer
    // is just the meal offer; the objective card carries the walk text.
    const prompt = actPromptFor(atStep(1, KIOSK), null);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);
  });

  it('step 2 advances at the bench — zone-derived from the position', () => {
    const prompt = actPromptFor(atStep(1, BENCH), null);
    expect(prompt.label).toBe('Carry Pans');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(atStep(1, BENCH), null);
    expect(result.toast).toContain('get paid');
    expect(result.session.job.step).toBe(2);
  });

  it('steps 1/3 refuse AT the bench — naming the side of the kiosk', () => {
    const prompt = actPromptFor(atStep(0, BENCH), null);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Wrong spot — jobs are at the side of the kiosk.');
    expect(prompt.label).toBe('Grab pans');

    const step3 = actPromptFor(atStep(2, BENCH), null);
    expect(step3.enabled).toBe(false);
    expect(step3.reason).toBe('Wrong spot — jobs are at the side of the kiosk.');
    expect(step3.label).toBe('Get paid');
  });

  it('the idle bench redirects a hungry moneyed guest to the front counter', () => {
    const idle: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 61, energy: 62 },
      job: createStarterJobState(),
      position: BENCH,
    };
    const prompt = actPromptFor(idle, null);
    expect(prompt.label).toBe('Act');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toBe('Wrong spot — food is at the front counter.');
    const result = resolveAct(idle, null);
    expect(result.session).toBe(idle); // a redirect, never an action
  });

  it('a nap at the yard mid-shift still works, and the bench is not the yard', () => {
    // Sanity: the zone priority — the pavement bench is never the yard,
    // the yard (x ≤ −4) is never the bench.
    expect(actPromptFor(atStep(1, { x: -10, z: 20 }), null).label).toBe('Sleep');
  });
});

describe('act: objective marker target (G-008b item 7, G-008d item 4)', () => {
  it('active job → the current step location (job spot for 1/3, bench for 2)', () => {
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 0, completedIds: [] }, { hunger: 72, energy: 80 })).toBe(DAAVI_JOB_SPOT_ID);
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 1, completedIds: [] }, { hunger: 72, energy: 80 })).toBe('LOC-001-BENCH');
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 2, completedIds: [] }, { hunger: 72, energy: 80 })).toBe(DAAVI_JOB_SPOT_ID);
    // markerPositionFor anchors the job spot at the crates' standing point.
    expect(markerPositionFor(DAAVI_JOB_SPOT_ID)).toEqual({ x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z });
    expect(markerPositionFor('LOC-001-BENCH')).toEqual({ x: DAAVI_BENCH.x, z: DAAVI_BENCH.z });
    expect(markerPositionFor(null)).toBeNull();
  });

  it('energy < 25 with no job → LOC-002 (markerPositionFor anchors COMPOUND_DOOR)', () => {
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 24 })).toBe(SLEEP_LOCATION_ID);
    expect(markerPositionFor(SLEEP_LOCATION_ID)).toEqual({ x: -10, z: 18.5 }); // the door
    // The threshold is the shared LOW threshold: exactly 25 is not tired.
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 25 })).toBe(DAAVI_JOB_SPOT_ID);
  });

  it('fresh fed run → the JOB SPOT (the hire lives there); completed fed run → hidden', () => {
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 80 })).toBe(DAAVI_JOB_SPOT_ID);
    expect(
      objectiveMarkerTarget({ activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] }, { hunger: 85, energy: 80 })
    ).toBeNull();
    // …but a completed guest who is tired still gets walked home.
    expect(
      objectiveMarkerTarget({ activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] }, { hunger: 85, energy: 10 })
    ).toBe(SLEEP_LOCATION_ID);
  });

  it('the eating hint points at the FRONT COUNTER (G-008d item 4)', () => {
    // Completed run, hunger under the meal gate → the meal line, the
    // counter marker.
    expect(
      objectiveMarkerTarget({ activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] }, { hunger: 61, energy: 62 })
    ).toBe(WAAKYE_LOCATION_ID);
    // A fresh guest too hungry to work gets the same food pointer.
    expect(
      objectiveMarkerTarget(createStarterJobState(), { hunger: 5, energy: 80 })
    ).toBe(WAAKYE_LOCATION_ID);
    expect(markerPositionFor(WAAKYE_LOCATION_ID)).toEqual({ x: 15.5, z: 2.4 });
  });
});

// ── G-008d item 5: the idle line never contradicts the button — and it
// ── names the spot where the suggested action actually lives.

describe('act: the idle objective line agrees with the Act button (property)', () => {
  const done: JobState = { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] };
  const WAAKYE_LINE = `Hungry? Buy waakye at Daavi’s front counter (${formatGHS(12)}).`;
  const TIRED_LINE = 'Tired — head home to the compound and sleep.';
  const WORK_LINE = 'Work another shift — jobs are at the side of Daavi’s kiosk.';
  const FIND_WORK_LINE = 'No job yet — find work at the side of Daavi’s kiosk.';

  /**
   * G-008c round 2 item 8, G-008d item 5 — over a hunger × energy grid
   * (0..100 step 5 — 441 cells × BOTH run states). The canonical session
   * behind the grid: the meal affordable (the line quotes the data
   * price), the job off cooldown (the needs-less clock — ready, like the
   * legacy callers). The property: whatever the line suggests, the Act
   * button OFFERS it at the spot the line NAMES — the copy can never
   * send a guest somewhere the button refuses them.
   */
  it('every suggested action is enabled at the spot the line names, across the grid', () => {
    for (const state of [done, createStarterJobState()] as const) {
      for (let hunger = 0; hunger <= 100; hunger += 5) {
        for (let energy = 0; energy <= 100; energy += 5) {
          const needs = { hunger, energy };
          const line = idleObjectiveFor(state, needs);
          const where = `${state.completedIds && state.completedIds.length ? 'done' : 'fresh'} / hunger ${hunger} / energy ${energy}`;

          if (line === WAAKYE_LINE) {
            // Under the meal gate owns the meal line — and the FRONT
            // COUNTER really offers the meal at these needs.
            const prompt = actPromptFor(
              { wallet: { balanceGHS: 100 }, needs, job: state },
              WAAKYE_LOCATION_ID
            );
            expect(prompt.enabled, where).toBe(true);
            expect(prompt.label, where).toContain('waakye');
            expect(objectiveMarkerTarget(state, needs), where).toBe(WAAKYE_LOCATION_ID);
          } else if (line === TIRED_LINE) {
            // The compound's bed takes anyone under 90.
            const prompt = actPromptFor(
              { wallet: { balanceGHS: 100 }, needs, job: state },
              SLEEP_LOCATION_ID
            );
            expect(prompt.enabled, where).toBe(true);
            expect(prompt.label, where).toBe('Sleep');
            expect(objectiveMarkerTarget(state, needs), where).toBe(SLEEP_LOCATION_ID);
          } else if (line === WORK_LINE || line === FIND_WORK_LINE) {
            // The JOB SPOT really offers the hire (canWork passes and
            // the starter hustle is off cooldown / unstarted). The
            // marker: the fresh beacon points there; a completed fed-
            // and-rested guest keeps the marker hidden (G-008b's post-
            // payout quiet, pinned in the marker suite) — the copy is
            // the guidance there, not the beacon.
            const prompt = actPromptFor(
              { wallet: { balanceGHS: 100 }, needs, job: state },
              DAAVI_JOB_SPOT_ID
            );
            expect(prompt.enabled, where).toBe(true);
            expect(prompt.label, where).toBe('Help Daavi');
            if (line === FIND_WORK_LINE) {
              expect(objectiveMarkerTarget(state, needs), where).toBe(DAAVI_JOB_SPOT_ID);
            }
          } else {
            throw new Error(`unexpected idle line at ${where}: ${line}`);
          }
        }
      }
    }
  });

  it('the exact boundaries hold: 80/81 hunger and 24/25 energy flip the line', () => {
    expect(idleObjectiveFor(done, { hunger: 80, energy: 80 })).toBe(WAAKYE_LINE);
    expect(idleObjectiveFor(done, { hunger: 81, energy: 80 })).toBe(WORK_LINE);
    expect(idleObjectiveFor(done, { hunger: 85, energy: 24 })).toBe(TIRED_LINE);
    expect(idleObjectiveFor(done, { hunger: 85, energy: 25 })).toBe(WORK_LINE);
    // The old contradicting cell from the review — hunger 89 — now reads
    // the work truth naming the kiosk side, never the meal.
    expect(idleObjectiveFor(done, { hunger: 89, energy: 62 })).toBe(WORK_LINE);
    expect(idleObjectiveFor(done, { hunger: 89, energy: 62 })).not.toContain('waakye');
  });

  it('the fresh boundaries hold: 9/10 hunger flips starving-food vs find-work', () => {
    // Below the work hunger gate the job spot would refuse — the line
    // points at the counter instead.
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 9, energy: 80 })).toBe(WAAKYE_LINE);
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 10, energy: 80 })).toBe(FIND_WORK_LINE);
    // Tired with a workable belly still routes home (sleep costs hunger).
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 30, energy: 24 })).toBe(TIRED_LINE);
    // Tired AND starving: the meal outranks the nap (sleep digs deeper).
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 5, energy: 20 })).toBe(WAAKYE_LINE);
  });
});
