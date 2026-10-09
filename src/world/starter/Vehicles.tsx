/**
 * Vehicles.tsx — W-004 vehicle pack: parked trotro, okada and vintage van.
 *
 * Loads the producer-optimised GLBs (public/models/vehicles/ — meshopt
 * geometry + WebP textures) through the shared model loader (meshopt
 * decoder attached in gltfSupport.ts; three.js handles EXT_texture_webp
 * and KHR_mesh_quantisation natively for direct scene-graph rendering).
 *
 * TRADEMARK SCRUB (W-004): the shipped GLBs contain no brand names in
 * metadata (asset.extras sanitised) and no brand logos in textures (the
 * van's chrome roundel and badge ornament were painted out of the atlas).
 * Ledger: docs/assets/LICENSES.csv; credit strings: docs/assets/CREDITS.md.
 *
 * Placement comes from VEHICLE_SPOTS in layout.ts (single source of
 * truth — colliders for the same footprints live there too). The models
 * ship with "wheels on y=0, origin centred", so y stays 0 and each
 * vehicle sits on the asphalt/pavement directly.
 *
 * Draw calls: 2 (trotro) + 2 (okada) + 1 (van) = 5, per the producer
 * brief — static meshes, default frustum culling (real bounds, unlike
 * the quantised Kenney tiles in RoadTiles.tsx).
 *
 * Owned by Agent 3 (World & Art).
 */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { createModelLoader } from '../gltfSupport';
import { VEHICLE_SPOTS, type VehicleModel } from './layout';

/** Optimised GLBs under public/models/ (see docs/assets/LICENSES.csv). */
const VEHICLE_URLS: Record<VehicleModel, string> = {
  trotro: '/models/vehicles/trotro_car_rapide.glb',
  okada: '/models/vehicles/okada_motorbike.glb',
  van: '/models/vehicles/vintage_van.glb',
};

function prepareScene(scene: THREE.Object3D, name: string): THREE.Object3D {
  scene.name = name;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  scene.updateMatrixWorld(true);
  return scene;
}

export function Vehicles() {
  const gl = useThree((s) => s.gl);
  const [scenes, setScenes] = useState<Partial<Record<VehicleModel, THREE.Object3D>>>({});

  useEffect(() => {
    let cancelled = false;
    const loader = createModelLoader(gl);
    const models: VehicleModel[] = ['trotro', 'okada', 'van'];
    Promise.all(
      models.map(async (model) => {
        const gltf = await loader.loadAsync(VEHICLE_URLS[model]);
        return [model, prepareScene(gltf.scene, `vehicle-${model}`)] as const;
      })
    )
      .then((loaded) => {
        if (cancelled) return;
        setScenes(Object.fromEntries(loaded));
      })
      .catch((err) => console.warn('[world] vehicle pack failed to load:', err));
    return () => {
      cancelled = true;
    };
  }, [gl]);

  if (!scenes.trotro && !scenes.okada && !scenes.van) return null;

  return (
    <group name="vehicles">
      {VEHICLE_SPOTS.map(({ model, x, z, ry }) => {
        const scene = scenes[model];
        if (!scene) return null;
        return (
          <group key={model} name={`vehicle-${model}`} position={[x, 0, z]} rotation={[0, ry, 0]}>
            <primitive object={scene} />
          </group>
        );
      })}
    </group>
  );
}
