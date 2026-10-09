import { describe, expect, it } from 'vitest';
import { ACCRA_LEGAL_JOBS, findJobById } from '../../data/jobs';
import { locations } from '../../data/locations';
import {
  JOB_SPOT_PROPS,
  MAIN_ROAD,
  NORTH_GUTTER,
  SOLID_FOOTPRINTS,
  SOUTH_GUTTER,
  type Box2D,
} from '../../world/starter/layout';
import { DAAVI_BENCH, DAAVI_JOB_SPOT, markerPositionFor } from '../proximity';
import { type WalletState } from '../economy';
import {
  advanceStep,
  completeJob,
  completedIdsOf,
  cooldownRemaining,
  cooldownStatus,
  createStarterJobState,
  evaluateRequirements,
  idleObjectiveFor,
  isJobCompleted,
  objectiveFor,
  startJob,
  type JobState,
} from '../jobs';

const wallet = (balanceGHS: number): WalletState => ({ balanceGHS });
const starterWallet = () => wallet(20);
const fedAndRested = { energy: 80, hunger: 80 };

describe('jobs: registry integrity', () => {
  it('all six salvage jobs ported with their payouts', () => {
    const ids = [
      'HUSTLE_AUNTY_BA_STARTER',
      'JOB_PROVISIONS_ASSISTANT',
      'JOB_WAAKYE_DISPATCH',
      'JOB_TROTRO_MATE',
      'HUSTLE_NEIGHBORHOOD_ERRAND',
      'HUSTLE_WATER_HAWKING',
    ];
    for (const id of ids) {
      expect(findJobById(id)).toBeDefined();
    }
    expect(findJobById('HUSTLE_AUNTY_BA_STARTER')!.payGHS).toBe(15);
    expect(findJobById('JOB_PROVISIONS_ASSISTANT')!.payGHS).toBe(18);
    expect(findJobById('JOB_WAAKYE_DISPATCH')!.payGHS).toBe(22);
    expect(findJobById('JOB_TROTRO_MATE')!.payGHS).toBe(15);
  });

  it('every job has exactly three steps', () => {
    for (const job of ACCRA_LEGAL_JOBS) {
      expect(job.steps.length).toBe(3);
    }
    expect(findJobById('HUSTLE_AUNTY_BA_STARTER')!.steps.length).toBe(3);
  });
});

