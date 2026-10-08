import { describe, expect, it } from './testKit';
import { ACCRA_LEGAL_JOBS, findJobById } from '../../data/jobs';
import { type WalletState } from '../economy';
import {
  advanceStep,
  completeJob,
  createStarterJobState,
  evaluateRequirements,
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
  it('startJob activates the Aunty Ba starter hustle at step 0', () => {
    const result = startJob(createStarterJobState(), starterWallet(), 'HUSTLE_AUNTY_BA_STARTER');
    expect(result.ok).toBe(true);
    expect(result.job).toEqual({ activeId: 'HUSTLE_AUNTY_BA_STARTER', step: 0 });
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
  it('advanceStep walks through each Aunty Ba step (0 → 1 → 2)', () => {
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
  it('completeJob pays ₵15 after all three Aunty Ba steps', () => {
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
    expect(result.job).toEqual({ activeId: null, step: 0 });
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
