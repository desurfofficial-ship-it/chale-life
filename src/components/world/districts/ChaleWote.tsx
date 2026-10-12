'use client'

// ─── District: Chale Wote — Jamestown heritage street art block ─────────────
import { Mural, ColonialBuilding, BoxingGym, Bunting, StringLights, VendorTable } from '../../scene/Expansion3'
import { InstancedBenches, InstancedPeople, type PropItem } from '../InstancedNature'

const CW_BENCHES: PropItem[] = [{ p: [-143.5, 10], r: Math.PI / 2 }]
const CW_PEOPLE: PropItem[] = [
  { p: [-140, 14], r: 1.4 }, { p: [-128, 7], r: 0.8 }, { p: [-120, 13], r: 2.9 }, { p: [-146, 8], r: 0.1 },
]

export function ChaleWote() {
  return (
    <group>
      {/* heritage row re-seated 0.8 m south: the old z=10 footprints cut 0.5 m
          into the Daavi street band (z 0.5…7.5) */}
      <ColonialBuilding position={[-140, 0, 10.8]} wall="#3aa08f" />
      <ColonialBuilding position={[-128, 0, 10.8]} wall="#d97b8f" />
      <BoxingGym position={[-121.5, 0, 10.8]} />
      {/* courtyard + standalone mural walls (clear of the Daavi street AND of
          the westP corridor — the green wall moved off the road edge) */}
      <mesh position={[-152, 1.2, 12.5]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 2.4, 8]} />
        <meshStandardMaterial color="#d97b8f" roughness={0.85} />
      </mesh>
      <Mural position={[-151.7, 1.5, 12.5]} rotation={Math.PI / 2} w={7} h={1.9} variant={0} />
      <mesh position={[-152.3, 1.3, 23]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 2.6, 7]} />
        <meshStandardMaterial color="#3aa08f" roughness={0.85} />
      </mesh>
      <Mural position={[-152, 1.6, 23]} rotation={Math.PI / 2} w={6} h={2.2} variant={1} />
      <Mural position={[-140, 4.75, 13.88]} w={7} h={1.5} variant={1} />
      <Mural position={[-128, 4.75, 13.88]} w={7} h={1.5} variant={2} />
      <Mural position={[-125.35, 1.6, 10.8]} rotation={-Math.PI / 2} w={5.2} h={2} variant={2} />
      {/* festival dressing */}
      <Bunting position={[-137, 5.4, 7.6]} length={24} />
      <Bunting position={[-137, 5.4, 14]} length={24} />
      <Bunting position={[-147, 5, 10.8]} rotation={Math.PI / 2} length={6.5} />
      <StringLights position={[-149, 0, 10.8]} span={6} />
      <VendorTable position={[-145, 0, 9.6]} colorIndex={3} rotation={0.5} />
      <VendorTable position={[-145, 0, 12]} colorIndex={1} rotation={-0.4} />
      <InstancedBenches items={CW_BENCHES} />
      <InstancedPeople items={CW_PEOPLE} />
    </group>
  )
}
