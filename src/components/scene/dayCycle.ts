/**
 * dayCycle.ts — pure lighting keyframes for Accra day/night (L-001).
 * No three.js, no React. Interpolates sky, lights, fog, exposure, windowGlow.
 */

export type WeatherKind = 'clear' | 'cloudy' | 'rain';

export interface LightingState {
  /** Sky shader colours (hex) */
  horizon: string;
  mid: string;
  top: string;
  haze: string;
  /** Normalized sun/moon direction for the sky band (world) */
  sunDir: readonly [number, number, number];
  sunBand: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  /** Light position direction (will be scaled to distance) */
  sunDirPos: readonly [number, number, number];
  moonColor: string;
  moonIntensity: number;
  moonDirPos: readonly [number, number, number];
  fogColor: string;
  fogDensity: number;
  exposure: number;
  /** 0 day … 1 full night glow on windows/signs */
  windowGlow: number;
  /** 0..1 shadow intensity multiplier */
  shadowStrength: number;
  /** Stars opacity 0..1 */
  starsOpacity: number;
}

interface Keyframe {
  hour: number;
  horizon: string;
  mid: string;
  top: string;
  haze: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  /** elevation-ish: y component of sun direction */
  sunElev: number;
  sunAzim: number; // radians-ish as xz weights
  moonIntensity: number;
  fogColor: string;
  fogDensity: number;
  exposure: number;
  windowGlow: number;
  shadowStrength: number;
  starsOpacity: number;
  sunBand: number;
}

