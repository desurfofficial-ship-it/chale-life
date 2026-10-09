/**
 * G-008b robot playtest — the proximity wiring, verified end-to-end in the
 * same software-GL browser as the E-005 loop spec — EXTENDED by G-008c,
 * RE-ROUTED by G-008d (the spot split):
 *
 *   (a) sleep zone: energy pinned to 40, the whole compound YARD (the
 *       isInSleepZone AABB — not the old 2.5 m gate point) offers an
 *       enabled "Sleep"; pressing it restores exactly +55 energy.
 *   (c) burst guard, made DETERMINISTIC (G-008c item 5): the payout tap
 *       (now the "Get paid" step AT THE JOB SPOT), the setNeeds(50, 60)
 *       that arms the meal offer, and 10 rapid taps all fire inside ONE
 *       evaluate call — every tap lands within a few milliseconds of the
 *       payout, so the 600 ms debounce and the 1000 ms purchase lockout
 *       cover the burst on ANY CI speed.
 *   (b) the dead-end fix, live (G-008c item 1, G-008d spot): at hunger 92
 *       with ₵35 the JOB SPOT button is a disabled "Help Daavi" counting
 *       the cooldown down, and the COUNTER button is "Full" — each spot
 *       states its own truth, and neither is a dead end.
 *   (d) cooldown to the second shift: when the rest expires "Help Daavi"
 *       re-enables and a full second shift (job spot → bench → job spot)
 *       pays ₵15 again; the meal is bought at the counter in between —
 *       meals are never cooldown-gated.
 *
 * NAME-AGNOSTIC like earnAndEat.spec.ts: labels are derived from the pure
 * rules; only data KEYS and rule outputs appear as literals.
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { actPromptFor } from '../../src/rules/act';
import { findJobById } from '../../src/data/jobs';
import { formatGHS } from '../../src/rules/economy';
import { WAAKYE_MAX_HUNGER } from '../../src/rules/needs';

/** The waakye joint FRONT COUNTER / the compound / the job spot (data keys). */
const WAAKYE_LOCATION_ID = 'LOC-001';
const JOB_SPOT_ID = 'LOC-001-JOB';
/** The starter hustle id (a data key, not an NPC name). */
const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';
const EMPLOYER_NAME = findJobById(HUSTLE_ID)!.employerName;
/** Per-step verbs (G-008d: each step has its own). */
const GRAB_VERB = 'Grab pans';
const CARRY_VERB = 'Carry Pans';
const PAY_VERB = 'Get paid';

/** A paid guest at the JOB SPOT, five seconds into the cooldown — the
 *  derivation input for the G-008c disabled-state label. */
const PAID_AT_JOB_SPOT = {
  wallet: { balanceGHS: 35 },
  needs: { hunger: 92, energy: 60 },
  job: { activeId: null, step: 0, completedIds: [HUSTLE_ID], lastPayoutAt: 0 },
  nowMs: 5_000,
} as const;

/** G-008c: mid-cooldown the JOB SPOT button reads "Help <employer>",
 *  disabled — the work door counts the rest down. */
const COOLDOWN_PROMPT = actPromptFor(PAID_AT_JOB_SPOT, JOB_SPOT_ID);
/** The waakye offer at the COUNTER once hunger is under the gate. */
const HUNGRY_PAID_LABEL = actPromptFor(
  { ...PAID_AT_JOB_SPOT, needs: { hunger: 50, energy: 60 } },
  WAAKYE_LOCATION_ID
).label;

/** The countdown reason line under the pill ("<employer> needs you again
 *  in Ns") — $-anchored so it matches the PILL's bare reason only, never
 *  the objective card's longer G-008e idle line. */
const COOLDOWN_REASON = new RegExp(`${EMPLOYER_NAME} needs you again in \\d+s$`);
/** G-008e: the objective card's idle line counts the SAME rest down —
 *  two surfaces, one clock, each matched by its exact shape. */
const COOLDOWN_CARD_LINE = new RegExp(
  `${EMPLOYER_NAME} needs you again in \\d+s — grab water or rest\\.`
);

// ── Robot helpers (mirrors of earnAndEat.spec.ts) ────────────────────────────

function pressKey(page: Page, code: string, down: boolean): Promise<void> {
  return page.evaluate(
    ([keyCode, isDown]) => {
      window.dispatchEvent(
        new KeyboardEvent(isDown ? 'keydown' : 'keyup', { code: keyCode })
      );
    },
    [code, down] as const
  );
}

