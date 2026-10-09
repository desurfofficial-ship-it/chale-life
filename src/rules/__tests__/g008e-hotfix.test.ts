import { describe, expect, it } from 'vitest';
import { locations } from '../../data/locations';
import { createStarterJobState, idleObjectiveFor, type JobState } from '../jobs';
import {
  actPromptFor,
  AUNTY_BA_HUSTLE_ID,
  DAAVI_JOB_SPOT_ID,
  SLEEP_LOCATION_ID,
  WAAKYE_LOCATION_ID,
} from '../act';
import { DAAVI_BENCH, DAAVI_JOB_SPOT, nearestLocationId } from '../proximity';
import { DAAVI_BENCH_MESH, DAAVI_BENCH_SPOT, UMBRELLAS } from '../../world/starter/layout';

// Curly apostrophe / em dash built from code points so this file stays pure
// ASCII (the production copy strings use the typographic characters).
const RSQ = String.fromCharCode(0x2019);
const DASH = String.fromCharCode(0x2014);

describe('G-008e: zone-backed ids never win the point loop', () => {
  it('the job spot resolves only inside its own 0.9 m zone', () => {
    // Agent 3's #28 put LOC-001-JOB in locations.ts (data + name kept).
    const entry = locations.find((l) => l.id === 'LOC-001-JOB');
    expect(entry).toBeDefined();
    // On the spot itself the ZONE (r 0.9) owns the answer.
    expect(nearestLocationId(DAAVI_JOB_SPOT.x, DAAVI_JOB_SPOT.z)).toBe('LOC-001-JOB');
    // THE MERGE BUG: (17.0, 0.5) is 1.12 m from the job point, so the
    // default-2.5 m point loop WOULD claim it for the job spot (as the
    // merged main did: "Help Daavi" instead of "Buy waakye"). With the
    // zone-backed skip the counter, 2.42 m away, is the answer.
    expect(nearestLocationId(17.0, 0.5)).toBe(WAAKYE_LOCATION_ID);
  });

  it('every point inside LOC-001' + RSQ + 's 2.5 m and outside the job spot' + RSQ + 's 0.9 m resolves to the counter', () => {
    const counter = locations.find((l) => l.id === WAAKYE_LOCATION_ID)!;
    let checked = 0;
    for (let ix = -25; ix <= 25; ix++) {
      for (let iz = -25; iz <= 25; iz++) {
        const x = counter.x + ix * 0.1;
        const z = counter.z + iz * 0.1;
        const d2c = (x - counter.x) ** 2 + (z - counter.z) ** 2;
        if (d2c > 2.5 * 2.5) continue; // outside the counter's reach
        const d2j = (x - DAAVI_JOB_SPOT.x) ** 2 + (z - DAAVI_JOB_SPOT.z) ** 2;
        if (d2j <= DAAVI_JOB_SPOT.radius ** 2) continue; // the job zone owns it
        const d2b = (x - DAAVI_BENCH.x) ** 2 + (z - DAAVI_BENCH.z) ** 2;
        if (d2b <= DAAVI_BENCH.radius ** 2) continue; // disjoint anyway
        checked += 1;
        expect(
          nearestLocationId(x, z),
          `(${x.toFixed(2)}, ${z.toFixed(2)}) must resolve to the counter`
        ).toBe(WAAKYE_LOCATION_ID);
      }
    }
    // A real sweep, not a vacuous pass: the disc holds ~1900 grid points.
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('G-008e: bench waypoint 2.45 ' + DASH + ' proximity.ts and layout.ts agree, mesh unmoved', () => {
  it('DAAVI_BENCH === DAAVI_BENCH_SPOT === (21.5, 2.45); the mesh stays at z0 3.15', () => {
    expect(DAAVI_BENCH.x).toBeCloseTo(21.5, 5);
    expect(DAAVI_BENCH.z).toBeCloseTo(2.45, 5);
    expect(DAAVI_BENCH_SPOT.x).toBeCloseTo(DAAVI_BENCH.x, 5);
    expect(DAAVI_BENCH_SPOT.z).toBeCloseTo(DAAVI_BENCH.z, 5);
    // THE MESH DID NOT MOVE: the waypoint keeps a 0.7 m gap to its face,
    // back inside the 0.6 m capsule + margin bar the clearance tests pin.
    expect(DAAVI_BENCH_MESH.z0).toBeCloseTo(3.15, 5);
    expect(DAAVI_BENCH_MESH.z1).toBeCloseTo(3.65, 5);
    expect(DAAVI_BENCH_MESH.z0 - DAAVI_BENCH.z).toBeCloseTo(0.7, 5);
  });

  it('the green umbrella moved west of the kiosk front (off the counter/screen band)', () => {
    // Was (16.9, 3.1) — the canopy hid the player and the job-spot ring
    // from the fixed south camera. The kiosk front is x 13.9-17.1; west
    // of it the canopy can never cover the counter or the job spot.
    const green = UMBRELLAS[0];
    expect(green.x).toBeLessThan(13.9);
    expect(green.x).toBeGreaterThan(10);
  });
});

describe('G-008e: the idle line reads the payout cooldown', () => {
  const NOW = 1_000_000;
  const paid = (elapsedMs: number): JobState => ({
    activeId: null,
    step: 0,
    completedIds: [AUNTY_BA_HUSTLE_ID],
    lastPayoutAt: NOW - elapsedMs,
  });
  const fedRested = { hunger: 85, energy: 80 };
  const cdLine = (s: number) => `Daavi needs you again in ${s}s ${DASH} grab water or rest.`;

  it('during the 45 s cooldown the work fallback becomes the countdown line', () => {
    const line = idleObjectiveFor(paid(10_000), fedRested, NOW);
    expect(line).toBe(cdLine(35));
    expect(line).not.toContain('Work another shift');
    // 1 s left reads "in 1s"; the expiry boundary hands back the work line.
    expect(idleObjectiveFor(paid(44_000), fedRested, NOW)).toBe(cdLine(1));
    expect(idleObjectiveFor(paid(45_000), fedRested, NOW)).toContain('Work another shift');
    // No needs (legacy callers) read the cooldown too.
    expect(idleObjectiveFor(paid(10_000), undefined, NOW)).toBe(cdLine(35));
    expect(idleObjectiveFor(paid(45_000), undefined, NOW)).toContain('Work another shift');
  });

  it('needs-based lines outrank the cooldown hint when they are the better advice', () => {
    // Hungry during the cooldown: the counter line still owns the card.
    expect(idleObjectiveFor(paid(10_000), { hunger: 80, energy: 80 }, NOW)).toContain('waakye');
    // Tired during the cooldown: the compound line still owns the card.
    expect(idleObjectiveFor(paid(10_000), { hunger: 85, energy: 24 }, NOW)).toContain('Tired');
  });

  it('a fresh guest on the same clock is never told to wait (never paid, never cooling)', () => {
    expect(idleObjectiveFor(createStarterJobState(), fedRested, NOW)).toContain('find work');
  });
});

describe('G-008e: the cooldown line never suggests an action the Act button refuses (property)', () => {
  const NOW = 1_000_000;
  const paid = (elapsedMs: number): JobState => ({
    activeId: null,
    step: 0,
    completedIds: [AUNTY_BA_HUSTLE_ID],
    lastPayoutAt: NOW - elapsedMs,
  });

  it('every cooling-state idle line is backed by an enabled Act at the spot it names', () => {
    const job = paid(10_000);
    for (let hunger = 0; hunger <= 100; hunger += 5) {
      for (let energy = 0; energy <= 100; energy += 5) {
        const needs = { hunger, energy };
        const line = idleObjectiveFor(job, needs, NOW);
        const where = `cooling / hunger ${hunger} / energy ${energy}`;

        if (line.startsWith('Daavi needs you again in ')) {
          // The countdown line: well-formed, 1..45 s, never the work lie,
          // and the job spot really is refusing with the same countdown.
          expect(line.endsWith(`${DASH} grab water or rest.`), where).toBe(true);
          const n = Number(line.match(/in (\d+)s/)![1]);
          expect(n, where).toBeGreaterThanOrEqual(1);
          expect(n, where).toBeLessThanOrEqual(45);
          expect(line, where).not.toContain('Work another shift');
          const prompt = actPromptFor(
            { wallet: { balanceGHS: 100 }, needs, job, nowMs: NOW },
            DAAVI_JOB_SPOT_ID
          );
          expect(prompt.enabled, where).toBe(false);
          expect(prompt.reason, where).toContain('needs you again');
        } else if (line.includes('waakye')) {
          const prompt = actPromptFor(
            { wallet: { balanceGHS: 100 }, needs, job, nowMs: NOW },
            WAAKYE_LOCATION_ID
          );
          expect(prompt.enabled, where).toBe(true);
          expect(prompt.label, where).toContain('waakye');
        } else if (line.includes('Tired')) {
          const prompt = actPromptFor(
            { wallet: { balanceGHS: 100 }, needs, job, nowMs: NOW },
            SLEEP_LOCATION_ID
          );
          expect(prompt.enabled, where).toBe(true);
          expect(prompt.label, where).toBe('Sleep');
        } else {
          throw new Error(`unexpected cooling idle line at ${where}: ${line}`);
        }
      }
    }
  });
});
