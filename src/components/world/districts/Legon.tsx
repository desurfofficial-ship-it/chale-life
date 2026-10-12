'use client'

// ─── District: Legon Campus — main gate, halls and water tower ──────────────
import { LegonGate } from '../../scene/Landmarks'
import { Building } from '../../scene/Buildings'
import { COLORS } from '@/lib/mapConfig'

export function Legon() {
  return (
    <group>
      {/* gate straddles campusSt with legs off the carriageway (span 5.6) */}
      <group position={[66, 0, -50]} rotation={[0, Math.PI / 2, 0]}>
        <LegonGate position={[0, 0, 0]} span={5.6} />
      </group>
      <Building position={[79, 3, -62]} size={[20, 6, 9]} wall={COLORS.wallCream} facadeKey="legon-hall" rows={2} cols={7} litRatio={0.5} />
      <mesh position={[79, 8.6, -62]}>
        <boxGeometry args={[3.4, 4, 3.4]} />
        <meshStandardMaterial color="#e9e3d5" />
      </mesh>
      <mesh position={[79, 11.6, -62]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[2.6, 2.4, 4]} />
        <meshStandardMaterial color={COLORS.roofTerracotta} />
      </mesh>
      {/* b1 nudged east: was x=64 → footprint cut 3.2 m into the ns2 band */}
      <Building position={[68.5, 2.2, -59]} size={[8, 4.4, 7]} wall={COLORS.wallCream} facadeKey="legon-b1" rows={1} cols={4} litRatio={0.55} />
      <Building position={[105, 2.2, -59]} size={[8, 4.4, 7]} wall={COLORS.wallCream} facadeKey="legon-b2" rows={1} cols={4} litRatio={0.55} />
    </group>
  )
}
