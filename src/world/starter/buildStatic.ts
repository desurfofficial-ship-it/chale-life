/**
 * buildStatic.ts — assembles every static primitive of the starter block
 * into ONE vertex-coloured merged geometry (1 draw call for architecture).
 *
 * All positions come from layout.ts so visuals and colliders never drift.
 * Owned by Agent 3 (World & Art).
 */
import * as THREE from 'three';
import { PALETTE } from '../palette';
import { buildMerged, type GeomSpec } from './geometry';
import {
  BLOCK_SHOPS,
  BLUE_HOUSE,
  CHOP_BAR,
  COMPOUND,
  COMPOUND_HOUSE,
  CROSSOVERS,
  DAAVI_BENCH_MESH,
  DIRT_PATCHES,
  JOB_SPOT_PROPS,
  LATERITE_STREET,
  NORTH_GUTTER,
  NORTH_PAVEMENT,
  NORTH_YARD_HOUSE,
  POLYTANKS,
  PROVISIONS,
  ROAD_DASHES,
  SOUTH_GUTTER,
  SOUTH_PAVEMENT,
  TROTRO_STOP,
  WAAKYE_KIOSK,
  WEST_HOUSE,
  WORLD_MAX,
  WORLD_MIN,
  type Box2D,
} from './layout';

const P = PALETTE;

// ------------------------------------------------------------- helpers -----
function footprintSize(fp: Box2D): { w: number; d: number; cx: number; cz: number } {
  return { w: fp.x1 - fp.x0, d: fp.z1 - fp.z0, cx: (fp.x0 + fp.x1) / 2, cz: (fp.z0 + fp.z1) / 2 };
}

function box(
  size: [number, number, number],
  pos: [number, number, number],
  color: string,
  rot?: [number, number, number],
): GeomSpec {
  return { kind: 'box', size, pos, color, rot };
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

/**
 * Flat-roofed block building with plinth, parapet and dark door/window
 * openings proud of the front wall. `front` = '+z' (north-side buildings
 * facing the road) or '-z' (south-side buildings facing the road) or
 * '+x' / '-x' for the side-street house.
 */
function pushBuilding(
  out: GeomSpec[],
  fp: Box2D,
  h: number,
  wall: string,
  front: '+z' | '-z' | '+x' | '-x',
  openings: { dx: number; kind: 'door' | 'window' | 'shutter' }[],
) {
  const { w, d, cx, cz } = footprintSize(fp);
  out.push(box([w + 0.3, 0.22, d + 0.3], [cx, 0.11, cz], P.concreteDark)); // plinth
  out.push(box([w, h, d], [cx, h / 2 + 0.02, cz], wall)); // mass
  // Parapet ring
  out.push(box([w, 0.28, 0.16], [cx, h + 0.16, cz - d / 2 + 0.08], wall));
  out.push(box([w, 0.28, 0.16], [cx, h + 0.16, cz + d / 2 - 0.08], wall));
  out.push(box([0.16, 0.28, d - 0.3], [cx - w / 2 + 0.08, h + 0.16, cz], wall));
  out.push(box([0.16, 0.28, d - 0.3], [cx + w / 2 - 0.08, h + 0.16, cz], wall));
  // Roof slab (recessed behind parapet)
  out.push(box([w - 0.36, 0.06, d - 0.36], [cx, h + 0.05, cz], P.concreteDark));

  for (const o of openings) {
    if (front === '+z' || front === '-z') {
      const z = front === '+z' ? fp.z1 + 0.02 : fp.z0 - 0.02;
      const sign = front === '+z' ? 1 : -1;
      if (o.kind === 'door') {
        out.push(box([0.95, 2.05, 0.1], [cx + o.dx, 1.24, z + sign * 0.01], P.woodDark));
      } else if (o.kind === 'window') {
        out.push(box([0.85, 1.0, 0.1], [cx + o.dx, 1.9, z + sign * 0.01], P.woodDark));
        out.push(box([0.98, 0.09, 0.14], [cx + o.dx, 1.34, z + sign * 0.02], P.concreteDark)); // sill
      } else {
        out.push(box([2.6, 2.2, 0.1], [cx + o.dx, 1.32, z + sign * 0.01], P.iron)); // roller shutter
        out.push(box([2.7, 0.09, 0.16], [cx + o.dx, 2.48, z + sign * 0.02], P.trim)); // shutter box
      }
    } else {
      const x = front === '+x' ? fp.x1 + 0.02 : fp.x0 - 0.02;
      const sign = front === '+x' ? 1 : -1;
      if (o.kind === 'door') {
        out.push(box([0.1, 2.05, 0.95], [x + sign * 0.01, 1.24, cz + o.dx], P.woodDark));
      } else {
        out.push(box([0.1, 1.0, 0.85], [x + sign * 0.01, 1.9, cz + o.dx], P.woodDark));
        out.push(box([0.14, 0.09, 0.98], [x + sign * 0.02, 1.34, cz + o.dx], P.concreteDark));
      }
    }
  }
}

/** Mono-pitch iron-sheet roof with ridge lines (shops, kiosk, shed). */
function pushIronRoof(
  out: GeomSpec[],
  cx: number,
  cz: number,
  w: number,
  d: number,
  y: number,
  rotX: number,
  overhang = 0.35,
) {
  out.push(box([w + overhang, 0.07, d + overhang], [cx, y, cz], P.ironRoof, [rotX, 0, 0]));
  const n = Math.max(3, Math.round(w / 1.1));
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + ((i + 0.5) * w) / n;
    out.push(box([0.09, 0.03, d + overhang - 0.1], [x, y + 0.045, cz], P.ironRoofDark, [rotX, 0, 0]));
  }
}