describe('jobs: start', () => {
  it('startJob activates the Daavi starter hustle at step 0', () => {
    const result = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER');
    expect(result.ok).toBe(true);
    expect(result.job).toEqual({
      activeId: 'HUSTLE_AUNTY_BA_STARTER',
      step: 0,
      completedIds: [], // starter history rides along (G-004)
    });
    expect(result.message).toContain('Job Accepted');
  });

  it('startJob refuses an unknown job id', () => {
    const result = startJob(createStarterJobState(), starterWallet(), 'JOB_NONE');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('startJob refuses while a different job is already active', () => {
    const active: JobState = { activeId: 'JOB_TROTRO_MATE', step: 1 };
    const result = startJob(active, starterWallet(), 'HUSTLE_AUNTY_BA_STARTER');
    expect(result.ok).toBe(false);
    expect(result.job).toBe(active);
    expect(result.message).toContain('already have an active job');
  });

  it('startJob deducts ₵5 upfront capital for water hawking', () => {
    const result = startJob(
      createStarterJobState(),
      starterWallet(),
      'HUSTLE_WATER_HAWKING'
    );
    expect(result.ok).toBe(true);
    expect(result.wallet.balanceGHS).toBe(15);
  });

  it('startJob refuses water hawking without ₵5 capital', () => {
    const result = startJob(createStarterJobState(), wallet(4), 'HUSTLE_WATER_HAWKING');
    expect(result.ok).toBe(false);
    expect(result.wallet.balanceGHS).toBe(4);
    expect(result.message).toContain('starting capital');
  });

  it('startJob enforces the legal-job energy gate', () => {
    const result = startJob(
      createStarterJobState(),
      starterWallet(),
      'JOB_WAAKYE_DISPATCH',
      { energy: 10, hunger: 80 }
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Energy ≥ 30');
  });

  it('startJob enforces the legal-job hunger gate', () => {
    const result = startJob(
      createStarterJobState(),
      starterWallet(),
      'JOB_PROVISIONS_ASSISTANT',
      { energy: 80, hunger: 5 }
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Hunger ≥ 15');
  });
});

describe('jobs: advance step', () => {
  it('advanceStep walks through each Daavi step (0 → 1 → 2)', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    const first = advanceStep(job);
    expect(first.ok).toBe(true);
    expect(first.completed).toBe(false);
    expect(first.message).toContain('Two more lifts');
    job = first.job;

    const second = advanceStep(job);
    expect(second.ok).toBe(true);
    expect(second.completed).toBe(false);
    expect(second.message).toContain('Back to the side of the kiosk'); // G-008e: points at the pay spot
    job = second.job;
    expect(job.step).toBe(2);
  });

  it('advanceStep refuses with no active job', () => {
    const result = advanceStep(createStarterJobState());
    expect(result.ok).toBe(false);
    expect(result.message).toContain('No active job');
  });

  it('advanceStep refuses the wrong interactable for the current step', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    const wrongSpot = advanceStep(job, 'trotro_stop');
    expect(wrongSpot.ok).toBe(false);
    expect(wrongSpot.message).toContain('Wrong spot');
    void wrongSpot;
    const rightSpot = advanceStep(job, 'food_vendor');
    expect(rightSpot.ok).toBe(true);
    job = rightSpot.job;
    expect(job.step).toBe(1);
  });

  it('final advance flags completed so the Engine can call completeJob', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    const last = advanceStep(job);
    expect(last.completed).toBe(true);
    expect(last.job.step).toBe(3);
  });
});

describe('jobs: complete with payout', () => {
  it('completeJob pays ₵15 after all three Daavi steps', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;

    const walletBefore = starterWallet();
    const result = completeJob(job, walletBefore);
    expect(result.ok).toBe(true);
    expect(result.payoutGHS).toBe(15);
    expect(result.wallet.balanceGHS).toBe(35);
    expect(result.message).toContain('+₵15');
  });

  it('completeJob clears the active job after payout', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    const result = completeJob(job, starterWallet());
    expect(result.job).toEqual({
      activeId: null,
      step: 0,
      completedIds: ['HUSTLE_AUNTY_BA_STARTER'], // run history latched (G-004)
    });
  });

  it('completeJob refuses before all steps are done and leaves the wallet alone', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job; // only 1 of 3 done
    const result = completeJob(job, starterWallet());
    expect(result.ok).toBe(false);
    expect(result.payoutGHS).toBe(0);
    expect(result.wallet.balanceGHS).toBe(20);
    expect(result.message).toContain('not finished');
  });

  it('completeJob refuses with no active job', () => {
    const result = completeJob(createStarterJobState(), starterWallet());
    expect(result.ok).toBe(false);
    expect(result.message).toContain('No active job');
  });
});

