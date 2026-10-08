/**
 * The one and only player capsule. It is purely the VISUAL of the store
 * transform: reads position/yaw inside useFrame via getState() — no React
 * state, no re-renders, no DOM lookups. Never add a second player.
 *
 * Keep CAPSULE_RADIUS in sync with DEFAULT_MOVEMENT.radius in
 * src/engine/movement.ts — collision radius must match what you see.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { getState } from '../store/gameStore';

export const CAPSULE_RADIUS = 0.45;

export function Player() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { position, yaw } = getState().player;
    g.position.set(position.x, 0, position.z);
    g.rotation.y = yaw;
  });

  return (
    <group ref={group}>
      <mesh position={[0, CAPSULE_RADIUS + 0.45, 0]}>
        <capsuleGeometry args={[CAPSULE_RADIUS, 0.9, 6, 18]} />
        <meshStandardMaterial color="#facc15" roughness={0.55} />
      </mesh>
      {/* Facing nub so yaw is readable while testing movement */}
      <mesh position={[0, 1.45, 0.5]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} />
      </mesh>
    </group>
  );
}
