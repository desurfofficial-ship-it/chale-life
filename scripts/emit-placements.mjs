#!/usr/bin/env node
/**
 * W-009 emit-placements.mjs — authored + seeded-scatter placement data for
 * the props layer. Run with:
 *   node --experimental-strip-types scripts/emit-placements.mjs
 * (imports src/lib/mapConfig.ts directly so ROADS/keeps can't drift from
 *  the source of truth; reads colliders.json for building blockouts)
 *
 * Safety by construction (W-006 lesson: dressing never touches routes):
 *   - ROADS rects inflated 1.6 m (props never on car/walk surfaces)
 *   - colliders.json boxes inflated 0.6 m (props never inside buildings)
 *   - DAAVI_PLOT +2 m, CIRCLE island disc, LAGOON ellipse +1.5 m, sea z≥44.5
 *   - LAND_PLOTS excluded except for terrain-category kits (the buy-land
 *     plots keep their shrub/rock look)
 *   - 1.2-2.5 m pairwise spacing via hash grid, seeded PRNG (deterministic)
 *
 * Emits src/world/props/propPlacements.ts (grouped per district bucket —
 * the runtime merges each bucket into ONE draw call).
 */
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Node 24 strips types natively, but mapConfig imports './t13Layout'
// extensionless — temp-copy the whole chain with specifiers rewritten to .ts.
const tmpTs = mkdtempSync(path.join(tmpdir(), 'w009-map-'));
for (const f of ['mapConfig', 't13Layout', 'communityLayout', 'osuNimaLayout', 'houseYards']) {
  let src = readFileSync(path.join(ROOT, 'src/lib', f + '.ts'), 'utf8');
  src = src.replace(/from '\.\/([\w]+)'/g, "from './$1.ts'");
  writeFileSync(path.join(tmpTs, f + '.ts'), src);
}
const { ROADS, DAAVI_PLOT, LAGOON, CIRCLE, LAND_PLOTS } = await import(path.join(tmpTs, 'mapConfig.ts'));
const t13 = await import(path.join(tmpTs, 't13Layout.ts'));
const comm = await import(path.join(tmpTs, 'communityLayout.ts'));
const osuNima = await import(path.join(tmpTs, 'osuNimaLayout.ts'));
const houseYards = await import(path.join(tmpTs, 'houseYards.ts'));

const colliders = JSON.parse(readFileSync(path.join(ROOT, 'src/world/accra/data/colliders.json'), 'utf8'));

// ── layout-data blocklist: the districts' own buildings/props live in the
// lib layout modules (t13Layout, communityLayout, osuNimaLayout,
// houseYards) — colliders.json does NOT cover all of them (e.g. the Tema
// port sheds/containers), so walk every export and collect:
//   - {x, z, w, d} objects  → keep-out rect (inflated 0.6)
//   - {x, z} objects        → keep-out disc r 2.4 (houses/lamps/trees)
//   - {p:[x,z]} props       → keep-out disc r 1.6 (containers, stalls…)
const layoutRects = [];
const layoutDiscs = [];
function collect(node, depth = 0) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) { for (const n of node) collect(n, depth + 1); return; }
  if (typeof node !== 'object') return;
  const x = node.x, z = node.z, w = node.w, d = node.d, p = node.p;
  if (typeof x === 'number' && typeof z === 'number') {
    if (typeof w === 'number' && typeof d === 'number') {
      layoutRects.push(inflate(0.6)({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }));
    } else {
      layoutDiscs.push({ x, z, r: 2.4 });
    }
  }
  if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
    layoutDiscs.push({ x: p[0], z: p[1], r: 1.6 });
  }
  for (const v of Object.values(node)) collect(v, depth + 1);
}
for (const mod of [t13, comm, osuNima, houseYards]) {
  for (const v of Object.values(mod)) collect(v);
}
// spatial hash for the discs (thousands of anchors)
const DISC_CELL = 8;
const discGrid = new Map();
for (const dd of layoutDiscs) {
  const cx = Math.floor(dd.x / DISC_CELL), cz = Math.floor(dd.z / DISC_CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k2 = `${cx + i}:${cz + j}`;
    if (!discGrid.has(k2)) discGrid.set(k2, []);
    discGrid.get(k2).push(dd);
  }
}
function nearLayoutDisc(x, z) {
  const list = discGrid.get(`${Math.floor(x / DISC_CELL)}:${Math.floor(z / DISC_CELL)}`);
  if (!list) return false;
  for (const dd of list) if (Math.hypot(x - dd.x, z - dd.z) < dd.r) return true;
  return false;
}

