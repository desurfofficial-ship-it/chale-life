'use client'

// ─── District: CHORKOR (Task 11) — market-row neighborhood by the Daavi St ──
// The west quarter south of the highway: one compound row facing the Chorkor
// market street (6 stalls + a food hut + the market kiosk, between the
// Jamestown village row and the Daavi street frontage). Two land-for-sale
// plots in this zone render via <LandForSale>. Every placement validated by
// scripts/audit_candidates.py.
import { CompoundHouse } from '../../scene/Buildings'
import { COLORS } from '@/lib/mapConfig'
import { isConverted } from '@/lib/businesses'
import { StallRow, MarketHut, Kiosk } from './Markets'
import { InstancedPeople, InstancedLamps, type PropItem } from '../InstancedNature'

const CHK_ROW: [number, number][] = [
  [-146, -14.5], [-139, -14.5], [-129.5, -14.5], [-122.5, -14.5], [-116, -14.5],
]
const CHK_WALLS = [COLORS.wallTeal, COLORS.wallOrange, COLORS.wallPink, COLORS.wallYellow, COLORS.wallGreen]

const CHK_PEOPLE: PropItem[] = [
  { p: [-151.6, -11.2] as [number, number], r: 0.6 }, // moved out of the Daavi house footprint (onboarding camera path)
  { p: [-137, -7.2] as [number, number], r: 2.4 },
  { p: [-131, -6.9] as [number, number], r: 4.1 },
  { p: [-126.5, -6.4] as [number, number], r: 5.3 },
  { p: [-120.5, -7.6] as [number, number], r: 1.8 },
  { p: [-115.6, -6.2] as [number, number], r: 3.0 },
  { p: [-133, -20.5] as [number, number], r: 2.2 },
]

const CHK_LAMPS: PropItem[] = [
  { p: [-151.2, -0.6] as [number, number], r: Math.PI }, // pavement — was inside the Daavi house footprint
  { p: [-117, -6.2] as [number, number], r: 0 },
]

export function Chorkor() {
  return (
    <group>
      {/* compound row — doors face the market street (south, rot 0) */}
      {/* Task 12: the east plot (-116) is now CHORKOR MINI MART (TownLife) */}
      {CHK_ROW.map(([x, z], i) => isConverted(x, z) ? null : (
        <CompoundHouse
          key={`ck-${i}`} position={[x, 0, z]}
          wall={CHK_WALLS[i]} w={6.4} d={5.6} h={3.8} variant={i % 5}
          roof={i % 3 === 0 ? 'metal' : 'tile'} walled={i === 2}
        />
      ))}
      {/* the market street: 6 stalls + gate + hut anchors */}
      <StallRow from={[-139, -8]} count={6} step={4} axis="x" colorIndex={1} />
      <MarketHut position={[-114.5, 0, -8]} rotation={0} sign="MAAME AFIA CHOP BAR" roofColor="#ce1126" />
      <Kiosk position={[-141, 0, -6.2]} rotation={Math.PI / 2} sign="CHORKOR MARKET" signBg="#ce1126" wall={COLORS.wallCream} />
      {/* plots are rendered by <LandForSale> from LAND_PLOTS (both Chorkor
          plots are in the shared list — no local copies here) */}

      <InstancedPeople items={CHK_PEOPLE} />
      <InstancedLamps items={CHK_LAMPS} />
    </group>
  )
}