/** Keyframes cover a full 24 h loop (hour 0 and 24 match). */
const KEYS: readonly Keyframe[] = [
  // deep night
  {
    hour: 0,
    horizon: '#2a3550',
    mid: '#1a2238',
    top: '#0c101c',
    haze: '#1f2a3d',
    hemiSky: '#7086b4',
    hemiGround: '#2c3140',
    hemiIntensity: 0.92,
    ambientColor: '#8b9cc2',
    ambientIntensity: 0.36,
    sunColor: '#a9bde0',
    sunIntensity: 0.05,
    sunElev: -0.2,
    sunAzim: 0.3,
    moonIntensity: 1.05,
    fogColor: '#1f2a3d',
    fogDensity: 0.00115,
    exposure: 1.28,
    windowGlow: 1,
    shadowStrength: 0.12,
    starsOpacity: 1,
    sunBand: 0.05,
  },
  // pre-dawn
  {
    hour: 5,
    horizon: '#c9a0a8',
    mid: '#6a7098',
    top: '#2a3050',
    haze: '#4a5068',
    hemiSky: '#a8b4d0',
    hemiGround: '#5a5048',
    hemiIntensity: 0.85,
    ambientColor: '#a09098',
    ambientIntensity: 0.32,
    sunColor: '#ffc8b0',
    sunIntensity: 0.35,
    sunElev: 0.08,
    sunAzim: -0.5,
    moonIntensity: 0.25,
    fogColor: '#6a7088',
    fogDensity: 0.0010,
    exposure: 1.15,
    windowGlow: 0.55,
    shadowStrength: 0.35,
    starsOpacity: 0.35,
    sunBand: 0.25,
  },
  // dawn 05–07 soft pink-blue
  {
    hour: 6.5,
    horizon: '#f2c4b0',
    mid: '#8aa0c8',
    top: '#4a68a0',
    haze: '#c8d4e0',
    hemiSky: '#d0dceb',
    hemiGround: '#c0a888',
    hemiIntensity: 0.95,
    ambientColor: '#e8dcd0',
    ambientIntensity: 0.28,
    sunColor: '#ffe8d0',
    sunIntensity: 1.2,
    sunElev: 0.25,
    sunAzim: -0.55,
    moonIntensity: 0,
    fogColor: '#c8d8e6',
    fogDensity: 0.00075,
    exposure: 1.12,
    windowGlow: 0.15,
    shadowStrength: 0.7,
    starsOpacity: 0,
    sunBand: 0.45,
  },
  // morning / day peak 08–16
  {
    hour: 8,
    horizon: '#d8e6ee',
    mid: '#9ec0e0',
    top: '#4a7ab8',
    haze: '#d8e6ee',
    hemiSky: '#e6eef7',
    hemiGround: '#cdb98f',
    hemiIntensity: 1.0,
    ambientColor: '#f0ece4',
    ambientIntensity: 0.3,
    sunColor: '#fff4e0',
    sunIntensity: 2.35,
    sunElev: 0.55,
    sunAzim: -0.35,
    moonIntensity: 0,
    fogColor: '#d8e6ee',
    fogDensity: 0.00055,
    exposure: 1.1,
    windowGlow: 0,
    shadowStrength: 1,
    starsOpacity: 0,
    sunBand: 0.55,
  },
  {
    hour: 12,
    horizon: '#c8dce8',
    mid: '#88b4d8',
    top: '#3a6aa8',
    haze: '#d0e0ea',
    hemiSky: '#e8f0f8',
    hemiGround: '#d0b888',
    hemiIntensity: 1.05,
    ambientColor: '#f4f0e8',
    ambientIntensity: 0.32,
    sunColor: '#fff8ec',
    sunIntensity: 2.5,
    sunElev: 0.72,
    sunAzim: 0.05,
    moonIntensity: 0,
    fogColor: '#d0e4ee',
    fogDensity: 0.00048,
    exposure: 1.08,
    windowGlow: 0,
    shadowStrength: 1,
    starsOpacity: 0,
    sunBand: 0.6,
  },
  {
    hour: 16,
    horizon: '#e8d4b0',
    mid: '#c0a878',
    top: '#6080a8',
    haze: '#e0d0b8',
    hemiSky: '#f0e4d0',
    hemiGround: '#c8a878',
    hemiIntensity: 0.98,
    ambientColor: '#f0e4d0',
    ambientIntensity: 0.3,
    sunColor: '#ffd29a',
    sunIntensity: 2.0,
    sunElev: 0.35,
    sunAzim: 0.55,
    moonIntensity: 0,
    fogColor: '#e4d8c0',
    fogDensity: 0.00065,
    exposure: 1.12,
    windowGlow: 0.05,
    shadowStrength: 0.9,
    starsOpacity: 0,
    sunBand: 0.7,
  },
  // golden 16–18:30
  {
    hour: 17.5,
    horizon: '#ffb070',
    mid: '#d07050',
    top: '#4a4068',
    haze: '#c89070',
    hemiSky: '#f0c090',
    hemiGround: '#a87850',
    hemiIntensity: 0.9,
    ambientColor: '#e8c8a0',
    ambientIntensity: 0.28,
    sunColor: '#ffb060',
    sunIntensity: 1.55,
    sunElev: 0.12,
    sunAzim: 0.7,
    moonIntensity: 0.1,
    fogColor: '#b88868',
    fogDensity: 0.00085,
    exposure: 1.15,
    windowGlow: 0.25,
    shadowStrength: 0.55,
    starsOpacity: 0.1,
    sunBand: 0.85,
  },
  // dusk → night
  {
    hour: 19.5,
    horizon: '#806070',
    mid: '#403858',
    top: '#181428',
    haze: '#3a3050',
    hemiSky: '#7888b0',
    hemiGround: '#383848',
    hemiIntensity: 0.88,
    ambientColor: '#9098b8',
    ambientIntensity: 0.34,
    sunColor: '#a0b0d0',
    sunIntensity: 0.15,
    sunElev: -0.05,
    sunAzim: 0.75,
    moonIntensity: 0.75,
    fogColor: '#2a3048',
    fogDensity: 0.00105,
    exposure: 1.22,
    windowGlow: 0.85,
    shadowStrength: 0.2,
    starsOpacity: 0.7,
    sunBand: 0.2,
  },
  {
    hour: 22,
    horizon: '#2a3550',
    mid: '#1a2238',
    top: '#0c101c',
    haze: '#1f2a3d',
    hemiSky: '#7086b4',
    hemiGround: '#2c3140',
    hemiIntensity: 0.92,
    ambientColor: '#8b9cc2',
    ambientIntensity: 0.36,
    sunColor: '#a9bde0',
    sunIntensity: 0.05,
    sunElev: -0.2,
    sunAzim: 0.3,
    moonIntensity: 1.05,
    fogColor: '#1f2a3d',
    fogDensity: 0.00115,
    exposure: 1.28,
    windowGlow: 1,
    shadowStrength: 0.12,
    starsOpacity: 1,
    sunBand: 0.05,
  },
  // close loop
  {
    hour: 24,
    horizon: '#2a3550',
    mid: '#1a2238',
    top: '#0c101c',
    haze: '#1f2a3d',
    hemiSky: '#7086b4',
    hemiGround: '#2c3140',
    hemiIntensity: 0.92,
    ambientColor: '#8b9cc2',
    ambientIntensity: 0.36,
    sunColor: '#a9bde0',
    sunIntensity: 0.05,
    sunElev: -0.2,
    sunAzim: 0.3,
    moonIntensity: 1.05,
    fogColor: '#1f2a3d',
    fogDensity: 0.00115,
    exposure: 1.28,
    windowGlow: 1,
    shadowStrength: 0.12,
    starsOpacity: 1,
    sunBand: 0.05,
  },
];

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 12;
  let x = h % 24;
  if (x < 0) x += 24;
  return x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}

