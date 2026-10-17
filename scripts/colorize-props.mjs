#!/usr/bin/env node
/**
 * W-009 colorize-props.mjs — the user-supplied prop packs ship 100%
 * untextured: every GLB is one merged primitive with a single gray
 * material ("LowPolyKit", baseColor 0.8/0.8/0.8, no COLOR_0, empty
 * "sheets/" folders). Shipped as-is the whole map would render as flat
 * gray plastic.
 *
 * This pipeline bakes color INTO the geometry so the runtime needs no
 * textures and can merge/instance freely:
 *   1. read each curated source GLB (asset-sources/accra-props/)
 *   2. expand to non-indexed, compute a flat per-face normal
 *   3. per FACE (triangle): centroid height / normal / azimuth / stable
 *      hash → per-archetype palette rule → color written to all 3 corners
 *   4. write COLOR_0 (VEC3), overwrite NORMAL (flat), keep POSITION
 *   5. emit uncompressed GLB to a temp dir, then run the repo-blessed
 *      `gltf-transform optimize` (meshopt, no simplify) into
 *      public/models/props/<category>/
 *
 * Deterministic: same input → same colors (stable hash from face position).
 * Run from anywhere: node colorize-props.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-sources', 'accra-props');
const OUT = path.join(ROOT, 'public', 'models', 'props');
const CLI = path.join(ROOT, 'node_modules', '.bin', 'gltf-transform');

// ── palettes (harmonised with the world: InstancedNature greens/browns,
//    mapTextures laterite/sand/zinc, Ghana-market accent colors) ──────
const G = ['#3e8f4a', '#57a85f', '#2f7a3e', '#4da058'];
const GL = ['#6fb56b', '#7fbf72', '#5aa85a'];
const WOOD = '#8a6a44', WOOD_D = '#6e4a2e', WOOD_L = '#a07845';
const CONC = '#b8b2a6', CONC_D = '#a8a296';
const METAL_D = '#3a3f45', METAL = '#4a5058', STEEL = '#c0c4c8', STEEL_D = '#8a8f94';
const WHITE = '#f4f1ea';
const RED = '#ce1126', ORANGE = '#e08a3c', ORANGE_D = '#e0641e';
const BLUE = '#2e7fa8', TEAL = '#3aa08f', NAVY = '#1a2a35';
const YELLOW = '#e3c14e', YELLOW_W = '#e3a92e';
const RUBBER = '#2a2d31';
const LATERITE = ['#b5563d', '#c26a44', '#a04a32'];
const ROCK = ['#8a8578', '#9a9284', '#7e7a6e'];
const SAND = '#e0d0a0', BURLAP = '#d9c894';

/** per-archetype rules: [pred(ctx), colorer(ctx)] — FIRST match wins.
 *  ctx: { h: 0..1 centroid height, ny: face-normal y, az: 0..1 azimuth,
 *         k: 0..1 stable per-face hash, v: variant index } */
