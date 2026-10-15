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
let lastTickMs = Date.now();
let weather: WeatherKind = 'clear';

function init() {
  if (typeof window === 'undefined') return;
  const s = load();
  // Offline catch-up: 1 real min → 10 game min, cap 8 h game
  const elapsedRealMin = Math.max(0, (Date.now() - s.savedAtMs) / 60_000);
  const catchUp = Math.min(8 * 60, elapsedRealMin * 10);
  minutes = (s.minutes + catchUp) % (24 * 60);
  lastTickMs = Date.now();
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

/** Advance from rAF real-dt. Call from GameLoop or GameCanvas. */
export function tickAmbientClock(realDtSec: number): void {
  // 1 real min = 10 game min → 10/60 game-min per real-sec
  minutes = (minutes + realDtSec * (10 / 60)) % (24 * 60);
  lastTickMs = Date.now();
}

export function getAmbientHour(): number {
  return minutes / 60;
}

export function getAmbientWeather(): WeatherKind {
  return weather;
}

export function setAmbientWeather(w: WeatherKind): void {
  weather = w;
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
