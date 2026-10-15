/**
 * O-001 — World-run office simulation + employer shifts (pure).
 *
 * Everything here is deterministic: same inputs → same outputs. World-run
 * offices NEVER produce player cash (officeCashDelta is always 0); the only
 * money path is the employer shift payout, which the store credits.
 *
 * No store, no three.js, no React.
 */

import {
  FLOOR_HEIGHT_M,
  OFFICES,
  type OfficeDef,
  type OfficeJobDef,
  type Ownership,
  type RoomKind,
  type RoomSpec,
} from '../data/offices';

// ───────────────────────────────────────────── layout ────

export interface Rect {
  readonly x: number; // centre, office-local metres
  readonly z: number;
  readonly w: number;
  readonly d: number;
}

export interface LaidRoom extends Rect {
  readonly spec: RoomSpec;
  readonly floor: number;
}

export interface FloorLayout {
  readonly level: number;
  readonly y: number;
  readonly core: Rect; // lift shaft or stair well
  readonly rooms: readonly LaidRoom[];
}

/** Lift/stair core width along x (m). */
export const CORE_W = 2.2;

/**
 * Lay a floor out inside the footprint: a core strip on the west side
 * (lift or stairs), rooms sliced across the remaining width, weighted by
 * seats so busy rooms get more floor. Rooms never overlap and stay inside.
 */
export function layoutFloor(def: OfficeDef, level: number): FloorLayout {
  const fl = def.floors.find((f) => f.level === level);
  const { w, d } = def.site;
  const x0 = -w / 2;
  const core: Rect = { x: x0 + CORE_W / 2, z: -d / 2 + 1.4, w: CORE_W, d: 2.8 };
  const rooms: LaidRoom[] = [];
  if (fl) {
    const usableX0 = x0 + CORE_W;
    const usableW = w - CORE_W;
    const weights = fl.rooms.map((r) => r.seats + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = usableX0;
    fl.rooms.forEach((spec, i) => {
      const rw = (usableW * weights[i]) / total;
      rooms.push({ spec, floor: level, x: cursor + rw / 2, z: 0, w: rw, d });
      cursor += rw;
    });
  }
  return { level, y: level * FLOOR_HEIGHT_M, core, rooms };
}

export function layoutOffice(def: OfficeDef): FloorLayout[] {
  return def.floors.map((f) => layoutFloor(def, f.level));
}

/** Seat spots inside a room (grid, 0.6 m wall margin). */
export function seatPositions(room: Rect, n: number): { x: number; z: number }[] {
  if (n <= 0) return [];
  const m = 0.6;
  const iw = Math.max(0.2, room.w - 2 * m);
  const id = Math.max(0.2, room.d - 2 * m);
  const cols = Math.max(1, Math.round(Math.sqrt((n * iw) / id)));
  const rows = Math.ceil(n / cols);
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({
      x: room.x - iw / 2 + (iw * (c + 0.5)) / cols,
      z: room.z - id / 2 + (id * (r + 0.5)) / rows,
    });
  }
  return out;
}

export function findRoomByKind(
  layouts: readonly FloorLayout[],
  kind: RoomKind,
): LaidRoom | undefined {
  for (const l of layouts) for (const r of l.rooms) if (r.spec.kind === kind) return r;
  return undefined;
}

export function findRoom(layouts: readonly FloorLayout[], roomId: string): LaidRoom | undefined {
  for (const l of layouts) for (const r of l.rooms) if (r.spec.id === roomId) return r;
  return undefined;
}

// ─────────────────────────────────────────── ownership ────

/** World-run and employer places can never be bought or arranged. */
export function canPlayerBuy(ownership: Ownership): boolean {
  return ownership === 'player';
}

export function canApply(ownership: Ownership): boolean {
  return ownership === 'employer';
}

/** World-run offices never touch the player's wallet. */
export function officeCashDelta(_def: OfficeDef, _state: OfficeSimState): number {
  return 0;
}

/** Offices never appear in the player's tycoon business list. */
export function isPlayerBusiness(ownership: Ownership): boolean {
  return ownership === 'player';
}

// ───────────────────────────────────────────── hours ────

export function isOpen(def: OfficeDef, hour: number, dayOfMonth = 1): boolean {
  const h = ((hour % 24) + 24) % 24;
  const close = def.closeHour + monthEndExtraHours(def, hour, dayOfMonth);
  return h >= def.openHour && h < close;
}