const RULES = {
  // ── plants ──────────────────────────────────────────────────────────
  'palm-tree': [[c => c.h >= 0.55, P(G)], [() => true, S(WOOD)]],
  'banana-plant': [[c => c.h >= 0.18, P(GL.concat(G))], [() => true, S('#7fae5e')]],
  'plantain-tree': [[c => c.h >= 0.2, P(G)], [() => true, S('#6e9e4e')]],
  'broadleaf-tree': [[c => c.h >= 0.42, P(G)], [() => true, S('#7a5230')]],
  'bush': [[() => true, P(G)]],
  'grass-clump': [[() => true, P(GL)]],
  'hedge-block': [[c => c.ny > 0.5, S('#5aa85a')], [() => true, P(G)]],
  'flower-bed': [[c => c.h < 0.22, S(WOOD_D)], [c => c.ny > 0.5, P(['#ce1126', '#e3c14e', '#e08a3c', '#d97b8f', '#f4f1ea'])], [() => true, S('#4f9e4f')]],
  'potted-plant': [[c => c.h < 0.32, S('#a05a35')], [() => true, P(GL)]],
  // ── terrain ─────────────────────────────────────────────────────────
  'rock': [[() => true, P(ROCK)]],
  'boulder-cluster': [[() => true, P(ROCK)]],
  'laterite-chunk': [[() => true, P(LATERITE)]],
  'sand-pile': [[() => true, S(SAND)]],
  'log': [[c => c.ny > 0.5, S('#c4a878')], [() => true, S('#7a5230')]],
  'stump': [[c => c.ny > 0.5, S('#c4a878')], [() => true, S(WOOD_D)]],
  // ── containers ──────────────────────────────────────────────────────
  'barrel': [[c => c.ny > 0.5, S('#5a94b8')], [c => rib(c.h, 0.10) || rib(c.h, 0.86), C(0.72)], [() => true, VP(['#2e7fa8', '#ce1126'])]],
  'bucket': [[() => true, VP(['#e08a3c', '#2e7fa8', '#4f9e4f'])]],
  'cardboard-box': [[c => c.ny > 0.5, S('#d4b06a')], [() => true, S('#c8a05a')]],
  'cooler-box': [[c => c.h >= 0.55, S(BLUE)], [() => true, S(WHITE)]],
  'gas-cylinder': [[c => c.h >= 0.78, S(METAL_D)], [() => true, S(ORANGE_D)]],
  'jerrycan': [[() => true, VP(['#e3c14e', '#4f9e4f'])]],
  'plastic-chair-stack': [[() => true, VP(['#ce1126', '#2e7fa8', '#e08a3c', '#4f9e4f'])]],
  'polytank': [[c => c.ny > 0.5, S('#3a8ab8')], [() => true, P(['#2e7fa8', '#245f80'])]],
  'sack-stack': [[c => c.h >= 0.75, S('#c4b080')], [() => true, S(BURLAP)]],
  'storage-bin': [[() => true, VP(['#2e7fa8', '#4f9e4f'])]],
  // ── construction ────────────────────────────────────────────────────
  'cement-bag-stack': [[c => c.ny > 0.5, S('#d2caba')], [() => true, P(['#c8c0ae', '#bcb4a0'])]],
  'cement-block-stack': [[() => true, P([CONC, CONC_D])]],
  'ladder': [[() => true, S(WOOD_L)]],
  'plank-pile': [[() => true, P([WOOD_L, '#8a6a44'])]],
  'rebar-bundle': [[() => true, P(['#8a5a3a', '#6e4a30'])]],
  'sandcrete-mixer': [[c => c.h < 0.18, S(METAL_D)], [c => c.ny > 0.5, S(STEEL)], [() => true, S(ORANGE)]],
  'scaffold': [[c => bandIn(c.h, 0.26, 0.34) || bandIn(c.h, 0.56, 0.64) || bandIn(c.h, 0.86, 0.94), S(WOOD_L)], [() => true, S(METAL)]],
  'site-hoarding': [[c => rib(c.h, 0.06), C(0.8)], [() => true, S('#c8c0ae')]],
  'traffic-cone': [[c => c.h > 0.48 && c.h < 0.66, S(WHITE)], [() => true, S(ORANGE_D)]],
  'wheelbarrow': [[c => c.h >= 0.35, S('#4f9e4f')], [() => true, S(METAL_D)]],
  // ── signage ─────────────────────────────────────────────────────────
  'a-frame-sign': [[c => c.h < 0.06, S(METAL_D)], [() => true, S(WHITE)]],
  'banner-pole': [[c => c.h >= 0.5, P([RED, YELLOW])], [() => true, S(STEEL_D)]],
  'billboard': [[c => c.h < 0.26, S(METAL)], [c => c.h < 0.33, S(RED)], [() => true, S(WHITE)]],
  'flag-pole': [[c => c.h >= 0.8, S(RED)], [() => true, S(STEEL)]],
  'neon-box-sign': [[c => c.h < 0.15, S(METAL_D)], [c => Math.abs(c.ny) < 0.55, P(['#ff5f8f', '#45e0c0', '#ffd24e'])], [() => true, S(NAVY)]],
  'notice-board': [[c => c.h < 0.12 || c.h > 0.78, S(WOOD)], [() => true, P(['#c8b89a', WHITE, YELLOW])]],
  'price-board': [[c => c.h < 0.1, S(WOOD)], [() => true, S(WHITE)]],
  'road-sign': [[c => c.h < 0.55, S('#7e8a8e')], [() => true, P([BLUE, WHITE])]],
  'street-name-sign': [[c => c.h < 0.6, S('#7e8a8e')], [() => true, S(BLUE)]],
  // ── transport ───────────────────────────────────────────────────────
  'bicycle': [[c => c.h < 0.18, S(RUBBER)], [() => true, VP(['#ce1126', '#2e7fa8'])]],
  'motorbike': [[c => c.h < 0.15, S(RUBBER)], [() => true, VP(['#ce1126', YELLOW])]],
  'hand-cart': [[c => c.h < 0.3, S(METAL_D)], [() => true, S(WOOD_L)]],
  'push-truck': [[c => c.h < 0.3, S(METAL_D)], [() => true, P([WOOD_L, TEAL])]],
  'scooter': [[c => c.h < 0.15, S(RUBBER)], [() => true, VP(['#3aa08f', '#ce1126'])]],
  'tricycle-cargo': [[c => c.h < 0.18, S(RUBBER)], [c => c.h > 0.7 && c.h < 0.85, S(NAVY)], [() => true, S(YELLOW)]],
  'wheel-tyre-stack': [[() => true, P([RUBBER, '#35383d'])]],
  'baby-stroller': [[c => c.h < 0.25, S(METAL_D)], [() => true, VP(['#ce1126', '#2e7fa8'])]],
  // ── civic ───────────────────────────────────────────────────────────
  'atm-machine': [[c => c.h > 0.75, S('#1a2a35')], [c => c.h < 0.12, S(METAL_D)], [() => true, S(BLUE)]],
  'notice-kiosk': [[c => c.h > 0.8, S(RED)], [c => c.h < 0.1, S(METAL_D)], [() => true, P(['#c8b89a', WHITE])]],
  'security-booth': [[c => c.h > 0.76, S('#9aa5a8')], [c => c.h < 0.08, S(METAL_D)], [() => true, S('#e8e0cc')]],
  'ticket-booth': [[c => c.h > 0.72 && c.h < 0.86, S(RED)], [() => true, S(YELLOW)]],
  // ── leisure ─────────────────────────────────────────────────────────
  'basketball-hoop': [[c => c.h > 0.82, S(WHITE)], [c => c.h > 0.74, S(ORANGE_D)], [() => true, S('#7e8a8e')]],
  'draughts-table': [[c => c.h > 0.55 && c.h < 0.75, S('#2e7fa8')], [c => c.h >= 0.75, S(WOOD_L)], [() => true, S(WOOD_D)]],
  'drum-set': [[c => c.h < 0.15, S(METAL_D)], [() => true, P(['#a05a35', WHITE])]],
  'football-goal': [[() => true, S(WHITE)]],
  'ludo-table': [[c => c.h > 0.55 && c.h < 0.8, AZ([RED, BLUE, YELLOW, '#4f9e4f'])], [c => c.h >= 0.8, S(WOOD_L)], [() => true, S(WOOD_D)]],
  'swing-set': [[c => c.h > 0.32 && c.h < 0.44, S(ORANGE)], [() => true, S(BLUE)]],
  'table-tennis-table': [[c => c.h > 0.6, S(BLUE)], [() => true, S(METAL_D)]],
  // ── coast ───────────────────────────────────────────────────────────
  'fishing-canoe': [[c => c.h < 0.3, VP(['#4f9e4f', '#2e7fa8'])], [c => c.h < 0.42, S(YELLOW)], [() => true, S('#8a5a3b')]],
  'fish-smoker': [[c => c.h > 0.6, S('#8a4a2e')], [() => true, S(METAL_D)]],
  'beach-chair': [[() => true, P([BLUE, WHITE, RED])]],
  'beach-umbrella': [[c => c.h < 0.25, S(STEEL_D)], [c => c.ny > 0.5, S(RED)], [() => true, AZ([RED, WHITE, YELLOW, WHITE])]],
  'buoy': [[c => Math.floor(c.h * 4) % 2 === 1, S(WHITE)], [() => true, S(ORANGE_D)]],
  'fishing-net-pile': [[() => true, P([BURLAP, '#c4b080', YELLOW])]],
  'outboard-motor': [[c => c.h > 0.5, S(NAVY)], [() => true, S(METAL)]],
  'jetty-post': [[c => c.h > 0.72, S('#54381f')], [() => true, S(WOOD_D)]],
  'lifeguard-tower': [[c => c.h > 0.7, S(RED)], [c => c.h < 0.2, S(WOOD)], [() => true, S(WHITE)]],
  // ── utility ─────────────────────────────────────────────────────────
  'electric-pole': [[c => c.h > 0.86, S(WOOD_D)], [() => true, S(WOOD)]],
  'generator': [[c => c.h < 0.12, S(METAL_D)], [() => true, S(YELLOW)]],
  'overhead-tank': [[c => c.h < 0.55, S(CONC_D)], [() => true, S(BLUE)]],
  'satellite-dish': [[c => c.h < 0.25, S(METAL)], [() => true, P(['#d9d5cc', '#c8c4b8'])]],
  'solar-panel': [[c => c.h > 0.5, S('#1a2a5e')], [() => true, S(STEEL)]],
  'transformer': [[c => c.ny > 0.5, S(CONC)], [() => true, S(METAL)]],
  'water-pump': [[c => c.h > 0.5, S(BLUE)], [() => true, S(YELLOW)]],
};

