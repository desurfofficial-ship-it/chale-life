'use client'

// ─── Expansion landmarks II: playground, castle, theatre, fun zone,
// ─── purple-roof apartments, mosque, bridge, rocks, billboard, balloon.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '@/lib/mapConfig'
import { markAnimated, unmarkAnimated } from '../world/SceneBatcher'
import { signTexture, balloonTexture, glowTexture } from '@/lib/mapTextures'
import { BlackStar } from './Landmarks'
import { Building } from './Buildings'
import { GhanaFlag } from './Nature'

// ──────────────────────────────────────────────── kids playground ───────────
export function Playground({ position }: { position: [number, number, number] }) {
  const pickets = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let x = -6.5; x <= 6.5; x += 1) {
      // gate gap (2 m) in the +z fence so the playground is walkable-in
      if (Math.abs(x) > 1) pts.push([x, 0.45, 4.5])
      pts.push([x, 0.45, -4.5])
    }
    for (let z = -3.5; z <= 3.5; z += 1) pts.push([-6.5, 0.45, z], [6.5, 0.45, z])
    return pts
  }, [])
  return (
    <group position={position}>
      {/* white picket fence */}
      {pickets.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.16, 0.9, 0.16]} />
          <meshStandardMaterial color="#f8f6f0" roughness={0.7} />
        </mesh>
      ))}
      {/* rails: back rail + split front rails (gate gap) + sides */}
      <mesh position={[0, 0.75, -4.5]}>
        <boxGeometry args={[13.2, 0.12, 0.1]} />
        <meshStandardMaterial color="#f8f6f0" />
      </mesh>
      {[-3.8, 3.8].map((x) => (
        <mesh key={`hzf${x}`} position={[x, 0.75, 4.5]}>
          <boxGeometry args={[5.5, 0.12, 0.1]} />
          <meshStandardMaterial color="#f8f6f0" />
        </mesh>
      ))}
      {[-6.5, 6.5].map((x) => (
        <mesh key={`vt${x}`} position={[x, 0.75, 0]}>
          <boxGeometry args={[0.1, 0.12, 9.2]} />
          <meshStandardMaterial color="#f8f6f0" />
        </mesh>
      ))}
      {/* slide: ladder + platform + chute */}
      <group position={[-3.4, 0, -0.5]}>
        <mesh position={[0, 0.85, 0.9]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[1.15, 0.14, 3.1]} />
          <meshStandardMaterial color="#e85d2a" roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.7, -1.1]} castShadow>
          <boxGeometry args={[1.3, 0.16, 1.2]} />
          <meshStandardMaterial color="#f4a52a" roughness={0.6} />
        </mesh>
        {[-0.5, 0.5].map((dx) => (
          <mesh key={dx} position={[dx, 0.85, -1.65]}>
            <boxGeometry args={[0.1, 1.7, 0.1]} />
            <meshStandardMaterial color="#e85d2a" />
          </mesh>
        ))}
        {[-0.5, 0.5].map((dx) => (
          <mesh key={`l${dx}`} position={[dx, 1.7, -1.65]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#f4a52a" />
          </mesh>
        ))}
      </group>
      {/* swing frame */}
      <group position={[2.6, 0, -1.2]}>
        {[-1.6, 1.6].map((dx) => (
          <group key={dx} position={[dx, 0, 0]}>
            <mesh position={[-0.55, 1.15, 0]} rotation={[0, 0, 0.42]}>
              <cylinderGeometry args={[0.07, 0.07, 2.6, 6]} />
              <meshStandardMaterial color="#3aa08f" />
            </mesh>
            <mesh position={[0.55, 1.15, 0]} rotation={[0, 0, -0.42]}>
              <cylinderGeometry args={[0.07, 0.07, 2.6, 6]} />
              <meshStandardMaterial color="#3aa08f" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 3.6, 6]} />
          <meshStandardMaterial color="#3aa08f" />
        </mesh>
        {[-0.8, 0.8].map((dx) => (
          <group key={dx} position={[dx, 0, 0]}>
            <mesh position={[0, 1.45, 0]}>
              <boxGeometry args={[0.05, 1.6, 0.05]} />
              <meshStandardMaterial color="#5b3d28" />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <boxGeometry args={[0.5, 0.1, 0.26]} />
              <meshStandardMaterial color="#f4a52a" />
            </mesh>
          </group>
        ))}
      </group>
      {/* seesaw */}
      <group position={[3.4, 0, 2]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.4, 0.7, 0.4]} />
          <meshStandardMaterial color="#b3745a" />
        </mesh>
        <mesh position={[0, 0.78, 0]} rotation={[0, 0, 0.16]} castShadow>
          <boxGeometry args={[3.4, 0.14, 0.5]} />
          <meshStandardMaterial color="#e85d2a" roughness={0.6} />
        </mesh>
        {[-1.5, 1.5].map((dx) => (
          <mesh key={dx} position={[dx, 1, 0]}>
            <boxGeometry args={[0.09, 0.42, 0.09]} />
            <meshStandardMaterial color="#3c4046" />
          </mesh>
        ))}
      </group>
      {/* spring rider duck */}
      <group position={[-0.8, 0, 2.4]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 0.6, 7]} />
          <meshStandardMaterial color="#f4a52a" />
        </mesh>
        <mesh position={[0, 0.85, 0]} rotation={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.9, 0.4, 0.32]} />
          <meshStandardMaterial color="#e85d2a" />
        </mesh>
        <mesh position={[0.42, 1.12, 0]} rotation={[0, 1.2, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#f4a52a" />
        </mesh>
      </group>
      {/* park bench beside the gate */}
      <Bench position={[0, 0, -5.6]} rotation={Math.PI} />
    </group>
  )
}

