/**
 * W-008 smoke: world loads with street life layer at hour 12.
 */
import { expect, test } from '@playwright/test';

test('W-008 street life layer loads', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chale-life/?debug=1&e2e=1&hour=12');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(3000);
  await expect(page.locator('canvas')).toBeVisible();
  const lod = await page.evaluate(() => (window as unknown as { __ACCRA_LOD?: string }).__ACCRA_LOD);
  console.log('W-008 LOD', lod);
});
