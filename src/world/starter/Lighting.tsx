/**
 * Lighting.tsx — warm coastal Accra midday sun, light shadows only.
 *
 * One shadow-casting directional sun + hemisphere sky bounce. Tight 1024²
 * shadow map over the 60 × 60 m block keeps the phone budget healthy;
 * soft PCF radius avoids hard cartoon edges.
 *
 * B-002: also owns the warm haze background + fog so the outer apron fades
 * into atmosphere instead of a navy void (scene.background / scene.fog).
 * Sole owner — App.tsx must not set a duplicate <color attach="background">.
 *
 * Owned by Agent 3 (World & Art).
 */
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../palette';

/** Warm coastal haze — matches the laterite apron, never navy. */
const HAZE = '#c8b89a';
const FOG_NEAR = 45;
const FOG_FAR = 95;

export function Lighting() {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color(HAZE);
    scene.fog = new THREE.Fog(HAZE, FOG_NEAR, FOG_FAR);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  return (
    <group name="starter-lighting">
      <hemisphereLight args={[PALETTE.skyBlue, '#8a7350', 0.55]} />
      <directionalLight
        position={[24, 34, 14]}
        intensity={2.1}
        color="#ffd9a8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={4}
      />
    </group>
  );
}
