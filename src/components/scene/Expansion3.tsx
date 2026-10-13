'use client'

// ─── Phase 2 landmark structures ─────────────────────────────────────────────
// Black Star Gate, parade grandstands, floodlight masts, memorial pool &
// park walls, market gate/kiosks/racks, Chale Wote murals & colonial block,
// beach stalls & volleyball, banner gates, utility poles, church, parking deck.
import { useMemo } from 'react'
import * as THREE from 'three'
import { signGeometry, getSignMaterial } from '@/lib/signAtlas'
import { COLORS } from '@/lib/mapConfig'
import { signTexture, muralTexture, buntingTexture, glowTexture } from '@/lib/mapTextures'
import { BlackStar } from './Landmarks'
import { Building } from './Buildings'

// ─────────────────────────────────────────────── Black Star Gate (over road) ─
export function BlackStarGate({ position }: { position: [number, number, number] }) {
  const sign = useMemo(() => signTexture('BLACK STAR GATE', '#1a1a1a', '#fcd116'), [])
  return (
    <group position={position}>
      {[-5.8, 5.8].map((dz) => (
        <group key={dz} position={[0, 0, dz]}>
          <mesh position={[0, 4.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.6, 9.5, 2.6]} />
            <meshStandardMaterial color="#efe9dc" roughness={0.8} />
          </mesh>
          <mesh position={[0, 9.75, 0]} castShadow>
            <boxGeometry args={[3.2, 0.6, 3.2]} />
            <meshStandardMaterial color="#d9d0c0" roughness={0.85} />
          </mesh>
          <mesh position={[0, 10.35, 0]}>
            <sphereGeometry args={[0.3, 10, 10]} />
            <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* beam across the highway */}
      <mesh position={[0, 10.9, 0]} castShadow>
        <boxGeometry args={[2.6, 2, 14.6]} />
        <meshStandardMaterial color="#efe9dc" roughness={0.8} />
      </mesh>
      <mesh position={[0, 9.82, 0]}>
        <boxGeometry args={[2.7, 0.24, 14.7]} />
        <meshStandardMaterial color="#fcd116" metalness={0.45} roughness={0.4} />
      </mesh>
      {/* plaques facing both directions along the road */}
      {[1.38, -1.38].map((dx) => (
        <mesh key={dx} position={[dx, 10.9, 0]} rotation={[0, dx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[11, 1.5]} />
          <meshStandardMaterial map={sign} emissive="#666666" emissiveMap={sign} emissiveIntensity={0.7} />
        </mesh>
      ))}
      {/* black star crowning the gate */}
      <mesh position={[0, 12.15, 0]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.4]} />
        <meshStandardMaterial color="#d9d0c0" roughness={0.85} />
      </mesh>
      <BlackStar position={[0, 12.9, 0]} size={1.15} />
    </group>
  )
}

// ────────────────────────────────────────────── parade grandstand (faces +x) ─
export function Grandstand({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  // depth 8.4: the stand must fit between the ew1 and coastal carriageways
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.3, 8.4]} />
        <meshStandardMaterial color="#c9c2b2" roughness={0.9} />
      </mesh>
      {/* three stepped seat rows in national colors */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[1.5 - i * 1.7, 0.65 + i * 1.05, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.7, 8.2]} />
            <meshStandardMaterial color="#d8d2c4" roughness={0.85} />
          </mesh>
          <mesh position={[0.55, 0.45, 0]}>
            <boxGeometry args={[1.2, 0.16, 7.8]} />
            <meshStandardMaterial color={['#ce1126', '#fcd116', '#006b3f'][i]} roughness={0.75} />
          </mesh>
        </group>
      ))}
      {/* back wall */}
      <mesh position={[-2.9, 2.2, 0]} castShadow>
        <boxGeometry args={[0.4, 4, 8.2]} />
        <meshStandardMaterial color="#efe9dc" roughness={0.85} />
      </mesh>
      {/* canopy roof + posts */}
      <mesh position={[-1.2, 5.3, 0]} castShadow>
        <boxGeometry args={[6, 0.28, 8.6]} />
        <meshStandardMaterial color="#ce1126" roughness={0.6} />
      </mesh>
      {[-3.6, 0.8].map((rx) =>
        [-3.8, 3.8].map((rz) => (
          <mesh key={`${rx}-${rz}`} position={[rx, 2.9, rz]}>
            <cylinderGeometry args={[0.14, 0.14, 4.8, 6]} />
            <meshStandardMaterial color="#e8e2d4" />
          </mesh>
        ))
      )}
    </group>
  )
}

