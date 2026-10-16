import { describe, expect, it, vi } from 'vitest';
import { OFFICES } from '../../../data/offices';
import { colliders } from '../../colliders';
import { OFFICE_FRAME_ZOOM, goToOffice, officeDoorPoint, officesByDistance } from '../officeNav';
import { DETAIL_RADIUS_M, DETAIL_ZOOM } from '../OfficeBuilding';

const R = 0.45; // walker capsule radius

describe('O-002 office navigation', () => {
  for (const o of OFFICES) {
    it(`${o.name}: door point is walkable and right outside the building`, () => {
      const p = officeDoorPoint(o);
      const inside = colliders.some((b) => p.x > b.minX - R && p.x < b.maxX + R && p.z > b.minZ - R && p.z < b.maxZ + R);
      expect(inside).toBe(false);
      const dist = Math.hypot(p.x - o.site.x, p.z - o.site.z);
      expect(dist).toBeGreaterThan(Math.min(o.site.w, o.site.d) / 2);
      expect(dist).toBeLessThan(25);
    });
  }

  it('lists all six offices nearest first', () => {
    const list = officesByDistance(-136, -2); // Daavi Compound spawn
    expect(list).toHaveLength(OFFICES.length);
    for (let i = 1; i < list.length; i++) expect(list[i].distanceM).toBeGreaterThanOrEqual(list[i - 1].distanceM);
    expect(list[0].id).toBe('OFF_KOTOKA_TECH_HUB');
  });

  it('goToOffice teleports to the door, selects the office and frames it inside the cutaway range', () => {
    const teleport = vi.fn();
    const frame = vi.fn();
    const select = vi.fn();
    const o = OFFICES[2];
    const p = goToOffice(o.id, { teleport, frame, select })!;
    expect(teleport).toHaveBeenCalledWith(p.x, p.z);
    expect(select).toHaveBeenCalledWith(o.id);
    const [fx, fz, zoom] = frame.mock.calls[0];
    expect(zoom).toBe(OFFICE_FRAME_ZOOM);
    expect(zoom).toBeGreaterThanOrEqual(DETAIL_ZOOM);
    expect(Math.hypot(fx - o.site.x, fz - o.site.z)).toBeLessThan(DETAIL_RADIUS_M);
  });

  it('unknown office id is a no-op', () => {
    const teleport = vi.fn();
    expect(goToOffice('nope', { teleport, frame: vi.fn(), select: vi.fn() })).toBeNull();
    expect(teleport).not.toHaveBeenCalled();
  });
});
