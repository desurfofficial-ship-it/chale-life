'use client'

// ─── District: Street Greenery & Dressing — palms, trees, street lamps, ─────
// ─── people, benches and Ghana flags. All repeated props are instanced ──────
// ─── (one draw call per prop type) except the animated waving flags. ────────
import { GhanaFlag } from '../../scene/Nature'
import {
  InstancedPalms,
  InstancedTrees,
  InstancedLamps,
  InstancedPeople,
  InstancedBenches,
  type PropItem,
} from '../InstancedNature'

// palms — coastal row + beach row + scattered (x 124 re-seated east of the
// nsE1 spine; the -155 scattered palm moved out of the westP corridor)
const PALMS: PropItem[] = [
  ...[-128, -118.5, -104, -92, -80, -68, -56, -44, -32, -20, 4, 16, 28, 40, 52, 66, 76, 88, 100, 112, 128.5, 136, 156].map((x, i) => ({
    p: [x, 21] as [number, number],
    s: 0.95 + (i % 3) * 0.08,
    r: i * 1.7,
  })),
  ...[-140, -124, -70, -56, -26, -12, 4, 18, 34, 50, 92, 106, 120, 132, 146].map((x, i) => ({
    p: [x, 39.5] as [number, number],
    s: 1.05,
    r: i * 0.8,
  })),
  ...(
    [
      [-88, -12, 1.1, 0], [-70, -26, 1, 0], [-70, -4, 0.95, 0], [-53, -2, 1.05, 0],
      [-152, 8, 1.05, 0], [-119, 15, 0.95, 0], [-150.5, 22, 1.1, 0],
      [96, 17.5, 1.05, 0], [124, 35.4, 1.05, 0], [146, 34, 1, 0], [-120, -43.5, 1, 0],
      [-118, -27, 1.05, 0], [52, -24, 0.9, 0], [70.5, 15.6, 1, 0],
    ] as [number, number, number, number][]
  ).map(([x, z, s, r]) => ({ p: [x, z] as [number, number], s, r })),
]

// trees — parks, campus, villages, airport edge
const TREES: PropItem[] = [
  [-95, -4, 1, 0], [-86, -22, 1, 0], [-72, -18, 1, 0], [-90, -25.5, 1, 0], [-70, -10, 1, 0],
  [-84, -25.8, 1, 0], [68, -68, 1.15, 0], [74, -44, 1, 0], [86, -42, 1, 0], [90, -66, 1.1, 0],
  [72, -57, 1, 0], [86, -57, 0.9, 0], [-90, -40, 1, 0], [-54.5, -44, 0.85, 0], [50, -38, 0.9, 0],
  [-95, -70, 1, 0], [5.5, -25.8, 0.85, 0], [-148, -40, 1.1, 0], [-106, -55.6, 1, 0], [-118, -68, 1.05, 0],
  [-147, -25.5, 1, 0], [-112, -14, 0.9, 0], [105, -25.8, 1, 0], [156, -40, 0.95, 0], [120, -72, 1.1, 0],
  [53, -64, 1, 0], [-16, -68, 1, 0], [67, -81.5, 0.85, 0],
].map((t) => ({ p: [t[0], t[1]] as [number, number], s: t[2] as number }))

// street lamps — one row per road corridor (l1..l5 in the old build)
const LAMPS: PropItem[] = [
  // ew1 corridor (west pair moved onto the Daavi street pavement)
  ...[-136, -116, -96, -76, -56, -36, -24, 4, 24, 44, 64, 84, 104, 129, 144].map((x, i) => ({  // 124->129: arm cleared the nsE1 corridor
    p: [x, i === 0 ? 0.2 : i % 2 === 0 ? 4.7 : 15.3] as [number, number],
    r: 0,
  })),
  // circle spokes (z=20 lamp moved to 26: the roundabout ring needs the arc)
  ...[-70, -30, -10, 10].map((z, i) => ({
    p: [i % 2 === 0 ? -4.6 : -15.4, z] as [number, number],
    r: i % 2 === 0 ? Math.PI : 0,
  })),
  { p: [-4.6, 22] as [number, number], r: Math.PI },
  { p: [-15.4, -44] as [number, number], r: 0 },
  ...[[-25, 3.8, 0], [5, 3.8, 0], [-15.8, -5, Math.PI / 2], [-4.6, 23, Math.PI]].map(([x, z, r]) => ({
    p: [x, z] as [number, number],
    r,
  })),
  // coastal road
  ...[-120, -96, -72, -48, -24, 0, 24, 48, 72, 96, 120].map((x, i) => ({
    p: [x, i % 2 === 0 ? 22.6 : 33.4] as [number, number],
    r: 0,
  })),
  // airport road (x=60 skipped — that is ns2's corridor; lamp moved west)
  ...[-100, -60, -20, 20, 52, 100].map((x, i) => ({
    p: [x, i % 2 === 0 ? -80.4 : -91.6] as [number, number],
    r: 0,
  })),
]

// evening crowd
const PEOPLE: PropItem[] = (
  [
    [-70, 21], [-62, 22.5], [-54, 20], [-46, 22], [-38, 20.5], [-30, 21.5],
    [-56, -26], [-48, -24], [-40, -27], [-34, -20], [-44, -14], [-30, -12], [-52, -9], [-26, -17],
    [-12, 33], [2, 34.5], [16, 35.5], [30, 34.2], [44, 36],
    [-33, -55], [-39, -60], [-45, -55],
    [67, -46], [72, -44],
    [-18, -2], [-14, 16], [66, 6], [90, 8],
    [19, -13], [43, -21], [24, -22],
    [-52, 38], [-53, 44], [-52, 50], [-53, 55],
    [-141, 30], [-134, 32], [-147, 26], [-126, 34],
    [-100, 34], [-92, 34],
    [126, -44], [131, -66], [142, -44], [122, -28],
    [26, -97], [36, -97], [46, -97],
    [106, -15], [116, -24],
    [130, 43], [139, 42],
    [-84, -24], [-76, -26], [-88, -8],
    [68, 37], [75, 38],
    [-14, -57], [0, -62], [104, 16], [117.5, 13], [-98, 0],
  ] as [number, number][]
).map(([x, z], i) => ({ p: [x, z] as [number, number], r: i * 1.3 }))

// seafront benches
const BENCHES: PropItem[] = [
  [-118, 34.5], [-104, 34.5], [-84, 34.5], [-40, 34.5], [20, 34.5], [34, 34.5], [48, 34.5], [-66, 34.5],
].map((b, i) => ({ p: b as [number, number], r: Math.PI + (i % 2) * 0.12 }))

export function Greenery() {
  return (
    <group>
      <InstancedPalms items={PALMS} />
      <InstancedTrees items={TREES} />
      <InstancedLamps items={LAMPS} />
      <InstancedPeople items={PEOPLE} />
      <InstancedBenches items={BENCHES} />
      {/* animated waving flags stay individual */}
      <GhanaFlag position={[-74, 0, 22]} />
      <GhanaFlag position={[-44, 0, 22]} />
      <GhanaFlag position={[66, 0, 19]} rotation={0.4} />
      <GhanaFlag position={[69, 0, -43.5]} rotation={-0.5} />
      <GhanaFlag position={[24, 0, -38]} rotation={0.9} />
      <GhanaFlag position={[-134, 0, 10]} rotation={0.6} />
      <GhanaFlag position={[143, 0, -60]} rotation={-0.4} />
    </group>
  )
}
