'use client'

// ─── OwnedFurniture — bought furniture, standing in the room ────────────────
// The shop writes home.furnitureIds; THIS component is the missing half that
// makes purchases visible (the old flow debited the wallet and rendered
// nothing). Layout comes from furnitureLayout.ts (pure, unit-tested):
//   - replaceable categories (bed / sofa / wardrobe / …) swap the starter
//     piece at its anchor — GyanRoom hides the starter when the list owns one
//   - everything else takes curated anchors, fallbacks, then a fine scan
// Rendering:
//   - catalogue items with a modelPath load their meshopt GLB (drei useGLTF,
//     meshopt decoder auto-attached), normalised against the catalogue width
//   - legacy basics get compact procedural stand-ins (no textures needed)
// Every placed subtree registers useAnimatedRef so the world SceneBatcher
// never freezes a loaded asset into a batch merge (the cutaway lesson).
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Clone, useGLTF } from '@react-three/drei'
import { useAnimatedRef } from '../components/world/SceneBatcher'
import { publicUrl } from '../world/gltfSupport'
import { findFurnitureById } from '../data/furniture'
import { layoutOwnedFurniture, ROOM_D, ROOM_W, type Placement, type RoomMode } from './furnitureLayout'
import { swatchTexture } from './materials'
import { FanHead } from './GyanRoom'
import type { RoomDevices } from './roomPrefs'

// ── shared procedural palette (created once, colours constant) ──────────────
let PM: {
  wood: THREE.MeshStandardMaterial
  woodDark: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  chrome: THREE.MeshStandardMaterial
  white: THREE.MeshStandardMaterial
  plastic: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  screen: THREE.MeshStandardMaterial
  pot: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  fabric: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
} | null = null
function pm() {
  if (!PM) {
    const std = (color: string, rough = 0.7, metal = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    PM = {
      wood: std('#a97c50', 0.7),
      woodDark: std('#6f4a28', 0.65),
      metal: std('#2b2b2e', 0.45, 0.55),
      chrome: std('#c9ccd1', 0.25, 0.85),
      white: std('#f0ece4', 0.55),
      plastic: std('#e23b2f', 0.75),
      dark: std('#23252b', 0.6),
      screen: new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: '#5fb4ff', emissiveIntensity: 0.35, roughness: 0.3 }),
      pot: std('#b0623e', 0.9),
      leaf: std('#2f6b3a', 0.85),
      fabric: std('#8f8b82', 0.95),
      glow: new THREE.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffc46b', emissiveIntensity: 0.8 }),
    }
  }
  return PM
}

// ── GLB normalisation (decode is async; bbox computed after load) ───────────
type Fit = { scale: number; yOff: number }
const fitCache = new Map<string, Fit>()

function fitOf(scene: THREE.Object3D, path: string, targetW: number): Fit {
  const hit = fitCache.get(path)
  if (hit) return hit
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const scale = size.x > 0.01 ? THREE.MathUtils.clamp(targetW / size.x, 0.15, 4) : 1
  const yOff = isFinite(box.min.y) ? Math.max(0, -box.min.y * scale) : 0
  const fit = { scale, yOff }
  fitCache.set(path, fit)
  return fit
}

function GlbItem({ path, widthM }: { path: string; widthM: number }) {
  const gltf = useGLTF(publicUrl(path))
  const fit = useMemo(() => fitOf(gltf.scene, path, widthM), [gltf.scene, path, widthM])
  return <Clone object={gltf.scene} scale={fit.scale} position={[0, fit.yOff, 0]} />
}

// preload the handful most likely to be bought first (rest stream on demand)
for (const p of [
  'models/furniture/living/sofa/sofa-00.glb',
  'models/furniture/living/coffee-table/coffee-table-00.glb',
  'models/furniture/bedroom/bed/bed-00.glb',
]) {
  try {
    useGLTF.preload(publicUrl(p))
  } catch {
    /* preload is best-effort */
  }
}

