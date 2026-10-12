'use client'

// ─── District: Civic Center — Independence Arch, Black Star Square, ─────────
// ─── Kwame Nkrumah Memorial Park, Circle, small central shops ───────────────
import { IndependenceArch, CircleStatue, MemorialPark, FuelStation } from '../../scene/Landmarks'
import { BlackStarGate, Grandstand, FloodlightMast, MemorialPool, ParkWalls, ParkEntrance } from '../../scene/Expansion3'
import { Shop } from '../../scene/Buildings'
import { Billboard, HotAirBalloon } from '../../scene/Expansion2'
import { GhanaFlag } from '../../scene/Nature'
import {
  InstancedPalms, InstancedPeople, InstancedLamps, InstancedTrees, InstancedBenches,
  type PropItem,
} from '../InstancedNature'
import { COLORS, CIRCLE } from '@/lib/mapConfig'

const CC_PALMS: PropItem[] = [[-44, 2], [-52, 2]].map((p) => ({ p: p as [number, number] }))
const CC_TREES: PropItem[] = [
  { p: [-88, -20] }, { p: [-68, -25.5], s: 0.9 }, { p: [-86, -4], s: 1.05 },
]
const CC_LAMPS: PropItem[] = [
  { p: [-84, -12], r: -Math.PI / 2 }, { p: [-72, -20], r: -Math.PI / 2 },
]
const CC_BENCHES: PropItem[] = [
  { p: [-74, 22.9] }, { p: [-60, 22.9] }, { p: [-46, 22.9] },
  { p: [-73, -6], r: 0.3 }, { p: [-83, -6], r: -0.3 }, { p: [-72, -38.5], r: Math.PI },
]
const CC_PEOPLE: PropItem[] = [
  { p: [-70, 16], r: 2.1 }, { p: [-60, 22], r: 0.4 }, { p: [-52, 14], r: 1.2 }, { p: [-44, 20], r: 2.8 },
  { p: [-80, -4], r: 1.7 }, { p: [-74, -18], r: 0.2 }, { p: [-84, -10], r: 2.4 }, { p: [-68, -23], r: 3.1 },
]

export function CivicCenter() {
  return (
    <group>
      {/* ── Independence Arch + circle + central shops ── */}
      <IndependenceArch position={[-65, 0, 18.5]} />
      <CircleStatue position={[CIRCLE.x, 0, CIRCLE.z]} />
      <MemorialPark />
      <FuelStation position={[35, 0, 18.5]} />
      <Billboard position={[-27, 0, 2.5]} rotation={0.25} />
      <HotAirBalloon position={[0, 24, -8]} scale={1.15} />
      {/* MTN shop moved NW out of the Circle ring annulus (was (-18,20)) */}
      <Shop position={[-24, 0, 35.5]} rotation={0} sign="MTN" signBg="#ffcb05" wall={COLORS.wallCream} w={8} d={5} />
      <Shop position={[4, 0, -6]} rotation={Math.PI} sign="WAAKYE" signBg="#ce1126" wall={COLORS.wallYellow} w={5.5} d={4.2} h={3.2} />

      {/* ── BLACK STAR SQUARE & INDEPENDENCE ARCH grounds ── */}
      <BlackStarGate position={[-48, 0, 10]} />
      <Grandstand position={[-82.75, 0, 19]} />
      <Grandstand position={[-35.25, 0, 19]} rotation={Math.PI} />
      <FloodlightMast position={[-89, 0, 19]} />
      <FloodlightMast position={[-33, 0, 19]} />
      {[-78, -71, -64, -57, -50, -44].map((x) => (
        <GhanaFlag key={x} position={[x, 0, 22.5]} scale={0.72} />
      ))}
      <InstancedPalms items={CC_PALMS} />
      <InstancedPeople items={CC_PEOPLE} />

      {/* ── KWAME NKRUMAH MEMORIAL PARK precinct ── */}
      <MemorialPool position={[-78, 0, -0.8]} />
      <ParkWalls />
      <ParkEntrance position={[-65.5, 0, -16]} />
      <InstancedLamps items={CC_LAMPS} />
      <InstancedTrees items={CC_TREES} />
      <InstancedBenches items={CC_BENCHES} />
    </group>
  )
}
