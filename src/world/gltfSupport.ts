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
 *   - KTX2Loader (KHR_texture_basisu) — Basis Universal transcoder served
 *     from /basis/ (files come from three's own addons, Apache-2.0)
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

/** Path (from site root) where the Basis Universal transcoder is served. */
export const BASIS_TRANSCODER_PATH = '/basis/';

let ktx2Loader: KTX2Loader | null = null;
let ktx2SupportDetected = false;

/**
 * KTX2Loader singleton. `detectSupport(renderer)` must run once with a real
 * renderer so the transcoder picks compressed formats the GPU can read;
 * subsequent calls are cheap no-ops.
 */
export function getKTX2Loader(renderer: WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH);
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
