'use client';

/**
 * Tycoon furniture — prefer catalogue modelPath GLBs (shared with B-002 /
 * office packs); fall back to coloured boxes when no model exists (fuel pump,
 * canopy). One InstancedMesh batch per furniture id (or per GLB mesh part).
 *
 * Does NOT invent a second renderer: paths come from src/data/furniture.ts
 * and loading uses the same drei useGLTF + meshopt path as offices.
 */
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import { findFurnitureById, furnitureSizeMeters } from '@/data/furniture';
import { publicUrl } from '../gltfSupport';
import type { TycoonBusinessView } from './types';

const FURN_COLOR: Record<string, string> = {
  biz_counter: '#7a5a3a',
  biz_bench: '#6d4f33',
  biz_stool: '#8b6914',
  biz_cooker: '#3f4348',
  biz_shelf: '#efe3c2',
  biz_umbrella: '#c4a035',
  biz_display: '#8fc7dd',
  biz_chair: '#a03c2e',
  biz_barber_chair: '#2d5a3d',
  biz_mirror: '#b8c4cc',
  biz_salon_chair: '#a03c2e',
  biz_fridge: '#d8dce0',
  biz_fuel_pump: '#c4a035',
  biz_canopy: '#2d5a3d',
};

const DEFAULT_COLOR = '#8a7a60';

function furnSize(id: string): [number, number, number] {
  const fromCat = furnitureSizeMeters(id);
  if (fromCat[0] !== 0.5 || fromCat[2] !== 0.5) {
    const h =
      id.includes('mirror') ? 1.0 :
      id.includes('shelf') || id.includes('display') ? 1.4 :
      id.includes('fridge') ? 1.5 :
      id.includes('counter') ? 0.9 :
      id.includes('cooker') ? 0.7 :
      id.includes('umbrella') || id.includes('canopy') ? 1.6 :
      id.includes('pump') ? 1.4 :
      0.55;
    return [fromCat[0], h, fromCat[2]];
  }
  if (id.includes('counter')) return [1.4, 0.9, 0.55];
  if (id.includes('bench')) return [1.2, 0.45, 0.4];
  if (id.includes('stool') || id.includes('chair')) return [0.4, 0.55, 0.4];
  if (id.includes('cooker')) return [0.7, 0.7, 0.7];
  if (id.includes('shelf') || id.includes('display')) return [0.9, 1.4, 0.35];
  if (id.includes('fridge')) return [0.7, 1.5, 0.7];
  if (id.includes('fuel')) return [0.5, 1.4, 0.5];
  if (id.includes('canopy')) return [2.2, 0.12, 1.6];
  if (id.includes('umbrella')) return [0.15, 1.6, 0.15];
  if (id.includes('mirror')) return [0.08, 1.0, 0.7];
  return fromCat;
}

type ItemPose = { x: number; y: number; z: number; rot: number };

function collectGroups(businesses: readonly TycoonBusinessView[]) {
  const byPlot = new Map<string, (typeof LAND_PLOTS)[number]>();
  for (const p of LAND_PLOTS) if (p.id) byPlot.set(p.id, p);

  const g = new Map<string, ItemPose[]>();
  for (const b of businesses) {
    const plot = byPlot.get(b.plotId);
    if (!plot) continue;
    const originX = plot.x - plot.w / 2;
    const originZ = plot.z - plot.d / 2;
    const y0 = plot.y ?? 0;
    for (const p of b.layout) {
      const list = g.get(p.furnitureId) ?? [];
      list.push({
        x: originX + p.tx + 0.5,
        y: y0,
        z: originZ + p.tz + 0.5,
        rot: (p.rot * Math.PI) / 180,
      });
      g.set(p.furnitureId, list);
    }
  }
  return g;
}

export function InstancedFurniture({ businesses }: { businesses: readonly TycoonBusinessView[] }) {
  const groups = useMemo(() => collectGroups(businesses), [businesses]);

  return (
    <group name="tycoon-furniture">
      {[...groups.entries()].map(([fid, items]) => {
        const path = findFurnitureById(fid)?.modelPath;
        if (path) {
          return (
            <ModelErrorBoundary key={fid} fallback={<BoxBatch furnitureId={fid} items={items} />}>
              <Suspense fallback={<BoxBatch furnitureId={fid} items={items} />}>
                <GlbBatch furnitureId={fid} modelPath={path} items={items} />
              </Suspense>
            </ModelErrorBoundary>
          );
        }
        return <BoxBatch key={fid} furnitureId={fid} items={items} />;
      })}
    </group>
  );
}

function BoxBatch({ furnitureId, items }: { furnitureId: string; items: ItemPose[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [sx, sy, sz] = furnSize(furnitureId);
  const color = FURN_COLOR[furnitureId] ?? DEFAULT_COLOR;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y + sy / 2, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = items.length;
  }, [items, sy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </instancedMesh>
  );
}

/** Bake meshopt/quantized GLB children to float geometries (same as office). */
type Baked = { geometry: THREE.BufferGeometry; material: THREE.Material };
const bakedCache = new Map<string, Baked[]>();

function toFloat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'color') continue;
    const a = g.getAttribute(name) as THREE.BufferAttribute;
    const n = a.count;
    const size = a.itemSize;
    const arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++) {
      arr[i * size] = a.getX(i);
      if (size > 1) arr[i * size + 1] = a.getY(i);
      if (size > 2) arr[i * size + 2] = a.getZ(i);
      if (size > 3) arr[i * size + 3] = a.getW(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  if (g.index) out.setIndex(g.index.clone());
  return out;
}

let sharedMat: THREE.MeshStandardMaterial | null = null;
function propMaterial(): THREE.MeshStandardMaterial {
  if (!sharedMat) {
    sharedMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.85,
      metalness: 0,
      flatShading: true,
    });
  }
  return sharedMat;
}

function bake(url: string, scene: THREE.Object3D): Baked[] {
  const hit = bakedCache.get(url);
  if (hit) return hit;
  const out: Baked[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = toFloat(mesh.geometry);
    g.applyMatrix4(mesh.matrixWorld);
    g.computeVertexNormals();
    out.push({ geometry: g, material: propMaterial() });
  });
  bakedCache.set(url, out);
  return out;
}

function GlbBatch({
  furnitureId,
  modelPath,
  items,
}: {
  furnitureId: string;
  modelPath: string;
  items: ItemPose[];
}) {
  const url = publicUrl(modelPath);
  const gltf = useGLTF(url, false, true);
  const baked = useMemo(() => bake(url, gltf.scene), [url, gltf.scene]);
  void furnitureId;

  return (
    <>
      {baked.map((b, j) => (
        <GlbPartInstances key={j} baked={b} items={items} />
      ))}
    </>
  );
}

function GlbPartInstances({ baked, items }: { baked: Baked; items: ItemPose[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(0, it.rot, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[baked.geometry, baked.material, items.length]} castShadow receiveShadow />
  );
}

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(err: unknown): void {
    console.warn('[tycoon] furniture GLB failed; box stand-in', err);
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
