'use client'

import { useEffect, useMemo } from 'react'

// ─── District: Land-for-Sale plots (Task 11) ─────────────────────────────────
// Buyable land across Accra: every plot is a cleared laterite rect marked by
// four white corner beacons and the classic Ghana "LAND FOR SALE" board, then
// left overgrown with shrubs / trees / palms / grass tufts — exactly how real
// undeveloped plots look between compound houses. Plots are WALKABLE (players
// inspect the land they buy); only the sign posts and beacons are solid.
//
// All rects were validated against colliders + road bands by
// scripts/audit_candidates.py before being added to LAND_PLOTS (mapConfig).
import { LAND_PLOTS } from '@/lib/mapConfig'
import { Sign } from '../../scene/Businesses'
import {
  InstancedShrubs, InstancedTrees, InstancedPalms, InstancedGrassTufts,
  type PropItem,
} from '../InstancedNature'
import { requestRebatch } from '../SceneBatcher'

// deterministic per-plot pseudo-random (so screenshots and collider exports
// are stable across reloads — no Math.random in world layout)
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Task 13: the board now draws from the shared sign atlas (one draw call for
// every plot board in the city — 40+ plots used to cost 2 draws each)
export function ForSaleSign({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1, 1].map((dx) => (
        <mesh key={dx} position={[dx * 0.9, 0.75, 0]} castShadow>
          <boxGeometry args={[0.14, 1.5, 0.14]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[2.66, 1.36, 0.06]} />
        <meshStandardMaterial color="#ce1126" roughness={0.7} />
      </mesh>
      {[1, -1].map((k) => (
        <group key={k} rotation={[0, k > 0 ? 0 : Math.PI, 0]}>
          <Sign text="LAND FOR SALE" bg="#f4f1ea" fg="#1a1a1a" w={2.5} h={0.72} position={[0, 1.98, 0.035]} />
          <Sign text="024 435 6789" bg="#f4f1ea" fg="#2e7fa8" w={2.3} h={0.46} position={[0, 1.36, 0.035]} />
        </group>
      ))}
    </group>
  )
}

// one plot: cleared-dirt pad + 4 white beacons + sign + (props handled by the
// parent's instanced batches — see plotProps below)
export function LandPlot({ x, z, w, d, signRot = 0 }: { x: number; z: number; w: number; d: number; signRot?: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* cleared laterite pad (flat decal — walkable, noCollide via thinness) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noCollide: true }}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#92643a" roughness={1} />
      </mesh>
      {/* four white corner beacons (real plot-marker pillars) */}
      {([
        [-w / 2 + 0.35, -d / 2 + 0.35],
        [w / 2 - 0.35, -d / 2 + 0.35],
        [-w / 2 + 0.35, d / 2 - 0.35],
        [w / 2 - 0.35, d / 2 - 0.35],
      ] as [number, number][]).map(([bx, bz], i) => (
        <mesh key={i} position={[bx, 0.55, bz]} castShadow>
          <boxGeometry args={[0.22, 1.1, 0.22]} />
          <meshStandardMaterial color="#e8e4da" roughness={0.85} />
        </mesh>
      ))}
      {/* the sign faces the plot's approach (caller picks rotation) */}
      <ForSaleSign position={[0, 0, d / 2 - 0.6]} rotation={signRot} />
    </group>
  )
}

