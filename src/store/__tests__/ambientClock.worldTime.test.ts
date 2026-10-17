import { beforeEach, describe, expect, it } from 'vitest';

// node test env: minimal in-memory localStorage (ambientClock reads it at
// module load, and persistAmbientClock writes it)
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;

import {
  __resetAmbientClockForTests,
  getWorldTime,
  setAmbientWeather,
  subscribeWorldTime,
  tickAmbientClock,
  type WorldTimeSnapshot,
} from '../ambientClock';

// P1-1: the world re-renders only when the quarter-hour lighting bucket or
// the weather changes (external store), and the ambient clock advances
// exactly once — the old 2 s timer both re-rendered the whole world tree
// and double-advanced the clock against AmbientTick's useFrame.

describe('ambientClock world-time external store', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetAmbientClockForTests();
  });

  it('starts from the default 09:00 clear clock in the node test env', () => {
    const t: WorldTimeSnapshot = getWorldTime();
    expect(t.hour).toBe(9);
    expect(t.weather).toBe('clear');
  });

  it('emits only when a quarter-hour lighting bucket is crossed', () => {
    let emits = 0;
    const unsub = subscribeWorldTime(() => {
      emits += 1;
    });

    // 1 real sec = 10/60 game-min → 30 real s = 5 game-min: same bucket.
    expect(getWorldTime().hour).toBe(9); // aligned to a bucket boundary
    tickAmbientClock(30);
    expect(emits).toBe(0);

    // +90 real s = +15 game-min → crosses into the 09:15 bucket.
    tickAmbientClock(90);
    expect(emits).toBe(1);
    expect(getWorldTime().hour).toBeCloseTo(9.25, 5);

    // Unsubscribed listeners stop emitting; the store itself keeps up.
    unsub();
    tickAmbientClock(90);
    expect(emits).toBe(1);
    expect(getWorldTime().hour).toBeCloseTo(9.5, 5);
  });

  it('emits when the weather changes, and only then', () => {
    let emits = 0;
    const unsub = subscribeWorldTime(() => {
      emits += 1;
    });

    setAmbientWeather('rain');
    expect(getWorldTime().weather).toBe('rain');
    expect(emits).toBe(1);

    setAmbientWeather('rain');
    expect(emits).toBe(1);

    setAmbientWeather('clear');
    expect(getWorldTime().weather).toBe('clear');
    expect(emits).toBe(2);
    unsub();
  });

  it('wraps the bucket at midnight without a stale hour', () => {
    // From 09:00, 15 game-h = 900 game-min = 5,400 real-sec lands exactly on
    // midnight; +1 real-sec keeps the result safely inside the 00:00 bucket
    // (no FP boundary flirt). The bucket wraps 36 → 0 and the snapshot hour
    // wraps to 0, not 24.
    let emits = 0;
    const unsub = subscribeWorldTime(() => {
      emits += 1;
    });
    expect(getWorldTime().hour).toBe(9);
    tickAmbientClock(5_401);
    expect(getWorldTime().hour).toBe(0);
    expect(emits).toBe(1);
    unsub();
  });
});
