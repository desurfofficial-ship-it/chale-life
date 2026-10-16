'use client';

/**
 * City-wide lane traffic (W-008) — instanced low-poly cars on closed loops.
 * LOD: full ≤12, mid ≤6, overview ≤3. No physics. raycast disabled.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { lastDetailLod } from '../../engine/CameraRig';
import type { DetailLod } from '../../engine/zoomFit';
import {
  CITY_LOOPS,
  LANE_WIDTH,
  buildSegments,
  laneOffset,
  loopLength,
  poseAt,
  type Pose,
} from './roadGraph';

const SPEED = 7.5; // m/s
const KINDS = ['taxi', 'trotro', 'car', 'okada'] as const;
type Kind = (typeof KINDS)[number];

const COLORS: Record<Kind, string> = {
  taxi: '#f6b21b',
  trotro: '#3a6a9a',
  car: '#c4c8cc',
  okada: '#2d2d2d',
};

function vehicleGeo(kind: Kind): THREE.BufferGeometry {
  if (kind === 'okada') {
    const g = new THREE.BoxGeometry(0.45, 0.55, 1.35);
    return g;
  }
  if (kind === 'trotro') {
    return new THREE.BoxGeometry(1.9, 1.7, 4.2);
  }
  if (kind === 'taxi') {
    return new THREE.BoxGeometry(1.55, 1.2, 3.2);
  }
  return new THREE.BoxGeometry(1.5, 1.15, 3.0);
}

interface Car {
  kind: Kind;
  loop: number;
  /** Arc offset along loop */
  s0: number;
  /** +1 / -1 direction */
  dir: number;
  lateral: number;
}

function buildFleet(count: number): Car[] {
  const cars: Car[] = [];
  for (let i = 0; i < count; i++) {
    const kind = KINDS[i % KINDS.length];
    const loop = i % CITY_LOOPS.length;
    cars.push({
      kind,
      loop,
      s0: (i * 37.1) % 500,
      dir: i % 2 === 0 ? 1 : -1,
      lateral: (i % 2 === 0 ? 1 : -1) * (LANE_WIDTH * 0.45),
    });
  }
  return cars;
}

const COUNT: Record<DetailLod, number> = {
  full: 12,
  mid: 6,
  overview: 3,
};

export function StreetTraffic() {
  const [lod, setLod] = useState<DetailLod>('full');
  const fleet = useMemo(() => buildFleet(12), []);
  const loops = useMemo(
    () =>
      CITY_LOOPS.map((L) => {
        const segs = buildSegments(L.points, true);
        return { segs, total: loopLength(segs) };
      }),
    [],
  );
  const meshRefs = useRef<Partial<Record<Kind, THREE.InstancedMesh | null>>>({});
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pose: Pose = useMemo(() => ({ x: 0, z: 0, yaw: 0 }), []);
  const posed: Pose = useMemo(() => ({ x: 0, z: 0, yaw: 0 }), []);
  const geos = useMemo(() => {
    const g: Record<Kind, THREE.BufferGeometry> = {
      taxi: vehicleGeo('taxi'),
      trotro: vehicleGeo('trotro'),
      car: vehicleGeo('car'),
      okada: vehicleGeo('okada'),
    };
    return g;
  }, []);
  const mats = useMemo(() => {
    const m: Record<Kind, THREE.MeshStandardMaterial> = {
      taxi: new THREE.MeshStandardMaterial({ color: COLORS.taxi, roughness: 0.55 }),
      trotro: new THREE.MeshStandardMaterial({ color: COLORS.trotro, roughness: 0.6 }),
      car: new THREE.MeshStandardMaterial({ color: COLORS.car, roughness: 0.5 }),
      okada: new THREE.MeshStandardMaterial({ color: COLORS.okada, roughness: 0.7 }),
    };
    return m;
  }, []);

  useFrame(({ clock }) => {
    if (lastDetailLod !== lod) setLod(lastDetailLod);
    if (typeof document !== 'undefined' && document.hidden) return;
    const n = COUNT[lod];
    const t = clock.elapsedTime;
    const perKind: Record<Kind, number> = { taxi: 0, trotro: 0, car: 0, okada: 0 };

    for (let i = 0; i < n; i++) {
      const c = fleet[i];
      const loop = loops[c.loop];
      const s = c.s0 + t * SPEED * c.dir;
      // okada weave
      const weave = c.kind === 'okada' ? Math.sin(t * 2.1 + i) * 0.35 : 0;
      poseAt(loop.segs, loop.total, s, pose);
      laneOffset(pose, c.lateral + weave, posed);
      dummy.position.set(posed.x, c.kind === 'okada' ? 0.35 : 0.55, posed.z);
      dummy.rotation.set(0, posed.yaw, 0);
      dummy.updateMatrix();
      const mesh = meshRefs.current[c.kind];
      if (mesh) {
        const slot = perKind[c.kind]++;
        mesh.setMatrixAt(slot, dummy.matrix);
      }
    }
    for (const k of KINDS) {
      const mesh = meshRefs.current[k];
      if (!mesh) continue;
      // hide unused slots
      for (let j = perKind[k]; j < 12; j++) {
        dummy.position.set(0, -50, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = Math.max(1, perKind[k]);
    }
  });

  return (
    <group name="w008-traffic">
      {KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            meshRefs.current[k] = m;
          }}
          args={[geos[k], mats[k], 12]}
          frustumCulled={false}
          castShadow={false}
          receiveShadow={false}
          raycast={() => {}}
        />
      ))}
    </group>
  );
}
