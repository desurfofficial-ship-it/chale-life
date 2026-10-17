'use client'

// ─── Expansion landmarks I: James Town, Terrace pool, Waterfront, Stadium,
// ─── Kotoka Airport — inspired by the ride-hailing city diorama video.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '@/lib/mapConfig'
import { signTexture, lighthouseTexture, glowTexture } from '@/lib/mapTextures'
import { BlackStar } from './Landmarks'
import { Building } from './Buildings'
import { markAnimated, unmarkAnimated } from '../world/SceneBatcher'
import { Canoe } from './Movers'

// ────────────────────────────────────────── James Town Lighthouse ───────────
export function Lighthouse({ position }: { position: [number, number, number] }) {
  const stripes = useMemo(() => lighthouseTexture(), [])
  const glow = useMemo(() => glowTexture('#fff3c4'), [])
  const beam = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (beam.current) beam.current.rotation.y = state.clock.elapsedTime * 0.85
  })
  useEffect(() => {
    markAnimated(beam.current)
    return () => unmarkAnimated(beam.current)
  }, [])
  return (
    <group position={position}>
      {/* striped tower */}
      <mesh position={[0, 8, 0]} castShadow>
        <cylinderGeometry args={[1.25, 1.9, 16, 14]} />
        <meshStandardMaterial map={stripes} roughness={0.75} />
      </mesh>
      {/* gallery deck */}
      <mesh position={[0, 16.35, 0]} castShadow>
        <cylinderGeometry args={[1.9, 1.9, 0.5, 14]} />
        <meshStandardMaterial color="#2c3036" roughness={0.6} />
      </mesh>
      {/* railing posts */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.7, 17, Math.sin(a) * 1.7]}>
            <cylinderGeometry args={[0.05, 0.05, 0.9, 5]} />
            <meshStandardMaterial color="#3c4046" />
          </mesh>
        )
      })}
      {/* light room */}
      <mesh position={[0, 17.5, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 1.5, 12]} />
        <meshStandardMaterial color="#2a2e34" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 17.55, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 1.2, 12]} />
        <meshStandardMaterial color="#ffe9b0" emissive="#ffdf8a" emissiveIntensity={2.4} />
      </mesh>
      {/* cap */}
      <mesh position={[0, 18.75, 0]} castShadow>
        <coneGeometry args={[1.5, 1.1, 12]} />
        <meshStandardMaterial color="#ce1126" roughness={0.6} />
      </mesh>
      <mesh position={[0, 19.6, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fcd116" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* rotating beacon beam */}
      <group ref={beam} position={[0, 17.55, 0]}>
        <sprite position={[3.4, 0, 0]} scale={[6, 2.4, 1]}>
          <spriteMaterial map={glow} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <sprite position={[-3.4, 0, 0]} scale={[6, 2.4, 1]}>
          <spriteMaterial map={glow} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
      {/* keeper's hut */}
      <mesh position={[4.2, 1.4, 1.6]} castShadow>
        <boxGeometry args={[3.4, 2.8, 2.6]} />
        <meshStandardMaterial color={COLORS.wallCream} roughness={0.8} />
      </mesh>
      <mesh position={[4.2, 3.1, 1.6]} castShadow>
        <coneGeometry args={[2.6, 1.1, 4]} />
        <meshStandardMaterial color={COLORS.roofTerracotta} />
      </mesh>
    </group>
  )
}

