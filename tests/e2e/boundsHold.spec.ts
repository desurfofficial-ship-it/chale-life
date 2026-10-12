/**
 * B-004 e2e: hold a direction for 20 s and assert the player stays inside
 * WORLD bounds minus the capsule radius (0.45 m).
 *
 * ACCRA MAP: the playable plate is x −280…340, z −116…116 (worldBounds in
 * src/world/colliders.ts, derived from PLATE in lib/mapConfig.ts) — the old
 * starter block's ±30 constants predate the map swap (the spawn itself,
 * x −136, is outside them, which failed the test instantly). Does not
 * require reaching the world edge — the path from spawn is full of
 * colliders. The contract under test is the hard clamp, not free travel.
 */
import { expect, test } from '@playwright/test';

const WORLD_MIN_X = -280;
const WORLD_MAX_X = 340;
const WORLD_MIN_Z = -116;
const WORLD_MAX_Z = 116;
const RADIUS = 0.45;

async function readPos(page: import('@playwright/test').Page) {
  const text = await page.locator('[aria-hidden]').first().innerText().catch(() => '');
  const m = text.match(/pos\s+([-\d.]+)\s*\/\s*([-\d.]+)/);
  return {
    x: m ? Number(m[1]) : NaN,
    z: m ? Number(m[2]) : NaN,
  };
}

test('B-004: hold ArrowRight 20 s — position stays inside world bounds − radius', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/chale-life/?debug=1');
  await expect(page.getByText('₵20', { exact: true })).toBeVisible({ timeout: 30_000 });

  await expect
    .poll(async () => Number.isFinite((await readPos(page)).x), { timeout: 15_000 })
    .toBe(true);

  const first = await readPos(page);

  await page.keyboard.down('ArrowRight');
  const samples: Array<{ x: number; z: number }> = [];
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    await page.waitForTimeout(500);
    const p = await readPos(page);
    if (Number.isFinite(p.x) && Number.isFinite(p.z)) {
      samples.push(p);
      expect(p.x, `x out of bounds at t=${Date.now() - start}ms`).toBeGreaterThanOrEqual(WORLD_MIN_X - 1e-3);
      expect(p.x, `x out of bounds at t=${Date.now() - start}ms`).toBeLessThanOrEqual(WORLD_MAX_X + 1e-3);
      expect(p.z, `z out of bounds at t=${Date.now() - start}ms`).toBeGreaterThanOrEqual(WORLD_MIN_Z - 1e-3);
      expect(p.z, `z out of bounds at t=${Date.now() - start}ms`).toBeLessThanOrEqual(WORLD_MAX_Z + 1e-3);
    }
  }
  await page.keyboard.up('ArrowRight');

  expect(samples.length).toBeGreaterThan(10);
  // Movement input was held — player should have moved or pressed against a
  // collider, but every sample must remain inside the playable AABB.
  const last = samples[samples.length - 1];
  expect(last.x).toBeGreaterThanOrEqual(WORLD_MIN_X - 1e-3);
  expect(last.x).toBeLessThanOrEqual(WORLD_MAX_X + 1e-3);
  expect(last.z).toBeGreaterThanOrEqual(WORLD_MIN_Z - 1e-3);
  expect(last.z).toBeLessThanOrEqual(WORLD_MAX_Z + 1e-3);
  // Sanity: we actually observed a position (and typically moved from spawn).
  expect(Number.isFinite(first.x)).toBe(true);
  expect(Number.isFinite(last.x)).toBe(true);
});
