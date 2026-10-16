/**
 * O-002 — Getting the player to an office.
 *
 * `officeDoorPoint` finds a walkable spot just outside an office's front
 * door (front = local +Z, rotated by site.yaw), clear of every captured
 * collider by the walker's capsule radius. `goToOffice` teleports the
 * walker there through the game loop, selects the office (which opens its
 * cutaway + the office card) and frames the camera on it, zoomed in past
 * DETAIL_ZOOM so the interior stays open after the card is closed.
 */
import { OFFICES, findOffice, type OfficeDef } from '../../data/offices';
import { colliders, worldBounds, type ColliderBox } from '../colliders';

/** Walker capsule radius (DEFAULT_MOVEMENT.radius) + a little slack. */
const CLEAR_M = 0.55;
/** Camera zoom used when framing an office (≥ DETAIL_ZOOM 20). */
export const OFFICE_FRAME_ZOOM = 38;

function blocked(x: number, z: number, boxes: readonly ColliderBox[]): boolean {
  if (x < worldBounds.minX + 1 || x > worldBounds.maxX - 1 || z < worldBounds.minZ + 1 || z > worldBounds.maxZ - 1) return true;
  for (const b of boxes) {
    if (x > b.minX - CLEAR_M && x < b.maxX + CLEAR_M && z > b.minZ - CLEAR_M && z < b.maxZ + CLEAR_M) return true;
  }
  return false;
}

/** Office-local (lx, lz) → world. Mirrors the group's rotation about +Y. */
export function officeLocalToWorld(def: OfficeDef, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(def.site.yaw);
  const s = Math.sin(def.site.yaw);
  return { x: def.site.x + lx * c + lz * s, z: def.site.z - lx * s + lz * c };
}

/**
 * Nearest free spot outside the front door (then sides/back as fallback).
 * Searches outward from the facade in 0.4 m steps and ±lateral offsets.
 */
export function officeDoorPoint(def: OfficeDef, boxes: readonly ColliderBox[] = colliders): { x: number; z: number } {
  const { w, d } = def.site;
  // only test boxes near the office — 5k+ boxes otherwise
  const near = boxes.filter(
    (b) => b.maxX > def.site.x - 40 && b.minX < def.site.x + 40 && b.maxZ > def.site.z - 40 && b.minZ < def.site.z + 40,
  );
  const faces: { half: number; across: number; map: (out: number, lat: number) => [number, number] }[] = [
    { half: d / 2, across: w / 2, map: (o, l) => [l, o] }, // front (+Z)
    { half: w / 2, across: d / 2, map: (o, l) => [o, l] }, // east (+X)
    { half: w / 2, across: d / 2, map: (o, l) => [-o, l] }, // west
    { half: d / 2, across: w / 2, map: (o, l) => [l, -o] }, // back
  ];
  const laterals = [0, 1, -1, 2, -2, 3, -3];
  for (const f of faces) {
    for (let out = f.half + 1.0; out <= f.half + 16; out += 0.4) {
      for (const lat of laterals) {
        if (Math.abs(lat) > f.across + 2) continue;
        const [lx, lz] = f.map(out, lat);
        const p = officeLocalToWorld(def, lx, lz);
        if (!blocked(p.x, p.z, near)) return p;
      }
    }
  }
  return officeLocalToWorld(def, 0, d / 2 + 2);
}

export interface OfficeListEntry {
  readonly id: string;
  readonly name: string;
  readonly distanceM: number;
}

/** All offices, nearest first, from a world point. */
export function officesByDistance(x: number, z: number): OfficeListEntry[] {
  return OFFICES.map((o) => ({ id: o.id, name: o.name, distanceM: Math.hypot(o.site.x - x, o.site.z - z) })).sort(
    (a, b) => a.distanceM - b.distanceM,
  );
}

export interface GoToDeps {
  teleport: (x: number, z: number) => void;
  frame: (x: number, z: number, zoom: number) => void;
  select: (officeId: string) => void;
}

/** Teleport to the office door, open its cutaway + card, frame the camera. */
export function goToOffice(officeId: string, deps: GoToDeps): { x: number; z: number } | null {
  const def = findOffice(officeId);
  if (!def) return null;
  const p = officeDoorPoint(def);
  deps.teleport(p.x, p.z);
  deps.select(def.id);
  // aim the camera a little BEHIND the building (screen-up) so the opened
  // floor sits in the clear band between the top HUD and the office card
  const aim = officeLocalToWorld(def, 0, -def.site.d / 2 - 1.5);
  deps.frame(aim.x, aim.z, OFFICE_FRAME_ZOOM);
  return p;
}
