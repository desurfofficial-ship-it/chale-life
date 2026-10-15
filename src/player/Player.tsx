/**
 * Player visual — follows store transform each frame (no React re-renders).
 *
 * Uses the shipped AccraLife male GLB when available; falls back to a bright
 * emissive capsule so the avatar stays readable at night / under occlusion.
 * CI/e2e (?e2e=1 or ?nochar=1) skips the skinned mesh (SwiftShader crash).
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getState } from '../store/gameStore';
import { PlayerCharacter } from '../components/world/PlayerCharacter';

export const CAPSULE_RADIUS = 0.45;

const PLAYER_MESH_FLAG = 'chalePlayer';

function useSkipChar(): boolean {
  if (typeof window === 'undefined') return true;
  const q = new URLSearchParams(window.location.search);
  return q.get('e2e') === '1' || q.get('nochar') === '1';
}

function CapsuleAvatar() {
  const solidMat = useRef<THREE.MeshStandardMaterial>(null);
  const silhouetteGroup = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster();
    r.camera = camera;
    return r;
  }, [camera]);
  const _origin = useMemo(() => new THREE.Vector3(), []);
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _player = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const { position } = getState().player;
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
      if (!(obj as THREE.Mesh).isMesh) continue;
      occluded = true;
      break;
    }
    if (silhouetteGroup.current) silhouetteGroup.current.visible = occluded;
    if (solidMat.current) {
      solidMat.current.opacity = occluded ? 0.45 : 1;
      solidMat.current.transparent = occluded;
      solidMat.current.depthWrite = !occluded;
    }
  });

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.05, 0]}
        userData={{ [PLAYER_MESH_FLAG]: true, noCollide: true }}
      >
        <ringGeometry args={[0.55, 0.85, 32]} />
        <meshBasicMaterial
          color="#fde047"
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, CAPSULE_RADIUS + 0.45, 0]} userData={{ [PLAYER_MESH_FLAG]: true }}>
        <capsuleGeometry args={[CAPSULE_RADIUS, 0.9, 6, 18]} />
        <meshStandardMaterial
          ref={solidMat}
          color="#facc15"
          emissive="#f59e0b"
          emissiveIntensity={0.65}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 1.45, 0.5]} userData={{ [PLAYER_MESH_FLAG]: true }}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} />
      </mesh>
      <group ref={silhouetteGroup} visible={false}>
        <mesh position={[0, CAPSULE_RADIUS + 0.45, 0]} userData={{ [PLAYER_MESH_FLAG]: true }}>
          <capsuleGeometry args={[CAPSULE_RADIUS * 1.05, 0.9, 4, 12]} />
          <meshBasicMaterial
            color="#fde047"
            transparent
            opacity={0.7}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function CharacterAvatar() {
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.04, 0]}
        userData={{ [PLAYER_MESH_FLAG]: true, noCollide: true }}
      >
        <ringGeometry args={[0.4, 0.65, 28]} />
        <meshBasicMaterial
          color="#fde047"
          transparent
          opacity={0.75}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <PlayerCharacter position={[0, 0, 0]} rotationY={0} />
    </group>
  );
}

class CharErrorBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.failed) return <CapsuleAvatar />;
    return this.props.children;
  }
}

export function Player() {
  const group = useRef<THREE.Group>(null);
  const skipChar = useSkipChar();
  const [useChar, setUseChar] = useState(!skipChar);

  useEffect(() => {
    if (skipChar) setUseChar(false);
  }, [skipChar]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { position, yaw } = getState().player;
    g.position.set(position.x, 0, position.z);
    g.rotation.y = yaw;
  });

  return (
    <group ref={group}>
      {useChar ? (
        <Suspense fallback={<CapsuleAvatar />}>
          <CharErrorBoundary onError={() => setUseChar(false)}>
            <CharacterAvatar />
          </CharErrorBoundary>
        </Suspense>
      ) : (
        <CapsuleAvatar />
      )}
    </group>
  );
}
