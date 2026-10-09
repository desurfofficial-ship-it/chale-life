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
import { CAN_WORK_MIN_HUNGER, isTired, WAAKYE_MAX_HUNGER, type NeedsState } from './needs';

export interface JobState {
  readonly activeId: string | null;
  readonly step: number;
  /**
   * Ids of shifts fully worked this run — deduped by completeJob.
   * Optional so the store's current `{ activeId, step }` slice keeps
   * compiling until E-004 threads the flag; undefined reads as [].
   */
  readonly completedIds?: readonly string[];
  /**
   * Epoch ms of the most recent completed-shift payout (G-008c) — the
   * anchor the job's cooldownSeconds rests from. Optional so pre-G-008c
   * slices keep compiling; undefined reads as "never paid", which is
   * always off cooldown. The store threads it exactly like completedIds
   * (reference-replaced, never mutated), and rules read it as pure data —
   * paired with the session's nowMs, no rule ever calls Date.now().
   */
  readonly lastPayoutAt?: number;
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
 *
 * G-008c: `nowMs` (the session's press-time clock) is stamped into the
 * returned state as `lastPayoutAt` — the instant the job's cooldown
 * rests from. Omitted (legacy callers) the previous stamp, if any, is
 * preserved so repeated completions can never un-arm a running cooldown.
 */
export function completeJob(state: JobState, wallet: WalletState, nowMs?: number): CompleteJobResult {
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
  const lastPayoutAt = nowMs ?? state.lastPayoutAt;
  return {
    ok: true,
    job: {
      ...createStarterJobState(),
      completedIds: nextCompleted,
      ...(lastPayoutAt !== undefined ? { lastPayoutAt } : {}),
    },
    wallet: pay(wallet, def.payGHS),
    payoutGHS: def.payGHS,
    message: `${def.steps[def.steps.length - 1].completionMessage} (+${formatGHS(def.payGHS)} Cash Paid!)`,
  };
}

export interface CooldownStatus {
  /** true while the shift is still resting between runs. */
  readonly onCooldown: boolean;
  /** Milliseconds until the job is ready again (0 when ready). */
  readonly remainingMs: number;
}

/**
 * Pure cooldown math (G-008c item 2), generic over what rests: a job
 * rests `cooldownSeconds` from its LAST PAYOUT, a sachet water (round 2)
 * rests 20 s from its LAST PURCHASE. Both clocks arrive as plain data —
 * the session's `nowMs` and the state's stamp — so this stays a pure
 * (data, data) => data function: no Date.now(), no store, no timers.
 * Missing inputs (legacy slices without the stamp) and a 0/negative
 * cooldown read as ready, so a fresh guest is never gated.
 */
export function cooldownRemaining(
  cooldownSeconds: number,
  nowMs: number | undefined,
  lastAt: number | undefined
): CooldownStatus {
  const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
  if (cooldownMs === 0 || nowMs === undefined || lastAt === undefined) {
    return { onCooldown: false, remainingMs: 0 };
  }
  const remainingMs = cooldownMs - (nowMs - lastAt);
  return remainingMs > 0
    ? { onCooldown: true, remainingMs }
    : { onCooldown: false, remainingMs: 0 };
}

/** The job-shaped wrapper: a definition's cooldownSeconds from its payout stamp. */
export function cooldownStatus(
  def: JobDefinition,
  nowMs: number | undefined,
  lastPayoutAt: number | undefined
): CooldownStatus {
  return cooldownRemaining(def.cooldownSeconds, nowMs, lastPayoutAt);
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
 * G-008c round 2 item 4: the copy is NEEDS-BASED and can never suggest
 * an action the Act button would refuse (property-tested over the
 * hunger/energy grid in act.test.ts).
 *
 * G-008d item 5: the copy also names the RIGHT SPOT for what it suggests
 * — since the split, food happens only at Daavi's FRONT COUNTER (LOC-001)
 * and work only at the JOB SPOT beside the kiosk (LOC-001-JOB), so a line
 * that said "at Daavi's" would aim the guest at the wrong door:
 *
 *   - Hustle already worked this run:
 *       hunger ≤ WAAKYE_MAX_HUNGER (80) → the waakye line naming the
 *         FRONT COUNTER — the counter really offers the meal at these
 *         needs (round(hunger) ≤ 80, affordable), so the gate and the
 *         copy are the same door;
 *       else energy < LOW_THRESHOLD (25) → the G-006 tired line — the
 *         compound's bed still takes anyone under 90 energy;
 *       otherwise → work another shift, naming the side of the kiosk —
 *         with hunger above the meal gate and energy above the low line,
 *         canWork passes and the job spot offers "Help Daavi".
 *   - Starter hustle NOT yet worked (completedIds empty or without the
 *       hustle — undefined reads as []): the tired hint first when the
 *       belly can still take a nap's −8 hunger (G-006: sleeping while
 *       starving digs the hole deeper), then — starving — the meal line
 *       (the work gate would refuse them; the counter is the unstick),
 *       then the go-find-work beacon naming the JOB SPOT — the earn-first
 *       button's own answer, now at the side of the kiosk.
 *   - No needs (legacy callers): the neutral post-shift nudge for a
 *       completed run, the beacon otherwise.
 */
export function idleObjectiveFor(state: JobState, needs?: NeedsState): string {
  const waakye = findFoodById(FOOD_WAAKYE_ID)!;
  if (isJobCompleted(state, 'HUSTLE_AUNTY_BA_STARTER')) {
    if (!needs) return 'Work another shift — jobs are at the side of Daavi’s kiosk.';
    if (Math.round(needs.hunger) <= WAAKYE_MAX_HUNGER) {
      return `Hungry? Buy waakye at Daavi’s front counter (${formatGHS(waakye.priceGHS)}).`;
    }
    if (isTired(needs)) {
      return 'Tired — head home to the compound and sleep.';
    }
    return 'Work another shift — jobs are at the side of Daavi’s kiosk.';
  }
  if (needs) {
    if (isTired(needs) && needs.hunger >= CAN_WORK_MIN_HUNGER) {
      return 'Tired — head home to the compound and sleep.';
    }
    // Starving (below the work hunger gate): the job spot would refuse
    // them — the meal line is the only advice the button can back.
    if (needs.hunger < CAN_WORK_MIN_HUNGER) {
      return `Hungry? Buy waakye at Daavi’s front counter (${formatGHS(waakye.priceGHS)}).`;
    }
  }
  return 'No job yet — find work at the side of Daavi’s kiosk.';
}
