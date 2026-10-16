'use client';
/**
 * O-002 — Instanced low-poly GLB furniture for one office floor.
 *
 * Loads each model file once with drei's useGLTF (meshopt decoder on, the
 * same loader path PlayerCharacter uses; drei caches per URL), bakes the
 * file's node transforms into one geometry per mesh, and draws ONE
 * InstancedMesh per model file per floor. Every prop uses the single
 * vertex-coloured LowPolyKit material, so a floor of ~40 props costs one
 * draw call per distinct model (typically 6–10).
 *
 * While the files stream in (or if one fails) the box stand-ins render
 * instead, so the cutaway never shows an empty room or crashes the canvas.
 */
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { publicUrl } from '../gltfSupport';
import { placementBox, type Part, type Placement } from './officeFurniture';

interface Baked {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

const bakedCache = new Map<string, Baked[]>();

/**
 * One shared material for every office prop: white base × vertex colour
 * (LowPolyKit look), flat shaded. Sharing it keeps one shader program.
 */
let sharedMat: THREE.MeshStandardMaterial | null = null;
function propMaterial(): THREE.MeshStandardMaterial {
  if (!sharedMat) {
    sharedMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
    sharedMat.name = 'OfficeProp';
  }
  return sharedMat;
}

/**
 * Meshopt GLBs ship KHR_mesh_quantization (normalised int16 positions,
 * int8 normals, uint8/16 colours) with the dequantising scale on the node.
 * Baking the node transform into int storage would overflow, so expand
 * every attribute to plain float32 first.
 */
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
  if (g.index) out.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array as ArrayLike<number>), 1));
  return out;
}

/** Flatten a loaded GLB scene into (geometry, material) pairs in model space. */
function bake(url: string, scene: THREE.Object3D): Baked[] {
  const hit = bakedCache.get(url);
  if (hit) return hit;
  const out: Baked[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = toFloat(m.geometry);
    g.applyMatrix4(m.matrixWorld);
    if (!g.getAttribute('color')) {
      // no vertex colours in this file: neutral light grey so it still reads
      const c = new Float32Array(g.getAttribute('position').count * 3).fill(0.82);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    g.computeBoundingSphere();
    out.push({ geometry: g, material: propMaterial() });
  });
  bakedCache.set(url, out);
  return out;
}

function groupByFile(models: readonly Placement[]): Map<string, Placement[]> {
  const by = new Map<string, Placement[]>();
  for (const p of models) {
    const list = by.get(p.model.file);
    if (list) list.push(p);
    else by.set(p.model.file, [p]);
  }
  return by;
}

const FLOOR_Y = 0.1; // top of the floor slab in the cutaway

function ModelInstances({ baked, items }: { baked: Baked; items: readonly Placement[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((p, i) => {
      o.position.set(p.x, FLOOR_Y, p.z);
      o.rotation.set(0, p.yaw, 0);
      o.scale.set(p.sx, p.sy, p.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[baked.geometry, baked.material, items.length]} castShadow receiveShadow />;
}

function LoadedModels({ models }: { models: readonly Placement[] }) {
  const byFile = useMemo(() => groupByFile(models), [models]);
  const files = useMemo(() => [...byFile.keys()], [byFile]);
  const urls = useMemo(() => files.map((f) => publicUrl(f)), [files]);
  const gltfs = useGLTF(urls, false, true);
  return (
    <>
      {files.map((f, i) => {
        const items = byFile.get(f)!;
        return bake(urls[i], gltfs[i].scene).map((b, j) => <ModelInstances key={`${f}#${j}`} baked={b} items={items} />);
      })}
    </>
  );
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(err: unknown): void {
    console.warn('[office] furniture GLB failed to load; showing box stand-ins', err);
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** GLB furniture for a floor, with box stand-ins while loading / on error. */
export function OfficeModels({ models, fallback }: { models: readonly Placement[]; fallback: (parts: Part[]) => ReactNode }) {
  const boxes = useMemo(() => models.map((p) => placementBox(p)), [models]);
  if (models.length === 0) return null;
  const fb = fallback(boxes);
  return (
    <ModelErrorBoundary fallback={fb}>
      <Suspense fallback={fb}>
        <LoadedModels models={models} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/** Warm the GLB cache (e.g. when an office card opens). */
export function preloadOfficeModels(files: readonly string[]): void {
  useGLTF.preload(files.map((f) => publicUrl(f)), false, true);
}
