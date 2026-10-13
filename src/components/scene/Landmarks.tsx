'use client'

// ─── Landmark structures: Arch, Circle, Makola, Mall, Park, Station, Fuel ───
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { COLORS } from '@/lib/mapConfig'
import { signTexture } from '@/lib/mapTextures'
import { Building, GlassTower } from './Buildings'

// ─────────────────────────────────────────────── Independence Arch (Black Star Gate)
function archShape(w: number, h: number, legW: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(-w / 2, h)
  s.lineTo(w / 2, h)
  s.lineTo(w / 2, 0)
  s.lineTo(w / 2 - legW, 0)
  s.lineTo(w / 2 - legW, h * 0.52)
  // arch opening: up the right leg, over the semi-circle, down the left leg
  s.absarc(0, h * 0.52, w / 2 - legW, 0, Math.PI, false)
  s.lineTo(-w / 2 + legW, 0)
  s.closePath()
  return s
}

export function IndependenceArch({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => {
    const shape = archShape(15, 15, 3.4)
    const g = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2 })
    g.center()
    return g
  }, [])
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#f2ede2" roughness={0.75} />
      </mesh>
      {/* black star finial */}
      <BlackStar position={[0, 8.6, 0]} size={1.5} />
      {/* side obelisks */}
      {[-11.5, 11.5].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 4, 0]} castShadow>
            <boxGeometry args={[2.6, 8, 2.6]} />
            <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
          </mesh>
          <mesh position={[0, 8.6, 0]}>
            <sphereGeometry args={[0.5, 10, 10]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function BlackStar({ position, size = 1, rotation = 0 }: { position: [number, number, number]; size?: number; rotation?: number }) {
  const geo = useMemo(() => starGeo(size), [size])
  return (
    <mesh geometry={geo} position={position} rotation={[0, rotation, 0]}>
      <meshStandardMaterial color="#151515" roughness={0.5} />
    </mesh>
  )
}

export function starGeo(size: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const a2 = a + Math.PI / 5
    if (i === 0) shape.moveTo(Math.cos(a) * size, Math.sin(a) * size)
    else shape.lineTo(Math.cos(a) * size, Math.sin(a) * size)
    shape.lineTo(Math.cos(a2) * size * 0.45, Math.sin(a2) * size * 0.45)
  }
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: size * 0.22, bevelEnabled: false })
  g.center()
  return g
}

// ──────────────────────────────────────────── Circle interchange centre island
export function CircleStatue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 3, 1, 18]} />
        <meshStandardMaterial color="#cfc7b6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.3, 2.6, 12]} />
        <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
      </mesh>
      <BlackStar position={[0, 4.4, 0]} size={1.05} rotation={0.4} />
      {/* gold ball finials on a ring of small posts */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 3.6, 1.35, Math.sin(a) * 3.6]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial color="#fcd116" metalness={0.4} roughness={0.4} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────── Makola market stalls
const CANOPY_COLORS = ['#d94f3d', '#2e7fa8', '#e08a3c', '#4f9e4f', '#e4b93f', '#b05aa0', '#3aa08f', '#d4557a']

export function MarketStall({ position, colorIndex = 0, rotation = 0 }: { position: [number, number, number]; colorIndex?: number; rotation?: number }) {
  const color = CANOPY_COLORS[colorIndex % CANOPY_COLORS.length]
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'stall' }}>
      {/* canopy */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[3.6, 0.22, 3]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* canopy skirt stripes */}
      <mesh position={[0, 2.28, 0]}>
        <boxGeometry args={[3.62, 0.35, 3.02]} />
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.85} />
      </mesh>
      {/* poles */}
      {[
        [-1.6, -1.3],
        [1.6, -1.3],
        [-1.6, 1.3],
        [1.6, 1.3],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.15, pz]}>
          <cylinderGeometry args={[0.09, 0.09, 2.3, 6]} />
          <meshStandardMaterial color="#6b4a2f" />
        </mesh>
      ))}
      {/* table + goods */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[3.1, 0.18, 2.4]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, 1.35, -0.3]}>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial color="#e2762d" roughness={0.85} />
      </mesh>
      <mesh position={[0.7, 1.32, 0.3]}>
        <boxGeometry args={[0.8, 0.44, 0.8]} />
        <meshStandardMaterial color="#d9b23c" roughness={0.85} />
      </mesh>
    </group>
  )
}

