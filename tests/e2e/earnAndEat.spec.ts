/**
 * E-005 robot playtest — the earn-and-eat core loop, driven end-to-end in a
 * real browser (Chromium, software WebGL via SwiftShader, 390x844) against
 * the BUILT app (vite preview of dist/) — G-008d edition: the hustle lives
 * at the JOB SPOT (kiosk's east side), the bench on the north pavement,
 * and the front counter sells food only.
 *
 * Flow (one ordered robot session — the store is session state):
 *   load → HUD shows ₵20 → G-006 sleep beat at the compound (spawn IS
 *   LOC-002): Sleep → energy up, hunger −8, then the bed refuses at
 *   energy ≥ 90 ("Not tired yet") → walk to the JOB SPOT on the keyboard
 *   → the Act button reads the hustle prompt → Act (grab) → walk to the
 *   bench → Act (carry) → walk back → Act (get paid, ₵35) → walk to the
 *   front counter → the meal offer → Act → ₵23 with hunger up → walk away
 *   → Act disabled.
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
/** The waakye joint FRONT COUNTER (src/data/locations.ts) — food only. */
const WAAKYE_LOCATION_ID = 'LOC-001';
/** The job spot waypoint (proximity.ts, G-008d) — hire + steps 1/3. */
const JOB_SPOT_ID = 'LOC-001-JOB';
/** The bench waypoint (proximity.ts) — step 2. */
const BENCH_ID = 'LOC-001-BENCH';
/** The Starter Compound (src/data/locations.ts) — spawn point, G-006 sleep. */
const SLEEP_LOCATION_ID = 'LOC-002';

/** A fresh guest at spawn — the derivation input for the sleep-beat labels. */
const FRESH_SESSION = {
  wallet: { balanceGHS: 20 },
  needs: { hunger: 72, energy: 80 },
  job: createStarterJobState(),
} as const;

// ── Rule-derived expectations (the name-agnostic contract) ──────────────────

/** The Act prompt for a fresh guest standing at the JOB SPOT: "Help <employer>". */
const HELP_LABEL = actPromptFor(FRESH_SESSION, JOB_SPOT_ID).label;

/** The per-step Act verbs (G-008d: each step has its own). */
const GRAB_VERB = objectiveFor({ activeId: HUSTLE_ID, step: 0 })!.actionVerb;
const CARRY_VERB = objectiveFor({ activeId: HUSTLE_ID, step: 1 })!.actionVerb;
const PAY_VERB = objectiveFor({ activeId: HUSTLE_ID, step: 2 })!.actionVerb;

/** The Act prompt once the hustle has paid out this run: "Buy waakye <price>"
 *  at the counter — G-008d: the meal gate is 80, so the derivation session
 *  (hunger 50) is well under it. */
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

  // ── 3. Walk east to the kiosk block, then around to the JOB SPOT ──────
  // G-008d route (collider-aware): east along the south pavement to the
  // kiosk's x, north past the counter, back south into the road, east
  // past the okada, north beside the kiosk's east wall, west into the
  // job spot's 0.9 m zone.
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 15.0, 'eastbound');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 3.4, 'north past the counter');
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 4.7, 'south into the road');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 20.0, 'east past the okada');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= 0.6, 'north beside the kiosk wall');
  // The proximity probe (the 0.9 m job-spot zone) flips the Act prompt.
  const helpButton = page.getByRole('button', { name: HELP_LABEL });
  await holdUntil(page, 'ArrowLeft', async () => helpButton.isVisible(), 'west into the job spot');
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false');
  // The prompt is rule-derived: it MUST name the employer from the data.
  expect(HELP_LABEL).toContain(EMPLOYER_NAME);

  // ── 4. Act: accept the hustle, work all steps until the payout ──────────
  await pacedClick(page, helpButton);
  await expect(page.getByText('Job accepted')).toBeVisible();
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible(); // zero-capital

  // G-008d: the three lifts span two spots with per-step verbs — grab
  // (job spot), carry (bench), get paid (job spot). Each walk is
  // bracketed by a disabled assertion first, so a stale render can't
  // fake a stop.
  const grabButton = page.getByRole('button', { name: GRAB_VERB });
  await expect(grabButton).toHaveAttribute('aria-disabled', 'false'); // step 1 here
  await pacedClick(page, grabButton);

  // Walk to Daavi's bench on the north pavement: east along the kiosk's
  // north side (clear of the okada's z-band), then south into the zone.
  // NOTE: the stop keys on the button flipping ENABLED — 'Carry Pans'
  // also renders disabled at wrong spots mid-shift.
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
  await pacedClick(page, payButton); // final lift → payout

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible();
  await page.screenshot({ path: shot('03-wallet-35-390x844.png') });

  // ── 5. The front counter sells waakye once the guest is hungry ──────
  // G-008d: the meal lives at the counter (west of the job spot) — the
  // robot pins hunger 50 with the e2e hook, walks over, buys.
  await setNeeds(page, 50, 60);
  const waakyeButton = page.getByRole('button', { name: WAAKYE_LABEL });
  // Collider-aware meal route: east past the okada first, south into the
  // road, west along it, then north to the counter's zone.
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= 19.8, 'east past the okada');
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= 4.7, 'south into the road');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= 16.8, 'west along the road');
  await holdUntil(page, 'ArrowUp', async () => waakyeButton.isVisible(), 'north to the counter');
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
  await holdUntil(page, 'ArrowDown', async () => idleButton.isVisible(), 'away from the counter');
  await expect(idleButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // ── 7. Perf budget + a clean console ───────────────────────────────
  expect(await drawCalls(page)).toBeLessThan(60);
  expect(failedAssets, 'every shipped asset must resolve').toEqual([]);
  expect(pageErrors, 'the playtest must run without page errors').toEqual([]);
});
