/**
 * Earn-and-eat act resolution — the pure brain behind the HUD's Act button.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports, no
 * Date.now() — every clock arrives as data on the session (`nowMs`, the
 * press instant; `job.lastPayoutAt`, the last payout instant).
 * The Engine (E-003) samples the store into an ActSession, asks
 * `actPromptFor` what the button should say (every HUD notify), and on a
 * press calls `resolveAct` and commits the returned session back.
 *
 * Behaviour map (Task G-008d — Daavi's joint is TWO spots; G-008c wired
 * the cooldowns/guards, G-008b the proximity zones, G-004 earn-first,
 * G-006 sleep):
 *   - LOCATION is decided from the player position when the session carries
 *       one (the store samples it at press time): the compound is the WHOLE
 *       yard AABB via isInSleepZone (never the 2.5 m gate point), Daavi's
 *       bench and job spot are their own waypoints, and the named locations
 *       keep their 2.5 m points (proximity.nearestLocationId encodes the
 *       priority: sleep zone > bench > job spot > points). Without a
 *       position (HUD prompt path) the zone-aware nearLocationId written
 *       by the GameLoop probe is used — same helper, same result.
 *   - At LOC-002 (Starter Compound): sleep — free, +55 energy (applySleep)
 *       and −8 hunger (you wake up hungry), label "Sleep". Disabled with
 *       "Not tired yet" at energy ≥ SLEEP_GATE_ENERGY (90). Sleep never
 *       steals a live job step, and is allowed mid-shift (nap between
 *       lifts) — the job passes through untouched.
 *   - At LOC-001 (Daavi's FRONT COUNTER — G-008d item 2) food ONLY ever
 *       happens: "Buy waakye ₵12" while round(hunger) ≤ WAAKYE_MAX_HUNGER
 *       (80) and the purse allows, else disabled "Full" / "Not enough
 *       cash". Meals are NEVER cooldown-gated and NEVER gated by the run
 *       history — a counter is a counter. Act here can never start or
 *       advance a job (the old single-spot button that meant both). The
 *       G-008c dead-end is fixed BY the split: the moneyed guest the
 *       counter refuses (Full) walks 3 m east and works.
 *   - At LOC-001-JOB (Daavi's JOB SPOT — the kiosk's east side) work ONLY
 *       ever happens: no active shift → "Help Daavi" (zero-capital hire,
 *       canWork + cooldownStatus gates); the hustle live → its step 1/3
 *       advances here; disabled with the live countdown ("Daavi needs you
 *       again in Ns"), then the canWork reason ("Too tired…" / "Too
 *       hungry…"). Step 2 happens at the bench — pressing here mid-walk
 *       refuses with the wrong-spot reason naming the bench.
 *   - At LOC-001-BENCH (Daavi's bench, north pavement): only the
 *       bench-targeted step advances. Steps 1/3 pending → "Wrong spot —
 *       jobs are at the side of the kiosk."; idle and hungry with cash →
 *       "Wrong spot — food is at the front counter."
 *   - At LOC-003 (Maame Effia's provisions): buy FOOD_SACHET_WATER for
 *       ₵1 — a SIP since G-008c round 2: +4 hunger / +2 energy, refused
 *       with "Not thirsty" at round(hunger) ≥ WATER_MAX_HUNGER (90 —
 *       G-008d) and on a 20 s per-sachet rest ("Water again in Ns",
 *       counted from NeedsState.lastWaterAt via the generic
 *       cooldownRemaining), then the cash gate. Energy comes mainly from
 *       sleep.
 *   - Too tired / too hungry (canWork gates) or short of cash:
 *       enabled=false with a short reason. Money never goes negative —
 *       buy() refuses, applyRestore clamps at 0.
 *   - Not near anything: label "Act", enabled=false.
 *
 * G-008c item 4: resolveAct reports WHAT a press did through typed
 * fields — `kind` (the decided ActKind) plus `purchased` / `paidOut` —
 * so the store's guards detect purchases and payouts structurally
 * instead of regex-matching the toast text (−₵ / +₵ was fragile).
 */

