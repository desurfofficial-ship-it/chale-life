'use client'

// ─── District: Large Residential Neighborhoods (Task 10 rebuild) ────────────
// Three full street-grid neighborhoods laid out like real Accra suburbs:
//   DANSOMAN (west)   — compound rows between north rd / Dansoman Ave (campusSt
//                       extended) / ew2, spines nsD1–nsD3, 4 apartment blocks
//   NIMA / MAAMOBI (north-center) — back-to-back compound rows between ns1/ns2
//                       with spines nimaN1/nimaN2
//   TESHIE (east)     — walled homes + compound rows between eastP / nsE1 /
//                       eastLink, facing the beach at the south edge
// The old scattered west-quarter houses and east-apartment crescents were
// re-plotted onto these grids. Every plot is ≥0.5 m clear of every road band;
// house rows share a back-to-back dirt alley exactly like compound blocks.
import { CompoundHouse, Shop } from '../../scene/Buildings'
import { ApartmentBlock } from '../../scene/Expansion2'
import { Kiosk, VendorTable, BannerGate, BeachStall } from '../../scene/Expansion3'
import { StallRow, MarketHut } from './Markets'
import { COLORS } from '@/lib/mapConfig'
import { isConverted } from '@/lib/businesses'
import { T15_REPLACED } from '@/lib/osuNimaLayout'
import {
  InstancedLamps, InstancedPeople, InstancedTrees, InstancedShrubs, InstancedGrassTufts,
  type PropItem,
} from '../InstancedNature'

// shared plot dims — 6.4 × 5.6 m compound houses (3.8 m tall)
const HW = 6.4

// ── DANSOMAN rows ────────────────────────────────────────────────────────────
// north band: row A (z −66) doors face north rd (rot π), row B (z −59) doors
// face Dansoman Ave (rot 0); the pair backs onto the shared z −62.5 alley.
const DANSOMAN_ROW_A: [number, number][][] = [
  // W0 (west of nsD1) — one plot
  [[-148.75, -66]],
  // W1 (nsD1 ↔ nsD2) — two plots
  [[-131.5, -66], [-124.5, -66]],
  // W2 (nsD2 ↔ nsD3) — two plots
  [[-105.5, -66], [-98, -66]],
  // W3 (nsD3 ↔ mosque) — one plot + chop bar shop
  [[-79.5, -66]],
]
const DANSOMAN_ROW_B: [number, number][][] = [
  [[-148.75, -59]],
  [[-131.5, -59], [-124.5, -59]],
  [[-105.5, -59], [-98, -59]],
  [], // W3 row B: apartment block occupies the plot
]
// south strip (z −40.8 row, doors face Dansoman Ave) + relocated apartments
const DANSOMAN_SOUTH_HOUSES: [number, number][] = [[-148, -40.8]]
const DANSOMAN_SOUTH_APARTMENTS: [number, number][] = [
  [-127, -40.8], [-104, -40.8], [-78, -40.8],
]

// ── NIMA rows ────────────────────────────────────────────────────────────────
const NIMA_ROW_X = [-0.5, 15.5, 22.5, 37.5, 44.5, 51.5]

// ── TESHIE rows ──────────────────────────────────────────────────────────────
// RE-PLATTED (road-clearance round): the old z=5 / z=12 rows stood INSIDE the
// ew1 carriageway (band z 5.5…14.5) and the old z=19 row grazed the coastal
// band — the highway visibly disappeared under the houses. New layout:
//   north rows (z −23 / −14.5) between ew2 and the theatre,
//   mid rows (z −7.5 / −0.5) — back-to-back pair sharing the z −4 alley,
//   south row (z 17.5) fronting ew1 between its north edge and the coastal rd
//   (houses ≥0.2 m clear of both bands), castle-approach shops stay.
const TESHIE_NORTH: [number, number][] = [
  [131.5, -23], [139.5, -23],   // row A, doors face ew2 side (rot π)
  [131.5, -14.5], [139.5, -14.5], // row B, doors face teshie Ave (rot 0)
]
// mid block: columns west (115.5) and east (131.5 / 139.5) of the nsE1 spine;
// the west south plot is the walled compound (relocated from the old x 122
// plot that stood across the spine)
const TESHIE_MID_X = [115.5, 131.5, 139.5]
// south row fronting ew1 (x clear of nsE1 band 120.5…127.5; the two
// castle-approach houses at 116.6 / 131.5 live in OxfordOsu)
const TESHIE_SOUTH: [number, number][] = [
  [139.5, 17.5],
]

