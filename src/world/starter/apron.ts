/**
 * Outer apron past WORLD_MIN/MAX (W-005).
 * Laterite ground ring, fading road stubs, low walls, sparse trees.
 * Specs are merged into the starter static mesh (no extra draw calls).
 */
import { PALETTE } from '../palette';
import type { GeomSpec } from './geometry';
import { APRON_DEPTH, LATERITE_STREET, WORLD_SIZE } from './layout';

const P = PALETTE;

function box(
  size: [number, number, number],
  pos: [number, number, number],
  color: string,
): GeomSpec {
  return { kind: 'box', size, pos, color };
}

function cyl(
  rTop: number,
  rBot: number,
  h: number,
  pos: [number, number, number],
  color: string,
  seg = 8,
): GeomSpec {
  return { kind: 'cyl', rTop, rBot, h, pos, color, seg };
}

export function apronSpecs(): GeomSpec[] {
  const a: GeomSpec[] = [];
  const depth = APRON_DEPTH;
  const outer = WORLD_SIZE / 2 + depth;
  const half = WORLD_SIZE / 2;

  a.push(box([outer * 2, 0.08, depth], [0, -0.04, -(half + depth / 2)], P.laterite));
  a.push(box([outer * 2, 0.08, depth], [0, -0.04, half + depth / 2], P.laterite));
  a.push(box([depth, 0.08, WORLD_SIZE], [-(half + depth / 2), -0.04, 0], P.laterite));
  a.push(box([depth, 0.08, WORLD_SIZE], [half + depth / 2, -0.04, 0], P.laterite));

  a.push(box([depth, 0.05, 7], [-(half + depth / 2), 0.025, 8], P.asphaltEdge));
  a.push(box([depth, 0.05, 7], [half + depth / 2, 0.025, 8], P.asphaltEdge));

  const latW = LATERITE_STREET.x1 - LATERITE_STREET.x0;
  const latCx = (LATERITE_STREET.x0 + LATERITE_STREET.x1) / 2;
  a.push(box([latW, 0.04, depth], [latCx, 0.02, -(half + depth / 2)], P.lateriteDark));
  a.push(box([latW, 0.04, depth], [latCx, 0.02, half + depth / 2], P.lateriteDark));

  const wallH = 1.2;
  const wallT = 0.22;
  for (const x of [-40, -20, 0, 20, 40]) {
    a.push(box([8, wallH, wallT], [x, wallH / 2, -(half + 6)], P.creamFaded));
    a.push(box([8, wallH, wallT], [x, wallH / 2, half + 6], P.creamFaded));
  }
  for (const z of [-40, -20, 20, 40]) {
    a.push(box([wallT, wallH, 8], [-(half + 6), wallH / 2, z], P.mint));
    a.push(box([wallT, wallH, 8], [half + 6, wallH / 2, z], P.skyBlue));
  }

  const apronTrees: { x: number; z: number; s: number }[] = [
    { x: -42, z: -8, s: 1.1 },
    { x: -38, z: 18, s: 0.95 },
    { x: 42, z: -12, s: 1.2 },
    { x: 38, z: 22, s: 1.0 },
    { x: -12, z: -42, s: 1.15 },
    { x: 18, z: -40, s: 0.9 },
    { x: -8, z: 42, s: 1.05 },
    { x: 24, z: 40, s: 1.1 },
  ];
  for (const t of apronTrees) {
    a.push(cyl(0.18 * t.s, 0.22 * t.s, 2.4 * t.s, [t.x, 1.2 * t.s, t.z], P.trunk, 6));
    a.push(cyl(1.4 * t.s, 0.6 * t.s, 2.0 * t.s, [t.x, 3.4 * t.s, t.z], P.canopy, 8));
  }
  return a;
}