// --------------------------------------------------------------- ground ----
function groundSpecs(): GeomSpec[] {
  const g: GeomSpec[] = [];
  g.push(box([60, 0.1, 60], [0, -0.05, 0], P.dirt)); // base plane (top y=0)
  // Laterite side street + worn centre strip
  g.push(box([LATERITE_STREET.x1 - LATERITE_STREET.x0, 0.04, 60], [(LATERITE_STREET.x0 + LATERITE_STREET.x1) / 2, 0.02, 0], P.laterite));
  g.push(box([2.4, 0.006, 60], [(LATERITE_STREET.x0 + LATERITE_STREET.x1) / 2, 0.043, 0], P.lateriteDark));
  // Tarred main road (painted over the laterite junction)
  g.push(box([60, 0.05, 7], [0, 0.025, 8], P.asphalt));
  for (const dx of ROAD_DASHES) g.push(box([1.6, 0.03, 0.16], [dx, 0.065, 8], P.roadLine));
  // Pavements
  g.push(box([60, 0.07, 2], [0, 0.035, 2.85], P.concrete));
  g.push(box([60, 0.07, 2], [0, 0.035, 13.15], P.concrete));
  // Open drains (U-channel: dark bed + concrete lips)
  for (const gz of [NORTH_GUTTER.z0, SOUTH_GUTTER.z0]) {
    const mid = gz + 0.325;
    g.push(box([60, 0.04, 0.54], [0, 0.02, mid], P.gutterDark));
    g.push(box([60, 0.12, 0.1], [0, 0.06, gz + 0.05], P.gutterWall));
    g.push(box([60, 0.12, 0.1], [0, 0.06, gz + 0.6], P.gutterWall));
  }
  // Concrete crossovers
  for (const c of CROSSOVERS) g.push(box([1.5, 0.08, 0.72], [c.x, 0.09, c.z], P.concrete));
  // Dirt-yard wear patches — height follows the surface they sit on
  for (const p of DIRT_PATCHES) {
    const cz = (p.z0 + p.z1) / 2;
    const inPavement = (cz > NORTH_PAVEMENT.z0 && cz < NORTH_PAVEMENT.z1) || (cz > SOUTH_PAVEMENT.z0 && cz < SOUTH_PAVEMENT.z1);
    const onLaterite = !inPavement && p.x0 >= LATERITE_STREET.x0 - 1 && p.x1 <= LATERITE_STREET.x1 + 1;
    const y = inPavement ? 0.076 : onLaterite ? 0.047 : 0.005;
    g.push(box([p.x1 - p.x0, 0.008, p.z1 - p.z0], [(p.x0 + p.x1) / 2, y, cz], P.dirtYard));
  }
  return g;
}

