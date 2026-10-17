/**
 * Player visual — AccraLife male GLB only (no yellow capsule).
 * CI/e2e (?e2e=1 or ?nochar=1) uses an invisible marker for collision tests.
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getState, movementInput } from '../store/gameStore';
import { PlayerCharacter } from '../components/world/PlayerCharacter';
import { CHAR_MOTION } from './characterAnim';

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
  // measured ground speed feeds the character animator (walk/run blend);
  // smoothed so a single clamped frame never snaps the cycle amplitude.
  const lastPos = useRef<{ x: number; z: number; t: number } | null>(null);

  useEffect(() => {
    if (skip) setUseChar(false);
  }, [skip]);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const { position, yaw } = getState().player;
    g.position.set(position.x, 0, position.z);
    g.rotation.y = yaw;

    // measure real ground speed (teleports show up as huge deltas — ignore
    // anything above a sprint by a wide margin so the anim doesn't spike)
    const dt = Math.min(rawDt, 0.1);
    const last = lastPos.current;
    if (last && dt > 0) {
      const d = Math.hypot(position.x - last.x, position.z - last.z);
      const measured = d / dt;
      const sane = measured < 30 ? measured : 0;
      const target = Math.min(sane, movementInput.sprint ? 12 : 9);
      CHAR_MOTION.speed += (target - CHAR_MOTION.speed) * Math.min(1, dt * 10);
    }
    lastPos.current = { x: position.x, z: position.z, t: performance.now() };
    CHAR_MOTION.sprint = movementInput.sprint;
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
