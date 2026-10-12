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
// ACCRA MAP: the plot's solid geometry comes from the captured collider set
import { colliders } from '../../world/colliders';

/** The kiosk shell on the DAAVI_PLOT (Jamestown, −126.5,−3.6). */
const KIOSK = colliders.find(
  (c) => c.minX <= -126.4 && c.maxX >= -126.6 && c.minZ <= -3.7 && c.maxZ >= -3.5
)!;
/** The counter slab the kiosk fronts (y 0.89–1.01 — kept as a solid). */
const KIOSK_COUNTER = colliders.find(
  (c) => c.minX <= -126.6 && c.maxX >= -126.4 && c.minZ <= -2.4 && c.maxZ >= -2.1
)!;

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
    // THE MERGE BUG CLASS: a point between the two zones must resolve to
    // the COUNTER, never the job spot — e.g. (−124.9, −2.0) is 1.9 m from
    // the job point (inside the old default-2.5 m takeover) but 1.75 m
    // from the counter, which wins because the zone-backed skip keeps the
    // job id out of the point loop.
    expect(nearestLocationId(-124.9, -2.0)).toBe(WAAKYE_LOCATION_ID);
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

describe('G-008e: bench waypoint ' + DASH + ' the pavement set-down stays off the road and clear of solids', () => {
  it('DAAVI_BENCH is the plot pavement west of the kiosk (−132.5, −0.6)', () => {
    expect(DAAVI_BENCH.x).toBeCloseTo(-132.5, 5);
    expect(DAAVI_BENCH.z).toBeCloseTo(-0.6, 5);
    // Off the Daavi St carriageway (z 0.5…7.5) and off the plot's
    // pavement edge (the waypoint sits on the strip z −1.3…0.5).
    expect(DAAVI_BENCH.z).toBeLessThan(0.5);
    expect(DAAVI_BENCH.z).toBeGreaterThan(-1.3);
  });

  it('the bench waypoint clears every plot solid by the capsule + margin bar', () => {
    const caps = 0.35 + 0.25;
    for (const c of colliders) {
      // solids on the plot only
      if (c.maxX < -152 || c.minX > -122 || c.maxZ < -20 || c.minZ > 0.5) continue;
      const clear =
        DAAVI_BENCH.x + caps <= c.minX ||
        DAAVI_BENCH.x - caps >= c.maxX ||
        DAAVI_BENCH.z + caps <= c.minZ ||
        DAAVI_BENCH.z - caps >= c.maxZ;
      expect(clear, `bench waypoint must clear ${JSON.stringify(c)}`).toBe(true);
    }
  });

  it('the kiosk shell and its counter slab exist where the rules say they do', () => {
    expect(KIOSK).toBeDefined();
    expect(KIOSK_COUNTER).toBeDefined();
    // the counter zone point sits in front of the counter slab, not inside it
    expect(locations.find((l) => l.id === 'LOC-001')!.z).toBeGreaterThan(KIOSK_COUNTER.maxZ);
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
