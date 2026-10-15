/**
 * O-001 — Lift scheduler (pure).
 *
 * A LOOK/SCAN elevator: the car keeps travelling in its direction while any
 * call or rider destination lies ahead, stopping at every floor where a rider
 * gets off or someone is waiting (capacity permitting), then reverses. Every
 * request is served within one full sweep, so nobody starves.
 *
 * Positions are in FLOOR units (0 = G). `step` never mutates its input.
 * No store, no three.js, no React — the world layer only reads `pos`,
 * `doorOpen01` and the events.
 */

export interface LiftDef {
  readonly floors: number; // number of levels (G + upper)
  readonly floorHeightM: number;
  readonly speedMps: number;
  /** Seconds for doors to open (and again to close). */
  readonly doorSeconds: number;
  /** Seconds doors stay fully open for boarding. */
  readonly dwellSeconds: number;
  readonly capacity: number;
}

export interface Passenger {
  readonly id: string;
  readonly from: number;
  readonly to: number;
}

export type LiftPhase = 'idle' | 'moving' | 'opening' | 'open' | 'closing';

export interface LiftState {
  /** Car position in floor units (fractional while moving). */
  readonly pos: number;
  readonly dir: -1 | 0 | 1;
  readonly phase: LiftPhase;
  /** Seconds left in the current door phase. */
  readonly timer: number;
  readonly riders: readonly Passenger[];
  /** Per-floor FIFO queues (index = floor). */
  readonly waiting: readonly (readonly Passenger[])[];
}

export type LiftEvent =
  | { readonly type: 'arrive'; readonly floor: number }
  | { readonly type: 'board'; readonly id: string; readonly floor: number }
  | { readonly type: 'alight'; readonly id: string; readonly floor: number };

export function createLift(def: LiftDef, startFloor = 0): LiftState {
  return {
    pos: startFloor,
    dir: 0,
    phase: 'idle',
    timer: 0,
    riders: [],
    waiting: Array.from({ length: def.floors }, () => []),
  };
}

const EPS = 1e-6;

/** Queue a passenger at their floor. Same-floor trips are ignored. */
export function callLift(state: LiftState, p: Passenger): LiftState {
  if (p.from === p.to) return state;
  const waiting = state.waiting.map((q, f) => (f === p.from ? [...q, p] : q));
  return { ...state, waiting };
}

/** 0 closed … 1 fully open — for the sliding-door animation. */
export function doorOpen01(state: LiftState, def: LiftDef): number {
  const d = Math.max(def.doorSeconds, EPS);
  switch (state.phase) {
    case 'opening':
      return 1 - state.timer / d;
    case 'open':
      return 1;
    case 'closing':
      return state.timer / d;
    default:
      return 0;
  }
}

/** Height of the car floor in metres. */
export function carHeightM(state: LiftState, def: LiftDef): number {
  return state.pos * def.floorHeightM;
}

function wantsStop(s: Mut, f: number, cap: number): boolean {
  if (s.riders.some((p) => p.to === f)) return true;
  const roomAfterAlight = cap - s.riders.filter((p) => p.to !== f).length;
  return s.waiting[f].length > 0 && roomAfterAlight > 0;
}

function hasTargetsAhead(s: Mut, from: number, dir: 1 | -1, cap: number): boolean {
  for (let f = 0; f < s.waiting.length; f++) {
    if (dir === 1 ? f <= from + EPS : f >= from - EPS) continue;
    if (s.riders.some((p) => p.to === f)) return true;
    if (s.waiting[f].length > 0 && s.riders.length < cap) return true;
  }
  return false;
}

interface Mut {
  pos: number;
  dir: -1 | 0 | 1;
  phase: LiftPhase;
  timer: number;
  riders: Passenger[];
  waiting: Passenger[][];
}

function chooseDir(s: Mut, cap: number): -1 | 0 | 1 {
  if (s.dir !== 0 && hasTargetsAhead(s, s.pos, s.dir, cap)) return s.dir;
  const other = (s.dir === 0 ? 1 : -s.dir) as 1 | -1;
  if (hasTargetsAhead(s, s.pos, other, cap)) return other;
  if (s.dir === 0 && hasTargetsAhead(s, s.pos, -1, cap)) return -1;
  // riders exist but the car is full and nothing ahead? head to the nearest rider target
  if (s.riders.length > 0) return s.riders[0].to > s.pos ? 1 : -1;
  return 0;
}