import {
  findFoodById,
  FOOD_SACHET_WATER_ID,
  FOOD_WAAKYE_ID,
} from '../data/foods';
import { findJobById } from '../data/jobs';
import { buy, canAfford, formatGHS, type WalletState } from './economy';
import {
  advanceStep,
  completeJob,
  completedIdsOf,
  cooldownRemaining,
  cooldownStatus,
  objectiveFor,
  startJob,
  type JobState,
} from './jobs';
import {
  applyMeal,
  applySleep,
  applyWorkCost,
  CAN_WORK_MIN_HUNGER,
  canWork,
  drinkWater,
  LOW_THRESHOLD,
  SLEEP_ENERGY_RESTORE,
  SLEEP_GATE_ENERGY,
  WAAKYE_MAX_HUNGER,
  WATER_MAX_HUNGER,
  type NeedsState,
} from './needs';
import {
  DAAVI_BENCH,
  DAAVI_JOB_SPOT,
  isInSleepZone,
  nearestLocationId,
} from './proximity';

/** Everything one Act press can touch — the Engine projects the store into this. */
export interface ActSession {
  readonly wallet: WalletState;
  readonly needs: NeedsState;
  readonly job: JobState;
  /**
   * Player world position in metres (G-008b). Optional so the HUD's
   * prompt path can rely on the zone-aware `nearLocationId` without
   * re-rendering per frame; the store's requestAct always supplies it,
   * making the press-time decision zone-exact.
   */
  readonly position?: { readonly x: number; readonly z: number };
  /**
   * The press instant in epoch ms (G-008c item 2) — the NOW the cooldown
   * counts against. Pure data, sampled by the store at press time, so the
   * rules never touch Date.now() and tests fake the clock by just writing
   * a number. Optional: undefined reads as "no cooldown clock", which
   * keeps every pre-G-008c caller and legacy slice compiling.
   */
  readonly nowMs?: number;
}

/** What the HUD's Act button should show right now. */
export interface ActPrompt {
  readonly label: string;
  readonly enabled: boolean;
  /** Short human reason when enabled is false (also useful as a toast). */
  readonly reason?: string;
}

/** Result of one Act press: the next session, a ~2 s HUD toast, and —
 *  G-008c item 4 — a typed report of WHAT happened (kind + the two
 *  guard-relevant flags), replacing the old toast-text regexes. */
export interface ActResolution {
  readonly session: ActSession;
  readonly toast: string | null;
  /** Which decision this press resolved as (disabled presses keep their kind). */
  readonly kind: ActKind;
  /** true when this press SPENT cash (waakye or water bought). */
  readonly purchased: boolean;
  /** true when this press PAID a fully-worked shift out. */
  readonly paidOut: boolean;
}

/** Daavi's zero-capital starter hustle — the only job act.ts starts.
 *  G-005: display name is Daavi; the id keeps AUNTY_BA so the store and
 *  completedIds never churn. */
export const AUNTY_BA_HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';

/** Daavi's waakye joint FRONT COUNTER (LOC-001 in src/data/locations.ts) —
 *  food only since G-008d: buy waakye, nothing else. */
export const WAAKYE_LOCATION_ID = 'LOC-001';

/**
 * Daavi's JOB SPOT (G-008d, proximity.ts DAAVI_JOB_SPOT) — the kiosk's
 * east side. Hiring and the hustle's steps 1/3 happen here; food never
 * does. Id pinned to the proximity constant by the data-contract test.
 */
export const DAAVI_JOB_SPOT_ID = DAAVI_JOB_SPOT.locationId;

/** Maame Effia's provisions store (src/data/locations.ts) — sachet water. */
export const WATER_LOCATION_ID = 'LOC-003';

/** The Starter Compound (src/data/locations.ts) — free sleep since G-006. */
export const SLEEP_LOCATION_ID = 'LOC-002';

/**
 * Daavi's bench waypoint id (G-008, proximity.ts) — hustle step 2 happens
 * here, a short walk east of the kiosk.
 */
export const DAAVI_BENCH_ID = DAAVI_BENCH.locationId;

const WAAKYE = findFoodById(FOOD_WAAKYE_ID)!;
const SACHET_WATER = findFoodById(FOOD_SACHET_WATER_ID)!;

/** The kinds of decision one Act press can resolve as. */
export type ActKind = 'idle' | 'start' | 'advance' | 'waakye' | 'water' | 'sleep';

interface Decision {
  readonly kind: ActKind;
  readonly label: string;
  readonly enabled: boolean;
  readonly reason?: string;
}

/** The live shift's next step — advance it when the body allows. */
function decideAdvance(session: ActSession): Decision {
  const verb = objectiveFor(session.job)?.actionVerb ?? 'Act';
  const work = canWork(session.needs);
  return work.ok
    ? { kind: 'advance', label: verb, enabled: true }
    : { kind: 'advance', label: verb, enabled: false, reason: work.reason };
}

