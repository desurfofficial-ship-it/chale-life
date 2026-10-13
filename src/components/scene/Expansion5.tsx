'use client'

// ─── Phase 3 world dressing: transport infrastructure, coastal detail,
// ─── landmark polish, airport operations, everyday infill.
// Environment only — no vehicles, no gameplay.
import { useMemo } from 'react'
import * as THREE from 'three'
import { COLORS } from '@/lib/mapConfig'
import { glowTexture, signTexture } from '@/lib/mapTextures'
import { Kiosk, VendorTable, BasketStack } from './Expansion3'
import { Person, GhanaFlag, StreetLamp } from './Nature'
import { CompoundHouse } from './Buildings'

// ────────────────────────────────────────────────── roadside guardrail ──────
export function Guardrail({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [x0, z0] = from
  const [x1, z1] = to
  const dx = x1 - x0
  const dz = z1 - z0
  const len = Math.max(Math.hypot(dx, dz), 0.01)
  const ang = Math.atan2(dx, dz)
  const posts = Math.max(2, Math.round(len / 5) + 1)
  return (
    <group>
      {Array.from({ length: posts }).map((_, i) => {
        const t = i / (posts - 1)
        return (
          <mesh key={i} position={[x0 + dx * t, 0.45, z0 + dz * t]} castShadow>
            <boxGeometry args={[0.14, 0.9, 0.14]} />
            <meshStandardMaterial color="#6d747c" metalness={0.5} roughness={0.5} />
          </mesh>
        )
      })}
      <group position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[0, ang, 0]}>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.1, 0.22, len]} />
          <meshStandardMaterial color="#9aa2aa" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[0.1, 0.2, len]} />
          <meshStandardMaterial color="#9aa2aa" metalness={0.55} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

// ──────────────────────────────────────────────────────── bus stop shelter ──
export function BusStop({ position, rotation = 0, sign = 'BUS STOP' }: { position: [number, number, number]; rotation?: number; sign?: string }) {
  const tex = useMemo(() => signTexture(sign, '#006b3f', '#fcd116'), [sign])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* back wall + bench */}
      <mesh position={[0, 1.05, -1]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.1, 0.24]} />
        <meshStandardMaterial color="#e9e3d5" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, -0.55]} castShadow>
        <boxGeometry args={[3.4, 0.14, 0.7]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.85} />
      </mesh>
      {[-1.5, 1.5].map((dx) => (
        <mesh key={dx} position={[dx, 0.31, -0.55]}>
          <boxGeometry args={[0.12, 0.62, 0.6]} />
          <meshStandardMaterial color="#3c4046" />
        </mesh>
      ))}
      {/* roof + posts */}
      <mesh position={[0, 2.5, -0.4]} castShadow>
        <boxGeometry args={[4.8, 0.2, 2.4]} />
        <meshStandardMaterial color="#ce1126" roughness={0.65} />
      </mesh>
      {[-2, 2].map((dx) => (
        <mesh key={dx} position={[dx, 1.25, 0.3]}>
          <cylinderGeometry args={[0.09, 0.09, 2.5, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      {/* route sign */}
      <mesh position={[2.15, 2.9, 0.3]} rotation={[0, -0.35, 0]}>
        <planeGeometry args={[1.7, 0.5]} />
        <meshStandardMaterial map={tex} emissive="#334433" emissiveMap={tex} emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────── street name sign (two facing plates) ─
export function StreetSign({ position, rotation = 0, text }: { position: [number, number, number]; rotation?: number; text: string }) {
  const tex = useMemo(() => signTexture(text, '#1d6b3f', '#ffffff'), [text])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
        <meshStandardMaterial color="#4a4f55" metalness={0.4} roughness={0.5} />
      </mesh>
      {[0.06, -0.06].map((dz, i) => (
        <mesh key={dz} position={[0, 3.05, dz]} rotation={[0, i === 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[2.6, 0.62]} />
          <meshStandardMaterial map={tex} emissive="#224422" emissiveMap={tex} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────── pedestrian footbridge (ew2) ──
export function PedestrianBridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* columns */}
      {[-5.6, 5.6].map((dz) =>
        [-1.1, 1.1].map((dx) => (
          <mesh key={`${dz}-${dx}`} position={[dx, 1.7, dz]} castShadow>
            <cylinderGeometry args={[0.26, 0.34, 3.4, 8]} />
            <meshStandardMaterial color="#b8b2a4" roughness={0.85} />
          </mesh>
        ))
      )}
      {/* deck */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.28, 12.4]} />
        <meshStandardMaterial color="#9a744a" roughness={0.9} />
      </mesh>
      {/* railings */}
      {[-1.42, 1.42].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 4.15, 0]}>
            <boxGeometry args={[0.08, 0.09, 12.4]} />
            <meshStandardMaterial color="#d8b56a" />
          </mesh>
          {[-5.4, -2.7, 0, 2.7, 5.4].map((dz) => (
            <mesh key={dz} position={[dx, 3.85, dz]}>
              <boxGeometry args={[0.06, 0.75, 0.06]} />
              <meshStandardMaterial color="#6b4a2f" />
            </mesh>
          ))}
        </group>
      ))}
      {/* access ramps */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.9, s * 7.4]} rotation={[s * 0.42, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.2, 4.4]} />
          <meshStandardMaterial color="#8a6a44" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ──────────────────────────────────────────────────────────────── bollard ───
export function Bollard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 1, 8]} />
        <meshStandardMaterial color="#3c4046" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.04, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────────────── hedge planter
export function HedgePlanter({ position, w = 3, d = 1.4 }: { position: [number, number, number]; w?: number; d?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.3, 0.6, d + 0.3]} />
        <meshStandardMaterial color="#b3745a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[w, 0.7, d]} />
        <meshStandardMaterial color="#3e8f4a" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────── warm night glow (emissive) ───
export function NightGlow({ position, scale = 8, color = '#ffd9a0', opacity = 0.2 }: { position: [number, number, number]; scale?: number; color?: string; opacity?: number }) {
  const glow = useMemo(() => glowTexture(color), [color])
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={glow} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  )
}

