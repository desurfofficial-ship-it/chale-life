'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { TycoonWeather as W } from './types';

export function TycoonWeatherFX({ weather, hour }: { weather: W; hour: number }) {
  const night = weather === 'night' || hour >= 19 || hour < 6;
  const rain = weather === 'rain';
  const cloudy = weather === 'cloudy' || rain;

  const amb = night ? 0.18 : cloudy ? 0.32 : 0.42;
  const sun = night ? 0.25 : cloudy ? 0.55 : 0.95;
  const ambColor = night ? '#1a2030' : cloudy ? '#6a7a90' : '#fff4e0';
  const sunColor = night ? '#4a6080' : '#ffe6b0';

  return (
    <group name="tycoon-weather">
      <ambientLight intensity={amb} color={ambColor} />
      <directionalLight
        position={night ? [20, 30, -40] : [60, 90, 40]}
        intensity={sun}
        color={sunColor}
        castShadow={!rain}
      />
      {rain ? <RainStreaks /> : null}
      {cloudy && !night ? (
        <mesh position={[30, 40, 0]} userData={{ noCollide: true }}>
          <sphereGeometry args={[8, 8, 6]} />
          <meshBasicMaterial color="#9aa8b8" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function RainStreaks() {
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = 5 + Math.random() * 25;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);
  return (
    <points userData={{ noCollide: true }}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a8c0d8" size={0.15} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}
