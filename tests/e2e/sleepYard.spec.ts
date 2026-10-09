/**
 * G-008b robot playtest — the proximity wiring, verified end-to-end in the
 * same software-GL browser as the E-005 loop spec:
 *
 *   (a) sleep zone: energy pinned to 40, the whole compound YARD (the
 *       isInSleepZone AABB — not the old 2.5 m gate point) offers an
 *       enabled "Sleep"; pressing it restores exactly +55 energy.
 *   (b) Full gate: at hunger 92 with ₵35 in pocket and the hustle worked,
 *       the joint does NOT offer waakye — the button reads "Full", disabled.
 *   (c) burst guard: 10 rapid taps right after a payout leave the wallet
 *       untouched (600 ms debounce + 1000 ms post-payout purchase lockout),
 *       and a single normal tap after the guards expire still works.
 *
 * NAME-AGNOSTIC like earnAndEat.spec.ts: labels are derived from the pure
 * rules; only data KEYS and rule outputs appear as literals.
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { actPromptFor } from '../../src/rules/act';
import { formatGHS } from '../../src/rules/economy';
import { WAAKYE_MAX_HUNGER } from '../../src/rules/needs';

/** The waakye joint / the compound (data keys). */
const WAAKYE_LOCATION_ID = 'LOC-001';

/** A paid guest at the joint — the Full-gate derivation input. */
const PAID_AT_JOINT = {
  wallet: { balanceGHS: 35 },
  needs: { hunger: 92, energy: 60 },
  job: { activeId: null, step: 0, completedIds: ['HUSTLE_AUNTY_BA_STARTER'] },
} as const;

/** "Full" — the G-008b label that replaces the waakye offer above the gate. */
const FULL_LABEL = actPromptFor(PAID_AT_JOINT, WAAKYE_LOCATION_ID).label;
/** The waakye offer at the same spot once hunger is under the gate. */
const HUNGRY_PAID_LABEL = actPromptFor(
  { ...PAID_AT_JOINT, needs: { hunger: 50, energy: 60 } },
  WAAKYE_LOCATION_ID
).label;

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
 * Fire `taps` rapid pointerdowns on the Act pill inside ONE evaluate call —
 * a true same-burst tap flurry, far tighter than any Playwright click loop.
 */
async function burstTaps(page: Page, label: string, taps: number): Promise<void> {
  await page.evaluate(
    ([buttonLabel, count]) => {
      const button = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === buttonLabel
      );
      if (!button) throw new Error(`Act pill "${buttonLabel}" not found`);
      for (let i = 0; i < count; i++) {
        button.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
        );
      }
    },
    [label, taps] as const
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

test('(c) 10 rapid taps after a payout leave ₵35 alone, then (b) Full gate at hunger 92', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(480_000);
  const shot = (name: string) => testInfo.outputPath(name);

  // Work the real loop to a payout: accept → kiosk → bench → kiosk → ₵35.
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
  await pacedClick(page, workButton); // step 3 → payout
  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible();

  // (c) 10 rapid taps after a payout: arm the meal (hunger 50 makes the
  // waakye offer ENABLED — the burst is real, not blocked by the gate),
  // then fire the flurry inside one evaluate — every tap lands within the
  // store's 600 ms debounce / 1000 ms purchase lockout of the payout.
  await setNeeds(page, 50, 60);
  const hungryButton = page.getByRole('button', { name: HUNGRY_PAID_LABEL, exact: true });
  await expect(hungryButton).toHaveAttribute('aria-disabled', 'false');
  expect(HUNGRY_PAID_LABEL).toContain('waakye');

  await burstTaps(page, HUNGRY_PAID_LABEL, 10);

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible(); // unchanged
  await expect(page.getByText('Waakye!')).toHaveCount(0); // nothing was bought

  // (b) hunger 92 with ₵35: the waakye offer must be GONE — "Full", greyed.
  await setNeeds(page, 92, 60);
  const fullButton = page.getByRole('button', { name: FULL_LABEL, exact: true });
  await expect(fullButton).toBeVisible();
  expect(FULL_LABEL).toBe('Full');
  expect(FULL_LABEL).not.toContain('waakye');
  await expect(fullButton).toHaveAttribute('aria-disabled', 'true');
  await page.screenshot({ path: shot('06-full-gate-390x844.png') });

  // The guards are a window, not a wall: after they expire, ONE normal
  // tap buys the meal — ₵35 → ₵23, hunger up.
  await setNeeds(page, 50, 60);
  await page.waitForTimeout(1_400);
  await hungryButton.click();
  await expect(page.getByText('Waakye!')).toBeVisible();
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();
  expect(WAAKYE_MAX_HUNGER).toBe(55);
});
