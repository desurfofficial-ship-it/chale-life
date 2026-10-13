'use client'

// ─── Task 15: NIMA / MAAMOBI — community realism residential pass ───────────
// The quarter of twelve identical compound boxes rebuilt as a lived-in
// Ghanaian neighbourhood: the ABUSUA NIMA deep courtyard compound (two merged
// plots, washing area, polytank, laundry line, cooking corner), 2-storey
// family homes, bungalows with ribbed zinc roofs, a walled house with a
// sliding gate, a 3-storey flats block, a mixed-use provisions house, spine
// kiosks (MoMo / phone hub / tailor), a drinking spot + kelewele stand on the
// campus front, open gutters with culvert slabs at every gate, utility poles
// + cables + a transformer, streetlights, a trotro stop and 25 residents.
// The for-sale plot nima-2 (row B east) stays EMPTY — the buy-land beacon
// keeps its clearing. Placements: lib/osuNimaLayout.ts (audited, 0 problems).
import { NIMA_QUARTER } from '@/lib/osuNimaLayout'
import { CommunityBlock, CommunityShelter } from './CommunityQuarter'
import { CommunityLife } from '../CommunityLife'

export function NimaQuarter() {
  return (
    <group name="t15-nima-quarter">
      <CommunityBlock data={NIMA_QUARTER} name="t15-nima-core" />
      <CommunityShelter {...NIMA_QUARTER.trotroStop} />
      <CommunityLife data={NIMA_QUARTER} />
    </group>
  )
}
