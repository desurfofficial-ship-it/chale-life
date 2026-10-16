import { describe, expect, it } from 'vitest';
import {
  callLift,
  createLift,
  doorOpen01,
  soloTripSeconds,
  stepLift,
  type LiftDef,
  type LiftEvent,
  type LiftState,
} from '../lift';

const DEF: LiftDef = {
  floors: 5,
  floorHeightM: 3.2,
  speedMps: 1.6,
  doorSeconds: 1.5,
  dwellSeconds: 2,
  capacity: 4,
};

function run(s: LiftState, seconds: number, dt = 0.05, def = DEF) {
  const events: (LiftEvent & { t: number })[] = [];
  let t = 0;
  while (t < seconds - 1e-9) {
    const r = stepLift(s, def, dt);
    s = r.state;
    t += dt;
    for (const e of r.events) events.push({ ...e, t });
  }
  return { s, events };
}

describe('lift scheduler (O-001)', () => {
  it('idle with no calls stays put', () => {
    const { s, events } = run(createLift(DEF), 10);
    expect(s.pos).toBe(0);
    expect(s.phase).toBe('idle');
    expect(events).toHaveLength(0);
  });

  it('solo trip time = distance/speed + door times', () => {
    const s = callLift(createLift(DEF), { id: 'a', from: 0, to: 3 });
    const { events } = run(s, 30, 0.01);
    const alight = events.find((e) => e.type === 'alight' && e.id === 'a')!;
    expect(alight).toBeDefined();
    expect(alight.floor).toBe(3);
    expect(alight.t).toBeCloseTo(soloTripSeconds(DEF, 0, 3), 1);
    void s;
  });

  it('long dt is sub-stepped identically to small steps', () => {
    const s0 = callLift(createLift(DEF), { id: 'a', from: 0, to: 4 });
    const big = stepLift(s0, DEF, 40);
    const small = run(s0, 40, 0.01);
    expect(big.state.pos).toBeCloseTo(small.s.pos, 3);
    expect(big.events.map((e) => e.type)).toEqual(small.events.map((e) => e.type));
  });

  it('respects capacity and serves the rest on a later visit', () => {
    let s = createLift(DEF);
    for (let i = 0; i < 6; i++) s = callLift(s, { id: `p${i}`, from: 0, to: 4 });
    const first = stepLift(s, DEF, DEF.doorSeconds + 0.01);
    expect(first.state.riders).toHaveLength(4);
    expect(first.state.waiting[0]).toHaveLength(2);
    const { events } = run(first.state, 120);
    const alighted = events.filter((e) => e.type === 'alight').map((e) => e.type === 'alight' && e.id);
    expect(new Set(alighted)).toEqual(new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']));
  });

  it('never exceeds capacity at any moment', () => {
    let s = createLift(DEF);
    for (let i = 0; i < 12; i++) s = callLift(s, { id: `q${i}`, from: i % 5, to: (i * 3 + 1) % 5 });
    for (let k = 0; k < 4000; k++) {
      s = stepLift(s, DEF, 0.05).state;
      expect(s.riders.length).toBeLessThanOrEqual(DEF.capacity);
    }
  });

  it('serves in direction of travel (LOOK) before reversing', () => {
    // car going up from G with a rider to 4; calls at 2 (on the way) and at G again later
    let s = callLift(createLift(DEF), { id: 'up', from: 0, to: 4 });
    s = run(s, DEF.doorSeconds * 2 + DEF.dwellSeconds + 0.5).s; // doors closed, starting up
    s = callLift(s, { id: 'mid', from: 2, to: 3 });
    s = callLift(s, { id: 'low', from: 0, to: 1 });
    const { events } = run(s, 120);
    const boards = events.filter((e) => e.type === 'board').map((e) => (e as { id: string }).id);
    expect(boards.indexOf('mid')).toBeLessThan(boards.indexOf('low'));
  });

  it('no starvation: every random request is served', () => {
    let s = createLift(DEF);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const ids: string[] = [];
    const served = new Set<string>();
    for (let k = 0; k < 6000; k++) {
      if (k % 40 === 0 && ids.length < 60) {
        const from = Math.floor(rnd() * 5);
        let to = Math.floor(rnd() * 5);
        if (to === from) to = (to + 1) % 5;
        const id = `r${ids.length}`;
        ids.push(id);
        s = callLift(s, { id, from, to });
      }
      const r = stepLift(s, DEF, 0.1);
      s = r.state;
      for (const e of r.events) if (e.type === 'alight') served.add(e.id);
    }
    expect(served.size).toBe(ids.length);
  });

  it('door animation goes 0 → 1 → 0', () => {
    let s = callLift(createLift(DEF), { id: 'a', from: 0, to: 1 });
    s = stepLift(s, DEF, 0.01).state; // start opening
    s = stepLift(s, DEF, DEF.doorSeconds / 2).state;
    expect(doorOpen01(s, DEF)).toBeGreaterThan(0.3);
    expect(doorOpen01(s, DEF)).toBeLessThan(0.7);
    s = stepLift(s, DEF, DEF.doorSeconds / 2 + 0.1).state;
    expect(doorOpen01(s, DEF)).toBe(1);
  });

  it('same-floor calls are ignored', () => {
    const s = callLift(createLift(DEF), { id: 'x', from: 2, to: 2 });
    expect(s.waiting[2]).toHaveLength(0);
  });
});
