/**
 * World vehicle / edge screenshots at the product 390 × 844 viewport.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function waitForWorld(page: Page): Promise<void> {
  await page.goto('/chale-life/?debug=1');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(2500);
}

async function panCanvas(page: Page, dx: number, dy: number): Promise<void> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

test('world screenshots: van top-down, trotro stop, west junction, east edge', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(180_000);
  const shot = (name: string) => testInfo.outputPath(name);

  await waitForWorld(page);
  await page.screenshot({ path: shot('van-topdown-390x844.png') });

  await panCanvas(page, -180, -40);
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('trotro-stop-390x844.png') });

  await panCanvas(page, 420, 20);
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('west-junction-390x844.png') });

  await panCanvas(page, -520, 0);
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('east-edge-390x844.png') });

  const text = await page.locator('.debug-overlay').innerText();
  const dc = Number(text.match(/dc\s+(\d+)/)?.[1] ?? 999);
  expect(dc, `draw calls ${dc} should be ≤ 60`).toBeLessThanOrEqual(60);
});
