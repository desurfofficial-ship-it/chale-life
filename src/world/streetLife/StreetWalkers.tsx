'use client';

/**
 * Cosmetic pavement walkers (W-008). Instanced capsules + gait.
 * Does not affect revenue. LOD: full 12, mid 8, overview 0.
 */
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { lastDetailLod } from '../../engine/CameraRig';
import type { DetailLod } from '../../engine/zoomFit';
import {
  WALK_LOOPS,
  buildSegments,
  loopLength,
  poseAt,
  type Pose,
} from './roadGraph';

const WALK_SPEED = 1.35;
const COUNT: Record<DetailLod, number> = { full: 12, mid: 8, overview: 0 };

const SKINS = ['#8a5a3b', '#6e4226', '#a06a42', '#5b3520'];
const SHIRTS = ['#f4f1ea', '#c8102e', '#1d4fa0', '#e9c54a', '#3a9a4a', '#E4C782'];

interface Walker {
  loop: number;
  s0: number;
  dir: number;
  skin: string;
  shirt: string;
  scale: number;
}

function buildWalkers(n: number): Walker[] {
  const out: Walker[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      loop: i % WALK_LOOPS.length,
      s0: i * 41.3,
      dir: i % 2 === 0 ? 1 : -1,
      skin: SKINS[i % SKINS.length],
      shirt: SHIRTS[i % SHIRTS.length],
      scale: 0.92 + (i % 4) * 0.03,
    });
  }
  return out;
}

export function StreetWalkers() {
  const [lod, setLod] = useState<DetailLod>('full');
  const walkers = useMemo(() => buildWalkers(12), []);
  const loops = useMemo(
    () =>
      WALK_LOOPS.map((L) => {
        const segs = buildSegments(L.points, true);
        return { segs, total: loopLength(segs) };
      }),
    [],
  );
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pose = useMemo<Pose>(() => ({ x: 0, z: 0, yaw: 0 }), []);
  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.22, 0.55, 3, 6), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.16, 8, 6), []);
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.8, vertexColors: true }),
    [],
  );
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.75, vertexColors: true }),
    [],
  );

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    const c = new THREE.Color();
    for (let i = 0; i < walkers.length; i++) {
      c.set(walkers[i].shirt);
      body.setColorAt(i, c);
      c.set(walkers[i].skin);
      head.setColorAt(i, c);
    }
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (head.instanceColor) head.instanceColor.needsUpdate = true;
  }, [walkers]);

  useFrame(({ clock }) => {
    if (lastDetailLod !== lod) setLod(lastDetailLod);
    if (typeof document !== 'undefined' && document.hidden) return;
    const n = COUNT[lod];
    const t = clock.elapsedTime;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;

    for (let i = 0; i < 12; i++) {
      if (i >= n) {
        dummy.position.set(0, -40, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        body.setMatrixAt(i, dummy.matrix);
        head.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const w = walkers[i];
      const loop = loops[w.loop];
      const bob = Math.sin(t * 7 + i) * 0.04;
      const hip = Math.sin(t * 7 + i) * 0.08;
      poseAt(loop.segs, loop.total, w.s0 + t * WALK_SPEED * w.dir, pose);
      dummy.position.set(pose.x, 0.85 * w.scale + bob, pose.z);
      dummy.rotation.set(0, pose.yaw + hip, 0);
      dummy.scale.set(w.scale, w.scale, w.scale);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      dummy.position.set(pose.x, 1.55 * w.scale + bob, pose.z);
      dummy.rotation.set(0, pose.yaw, 0);
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    body.count = Math.max(1, n);
    head.count = Math.max(1, n);
  });

  return (
    <group name="w008-walkers">
      <instancedMesh
        ref={bodyRef}
        args={[bodyGeo, bodyMat, 12]}
        frustumCulled={false}
        castShadow={false}
        raycast={() => {}}
      />
      <instancedMesh
        ref={headRef}
        args={[headGeo, headMat, 12]}
        frustumCulled={false}
        castShadow={false}
        raycast={() => {}}
      />
    </group>
  );
}