export function MakolaMarket() {
  const stalls: ReactNode[] = []
  // 4 rows of stalls; row bases tuned so the west rows clear the midC
  // carriageway (x ≥ -55.5) and the KENTE shop fits at the east end
  const rows: [number, number][] = [
    [-26, -53],
    [-18, -56],
    [-10, -53],
    [-2.5, -55],
  ]
  rows.forEach(([z, base], r) => {
    for (let i = 0; i < 5; i++) {
      stalls.push(
        <MarketStall
          key={`st-${r}-${i}`}
          position={[base + i * 8 + (r % 2) * 2.4, 0, z]}
          colorIndex={r * 5 + i}
          rotation={r % 2 === 0 ? 0 : 0.16}
        />
      )
    }
  })
  return (
    <group>
      {stalls}
      {/* two concrete vendor sheds */}
      <Building position={[-30, 1.6, -14]} size={[9, 3.2, 5]} wall={COLORS.wallCream} facadeKey="shed-a" rows={1} cols={3} litRatio={0.8} />
      <Building position={[-48, 1.6, -22]} size={[8, 3.2, 5]} wall={COLORS.wallYellow} facadeKey="shed-b" rows={1} cols={3} litRatio={0.8} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────── Accra Mall
export function AccraMall({ position }: { position: [number, number, number] }) {
  const sign = useMemo(() => signTexture('ACCRA MALL', '#f4f4f4', '#1d4f6b'), [])
  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 9, 12]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.75} />
      </mesh>
      {/* glass front strip facing the parking lot (south, +z) */}
      <mesh position={[0, 2.6, 6.05]}>
        <planeGeometry args={[22, 3.4]} />
        <meshStandardMaterial color="#9fd4e8" emissive="#5a92b0" emissiveIntensity={0.55} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* rooftop units */}
      {[-8, 0, 8].map((x) => (
        <mesh key={x} position={[x, 9.8, -2]} castShadow>
          <boxGeometry args={[3, 1.4, 3]} />
          <meshStandardMaterial color="#8d9299" />
        </mesh>
      ))}
      {/* main sign */}
      <mesh position={[0, 10.6, 6.1]}>
        <planeGeometry args={[18, 3]} />
        <meshStandardMaterial map={sign} emissive="#666666" emissiveMap={sign} emissiveIntensity={0.7} />
      </mesh>
      {/* parking lamps */}
      {[-10, 10].map((x) => (
        <mesh key={x} position={[x, 2.6, 7.5]}>
          <cylinderGeometry args={[0.1, 0.12, 5, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  )
}

// ──────────────────────────────────── Kwame Nkrumah Memorial Park structures
export function MemorialPark() {
  return (
    <group>
      {/* mausoleum: cylinder + dome */}
      <group position={[-78, 0, -8]}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.4, 3.8, 2.2, 18]} />
          <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
        </mesh>
        {/* dome must SIT on the drum: cylinder top is at 2.2 (was 3.1 →
            the hemisphere hovered 0.9 m over the mausoleum) */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <sphereGeometry args={[3.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2f6b5f" roughness={0.5} metalness={0.25} />
        </mesh>
        <BlackStar position={[0, 6, 0]} size={0.8} />
      </group>
      {/* fountain */}
      <group position={[-78, 0, -22]}>
        <mesh position={[0, 0.45, 0]} receiveShadow>
          <cylinderGeometry args={[3.2, 3.5, 0.9, 18]} />
          <meshStandardMaterial color="#cfc7b6" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[2.7, 2.7, 0.16, 18]} />
          <meshStandardMaterial color="#3fa4c4" emissive="#1a6a8a" emissiveIntensity={0.5} roughness={0.15} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.35, 0.5, 1.6, 10]} />
          <meshStandardMaterial color="#e9e3d5" />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.45, 10, 10]} />
          <meshStandardMaterial color="#7fd0e8" transparent opacity={0.85} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

// ──────────────────────────────────────────────────────── tro-tro station ──
export function TrotroShelter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ bldg: 'shelter' }}>
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[13, 0.3, 5]} />
        <meshStandardMaterial color="#ce1126" roughness={0.7} />
      </mesh>
      {[-5.8, 0, 5.8].map((x) => (
        <mesh key={x} position={[x, 1.5, 2]}>
          <cylinderGeometry args={[0.14, 0.14, 3, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      <mesh position={[0, 0.9, -1.4]}>
        <boxGeometry args={[10, 1.8, 0.35]} />
        <meshStandardMaterial color="#d8d2c4" />
      </mesh>
    </group>
  )
}

// ──────────────────────────────────────────────────────────── fuel station ──
export function FuelStation({ position }: { position: [number, number, number] }) {
  const sign = useMemo(() => signTexture('TOTAL', '#e8332a', '#ffffff'), [])
  return (
    <group position={position} userData={{ bldg: 'building' }}>
      {/* canopy */}
      <mesh position={[0, 5.4, 0]} castShadow>
        <boxGeometry args={[11, 0.5, 8]} />
        <meshStandardMaterial color="#e8332a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 4.95, 0]}>
        <boxGeometry args={[11.2, 0.5, 8.2]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
      {[
        [-4, -2.6],
        [4, -2.6],
        [-4, 2.6],
        [4, 2.6],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 2.5, pz]}>
          <cylinderGeometry args={[0.18, 0.18, 5, 8]} />
          <meshStandardMaterial color="#d8d8d8" metalness={0.4} />
        </mesh>
      ))}
      {/* pumps */}
      {[-2, 2].map((px) => (
        <mesh key={px} position={[px, 0.85, 0]} castShadow>
          <boxGeometry args={[0.9, 1.7, 1.4]} />
          <meshStandardMaterial color="#e8e8e8" emissive="#334" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* price sign pylon */}
      <group position={[7.5, 0, -3]}>
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[0.4, 6.8, 0.4]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[0, 7.2, 0]}>
          <planeGeometry args={[3.4, 2]} />
          <meshStandardMaterial map={sign} emissive="#833" emissiveMap={sign} emissiveIntensity={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────── Legon gate ──
export function LegonGate({ position, span = 4 }: { position: [number, number, number]; span?: number }) {
  return (
    <group position={position}>
      {[-span, span].map((dx) => (
        <mesh key={dx} position={[dx, 2.6, 0]} castShadow>
          <boxGeometry args={[1.4, 5.2, 1.4]} />
          <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 5.6, 0]} castShadow>
        <boxGeometry args={[span * 2 + 1.4, 1.1, 1.6]} />
        <meshStandardMaterial color="#e9e3d5" />
      </mesh>
      {/* star seated on the beam: beam top = 6.15, star bottom = y − size */}
      <BlackStar position={[0, 6.85, 0]} size={0.7} />
    </group>
  )
}

export { GlassTower }