/** Month-end events keep the lights on late (e.g. Adom Holdings). */
export function monthEndExtraHours(def: OfficeDef, _hour: number, dayOfMonth: number): number {
  const ev = def.events.find((e) => e.monthEndOnly);
  if (!ev || dayOfMonth < 28) return 0;
  return ev.durationMinutes / 60;
}

export function activeEvent(def: OfficeDef, hour: number, dayOfMonth = 1) {
  return def.events.find((e) => {
    if (e.monthEndOnly && dayOfMonth < 28) return false;
    return hour >= e.hour && hour < e.hour + e.durationMinutes / 60;
  });
}

export function isLunch(def: OfficeDef, hour: number): boolean {
  return hour >= def.lunchHour && hour < def.lunchHour + 1;
}

// ─────────────────────────────────────────── sim state ────

export type StaffActivity =
  | 'off'
  | 'working'
  | 'planning'
  | 'meeting'
  | 'break'
  | 'lunch'
  | 'waiting';

export interface StaffState {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly homeRoomId: string;
  readonly roomId: string | null; // null = out of the building
  readonly seat: number;
  readonly activity: StaffActivity;
  readonly taskId: string | null;
  readonly energy: number; // 0..100
  readonly tasksToday: number;
  readonly log: readonly string[]; // newest last, max 3
}

export interface TaskState {
  readonly id: string;
  readonly name: string;
  readonly stageIdx: number;
  readonly minutesDone: number;
  readonly assigneeId: string | null;
  readonly startedAtMin: number;
  readonly stageTimes: readonly number[]; // game minute each stage was reached
}

export interface OfficeSimState {
  readonly officeId: string;
  readonly staff: readonly StaffState[];
  readonly tasks: readonly TaskState[];
  readonly deliveredToday: number;
  readonly visitorsInside: number;
  readonly nextTaskSeq: number;
  /** Absolute game minutes since sim start (for logs/timelines). */
  readonly clockMin: number;
}

const ENERGY_DRAIN_PER_MIN = 0.12;
const ENERGY_REFILL_PER_MIN = 1.5;
const BREAK_BELOW = 22;
const BREAK_UNTIL = 85;

export function homeRoomFor(def: OfficeDef, role: string): RoomSpec {
  const stage = def.pipeline.find((p) => p.role === role);
  const all = def.floors.flatMap((f) => f.rooms);
  return (
    (stage && all.find((r) => r.kind === stage.roomKind)) ??
    all.find((r) => r.kind === 'desks' || r.kind === 'booths' || r.kind === 'counter') ??
    all[0]
  );
}

export function createOfficeSim(def: OfficeDef): OfficeSimState {
  const staff: StaffState[] = def.staffNames.map((name, i) => {
    const role = def.roles[i % def.roles.length];
    const home = homeRoomFor(def, role);
    return {
      id: `${def.id}:${i}`,
      name,
      role,
      homeRoomId: home.id,
      roomId: null,
      seat: i,
      activity: 'off',
      taskId: null,
      energy: 70 + ((i * 13) % 30),
      tasksToday: 0,
      log: [],
    };
  });
  return {
    officeId: def.id,
    staff,
    tasks: [],
    deliveredToday: 0,
    visitorsInside: 0,
    nextTaskSeq: 1,
    clockMin: 0,
  };
}

