'use client'

// ─── District: Kotoka Airport — terminal, parked plane, and Airport City ────
import { AirportTerminal, ParkedPlane } from '../../scene/Expansion'
import { GlassTower, Building } from '../../scene/Buildings'
import { ApartmentBlock } from '../../scene/Expansion2'
import { ParkingDeck } from '../../scene/Expansion3'
import { GhanaFlag } from '../../scene/Nature'
import { InstancedLamps, InstancedPalms, InstancedPeople, type PropItem } from '../InstancedNature'
import { COLORS } from '@/lib/mapConfig'

const APC_LAMPS: PropItem[] = [
  { p: [74, -91.7] }, { p: [88, -91.7] }, { p: [102, -91.7] }, { p: [116, -91.7] },
  { p: [-124, -91.7] }, { p: [-108, -91.7] }, { p: [-92, -91.7] },
]
const APC_PALMS: PropItem[] = [
  { p: [65, -81.5] }, { p: [65, -92], s: 1.05 }, { p: [67, -94], s: 0.9 },
  { p: [-136, -92] }, { p: [-120, -91.5], s: 0.95 }, { p: [-104, -92], s: 1.05 },
]
const APC_PEOPLE: PropItem[] = [
  { p: [80, -92.2], r: 2.5 }, { p: [96, -92.2], r: 0.7 }, { p: [110, -92.2], r: 1.9 },
]

export function AirportDistrict() {
  return (
    <group>
      <AirportTerminal position={[30, 0, -94.5]} />
      {/* plane re-parked on the west apron, nose-in toward the terminal: the
          old spot (18, -99.5) rammed the tail fin and rear fuselage straight
          through the terminal body (x 17–43, z −98…−91) */}
      <ParkedPlane position={[10, 0, -96.5]} rotation={0} />

      {/* ── AIRPORT CITY towers + hotels ── */}
      <GlassTower position={[78, 0, -95.5]} height={22} w={9} d={9} />
      <GlassTower position={[92, 0, -95.5]} height={27} w={10} d={10} hue="#2d5a4e" />
      <GlassTower position={[106, 0, -95.5]} height={21} w={9} d={9} hue="#54396b" />
      <GlassTower position={[120, 0, -95.5]} height={24} w={10} d={10} hue="#6b3b32" />
      <ApartmentBlock position={[56, 0, -95.5]} h={11} wall="#efe6da" roof="#5d4480" />
      <ParkingDeck position={[130, 0, -95.5]} />
      <ApartmentBlock position={[-128, 0, -97]} wall="#f4f1ea" />
      <ApartmentBlock position={[-112, 0, -97]} rotation={0.05} wall="#efe6da" roof="#7a5a9e" />
      <Building position={[-96, 4, -97]} size={[12, 8, 8]} wall={COLORS.wallCream} facadeKey="apcity-office" rows={2} cols={5} litRatio={0.6} />
      <InstancedLamps items={APC_LAMPS} />
      <GhanaFlag position={[68, 0, -92]} />
      <InstancedPalms items={APC_PALMS} />
      <InstancedPeople items={APC_PEOPLE} />
    </group>
  )
}