// ── deterministic PRNG (mulberry32) ───────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── blocklist geometry ────────────────────────────────────────────────
const roadRects = Object.values(ROADS).map((r) =>
  r.x0 !== undefined
    ? { x0: r.x0 - r.w / 2, x1: r.x1 + r.w / 2, z0: r.z - r.w / 2, z1: r.z + r.w / 2 }
    : { x0: r.x - r.w / 2, x1: r.x + r.w / 2, z0: r.z0 - r.w / 2, z1: r.z1 + r.w / 2 }
).map(inflate(1.6));

const colBoxes = colliders.boxes.map((b) => inflate(0.6)({ x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2] }));
const plotRects = LAND_PLOTS.map((p) => inflate(0.4)({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, z0: p.z - p.d / 2, z1: p.z + p.d / 2 }));
const daavi = inflate(2)({ x0: DAAVI_PLOT.x0, x1: DAAVI_PLOT.x1, z0: DAAVI_PLOT.z0, z1: DAAVI_PLOT.z1 });
// sleep-yard / Daavi frontage block (e2e sleepYard route: yard zone x1 = −131)
const daaviFrontage = { x0: -160, x1: -122, z0: -22, z1: 8 };
const KEEP_DISCS = [
  { x: CIRCLE.x, z: CIRCLE.z, r: CIRCLE.ringOuter + 1 },
  { x: 8, z: 3, r: 3.5 },      // jollof spot
  { x: -24, z: 26, r: 3 },     // MTN shop front
  { x: 35, z: 18.5, r: 5 },    // fuel station forecourt
  { x: -36, z: -60, r: 7 },    // trotro station apron
  { x: -65, z: 18.5, r: 5 },   // independence arch
  { x: -146, z: 22.5, r: 4 },  // lighthouse
  { x: 76, z: -6, r: 5 },      // accra mall front (ATM hand-placed nearby)
];
function inflate(m) {
  return (r) => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m });
}
function inRect(r, x, z) { return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1; }
function blocked(x, z, opts = {}) {
  const plates = opts.allowPlots ? roadRects.concat(colBoxes) : roadRects.concat(colBoxes, plotRects);
  for (const r of plates) if (inRect(r, x, z)) return true;
  for (const r of layoutRects) if (inRect(r, x, z)) return true;
  if (nearLayoutDisc(x, z)) return true;
  if (inRect(daavi, x, z) || inRect(daaviFrontage, x, z)) return true;
  for (const d of KEEP_DISCS) if (Math.hypot(x - d.x, z - d.z) < d.r) return true;
  // lagoon ellipse + 1.5
  const dx = (x - LAGOON.x) / (LAGOON.rx + 1.5), dz = (z - LAGOON.z) / (LAGOON.rz + 1.5);
  if (dx * dx + dz * dz < 1) return true;
  if (z >= 44.5) return true; // sea
  return false;
}
/** which blocklist rect rejects (x,z) — for hand-placement debugging */
function blockedReason(x, z) {
  const checks = [
    ['road', roadRects], ['collider', colBoxes], ['plot', plotRects], ['layout-rect', layoutRects],
  ];
  for (const [name, rects] of checks) for (const r of rects) if (inRect(r, x, z)) return name;
  if (nearLayoutDisc(x, z)) return 'layout-disc';
  if (inRect(daavi, x, z)) return 'daavi';
  if (inRect(daaviFrontage, x, z)) return 'daavi-frontage';
  for (const d of KEEP_DISCS) if (Math.hypot(x - d.x, z - d.z) < d.r) return 'keep-disc';
  const dx = (x - LAGOON.x) / (LAGOON.rx + 1.5), dz = (z - LAGOON.z) / (LAGOON.rz + 1.5);
  if (dx * dx + dz * dz < 1) return 'lagoon';
  if (z >= 44.5) return 'sea';
  return null;
}

// ── probe mode: node emit-placements.mjs --probe "x,z x,z ..." ────────
const probeIdx = process.argv.indexOf('--probe');
if (probeIdx >= 0) {
  for (const tok of (process.argv[probeIdx + 1] ?? '').split(/\s+/).filter(Boolean)) {
    const [px, pz] = tok.split(',').map(Number);
    console.log(`(${px},${pz}) → ${blockedReason(px, pz) ?? 'OK'}`);
  }
  process.exit(0);
}

