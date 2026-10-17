'use client'

// ─── District: CHALÉ ISLAND (Task 11) — the new island in the sea ────────────
// A sand-rimmed island (x −77…−13, z 66…98) reached by a two-lane causeway
// from the coastal road (cars drive across — see ROADS.islandCauseway). The
// ground canvas paints sand/grass/plots; this module adds the 3D mass: island
// plinth (walkable top at y 0.45, noCollide — the sim claims the footprint
// via water.json), five premium overgrown land plots with white beacons and
// LAND FOR SALE boards, the welcome arch over the causeway head, guardrails,
// the south fishing jetty over the water, two jetty huts, palms and people.
import { BannerGate, BeachStall } from '../../scene/Expansion3'
import { Guardrail } from '../../scene/Expansion5'
import {
  InstancedPeople, InstancedPalms, InstancedShrubs, InstancedGrassTufts, InstancedTrees,
  type PropItem,
} from '../InstancedNature'

// palm/tuft dressing along the island shore
const ISL_PALMS: PropItem[] = [
  { p: [-74, 68.5] as [number, number], s: 1.05 }, { p: [-16.5, 69] as [number, number], s: 0.95 },
  { p: [-74.5, 95.5] as [number, number], s: 1 }, { p: [-14.5, 95] as [number, number], s: 1.1 },
  { p: [-30, 68.5] as [number, number], s: 0.9 }, { p: [-62, 97] as [number, number], s: 0.95 },
]

const ISL_TREES: PropItem[] = [
  { p: [-36, 68.8] as [number, number], s: 0.9 }, { p: [-56, 96.8] as [number, number], s: 1 },
]

const ISL_SHRUBS: PropItem[] = [
  { p: [-21.5, 81.5] as [number, number], s: 0.9 }, { p: [-25.5, 79.2] as [number, number], s: 0.8 },
  { p: [-71, 81.8] as [number, number], s: 1 }, { p: [-35.5, 96.5] as [number, number], s: 0.85 },
  { p: [-19, 78.5] as [number, number], s: 0.75 }, { p: [-52, 68.2] as [number, number], s: 0.8 },
]

const ISL_GRASS: PropItem[] = [
  { p: [-24, 82] as [number, number] }, { p: [-68, 79] as [number, number] },
  { p: [-40, 96.5] as [number, number] }, { p: [-30, 90.5] as [number, number] },
  { p: [-60, 84.5] as [number, number] }, { p: [-70, 88] as [number, number] },
  { p: [-20, 93] as [number, number] }, { p: [-48, 68.5] as [number, number] },
]

const ISL_PEOPLE: PropItem[] = [
  { p: [-45, 79.5] as [number, number], r: 2.2 },  // causeway head, admiring the plots
  { p: [-58, 82.5] as [number, number], r: 4.4 },  // on the lane
  { p: [-33, 83] as [number, number], r: 0.6 },
  { p: [-46, 95] as [number, number], r: 3.1 },    // by the jetty root
  { p: [-26, 92.5] as [number, number], r: 5.2 },  // hut keeper
]

export function ChaleIsland() {
  return (
    <group>
      {/* island plinth: sand rim + walkable grass top (noCollide — the sim
          claims the footprint through water.json's island exception) */}
      <mesh position={[-45, -0.35, 82]} userData={{ noCollide: true }}>
        <boxGeometry args={[64, 1.6, 32]} />
        <meshStandardMaterial color="#d9c08a" roughness={1} />
      </mesh>
      <mesh position={[-45, 0.44, 82]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[59.5, 27.5]} />
        <meshStandardMaterial color="#8fbf68" roughness={0.95} />
      </mesh>

      {/* causeway deck: coastal road → island head (walkable + drivable) */}
      <mesh position={[-45, 0.05, 47.5]} userData={{ noCollide: true }}>
        <boxGeometry args={[7, 1.1, 41]} />
        <meshStandardMaterial color="#b9b2a4" roughness={0.95} />
      </mesh>
      {/* guardrails both sides (also keep the car on the deck in the sim) */}
      <Guardrail from={[-48.2, 33]} to={[-48.2, 82.5]} />
      <Guardrail from={[-41.8, 33]} to={[-41.8, 82.5]} />

      {/* welcome arch over the causeway head */}
      <BannerGate position={[-45, 0.42, 31.5]} rotation={0} text="CHALÉ ISLAND" bg="#006b3f" fg="#fcd116" width={5} />

      {/* the island plots now render with every other buyable plot from
          LAND_PLOTS (Task 13 sale metadata: ids chale-1…3, y 0.44) */}

      {/* south fishing jetty over the water + two jetty huts */}
      <mesh position={[-46, 0.28, 101.5]} userData={{ noCollide: true }}>
        <boxGeometry args={[3.4, 0.5, 13]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.9} />
      </mesh>
      {[[0, 6], [0, 1.5], [0, -3], [0, -7.5]].map(([dx, dz], i) => (
        <mesh key={i} position={[-46 + dx, 0.05, 101.5 + dz]} userData={{ noCollide: true }}>
          <cylinderGeometry args={[0.18, 0.22, 1.4, 6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
      <BeachStall position={[-26, 0.44, 90]} rotation={Math.PI} sign="FRESH GRILLED" roofColor="#ce1126" />
      <BeachStall position={[-18, 0.44, 90]} rotation={Math.PI} sign="COCONUTS" roofColor="#2e7fa8" />

      {/* instanced props lifted onto the island top (y 0.44) — each call
          creates its own InstancedMesh, so a group offset is safe; the
          collider export reads world matrices and shifts with them */}
      <group position={[0, 0.44, 0]}>
        <InstancedPeople items={ISL_PEOPLE} />
        <InstancedPalms items={ISL_PALMS} />
        <InstancedTrees items={ISL_TREES} />
        <InstancedShrubs items={ISL_SHRUBS} />
        <InstancedGrassTufts items={ISL_GRASS} />
      </group>
    </group>
  )
}
