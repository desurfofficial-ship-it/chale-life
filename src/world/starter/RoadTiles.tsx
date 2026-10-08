/**
 * RoadTiles.tsx — W-003 asset-pipeline proof.
 *
 * Loads the optimised Kenney City Kit (Roads) GLBs (meshopt-compressed
 * geometry + KTX2 textures, produced by `npm run assets`) and renders them
 * as InstancedMeshes laid out by KENNEY_ROAD_TILES in layout.ts. One draw
 * call per geometry part per tile type — the Kenney tiles are single-mesh,
 * single-atlas, so the whole street dressing costs ~2 draw calls.
 *
 * The tiles sit ON the existing procedural road (y +0.012) as a resurfaced
 * section; the procedural road is not touched. Tiles are walkable flat
 * decals — no colliders.
 *
 * NOTE on quantised GLBs: `optimize` emits KHR_mesh_quantization +
 * EXT_meshopt_compression — raw position attributes are normalised int16
 * and the dequantisation (scale/offset) lives in the NODE transform. So we
 * must NOT bake node matrices into vertices; instead each instance matrix
 * is  placement × mesh.matrixWorld, which keeps the dequantisation intact.
 * Geometry is consumed exactly as the loader provides it (no clone, no
 * applyMatrix4) and frustum culling stays off (raw bounds are meaningless).
 *
 * Owned by Agent 3 (World & Art).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { createModelLoader } from '../gltfSupport';
import { KENNEY_ROAD_TILES, KENNEY_TILE_Y, type KenneyRoadTile } from './layout';

/** Optimised GLBs under public/models/ (see docs/assets/LICENSES.csv). */
const TILE_URLS: Record<KenneyRoadTile, string> = {
  straight: '/models/roads/road-straight-4m.glb',
  crossroad: '/models/roads/road-crossroad-4m.glb',
};

interface TilePart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Loader-side node transform (incl. quantisation de-scale) for instances. */
  matrix: THREE.Matrix4;
}

type TileParts = Record<KenneyRoadTile, TilePart[] | null>;

/**
 * Extract geometry/material parts from a loaded GLTF, keeping each mesh
 * node's world matrix. Quantised attributes stay untouched — three.js only
 * dequantises via the node matrix, which we carry into the instance matrix.
 */
function collectParts(gltf: { scene: THREE.Object3D }): TilePart[] {
  const parts: TilePart[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as unknown as { isMesh?: boolean }).isMesh && mesh.geometry) {
      if (Array.isArray(mesh.material)) {
        console.warn('[world] RoadTiles: multi-material mesh not supported, skipping', obj.name);
        return;
      }
      parts.push({
        geometry: mesh.geometry,
        material: mesh.material as THREE.Material,
        matrix: mesh.matrixWorld.clone(),
      });
    }
  });
  return parts;
}

function TilePartInstances({
  partKey,
  part,
  spots,
}: {
  partKey: string;
  part: TilePart;
  spots: { x: number; z: number; ry: number }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const place = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    spots.forEach((spot, i) => {
      euler.set(0, spot.ry, 0);
      q.setFromEuler(euler);
      pos.set(spot.x, KENNEY_TILE_Y, spot.z);
      place.compose(pos, q, one).multiply(part.matrix);
      mesh.setMatrixAt(i, place);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [part, spots]);

  return (
    <instancedMesh
      key={partKey}
      ref={ref}
      args={[part.geometry, part.material, spots.length]}
      name={partKey}
      castShadow={false}
      receiveShadow
      frustumCulled={false}
    />
  );
}

export function RoadTiles() {
  const gl = useThree((s) => s.gl);
  const [parts, setParts] = useState<TileParts>({ straight: null, crossroad: null });

  useEffect(() => {
    let cancelled = false;
    const loader = createModelLoader(gl);
    const kinds: KenneyRoadTile[] = ['straight', 'crossroad'];
    Promise.all(
      kinds.map(async (kind) => {
        const gltf = await loader.loadAsync(TILE_URLS[kind]);
        return [kind, collectParts(gltf)] as const;
      })
    )
      .then((loaded) => {
        if (cancelled) return;
        setParts({
          straight: Object.fromEntries(loaded).straight ?? null,
          crossroad: Object.fromEntries(loaded).crossroad ?? null,
        });
      })
      .catch((err) => console.warn('[world] Kenney road tiles failed to load:', err));
    return () => {
      cancelled = true;
    };
  }, [gl]);

  const groups = useMemo(() => {
    return (['straight', 'crossroad'] as const)
      .map((kind) => ({
        kind,
        parts: parts[kind] ?? [],
        spots: KENNEY_ROAD_TILES.filter((s) => s.tile === kind),
      }))
      .filter((g) => g.parts.length > 0);
  }, [parts]);

  if (groups.length === 0) return null;

  return (
    <group name="kenney-road-tiles">
      {groups.map((g) =>
        g.parts.map((part, i) => (
          <TilePartInstances
            key={`${g.kind}-${i}`}
            partKey={`kenney-${g.kind}-part${i}`}
            part={part}
            spots={g.spots}
          />
        ))
      )}
    </group>
  );
}
