'use client';

/**
 * Pavement lamps every ~12 m on main loops (W-008). Instanced.
 * Night emissive driven lightly by hour prop.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { CITY_LOOPS, buildSegments, loopLength, poseAt, type Pose } from './roadGraph';

export function StreetLamps({ hour = 12 }: { hour?: number }) {
  const night = hour >= 19 || hour < 6;
  const { geo, mat, count, matrices } = useMemo(() => {
    const post = new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: '#4a4e54',
      roughness: 0.7,
      emissive: '#ffcf7d',
      emissiveIntensity: 0,
    });
    const dummy = new THREE.Object3D();
    const pose: Pose = { x: 0, z: 0, yaw: 0 };
    const matrices: THREE.Matrix4[] = [];
    for (const L of CITY_LOOPS) {
      const segs = buildSegments(L.points, true);
      const total = loopLength(segs);
      for (let s = 6; s < total; s += 12) {
        poseAt(segs, total, s, pose);
        const side = matrices.length % 2 === 0 ? 1 : -1;
        const lat = 5.2 * side;
        const c = Math.cos(pose.yaw);
        const sn = Math.sin(pose.yaw);
        dummy.position.set(pose.x + sn * lat, 1.6, pose.z - c * lat);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }
    return { geo: post, mat, count: matrices.length, matrices };
  }, []);

  mat.emissiveIntensity = night ? 0.85 : 0;

  return (
    <instancedMesh
      ref={(m) => {
        if (m) {
          matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
          m.instanceMatrix.needsUpdate = true;
        }
      }}
      args={[geo, mat, count]}
      frustumCulled
      castShadow={false}
      raycast={() => {}}
      userData={{ noCollide: true }}
    />
  );
}