// ── district scatter zones ────────────────────────────────────────────
// kit entry: [kit, weight, {sMin,sMax,rot:'axis'|'free', spacing}]
const CL = { sMin: 0.92, sMax: 1.1, rot: 'free', spacing: 1.3 };
const NAT = { sMin: 0.9, sMax: 1.15, rot: 'free', spacing: 2.6 };
const AX = { sMin: 1, sMax: 1, rot: 'axis', spacing: 2.2 };

const ZONES = [
  { id: 'makola', rect: [-56, -30, -20, 2], n: 62, seed: 101, kits: [
    ['sack-stack', 5, CL], ['barrel', 5, CL], ['cardboard-box', 4, CL], ['jerrycan', 4, CL],
    ['gas-cylinder', 4, CL], ['storage-bin', 4, CL], ['bucket', 4, CL], ['hand-cart', 2, { ...CL, rot: 'axis' }],
    ['push-truck', 2, { ...CL, rot: 'axis' }], ['cooler-box', 3, CL], ['plastic-chair-stack', 2, CL],
  ]},
  { id: 'jamestown', rect: [-162, 6, -120, 33], n: 26, seed: 102, kits: [
    ['draughts-table', 3, AX], ['ludo-table', 3, AX], ['bicycle', 4, { ...CL, rot: 'axis' }],
    ['wheel-tyre-stack', 4, CL], ['plastic-chair-stack', 4, CL], ['barrel', 3, CL],
    ['drum-set', 2, AX], ['a-frame-sign', 2, { ...CL, rot: 'axis' }], ['banner-pole', 2, AX],
  ]},
  { id: 'chorkor-harbour', rect: [-202, 8, -158, 30], n: 14, seed: 103, kits: [
    ['fish-smoker', 4, { ...CL, spacing: 2.2 }], ['water-pump', 2, AX], ['wheel-tyre-stack', 2, CL],
    ['fishing-net-pile', 4, CL], ['bucket', 2, CL],
  ]},
  { id: 'labadi-beach', rect: [30, 36.5, 95, 43.5], n: 20, seed: 104, kits: [
    ['beach-umbrella', 5, NAT], ['beach-chair', 6, CL], ['buoy', 3, CL], ['fishing-net-pile', 3, CL],
    ['lifeguard-tower', 1, AX], ['outboard-motor', 2, CL],
  ], allowBeachOnly: true },
  { id: 'oxford-osu', rect: [50, -28, 72, 26], n: 22, seed: 105, kits: [
    ['a-frame-sign', 4, { ...CL, rot: 'axis' }], ['price-board', 3, { ...CL, rot: 'axis' }],
    ['potted-plant', 4, CL], ['bicycle', 4, { ...CL, rot: 'axis' }], ['scooter', 3, { ...CL, rot: 'axis' }],
    ['neon-box-sign', 3, { ...CL, rot: 'axis' }], ['street-name-sign', 2, AX],
  ]},
  { id: 'cbd', rect: [18, -28, 56, -2], n: 16, seed: 106, kits: [
    ['flower-bed', 5, { ...NAT, spacing: 2 }], ['hedge-block', 4, { ...NAT, spacing: 2.2 }],
    ['atm-machine', 2, AX], ['flag-pole', 2, AX], ['transformer', 2, AX], ['notice-board', 2, AX],
  ]},
  { id: 'nima', rect: [0, -75, 56, -51], n: 24, seed: 107, kits: [
    ['banana-plant', 5, NAT], ['plantain-tree', 3, NAT], ['water-pump', 2, AX],
    ['polytank', 3, CL], ['gas-cylinder', 3, CL], ['sack-stack', 3, CL],
    ['satellite-dish', 3, CL], ['solar-panel', 3, AX],
  ]},
  { id: 'dansoman', rect: [-152, -75, -92, -51], n: 18, seed: 108, kits: [
    ['satellite-dish', 4, CL], ['solar-panel', 4, AX], ['bicycle', 3, { ...CL, rot: 'axis' }],
    ['baby-stroller', 2, { ...CL, rot: 'axis' }], ['hedge-block', 3, NAT], ['overhead-tank', 2, CL],
    ['banana-plant', 2, NAT],
  ]},
  { id: 'park-playground', rect: [-116, -46, -62, -14], n: 18, seed: 109, kits: [
    ['swing-set', 2, AX], ['football-goal', 1, AX], ['basketball-hoop', 1, AX],
    ['table-tennis-table', 2, AX], ['broadleaf-tree', 5, NAT], ['bush', 4, NAT],
    ['ludo-table', 2, AX],
  ]},
  { id: 'kaneshie', rect: [-218, -101, -178, -88], n: 24, seed: 110, kits: [
    ['sack-stack', 5, CL], ['barrel', 4, CL], ['hand-cart', 3, { ...CL, rot: 'axis' }],
    ['plastic-chair-stack', 3, CL], ['price-board', 2, { ...CL, rot: 'axis' }],
    ['notice-kiosk', 1, AX], ['bucket', 3, CL], ['cardboard-box', 3, CL],
  ]},
  { id: 'stadium', rect: [116, -80, 162, -62], n: 12, seed: 111, kits: [
    ['traffic-cone', 6, CL], ['flag-pole', 2, AX], ['ticket-booth', 1, AX], ['security-booth', 1, AX],
    ['wheel-tyre-stack', 2, CL],
  ]},
  { id: 'greenery-park', rect: [-118, -48, -64, -14], n: 22, seed: 112, kits: [
    ['broadleaf-tree', 6, NAT], ['bush', 6, NAT], ['grass-clump', 5, NAT],
    ['log', 2, { ...NAT, rot: 'free' }], ['stump', 2, NAT], ['rock', 3, NAT],
  ], allowPlots: true },
  { id: 'chalewote', rect: [-138, 0, -118, 14], n: 14, seed: 113, kits: [
    ['banner-pole', 4, AX], ['drum-set', 2, AX], ['plastic-chair-stack', 3, CL],
    ['potted-plant', 3, CL], ['a-frame-sign', 2, { ...CL, rot: 'axis' }],
  ]},
  { id: 'teshie-nungua', rect: [110, -28, 205, 26], n: 22, seed: 114, kits: [
    ['satellite-dish', 4, CL], ['solar-panel', 3, AX], ['polytank', 3, CL],
    ['banana-plant', 4, NAT], ['bicycle', 3, { ...CL, rot: 'axis' }],
    ['wheel-tyre-stack', 3, CL], ['hedge-block', 2, NAT],
  ]},
  { id: 'estates-sakumono', rect: [180, -80, 315, -34], n: 16, seed: 115, kits: [
    ['solar-panel', 4, AX], ['satellite-dish', 3, CL], ['overhead-tank', 2, CL],
    ['hedge-block', 3, NAT], ['grass-clump', 4, NAT],
  ], allowPlots: true },
  { id: 'coast-strip-west', rect: [-160, 36.5, -20, 43.5], n: 22, seed: 121, kits: [
    ['fishing-canoe', 6, { ...NAT, rot: 'free', spacing: 3.5 }], ['beach-umbrella', 4, NAT],
    ['buoy', 3, CL], ['fishing-net-pile', 4, CL], ['jetty-post', 2, AX], ['palm-tree', 5, NAT],
  ]},
  { id: 'coast-strip-east', rect: [100, 36.5, 200, 43.5], n: 16, seed: 122, kits: [
    ['fishing-canoe', 5, { ...NAT, rot: 'free', spacing: 3.5 }], ['beach-umbrella', 4, NAT],
    ['buoy', 2, CL], ['jetty-post', 3, AX], ['palm-tree', 4, NAT],
  ]},
  { id: 'chorkor-west', rect: [-268, -28, -206, 26], n: 14, seed: 118, kits: [
    ['palm-tree', 4, NAT], ['satellite-dish', 3, CL], ['water-pump', 2, AX],
    ['gas-cylinder', 2, CL], ['banana-plant', 3, NAT],
  ]},
  { id: 'tema-port', rect: [216, 30, 300, 78], n: 14, seed: 119, kits: [
    ['traffic-cone', 5, CL], ['security-booth', 1, AX], ['transformer', 2, AX],
    ['generator', 2, AX], ['overhead-tank', 2, CL], ['wheel-tyre-stack', 2, CL],
  ]},
  { id: 'airport-city', rect: [64, -22, 100, 2], n: 10, seed: 120, kits: [
    ['atm-machine', 1, AX], ['potted-plant', 3, CL], ['hedge-block', 3, NAT],
    ['solar-panel', 2, AX], ['flag-pole', 1, AX],
  ]},
];

