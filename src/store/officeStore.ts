/**
 * O-001 — Office store: world-run office sims, lifts, NPC transit, the
 * player's office job + shift, and the office UI selection.
 *
 * Ticked from the ambient registry (src/engine/ambient.ts) — no own loop.
 * Pure rules (src/rules/office.ts, src/rules/lift.ts) do the work; this file
 * only latches state, persists the player's job, and notifies React.
 *
 * Money: world-run offices never touch the wallet. The ONLY credit here is
 * an employer shift payout (endShift).
 */

import { FLOOR_HEIGHT_M, OFFICES, OFFICE_JOBS, findOffice, findOfficeJob, type OfficeDef } from '../data/offices';
import {
  callLift,
  createLift,
  queueLength,
  stepLift,
  type LiftDef,
  type LiftState,
} from '../rules/lift';
import {
  canStartShift,
  createOfficeSim,
  findRoom,
  layoutOffice,
  shiftComplete,
  shiftPay,
  startShift as startShiftRule,
  tickOffice,
  tickShift,
  type FloorLayout,
  type OfficeSimState,
  type ShiftState,
} from '../rules/office';
import { getAmbientHour } from './ambientClock';
import { getState as getGameState, setWalletBalanceGHS } from './gameStore';

const SAVE_KEY = 'chale.office.v1';

/** 1 real second = 10/60 game minutes (matches ambientClock). */
const GAME_MIN_PER_REAL_SEC = 10 / 60;
/** Office sims tick at 4 Hz; lifts every frame. */
const SIM_INTERVAL_S = 0.25;
/** Queue length at which NPCs give up on the lift and take the stairs. */
const STAIRS_IF_QUEUE = 5;

export type TransitMode = 'lift' | 'stairs';

export interface Transit {
  readonly mode: TransitMode;
  readonly from: number;
  readonly to: number;
  /** 'waiting' at the lobby, 'riding' in the car, 'walking' on stairs. */
  readonly stage: 'waiting' | 'riding' | 'walking';
  readonly since: number; // seconds (store clock)
}

export interface PlayerOfficeState {
  readonly employedJobIds: readonly string[];
  readonly completedShifts: Readonly<Record<string, number>>;
  readonly shift: ShiftState | null;
  /** True while the player is seated at their desk. */
  readonly atDesk: boolean;
  /** The floor the player is on inside the office (null = outside). */
  readonly floor: number | null;
  readonly inLift: boolean;
  readonly lastPayGHS: number;
}

export interface OfficeStoreState {
  readonly sims: Readonly<Record<string, OfficeSimState>>;
  readonly lifts: Readonly<Record<string, LiftState>>;
  readonly transit: Readonly<Record<string, Transit>>;
  readonly selectedOfficeId: string | null;
  readonly selectedStaffId: string | null;
  /** Floor shown in the cutaway per office. */
  readonly viewFloor: Readonly<Record<string, number>>;
  readonly player: PlayerOfficeState;
}

export function liftDefFor(o: OfficeDef): LiftDef {
  return {
    floors: o.floors.length,
    floorHeightM: FLOOR_HEIGHT_M,
    speedMps: 1.6,
    doorSeconds: 1.2,
    dwellSeconds: 1.8,
    capacity: Math.max(1, o.liftCapacity),
  };
}

const layouts: Record<string, FloorLayout[]> = {};
export function officeLayout(id: string): FloorLayout[] {
  if (!layouts[id]) {
    const o = findOffice(id);
    layouts[id] = o ? layoutOffice(o) : [];
  }
  return layouts[id];
}

function freshPlayer(): PlayerOfficeState {
  return { employedJobIds: [], completedShifts: {}, shift: null, atDesk: false, floor: null, inLift: false, lastPayGHS: 0 };
}

function initial(): OfficeStoreState {
  const sims: Record<string, OfficeSimState> = {};
  const lifts: Record<string, LiftState> = {};
  for (const o of OFFICES) {
    sims[o.id] = createOfficeSim(o);
    if (o.hasLift) lifts[o.id] = createLift(liftDefFor(o));
  }
  return {
    sims,
    lifts,
    transit: {},
    selectedOfficeId: null,
    selectedStaffId: null,
    viewFloor: {},
    player: loadPlayer(),
  };
}