const NB_LAMPS: PropItem[] = [
  // Dansoman Ave frontage (north side of campusSt ext)
  { p: [-147, -55.5] as [number, number], r: Math.PI },
  { p: [-121, -55.5] as [number, number], r: Math.PI },
  { p: [-95, -55.5] as [number, number], r: 0 },
  { p: [-69, -55.5] as [number, number], r: 0 },
  // Nima frontage
  { p: [-4.5, -54.8] as [number, number], r: Math.PI }, // Task 15: re-seated to the audited walkway line
  { p: [24, -54.8] as [number, number], r: 0 },
  { p: [48, -54.8] as [number, number], r: 0 },
  // Adabraka lanes — the two lane lamps moved to x 6.9: the N-S lane at
  // x 9.5 is now the adabrakaLane car road and lamps stood on its centerline
  { p: [13, -11] as [number, number], r: 0 },
  { p: [27, -11] as [number, number], r: Math.PI },
  { p: [41, -11] as [number, number], r: 0 },
  { p: [6.9, -20] as [number, number], r: Math.PI / 2 },
  { p: [6.9, -4] as [number, number], r: Math.PI / 2 },
  { p: [13, -1.2] as [number, number], r: 0 },
  { p: [41, -1.2] as [number, number], r: Math.PI },
  // Nungua frontage + Chorkor market street
  { p: [166, -55.5] as [number, number], r: Math.PI },
  { p: [200, -55.5] as [number, number], r: 0 },
]

const NB_TREES: PropItem[] = [
  { p: [-148, -70] as [number, number] }, // mature tree, Dansoman W0 yard
  { p: [-107, -70] as [number, number] }, // moved off the old campusSt paint line
  { p: [-64, -70] as [number, number] },
  { p: [-17, -69.8] as [number, number] }, // Nima west yard
  { p: [70, -42] as [number, number] }, // moved off the ns2 corridor
  { p: [101, -24] as [number, number] }, // Teshie NW corner
  { p: [144, 2.5] as [number, number] }, // Teshie east edge (clear of eastLink)
  // Adabraka yards + alleys
  { p: [18.5, -25.6] as [number, number] },
  { p: [32, -25.6] as [number, number] },
  { p: [46.5, -25.6] as [number, number] },
  { p: [25.5, -19.1] as [number, number] },
  { p: [39.5, -19.1] as [number, number] },
  { p: [18, -2.6] as [number, number] },
  { p: [46, -2.6] as [number, number] },
]

const NB_PEOPLE: PropItem[] = [
  { p: [-120, -44.9] as [number, number], r: 1.2 },
  { p: [-95, -44.9] as [number, number], r: 4.4 },
  { p: [-70, -44.9] as [number, number], r: 2.6 },
  { p: [-2, -44.9] as [number, number], r: 0.8 },
  { p: [36, -44.9] as [number, number], r: 3.4 },
  { p: [144, -25.5] as [number, number], r: 5.1 },
  { p: [144, 20.8] as [number, number], r: 0.4 },
  // Adabraka lane life (kept 2.5 m+ off the car lane centerline)
  { p: [12, -11.5] as [number, number], r: 1.2 },
  { p: [18, -12.2] as [number, number], r: 2.5 },
  { p: [24, -10] as [number, number], r: 0.4 },
  { p: [33, -1.9] as [number, number], r: 4.0 },
  { p: [44, -11.8] as [number, number], r: 5.2 },
  { p: [4.2, -8.5] as [number, number], r: 2.8 },
  // market life: Dansoman W3 nook, Teshie coastal stalls, Nungua square
  { p: [-80.8, -61.2] as [number, number], r: 1.9 },
  { p: [117.2, 23.2] as [number, number], r: 0.9 },
  { p: [139.2, 23.1] as [number, number], r: 4.0 },
]

