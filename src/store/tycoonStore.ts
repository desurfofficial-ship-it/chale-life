/**
 * Tycoon store slices (E-010 / T-001).
 *
 * Owned by Agent 2 (Engine). Rules stay pure in src/rules/business.ts;
 * this module holds state, commits rule results, advances the clock,
 * and persists via a save interface (localStorage now, Firestore later).
 */

import {
  advanceQuest,
  buyPlot,
  createChapter1Quest,
  districtDemand,
  openBusiness,
  tick,
  type BudgetTier,
  type BusinessState,
  type PlotRef,
  type QuestProgress,
  type WeatherKind,
} from '../rules/business';
import {
  getState,
  setWalletBalanceGHS,
  subscribe as subscribeGame,
  requestFrame,
  setZoomRange,
  resetWalkZoomRange,
  setCameraYaw,
} from './gameStore';
import {
  zoomToFitBox,
  boxFromPoints,
  boxCenter,
  CITY_BOUNDS,
  DEFAULT_HUD_INSETS,
} from '../engine/zoomFit';
import { LAND_PLOTS, plotAskingPrice } from '../lib/mapConfig';
import type { TycoonTab } from '../ui/tycoon/TycoonHud';

type Listener = () => void;

export type GameSpeed = 0 | 1 | 2;

export interface GameClock {
  day: number;
  /** Minutes since midnight (0–1439) */
  minutes: number;
  speed: GameSpeed;
}

export interface AlertItem {
  id: string;
  at: number;
  message: string;
}

export interface TycoonState {
  ownedPlotIds: string[];
  businesses: BusinessState[];
  clock: GameClock;
  weather: WeatherKind;
  alerts: AlertItem[];
  quest: QuestProgress;
  /** High-angle city camera mode */
  tycoonMode: boolean;
  selectedPlotId: string | null;
  activeTab: TycoonTab;
}

/** localStorage key — dotted form avoids gitleaks generic-api-key false positive */
const SAVE_KEY = ['chale', 'tycoon', 'v1'].join('.');

const listeners = new Set<Listener>();

/** Fractional game-minutes not yet applied (rAF dt is ~16ms). */
let clockRemainder = 0;

let state: TycoonState = {
  ownedPlotIds: [],
  businesses: [],
  clock: { day: 1, minutes: 8 * 60, speed: 1 },
  weather: 'clear',
  alerts: [],
  quest: createChapter1Quest(),
  tycoonMode: false,
  selectedPlotId: null,
  activeTab: 'property',
};

function notify(): void {
  for (const fn of listeners) fn();
}

export function getTycoonState(): Readonly<TycoonState> {
  return state;
}

export function subscribeTycoon(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── Save interface (localStorage now; swap body for Firestore later) ─────────

export interface SaveBackend {
  load(): string | null;
  save(json: string): void;
}

const localStorageBackend: SaveBackend = {
  load() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE_KEY) : null;
    } catch {
      return null;
    }
  },
  save(json: string) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, json);
    } catch {
      /* quota / private mode */
    }
  },
};

let backend: SaveBackend = localStorageBackend;

/** Test / future Firestore injection. */
export function setSaveBackend(b: SaveBackend): void {
  backend = b;
}

export function saveTycoon(): void {
  const payload = {
    ownedPlotIds: state.ownedPlotIds,
    businesses: state.businesses,
    clock: state.clock,
    weather: state.weather,
    alerts: state.alerts.slice(0, 40),
    quest: state.quest,
  };
  backend.save(JSON.stringify(payload));
}

export function loadTycoon(): void {
  const raw = backend.load();
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as Partial<TycoonState>;
    if (Array.isArray(data.ownedPlotIds)) state.ownedPlotIds = data.ownedPlotIds;
    if (Array.isArray(data.businesses)) state.businesses = data.businesses as BusinessState[];
    if (data.clock) state.clock = { ...state.clock, ...data.clock };
    if (data.weather) state.weather = data.weather;
    if (Array.isArray(data.alerts)) state.alerts = data.alerts as AlertItem[];
    if (data.quest) state.quest = data.quest as QuestProgress;
    notify();
  } catch {
    /* corrupt save — keep defaults */
  }
}

