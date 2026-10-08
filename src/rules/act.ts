/**
 * Earn-and-eat act resolution — the pure brain behind the HUD's Act button.
 *
 * CONTRACT: pure TypeScript. No three.js, no React, no store imports.
 * The Engine (E-003) samples the store into an ActSession, asks
 * `actPromptFor` what the button should say (every HUD notify), and on a
 * press calls `resolveAct` and commits the returned session back.
 *
 * Behaviour map (Task G-004, "earn-first at Aunty Ba's"):
 *   - At LOC-001 (Aunty Ba's waakye joint), starter hustle NOT yet worked
 *       this run (JobState.completedIds): start HUSTLE_AUNTY_BA_STARTER —
 *       label "Help Aunty Ba". One anti-soft-lock exception: too hungry to
 *       work (energy fine, hunger < CAN_WORK_MIN_HUNGER) with ₵12 in
 *       pocket → waakye first, so hunger can never wall the hustle off.
 *   - At LOC-001 with that hustle active: advance one step; the final
 *       advance also completes the shift — +₵15 and the work
 *       energy/hunger cost (applyWorkCost).
 *   - At LOC-001 with the hustle already completed this run: buy
 *       FOOD_WAAKYE (−₵12, applyMeal) when affordable and hunger < 100 —
 *       label "Buy waakye ₵12"; otherwise offer the hustle again
 *       (work-when-broke, full belly, hungry-but-cashless).
 *   - At LOC-003 (Maame Effia's provisions): buy FOOD_SACHET_WATER for
 *       ₵1 with drinkWater — label "Buy water ₵1".
 *   - Too tired / too hungry (canWork gates) or short of cash:
 *       enabled=false with a short reason. Money never goes negative —
 *       buy() refuses, applyRestore clamps at 0.
 *   - Not near anything: label "Act", enabled=false.
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
  isJobCompleted,
  objectiveFor,
  startJob,
  type JobState,
} from './jobs';
import {
  applyMeal,
  applyWorkCost,
  CAN_WORK_MIN_ENERGY,
  CAN_WORK_MIN_HUNGER,
  canWork,
  drinkWater,
  type NeedsState,
} from './needs';

/** Everything one Act press can touch — the Engine projects the store into this. */
export interface ActSession {
  readonly wallet: WalletState;
  readonly needs: NeedsState;
  readonly job: JobState;
}

/** What the HUD's Act button should show right now. */
export interface ActPrompt {
  readonly label: string;
  readonly enabled: boolean;
  /** Short human reason when enabled is false (also useful as a toast). */
  readonly reason?: string;
}

/** Result of one Act press: the next session plus a ~2 s HUD toast. */
export interface ActResolution {
  readonly session: ActSession;
  readonly toast: string | null;
}

/** Aunty Ba's zero-capital starter hustle — the only job act.ts starts. */
export const AUNTY_BA_HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';

/** Aunty Ba's waakye joint (src/data/locations.ts) — hustle + waakye meal. */
export const WAAKYE_LOCATION_ID = 'LOC-001';

/** Maame Effia's provisions store (src/data/locations.ts) — sachet water. */
export const WATER_LOCATION_ID = 'LOC-003';

const WAAKYE = findFoodById(FOOD_WAAKYE_ID)!;
const SACHET_WATER = findFoodById(FOOD_SACHET_WATER_ID)!;

interface Decision {
  readonly kind: 'idle' | 'start' | 'advance' | 'waakye' | 'water';
  readonly label: string;
  readonly enabled: boolean;
  readonly reason?: string;
}