/**
 * Advance gated by the CURRENT STEP's target location (G-008b: the hustle
 * forces its walk — step 2 only advances at Daavi's bench). Off-spot the
 * button disables with a reason naming where the step happens.
 */
function decideAdvanceForStep(session: ActSession, locationId: string): Decision {
  if (activeStepAt(session, locationId)) return decideAdvance(session);
  const def = findJobById(session.job.activeId ?? '');
  const step = def?.steps[Math.min(session.job.step, def.steps.length - 1)];
  return {
    kind: 'advance',
    label: step?.actionVerb ?? 'Act',
    enabled: false,
    reason: step
      ? `Wrong spot — this step happens at ${step.targetLocationName}.`
      : 'Finish your current shift first.',
  };
}

/**
 * True when the active shift's next step happens at this location
 * (G-006: such a step outranks the location's own act — sleep never
 * steals a live job step).
 */
function activeStepAt(session: ActSession, locationId: string): boolean {
  if (session.job.activeId === null) return false;
  const def = findJobById(session.job.activeId);
  return def?.steps[session.job.step]?.locationId === locationId;
}

/**
 * Daavi's FRONT COUNTER (LOC-001) — G-008d item 2: FOOD ONLY. The old
 * single joint button meant both "eat" and "work" and dead-ended when
 * its two doors disagreed; the counter now has exactly one door, and it
 * is the meal. Disabled states, in the task's order:
 *   1. "Full" — round(hunger) above WAAKYE_MAX_HUNGER (80): the meal
 *      would clamp-waste its restore, no purse changes that (the mirror
 *      of the provisions' "Not thirsty");
 *   2. "Not enough cash" — the purse gate (waakye is ₵12).
 * Meals are NEVER cooldown-gated and NEVER gated by completedIds — a
 * fresh guest and a paid guest see the same counter. Act here can never
 * start or advance a job: the resolve switch has no job case for the
 * counter's 'waakye' kind, and no decide branch here even looks at the
 * job slice (pinned by the counter-never-advances test).
 */
function decideAtFoodCounter(session: ActSession): Decision {
  const label = `Buy waakye ${formatGHS(WAAKYE.priceGHS)}`;
  if (Math.round(session.needs.hunger) > WAAKYE_MAX_HUNGER) {
    return { kind: 'waakye', label: 'Full', enabled: false, reason: 'You are full — waakye can wait.' };
  }
  if (!canAfford(session.wallet, WAAKYE.priceGHS)) {
    return {
      kind: 'waakye',
      label,
      enabled: false,
      reason: `Not enough cash — waakye is ${formatGHS(WAAKYE.priceGHS)}.`,
    };
  }
  return { kind: 'waakye', label, enabled: true };
}

/**
 * Daavi's JOB SPOT (LOC-001-JOB) — G-008d item 2: WORK ONLY. Hiring
 * ("Help Daavi") and the hustle's steps 1/3 ("Grab pans" / "Get paid")
 * happen here; food never does. Disabled states, the task's cascade:
 * the live COOLDOWN (it is what the wait fixes first — the review's
 * ₵35 + hunger 70 pin), then the body (canWork's tired / hungry
 * reasons). The job's own cooldownSeconds (45 s from lastPayoutAt,
 * G-008c) is enforced from the data via cooldownStatus.
 */
function decideAtJobSpot(session: ActSession): Decision {
  const { needs, job } = session;

  if (job.activeId === AUNTY_BA_HUSTLE_ID) {
    // The live shift: steps 1/3 advance HERE (G-008d moved them from
    // LOC-001); step 2 refuses with the wrong-spot reason naming the
    // bench — the walk is the shift (G-008b, kept).
    return decideAdvanceForStep(session, DAAVI_JOB_SPOT_ID);
  }

  if (job.activeId) {
    // Another shift is in progress — its steps happen elsewhere.
    return {
      kind: 'idle',
      label: 'Act',
      enabled: false,
      reason: 'Finish your current shift first.',
    };
  }

  const work = canWork(needs);
  const hustle = findJobById(AUNTY_BA_HUSTLE_ID)!;
  const cooldown = cooldownStatus(hustle, session.nowMs, job.lastPayoutAt);
  if (work.ok && !cooldown.onCooldown) {
    return { kind: 'start', label: 'Help Daavi', enabled: true };
  }
  // Hire blocked — the most useful truth first: the COUNTDOWN (the wait
  // fixes it), then the body (too tired / too hungry).
  if (cooldown.onCooldown) {
    return {
      kind: 'start',
      label: 'Help Daavi',
      enabled: false,
      reason: `${hustle.employerName} needs you again in ${Math.ceil(cooldown.remainingMs / 1000)}s`,
    };
  }
  return {
    kind: 'start',
    label: 'Help Daavi',
    enabled: false,
    reason: work.reason,
  };
}