// shrub dressing on neighborhood yard corners (clearance-checked)
const NB_SHRUBS: PropItem[] = [
  { p: [-148.5, -56.8] as [number, number] },
  { p: [53.8, -68] as [number, number] }, { p: [128.5, -26.4] as [number, number] },
  { p: [142.5, 21.5] as [number, number] }, { p: [-104.5, -66.8] as [number, number] },
]
const NB_GRASS: PropItem[] = [
  { p: [-118.5, -66.5] as [number, number] }, { p: [-101.5, -68.4] as [number, number] },
  { p: [44.5, -68.6] as [number, number] }, { p: [8.5, -56.8] as [number, number] },
  { p: [141.5, -26.2] as [number, number] }, { p: [110.5, 22.9] as [number, number] },
]

function DansomanRows() {
  return (
    <group>
      {/* Task 12: plots listed in lib/businesses CONVERTED_PLOTS became
          businesses (TownLife) — the house is skipped, colours keep their index */}
      {DANSOMAN_ROW_A.flat().map(([x, z], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`da-${i}`} position={[x, 0, z]} rotation={Math.PI}
          wall={[COLORS.wallTeal, COLORS.wallOrange, COLORS.wallPink, COLORS.wallYellow, COLORS.wallGreen, COLORS.wallCream][i % 6]}
          w={HW} d={5.6} h={3.8} variant={i % 5} roof={i % 3 === 0 ? 'metal' : 'tile'}
        />
      ))}
      {DANSOMAN_ROW_B.flat().map(([x, z], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`db-${i}`} position={[x, 0, z]}
          wall={[COLORS.wallCream, COLORS.wallPink, COLORS.wallTeal, COLORS.wallYellow, COLORS.wallOrange, COLORS.wallGreen][i % 6]}
          w={HW} d={5.6} h={3.8} variant={(i + 2) % 5} roof={i % 3 === 1 ? 'metal' : 'tile'} walled={i === 3}
        />
      ))}
      {DANSOMAN_SOUTH_HOUSES.map(([x, z], i) => (
        <CompoundHouse key={`ds-${i}`} position={[x, 0, z]} rotation={Math.PI} wall={COLORS.wallGreen} w={HW} d={5.6} h={3.8} variant={1} />
      ))}
      {DANSOMAN_SOUTH_APARTMENTS.map(([x, z], i) => (
        <ApartmentBlock key={`dap-${i}`} position={[x, 0, z]} rotation={Math.PI} wall={i % 2 === 0 ? '#efe6da' : '#f4f1ea'} roof={i % 2 === 0 ? '#5d4480' : COLORS.roofPurple} />
      ))}
      {/* W3 row B apartment (was part of the old west crescent) */}
      <ApartmentBlock position={[-75, 0, -59]} wall="#efe6da" roof="#5d4480" />
      {/* neighborhood shops on Dansoman Ave frontage */}
      <Shop position={[-91, 0, -40.8]} rotation={Math.PI} sign="SCHOOL" signBg="#2e7fa8" wall={COLORS.wallCream} w={8} d={5} />
      <Shop position={[-72, 0, -66]} rotation={Math.PI} sign="AUNTIE MUNI CHOP BAR" signBg="#ce1126" wall={COLORS.wallYellow} w={5.5} d={5} />
      {/* Task 11 infill: east-end avenue house (audit-validated slot) + the
          W3-block market nook: 3 stalls + banner gate on the nsD3 edge */}
      <CompoundHouse position={[-68.5, 0, -42]} rotation={Math.PI} wall={COLORS.wallCream} w={6.4} d={5.6} h={3.8} variant={2} />
      <VendorTable position={[-82.5, 0, -62]} rotation={Math.PI / 2} colorIndex={1} />
      <VendorTable position={[-82.5, 0, -60]} rotation={-Math.PI / 2} colorIndex={3} />
      <VendorTable position={[-82.5, 0, -57.2]} rotation={Math.PI / 2} colorIndex={0} />
      <BannerGate position={[-82.5, 0, -58.6]} rotation={Math.PI / 2} text="DANSOMAN MARKET" bg="#ce1126" fg="#fcd116" width={4} />
    </group>
  )
}