// ────────────────────────────────────────────────────── square floodlight ────
export function FloodlightMast({ position }: { position: [number, number, number] }) {
  const glow = useMemo(() => glowTexture('#fff6d8'), [])
  return (
    <group position={position}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.38, 12, 8]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 12.4, 0]} castShadow>
        <boxGeometry args={[3, 1.1, 0.4]} />
        <meshStandardMaterial color="#565b61" />
      </mesh>
      <mesh position={[0, 12.4, 0.24]}>
        <planeGeometry args={[2.7, 0.85]} />
        <meshStandardMaterial color="#fffbe8" emissive="#fff2c0" emissiveIntensity={2.4} side={THREE.DoubleSide} />
      </mesh>
      <sprite position={[0, 12.6, 0.5]} scale={[6.5, 6.5, 1]}>
        <spriteMaterial map={glow} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

// ─────────────────────────────────────────────── memorial reflecting pool ────
export function MemorialPool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[15, 0.5, 3.2]} />
        <meshStandardMaterial color="#cfc7b6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[13.8, 0.3, 2.4]} />
        <meshStandardMaterial color="#3fa4c4" emissive="#1a6a8a" emissiveIntensity={0.5} roughness={0.15} metalness={0.4} />
      </mesh>
      {[-4, 4].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.18, 0.24, 1.1, 8]} />
            <meshStandardMaterial color="#e9e3d5" />
          </mesh>
          <mesh position={[0, 1.42, 0]}>
            <sphereGeometry args={[0.3, 10, 10]} />
            <meshStandardMaterial color="#7fd0e8" transparent opacity={0.85} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ────────────────────────────────────── memorial park perimeter walls ────────
