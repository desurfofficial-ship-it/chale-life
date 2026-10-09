/**
 * G-008d item 7 — the Act layout clearance spec.
 *
 * The iPhone review found the centred Act pill and its centred reason
 * line crossing the joystick ring (x 10–118). G-008d item 6 moved the
 * pill to the bottom-RIGHT thumb zone with the reason above it,
 * right-aligned, width-capped at calc(100vw − joystick right edge 118px −
 * 32px). This spec pins the geometry at the three product viewports —
 * 360×780, 375×667, 390×844 — with the game's LONGEST label and reason
 * forced through the ?e2e=1 hook (window.__chaleTest.setActPrompt), so
 * no robot walk is needed and the worst case is deterministic:
 *
 *   - longest enabled label: "Buy waakye ₵12" (the front counter offer)
 *   - longest reason: the wrong-spot bench hint — derived from the data
 *     ("Wrong spot — this step happens at Daavi's bench (north pavement).")
 *
 * The property: at every viewport, the bounding boxes of the Act pill
 * and the reason line never intersect the joystick ring's bounding box,
 * and the pill never overflows the viewport's right edge.
 */

import { expect, test, type Page } from '@playwright/test';
import { findJobById } from '../../src/data/jobs';

const HUSTLE_ID = 'HUSTLE_AUNTY_BA_STARTER';

/** Longest enabled label in the game (derived from the food data). */
const LONGEST_LABEL = 'Buy waakye ₵12';
/** Longest reason in the game — the wrong-spot hint naming the bench. */
const LONGEST_REASON = `Wrong spot — this step happens at ${
  findJobById(HUSTLE_ID)!.steps[1].targetLocationName
}.`;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** AABB intersection test (touching edges do not count as intersecting). */
function intersects(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

async function boxOf(page: Page, selector: string): Promise<Box> {
  const el = page.locator(selector);
  await el.waitFor({ state: 'visible' });
  return (await el.boundingBox()) as Box;
}

/** Force the longest label (enabled) or reason (disabled) through the hook. */
async function setActPrompt(
  page: Page,
  o: { label?: string; enabled?: boolean; reason?: string | null } | null
): Promise<void> {
  await page.evaluate((override) => {
    (
      window as unknown as {
        __chaleTest: {
          setActPrompt: (
            o: { label?: string; enabled?: boolean; reason?: string | null } | null
          ) => void;
        };
      }
    ).__chaleTest.setActPrompt(override);
  }, o);
}

const VIEWPORTS: Array<[number, number]> = [
  [360, 780],
  [375, 667],
  [390, 844],
];

for (const [width, height] of VIEWPORTS) {
  test(`Act pill and reason never intersect the joystick ring at ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const shot = (name: string) => testInfo.outputPath(name);
    await page.setViewportSize({ width, height });
    await page.goto('/chale-life/?debug=1&e2e=1');
    await expect(page.getByText('₵20', { exact: true })).toBeVisible();

    const ring = await boxOf(page, '.joystick');

    // ── Phase 1: the longest ENABLED label on the pill ───────────────────
    await setActPrompt(page, { label: LONGEST_LABEL, enabled: true, reason: null });
    const pill = await boxOf(page, '[data-testid="act-pill"]');
    expect(
      intersects(pill, ring),
      `pill ${JSON.stringify(pill)} must clear ring ${JSON.stringify(ring)}`
    ).toBe(false);
    // The pill hugs the bottom-right thumb zone and stays inside the view.
    expect(pill.x + pill.width).toBeLessThanOrEqual(width);
    expect(pill.y + pill.height).toBeLessThanOrEqual(height);
    // Bottom aligned with the joystick (within 2 px — the same 14px +
    // safe-area baseline; safe-area insets are 0 in headless Chromium).
    expect(Math.abs(pill.y + pill.height - (ring.y + ring.height))).toBeLessThanOrEqual(2);

    // ── Phase 2: the longest DISABLED state — pill + reason together ─────
    await setActPrompt(page, { label: 'Help Daavi', enabled: false, reason: LONGEST_REASON });
    const pill2 = await boxOf(page, '[data-testid="act-pill"]');
    const reason = await boxOf(page, '[data-testid="act-reason"]');
    expect(
      intersects(pill2, ring),
      `pill ${JSON.stringify(pill2)} must clear ring ${JSON.stringify(ring)}`
    ).toBe(false);
    expect(
      intersects(reason, ring),
      `reason ${JSON.stringify(reason)} must clear ring ${JSON.stringify(ring)}`
    ).toBe(false);
    // The reason sits ABOVE the pill, right-aligned with it, inside the view.
    expect(reason.y + reason.height).toBeLessThanOrEqual(pill2.y + 2);
    expect(Math.abs(reason.x + reason.width - (pill2.x + pill2.width))).toBeLessThanOrEqual(2);
    expect(reason.x).toBeGreaterThanOrEqual(0);
    expect(reason.x + reason.width).toBeLessThanOrEqual(width);

    await page.screenshot({ path: shot(`act-layout-${width}x${height}.png`) });
    // Leave the game clean for the other viewports (ordered workers=1).
    await setActPrompt(page, null);
  });
}