// ───────────────────────────────────────────────────────── park bench ───────
export function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[dx, 0.28, 0]}>
          <boxGeometry args={[0.14, 0.55, 0.5]} />
          <meshStandardMaterial color="#3c4046" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[1.9, 0.12, 0.55]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.88, -0.24]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[1.9, 0.4, 0.1]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.85} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────── Osu Castle ─────
export function OsuCastle({ position }: { position: [number, number, number] }) {
  const towers: [number, number][] = [[-7.4, -2.4], [7.4, -2.4], [-7.4, 2.4], [7.4, 2.4]]
  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      {/* main whitewashed block */}
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[15, 5.2, 5]} />
        <meshStandardMaterial color="#f2ede2" roughness={0.8} />
      </mesh>
      {/* arched colonnade hint */}
      {[-5, -2.5, 0, 2.5, 5].map((dx) => (
        <mesh key={dx} position={[dx, 1.15, 2.55]}>
          <boxGeometry args={[1.2, 2.3, 0.2]} />
          <meshStandardMaterial color="#5b4a38" />
        </mesh>
      ))}
      {/* corner round towers */}
      {towers.map(([dx, dz], i) => (
        <group key={i} position={[dx, 0, dz]}>
          <mesh position={[0, 3.4, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.7, 6.8, 12]} />
            <meshStandardMaterial color="#f2ede2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 7.2, 0]} castShadow>
            <coneGeometry args={[1.9, 1.4, 12]} />
            <meshStandardMaterial color="#2f6b5f" roughness={0.55} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* central keep */}
      <mesh position={[0, 5.4, 0]} castShadow>
        <boxGeometry args={[5, 3, 4.4]} />
        <meshStandardMaterial color="#f2ede2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 7.05, 0]} castShadow>
        <boxGeometry args={[5.6, 0.5, 5]} />
        <meshStandardMaterial color="#d9d0c0" roughness={0.85} />
      </mesh>
      <BlackStar position={[0, 6, 2.55]} size={0.85} />
      {/* flag on the keep */}
      <GhanaFlag position={[2.2, 7.3, 0]} scale={0.55} />
      {/* courtyard lawn + drive */}
      <mesh position={[0, 0.03, 5.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 4.4]} />
        <meshStandardMaterial color="#93c469" roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────── National Theatre ───────────
export function NationalTheatre({ position }: { position: [number, number, number] }) {
  const marquee = useMemo(() => signTexture('NATIONAL THEATRE', '#54396b', '#ffe9b0'), [])
  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      {/* curved front shell */}
      <mesh position={[-1.5, 3, 1.4]} rotation={[0, Math.PI / 5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 4.6, 6, 24, 1, true, Math.PI * 0.08, Math.PI * 0.84]} />
        <meshStandardMaterial color={COLORS.wallPurple} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>
      {/* main block behind */}
      <mesh position={[1.6, 2.75, -1.8]} castShadow receiveShadow>
        <boxGeometry args={[9, 5.5, 7]} />
        <meshStandardMaterial color="#e8dcc2" roughness={0.8} />
      </mesh>
      {/* dramatic angular roof */}
      <mesh position={[0, 7, -0.6]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[6.4, 3.2, 4]} />
        <meshStandardMaterial color="#54396b" roughness={0.6} />
      </mesh>
      <BlackStar position={[0, 8.9, 2.2]} size={0.6} />
      {/* glowing marquee */}
      <mesh position={[0.6, 5.6, 2.9]} rotation={[0, -0.25, 0]}>
        <planeGeometry args={[7.5, 1.5]} />
        <meshStandardMaterial map={marquee} emissive="#7a5a99" emissiveMap={marquee} emissiveIntensity={0.9} />
      </mesh>
      {/* glass lobby strip — seated on the ground as entrance glazing
          (bottom was 0.4 m in the air; center 1.6 → 1.3 puts its lower
          edge at 0.1, kissing the steps) */}
      <mesh position={[-2.4, 1.3, 3.35]} rotation={[0, -0.4, 0]}>
        <planeGeometry args={[5.6, 2.4]} />
        <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={1.2} />
      </mesh>
      {/* entrance steps */}
      {[[0.2, 0.35], [0.2, 0.85]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.12 + i * 0.16, dz + 2.4]}>
          <boxGeometry args={[6.4 - i * 0.6, 0.16, 1]} />
          <meshStandardMaterial color="#d9d0c0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ──────────────────────────────────────── Ferris wheel (beach fun zone) ─────
const CABIN_COLORS = ['#e2372f', '#fcd116', '#2e7fa8', '#4f9e4f', '#d97b8f', '#e08a3c', '#3aa08f', '#f4f1ea']

export function FerrisWheel({ position }: { position: [number, number, number] }) {
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.x += delta * 0.22
  })
  useEffect(() => {
    markAnimated(wheel.current)
    return () => unmarkAnimated(wheel.current)
  }, [])
  return (
    <group position={position}>
      {/* A-frame supports */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.9, 3.4, 0]} rotation={[0, 0, side * 0.45]} castShadow>
            <cylinderGeometry args={[0.22, 0.3, 7.4, 8]} />
            <meshStandardMaterial color="#e8e2d4" roughness={0.7} />
          </mesh>
          <mesh position={[side * 1.9, 3.4, 0]} rotation={[0.35, 0, side * 0.45]} castShadow>
            <cylinderGeometry args={[0.2, 0.28, 7.2, 8]} />
            <meshStandardMaterial color="#d9d0c0" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* rotating wheel (rotates in the YZ plane, facing the sea) */}
      <group ref={wheel} position={[0, 7.4, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[5.6, 0.22, 10, 40]} />
          <meshStandardMaterial color="#ce1126" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[3.2, 0.14, 8, 32]} />
          <meshStandardMaterial color="#fcd116" roughness={0.55} />
        </mesh>
        {/* spokes */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} rotation={[0, 0, a]}>
              <boxGeometry args={[0.12, 11.2, 0.12]} />
              <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
            </mesh>
          )
        })}
        {/* hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.8, 10]} />
          <meshStandardMaterial color="#fcd116" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* cabins */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={`c-${i}`} position={[0, Math.sin(a) * 5.6, Math.cos(a) * 5.6]} castShadow>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              <meshStandardMaterial color={CABIN_COLORS[i]} roughness={0.5} emissive={CABIN_COLORS[i]} emissiveIntensity={0.18} />
            </mesh>
          )
        })}
      </group>
      {/* hub cap on the fixed side */}
      <mesh position={[0, 7.4, 0.7]}>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshStandardMaterial color="#ce1126" />
      </mesh>
    </group>
  )
}

