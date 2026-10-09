import { describe, expect, it } from 'vitest';
import { findFoodById, FOOD_SACHET_WATER_ID, FOOD_WAAKYE_ID } from '../../data/foods';
import { findJobById } from '../../data/jobs';
import { locations } from '../../data/locations';
import { createStarterWallet, formatGHS } from '../economy';
import { createStarterNeeds, drainNeeds } from '../needs';
import { createStarterJobState } from '../jobs';
import {
  actPromptFor,
  AUNTY_BA_HUSTLE_ID,
  objectiveMarkerTarget,
  resolveAct,
  SLEEP_LOCATION_ID,
  WATER_LOCATION_ID,
  WAAKYE_LOCATION_ID,
  type ActSession,
} from '../act';
import { DAAVI_BENCH, markerPositionFor } from '../proximity';

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

describe('act: data contract (G-002 item 2, G-008b bench walk)', () => {
  it('Daavi steps 1/3 happen at the kiosk, step 2 at the bench, for a ₵15 payout', () => {
    const hustle = findJobById(AUNTY_BA_HUSTLE_ID)!;
    expect(hustle.payGHS).toBe(15);
    expect(hustle.steps.length).toBe(3);
    expect(hustle.steps[0].locationId).toBe(WAAKYE_LOCATION_ID);
    // G-008b: the second lift happens at Daavi's bench — a real waypoint
    // (proximity.ts) a short walk east of the kiosk.
    expect(hustle.steps[1].locationId).toBe('LOC-001-BENCH');
    expect(hustle.steps[1].targetLocationName).toContain('bench');
    expect(hustle.steps[2].locationId).toBe(WAAKYE_LOCATION_ID);
    expect(locations.some((l) => l.id === WAAKYE_LOCATION_ID)).toBe(true);
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
  it('starts fresh: "Help Daavi" offered at the waakye joint', () => {
    const prompt = actPromptFor(starterSession(), WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);
  });

  it('three Acts after accepting pay ₵35 with the work toll applied', () => {
    let session = starterSession();

    // Act 1 — accept the hustle.
    const started = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(started.toast).toContain('Job accepted');
    session = started.session;
    expect(session.job).toEqual({
      activeId: AUNTY_BA_HUSTLE_ID,
      step: 0,
      completedIds: [], // run history rides along through the shift
    });
    expect(session.wallet.balanceGHS).toBe(20);

    // Acts 2 and 3 — carry two stacks of pans. G-008b: step 2 happens at
    // Daavi's bench (≥ 3 m east of the kiosk) — the shift forces the walk.
    const lift1 = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(lift1.toast).toContain('Two more lifts');
    session = lift1.session;
    expect(session.job.step).toBe(1);

    // Tapping at the kiosk for the bench step refuses — with the hint.
    const wrongSpot = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(wrongSpot.enabled).toBe(false);
    expect(wrongSpot.reason).toContain('Wrong spot');
    expect(wrongSpot.reason).toContain('bench');
    expect(resolveAct(session, WAAKYE_LOCATION_ID).session).toBe(session);

    const lift2 = resolveAct(session, 'LOC-001-BENCH'); // walked to the bench
    expect(lift2.toast).toContain('One more lift');
    session = lift2.session;
    expect(session.job.step).toBe(2);

    // The button still reads the step verb wherever the hustle stands.
    expect(actPromptFor(session, WAAKYE_LOCATION_ID).label).toBe('Carry Pans');

    // Act 4 — final lift back at the kiosk: Daavi pays ₵15 and the shift
    // takes its toll.
    const final = resolveAct(session, WAAKYE_LOCATION_ID);
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

  it('after the payout, the joint sells waakye: −₵12, hunger up 45 (clamped)', () => {
    // G-008b: waakye needs round(hunger) ≤ WAAKYE_MAX_HUNGER — a paid
    // guest right after the shift (hunger 64) reads "Full"; two yard
    // sleeps later (64 → 48) the meal is legitimately on the menu.
    const hungryPaid: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 50, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(hungryPaid, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(hungryPaid, WAAKYE_LOCATION_ID);
    expect(result.toast).toContain('Waakye');
    expect(result.session.wallet.balanceGHS).toBe(23);
    expect(result.session.needs.hunger).toBe(95); // 50 + 45
    expect(result.session.needs.energy).toBe(62); // applyMeal touches hunger only
    expect(result.session.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [AUNTY_BA_HUSTLE_ID],
    });
  });

  it('closes the loop: ₵20 → work ×3 (bench walk) → sleep → drift → waakye ₵23 → sleep', () => {
    let session = starterSession();
    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // accept
    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2 (bench)
    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // step 3 + payout
    expect(session.wallet.balanceGHS).toBe(35);
    expect(session.needs).toEqual({ hunger: 64, energy: 62 });

    // One yard sleep maxes energy (62 + 55 → capped 100), so the bed now
    // refuses (≥ 90 gate) and the joint reads "Full" — the meal needs
    // round(hunger) ≤ 55 and the street is the only clock that gets there.
    session = resolveAct(session, SLEEP_LOCATION_ID).session; // hunger 56, energy 100
    expect(actPromptFor(session, WAAKYE_LOCATION_ID).label).toBe('Full');
    expect(actPromptFor(session, SLEEP_LOCATION_ID).enabled).toBe(false); // Not tired yet

    // ~5.7 min of starter-profile drift (legal 2 s ticks): hunger 56 → 39
    // (under the Full gate), energy 100 → ~88.7 (under the sleep gate).
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
    let session = starterSession();
    const walk = [
      WAAKYE_LOCATION_ID, // accept
      WAAKYE_LOCATION_ID, // step 1
      'LOC-001-BENCH', // step 2 (bench)
      WAAKYE_LOCATION_ID, // step 3 + payout → ₵35
      SLEEP_LOCATION_ID, // free sleep
      WAAKYE_LOCATION_ID, // Full — disabled no-op, wallet pinned
      WATER_LOCATION_ID, // water ₵1
    ];
    for (const near of walk) {
      session = resolveAct(session, near).session;
      expect(session.wallet.balanceGHS).toBeGreaterThanOrEqual(0);
    }
    expect(session.wallet.balanceGHS).toBe(34); // 35 − ₵1 water; Full never spent
  });
});

describe('act: earn-first at Daavi\u2019s (G-004)', () => {
  it('spawn-drained hunger (60) still gets the hustle FIRST — no hunger proxy', () => {
    // A few spawn minutes of starter drain: hunger 72 -> 60. The old
    // HUNGER_TOPUP_BELOW proxy flipped the joint to waakye here, so a live
    // player could never see ₵35. With the completedIds flag it must not.
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 60, energy: 76 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(result.session.wallet.balanceGHS).toBe(20); // nothing spent
  });

  it('undefined completedIds (pre-E-004 store slice) reads as [] — hustle first', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 60, energy: 76 },
      job: { activeId: null, step: 0 }, // no completedIds key at all
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);
  });

  it('starving at ₵20 before any hustle gets waakye — the anti-soft-lock', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 20 },
      needs: { hunger: 5, energy: 80 }, // energy clears canWork, hunger does not
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.toast).toContain('Waakye');
    expect(result.session.wallet.balanceGHS).toBe(8);
    expect(result.session.needs.hunger).toBe(50); // 5 + 45

    // Fed, the hustle is offered again — the escape actually unblocks work.
    const next = actPromptFor(result.session, WAAKYE_LOCATION_ID);
    expect(next.label).toBe('Help Daavi');
    expect(next.enabled).toBe(true);
  });

  it('starving and broke still refuses the hustle with the reason (no free meal)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 5, energy: 80 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
  });

  it('completed + full belly reads "Full" and refuses the meal (G-008b)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 100, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Full');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('full');

    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.session).toBe(session); // no-op
    expect(result.toast).toBeNull();
  });

  it('broke and full? The zero-capital hustle is still the fallback', () => {
    // The Full gate only replaces the MEAL offer — a broke guest gets
    // re-hired so income can never wall itself off behind a meal.
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 92, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
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
    expect(actPromptFor(session, WAAKYE_LOCATION_ID).label).toBe('Help Daavi');

    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // re-accept
    expect(session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(session.job.completedIds).toEqual([AUNTY_BA_HUSTLE_ID]); // preserved

    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // step 1
    session = resolveAct(session, 'LOC-001-BENCH').session; // step 2 (bench)
    session = resolveAct(session, WAAKYE_LOCATION_ID).session; // step 3 + payout
    expect(session.wallet.balanceGHS).toBe(20); // 5 + ₵15, zero-capital loop
    expect(session.job.activeId).toBeNull();
    expect(session.job.completedIds).toEqual([AUNTY_BA_HUSTLE_ID]); // still ONE
  });
});

