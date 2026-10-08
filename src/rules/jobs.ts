/**
 * Job state-machine rules — start, advance step, complete with payout.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * JobState mirrors the store's `job: { activeId, step }` slice plus an
 * optional `completedIds` run-history flag (G-004) that the store threads
 * from E-004 on — undefined reads as [] so the current store slice keeps
 * compiling. WalletState comes from economy.ts. All functions return new
 * state — the Engine owns the store and decides when to commit.
 *
 * Step semantics: `step` is the 0-based index of the NEXT step to perform
 * (matches the store's job.step starting at 0). When `step` reaches
 * `steps.length` the shift is finishable via completeJob, which pays
 * `payGHS` once and clears the active job.
 */

import { findFoodById, FOOD_WAAKYE_ID } from '../data/foods';
import { findJobById, type JobDefinition } from '../data/jobs';
import {
  buy,
  canAfford,
  formatGHS,
  pay,
  type WalletState,
} from './economy';

export interface JobState {
  readonly activeId: string | null;
  readonly step: number;
  /**
   * Ids of shifts fully worked this run — deduped by completeJob.
   * Optional so the store's current `{ activeId, step }` slice keeps
   * compiling until E-004 threads the flag; undefined reads as [].
   */
  readonly completedIds?: readonly string[];
}

/** Starter job state — matches the store default (nothing active, nothing done). */
export function createStarterJobState(): JobState {
  return { activeId: null, step: 0, completedIds: [] };
}

/** This run's completed shift ids — undefined counts as []. */
export function completedIdsOf(state: JobState): readonly string[] {
  return state.completedIds ?? [];
}

/** true when this job has already been fully worked this run (G-004). */
export function isJobCompleted(state: JobState, jobId: string): boolean {
  return completedIdsOf(state).includes(jobId);
}

/** Carry the run's completed-shift history onto the next JobState (optional-safe). */
function withHistory(
  state: JobState,
  next: { activeId: string | null; step: number }
): JobState {
  return state.completedIds === undefined
    ? next
    : { ...next, completedIds: state.completedIds };
}

export interface WorkContext {
  readonly energy: number;
  readonly hunger: number;
  readonly trait?: string;
}

export interface RequirementEvaluation {
  readonly met: boolean;
  readonly energyMet: boolean;
  readonly hungerMet: boolean;
  readonly traitMet: boolean;
  readonly unmetReasons: ReadonlyArray<string>;
}

/** Salvage-faithful requirement check (energy / hunger / trait gates). */
export function evaluateRequirements(
  job: JobDefinition,
  context: WorkContext
): RequirementEvaluation {
  const req = job.requirements;
  if (!req) {
    return { met: true, energyMet: true, hungerMet: true, traitMet: true, unmetReasons: [] };
  }
  const energy = Math.round(context.energy);
  const hunger = Math.round(context.hunger);
  const trait = (context.trait ?? '').toLowerCase();

  const energyMet = energy >= req.minEnergy;
  const hungerMet = hunger >= req.minHunger;
  const traitMet =
    !req.requiredTraits ||
    req.requiredTraits.length === 0 ||
    (trait.length > 0 && req.requiredTraits.includes(trait));

  const unmetReasons: string[] = [];
  if (!energyMet) unmetReasons.push(`Need Energy ≥ ${req.minEnergy} (Current: ${energy})`);
  if (!hungerMet) unmetReasons.push(`Need Hunger ≥ ${req.minHunger} (Current: ${hunger})`);
  if (!traitMet && req.requiredTraits) {
    unmetReasons.push(`Requires trait: ${req.requiredTraits.join(' / ')}`);
  }
  return { met: energyMet && hungerMet && traitMet, energyMet, hungerMet, traitMet, unmetReasons };
}

export interface StartJobResult {
  readonly ok: boolean;
  readonly job: JobState;
  readonly wallet: WalletState;
  readonly message: string;
}

/**
 * Accept a job / hustle. Deducts upfront capital for trading hustles
 * (water hawking) and refuses when the player is already working.
 */
export function startJob(
  state: JobState,
  wallet: WalletState,
  jobId: string,
  context?: WorkContext
): StartJobResult {
  const def = findJobById(jobId);
  if (!def) {
    return { ok: false, job: state, wallet, message: 'Job not found in registry.' };
  }
  if (state.activeId && state.activeId !== jobId) {
    return {
      ok: false,
      job: state,
      wallet,
      message: 'You already have an active job shift in progress.',
    };
  }
  if (context) {
    const evalResult = evaluateRequirements(def, context);
    if (!evalResult.met) {
      return {
        ok: false,
        job: state,
        wallet,
        message: evalResult.unmetReasons[0] ?? 'Job requirements not met.',
      };
    }
  }
  let nextWallet = wallet;
  if (def.upfrontCapitalGHS > 0) {
    if (!canAfford(nextWallet, def.upfrontCapitalGHS)) {
      return {
        ok: false,
        job: state,
        wallet,
        message: `Requires ${formatGHS(def.upfrontCapitalGHS)} starting capital! Earn cash from an entry-level job or zero-capital errand first.`,
      };
    }
    nextWallet = buy(nextWallet, def.upfrontCapitalGHS).wallet;
  }
  return {
    ok: true,
    job: withHistory(state, { activeId: def.id, step: 0 }),
    wallet: nextWallet,
    message: `Job Accepted: ${def.title} (Pay: ${formatGHS(def.payGHS)}). Step 1/${def.steps.length}: ${def.steps[0].instruction}`,
  };
}

