/**
 * E-005 robot playtest — the earn-and-eat core loop, driven end-to-end in a
 * real browser (Chromium, software WebGL via SwiftShader, 390x844) against
 * the BUILT app (vite preview of dist/).
 *
 * Flow (one ordered robot session — the store is session state):
 *   load → HUD shows ₵20 → G-006 sleep beat at the compound (spawn IS
 *   LOC-002): Sleep → energy up, hunger −8, then the bed refuses at
 *   energy ≥ 90 ("Not tired yet") → walk to LOC-001 on the keyboard → the Act
 *   button reads the hustle prompt → Act until the payout lands (₵35) → the
 *   button flips to the waakye offer → Act → ₵23 with hunger up → walk away →
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
import { actPromptFor, resolveAct } from '../../src/rules/act';
import { findJobById } from '../../src/data/jobs';
import { formatGHS } from '../../src/rules/economy';
import { createStarterJobState, objectiveFor } from '../../src/rules/jobs';
import { SLEEP_GATE_ENERGY } from '../../src/rules/needs';

/** Data key of the starter hustle (an id, not an NPC name). */
const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';
/** The waakye joint (src/data/locations.ts). */
const WAAKYE_LOCATION_ID = 'LOC-001';
/** The Starter Compound (src/data/locations.ts) — spawn point, G-006 sleep. */
const SLEEP_LOCATION_ID = 'LOC-002';

/** A fresh guest at spawn — the derivation input for the sleep-beat labels. */
const FRESH_SESSION = {
  wallet: { balanceGHS: 20 },
  needs: { hunger: 72, energy: 80 },
  job: createStarterJobState(),
} as const;

// ── Rule-derived expectations (the name-agnostic contract) ──────────────────

/** The Act prompt for a fresh guest standing at the joint: "Help <employer>". */
const HELP_LABEL = actPromptFor(FRESH_SESSION, WAAKYE_LOCATION_ID).label;

/** The per-step Act verb while the shift is live (all starter steps share it). */
const WORK_VERB = objectiveFor({ activeId: HUSTLE_ID, step: 0 })!.actionVerb;

/** The Act prompt once the hustle has paid out this run (G-004 earn-first):
 *  "Buy waakye <price>" — G-008b: the meal needs round(hunger) ≤ 55, so
 *  the derivation session is hungry enough to actually be offered it. */
const WAAKYE_LABEL = actPromptFor(
  {
    wallet: { balanceGHS: 35 },
    needs: { hunger: 50, energy: 57 },
    job: { activeId: null, step: 0, completedIds: [HUSTLE_ID] },
  },
  WAAKYE_LOCATION_ID
).label;

/** G-006 sleep beat: a fresh guest (energy 80 < 90) is offered "Sleep". */
const SLEEP_PROMPT = actPromptFor(FRESH_SESSION, SLEEP_LOCATION_ID);
/** The sleep toast is exactly what the app's Act press commits — resolveAct
 *  on the same synthetic session the HUD will be in when the button fires. */
const SLEEP_TOAST = resolveAct(FRESH_SESSION, SLEEP_LOCATION_ID).toast ?? '';
/** At energy ≥ SLEEP_GATE_ENERGY the compound bed refuses: the button keeps
 *  the Sleep label but greys out, with the rule-side reason "Not tired yet".
 *  The HUD has no reason slot, so the reason is asserted on the rules object
 *  and the DOM gets the aria-disabled state. */
const NOT_TIRED_PROMPT = actPromptFor(
  { ...FRESH_SESSION, needs: { hunger: 64, energy: 100 } },
  SLEEP_LOCATION_ID
);

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

/** Rounded energy value from the HUD's progressbar. */
async function energyNow(page: Page): Promise<number> {
  const now = await page
    .getByRole('progressbar', { name: 'Energy' })
    .getAttribute('aria-valuenow');
  return Number(now);
}

/**
 * G-008b e2e hook (?e2e=1 — store-exposed test setter): pin exact needs so
 * the Full gate (round(hunger) ≤ 55) is deterministic regardless of how
 * much boot/walk drain preceded the assertion.
 */
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

/**
 * Human-paced Act tap (G-008b): the 600 ms debounce swallows robot-speed
 * clicks and PURCHASES stay locked 1000 ms after a payout — the robot taps
 * like a person, and buys a beat later still (ms defaults to 700; pass
 * 1200+ for purchases that follow a payout).
 */
async function pacedClick(
  page: Page,
  locator: ReturnType<Page['getByRole']>,
  ms = 700
): Promise<void> {
  await page.waitForTimeout(ms);
  await locator.click();
}

