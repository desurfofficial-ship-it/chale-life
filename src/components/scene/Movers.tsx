'use client'

// ─── Sea life: bobbing boats + yacht, and the parked tro-tro prop ───────────
// (Road traffic removed — the map keeps a calm, cinematic streetscape.)
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '@/lib/mapConfig'
import { markAnimated, unmarkAnimated } from '../world/SceneBatcher'

// ─────────────────────────────────────────────────────── parked tro-tro ─────
function Wheels({ w = 1.9, positions }: { w?: number; positions: [number, number][] }) {
  return (
    <>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.28, z * (w / 2)]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.24, 10]} />
          <meshStandardMaterial color="#14161a" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

export function TrotroBus() {
  return (
    <group>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[5, 1.55, 2.1]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.5} metalness={0.15} />
      </mesh>
      {/* yellow stripe */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[5.04, 0.34, 2.14]} />
        <meshStandardMaterial color={COLORS.taxi} roughness={0.55} />
      </mesh>
      {/* windows */}
      <mesh position={[0.4, 1.42, 1.06]}>
        <planeGeometry args={[3.6, 0.62]} />
        <meshStandardMaterial color="#20303c" emissive="#ffcf7d" emissiveIntensity={0.35} metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0.4, 1.42, -1.06]}>
        <planeGeometry args={[3.6, 0.62]} />
        <meshStandardMaterial color="#20303c" emissive="#ffcf7d" emissiveIntensity={0.35} metalness={0.5} roughness={0.25} />
      </mesh>
      <Wheels w={2.2} positions={[[-1.6, 1], [1.6, 1], [-1.6, -1], [1.6, -1]]} />
    </group>
  )
}

// ───────────────────────────────────────────────────────────────── boats ────
const BOAT_COLORS = ['#ce1126', '#2e7fa8', '#fcd116', '#4f9e4f', '#d97b8f', '#3aa08f']

export function Boat({ position, colorIndex = 0, rotation = 0, bob = 1 }: { position: [number, number, number]; colorIndex?: number; rotation?: number; bob?: number }) {
  const ref = useRef<THREE.Group>(null)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const color = BOAT_COLORS[colorIndex % BOAT_COLORS.length]
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 0.9 * bob + phase) * 0.1
      ref.current.rotation.z = Math.sin(t * 0.8 * bob + phase) * 0.045
      ref.current.rotation.x = Math.sin(t * 0.65 * bob + phase * 1.3) * 0.03
    }
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      {/* hull */}
      <mesh castShadow>
        <boxGeometry args={[3.4, 0.55, 1.25]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      {/* pointed bow */}
      <mesh position={[1.85, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.62, 1, 1]}>
        <coneGeometry args={[0.62, 1.1, 4]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      {/* inner bench + canopy frame */}
      <mesh position={[-0.2, 0.42, 0]}>
        <boxGeometry args={[0.5, 0.12, 1.1]} />
        <meshStandardMaterial color="#8a5c36" />
      </mesh>
      <mesh position={[-0.6, 0.85, 0]}>
        <boxGeometry args={[0.1, 0.75, 1]} />
        <meshStandardMaterial color="#e9e3d5" />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────── slim fishing canoe (wood) ──
export function Canoe({ position, rotation = 0, colorIndex = 0 }: { position: [number, number, number]; rotation?: number; colorIndex?: number }) {
  const color = BOAT_COLORS[colorIndex % BOAT_COLORS.length]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.55, 3.4, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[2.6, 0.14, 0.7]} />
        <meshStandardMaterial color="#5b3d28" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────── white yacht ──────
export function Yacht({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const ref = useRef<THREE.Group>(null)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 0.55 + phase) * 0.14
      ref.current.rotation.z = Math.sin(t * 0.5 + phase) * 0.03
      ref.current.rotation.x = Math.sin(t * 0.42 + phase * 1.2) * 0.022
    }
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      {/* hull */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[9.5, 1.15, 3.1]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* pointed bow */}
      <mesh position={[5.15, 0.5, 0]} rotation={[0, Math.PI / 4, Math.PI / 2]} scale={[1, 1, 0.62]}>
        <coneGeometry args={[1.55, 2.4, 4]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.35} />
      </mesh>
      {/* waterline stripe */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[9.55, 0.3, 3.16]} />
        <meshStandardMaterial color="#2e7fa8" roughness={0.5} />
      </mesh>
      {/* main deck cabin */}
      <mesh position={[-0.8, 1.5, 0]} castShadow>
        <boxGeometry args={[4.6, 1.15, 2.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      {/* glowing window band */}
      <mesh position={[-0.8, 1.62, 1.28]}>
        <planeGeometry args={[3.9, 0.55]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffc86e" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[-0.8, 1.62, -1.28]}>
        <planeGeometry args={[3.9, 0.55]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffc86e" emissiveIntensity={1.1} />
      </mesh>
      {/* upper flybridge */}
      <mesh position={[-1.4, 2.45, 0]} castShadow>
        <boxGeometry args={[2.8, 0.85, 2]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.3} />
      </mesh>
      {/* radar mast + nav light */}
      <mesh position={[-2.6, 3.4, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 1.6, 6]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.5} />
      </mesh>
      <mesh position={[-2.6, 4.3, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#ffd2e8" emissive="#ff7ab8" emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}