// Task 15: every generated Nima row house was rebuilt by <NimaQuarter />
// (typology mix + courtyard compound); the clinic, provisions kiosk, waakye
// hut and fruit stall below stay. The row-B east slot is the nima-2
// for-sale plot and stays empty.
const t15Nima = new Set(T15_REPLACED.nimaHouses.map(([x, z]) => `${x},${z}`))

function NimaRows() {
  return (
    <group>
      {NIMA_ROW_X.map((x, i) => isConverted(x, -66) || t15Nima.has(`${x},-66`) ? null : (
        <CompoundHouse
          key={`na-${i}`} position={[x, 0, -66]} rotation={Math.PI}
          wall={[COLORS.wallPink, COLORS.wallTeal, COLORS.wallCream, COLORS.wallYellow, COLORS.wallGreen, COLORS.wallOrange][i % 6]}
          w={HW} d={5.6} h={3.8} variant={i % 5} roof={i % 2 === 0 ? 'tile' : 'metal'}
        />
      ))}
      {NIMA_ROW_X.map((x, i) => isConverted(x, -59) || t15Nima.has(`${x},-59`) ? null : (
        <CompoundHouse
          key={`nb-${i}`} position={[x, 0, -59]}
          wall={[COLORS.wallYellow, COLORS.wallGreen, COLORS.wallOrange, COLORS.wallCream, COLORS.wallPink, COLORS.wallTeal][i % 6]}
          w={HW} d={5.6} h={3.8} variant={(i + 1) % 5} roof={i % 2 === 0 ? 'metal' : 'tile'} walled={i === 4}
        />
      ))}
      <Shop position={[18, 0, -41.7]} rotation={Math.PI} sign="CLINIC" signBg="#ce1126" wall={COLORS.wallCream} w={8} d={5} />
      <Kiosk position={[-3, 0, -68.7]} rotation={Math.PI} sign="PROVISIONS" signBg="#e08a3c" wall={COLORS.wallPink} />
      {/* Task 11: avenue-front house + food hut in the west yard + a fruit
          stall by the clinic (all audit-validated slots) */}
      <CompoundHouse position={[-28, 0, -42]} rotation={Math.PI} wall={COLORS.wallGreen} w={6.4} d={5.6} h={3.8} variant={3} />
      <MarketHut position={[-23.5, 0, -60]} rotation={Math.PI / 2} sign="WAAKYE" roofColor="#4f9e4f" />
      <VendorTable position={[21, 0, -38.4]} rotation={Math.PI} colorIndex={2} />
    </group>
  )
}

