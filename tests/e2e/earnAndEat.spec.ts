/**
 * E-005 robot playtest — the earn-and-eat core loop, driven end-to-end in a
 * real browser (Chromium, software WebGL via SwiftShader, 390x844) against
 * the BUILT app (vite preview of dist/).
 *
 * Flow (one ordered robot session — the store is session state):
 *   load → HUD shows ₵20 → walk to LOC-001 on the keyboard → the Act button
 *   reads the hustle prompt → Act until the payout lands (₵35) → the button
 *   flips to the waakye offer → Act → ₵23 with hunger up → walk away →
 *   Act disabled.
 *
 * NAME-AGNOSTIC BY CONSTRUCTION: every expected button label is derived at
 * runtime from the pure rules (actPromptFor / objectiveFor) and the data
 * (findJobById(...).employerName). This file never hardcodes an NPC name,
 * so the upcoming employer rename cannot break it. Only data KEYS (job ids)
 * and generic rule outputs ('Act') appear as literals.
 *
 * Page errors fail the test (collected via pageerror; the known upstream
 * THREE.Clock deprecation is a console warning, not a page error).
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { actPromptFor } from '../../src/rules/act';
import { findJobById } from '../../src/data/jobs';
import { formatGHS } from '../../src/rules/economy';
import { createStarterJobState, objectiveFor } from '../../src/rules/jobs';

/** Data key of the starter hustle (an id, not an NPC name). */
const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';
/** The waakye joint (src/data/locations.ts). */
const WAAKYE_LOCATION_ID = 'LOC-001';

// ── Rule-derived expectations (the name-agnostic contract) ──────────────────

/** The Act prompt for a fresh guest standing at the joint: "Help <employer>". */
const HELP_LABEL = actPromptFor(
  {
    wallet: { balanceGHS: 20 },
    needs: { hunger: 72, energy: 80 },
    job: createStarterJobState(),
  },
  WAAKYE_LOCATION_ID
).label;

/** The per-step Act verb while the shift is live (all starter steps share it). */
const WORK_VERB = objectiveFor({ activeId: HUSTLE_ID, step: 0 })!.actionVerb;

/** The Act prompt once the hustle has paid out this run (G-004 earn-first):
 *  "Buy waakye <price>" — the meal price comes from the data via the rules. */
const WAAKYE_LABEL = actPromptFor(
  {
    wallet: { balanceGHS: 35 },
    needs: { hunger: 56, energy: 57 },
    job: { activeId: null, step: 0, completedIds: [HUSTLE_ID] },
  },
  WAAKYE_LOCATION_ID
).label;

const EMPLOYER_NAME = findJobById(HUSTLE_ID)!.employerName;

// ── Robot helpers ────────────────────────────────────────────────────────────

/** Synthetic keyboard — the input manager listens for `code` on window. */
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

/** Player position from the ?debug=1 overlay ("pos  <x> / <z>"). */
async function readPos(page: Page): Promise<{ x: number; z: number }> {
  const text = await page.locator('.debug-overlay').innerText();
  const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  expect(m, 'debug overlay must report the position').not.toBeNull();
  return { x: Number(m![1]), z: Number(m![2]) };
}

/** Rounded hunger value from the HUD's progressbar. */
async function hungerNow(page: Page): Promise<number> {
  const now = await page
    .getByRole('progressbar', { name: 'Hunger' })
    .getAttribute('aria-valuenow');
  return Number(now);
}

/** Draw calls from the ?debug=1 overlay. */
async function drawCalls(page: Page): Promise<number> {
  const text = await page.locator('.debug-overlay').innerText();
  return Number(text.match(/dc\s+(\d+)/)?.[1] ?? Number.POSITIVE_INFINITY);
}

/**
 * Hold a movement key until `done()` fires (polled — fps-independent under
 * software rendering), then release. Fails with the key UP so the robot
 * never walks forever on a timeout.
 */
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

test('robot playtest: earn-and-eat loop — ₵20 → payout → waakye, then Act disables off-location', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(480_000);

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const shot = (name: string) => testInfo.outputPath(name);

  // ── 1. Load: HUD shows the starter wallet ────────────────────────────────
  await page.goto('/chale-life/?debug=1');
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible();
  const hunger0 = await hungerNow(page);
  expect(hunger0).toBeGreaterThanOrEqual(55); // starter 72 minus boot-time drain
  expect(hunger0).toBeLessThanOrEqual(72);
  const spawn = await readPos(page);
  expect(spawn.x).toBeCloseTo(-9.5, 0); // LOC-002 compound gate
  expect(spawn.z).toBeCloseTo(13.4, 0);

  await page.screenshot({ path: shot('01-start-390x844.png') });

  // ── 2. Walk east, then north, to the waakye joint (LOC-001) ─────────────
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 15.0, 'eastbound');
  // The proximity probe (≤2.5 m) flips the Act prompt to the hustle offer.
  const helpButton = page.getByRole('button', { name: HELP_LABEL });
  await holdUntil(page, 'ArrowUp', async () => helpButton.isVisible(), 'to the joint');
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false');
  // The prompt is rule-derived: it MUST name the employer from the data.
  expect(HELP_LABEL).toContain(EMPLOYER_NAME);

  // ── 3. Act: accept the hustle, work all steps until the payout ──────────
  await helpButton.click();
  await expect(page.getByText('Job accepted')).toBeVisible();
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible(); // zero-capital

  // Three work steps (objectiveFor verbs) — the last one pays +₵15.
  for (let step = 0; step < 3; step++) {
    const workButton = page.getByRole('button', { name: WORK_VERB });
    await expect(workButton).toHaveAttribute('aria-disabled', 'false');
    await workButton.click();
  }
  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible();
  await page.screenshot({ path: shot('02-wallet-35-390x844.png') });

  // ── 4. Earn-first: the joint now sells waakye (not a re-hire) ───────────
  const waakyeButton = page.getByRole('button', { name: WAAKYE_LABEL });
  await expect(waakyeButton).toHaveAttribute('aria-disabled', 'false');
  const hungerBeforeMeal = await hungerNow(page);

  await waakyeButton.click();
  await expect(page.getByText('Waakye!')).toBeVisible();
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();
  await expect
    .poll(() => hungerNow(page), { timeout: 15_000 })
    .toBeGreaterThan(hungerBeforeMeal); // the meal actually fed the player

  await page.screenshot({ path: shot('03-wallet-23-390x844.png') });

  // ── 5. Walk away: no location nearby → Act disabled, wallet untouched ───
  const idleButton = page.getByRole('button', { name: 'Act', exact: true });
  await holdUntil(page, 'ArrowDown', async () => idleButton.isVisible(), 'away from the joint');
  await expect(idleButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // ── 6. Perf budget + a clean console ─────────────────────────────────────
  expect(await drawCalls(page)).toBeLessThan(150);
  expect(pageErrors, 'the playtest must run without page errors').toEqual([]);
});
