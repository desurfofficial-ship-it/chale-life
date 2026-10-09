/**
 * Camera pan / follow contract (Agent 2 — B-003a):
 *  1. A touch pointer that STARTS on the joystick never pans — even if it
 *     slides onto the canvas — so follow stays on while the player steers.
 *  2. When movementInput ≠ 0, follow resumes automatically.
 *  3. Framing (tilt-corrected) keeps the real projected player position
 *     inside the safe play rectangle on 390 × 844.
 *  4. A canvas-started drag DOES pan and suspends follow while idle.
 *
 * Player screen position is read from the ?debug=1 overlay (`scr  x / y`),
 * which is the live camera projection each frame — not a framing assumption.
 *
 * Viewport is the product target 390 × 844 (playwright.config).
 */

import { expect, test, type Page, type TestInfo } from '@playwright/test';

/** Safe play rectangle on 390 × 844 — outside top HUD stack (~y 0–140) and
 *  bottom joystick / objective strip (~y 700–844). Horizontal margin keeps
 *  the avatar clear of the left stick ring and right Recenter edge. */
const SAFE = { left: 40, top: 150, right: 350, bottom: 680 };

/** Player world position from the ?debug=1 overlay ("pos  <x> / <z>"). */
async function readPos(page: Page): Promise<{ x: number; z: number }> {
  const text = await page.locator('.debug-overlay').innerText();
  const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  expect(m, 'debug overlay must report the position').not.toBeNull();
  return { x: Number(m![1]), z: Number(m![2]) };
}

/**
 * Real projected player screen position (canvas CSS px) from the overlay
 * (`scr  <x> / <y>`), filled by CameraRig each frame via the HUD channel.
 */
async function readScreen(page: Page): Promise<{ x: number; y: number }> {
  const text = await page.locator('.debug-overlay').innerText();
  const m = text.match(/scr\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
  expect(m, 'debug overlay must report scr (projected screen pos)').not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]) };
}

/** Assert the projected player stays inside the safe play rectangle. */
function expectInSafe(screen: { x: number; y: number }, label: string): void {
  expect(
    screen.x,
    `${label}: screen x ${screen.x.toFixed(1)} should be in [${SAFE.left}, ${SAFE.right}]`,
  ).toBeGreaterThanOrEqual(SAFE.left);
  expect(screen.x).toBeLessThanOrEqual(SAFE.right);
  expect(
    screen.y,
    `${label}: screen y ${screen.y.toFixed(1)} should be in [${SAFE.top}, ${SAFE.bottom}]`,
  ).toBeGreaterThanOrEqual(SAFE.top);
  expect(screen.y).toBeLessThanOrEqual(SAFE.bottom);
}

/**
 * Dispatch a touch-typed pointer sequence spread across real frames so the
 * game loop can sample movementInput while the stick is held. pointerType
 * "touch" matches phone input; one pointerId for capture / ownership.
 */
async function touchDrag(
  page: Page,
  path: { x: number; y: number }[],
  stepsPerLeg = 8,
): Promise<void> {
  expect(path.length, 'touchDrag needs ≥2 points').toBeGreaterThanOrEqual(2);

  const fire = async (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    x: number,
    y: number,
    buttons: number,
  ): Promise<void> => {
    await page.evaluate(
      ({ type, x, y, buttons }) => {
        const POINTER_ID = 42;
        const el = document.elementFromPoint(x, y) ?? document.body;
        const target =
          type === 'pointerdown'
            ? el
            : ((document as unknown as { __touchTarget?: Element }).__touchTarget ?? el);
        if (type === 'pointerdown') {
          (document as unknown as { __touchTarget?: Element }).__touchTarget = el;
        }
        if (type === 'pointerup') {
          delete (document as unknown as { __touchTarget?: Element }).__touchTarget;
        }
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: POINTER_ID,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons,
          }),
        );
      },
      { type, x, y, buttons },
    );
  };

  const start = path[0]!;
  await fire('pointerdown', start.x, start.y, 1);
  await page.waitForTimeout(50);

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    for (let s = 1; s <= stepsPerLeg; s++) {
      const t = s / stepsPerLeg;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      await fire('pointermove', x, y, 1);
      await page.waitForTimeout(16);
    }
  }

  // Hold the final deflection so the player walks for a few frames.
  await page.waitForTimeout(400);

  const end = path[path.length - 1]!;
  await fire('pointerup', end.x, end.y, 0);
}

test('joystick touch-drag onto canvas while moving keeps follow on (player stays in safe rect)', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(120_000);

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/chale-life/?debug=1');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('application', { name: 'Movement joystick' })).toBeVisible();
  await expect
    .poll(async () => {
      const t = await page.locator('.debug-overlay').innerText();
      const m = t.match(/scr\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
      return m !== null && Number(m[1]) > 10 && Number(m[2]) > 10;
    }, { timeout: 15_000 })
    .toBe(true);

  const pos0 = await readPos(page);
  const screen0 = await readScreen(page);
  expectInSafe(screen0, 'before drag');

  const stick = page.getByRole('application', { name: 'Movement joystick' });
  const stickBox = await stick.boundingBox();
  expect(stickBox, 'joystick must have a box').toBeTruthy();
  const sx = stickBox!.x + stickBox!.width / 2;
  const sy = stickBox!.y + stickBox!.height / 2;

  await touchDrag(page, [
    { x: sx, y: sy },
    { x: sx, y: sy - 40 },
    { x: sx + 80, y: sy - 200 },
    { x: sx + 120, y: sy - 320 },
  ]);

  await page.waitForTimeout(500);

  const pos1 = await readPos(page);
  const moved = Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z);
  expect(moved, 'player should have walked while stick was active').toBeGreaterThan(0.3);

  const screen1 = await readScreen(page);
  expectInSafe(screen1, 'after stick→canvas drag');

  await page.screenshot({
    path: testInfo.outputPath('joystick-drag-follow-390x844.png'),
    fullPage: false,
  });

  expect(pageErrors, 'no page errors').toEqual([]);
});

test('canvas-started drag pans and suspends follow while idle', async ({ page }, testInfo: TestInfo) => {
  test.setTimeout(120_000);

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/chale-life/?debug=1');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const t = await page.locator('.debug-overlay').innerText();
      const m = t.match(/scr\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
      return m !== null && Number(m[1]) > 10 && Number(m[2]) > 10;
    }, { timeout: 15_000 })
    .toBe(true);

  const pos0 = await readPos(page);
  const screen0 = await readScreen(page);
  expectInSafe(screen0, 'idle before pan');

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box, 'canvas must have a box').toBeTruthy();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;

  await touchDrag(page, [
    { x: cx, y: cy },
    { x: cx + 120, y: cy + 80 },
    { x: cx + 200, y: cy + 140 },
  ], 10);

  await page.waitForTimeout(400);

  const pos1 = await readPos(page);
  expect(Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z)).toBeLessThan(0.15);

  const screen1 = await readScreen(page);
  const screenDelta = Math.hypot(screen1.x - screen0.x, screen1.y - screen0.y);
  expect(
    screenDelta,
    `canvas pan should move projected player on screen (Δ=${screenDelta.toFixed(1)})`,
  ).toBeGreaterThan(30);

  await page.screenshot({
    path: testInfo.outputPath('canvas-pan-suspend-390x844.png'),
    fullPage: false,
  });

  expect(pageErrors, 'no page errors').toEqual([]);
});
