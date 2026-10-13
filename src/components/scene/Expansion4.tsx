'use client'

// ─── Phase 2 world composition ───────────────────────────────────────────────
// A. Black Star Square + Independence Arch grounds   E. Labadi beach strip
// B. Kwame Nkrumah Memorial Park precinct            F. Osu Oxford Street
// C. Makola Market expansion                         G. Airport City
// D. Chale Wote / Jamestown heritage block           H. Everyday neighborhoods
import {
  BlackStarGate,
  Grandstand,
  FloodlightMast,
  MemorialPool,
  ParkWalls,
  ParkEntrance,
  MarketGate,
  Kiosk,
  VendorTable,
  BasketStack,
  CrateStack,
  FabricRack,
  Mural,
  ColonialBuilding,
  BoxingGym,
  Bunting,
  StringLights,
  BeachStall,
  Lounger,
  VolleyballCourt,
  BannerGate,
  UtilityPole,
  Wire,
  ChurchHall,
  ParkingDeck,
} from './Expansion3'
import { Building, GlassTower, CompoundHouse, Shop } from './Buildings'
import { ApartmentBlock, Bench, Rocks } from './Expansion2'
import { GhanaFlag, StreetLamp, Palm, Tree, Person } from './Nature'
import { Canoe } from './Movers'
import { COLORS } from '@/lib/mapConfig'

