'use client';

/**
 * Building shell per owned plot — category colours, door gap, cutaway roof.
 * Shell walls are thin solids with a door opening on +z (walkable).
 */
import { useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import type { TycoonBusinessView } from './types';

const WALL = {
  food_drink: '#d9a86c',
  services: '#efe3c2',
  entertainment: '#c4a035',
} as const;

const TRIM = '#2d5a3d';
const ROOF = '#a03c2e';
const FLOOR = '#e8dcc8';
const FLOOR_NIGHT = '#d4c8b0';

function ShellMesh({
  biz,
  plot,
  windowGlow = 0,
}: {
  biz: TycoonBusinessView;
  plot: { x: number; z: number; w: number; d: number; y?: number };
  windowGlow?: number;
}) {
  const wallColor = WALL[biz.category] ?? WALL.services;
  const { camera } = useThree();
  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROOF,
        roughness: 0.85,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    [],
  );

  // Cutaway: high overview (low ortho zoom) → roof fades out
  useFrame(() => {
    const zoom = 'zoom' in camera ? (camera as THREE.OrthographicCamera).zoom : 12;
    // zoom ~6–10 overview, ~18–28 street
    const t = THREE.MathUtils.clamp((zoom - 8) / 14, 0, 1);
    roofMat.opacity = 0.05 + t * 0.9;
    roofMat.depthWrite = t > 0.55;
  });

  const w = plot.w * 0.92;
  const d = plot.d * 0.92;
  const h = 2.6;
  const t = 0.14;
  const doorW = Math.min(1.4, w * 0.28);
  const side = (w - doorW) / 2;
  const y0 = plot.y ?? 0;

  return (
    <group position={[plot.x, y0, plot.z]} name={`shell:${biz.id}`}>
      {/* floor pad */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={FLOOR}
          roughness={0.92}
          emissive="#ffcf7d"
          emissiveIntensity={windowGlow * 0.22}
        />
      </mesh>

      {/* back wall (-z) */}
      <mesh position={[0, h / 2, -d / 2 + t / 2]} castShadow>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* left / right walls */}
      <mesh position={[-w / 2 + t / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[w / 2 - t / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* front wall with door gap — two segments */}
      <mesh position={[-(doorW / 2 + side / 2), h / 2, d / 2 - t / 2]} castShadow>
        <boxGeometry args={[side, h, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[doorW / 2 + side / 2, h / 2, d / 2 - t / 2]} castShadow>
        <boxGeometry args={[side, h, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* lintel over door */}
      <mesh position={[0, h - 0.25, d / 2 - t / 2]} castShadow>
        <boxGeometry args={[doorW + 0.1, 0.5, t]} />
        <meshStandardMaterial color={TRIM} roughness={0.8} />
      </mesh>

      {/* roof (cutaway controlled) */}
      <mesh position={[0, h + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noCollide: true }}>
        <planeGeometry args={[w + 0.2, d + 0.2]} />
        <primitive object={roofMat} attach="material" />
      </mesh>

      {/* sign strip */}
      <mesh position={[0, h - 0.4, d / 2 + 0.02]} userData={{ noCollide: true }}>
        <boxGeometry args={[Math.min(w * 0.7, 3.2), 0.45, 0.06]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function BusinessShells({
  businesses,
  hour = 12,
}: {
  businesses: readonly TycoonBusinessView[];
  hour?: number;
}) {
  // crude night glow from hour (full path would use lightingAt; avoid import cycle)
  const windowGlow =
    hour >= 20 || hour < 5 ? 1 : hour >= 18 ? (hour - 18) / 2 : hour < 7 ? (7 - hour) / 2 : 0;
  const byId = useMemo(() => {
    const m = new Map<string, (typeof LAND_PLOTS)[number]>();
    for (const p of LAND_PLOTS) if (p.id) m.set(p.id, p);
    return m;
  }, []);

  return (
    <group name="tycoon-shells">
      {businesses.map((b) => {
        const plot = byId.get(b.plotId);
        if (!plot) return null;
        return <ShellMesh key={b.id} biz={b} plot={plot} windowGlow={windowGlow} />;
      })}
    </group>
  );
}