// ──────────────────────────────────────────────── Fishing Harbor ────────────
export function FishingHarbor() {
  const piles = useMemo(() => {
    const pts: [number, number][] = []
    for (let z = 39; z <= 57; z += 4.5) {
      pts.push([-143.2, z], [-128.8, z])
    }
    return pts
  }, [])
  return (
    <group>
      {/* wooden pier deck (over painted ground deck strip) */}
      <mesh position={[-136, 0.55, 48]} receiveShadow castShadow>
        <boxGeometry args={[11, 0.5, 20]} />
        <meshStandardMaterial color="#9a744a" roughness={0.9} />
      </mesh>
      {/* deck plank seams */}
      {[-4, -2, 0, 2, 4].map((dx) => (
        <mesh key={dx} position={[-136 + dx, 0.82, 48]}>
          <boxGeometry args={[0.14, 0.06, 19.6]} />
          <meshStandardMaterial color="#7a5a36" />
        </mesh>
      ))}
      {/* support piles */}
      {piles.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.4, z]}>
          <cylinderGeometry args={[0.28, 0.32, 2.6, 7]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
        </mesh>
      ))}
      {/* shed on the quay */}
      <mesh position={[-147, 1.3, 33.6]} castShadow>
        <boxGeometry args={[5.4, 2.6, 3.6]} />
        <meshStandardMaterial color={COLORS.wallTeal} roughness={0.85} />
      </mesh>
      <mesh position={[-147, 2.9, 33.6]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3, 1.3, 4]} />
        <meshStandardMaterial color={COLORS.roofAlt} />
      </mesh>
      {/* fish drying racks */}
      {[[-150, 31.5], [-125, 32.5], [-149.2, 36]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {[-1.4, 1.4].map((dx) => (
            <mesh key={dx} position={[dx, 1.15, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 2.3, 6]} />
              <meshStandardMaterial color="#8a6a44" />
            </mesh>
          ))}
          <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 2.9, 5]} />
            <meshStandardMaterial color="#8a6a44" />
          </mesh>
          {/* hanging silver fish */}
          {[-0.9, -0.3, 0.3, 0.9].map((fx, j) => (
            <mesh key={j} position={[fx, 1.85, 0]} rotation={[0, 0, 0.15]}>
              <capsuleGeometry args={[0.09, 0.5, 3, 6]} />
              <meshStandardMaterial color="#cfd6da" metalness={0.35} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* colorful canoes pulled up on the sand */}
      <Canoe position={[-130.5, 0, 35]} rotation={0.35} colorIndex={0} />
      <Canoe position={[-126, 0, 36.6]} rotation={-0.2} colorIndex={2} />
      <Canoe position={[-134, 0, 37.4]} rotation={0.1} colorIndex={3} />
      {/* canoes moored in the water by the pier */}
      <Canoe position={[-144, 0.3, 45]} rotation={1.15} colorIndex={4} />
      <Canoe position={[-128.5, 0.3, 52]} rotation={-0.9} colorIndex={1} />
      <Canoe position={[-142.5, 0.3, 54.5]} rotation={0.55} colorIndex={5} />
      {/* stacked fish traps (baskets) */}
      {[[-148.5, 0, 30.6], [-147.6, 0.5, 30.4], [-148.1, 1, 30.8]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.35, z]} rotation={[0, i * 0.5, 0]}>
          <cylinderGeometry args={[0.55, 0.4, 0.7, 8]} />
          <meshStandardMaterial color="#b58a4e" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────── The Terrace (rooftop pool hotel) ───────
export function TerraceHotel({ position }: { position: [number, number, number] }) {
  const poolWater = useMemo(() => new THREE.MeshStandardMaterial({
    color: COLORS.poolBlue,
    emissive: new THREE.Color('#0e7a9a'),
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.3,
  }), [])
  // P2-4: per-mount material — free it on unmount
  useEffect(() => () => poolWater.dispose(), [poolWater])
  return (
    <group position={position} userData={{ bldg: 'hotel' }}>
      {/* pink mid-rise body — depth trimmed 10→7.6 so the whole footprint
          fits the 9 m strip between the ew1 and coastal road bands */}
      <Building position={[0, 5, 0]} size={[14, 10, 7.6]} wall={COLORS.wallPink} facadeKey="terrace-hotel" rows={4} cols={5} litRatio={0.65} />
      {/* roof deck slab */}
      <mesh position={[0, 10.12, 0]} receiveShadow>
        <boxGeometry args={[15.2, 0.35, 8.8]} />
        <meshStandardMaterial color="#efe6da" roughness={0.85} />
      </mesh>
      {/* glass parapet */}
      {([[0, 4.4], [0, -4.4]] as [number, number][]).map(([dx, dz], i) => (
        <mesh key={`p-${i}`} position={[dx, 10.75, dz]}>
          <boxGeometry args={[15, 0.75, 0.16]} />
          <meshStandardMaterial color="#bfe4ee" transparent opacity={0.55} roughness={0.1} metalness={0.4} />
        </mesh>
      ))}
      {([[-7.35, 0], [7.35, 0]] as [number, number][]).map(([dx, dz], i) => (
        <mesh key={`q-${i}`} position={[dx, 10.75, dz]}>
          <boxGeometry args={[0.16, 0.75, 8.6]} />
          <meshStandardMaterial color="#bfe4ee" transparent opacity={0.55} roughness={0.1} metalness={0.4} />
        </mesh>
      ))}
      {/* rooftop pool (video-inspo: bright blue rectangle) */}
      <mesh position={[1.4, 10.32, 1.6]} material={poolWater}>
        <boxGeometry args={[8.6, 0.28, 3.6]} />
      </mesh>
      {/* pool rim */}
      <mesh position={[1.4, 10.26, 1.6]}>
        <boxGeometry args={[9.2, 0.2, 4.2]} />
        <meshStandardMaterial color="#dfe7ea" roughness={0.5} />
      </mesh>
      {/* white lounge chairs facing the sea */}
      {[4.2, 2.8, 1.4, 0].map((dz, i) => (
        <group key={i} position={[-4.6, 0, dz - 1.4]}>
          <mesh position={[0, 10.5, 0]} castShadow>
            <boxGeometry args={[1.5, 0.18, 0.75]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[-0.6, 10.68, 0]} rotation={[0, 0, 0.7]}>
            <boxGeometry args={[0.7, 0.16, 0.7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* rooftop palms in planters */}
      {[[5.6, -3.2], [5.6, 2.8]].map(([dx, dz], i) => (
        <group key={i} position={[dx, 10.3, dz]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.6, 8]} />
            <meshStandardMaterial color="#b3745a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1.8, 6]} />
            <meshStandardMaterial color="#8a6a44" />
          </mesh>
          {Array.from({ length: 5 }).map((_, f) => {
            const a = (f / 5) * Math.PI * 2
            return (
              <mesh key={f} position={[Math.cos(a) * 0.5, 2.35, Math.sin(a) * 0.5]} rotation={[0.6 * Math.sin(a), -a, 0.5]}>
                <coneGeometry args={[0.2, 1.2, 4]} />
                <meshStandardMaterial color="#3e8f4a" />
              </mesh>
            )
          })}
        </group>
      ))}
      {/* entrance canopy + glow (mat re-seated fully inside the hotel plot,
          clear of the coastal road band) */}
      <mesh position={[0, 3.1, 4.5]} castShadow>
        <boxGeometry args={[6, 0.25, 1.8]} />
        <meshStandardMaterial color="#ce1126" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 3.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.4, 1.2]} />
        <meshStandardMaterial color="#ffdf9a" emissive="#ffcf7d" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────── The Waterfront (pier restaurant) ─────
const CAFE_UMBRELLA = ['#e2372f', '#2e7fa8', '#fcd116']

export function WaterfrontCafe({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ bldg: 'cafe' }}>
      {/* pier deck reaching from the beach into the sea */}
      <mesh position={[0, 0.55, 12]} receiveShadow castShadow>
        <boxGeometry args={[5.6, 0.5, 26]} />
        <meshStandardMaterial color="#9a744a" roughness={0.9} />
      </mesh>
      {/* pier piles */}
      {[-1, 2, 6, 10, 14, 18, 22].map((dz) =>
        [-2.2, 2.2].map((dx) => (
          <mesh key={`${dz}-${dx}`} position={[dx, -0.5, dz]}>
            <cylinderGeometry args={[0.26, 0.3, 2.8, 7]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
          </mesh>
        ))
      )}
      {/* railing ropes */}
      {[-2.75, 2.75].map((dx) => (
        <mesh key={dx} position={[dx, 1.15, 12]}>
          <boxGeometry args={[0.07, 0.07, 25]} />
          <meshStandardMaterial color="#d8b56a" />
        </mesh>
      ))}
      {/* restaurant building at the end */}
      <group position={[0, 0.8, 20.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[9, 3.4, 6.4]} />
          <meshStandardMaterial color={COLORS.wallCream} roughness={0.8} />
        </mesh>
        {/* glowing windows */}
        {[-2.6, 0, 2.6].map((dx) => (
          <mesh key={dx} position={[dx, 0.4, 3.25]}>
            <planeGeometry args={[1.9, 1.5]} />
            <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={1.4} />
          </mesh>
        ))}
        {/* red roof (video-inspo waterfront) */}
        <mesh position={[0, 2.35, 0]} castShadow>
          <boxGeometry args={[10, 0.5, 7.2]} />
          <meshStandardMaterial color="#c0392b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 2.75, 0]} castShadow>
          <boxGeometry args={[8.6, 0.4, 6]} />
          <meshStandardMaterial color="#a53125" roughness={0.7} />
        </mesh>
      </group>
      {/* open-air deck seating: colorful umbrellas + tables */}
      {[-4, 0, 4].map((dz, i) => (
        <group key={i} position={[i % 2 === 0 ? -1.1 : 1.1, 0.8, dz + 8]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.6, 6]} />
            <meshStandardMaterial color="#d8d8d8" />
          </mesh>
          <mesh position={[0, 2.75, 0]} castShadow>
            <coneGeometry args={[1.6, 0.8, 8]} />
            <meshStandardMaterial color={CAFE_UMBRELLA[i]} roughness={0.75} />
          </mesh>
          <mesh position={[0.9, 0.35, 0.4]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0.9, 0.55, 0.4]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 6]} />
            <meshStandardMaterial color="#8a5c36" />
          </mesh>
        </group>
      ))}
      {/* warm string lights across the deck */}
      {[-6, -3, 0, 3, 6].map((dz, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -1.4 : 1.4, 3.15, dz + 11]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#ffe2a8" emissive="#ffc86e" emissiveIntensity={2.6} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────────── Accra Sports Stadium ─────
// Proper bowl: three stepped stand tiers with tri-color seats (instanced),
// cantilevered roof ring on columns, outer facade, corner floodlight masts,
// marked pitch with apron. Sized so the bowl never touches ew2 / stadiumRd.
export function Stadium({ position }: { position: [number, number, number] }) {
  const glow = useMemo(() => glowTexture('#fff6d8'), [])
  const RX = 14.5 // stand inner rim (x)
  const RZ = 9.5 // stand inner rim (z)
  const TIER_DEPTH = 2.0
  const TIER_RISE = 2.4

  const segs = useMemo(() => {
    const arr: { pos: [number, number, number]; rotY: number; len: number }[] = []
    const N = 20
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const x = Math.cos(a) * RX
      const z = Math.sin(a) * RZ
      let nx = Math.cos(a) / RX
      let nz = Math.sin(a) / RZ
      const nl = Math.hypot(nx, nz)
      nx /= nl
      nz /= nl
      const len = (2 * Math.PI * Math.sqrt((RX * Math.cos(a)) ** 2 + (RZ * Math.sin(a)) ** 2)) / N
      arr.push({ pos: [x, 0, z], rotY: Math.atan2(nx, nz), len: len + 1.2 })
    }
    return arr
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpCol = useMemo(() => new THREE.Color(), [])
  const tierRef = useRef<THREE.InstancedMesh>(null)
  const seatRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)
  const colRef = useRef<THREE.InstancedMesh>(null)
  const markRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    let ti = 0
    segs.forEach((s, i) => {
      for (let t = 0; t < 3; t++) {
        const out = 0.3 + t * TIER_DEPTH + TIER_DEPTH / 2
        const baseY = 1.0 + t * TIER_RISE
        // tier block
        dummy.position.set(s.pos[0] + Math.sin(s.rotY) * out, baseY + 1.3, s.pos[2] + Math.cos(s.rotY) * out)
        dummy.rotation.set(0, s.rotY, 0)
        dummy.scale.set(s.len, 2.6, TIER_DEPTH)
        dummy.updateMatrix()
        if (tierRef.current) {
          tierRef.current.setMatrixAt(ti, dummy.matrix)
          tierRef.current.setColorAt(ti, tmpCol.set(i % 2 === 0 ? '#d8d2c4' : '#c6bfae'))
        }
        // seat strip on the tier's top inner edge
        const sout = 0.3 + t * TIER_DEPTH + 0.38
        dummy.position.set(s.pos[0] + Math.sin(s.rotY) * sout, baseY + 2.6 + 0.22, s.pos[2] + Math.cos(s.rotY) * sout)
        dummy.scale.set(s.len * 0.92, 0.44, 0.76)
        dummy.updateMatrix()
        if (seatRef.current) {
          seatRef.current.setMatrixAt(ti, dummy.matrix)
          seatRef.current.setColorAt(ti, tmpCol.set(i % 3 === 0 ? '#ce1126' : i % 3 === 1 ? '#fcd116' : '#2e7fa8'))
        }
        ti++
      }
      // roof slab over the top tier, sloping toward the pitch
      const rout = 0.3 + 2 * TIER_DEPTH + 1.35
      dummy.position.set(s.pos[0] + Math.sin(s.rotY) * rout, 9.25, s.pos[2] + Math.cos(s.rotY) * rout)
      dummy.rotation.set(0.3, s.rotY, 0, 'YXZ')
      dummy.scale.set(s.len * 1.08, 0.3, 6.2)
      dummy.updateMatrix()
      roofRef.current?.setMatrixAt(i, dummy.matrix)
      // support column at the roof's back edge
      const cout = 0.3 + 2 * TIER_DEPTH + 2.6
      dummy.position.set(s.pos[0] + Math.sin(s.rotY) * cout, 8.55, s.pos[2] + Math.cos(s.rotY) * cout)
      dummy.rotation.set(0, s.rotY, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      colRef.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const r of [tierRef, seatRef, roofRef, colRef]) {
      if (r.current) r.current.instanceMatrix.needsUpdate = true
      if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true
    }
    // pitch markings: centre line + 2 penalty-box fronts + 4 box sides
    const marks: [number, number, number, number, number, number][] = [
      [0, 0.75, 0, 0.28, 0.06, 15.6],
      [7.2, 0.75, 0, 0.25, 0.06, 11.4],
      [-7.2, 0.75, 0, 0.25, 0.06, 11.4],
      [10.2, 0.75, 5.7, 6, 0.06, 0.25],
      [10.2, 0.75, -5.7, 6, 0.06, 0.25],
      [-10.2, 0.75, 5.7, 6, 0.06, 0.25],
      [-10.2, 0.75, -5.7, 6, 0.06, 0.25],
    ]
    marks.forEach((m, i) => {
      dummy.position.set(m[0], m[1], m[2])
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(m[3], m[4], m[5])
      dummy.updateMatrix()
      markRef.current?.setMatrixAt(i, dummy.matrix)
    })
    if (markRef.current) markRef.current.instanceMatrix.needsUpdate = true
  }, [segs, dummy, tmpCol])

  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      {/* stepped stand tiers (instanced) */}
      <instancedMesh ref={tierRef} args={[undefined, undefined, 60]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {/* tri-color seat strips (instanced, per-segment colors) */}
      <instancedMesh ref={seatRef} args={[undefined, undefined, 60]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      {/* roof ring slabs (instanced) */}
      <instancedMesh ref={roofRef} args={[undefined, undefined, 20]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f0ece0" roughness={0.7} />
      </instancedMesh>
      {/* roof support columns (instanced) */}
      <instancedMesh ref={colRef} args={[undefined, undefined, 20]}>
        <cylinderGeometry args={[0.18, 0.22, 2.6, 6]} />
        <meshStandardMaterial color="#8d8a80" roughness={0.6} metalness={0.3} />
      </instancedMesh>
      {/* outer facade + parapet */}
      <mesh position={[0, 5, 0]} scale={[21.2, 1, 16.2]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 10, 48, 1, true]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 10.35, 0]} scale={[21.5, 1, 16.5]}>
        <cylinderGeometry args={[1, 1, 0.9, 48, 1, true]} />
        <meshStandardMaterial color="#c0392b" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* inner field wall + apron + pitch */}
      <mesh position={[0, 0.35, 0]} scale={[13.4, 1, 8.6]}>
        <cylinderGeometry args={[1, 1, 0.7, 32]} />
        <meshStandardMaterial color="#e9e3d5" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.73, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[14.3, 9.3, 1]} receiveShadow>
        <ringGeometry args={[0.937, 1, 40]} />
        <meshStandardMaterial color="#9b9789" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[13.2, 8.4, 1]} receiveShadow>
        <circleGeometry args={[1, 36]} />
        <meshStandardMaterial color="#4f9e4f" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.735, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[13.2, 8.4, 1]}>
        <ringGeometry args={[0.975, 1, 36]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* white pitch markings (instanced) + centre circle */}
      <instancedMesh ref={markRef} args={[undefined, undefined, 7]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </instancedMesh>
      <mesh position={[0, 0.745, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.56, 2.9, 1]}>
        <ringGeometry args={[0.94, 1, 32]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* corner floodlight masts */}
      {[[-18.5, -13.5], [18.5, -13.5], [-18.5, 13.5], [18.5, 13.5]].map(([dx, dz], i) => (
        <group key={i} position={[dx, 0, dz]}>
          <mesh position={[0, 9.5, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.55, 19, 8]} />
            <meshStandardMaterial color="#9aa0a6" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 19.4, 0]} rotation={[0.55, Math.atan2(-dx, -dz), 0, 'YXZ']} castShadow>
            <boxGeometry args={[4.6, 1.8, 0.5]} />
            <meshStandardMaterial color="#565b61" />
          </mesh>
          <mesh position={[0, 19.35, 0.42]} rotation={[0.55, 0, 0]}>
            <planeGeometry args={[4.2, 1.5]} />
            <meshStandardMaterial color="#fffbe8" emissive="#fff2c0" emissiveIntensity={2.8} />
          </mesh>
          <sprite position={[0, 20.2, 1.4]} scale={[7.5, 7.5, 1]}>
            <spriteMaterial map={glow} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
      {/* goal posts */}
      {[-11, 11].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 1.1, -1.4]}>
            <cylinderGeometry args={[0.09, 0.09, 2.2, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 1.1, 1.4]}>
            <cylinderGeometry args={[0.09, 0.09, 2.2, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.24, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 2.8, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      {/* scoreboard pod on the north roof */}
      <group position={[0, 0, -12.6]}>
        <mesh position={[0, 11.9, 0]} castShadow>
          <boxGeometry args={[7, 3.4, 0.8]} />
          <meshStandardMaterial color="#1d222a" />
        </mesh>
        <mesh position={[0, 11.9, 0.5]}>
          <planeGeometry args={[6.2, 2.6]} />
          <meshStandardMaterial color="#ffdf7d" emissive="#ffb400" emissiveIntensity={1.1} />
        </mesh>
        <mesh position={[0, 9.9, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 2.4, 8]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.4} />
        </mesh>
      </group>
      {/* entrance pavilions east + west */}
      {[[-21.9, 0], [21.9, 0]].map(([dx, dz], i) => (
        <group key={i} position={[dx, 0, dz]} rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 2.1, 0]} castShadow>
            <boxGeometry args={[4.6, 4.2, 3]} />
            <meshStandardMaterial color="#e9e3d5" roughness={0.85} />
          </mesh>
          <mesh position={[0, 4.45, 0]} castShadow>
            <boxGeometry args={[5.2, 0.5, 3.6]} />
            <meshStandardMaterial color="#c0392b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.6, 1.56]}>
            <planeGeometry args={[2.6, 2.2]} />
            <meshStandardMaterial color="#ffe2a8" emissive="#ffc86e" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ──────────────────────────────────────────────── Kotoka Airport set ────────
export function AirportTerminal({ position }: { position: [number, number, number] }) {
  const sign = useMemo(() => signTexture('KOTOKA INTL', '#12324a', '#ffd98f'), [])
  return (
    <group position={position} userData={{ bldg: 'landmark' }}>
      {/* terminal body */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[26, 7, 8]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.75} />
      </mesh>
      {/* glass front facing the apron */}
      <mesh position={[0, 3, 4.05]}>
        <planeGeometry args={[23, 3.6]} />
        <meshStandardMaterial color="#9fd4e8" emissive="#5a92b0" emissiveIntensity={0.6} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* departure sign */}
      <mesh position={[0, 8.2, 4.1]}>
        <planeGeometry args={[14, 2.2]} />
        <meshStandardMaterial map={sign} emissive="#666666" emissiveMap={sign} emissiveIntensity={0.8} />
      </mesh>
      {/* roof canopy */}
      <mesh position={[0, 7.35, 5]} castShadow>
        <boxGeometry args={[27, 0.4, 2.4]} />
        <meshStandardMaterial color="#c0392b" roughness={0.65} />
      </mesh>
      {/* control tower */}
      <group position={[16.5, 0, -1]}>
        <mesh position={[0, 6.5, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.5, 13, 10]} />
          <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
        </mesh>
        <mesh position={[0, 13.6, 0]}>
          <cylinderGeometry args={[2.3, 1.8, 1.4, 10]} />
          <meshStandardMaterial color="#33424e" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[0, 14.45, 0]}>
          <cylinderGeometry args={[2.45, 2.45, 0.35, 10]} />
          <meshStandardMaterial color="#42525e" />
        </mesh>
        {/* cab glow band */}
        <mesh position={[0, 13.6, 0]}>
          <cylinderGeometry args={[1.95, 1.95, 0.55, 10]} />
          <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={1.3} />
        </mesh>
        <mesh position={[0, 15.4, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 1.6, 6]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[0, 16.3, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color="#ff4040" emissive="#ff2020" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  )
}

export function ParkedPlane({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* fuselage */}
      <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[1.05, 9.4, 4, 12]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* cockpit windows */}
      <mesh position={[5.6, 2.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 0.6]} />
        <meshStandardMaterial color="#20303c" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* window strip */}
      {[-3.4, -2.2, -1, 0.2, 1.4, 2.6].map((dx) => (
        <mesh key={dx} position={[dx, 2.55, 1.02]}>
          <planeGeometry args={[0.5, 0.32]} />
          <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* main wings (span trimmed 12.5→11.5 so the parked pair clears both
          the runway fence line and the airport road band) */}
      <mesh position={[-0.4, 1.55, 0]} castShadow>
        <boxGeometry args={[2.6, 0.22, 11.5]} />
        <meshStandardMaterial color="#e8e4da" roughness={0.4} />
      </mesh>
      {/* engines */}
      {[-2.6, 2.6].map((dz) => (
        <mesh key={dz} position={[-0.5, 1.05, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.58, 1.7, 10]} />
          <meshStandardMaterial color="#b9bec4" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      {/* tail fin with Ghana black star */}
      <mesh position={[-5.3, 3.6, 0]} castShadow>
        <boxGeometry args={[2.4, 2.8, 0.24]} />
        <meshStandardMaterial color="#006b3f" roughness={0.5} />
      </mesh>
      <BlackStar position={[-5.3, 3.9, 0.2]} size={0.62} />
      <mesh position={[-5.55, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.16, 2.4, 3, 8]} />
        <meshStandardMaterial color="#e8e4da" />
      </mesh>
      {/* landing gear */}
      {[[-4.4, -1.1], [-4.4, 1.1], [3.6, 0]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.5, dz]}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 10]} />
          <meshStandardMaterial color="#16181c" roughness={0.9} />
        </mesh>
      ))}
      {/* beacon */}
      <mesh position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color="#ff4040" emissive="#ff2020" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}