export function Phase2World() {
  return (
    <group>
      {/* ═══ A. BLACK STAR SQUARE & INDEPENDENCE ARCH grounds ═══ */}
      <group>
        <BlackStarGate position={[-48, 0, 10]} />
        <Grandstand position={[-82.75, 0, 19]} />
        <Grandstand position={[-35.25, 0, 19]} rotation={Math.PI} />
        <FloodlightMast position={[-87, 0, 13]} />
        <FloodlightMast position={[-87, 0, 24.5]} />
        <FloodlightMast position={[-31.5, 0, 13]} />
        <FloodlightMast position={[-31.5, 0, 24.5]} />
        {[-78, -71, -64, -57, -50, -44].map((x) => (
          <GhanaFlag key={x} position={[x, 0, 22.5]} scale={0.72} />
        ))}
        <Palm position={[-44, 0, 2]} />
        <Palm position={[-52, 0, 2]} />
        {([
          [-74, 24.3],
          [-60, 24.3],
          [-46, 24.3],
        ] as [number, number][]).map(([x, z], i) => (
          <Bench key={i} position={[x, 0, z]} />
        ))}
        <Person position={[-70, 0, 16]} rotation={2.1} />
        <Person position={[-60, 0, 22]} rotation={0.4} />
        <Person position={[-52, 0, 14]} rotation={1.2} />
        <Person position={[-44, 0, 20]} rotation={2.8} />
      </group>

      {/* ═══ B. KWAME NKRUMAH MEMORIAL PARK precinct ═══ */}
      <group>
        <MemorialPool position={[-78, 0, -0.8]} />
        <ParkWalls />
        <ParkEntrance position={[-65.5, 0, -16]} />
        <StreetLamp position={[-84, 0, -12]} rotation={-Math.PI / 2} />
        <StreetLamp position={[-72, 0, -20]} rotation={-Math.PI / 2} />
        <Tree position={[-88, 0, -20]} />
        <Tree position={[-68, 0, -28]} scale={0.9} />
        <Tree position={[-86, 0, -4]} scale={1.05} />
        <Bench position={[-73, 0, -6]} rotation={0.3} />
        <Bench position={[-83, 0, -6]} rotation={-0.3} />
        <Bench position={[-72, 0, -28]} rotation={Math.PI} />
        <Person position={[-80, 0, -4]} rotation={1.7} />
        <Person position={[-74, 0, -18]} rotation={0.2} />
        <Person position={[-84, 0, -10]} rotation={2.4} />
        <Person position={[-68, 0, -24]} rotation={3.1} />
      </group>

      {/* ═══ C. MAKOLA MARKET EXPANSION ═══ */}
      <group>
        <Shop position={[-18.5, 0, -28]} sign="KENTE" signBg="#fcd116" wall={COLORS.wallPink} w={7} d={4.5} h={3.4} />
        <MarketGate position={[-36, 0, 4.5]} />
        <FabricRack position={[-56, 0, -29.2]} />
        <FabricRack position={[-46, 0, -29.2]} />
        <FabricRack position={[-36, 0, -29.2]} />
        <Kiosk position={[-50, 0, 0.5]} sign="BAKERY" signBg="#e08a3c" />
        <Kiosk position={[-42, 0, 0.5]} sign="MOMO AGENT" signBg="#ffcb05" wall={COLORS.wallTeal} />
        <Kiosk position={[-26, 0, 0.5]} sign="DRINKS" signBg="#2e7fa8" />
        <VendorTable position={[-46, 0, -6]} colorIndex={0} />
        <VendorTable position={[-28, 0, -6]} colorIndex={2} rotation={0.2} />
        <BasketStack position={[-52, 0, -6]} />
        <CrateStack position={[-24, 0, -6]} />
        <Person position={[-44, 0, -6]} rotation={1.9} />
        <Person position={[-36, 0, -13]} rotation={0.6} />
        <Person position={[-26, 0, -20]} rotation={2.2} />
        <Person position={[-50, 0, -28]} rotation={1.1} />
      </group>

      {/* ═══ D. CHALE WOTE & JAMESTOWN HERITAGE BLOCK ═══ */}
      <group>
        <ColonialBuilding position={[-140, 0, 10]} wall="#3aa08f" />
        <ColonialBuilding position={[-128, 0, 10]} wall="#d97b8f" />
        <BoxingGym position={[-121.5, 0, 10]} />
        {/* courtyard + standalone mural walls */}
        <mesh position={[-152, 1.2, 10]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 8]} />
          <meshStandardMaterial color="#d97b8f" roughness={0.85} />
        </mesh>
        <Mural position={[-151.7, 1.5, 10]} rotation={Math.PI / 2} w={7} h={1.9} variant={0} />
        <mesh position={[-154, 1.3, 20]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.6, 7]} />
          <meshStandardMaterial color="#3aa08f" roughness={0.85} />
        </mesh>
        <Mural position={[-153.7, 1.6, 20]} rotation={Math.PI / 2} w={6} h={2.2} variant={1} />
        <Mural position={[-140, 4.75, 13.08]} w={7} h={1.5} variant={1} />
        <Mural position={[-128, 4.75, 13.08]} w={7} h={1.5} variant={2} />
        <Mural position={[-125.35, 1.6, 10]} rotation={-Math.PI / 2} w={5.2} h={2} variant={2} />
        {/* festival dressing */}
        <Bunting position={[-137, 5.4, 6.8]} length={24} />
        <Bunting position={[-137, 5.4, 13.2]} length={24} />
        <Bunting position={[-147, 5, 10]} rotation={Math.PI / 2} length={6.5} />
        <StringLights position={[-149, 0, 10]} span={6} />
        <VendorTable position={[-145, 0, 8]} colorIndex={3} rotation={0.5} />
        <VendorTable position={[-145, 0, 12]} colorIndex={1} rotation={-0.4} />
        <Bench position={[-143.5, 0, 10]} rotation={Math.PI / 2} />
        <Person position={[-140, 0, 14]} rotation={1.4} />
        <Person position={[-128, 0, 7]} rotation={0.8} />
        <Person position={[-120, 0, 13]} rotation={2.9} />
        <Person position={[-146, 0, 8]} rotation={0.1} />
      </group>

      {/* ═══ E. LABADI BEACH RECREATION DISTRICT ═══ */}
      <group>
        <BeachStall position={[20, 0, 40.5]} rotation={Math.PI} sign="KELEWELE" />
        <BeachStall position={[33, 0, 40.5]} rotation={Math.PI} sign="COCONUTS" roofColor="#e08a3c" />
        <BeachStall position={[47, 0, 40.5]} rotation={Math.PI} sign="GRILLED FISH" roofColor="#b58a4e" />
        <BeachStall position={[64, 0, 40.5]} rotation={Math.PI} sign="DRINKS" roofColor="#3aa08f" />
        <VolleyballCourt position={[34, 0, 43.8]} />
        {[48, 50, 52, 54].map((x) => (
          <Lounger key={x} position={[x, 0, 43.5]} rotation={0.15} />
        ))}
        <Canoe position={[58, 0, 43.5]} rotation={0.4} colorIndex={1} />
        <Canoe position={[63, 0, 44.2]} rotation={-0.3} colorIndex={3} />
        <StreetLamp position={[16, 0, 36.9]} rotation={Math.PI} />
        <StreetLamp position={[44, 0, 36.9]} rotation={Math.PI} />
        <StreetLamp position={[68, 0, 36.9]} rotation={Math.PI} />
        <Palm position={[10, 0, 44.5]} />
        <Palm position={[70, 0, 44.5]} scale={1.05} />
        <Palm position={[86, 0, 44]} scale={0.95} />
        <BannerGate position={[79, 0, 36.5]} text="FUN ZONE" bg="#006b3f" fg="#fcd116" width={6} />
        <Person position={[18, 0, 42]} rotation={2.6} />
        <Person position={[35, 0, 44.5]} rotation={0.9} />
        <Person position={[55, 0, 42.5]} rotation={1.8} />
        <Person position={[70, 0, 38]} rotation={2.2} />
      </group>

      {/* ═══ F. OSU OXFORD STREET ═══ */}
      <group>
        <Shop position={[53, 0, -14]} rotation={-Math.PI / 2} sign="BOUTIQUE" signBg="#d4557a" wall={COLORS.wallCream} />
        <Shop position={[53, 0, -7]} rotation={-Math.PI / 2} sign="MELCOM" signBg="#ffcb05" wall={COLORS.wallTeal} />
        <Shop position={[53, 0, 0]} rotation={-Math.PI / 2} sign="CAFFE OSU" signBg="#3aa08f" wall={COLORS.wallYellow} />
        <Shop position={[53, 0, 18.5]} rotation={-Math.PI / 2} sign="BARBER" signBg="#ce1126" wall={COLORS.wallCream} />
        <Shop position={[67, 0, 4]} rotation={Math.PI / 2} sign="BANK" signBg="#2e7fa8" wall={COLORS.wallCream} />
        <Shop position={[67, 0, 12]} rotation={Math.PI / 2} sign="CHOP BAR" signBg="#e08a3c" wall={COLORS.wallOrange} />
        <BannerGate position={[60, 0, -28]} text="OXFORD STREET" bg="#54396b" fg="#ffe9b0" width={11} />
        <StreetLamp position={[55, 0, -19.5]} />
        <StreetLamp position={[55, 0, -1.5]} />
        <StreetLamp position={[55, 0, 13.5]} />
        <StreetLamp position={[65, 0, -19.5]} rotation={Math.PI} />
        <StreetLamp position={[65, 0, -1.5]} rotation={Math.PI} />
        <StreetLamp position={[65, 0, 19]} rotation={Math.PI} />
        <UtilityPole position={[66.5, 0, -14]} />
        <UtilityPole position={[66.5, 0, -6]} />
        <Wire from={[66.5, 6.05, -14]} to={[66.5, 6.05, -6]} />
        <Person position={[57, 0, -10]} rotation={2.7} />
        <Person position={[63, 0, 3]} rotation={0.5} />
        <Person position={[58, 0, 14]} rotation={1.6} />
        <Person position={[62, 0, 20]} rotation={3.3} />
      </group>

      {/* ═══ G. AIRPORT CITY ═══ */}
      <group>
        <GlassTower position={[78, 0, -95.5]} height={22} w={9} d={9} />
        <GlassTower position={[92, 0, -95.5]} height={27} w={10} d={10} hue="#2d5a4e" />
        <GlassTower position={[106, 0, -95.5]} height={21} w={9} d={9} hue="#54396b" />
        <GlassTower position={[120, 0, -95.5]} height={24} w={10} d={10} hue="#6b3b32" />
        <ApartmentBlock position={[56, 0, -95.5]} h={11} wall="#efe6da" roof="#5d4480" />
        <ParkingDeck position={[130, 0, -95.5]} />
        <ApartmentBlock position={[-128, 0, -97]} wall="#f4f1ea" />
        <ApartmentBlock position={[-112, 0, -97]} rotation={0.05} wall="#efe6da" roof="#7a5a9e" />
        <Building position={[-96, 4, -97]} size={[12, 8, 8]} wall={COLORS.wallCream} facadeKey="apcity-office" rows={2} cols={5} litRatio={0.6} />
        <StreetLamp position={[74, 0, -91.7]} />
        <StreetLamp position={[88, 0, -91.7]} />
        <StreetLamp position={[102, 0, -91.7]} />
        <StreetLamp position={[116, 0, -91.7]} />
        <StreetLamp position={[-124, 0, -91.7]} />
        <StreetLamp position={[-108, 0, -91.7]} />
        <StreetLamp position={[-92, 0, -91.7]} />
        <GhanaFlag position={[68, 0, -92]} />
        <Palm position={[65, 0, -78]} />
        <Palm position={[65, 0, -92]} scale={1.05} />
        <Palm position={[67, 0, -94]} scale={0.9} />
        <Palm position={[-136, 0, -92]} />
        <Palm position={[-120, 0, -91.5]} scale={0.95} />
        <Palm position={[-104, 0, -92]} scale={1.05} />
        <Person position={[80, 0, -92.2]} rotation={2.5} />
        <Person position={[96, 0, -92.2]} rotation={0.7} />
        <Person position={[110, 0, -92.2]} rotation={1.9} />
      </group>

      {/* ═══ H. EVERYDAY GHANAIAN NEIGHBORHOODS ═══ */}
      <group>
        {/* north-west quarter, by the trotro station */}
        <CompoundHouse position={[-18, 0, -60]} wall={COLORS.wallTeal} />
        <CompoundHouse position={[-7, 0, -59.5]} rotation={0.05} wall={COLORS.wallYellow} />
        <Shop position={[4, 0, -57.5]} rotation={Math.PI} sign="PROVISIONS" signBg="#4f9e4f" wall={COLORS.wallCream} w={8} d={5} />
        <ChurchHall position={[-4, 0, -66.5]} />
        <UtilityPole position={[-23, 0, -56]} />
        <UtilityPole position={[-23, 0, -63]} />
        <UtilityPole position={[-23, 0, -69]} />
        <Wire from={[-23, 6.05, -56]} to={[-23, 6.05, -63]} />
        <Wire from={[-23, 6.05, -63]} to={[-23, 6.05, -69]} />
        {/* east neighborhood, castle approach */}
        <ApartmentBlock position={[106, 0, 4]} rotation={0.03} wall="#efe6da" />
        <CompoundHouse position={[118, 0, 11]} wall={COLORS.wallOrange} />
        <CompoundHouse position={[128, 0, 12]} rotation={0.04} wall={COLORS.wallGreen} />
        <Shop position={[100, 0, 18]} sign="PHARMACY" signBg="#f4f1ea" wall={COLORS.wallCream} />
        <Shop position={[110, 0, 18]} sign="SALON" signBg="#d4557a" wall={COLORS.wallPink} />
        <Tree position={[104, 0, 11]} scale={0.9} />
        <Tree position={[122, 0, 5]} />
        {/* west infill houses */}
        <CompoundHouse position={[-100, 0, 2]} wall={COLORS.wallCream} w={6.2} d={5.6} h={3.8} />
        <CompoundHouse position={[-100, 0, -22]} rotation={0.06} wall={COLORS.wallPink} w={6.2} d={5.6} h={3.8} />
        <Person position={[-14, 0, -57]} rotation={1.3} />
        <Person position={[0, 0, -62]} rotation={2.8} />
        <Person position={[104, 0, 16]} rotation={0.9} />
        <Person position={[122, 0, 13]} rotation={2.1} />
        <Person position={[-98, 0, 0]} rotation={1.6} />
      </group>

      {/* ═══ lagoon shore dressing ═══ */}
      <Rocks positions={[[95, 17], [94.5, 20.5], [93.5, 14]]} />
      <Palm position={[97, 0, 19]} />
      <Palm position={[63, 0, 17]} scale={0.95} />
    </group>
  )
}