function hhmm(hour: number): string {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function pushLog(log: readonly string[], line: string): readonly string[] {
  if (log[log.length - 1] === line) return log;
  const next = [...log, line];
  return next.length > 3 ? next.slice(next.length - 3) : next;
}

function roomIdOfKind(def: OfficeDef, kind: RoomKind): string | null {
  for (const f of def.floors) for (const r of f.rooms) if (r.kind === kind) return r.id;
  return null;
}

/** Max simultaneous work items: one per two staff, at least one. */
export function taskSlots(def: OfficeDef): number {
  return Math.max(1, Math.floor(def.staffNames.length / 2));
}

/**
 * Advance one office by `dtMin` game minutes at `hour`. Large dt values are
 * sub-stepped in ≤ 5-minute slices so a slow off-screen tick matches many
 * small on-screen ones.
 */
export function tickOffice(
  def: OfficeDef,
  state: OfficeSimState,
  dtMin: number,
  hour: number,
  dayOfMonth = 1,
): OfficeSimState {
  let s = state;
  let left = Math.max(0, dtMin);
  let h = hour - left / 60;
  while (left > 1e-9) {
    const step = Math.min(5, left);
    h += step / 60;
    s = tickSlice(def, s, step, ((h % 24) + 24) % 24, dayOfMonth);
    left -= step;
  }
  return s;
}

function tickSlice(
  def: OfficeDef,
  s: OfficeSimState,
  dt: number,
  hour: number,
  dayOfMonth: number,
): OfficeSimState {
  const open = isOpen(def, hour, dayOfMonth);
  const clockMin = s.clockMin + dt;
  const stamp = hhmm(hour);

  // New day: reset counters at opening hour
  const prevHour = hour - dt / 60;
  const newDay = prevHour < def.openHour && hour >= def.openHour;

  let tasks = s.tasks.slice();
  let seq = s.nextTaskSeq;
  let delivered = newDay ? 0 : s.deliveredToday;

  if (!open) {
    const staff = s.staff.map((st) =>
      st.activity === 'off'
        ? st
        : { ...st, activity: 'off' as const, roomId: null, taskId: null, log: pushLog(st.log, `${stamp} Went home`) },
    );
    return { ...s, staff, tasks: [], deliveredToday: delivered, visitorsInside: 0, clockMin };
  }

  // keep the pipeline full
  while (tasks.length < taskSlots(def)) {
    const name = def.taskNames[(seq - 1) % def.taskNames.length];
    tasks.push({
      id: `${def.id}:T${seq}`,
      name,
      stageIdx: 0,
      minutesDone: 0,
      assigneeId: null,
      startedAtMin: clockMin,
      stageTimes: [clockMin],
    });
    seq++;
  }

  const event = activeEvent(def, hour, dayOfMonth);
  const lunch = isLunch(def, hour);
  const n = s.staff.length;
  const lunchOutCount = Math.round(n * def.lunchOutRatio);

  // 1) staff schedule (arrive / lunch / break / meeting)
  let staff: StaffState[] = s.staff.map((st, i) => {
    const goesOut = lunch && i < lunchOutCount;
    let energy = st.energy;
    let activity: StaffActivity = st.activity;
    let roomId: string | null = st.roomId;
    let log = st.log;
    const tasksToday = newDay ? 0 : st.tasksToday;

    if (activity === 'off') {
      activity = 'waiting';
      roomId = st.homeRoomId;
      log = pushLog(log, `${stamp} Arrived at work`);
    }
    if (goesOut) {
      if (activity !== 'lunch') log = pushLog(log, `${stamp} Out for lunch`);
      return { ...st, activity: 'lunch', roomId: null, taskId: null, energy: Math.min(100, energy + ENERGY_REFILL_PER_MIN * dt), log, tasksToday };
    }
    if (activity === 'lunch') {
      activity = 'waiting';
      roomId = st.homeRoomId;
      log = pushLog(log, `${stamp} Back from lunch`);
    }
    if (activity === 'break') {
      energy = Math.min(100, energy + ENERGY_REFILL_PER_MIN * dt);
      if (energy >= BREAK_UNTIL) {
        activity = 'waiting';
        roomId = st.homeRoomId;
        log = pushLog(log, `${stamp} Back from break`);
      }
      return { ...st, activity, roomId, energy, log, taskId: activity === 'break' ? null : st.taskId, tasksToday };
    }
    if (energy < BREAK_BELOW) {
      const br = roomIdOfKind(def, 'break');
      log = pushLog(log, `${stamp} Taking a break`);
      return { ...st, activity: 'break', roomId: br ?? st.homeRoomId, taskId: null, energy, log, tasksToday };
    }
    if (event && i % 2 === 0) {
      const er = roomIdOfKind(def, event.roomKind);
      if (activity !== 'meeting') log = pushLog(log, `${stamp} ${event.label}`);
      return { ...st, activity: 'meeting', roomId: er ?? st.homeRoomId, taskId: null, energy: Math.max(0, energy - ENERGY_DRAIN_PER_MIN * 0.5 * dt), log, tasksToday };
    }
    if (activity === 'meeting') {
      activity = 'waiting';
      roomId = st.homeRoomId;
    }
    return { ...st, activity, roomId, log, energy, tasksToday };
  });

  // drop assignments from staff who are no longer available
  const available = (id: string | null) => {
    const st = staff.find((x) => x.id === id);
    return !!st && (st.activity === 'waiting' || st.activity === 'working' || st.activity === 'planning');
  };
  tasks = tasks.map((t) => (t.assigneeId && !available(t.assigneeId) ? { ...t, assigneeId: null } : t));

  // 2) assign free tasks: role match first, then anyone free
  const busy = new Set(tasks.map((t) => t.assigneeId).filter(Boolean) as string[]);
  tasks = tasks.map((t) => {
    if (t.assigneeId) return t;
    const stage = def.pipeline[t.stageIdx];
    const pick =
      staff.find((st) => st.role === stage.role && !busy.has(st.id) && available(st.id)) ??
      staff.find((st) => !busy.has(st.id) && available(st.id));
    if (!pick) return t;
    busy.add(pick.id);
    return { ...t, assigneeId: pick.id };
  });

  // 3) progress tasks
  const doneByStaff = new Map<string, string>();
  const nextTasks: TaskState[] = [];
  for (const t of tasks) {
    if (!t.assigneeId) {
      nextTasks.push(t);
      continue;
    }
    const stage = def.pipeline[t.stageIdx];
    const minutesDone = t.minutesDone + dt;
    if (minutesDone < stage.minutes) {
      nextTasks.push({ ...t, minutesDone });
      continue;
    }
    // stage complete
    doneByStaff.set(t.assigneeId, `${stamp} ${stage.stage}: ${t.name}`);
    if (t.stageIdx + 1 >= def.pipeline.length) {
      delivered++;
      continue; // task leaves the pipeline
    }
    nextTasks.push({
      ...t,
      stageIdx: t.stageIdx + 1,
      minutesDone: 0,
      assigneeId: null,
      stageTimes: [...t.stageTimes, clockMin],
    });
  }
  tasks = nextTasks;

  // 4) write staff room / activity from their task
  staff = staff.map((st) => {
    if (!available(st.id)) return st;
    const done = doneByStaff.get(st.id);
    const t = tasks.find((x) => x.assigneeId === st.id);
    let log = done ? pushLog(st.log, done) : st.log;
    const tasksToday = st.tasksToday + (done ? 1 : 0);
    if (!t) {
      return { ...st, activity: 'waiting', taskId: null, roomId: st.homeRoomId, log, tasksToday };
    }
    const stage = def.pipeline[t.stageIdx];
    const roomId = roomIdOfKind(def, stage.roomKind) ?? st.homeRoomId;
    if (st.taskId !== t.id) log = pushLog(log, `${stamp} Started ${stage.stage.toLowerCase()} · ${t.name}`);
    const planning = stage.roomKind === 'review' || stage.roomKind === 'meeting';
    return {
      ...st,
      activity: planning ? 'planning' : 'working',
      taskId: t.id,
      roomId,
      energy: Math.max(0, st.energy - ENERGY_DRAIN_PER_MIN * dt),
      log,
      tasksToday,
    };
  });

  const visitorsInside = lunch
    ? Math.round(def.visitorsPerHour * 0.4)
    : Math.round(def.visitorsPerHour * (hour > def.lunchHour + 1 && def.kind === 'lands' ? 0.6 : 1) * 0.5);

  return { ...s, staff, tasks, deliveredToday: delivered, nextTaskSeq: seq, visitorsInside, clockMin };
}

/** Progress 0..1 of a staff member's current task stage. */
export function staffProgress(def: OfficeDef, state: OfficeSimState, staffId: string): number {
  const t = state.tasks.find((x) => x.assigneeId === staffId);
  if (!t) return 0;
  return Math.min(1, t.minutesDone / def.pipeline[t.stageIdx].minutes);
}

export function staffInBuilding(state: OfficeSimState): number {
  return state.staff.filter((s) => s.roomId !== null).length;
}

// ─────────────────────────────────────── lunch rush ────

/**
 * Lunch-hour customer multiplier for a business at (x, z): staff walking out
 * of nearby offices. 1.0 = no effect; capped at 1.5. Falls off linearly to
 * zero at 70 m.
 */
export function lunchRushMultiplier(
  x: number,
  z: number,
  hour: number,
  offices: readonly OfficeDef[] = OFFICES,
  dayOfMonth = 1,
): number {
  let boost = 0;
  for (const o of offices) {
    if (!isOpen(o, hour, dayOfMonth) || !isLunch(o, hour)) continue;
    const dist = Math.hypot(o.site.x - x, o.site.z - z);
    if (dist >= 70) continue;
    const out = o.staffNames.length * o.lunchOutRatio;
    boost += out * 0.04 * (1 - dist / 70);
  }
  return Math.min(1.5, 1 + boost);
}

// ───────────────────────────────────── permits (lands) ────

/**
 * Game minutes until a permit filed at `hour` is signed by the Lands office.
 * Closed → waits for the next opening; after lunch the queue slows (×1.5).
 */
export function permitWaitMinutes(hour: number, def?: OfficeDef): number {
  const lands = def ?? OFFICES.find((o) => o.kind === 'lands')!;
  const base = lands.pipeline.reduce((a, p) => a + p.minutes, 0);
  const h = ((hour % 24) + 24) % 24;
  if (!isOpen(lands, h)) {
    const untilOpen = h < lands.openHour ? lands.openHour - h : 24 - h + lands.openHour;
    return Math.round(untilOpen * 60 + base);
  }
  const slow = h >= lands.lunchHour + 1 ? 1.5 : 1;
  return Math.round(base * slow);
}

// ───────────────────────────────────── employer shifts ────

export interface ShiftContext {
  readonly energy: number;
  readonly hunger: number;
  readonly trait?: string;
  readonly hour: number;
  /** Completed shifts per office job id (career ladder). */
  readonly completedShifts?: Readonly<Record<string, number>>;
}

export interface ShiftCheck {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/** Can the player start this office shift right now? */
export function canStartShift(job: OfficeJobDef, office: OfficeDef, ctx: ShiftContext): ShiftCheck {
  const reasons: string[] = [];
  if (!canApply(office.ownership)) reasons.push(`${office.name} is not hiring`);
  if (Math.round(ctx.energy) < job.minEnergy) reasons.push(`Need Energy ≥ ${job.minEnergy}`);
  if (Math.round(ctx.hunger) < job.minHunger) reasons.push(`Need Hunger ≥ ${job.minHunger}`);
  if (job.requiredTraits && job.requiredTraits.length > 0) {
    const t = (ctx.trait ?? '').toLowerCase();
    const promoted =
      !!job.promotedFrom && (ctx.completedShifts?.[job.promotedFrom.jobId] ?? 0) >= job.promotedFrom.shifts;
    if (!job.requiredTraits.includes(t) && !promoted) {
      reasons.push(
        job.promotedFrom
          ? `Requires trait: ${job.requiredTraits.join(' / ')} — or ${job.promotedFrom.shifts} shifts as ${job.promotedFrom.jobId === 'OJOB_OFFICE_ASSISTANT' ? 'Office Assistant' : job.promotedFrom.jobId}`
          : `Requires trait: ${job.requiredTraits.join(' / ')}`,
      );
    }
  }
  const h = ((ctx.hour % 24) + 24) % 24;
  const lateBy = h - job.shiftStartHour;
  if (lateBy < -1 || lateBy > job.shiftHours - 1) {
    reasons.push(`Shift runs ${hhmm(job.shiftStartHour)}–${hhmm(job.shiftStartHour + job.shiftHours)}`);
  }
  return { ok: reasons.length === 0, reasons };
}

export interface ShiftState {
  readonly jobId: string;
  readonly startedAtHour: number;
  readonly minutesWorked: number;
  readonly tasksDone: number;
  /** Progress of the player's current task, 0..1. */
  readonly taskProgress: number;
}

/** Player task length (game minutes) — one pipeline item at desk speed. */
export const PLAYER_TASK_MINUTES = 45;

export function startShift(job: OfficeJobDef, hour: number): ShiftState {
  return { jobId: job.id, startedAtHour: hour, minutesWorked: 0, tasksDone: 0, taskProgress: 0 };
}

/** Advance the player's shift while they sit at their desk. */
export function tickShift(shift: ShiftState, dtMin: number, atDesk: boolean): ShiftState {
  const minutesWorked = shift.minutesWorked + dtMin;
  if (!atDesk) return { ...shift, minutesWorked };
  let p = shift.taskProgress + dtMin / PLAYER_TASK_MINUTES;
  let done = shift.tasksDone;
  while (p >= 1) {
    p -= 1;
    done++;
  }
  return { ...shift, minutesWorked, tasksDone: done, taskProgress: p };
}

export function shiftComplete(job: OfficeJobDef, shift: ShiftState): boolean {
  return shift.minutesWorked >= job.shiftHours * 60;
}

/** Salary + per-task bonus. Partial shifts pay pro-rata salary. */
export function shiftPay(job: OfficeJobDef, shift: ShiftState): number {
  const frac = Math.min(1, shift.minutesWorked / (job.shiftHours * 60));
  return Math.round(job.salaryPerShiftGHS * frac + job.bonusPerTaskGHS * shift.tasksDone);
}

export function shiftEnergyCost(job: OfficeJobDef, shift: ShiftState): number {
  const frac = Math.min(1, shift.minutesWorked / (job.shiftHours * 60));
  return Math.round(job.energyCost * frac);
}