function dirFromElevAzim(elev: number, azim: number): [number, number, number] {
  const y = Math.max(-0.3, Math.min(1, elev));
  const xz = Math.sqrt(Math.max(0.05, 1 - y * y));
  const x = -Math.cos(azim) * xz;
  const z = Math.sin(azim) * xz;
  return [x, y, z];
}

function sampleKeys(hour: number): { a: Keyframe; b: Keyframe; t: number } {
  const h = clampHour(hour);
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].hour <= h) i++;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const span = b.hour - a.hour || 1;
  const t = Math.max(0, Math.min(1, (h - a.hour) / span));
  return { a, b, t };
}

/** Pure lighting snapshot for a game hour and weather. */
export function lightingAt(hour: number, weather: WeatherKind = 'clear'): LightingState {
  const { a, b, t } = sampleKeys(hour);
  const sunElev = lerp(a.sunElev, b.sunElev, t);
  const sunAzim = lerp(a.sunAzim, b.sunAzim, t);
  const sunDirPos = dirFromElevAzim(sunElev, sunAzim);
  // moon high opposite
  const moonDirPos: [number, number, number] = [
    -sunDirPos[0] * 0.4 + 0.3,
    0.85,
    -sunDirPos[2] * 0.4 - 0.2,
  ];

  let sunIntensity = lerp(a.sunIntensity, b.sunIntensity, t);
  let hemiIntensity = lerp(a.hemiIntensity, b.hemiIntensity, t);
  let ambientIntensity = lerp(a.ambientIntensity, b.ambientIntensity, t);
  let fogDensity = lerp(a.fogDensity, b.fogDensity, t);
  let fogColor = lerpHex(a.fogColor, b.fogColor, t);
  let exposure = lerp(a.exposure, b.exposure, t);
  let horizon = lerpHex(a.horizon, b.horizon, t);
  let mid = lerpHex(a.mid, b.mid, t);
  let top = lerpHex(a.top, b.top, t);
  let haze = lerpHex(a.haze, b.haze, t);

  if (weather === 'cloudy' || weather === 'rain') {
    const dim = weather === 'rain' ? 0.6 : 0.7; // ~35% sun cut for rain-ish
    sunIntensity *= dim;
    hemiIntensity = Math.min(1.15, hemiIntensity * 1.08);
    ambientIntensity = Math.min(0.45, ambientIntensity * 1.12);
    fogDensity *= weather === 'rain' ? 1.35 : 1.18;
    // grey the fog / sky a bit
    fogColor = lerpHex(fogColor, '#8a9098', 0.35);
    horizon = lerpHex(horizon, '#a8b0b8', 0.25);
    mid = lerpHex(mid, '#788088', 0.3);
    top = lerpHex(top, '#505868', 0.25);
    haze = lerpHex(haze, '#909898', 0.3);
    exposure = Math.min(1.35, exposure * 1.05);
  }

  // Night floor: never darker ambient+hemi product than clear night
  const nightFloorAmb = 0.34;
  const nightFloorHemi = 0.88;
  if (lerp(a.windowGlow, b.windowGlow, t) > 0.7) {
    ambientIntensity = Math.max(ambientIntensity, nightFloorAmb);
    hemiIntensity = Math.max(hemiIntensity, nightFloorHemi);
  }

  return {
    horizon,
    mid,
    top,
    haze,
    sunDir: sunDirPos,
    sunBand: lerp(a.sunBand, b.sunBand, t),
    hemiSky: lerpHex(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity,
    ambientColor: lerpHex(a.ambientColor, b.ambientColor, t),
    ambientIntensity,
    sunColor: lerpHex(a.sunColor, b.sunColor, t),
    sunIntensity,
    sunDirPos,
    moonColor: '#a9bde0',
    moonIntensity: lerp(a.moonIntensity, b.moonIntensity, t),
    moonDirPos,
    fogColor,
    fogDensity,
    exposure,
    windowGlow: lerp(a.windowGlow, b.windowGlow, t),
    shadowStrength: lerp(a.shadowStrength, b.shadowStrength, t),
    starsOpacity: lerp(a.starsOpacity, b.starsOpacity, t),
  };
}

/** Night readability floor used by tests. */
export const NIGHT_MIN_AMBIENT = 0.34;
export const NIGHT_MIN_HEMI = 0.88;
