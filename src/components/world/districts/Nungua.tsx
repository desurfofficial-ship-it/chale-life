'use client'

// ─── District: NUNGUA (Task 11) — the land-extension neighborhood ────────────
// The map plate grew east (x 160…212): Nungua fills it with a full compound
// grid — 4 rows × 6 columns (22 houses + 2 in-grid land plots), 6 beach shops
// along the coastal front, the Nungua market square on the mid alley, 2
// kiosks and a food hut. nsN1 (x 162) carries cars in from ew2/ew1/coastal;
// the alleys stay foot traffic. All placements validated by
// scripts/audit_candidates.py (33/33 passed on fresh colliders).
import { CompoundHouse, Shop } from '../../scene/Buildings'
import { BannerGate } from '../../scene/Expansion3'
import { COLORS } from '@/lib/mapConfig'
import { isConverted } from '@/lib/businesses'
import { StallRow, MarketHut, Kiosk } from './Markets'
import { LandPlot } from './LandForSale'
import {
  InstancedPeople, InstancedLamps, InstancedTrees, InstancedPalms,
  InstancedShrubs, InstancedGrassTufts, type PropItem,
} from '../InstancedNature'

const NUNG_COLS = [169, 176, 183, 190, 197, 204]
const NUNG_ROWS = [-24, -16, -8, 0]
// plots replace the two r1e/r2e houses + r3f house (buyable land in-grid)
const NUNG_PLOTS: [number, number][] = [[197, -24], [197, -16], [204, -8]]

const NUNG_WALLS = [
  COLORS.wallTeal, COLORS.wallOrange, COLORS.wallPink,
  COLORS.wallYellow, COLORS.wallGreen, COLORS.wallCream,
]

const NUNG_PEOPLE: PropItem[] = [
  { p: [166, -12.4] as [number, number], r: 1.1 },
  { p: [173, -4.2] as [number, number], r: 2.6 },
  { p: [180, -4.4] as [number, number], r: 4.4 },
  { p: [187.5, -3.9] as [number, number], r: 0.3 },
  { p: [194.5, -4.5] as [number, number], r: 2.1 },
  { p: [166.4, 12] as [number, number], r: 3.7 },
  { p: [206.5, 10.5] as [number, number], r: 5.5 },
  { p: [186, 18.2] as [number, number], r: 1.6 },
  { p: [171, -21.5] as [number, number], r: 3.2 },
]

const NUNG_LAMPS: PropItem[] = [
  // Task 12: the two alley-end lamps stood mid-alley (2.4 m) and, with the
  // x>186 colliders now exported, sealed the district node — pushed to the wall
  { p: [167.5, -12.95] as [number, number], r: 0 },
  { p: [206.5, -12.95] as [number, number], r: Math.PI },
  { p: [186.5, 8.5] as [number, number], r: 0 },
  { p: [186.5, -12.5] as [number, number], r: Math.PI },
]

const NUNG_TREES: PropItem[] = [
  { p: [167.5, -22.6] as [number, number] },
  { p: [206.8, -22.8] as [number, number] },
]

const NUNG_PALMS: PropItem[] = [
  { p: [166.5, 34] as [number, number] },
  { p: [174, 34] as [number, number] },
  { p: [188, 34.2] as [number, number] },
  { p: [202, 34] as [number, number] },
  { p: [209.5, 33.8] as [number, number] },
]

