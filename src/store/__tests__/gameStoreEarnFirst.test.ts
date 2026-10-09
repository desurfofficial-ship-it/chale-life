/**
 * E-004 store session: earn-first survives the spawn drain (G-004).
 *
 * A separate FILE from gameStore.test.ts on purpose — the store is a module
 * singleton and vitest isolates module registries per file, so this file
 * runs its own pristine ordered session:
 *
 *   drain hunger 72 → 60 (four spawn minutes of starter drain, 240 × 1 s)
 *   → walk to the waakye joint (LOC-001) → the FIRST Act starts the hustle
 *   (not waakye — the E-003 hunger-proxy bug this kills; the button reads
 *   the employer prompt from the rules, never a hardcoded name) → the loop
 *   still reaches ₵35 → waakye lands ₵23 → completedIds latched exactly once.
 *
 * This is the store-level mirror of the live E-004 check: spawn, wait 60 s,
 * walk to the joint — the button must read the hustle prompt, not waakye.
 */

import { describe, expect, it } from 'vitest';
import { actPromptFor } from '../../rules/act';
import { findJobById } from '../../data/jobs';
import { DECAY_PER_SECOND } from '../../rules/needs';
import {
  getState,
  requestAct,
  setNearLocationId,
  tickNeedsDrain,
} from '../gameStore';

/** The data key — the only hustle identifier this file writes (no NPC names). */
const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';
/** Read from the rules/data, never hardcoded: the hustle prompt label. */
const HELP_LABEL = `Help ${findJobById(HUSTLE_ID)!.employerName}`;

/** One spawn minute of starter drain = 60 × 1 s store commits (~1 Hz). */
function drainOneMinute(): void {
  for (let i = 0; i < 60; i++) tickNeedsDrain(1);
}

describe('gameStore (E-004): earn-first survives the spawn drain', () => {
  it('drains hunger to 60 in four spawn minutes, then the FIRST Act starts the hustle', () => {
    // Sanity: this file owns a pristine session.
    expect(getState().wallet.balanceGHS).toBe(20);
    expect(getState().job).toEqual({ activeId: null, step: 0, completedIds: [] });

    // Four minutes at the compound gate: 3 hunger / 2 energy per minute.
    drainOneMinute();
    drainOneMinute();
    drainOneMinute();
    drainOneMinute();
    const needs = getState().needs;
    expect(needs.hunger).toBeCloseTo(60, 5); // 72 − 3/min × 4 min
    expect(needs.energy).toBeCloseTo(80 - DECAY_PER_SECOND.starter.energy * 240, 10);

    // Walk to the waakye joint (LOC-001). The E-003 hunger proxy would have
    // flipped the Act to waakye right here; G-004's completedIds flag keeps
    // it earn-first — the store-level projection says "Help <employer>".
    setNearLocationId('LOC-001');
    const s = getState();
    const prompt = actPromptFor(
      {
        wallet: { balanceGHS: s.wallet.balanceGHS },
        needs: { hunger: s.needs.hunger, energy: s.needs.energy },
        job: s.job,
      },
      s.nearLocationId
    );
    expect(prompt.label).toBe(HELP_LABEL);
    expect(prompt.enabled).toBe(true);

    // The first Act STARTS the hustle — nothing spent, history still empty.
    requestAct();
    const afterStart = getState();
    expect(afterStart.job).toEqual({
      activeId: HUSTLE_ID,
      step: 0,
      completedIds: [],
    });
    expect(afterStart.wallet.balanceGHS).toBe(20);
    expect(afterStart.toast.message).toContain('Job accepted');
  });

  it('the drained loop still pays out ₵35 and waakye lands ₵23', () => {
    // Acts 2 and 3 — steps 1/3 and 2/3, history rides along untouched.
    // G-008b: step 2 happens at Daavi's bench east of the kiosk — the
    // probe reads the waypoint for the middle press, then back to the joint.
    requestAct();
    expect(getState().job).toEqual({ activeId: HUSTLE_ID, step: 1, completedIds: [] });
    setNearLocationId('LOC-001-BENCH');
    requestAct();
    expect(getState().job).toEqual({ activeId: HUSTLE_ID, step: 2, completedIds: [] });
    expect(getState().wallet.balanceGHS).toBe(20); // pay only on completion
    setNearLocationId('LOC-001');

    // Final Act — +₵15 payout and the work toll on the drained needs.
    requestAct();
    const paid = getState();
    expect(paid.wallet.balanceGHS).toBe(35); // 20 + 15
    expect(paid.needs.hunger).toBeCloseTo(52, 5); // 60 − 8 work hunger
    expect(paid.needs.energy).toBeCloseTo(
      80 - DECAY_PER_SECOND.starter.energy * 240 - 18,
      10
    );
    // The payout latches the run history — the ONE earn-first source of truth.
    expect(paid.job).toEqual({ activeId: null, step: 0, completedIds: [HUSTLE_ID] });
    expect(paid.toast.message).toContain('+₵15');

    // Next Act at the joint sells waakye (earn-first satisfied): ₵35 → ₵23.
    requestAct();
    const fed = getState();
    expect(fed.wallet.balanceGHS).toBe(23); // 35 − 12
    expect(fed.needs.hunger).toBeCloseTo(97, 5); // 52 + 45 — no clamp this time
    expect(fed.job.completedIds).toEqual([HUSTLE_ID]); // unchanged by eating
    expect(fed.toast.message).toContain('Waakye');
  });
});
