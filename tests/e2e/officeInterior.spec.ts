/**
 * O-001 audit e2e — office interiors are immediately visible and the lift is
 * genuinely usable (Reality-Check directive, PRIORITY 1).
 *
 * Two regressions locked in:
 * 1. CAMERA REACH: CITY_BOUNDS.minZ was −116 with a hard 20 m clamp margin,
 *    so the follow camera parked at z −96 while NorthReach offices sit at
 *    z −139…−152 — the walker left the screen and no cutaway could open by
 *    proximity. Now the camera must follow a teleport to the Gold Coast Bank
 *    and keep the walker inside the viewport (scr line of ?debug=1).
 * 2. LIFT TRAVEL: requestPlayerFloor → LOOK/SCAN scheduler → board/alight
 *    events flip player.floor; the visitor floor buttons in OfficePanel call
 *    the same store path. The car position (liftPos) must actually move.
 *
 * Business cutaway parity (proximity-open + GLB props for every trade) is
 * covered live by the dc guard inside earnAndEat.spec.ts (route passes
 * Kwame's barber) — draw calls must stay under the 450 budget there.
 */
import { expect, test } from '@playwright/test';

const BANK_ID = 'OFF_GOLD_COAST_BANK';
const BANK_STAND_X = 163;
const BANK_STAND_Z = -139; // 13 m south of the bank site (163, −152)

interface OfficeProbe {
  selected: string | null;
  viewFloor: number | null;
  playerFloor: number | null;
  inLift: boolean;
  liftPos: number | null;
}

async function readScr(page: import('@playwright/test').Page) {
  const text = await page
    .locator('.debug-overlay')
    .innerText()
    .catch(() => '');
  const m = text.match(/scr\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

test('office interior reachable at street zoom + lift carries the player', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('/chale-life/?e2e=1&debug=1');
  await expect(page.getByText('₵20', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => page.evaluate(() => !!(window as unknown as { __chaleOffice?: unknown }).__chaleOffice),
      { timeout: 30_000 },
    )
    .toBe(true);

  // ── 1. camera follows a teleport to the business park (clamp regression) ──
  await page.evaluate(
    ([x, z]) => (window as unknown as { __chaleTest: { teleport: (x: number, z: number) => void } }).__chaleTest.teleport(x as number, z as number),
    [BANK_STAND_X, BANK_STAND_Z],
  );
  // The follow camera must bring the walker on-screen (scr inside 390×844).
  await expect
    .poll(
      async () => {
        const s = await readScr(page);
        return !!s && s.x > 5 && s.x < 385 && s.y > 5 && s.y < 800;
      },
      { timeout: 60_000, intervals: [1_000, 2_000, 5_000] },
    )
    .toBe(true);

  // ── 2. select the bank → cutaway + visitor floor buttons ──────────────────
  // Software-GL boxes run <2 fps and GameLoop clamps dt at 50 ms — run the
  // office/lift loop at 8× wall-clock so a full lift call is ~40 frames.
  await page.evaluate(() =>
    (window as unknown as { __chaleOffice: { setTimeScale: (n: number) => void } })
      .__chaleOffice.setTimeScale(8),
  );
  await page.evaluate((id) =>
    (window as unknown as { __chaleOffice: { select: (id: string) => void } }).__chaleOffice.select(id),
  BANK_ID);
  const probe = () =>
    page.evaluate(
      () =>
        (window as unknown as { __chaleOffice: { probe: () => OfficeProbe } }).__chaleOffice.probe(),
    );
  await expect.poll(async () => (await probe()).selected, { timeout: 15_000 }).toBe(BANK_ID);
  // office-panel mounts with the visitor floor picker
  await expect(page.getByTestId('office-panel')).toBeVisible();
  await expect(page.getByTestId('office-visit-floors')).toContainText('Take the lift');

  // ── 3. ride the lift to floor 2 — the car must physically travel ──────────
  const carBefore = (await probe()).liftPos ?? 0;
  await page.getByTestId('office-visit-2').click();
  const msg = await page.evaluate(
    () => document.querySelector('[data-testid="office-panel"]')?.textContent ?? '',
  );
  expect(msg).toContain('Lift called');
  // The lift is driven by ambient dt (clamped at 50 ms per frame): on slow
  // software-GL boxes a full call (doors 4.2 s + travel 2.5 s + door cycle)
  // needs hundreds of frames — poll generously, intervals stay short.
  await expect
    .poll(async () => (await probe()).playerFloor, { timeout: 360_000, intervals: [500, 1_000, 2_000] })
    .toBe(2);
  const after = await probe();
  expect(after.liftPos ?? -1).toBeCloseTo(2, 5); // car parked at floor 2
  expect(after.liftPos ?? -1).not.toBeCloseTo(carBefore, 5); // it moved
  expect(after.inLift).toBe(false); // alighted at floor 2
  // the cutaway view follows the player's floor
  expect(after.viewFloor).toBe(2);
  await expect(page.getByTestId('office-panel')).toContainText('Floor 1');
});