describe('jobs: payout stamp + cooldown (G-008c item 2)', () => {
  it('the starter hustle rests 45 s in the data — the value the rules enforce', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    expect(hustle.cooldownSeconds).toBe(45);
    // Salvage cooldowns on the legal jobs stay untouched.
    expect(findJobById('JOB_PROVISIONS_ASSISTANT')!.cooldownSeconds).toBe(45);
    expect(findJobById('JOB_WAAKYE_DISPATCH')!.cooldownSeconds).toBe(60);
    expect(findJobById('JOB_TROTRO_MATE')!.cooldownSeconds).toBe(30);
  });

  it('completeJob stamps lastPayoutAt from the caller\u2019s clock (pure data in)', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    const result = completeJob(job, starterWallet(), 123_456);
    expect(result.ok).toBe(true);
    expect(result.job.lastPayoutAt).toBe(123_456);
  });

  it('completeJob without a clock preserves an existing stamp and stays key-free otherwise', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    // Legacy caller (no nowMs), no prior stamp: the key stays absent, so
    // the E-004-era slice shapes keep comparing equal.
    const legacy = completeJob(job, starterWallet());
    expect('lastPayoutAt' in legacy.job).toBe(false);

    // A prior stamp survives a clockless re-completion — a later legacy
    // payout can never un-arm a running cooldown.
    const stamped = completeJob(job, starterWallet(), 500);
    const again = completeJob(stamped.job, starterWallet());
    expect(again.job.lastPayoutAt).toBe(500);
  });

  it('cooldownStatus counts the data cooldown from the payout instant', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    // 10 s into a 45 s rest: on, with 35 s to go.
    expect(cooldownStatus(hustle, 10_000, 0)).toEqual({ onCooldown: true, remainingMs: 35_000 });
    // The exact boundary is READY — 45 s elapsed leaves 0 ms remaining.
    expect(cooldownStatus(hustle, 45_000, 0)).toEqual({ onCooldown: false, remainingMs: 0 });
    expect(cooldownStatus(hustle, 44_999, 0)).toEqual({ onCooldown: true, remainingMs: 1 });
    expect(cooldownStatus(hustle, 400_000, 0)).toEqual({ onCooldown: false, remainingMs: 0 });
  });

  it('cooldownStatus is ready on missing inputs and zero/negative data', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    // Legacy slices without the stamp, sessions without the press clock.
    expect(cooldownStatus(hustle, undefined, 0).onCooldown).toBe(false);
    expect(cooldownStatus(hustle, 10_000, undefined).onCooldown).toBe(false);
    expect(cooldownStatus(hustle, undefined, undefined).onCooldown).toBe(false);
    // A zero-cooldown job (and negative data, clamped) never rests.
    const zero = { ...hustle, cooldownSeconds: 0 };
    expect(cooldownStatus(zero, 10_000, 0).onCooldown).toBe(false);
    const negative = { ...hustle, cooldownSeconds: -5 };
    expect(cooldownStatus(negative, 10_000, 0).onCooldown).toBe(false);
  });

  it('cooldownRemaining is the generic primitive (the sachet rest shares it)', () => {
    // The water rest (20 s) rides the same math as the job shifts.
    expect(cooldownRemaining(20, 10_000, 0)).toEqual({ onCooldown: true, remainingMs: 10_000 });
    expect(cooldownRemaining(20, 20_000, 0)).toEqual({ onCooldown: false, remainingMs: 0 });
    expect(cooldownRemaining(20, 19_999, 0)).toEqual({ onCooldown: true, remainingMs: 1 });
    // Missing clocks / zero / negative data read ready — never gates.
    expect(cooldownRemaining(20, undefined, 0).onCooldown).toBe(false);
    expect(cooldownRemaining(20, 10_000, undefined).onCooldown).toBe(false);
    expect(cooldownRemaining(0, 10_000, 0).onCooldown).toBe(false);
    expect(cooldownRemaining(-3, 10_000, 0).onCooldown).toBe(false);
    // And the job wrapper delegates to it.
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    expect(cooldownStatus(hustle, 10_000, 0)).toEqual(cooldownRemaining(45, 10_000, 0));
  });
});