test('robot playtest: earn-and-eat loop — ₵20 → payout → waakye, then Act disables off-location', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(480_000);

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  // E-007: shipped assets must never 404 — the W-003/W-004 GLBs silently
  // 404ed in every built deploy (hard '/models/…' paths vs the vite base)
  // and only a console.warn noticed. Any failed asset fetch fails the test.
  const failedAssets: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 400 && /\/(models|basis|assets)\//.test(res.url())) {
      failedAssets.push(`${res.status()} ${res.url()}`);
    }
  });
  const shot = (name: string) => testInfo.outputPath(name);

  // ── 1. Load: HUD shows the starter wallet ────────────────────────────────
  await page.goto('/chale-life/?debug=1&e2e=1');
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible();
  const hunger0 = await hungerNow(page);
  expect(hunger0).toBeGreaterThanOrEqual(55); // starter 72 minus boot-time drain
  expect(hunger0).toBeLessThanOrEqual(72);
  const spawn = await readPos(page);
  expect(spawn.x).toBeCloseTo(-9.5, 0); // LOC-002 compound gate
  expect(spawn.z).toBeCloseTo(13.4, 0);

  await page.screenshot({ path: shot('01-start-390x844.png') });

  // ── 2. G-006 sleep beat at the compound (spawn IS LOC-002) ──────────────
  // Fresh guest: energy 80 < 90 → the bed offers Sleep for free. The press
  // restores energy (+55) at the cost of hunger (−8, you wake up hungry).
  const energyBeforeSleep = await energyNow(page);
  const hungerBeforeSleep = await hungerNow(page);
  expect(SLEEP_PROMPT.enabled, 'rules must offer Sleep to a fresh guest').toBe(true);
  const sleepButton = page.getByRole('button', { name: SLEEP_PROMPT.label, exact: true });
  await expect(sleepButton).toHaveAttribute('aria-disabled', 'false');
  await sleepButton.click();
  await expect(page.getByText(SLEEP_TOAST)).toBeVisible();
  await expect
    .poll(() => energyNow(page), { timeout: 10_000 })
    .toBeGreaterThan(energyBeforeSleep); // energy actually went up
  await expect
    .poll(() => hungerNow(page), { timeout: 10_000 })
    .toBeLessThan(hungerBeforeSleep); // you wake up hungry (−8)

  // Right after sleeping the energy sits above the SLEEP_GATE_ENERGY (90):
  // the button keeps its label but the bed refuses a second nap.
  expect(await energyNow(page)).toBeGreaterThanOrEqual(SLEEP_GATE_ENERGY);
  expect(NOT_TIRED_PROMPT.enabled).toBe(false);
  expect(NOT_TIRED_PROMPT.reason).toBe('Not tired yet');
  await expect(sleepButton).toHaveAttribute('aria-disabled', 'true');
  // The pill also settles into its greyed style (200ms background
  // transition — polling it here makes the screenshot below truthful).
  await expect(sleepButton).toHaveCSS('background-color', 'rgba(100, 116, 139, 0.3)');
  await page.screenshot({ path: shot('02-sleep-not-tired-390x844.png') });

  // ── 3. Walk east, then north, to the waakye joint (LOC-001) ─────────────
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 15.0, 'eastbound');
  // The proximity probe (≤2.5 m) flips the Act prompt to the hustle offer.
  const helpButton = page.getByRole('button', { name: HELP_LABEL });
  await holdUntil(page, 'ArrowUp', async () => helpButton.isVisible(), 'to the joint');
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false');
  // The prompt is rule-derived: it MUST name the employer from the data.
  expect(HELP_LABEL).toContain(EMPLOYER_NAME);

  // ── 4. Act: accept the hustle, work all steps until the payout ──────────
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible(); // zero-capital

  // G-008b: the three lifts are split across two spots — step 2 happens at
  // Daavi's bench (≥ 3 m east of the kiosk), so the robot WALKS there and
  // back, following the Act button's enabled edge. Each walk is bracketed
  // by a disabled assertion first, so a stale render can't fake a stop.
  const workButton = page.getByRole('button', { name: WORK_VERB });

  await expect(workButton).toHaveAttribute('aria-disabled', 'false'); // step 1 at the kiosk
  await pacedClick(page, workButton);

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
  await pacedClick(page, workButton); // final lift → payout

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible();
  await page.screenshot({ path: shot('03-wallet-35-390x844.png') });

  // ── 5. Earn-first: the joint sells waakye once the guest is hungry ──────
  // G-008b Full gate: right after the payout hunger sits above 55 ("Full")
  // — the robot pins hunger 50 with the e2e hook so the meal is offered.
  await setNeeds(page, 50, 60);
  const waakyeButton = page.getByRole('button', { name: WAAKYE_LABEL });
  await expect(waakyeButton).toHaveAttribute('aria-disabled', 'false');
  const hungerBeforeMeal = await hungerNow(page);

  // 1200 ms — past the 1000 ms post-payout purchase lockout, not just the
  // 600 ms debounce (the payout press was the robot's previous tap).
  await pacedClick(page, waakyeButton, 1200);
  await expect(page.getByText('Waakye!')).toBeVisible();
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();
  await expect
    .poll(() => hungerNow(page), { timeout: 15_000 })
    .toBeGreaterThan(hungerBeforeMeal); // the meal actually fed the player

  await page.screenshot({ path: shot('04-wallet-23-390x844.png') });

  // ── 6. Walk away: no location nearby → Act disabled, wallet untouched ───
  const idleButton = page.getByRole('button', { name: 'Act', exact: true });
  await holdUntil(page, 'ArrowDown', async () => idleButton.isVisible(), 'away from the joint');
  await expect(idleButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // ── 7. Perf budget + a clean console ───────────────────────────────
  expect(await drawCalls(page)).toBeLessThan(60);
  expect(failedAssets, 'every shipped asset must resolve').toEqual([]);
  expect(pageErrors, 'the playtest must run without page errors').toEqual([]);
});
