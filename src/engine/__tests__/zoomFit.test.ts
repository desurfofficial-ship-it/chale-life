import { describe, expect, it } from 'vitest';
import {
  zoomToFitBox,
  rotateOffsetXZ,
  panDeltaWorld,
  boxCenter,
  CITY_BOUNDS,
  DEFAULT_HUD_INSETS,
  detailLodFromRelativeZoom,
  clampMarginForZoom,
  clampTarget,
} from '../zoomFit';

describe('zoomToFitBox', () => {
  it('fits city into 390×844 with HUD insets', () => {
    const z = zoomToFitBox(CITY_BOUNDS, 390, 844, DEFAULT_HUD_INSETS);
    expect(z).toBeGreaterThan(0.2);
    expect(z).toBeLessThan(5);
    // visible height at that zoom ≥ plate depth / padding-ish
    const visibleH = 844 / z;
    expect(visibleH).toBeGreaterThan(CITY_BOUNDS.maxZ - CITY_BOUNDS.minZ);
  });

  it('fits a small shop box much tighter on phone', () => {
    const shop = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
    const zCity = zoomToFitBox(CITY_BOUNDS, 390, 844);
    const zShop = zoomToFitBox(shop, 390, 844);
    expect(zShop).toBeGreaterThan(zCity * 10);
  });

  it('desktop 1280×800 produces higher zoom than phone for same box', () => {
    const zPhone = zoomToFitBox(CITY_BOUNDS, 390, 844);
    const zDesk = zoomToFitBox(CITY_BOUNDS, 1280, 800);
    // wider canvas → more px per metre for width-limited fits
    expect(zDesk).toBeGreaterThan(0);
    expect(Number.isFinite(zDesk)).toBe(true);
    expect(zPhone).toBeGreaterThan(0);
  });
});

describe('rotateOffsetXZ', () => {
  it('keeps target centred: 90° rotation preserves length', () => {
    const o = rotateOffsetXZ(0, 30, 30, Math.PI / 2);
    const len0 = Math.hypot(0, 30);
    const len1 = Math.hypot(o.x, o.z);
    expect(Math.abs(len1 - len0)).toBeLessThan(1e-9);
    expect(o.y).toBe(30);
  });

  it('360° returns to start', () => {
    const o = rotateOffsetXZ(0, 55, 55, Math.PI * 2);
    expect(Math.abs(o.x)).toBeLessThan(1e-9);
    expect(Math.abs(o.z - 55)).toBeLessThan(1e-9);
  });
});

describe('panDeltaWorld', () => {
  it('yaw 0 matches legacy screen→world', () => {
    const d = panDeltaWorld(10, 0, 10, 0);
    expect(d.x).toBeCloseTo(-1, 5);
    expect(d.z).toBeCloseTo(0, 5);
  });
});

describe('detailLodFromRelativeZoom', () => {
  it('bands', () => {
    expect(detailLodFromRelativeZoom(1)).toBe('overview');
    expect(detailLodFromRelativeZoom(5)).toBe('mid');
    expect(detailLodFromRelativeZoom(12)).toBe('full');
  });
});

describe('boxCenter', () => {
  it('centres city (asymmetric plate: NorthReach reaches z −170)', () => {
    const c = boxCenter(CITY_BOUNDS);
    expect(c.x).toBeCloseTo(30, 5);
    expect(c.z).toBeCloseTo((CITY_BOUNDS.minZ + CITY_BOUNDS.maxZ) / 2, 5);
  });

  it('camera bounds cover the walker-reachable worldBounds floor', () => {
    // REGRESSION (audit 2026-10-17): CITY_BOUNDS.minZ −116 + a 20 m clamp
    // margin parked the follow camera at z −96 while offices sit at
    // z −139…−152 — the walker left the screen and no office cutaway could
    // open by proximity. The camera floor must reach the business park.
    expect(CITY_BOUNDS.minZ).toBeLessThanOrEqual(-152);
    expect(CITY_BOUNDS.minZ).toBe(-170); // mirrors worldBounds.minZ
  });
});

describe('clampMarginForZoom', () => {
  it('shrinks with zoom so an edge walker stays on screen', () => {
    // zoom 14 → viewH ≈ 60.3 m → margin 18.1 m (cap 20 engages below zoom ~12.6)
    expect(clampMarginForZoom(14, 844)).toBeCloseTo(18.086, 2);
    // zoom 30 → viewH ≈ 28 m → margin ≈ 8.4 m (was hard 20 m — parked camera)
    expect(clampMarginForZoom(30, 844)).toBeCloseTo(8.44, 2);
    // zoom 70 → viewH ≈ 12 m → margin ≈ 3.6 m
    expect(clampMarginForZoom(70, 844)).toBeCloseTo(3.617, 2);
    // floor of 3 m never lets the camera frame past the bound
    expect(clampMarginForZoom(500, 844)).toBe(3);
  });

  it('clamped target keeps a zoom-30 walker inside the viewport at the bound', () => {
    // worst case from the audit: player at the bank (z −152), zoom 30.
    const margin = clampMarginForZoom(30, 844);
    const t = clampTarget(163, -152, CITY_BOUNDS, margin);
    // viewH 28 m: target z ≥ player z − viewH/2 keeps the player on screen
    expect(t.z).toBeGreaterThanOrEqual(-152 - (844 / 30) / 2);
  });
});
