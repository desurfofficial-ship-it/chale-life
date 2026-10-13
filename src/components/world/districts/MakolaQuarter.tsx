'use client'

// ─── District: Makola Quarter — Makola Market, tro-tro station, mosque, ─────
// ─── and the community playground ───────────────────────────────────────────
import { MakolaMarket, TrotroShelter } from '../../scene/Landmarks'
import { MarketGate, Kiosk, VendorTable, BasketStack, CrateStack, FabricRack, ChurchHall, UtilityPole, Wire } from '../../scene/Expansion3'
import { Shop, CompoundHouse } from '../../scene/Buildings'
import { Mosque, Playground } from '../../scene/Expansion2'
import { TrotroBus } from '../../scene/Movers'
import { InstancedPeople, type PropItem } from '../InstancedNature'
import { COLORS } from '@/lib/mapConfig'

const MKT_PEOPLE_MARKET: PropItem[] = [
  { p: [-44, -6], r: 1.9 }, { p: [-36, -13], r: 0.6 }, { p: [-26, -20], r: 2.2 }, { p: [-50, -28], r: 1.1 },
]
const MKT_PEOPLE_STATION: PropItem[] = [{ p: [-14, -57], r: 1.3 }, { p: [0, -62], r: 2.8 }]

export function MakolaQuarter() {
  return (
    <group>
      {/* ── Makola market core + expansion ── */}
      <MakolaMarket />
      {/* KENTE shop pulled north out of the ew2 band (was z −28 → 3.2 m
          into the carriageway, blocked the market stretch for cars) */}
      <Shop position={[-18.5, 0, -24.5]} sign="KENTE" signBg="#fcd116" wall={COLORS.wallPink} w={7} d={4.5} h={3.4} />
      <MarketGate position={[-36, 0, 4.5]} />
      <FabricRack position={[-53, 0, -29.2]} />
      <FabricRack position={[-46, 0, -29.2]} />
      <FabricRack position={[-36, 0, -29.2]} />
      <Kiosk position={[-50, 0, 0.5]} sign="BAKERY" signBg="#e08a3c" />
      <Kiosk position={[-42, 0, 0.5]} sign="MOMO AGENT" signBg="#ffcb05" wall={COLORS.wallTeal} />
      <Kiosk position={[-26, 0, 0.5]} sign="DRINKS" signBg="#2e7fa8" />
      <VendorTable position={[-46, 0, -6]} colorIndex={0} />
      <VendorTable position={[-28, 0, -6]} colorIndex={2} rotation={0.2} />
      <BasketStack position={[-52, 0, -6]} />
      <CrateStack position={[-24, 0, -6]} />
      <InstancedPeople items={MKT_PEOPLE_MARKET} />

      {/* ── tro-tro station (parked buses, car-free diorama) ── */}
      <TrotroShelter position={[-36, 0, -58]} />
      {([[-31, -63, -Math.PI / 2], [-37, -63, -Math.PI / 2], [-43, -63, -Math.PI / 2], [-31, -68, Math.PI / 2]] as [number, number, number][]).map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]} scale={0.92}>
          <TrotroBus />
        </group>
      ))}

      {/* ── central mosque ── */}
      <Mosque position={[-58, 0, -58]} />

      {/* ── playground ── */}
      <Playground position={[-100, 0, -12]} />

      {/* ── neighborhood by the station ── */}
      <CompoundHouse position={[-18, 0, -60]} wall={COLORS.wallTeal} />
      <CompoundHouse position={[-1.7, 0, -59.5]} rotation={0.05} wall={COLORS.wallYellow} />
      {/* PROVISIONS shop re-seated as a roadside kiosk: the old 8×5 shop stood
          across the nimaN1 spine (5.5 m of the carriageway was under it) */}
      {/* Task 15: the orphaned duplicate PROVISIONS kiosk stood at (3, -59.5) with its
    sign panel 5 cm inside the nimaN1 band; relocated to the Nima campusSt
    retail row (28.5, -44.3) as part of the audited pass. */}
      <ChurchHall position={[-20, 0, -66.5]} />
      <UtilityPole position={[-23, 0, -56]} />
      <UtilityPole position={[-23, 0, -63]} />
      <UtilityPole position={[-23, 0, -69]} />
      <Wire from={[-23, 6.05, -56]} to={[-23, 6.05, -63]} />
      <Wire from={[-23, 6.05, -63]} to={[-23, 6.05, -69]} />
      <InstancedPeople items={MKT_PEOPLE_STATION} />
    </group>
  )
}