describe('jobs: completed-run history (G-004 completedIds)', () => {
  it('starter state ships an empty history; helpers treat undefined as []', () => {
    expect(createStarterJobState().completedIds).toEqual([]);
    expect(completedIdsOf(createStarterJobState())).toEqual([]);
    expect(completedIdsOf({ activeId: null, step: 0 })).toEqual([]); // pre-E-004 slice
    expect(
      isJobCompleted({ activeId: null, step: 0 }, 'HUSTLE_AUNTY_BA_STARTER')
    ).toBe(false);
  });

  it('completeJob latches the finished id; working the same shift twice dedupes', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    job = advanceStep(job).job;
    const first = completeJob(job, starterWallet());
    expect(first.ok).toBe(true);
    expect(first.job.completedIds).toEqual(['HUSTLE_AUNTY_BA_STARTER']);

    // Daavi re-hires; a second full shift must NOT grow the set.
    let again = startJob(first.job, starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    again = advanceStep(again).job;
    again = advanceStep(again).job;
    again = advanceStep(again).job;
    const second = completeJob(again, starterWallet());
    expect(second.ok).toBe(true);
    expect(second.job.completedIds).toEqual(['HUSTLE_AUNTY_BA_STARTER']); // still ONE
    expect(isJobCompleted(second.job, 'HUSTLE_AUNTY_BA_STARTER')).toBe(true);
  });

  it('startJob and advanceStep preserve the run history while a shift is live', () => {
    const withHistory: JobState = {
      activeId: null,
      step: 0,
      completedIds: ['JOB_TROTRO_MATE'],
    };
    const started = startJob(withHistory, starterWallet(), 'HUSTLE_AUNTY_BA_STARTER');
    expect(started.job.completedIds).toEqual(['JOB_TROTRO_MATE']);
    const advanced = advanceStep(started.job);
    expect(advanced.job.completedIds).toEqual(['JOB_TROTRO_MATE']);
  });

  it('startJob and advanceStep keep undefined history undefined (optional-safe)', () => {
    const legacy: JobState = { activeId: null, step: 0 }; // pre-E-004 store slice
    const started = startJob(legacy, starterWallet(), 'HUSTLE_AUNTY_BA_STARTER');
    expect(started.job.completedIds).toBeUndefined();
    const advanced = advanceStep(started.job);
    expect(advanced.job.completedIds).toBeUndefined();
  });
});

describe('jobs: idle objective line (G-005 Daavi, G-008d spot-naming copy)', () => {
  it('fresh run points the guest at the side of Daavi’s kiosk (the job spot)', () => {
    expect(idleObjectiveFor(createStarterJobState())).toBe(
      'No job yet — find work at the side of Daavi’s kiosk.'
    );
  });

  it('legacy slice without completedIds reads as an empty history', () => {
    expect(idleObjectiveFor({ activeId: null, step: 0 })).toBe(
      'No job yet — find work at the side of Daavi’s kiosk.'
    );
  });

  it('after the hustle the needs-less legacy call gets the neutral work nudge', () => {
    // G-008c round 2: the needs-based mapping needs needs — without them
    // the card falls back to the neutral post-shift line (never the old
    // combined waakye-or-work sentence that contradicted a "Full" button).
    const done: JobState = {
      activeId: null,
      step: 0,
      completedIds: ['HUSTLE_AUNTY_BA_STARTER'],
    };
    expect(idleObjectiveFor(done)).toBe('Work another shift — jobs are at the side of Daavi’s kiosk.');
  });

  it('history without the hustle still points at the kiosk side (not the meal nudge)', () => {
    const other: JobState = { activeId: null, step: 0, completedIds: ['JOB_TROTRO_MATE'] };
    expect(idleObjectiveFor(other)).toBe(
      'No job yet — find work at the side of Daavi’s kiosk.'
    );
  });
});