/**
 * Advance the lift by dt seconds. Long dt values are sub-stepped so a slow
 * off-screen tick behaves the same as many small ones.
 */
export function stepLift(
  state: LiftState,
  def: LiftDef,
  dt: number,
): { state: LiftState; events: LiftEvent[] } {
  const s: Mut = {
    pos: state.pos,
    dir: state.dir,
    phase: state.phase,
    timer: state.timer,
    riders: [...state.riders],
    waiting: state.waiting.map((q) => [...q]),
  };
  const events: LiftEvent[] = [];
  let left = Math.max(0, dt);
  let guard = 0;
  while (left > EPS && guard++ < 10_000) {
    left = sub(s, def, left, events);
  }
  return { state: s, events };
}

/** One state transition; returns the dt left over. */
function sub(s: Mut, def: LiftDef, dt: number, ev: LiftEvent[]): number {
  const cap = def.capacity;
  const floor = Math.round(s.pos);
  const atFloor = Math.abs(s.pos - floor) < EPS;

  if (s.phase === 'opening' || s.phase === 'closing' || s.phase === 'open') {
    const used = Math.min(dt, s.timer);
    s.timer -= used;
    if (s.timer > EPS) return dt - used;
    if (s.phase === 'opening') {
      // alight, then board FIFO up to capacity
      const out = s.riders.filter((p) => p.to === floor);
      s.riders = s.riders.filter((p) => p.to !== floor);
      for (const p of out) ev.push({ type: 'alight', id: p.id, floor });
      board(s, floor, cap, ev);
      s.phase = 'open';
      s.timer = def.dwellSeconds;
    } else if (s.phase === 'open') {
      board(s, floor, cap, ev); // late arrivals during the dwell
      s.phase = 'closing';
      s.timer = def.doorSeconds;
    } else {
      s.phase = 'idle';
      s.dir = chooseDir(s, cap);
    }
    return dt - used;
  }

  if (s.phase === 'idle') {
    if (atFloor && wantsStop(s, floor, cap)) {
      s.pos = floor;
      s.phase = 'opening';
      s.timer = def.doorSeconds;
      ev.push({ type: 'arrive', floor });
      return dt;
    }
    s.dir = chooseDir(s, cap);
    if (s.dir === 0) return 0; // nothing to do: consume the tick
    s.phase = 'moving';
    return dt;
  }

  // moving: travel to the next floor boundary in our direction
  const dir = s.dir === 0 ? 1 : s.dir;
  const next = dir === 1 ? Math.floor(s.pos + EPS) + 1 : Math.ceil(s.pos - EPS) - 1;
  if (next < 0 || next >= def.floors) {
    s.phase = 'idle';
    s.dir = 0;
    s.pos = Math.min(def.floors - 1, Math.max(0, Math.round(s.pos)));
    return dt;
  }
  const floorsPerSec = def.speedMps / def.floorHeightM;
  const need = Math.abs(next - s.pos) / floorsPerSec;
  if (dt + EPS < need) {
    s.pos += dir * floorsPerSec * dt;
    return 0;
  }
  s.pos = next;
  const rest = dt - need;
  if (wantsStop(s, next, cap)) {
    s.phase = 'opening';
    s.timer = def.doorSeconds;
    ev.push({ type: 'arrive', floor: next });
  } else if (!hasTargetsAhead(s, next, dir as 1 | -1, cap)) {
    s.phase = 'idle';
  }
  return Math.max(0, rest);
}

function board(s: Mut, floor: number, cap: number, ev: LiftEvent[]): void {
  const q = s.waiting[floor];
  while (q.length > 0 && s.riders.length < cap) {
    const p = q.shift()!;
    s.riders.push(p);
    ev.push({ type: 'board', id: p.id, floor });
  }
}

/** Time (s) for an idle car at `from` to carry one passenger to `to`. */
export function soloTripSeconds(def: LiftDef, from: number, to: number): number {
  return (
    // doors open at pickup, dwell, close
    def.doorSeconds * 2 +
    def.dwellSeconds +
    (Math.abs(to - from) * def.floorHeightM) / def.speedMps +
    // doors open at the destination (alight happens at the end of opening)
    def.doorSeconds
  );
}

/** How many are queued in the lobby of `floor` (for the crowd visual). */
export function queueLength(state: LiftState, floor: number): number {
  return state.waiting[floor]?.length ?? 0;
}
