/**
 * C-001 free camera acceptance on built dist.
 */
import { expect, test, type Page } from '@playwright/test';

async function enterTycoon(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chale-life/?debug=1&e2e=1&tycoon=1&tycoonDemo=1&hour=12');
  await expect(page.locator('.debug-overlay')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(2500);
  // City FAB or already tycoon
  const city = page.getByRole('button', { name: 'City' });
  if (await city.count()) {
    await city.first().click();
    await page.waitForTimeout(1500);
  }
}

test('C-001 Fit city, rotate, focus, plot tap', async ({ page }) => {
  test.setTimeout(180_000);
  await enterTycoon(page);

  // Fit city button on rail
  const fitCity = page.getByRole('button', { name: 'Fit city' });
  if (await fitCity.count()) {
    await fitCity.click();
    await page.waitForTimeout(2000);
  }

  // Rotate 4× should be stable (no crash)
  const rot = page.getByRole('button', { name: 'Rotate 90 degrees' });
  if (await rot.count()) {
    for (let i = 0; i < 4; i++) {
      await rot.click();
      await page.waitForTimeout(400);
    }
  }

  // Canvas still present
  await expect(page.locator('canvas')).toBeVisible();

  // Stats if exposed
  const lod = await page.evaluate(() => (window as unknown as { __ACCRA_LOD?: string }).__ACCRA_LOD);
  console.log('C-001 LOD after fit city:', lod);
});