// deterministic overgrowth items for a list of plots — collected once so the
// whole map renders its plot greenery in 4 instanced draw calls
export function plotProps(
  plots: { x: number; z: number; w: number; d: number }[],
  seed = 11
): { shrubs: PropItem[]; trees: PropItem[]; palms: PropItem[]; grass: PropItem[] } {
  const shrubs: PropItem[] = []
  const trees: PropItem[] = []
  const palms: PropItem[] = []
  const grass: PropItem[] = []
  plots.forEach((p, pi) => {
    const rand = rng(seed + pi * 977)
    // Task 13: overgrowth scales with the plot area so small plots stay
    // walkable (sim: ≥ 50 % of every plot's cells reachable on foot) —
    // grass tufts carry the overgrown look and are not colliders
    const area = p.w * p.d
    const nShrub = area < 36 ? 1 : Math.max(1, Math.min(5, Math.round(area / 26 + rand() * 1.2)))
    for (let i = 0; i < nShrub; i++) {
      shrubs.push({
        p: [p.x + (rand() - 0.5) * (p.w - 1.6), p.z + (rand() - 0.5) * (p.d - 1.6)],
        s: 0.8 + rand() * 0.7,
        r: rand() * Math.PI * 2,
      })
    }
    if (area >= 40 && rand() > 0.35) trees.push({ p: [p.x + (rand() - 0.5) * (p.w - 2.4), p.z + (rand() - 0.5) * (p.d - 2.4)], s: 0.85 + rand() * 0.4 })
    if (area >= 60 && rand() > 0.55) palms.push({ p: [p.x + (rand() - 0.5) * (p.w - 2.4), p.z + (rand() - 0.5) * (p.d - 2.4)], s: 0.9 + rand() * 0.3 })
    const nGrass = Math.round(Math.min(24, 8 + area / 8) + rand() * 4)
    for (let i = 0; i < nGrass; i++) {
      grass.push({
        p: [p.x + (rand() - 0.5) * (p.w - 0.8), p.z + (rand() - 0.5) * (p.d - 0.8)],
        s: 0.8 + rand() * 0.8,
        r: rand() * Math.PI * 2,
      })
    }
  })
  return { shrubs, trees, palms, grass }
}

const up = (items: { p: [number, number]; s?: number; r?: number }[]) => items.map((i) => ({ ...i, y: 0.44 }))

/** every buyable plot (LAND_PLOTS): pads, beacons, boards, overgrowth.
 *  W-007: pass ownedPlotIds to clear shrubs/signs on purchased plots. */
export function LandForSale({ ownedPlotIds = [] }: { ownedPlotIds?: readonly string[] }) {
  // ownedPlotIds identity changes often; key by joined ids for memo
  const ownedKey = ownedPlotIds.join('|')
  const { free, shrubs, trees, palms, grass } = useMemo(() => {
    const owned = new Set(ownedPlotIds)
    const free = LAND_PLOTS.filter((p) => !p.id || !owned.has(p.id))
    const ground = free.filter((p) => !p.y)
    const raised = free.filter((p) => !!p.y)
    const mainProps = plotProps(ground, 11)
    const islandProps = plotProps(raised, 77)
    return {
      free,
      shrubs: [...mainProps.shrubs, ...up(islandProps.shrubs)],
      trees: [...mainProps.trees, ...up(islandProps.trees)],
      palms: [...mainProps.palms, ...up(islandProps.palms)],
      grass: [...mainProps.grass, ...up(islandProps.grass)],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedKey])

  // E-011: the plot meshes (pad / beacons / boards — plain materials) were
  // frozen into the SceneBatcher's merged clones at mount. Unmounting a
  // purchased plot removes the hidden originals but NOT the clone, so the
  // LAND FOR SALE board kept rendering on sold land (live-verified).
  // Re-run the batch after the ownership change commits.
  useEffect(() => {
    if (ownedKey) requestRebatch()
  }, [ownedKey])

  return (
    <group>
      {free.map((p, i) => (
        <group key={p.id ?? i} position={[0, p.y ?? 0, 0]} name={`plot:${p.id}`} userData={{ plot: { id: p.id, zone: p.zone, near: p.near, price: p.price } }}>
          <LandPlot x={p.x} z={p.z} w={p.w} d={p.d} signRot={((i * 37) % 4) * (Math.PI / 2)} />
        </group>
      ))}
      <InstancedShrubs items={shrubs} />
      <InstancedTrees items={trees} />
      <InstancedPalms items={palms} />
      <InstancedGrassTufts items={grass} />
    </group>
  )
}