// ─────────────────────────────────────────────── Nkrumah memorial statue ────
export function NkrumahStatue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.15, 1.2, 12]} />
        <meshStandardMaterial color="#d9d0c0" roughness={0.85} />
      </mesh>
      {/* bronze standing figure */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.85, 4, 10]} />
        <meshStandardMaterial color="#6e5a34" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.72, 0]} castShadow>
        <sphereGeometry args={[0.24, 10, 10]} />
        <meshStandardMaterial color="#6e5a34" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* raised-right-arm pose hint */}
      <mesh position={[0.28, 2.42, 0.1]} rotation={[0, 0, -0.9]} castShadow>
        <capsuleGeometry args={[0.09, 0.55, 3, 8]} />
        <meshStandardMaterial color="#6e5a34" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* low plinth ring */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 1.8, 0.16, 16]} />
        <meshStandardMaterial color="#cfc7b6" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────── castle entrance gate ───
export function CastleGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-2.2, 2.2].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 1.7, 0]} castShadow>
            <boxGeometry args={[0.9, 3.4, 0.9]} />
            <meshStandardMaterial color="#f2ede2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.55, 0]} castShadow>
            <boxGeometry args={[1.2, 0.35, 1.2]} />
            <meshStandardMaterial color="#d9d0c0" roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.9, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[3.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#f2ede2" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function LowWall({ position, rotation = 0, length = 8 }: { position: [number, number, number]; rotation?: number; length?: number }) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 1, 0.45]} />
      <meshStandardMaterial color="#e9e3d5" roughness={0.9} />
    </mesh>
  )
}

// ─────────────────────────────────────────────── small mosque fountain ──────
export function MosqueFountain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.6, 0.7, 8]} />
        <meshStandardMaterial color="#cfc7b6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.12, 8]} />
        <meshStandardMaterial color="#3fa4c4" emissive="#1a6a8a" emissiveIntensity={0.5} roughness={0.15} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.7, 8]} />
        <meshStandardMaterial color="#e9e3d5" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#7fd0e8" transparent opacity={0.85} roughness={0.1} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────── fishing net drying frame ───────
export function NetFrame({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1.5, 1.5].map((dx) => (
        <mesh key={dx} position={[dx, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 2.2, 6]} />
          <meshStandardMaterial color="#8a6a44" roughness={0.95} />
        </mesh>
      ))}
      {/* draped net (translucent grid plane) */}
      <mesh position={[0, 1.55, 0]} rotation={[0.06, 0, 0.04]}>
        <planeGeometry args={[3, 1.7]} />
        <meshStandardMaterial color="#cfd6da" transparent opacity={0.45} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.32, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 3.1, 5]} />
        <meshStandardMaterial color="#8a6a44" />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────── windsock ───
