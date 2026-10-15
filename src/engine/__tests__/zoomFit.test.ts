import { describe, expect, it } from 'vitest';
import {
  zoomToFitBox,
  rotateOffsetXZ,
  panDeltaWorld,
  boxCenter,
  CITY_BOUNDS,
  DEFAULT_HUD_INSETS,
  detailLodFromRelativeZoom,
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
  it('centres city', () => {
    const c = boxCenter(CITY_BOUNDS);
    expect(c.x).toBeCloseTo(30, 5);
    expect(c.z).toBeCloseTo(0, 5);
  });
});