async function readPos(page: Page): Promise<{ x: number; z: number }> {
  const text = await page.locator('.debug-overlay').innerText();
  const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  expect(m, 'debug overlay must report the position').not.toBeNull();
  return { x: Number(m![1]), z: Number(m![2]) };
}

async function hungerNow(page: Page): Promise<number> {
  return Number(
    await page.getByRole('progressbar', { name: 'Hunger' }).getAttribute('aria-valuenow')
  );
}

async function energyNow(page: Page): Promise<number> {
  return Number(
    await page.getByRole('progressbar', { name: 'Energy' }).getAttribute('aria-valuenow')
  );
}

/** G-008b e2e hook (?e2e=1 — store-exposed test setter). */
async function setNeeds(page: Page, hunger: number, energy: number): Promise<void> {
  await page.evaluate(
    ([h, e]) => {
      (
        window as unknown as {
          __chaleTest: { setNeeds: (hunger: number, energy: number) => void };
        }
      ).__chaleTest.setNeeds(h, e);
    },
    [hunger, energy] as const
  );
}

async function holdUntil(
  page: Page,
  code: string,
  done: () => Promise<boolean>,
  what: string,
  timeoutMs = 180_000
): Promise<void> {
  await pressKey(page, code, true);
  const start = Date.now();
  try {
    for (;;) {
      if (await done()) return;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`robot walk stalled (${what}, key ${code})`);
      }
      await page.waitForTimeout(120);
    }
  } finally {
    await pressKey(page, code, false);
  }
}

/**
 * G-008c item 5 — the payout tap, the setNeeds that arms the waakye
 * offer, and `taps` rapid pointerdowns all inside ONE evaluate call: a
 * single synchronous JS task, so the whole burst lands within a few ms
 * of the payout regardless of CI speed. The Act button's DOM node is
 * reused by React across the label flip (same element type, same tree
 * position — only its text child changes), so holding the reference
 * across the payout re-render is safe, and the button's closure still
 * reads enabled=true while the store-side guards do the refusing.
 */
async function payoutThenBurst(page: Page, workLabel: string, taps: number): Promise<void> {
  await page.evaluate(
    ([buttonLabel, count]) => {
      const setNeedsHook = (
        window as unknown as {
          __chaleTest: { setNeeds: (hunger: number, energy: number) => void };
        }
      ).__chaleTest.setNeeds;
      const button = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === buttonLabel
      );
      if (!button) throw new Error(`Act pill "${buttonLabel}" not found`);
      // 1. the payout tap — the final lift fires, wallet 20 → 35.
      button.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
      );
      // 2. arm the meal (the store commits synchronously; React catches up
      //    AFTER this task, so the label swap cannot race the burst).
      setNeedsHook(50, 60);
      // 3. the burst.
      for (let i = 0; i < count; i++) {
        button.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
        );
      }
    },
    [workLabel, taps] as const
  );
}

/**
 * Human-paced Act tap: the G-008b debounce (600 ms) swallows robot-speed
 * clicks, so the robot taps like a person — ≥ 650 ms between presses.
 */
async function pacedClick(page: Page, locator: ReturnType<Page['getByRole']>): Promise<void> {
  await page.waitForTimeout(700);
  await locator.click();
}

/**
 * The G-008d walk from spawn to the JOB SPOT (collider-aware): east along
 * the south pavement, north past the counter, south into the road, east
 * into the kiosk–bench corridor, north beside the kiosk's east wall, west
 * into the 0.9 m job-spot zone — the same route earnAndEat.spec.ts
 * drives. G-008e merge fix: the corridor between the crate stack (x ≤
 * 17.62) and the bench mesh (x ≥ 20.7) is clear since the okada moved
 * east of the bench, so the robot turns north at x 19 — the old x 20
 * line drove its capsule straight into the bench mesh's south face.
 */
async function walkToJobSpot(page: Page): Promise<void> {
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 15.0, 'eastbound');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 3.4, 'north past the counter');
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 4.7, 'south into the road');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 19.0, 'east into the corridor');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 0.6, 'north beside the kiosk wall');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 18.5, 'west into the job spot');
}

/**
 * The JOB SPOT → COUNTER walk (meals live at the front counter now):
 * south into the road (nothing solid sits south of the job spot since
 * the okada moved east of the bench), west along it, north into the
 * counter's zone.
 */
async function walkToCounter(page: Page): Promise<void> {
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 4.7, 'south into the road');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 16.8, 'west along the road');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 3.4, 'north to the counter');
}

