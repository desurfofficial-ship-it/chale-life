'use client'

// ─── District: Osu / Oxford Street — Accra Mall, shopping strip, ────────────
// ─── National Theatre, Osu Castle and the castle-approach neighborhood ──────
import { AccraMall } from '../../scene/Landmarks'
import { NationalTheatre, OsuCastle, ApartmentBlock } from '../../scene/Expansion2'
import { BannerGate } from '../../scene/Expansion3'
import { Shop, CompoundHouse } from '../../scene/Buildings'
import { InstancedLamps, InstancedPeople, InstancedTrees, type PropItem } from '../InstancedNature'
import { COLORS } from '@/lib/mapConfig'

const OSU_LAMPS: PropItem[] = [
  // Task 15: the west row re-seated to x 55.35 so the audited 2 m walkway
  // (54.45 line) clears the posts; the east pair joins the new east line
  { p: [55.35, -19.5] }, { p: [55.35, -1.5] }, { p: [55.35, 15.5] },
  { p: [66.1, -19.5], r: Math.PI }, { p: [66.1, -1.5], r: Math.PI }, { p: [65, 19], r: Math.PI },
]
const OSU_TREES: PropItem[] = [{ p: [104, 17.5], s: 0.9 }, { p: [117.5, 5] }]
const OSU_PEOPLE: PropItem[] = [
  { p: [104, 16], r: 0.9 }, { p: [117.5, 13], r: 2.1 },
]
const OSU_PEOPLE_OXFORD: PropItem[] = [
  { p: [57, -10], r: 2.7 }, { p: [63, 3], r: 0.5 }, { p: [58, 14], r: 1.6 }, { p: [62, 20], r: 3.3 },
]

export function OxfordOsu() {
  return (
    <group>
      <AccraMall position={[77.5, 0, -6]} />

      {/* ── OSU OXFORD STREET ──
          Task 15: the BOUTIQUE / MELCOM / CAFFE OSU / BARBER boxes and the
          old east utility poles were replaced by the audited commercial
          strip in <OsuStreet /> (same street, real storefronts, gutters,
          walkways, poles + cables). The BANK + CHOP BAR shops, the banner
          gate and the existing lamps stay here; Accra Mall is kept too. */}
      <InstancedLamps items={OSU_LAMPS} />
      <InstancedPeople items={OSU_PEOPLE_OXFORD} />

      {/* ── National Theatre + Osu Castle ── */}
      <NationalTheatre position={[112, 0, -20]} />
      <OsuCastle position={[135, 0, 38]} />

      {/* ── east neighborhood, castle approach ── ── apartment moved south of
          ew1 (was z=4 → footprint cut 2.6 m into the road band); houses moved
          north of the band (z ≥ 14.5) and re-seated clear of the nsE1 spine
          (x 120.5–127.5) — the old plots at x 118 / 128 covered its edges */}
      <ApartmentBlock position={[106, 0, 0.5]} rotation={0.03} wall="#efe6da" />
      <CompoundHouse position={[116.6, 0, 17.4]} wall={COLORS.wallOrange} />
      <CompoundHouse position={[131.5, 0, 17.4]} rotation={0.04} wall={COLORS.wallGreen} />
      <Shop position={[100, 0, 17.8]} sign="PHARMACY" signBg="#f4f1ea" wall={COLORS.wallCream} />
      <Shop position={[108.5, 0, 17.8]} sign="SALON" signBg="#d4557a" wall={COLORS.wallPink} />
      <InstancedTrees items={OSU_TREES} />
      <InstancedPeople items={OSU_PEOPLE} />
    </group>
  )
}
