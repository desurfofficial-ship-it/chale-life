'use client';

/**
 * One InstancedMesh per furniture id across all open businesses (W-007).
 * Layout tiles from arrange() — tile = 1 m, origin at plot centre SW-ish.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import type { TycoonBusinessView } from './types';
import { furnitureSizeMeters } from '@/data/furniture';

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
  // Catalogue dimensions when present; heuristics fill height.
  const fromCat = furnitureSizeMeters(id);
  if (fromCat[0] !== 0.5 || fromCat[2] !== 0.5) return fromCat;
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

export function InstancedFurniture({ businesses }: { businesses: readonly TycoonBusinessView[] }) {
  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  // Group placements by furnitureId
  const groups = useMemo(() => {
    const g = new Map<string, { x: number; y: number; z: number; rot: number }[]>();
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
          y: y0 + furnSize(p.furnitureId)[1] / 2,
          z: originZ + p.tz + 0.5,
          rot: (p.rot * Math.PI) / 180,
        });
        g.set(p.furnitureId, list);
      }
    }
    return g;
  }, [businesses, byPlot]);

  return (
    <group name="tycoon-furniture">
      {[...groups.entries()].map(([fid, items]) => (
        <FurnitureBatch key={fid} furnitureId={fid} items={items} />
      ))}
    </group>
  );
}

function FurnitureBatch({
  furnitureId,
  items,
}: {
  furnitureId: string;
  items: { x: number; y: number; z: number; rot: number }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [sx, sy, sz] = furnSize(furnitureId);
  const color = FURN_COLOR[furnitureId] ?? DEFAULT_COLOR;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = items.length;
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </instancedMesh>
  );
}