function TeshieRows() {
  return (
    <group>
      {TESHIE_NORTH.map(([x, z], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`tn-${i}`} position={[x, 0, z]} rotation={i < 2 ? Math.PI : 0}
          wall={[COLORS.wallTeal, COLORS.wallCream, COLORS.wallOrange, COLORS.wallPink][i % 4]}
          w={HW} d={5.6} h={3.8} variant={i % 5} roof={i < 2 ? 'metal' : 'tile'}
        />
      ))}
      {/* mid block — back-to-back pair around the z −4 alley; row A doors face
          the ew2 side (rot π), row B doors face the ew1 side (rot 0). The
          west south plot is the walled compound. */}
      {TESHIE_MID_X.map((x, i) => (
        <CompoundHouse
          key={`tm-${i}`} position={[x, 0, -7.5]} rotation={Math.PI}
          wall={[COLORS.wallGreen, COLORS.wallYellow, COLORS.wallCream][i % 3]}
          w={HW} d={5.6} h={3.8} variant={(i + 1) % 5} roof={i % 2 === 0 ? 'metal' : 'tile'}
        />
      ))}
      {TESHIE_MID_X.map((x, i) => (
        <CompoundHouse
          key={`tmb-${i}`} position={[x, 0, -0.5]} rotation={0}
          wall={i === 0 ? COLORS.wallYellow : [COLORS.wallPink, COLORS.wallOrange][i - 1]}
          w={HW} d={5.6} h={3.8} variant={(i + 3) % 5} roof="tile" walled={i === 0}
        />
      ))}
      {/* south row — doors face the beach walk (coastal rd) */}
      {TESHIE_SOUTH.map(([x, z], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`ts-${i}`} position={[x, 0, z]} rotation={0}
          wall={[COLORS.wallCream, COLORS.wallTeal, COLORS.wallOrange][i % 3]}
          w={HW} d={5.6} h={3.8} variant={(i + 2) % 5} roof="tile"
        />
      ))}
      {/* DRINKS kiosk re-seated: the old plot at (129, 8.2) stood inside the
          ew1 carriageway */}
      <Kiosk position={[133, 0, 21.9]} sign="COLD DRINKS" signBg="#2e7fa8" wall={COLORS.wallCream} />
      {/* Task 11 Teshie market corner: kiosk row in the north-block gap +
          stalls on the coastal front + a beach shack (audit-validated) */}
      <Kiosk position={[131.5, 0, -18.8]} rotation={0} sign="TAILOR" signBg="#8e6fae" wall={COLORS.wallCream} />
      <Kiosk position={[135.5, 0, -18.8]} rotation={0} sign="PHONE CHARGE" signBg="#ffcb05" wall={COLORS.wallPink} />
      <Kiosk position={[139.5, 0, -18.8]} rotation={0} sign="BARBER" signBg="#2e7fa8" wall={COLORS.wallYellow} />
      <Kiosk position={[133, 0, 3.6]} rotation={Math.PI} sign="KENKEYS" signBg="#ce1126" wall={COLORS.wallCream} />
      <VendorTable position={[116, 0, 22]} rotation={Math.PI} colorIndex={4} />
      <VendorTable position={[118, 0, 22]} rotation={0} colorIndex={1} />
      <VendorTable position={[137.6, 0, 22]} rotation={Math.PI} colorIndex={2} />
      <VendorTable position={[142.3, 0, 22]} rotation={0} colorIndex={0} /> {/* Task 12: tables spread to clear the hotel door */}
      {/* beachfront shack east of the volleyball court */}
      <BeachStall position={[115, 0, 40.5]} rotation={Math.PI} sign="DRINKS & GRILL" roofColor="#e08a3c" />
    </group>
  )
}

// ── ADABRAKA grid (the large central neighborhood between ns1 & ns2) ────────
// Full compound grid on the old east-village scatter: 4 rows × 6 plots.
//   row A z −22.6  doors north to the ew2 front walk (rot π)
//   row B z −15.6  doors south to the mid lane (rot 0)  — alley z −19.1
//   row C z −6.4   doors north to the mid lane (rot π)
//   row D z  1.2   doors south to the ew1 front walk (rot 0) — alley z −2.6
// Columns every 7 m starting x 15 (6.4 m houses, 0.6 m party gaps); N-S foot
// lane x 9.5, mid lane z −11. Every plot ≥1.5 m clear of every road band.
const ADABRAKA_X = [15, 22, 29, 36, 43, 50]
const ADABRAKA_WALLS = [
  COLORS.wallTeal, COLORS.wallOrange, COLORS.wallPink,
  COLORS.wallYellow, COLORS.wallGreen, COLORS.wallCream,
]

