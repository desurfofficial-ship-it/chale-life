'use client';

/** Distant box skyline so zoom-out never shows an empty plane (W-008). */
import { useMemo } from 'react';
import * as THREE from 'three';

const PALETTE = ['#8999A3', '#B76544', '#8DA69A', '#E4C782', '#F0AB70'];

type Edge =
  | { kind: 'hz'; z: number; x0: number; x1: number }
  | { kind: 'vt'; x: number; z0: number; z1: number };

export function HorizonSilhouette() {
  const { geo, mat, count, matrices } = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: '#8999A3',
      roughness: 0.95,
      flatShading: true,
    });
    const pts: { x: number; z: number; w: number; h: number; d: number }[] = [];
    const ring: Edge[] = [
      { kind: 'hz', z: -130, x0: -300, x1: 360 },
      { kind: 'hz', z: 130, x0: -300, x1: 360 },
      { kind: 'vt', x: -300, z0: -130, z1: 130 },
      { kind: 'vt', x: 360, z0: -130, z1: 130 },
    ];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      const r = ring[i % 4];
      let x = 0;
      let z = 0;
      if (r.kind === 'hz') {
        x = r.x0 + rnd() * (r.x1 - r.x0);
        z = r.z + (rnd() - 0.5) * 8;
      } else {
        x = r.x + (rnd() - 0.5) * 8;
        z = r.z0 + rnd() * (r.z1 - r.z0);
      }
      pts.push({
        x,
        z,
        w: 4 + rnd() * 10,
        h: 6 + rnd() * 22,
        d: 4 + rnd() * 8,
      });
    }
    const dummy = new THREE.Object3D();
    const matrices = pts.map((p) => {
      dummy.position.set(p.x, p.h / 2, p.z);
      dummy.scale.set(p.w, p.h, p.d);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
    return { geo, mat, count: pts.length, matrices };
  }, []);

  return (
    <instancedMesh
      ref={(m) => {
        if (m) {
          matrices.forEach((matx, i) => m.setMatrixAt(i, matx));
          m.instanceMatrix.needsUpdate = true;
        }
      }}
      args={[geo, mat, count]}
      frustumCulled
      castShadow={false}
      receiveShadow={false}
      raycast={() => {}}
      userData={{ noCollide: true }}
    />
  );
}