function decideAtWaakyeJoint(session: ActSession): Decision {
  const { wallet, needs, job } = session;
  const work = canWork(needs);

  if (job.activeId === AUNTY_BA_HUSTLE_ID) {
    const verb = objectiveFor(job)?.actionVerb ?? 'Act';
    if (!work.ok) {
      return { kind: 'advance', label: verb, enabled: false, reason: work.reason };
    }
    return { kind: 'advance', label: verb, enabled: true };
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

  const waakyeOffer: Decision = {
    kind: 'waakye',
    label: `Buy waakye ${formatGHS(WAAKYE.priceGHS)}`,
    enabled: true,
  };

  // Earn-first (G-004): the starter hustle comes before food — tracked by
  // JobState.completedIds, never by a hunger proxy (spawn drain used to
  // push hunger under the old threshold within minutes, hiding ₵35).
  if (!isJobCompleted(job, AUNTY_BA_HUSTLE_ID)) {
    if (!work.ok) {
      // canWork fails BECAUSE of hunger (energy clears its own gate) and
      // waakye is in reach — eat, or hunger walls the hustle off forever.
      const hungerBlocked =
        needs.energy >= CAN_WORK_MIN_ENERGY &&
        needs.hunger < CAN_WORK_MIN_HUNGER;
      if (hungerBlocked && canAfford(wallet, WAAKYE.priceGHS)) {
        return waakyeOffer;
      }
      return {
        kind: 'start',
        label: 'Help Aunty Ba',
        enabled: false,
        reason: work.reason,
      };
    }
    return { kind: 'start', label: 'Help Aunty Ba', enabled: true };
  }

  // Hustle already worked this run — the joint sells waakye when it makes
  // sense (affordable, room to eat); otherwise Aunty Ba re-hires you.
  if (canAfford(wallet, WAAKYE.priceGHS) && needs.hunger < 100) {
    return waakyeOffer;
  }
  if (!work.ok) {
    return {
      kind: 'start',
      label: 'Help Aunty Ba',
      enabled: false,
      reason: work.reason,
    };
  }
  return { kind: 'start', label: 'Help Aunty Ba', enabled: true };
}

function decideAtProvisions(session: ActSession): Decision {
  const label = `Buy water ${formatGHS(SACHET_WATER.priceGHS)}`;
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

function decideAct(session: ActSession, nearLocationId: string | null): Decision {
  if (nearLocationId === WAAKYE_LOCATION_ID) {
    return decideAtWaakyeJoint(session);
  }
  if (nearLocationId === WATER_LOCATION_ID) {
    return decideAtProvisions(session);
  }
  return {
    kind: 'idle',
    label: 'Act',
    enabled: false,
    reason:
      nearLocationId === null ? undefined : 'Nothing to do here yet.',
  };
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
 * session untouched with a null toast — committing it is a no-op.
 */
export function resolveAct(
  session: ActSession,
  nearLocationId: string | null
): ActResolution {
  const decision = decideAct(session, nearLocationId);
  if (!decision.enabled) {
    return { session, toast: null };
  }

  switch (decision.kind) {
    case 'start': {
      const result = startJob(session.job, session.wallet, AUNTY_BA_HUSTLE_ID, {
        energy: session.needs.energy,
        hunger: session.needs.hunger,
      });
      if (!result.ok) return { session, toast: null };
      const title = findJobById(AUNTY_BA_HUSTLE_ID)?.title ?? 'hustle started';
      return {
        session: { ...session, wallet: result.wallet, job: result.job },
        toast: `Job accepted — ${title}`,
      };
    }

    case 'advance': {
      const advanced = advanceStep(session.job);
      if (!advanced.ok) return { session, toast: null };
      if (!advanced.completed) {
        return { session: { ...session, job: advanced.job }, toast: advanced.message };
      }
      // Final step performed: pay out and take the shift's toll.
      const paid = completeJob(advanced.job, session.wallet);
      if (!paid.ok) return { session, toast: null };
      return {
        session: {
          wallet: paid.wallet,
          needs: applyWorkCost(session.needs),
          job: paid.job,
        },
        toast: paid.message,
      };
    }

    case 'waakye': {
      const purchase = buy(session.wallet, WAAKYE.priceGHS);
      if (!purchase.ok) return { session, toast: null };
      return {
        session: {
          wallet: purchase.wallet,
          needs: applyMeal(session.needs),
          job: session.job,
        },
        toast: `Waakye! +${WAAKYE.hungerRestore} hunger (−${formatGHS(WAAKYE.priceGHS)})`,
      };
    }

    case 'water': {
      const purchase = buy(session.wallet, SACHET_WATER.priceGHS);
      if (!purchase.ok) return { session, toast: null };
      return {
        session: {
          wallet: purchase.wallet,
          needs: drinkWater(session.needs),
          job: session.job,
        },
        toast: `Sachet water — +${SACHET_WATER.energyRestore} energy (−${formatGHS(SACHET_WATER.priceGHS)})`,
      };
    }

    default:
      return { session, toast: null };
  }
}
