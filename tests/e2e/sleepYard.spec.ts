/**
 * G-008b robot playtest — the proximity wiring, verified end-to-end in the
 * same software-GL browser as the E-005 loop spec — EXTENDED by G-008c:
 *
 *   (a) sleep zone: energy pinned to 40, the whole compound YARD (the
 *       isInSleepZone AABB — not the old 2.5 m gate point) offers an
 *       enabled "Sleep"; pressing it restores exactly +55 energy.
 *   (c) burst guard, made DETERMINISTIC (G-008c item 5): the payout tap,
 *       the setNeeds(50, 60) that arms the waakye offer, and 10 rapid
 *       taps all fire inside ONE evaluate call — every tap lands within
 *       a few milliseconds of the payout, so the 600 ms debounce and the
 *       1000 ms purchase lockout cover the burst on ANY CI speed (the
 *       G-008b shape depended on the burst landing within 1000 ms of a
 *       paced click — flaky on a slow runner).
 *   (b) the dead-end fix, live (G-008c item 1): at hunger 92 with ₵35 the
 *       button is NO LONGER a static "Full" — it is a disabled "Help
 *       Daavi" counting the cooldown down; the meal stays gated and the
 *       job comes back when the rest expires.
 *   (d) cooldown to the second shift: broke + on-cooldown shows the
 *       countdown reason; when it expires "Help Daavi" re-enables and a
 *       full second shift (kiosk → bench → kiosk) pays ₵15 again.
 *
 * NAME-AGNOSTIC like earnAndEat.spec.ts: labels are derived from the pure
 * rules; only data KEYS and rule outputs appear as literals.
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { actPromptFor } from '../../src/rules/act';
import { findJobById } from '../../src/data/jobs';
import { formatGHS } from '../../src/rules/economy';
import { WAAKYE_MAX_HUNGER } from '../../src/rules/needs';

/** The waakye joint / the compound (data keys). */
const WAAKYE_LOCATION_ID = 'LOC-001';
/** The starter hustle id (a data key, not an NPC name). */
const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';
const EMPLOYER_NAME = findJobById(HUSTLE_ID)!.employerName;

/** A paid guest at the joint, five seconds into the cooldown — the
 *  derivation input for the G-008c disabled-state label. */
const PAID_AT_JOINT = {
  wallet: { balanceGHS: 35 },
  needs: { hunger: 92, energy: 60 },
  job: { activeId: null, step: 0, completedIds: [HUSTLE_ID], lastPayoutAt: 0 },
  nowMs: 5_000,
} as const;

/** G-008c: mid-cooldown the button reads "Help <employer>", disabled —
 *  the meal is gated AND the rest is running (never a dead "Full"). */
const COOLDOWN_PROMPT = actPromptFor(PAID_AT_JOINT, WAAKYE_LOCATION_ID);
/** The waakye offer at the same spot once hunger is under the gate. */
const HUNGRY_PAID_LABEL = actPromptFor(
  { ...PAID_AT_JOINT, needs: { hunger: 50, energy: 60 } },
  WAAKYE_LOCATION_ID
).label;

/** The countdown reason line under the pill ("<employer> needs you again in Ns"). */
const COOLDOWN_REASON = new RegExp(`${EMPLOYER_NAME} needs you again in \\d+s`);

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

