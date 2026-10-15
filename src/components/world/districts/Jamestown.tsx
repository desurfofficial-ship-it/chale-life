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
import { GyanHouse } from '@/onboarding/Onboarding'

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

// ─── Daavi's plot dressing — the game's two interaction markers ─────────────
// The v6 map hands the plot over bare: the two spots the hustle lives on
// need their physical markers back (the old starter block had both; they
// went with it in the map swap).
//
// 1. JOB-SPOT CRATE + PAN STACK — G-008d item 8, carried verbatim in
//    proximity.ts's DAAVI_JOB_SPOT comment ("Agent 3 marks it visually with
//    crates / a pan stack against the east wall"). The job spot
//    (LOC-001-JOB / DAAVI_JOB_SPOT at −122.9, −2.4) is the kiosk's east
//    side, so the stack hugs the east wall (x −125) inside the wall band
//    (z −4.6…−2.6): two crates + a washed pan on top + a pan leaning on the
//    wall. Footprint x −125.0…−124.4, z −4.05…−2.85 — 1.6 m from the job
//    spot's standing point (≥ the 0.6 m capsule+margin bar jobs.test pins
//    for plot solids) and clear of the job→bench walk line (which crosses
//    the wall at z ≈ −2.1, north of the stack).
// 2. SET-DOWN BENCH — the hustle's step 2 ("carry the pans to the bench")
//    points at DAAVI_BENCH (−132.5, −0.6) on the plot pavement; without a
//    bench mesh the marker points at bare ground. The Bench (1.9 × 0.6 m,
//    rotation 0 → seat faces south, toward Daavi St) sits at the yard's
//    east edge, 2.3 m north of the waypoint and inside its 2.5 m zone:
//    footprint x −133.45…−131.55, z −3.5…−2.9 — 0.55 m north of the
//    spawn→pavement walk line (z ≈ −2.0) and clear of the sleepYard robot
//    legs. DRESSING ONLY: these props are not in the captured collider set
//    (world/accra/data/colliders.json); both footprints already satisfy the
//    clearance bars the jobs.test suite pins, so wiring an in-game collider
//    capture later cannot turn them into route blockers.
function DaaviPlotDressing() {
  return (
    <group>
      {/* job-spot marker: crate + pan stack against the kiosk's east wall */}
      <group position={[-124.72, 0, -3.15]}>
        <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.52, 0.55]} />
          <meshStandardMaterial color="#9a6a3c" roughness={0.9} />
        </mesh>
        {/* washed pan resting on the crate */}
        <mesh position={[0, 0.57, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.2, 0.1, 12]} />
          <meshStandardMaterial color="#3d4147" roughness={0.5} metalness={0.55} />
        </mesh>
      </group>
      <group position={[-124.72, 0, -3.75]}>
        <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.52, 0.55]} />
          <meshStandardMaterial color="#8a5c34" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.57, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.19, 0.09, 12]} />
          <meshStandardMaterial color="#454a51" roughness={0.5} metalness={0.55} />
        </mesh>
      </group>
      {/* empty pan leaning on the wall between the two crates */}
      <mesh position={[-124.93, 0.42, -3.45]} rotation={[0, 0, -0.32]} castShadow>
        <cylinderGeometry args={[0.23, 0.19, 0.09, 12]} />
        <meshStandardMaterial color="#383c42" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* step-2 set-down bench — MUST match DAAVI_BENCH in proximity.ts
          (−132.5, −0.6). Old z −3.2 sat inside the sleep yard, so standing
          at the visible bench resolved LOC-002 (Sleep) instead of Carry Pans. */}
      <Bench position={[-132.5, 0, -0.6]} rotation={0} />
    </group>
  )
}

export function DaaviPlot() {
  return (
    <group>
      {/* compound house at the west end, door opening toward the street
          (onboarding swaps in Gyan's house with a real room on this footprint) */}
      {/* Player house: Gyan's shell + enterable room (onboarding + play).
          CompoundHouse was a solid prop with no interior — players could not
          find "their" house or the room dresser. */}
      <GyanHouse />
      {/* kiosk by the street corner — the sign carries the joint's name
          (W-002: the old starter's "AUNTY BA" board renamed DAAVI; the
          starter went with the map swap, so the name lives here now) */}
      <Kiosk position={[-126.5, 0, -3.6]} sign="DAAVI WAAKYE" signBg="#e4b93f" />
      {/* open sleep yard in between — kept clear for the game */}
      <SleepYard />
      {/* street name sign on the pavement */}
      <StreetSign position={[-125.2, 0, 0.9]} text="DAAVI ST" />
      {/* the hustle's two physical markers (see placement contract above) */}
      <DaaviPlotDressing />
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