function loadPlayer(): PlayerOfficeState {
  try {
    if (typeof localStorage === 'undefined') return freshPlayer();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshPlayer();
    const p = JSON.parse(raw) as Partial<PlayerOfficeState>;
    return {
      ...freshPlayer(),
      employedJobIds: Array.isArray(p.employedJobIds) ? p.employedJobIds.filter((id) => !!findOfficeJob(id)) : [],
      completedShifts: p.completedShifts && typeof p.completedShifts === 'object' ? p.completedShifts : {},
      shift: p.shift && findOfficeJob(p.shift.jobId) ? p.shift : null,
      // a reload puts the player back at the door: not seated, not in a lift
      atDesk: false,
      floor: null,
      inLift: false,
      lastPayGHS: 0,
    };
  } catch {
    return freshPlayer();
  }
}

function savePlayer(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const p = state.player;
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ employedJobIds: p.employedJobIds, completedShifts: p.completedShifts, shift: p.shift }),
    );
  } catch {
    /* storage full / private mode — progress just isn't saved */
  }
}

let state: OfficeStoreState = initial();
const listeners = new Set<() => void>();
let clockS = 0;
let simAcc = 0;
let lastHour = getAmbientHour();
/** e2e-only wall-clock multiplier for tickOffices (default 1 = real time). */
let officeTimeScale = 1;

function notify(): void {
  for (const l of listeners) l();
}

export function getOfficeState(): OfficeStoreState {
  return state;
}