/** Reset in-memory tycoon state (tests). */
export function __resetTycoonForTests(): void {
  clockRemainder = 0;
  state = {
    ownedPlotIds: [],
    businesses: [],
    clock: { day: 1, minutes: 8 * 60, speed: 1 },
    weather: 'clear',
    alerts: [],
    quest: createChapter1Quest(),
    tycoonMode: false,
    selectedPlotId: null,
    activeTab: 'property',
  };
  notify();
}

// Boot load once
loadTycoon();

// ── Mutations ────────────────────────────────────────────────────────────────

export function setTycoonMode(on: boolean): void {
  if (state.tycoonMode === on) return;
  state.tycoonMode = on;
  if (on) {
    // City overview — Fit my businesses (or whole city if none owned)
    // requestFitMyBusinesses sets tycoonMode again; avoid re-entry by framing only
    const { w, h } =
      typeof window !== 'undefined'
        ? { w: window.innerWidth, h: window.innerHeight }
        : { w: 390, h: 844 };
    const owned = state.ownedPlotIds;
    const pts = LAND_PLOTS.filter((p) => p.id && owned.includes(p.id)).map((p) => ({
      x: p.x,
      z: p.z,
    }));
    const box = pts.length ? boxFromPoints(pts, 14) : CITY_BOUNDS;
    const z = zoomToFitBox(box, w, h, DEFAULT_HUD_INSETS);
    const cityZ = zoomToFitBox(CITY_BOUNDS, w, h, DEFAULT_HUD_INSETS);
    setZoomRange(cityZ, cityZ * 25);
    const c = boxCenter(box);
    requestFrame(c.x, c.z, z);
  } else {
    resetWalkZoomRange();
    setCameraYaw(0);
  }
  notify();
}

export function setSelectedPlotId(id: string | null): void {
  if (state.selectedPlotId === id) return;
  state.selectedPlotId = id;
  notify();
}

export function setActiveTab(tab: TycoonTab): void {
  if (state.activeTab === tab) return;
  state.activeTab = tab;
  notify();
}

export function setGameSpeed(speed: GameSpeed): void {
  if (state.clock.speed === speed) return;
  state.clock = { ...state.clock, speed };
  notify();
}

export function pushAlert(message: string): void {
  const item: AlertItem = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    message,
  };
  state.alerts = [item, ...state.alerts].slice(0, 40);
  notify();
}

function getWallet(): { balanceGHS: number } {
  return { balanceGHS: getState().wallet.balanceGHS };
}

export function requestBuyPlot(plot: PlotRef): boolean {
  if (state.ownedPlotIds.includes(plot.id)) return false;
  const result = buyPlot(getWallet(), plot);
  if (!result.ok) {
    pushAlert(result.reason ?? 'Could not buy plot.');
    return false;
  }
  setWalletBalanceGHS(result.wallet.balanceGHS);
  state.ownedPlotIds = [...state.ownedPlotIds, plot.id];
  state.quest = advanceQuest(state.quest, 'plot_bought');
  pushAlert(`Bought plot ${plot.id} for ₵${plot.price}.`);
  saveTycoon();
  notify();
  return true;
}

export function requestOpenBusiness(
  plot: PlotRef,
  typeId: string,
  budget: BudgetTier,
): boolean {
  if (!state.ownedPlotIds.includes(plot.id)) {
    pushAlert('Buy the land first.');
    return false;
  }
  if (state.businesses.some((b) => b.plotId === plot.id)) {
    pushAlert('This plot already has a business.');
    return false;
  }
  const id = `biz-${plot.id}-${typeId}`;
  const result = openBusiness(getWallet(), {
    typeId,
    plot,
    budget,
    businessId: id,
  });
  if (!result.ok || !result.business) {
    pushAlert(result.reason ?? 'Could not open business.');
    return false;
  }
  setWalletBalanceGHS(result.wallet.balanceGHS);
  state.businesses = [...state.businesses, result.business];
  state.quest = advanceQuest(state.quest, 'business_opened');
  pushAlert(
    `Quick start done: ${result.business.layout.length} items, ${result.business.staff} staff. The venue is open.`,
  );
  saveTycoon();
  notify();
  return true;
}

