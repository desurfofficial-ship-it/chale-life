'use client';

/**
 * Weather FX only — does NOT add a second ambient/sun (SceneLights owns those).
 * Rain streaks + optional cloud billboard; night is signaled via prop for shells.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TycoonWeather as W } from './types';

export function TycoonWeatherFX({ weather, hour }: { weather: W; hour: number }) {
  const night = weather === 'night' || hour >= 19 || hour < 6;
  const rain = weather === 'rain';
  const cloudy = weather === 'cloudy' || rain;

  return (
    <group name="tycoon-weather">
      {rain ? <RainStreaks /> : null}
      {cloudy && !night ? (
        <mesh position={[30, 40, 0]} userData={{ noCollide: true }}>
          <sphereGeometry args={[8, 8, 6]} />
          <meshBasicMaterial color="#9aa8b8" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function RainStreaks() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    // Deterministic pseudo-random (stable screenshots)
    let s = 42;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (rnd() - 0.5) * 80;
      arr[i * 3 + 1] = 5 + rnd() * 25;
      arr[i * 3 + 2] = (rnd() - 0.5) * 80;
    }
    return arr;
  }, []);
  // Fall — the streaks used to hang motionless at y 5–30 (indistinguishable
  // from floating dust). Wrap at the ground band back to the cloud top.
  useFrame((_, dt) => {
    if (!points.current) return;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const step = Math.min(dt, 0.1) * 9; // ~9 m/s fall
    for (let i = 0; i < 200; i++) {
      arr[i * 3 + 1] -= step;
      if (arr[i * 3 + 1] < 4) arr[i * 3 + 1] = 30;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={points} userData={{ noCollide: true }}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a8c0d8" size={0.15} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}
