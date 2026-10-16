// probe_room.mjs — visual audit of the room fixes (Agent 4).
// Captures the dollhouse editor (before/after devices + owned furniture)
// and the walkable world interior with bought pieces + device state.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/chale-life/';
const OUT = '/home/z/my-project/chale-life/docs/room-fixes';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// ── A. dollhouse editor: seed wallet, buy pieces, capture ──────────────────
await page.addInitScript(() => {
  window.localStorage.setItem('chale.moodOk', '1');
  window.localStorage.setItem('chale-onboarding-done', '1');
});
await page.goto(BASE + '?mood=1&room=shop&e2e=1');
await page.waitForTimeout(2500);
await page.evaluate(() => window.__chaleTest.setWallet(20000));

const buy = async (title) => {
  const tile = page.getByRole('button', { name: new RegExp(title) });
  try {
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await page.waitForTimeout(400);
  } catch (e) {
    console.log('buy miss', title, e.message.split('\n')[0]);
  }
};
// baseline shot BEFORE purchases
await page.screenshot({ path: `${OUT}/editor-empty.png` });
await buy('Plastic Monobloc Chair');
await buy('Sleeper Bassi Bed'); // bed_basic if present; lp bed below
await buy(/^Bed/);
await buy('Sofa');
await buy('Floor Lamp');
await buy('TV');
await buy('Bookshelf');
await buy('Rug');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/editor-owned.png` });

// devices: fan ON, then ceiling OFF (dark room proof)
await page.getByRole('button', { name: 'Devices', exact: true }).click();
await page.getByRole('button', { name: /Standing fan/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/editor-fan-on.png` });
await page.getByRole('button', { name: /Ceiling lamp/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/editor-ceiling-off.png` });
await page.getByRole('button', { name: /Ceiling lamp/ }).click(); // back on
await page.waitForTimeout(400);

// ── B. walkable world: teleport inside, capture the interior ───────────────
await page.goto(BASE + '?e2e=1');
await page.waitForTimeout(3500);
await page.evaluate(() => window.__chaleTest.teleport(-146.8, -7));
await page.waitForTimeout(2500);
// night-ish zoom for lamp readability: daytime is fine, interior cutaway
await page.screenshot({ path: `${OUT}/world-interior.png` });

console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