describe('act: water at the provisions store (LOC-003)', () => {
  it('sells sachet water for ₵1 with drinkWater effects', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 40, energy: 30 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WATER_LOCATION_ID);
    expect(prompt.label).toBe('Buy water ₵1');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, WATER_LOCATION_ID);
    expect(result.toast).toContain('+10 energy');
    expect(result.session.wallet.balanceGHS).toBe(4);
    expect(result.session.needs).toEqual({ hunger: 46, energy: 40 });
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

describe('act: disabled cases', () => {
  it('refuses to work the hustle while too tired', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 80, energy: 5 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0 },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too tired');

    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.session).toBe(session);
    expect(result.toast).toBeNull();
  });

  it('refuses to work the hustle while too hungry', () => {
    const session: ActSession = {
      wallet: createStarterWallet(),
      needs: { hunger: 5, energy: 80 },
      job: { activeId: AUNTY_BA_HUSTLE_ID, step: 0 },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
  });

  it('refuses to start while too tired, even with cash', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 80, energy: 5 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too tired');
  });

  it('hungry and broke cannot start either — with the reason why', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 5, energy: 80 },
      job: createStarterJobState(),
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Too hungry');
  });

  it('broke after the hustle? Daavi still offers the hustle (work-when-broke)', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 5 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Help Daavi');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(result.session.job.activeId).toBe(AUNTY_BA_HUSTLE_ID);
    expect(result.session.wallet.balanceGHS).toBe(5); // zero-capital hustle
  });

  it('another shift in progress blocks the waakye-joint act', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 64, energy: 62 },
      job: { activeId: 'JOB_TROTRO_MATE', step: 0 },
    };
    const prompt = actPromptFor(session, WAAKYE_LOCATION_ID);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Finish your current shift');
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
      [starterSession(), WAAKYE_LOCATION_ID],
      [paidSession(), WAAKYE_LOCATION_ID],
      [paidSession(), null],
      [paidSession(), 'LOC-004'],
      [
        // G-004 anti-soft-lock: starving with cash before any hustle.
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
        WAAKYE_LOCATION_ID,
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
          position: { x: 15.5, z: 2.4 }, // the kiosk itself
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
          position: { x: 15.5, z: 2.4 }, // still at the kiosk: wrong spot
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

describe('act: waakye Full gate boundary (G-008b item 2)', () => {
  const completed = (): ActSession => ({
    wallet: { balanceGHS: 35 },
    needs: { hunger: 50, energy: 62 },
    job: { activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] },
  });

  it('round(hunger) 55.4 → 55: waakye still offered', () => {
    const s = { ...completed(), needs: { hunger: 55.4, energy: 62 } };
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).label).toBe(`Buy waakye ${formatGHS(12)}`);
  });

  it('round(hunger) 55.6 → 56: "Full", disabled, resolve is a no-op', () => {
    const s: ActSession = { ...completed(), needs: { hunger: 55.6, energy: 62 } };
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe('Full');
    expect(prompt.enabled).toBe(false);
    const result = resolveAct(s, WAAKYE_LOCATION_ID);
    expect(result.session).toBe(s);
    expect(result.toast).toBeNull();
  });

  it('hunger 92 (the iPhone report) is "Full" — never a waakye offer', () => {
    const s: ActSession = { ...completed(), needs: { hunger: 92, energy: 62 } };
    const prompt = actPromptFor(s, WAAKYE_LOCATION_ID);
    expect(prompt.label).not.toContain('waakye');
    expect(prompt.label).toBe('Full');
    expect(prompt.enabled).toBe(false);
  });

  it('the sleep door narrows: 92 → sleep → 84 — still "Full" per spec', () => {
    // One sleep from energy 62 caps energy at 100, so the second sleep is
    // gated ("Not tired yet") — the meal waits for the street's drain.
    let s: ActSession = { ...completed(), needs: { hunger: 92, energy: 62 } };
    s = resolveAct(s, SLEEP_LOCATION_ID).session;
    expect(s.needs.hunger).toBe(84);
    expect(actPromptFor(s, WAAKYE_LOCATION_ID).label).toBe('Full');
  });
});

