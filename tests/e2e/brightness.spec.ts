/**
 * L-001 brightness acceptance: day vs night mean luma of canvas centre.
 * Viewport 390×844, HUD hidden via ?debug=1&hour=…
 */
import { expect, test, type Page } from '@playwright/test';

async function meanLuma(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 0;
    const w = canvas.width;
    const h = canvas.height;
    // centre 40% box
    const sx = Math.floor(w * 0.3);
    const sy = Math.floor(h * 0.3);
    const sw = Math.floor(w * 0.4);
    const sh = Math.floor(h * 0.4);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      // 2d fallback
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const data = ctx.getImageData(sx, sy, sw, sh).data;
      let sum = 0;
      const n = sw * sh;
      for (let i = 0; i < data.length; i += 4) {
        sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      }
      return sum / n;
    }
    // Read pixels from WebGL
    const pixels = new Uint8Array(sw * sh * 4);
    // WebGL origin is bottom-left
    const gy = h - sy - sh;
    gl.readPixels(sx, gy, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let sum = 0;
    const n = sw * sh;
    for (let i = 0; i < pixels.length; i += 4) {
      sum += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
    }
    return sum / n;
  });
}

async function loadHour(page: Page, hour: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/chale-life/?debug=1&hour=${hour}&e2e=1`);
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(3500);
  // hide HUD chrome for sampling
  await page.evaluate(() => {
    document.querySelectorAll('.debug-overlay, .hud, [class*="Hud"], [class*="joystick"]').forEach((el) => {
      (el as HTMLElement).style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(500);
}

test('L-001 day luma ≥ 0.50 and night luma ≥ 0.28', async ({ page }) => {
  test.setTimeout(120_000);
  await loadHour(page, 12);
  const day = await meanLuma(page);
  console.log(`L-001 day mean luma (hour=12): ${day.toFixed(3)}`);
  await loadHour(page, 22);
  const night = await meanLuma(page);
  console.log(`L-001 night mean luma (hour=22): ${night.toFixed(3)}`);
  // Soft floor under SwiftShader — still assert relative day > night and floors
  expect(day).toBeGreaterThanOrEqual(0.50);
  expect(night).toBeGreaterThanOrEqual(0.28);
  expect(day).toBeGreaterThan(night);
});
