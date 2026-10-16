import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { OFFICES } from '../../../data/offices';
import { layoutOffice } from '../../../rules/office';
import { furnitureFor, placementExtent, roomSeats, visitorSpots, type Placement } from '../officeFurniture';
import { allOfficeModelFiles, pickModel } from '../officeModels';

const ROOT = resolve(__dirname, '../../../..');

function overlap(a: Placement, b: Placement, pad = 0.02): boolean {
  const ea = placementExtent(a);
  const eb = placementExtent(b);
  return Math.abs(a.x - b.x) < ea.hx + eb.hx - pad && Math.abs(a.z - b.z) < ea.hz + eb.hz - pad;
}

const SEATING = new Set(['chair', 'visitorChair']);

describe('O-002 office GLB furniture', () => {
  it('every catalogue model ships under public/ with a relative path', () => {
    const files = allOfficeModelFiles();
    expect(files.length).toBeGreaterThan(30);
    for (const f of files) {
      expect(f.startsWith('/')).toBe(false);
      expect(existsSync(resolve(ROOT, 'public', f)), f).toBe(true);
    }
  });

  it('variant choice is deterministic per office and varies across offices', () => {
    expect(pickModel('desk', 'OFF_KOTOKA_TECH_HUB')).toBe(pickModel('desk', 'OFF_KOTOKA_TECH_HUB'));
    const desks = new Set(OFFICES.map((o) => pickModel('desk', o.id).file));
    const chairs = new Set(OFFICES.map((o) => pickModel('chair', o.id).file));
    expect(desks.size + chairs.size).toBeGreaterThan(3);
  });

  for (const o of OFFICES) {
    describe(o.name, () => {
      const layouts = layoutOffice(o);
      const rooms = layouts.flatMap((l) => l.rooms);

      it('models stay inside their room and replace the old box furniture', () => {
        for (const r of rooms) {
          const f = furnitureFor(r, o.id);
          for (const p of f.models) {
            const e = placementExtent(p);
            const tag = `${r.spec.id}:${p.kind}`;
            expect(p.x - e.hx, tag).toBeGreaterThanOrEqual(r.x - r.w / 2 - 0.05);
            expect(p.x + e.hx, tag).toBeLessThanOrEqual(r.x + r.w / 2 + 0.05);
            expect(p.z - e.hz, tag).toBeGreaterThanOrEqual(r.z - r.d / 2 - 0.05);
            expect(p.z + e.hz, tag).toBeLessThanOrEqual(r.z + r.d / 2 + 0.05);
          }
        }
        const total = rooms.reduce((n, r) => n + furnitureFor(r, o.id).models.length, 0);
        expect(total).toBeGreaterThan(5);
      });

      it('non-seat models do not overlap each other', () => {
        for (const r of rooms) {
          const m = furnitureFor(r, o.id).models.filter((p) => !SEATING.has(p.kind) && p.kind !== 'partition');
          for (let i = 0; i < m.length; i++)
            for (let j = i + 1; j < m.length; j++) {
              expect(overlap(m[i], m[j]), `${o.id}/${r.spec.id}: ${m[i].kind}@${m[i].x.toFixed(2)},${m[i].z.toFixed(2)} vs ${m[j].kind}@${m[j].x.toFixed(2)},${m[j].z.toFixed(2)}`).toBe(false);
            }
        }
      });

      it('chairs keep clear of cabinets, coolers, plants and other props', () => {
        const props = new Set(['filing', 'cooler', 'plant', 'printer', 'whiteboard', 'locker', 'sofa']);
        for (const r of rooms) {
          const m = furnitureFor(r, o.id).models;
          for (const c of m.filter((p) => SEATING.has(p.kind)))
            for (const p of m.filter((q) => props.has(q.kind)))
              expect(overlap(c, p, 0.05), `${o.id}/${r.spec.id}: chair@${c.x.toFixed(2)},${c.z.toFixed(2)} vs ${p.kind}`).toBe(false);
        }
      });

      it('chairs sit exactly on the NPC seats', () => {
        for (const r of rooms) {
          const seats = roomSeats(r, o.id);
          expect(seats.length).toBe(Math.max(1, r.spec.seats));
          const chairs = furnitureFor(r, o.id).models.filter((p) => SEATING.has(p.kind));
          if (chairs.length === 0) continue;
          for (const s of seats) {
            const hit = chairs.find((c) => Math.hypot(c.x - s.x, c.z - s.z) < 1e-6);
            expect(hit, `${r.spec.id} seat ${s.x.toFixed(2)},${s.z.toFixed(2)}`).toBeTruthy();
            expect(hit!.yaw).toBeCloseTo(s.yaw, 6);
          }
        }
      });

      it('visitor spots are inside public rooms', () => {
        for (const r of rooms.filter((x) => ['hall', 'counter', 'lobby'].includes(x.spec.kind))) {
          for (const v of visitorSpots(r, o.id).slice(0, 6)) {
            expect(Math.abs(v.x - r.x)).toBeLessThanOrEqual(r.w / 2);
            expect(Math.abs(v.z - r.z)).toBeLessThanOrEqual(r.d / 2);
          }
        }
      });
    });
  }
});