describe('act: Daavi bench walk (G-008b item 4)', () => {
  const atStep = (step: number, position?: { x: number; z: number }): ActSession => ({
    wallet: { balanceGHS: 20 },
    needs: { hunger: 72, energy: 80 },
    job: { activeId: AUNTY_BA_HUSTLE_ID, step, completedIds: [] },
    ...(position ? { position } : {}),
  });

  it('step 2 refuses at the kiosk with the walk hint (position path)', () => {
    const prompt = actPromptFor(atStep(1, KIOSK), null);
    expect(prompt.label).toBe('Carry Pans');
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Wrong spot');
    expect(prompt.reason).toContain('bench');

    const result = resolveAct(atStep(1, KIOSK), null);
    expect(result.session.job.step).toBe(1); // untouched
    expect(result.toast).toBeNull();
  });

  it('step 2 advances at the bench — zone-derived from the position', () => {
    const prompt = actPromptFor(atStep(1, BENCH), null);
    expect(prompt.label).toBe('Carry Pans');
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(atStep(1, BENCH), null);
    expect(result.toast).toContain('One more lift');
    expect(result.session.job.step).toBe(2);
  });

  it('steps 1/3 refuse AT the bench (the walk cuts both ways)', () => {
    const prompt = actPromptFor(atStep(0, BENCH), null);
    expect(prompt.enabled).toBe(false);
    expect(prompt.reason).toContain('Wrong spot');
    expect(prompt.reason).toContain('Waakye Joint');
  });

  it('a nap at the yard mid-shift still works, and the bench is not the yard', () => {
    // Sanity: the zone priority — bench (x 18.6) is never the yard, the
    // yard (x ≤ −4) is never the bench.
    expect(actPromptFor(atStep(1, { x: -10, z: 20 }), null).label).toBe('Sleep');
  });
});