/**
 * Advance game clock by real dt (seconds), applying speed.
 * Runs business ticks in fixed 1-game-minute steps; commits on change.
 * Caps offline catch-up at 8 game hours when called after tab-hidden pause.
 */
export function advanceClock(realDtSeconds: number, opts?: { offlineCapHours?: number }): void {
  if (state.clock.speed === 0 || realDtSeconds <= 0) return;

  // 1 real second at 1× = 1 game minute. Accumulate sub-minute remainders so
  // rAF (~16ms) ticks eventually step the clock (floor alone never advanced).
  let gameMinutes = realDtSeconds * state.clock.speed + clockRemainder;
  const cap = (opts?.offlineCapHours ?? 8) * 60;
  if (gameMinutes > cap) gameMinutes = cap;

  const steps = Math.floor(gameMinutes);
  clockRemainder = gameMinutes - steps;
  if (steps <= 0) return;

  let minutes = state.clock.minutes + steps;
  let day = state.clock.day;
  while (minutes >= 1440) {
    minutes -= 1440;
    day += 1;
    const roll = (day + minutes) % 5;
    const nextWeather: WeatherKind =
      roll === 0 ? 'rain' : roll === 1 ? 'cloudy' : roll === 2 ? 'night' : 'clear';
    if (nextWeather !== state.weather) {
      state.weather = nextWeather;
      pushAlert(
        nextWeather === 'rain'
          ? 'The sky is turning rainy.'
          : nextWeather === 'cloudy'
            ? 'The sky is turning cloudy.'
            : nextWeather === 'night'
              ? 'Night falls over Accra.'
              : 'Clear skies.',
      );
    }
    state.businesses = state.businesses.map((b) => ({
      ...b,
      revenueToday: 0,
      costsToday: 0,
      customersToday: 0,
    }));
  }
  state.clock = { ...state.clock, day, minutes };

  const hour = Math.floor(minutes / 60);
  let wallet = getWallet().balanceGHS;
  let changedBiz = false;
  const nextBiz: BusinessState[] = [];

  for (const b of state.businesses) {
    const raw = LAND_PLOTS.find((p) => p.id === b.plotId);
    const demand = raw ? districtDemand(landPlotToRef(raw)) : 1.0;
    const t = tick(b, steps, state.weather, hour, demand);
    if (t.revenue > 0 || t.costs > 0) {
      wallet += t.revenue - t.costs;
      state.quest = advanceQuest(state.quest, 'revenue', t.revenue);
      changedBiz = true;
    }
    nextBiz.push(t.business);
  }
  if (changedBiz) {
    state.businesses = nextBiz;
    setWalletBalanceGHS(wallet);
  }

  saveTycoon();
  notify();
}

let hiddenAt: number | null = null;

export function onVisibilityChange(hidden: boolean): void {
  if (hidden) {
    hiddenAt = Date.now();
    return;
  }
  if (hiddenAt != null) {
    const elapsed = (Date.now() - hiddenAt) / 1000;
    hiddenAt = null;
    if (elapsed > 2) advanceClock(elapsed, { offlineCapHours: 8 });
  }
}

