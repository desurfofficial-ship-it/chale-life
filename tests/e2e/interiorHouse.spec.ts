/**
 * In-house interior camera + Decorate chip (bugfix regression spec).
 *
 * Pins three behaviours the interior cutaway depends on:
 *  1. The exterior cutaway group (gyan-exterior: shell walls + tin roof +
 *     find-home beacon) is UNBATCHED and its visibility toggle actually
 *     reaches the GPU — inside the house the roof/beacon are REALLY gone
 *     (the SceneBatcher used to freeze copies of them into scene-root
 *     merges that ignored the cutaway and kept rendering).
 *  2. The room camera floors the ortho zoom at 64 px/m so the room fills
 *     the phone instead of the street.
 *  3. The Decorate chip is a real button (pointer-events re-enabled, no
 *     emoji in the label) whose click navigates into the Set-the-Mood
 *     editor via ?mood=1&from=home.
 */
import { expect, test, type Page } from '@playwright/test';

type VisMap = { ext: boolean | null; beacon: boolean | null };

/** Ancestor-aware visibility of the two cutaway-tracked nodes. */
async function cutawayState(page: Page): Promise<VisMap> {
  return page.evaluate(() => {
    type Node = { visible: boolean; parent: Node | null };
    const w = window as unknown as {
      __ACCRA?: { scene?: { getObjectByName(n: string): Node | null } };
    };
    const scene = w.__ACCRA?.scene;
    if (!scene) return { ext: null, beacon: null };
    const vis = (o: Node | null): boolean | null => {
      let c = o;
      while (c) {
        if (!c.visible) return false;
        c = c.parent;
      }
      return true;
    };
    return {
      ext: vis(scene.getObjectByName('gyan-exterior')),
      beacon: vis(scene.getObjectByName('home-beacon')),
    };
  });
}

test('interior cutaway + room camera + Decorate chip opens mood editor', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chale-life/?e2e=1&hour=12');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 });
  await page.waitForFunction(
    () => Boolean((window as unknown as { __ACCRA?: { scene?: unknown } }).__ACCRA?.scene),
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1500);

  // OUTSIDE the front door: shell + beacon must be visible (street wayfinding intact).
  await page.evaluate(() => {
    (window as unknown as { __chaleTest?: { teleport: (x: number, z: number) => void } }).__chaleTest!.teleport(-144.6, -2.6);
  });
  await page.waitForTimeout(1500);
  expect(await cutawayState(page)).toEqual({ ext: true, beacon: true });

  // THROUGH the door: exterior group + beacon hide for real.
  await page.evaluate(() => {
    (window as unknown as { __chaleTest?: { teleport: (x: number, z: number) => void } }).__chaleTest!.teleport(-146.8, -7);
  });
  await page.waitForTimeout(1500);
  expect(await cutawayState(page)).toEqual({ ext: false, beacon: false });

  // Room camera: the zoom floor lerps up to 64 px/m (SwiftShader is slow — poll).
  await page.waitForFunction(
    () => {
      const t = (window as unknown as { __chaleTest?: { probe?: () => { zoom: number } } }).__chaleTest;
      return Boolean(t?.probe && t.probe().zoom >= 63);
    },
    { timeout: 30_000 },
  );

  // Decorate chip: exact label (no emoji), pointer-events re-enabled, and the
  // hit-test at its centre lands on the button itself (clicks cannot fall
  // through the pointer-events:none HUD root to the canvas).
  const chip = page.getByRole('button', { name: 'Decorate room', exact: true });
  await expect(chip).toBeVisible();
  const audit = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => (x.textContent || '').includes('Decorate'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      text: (b.textContent || '').trim(),
      hasEmoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.textContent || ''),
      hittable: hit === b,
      pointerEvents: getComputedStyle(b).pointerEvents,
    };
  });
  expect(audit).not.toBeNull();
  expect(audit!.text).toBe('Decorate room');
  expect(audit!.hasEmoji).toBe(false);
  expect(audit!.hittable).toBe(true);
  expect(audit!.pointerEvents).toBe('auto');

  // Click → full-page nav into the mood editor (slow load under SwiftShader;
  // click() may time out waiting for it — judge by the URL).
  await chip.click({ timeout: 30_000 }).catch(() => {});
  await page.waitForURL(/mood=1/, { timeout: 60_000 });
  await expect(page.getByText('Back to street')).toBeVisible({ timeout: 45_000 });
});