export function Windsock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 5.2, 6]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.55, 5.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.34, 1.2, 8, 1, true]} />
        <meshStandardMaterial color="#e8622a" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.1, 5.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.34, 0.5, 8, 1, true]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────── baggage cart ───────
export function BaggageCart({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.2, 0.16, 1.3]} />
        <meshStandardMaterial color="#c9c2b2" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[-0.5, 0.85, 0]} castShadow>
        <boxGeometry args={[0.7, 0.45, 0.9]} />
        <meshStandardMaterial color="#7a4a2e" roughness={0.85} />
      </mesh>
      <mesh position={[0.35, 0.85, 0.1]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.8]} />
        <meshStandardMaterial color="#3c4046" roughness={0.8} />
      </mesh>
      <mesh position={[0.35, 1.15, 0.1]} castShadow>
        <boxGeometry args={[0.5, 0.28, 0.6]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.85} />
      </mesh>
      {[-0.9, 0.9].map((dx) =>
        [-0.55, 0.55].map((dz) => (
          <mesh key={`${dx}-${dz}`} position={[dx, 0.26, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.18, 8]} />
            <meshStandardMaterial color="#1c1e22" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* draw bar */}
      <mesh position={[1.35, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
        <meshStandardMaterial color="#666" metalness={0.4} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────── cargo pallet ───
export function CargoPallet({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.16, 1.4]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[1.5, 0.8, 1.1]} />
        <meshStandardMaterial color="#c9a25e" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 1.24, -0.05]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 0.9]} />
        <meshStandardMaterial color="#e08a3c" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────── airport cargo/freight shed ───
export function CargoShed({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'building' }}>
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 3.4, 5]} />
        <meshStandardMaterial color="#c9c2b2" roughness={0.85} />
      </mesh>
      {/* corrugated roof */}
      <mesh position={[0, 3.65, 0]} castShadow>
        <boxGeometry args={[8.7, 0.5, 5.7]} />
        <meshStandardMaterial color="#7c828a" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* roller doors */}
      {[-2, 2].map((dx) => (
        <mesh key={dx} position={[dx, 1.3, 2.53]}>
          <planeGeometry args={[2.2, 2.4]} />
          <meshStandardMaterial color="#5e6a72" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 1.05, 2.56]}>
        <planeGeometry args={[6.6, 0.4]} />
        <meshStandardMaterial color="#e8b83a" />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────── airport perimeter fence ────
const FENCE_RUNS: [number, number, number, number][] = [
  // north side: west of apron (runway edge), jog up around the apron,
  // gaps at the terminal front, jog back down east of the apron
  [-46, -101.5, -20, -101.5],
  [-14, -101.5, 4, -101.5], // pedestrian gate onto the runway (6 m, west apron)
  [4, -101.5, 4, -90.6],   // west jog wraps around the re-parked airliner
  [4, -90.6, 17, -90.6],   // west apron south run (along the airport road)
  [43, -95, 52, -95],
  [52, -95, 52, -101.5],
  [52, -101.5, 136, -101.5],
  // close the rectangle around the runway
  [136, -101.5, 136, -112],
  [-46, -112, 136, -112],
  [-46, -101.5, -46, -112],
]

export function AirportFence() {
  return (
    <group>
      {FENCE_RUNS.map(([x0, z0, x1, z1], i) => {
        const dx = x1 - x0
        const dz = z1 - z0
        const len = Math.hypot(dx, dz)
        const ang = Math.atan2(dx, dz)
        const posts = Math.max(2, Math.round(len / 7) + 1)
        return (
          <group key={i}>
            {Array.from({ length: posts }).map((_, p) => {
              const t = p / (posts - 1)
              return (
                <mesh key={p} position={[x0 + dx * t, 0.9, z0 + dz * t]} castShadow>
                  <boxGeometry args={[0.12, 1.8, 0.12]} />
                  <meshStandardMaterial color="#8a9096" metalness={0.5} roughness={0.5} />
                </mesh>
              )
            })}
            <group position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[0, ang, 0]}>
              <mesh position={[0, 1.55, 0]}>
                <boxGeometry args={[0.06, 0.12, len]} />
                <meshStandardMaterial color="#767d84" metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.9, 0]}>
                <boxGeometry args={[0.06, 0.1, len]} />
                <meshStandardMaterial color="#767d84" metalness={0.5} roughness={0.5} />
              </mesh>
              {/* chain-link hint */}
              <mesh position={[0, 1.2, 0]}>
                <planeGeometry args={[len, 1.2]} />
                <meshStandardMaterial color="#9aa2aa" transparent opacity={0.16} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}

// ═══════════════════════════════════════════════ PHASE 3 COMPOSITION ═══════
export function Phase3World() {
  const ewPoles: [number, number][] = [
    [-108, -86],
    [-86, -74],
    [-74, -52],
    [-52, -24],
    [-24, 6],
    [6, 26],
    [26, 48],
    [48, 68],
    [68, 88],
  ]
  return (
    <group>
      {/* ═══ A. transport infrastructure ═══ */}
      <group>
        {/* utility poles + overhead wires along the ew1 south service lane */}
        {[-108, -86, -74, -52, -24, 6, 26, 48, 68, 88].map((x) => (
          <group key={`up-${x}`} position={[x, 0, 16.5]}>
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
          </group>
        ))}
        {ewPoles.map(([a, b], i) => (
          <group key={`uw-${i}`}>
            <mesh position={[(a + b) / 2, 6.05, 16.5]}>
              <boxGeometry args={[Math.abs(b - a), 0.045, 0.045]} />
              <meshStandardMaterial color="#22252a" roughness={0.8} />
            </mesh>
            <mesh position={[(a + b) / 2, 5.5, 16.5]}>
              <boxGeometry args={[Math.abs(b - a), 0.04, 0.04]} />
              <meshStandardMaterial color="#22252a" roughness={0.8} />
            </mesh>
          </group>
        ))}
        {/* bus stops + trotro shelter signs */}
        <BusStop position={[-80, 0, 17.6]} sign="TROTRO" />
        <BusStop position={[44, 0, 17.6]} sign="BUS STOP" />
        <BusStop position={[103, 0, 17.6]} sign="BUS STOP" />
        {/* street name signs at key junctions */}
        <StreetSign position={[-52, 0, 3.8]} text="INDEPENDENCE AVE" />
        <StreetSign position={[65.1, 0, 4]} rotation={Math.PI / 2} text="OXFORD ST" />
        <StreetSign position={[26, 0, -80.9]} text="AIRPORT RD" />
        <StreetSign position={[20, 0, 33.1]} text="LABADI RD" />
        <StreetSign position={[-66, 0, 3.8]} text="ACCRA HIGH ST" />
        {/* pedestrian bridge over ew2 */}
        <PedestrianBridge position={[48, 0, -31.5]} />
        {/* ceremonial bollards framing the Black Star Gate approach */}
        {([[-52.5, 1.8], [-51.5, 1.8], [-44.5, 1.8], [-43.5, 1.8], [-52.5, 18.4], [-43.5, 18.4]] as [number, number][]).map(([x, z], i) => (
          <Bollard key={i} position={[x, 0, z]} />
        ))}
        {/* guardrails */}
        <Guardrail from={[100, 34]} to={[130, 34]} />
        <Guardrail from={[-30, -92.2]} to={[10, -92.2]} />
      </group>

      {/* ═══ B. coastal + marine dressing ═══ */}
      <group>
        <NetFrame position={[-131, 0, 31]} />
        <NetFrame position={[-136, 0, 31.4]} rotation={0.12} />
        <VendorTable position={[-141, 0, 31.5]} colorIndex={1} rotation={-0.2} />
        <VendorTable position={[-128, 0, 31.2]} colorIndex={4} rotation={0.3} />
        <BasketStack position={[-143, 0, 31.8]} />
        <BasketStack position={[-126.5, 0, 30.8]} />
        <Person position={[-142, 0, 30.2]} rotation={0.4} />
        <Person position={[-130, 0, 30]} rotation={2.4} />
        {/* lagoon reed clusters */}
        {([[67, 17.5], [93, 19.5], [80, 22.6], [80, 14.4]] as [number, number][]).map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            {[[-0.3, 0], [0.1, 0.25], [0.35, -0.15]].map(([ox, oz], j) => (
              <mesh key={j} position={[ox, 0.55, oz]} rotation={[0.08 * j, 0, 0.06 * (j - 1)]}>
                <coneGeometry args={[0.09, 1.3, 5]} />
                <meshStandardMaterial color="#4f7d3a" roughness={0.9} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ═══ C. landmark polish ═══ */}
      <group>
        {/* Kwame Nkrumah statue in the memorial park forecourt */}
        <NkrumahStatue position={[-78, 0, -15]} />
        {/* Osu Castle entrance: gate + boundary walls */}
        <CastleGate position={[130, 0, 32.6]} />
        <LowWall position={[122.5, 0.5, 32.6]} length={9} />
        <LowWall position={[137.5, 0.5, 32.6]} length={9} />
        {/* mosque courtyard fountain + shade palms */}
        <MosqueFountain position={[-64.5, 0, -58]} />
        {/* National Theatre plaza dressing */}
        <StreetLamp position={[107, 0, -25]} rotation={Math.PI} />
        <StreetLamp position={[117, 0, -25]} rotation={0} />
        <GhanaFlag position={[112, 0, -27]} scale={0.8} />
        {/* stadium ticket booths + queue bollards */}
        <Kiosk position={[131, 0, -76]} sign="TICKETS" signBg="#ce1126" />
        <Kiosk position={[148, 0, -76]} sign="GATE 2" signBg="#2e7fa8" />
        {([124, 127, 133, 136, 143, 146, 152].map((x, i) => [x, -72.4 + (i % 2) * 0.5]) as [number, number][]).map(([x, z], i) => (
          <Bollard key={i} position={[x, 0, z]} />
        ))}
        <Person position={[133, 0, -75]} rotation={1.2} />
        <Person position={[146, 0, -74.5]} rotation={4.2} />
        {/* Black Star Square corner hedges */}
        <HedgePlanter position={[-92.5, 0, 19]} />
        <HedgePlanter position={[-35.5, 0, 19]} />
        {/* dusk glow on the monuments (emissive sprites, no real lights) */}
        <NightGlow position={[-65, 6.5, 18.5]} scale={11} opacity={0.22} />
        <NightGlow position={[-48, 8.5, 10]} scale={8} opacity={0.18} />
        <NightGlow position={[135, 3.5, 38]} scale={8} opacity={0.14} />
        <NightGlow position={[-58, 3.5, -58]} scale={7} opacity={0.12} />
      </group>

      {/* ═══ D. airport operations ═══ */}
      <group>
        <AirportFence />
        <Windsock position={[48, 0, -97]} />
        <BaggageCart position={[5.5, 0, -100.3]} rotation={0.3} />
        <BaggageCart position={[3.5, 0, -101.3]} rotation={-0.2} />
        <CargoPallet position={[44, 0, -98]} rotation={0.2} />
        <CargoPallet position={[47, 0, -99.5]} rotation={-0.35} />
        <CargoShed position={[-20, 0, -97.5]} />
        <CargoShed position={[-38, 0, -97.5]} rotation={Math.PI} />
        <Person position={[-14, 0, -94]} rotation={2.2} />
        <Person position={[-30, 0, -94.5]} rotation={0.8} />
      </group>

      {/* ═══ E. everyday infill ═══ */}
      <group>
        {/* walled home on the castle approach — its twin moved into the Teshie
            mid row (Neighborhoods) after the old x 122 plot put the house AND
            its yard wall across the nsE1 spine */}
        <CompoundHouse position={[110, 0, -6]} wall={COLORS.wallCream} w={6.2} d={5.6} h={3.8} variant={3} roof="metal" walled />
        {/* roadside kiosks on the ew1 south lawn (moved 0.9 m north so the
            umbrellas clear the coastal road paint) */}
        <Kiosk position={[-2, 0, 21.6]} sign="FRUITS" signBg="#4f9e4f" wall={COLORS.wallTeal} />
        <Kiosk position={[12, 0, 21.6]} rotation={0.06} sign="ICE WATER" signBg="#2e7fa8" wall={COLORS.wallPink} />
        <Person position={[-5.8, 0, 22.8]} rotation={1.7} />
        <Person position={[14.5, 0, 19.6]} rotation={3.4} />
        <Person position={[0.5, 0, 22.8]} rotation={0.3} />
      </group>
    </group>
  )
}
