'use client';

/**
 * Pooled "+GH₵X" sprites — no per-frame allocations of meshes.
 *
 * Sale identity: businesses carry CUMULATIVE revenueToday; a pop spawns
 * when a business's cumulative total moves past the last seen value. The
 * previous scheme compared the DELTA amount — but revenue deltas repeat
 * constantly (every waakye sale is exactly ₵7), so the value-equality
 * dedupe swallowed every repeat sale and each business popped at most
 * once per distinct amount, then went silent forever.
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
  // Raw canvas pixels are sRGB — without this three r152+ samples them as
  // linear and the label renders washed-out/bright.
  tex.colorSpace = THREE.SRGBColorSpace;
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
  // business id → cumulative revenueToday at the last spawn decision
  const lastRev = useRef<Map<string, number>>(new Map());
  // label → texture cache (one GPU upload per distinct amount, not per sprite)
  const texCache = useRef<Map<string, THREE.CanvasTexture>>(new Map());
  const getTex = (label: string): THREE.CanvasTexture => {
    let t = texCache.current.get(label);
    if (!t) {
      t = makeCanvasTexture(label);
      texCache.current.set(label, t);
    }
    return t;
  };
  // Dispose the cached textures on unmount (R3F disposes materials, never
  // the map textures assigned to them).
  useEffect(
    () => () => {
      for (const t of texCache.current.values()) t.dispose();
      texCache.current.clear();
    },
    [],
  );

  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  // Spawn when the CUMULATIVE revenue moves (dedupe on identity, not amount)
  useEffect(() => {
    for (const b of businesses) {
      const prev = lastRev.current.get(b.id) ?? 0;
      if (b.revenueToday === prev) continue;
      lastRev.current.set(b.id, b.revenueToday);
      const delta = Math.round((b.revenueToday - prev) * 100) / 100;
      if (delta <= 0) continue; // day-roll reset / reload — nothing to celebrate
      const plot = byPlot.get(b.plotId);
      if (!plot) continue;
      const slot = slots.current.find((s) => !s.active);
      if (!slot) continue;
      slot.active = true;
      slot.x = plot.x;
      slot.y = (plot.y ?? 0) + 3.2;
      slot.z = plot.z;
      slot.age = 0;
      slot.text = `+GH₵${delta}`;
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
      // The slot text is written at spawn — swap the map when it differs
      // (every sprite used to share one "+GH₵" texture with NO amount).
      if (mat.map !== getTex(s.text)) {
        mat.map = getTex(s.text);
        mat.needsUpdate = true;
      }
      mat.opacity = Math.max(0, 1 - s.age / 1.4);
      if (s.age > 1.4) s.active = false;
    }
  });

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
          <spriteMaterial map={getTex('+GH₵')} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}
