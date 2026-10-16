/**
 * Ambient day clock for walking mode when tycoon clock is off (L-001).
 * Starts at 09:00. 1 real minute = 10 game minutes. Persisted.
 */

import type { WeatherKind } from '../components/scene/dayCycle';

const KEY = 'chale.ambient.clock.v1';

interface Saved {
  minutes: number; // 0..24*60
  savedAtMs: number;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { minutes: 9 * 60, savedAtMs: Date.now() };
    const p = JSON.parse(raw) as Saved;
    if (!Number.isFinite(p.minutes)) return { minutes: 9 * 60, savedAtMs: Date.now() };
    return p;
  } catch {
    return { minutes: 9 * 60, savedAtMs: Date.now() };
  }
}

let minutes = 9 * 60;
let weather: WeatherKind = 'clear';

function init() {
  if (typeof window === 'undefined') return;
  const s = load();
  // Offline catch-up: 1 real min → 10 game min, cap 8 h game
  const elapsedRealMin = Math.max(0, (Date.now() - s.savedAtMs) / 60_000);
  const catchUp = Math.min(8 * 60, elapsedRealMin * 10);
  minutes = (s.minutes + catchUp) % (24 * 60);
  // URL overrides
  const q = new URLSearchParams(window.location.search);
  const h = q.get('hour');
  if (h != null && h !== '') {
    const n = Number(h);
    if (Number.isFinite(n)) minutes = ((n % 24) + 24) % 24 * 60;
  }
  const w = q.get('weather');
  if (w === 'rain' || w === 'cloudy' || w === 'clear') weather = w;
}
if (typeof window !== 'undefined') init();

// ── world re-render bucket (external store for GameCanvas) ─────────────
// AccraWorld only needs a React re-render when the lighting bucket (a
// quarter game-hour) or the weather changes. Emitting from here — instead
// of a 2 s setState at the GameCanvas root — means the world tree
// reconciles ~96×/game-day instead of twice a minute, and the ambient
// clock advances exactly once per frame (AmbientTick's useFrame only).

export interface WorldTimeSnapshot {
  hour: number; // fractional hours, floored to the lighting bucket
  weather: WeatherKind;
}

const BUCKET_MIN = 15; // game-minutes per lighting bucket

const worldTimeListeners = new Set<() => void>();
// Declared after init() so the bucket starts from the URL/persisted time.
let lastBucket = Math.floor(minutes / BUCKET_MIN);
let worldTime: WorldTimeSnapshot = {
  hour: (lastBucket * BUCKET_MIN) / 60,
  weather,
};

function emitWorldTime(): void {
  worldTime = { hour: (lastBucket * BUCKET_MIN) / 60, weather };
  for (const fn of worldTimeListeners) fn();
}

function checkBucket(): void {
  const b = Math.floor(minutes / BUCKET_MIN);
  if (b !== lastBucket) {
    lastBucket = b;
    emitWorldTime();
  }
}

export function subscribeWorldTime(fn: () => void): () => void {
  worldTimeListeners.add(fn);
  return () => {
    worldTimeListeners.delete(fn);
  };
}

export function getWorldTime(): WorldTimeSnapshot {
  return worldTime;
}

/** Test hook: restore the pristine 09:00 clear clock, bucket included. */
export function __resetAmbientClockForTests(): void {
  minutes = 9 * 60;
  lastBucket = Math.floor(minutes / BUCKET_MIN);
  weather = 'clear';
  worldTime = { hour: (lastBucket * BUCKET_MIN) / 60, weather };
}

/** Advance from rAF real-dt. Call from GameLoop or GameCanvas. */
export function tickAmbientClock(realDtSec: number): void {
  // 1 real min = 10 game min → 10/60 game-min per real-sec
  minutes = (minutes + realDtSec * (10 / 60)) % (24 * 60);
  checkBucket();
}

export function getAmbientHour(): number {
  return minutes / 60;
}

export function getAmbientWeather(): WeatherKind {
  return weather;
}

export function setAmbientWeather(w: WeatherKind): void {
  if (w === weather) return;
  weather = w;
  emitWorldTime();
}

export function persistAmbientClock(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ minutes, savedAtMs: Date.now() }));
  } catch {
    /* private mode */
  }
}

// Persist occasionally
if (typeof window !== 'undefined') {
  setInterval(persistAmbientClock, 15_000);
  window.addEventListener('pagehide', persistAmbientClock);
}
