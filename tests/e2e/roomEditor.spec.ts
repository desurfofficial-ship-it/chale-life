/**
 * Room editor end-to-end — buy furniture → it renders in the room; device
 * toggles drive the 3D scene; presets and surfaces stay interactive.
 *
 * Runs on the built dist (vite preview) under SwiftShader, mobile viewport.
 * The room editor is a standalone route (?mood=1) so no walking is needed:
 * the wallet is seeded via __chaleTest.setWallet (e2e hook), the moodOk gate
 * is pre-approved through localStorage.
 */
import { expect, test } from '@playwright/test';

const BASE = '/chale-life/';

const pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0;
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.addInitScript(() => {
    window.localStorage.setItem('chale.moodOk', '1');
    window.localStorage.setItem('chale-onboarding-done', '1');
  });
});

test('room editor: buy furniture appears, devices toggle, no page errors', async ({ page }) => {
  await page.goto(BASE + '?mood=1&room=shop&e2e=1');

  // wallet seeded above any realistic furniture budget
  await page.evaluate(() => {
    (window as unknown as { __chaleTest: { setWallet: (n: number) => void } }).__chaleTest.setWallet(5000);
  });

  const shopTab = page.getByRole('button', { name: 'Shop', exact: true });
  await expect(shopTab).toBeVisible();

  // buy the plastic chair (cheapest item, procedural stand-in)
  const chairTile = page.getByRole('button', { name: /Plastic Monobloc Chair/ });
  await expect(chairTile).toBeVisible();
  await expect(chairTile.getByText('Buy')).toBeVisible();
  await chairTile.click();
  await expect(chairTile.getByText('Owned')).toBeVisible({ timeout: 15_000 });

  // owned counter in the shop header reflects the purchase
  await expect(page.getByText(/Owned 1 · Comfort/)).toBeVisible();

  // the 3D canvas is present (bought piece renders inside it — GL/probe-level
  // assertions live in the visual audit; here we assert the scene didn't crash)
  await expect(page.locator('canvas').first()).toBeVisible();

  // Devices tab: fan toggle flips state and shows a hint that it drives the room
  await page.getByRole('button', { name: 'Devices', exact: true }).click();
  const fanRow = page.getByRole('button', { name: /Standing fan/ });
  await expect(fanRow).toBeVisible();
  await expect(fanRow.getByText('Off')).toBeVisible();
  await fanRow.click();
  await expect(fanRow.getByText('On')).toBeVisible();

  // ceiling lamp toggle: off → the Day tab readout follows
  const ceilingRow = page.getByRole('button', { name: /Ceiling lamp/ });
  await expect(ceilingRow).toBeVisible();
  await ceilingRow.click();
  await expect(ceilingRow.getByText('Off')).toBeVisible();
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.getByText('Ceiling off')).toBeVisible();

  // Surfaces tab: pick a modern swatch, mood sentence updates
  await page.getByRole('button', { name: 'Surfaces', exact: true }).click();
  // floor slot defaults to the wood filter — switch to stone for Concrete
  await page.getByRole('button', { name: 'stone', exact: true }).click();
  await page.getByRole('button', { name: 'Concrete' }).first().click();
  await expect(page.getByText(/floor ·/i)).toBeVisible();

  // Scene chips include the new presets
  await expect(page.getByRole('button', { name: 'Modern', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Modern', exact: true }).click();

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('room editor persists devices for the walkable world', async ({ page }) => {
  await page.goto(BASE + '?mood=1&room=devices&e2e=1');
  const fanRow = page.getByRole('button', { name: /Standing fan/ });
  await expect(fanRow).toBeVisible();
  await fanRow.click();
  await expect(fanRow.getByText('On')).toBeVisible();

  const saved = await page.evaluate(() => window.localStorage.getItem('chale-room-devices-v1'));
  expect(saved).toBeTruthy();
  expect(JSON.parse(saved as string)).toMatchObject({ fan: true });
});
