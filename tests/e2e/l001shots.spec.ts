/**
 * L-001 screenshots into docs/assets when CHALE_SHOTS=1 (manual/local).
 * Always runs a smoke path in CI without writing repo files.
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const WRITE = process.env.CHALE_SHOTS === '1';
const OUT = path.resolve('docs/assets');

test('L-001 lighting smoke + optional screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const hours = [
    { h: 12, name: 'l001-day.png' },
    { h: 17.5, name: 'l001-golden.png' },
    { h: 22, name: 'l001-night.png' },
  ];
  for (const { h, name } of hours) {
    await page.goto(`/chale-life/?debug=1&hour=${h}&e2e=1`);
    await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(3000);
    if (WRITE) {
      fs.mkdirSync(OUT, { recursive: true });
      const file = path.join(OUT, name);
      await page.locator('canvas').screenshot({ path: file });
      const st = fs.statSync(file);
      console.log(name, st.size);
      expect(st.size).toBeGreaterThan(100_000);
    }
  }
  // rain
  await page.goto('/chale-life/?debug=1&hour=12&weather=rain&e2e=1');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(2500);
  if (WRITE) {
    const file = path.join(OUT, 'l001-rain.png');
    await page.locator('canvas').screenshot({ path: file });
    expect(fs.statSync(file).size).toBeGreaterThan(100_000);
  }
});
