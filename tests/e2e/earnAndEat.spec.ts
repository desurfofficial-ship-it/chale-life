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
 * Enter the 0.9 m job disc (centre (−122.9, −2.4)) and stop near its
 * CENTRE: a full-speed holdUntil release AT the r 0.9 edge coasts the
 * capsule out of the disc on a slow/loaded runner (HUD-poll lag plus
 * post-release inertia — the first CI run's hire press then found the
 * pill relabelled to bare 'Act', and the two-leg run-in/creep-back
 * dance fights itself: each leg's release adds coast out of the OPPOSITE
 * edge). So the fast legs halt on position predicates only, and this
 * creep finishes the entry in short bursts (160 ms press / 120 ms
 * pause), re-choosing the axis and direction every burst — burst speed
 * caps both the lag and the coast, so the capsule settles at r ≤ 0.5
 * where even the burst coast cannot reach the 0.9 m edge. The disc
 * interior is collider-clear (probe: zero boxes under the r 1.2
 * bounding square).
 */
async function creepIntoJobSpot(page: Page, what: string): Promise<void> {
  const start = Date.now();
  for (;;) {
    const p = await readPos(page);
    const r2 = (p.x + 122.9) ** 2 + (p.z + 2.4) ** 2;
    if (r2 <= 0.25) return; // r ≤ 0.5 — inside the disc with edge margin
    if (Date.now() - start > 150_000) {
      throw new Error(`creep into the job spot stalled (${what}) at ${JSON.stringify(p)}`);
    }
    const dx = p.x + 122.9;
    const dz = p.z + 2.4;
    const code =
      Math.abs(dz) > Math.abs(dx)
        ? dz > 0 ? 'ArrowUp' : 'ArrowDown'
        : dx > 0 ? 'ArrowLeft' : 'ArrowRight';
    await pressKey(page, code, true);
    await page.waitForTimeout(160);
    await pressKey(page, code, false);
    await page.waitForTimeout(120);
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

/**
 * Human-paced Act tap that must land INSIDE the 0.9 m job disc: the
 * capsule coasts after every key release, and on a near-real-time runner
 * the 700 ms pacing pause alone can carry it OUT of the disc — the pill
 * flips to bare 'Act', the locator never resolves, and the click burns
 * the whole test budget waiting (CI 2026-10-13 lost earnAndEat + sleepYard
 * (c) to exactly this on a faster runner than the routes were tuned on).
 * So the click gets a short timeout, and if the label went absent the
 * creep re-settles the capsule at r ≤ 0.5 (where burst coast cannot reach
 * the edge) and the click retries — speed-agnostic by construction. The
 * shift state lives in the store, so only the position was ever wrong.
 */
async function pacedClickInSpot(
  page: Page,
  locator: ReturnType<Page['getByRole']>,
  reenter: () => Promise<void>
): Promise<void> {
  await page.waitForTimeout(700);
  try {
    await locator.click({ timeout: 4_000 });
  } catch {
    await reenter();
    await locator.click({ timeout: 15_000 });
  }
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
  expect(spawn.x).toBeCloseTo(-136, 0); // LOC-002 sleep yard (ACCRA MAP plot)
  expect(spawn.z).toBeCloseTo(-2, 0);

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
  // G-008e route on the MERGED world (Agent 3's #28 moved the okada to
  // 23.6, 2.85 — footprint x 22.64–24.56 — which SEALS the old okada–
  // bench pavement gap at 0.34 m but OPENS the pavement west of the
  // bench): east along the south pavement, north past the counter, east
  // along the north pavement (x 17.45–20.35 is open — the bench west
  // face pins any overshoot harmlessly past the x 18.6 goal), north into
  // the job-spot band (descent target z 0.85 keeps the freeze inside the
  // zone's westbound flip band |z| ≤ 0.9 even at full ~1.6 m poll drift),
  // west into the 0.9 m zone.
  // ACCRA MAP route: east out of the sleep yard (zone x1 = −131), then
  // east along the clear z ≈ −2 corridor (0.25 m north of the kiosk face),
  // two-stage into the 0.9 m job disc at (−122.9, −2.4).
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= -130.6, 'east out of the sleep yard');
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= -1.5, 'south onto the pavement line');
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= -124.3, 'east along the plot to the job-spot column');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= -2.0, 'north into the job-spot band');
  // The proximity probe (the 0.9 m job-spot zone) flips the Act prompt —
  // the entry creeps to the disc centre (see creepIntoJobSpot) so the
  // prompt flips ON and STAYS on through the hire press.
  await creepIntoJobSpot(page, 'hire');
  const helpButton = page.getByRole('button', { name: HELP_LABEL });
  await expect(helpButton).toHaveAttribute('aria-disabled', 'false');
  // The prompt is rule-derived: it MUST name the employer from the data.
  expect(HELP_LABEL).toContain(EMPLOYER_NAME);

  // ── 4. Act: accept the hustle, work all steps until the payout ──────────
  await pacedClickInSpot(page, helpButton, () => creepIntoJobSpot(page, 'hire retry'));
  await expect(page.getByText('Job accepted')).toBeVisible();
  await expect(page.getByText(formatGHS(20), { exact: true })).toBeVisible(); // zero-capital

  // G-008d: the three lifts span two spots with per-step verbs — grab
  // (job spot), carry (bench), get paid (job spot). Each walk is
  // bracketed by a disabled assertion first, so a stale render can't
  // fake a stop.
  const grabButton = page.getByRole('button', { name: GRAB_VERB });
  await expect(grabButton).toHaveAttribute('aria-disabled', 'false'); // step 1 here
  await pacedClick(page, grabButton);

  // Walk to Daavi's bench. ACCRA MAP (collider-probed): the straight west
  // walk at the job spot's z (−2.4) is SEALED — the kiosk body (x −128…−125,
  // z −4.6…−2.6) and its front counter slab (z −2.65…−2.05) block the
  // capsule at x ≈ −124.55 (the robot grinds into the east face). The clear
  // corridor is the z ≈ −1.5 pavement line (probed clear −1.5…+0.3 for the
  // full west run): south onto the pavement line, then west into the r 2.5
  // bench zone (the flip fires at x ≤ −130.2 on this line; aiming x ≤ −131
  // keeps every drift overshoot inside it). The −1.5 target also leaves
  // ~1.9 m of headroom to the bollard pocket at (−125.2, 0.8): the HUD
  // position lags the true capsule by up to ~1.1 m under software GL, and
  // an overshoot past +0.37 would pin the west walk on the bollard's
  // z-band (seen live at (−124.82, +0.46) with a −0.6 target).
  const carryButton = page.getByRole('button', { name: CARRY_VERB });
  await expect(carryButton).toHaveAttribute('aria-disabled', 'true'); // not there yet (≥ 3 m from the bench zone)
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= -1.5, 'south onto the pavement line');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= -131.0, 'west along the pavement into the bench zone');
  await expect(carryButton).toHaveAttribute('aria-disabled', 'false'); // the bench zone
  await pacedClick(page, carryButton); // step 2 at the bench

  // Back to the job spot for the final lift + pay — east along the
  // pavement line (probed clear at z −1.5…−1.0), two-stage into the
  // 0.9 m job disc.
  const payButton = page.getByRole('button', { name: PAY_VERB });
  await expect(payButton).toHaveAttribute('aria-disabled', 'true'); // not there yet
  await holdUntil(page, 'ArrowRight', async () => (await readPos(page)).x >= -124.3, 'east back to the job-spot column');
  await holdUntil(page, 'ArrowUp', async () => (await readPos(page)).z <= -2.0, 'north into the job-spot band');
  // Final approach keys on the ZONE itself (the same disc the probe uses,
  // r 0.9 at (−122.9, −2.4)) — a button-locator condition would block on
  // the pill relabelling between zones. The creep entry stops at the disc
  // centre so the prompt flips ON and stays on through the pay press.
  await creepIntoJobSpot(page, 'pay');
  await expect(payButton).toHaveAttribute('aria-disabled', 'false');
  await pacedClickInSpot(page, payButton, () => creepIntoJobSpot(page, 'pay retry')); // final lift → payout

  await expect(page.getByText(formatGHS(35), { exact: true })).toBeVisible();
  await page.screenshot({ path: shot('03-wallet-35-390x844.png') });

  // ── 5. The front counter sells waakye once the guest is hungry ──────
  // G-008d: the meal lives at the counter (west of the job spot) — the
  // robot pins hunger 50 with the e2e hook, walks over, buys.
  await setNeeds(page, 50, 60);
  const waakyeButton = page.getByRole('button', { name: WAAKYE_LABEL });
  // Collider-aware meal route (ACCRA MAP, probed): south out of the
  // job-spot band onto the pavement line (z −1.4 — north of the counter
  // slab, clear all the way), then west into the counter's r 2.5 zone —
  // the flip fires at x ≤ −124.03; −124.5 stops 0.5 m inside it.
  await holdUntil(page, 'ArrowDown', async () => (await readPos(page)).z >= -1.4, 'south onto the pavement line');
  await holdUntil(page, 'ArrowLeft', async () => (await readPos(page)).x <= -124.5, 'west into the counter zone');
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
  // CI-hardened route (probe evidence, scripts scans): the straight south
  // walk from the waakye stop pins on the counter slab for west-drift
  // stops (a box blocks x ≤ −125.5 at z ≈ −1.70; CI's slower dt profile
  // never slides the capsule around it — the pin cost the first CI run
  // this spec). So: first reposition EAST onto the slab-safe column —
  // eastward legs are HUD-lag-safe (the true capsule is always further
  // east than the polled HUD x, so done() at x ≥ −124.45 guarantees the
  // true capsule clears the slab) — then straight south: the counter disc
  // flips to bare Act at z ≈ −0.5…−0.35 and the corridor stays bare and
  // collider-clear past z +3 (the job-spot disc never reaches x −124.4;
  // LOC-004's zone stays ≥ 3.7 m east).
  await holdUntil(
    page,
    'ArrowRight',
    async () => (await readPos(page)).x >= -124.45,
    'east onto the slab-safe column'
  );
  const idleButton = page.getByRole('button', { name: 'Act', exact: true });
  await holdUntil(page, 'ArrowDown', async () => idleButton.isVisible(), 'south off the plot, away from every zone');
  await expect(idleButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(formatGHS(23), { exact: true })).toBeVisible();

  // ── 7. Perf budget + a clean console ─────────────────────────────
  // ACCRA MAP budget (re-derived): the batched street view measures 379
  // draws (the v6 viewer reports ~163 at overview + instanced nature);
  // the guard's job is to catch the UNBATCHED regression (measured 3992
  // when SceneBatcher was skipped), not to pin the old starter map's 60.
  expect(await drawCalls(page)).toBeLessThan(450);
  expect(failedAssets, 'every shipped asset must resolve').toEqual([]);
  expect(pageErrors, 'the playtest must run without page errors').toEqual([]);
});
