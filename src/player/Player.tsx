/**
 * Player visual — follows store transform each frame (no React re-renders).
 *
 * Uses the shipped AccraLife male GLB when available; falls back to a bright
 * emissive capsule so the avatar stays readable at night / under occlusion.
 * CI/e2e (?e2e=1 or ?nochar=1) skips the skinned mesh (SwiftShader crash).
 *
 * B-004 occlusion contract: when a building stands between the camera and
 * the player, the avatar fades AND a depthTest-off silhouette shows through
 * so the player is never fully hidden. This used to live ONLY in the
 * capsule fallback — the GLB path (every real player) could be completely
 * swallowed by a building. Both paths now share usePlayerOcclusion().
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

/**
 * Camera→player occlusion ray, shared by both avatar paths. Returns the
 * refs to drive from the frame loop: call `update()` once per frame and
 * apply `occluded` to whatever the avatar does for it. Skips the player's
 * own meshes (PLAYER_MESH_FLAG), non-meshes and invisible objects
 * (SceneBatcher-hidden originals).
 */
function usePlayerOcclusion() {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster();
    r.camera = camera; // Sprite.raycast throws on a null camera
    return r;
  }, [camera]);
  const _origin = useMemo(() => new THREE.Vector3(), []);
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _player = useMemo(() => new THREE.Vector3(), []);

  const update = (): boolean => {
    const { position } = getState().player;
    _player.set(position.x, CAPSULE_RADIUS + 0.45, position.z);
    _origin.copy(camera.position);
    _dir.subVectors(_player, _origin);
    const dist = _dir.length();
    if (dist < 1e-4) return false;
    _dir.multiplyScalar(1 / dist);
    raycaster.set(_origin, _dir);
    raycaster.far = dist - CAPSULE_RADIUS * 0.25;
    const hits = raycaster.intersectObjects(scene.children, true);
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].object;
      if (obj.userData?.[PLAYER_MESH_FLAG]) continue;
      if (!obj.visible) continue;
      if (!(obj as THREE.Mesh).isMesh) continue;
      return true;
    }
    return false;
  };

  return { update };
}

function CapsuleAvatar() {
  const solidMat = useRef<THREE.MeshStandardMaterial>(null);
  const silhouetteGroup = useRef<THREE.Group>(null);
  const { update } = usePlayerOcclusion();

  useFrame(() => {
    const occluded = update();
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
  const charGroup = useRef<THREE.Group>(null);
  const silhouetteGroup = useRef<THREE.Group>(null);
  // Materials of the skinned GLB, collected once they exist (the model
  // mounts async under Suspense) and faded while occluded.
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const { update } = usePlayerOcclusion();

  useFrame(() => {
    const occluded = update();
    if (silhouetteGroup.current) silhouetteGroup.current.visible = occluded;
    // Fade the GLB itself — collect its materials lazily (skeleton clone
    // mounts after the group does).
    const g = charGroup.current;
    if (g && mats.current.length === 0) {
      g.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
          mats.current.push(mesh.material as THREE.MeshStandardMaterial);
        }
      });
    }
    for (const m of mats.current) {
      if (m.opacity === (occluded ? 0.45 : 1) && m.transparent === occluded) continue;
      m.opacity = occluded ? 0.45 : 1;
      m.transparent = occluded;
      m.depthWrite = !occluded; // opacity/transparent changes need no recompile
    }
  });

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
      <group ref={charGroup}>
        <PlayerCharacter position={[0, 0, 0]} rotationY={0} />
      </group>
      {/* B-004 ghost silhouette — depthTest-off, visible through buildings */}
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