// ── hand-placed heroes ────────────────────────────────────────────────
const HAND = [
  // electric-pole rows along the two arteries (offset 6.5 m from road edge)
  ...polesAlongH('ew2', -270, 328, -31.5 - 4.5 - 2),  // north side of ew2 (z −38)
  ...polesAlongH('airportRd', -270, 328, -86 + 4.5 + 2), // south side of airportRd (z −79.5)
  ...polesAlongH('coastal', -160, 200, 28 - 4.5 - 2),  // north side of coastal (z 21.5)
  // billboards (facing the road, snapped) — probe-verified free
  { district: 'oxford-osu', kit: 'billboard', x: 40, z: 20, rot: 90, s: 1 },
  { district: 'tema-port', kit: 'billboard', x: 274, z: 10, rot: 0, s: 1 },
  // harbour canoe rows — probe-verified sand gaps between the captured racks
  { district: 'chorkor-harbour', kit: 'fishing-canoe', x: -198, z: 36.5, rot: 75, s: 1 },
  { district: 'chorkor-harbour', kit: 'fishing-canoe', x: -216, z: 41, rot: 80, s: 0.96 },
  { district: 'chorkor-harbour', kit: 'fishing-canoe', x: -218, z: 37.5, rot: 70, s: 1.04 },
  { district: 'chorkor-harbour', kit: 'fishing-canoe', x: -184, z: 43, rot: 78, s: 1.02 },
  { district: 'chorkor-harbour', kit: 'fishing-canoe', x: -214, z: 36.5, rot: 85, s: 0.98 },
  { district: 'korle-causeway', kit: 'fishing-canoe', x: -244, z: 41, rot: 15, s: 1 },
  { district: 'korle-causeway', kit: 'fishing-canoe', x: -246, z: 38.5, rot: 20, s: 0.95 },
  // trotro-station keke + motorbikes (outside the 7 m apron disc)
  { district: 'kaneshie', kit: 'tricycle-cargo', x: -44, z: -58, rot: 90, s: 1 },
  { district: 'kaneshie', kit: 'motorbike', x: -52, z: -58, rot: 0, s: 1 },
  // CBD hero props
  { district: 'cbd', kit: 'atm-machine', x: 40, z: -12, rot: 180, s: 1 },
  // Tema port-approach build site (the map's one dense clear zone at (282,0);
  // blockedReason-verified item by item)
  { district: 'tema-port', kit: 'site-hoarding', x: 288, z: 1, rot: 90, s: 1 },
  { district: 'tema-port', kit: 'scaffold', x: 280, z: -2, rot: 0, s: 1 },
  { district: 'tema-port', kit: 'sandcrete-mixer', x: 282, z: 4, rot: 30, s: 1 },
  { district: 'tema-port', kit: 'cement-bag-stack', x: 278, z: 3, rot: 15, s: 1 },
  { district: 'tema-port', kit: 'cement-block-stack', x: 284, z: 6, rot: -20, s: 1 },
  { district: 'tema-port', kit: 'plank-pile', x: 280, z: 7, rot: 40, s: 1 },
  { district: 'tema-port', kit: 'wheelbarrow', x: 285, z: -4, rot: 70, s: 1 },
  { district: 'tema-port', kit: 'rebar-bundle', x: 277, z: 0, rot: -10, s: 1 },
  { district: 'tema-port', kit: 'ladder', x: 283, z: -5, rot: 25, s: 1 },
  { district: 'tema-port', kit: 'traffic-cone', x: 276, z: -6, rot: 0, s: 1 },
  { district: 'tema-port', kit: 'traffic-cone', x: 288, z: -6, rot: 0, s: 1 },
  { district: 'tema-port', kit: 'generator', x: 286, z: 8, rot: 90, s: 1 },
  { district: 'makola', kit: 'tricycle-cargo', x: -18.5, z: -8.5, rot: -90, s: 1 },
];
function polesAlongH(roadId, x0, x1, z) {
  const out = [];
  for (let x = x0; x <= x1; x += 34) {
    if (blocked(x, z)) continue;
    out.push({ district: 'roadsides', kit: 'electric-pole', x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot: 0, s: 1 });
  }
  return out;
}

