/**
 * Per-gate aircraft turnaround — deterministic, driven by ambient game seconds.
 * Order: Arrive → Deboard → Unload → Cater → Refuel → Board → Pushback → Taxi → Takeoff
 */

export const TURNAROUND_PHASES = [
  'arrive',
  'deboard',
  'unload',
  'cater',
  'refuel',
  'board',
  'pushback',
  'taxi',
  'takeoff',
  'gone',
] as const;

export type TurnPhase = (typeof TURNAROUND_PHASES)[number];

/** Seconds spent in each phase (game time). */
export const PHASE_DURATION: Record<TurnPhase, number> = {
  arrive: 28,
  deboard: 18,
  unload: 16,
  cater: 14,
  refuel: 16,
  board: 20,
  pushback: 10,
  taxi: 18,
  takeoff: 14,
  gone: 40, // wait before next arrival
};

const CYCLE = TURNAROUND_PHASES.reduce((s, p) => s + PHASE_DURATION[p], 0);

export function phaseAt(gameTimeSec: number, gateIndex: number, staggerSec = 55): {
  phase: TurnPhase;
  phaseT: number; // 0..1 progress within phase
  cycleT: number;
} {
  const t = ((gameTimeSec + gateIndex * staggerSec) % CYCLE + CYCLE) % CYCLE;
  let acc = 0;
  for (const phase of TURNAROUND_PHASES) {
    const dur = PHASE_DURATION[phase];
    if (t < acc + dur) {
      return { phase, phaseT: (t - acc) / dur, cycleT: t / CYCLE };
    }
    acc += dur;
  }
  return { phase: 'gone', phaseT: 0, cycleT: 1 };
}

export function bridgeExtended(phase: TurnPhase, phaseT: number): number {
  // 0 retracted … 1 attached
  if (phase === 'deboard' || phase === 'board' || phase === 'unload' || phase === 'cater') return 1;
  if (phase === 'arrive') return Math.max(0, (phaseT - 0.7) / 0.3);
  if (phase === 'pushback') return Math.max(0, 1 - phaseT * 2);
  return 0;
}

export function planeOnStand(phase: TurnPhase): boolean {
  return (
    phase === 'deboard' ||
    phase === 'unload' ||
    phase === 'cater' ||
    phase === 'refuel' ||
    phase === 'board' ||
    phase === 'pushback'
  );
}
