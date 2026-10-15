'use client';

/**
 * Pooled "+GH₵X" sprites — no per-frame allocations of meshes.
 *
 * E-011 fixes:
 *  - Spawn dedupe now keys on the CUMULATIVE revenueToday, not the delta.
 *    lastSaleGHS is a difference between two render passes, so two
 *    equal-sized sales in a row (₵5 then ₵5) produced the same value and
 *    the second pop was silently dropped.
 *  - slot.text is actually rendered now: each spawn binds a cached
 *    CanvasTexture with the REAL amount (all pops used to show one generic
 *    "+GH₵" label — the amount string was computed and never drawn).
 *  - Textures are disposed on unmount (CanvasTextures used to leak on
 *    every AccraWorld remount).
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
  /** Last pop key per business: `id:revenueToday` (monotonic within a day). */
  const lastPopKey = useRef<Map<string, string>>(new Map());
  /** Amount-label texture cache — canvases are expensive, reuse per amount. */
  const texCache = useRef<Map<string, THREE.CanvasTexture>>(new Map());

  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  const texFor = (label: string): THREE.CanvasTexture => {
    let t = texCache.current.get(label);
    if (!t) {
      t = makeCanvasTexture(label);
      texCache.current.set(label, t);
    }
    return t;
  };

  // Dispose every generated texture when the layer unmounts.
  useEffect(() => {
    const cache = texCache.current;
    return () => {
      for (const t of cache.values()) t.dispose();
      cache.clear();
    };
  }, []);

  // Spawn when the cumulative revenue anchor advances
  useEffect(() => {
    for (const b of businesses) {
      if (b.lastSaleGHS <= 0) continue;
      const key = `${b.id}:${b.revenueToday}`;
      if (lastPopKey.current.get(b.id) === key) continue;
      lastPopKey.current.set(b.id, key);
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
      const sp = sprites.current[slots.current.indexOf(slot)];
      if (sp) (sp.material as THREE.SpriteMaterial).map = texFor(slot.text);
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
          <spriteMaterial transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}