/** The earn-and-eat walk: east along the street, then north to the kiosk. */
async function walkToJoint(page: Page): Promise<void> {
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 15.0, 'eastbound');
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

  // Work the real loop to a payout: accept → kiosk → bench → kiosk.
  await page.goto('/chale-life/?debug=1&e2e=1');
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible();

  await walkToJoint(page);
  const helpButton = page.getByRole('button', { name: 'Help Daavi' });
  await holdUntil(page, 'ArrowUp', async () => helpButton.isVisible(), 'to the joint');
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();

  const workButton = page.getByRole('button', { name: 'Carry Pans' });
  await pacedClick(page, workButton); // step 1 (kiosk)

  // G-008b walk to Daavi's bench, anchored on POSITIONS (the okada at
  // 18.3/2.85 walls off the direct east line): south to the bench's z,
  // straight east through its zone, then west + north to re-enter the
  // kiosk zone for the final lift. Each leg re-anchors deterministically.
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 5.5, 'south to the bench line');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 20.4, 'east to the bench');
  await expect(workButton).toHaveAttribute('aria-disabled', 'false'); // the bench zone
  await pacedClick(page, workButton); // step 2 at the bench

  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 17.0, 'west clear of the bench');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 4.2, 'north to the kiosk zone');
  await expect(workButton).toHaveAttribute('aria-disabled', 'false'); // the kiosk zone

  // (c) THE DETERMINISTIC BURST: payout + arm + 10 taps in one evaluate —
  // every tap is within a few ms of the payout, so the 600 ms debounce and
  // the 1000 ms purchase lockout refuse them on any runner speed.
  await payoutThenBurst(page, 'Carry Pans', 10);

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible(); // unchanged
  await expect(page.getByText('Waakye!')).toHaveCount(0); // nothing was bought

  // (b) THE DEAD-END FIX, live: hunger 92 with ₵35 mid-cooldown used to
  // read a static "Full" — the moneyed player's dead end. Now the button
  // is a disabled "Help Daavi" counting the rest down (and the label is
  // derived from the same rules the store runs, cooldown fields included).
  await setNeeds(page, 92, 60);
  const coolingButton = page.getByRole('button', { name: COOLDOWN_PROMPT.label, exact: true });
  await expect(coolingButton).toHaveAttribute('aria-disabled', 'true');
  expect(COOLDOWN_PROMPT.enabled).toBe(false);
  expect(COOLDOWN_PROMPT.label).not.toContain('waakye'); // the meal stays gated
  await expect(page.getByText(COOLDOWN_REASON)).toBeVisible();
  // The pill settles into its greyed style (200 ms background transition —
  // mirrors earnAndEat.spec.ts) so the screenshot below is truthful.
  await expect(coolingButton).toHaveCSS('background-color', 'rgba(100, 116, 139, 0.3)');
  await page.screenshot({ path: shot('06-cooldown-countdown-390x844.png') });

  // Meals are NEVER cooldown-gated: once hunger is under the gate the
  // waakye offer returns immediately — and the guards have long expired,
  // so ONE normal tap buys it (₵35 → ₵23).
  await setNeeds(page, 50, 60);
  const hungryButton = page.getByRole('button', { name: HUNGRY_PAID_LABEL, exact: true });
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'false');
  expect(HUNGRY_PAID_LABEL).toContain('waakye');
  await page.waitForTimeout(1_400);
  await hungryButton.click();
  await expect(page.getByText('Waakye!')).toBeVisible();
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // Eat down to broke (₵23 → ₵11): now neither door opens — hungry enough
  // to want the meal but ₵1 short of it, and the rest is still running.
  await setNeeds(page, 30, 60);
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'false'); // still affordable
  await page.waitForTimeout(1_200);
  await hungryButton.click();
  await expect(page.getByText(formatGHS(11), { exact: true })).toBeVisible();

  await setNeeds(page, 30, 60);
  await expect(coolingButton).toHaveAttribute('aria-disabled', 'true'); // broke + mid-rest
  await expect(page.getByText(COOLDOWN_REASON)).toBeVisible();
  await expect(coolingButton).toHaveCSS('background-color', 'rgba(100, 116, 139, 0.3)');
  await page.screenshot({ path: shot('07-cooldown-broke-390x844.png') });

  // (d) the rest EXPIRES: "Help Daavi" comes back on its own — the wallet
  // can never dead-end — and a full second shift pays ₵15 again.
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false', { timeout: 60_000 });
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();

  await expect(workButton).toHaveAttribute('aria-disabled', 'false'); // step 1 at the kiosk
  await pacedClick(page, workButton);

  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 5.5, '2nd: south to the bench line');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 20.4, '2nd: east to the bench');
  await expect(workButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, workButton); // step 2 at the bench

  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 17.0, '2nd: west clear of the bench');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 4.2, '2nd: north to the kiosk zone');
  await expect(workButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClick(page, workButton); // final lift → second payout

  await expect(page.getByText(formatGHS(26), { exact: true })).toBeVisible(); // 11 + 15
  await page.screenshot({ path: shot('08-second-payout-390x844.png') });
  expect(WAAKYE_MAX_HUNGER).toBe(55); // the G-008b meal gate stands (unit-pinned boundary)
});
