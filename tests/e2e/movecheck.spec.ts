import { test, expect } from '@playwright/test';
test('move check', async ({ page }) => {
  await page.goto('/chale-life/?debug=1&e2e=1');
  await page.waitForTimeout(4000);
  const readPos = async () => {
    const text = await page.locator('.debug-overlay').innerText();
    const m = text.match(/pos\s+(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
    return m ? { x: parseFloat(m[1]), z: parseFloat(m[2]) } : null;
  };
  const hold = async (key: string, cond: (p: {x:number;z:number}) => boolean, label: string) => {
    await page.keyboard.down(key);
    for (let i = 0; i < 150; i++) {
      await page.waitForTimeout(120);
      const p = await readPos();
      if (p && cond(p)) { await page.keyboard.up(key); console.log(label, '->', p); return p; }
    }
    await page.keyboard.up(key);
    console.log(label, 'STALL at', await readPos());
  };
  await hold('ArrowRight', (q) => q.x >= -130.6, 'exit yard');
  await hold('ArrowDown', (q) => q.z >= -1.5, 'pavement');
  await hold('ArrowRight', (q) => q.x >= -124.3, 'east column');
  await hold('ArrowDown', (q) => q.z >= -2.9, 'south band');
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(150);
    const q = await readPos();
    console.log(`d${i}:`, q);
    if (q && (q.x + 122.9) ** 2 + (q.z + 2.4) ** 2 <= 0.81) break;
  }
  await page.keyboard.up('ArrowRight');
});