export function ParkWalls() {
  // south wall pulled north of the ew2 corridor (road north edge z = -27)
  const runs: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [-78.75, 0.45, -26.5], size: [26.5, 0.9, 0.5] },
    { pos: [-78.75, 0.45, 2], size: [26.5, 0.9, 0.5] },
    { pos: [-92, 0.45, -12.25], size: [0.5, 0.9, 28.5] },
    { pos: [-65.5, 0.45, -22.75], size: [0.5, 0.9, 7.5] },
    { pos: [-65.5, 0.45, -5.5], size: [0.5, 0.9, 15] },
  ]
  const corners: [number, number][] = [
    [-92, -26.5],
    [-65.5, -26.5],
    [-92, 2],
    [-65.5, 2],
  ]
  return (
    <group>
      {runs.map((r, i) => (
        <mesh key={i} position={r.pos} castShadow receiveShadow>
          <boxGeometry args={r.size} />
          <meshStandardMaterial color="#d9d0c0" roughness={0.9} />
        </mesh>
      ))}
      {corners.map(([x, z], i) => (
        <group key={`c-${i}`}>
          <mesh position={[x, 0.7, z]} castShadow>
            <boxGeometry args={[0.9, 1.4, 0.9]} />
            <meshStandardMaterial color="#cfc7b6" roughness={0.9} />
          </mesh>
          <mesh position={[x, 1.55, z]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────── park entrance gate (faces +x) ───────
export function ParkEntrance({ position }: { position: [number, number, number] }) {
  const sign = useMemo(() => signTexture('MEMORIAL PARK', '#006b3f', '#fcd116'), [])
  return (
    <group position={position}>
      {[-3, 3].map((dz) => (
        <mesh key={dz} position={[0, 1.9, dz]} castShadow>
          <boxGeometry args={[1, 3.8, 1]} />
          <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[0.7, 0.5, 7]} />
        <meshStandardMaterial color="#cfc7b6" roughness={0.85} />
      </mesh>
      <mesh position={[0.42, 3.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5.6, 1.15]} />
        <meshStandardMaterial map={sign} emissive="#555555" emissiveMap={sign} emissiveIntensity={0.6} />
      </mesh>
      <BlackStar position={[0, 4.75, 0]} size={0.5} />
    </group>
  )
}

// ──────────────────────────────────────────────────────────── market gate ────
export function MarketGate({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const tex = useMemo(() => signTexture('MAKOLA MARKET', '#ce1126', '#fcd116'), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-4, 4].map((dx) => (
        <mesh key={dx} position={[dx, 2.1, 0]} castShadow>
          <boxGeometry args={[0.55, 4.2, 0.55]} />
          <meshStandardMaterial color="#8a5c36" roughness={0.9} />
        </mesh>
      ))}
      {[0.1, -0.1].map((dz, i) => (
        <mesh key={dz} position={[0, 4.4, dz]} rotation={[0, i === 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[8.6, 1.5]} />
          <meshStandardMaterial map={tex} emissive="#553333" emissiveMap={tex} emissiveIntensity={0.7} />
        </mesh>
      ))}
      <BlackStar position={[0, 5.5, 0]} size={0.4} />
    </group>
  )
}

// ───────────────────────────────────────────────────── roadside kiosk ────────
export function Kiosk({ position, rotation = 0, sign, signBg, wall = COLORS.wallCream }: { position: [number, number, number]; rotation?: number; sign: string; signBg: string; wall?: string }) {
  // Task 13: sign drawn from the shared sign atlas (was one canvas texture +
  // one draw call per kiosk)
  const signGeo = useMemo(() => signGeometry(sign, signBg, '#111111', 2.4, 0.62), [sign, signBg])
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'kiosk' }}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.2, 2]} />
        <meshStandardMaterial color={wall} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.15, 1.02]}>
        <planeGeometry args={[2.2, 0.9]} />
        <meshStandardMaterial color="#2a2622" />
      </mesh>
      <mesh position={[0, 0.95, 1.25]}>
        <boxGeometry args={[2.6, 0.12, 0.6]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.95, 1.03]} geometry={signGeo} material={getSignMaterial()} />
      <mesh position={[0, 2.45, 0]} castShadow>
        <boxGeometry args={[3.6, 0.18, 2.6]} />
        <meshStandardMaterial color="#ce1126" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 0.8, 4]} />
        <meshStandardMaterial color="#e08a3c" roughness={0.75} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────── vendor table + umbrella ───────
