/**
 * Vehicle footprint tests (B-003b).
 *
 * Loads each parked-vehicle GLB in node via three.js GLTFLoader + MeshoptDecoder,
 * rotates by the spot's ry, and asserts the axis-aligned bbox matches
 * vehicleFootprint() within 0.2 m. Also covers curb orientation + stop clearance.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TROTRO_STOP,
  UTILITY_POLES,
  VEHICLE_DIMS,
  VEHICLE_SPOTS,
  vehicleFootprint,
  type VehicleModel,
} from './layout';

const TOL = 0.2; // metres

const MODEL_FILES: Record<VehicleModel, string> = {
  trotro: 'trotro_car_rapide.glb',
  okada: 'okada_motorbike.glb',
  van: 'vintage_van.glb',
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VEHICLES_DIR = path.resolve(HERE, '../../../public/models/vehicles');

/** Stub browser globals three's GLTFLoader expects when decoding textures. */
function ensureNodeGlStubs(): void {
  const g = globalThis as unknown as {
    self?: typeof globalThis;
    URL?: typeof URL;
  };
  if (!g.self) g.self = globalThis;
  // Texture loads will fail harmlessly; geometry still decodes.
  try {
    URL.createObjectURL = () => 'blob:stub';
    URL.revokeObjectURL = () => {};
  } catch {
    /* already defined / non-configurable */
  }
}

async function loadModelBBox(model: VehicleModel, ry: number): Promise<THREE.Box3> {
  ensureNodeGlStubs();
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const file = path.join(VEHICLES_DIR, MODEL_FILES[model]);
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await loader.parseAsync(ab, '');
  const root = gltf.scene.clone(true);
  root.rotation.y = ry;
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}

describe('VEHICLE_SPOTS footprints match loaded GLB bbox after rotation', () => {
  for (const spot of VEHICLE_SPOTS) {
    it(
      `${spot.model} footprint within ${TOL} m of rotated GLB AABB`,
      async () => {
        const box = await loadModelBBox(spot.model, spot.ry);
        const size = box.getSize(new THREE.Vector3());
        const fp = vehicleFootprint(spot);
        const fw = fp.x1 - fp.x0;
        const fd = fp.z1 - fp.z0;
        // GLB is at origin; footprint is world-centred — compare extents only.
        expect(
          Math.abs(fw - size.x),
          `${spot.model} width footprint ${fw.toFixed(3)} vs GLB ${size.x.toFixed(3)}`,
        ).toBeLessThanOrEqual(TOL);
        expect(
          Math.abs(fd - size.z),
          `${spot.model} depth footprint ${fd.toFixed(3)} vs GLB ${size.z.toFixed(3)}`,
        ).toBeLessThanOrEqual(TOL);
        expect((fp.x0 + fp.x1) / 2).toBeCloseTo(spot.x, 5);
        expect((fp.z0 + fp.z1) / 2).toBeCloseTo(spot.z, 5);
      },
      30_000,
    );
  }
});

describe('VEHICLE_DIMS stay within 0.2 m of loaded GLB at ry=0', () => {
  for (const model of Object.keys(MODEL_FILES) as VehicleModel[]) {
    it(`${model} dims vs GLB`, async () => {
      const box = await loadModelBBox(model, 0);
      const size = box.getSize(new THREE.Vector3());
      const d = VEHICLE_DIMS[model];
      expect(Math.abs(d.w - size.x), `${model} w`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(d.l - size.z), `${model} l`).toBeLessThanOrEqual(TOL);
    }, 30_000);
  }
});

describe('van parks parallel to north curb facing east', () => {
  it('length runs along X (east–west) and sits in the north half of the road', () => {
    const van = VEHICLE_SPOTS.find((s) => s.model === 'van')!;
    expect(van).toBeDefined();
    const fp = vehicleFootprint(van);
    const sx = fp.x1 - fp.x0;
    const sz = fp.z1 - fp.z0;
    expect(sx).toBeGreaterThan(sz);
    expect(van.z).toBeLessThan(8);
    expect(van.z).toBeGreaterThan(4.5);
    expect(Math.abs(Math.abs(van.ry) - Math.PI / 2)).toBeLessThan(0.01);
  });
});

describe('trotro at south-lane north edge, clear of stop + poles', () => {
  it('z ≈ 9.0 and footprint stays clear of roof, bench, poles (≥ 0.3 m; poles ≥ 2 m)', () => {
    const trotro = VEHICLE_SPOTS.find((s) => s.model === 'trotro')!;
    expect(trotro.z).toBeCloseTo(9.0, 1);
    const fp = vehicleFootprint(trotro);
    const CLEAR = 0.3;
    const POLE_CLEAR = 2.0;

    const roof = TROTRO_STOP.roof;
    const clearRoof =
      fp.x1 + CLEAR <= roof.x0 ||
      fp.x0 - CLEAR >= roof.x1 ||
      fp.z1 + CLEAR <= roof.z0 ||
      fp.z0 - CLEAR >= roof.z1;
    expect(clearRoof, 'trotro vs roof').toBe(true);

    const bench = TROTRO_STOP.bench;
    const clearBench =
      fp.x1 + CLEAR <= bench.x0 ||
      fp.x0 - CLEAR >= bench.x1 ||
      fp.z1 + CLEAR <= bench.z0 ||
      fp.z0 - CLEAR >= bench.z1;
    expect(clearBench, 'trotro vs bench').toBe(true);

    let minPole = Infinity;
    for (const p of UTILITY_POLES) {
      const dx = Math.max(fp.x0 - p.x, 0, p.x - fp.x1);
      const dz = Math.max(fp.z0 - p.z, 0, p.z - fp.z1);
      minPole = Math.min(minPole, Math.hypot(dx, dz));
    }
    expect(minPole, `nearest pole distance ${minPole}`).toBeGreaterThanOrEqual(POLE_CLEAR);
  });
});

describe('okada yaw is W-004 (nose to road)', () => {
  it('ry === 0', () => {
    const okada = VEHICLE_SPOTS.find((s) => s.model === 'okada')!;
    expect(okada.ry).toBe(0);
  });
});
