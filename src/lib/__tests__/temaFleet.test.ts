/**
 * Tema Port ground fleet — placement clearance contract.
 *
 * The fleet is dressing-only (no colliders), so the test pins the two things
 * that would make it LOOK broken: overlapping the port's fixed layout
 * (containers, crane legs, sill beams, quay wall, ships) and floating/sunk
 * geometry (wheel-contact sanity via the vehicle tops/dims).
 *
 * Bar: 0.3 m — ≥ the 0.25 m capsule+margin bar the world clearance tests pin.
 */
import { describe, expect, it } from 'vitest';
import { TEMA_FLEET, fleetRect, clears, type FleetVehicle } from '../temaFleet';
import { T13_CONTAINERS, T13_CRANES } from '../t13Layout';

/** World rect of a T13 container [x, z, len, rot, color, tiers]. */
function containerRect(c: [number, number, number, number, string, number]) {
  const [x, z, len, rot] = c;
  const alongZ = Math.abs(Math.sin(rot)) > 0.5; // rot ≈ π/2 → length along z
  const hx = (alongZ ? 2.44 : len) / 2;
  const hz = (alongZ ? len : 2.44) / 2;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

/** World rects of one gantry crane's solid feet: legs (0.6 wide) + sills. */
function craneRects(cr: [number, number, number]) {
  const [x, z] = cr;
  const rects: { minX: number; minZ: number; maxX: number; maxZ: number; what: string }[] = [];
  for (const lx of [-3, 3]) {
    for (const lz of [-3.5, 3.5]) {
      rects.push({ minX: x + lx - 0.3, maxX: x + lx + 0.3, minZ: z + lz - 0.3, maxZ: z + lz + 0.3, what: 'leg' });
    }
  }
  for (const lx of [-3, 3]) {
    rects.push({ minX: x + lx - 0.35, maxX: x + lx + 0.35, minZ: z - 3.8, maxZ: z + 3.8, what: 'sill' });
  }
  return rects;
}

const BAR = 0.3;

describe('Tema port ground fleet placement', () => {
  it('has the audit fleet: 3 container trucks, 1 tanker, 2 trailers, 1 reach stacker', () => {
    const by = (k: FleetVehicle['kind']) => TEMA_FLEET.filter((v) => v.kind === k).length;
    expect(by('containerTruck')).toBe(3);
    expect(by('tanker')).toBe(1);
    expect(by('trailer')).toBe(2);
    expect(by('reachStacker')).toBe(1);
  });

  it('every vehicle clears every T13 container by ≥ 0.3 m', () => {
    for (const v of TEMA_FLEET) {
      const vr = fleetRect(v);
      for (const c of T13_CONTAINERS) {
        const cr = containerRect(c);
        //Containers on the PIER (z > 46) cannot collide with yard/quay vehicles
        // by construction, but the check is cheap — keep it uniform.
        expect(clears(vr, cr, BAR), `${v.kind}@(${v.x},${v.z}) vs container@(${c[0]},${c[1]})`).toBe(true);
      }
    }
  });

  it('every vehicle clears every crane leg and sill beam by ≥ 0.3 m', () => {
    for (const v of TEMA_FLEET) {
      const vr = fleetRect(v);
      for (const cr of T13_CRANES) {
        for (const r of craneRects(cr)) {
          expect(clears(vr, r, BAR), `${v.kind}@(${v.x},${v.z}) vs crane ${r.what}@(${cr[0]},${cr[1]})`).toBe(true);
        }
      }
    }
  });

  it('road vehicles sit inside their road / apron bands', () => {
    // gate-road trucks inside the portGateRd x-band (222 ± 4.5, minus shoulder)
    const gate = TEMA_FLEET.filter((v) => v.z > -22 && v.z < 20 && Math.abs(v.x - 222) < 6 && v.kind === 'containerTruck');
    expect(gate.length).toBe(2);
    for (const v of gate) {
      const r = fleetRect(v);
      expect(r.minX).toBeGreaterThanOrEqual(218);
      expect(r.maxX).toBeLessThanOrEqual(226);
    }
    // the tanker on the quay apron paint band (z 32.5…45.6)
    const tanker = TEMA_FLEET.find((v) => v.kind === 'tanker')!;
    const tr = fleetRect(tanker);
    expect(tr.minZ).toBeGreaterThanOrEqual(32.5);
    expect(tr.maxZ).toBeLessThanOrEqual(45.6);
    // the portal tractor INSIDE crane 2's portal lane (sills at 248/254 ±0.35)
    const tractor = TEMA_FLEET.find((v) => v.kind === 'containerTruck' && Math.abs(v.x - 251) < 1 && Math.abs(v.z - 40) < 2)!;
    const pr = fleetRect(tractor);
    expect(pr.minX).toBeGreaterThanOrEqual(248.35);
    expect(pr.maxX).toBeLessThanOrEqual(253.65);
    // and its tail clear of the quay wall band (z 46…47.2)
    expect(pr.maxZ).toBeLessThanOrEqual(46);
  });

  it('fleet vehicles stay off the pier edge and out of the berthed-ship bands', () => {
    // pier vehicles inside the deck (x 272…298, z 44…92)
    for (const v of TEMA_FLEET) {
      const r = fleetRect(v);
      const onPier = v.z > 44;
      if (onPier) {
        expect(r.minX, `pier vehicle ${v.kind} west edge`).toBeGreaterThanOrEqual(272);
        expect(r.maxX, `pier vehicle ${v.kind} east edge`).toBeLessThanOrEqual(298);
        expect(r.maxZ, `pier vehicle ${v.kind} south edge`).toBeLessThanOrEqual(92);
      }
    }
    // no vehicle intersects a berthed ship's hull band (TEMA STAR z 51…60,
    // ACCRA EXPRESS z 51.25…59.75 at the quay; offshore vessels are moot)
    const berthBands = [
      { minX: 224.7, maxX: 257.3, minZ: 51, maxZ: 60 },
      { minX: 306.1, maxX: 331.9, minZ: 51.25, maxZ: 59.75 },
    ];
    for (const v of TEMA_FLEET) {
      const r = fleetRect(v);
      for (const b of berthBands) {
        const overlap = r.maxX > b.minX && r.minX < b.maxX && r.maxZ > b.minZ && r.minZ < b.maxZ;
        expect(overlap, `${v.kind}@(${v.x},${v.z}) inside a berthed ship`).toBe(false);
      }
    }
  });
});
