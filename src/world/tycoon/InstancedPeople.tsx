'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import type { TycoonBusinessView } from './types';

const STAFF = '#2d5a3d';
const CUST = '#c4a035';

export function InstancedPeople({ businesses }: { businesses: readonly TycoonBusinessView[] }) {
  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  const staff = useMemo(() => {
    const out: { x: number; y: number; z: number }[] = [];
    for (const b of businesses) {
      const plot = byPlot.get(b.plotId);
      if (!plot) continue;
      const y0 = (plot.y ?? 0) + 0.55;
      for (let i = 0; i < b.staff; i++) {
        out.push({
          x: plot.x - plot.w * 0.25 + i * 0.55,
          y: y0,
          z: plot.z - plot.d * 0.15,
        });
      }
    }
    return out;
  }, [businesses, byPlot]);

  const customers = useMemo(() => {
    const out: { x: number; y: number; z: number }[] = [];
    for (const b of businesses) {
      const plot = byPlot.get(b.plotId);
      if (!plot) continue;
      const y0 = (plot.y ?? 0) + 0.55;
      const n = Math.min(8, Math.max(0, b.customersVisible));
      for (let i = 0; i < n; i++) {
        out.push({
          x: plot.x + plot.w * 0.15 + (i % 3) * 0.5,
          y: y0,
          z: plot.z + plot.d * 0.35 - Math.floor(i / 3) * 0.55,
        });
      }
    }
    return out;
  }, [businesses, byPlot]);

  return (
    <group name="tycoon-people">
      <PersonBatch color={STAFF} items={staff} />
      <PersonBatch color={CUST} items={customers} />
    </group>
  );
}

function PersonBatch({
  color,
  items,
}: {
  color: string;
  items: { x: number; y: number; z: number }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = items.length;
  }, [items]);

  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(items.length, 1)]} castShadow>
      <capsuleGeometry args={[0.18, 0.55, 3, 6]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </instancedMesh>
  );
}
