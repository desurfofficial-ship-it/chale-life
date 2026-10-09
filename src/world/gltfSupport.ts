/**
 * gltfSupport.ts — runtime decoder support for optimised GLBs (W-003).
 *
 * public/models/*.glb are compressed model files in two flavours:
 *   - `npm run assets` output (scripts/optimize-assets.mjs): meshopt
 *     geometry + KTX2/Basis textures (the Kenney road tiles), and
 *   - producer-optimised packs (W-004 vehicles): meshopt geometry + WebP
 *     textures (WebP decodes natively in the browser — no loader needed).
 * A plain GLTFLoader cannot read either flavour's geometry: the meshopt
 * decoder must be registered before load (KTX2 likewise for the KTX2
 * flavour). This module owns that wiring, once, for the whole app.
 *
 *   - MeshoptDecoder (EXT_meshopt_compression) — wasm, from three's addons
 *   - KTX2Loader (KHR_texture_basisu) — Basis Universal transcoder. The
 *     loader is left on its default transcoder path (''): three's module
 *     ships the two `new URL('…basis_transcoder.*', import.meta.url)`
 *     constants, so the bundler emits + hashes its own copy of the
 *     transcoder (three's own files, Apache-2.0) and the loader fetches
 *     exactly that copy — always version-matched to the installed three.
 *     (E-007: the hand-copied public/basis/ was removed — it shipped a
 *     second, divergent-prone 585 KB copy next to the bundler's.)
 *
 * drei's useGLTF handles meshopt out of the box and accepts an
 * `extendLoader` callback — pass `attachModelSupport` to it, or build your
 * own GLTFLoader via `createModelLoader(gl)`.
 *
 * Owned by Agent 3 (World & Art).
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { WebGLRenderer } from 'three';

let ktx2Loader: KTX2Loader | null = null;
let ktx2SupportDetected = false;

/**
 * Prefix a public/ asset path with the deploy base. EVERY runtime-fetched
 * file under public/ must go through this: hard '/…' paths resolve against
 * the origin root, which 404s wherever the app is not served from the
 * domain root (vite base '/chale-life/' in preview, the Pages project path
 * in production). E-007: '/models/…' GLBs 404ed in every built deploy —
 * the road tiles and vehicles silently never rendered (console.warn only),
 * and the pre-dedupe '/basis/' transcoder path carried the same bug.
 */
export function publicUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

/**
 * KTX2Loader singleton. `detectSupport(renderer)` must run once with a real
 * renderer so the transcoder picks compressed formats the GPU can read;
 * subsequent calls are cheap no-ops.
 */
export function getKTX2Loader(renderer: WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    // No setTranscoderPath: with the default '' path KTX2Loader fetches the
    // bundler-emitted basis_transcoder.js/.wasm (see header note).
    ktx2Loader = new KTX2Loader();
  }
  if (!ktx2SupportDetected) {
    ktx2Loader.detectSupport(renderer);
    ktx2SupportDetected = true;
  }
  return ktx2Loader;
}

/**
 * Attach meshopt + KTX2 decoders to any GLTFLoader (including the instance
 * drei's useGLTF hands to `extendLoader`).
 */
export function attachModelSupport(loader: GLTFLoader, renderer: WebGLRenderer): GLTFLoader {
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.setKTX2Loader(getKTX2Loader(renderer));
  return loader;
}

/** Build a fresh GLTFLoader with model support attached. */
export function createModelLoader(renderer: WebGLRenderer): GLTFLoader {
  return attachModelSupport(new GLTFLoader(), renderer);
}