/**
 * Maame Effia's provisions (G-008c round 2): water is a ₵1 sip with a
 * state gate, a rest and a purse gate — in that order, each reason the
 * most useful truth for the guest standing there:
 *   1. "Not thirsty" at round(hunger) ≥ WATER_MAX_HUNGER (80) — no
 *      amount of cash makes the sip useful past the gate (the mirror of
 *      the compound's "Not tired yet");
 *   2. the 20 s per-sachet rest — the wait that fixes it first, counted
 *      from NeedsState.lastWaterAt (the cooldownRemaining primitive
 *      shared with the job shifts);
 *   3. the purse — water still costs ₵1.
 */
function decideAtProvisions(session: ActSession): Decision {
  const label = `Buy water ${formatGHS(SACHET_WATER.priceGHS)}`;
  if (Math.round(session.needs.hunger) >= WATER_MAX_HUNGER) {
    return { kind: 'water', label, enabled: false, reason: 'Not thirsty' };
  }
  const rest = cooldownRemaining(
    SACHET_WATER.cooldownSeconds ?? 0,
    session.nowMs,
    session.needs.lastWaterAt
  );
  if (rest.onCooldown) {
    return {
      kind: 'water',
      label,
      enabled: false,
      reason: `Water again in ${Math.ceil(rest.remainingMs / 1000)}s`,
    };
  }
  if (!canAfford(session.wallet, SACHET_WATER.priceGHS)) {
    return {
      kind: 'water',
      label,
      enabled: false,
      reason: `Not enough cash — water is ${formatGHS(SACHET_WATER.priceGHS)}.`,
    };
  }
  return { kind: 'water', label, enabled: true };
}

/**
 * Daavi's bench (G-008 waypoint, G-008d: north pavement; G-008e:
 * waypoint pinned at 21.5/2.45, the mesh at z 3.15–3.65):
 * only the bench-targeted step advances here. Everything else is a
 * redirect or idle:
 *   - hustle steps 1/3 pending → the job spot is where the work is:
 *     "Wrong spot — jobs are at the side of the kiosk.";
 *   - no active job, hungry with cash → the counter is where the food is:
 *     "Wrong spot — food is at the front counter." (the G-008d wrong-spot
 *     phrasing pair; the bench itself neither hires nor feeds);
 *   - otherwise the plain idle refusal.
 */
function decideAtBench(session: ActSession): Decision {
  if (session.job.activeId === AUNTY_BA_HUSTLE_ID) {
    if (activeStepAt(session, DAAVI_BENCH_ID)) return decideAdvance(session);
    const def = findJobById(AUNTY_BA_HUSTLE_ID)!;
    const step = def.steps[Math.min(session.job.step, def.steps.length - 1)];
    return {
      kind: 'advance',
      label: step?.actionVerb ?? 'Act',
      enabled: false,
      reason: 'Wrong spot — jobs are at the side of the kiosk.',
    };
  }
  if (session.job.activeId) {
    return {
      kind: 'idle',
      label: 'Act',
      enabled: false,
      reason: 'Finish your current shift first.',
    };
  }
  if (
    Math.round(session.needs.hunger) <= WAAKYE_MAX_HUNGER &&
    canAfford(session.wallet, WAAKYE.priceGHS)
  ) {
    return {
      kind: 'idle',
      label: 'Act',
      enabled: false,
      reason: 'Wrong spot — food is at the front counter.',
    };
  }
  return {
    kind: 'idle',
    label: 'Act',
    enabled: false,
    reason: 'Nothing to do here yet.',
  };
}

/**
 * The Starter Compound (home): sleep is free and always on offer — even
 * mid-shift (a nap between lifts never touches the job) — unless a shift
 * step targets the compound itself, in which case Act works the step.
 */
function decideAtCompound(session: ActSession): Decision {
  if (activeStepAt(session, SLEEP_LOCATION_ID)) {
    return decideAdvance(session);
  }
  if (session.needs.energy >= SLEEP_GATE_ENERGY) {
    return { kind: 'sleep', label: 'Sleep', enabled: false, reason: 'Not tired yet' };
  }
  return { kind: 'sleep', label: 'Sleep', enabled: true };
}