/**
 * The COUNTER → JOB SPOT walk back: south into the road, east into the
 * kiosk–bench corridor (x 19 — clear of the bench mesh's west face),
 * north beside the kiosk wall, west into the zone.
 */
async function walkBackToJobSpot(page: Page): Promise<void> {
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 4.7, 'back south into the road');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 19.0, 'back east into the corridor');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 0.6, 'back north beside the wall');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 18.5, 'back west into the job spot');
}

test('(a) sleep zone: the whole yard offers Sleep and +55 energy', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(240_000);
  const shot = (name: string) => testInfo.outputPath(name);

  await page.goto('/chale-life/?debug=1&e2e=1');
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible();

  // Pin energy 40 — low enough that +55 lands UNDER the 100 cap, so the
  // restore is exactly +55 (a capped sleep would only show +20 from 80).
  await setNeeds(page, 60, 40);
  await expect
    .poll(() => energyNow(page), { timeout: 10_000 })
    .toBe(40);

  // The spawn (z≈13.4) sits on the gate apron INSIDE the yard AABB — the
  // Act button must read Sleep and be enabled right here.
  const sleepButton = page.getByRole('button', { name: 'Sleep', exact: true });
  await expect(sleepButton).toBeVisible();
  await expect(sleepButton).toHaveAttribute('aria-disabled', 'false');

  // Walk INTO the yard — south through the 3 m gate opening (+z is south):
  // past the gate point's 2.5 m radius (z > 15.9) the ZONE, not the point,
  // is what keeps Sleep on the button. Walk to the house door area.
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 17, 'into the yard');
  const inYard = await readPos(page);
  expect(inYard.x).toBeGreaterThanOrEqual(-16); // inside the SLEEP_ZONE AABB
  expect(inYard.x).toBeLessThanOrEqual(-4);
  expect(inYard.z).toBeGreaterThanOrEqual(13);
  expect(inYard.z).toBeGreaterThan(15.9); // OUTSIDE the old 2.5 m gate point
  await expect(sleepButton).toHaveAttribute('aria-disabled', 'false');

  await page.screenshot({ path: shot('05-sleep-in-yard-390x844.png') });

  // Press it: exactly +55 energy (40 → ~95, uncapped), −8 hunger, free.
  const hungerBefore = await hungerNow(page);
  await sleepButton.click();
  await expect(page.getByText('Slept at the compound — +55 energy')).toBeVisible();
  // Rounding-tolerant: the 1 Hz drain may shave a fraction off the exact
  // pins — the toast above already proves the +55 restore verbatim.
  await expect.poll(() => energyNow(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(94);
  await expect.poll(() => energyNow(page), { timeout: 10_000 }).toBeLessThanOrEqual(95);
  await expect
    .poll(() => hungerNow(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(hungerBefore - 9); // you wake up hungry (−8)
  await expect
    .poll(() => hungerNow(page), { timeout: 10_000 })
    .toBeLessThanOrEqual(hungerBefore - 7);
});

test('(c) deterministic burst after a payout, (b) the dead-end fix, (d) cooldown to the second shift', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(600_000);
  const shot = (name: string) => testInfo.outputPath(name);

  // Work the real loop to a payout: hire at the JOB SPOT → grab → bench
  // → get paid.
  await page.goto('/chale-life/?debug=1&e2e=1');
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible();

  await walkToJobSpot(page);
  const helpButton = page.getByRole('button', { name: 'Help Daavi' });
  await expect(helpButton).toBeVisible(); // the zone probe already reads LOC-001-JOB
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();

  // Step 1 fires right here — the player is standing at the job spot.
  const grabButton = page.getByRole('button', { name: GRAB_VERB });
  await expect(grabButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, grabButton); // step 1 (job spot)

  // Walk to Daavi's bench on the north pavement (G-008d): east along the
  // kiosk's north side (clear of the okada's z-band), then south into
  // the zone. The stop keys on the button flipping ENABLED — 'Carry
  // Pans' also renders disabled at wrong spots mid-shift.
  const carryButton = page.getByRole('button', { name: CARRY_VERB });
  await expect(carryButton).toHaveAttribute('aria-disabled', 'true'); // not there yet
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 20.0, 'east to the bench line');
  await holdUntil(
    page,
    'ArrowDown',
    async () => (await carryButton.getAttribute('aria-disabled')) === 'false',
    'south into the bench zone'
  );
  await expect(carryButton).toHaveAttribute('aria-disabled', 'false'); // the bench zone
  await pacedClick(page, carryButton); // step 2 at the bench

  // Back to the job spot for the final lift + pay.
  const payButton = page.getByRole('button', { name: PAY_VERB });
  await expect(payButton).toHaveAttribute('aria-disabled', 'true'); // not there yet
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 0.6, 'north beside the wall');
  await holdUntil(
    page,
    'ArrowLeft',
    async () => (await payButton.getAttribute('aria-disabled')) === 'false',
    'west into the job spot'
  );
  await expect(payButton).toHaveAttribute('aria-disabled', 'false');

  // (c) THE DETERMINISTIC BURST: payout + arm + 10 taps in one evaluate —
  // every tap is within a few ms of the payout, so the 600 ms debounce and
  // the 1000 ms purchase lockout refuse them on any runner speed.
  await payoutThenBurst(page, PAY_VERB, 10);

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible(); // unchanged
  await expect(page.getByText('Waakye!')).toHaveCount(0); // nothing was bought

  // (b) THE DEAD-END FIX, live: hunger 92 with ₵35 mid-cooldown reads a
  // disabled "Help Daavi" counting the rest down AT THE JOB SPOT — while
  // the COUNTER (its own spot now) states its own truth: "Full". Neither
  // is a dead end: the rest expires below, the meal is bought in between.
  await setNeeds(page, 92, 60);
  const coolingButton = page.getByRole('button', { name: COOLDOWN_PROMPT.label, exact: true });
  await expect(coolingButton).toHaveAttribute('aria-disabled', 'true');
  expect(COOLDOWN_PROMPT.enabled).toBe(false);
  expect(COOLDOWN_PROMPT.label).not.toContain('waakye'); // the meal stays gated
  await expect(page.getByText(COOLDOWN_REASON)).toBeVisible(); // the pill
  // G-008e: the objective card reads the cooldown too — one clock on two
  // surfaces, so the hint can't contradict the button mid-rest.
  await expect(page.getByText(COOLDOWN_CARD_LINE)).toBeVisible();
  // The pill settles into its greyed style (200 ms background transition —
  // mirrors earnAndEat.spec.ts) so the screenshot below is truthful.
  await expect(coolingButton).toHaveCSS('background-color', 'rgba(100, 116, 139, 0.3)');
  await page.screenshot({ path: shot('06-cooldown-countdown-390x844.png') });

  // Meals are NEVER cooldown-gated — and they live at the COUNTER now:
  // the robot walks over (guards long expired) and ONE tap buys it.
  await setNeeds(page, 50, 60);
  const hungryButton = page.getByRole('button', { name: HUNGRY_PAID_LABEL, exact: true });
  expect(HUNGRY_PAID_LABEL).toContain('waakye');
  await walkToCounter(page);
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'false');
  await page.waitForTimeout(1_200);
  await hungryButton.click();
  await expect(page.getByText('Waakye!')).toBeVisible();
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // Eat down to broke (₵23 → ₵11): the counter's purse gate takes over —
  // "Not enough cash" is ITS truth, never a work answer.
  await setNeeds(page, 30, 60);
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'false'); // hunger 30 ≤ 80
  await page.waitForTimeout(1_200);
  await hungryButton.click();
  await expect(page.getByText(formatGHS(11), { exact: true })).toBeVisible();
  await setNeeds(page, 30, 60);
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'true'); // broke
  await page.screenshot({ path: shot('07-counter-broke-390x844.png') });

  // (d) the rest EXPIRES: back at the job spot "Help Daavi" comes back on
  // its own — the wallet can never dead-end — and a full second shift
  // pays ₵15 again.
  await walkBackToJobSpot(page);
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false', { timeout: 90_000 });
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();

  await expect(grabButton).toHaveAttribute('aria-disabled', 'false'); // step 1 here
  await pacedClick(page, grabButton);

  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 20.0, '2nd: east to the bench line');
  await holdUntil(
    page,
    'ArrowDown',
    async () => (await carryButton.getAttribute('aria-disabled')) === 'false',
    '2nd: south into the bench zone'
  );
  await expect(carryButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, carryButton); // step 2 at the bench

  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 0.6, '2nd: north beside the wall');
  await holdUntil(
    page,
    'ArrowLeft',
    async () => (await payButton.getAttribute('aria-disabled')) === 'false',
    '2nd: west into the job spot'
  );
  await expect(payButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, payButton); // final lift → second payout

  await expect(page.getByText(formatGHS(26), { exact: true })).toBeVisible(); // 11 + 15
  await page.screenshot({ path: shot('08-second-payout-390x844.png') });
  expect(WAAKYE_MAX_HUNGER).toBe(80); // the G-008d meal gate stands (unit-pinned boundary)
});