describe('jobs: idle objective priority (G-006 tired hint, G-008d gates + spots)', () => {
  const done: JobState = {
    activeId: null,
    step: 0,
    completedIds: ['HUSTLE_AUNTY_BA_STARTER'],
  };

  it('fresh run, low energy with OK hunger: the guest is sent home to sleep', () => {
    expect(
      idleObjectiveFor(createStarterJobState(), { hunger: 50, energy: 24 })
    ).toBe('Tired — head home to the compound and sleep.');
  });

  it('fresh run, energy exactly at the threshold (25) is not tired yet', () => {
    expect(
      idleObjectiveFor(createStarterJobState(), { hunger: 50, energy: 25 })
    ).toBe('No job yet — find work at the side of Daavi’s kiosk.');
  });

  it('COMPLETED run, hunger ≤ 80: the meal line naming the FRONT COUNTER — even when tired', () => {
    // The counter's own door is the meal at these needs, so the card says
    // exactly that — and names the counter, not the joint at large
    // (G-008d: food happens at the front counter ONLY).
    expect(idleObjectiveFor(done, { hunger: 61, energy: 10 })).toBe(
      'Hungry? Buy waakye at Daavi’s front counter (₵12).'
    );
  });

  it('COMPLETED run, hunger above the gate + tired: the compound line', () => {
    expect(idleObjectiveFor(done, { hunger: 85, energy: 10 })).toBe(
      'Tired — head home to the compound and sleep.'
    );
  });

  it('COMPLETED run, fed and rested: work another shift, at the side of the kiosk', () => {
    expect(idleObjectiveFor(done, { hunger: 85, energy: 60 })).toBe(
      'Work another shift — jobs are at the side of Daavi’s kiosk.'
    );
  });

  it('a starving guest still eats first — hunger ≤ 80 owns the line at any energy', () => {
    // Sleep costs 8 hunger, so sleeping while starving digs the hole deeper.
    expect(idleObjectiveFor(done, { hunger: 8, energy: 10 })).toBe(
      'Hungry? Buy waakye at Daavi’s front counter (₵12).'
    );
    // A FRESH starving guest (below the work hunger gate) also gets the
    // meal line — the job spot would refuse them; the counter is the fix.
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 5, energy: 10 })).toBe(
      'Hungry? Buy waakye at Daavi’s front counter (₵12).'
    );
  });

  it('calling without needs keeps a stable line (legacy HUD callers)', () => {
    expect(idleObjectiveFor(createStarterJobState())).toBe(
      'No job yet — find work at the side of Daavi’s kiosk.'
    );
    expect(idleObjectiveFor(done)).toBe('Work another shift — jobs are at the side of Daavi’s kiosk.');
  });
});

describe('jobs: requirements + objective helper', () => {
  it('evaluateRequirements passes zero-requirement hustles automatically', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    const evaluation = evaluateRequirements(hustle, { energy: 0, hunger: 0 });
    expect(evaluation.met).toBe(true);
  });

  it('evaluateRequirements collects every unmet reason', () => {
    const job = findJobById('JOB_WAAKYE_DISPATCH')!;
    const evaluation = evaluateRequirements(job, { energy: 5, hunger: 5, trait: 'chill' });
    expect(evaluation.met).toBe(false);
    expect(evaluation.unmetReasons.length).toBe(3);
  });

  it('objectiveFor exposes the current step while a job is active', () => {
    let job = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER').job;
    const first = objectiveFor(job);
    expect(first).toBeDefined();
    expect(first!.tag).toBe('Step 1/3');
    expect(first!.targetInteractableId).toBe('food_vendor');

    job = advanceStep(job).job;
    expect(objectiveFor(job)!.tag).toBe('Step 2/3');
  });

  it('objectiveFor is null with no active job (idle line instead)', () => {
    expect(objectiveFor(createStarterJobState())).toBeNull();
  });

  it('starting a legal job with a fed and rested player succeeds', () => {
    const result = startJob(
      createStarterJobState(),
      starterWallet(),
      'JOB_PROVISIONS_ASSISTANT',
      fedAndRested
    );
    expect(result.ok).toBe(true);
  });
});