// shrub dressing in the front walks and block corners (clearance-audited)
const NUNG_SHRUBS: PropItem[] = [
  { p: [166.9, 4.2] as [number, number] }, { p: [200.6, 4.2] as [number, number] },
  { p: [206.6, 4.2] as [number, number] }, { p: [167.5, -4.2] as [number, number] },
  { p: [179.4, 16.8] as [number, number] }, { p: [193.6, 16.6] as [number, number] },
]
const NUNG_GRASS: PropItem[] = [
  { p: [168.2, -13.4] as [number, number] }, { p: [181.4, -13.2] as [number, number] },
  { p: [195.8, -13.6] as [number, number] }, { p: [203.4, -13.1] as [number, number] },
  { p: [170.6, 8.9] as [number, number] }, { p: [184.8, 9.1] as [number, number] },
  { p: [198.2, 8.7] as [number, number] }, { p: [205.6, 9] as [number, number] },
  { p: [173.2, 16.2] as [number, number] }, { p: [190.4, 16.4] as [number, number] },
]

function isPlot(x: number, z: number) {
  return NUNG_PLOTS.some(([px, pz]) => px === x && pz === z)
}

export function Nungua() {
  return (
    <group>
      {/* compound grid: 4 rows × 6 cols, doors facing the alley/avenue */}
      {NUNG_ROWS.map((z, r) =>
        NUNG_COLS.map((x, c) =>
          isPlot(x, z) || isConverted(x, z) ? null : (
            <CompoundHouse
              key={`ng-${r}-${c}`} position={[x, 0, z]}
              rotation={r % 2 === 0 ? Math.PI : 0}
              wall={NUNG_WALLS[(r + c) % 6]} w={6.4} d={5.6} h={3.8}
              variant={(r * 2 + c) % 5} roof={(r + c) % 3 === 0 ? 'metal' : 'tile'}
              walled={false} /* Task 12: the r1c3 courtyard wall stood across the 2.4 m alley and sealed the district node — it gets an audited lawn yard instead */
            />
          )
        )
      )}
      {/* in-grid land-for-sale plots (row 1/2 east + row 3 east) */}
      {NUNG_PLOTS.map(([x, z], i) => (
        <LandPlot key={`ngp-${i}`} x={x} z={z} w={5.6} d={5.6} signRot={i % 2 === 0 ? 0 : Math.PI} />
      ))}
      {/* coastal front: 6 neighborhood shops + food hut at the east end */}
      {NUNG_COLS.map((x, i) => (
        <Shop
          key={`ngs-${i}`} position={[x, 0, 20.5]} rotation={Math.PI}
          sign={['BAKERY', "ESI'S BOUTIQUE", 'PHARMACY', 'PHONE HUB', 'OBAA YAA CHOP BAR', 'SALON'][i]}
          signBg={['#2e7fa8', '#d4557a', '#4f9e4f', '#ffcb05', '#ce1126', '#8e6fae'][i]}
          wall={NUNG_WALLS[i]} w={6} d={5}
        />
      ))}
      {/* ICE BLOCKS hut moved off the nunguaE lane (was at 208.5, 20.5) */}
      <MarketHut position={[209.4, 0, 40]} rotation={Math.PI / 2} sign="ICE BLOCKS" roofColor="#2e7fa8" />
      {/* market square on the mid alley: gate + 4 stalls */}
      <BannerGate position={[203.8, 0, -4.2]} rotation={0} text="NUNGUA MARKET" bg="#ce1126" fg="#fcd116" width={6.4} />
      <StallRow from={[172, -4.2]} count={4} step={7} axis="x" colorIndex={2} />
      {/* corner kiosks */}
      <Kiosk position={[167, 0, 16.2]} rotation={Math.PI} sign="NUNGUA STORES" signBg="#4f9e4f" wall={COLORS.wallCream} />
      <Kiosk position={[205.5, 0, 16.2]} rotation={Math.PI} sign="DRINKS" signBg="#2e7fa8" wall={COLORS.wallPink} />

      <InstancedPeople items={NUNG_PEOPLE} />
      <InstancedLamps items={NUNG_LAMPS} />
      <InstancedTrees items={NUNG_TREES} />
      <InstancedPalms items={NUNG_PALMS} />
      <InstancedShrubs items={NUNG_SHRUBS} />
      <InstancedGrassTufts items={NUNG_GRASS} />
    </group>
  )
}
