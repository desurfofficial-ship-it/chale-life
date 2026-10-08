import { describe, expect, it } from 'vitest';
import { ACCRA_LEGAL_JOBS, findJobById } from '../../data/jobs';
import { type WalletState } from '../economy';
import {
  advanceStep,
  completeJob,
  completedIdsOf,
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
    expect(second.message).toContain('One more lift');
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

describe('jobs: idle objective line (G-005 Daavi)', () => {
  it('fresh run points the guest at Daavi’s waakye joint', () => {
    expect(idleObjectiveFor(createStarterJobState())).toBe(
      'No job yet — find work at Daavi’s waakye joint.'
    );
  });

  it('legacy slice without completedIds reads as an empty history', () => {
    expect(idleObjectiveFor({ activeId: null, step: 0 })).toBe(
      'No job yet — find work at Daavi’s waakye joint.'
    );
  });

  it('after the hustle the card nudges to the waakye loop at the data price', () => {
    const done: JobState = {
      activeId: null,
      step: 0,
      completedIds: ['HUSTLE_AUNTY_BA_STARTER'],
    };
    expect(idleObjectiveFor(done)).toBe(
      'Hungry? Buy waakye at Daavi’s (₵12), or work another shift.'
    );
  });

  it('history without the hustle still points at the joint (not the meal nudge)', () => {
    const other: JobState = { activeId: null, step: 0, completedIds: ['JOB_TROTRO_MATE'] };
    expect(idleObjectiveFor(other)).toBe(
      'No job yet — find work at Daavi’s waakye joint.'
    );
  });
});

describe('jobs: idle objective priority (G-006 tired hint)', () => {
  const done: JobState = {
    activeId: null,
    step: 0,
    completedIds: ['HUSTLE_AUNTY_BA_STARTER'],
  };

  it('low energy (below the 25 LOW threshold) with OK hunger sends the guest home to sleep', () => {
    expect(
      idleObjectiveFor(createStarterJobState(), { hunger: 50, energy: 24 })
    ).toBe('Tired — head home to the compound and sleep.');
  });

  it('energy exactly at the threshold (25) is not tired yet', () => {
    expect(
      idleObjectiveFor(createStarterJobState(), { hunger: 50, energy: 25 })
    ).toBe('No job yet — find work at Daavi’s waakye joint.');
  });

  it('the tired hint outranks the waakye nudge when hunger is OK', () => {
    expect(idleObjectiveFor(done, { hunger: 40, energy: 10 })).toBe(
      'Tired — head home to the compound and sleep.'
    );
  });

  it('a starving guest eats first — the food line wins when hunger < the work gate', () => {
    // Sleep costs 8 hunger, so sleeping while starving digs the hole deeper.
    expect(idleObjectiveFor(done, { hunger: 8, energy: 10 })).toBe(
      'Hungry? Buy waakye at Daavi’s (₵12), or work another shift.'
    );
    expect(idleObjectiveFor(createStarterJobState(), { hunger: 5, energy: 10 })).toBe(
      'No job yet — find work at Daavi’s waakye joint.'
    );
  });

  it('calling without needs keeps the G-005 behaviour (legacy HUD callers)', () => {
    expect(idleObjectiveFor(createStarterJobState())).toBe(
      'No job yet — find work at Daavi’s waakye joint.'
    );
    expect(idleObjectiveFor(done)).toBe(
      'Hungry? Buy waakye at Daavi’s (₵12), or work another shift.'
    );
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