// ── procedural stand-ins for the legacy basics (no GLB in the catalogue) ────
function ProcItem({ category }: { category: string }) {
  const m = pm()
  switch (category) {
    case 'chair':
      return (
        <group>
          <mesh position={[0, 0.42, 0]} material={m.plastic} castShadow>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
          </mesh>
          <mesh position={[0, 0.55, -0.18]} material={m.plastic}>
            <boxGeometry args={[0.42, 0.32, 0.05]} />
          </mesh>
          {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.2, z]} material={m.plastic}>
              <boxGeometry args={[0.04, 0.4, 0.04]} />
            </mesh>
          ))}
        </group>
      )
    case 'stool':
      return (
        <group>
          <mesh position={[0, 0.44, 0]} material={m.wood} castShadow>
            <cylinderGeometry args={[0.17, 0.15, 0.05, 12]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.11, 0.22, Math.sin((i * Math.PI * 2) / 3) * 0.11]} material={m.woodDark}>
              <cylinderGeometry args={[0.022, 0.028, 0.44, 8]} />
            </mesh>
          ))}
        </group>
      )
    case 'table':
      return (
        <group>
          <mesh position={[0, 0.72, 0]} material={m.wood} castShadow>
            <boxGeometry args={[1.2, 0.05, 0.7]} />
          </mesh>
          {[[-0.52, -0.27], [0.52, -0.27], [-0.52, 0.27], [0.52, 0.27]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.35, z]} material={m.woodDark}>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
          ))}
        </group>
      )
    case 'bed':
      return (
        <group>
          <mesh position={[0, 0.17, 0]} material={m.wood} castShadow>
            <boxGeometry args={[1.6, 0.3, 2.05]} />
          </mesh>
          <mesh position={[0, 0.45, 0.02]} material={m.white} castShadow>
            <boxGeometry args={[1.5, 0.24, 1.95]} />
          </mesh>
          <mesh position={[0, 0.62, -0.7]} material={m.fabric}>
            <boxGeometry args={[0.55, 0.12, 0.32]} />
          </mesh>
          <mesh position={[0, 0.75, -1.06]} material={m.woodDark} castShadow>
            <boxGeometry args={[1.66, 0.9, 0.07]} />
          </mesh>
        </group>
      )
    case 'wardrobe':
      return (
        <group>
          <mesh position={[0, 1.05, 0]} material={m.wood} castShadow>
            <boxGeometry args={[0.6, 2.1, 1.4]} />
          </mesh>
          <mesh position={[-0.301, 1.05, 0]} material={m.woodDark}>
            <boxGeometry args={[0.01, 1.95, 0.012]} />
          </mesh>
          {[-0.12, 0.12].map((z) => (
            <mesh key={z} position={[-0.31, 1.05, z]} material={m.chrome}>
              <boxGeometry args={[0.02, 0.3, 0.02]} />
            </mesh>
          ))}
        </group>
      )
    case 'sofa':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} material={m.fabric} castShadow>
            <boxGeometry args={[1.9, 0.4, 0.85]} />
          </mesh>
          <mesh position={[0, 0.66, -0.33]} material={m.fabric} castShadow>
            <boxGeometry args={[1.9, 0.5, 0.2]} />
          </mesh>
          {[-0.85, 0.85].map((x) => (
            <mesh key={x} position={[x, 0.42, 0]} material={m.fabric}>
              <boxGeometry args={[0.18, 0.55, 0.85]} />
            </mesh>
          ))}
          {[-0.8, 0.8].map((x) => (
            <mesh key={x} position={[x, 0.04, 0.3]} material={m.woodDark}>
              <cylinderGeometry args={[0.03, 0.02, 0.08, 6]} />
            </mesh>
          ))}
        </group>
      )
    case 'tv':
      return (
        <group>
          <mesh position={[0, 0.25, 0]} material={m.woodDark} castShadow>
            <boxGeometry args={[1.2, 0.5, 0.42]} />
          </mesh>
          <mesh position={[0, 0.86, 0]} material={m.dark}>
            <boxGeometry args={[1.06, 0.62, 0.05]} />
          </mesh>
          <mesh position={[0, 0.86, 0.03]} material={m.screen}>
            <planeGeometry args={[1.0, 0.56]} />
          </mesh>
        </group>
      )
    case 'fridge':
      return (
        <group>
          <mesh position={[0, 0.85, 0]} material={m.chrome} castShadow>
            <boxGeometry args={[0.62, 1.7, 0.62]} />
          </mesh>
          <mesh position={[0, 1.12, 0.312]} material={m.metal}>
            <boxGeometry args={[0.02, 0.02, 0.62]} />
          </mesh>
          <mesh position={[0.24, 1.1, 0.32]} material={m.metal}>
            <boxGeometry args={[0.03, 0.5, 0.03]} />
          </mesh>
        </group>
      )
    case 'fan':
      // routed by PlacedItem → FanStand (needs the Fan device state)
      return null
    case 'rug':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <planeGeometry args={[2.2, 1.55]} />
          <meshStandardMaterial map={swatchTexture('kente')} roughness={0.95} />
        </mesh>
      )
    case 'plant':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} material={m.pot} castShadow>
            <cylinderGeometry args={[0.16, 0.12, 0.4, 12]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.7) * 0.1, 0.58 + (i % 2) * 0.18, Math.sin(i * 1.7) * 0.1]} material={m.leaf} castShadow>
              <sphereGeometry args={[0.14, 7, 5]} />
            </mesh>
          ))}
        </group>
      )
    case 'kente':
      return (
        <group>
          <mesh material={m.woodDark}>
            <boxGeometry args={[0.86, 1.1, 0.04]} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.76, 1.0]} />
            <meshStandardMaterial map={swatchTexture('kente')} roughness={0.9} />
          </mesh>
        </group>
      )
    case 'speaker':
      return (
        <group>
          <mesh position={[0, 0.18, 0]} material={m.dark} castShadow>
            <boxGeometry args={[0.24, 0.36, 0.2]} />
          </mesh>
          <mesh position={[0, 0.18, 0.101]} material={m.metal}>
            <boxGeometry args={[0.16, 0.22, 0.005]} />
          </mesh>
        </group>
      )
    case 'cooker':
      return (
        <group>
          <mesh position={[0, 0.42, 0]} material={m.metal} castShadow>
            <boxGeometry args={[0.62, 0.84, 0.58]} />
          </mesh>
          {[[-0.14, 0], [0.14, 0]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.855, z]} material={m.dark}>
              <cylinderGeometry args={[0.09, 0.09, 0.015, 12]} />
            </mesh>
          ))}
          <mesh position={[0, 0.45, 0.295]} material={m.chrome}>
            <boxGeometry args={[0.5, 0.3, 0.01]} />
          </mesh>
        </group>
      )
    case 'bucket_bath':
      return (
        <group>
          <mesh position={[0, 0.21, 0]} material={m.chrome} castShadow>
            <cylinderGeometry args={[0.21, 0.19, 0.42, 14]} />
          </mesh>
          <mesh position={[0.4, 0.15, 0.1]} material={m.pot} castShadow>
            <cylinderGeometry args={[0.15, 0.13, 0.3, 12]} />
          </mesh>
        </group>
      )
    case 'toilet':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} material={m.white} castShadow>
            <boxGeometry args={[0.38, 0.4, 0.52]} />
          </mesh>
          <mesh position={[0, 0.43, 0.05]} material={m.white}>
            <cylinderGeometry args={[0.19, 0.16, 0.06, 14]} />
          </mesh>
          <mesh position={[0, 0.62, -0.22]} material={m.white}>
            <boxGeometry args={[0.4, 0.44, 0.16]} />
          </mesh>
        </group>
      )
    case 'generator':
      return (
        <group>
          <mesh position={[0, 0.32, 0]} material={m.leaf} castShadow>
            <boxGeometry args={[0.82, 0.5, 0.5]} />
          </mesh>
          <mesh position={[0.3, 0.66, 0]} material={m.metal}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
          </mesh>
          <mesh position={[0, 0.58, 0.15]} material={m.dark}>
            <boxGeometry args={[0.4, 0.08, 0.06]} />
          </mesh>
        </group>
      )
    default:
      // safe crate for anything unmapped (should not happen — unit tested)
      return (
        <mesh position={[0, 0.25, 0]} material={m.wood} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
      )
  }
}