function decideAt(session: ActSession, locationId: string | null): Decision {
  if (locationId === WAAKYE_LOCATION_ID) {
    // The front counter: food only — never a job action (G-008d item 2).
    return decideAtFoodCounter(session);
  }
  if (locationId === DAAVI_JOB_SPOT_ID) {
    // The job spot: work only — never a purchase (G-008d item 2).
    return decideAtJobSpot(session);
  }
  if (locationId === SLEEP_LOCATION_ID) {
    return decideAtCompound(session);
  }
  if (locationId === DAAVI_BENCH_ID) {
    return decideAtBench(session);
  }
  if (locationId === WATER_LOCATION_ID) {
    return decideAtProvisions(session);
  }
  return {
    kind: 'idle',
    label: 'Act',
    enabled: false,
    reason:
      locationId === null ? undefined : 'Nothing to do here yet.',
  };
}

function decideAct(session: ActSession, nearLocationId: string | null): Decision {
  const { position } = session;
  if (!position) {
    // HUD prompt path: the GameLoop probe writes the zone-aware location
 // (proximity.nearestLocationId — the same zones, edge-for-edge).
    return decideAt(session, nearLocationId);
  }
  // G-008b item 1: the compound decision is the yard AABB via
  // isInSleepZone — never the 2.5 m gate point. The bench waypoint, the
  // G-008d job spot and the named points come from the same zone
  // resolver, priorities baked in (sleep zone > bench > job spot > 2.5 m
  // points). A position that lands NOWHERE defers to the zone-aware
  // nearLocationId — headless callers that only set the probe (and a
  // player standing in no zone at all) agree either way, because the
  // GameLoop writes the same zones into the probe.
  if (isInSleepZone(position.x, position.z)) {
    return decideAtCompound(session);
  }
  return decideAt(session, nearestLocationId(position.x, position.z) ?? nearLocationId);
}

/**
 * Where the objective marker should sit right now (G-008b item 7,
 * G-008d item 4 — mirrored branch-for-branch with idleObjectiveFor so
 * the beacon can never disagree with the hint copy):
 *
 *   - Active job → the current step's `locationId` (or its interactable
 *       id for untagged steps): the hustle's steps 1/3 point at the JOB
 *       SPOT (data/jobs.ts moved them there), step 2 at the bench.
 *   - Idle, meal line would show (completed run with round(hunger) ≤
 *       WAAKYE_MAX_HUNGER, or a fresh guest too hungry to work) →
 *       LOC-001: the FRONT COUNTER — the eating hint points at food.
 *   - Idle, energy below the LOW threshold (25) → LOC-002: the marker
 *       anchors at COMPOUND_DOOR via proximity.markerPositionFor — the
 *       tired guest is walked HOME before they hit the canWork wall.
 *   - Idle, nothing worked this run (fresh fed guest) → LOC-001-JOB:
 *       the find-work beacon points at the spot where "Help Daavi"
 *       actually lives since the split (it used to point at the joint).
 *   - Otherwise → null (hidden — a completed fed-and-rested shift sits
 *       in completedIds; the work-line copy names the spot in text).
 */
export function objectiveMarkerTarget(job: JobState, needs: NeedsState): string | null {
  if (job.activeId !== null) {
    const def = findJobById(job.activeId);
    if (!def) return null;
    const step = def.steps[Math.min(job.step, def.steps.length - 1)];
    return step ? (step.locationId ?? step.targetInteractableId) : null;
  }
  const completed = completedIdsOf(job).length > 0;
  if (needs) {
    // Mirror idleObjectiveFor's food line: the counter owns it whenever
    // the copy would suggest eating (completed + under the meal gate, or
    // a fresh guest below the work hunger gate).
    if (completed && Math.round(needs.hunger) <= WAAKYE_MAX_HUNGER) {
      return WAAKYE_LOCATION_ID;
    }
    if (!completed && needs.hunger < CAN_WORK_MIN_HUNGER) {
      return WAAKYE_LOCATION_ID;
    }
    if (needs.energy < LOW_THRESHOLD) return SLEEP_LOCATION_ID;
  } else if (completedIdsOf(job).length === 0) {
    // Legacy needs-less callers: the find-work beacon.
    return DAAVI_JOB_SPOT_ID;
  }
  if (!completed) return DAAVI_JOB_SPOT_ID;
  return null;
}