export function VendorTable({ position, rotation = 0, colorIndex = 0 }: { position: [number, number, number]; rotation?: number; colorIndex?: number }) {
  const colors = ['#e2372f', '#2e7fa8', '#fcd116', '#4f9e4f', '#d97b8f']
  const color = colors[colorIndex % colors.length]
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'stall' }}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2.2, 0.14, 1.4]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.9} />
      </mesh>
      {[
        [-0.9, -0.5],
        [0.9, -0.5],
        [-0.9, 0.5],
        [0.9, 0.5],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.4, pz]}>
          <boxGeometry args={[0.12, 0.8, 0.12]} />
          <meshStandardMaterial color="#6b4a2f" />
        </mesh>
      ))}
      {[-0.6, 0, 0.6].map((gx, i) => (
        <mesh key={gx} position={[gx, 0.96, 0]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color={['#e2762d', '#d9b23c', '#4f9e4f'][i]} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2, 6]} />
        <meshStandardMaterial color="#c8c8c8" />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[1.3, 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────── market props: baskets / crates ────────
export function BasketStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 0.42, 0.84].map((y, i) => (
        <mesh key={y} position={[0, y + 0.3, 0]} rotation={[0, i * 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.52 - i * 0.04, 0.4 - i * 0.04, 0.42, 10]} />
          <meshStandardMaterial color={['#b58a4e', '#a5793f', '#c9995e'][i]} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

export function CrateStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[
        [0, 0.25, 0],
        [0, 0.75, 0.05],
        [0.15, 0.5, -0.7],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.3, 0]} castShadow>
          <boxGeometry args={[0.75, 0.5, 0.75]} />
          <meshStandardMaterial color={i === 2 ? '#e08a3c' : '#c9a25e'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────── fabric-bolt rack (market stalls) ────
export function FabricRack({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const bolts = ['#ce1126', '#fcd116', '#006b3f', '#2e7fa8', '#d4557a', '#e08a3c']
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1.3, 1.3].map((dx) => (
        <mesh key={dx} position={[dx, 1.4, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 2.8, 6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.82, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 2.7, 6]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      {bolts.map((col, i) => (
        <mesh key={i} position={[-1.05 + i * 0.42, 2.35, 0]} castShadow>
          <boxGeometry args={[0.3, 0.85, 0.12]} />
          <meshStandardMaterial color={col} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────────── street-art mural wall ─────
export function Mural({ position, rotation = 0, w = 6, h = 2, variant = 0 }: { position: [number, number, number]; rotation?: number; w?: number; h?: number; variant?: number }) {
  const tex = useMemo(() => muralTexture(variant), [variant])
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissive="#333333" emissiveMap={tex} emissiveIntensity={0.35} />
    </mesh>
  )
}

// ─────────────────────────────── historic colonial building (2 storeys) ──────
export function ColonialBuilding({ position, rotation = 0, wall }: { position: [number, number, number]; rotation?: number; wall: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'building' }}>
      <Building position={[0, 3, 0]} size={[8, 6, 6]} wall={wall} facadeKey={`colonial-${wall}`} rows={2} cols={4} litRatio={0.65} />
      <mesh position={[0, 6.15, 0]} castShadow>
        <boxGeometry args={[8.4, 0.35, 6.4]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.85} />
      </mesh>
      {/* balcony */}
      <mesh position={[0, 3.1, 3.25]} castShadow>
        <boxGeometry args={[7.4, 0.16, 1.1]} />
        <meshStandardMaterial color="#e8dcc2" roughness={0.85} />
      </mesh>
      {[-3.2, -1.1, 1.1, 3.2].map((dx) => (
        <mesh key={dx} position={[dx, 3.55, 3.72]}>
          <boxGeometry args={[0.08, 0.75, 0.08]} />
          <meshStandardMaterial color="#5b4a38" />
        </mesh>
      ))}
      <mesh position={[0, 3.92, 3.72]}>
        <boxGeometry args={[7.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#5b4a38" />
      </mesh>
      {/* ground-floor arcade */}
      {[-2.5, 0, 2.5].map((dx) => (
        <mesh key={dx} position={[dx, 1.15, 3.04]}>
          <planeGeometry args={[1.4, 2.3]} />
          <meshStandardMaterial color="#3d3227" />
        </mesh>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────── Jamestown boxing gym ─
export function BoxingGym({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const sign = useMemo(() => signTexture('BOXING GYM', '#ce1126', '#ffffff'), [])
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'gym' }}>
      <Building position={[0, 2.25, 0]} size={[7, 4.5, 6]} wall="#e8dcc2" facadeKey="boxing-gym" rows={1} cols={3} litRatio={0.75} />
      <mesh position={[0, 4.65, 0]} castShadow>
        <boxGeometry args={[7.4, 0.3, 6.4]} />
        <meshStandardMaterial color="#8a8378" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.6, 3.06]}>
        <planeGeometry args={[5.6, 1.1]} />
        <meshStandardMaterial map={sign} emissive="#662222" emissiveMap={sign} emissiveIntensity={0.8} />
      </mesh>
      {[-1.8, 1.8].map((dx) => (
        <group key={dx} position={[dx, 0, 2.6]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 2.6, 6]} />
            <meshStandardMaterial color="#5b4a38" />
          </mesh>
          <mesh position={[0, 1.35, 0.25]}>
            <capsuleGeometry args={[0.28, 0.85, 4, 8]} />
            <meshStandardMaterial color="#8a2a20" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────── festival bunting string ─────────
export function Bunting({ position, rotation = 0, length = 20 }: { position: [number, number, number]; rotation?: number; length?: number }) {
  const tex = useMemo(() => buntingTexture(), [])
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <planeGeometry args={[length, length / 10.7]} />
      <meshStandardMaterial map={tex} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.8} />
    </mesh>
  )
}

// ─────────────────────────────────────────────── courtyard string lights ─────
export function StringLights({ position, rotation = 0, span = 6, count = 5 }: { position: [number, number, number]; rotation?: number; span?: number; count?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-span / 2, span / 2].map((dz) => (
        <mesh key={dz} position={[0, 1.9, dz]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 3.8, 6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, span, 4]} />
        <meshStandardMaterial color="#2a2622" />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, 3.42 + Math.sin(((i + 0.5) / count) * Math.PI) * 0.18, -span / 2 + (span * (i + 0.5)) / count]}>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color="#ffe2a8" emissive="#ffc86e" emissiveIntensity={2.4} />
        </mesh>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────── beach food stall ─────
export function BeachStall({ position, rotation = 0, sign, roofColor = '#d8b56a' }: { position: [number, number, number]; rotation?: number; sign: string; roofColor?: string }) {
  const signGeo = useMemo(() => signGeometry(sign, '#fcd116', '#1a1a1a', 2.6, 0.6), [sign])
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'hut' }}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.2, 2]} />
        <meshStandardMaterial color="#e8dcc2" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, 1.02]}>
        <planeGeometry args={[2.4, 1]} />
        <meshStandardMaterial color="#2a2622" />
      </mesh>
      <mesh position={[0, 2, 1.05]} geometry={signGeo} material={getSignMaterial()} />
      <mesh position={[0, 2.75, 0]} castShadow>
        <coneGeometry args={[2.5, 1.2, 8]} />
        <meshStandardMaterial color={roofColor} roughness={0.95} />
      </mesh>
      <mesh position={[-0.6, 1.55, 1.1]}>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#e2762d" roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 1.55, 1.05]}>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshStandardMaterial color="#4f9e4f" roughness={0.8} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────── beach lounger ─────
export function Lounger({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.75, 0.14, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, -0.75]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.75, 0.12, 0.8]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
      </mesh>
      {[-0.28, 0.28].map((dx) => (
        <mesh key={dx} position={[dx, 0.1, 0.4]}>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color="#c8c8c8" />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────── volleyball court ────
export function VolleyballCourt({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-3.5, 3.5].map((dx) => (
        <mesh key={dx} position={[dx, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 2.6, 6]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[7, 0.1, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <planeGeometry args={[7, 0.72]} />
        <meshStandardMaterial color="#f4f1ea" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────── banner gate (posts + overhead sign) ─
export function BannerGate({ position, rotation = 0, text, bg, fg = '#ffffff', width = 10 }: { position: [number, number, number]; rotation?: number; text: string; bg: string; fg?: string; width?: number }) {
  const signGeo = useMemo(() => signGeometry(text, bg, fg, width + 1.2, 1.7), [text, bg, fg, width])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-width / 2, width / 2].map((dx) => (
        <mesh key={dx} position={[dx, 2.8, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 5.6, 8]} />
          <meshStandardMaterial color="#4a4f55" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      {[0.08, -0.08].map((dz, i) => (
        <mesh key={dz} position={[0, 5, dz]} rotation={[0, i === 0 ? 0 : Math.PI, 0]} geometry={signGeo} material={getSignMaterial()} />
      ))}
    </group>
  )
}

// ────────────────────────────────────────── utility pole + overhead wires ────
export function UtilityPole({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 6.8, 7]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color="#5b4a38" />
      </mesh>
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[0.08, 0.08, 1.5]} />
        <meshStandardMaterial color="#5b4a38" />
      </mesh>
      {[-0.8, 0.8].map((dz) => (
        <mesh key={dz} position={[0, 6.22, dz]}>
          <cylinderGeometry args={[0.04, 0.04, 0.22, 6]} />
          <meshStandardMaterial color="#3c4046" />
        </mesh>
      ))}
    </group>
  )
}

export function Wire({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const len = Math.max(dir.length(), 0.01)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.03, 0.03, len, 4]} />
      <meshStandardMaterial color="#22252a" roughness={0.8} />
    </mesh>
  )
}

// ───────────────────────────────────────────────────────────── community hall
export function ChurchHall({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const sign = useMemo(() => signTexture('CHURCH', '#f4f1ea', '#006b3f'), [])
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'building' }}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 4, 5.5]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.9, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.28, 1, 0.78]} castShadow>
        <coneGeometry args={[4.6, 1.8, 4]} />
        <meshStandardMaterial color={COLORS.roofTerracotta} roughness={0.8} />
      </mesh>
      <mesh position={[0, 6.35, 0]}>
        <boxGeometry args={[0.16, 1.2, 0.16]} />
        <meshStandardMaterial color="#fcd116" emissive="#b08a10" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 6.6, 0]}>
        <boxGeometry args={[0.6, 0.16, 0.16]} />
        <meshStandardMaterial color="#fcd116" />
      </mesh>
      {[-3, -1.5, 1.5, 3].map((dx) => (
        <mesh key={dx} position={[dx, 1.9, 2.78]}>
          <planeGeometry args={[0.8, 1.7]} />
          <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 2.79]}>
        <planeGeometry args={[1.3, 2.2]} />
        <meshStandardMaterial color="#5b3d28" />
      </mesh>
      <mesh position={[0, 2.5, 2.83]}>
        <planeGeometry args={[2.6, 0.7]} />
        <meshStandardMaterial map={sign} emissive="#444444" emissiveMap={sign} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 3.35, 2.78]}>
        <circleGeometry args={[0.5, 12]} />
        <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────── parking deck ────
export function ParkingDeck({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ bldg: 'building' }}>
      {[-3.2, 3.2].map((dx) =>
        [-2.2, 2.2].map((dz) => (
          <mesh key={`${dx}-${dz}`} position={[dx, 2.4, dz]} castShadow>
            <boxGeometry args={[0.6, 4.8, 0.6]} />
            <meshStandardMaterial color="#b8b2a4" roughness={0.85} />
          </mesh>
        ))
      )}
      {[1.3, 3.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[8.4, 0.45, 6]} />
          <meshStandardMaterial color="#9d968a" roughness={0.9} />
        </mesh>
      ))}
      {/* entry ramp: low end must LAND on the ground (was hanging ~1.4 m) —
          spans deck edge (x 4.2, y≈1.3) down to grade (x≈8.2, y≈0.11) */}
      <mesh position={[6.2, 0.72, 0]} rotation={[0, 0, -0.28]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.3, 3]} />
        <meshStandardMaterial color="#8d867a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.7, 0]} castShadow>
        <boxGeometry args={[8.6, 0.5, 6.2]} />
        <meshStandardMaterial color="#565b61" roughness={0.8} />
      </mesh>
    </group>
  )
}
