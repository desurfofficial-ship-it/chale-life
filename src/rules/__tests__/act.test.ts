import { describe, expect, it } from 'vitest';
import { findFoodById, FOOD_SACHET_WATER_ID, FOOD_WAAKYE_ID } from '../../data/foods';
import { findJobById } from '../../data/jobs';
import { locations } from '../../data/locations';
import { createStarterWallet, formatGHS } from '../economy';
import { createStarterNeeds } from '../needs';
import { createStarterJobState } from '../jobs';
import {
  actPromptFor,
  AUNTY_BA_HUSTLE_ID,
  resolveAct,
  SLEEP_LOCATION_ID,
  WATER_LOCATION_ID,
  WAAKYE_LOCATION_ID,
  type ActSession,
} from '../act';

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

describe('act: data contract (G-002 item 2)', () => {
  it('every Daavi step happens at LOC-001, a real location, for a ₵15 payout', () => {
    const hustle = findJobById(AUNTY_BA_HUSTLE_ID)!;
    expect(hustle.payGHS).toBe(15);
    expect(hustle.steps.length).toBe(3);
    for (const step of hustle.steps) {
      expect(step.locationId).toBe(WAAKYE_LOCATION_ID);
      expect(locations.some((l) => l.id === WAAKYE_LOCATION_ID)).toBe(true);
    }
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

    // Acts 2 and 3 — carry two stacks of pans.
    const lift1 = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(lift1.toast).toContain('Two more lifts');
    session = lift1.session;
    expect(session.job.step).toBe(1);

    const lift2 = resolveAct(session, WAAKYE_LOCATION_ID);
    expect(lift2.toast).toContain('One more lift');
    session = lift2.session;
    expect(session.job.step).toBe(2);

    // The button reads the step verb while the hustle is active.
    expect(actPromptFor(session, WAAKYE_LOCATION_ID).label).toBe('Carry Pans');

    // Act 4 — final lift: Daavi pays ₵15 and the shift takes its toll.
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
    const prompt = actPromptFor(paidSession(), WAAKYE_LOCATION_ID);
    expect(prompt.label).toBe(`Buy waakye ${formatGHS(12)}`);
    expect(prompt.enabled).toBe(true);

    const result = resolveAct(paidSession(), WAAKYE_LOCATION_ID);
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

  it('closes the loop: after waakye (₵23) the compound sleeps the toll off', () => {
    // ₵20 → work x3 → ₵35 → waakye → ₵23 — hunger clamped at 100, energy 62.
    const fed = resolveAct(paidSession(), WAAKYE_LOCATION_ID);
    expect(fed.session.wallet.balanceGHS).toBe(23);
    expect(fed.session.needs).toEqual({ hunger: 100, energy: 62 });

    // …then the walk home ends at the compound gate: the Act button reads
    // "Sleep", the press is free, and energy clears the 100 cap exactly.
    const prompt = actPromptFor(fed.session, SLEEP_LOCATION_ID);
    expect(prompt.label).toBe('Sleep');
    expect(prompt.enabled).toBe(true);

    const slept = resolveAct(fed.session, SLEEP_LOCATION_ID);
    expect(slept.toast).toBe('Slept at the compound — +55 energy');
    expect(slept.session.needs).toEqual({ hunger: 92, energy: 100 }); // 100−8 / 62+55 capped
    expect(slept.session.wallet.balanceGHS).toBe(23); // sleep is free
    expect(slept.session.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: [AUNTY_BA_HUSTLE_ID],
    });
  });

  it('never lets the wallet go negative across the whole loop', () => {
    let session = starterSession();
    for (let i = 0; i < 6; i++) {
      session = resolveAct(session, WAAKYE_LOCATION_ID).session;
      expect(session.wallet.balanceGHS).toBeGreaterThanOrEqual(0);
    }
    expect(session.wallet.balanceGHS).toBe(23);
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

  it('completed + full belly (hunger 100) offers the hustle again, not waakye', () => {
    const session: ActSession = {
      wallet: { balanceGHS: 35 },
      needs: { hunger: 100, energy: 62 },
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

    for (let i = 0; i < 3; i++) {
      session = resolveAct(session, WAAKYE_LOCATION_ID).session;
    }
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
    ];
    for (const [session, near] of scenarios) {
      const prompt = actPromptFor(session, near);
      const result = resolveAct(session, near);
      expect(result.toast !== null).toBe(prompt.enabled);
      if (!prompt.enabled) expect(result.session).toBe(session);
    }
  });
});