// ------------------------------------------------------------ buildings ----
function buildingSpecs(): GeomSpec[] {
  const b: GeomSpec[] = [];

  // Provisions store — sky-blue, roller shutter, display window
  pushBuilding(b, PROVISIONS.footprint, PROVISIONS.height, P[PROVISIONS.wall], '+z', [
    { dx: -2.6, kind: 'shutter' },
    { dx: 1.0, kind: 'door' },
    { dx: -0.4, kind: 'window' },
  ]);
  // Shop row — mono-pitch iron roofs over parapet-less masses
  for (const shop of BLOCK_SHOPS) {
    const { w, d, cx, cz } = footprintSize(shop.footprint);
    b.push(box([w + 0.3, 0.22, d + 0.3], [cx, 0.11, cz], P.concreteDark));
    b.push(box([w, shop.height, d], [cx, shop.height / 2 + 0.02, cz], P[shop.wall]));
    b.push(box([0.95, 2.0, 0.1], [cx - w / 4 - 0.2, 1.22, shop.footprint.z1 + 0.02], P.woodDark)); // door
    b.push(box([1.5, 0.95, 0.1], [cx + w / 4 + 0.2, 1.65, shop.footprint.z1 + 0.02], P.woodDark)); // display window
    b.push(box([1.64, 0.08, 0.14], [cx + w / 4 + 0.2, 1.12, shop.footprint.z1 + 0.03], P.concreteDark));
    pushIronRoof(b, cx, cz, w, d, shop.height + 0.28, -0.1); // slopes down to street
  }

  // Daavi's waakye kiosk — MTN-style yellow boards on block feet
  {
    const { cx, cz } = footprintSize(WAAKYE_KIOSK.footprint);
    const k = WAAKYE_KIOSK.footprint;
    for (const [bx, bz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4], [0, -1.4], [0, 1.4]]) {
      b.push(box([0.28, 0.16, 0.28], [cx + bx, 0.08, cz + bz], P.concreteDark));
    }
    b.push(box([3.2, 0.1, 3.2], [cx, 0.21, cz], P.wood)); // floor deck
    b.push(box([3.2, 1.95, 3.2], [cx, 1.235, cz], P.kioskYellow)); // mass
    for (const sx of [-1.2, -0.4, 0.4, 1.2]) {
      b.push(box([0.05, 1.9, 0.03], [cx + sx, 1.23, k.z1 + 0.02], P.kioskYellowDark)); // plank gaps
    }
    b.push(box([1.3, 0.75, 0.12], [cx + 0.2, 1.6, k.z1 + 0.02], P.woodDark)); // serving hatch
    b.push(box([1.6, 0.06, 0.4], [cx + 0.2, 1.16, k.z1 + 0.18], P.wood)); // counter ledge
    pushIronRoof(b, cx, cz, 3.2, 3.2, 2.38, -0.07, 0.4);
  }

  // North yard house + west house (skyline depth)
  pushBuilding(b, NORTH_YARD_HOUSE.footprint, NORTH_YARD_HOUSE.height, P[NORTH_YARD_HOUSE.wall], '+z', [
    { dx: -2.2, kind: 'door' },
    { dx: 0.2, kind: 'window' },
    { dx: 2.4, kind: 'window' },
  ]);
  pushBuilding(b, WEST_HOUSE.footprint, WEST_HOUSE.height, P[WEST_HOUSE.wall], '+x', [
    { dx: 0.2, kind: 'door' },
    { dx: -1.4, kind: 'window' },
    { dx: 1.6, kind: 'window' },
  ]);

  // Compound house (inside the wall, faces the gate)
  pushBuilding(b, COMPOUND_HOUSE.footprint, COMPOUND_HOUSE.height, P.cream, '-z', [
    { dx: -2.6, kind: 'door' },
    { dx: -0.6, kind: 'window' },
    { dx: 1.4, kind: 'window' },
    { dx: 3.0, kind: 'window' },
  ]);
  // Kitchen lean-to against the east compound wall
  {
    const lt = COMPOUND.leanTo;
    const { cx, cz } = footprintSize(lt);
    b.push(box([lt.x1 - lt.x0, 2.05, lt.z1 - lt.z0], [cx, 1.03, cz], P.creamFaded));
    pushIronRoof(b, cx, cz, lt.x1 - lt.x0, lt.z1 - lt.z0, 2.2, 0.09, 0.25);
  }

  // Chop bar
  pushBuilding(b, CHOP_BAR.footprint, CHOP_BAR.height, P.chopBar, '-z', [
    { dx: -1.4, kind: 'window' },
    { dx: 1.1, kind: 'door' },
    { dx: 3.4, kind: 'window' },
  ]);

  // Blue house
  pushBuilding(b, BLUE_HOUSE.footprint, BLUE_HOUSE.height, P.skyBlue, '-z', [
    { dx: -2.4, kind: 'door' },
    { dx: 0.4, kind: 'window' },
    { dx: 2.8, kind: 'window' },
  ]);

  return b;
}

