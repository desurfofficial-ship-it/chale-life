/**
 * The one and only player capsule. It is purely the VISUAL of the store
 * transform: reads position/yaw inside useFrame via getState() — no React
 * state, no re-renders, no DOM lookups. Never add a second player.
 *
 * Keep CAPSULE_RADIUS in sync with DEFAULT_MOVEMENT.radius in
 * src/engine/movement.ts — collision radius must match what you see.
 *
 * B-004 occlusion: each frame a ray from the camera through the player is
 * tested against scene meshes. When a building/roof sits in front of the
 * capsule, a second “silhouette” pass (depthTest off, semi-transparent)
 * keeps the player readable through the occluder.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getState } from '../store/gameStore';

export const CAPSULE_RADIUS = 0.45;

/** Tag set on the solid player meshes so the ray ignores self-hits. */
const PLAYER_MESH_FLAG = 'chalePlayer';

export function Player() {
  const group = useRef<THREE.Group>(null);
  const solidMat = useRef<THREE.MeshStandardMaterial>(null);
  const silhouetteMat = useRef<THREE.MeshBasicMaterial>(null);
  const silhouetteGroup = useRef<THREE.Group>(null);

  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const _origin = useMemo(() => new THREE.Vector3(), []);
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _player = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { position, yaw } = getState().player;
    g.position.set(position.x, 0, position.z);
    g.rotation.y = yaw;

    // Camera → player ray. Occluded when any non-player mesh is closer than
    // the capsule centre (buildings, roofs, props the ray can hit).
    _player.set(position.x, CAPSULE_RADIUS + 0.45, position.z);
    _origin.copy(camera.position);
    _dir.subVectors(_player, _origin);
    const dist = _dir.length();
    if (dist < 1e-4) return;
    _dir.multiplyScalar(1 / dist);
    raycaster.set(_origin, _dir);
    raycaster.far = dist - CAPSULE_RADIUS * 0.25;

    const hits = raycaster.intersectObjects(scene.children, true);
    let occluded = false;
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].object;
      if (obj.userData?.[PLAYER_MESH_FLAG]) continue;
      if (!obj.visible) continue;
      occluded = true;
      break;
    }

    if (silhouetteGroup.current) {
      silhouetteGroup.current.visible = occluded;
    }
    if (solidMat.current) {
      solidMat.current.opacity = occluded ? 0.35 : 1;
      solidMat.current.transparent = occluded;
      solidMat.current.depthWrite = !occluded;
    }
  });

  return (
    <group ref={group}>
      <mesh
        position={[0, CAPSULE_RADIUS + 0.45, 0]}
        userData={{ [PLAYER_MESH_FLAG]: true }}
      >
        <capsuleGeometry args={[CAPSULE_RADIUS, 0.9, 6, 18]} />
        <meshStandardMaterial
          ref={solidMat}
          color="#facc15"
          roughness={0.55}
          transparent={false}
        />
      </mesh>
      <mesh position={[0, 1.45, 0.5]} userData={{ [PLAYER_MESH_FLAG]: true }}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} />
      </mesh>

      <group ref={silhouetteGroup} visible={false}>
        <mesh position={[0, CAPSULE_RADIUS + 0.45, 0]} userData={{ [PLAYER_MESH_FLAG]: true }}>
          <capsuleGeometry args={[CAPSULE_RADIUS * 1.02, 0.9, 4, 12]} />
          <meshBasicMaterial
            ref={silhouetteMat}
            color="#fde047"
            transparent
            opacity={0.55}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