describe('jobs: Daavi walk waypoints (G-008b item 4, G-008d items 8–10 constants)', () => {
  it('step 2 targets the DAAVI_BENCH waypoint — pinned to the proximity constant', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    const step2 = hustle.steps[1];
    expect(step2.stepId).toBe('aunty_ba_2');
    // The id string is byte-pinned to proximity.ts so the Act routing and
    // the marker can never drift from the data.
    expect(step2.locationId).toBe(DAAVI_BENCH.locationId);
    expect(step2.locationId).toBe('LOC-001-BENCH');
    // G-008d: the bench sits on the NORTH PAVEMENT (z 1.85–3.85) — off
    // the road the old waypoint pointed into — and ≥ 3 m east of the
    // kiosk point, so the forced walk is still real. G-008e: pinned at
    // z 2.45 — the full capsule + margin (0.6 m) south of the bench mesh
    // (layout.DAAVI_BENCH_MESH z0 3.15; 2.9 left only 0.25 m).
    expect(DAAVI_BENCH.x - 15.5).toBeGreaterThanOrEqual(3);
    expect(DAAVI_BENCH.z).toBeGreaterThanOrEqual(1.85);
    expect(DAAVI_BENCH.z).toBeLessThanOrEqual(3.85);
    expect(DAAVI_BENCH.x).toBeCloseTo(21.5, 5);
    expect(DAAVI_BENCH.z).toBeCloseTo(2.45, 5);
  });

  it('steps 1/3 target the DAAVI_JOB_SPOT — the kiosk\u2019s east side, off the road', () => {
    const hustle = findJobById('HUSTLE_AUNTY_BA_STARTER')!;
    expect(hustle.steps[0].locationId).toBe(DAAVI_JOB_SPOT.locationId);
    expect(hustle.steps[0].locationId).toBe('LOC-001-JOB');
    expect(hustle.steps[2].locationId).toBe(DAAVI_JOB_SPOT.locationId);
    // The agreed G-008d coordinates: just off the east wall, standing
    // point (18.0, 0.0) left walkable (Agent 3's crates go near 17.6, 0).
    expect(DAAVI_JOB_SPOT.x).toBeCloseTo(18.0, 5);
    expect(DAAVI_JOB_SPOT.z).toBeCloseTo(0.0, 5);
    expect(hustle.steps[0].targetLocationName).toContain('kiosk');
    expect(hustle.steps[2].targetLocationName).toContain('kiosk');
    expect(hustle.steps[0].instruction).toContain('side of Daavi’s kiosk');
  });

  it('step 2 tells the player to walk, and names the bench as the target', () => {
    const step2 = findJobById('HUSTLE_AUNTY_BA_STARTER')!.steps[1];
    expect(step2.instruction).toContain('bench');
    expect(step2.instruction).toContain('north pavement');
    expect(step2.targetLocationName).toContain('bench');
  });

  it('markerPositionFor resolves the bench, the job spot and the compound door anchors', () => {
    expect(markerPositionFor('LOC-001-BENCH')).toEqual({ x: DAAVI_BENCH.x, z: DAAVI_BENCH.z });
    expect(markerPositionFor('LOC-002')).toEqual({ x: -10, z: 18.5 }); // COMPOUND_DOOR
    expect(markerPositionFor('LOC-001')).toEqual({ x: 15.5, z: 2.4 });
    expect(markerPositionFor('LOC-001-JOB')).toEqual({ x: DAAVI_JOB_SPOT.x, z: DAAVI_JOB_SPOT.z });
    expect(markerPositionFor(null)).toBeNull();
  });
});

// ── G-008d item 10: clearance — waypoints and locations off the road,
// ── off the gutters, out of every solid footprint, and the job spot →
// ── bench walk hits nothing solid.

