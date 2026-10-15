/**
 * Player visual — AccraLife male GLB only (no yellow capsule).
 * CI/e2e (?e2e=1 or ?nochar=1) uses an invisible marker for collision tests.
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getState } from '../store/gameStore';
import { PlayerCharacter } from '../components/world/PlayerCharacter';

export const CAPSULE_RADIUS = 0.45;

function useSkipChar(): boolean {
  if (typeof window === 'undefined') return true;
  const q = new URLSearchParams(window.location.search);
  return q.get('e2e') === '1' || q.get('nochar') === '1';
}

/** Invisible stand-in for e2e / nochar — never a yellow circle. */
function InvisibleMarker() {
  return (
    <mesh visible={false} userData={{ chalePlayer: true }}>
      <boxGeometry args={[0.4, 1.6, 0.4]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function CharacterAvatar() {
  return (
    <group userData={{ chalePlayer: true }}>
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
    if (this.state.failed) return <InvisibleMarker />;
    return this.props.children;
  }
}

export function Player() {
  const group = useRef<THREE.Group>(null);
  const skip = useSkipChar();
  const [useChar, setUseChar] = useState(!skip);

  useEffect(() => {
    if (skip) setUseChar(false);
  }, [skip]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { position, rotationY } = getState().player;
    g.position.set(position.x, 0, position.z);
    g.rotation.y = rotationY;
  });

  return (
    <group ref={group} name="player">
      {useChar ? (
        <Suspense fallback={<InvisibleMarker />}>
          <CharErrorBoundary onError={() => setUseChar(false)}>
            <CharacterAvatar />
          </CharErrorBoundary>
        </Suspense>
      ) : (
        <InvisibleMarker />
      )}
    </group>
  );
}
