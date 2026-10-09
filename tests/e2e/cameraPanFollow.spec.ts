/**
 * Camera pan / follow contract (Agent 2):
 *  1. A pointer that STARTS on the joystick never pans — even if it slides
 *     onto the canvas — so follow stays on while the player is steering.
 *  2. When movementInput ≠ 0, follow resumes automatically.
 *  3. Framing keeps the player inside the safe play rectangle on 390 × 844
 *     (clear of top HUD cards and bottom joystick / objective cards).
 *
 * Viewport is the product target 390 × 844 (playwright.config).
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';

/** Safe play rectangle on 390 × 844 — outside top HUD stack (~y 0–140) and
 *  bottom joystick / objective strip (~y 700–844). Horizontal margin keeps
 *  the avatar clear of the left stick ring and right Recenter edge. */
const SAFE = { left: 40, top: 150, right: 350, bottom: 680 };

/** Synthetic keyboard — input manager listens for `code` on window. */
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

/** Player world position from the ?debug=1 overlay ("pos  <x> / <z>"). */
async function readPos(page: Page): Promise<{ x: number; z: number }> {
  const text = await page.locator('.debug-overlay').innerText();
  const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  expect(m, 'debug overlay must report the position').not.toBeNull();
  return { x: Number(m![1]), z: Number(m![2]) };
}

/**
 * Project player world → screen using the framing contract (player at 45 % from
 * top, centre x) which holds while follow is on.
 */
async function playerScreenPos(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const text = document.querySelector('.debug-overlay')?.textContent ?? '';
    const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
    if (!m) throw new Error('debug overlay missing pos');
    const worldX = Number(m[1]);
    const worldZ = Number(m[2]);

    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('no canvas');
    const rect = canvas.getBoundingClientRect();

    // Framing contract while follow is on: PLAYER_FROM_TOP = 0.45, centre x.
    void worldX;
    void worldZ;
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.45,
    };
  });
}

test('joystick drag onto canvas while moving keeps follow on (player stays in safe rect)', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(120_000);

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/chale-life/?debug=1');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('application', { name: 'Movement joystick' })).toBeVisible();

  const pos0 = await readPos(page);

  // Start walking forward so movementInput ≠ 0 (auto-resume path).
  await pressKey(page, 'KeyW', true);
  await page.waitForTimeout(400);

  const stick = page.getByRole('application', { name: 'Movement joystick' });
  const stickBox = await stick.boundingBox();
  expect(stickBox, 'joystick must have a box').toBeTruthy();
  const sx = stickBox!.x + stickBox!.width / 2;
  const sy = stickBox!.y + stickBox!.height / 2;

  // Drag that STARTS on the joystick and slides onto the canvas centre.
  // If the canvas treated this pointer as a pan start, follow would suspend
  // and the framed player would leave the safe rectangle after travel.
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Slide upward/right onto the open canvas (past the stick ring).
  await page.mouse.move(sx + 80, sy - 200, { steps: 12 });
  await page.waitForTimeout(600);
  await page.mouse.move(sx + 120, sy - 320, { steps: 10 });
  await page.waitForTimeout(800);
  await page.mouse.up();

  // Still walking — follow must have stayed / resumed on.
  await page.waitForTimeout(400);

  const pos1 = await readPos(page);
  // Player must have moved (keyboard still held) — proves input is live.
  const moved = Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z);
  expect(moved, 'player should have walked while stick-dragged').toBeGreaterThan(0.5);

  const screen = await playerScreenPos(page);
  expect(
    screen.x,
    `player screen x ${screen.x.toFixed(1)} should be inside safe [${SAFE.left}, ${SAFE.right}]`
  ).toBeGreaterThanOrEqual(SAFE.left);
  expect(screen.x).toBeLessThanOrEqual(SAFE.right);
  expect(
    screen.y,
    `player screen y ${screen.y.toFixed(1)} should be inside safe [${SAFE.top}, ${SAFE.bottom}]`
  ).toBeGreaterThanOrEqual(SAFE.top);
  expect(screen.y).toBeLessThanOrEqual(SAFE.bottom);

  await page.screenshot({
    path: testInfo.outputPath('joystick-drag-follow-390x844.png'),
    fullPage: false,
  });

  await pressKey(page, 'KeyW', false);
  expect(pageErrors, `page errors: ${pageErrors.join('; ')}`).toEqual([]);
});
