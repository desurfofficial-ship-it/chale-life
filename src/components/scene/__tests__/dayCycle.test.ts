import { describe, expect, it } from 'vitest';
import {
  lightingAt,
  NIGHT_MIN_AMBIENT,
  NIGHT_MIN_HEMI,
  type WeatherKind,
} from '../dayCycle';

describe('lightingAt', () => {
  it('returns finite values for every hour', () => {
    for (let h = 0; h <= 24; h += 0.5) {
      const L = lightingAt(h, 'clear');
      for (const v of [
        L.hemiIntensity,
        L.ambientIntensity,
        L.sunIntensity,
        L.moonIntensity,
        L.fogDensity,
        L.exposure,
        L.windowGlow,
        L.shadowStrength,
        L.starsOpacity,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Number.isNaN(v)).toBe(false);
      }
    }
  });

  it('ramps windowGlow up into night and down by morning', () => {
    const day = lightingAt(12, 'clear');
    const dusk = lightingAt(18, 'clear');
    const night = lightingAt(22, 'clear');
    const dawn = lightingAt(7, 'clear');
    expect(day.windowGlow).toBeLessThan(0.15);
    expect(night.windowGlow).toBeGreaterThan(0.85);
    expect(dusk.windowGlow).toBeGreaterThan(day.windowGlow);
    expect(dawn.windowGlow).toBeLessThan(night.windowGlow);
  });

  it('day sun is stronger than night sun', () => {
    expect(lightingAt(12, 'clear').sunIntensity).toBeGreaterThan(
      lightingAt(22, 'clear').sunIntensity + 1.5
    );
  });

  it('night ambient+hemi stay above readability floor', () => {
    for (const h of [20, 22, 0, 3, 4.5]) {
      const L = lightingAt(h, 'clear');
      expect(L.ambientIntensity).toBeGreaterThanOrEqual(NIGHT_MIN_AMBIENT - 0.02);
      expect(L.hemiIntensity).toBeGreaterThanOrEqual(NIGHT_MIN_HEMI - 0.05);
    }
  });

  it('rain dims sun but does not go darker than night floor', () => {
    const clearDay = lightingAt(12, 'clear');
    const rainDay = lightingAt(12, 'rain');
    expect(rainDay.sunIntensity).toBeLessThan(clearDay.sunIntensity * 0.75);
    const rainNight = lightingAt(22, 'rain');
    expect(rainNight.ambientIntensity).toBeGreaterThanOrEqual(NIGHT_MIN_AMBIENT - 0.02);
  });

  it('handles NaN / out-of-range hour', () => {
    const L = lightingAt(Number.NaN, 'clear');
    expect(Number.isFinite(L.exposure)).toBe(true);
    expect(lightingAt(-3, 'cloudy').sunIntensity).toBeGreaterThan(0);
    expect(lightingAt(100, 'clear').windowGlow).toBeGreaterThanOrEqual(0);
  });

  it('weather variants all produce valid state', () => {
    const kinds: WeatherKind[] = ['clear', 'cloudy', 'rain'];
    for (const w of kinds) {
      const L = lightingAt(14, w);
      expect(L.fogColor.startsWith('#')).toBe(true);
      expect(L.horizon.length).toBe(7);
    }
  });
});