/** fan builder keeps the shared FanHead (spin follows the Fan device) */

function PlacedItem({ p, devices }: { p: Placement; devices: RoomDevices }) {
  // one animated ref per placed subtree → SceneBatcher exemption in world mode
  const ref = useAnimatedRef<THREE.Group>()
  const item = findFurnitureById(p.id)
  const widthM = item?.dimensions?.widthMeters ?? 0.8

  let content: React.ReactNode
  if (p.category === 'fan') {
    content = <FanStand on={devices.fan} />
  } else if (item?.modelPath) {
    content = <GlbItem path={item.modelPath} widthM={widthM} />
  } else {
    content = <ProcItem category={p.category} />
  }

  if (p.wall === 'back') {
    return (
      <group ref={ref} position={[p.x, 1.7, -ROOM_D / 2 + 0.07]} rotation={[0, 0, 0]}>
        <Suspense fallback={null}>{content}</Suspense>
      </group>
    )
  }
  if (p.wall === 'right') {
    return (
      <group ref={ref} position={[ROOM_W / 2 - 0.07, 1.3, p.z]} rotation={[0, -Math.PI / 2, 0]}>
        <Suspense fallback={null}>{content}</Suspense>
      </group>
    )
  }
  return (
    <group ref={ref} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
      <Suspense fallback={null}>{content}</Suspense>
    </group>
  )
}

/** standing fan (pole + head) used by the 'fan' category placements */
function FanStand({ on }: { on: boolean }) {
  const m = pm()
  return (
    <group>
      <mesh position={[0, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
      </mesh>
      <mesh position={[0, 0.63, 0]} material={m.chrome}>
        <cylinderGeometry args={[0.018, 0.018, 1.25, 8]} />
      </mesh>
      <FanHead on={on} />
    </group>
  )
}

export function OwnedFurniture({
  owned,
  mode,
  devices,
}: {
  owned: readonly string[]
  mode: RoomMode
  devices: RoomDevices
}) {
  const placements = useMemo(() => layoutOwnedFurniture(owned, mode), [owned, mode])
  if (!placements.length) return null
  return (
    <group name="owned-furniture">
      {placements.map((p) => (
        <PlacedItem key={p.id} p={p} devices={devices} />
      ))}
    </group>
  )
}
