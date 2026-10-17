/**
 * Reality-check P2 e2e — the player's OWN house: buy furniture with the real
 * economy, place / move / rotate / remove it from the Arrange tab, and verify
 * the layout persists across a reload.
 *
 * Runs against ?mood=1&from=home (the Set-the-Mood room editor the in-house
 * "Room" button opens). The robot drives the SAME request* paths the buttons
 * call via __chaleHome, and asserts the store probe + localStorage save.
 */
import { expect, test } from '@playwright/test';

const ITEM = 'wooden_stool'; // legacy basic — cheap, procedural mesh

interface HomeProbe {
  layout: Array<{ uid: string; id: string; x: number; z: number; rot: number }>;
  selectedUid: string | null;
}

type HomeApi = {
  move: (uid: string, dx: number, dz: number) => string;
  rotate: (uid: string) => string;
  remove: (uid: string) => string;
};

const home = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __chaleHome?: { probe: () => HomeProbe } }).__chaleHome?.probe() ??
      null,
  );

test('empty starter room → buy → arrange → persist across reload', async ({ page }) => {
  test.setTimeout(240_000);
  // The mood page bypasses the home-gate via from=home; seeding happens HERE
  // (a full navigation would reset the module-singleton wallet to ₵20).
  await page.goto('/chale-life/?mood=1&from=home&room=arrange&e2e=1');
  await expect
    .poll(async () => !!(await home(page)), { timeout: 30_000 })
    .toBe(true);
  // fresh house: no saved layout, generous wallet (live store)
  await page.evaluate(() => {
    localStorage.removeItem('chale-home-layout-v1');
    (
      window as unknown as { __chaleTest: { setWallet: (n: number) => void } }
    ).__chaleTest.setWallet(5000);
  });

  // ── the starter room is EMPTY ──────────────────────────────────────────────
  expect((await home(page))!.layout).toHaveLength(0);
  await expect(page.getByTestId('arrange-panel')).toContainText('Your room is empty', {
    timeout: 20_000,
  });

  // ── buy with the real economy → auto-placed ────────────────────────────────
  await page.getByRole('button', { name: 'Shop' }).click();
  await page.getByTestId(`shop-item-${ITEM}`).click();
  await expect
    .poll(async () => (await home(page))!.layout.length, { timeout: 20_000 })
    .toBe(1);
  const placed = (await home(page))!.layout[0];
  expect(placed.id).toBe(ITEM);
  expect(placed.x).toBeGreaterThanOrEqual(-3.3);
  expect(placed.x).toBeLessThanOrEqual(3.3);

  // ── arrange: move + rotate through the store paths ─────────────────────────
  await page.getByRole('button', { name: 'Arrange' }).click();
  await expect(page.getByTestId('arrange-panel')).toBeVisible();
  const move = (uid: string, dx: number, dz: number) =>
    page.evaluate(
      ([u, x, z]) =>
        (window as unknown as { __chaleHome: HomeApi }).__chaleHome.move(
          u as string,
          x as number,
          z as number,
        ),
      [uid, dx, dz],
    );
  const rotate = (uid: string) =>
    page.evaluate(
      ([u]) => (window as unknown as { __chaleHome: HomeApi }).__chaleHome.rotate(u as string),
      [uid],
    );
  const remove = (uid: string) =>
    page.evaluate(
      ([u]) => (window as unknown as { __chaleHome: HomeApi }).__chaleHome.remove(u as string),
      [uid],
    );

  const before = (await home(page))!.layout[0];
  expect(await move(before.uid, 0.5, 0)).toBe('moved'); // one tile = 0.5 m
  const afterMove = (await home(page))!.layout[0];
  expect(afterMove.x).toBeCloseTo(before.x + 0.5, 5);
  expect(await rotate(before.uid)).toBe('rotated');
  expect((await home(page))!.layout[0].rot).toBe((before.rot + 1) % 4);

  // ── invalid move is rejected with feedback ────────────────────────────────
  // walk the piece into the east wall until the rules refuse
  let rejected = false;
  for (let i = 0; i < 12 && !rejected; i++) {
    const res = await move(before.uid, 0.5, 0);
    if (res !== 'moved') rejected = true;
  }
  expect(rejected).toBe(true);
  await expect(page.getByTestId('arrange-panel')).toContainText('Outside the room');

  // ── persistence: reload → the layout comes back from localStorage ─────────
  const saved = (await home(page))!.layout;
  expect(saved).toHaveLength(1);
  await page.reload();
  await expect
    .poll(async () => !!(await home(page)), { timeout: 30_000 })
    .toBe(true);
  const restored = (await home(page))!.layout;
  expect(restored).toHaveLength(1);
  expect(restored[0].uid).toBe(saved[0].uid);
  expect(restored[0].x).toBeCloseTo(saved[0].x, 5);
  expect(restored[0].rot).toBe(saved[0].rot);

  // ── remove → the room is empty again (purchase stays owned) ───────────────
  expect(await remove(saved[0].uid)).toBe('removed');
  expect((await home(page))!.layout).toHaveLength(0);
  await expect(page.getByTestId('arrange-panel')).toContainText('Your room is empty');
});