function AdabrakaGrid() {
  return (
    <group>
      {ADABRAKA_X.map((x, i) => isConverted(x, -22.6) ? null : (
        <CompoundHouse
          key={`aa-${i}`} position={[x, 0, -22.6]} rotation={Math.PI}
          wall={ADABRAKA_WALLS[i]} w={HW} d={5.6} h={3.8} variant={i % 5}
          roof={i % 3 === 0 ? 'metal' : 'tile'}
        />
      ))}
      {ADABRAKA_X.map((x, i) => isConverted(x, -15.6) ? null : (
        <CompoundHouse
          key={`ab-${i}`} position={[x, 0, -15.6]} rotation={0}
          wall={ADABRAKA_WALLS[(i + 3) % 6]} w={HW} d={5.6} h={3.8} variant={(i + 2) % 5}
          roof={i % 3 === 1 ? 'metal' : 'tile'} walled={i === 3}
        />
      ))}
      {ADABRAKA_X.map((x, i) => isConverted(x, -6.4) ? null : (
        <CompoundHouse
          key={`ac-${i}`} position={[x, 0, -6.4]} rotation={Math.PI}
          wall={ADABRAKA_WALLS[(i + 1) % 6]} w={HW} d={5.6} h={3.8} variant={(i + 4) % 5}
          roof={i % 2 === 0 ? 'tile' : 'metal'}
        />
      ))}
      {ADABRAKA_X.map((x, i) => isConverted(x, 1.2) ? null : (
        <CompoundHouse
          key={`ad-${i}`} position={[x, 0, 1.2]} rotation={0}
          wall={ADABRAKA_WALLS[(i + 5) % 6]} w={HW} d={5.6} h={3.8} variant={(i + 1) % 5}
          roof={i % 3 === 2 ? 'metal' : 'tile'} walled={i === 1}
        />
      ))}
      {/* lane-side kiosks fronting the grid (the (9.5,-13) kiosk moved to
          (6.5,-16.5): the N-S lane is now a car road — adabrakaLane) */}
      <Kiosk position={[6.5, 0, -16.5]} rotation={-Math.PI / 2} sign="ADABRAKA STORES" signBg="#4f9e4f" wall={COLORS.wallCream} />
      <Kiosk position={[32, 0, -2.5]} sign="DRINKS" signBg="#2e7fa8" wall={COLORS.wallPink} />
      <Kiosk position={[51.5, 0, -11]} rotation={Math.PI / 2} sign="MAAME'S CHOP BAR" signBg="#ce1126" wall={COLORS.wallYellow} />
      {/* Task 11: west column along ns1 (3 houses — a 4th at the row-D slot
          physically cannot clear the Circle roundabout ring) + two alley-head
          stalls */}
      {[
        [-1.5, -22.6, Math.PI, 0], [-1.5, -15.6, 0, 2], [-1.5, -6.4, Math.PI, 4],
      ].map(([x, z, rot, v], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`aw-${i}`} position={[x, 0, z]} rotation={rot}
          wall={[COLORS.wallYellow, COLORS.wallTeal, COLORS.wallPink, COLORS.wallGreen][i]}
          w={6.4} d={5.6} h={3.8} variant={v as number} roof={i % 2 === 0 ? 'metal' : 'tile'}
        />
      ))}
      <VendorTable position={[0.2, 0, -11]} rotation={Math.PI / 2} colorIndex={2} />
      <VendorTable position={[-2.6, 0, -11]} rotation={-Math.PI / 2} colorIndex={4} />
    </group>
  )
}

export function Neighborhoods() {
  return (
    <group>
      <DansomanRows />
      <NimaRows />
      <TeshieRows />
      <AdabrakaGrid />

      {/* ── apartment pair fronting ns2 east side (kept) ── */}
      <ApartmentBlock position={[70.5, 0, -22]} h={8} wall="#efe6da" />
      <ApartmentBlock position={[82, 0, -22]} h={10} rotation={0.03} wall="#f4f1ea" roof="#5d4480" />

      {/* ── west infill by the playground (kept) ── */}
      <CompoundHouse position={[-100, 0, 2]} wall={COLORS.wallCream} w={6.2} d={5.6} h={3.8} />
      <CompoundHouse position={[-100, 0, -22]} rotation={0.06} wall={COLORS.wallPink} w={6.2} d={5.6} h={3.8} />

      <InstancedLamps items={NB_LAMPS} />
      <InstancedTrees items={NB_TREES} />
      <InstancedPeople items={NB_PEOPLE} />
      <InstancedShrubs items={NB_SHRUBS} />
      <InstancedGrassTufts items={NB_GRASS} />
    </group>
  )
}