export interface AdvanceStepResult {
  readonly ok: boolean;
  readonly job: JobState;
  /** true when the LAST step was just performed → call completeJob. */
  readonly completed: boolean;
  readonly message: string;
}

/**
 * Perform the current step (the player pressed Act at the right spot).
 * Advances the 0-based step pointer; the final advance flags `completed`
 * but does NOT pay — payout happens exactly once in completeJob.
 */
export function advanceStep(state: JobState, interactableId?: string): AdvanceStepResult {
  const def = state.activeId ? findJobById(state.activeId) : undefined;
  if (!def) {
    return { ok: false, job: state, completed: false, message: 'No active job to advance.' };
  }
  const currentStep = def.steps[state.step];
  if (!currentStep) {
    return {
      ok: false,
      job: state,
      completed: false,
      message: 'Shift already fully worked — collect your pay.',
    };
  }
  if (interactableId && currentStep.targetInteractableId !== interactableId) {
    return {
      ok: false,
      job: state,
      completed: false,
      message: `Wrong spot — this step happens at ${currentStep.targetLocationName}.`,
    };
  }
  const nextStep = state.step + 1;
  if (nextStep < def.steps.length) {
    return {
      ok: true,
      job: withHistory(state, { activeId: def.id, step: nextStep }),
      completed: false,
      message: `Step ${nextStep + 1}/${def.steps.length}: ${currentStep.completionMessage}`,
    };
  }
  return {
    ok: true,
    job: withHistory(state, { activeId: def.id, step: nextStep }),
    completed: true,
    message: currentStep.completionMessage,
  };
}

export interface CompleteJobResult {
  readonly ok: boolean;
  readonly job: JobState;
  readonly wallet: WalletState;
  readonly payoutGHS: number;
  readonly message: string;
}

/**
 * Pay out a fully-worked shift exactly once, clear the active job and
 * latch the finished id into `completedIds` (no duplicates) so the run
 * remembers the shift was done (G-004 earn-first). Refuses while steps
 * are still pending (wallet untouched).
 */
export function completeJob(state: JobState, wallet: WalletState): CompleteJobResult {
  const def = state.activeId ? findJobById(state.activeId) : undefined;
  if (!def) {
    return {
      ok: false,
      job: state,
      wallet,
      payoutGHS: 0,
      message: 'No active job to complete.',
    };
  }
  if (state.step < def.steps.length) {
    return {
      ok: false,
      job: state,
      wallet,
      payoutGHS: 0,
      message: `Shift not finished — step ${state.step + 1}/${def.steps.length} pending.`,
    };
  }
  const completed = completedIdsOf(state);
  const nextCompleted = completed.includes(def.id)
    ? completed
    : [...completed, def.id];
  return {
    ok: true,
    job: { ...createStarterJobState(), completedIds: nextCompleted },
    wallet: pay(wallet, def.payGHS),
    payoutGHS: def.payGHS,
    message: `${def.steps[def.steps.length - 1].completionMessage} (+${formatGHS(def.payGHS)} Cash Paid!)`,
  };
}

export interface ObjectiveInfo {
  readonly tag: string;
  readonly title: string;
  readonly instruction: string;
  readonly actionVerb: string;
  readonly targetInteractableId: string;
}

/** What the HUD objective line shows for the current job state. */
export function objectiveFor(state: JobState): ObjectiveInfo | null {
  const def = state.activeId ? findJobById(state.activeId) : undefined;
  if (!def) return null;
  const index = Math.min(state.step, def.steps.length - 1);
  const step = def.steps[index];
  return {
    tag: `Step ${index + 1}/${def.steps.length}`,
    title: def.title,
    instruction: step.instruction,
    actionVerb: step.actionVerb,
    targetInteractableId: step.targetInteractableId,
  };
}

/**
 * Idle-state objective line — what the HUD card shows while no shift is
 * active (i.e. whenever objectiveFor(state) is null). Pure text; the HUD
 * renders it verbatim.
 *
 * G-005: the seller is "Daavi" (display rename only — the job id stays
 * HUSTLE_AUNTY_BA_STARTER and LOC-001 is untouched, so the store and
 * completedIds don't churn).
 *
 *   - Starter hustle not yet worked this run (completedIds empty or without
 *       the hustle — undefined reads as []) → point the guest at the joint.
 *   - Hustle already worked → nudge toward the waakye loop (price derived
 *       from the data, not hardcoded) or another shift of the same hustle.
 */
export function idleObjectiveFor(state: JobState): string {
  const waakye = findFoodById(FOOD_WAAKYE_ID)!;
  return isJobCompleted(state, 'HUSTLE_AUNTY_BA_STARTER')
    ? `Hungry? Buy waakye at Daavi’s (${formatGHS(waakye.priceGHS)}), or work another shift.`
    : 'No job yet — find work at Daavi’s waakye joint.';
}
