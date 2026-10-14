'use client';

/**
 * Pooled "+GH₵X" sprites — no per-frame allocations of meshes.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import type { TycoonBusinessView } from './types';

const POOL = 24;

type Slot = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  age: number;
  text: string;
};

function makeCanvasTexture(label: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 48);
  ctx.font = 'bold 22px system-ui,sans-serif';
  ctx.fillStyle = '#2d5a3d';
  ctx.strokeStyle = '#f5f0e6';
  ctx.lineWidth = 4;
  ctx.textAlign = 'center';
  ctx.strokeText(label, 64, 32);
  ctx.fillText(label, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function MoneyPops({ businesses }: { businesses: readonly TycoonBusinessView[] }) {
  const slots = useRef<Slot[]>(
    Array.from({ length: POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      age: 0,
      text: '',
    })),
  );
  const sprites = useRef<(THREE.Sprite | null)[]>(Array(POOL).fill(null));
  const lastSale = useRef<Map<string, number>>(new Map());

  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  // Spawn when lastSaleGHS changes
  useEffect(() => {
    for (const b of businesses) {
      if (b.lastSaleGHS <= 0) continue;
      const prev = lastSale.current.get(b.id) ?? 0;
      if (b.lastSaleGHS === prev) continue;
      lastSale.current.set(b.id, b.lastSaleGHS);
      const plot = byPlot.get(b.plotId);
      if (!plot) continue;
      const slot = slots.current.find((s) => !s.active);
      if (!slot) continue;
      slot.active = true;
      slot.x = plot.x;
      slot.y = (plot.y ?? 0) + 3.2;
      slot.z = plot.z;
      slot.age = 0;
      slot.text = `+GH₵${Math.round(b.lastSaleGHS)}`;
    }
  }, [businesses, byPlot]);

  useFrame((_, dt) => {
    for (let i = 0; i < POOL; i++) {
      const s = slots.current[i];
      const sp = sprites.current[i];
      if (!s || !sp) continue;
      if (!s.active) {
        sp.visible = false;
        continue;
      }
      s.age += dt;
      s.y += dt * 1.2;
      sp.position.set(s.x, s.y, s.z);
      sp.visible = true;
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = Math.max(0, 1 - s.age / 1.4);
      if (s.age > 1.4) s.active = false;
    }
  });

  // Pre-build a few textures for common amounts — reuse one default
  const defaultTex = useMemo(() => makeCanvasTexture('+GH₵'), []);

  return (
    <group name="tycoon-money-pops">
      {Array.from({ length: POOL }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          scale={[1.6, 0.6, 1]}
          visible={false}
        >
          <spriteMaterial map={defaultTex} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}
