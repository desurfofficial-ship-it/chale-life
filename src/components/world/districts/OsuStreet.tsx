'use client'

// ─── Task 15: OSU OXFORD STREET — community realism commercial pass ─────────
// Accra's famous shopping street rebuilt from six identical <Shop> boxes into
// a functioning commercial strip: distinct storefronts (provision, phone hub,
// MoMo booth, café, tailor, barber, chop bar, salon, drinking spot), kerb-side
// goods displays, umbrella stalls, a trotro stop, a taxi rank, concrete
// walkways with open gutters + culvert slabs, utility poles + cables, a zebra
// crossing and street life (vendors, queues, seated customers, walkers).
// All placements come from lib/osuNimaLayout.ts (generated + audited by
// tools/t15_osu_nima.py — 0 problems against roads/plots/kept landmarks).
// Kept from the previous map: ACCRA MALL, the BANK + CHOP BAR shops, the
// OXFORD STREET banner gate, the existing lamps + street trees + people.
import { OSU_STREET } from '@/lib/osuNimaLayout'
import { CommunityBlock, CommunityShelter } from './CommunityQuarter'
import { CommunityLife } from '../CommunityLife'
import { AccraMall } from '../../scene/Landmarks'
import { BannerGate } from '../../scene/Expansion3'
import { Shop } from '../../scene/Buildings'
import { InstancedPeople, InstancedTrees, type PropItem } from '../InstancedNature'
import { COLORS } from '@/lib/mapConfig'

// existing Osu trees + bystanders (unchanged from the old district; the
// lamps are rendered once by <OxfordOsu/> — re-seated to the audited lines)
const OSU_TREES: PropItem[] = [{ p: [104, 17.5], s: 0.9 }, { p: [117.5, 5] }]
const OSU_PEOPLE: PropItem[] = [
  { p: [104, 16], r: 0.9 }, { p: [117.5, 13], r: 2.1 },
]
const OSU_PEOPLE_OXFORD: PropItem[] = [
  { p: [57, -10], r: 2.7 }, { p: [63, 3], r: 0.5 }, { p: [58, 14], r: 1.6 }, { p: [62, 20], r: 3.3 },
]

export function OsuStreet() {
  return (
    <group name="t15-osu-street">
      {/* kept landmarks + the two kept shops (their footprints are audited
          keep-rects in tools/t15_osu_nima.py) */}
      <AccraMall position={[77.5, 0, -6]} />
      <Shop position={[67, 0, 19]} rotation={Math.PI / 2} sign="BANK" signBg="#2e7fa8" wall={COLORS.wallCream} />
      <Shop position={[75, 0, 19]} rotation={Math.PI / 2} sign="CHOP BAR" signBg="#e08a3c" wall={COLORS.wallOrange} />
      <BannerGate position={[60, 0, -26.7]} text="OXFORD STREET" bg="#54396b" fg="#ffe9b0" width={11} />

      {/* the rebuilt commercial strip (data-driven, audited) */}
      <CommunityBlock data={OSU_STREET} name="t15-osu-core" />
      <CommunityShelter {...OSU_STREET.trotroStop} />
      <CommunityLife data={OSU_STREET} />

      <InstancedTrees items={OSU_TREES} />
      <InstancedPeople items={OSU_PEOPLE_OXFORD} />
      <InstancedPeople items={OSU_PEOPLE} />
    </group>
  )
}