// ──────────────────────── purple-roof apartment blocks (video-inspo) ────────
export function ApartmentBlock({ position, rotation = 0, w = 10, d = 8, h = 9, wall = COLORS.wallCream, roof = COLORS.roofPurple }: { position: [number, number, number]; rotation?: number; w?: number; d?: number; h?: number; wall?: string; roof?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'apartment' }}>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey={`apt-${wall}-${h}`} rows={Math.max(2, Math.round(h / 2.4))} cols={4} litRatio={0.6} />
      {/* flat purple roof slab (video: purple-tinted roofs) */}
      <mesh position={[0, h + 0.18, 0]} castShadow>
        <boxGeometry args={[w + 0.9, 0.45, d + 0.9]} />
        <meshStandardMaterial color={roof} roughness={0.75} />
      </mesh>
      {/* rooftop water tanks + stair housing */}
      <mesh position={[w * 0.26, h + 0.95, d * 0.2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.9, 8]} />
        <meshStandardMaterial color="#3aa08f" roughness={0.6} />
      </mesh>
      <mesh position={[-w * 0.24, h + 0.85, -d * 0.18]}>
        <cylinderGeometry args={[0.42, 0.42, 0.75, 8]} />
        <meshStandardMaterial color="#ce1126" roughness={0.6} />
      </mesh>
      <mesh position={[w * 0.28, h + 0.85, -d * 0.22]} castShadow>
        <boxGeometry args={[1.5, 1.1, 1.5]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      {/* lit entrance */}
      <mesh position={[0, 1.2, d / 2 + 0.06]}>
        <planeGeometry args={[1.6, 2.4]} />
        <meshStandardMaterial color="#5b3d28" />
      </mesh>
      <mesh position={[0, 2.7, d / 2 + 0.1]}>
        <planeGeometry args={[2.4, 0.4]} />
        <meshStandardMaterial color="#ffe2a8" emissive="#ffc86e" emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────── neighborhood mosque ────
export function Mosque({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 4, 5.4]} />
        <meshStandardMaterial color={COLORS.wallCream} roughness={0.85} />
      </mesh>
      {/* arched door + windows */}
      {[-2.4, 0, 2.4].map((dx) => (
        <mesh key={dx} position={[dx, 1.1, 2.75]}>
          <planeGeometry args={[1, 2.2]} />
          <meshStandardMaterial color="#3f6b5f" />
        </mesh>
      ))}
      {/* drum + teal dome */}
      <mesh position={[0, 4.4, 0]}>
        <cylinderGeometry args={[2, 2.2, 0.9, 14]} />
        <meshStandardMaterial color="#e9e3d5" roughness={0.85} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <sphereGeometry args={[2.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2f6b5f" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 7.75, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* minarets */}
      {[-3.6, 3.6].map((dx) => (
        <group key={dx} position={[dx, 0, 2]}>
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.55, 9, 8]} />
            <meshStandardMaterial color="#f2ede2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 9.5, 0]}>
            <cylinderGeometry args={[0.62, 0.5, 0.7, 8]} />
            <meshStandardMaterial color="#e9e3d5" />
          </mesh>
          <mesh position={[0, 10.35, 0]} castShadow>
            <coneGeometry args={[0.55, 1.2, 8]} />
            <meshStandardMaterial color="#2f6b5f" />
          </mesh>
          <mesh position={[0, 11.15, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#fcd116" metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────── lagoon footbridge ──────────
export function LagoonBridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* arched deck from 3 segments */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * 3.4, 1.15 + (i === 0 ? 0.28 : i === 1 ? 0.55 : 0.28), 0]} rotation={[0, 0, i * -0.14]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.28, 2.3]} />
          <meshStandardMaterial color="#9a744a" roughness={0.9} />
        </mesh>
      ))}
      {/* railings */}
      {[-1.05, 1.05].map((dz) => (
        <mesh key={dz} position={[0, 2.15, dz]}>
          <boxGeometry args={[10.6, 0.1, 0.1]} />
          <meshStandardMaterial color="#d8b56a" />
        </mesh>
      ))}
      {[-4.4, 4.4].map((dx) =>
        [-1.05, 1.05].map((dz) => (
          <mesh key={`${dx}-${dz}`} position={[dx, 1.7, dz]}>
            <cylinderGeometry args={[0.06, 0.06, 1.3, 6]} />
            <meshStandardMaterial color="#6b4a2f" />
          </mesh>
        ))
      )}
      {/* support piles */}
      {[-3.2, 0, 3.2].map((dx) => (
        <mesh key={`p${dx}`} position={[dx, 0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 2.4, 7]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────── rocky shore embankments ──────
export function Rocks({ positions }: { positions: [number, number][] }) {
  const items = useMemo(
    () =>
      positions.map(([x, z], i) => ({
        x,
        z,
        s: 0.7 + ((i * 37) % 10) / 9,
        ry: (i * 47) % 7,
        col: i % 3 === 0 ? '#6e6a66' : i % 3 === 1 ? '#7d7568' : '#5d5952',
      })),
    [positions]
  )
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.s * 0.5, it.z]} rotation={[0.2 * (i % 3), it.ry, 0.1 * (i % 2)]} castShadow>
          <dodecahedronGeometry args={[it.s, 0]} />
          <meshStandardMaterial color={it.col} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────────── AKWAABA billboard ────────
export function Billboard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const tex = useMemo(() => signTexture('AKWAABA!', '#ce1126', '#fcd116'), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-2.6, 2.6].map((dx) => (
        <mesh key={dx} position={[dx, 2.9, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 5.8, 8]} />
          <meshStandardMaterial color="#4a4f55" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 7, 0]} castShadow>
        <boxGeometry args={[8.4, 3.6, 0.35]} />
        <meshStandardMaterial color="#2c3036" roughness={0.7} />
      </mesh>
      <mesh position={[0, 7, 0.22]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial map={tex} emissive="#7a2020" emissiveMap={tex} emissiveIntensity={0.75} />
      </mesh>
      {/* top spotlights */}
      {[-3, 0, 3].map((dx) => (
        <mesh key={dx} position={[dx, 9, 0.8]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.26, 0.5, 8]} />
          <meshStandardMaterial color="#3c4046" />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────── hot-air balloon (animated) ───
export function HotAirBalloon({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const grp = useRef<THREE.Group>(null)
  useEffect(() => {
    markAnimated(grp.current)
    return () => unmarkAnimated(grp.current)
  }, [])
  const tex = useMemo(() => balloonTexture(), [])
  const glow = useMemo(() => glowTexture('#ffb45c'), [])
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (grp.current) {
      grp.current.position.y = position[1] + Math.sin(t * 0.5 + phase) * 1.6
      grp.current.position.x = position[0] + Math.sin(t * 0.22 + phase) * 5
      grp.current.position.z = position[2] + Math.cos(t * 0.18 + phase) * 5
      grp.current.rotation.y = Math.sin(t * 0.3 + phase) * 0.3
    }
  })
  return (
    <group ref={grp} position={position} scale={scale}>
      {/* striped envelope */}
      <mesh castShadow>
        <sphereGeometry args={[4, 20, 16]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
      {/* throat cone */}
      <mesh position={[0, -4.1, 0]}>
        <coneGeometry args={[1.5, 1.6, 12]} />
        <meshStandardMaterial color="#b34a32" roughness={0.75} />
      </mesh>
      {/* wicker basket */}
      <mesh position={[0, -5.9, 0]} castShadow>
        <boxGeometry args={[1.5, 1.1, 1.5]} />
        <meshStandardMaterial color="#8a5c36" roughness={0.95} />
      </mesh>
      <mesh position={[0, -5.32, 0]}>
        <boxGeometry args={[1.56, 0.12, 1.56]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      {/* ropes */}
      {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx * 0.7, -4.85, dz * 0.7]} rotation={[dz * 0.12, 0, -dx * 0.12]}>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 4]} />
          <meshStandardMaterial color="#5b3d28" />
        </mesh>
      ))}
      {/* burner glow */}
      <sprite position={[0, -5, 0]} scale={[2.2, 2.2, 1]}>
        <spriteMaterial map={glow} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}
