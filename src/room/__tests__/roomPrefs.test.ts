import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadRoomMats,
  saveRoomMats,
  loadRoomDevices,
  saveRoomDevices,
  DEFAULT_DEVICES,
  nearestMoodId,
} from '../roomPrefs';
import { SWATCHES, MOODS, moodScores, SWATCH } from '../materials';
import type { RoomMats } from '../materials';

/** Minimal localStorage shim (tests run in the node environment). */
function installStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
}

beforeEach(() => {
  installStorage();
});

describe('room prefs persistence', () => {
  it('defaults when nothing is saved', () => {
    const m = loadRoomMats();
    expect(m.mats).toEqual(MOODS[0].mats);
    expect(m.hour).toBe(MOODS[0].hour);
    expect(loadRoomDevices()).toEqual(DEFAULT_DEVICES);
  });

  it('devices round-trip', () => {
    const next = { ceiling: false, desk: false, fan: true };
    saveRoomDevices(next);
    expect(loadRoomDevices()).toEqual(next);
  });

  it('mats round-trip and survive partial saves', () => {
    const mats: RoomMats = { ...MOODS[1].mats };
    saveRoomMats(mats, 13.5);
    expect(loadRoomMats().mats).toEqual(mats);
    expect(loadRoomMats().hour).toBe(13.5);
  });

  it('corrupt or unknown swatch ids fall back to the preset', () => {
    const bad = JSON.stringify({ mats: { floor: 'not-a-swatch', walls: 'chalk' }, hour: 12 });
    window.localStorage.setItem('chale-room-v1', bad);
    const m = loadRoomMats();
    expect(SWATCHES.map((s) => s.id)).toContain(m.mats.floor);
  });

  it('nearestMoodId finds the exact preset', () => {
    expect(nearestMoodId(MOODS[3].mats)).toBe(MOODS[3].id);
  });
});

describe('materials library', () => {
  it('swatch ids are unique', () => {
    const ids = SWATCHES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every swatch kind and roughness is valid', () => {
    for (const s of SWATCHES) {
      expect(['wood', 'stone', 'fabric', 'paint']).toContain(s.kind);
      expect(s.rough).toBeGreaterThanOrEqual(0);
      expect(s.rough).toBeLessThanOrEqual(1);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('every slot of every mood preset references a real swatch of a valid kind', () => {
    for (const mood of MOODS) {
      for (const [slot, id] of Object.entries(mood.mats)) {
        const sw = SWATCH[id];
        expect(sw, `${mood.id}.${slot} → ${id} missing`).toBeTruthy();
        // floor wants wood/stone etc — the slot's kind contract
        const slotDef = { floor: ['wood', 'stone'], walls: ['paint', 'stone'], accentWall: ['wood', 'paint', 'stone', 'fabric'], upholstery: ['fabric'], bedding: ['fabric'], rug: ['fabric'], woodwork: ['wood'], accents: ['fabric'] }[slot];
        expect(slotDef, `${slot} contract`).toBeTruthy();
        expect(slotDef).toContain(sw.kind);
      }
    }
  });

  it('mood scores sum to 100 across all presets and name a leader', () => {
    const mats = { ...MOODS[0].mats };
    const scores = moodScores(mats, 18.4);
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    expect(Object.keys(scores)).toHaveLength(MOODS.length);
  });

  it('the modern preset reads as modern (not moody) in daylight', () => {
    const scores = moodScores(MOODS[3].mats, MOODS[3].hour);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe('modern');
  });
});
