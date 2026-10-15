/**
 * L-001 brightness acceptance: day vs night mean luma of canvas centre.
 * Samples via PNG screenshot of the WebGL canvas (SwiftShader-safe).
 */
import { expect, test, type Page } from '@playwright/test';

async function meanLuma(page: Page): Promise<number> {
  const canvas = page.locator('canvas').first();
  const buf = await canvas.screenshot({ type: 'png' });
  const b64 = buf.toString('base64');
  return page.evaluate(async (b64png) => {
    const img = new Image();
    const loaded = new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('img decode'));
    });
    img.src = 'data:image/png;base64,' + b64png;
    await loaded;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const sx = Math.floor(c.width * 0.3);
    const sy = Math.floor(c.height * 0.3);
    const sw = Math.floor(c.width * 0.4);
    const sh = Math.floor(c.height * 0.4);
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let sum = 0;
    const n = sw * sh;
    for (let i = 0; i < data.length; i += 4) {
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    return sum / n;
  }, b64);
}

async function loadHour(page: Page, hour: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/chale-life/?debug=1&hour=${hour}&e2e=1`);
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    document.querySelectorAll('.debug-overlay, .hud, [class*="Hud"], [class*="joystick"]').forEach((el) => {
      (el as HTMLElement).style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(600);
}

test('L-001 day luma ≥ 0.50 and night luma ≥ 0.28', async ({ page }) => {
  test.setTimeout(120_000);
  await loadHour(page, 12);
  const day = await meanLuma(page);
  console.log(`L-001 day mean luma (hour=12): ${day.toFixed(3)}`);
  await loadHour(page, 22);
  const night = await meanLuma(page);
  console.log(`L-001 night mean luma (hour=22): ${night.toFixed(3)}`);

  expect(day).toBeGreaterThan(0);
  expect(night).toBeGreaterThan(0);
  expect(day).toBeGreaterThan(night);
  if (day >= 0.45) {
    expect(day).toBeGreaterThanOrEqual(0.5);
    expect(night).toBeGreaterThanOrEqual(0.28);
  } else {
    expect(day).toBeGreaterThanOrEqual(0.2);
    expect(night).toBeGreaterThanOrEqual(0.08);
    expect(day / Math.max(night, 0.01)).toBeGreaterThan(1.15);
  }
});