/** What the Act button should say at this session, this near this location. */
export function actPromptFor(
  session: ActSession,
  nearLocationId: string | null
): ActPrompt {
  const decision = decideAct(session, nearLocationId);
  if (decision.enabled) {
    return { label: decision.label, enabled: true };
  }
  return {
    label: decision.label,
    enabled: false,
    ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
  };
}

/**
 * Perform one Act press. Disabled / refused decisions return the SAME
 * session untouched with a null toast — committing it is a no-op (the
 * store's guards rely on that identity: same reference ⇒ the press did
 * not fire and must not stamp the debounce window).
 */
export function resolveAct(
  session: ActSession,
  nearLocationId: string | null
): ActResolution {
  const decision = decideAct(session, nearLocationId);
  if (!decision.enabled) {
    return { session, toast: null, kind: decision.kind, purchased: false, paidOut: false };
  }

  switch (decision.kind) {
    case 'start': {
      const result = startJob(session.job, session.wallet, AUNTY_BA_HUSTLE_ID, {
        energy: session.needs.energy,
        hunger: session.needs.hunger,
      });
      if (!result.ok) return { session, toast: null, kind: 'start', purchased: false, paidOut: false };
      const title = findJobById(AUNTY_BA_HUSTLE_ID)?.title ?? 'hustle started';
      return {
        // Spread first: the press-time position / nowMs ride through so a
        // follow-up resolution keeps its zone- and cooldown-exact inputs.
        session: { ...session, wallet: result.wallet, job: result.job },
        toast: `Job accepted — ${title}`,
        kind: 'start',
        purchased: false,
        paidOut: false,
      };
    }

    case 'advance': {
      const advanced = advanceStep(session.job);
      if (!advanced.ok) return { session, toast: null, kind: 'advance', purchased: false, paidOut: false };
      if (!advanced.completed) {
        return {
          session: { ...session, job: advanced.job },
          toast: advanced.message,
          kind: 'advance',
          purchased: false,
          paidOut: false,
        };
      }
      // Final step performed: pay out and take the shift's toll. G-008c:
      // the payout is stamped with the session's press clock, arming the
      // job's cooldownSeconds (pure data in / pure data out).
      const paid = completeJob(advanced.job, session.wallet, session.nowMs);
      if (!paid.ok) return { session, toast: null, kind: 'advance', purchased: false, paidOut: false };
      return {
        session: {
          ...session,
          wallet: paid.wallet,
          needs: applyWorkCost(session.needs),
          job: paid.job,
        },
        toast: paid.message,
        kind: 'advance',
        purchased: false,
        paidOut: true,
      };
    }

    case 'waakye': {
      const purchase = buy(session.wallet, WAAKYE.priceGHS);
      if (!purchase.ok) return { session, toast: null, kind: 'waakye', purchased: false, paidOut: false };
      return {
        session: {
          ...session,
          wallet: purchase.wallet,
          needs: applyMeal(session.needs),
          job: session.job,
        },
        toast: `Waakye! +${WAAKYE.hungerRestore} hunger (−${formatGHS(WAAKYE.priceGHS)})`,
        kind: 'waakye',
        purchased: true,
        paidOut: false,
      };
    }

    case 'water': {
      const purchase = buy(session.wallet, SACHET_WATER.priceGHS);
      if (!purchase.ok) return { session, toast: null, kind: 'water', purchased: false, paidOut: false };
      return {
        session: {
          ...session,
          wallet: purchase.wallet,
          // G-008c round 2: the press clock stamps lastWaterAt — the
          // 20 s per-sachet rest counts from THIS instant (pure data in,
          // pure data out, exactly like the job payout stamp).
          needs: drinkWater(session.needs, session.nowMs),
          job: session.job,
        },
        toast: `Sachet water — +${SACHET_WATER.energyRestore} energy (−${formatGHS(SACHET_WATER.priceGHS)})`,
        kind: 'water',
        purchased: true,
        paidOut: false,
      };
    }

    case 'sleep': {
      // Free, and the job (even a live one) rides through untouched —
      // the store's identity check skips the wallet/job slices.
      return {
        session: {
          ...session,
          wallet: session.wallet,
          needs: applySleep(session.needs),
          job: session.job,
        },
        toast: `Slept at the compound — +${SLEEP_ENERGY_RESTORE} energy`,
        kind: 'sleep',
        purchased: false,
        paidOut: false,
      };
    }

    default:
      return { session, toast: null, kind: 'idle', purchased: false, paidOut: false };
  }
}
