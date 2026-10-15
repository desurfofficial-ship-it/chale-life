/**
 * Diagnostic dump probe — chale-life interior cutaway + Decorate chip.
 *
 * Opens the built app with ?e2e=1, teleports the walker into Gyan's house,
 * then:
 *  1. DUMPS every named object near the house from window.__ACCRA.scene
 *     with its effective (ancestor-aware) visibility — the
 *     "which cutaway group stays visible" diagnostic.
 *  2. Screenshots the in-house framing (full page).
 *  3. Reports the Decorate chip's presence, text and hit-testability.
 *
 * Usage: node scripts/probe_interior.mjs <label>
 *   label = "before" | "after" — output under /home/z/my-project/shots/
 * Run from /home/z/my-project/chale-life so @playwright/test resolves.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'before';
const OUT = '/home/z/my-project/shots';
mkdirSync(OUT, { recursive: true });

const HOUSE = { x: -146.8, z: -7 };

function round(n) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[console.error] ${m.text()}`);
  });

  await page.goto('http://127.0.0.1:4173/chale-life/?e2e=1&hour=12', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('canvas', { timeout: 60_000 });
  await page.waitForFunction(() => {
    const w = window;
    return Boolean(w.__ACCRA && w.__ACCRA.scene);
  }, { timeout: 60_000 });
  await page.waitForTimeout(2500);

  // Shot 1 — outside the front door (beacon must be visible from the street).
  await page.evaluate(() => {
    window.__chaleTest.teleport(-144.6, -2.6);
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${label}-outside.png` });

  // Teleport inside.
  await page.evaluate(({ x, z }) => {
    const t = window.__chaleTest;
    if (t && t.teleport) t.teleport(x, z);
  }, HOUSE);
  await page.waitForTimeout(1500);

  // Wait for the in-room zoom to CONVERGE (SwiftShader lerps slowly) so the
  // framing screenshot is the steady-state view a player actually gets.
  await page
    .waitForFunction(
      () => {
        const t = window.__chaleTest;
        return Boolean(t && t.probe && t.probe().zoom >= 63);
      },
      { timeout: 20_000 },
    )
    .catch(() => console.log('zoom convergence poll timed out'));
  await page.waitForTimeout(1500);

  // 1. Diagnostic dump — every named node within 15 m of the house centre.
  const dump = await page.evaluate(({ hx, hz }) => {
    const round = (n) => Math.round(n * 100) / 100;
    const scene = window.__ACCRA && window.__ACCRA.scene;
    if (!scene) return { error: 'no __ACCRA.scene', rows: [] };
    const rows = [];
    scene.traverse((o) => {
      if (!o.name) return;
      // matrixWorld elements 12/13/14 = world translation (no Vector3 needed)
      const wx = o.matrixWorld.elements[12];
      const wy = o.matrixWorld.elements[13];
      const wz = o.matrixWorld.elements[14];
      const dist = Math.hypot(wx - hx, wz - hz);
      if (dist > 15) return;
      let worldVisible = true;
      let cur = o;
      while (cur) {
        if (!cur.visible) {
          worldVisible = false;
          break;
        }
        cur = cur.parent;
      }
      rows.push({
        name: o.name,
        type: o.type,
        selfVisible: o.visible,
        worldVisible,
        pos: [round(wx), round(wy), round(wz)],
        dist: Math.round(dist * 10) / 10,
      });
    });
    rows.sort((a, b) => a.dist - b.dist);
    return { rows };
  }, { hx: HOUSE.x, hz: HOUSE.z });

  console.log(`\n===== DIAGNOSTIC DUMP (${label}) — named nodes within 15 m of the house =====`);
  for (const r of dump.rows) {
    console.log(
      `${r.worldVisible ? 'VISIBLE ' : 'hidden  '} ${r.name} [${r.type}]` +
        ` self=${r.selfVisible} pos=(${r.pos[0]}, ${r.pos[1]}, ${r.pos[2]}) d=${r.dist}`,
    );
  }
  if (dump.error) console.log('ERROR:', dump.error);

  // Camera / walker probe.
  const probe = await page.evaluate(() => {
    const t = window.__chaleTest;
    return t && t.probe ? t.probe() : null;
  });
  console.log(`\nprobe (player + camera zoom): ${JSON.stringify(probe)}`);

  // 2. In-house framing screenshot (steady-state).
  await page.screenshot({ path: `${OUT}/${label}-inside.png` });

  // 3. Decorate chip audit.
  const chip = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => (x.textContent || '').includes('Decorate'));
    if (!b) return { found: false };
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const chain = [];
    let el = hit;
    for (let i = 0; el && i < 4; i++) {
      const pe = getComputedStyle(el).pointerEvents;
      const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '';
      chain.push(`${el.tagName.toLowerCase()}${cls} (pe=${pe})`);
      el = el.parentElement;
    }
    return {
      found: true,
      text: (b.textContent || '').trim(),
      hasEmojiChar: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.textContent || ''),
      pointerEvents: cs.pointerEvents,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      hitTag: hit ? hit.tagName : null,
      hitIsSelf: hit === b,
      hitChain: chain,
    };
  });
  console.log(`\nDecorate chip audit: ${JSON.stringify(chip, null, 1)}`);

  // 4. Try clicking it and see whether the mood editor opens.
  if (chip.found && chip.hitIsSelf) {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find((x) => (x.textContent || '').includes('Decorate'));
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    const url = page.url();
    const moodMounted = await page.evaluate(() => document.body.innerText.includes('Back to play'));
    console.log(`\nAfter chip click: url=${url} moodMounted=${moodMounted}`);
  } else {
    console.log('\nChip not click-hittable (hit-test intercepted) — click test skipped.');
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