describe('act: objective marker target (G-008b item 7)', () => {
  it('active job → the current step location (bench included)', () => {
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 0, completedIds: [] }, { hunger: 72, energy: 80 })).toBe(WAAKYE_LOCATION_ID);
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 1, completedIds: [] }, { hunger: 72, energy: 80 })).toBe('LOC-001-BENCH');
    expect(objectiveMarkerTarget({ activeId: AUNTY_BA_HUSTLE_ID, step: 2, completedIds: [] }, { hunger: 72, energy: 80 })).toBe(WAAKYE_LOCATION_ID);
  });

  it('energy < 25 with no job → LOC-002 (markerPositionFor anchors COMPOUND_DOOR)', () => {
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 24 })).toBe(SLEEP_LOCATION_ID);
    expect(markerPositionFor(SLEEP_LOCATION_ID)).toEqual({ x: -10, z: 18.5 }); // the door
    // The threshold is the shared LOW threshold: exactly 25 is not tired.
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 25 })).toBe(WAAKYE_LOCATION_ID);
  });

  it('fresh fed run → the joint; completed run → hidden', () => {
    expect(objectiveMarkerTarget(createStarterJobState(), { hunger: 72, energy: 80 })).toBe(WAAKYE_LOCATION_ID);
    expect(
      objectiveMarkerTarget({ activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] }, { hunger: 72, energy: 80 })
    ).toBeNull();
    // …but a completed guest who is tired still gets walked home.
    expect(
      objectiveMarkerTarget({ activeId: null, step: 0, completedIds: [AUNTY_BA_HUSTLE_ID] }, { hunger: 72, energy: 10 })
    ).toBe(SLEEP_LOCATION_ID);
  });
});
