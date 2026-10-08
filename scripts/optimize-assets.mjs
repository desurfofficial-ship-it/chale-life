#!/usr/bin/env node
/**
 * scripts/optimize-assets.mjs — W-003 asset pipeline ("npm run assets").
 *
 * Takes raw GLBs from asset-sources/ (gitignored) and writes optimised,
 * game-ready GLBs to public/models/<group>/. Raw sources never enter the
 * repo; every optimised output must get a row in docs/assets/LICENSES.csv
 * (CI enforces this — see scripts/check-models.sh).
 *
 * Per entry, the pipeline runs:
 *   1. dedup            — merge duplicate accessors/textures (@gltf-transform/cli)
 *   2. weld             — merge equivalent vertices (@gltf-transform/cli)
 *   3. normalise scale  — uniform rescale so the XZ footprint matches the
 *                         configured real-world size in METRES (the gltf-transform
 *                         CLI has no scale command, so this step uses the
 *                         @gltf-transform/core SDK; the scale is baked when
 *                         `optimize --flatten` runs next)
 *   4. optimize         — meshopt compression + textures ≤1024 px as KTX2
 *                         (@gltf-transform/cli; --simplify false so low-poly
 *                         source geometry is never decimated)
 *
 * KTX2 encoding shells out to `toktx` (KTX-Software). Resolve order:
 *   $KTX_TOKTX → `toktx` on PATH. Install: https://ktx.github.io/ or
 *   download the KTX-Tools release tarball for your platform.
 *
 * Usage:
 *   npm run assets                 # process every entry in assets.config.json
 *   node scripts/optimize-assets.mjs <path/to/in.glb>   # dry-run bounds report
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const CLI = path.join(ROOT, 'node_modules', '.bin', 'gltf-transform');
const CONFIG = path.join(SCRIPT_DIR, 'assets.config.json');

const MAX_SOURCE_MB = 50; // guardrail from the W-003 ticket: never ingest > 50 MB

// ---------------------------------------------------------------------------
// glTF SDK (hoisted devDependencies of @gltf-transform/cli)
// ---------------------------------------------------------------------------
const { NodeIO } = await import('@gltf-transform/core');
const {
  KHRTextureTransform,
  KHRMaterialsUnlit,
  KHRMaterialsEmissiveStrength,
  EXTMeshoptCompression,
  KHRTextureBasisu,
  KHRMeshQuantization,
} = await import('@gltf-transform/extensions');
const { getBounds } = await import('@gltf-transform/functions');
const { MeshoptDecoder } = await import('meshoptimizer');

const io = new NodeIO().registerExtensions([KHRTextureTransform, KHRMaterialsUnlit, KHRMaterialsEmissiveStrength]);
// verification IO: outputs carry EXT_meshopt_compression + KHR_texture_basisu.
// Note: dependency map must be the OBJECT form, and the wasm decoder must be
// awaited before registration (see EXTMeshoptCompression docs).
await MeshoptDecoder.ready;
const ioVerify = new NodeIO()
  .registerExtensions([KHRTextureTransform, KHRMaterialsUnlit, KHRMaterialsEmissiveStrength, EXTMeshoptCompression, KHRTextureBasisu, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function log(msg) {
  console.log(`[optimize-assets] ${msg}`);
}

function fail(msg) {
  console.error(`[optimize-assets] ERROR: ${msg}`);
  process.exit(1);
}

/** Locate the toktx binary (required for KTX2 texture encoding). */
function resolveToktx() {
  if (process.env.KTX_TOKTX) return process.env.KTX_TOKTX;
  try {
    return execFileSync('which', ['toktx'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** Largest XZ footprint of a document's default scene, in current units. */
function footprintXZ(document) {
  const scene = document.getRoot().getDefaultScene();
  const { min, max } = getBounds(scene);
  return { sx: max[0] - min[0], sz: max[2] - min[2], min, max };
}

/**
 * Normalise scale to metres: multiply every root node's scale so the largest
 * XZ footprint equals `sizeMetres`. Kenney city-kit tiles ship 1×1 units that
 * represent 4 m street sections, hence assets.config.json pins sizeMetres: 4.
 */
function normaliseScaleToMetres(document, sizeMetres, label) {
  const { sx, sz, min, max } = footprintXZ(document);
  const current = Math.max(sx, sz);
  if (!isFinite(current) || current <= 0) fail(`${label}: cannot measure scene bounds`);
  const factor = sizeMetres / current;
  if (Math.abs(factor - 1) > 1e-4) {
    for (const scene of document.getRoot().listScenes()) {
      for (const node of scene.listChildren()) {
        const s = node.getScale();
        node.setScale([s[0] * factor, s[1] * factor, s[2] * factor]);
      }
    }
  }
  log(
    `${label}: bbox ${sx.toFixed(3)}×${sz.toFixed(3)} units → ×${factor.toFixed(4)} → ` +
      `${(sx * factor).toFixed(3)}×${(sz * factor).toFixed(3)} m (y ${min[1].toFixed(3)}→${max[1].toFixed(3)})`
  );
  return factor;
}

function runCli(args, label) {
  try {
    execFileSync(CLI, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
    log(`  ${label} ✓`);
  } catch (e) {
    if (e.stdout) console.error(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    throw new Error(`gltf-transform ${args[0]} failed (exit ${e.status})`);
  }
}

function listGlbs(dir) {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(CLI)) fail(`@gltf-transform/cli not installed — run: npm install`);
  const toktx = resolveToktx();
  if (!toktx) {
    fail(
      'toktx not found (required for KTX2 textures).\n' +
        '  Install KTX-Software and/or set KTX_TOKTX=/path/to/toktx.\n' +
        '  https://github.com/KhronosGroup/KTX-Software/releases'
    );
  }
  log(`toktx: ${toktx}`);

  const { entries } = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(CONFIG, 'utf8')));
  if (!entries?.length) fail(`no entries in ${CONFIG}`);

  const results = [];
  for (const entry of entries) {
    const src = path.resolve(ROOT, entry.in);
    const out = path.resolve(ROOT, entry.out);
    const label = entry.out;

    if (!existsSync(src)) fail(`${label}: source missing: ${entry.in}`);
    const srcMb = statSync(src).size / (1024 * 1024);
    if (srcMb > MAX_SOURCE_MB) fail(`${label}: source is ${srcMb.toFixed(1)} MB (> ${MAX_SOURCE_MB} MB limit)`);
    if (!entry.sizeMetres || entry.sizeMetres <= 0) fail(`${label}: sizeMetres must be > 0 (real-world metres)`);

    const work = mkdtempSync(path.join(tmpdir(), 'assets-'));
    try {
      mkdirSync(path.dirname(out), { recursive: true }); // CLI won't create parents
      // 3. normalise scale to metres (SDK step, CLI has no scale command)
      const document = await io.read(src);
      normaliseScaleToMetres(document, entry.sizeMetres, label);
      const scaled = path.join(work, '0-scaled.glb');
      await io.write(scaled, document);

      // 1 + 2 + 4: dedup → weld → optimize (meshopt + KTX2 ≤1024 px)
      const deduped = path.join(work, '1-dedup.glb');
      const welded = path.join(work, '2-weld.glb');
      runCli(['dedup', scaled, deduped], 'dedup');
      runCli(['weld', deduped, welded], 'weld');
      runCli(
        [
          'optimize',
          welded,
          out,
          '--compress', 'meshopt',
          '--texture-compress', 'ktx2',
          '--texture-size', '1024',
          '--simplify', 'false', // never decimate authored low-poly geometry
        ],
        'optimize (meshopt + ktx2 ≤1024)'
      );

      // verify output: loads, is metres-normalised, report size
      const outDoc = await ioVerify.read(out);
      const b = footprintXZ(outDoc);
      const mb = statSync(out).size / (1024 * 1024);
      const ver = Math.max(b.sx, b.sz);
      if (Math.abs(ver - entry.sizeMetres) > 0.01) {
        fail(`${label}: output footprint ${ver.toFixed(3)} m ≠ target ${entry.sizeMetres} m`);
      }
      log(`  ✓ ${entry.out} — ${mb.toFixed(2)} MB, footprint ${b.sx.toFixed(2)}×${b.sz.toFixed(2)} m`);
      results.push({ out: entry.out, mb, sx: b.sx, sz: b.sz });
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  const total = results.reduce((s, r) => s + r.mb, 0);
  log(`done — ${results.length} file(s), ${total.toFixed(2)} MB total under public/models/`);
  log('remember: every output needs a docs/assets/LICENSES.csv row (CI: scripts/check-models.sh)');
}

main().catch((e) => fail(e?.stack || e?.message || String(e)));