// ------------------------------------------------------------- compound ----
function compoundSpecs(): GeomSpec[] {
  const c: GeomSpec[] = [];
  const t = 0.24;
  for (const w of COMPOUND.walls) {
    const wLen = Math.max(w.x1 - w.x0, t);
    const wDep = Math.max(w.z1 - w.z0, t);
    c.push(box([wLen, 2.2, wDep], [(w.x0 + w.x1) / 2, 1.1, (w.z0 + w.z1) / 2], P.creamFaded));
    c.push(box([wLen + 0.07, 0.05, wDep + 0.07], [(w.x0 + w.x1) / 2, 2.225, (w.z0 + w.z1) / 2], P.concreteDark));
  }
  // Gate posts + two swung-open leaf gates
  const gz = COMPOUND.gate.z;
  c.push(box([0.42, 2.5, 0.42], [-11.3, 1.25, gz], P.concreteDark));
  c.push(box([0.42, 2.5, 0.42], [-7.7, 1.25, gz], P.concreteDark));
  const leaf = 1.45;
  const theta = 1.1; // open angle (into the yard)
  const dx = Math.cos(theta) * (leaf / 2);
  const dz = Math.sin(theta) * (leaf / 2);
  c.push(
    box([leaf, 1.8, 0.06], [-11.1 + dx, 1.0, gz + dz], P.gate, [0, -theta, 0]),
  );
  c.push(
    box([leaf, 1.8, 0.06], [-7.9 - dx, 1.0, gz + dz], P.gate, [0, Math.PI + theta, 0]),
  );
  return c;
}