export function subscribeOffice(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function floorOfRoom(officeId: string, roomId: string | null): number | null {
  if (!roomId) return null;
  return findRoom(officeLayout(officeId), roomId)?.floor ?? null;
}

/**
 * Ambient step: advance office sims (4 Hz), lifts (every frame), NPC
 * transit and the player's shift. Exported for tests / the ambient registry.
 */
export function tickOffices(dtReal: number, hourOverride?: number): void {
  // e2e lever: software-GL boxes run <2 fps, and GameLoop clamps dt at 50 ms —
  // a 9 s lift call would need hundreds of real frames. Tests may run the
  // same loop at a faster wall-clock (opt-in via __chaleOffice.setTimeScale).
  const dt = dtReal * officeTimeScale;
  clockS += dt;
  simAcc += dt;
  let changed = false;

  // lifts every frame (cheap) — board/alight events drive NPC transit
  if (Object.keys(state.lifts).length > 0) {
    const lifts: Record<string, LiftState> = { ...state.lifts };
    let transit: Record<string, Transit> | null = null;
    for (const id of Object.keys(lifts)) {
      const o = findOffice(id)!;
      const r = stepLift(lifts[id], liftDefFor(o), dt);
      if (r.state !== lifts[id]) lifts[id] = r.state;
      for (const e of r.events) {
        if (e.type === 'arrive') continue;
        if (e.id === 'player') {
          state = {
            ...state,
            player: { ...state.player, inLift: e.type === 'board', floor: e.type === 'alight' ? e.floor : state.player.floor },
          };
          continue;
        }
        transit = transit ?? { ...state.transit };
        const t = transit[e.id];
        if (!t) continue;
        if (e.type === 'board') transit[e.id] = { ...t, stage: 'riding', since: clockS };
        else delete transit[e.id];
        changed = true;
      }
    }
    state = { ...state, lifts, transit: transit ?? state.transit };
  }

  // stairs take ~6 s per floor
  for (const [id, t] of Object.entries(state.transit)) {
    if (t.mode === 'stairs' && clockS - t.since > 6 * Math.abs(t.to - t.from)) {
      const transit = { ...state.transit };
      delete transit[id];
      state = { ...state, transit };
      changed = true;
    }
  }

  if (simAcc >= SIM_INTERVAL_S) {
    const dtGameMin = simAcc * GAME_MIN_PER_REAL_SEC;
    simAcc = 0;
    const hour = hourOverride ?? getAmbientHour();
    const sims: Record<string, OfficeSimState> = {};
    let lifts = state.lifts;
    let transit = state.transit;
    for (const o of OFFICES) {
      const before = state.sims[o.id];
      const after = tickOffice(o, before, dtGameMin, hour);
      sims[o.id] = after;
      // floor changes → lift call or stairs
      for (let i = 0; i < after.staff.length; i++) {
        const a = after.staff[i];
        const b = before.staff[i];
        if (a.roomId === b.roomId || transit[a.id]) continue;
        const from = floorOfRoom(o.id, b.roomId) ?? 0; // from outside = ground
        const to = floorOfRoom(o.id, a.roomId) ?? 0; // leaving = ground
        if (from === to) continue;
        const lift = lifts[o.id];
        const useLift = !!lift && queueLength(lift, from) < STAIRS_IF_QUEUE;
        if (useLift) {
          lifts = { ...lifts, [o.id]: callLift(lift, { id: a.id, from, to }) };
          transit = { ...transit, [a.id]: { mode: 'lift', from, to, stage: 'waiting', since: clockS } };
        } else {
          transit = { ...transit, [a.id]: { mode: 'stairs', from, to, stage: 'walking', since: clockS } };
        }
      }
    }
    let player = state.player;
    if (player.shift) {
      const job = findOfficeJob(player.shift.jobId)!;
      const shift = tickShift(player.shift, dtGameMin, player.atDesk);
      player = { ...player, shift };
      if (shiftComplete(job, shift)) {
        state = { ...state, sims, lifts, transit, player };
        endShift();
        lastHour = hour;
        notify();
        return;
      }
    }
    state = { ...state, sims, lifts, transit, player };
    lastHour = hour;
    changed = true;
  }
  if (changed) notify();
}

// ───────────────────────────────────────────── selection ────

export function selectOffice(id: string | null): void {
  state = { ...state, selectedOfficeId: id, selectedStaffId: null };
  notify();
}

export function selectStaff(id: string | null): void {
  state = { ...state, selectedStaffId: id };
  notify();
}

export function setViewFloor(officeId: string, floor: number): void {
  const o = findOffice(officeId);
  if (!o) return;
  const f = Math.max(0, Math.min(o.floors.length - 1, Math.round(floor)));
  state = { ...state, viewFloor: { ...state.viewFloor, [officeId]: f } };
  notify();
}

// ────────────────────────────────────────── player: jobs ────

export interface ActionResult {
  readonly ok: boolean;
  readonly message: string;
}

/** Apply to an employer office job (hiring is instant; shifts are gated). */
export function applyForJob(jobId: string): ActionResult {
  const job = findOfficeJob(jobId);
  if (!job) return { ok: false, message: 'Unknown job' };
  const office = findOffice(job.officeId)!;
  if (office.ownership !== 'employer') return { ok: false, message: `${office.name} is not hiring` };
  if (state.player.employedJobIds.includes(jobId)) return { ok: true, message: `You already work here as ${job.title}` };
  state = { ...state, player: { ...state.player, employedJobIds: [...state.player.employedJobIds, jobId] } };
  savePlayer();
  notify();
  return { ok: true, message: `Hired! ${job.title} at ${office.name}. Shift starts ${job.shiftStartHour}:00.` };
}

export function startShift(jobId: string, trait?: string): ActionResult {
  const job = findOfficeJob(jobId);
  if (!job) return { ok: false, message: 'Unknown job' };
  if (!state.player.employedJobIds.includes(jobId)) return { ok: false, message: 'Apply for this job first' };
  if (state.player.shift) return { ok: false, message: 'You are already on a shift' };
  const office = findOffice(job.officeId)!;
  const g = getGameState();
  const check = canStartShift(job, office, {
    energy: g.needs.energy,
    hunger: g.needs.hunger,
    trait,
    hour: getAmbientHour(),
    completedShifts: state.player.completedShifts,
  });
  if (!check.ok) return { ok: false, message: check.reasons.join(' · ') };
  state = { ...state, player: { ...state.player, shift: startShiftRule(job, getAmbientHour()), floor: 0 } };
  savePlayer();
  notify();
  return { ok: true, message: `Shift started. Take the lift to floor ${job.deskFloor === 0 ? 'G' : job.deskFloor}.` };
}

/** Player walks into the lift and picks a floor. */
export function requestPlayerFloor(officeId: string, to: number): ActionResult {
  const o = findOffice(officeId);
  if (!o) return { ok: false, message: 'Unknown office' };
  const from = state.player.floor ?? 0;
  if (from === to) return { ok: true, message: 'Already here' };
  if (!o.hasLift) {
    state = { ...state, player: { ...state.player, floor: to } };
    notify();
    return { ok: true, message: 'Took the stairs' };
  }
  state = {
    ...state,
    lifts: { ...state.lifts, [officeId]: callLift(state.lifts[officeId], { id: 'player', from, to }) },
    viewFloor: { ...state.viewFloor, [officeId]: to },
  };
  notify();
  return { ok: true, message: `Lift called to ${from === 0 ? 'G' : from}` };
}

/** Sit / stand at the assigned desk (only counts on the desk floor). */
export function setAtDesk(at: boolean): ActionResult {
  const sh = state.player.shift;
  if (!sh) return { ok: false, message: 'Not on a shift' };
  const job = findOfficeJob(sh.jobId)!;
  if (at && (state.player.floor ?? 0) !== job.deskFloor) {
    return { ok: false, message: `Your desk is on floor ${job.deskFloor === 0 ? 'G' : job.deskFloor}` };
  }
  state = { ...state, player: { ...state.player, atDesk: at } };
  notify();
  return { ok: true, message: at ? 'At your desk' : 'Stood up' };
}

/** End the shift: salary + bonus lands in the wallet. */
export function endShift(): ActionResult {
  const sh = state.player.shift;
  if (!sh) return { ok: false, message: 'Not on a shift' };
  const job = findOfficeJob(sh.jobId)!;
  const pay = shiftPay(job, sh);
  const full = shiftComplete(job, sh);
  setWalletBalanceGHS(getGameState().wallet.balanceGHS + pay);
  const completedShifts = full
    ? { ...state.player.completedShifts, [job.id]: (state.player.completedShifts[job.id] ?? 0) + 1 }
    : state.player.completedShifts;
  state = { ...state, player: { ...state.player, shift: null, atDesk: false, completedShifts, lastPayGHS: pay } };
  savePlayer();
  notify();
  return { ok: true, message: `Shift done — GH₵${pay} paid (${sh.tasksDone} tasks)` };
}

export function officeJobsFor(officeId: string) {
  return OFFICE_JOBS.filter((j) => j.officeId === officeId);
}

export function currentHour(): number {
  return lastHour;
}

/** Test helper — fresh store with no saved player data. */
export function __resetOfficesForTests(): void {
  state = { ...initial(), player: freshPlayer() };
  clockS = 0;
  simAcc = 0;
  notify();
  if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__chaleOffice = undefined;
}

// e2e / probe surface (mirrors __chaleTest / __chaleTycoon) — read-only probe
// plus the same selection/ride entry points the UI buttons call, so the robot
// playtest can drive interiors + the lift without pixel-hunting meshes.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1') {
  (window as unknown as Record<string, unknown>).__chaleOffice = {
    probe: (): {
      selected: string | null;
      viewFloor: number | null;
      playerFloor: number | null;
      inLift: boolean;
      liftPos: number | null;
    } => {
      const id = state.selectedOfficeId;
      return {
        selected: id,
        viewFloor: id ? (state.viewFloor[id] ?? 0) : null,
        playerFloor: state.player.floor,
        inLift: state.player.inLift,
        liftPos: id ? (state.lifts[id]?.pos ?? null) : null,
      };
    },
    select: (id: string | null): void => selectOffice(id),
    ride: (id: string, floor: number): string => requestPlayerFloor(id, floor).message,
    /** Run the office/lift loop at n× wall-clock (e2e only). */
    setTimeScale: (n: number): void => {
      officeTimeScale = Number.isFinite(n) && n >= 1 ? n : 1;
    },
  };
}