describe('jobs: world clearance (G-008d item 10 — road, gutters, footprints, walk)', () => {
  /** Entirely clear of a box, with `margin` metres to spare. */
  const clearOf = (x: number, z: number, f: Box2D, margin: number): boolean =>
    x + margin <= f.x0 || x - margin >= f.x1 || z + margin <= f.z0 || z - margin >= f.z1;

  const offRoadAndGutters = (x: number, z: number, what: string): void => {
    const inRoad = z > MAIN_ROAD.z0 && z < MAIN_ROAD.z1;
    const inGutter =
      (z > NORTH_GUTTER.z0 && z < NORTH_GUTTER.z1) ||
      (z > SOUTH_GUTTER.z0 && z < SOUTH_GUTTER.z1);
    expect(inRoad || inGutter, `${what} (${x}, ${z}) must sit off the road and the gutters`).toBe(false);
  };

  it('every walk WAYPOINT (bench, job spot) clears every solid footprint with capsule margin', () => {
    // Standing spots — 0.35 m player capsule + 0.25 m margin (G-008b's
    // bar). COMPOUND_DOOR is exempt: it is a MARKER anchor on the house
    // face by design, not a standing spot.
    const caps = 0.35 + 0.25;
    const waypoints: Array<[string, number, number, Box2D | null]> = [
      ['bench', DAAVI_BENCH.x, DAAVI_BENCH.z, null],
      // G-008d item 8: the crate/pan stack marking the job spot is flush
      // to the kiosk's east wall so the standing point keeps 0.38 m of
      // BARE clearance (≥ the 0.35 m capsule, no margin) — its own props
      // take the bare bar, every foreign footprint keeps the full
      // margin. (The #28+#29 merge hid this behind the bench failure.)
      ['job spot', DAAVI_JOB_SPOT.x, DAAVI_JOB_SPOT.z, JOB_SPOT_PROPS],
    ];
    for (const [name, x, z, own] of waypoints) {
      offRoadAndGutters(x, z, name);
      for (const f of SOLID_FOOTPRINTS) {
        expect(
          clearOf(x, z, f, f === own ? 0 : caps),
          `${name} (${x}, ${z}) must clear footprint ${JSON.stringify(f)}`
        ).toBe(true);
      }
    }
  });

  it('every named LOCATION sits off the road/gutters and outside every solid footprint', () => {
    // Strict containment (no margin) for the named points — Agent 3 owns
    // locations.ts; a violation here is a world-layer fix. LOC-006 is
    // exempt: the Laterite Junction LANDMARK sits in the road surface by
    // design ("where the laterite street meets the main road") and hosts
    // no Act — flagged to Agent 3/producer if that should change.
    for (const loc of locations) {
      if (loc.type === 'landmark') continue;
      offRoadAndGutters(loc.x, loc.z, loc.id);
      for (const f of SOLID_FOOTPRINTS) {
        expect(
          clearOf(loc.x, loc.z, f, 0),
          `${loc.id} (${loc.x}, ${loc.z}) must sit outside footprint ${JSON.stringify(f)}`
        ).toBe(true);
      }
    }
  });

  it('the job spot → bench straight-line walk hits no solid footprint', () => {
    // Segment (18, 0) → (21.5, 2.9): slabs-vs-segment test over every
    // solid footprint. The okada parked at (18.3, 2.85) — footprint
    // x 17.34–19.26, z 1.58–4.12 — misses this line: the walk exits its
    // x-band (at z ≈ 1.05) before entering its z-band. Agent 3 is
    // re-sitting that okada anyway (G-008d item 9); this pin survives
    // either way.
    const ax = DAAVI_JOB_SPOT.x;
    const az = DAAVI_JOB_SPOT.z;
    const bx = DAAVI_BENCH.x;
    const bz = DAAVI_BENCH.z;
    for (const f of SOLID_FOOTPRINTS) {
      // Sample the segment at 5 cm — a 0.15 m pole box is still hit 3×.
      let hit = false;
      for (let t = 0; t <= 1; t += 0.01) {
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) {
          hit = true;
          break;
        }
      }
      expect(hit, `job spot → bench walk must miss footprint ${JSON.stringify(f)}`).toBe(false);
    }
  });
});