function polytankSpecs(): GeomSpec[] {
  const s: GeomSpec[] = [];
  for (const tank of POLYTANKS) {
    const { x, z, s: sc } = tank;
    for (const [lx, lz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
      s.push(box([0.08 * sc, 1.1 * sc, 0.08 * sc], [x + lx * sc, 0.55 * sc, z + lz * sc], P.iron));
    }
    s.push(box([1.15 * sc, 0.06, 1.15 * sc], [x, 1.16 * sc, z], P.iron));
    s.push(cyl(0.82 * sc, 0.82 * sc, 1.3 * sc, [x, 1.86 * sc, z], P.tank, 10));
    s.push(cyl(0.55 * sc, 0.6 * sc, 0.14 * sc, [x, 2.58 * sc, z], P.tank, 10));
  }
  return s;
}

// ---------------------------------------------------------- trotro stop ----
function trotroSpecs(): GeomSpec[] {
  const t: GeomSpec[] = [];
  for (const p of TROTRO_STOP.posts) t.push(cyl(0.07, 0.07, 2.3, [p.x, 1.15, p.z], P.iron, 6));
  t.push(box([3.8, 0.07, 1.6], [22.5, 2.34, 13.25], P.ironRoof));
  for (const rx of [21.6, 22.5, 23.4]) t.push(box([0.09, 0.03, 1.5], [rx, 2.39, 13.25], P.ironRoofDark));
  const bench = TROTRO_STOP.bench;
  const bcx = (bench.x0 + bench.x1) / 2;
  const bcz = (bench.z0 + bench.z1) / 2;
  t.push(box([bench.x1 - bench.x0, 0.07, bench.z1 - bench.z0], [bcx, 0.52, bcz], P.wood));
  for (const lx of [bcx - 1.45, bcx + 1.45]) t.push(box([0.08, 0.5, 0.4], [lx, 0.25, bcz], P.woodDark));
  // sign post: nudged +x so it sits BEHIND the sign plane (which faces west);
  // at the exact sign x/z the cylinder's west face painted over the board.
  t.push(cyl(0.05, 0.05, 2.7, [TROTRO_STOP.sign.x + 0.07, 1.35, TROTRO_STOP.sign.z], P.iron, 6));
  return t;
}

// ---------------------------------------------------------- chop bar set ---
function chopBarSpecs(): GeomSpec[] {
  const s: GeomSpec[] = [];
  // Two wooden eating tables between the parasols
  for (const [tx, tz] of [[3.5, 22.5], [6.5, 22.7]]) {
    s.push(box([1.1, 0.06, 0.7], [tx, 0.78, tz], P.wood));
    for (const [lx, lz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) {
      s.push(box([0.06, 0.75, 0.06], [tx + lx, 0.375, tz + lz], P.woodDark));
    }
  }
  // Cool chest by the waakye kiosk
  s.push(box([0.72, 0.5, 0.46], [17.9, 0.25, 2.4], P.plasticBlue));
  s.push(box([0.76, 0.07, 0.5], [17.9, 0.53, 2.4], P.plasticBlue));
  return s;
}

// ------------------------------------------------- daavi job spot / bench --
/**
 * G-008d world props for Daavi's split zones, all merged into the static
 * mesh (zero extra draw calls). Footprints live in layout.ts and are the
 * same boxes the colliders use — visuals and physics cannot drift.
 */
function daaviSpecs(): GeomSpec[] {
  const d: GeomSpec[] = [];

  // -- Daavi's bench: wooden, faces south (the road / the player) --
  // Seat + backrest fill DAAVI_BENCH_MESH exactly; the waypoint
  // (21.5, 2.45 — G-008e, nudged south of the mesh for capsule
  // clearance) sits 0.7 m south of the seat's front face.
  const b = DAAVI_BENCH_MESH;
  const bcx = (b.x0 + b.x1) / 2;
  const bcz = (b.z0 + b.z1) / 2;
  const seatW = b.x1 - b.x0;
  const seatD = b.z1 - b.z0;
  for (const lx of [bcx - seatW / 2 + 0.15, bcx + seatW / 2 - 0.15]) {
    d.push(box([0.09, 0.42, seatD - 0.06], [lx, 0.21, bcz], P.woodDark)); // legs
  }
  d.push(box([seatW, 0.07, seatD], [bcx, 0.455, bcz], P.wood)); // seat
  for (const px of [bcx - seatW / 2 + 0.2, bcx + seatW / 2 - 0.2]) {
    d.push(box([0.07, 0.55, 0.06], [px, 0.66, b.z1 - 0.04], P.woodDark)); // back posts
  }
  d.push(box([seatW - 0.1, 0.09, 0.05], [bcx, 0.84, b.z1 - 0.04], P.wood)); // backrest
  d.push(box([seatW - 0.1, 0.09, 0.05], [bcx, 0.64, b.z1 - 0.04], P.wood));

  // -- crate + pan stack against the kiosk's east wall (the job spot) --
  // The solid footprint (JOB_SPOT_PROPS) ends at x 17.62 so the standing
  // point (18.0, 0.0) stays walkable — see layout.ts.
  d.push(box([0.4, 0.3, 0.42], [17.31, 0.15, -0.27], P.plasticRed)); // crate A
  d.push(box([0.4, 0.3, 0.42], [17.31, 0.15, 0.19], P.plasticBlue)); // crate B
  d.push(box([0.36, 0.26, 0.38], [17.31, 0.43, 0.19], P.plasticGreen)); // crate C on B
  // Aluminium pans: two stacked on crate A, one on crate C, one leaning.
  d.push(cyl(0.13, 0.11, 0.1, [17.3, 0.35, -0.27], P.iron, 10));
  d.push(cyl(0.11, 0.09, 0.09, [17.3, 0.445, -0.27], P.iron, 10));
  d.push(cyl(0.1, 0.08, 0.1, [17.31, 0.61, 0.19], P.iron, 10));
  d.push(box([0.02, 0.34, 0.26], [17.53, 0.16, 0.19], P.iron, [0, 0, -0.3]));

  return d;
}

// ---------------------------------------------------------------- build ----
/** All static architecture of the block, merged into one geometry. */
export function buildStarterBlockGeometry(): GeomSpec[] {
  return [
    ...groundSpecs(),
    ...buildingSpecs(),
    ...compoundSpecs(),
    ...polytankSpecs(),
    ...trotroSpecs(),
    ...chopBarSpecs(),
    ...daaviSpecs(),
  ];
}

/** Shared bounds so stray geometry can be caught in review. */
export const STATIC_BOUNDS = { minX: WORLD_MIN, maxX: WORLD_MAX, minZ: WORLD_MIN, maxZ: WORLD_MAX };

/** Build once at module load (~200 primitives, sub-millisecond merge). */
function buildOnce(): THREE.BufferGeometry {
  const g = buildMerged(buildStarterBlockGeometry());
  if (!g) throw new Error('[world] starter block produced no static geometry');
  g.computeBoundingSphere();
  return g;
}
const staticGeometry = buildOnce();
export { staticGeometry };
