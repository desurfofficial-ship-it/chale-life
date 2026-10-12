'use client'

// ─── District: James Town — fishing village, lighthouse, harbor, ────────────
// ─── terrace hotel, waterfront cafe, and DAAVI'S RESERVED PLOT ──────────────
//
// Daavi's plot (see DAAVI_PLOT in mapConfig): a flat, clear ~30 × 20 m plot
// fronting the paved two-lane Daavi street. Only three things occupy it —
// a kiosk, a compound house with an open sleep yard, and the pavement —
// everything else is left empty for the Chalé Life game to build on.
import { CompoundHouse } from '../../scene/Buildings'
import { Lighthouse, FishingHarbor, TerraceHotel, WaterfrontCafe } from '../../scene/Expansion'
import { Kiosk } from '../../scene/Expansion3'
import { StreetSign } from '../../scene/Expansion5'
import { Bench } from '../../scene/Expansion2'
import * as THREE from 'three'
import { COLORS } from '@/lib/mapConfig'
import { ONBOARDING } from '@/onboarding/Onboarding'

// sleep-yard dressing: mats, clothesline, water drum — all low, removable props
function SleepYard() {
  return (
    <group>
      {/* reed mats laid out to sleep on */}
      <mesh position={[-138, 0.05, -5.5]} rotation={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.3]} />
        <meshStandardMaterial color="#b5905c" roughness={0.95} />
      </mesh>
      <mesh position={[-134.5, 0.05, -8.2]} rotation={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[2, 0.08, 1.2]} />
        <meshStandardMaterial color="#a5824f" roughness={0.95} />
      </mesh>
      {/* low wooden bench */}
      <Bench position={[-136.2, 0, -3.6]} rotation={0.15} />
      {/* clothesline between two poles */}
      <mesh position={[-140.5, 1.2, -11]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#7a5230" roughness={0.9} />
      </mesh>
      <mesh position={[-133.5, 1.2, -11.6]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#7a5230" roughness={0.9} />
      </mesh>
      <mesh position={[-137, 2.28, -11.3]} rotation={[0, Math.atan2(0.6, 7), 0]}>
        <boxGeometry args={[7.1, 0.03, 0.03]} />
        <meshStandardMaterial color="#d8d4c8" roughness={0.8} />
      </mesh>
      {([
        [-139, -11.1, '#ce1126'],
        [-137, -11.25, '#fcd116'],
        [-135, -11.4, '#3aa08f'],
      ] as [number, number, string][]).map(([x, z, c], i) => (
        <mesh key={i} position={[x, 2.06, z]} rotation={[0, 0.1 * i, 0]}>
          <planeGeometry args={[0.85, 0.5]} />
          <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
      {/* water drum */}
      <mesh position={[-130.5, 0.55, -6.2]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 1.1, 10]} />
        <meshStandardMaterial color="#2e7fa8" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[-130.5, 1.13, -6.2]}>
        <cylinderGeometry args={[0.47, 0.47, 0.08, 10]} />
        <meshStandardMaterial color="#245f85" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

export function DaaviPlot() {
  return (
    <group>
      {/* compound house at the west end, door opening toward the street
          (onboarding swaps in Gyan's house with a real room on this footprint) */}
      {!ONBOARDING && <CompoundHouse
        position={[-146.8, 0, -7]}
        rotation={0.04}
        wall={COLORS.wallTeal}
        w={7}
        d={6.4}
        variant={1}
      />}
      {/* kiosk by the street corner */}
      <Kiosk position={[-126.5, 0, -3.6]} sign="KIOSK" signBg="#e4b93f" />
      {/* open sleep yard in between — kept clear for the game */}
      <SleepYard />
      {/* street name sign on the pavement */}
      <StreetSign position={[-125.2, 0, 0.9]} text="DAAVI ST" />
    </group>
  )
}

export function Jamestown() {
  return (
    <group>
      {/* ── village houses (row moved north of Daavi's widened plot) ── */}
      <CompoundHouse position={[-149.5, 0, -23.5]} wall={COLORS.wallTeal} w={6.4} d={5.6} h={3.8} variant={1} roof="metal" />
      <CompoundHouse position={[-142, 0, -23.5]} rotation={0.05} wall={COLORS.wallYellow} w={6.4} d={5.6} h={3.8} variant={2} />
      <CompoundHouse position={[-119, 0, -23.5]} wall={COLORS.wallPink} w={6.4} d={5.6} h={3.8} variant={3} walled />
      {/* Task 12: the (-112, -23.5) plot is now KONKONSA GAME CENTRE (TownLife) */}
      <CompoundHouse position={[-152, 0, 27]} wall={COLORS.wallOrange} w={6.4} d={5.6} h={3.8} variant={0} roof="metal" />
      <CompoundHouse position={[-144, 0, 27]} rotation={0.08} wall={COLORS.wallCream} w={6.4} d={5.6} h={3.8} variant={1} />
      <CompoundHouse position={[-128, 0, 27]} wall={COLORS.wallTeal} w={6.4} d={5.6} h={3.8} variant={2} walled />

      {/* ── landmarks ── */}
      <Lighthouse position={[-146, 0, 22.5]} />
      <FishingHarbor />
      <TerraceHotel position={[-96, 0, 19]} />
      <WaterfrontCafe position={[-58, 0, 37]} />

      {/* ── Daavi's reserved plot (Chalé Life handover) ── */}
      <DaaviPlot />
    </group>
  )
}