// ── scatter ───────────────────────────────────────────────────────────
const placements = [];
let skipped = 0;
for (const zone of ZONES) {
  const rand = rng(zone.seed);
  const [x0, z0, x1, z1] = zone.rect;
  const placed = [];
  // hash-grid for pairwise spacing
  const cell = 2.6, grid = new Map();
  const gridKey = (x, z) => `${Math.floor(x / cell)}:${Math.floor(z / cell)}`;
  const tooClose = (x, z, sp) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const [gx, gz] of grid.get(`${cx + i}:${cz + j}`) ?? []) {
        if (Math.hypot(x - gx, z - gz) < sp) return true;
      }
    }
    return false;
  };
  // weighted kit table
  const table = zone.kits.filter(([k, w]) => w > 0);
  const wsum = table.reduce((a, [, w]) => a + w, 0);
  let tries = 0;
  while (placed.length < zone.n && tries < zone.n * 60) {
    tries++;
    let pick = rand() * wsum, kit = table[0][0], opts = table[0][2];
    for (const [k, w, o] of table) { pick -= w; if (pick <= 0) { kit = k; opts = o; break; } }
    // round FIRST — the emitted coordinate must be the one we block-check
    // (r1() rounding can otherwise flip across an inflated-rect edge)
    const x = r1(x0 + rand() * (x1 - x0));
    const z = r1(z0 + rand() * (z1 - z0));
    if (blocked(x, z, { allowPlots: !!zone.allowPlots })) { skipped++; continue; }
    if (tooClose(x, z, opts.spacing)) { continue; }
    const kx = Math.floor(x / cell), kz = Math.floor(z / cell);
    const key = `${kx}:${kz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push([x, z]);
    const rot = opts.rot === 'axis' ? Math.round(rand() * 4) * 90 : Math.round(rand() * 360);
    const s = Math.round((opts.sMin + rand() * (opts.sMax - opts.sMin)) * 100) / 100;
    placed.push({ district: zone.id, kit, x, z, rot, s });
  }
  placements.push(...placed);
  if (placed.length < zone.n) console.log(`  zone ${zone.id}: ${placed.length}/${zone.n}`);
}
placements.push(...HAND);

// ── verification: re-check every emitted placement against blocklists ─
const plotAllowedZones = new Set(ZONES.filter((z) => z.allowPlots).map((z) => z.id));
let violations = 0;
for (const p of placements) {
  const ok = plotAllowedZones.has(p.district) || ['grass-clump', 'rock', 'bush', 'log', 'stump', 'boulder-cluster'].includes(p.kit);
  if (blocked(p.x, p.z, { allowPlots: ok })) {
    violations++;
    console.log('VIOLATION', JSON.stringify(p), '→', blockedReason(p.x, p.z));
  }
}
console.log(`emitted ${placements.length} placements; rejected-at-scatter: ${skipped}; violations: ${violations}`);
const byDistrict = {};
for (const p of placements) byDistrict[p.district] = (byDistrict[p.district] ?? 0) + 1;
console.log('per district:', JSON.stringify(byDistrict));

// ── emit TS ───────────────────────────────────────────────────────────
const lines = placements.map((p) => `  { d: '${p.district}', k: '${p.kit}', x: ${p.x}, z: ${p.z}, r: ${p.rot}, s: ${p.s} },`);
const ts = `/**
 * propPlacements.ts — W-009 world dressing from the user-supplied prop packs
 * (10 categories, 65 curated archetypes, 88 colorized GLBs).
 *
 * GENERATED by scripts/emit-placements.mjs — do not edit by hand; edit the
 * emitter (zones/hand lists + seeds) and re-run:
 *   node --experimental-strip-types scripts/emit-placements.mjs
 *
 * Safety invariants (enforced by the emitter, re-verified at emit time):
 *   - never on a ROADS surface (+1.6 m) — cars and walkers own the tarmac
 *   - never inside a colliders.json box (+0.6 m) — never inside buildings
 *   - never in the Daavi plot / sleep-yard frontage (e2e routes)
 *   - never on LAND_PLOTS (buy-land mechanic) except terrain scatter
 *   - never in the sea (z ≥ 44.5) or the lagoon ellipse
 * Props are dressing-only: no colliders are added (?capture=1 unwired).
 */

export interface PropPlacement {
  /** district bucket — the layer merges each bucket into one draw call */
  d: string
  /** props-kit archetype id, e.g. 'palm-tree' */
  k: string
  x: number
  z: number
  /** yaw degrees */
  r: number
  /** uniform scale */
  s: number
}

export const PROP_PLACEMENTS: PropPlacement[] = [
${lines.join('\n')}
]
`;
writeFileSync(path.join(ROOT, 'src/world/props/propPlacements.ts'), ts);
console.log('wrote src/world/props/propPlacements.ts');

function r1(n) { return Math.round(n * 10) / 10; }
