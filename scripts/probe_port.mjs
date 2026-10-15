/**
 * Tema Harbour visual-audit probe — captures the audit set at 390×844.
 *
 * Shots (all saved under /home/z/my-project/shots/port-<label>-*.png):
 *   1 wide        — wide oblique over the whole harbour (zoom out via wheel)
 *   2 approach    — gameplay view from the coastal road, city side
 *   3 quay        — quay wall + gantry cranes close
 *   4 yard        — inland container yard rows
 *   5 pier        — on the container pier deck
 *   6 ships       — berthed vessels from the quay edge
 *   7 dusk        — wide oblique at ?hour=18.5
 *   8 overhead    — high oblique from over the water
 *
 * Usage: node scripts/probe_port.mjs <label>
 * Run from /home/z/my-project/chale-life (resolves @playwright/test).
 * The preview server must already serve the dist under audit on :4173.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'before';
const OUT = '/home/z/my-project/shots';
mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 2500) {
  await page.waitForTimeout(ms);
}

async function teleport(page, x, z) {
  await page.evaluate(([tx, tz]) => {
    window.__chaleTest.teleport(tx, tz);
  }, [x, z]);
  await settle(page, 2600);
}

async function zoomTo(page, target) {
  // Proportional wheel steps: deltaY = k·ln(zoom/target) converges in 2-3
  // steps without the coarse ±480 overshoot (each wheel multiplies by
  // exp(-deltaY·0.0012) in CameraRig.onWheel).
  for (let i = 0; i < 30; i++) {
    const zoom = await page.evaluate(() => window.__chaleTest.probe().zoom);
    if (Math.abs(Math.log(zoom / target)) < 0.03) break;
    const dy = Math.max(-560, Math.min(560, 900 * Math.log(zoom / target)));
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(220);
  }
  await settle(page, 900);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/port-${label}-${name}.png` });
  const probe = await page.evaluate(() => window.__chaleTest.probe());
  console.log(`  [${name}] player=(${probe.x.toFixed(1)}, ${probe.z.toFixed(1)}) zoom=${probe.zoom.toFixed(1)}`);
}

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let errors = 0;
  page.on('pageerror', (e) => {
    errors++;
    console.log(`[pageerror] ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[console.error] ${m.text()}`);
  });

  // ── DAY PASS ──────────────────────────────────────────────────────────────
  await page.goto('http://127.0.0.1:4173/chale-life/?e2e=1&hour=12', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('canvas', { timeout: 60_000 });
  // The lazy world chunk needs a few seconds under SwiftShader (NOTE: the
  // __ACCRA.scene handle only exists on branches that publish it — plain
  // main does not — so just settle on time here).
  await settle(page, 6000);

  // 1a. Wide oblique — WEST harbour half (cranes 1-2 + TEMA STAR berth).
  await teleport(page, 245, 30);
  await zoomTo(page, 14);
  await shot(page, 'wide-west');

  // 1b. Wide oblique — EAST harbour half (cranes 3-4, ACCRA EXPRESS, pier).
  await teleport(page, 300, 30);
  await zoomTo(page, 14);
  await shot(page, 'wide-east');

  // 8. High oblique from over the water, looking back at the port.
  await teleport(page, 285, 78);
  await zoomTo(page, 14);
  await shot(page, 'overhead');

  // 2. City approach on the coastal/quay road, port ahead to the east.
  await teleport(page, 236, 30);
  await zoomTo(page, 30);
  await shot(page, 'approach');

  // 3. Quay + cranes close.
  await teleport(page, 243, 36);
  await zoomTo(page, 34);
  await shot(page, 'quay');

  // 4. Inland container yard.
  await teleport(page, 256, 2);
  await zoomTo(page, 30);
  await shot(page, 'yard');

  // 5. On the pier deck.
  await teleport(page, 285, 50);
  await zoomTo(page, 34);
  await shot(page, 'pier');

  // 6. Berthed ships from the quay edge.
  await teleport(page, 250, 42);
  await zoomTo(page, 34);
  await shot(page, 'ships');

  // 6b. Offshore anchorage (VOLTA QUEEN + TUG ADA).
  await teleport(page, 284, 70);
  await zoomTo(page, 30);
  await shot(page, 'anchorage');

  // ── DUSK PASS ─────────────────────────────────────────────────────────────
  await page.goto('http://127.0.0.1:4173/chale-life/?e2e=1&hour=18.5', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('canvas', { timeout: 60_000 });
  await settle(page, 6000);
  await teleport(page, 275, 34);
  await zoomTo(page, 14);
  await shot(page, 'dusk');

  console.log(`page errors during pass: ${errors}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
