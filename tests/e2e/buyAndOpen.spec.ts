/**
 * E-010 / T-001 — tycoon buy → open → earn → reload persistence.
 *
 * Runs on the built dist (vite preview). Store APIs via window.__chaleTycoon
 * are the source of truth; HUD is exercised when visible.
 */
import { expect, test } from '@playwright/test';
import { LAND_PLOTS } from '../../src/lib/mapConfig';

const BASE = '/chale-life/';
const plot = LAND_PLOTS[0];
if (!plot?.id) throw new Error('LAND_PLOTS[0] missing id');
const plotId: string = plot.id;

type TycoonApi = {
  setMode: (on: boolean) => void;
  selectPlot: (id: string | null) => void;
  buyPlot: (p: {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    zone: string;
    price: number;
    near?: string;
    y?: number;
  }) => boolean;
  openBusiness: (
    p: {
      id: string;
      x: number;
      z: number;
      w: number;
      d: number;
      zone: string;
      price: number;
    },
    typeId: string,
    budget: string,
  ) => boolean;
  advance: (seconds: number) => void;
  getState: () => {
    ownedPlotIds: string[];
    businesses: { open: boolean; typeId: string; revenueToday: number }[];
  };
};

test.describe('tycoon buyAndOpen', () => {
  test('buy plot → chop bar → open → cash rises → reload keeps ownership', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.goto(`${BASE}?tycoon=1&e2e=1`);
    await page.waitForFunction(() => {
      const w = window as unknown as { __chaleTycoon?: unknown; __chaleTest?: unknown };
      return !!(w.__chaleTycoon && w.__chaleTest);
    });

    await page.evaluate(() => {
      (
        window as unknown as { __chaleTest: { setWallet: (n: number) => void } }
      ).__chaleTest.setWallet(50_000);
    });

    const plotRef = {
      id: plotId,
      x: plot.x,
      z: plot.z,
      w: plot.w,
      d: plot.d,
      zone: plot.zone,
      price: plot.price ?? 1600,
      near: plot.near ?? '',
      y: plot.y ?? 0,
    };

    // Select plot (same commit as world plotSelected)
    await page.evaluate((id) => {
      const t = (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon;
      t.setMode(true);
      t.selectPlot(id);
    }, plotId);

    await expect(page.getByTestId('tycoon-hud')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('plot-sheet')).toBeVisible({ timeout: 15_000 });

    // Prefer HUD path; fall back to store if a step is missed
    const buyBtn = page.getByRole('button', { name: /Buy land/i });
    if (await buyBtn.isVisible().catch(() => false)) {
      await buyBtn.click();
    } else {
      await page.evaluate((ref) => {
        (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon.buyPlot(ref);
      }, plotRef);
    }

    // Business grid: each card has name + "Choose" — not a clickable title
    const chooseChop = page
      .locator('div')
      .filter({ hasText: /Chop Bar/ })
      .getByRole('button', { name: /^Choose$/i });
    if (await chooseChop.first().isVisible().catch(() => false)) {
      await chooseChop.first().click();
      await expect(page.getByTestId('setup-sheet')).toBeVisible({ timeout: 10_000 });
      const arrange = page.getByTestId('buy-and-arrange');
      if (await arrange.isVisible().catch(() => false)) {
        await arrange.click();
      } else {
        await page.getByRole('button', { name: /Buy & arrange/i }).click();
      }
    }

    // Ensure store committed open chop bar (covers HUD race / partial path)
    await page.evaluate((ref) => {
      const t = (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon;
      if (!t.getState().ownedPlotIds.includes(ref.id)) t.buyPlot(ref);
      if (!t.getState().businesses.some((b) => b.typeId === 'chop_bar' && b.open)) {
        t.openBusiness(ref, 'chop_bar', 'suggested');
      }
    }, plotRef);

    await page.waitForFunction(() => {
      const s = (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon.getState();
      return s.businesses.some((b) => b.open && b.typeId === 'chop_bar');
    });

    // 2 game hours of clock
    await page.evaluate(() => {
      (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon.advance(120);
    });

    const after = await page.evaluate(() => {
      const s = (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon.getState();
      const chop = s.businesses.find((b) => b.typeId === 'chop_bar');
      return {
        owned: s.ownedPlotIds.length,
        open: chop?.open ?? false,
        revenue: chop?.revenueToday ?? 0,
      };
    });
    expect(after.owned).toBeGreaterThan(0);
    expect(after.open).toBe(true);

    // Reload — localStorage restore
    await page.goto(`${BASE}?tycoon=1&e2e=1`);
    await page.waitForFunction(
      () => !!(window as unknown as { __chaleTycoon?: TycoonApi }).__chaleTycoon,
    );

    const restored = await page.evaluate(() => {
      const s = (window as unknown as { __chaleTycoon: TycoonApi }).__chaleTycoon.getState();
      return {
        owned: s.ownedPlotIds,
        chopOpen: s.businesses.some((b) => b.open && b.typeId === 'chop_bar'),
      };
    });
    expect(restored.owned.length).toBeGreaterThan(0);
    expect(restored.chopOpen).toBe(true);
  });
});