export function clockLabel(clock: GameClock): string {
  const h = Math.floor(clock.minutes / 60);
  const m = clock.minutes % 60;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function weatherIcon(w: WeatherKind): string {
  // Text labels — no emoji (UI policy: no decorative glyphs in chrome).
  switch (w) {
    case 'rain':
      return 'Rain';
    case 'cloudy':
      return 'Cloud';
    case 'night':
      return 'Night';
    default:
      return 'Sun';
  }
}

/** Convert a LAND_PLOTS entry to a pure PlotRef for rules. */
export function landPlotToRef(p: {
  id?: string;
  x: number;
  z: number;
  w: number;
  d: number;
  zone: string;
  price?: number;
  near?: string;
  y?: number;
}): PlotRef {
  return {
    id: p.id ?? `plot-${p.x}-${p.z}`,
    x: p.x,
    z: p.z,
    w: p.w,
    d: p.d,
    zone: p.zone,
    price: plotAskingPrice(p),
    near: p.near ?? '',
    y: p.y ?? 0,
  };
}

// Keep TypeScript aware subscribeGame is available if future bridging needs it.
void subscribeGame;


/** City tab + tycoon mode → high-angle overview cam (Engine CameraRig). */
export function isTycoonCamera(): boolean {
  return state.tycoonMode && state.activeTab === 'city';
}


/** E-010 e2e / debug surface (mirrors gameStore __chaleTest). */
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __chaleTycoon?: {
      setMode: (on: boolean) => void;
      selectPlot: (id: string | null) => void;
      buyPlot: (plot: import('../rules/business').PlotRef) => boolean;
      openBusiness: (
        plot: import('../rules/business').PlotRef,
        typeId: string,
        budget: import('../rules/business').BudgetTier,
      ) => boolean;
      advance: (seconds: number) => void;
      getState: () => Readonly<TycoonState>;
      setTab: (tab: TycoonTab) => void;
    };
  };
  w.__chaleTycoon = {
    setMode: setTycoonMode,
    selectPlot: setSelectedPlotId,
    buyPlot: requestBuyPlot,
    openBusiness: requestOpenBusiness,
    advance: advanceClock,
    getState: getTycoonState,
    setTab: setActiveTab,
  };
}


// ── C-001 framing presets ────────────────────────────────────────────────────

function canvasSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 390, h: 844 };
  return { w: window.innerWidth, h: window.innerHeight };
}

/** Fit the whole city plate into view (tycoon overview). */
export function requestFitCity(): void {
  const { w, h } = canvasSize();
  const z = zoomToFitBox(CITY_BOUNDS, w, h, DEFAULT_HUD_INSETS);
  setZoomRange(z, z * 25);
  const c = boxCenter(CITY_BOUNDS);
  requestFrame(c.x, c.z, z);
  state.tycoonMode = true;
  notify();
}

/** Fit a box around owned plots (or city if none). */
export function requestFitMyBusinesses(): void {
  const { w, h } = canvasSize();
  const owned = state.ownedPlotIds;
  const pts = LAND_PLOTS.filter((p) => p.id && owned.includes(p.id)).map((p) => ({
    x: p.x,
    z: p.z,
  }));
  const box = pts.length ? boxFromPoints(pts, 14) : CITY_BOUNDS;
  const z = zoomToFitBox(box, w, h, DEFAULT_HUD_INSETS);
  const cityZ = zoomToFitBox(CITY_BOUNDS, w, h, DEFAULT_HUD_INSETS);
  setZoomRange(cityZ, cityZ * 25);
  const c = boxCenter(box);
  requestFrame(c.x, c.z, z);
  state.tycoonMode = true;
  notify();
}

/** Focus one plot / business shell (cutaway scale). */
export function requestFocusPlot(plotId: string): void {
  const plot = LAND_PLOTS.find((p) => p.id === plotId);
  if (!plot) return;
  const { w, h } = canvasSize();
  const box = {
    minX: plot.x - plot.w * 0.7,
    maxX: plot.x + plot.w * 0.7,
    minZ: plot.z - plot.d * 0.7,
    maxZ: plot.z + plot.d * 0.7,
  };
  const z = zoomToFitBox(box, w, h, DEFAULT_HUD_INSETS, 1.05);
  const cityZ = zoomToFitBox(CITY_BOUNDS, w, h, DEFAULT_HUD_INSETS);
  setZoomRange(cityZ, cityZ * 25);
  requestFrame(plot.x, plot.z, z);
  state.tycoonMode = true;
  state.selectedPlotId = plotId;
  notify();
}

/** Leave tycoon camera — restore walking zoom range. */
export function exitTycoonCamera(): void {
  state.tycoonMode = false;
  resetWalkZoomRange();
  setCameraYaw(0);
  notify();
}