// ── colorer helpers ───────────────────────────────────────────────────
function S(hex) { return () => hex; } // solid
function P(list) { return (c) => list[Math.floor(c.k * list.length) % list.length]; } // hash pick
function VP(list) { return (c) => list[c.v % list.length]; } // per-variant pick
function AZ(list) { return (c) => list[Math.floor(c.az * list.length) % list.length]; } // azimuth stripes
/** rib pattern: true when the face sits inside the rib band */
function rib(h, at) { return Math.abs(h - at) < 0.05; }
function bandIn(h, lo, hi) { return h >= lo && h < hi; }
/** darken/lighten a hex by factor (for rib shading) */
function C(f) {
  return (c) => {
    const base = VP(['#2e7fa8', '#ce1126'])(c);
    return shade(base, f);
  };
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
/** stable pseudo-random from a 3D point (same trick as GLSL studio hashes) */
function hash3(x, y, z) {
  const d = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return d - Math.floor(d);
}

// ── gltf-transform (repo devDependencies) ─────────────────────────────
const { NodeIO } = await import(path.join(ROOT, 'node_modules', '@gltf-transform', 'core', 'dist', 'index.cjs'));
const { EXTMeshoptCompression, KHRMeshQuantization } = await import(path.join(ROOT, 'node_modules', '@gltf-transform', 'extensions', 'dist', 'index.cjs'));
const { MeshoptDecoder } = await import(path.join(ROOT, 'node_modules', 'meshoptimizer', 'meshopt_decoder.mjs'));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

// ── dequantize: bake node transforms into plain float32 data ────────────
// Sources ship KHR_mesh_quantization (normalized Int16/Int8 accessors + a
// node dequantization matrix). gltf-transform keeps that layout verbatim
// and ext.dispose() below only drops the DECLARATION — leaving quantized
// arrays and scale matrices in place. colorizePrim would then read RAW
// Int16 values (±32767) as if they were metres, and the CLI optimize pass
// double-quantizes on top → GLBs whose loader-side decode lands 4 orders
// of magnitude off (km-scale props, smeared geometry, dead frustum
// culling). Fix: immediately after read, decode every POSITION/NORMAL
// through its node's world matrix into plain float32 and reset node
// transforms to identity — the rest of the pipeline (palette rules keyed
// on real height fractions, meshopt re-compression) then runs in real
// metres and stays self-consistent.
function isIdentityMat4(m) {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 0
    && m[4] === 0 && m[5] === 1 && m[6] === 0 && m[7] === 0
    && m[8] === 0 && m[9] === 0 && m[10] === 1 && m[11] === 0
    && m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1;
}

function dequantizeAccessor(doc, acc, m, identity, isNormal) {
  const array = acc.getArray();
  const n = array.length;
  if (acc.getComponentType() === 5126 /* FLOAT */ && identity) return acc; // already plain
  const ct = acc.getComponentType();
  const div = !acc.getNormalized() ? 1
    : ct === 5120 ? 127.0   // BYTE
    : ct === 5121 ? 255.0   // UNSIGNED_BYTE
    : ct === 5122 ? 32767.0 // SHORT
    : 65535.0;              // UNSIGNED_SHORT
  const out = new Float32Array(n);
  // inverse-transpose of the upper-left 3×3, for normal vectors
  let it = null;
  if (isNormal && !identity) {
    const a00 = m[0], a01 = m[4], a02 = m[8];
    const a10 = m[1], a11 = m[5], a12 = m[9];
    const a20 = m[2], a21 = m[6], a22 = m[10];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    const det = a00 * b01 + a01 * b11 + a02 * b21 || 1;
    const id = 1 / det;
    // inv(A)^T rows (column-major input)
    it = [
      [b01 * id, -a01 * a22 * id + a02 * a21 * id, a01 * a12 * id - a02 * a11 * id],
      [-a12 * b21 * id, a00 * a22 * id - a02 * a20 * id, -a00 * a12 * id + a02 * a10 * id],
      [a11 * b21 * id, -a00 * b11 * id + a01 * b21 * id, a00 * b01 * id - a01 * b11 * id],
    ];
  }
  for (let i = 0; i < n; i += 3) {
    const x = array[i] / div, y = array[i + 1] / div, z = array[i + 2] / div;
    if (identity) {
      out[i] = x; out[i + 1] = y; out[i + 2] = z;
    } else if (isNormal) {
      let nx = it[0][0] * x + it[1][0] * y + it[2][0] * z;
      let ny = it[0][1] * x + it[1][1] * y + it[2][1] * z;
      let nz = it[0][2] * x + it[1][2] * y + it[2][2] * z;
      const l = Math.hypot(nx, ny, nz) || 1;
      out[i] = nx / l; out[i + 1] = ny / l; out[i + 2] = nz / l;
    } else {
      out[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
  }
  return doc.createAccessor('')
    .setType(acc.getType())
    .setArray(out)
    .setBuffer(acc.getBuffer());
}

function dequantizeDoc(doc) {
  const root = doc.getRoot();
  const useCount = new Map();
  for (const node of root.listNodes()) {
    const m = node.getMesh();
    if (m) useCount.set(m, (useCount.get(m) ?? 0) + 1);
  }
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    if (useCount.get(mesh) > 1) node.setMesh(mesh.clone()); // bake per-node
    const m = node.getWorldMatrix();
    const identity = isIdentityMat4(m);
    for (const prim of node.getMesh().listPrimitives()) {
      for (const semantic of ['POSITION', 'NORMAL']) {
        const acc = prim.getAttribute(semantic);
        if (!acc) continue;
        prim.setAttribute(semantic, dequantizeAccessor(doc, acc, m, identity, semantic === 'NORMAL'));
      }
    }
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
}

const tmp = mkdtempSync(path.join(tmpdir(), 'props-color-'));
let done = 0;
for (const pack of readdirSync(SRC)) {
  const packDir = path.join(SRC, pack);
  if (!existsSync(OUT + '/' + pack)) mkdirSync(path.join(OUT, pack), { recursive: true });
  for (const f of readdirSync(packDir).filter((x) => x.endsWith('.glb')).sort()) {
    const arch = f.replace(/-\d+\.glb$/, '');
    const v = parseInt(f.match(/-(\d+)\.glb$/)?.[1] ?? '0', 10);
    const rules = RULES[arch];
    if (!rules) { console.error(`NO RULES for archetype ${arch} (${f}) — skipped`); continue; }
    const doc = await io.read(path.join(packDir, f));
    // sources arrive meshopt+quantization compressed; our rewritten
    // attributes are plain floats, so drop the extensions — the CLI
    // optimize pass below re-applies meshopt compression.
    for (const ext of doc.getRoot().listExtensionsUsed()) ext.dispose();
    dequantizeDoc(doc); // quantized sources → plain float32 metres (see note above)
    const root = doc.getRoot();
    let touched = 0;
    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        colorizePrim(doc, prim, rules, v);
        touched++;
      }
    }
    if (touched === 0) { console.error(`NO PRIMS in ${f}`); continue; }
    // material: vertexColors on, gray base replaced by white multiplier
    for (const mat of root.listMaterials()) {
      mat.setBaseColorFactor([1, 1, 1, 1]);
    }
    const tmpGlb = path.join(tmp, f);
    await io.write(tmpGlb, doc);
    execFileSync(CLI, ['optimize', tmpGlb, path.join(OUT, pack, f), '--compress', 'meshopt', '--simplify', 'false', '--texture-compress', 'false'], { stdio: 'pipe' });
    done++;
  }
}
console.log(`colorized ${done} GLBs → ${OUT}`);
rmSync(tmp, { recursive: true, force: true });

// ── the colorizer core ────────────────────────────────────────────────
function colorizePrim(doc, prim, rules, v) {
  const posAttr = prim.getAttribute('POSITION');
  const idx = prim.getIndices();
  const pos = posAttr.getArray();
  const vCount = idx ? idx.getCount() : posAttr.getCount();
  // expand to non-indexed triangles
  const tri = vCount / 3;
  const P3 = new Float32Array(vCount * 3);
  for (let i = 0; i < vCount; i++) {
    const vi = idx ? idx.getScalar(i) : i;
    P3[i * 3] = pos[vi * 3]; P3[i * 3 + 1] = pos[vi * 3 + 1]; P3[i * 3 + 2] = pos[vi * 3 + 2];
  }
  // bbox height for normalized h
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < vCount; i++) { const y = P3[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const H = Math.max(maxY - minY, 1e-5);
  // per-face color + flat normal
  const COL = new Float32Array(vCount * 3);
  const NRM = new Float32Array(vCount * 3);
  const out = [0, 0, 0];
  for (let t = 0; t < tri; t++) {
    const o = t * 9;
    const ax = P3[o], ay = P3[o + 1], az = P3[o + 2];
    const bx = P3[o + 3], by = P3[o + 4], bz = P3[o + 5];
    const cx = P3[o + 6], cy = P3[o + 7], cz = P3[o + 8];
    // face normal
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const wx = cx - ax, wy = cy - ay, wz = cz - az;
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    for (let k = 0; k < 3; k++) { NRM[o + k * 3] = nx; NRM[o + k * 3 + 1] = ny; NRM[o + k * 3 + 2] = nz; }
    // ctx
    const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mz = (az + bz + cz) / 3;
    const h = (my - minY) / H;
    const k = hash3(Math.round(mx * 100) / 100, Math.round(my * 100) / 100, Math.round(mz * 100) / 100);
    const azFrac = (Math.atan2(mz, mx) / (Math.PI * 2) + 1) % 1;
    const ctx = { h, ny, az: azFrac, k, v };
    let hex = WHITE;
    for (const [pred, colorer] of rules) {
      if (pred(ctx)) { hex = colorer(ctx); break; }
    }
    hexToRgb(hex, out);
    // ±5% lightness jitter for low-poly richness
    const j = 1 + (hash3(mx * 3.1, my * 2.7, mz * 4.3) - 0.5) * 0.1;
    const r = Math.min(1, out[0] * j), g = Math.min(1, out[1] * j), b = Math.min(1, out[2] * j);
    for (let k2 = 0; k2 < 3; k2++) {
      COL[o + k2 * 3] = r; COL[o + k2 * 3 + 1] = g; COL[o + k2 * 3 + 2] = b;
    }
  }
  // write accessors (non-indexed) — reuse the doc's existing single buffer
  const buffer = doc.getRoot().listBuffers()[0];
  prim.setIndices(null);
  const mkAcc = (arr, type) => doc.createAccessor('')
    .setType(type)
    .setArray(arr)
    .setBuffer(buffer);
  prim.setAttribute('POSITION', mkAcc(P3, 'VEC3'));
  prim.setAttribute('NORMAL', mkAcc(NRM, 'VEC3'));
  prim.setAttribute('COLOR_0', mkAcc(COL, 'VEC3'));
  // drop UV if present (no textures; avoids unused attribute in output)
  const uv = prim.getAttribute('TEXCOORD_0');
  if (uv) prim.setAttribute('TEXCOORD_0', null);
}

function hexToRgb(hex, out) {
  const n = parseInt(hex.slice(1), 16);
  out[0] = ((n >> 16) & 255) / 255;
  out[1] = ((n >> 8) & 255) / 255;
  out[2] = (n & 255) / 255;
}
