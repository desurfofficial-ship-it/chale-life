'use client'

// ─── Nature & props: palms, trees, people, waving Ghana flags ───────────────
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { flagTexture } from '@/lib/mapTextures'
import { seededSpanAt } from '@/lib/seeded'
import { markAnimated, unmarkAnimated } from '../world/SceneBatcher'

// ─────────────────────────────────────────────────────────────── palm tree ──
export function Palm({ position, scale = 1, rotation = 0 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  const fronds = 7
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 2.6, 0]} rotation={[0.06, 0, 0.05]} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 5.2, 7]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.9} />
      </mesh>
      {Array.from({ length: fronds }).map((_, i) => {
        const a = (i / fronds) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.15, 5.2 - 0.12, Math.sin(a) * 1.15]}
            rotation={[0.55 * Math.sin(a), -a, 0.5]}
          >
            <coneGeometry args={[0.42, 2.6, 4]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#3e8f4a' : '#57a85f'} roughness={0.8} />
          </mesh>
        )
      })}
      {/* coconuts */}
      <mesh position={[0.2, 4.95, 0.15]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────── generic tree ─────
export function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.34, 2, 6]} />
        <meshStandardMaterial color="#7a5230" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.9, 0]} castShadow>
        <sphereGeometry args={[1.55, 9, 8]} />
        <meshStandardMaterial color="#3e8f4a" roughness={0.85} />
      </mesh>
      <mesh position={[0.5, 2.3, 0.4]}>
        <sphereGeometry args={[0.95, 8, 7]} />
        <meshStandardMaterial color="#4da058" roughness={0.85} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────── people (silhouette)
const SKIN_TONES = ['#8a5a3b', '#6e4226', '#a06a42', '#5b3520']
const CLOTH_COLORS = ['#ce1126', '#fcd116', '#2e7fa8', '#4f9e4f', '#e08a3c', '#d97b8f', '#f4f1ea', '#3aa08f']

/** Static capsule people removed (looked unfinished). CommunityLife has the proper NPCs. */
export function Person(_props: { position: [number, number, number]; rotation?: number }) {
  return null
}

// ───────────────────────────────────────────────────── waving Ghana flag ────
export function GhanaFlag({ position, scale = 1, rotation = 0 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  const tex = useMemo(() => flagTexture(), [])
  const ref = useRef<THREE.Group>(null)
  const phase = useMemo(() => seededSpanAt(position, Math.PI * 2), [position])
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t * 1.6 + phase) * 0.22
      ref.current.rotation.x = Math.sin(t * 2.1 + phase) * 0.06
    }
  })
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 6.2, 6]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.5} roughness={0.4} />
      </mesh>
      <group ref={ref} position={[1.35, 5.5, 0]}>
        <mesh>
          <planeGeometry args={[2.7, 1.7]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      </group>
      <mesh position={[0, 6.3, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────── street lamps ─────
export function StreetLamp({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const glow = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255,220,150,0.95)')
    grad.addColorStop(1, 'rgba(255,200,120,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(c)
    return t
  }, [])
  // P2-4: per-lamp glow texture — free it when the lamp unmounts
  useEffect(() => () => glow.dispose(), [glow])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 5.2, 6]} />
        <meshStandardMaterial color="#3c4046" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0.55, 5.15, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.07, 0.07, 1.3, 6]} />
        <meshStandardMaterial color="#3c4046" />
      </mesh>
      <mesh position={[1.05, 5.5, 0]}>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshStandardMaterial color="#ffe2a8" emissive="#ffc86e" emissiveIntensity={2.6} />
      </mesh>
      <sprite position={[1.05, 5.5, 0]} scale={[2.6, 2.6, 1]}>
        <spriteMaterial map={glow} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

// ───────────────────────────────────────────── beach umbrella + beach props ──
export function BeachUmbrella({ position, colorIndex = 0 }: { position: [number, number, number]; colorIndex?: number }) {
  const colors = ['#ce1126', '#2e7fa8', '#fcd116', '#4f9e4f', '#d97b8f']
  const color = colors[colorIndex % colors.length]
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.8, 6]} />
        <meshStandardMaterial color="#c8c8c8" />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <coneGeometry args={[1.7, 0.85, 8]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[0.85, 0.06, 0.6]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshStandardMaterial color={colors[(colorIndex + 2) % colors.length]} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
