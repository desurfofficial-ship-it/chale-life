'use client'

// ─── District: CBD — high-rise business quarter (north-center) ──────────────
import { Building, GlassTower } from '../../scene/Buildings'
import { COLORS } from '@/lib/mapConfig'
import { T13_TOWERS } from '@/lib/t13Layout'

export function CBD() {
  return (
    <group>
      {/* tower row re-seated so both Nima spines (x 8 / x 30, 7 m wide) pass
          clear: the old towers at x 14 and x 27 stood across nimaN1/nimaN2
          (2.0 m and 5.5 m inside the carriageways) */}
      {/* Task 13: the five glass towers that stood here were INSIDE ten Nima
          compound houses (house shells buried in the tower boxes). They now
          form the AIRPORT CITY EAST skyline on the new north-east land
          (positions audited by tools/t13_layout.py); Nima's rows stand free. */}
      {T13_TOWERS.map(([x, z, w, d, h, hue], i) => (
        <GlassTower key={i} position={[x, 0, z]} height={h} w={w} d={d} hue={hue} />
      ))}
      {/* O-001: (33, −41) is now the Lands & Permits Office (src/world/office) */}
      <Building position={[4, 5.5, -41]} size={[8, 11, 8]} wall={COLORS.wallTeal} facadeKey="mid-a" rows={4} cols={3} litRatio={0.6} />
      <Building position={[15, 6.5, -41]} size={[8, 13, 7]} wall={COLORS.wallOrange} facadeKey="mid-b" rows={4} cols={3} litRatio={0.55} />
    </group>
  )
}
