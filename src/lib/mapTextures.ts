// ─── Procedural canvas textures: ground, windows, signs, water glow, checker ─
import * as THREE from 'three'
import { COLORS, ROADS, CIRCLE, BEACH, LAGOON, PLATE, PLATE_CX, DAAVI_PLOT, LAND_PLOTS, T13_ROAD_IDS } from './mapConfig'
import { T13_PAINT } from './t13Layout'
import { COMMUNITY } from './communityLayout'
import { OSU_STREET, NIMA_QUARTER } from './osuNimaLayout'
import { hashId, mulberry32 } from './seeded'

// ─────────────────────────────────────────────────────────── ground texture ─
// World PLATE.w×PLATE.d → canvas (10 px per unit), origin at canvas center.
// The plate spans x −160…212 → its centre (and the plane mesh position) is
// PLATE_CX = 26, so the canvas X mapping subtracts the centre offset.

// Task 13: 8 px per metre (was 10) — the 620 m plate keeps the canvas at
// 4960 × 1856 (9.2 M px, about the old 3720 × 2320 budget) for phones
const S = 8

export function buildGroundTexture(): THREE.CanvasTexture {
  const CW = PLATE.w * S
  const CH = PLATE.d * S
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  const g = c.getContext('2d')!

  // P2-3: every blotch/speckle comes from a seeded PRNG — the ground looked
  // slightly different on every reload, which broke "stable across reloads"
  // (pixel probes, before/after audit shots).
  const rnd = mulberry32(hashId('accra-ground-v1'))

  const X = (x: number) => CW / 2 + (x - PLATE_CX) * S
  const Z = (z: number) => CH / 2 + z * S
  const L = (len: number) => len * S

  // base grass with soft mottling
  g.fillStyle = COLORS.grass
  g.fillRect(0, 0, CW, CH)
  for (let i = 0; i < 2300; i++) {
    const r = 10 + rnd() * 34
    g.fillStyle = rnd() > 0.5 ? 'rgba(109,156,77,0.35)' : 'rgba(147,196,105,0.30)'
    g.beginPath()
    g.arc(rnd() * CW, rnd() * CH, r, 0, Math.PI * 2)
    g.fill()
  }

  // district lawn patches
  g.fillStyle = COLORS.lawn
  g.fillRect(X(-88), Z(-30), L(20), L(30)) // park
  g.fillRect(X(66), Z(-76), L(26), L(32)) // legon campus
  g.fillStyle = 'rgba(147,196,105,0.55)'
  g.fillRect(X(14), Z(15), L(50), L(8)) // south lawns
  g.fillRect(X(-14), Z(15), L(24), L(8))

  // campus oval lawn
  g.fillStyle = COLORS.lawn
  g.beginPath()
  g.ellipse(X(79), Z(-58), L(11), L(7), 0, 0, Math.PI * 2)
  g.fill()

  // beach sand band + lagoon sand rim
  g.fillStyle = COLORS.sand
  g.fillRect(0, Z(BEACH.z0), CW, L(BEACH.z1 - BEACH.z0))
  g.beginPath()
  g.ellipse(X(LAGOON.x), Z(LAGOON.z), L(LAGOON.rx + 2.4), L(LAGOON.rz + 2.2), 0, 0, Math.PI * 2)
  g.fill()
  // sea water base (real water plane overlays this)
  g.fillStyle = COLORS.waterDeep
  g.fillRect(0, Z(46), CW, CH - Z(46))
  // lagoon water base
  g.fillStyle = COLORS.water
  g.beginPath()
  g.ellipse(X(LAGOON.x), Z(LAGOON.z), L(LAGOON.rx), L(LAGOON.rz), 0, 0, Math.PI * 2)
  g.fill()
  // foam line at shore
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.lineWidth = L(0.55)
  g.beginPath()
  g.moveTo(0, Z(46.2))
  g.lineTo(CW, Z(46.2))
  g.stroke()

  // rocky shore hints along west + east ends of the coast
  g.fillStyle = 'rgba(90,88,92,0.55)'
  for (let i = 0; i < 46; i++) {
    const rx = -158 + rnd() * 52
    const rz = 43.4 + rnd() * 2.4
    g.beginPath()
    g.arc(X(rx), Z(rz), L(0.7 + rnd() * 1.3), 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 46; i++) {
    const rx = 112 + rnd() * 92 // east end now reaches the Nungua shore
    const rz = 43.4 + rnd() * 2.4
    g.beginPath()
    g.arc(X(rx), Z(rz), L(0.7 + rnd() * 1.3), 0, Math.PI * 2)
    g.fill()
  }

  for (let i = 0; i < 40; i++) {
    const rx = -278 + rnd() * 104 // Task 13: Chorkor West / Korle Gonno shore
    const rz = 43.4 + rnd() * 2.4
    g.beginPath()
    g.arc(X(rx), Z(rz), L(0.7 + rnd() * 1.3), 0, Math.PI * 2)
    g.fill()
  }

  // ── CHALÉ ISLAND (Task 11): sand-rimmed island in the sea, buyable plots ──
  // Rounded sand base x −77…−13 / z 66…98 with a grass heart; the dirt lane
  // and plot clearings are painted here (3D beacons/signs come from the
  // ChaleIsland district module).
  const ISL = { x0: -77, x1: -13, z0: 66, z1: 98 }
  const r = L(6)
  g.fillStyle = COLORS.sand
  g.beginPath()
  g.moveTo(X(ISL.x0) + r, Z(ISL.z0))
  g.arcTo(X(ISL.x1), Z(ISL.z0), X(ISL.x1), Z(ISL.z1), r)
  g.arcTo(X(ISL.x1), Z(ISL.z1), X(ISL.x0), Z(ISL.z1), r)
  g.arcTo(X(ISL.x0), Z(ISL.z1), X(ISL.x0), Z(ISL.z0), r)
  g.arcTo(X(ISL.x0), Z(ISL.z0), X(ISL.x1), Z(ISL.z0), r)
  g.closePath()
  g.fill()
  g.fillStyle = COLORS.lawn
  g.beginPath()
  g.moveTo(X(ISL.x0 + 2.5) + r, Z(ISL.z0 + 2.5))
  g.arcTo(X(ISL.x1 - 2.5), Z(ISL.z0 + 2.5), X(ISL.x1 - 2.5), Z(ISL.z1 - 2.5), r)
  g.arcTo(X(ISL.x1 - 2.5), Z(ISL.z1 - 2.5), X(ISL.x0 + 2.5), Z(ISL.z1 - 2.5), r)
  g.arcTo(X(ISL.x0 + 2.5), Z(ISL.z1 - 2.5), X(ISL.x0 + 2.5), Z(ISL.z0 + 2.5), r)
  g.closePath()
  g.fill()
  // mottling so the island lawn reads natural
  for (let i = 0; i < 40; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(109,156,77,0.4)' : 'rgba(147,196,105,0.35)'
    g.beginPath()
    g.arc(X(ISL.x0 + 4) + rnd() * L(56), Z(ISL.z0 + 3) + rnd() * L(26), 5 + rnd() * 10, 0, Math.PI * 2)
    g.fill()
  }
  // island lane (z 83…87, dirt) + plot clearings (16×10 each)
  g.fillStyle = 'rgba(176,111,61,0.6)'
  g.fillRect(X(ISL.x0 + 2), Z(83), L(62), L(4))
  const islPlots: [number, number][] = [[-68, 75.5], [-24, 75.5], [-68, 92]]
  for (const [px, pz] of islPlots) {
    g.fillStyle = 'rgba(146,94,52,0.7)'
    g.fillRect(X(px - 8), Z(pz - 5), L(16), L(10))
    g.fillStyle = 'rgba(120,76,42,0.35)'
    for (let i = 0; i < 10; i++) {
      g.beginPath()
      g.arc(X(px - 7) + rnd() * L(14), Z(pz - 4) + rnd() * L(8), 4 + rnd() * 8, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = 'rgba(244,241,234,0.55)'
    g.lineWidth = L(0.22)
    g.setLineDash([L(0.9), L(0.7)])
    g.strokeRect(X(px - 8), Z(pz - 5), L(16), L(10))
    g.setLineDash([])
  }

  // ── Black Star Square: ceremonial parade plaza ────────────────────────────
  g.fillStyle = COLORS.plaza
  g.fillRect(X(-88), Z(11), L(54), L(15.5))
  // red-gold-green curb band along the seaward edge
  const curb = ['#ce1126', '#fcd116', '#006b3f']
  curb.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(X(-88), Z(26.5 - 0.75 * (i + 1)), L(54), L(0.75))
  })
  // giant parade black star aligned with the Independence Arch
  drawStar(g, X(-61), Z(18.5), L(3.8), '#1a1a1a')
  // parade lane lines
  g.strokeStyle = 'rgba(0,0,0,0.18)'
  g.lineWidth = L(0.18)
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    g.moveTo(X(-84), Z(13 + i * 2.6))
    g.lineTo(X(-40), Z(13 + i * 2.6))
    g.stroke()
  }
  // grandstand terrace pads (3D structures added separately)
  g.fillStyle = '#8d867a'
  g.fillRect(X(-85.6), Z(12.4), L(5.2), L(13.2))
  g.fillRect(X(-38.2), Z(12.4), L(5.2), L(13.2))
  // Black Star Gate approach strip over the highway
  g.fillStyle = '#d9d0c0'
  g.fillRect(X(-50.5), Z(2.5), L(5), L(15))

  // market dirt ground (expanded district)
  g.fillStyle = '#c9995e'
  g.fillRect(X(-62), Z(-32), L(46), L(30))
  for (let i = 0; i < 80; i++) {
    g.fillStyle = 'rgba(139,94,52,0.25)'
    g.beginPath()
    g.arc(X(-62) + rnd() * L(46), Z(-32) + rnd() * L(30), 6 + rnd() * 14, 0, Math.PI * 2)
    g.fill()
  }
  // market aisle paths between stall rows
  g.strokeStyle = 'rgba(233,215,180,0.5)'
  g.lineWidth = L(1.8)
  ;[-22, -14, -6.2].forEach((z) => {
    g.beginPath()
    g.moveTo(X(-60), Z(z))
    g.lineTo(X(-18), Z(z))
    g.stroke()
  })

  // ── ADABRAKA grid neighborhood (between ns1 & ns2): dirt yards, shared
  // back-to-back alleys and foot lanes for the 4×6 compound grid
  g.fillStyle = 'rgba(176,111,61,0.5)'
  g.fillRect(X(9.5), Z(-27), L(43.7), L(31.2))
  g.fillStyle = 'rgba(146,94,52,0.55)'
  g.fillRect(X(9.5), Z(-19.8), L(43.7), L(1.4)) // row A/B alley
  g.fillRect(X(9.5), Z(-3.6), L(43.7), L(2)) // row C/D alley
  g.fillStyle = 'rgba(205,155,95,0.6)'
  g.fillRect(X(9.5), Z(-12.7), L(38.3), L(3.4)) // mid lane (ends at the chop-bar kiosk)
  g.fillRect(X(7.8), Z(-27), L(3.4), L(31.2)) // N-S foot lane

  // ── James Town fishing village (west expansion) ──────────────────────────
  g.fillStyle = 'rgba(176,111,61,0.45)'
  g.fillRect(X(-154), Z(-26), L(40), L(56))
  g.strokeStyle = COLORS.dirt
  g.lineWidth = L(3)
  g.beginPath()
  // z=18 lane extended west to meet the rerouted westP; the old z=4 dirt lane
  // is replaced by the paved two-lane Daavi street (painted below)
  g.moveTo(X(-160), Z(18)); g.lineTo(X(-114), Z(18))
  g.moveTo(X(-135), Z(8)); g.lineTo(X(-135), Z(30))
  g.stroke()
  // concrete fish quay + wooden pier deck (3D piles added separately)
  g.fillStyle = '#9b9789'
  g.fillRect(X(-152), Z(30), L(30), L(8))
  g.fillStyle = '#8a6a44'
  g.fillRect(X(-141.5), Z(38), L(11), L(20))
  // Chale Wote heritage street: extended lane + community courtyard paving
  g.strokeStyle = COLORS.dirt
  g.lineWidth = L(3)
  g.beginPath()
  g.moveTo(X(-119), Z(4)); g.lineTo(X(-114), Z(4))
  g.moveTo(X(-119), Z(18)); g.lineTo(X(-114), Z(18))
  g.stroke()
  // heritage courtyard paving between the two village lanes (Chale Wote block)
  g.fillStyle = '#cfc0aa'
  g.fillRect(X(-152), Z(6.5), L(34), L(10))
  g.fillStyle = 'rgba(140,120,96,0.35)'
  for (let i = 0; i < 26; i++) {
    g.beginPath()
    g.arc(X(-150) + rnd() * L(30), Z(7) + rnd() * L(9), 5 + rnd() * 10, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#cfc0aa'
  g.beginPath()
  g.ellipse(X(-147), Z(10), L(4.6), L(4), 0, 0, Math.PI * 2)
  g.fill()

  // Daavi street: paved two-lane street (westP → jamestown link) + pavements.
  // Painted after the courtyard paving so the street wins at the overlap.
  const dS = ROADS.daaviSt
  g.fillStyle = COLORS.asphalt
  g.fillRect(X(dS.x0), Z(dS.z - 3.5), L(dS.x1 - dS.x0), L(7))
  g.fillStyle = '#b9b2a4'
  g.fillRect(X(dS.x0), Z(-1.3), L(dS.x1 - dS.x0), L(1.8))
  g.fillRect(X(dS.x0), Z(7.5), L(dS.x1 - dS.x0), L(1.8))
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = L(0.26)
  g.beginPath()
  g.moveTo(X(dS.x0 + 1), Z(0.6)); g.lineTo(X(dS.x1), Z(0.6))
  g.moveTo(X(dS.x0 + 1), Z(7.4)); g.lineTo(X(dS.x1), Z(7.4))
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.7)'
  for (let x = dS.x0 + 2; x < dS.x1 - 2; x += 4) g.fillRect(X(x), Z(dS.z - 0.12), L(2), L(0.24))
  // Daavi's reserved plot: cleared laterite ground, flat and empty for the
  // Chalé Life build (kiosk / compound / sleep yard are added in 3D only)
  g.fillStyle = 'rgba(146,94,52,0.8)'
  g.fillRect(X(DAAVI_PLOT.x0), Z(DAAVI_PLOT.z0), L(DAAVI_PLOT.x1 - DAAVI_PLOT.x0), L(DAAVI_PLOT.z1 - DAAVI_PLOT.z0))
  g.fillStyle = 'rgba(120,76,42,0.35)'
  for (let i = 0; i < 26; i++) {
    g.beginPath()
    g.arc(X(DAAVI_PLOT.x0 + 2) + rnd() * L(24), Z(DAAVI_PLOT.z0 + 2) + rnd() * L(14.5), 6 + rnd() * 14, 0, Math.PI * 2)
    g.fill()
  }

  // ── playground ground (sand ring + grass) ────────────────────────────────
  g.fillStyle = COLORS.lawn
  g.beginPath()
  g.ellipse(X(-100), Z(-12), L(8.5), L(6.5), 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#e6cf96'
  g.beginPath()
  g.ellipse(X(-100), Z(-12), L(5.6), L(4.2), 0, 0, Math.PI * 2)
  g.fill()

  // ── Kwame Nkrumah Memorial Park precinct (paths, pool, beds painted) ─────
  g.strokeStyle = '#cfc7b6'
  g.lineWidth = L(0.8)
  g.strokeRect(X(-92), Z(-30), L(26.5), L(32))
  g.strokeStyle = '#d9d0c0'
  g.lineWidth = L(2.2)
  g.beginPath()
  g.moveTo(X(-90), Z(-15)); g.lineTo(X(-67), Z(-15))
  g.moveTo(X(-78), Z(-28)); g.lineTo(X(-78), Z(-3))
  g.moveTo(X(-65.5), Z(-16)); g.lineTo(X(-61), Z(-16))
  g.stroke()
  // reflecting pool
  g.fillStyle = '#cfc7b6'
  g.fillRect(X(-85.5), Z(-2.6), L(15), L(3.6))
  g.fillStyle = '#3fa4c4'
  g.fillRect(X(-84.8), Z(-1.9), L(13.6), L(2.2))
  // flowerbeds
  ;([[-72, -8, '#e2762d'], [-84, -16, '#d4557a'], [-72, -24, '#e4b93f'], [-84, -28, '#ce1126']] as [number, number, string][]).forEach(([bx, bz, col]) => {
    g.fillStyle = col
    g.beginPath()
    g.ellipse(X(bx), Z(bz), L(1.3), L(1), 0, 0, Math.PI * 2)
    g.fill()
  })

  // ── Osu Castle lawn + drive (east point) ─────────────────────────────────
  g.fillStyle = COLORS.lawn
  g.beginPath()
  g.ellipse(X(135), Z(39), L(15), L(8), 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = L(0.35)
  g.beginPath()
  g.moveTo(X(122), Z(28.5))
  g.quadraticCurveTo(X(126), Z(34), X(131), Z(36.5))
  g.stroke()

  // ── Labadi beach recreation strip ────────────────────────────────────────
  // timber boardwalk along the beach front
  g.fillStyle = '#c8a06a'
  g.fillRect(X(4), Z(36.4), L(88), L(1.2))
  g.strokeStyle = 'rgba(122,90,54,0.55)'
  g.lineWidth = L(0.16)
  for (let x = 4; x < 92; x += 2) {
    g.beginPath()
    g.moveTo(X(x), Z(36.4)); g.lineTo(X(x), Z(37.6))
    g.stroke()
  }
  // beach volleyball court
  g.fillStyle = '#e2c88e'
  g.fillRect(X(29), Z(42), L(10), L(3.6))
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = L(0.22)
  g.strokeRect(X(29), Z(42), L(10), L(3.6))

  // ── Accra Sports Stadium ground ──────────────────────────────────────────
  g.fillStyle = '#63676e'
  g.beginPath()
  g.ellipse(X(128), Z(-55), L(21), L(17), 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#4f9e4f'
  g.beginPath()
  g.ellipse(X(128), Z(-55), L(15), L(9.5), 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = L(0.3)
  g.beginPath()
  g.ellipse(X(128), Z(-55), L(13.5), L(8), 0, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.moveTo(X(128), Z(-55 + 8)); g.lineTo(X(128), Z(-55 - 8))
  g.stroke()

  // ── Kotoka airport: apron + runway ───────────────────────────────────────
  // main apron (deepened 6.5→7.5 m) + west apron around the re-parked
  // airliner (x 0…17 reaches the airport road edge, wrapping the wingtips)
  g.fillStyle = '#8f9399'
  g.fillRect(X(4), Z(-102.5), L(48), L(7.5))
  g.fillRect(X(0), Z(-102.5), L(17), L(11.6))
  g.fillStyle = '#33373d'
  g.fillRect(X(-46), Z(-109.5), L(182), L(7))
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = L(0.35)
  g.beginPath()
  g.moveTo(X(-40), Z(-106))
  g.lineTo(X(130), Z(-106))
  g.stroke()
  // runway centerline dashes over the solid line
  g.fillStyle = '#33373d'
  for (let x = -40; x < 130; x += 6) g.fillRect(X(x), Z(-106.3), L(3.6), L(0.7))
  // threshold piano keys
  g.fillStyle = 'rgba(255,255,255,0.9)'
  for (let i = 0; i < 6; i++) {
    g.fillRect(X(-44 + i * 1.6), Z(-109), L(0.9), L(6))
    g.fillRect(X(130 + i * 1.6 - 8), Z(-109), L(0.9), L(6))
  }

  // mall parking lot (narrowed in Phase 3 so stalls no longer run under ew1)
  g.fillStyle = COLORS.parking
  g.fillRect(X(70), Z(3), L(26), L(2.4))
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = L(0.22)
  for (let i = 0; i <= 12; i++) {
    g.beginPath()
    g.moveTo(X(70 + i * 2), Z(3.2))
    g.lineTo(X(70 + i * 2), Z(5.3))
    g.stroke()
  }

  // trot-tro station yard
  g.fillStyle = '#5a5f66'
  g.fillRect(X(-48), Z(-68), L(24), L(16))
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = L(0.2)
  for (let i = 0; i <= 6; i++) {
    g.beginPath()
    g.moveTo(X(-48 + i * 4), Z(-67))
    g.lineTo(X(-48 + i * 4), Z(-53))
    g.stroke()
  }

  // residential dirt yards — Dansoman (west quarter rebuilt into a grid
  // neighborhood) + Nima/Maamobi (north-center). Lanes between compound rows.
  g.fillStyle = 'rgba(176,111,61,0.5)'
  g.fillRect(X(-152), Z(-70), L(85), L(16)) // dansoman yards (z −70…−54)
  g.fillRect(X(-150), Z(-45), L(80), L(8.5)) // dansoman south row yards
  g.fillRect(X(-20), Z(-70), L(72), L(16)) // nima yards (z −70…−54)
  g.fillRect(X(127), Z(-28), L(19), L(19)) // teshie NE block yards
  g.fillRect(X(100), Z(1), L(46), L(8)) // teshie south yards
  g.fillRect(X(100), Z(17.5), L(46), L(5.5)) // teshie coastal row yards
  g.fillStyle = 'rgba(146,94,52,0.55)'
  g.fillRect(X(-152), Z(-63.4), L(85), L(1.8)) // dansoman back-to-back alley
  g.fillRect(X(-20), Z(-63.4), L(72), L(1.8)) // nima alley
  g.fillRect(X(127.5), Z(-18.9), L(18), L(1.6)) // teshie north alley
  g.strokeStyle = COLORS.dirt
  g.lineWidth = L(2.2)
  g.beginPath()
  g.moveTo(X(-152), Z(-62.5)); g.lineTo(X(-67), Z(-62.5))
  g.moveTo(X(-20), Z(-62.5)); g.lineTo(X(52), Z(-62.5))
  g.stroke()

  // ── Task 11 neighborhood paint: Chorkor, Nungua, market pads, plot dirt ──
  // CHORKOR row yards + market street fronting the Daavi street
  g.fillStyle = 'rgba(176,111,61,0.45)'
  g.fillRect(X(-149), Z(-17.5), L(36), L(6)) // chorkor row yards
  g.fillRect(X(-152), Z(-9.3), L(38), L(3.2)) // market street pad
  g.fillStyle = 'rgba(205,155,95,0.5)'
  g.fillRect(X(-152), Z(-7.4), L(38), L(1.2)) // market walk line
  // NUNGUA (new east land): grid yards, back-to-back alleys, market square
  g.fillStyle = 'rgba(176,111,61,0.5)'
  g.fillRect(X(165.8), Z(-27), L(41.4), L(29.5)) // nungua yards (z −27…2.5)
  g.fillStyle = 'rgba(146,94,52,0.55)'
  g.fillRect(X(165.8), Z(-20.6), L(41.4), L(1.4)) // row 1/2 alley
  g.fillRect(X(165.8), Z(-4.6), L(41.4), L(1.4)) // row 3/4 alley
  g.fillStyle = 'rgba(205,155,95,0.55)'
  g.fillRect(X(165.8), Z(-13.6), L(41.4), L(2.4)) // mid walk
  g.fillRect(X(167), Z(-5.6), L(38), L(2)) // market square pad
  g.fillRect(X(165.8), Z(16.5), L(41.4), L(1.6)) // beach shop walk
  // DANSOMAN W3 market pad + Nima clinic stall pads + Teshie market pads
  g.fillStyle = 'rgba(196,138,80,0.5)'
  g.fillRect(X(-85), Z(-64), L(5.6), L(8)) // dansoman W3 market
  g.fillRect(X(19), Z(-39.6), L(4.4), L(2.6)) // nima clinic stalls
  g.fillRect(X(114), Z(20.4), L(7), L(3.4)) // teshie west stalls
  g.fillRect(X(126.5), Z(20.4), L(17), L(3.4)) // teshie coastal market
  g.fillRect(X(142.5), Z(-23), L(3), L(1.6)) // teshie NE kiosk pad
  // ── Task 13 new-land paint: yards, market pads, port concrete, apron ──────
  for (const [x0, z0, x1, z1, fill] of T13_PAINT) {
    g.fillStyle = fill
    g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
  }
  // land-for-sale plots: cleared laterite + grass tufts (signs/beacons in 3D)
  for (const p of LAND_PLOTS) {
    if (p.y) continue // island plots: drawn on the plinth top in 3D
    g.fillStyle = 'rgba(146,94,52,0.72)'
    g.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), L(p.w), L(p.d))
    g.fillStyle = 'rgba(120,76,42,0.35)'
    for (let i = 0; i < 10; i++) {
      g.beginPath()
      g.arc(X(p.x - p.w / 2 + 0.8) + rnd() * L(p.w - 1.6), Z(p.z - p.d / 2 + 0.6) + rnd() * L(p.d - 1.2), 4 + rnd() * 8, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = 'rgba(244,241,234,0.55)'
    g.lineWidth = L(0.22)
    g.setLineDash([L(0.9), L(0.7)])
    g.strokeRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), L(p.w), L(p.d))
    g.setLineDash([])
  }

  // ── roads ────────────────────────────────────────────────────────────────
  const road = (x0: number, z0: number, x1: number, z1: number) => {
    g.fillStyle = COLORS.asphalt
    g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
  }
  // horizontal roads (extents MUST mirror ROADS — stale literals here are how
  // the "roads not meeting" gaps at westP appeared)
  road(ROADS.ew1.x0, ROADS.ew1.z - 4.5, ROADS.ew1.x1, ROADS.ew1.z + 4.5)
  road(ROADS.ew2.x0, ROADS.ew2.z - 4.5, ROADS.ew2.x1, ROADS.ew2.z + 4.5)
  road(ROADS.coastal.x0, ROADS.coastal.z - 4.5, ROADS.coastal.x1, ROADS.coastal.z + 4.5)
  road(ROADS.north.x0, ROADS.north.z - 4.5, ROADS.north.x1, ROADS.north.z + 4.5)
  road(ROADS.campusSt.x0, ROADS.campusSt.z - 4.5, ROADS.campusSt.x1, ROADS.campusSt.z + 4.5)
  road(ROADS.airportRd.x0, ROADS.airportRd.z - 4.5, ROADS.airportRd.x1, ROADS.airportRd.z + 4.5)
  // vertical roads
  road(ROADS.ns1.x - 4.5, ROADS.ns1.z0, ROADS.ns1.x + 4.5, ROADS.ns1.z1)
  road(ROADS.ns2.x - 4.5, ROADS.ns2.z0, ROADS.ns2.x + 4.5, ROADS.ns2.z1)
  road(ROADS.westP.x - 4.5, ROADS.westP.z0, ROADS.westP.x + 4.5, ROADS.westP.z1)
  road(ROADS.eastP.x - 4.5, ROADS.eastP.z0, ROADS.eastP.x + 4.5, ROADS.eastP.z1)
  road(ROADS.parkC.x - 4.5, ROADS.parkC.z0, ROADS.parkC.x + 4.5, ROADS.parkC.z1)
  road(ROADS.midC.x - 4.5, ROADS.midC.z0, ROADS.midC.x + 4.5, ROADS.midC.z1)
  road(ROADS.stadiumRd.x - 4.5, ROADS.stadiumRd.z0, ROADS.stadiumRd.x + 4.5, ROADS.stadiumRd.z1)
  road(ROADS.ns3.x - 4.5, ROADS.ns3.z0, ROADS.ns3.x + 4.5, ROADS.ns3.z1)
  // neighborhood residential spines (Dansoman / Nima / Teshie)
  road(ROADS.nsD1.x - 3.5, ROADS.nsD1.z0, ROADS.nsD1.x + 3.5, ROADS.nsD1.z1)
  road(ROADS.nsD2.x - 3.5, ROADS.nsD2.z0, ROADS.nsD2.x + 3.5, ROADS.nsD2.z1)
  road(ROADS.nsD3.x - 3.5, ROADS.nsD3.z0, ROADS.nsD3.x + 3.5, ROADS.nsD3.z1)
  road(ROADS.nimaN1.x - 3.5, ROADS.nimaN1.z0, ROADS.nimaN1.x + 3.5, ROADS.nimaN1.z1)
  road(ROADS.nimaN2.x - 3.5, ROADS.nimaN2.z0, ROADS.nimaN2.x + 3.5, ROADS.nimaN2.z1)
  road(ROADS.nsE1.x - 3.5, ROADS.nsE1.z0, ROADS.nsE1.x + 3.5, ROADS.nsE1.z1)
  // Task 11: Nungua spine + Adabraka car lane + island causeway
  road(ROADS.nsN1.x - 3.5, ROADS.nsN1.z0, ROADS.nsN1.x + 3.5, ROADS.nsN1.z1)
  road(ROADS.adabrakaLane.x - 1.7, ROADS.adabrakaLane.z0, ROADS.adabrakaLane.x + 1.7, ROADS.adabrakaLane.z1)
  road(ROADS.islandCauseway.x - 3.5, ROADS.islandCauseway.z0, ROADS.islandCauseway.x + 3.5, ROADS.islandCauseway.z1)
  // east ring link — was missing from the paint entirely (ew2 and coastal
  // appeared to dead-end 50 m apart at the map's east edge)
  road(ROADS.eastLink.x - 4.5, ROADS.eastLink.z0, ROADS.eastLink.x + 4.5, ROADS.eastLink.z1)
  // Jamestown link: village lanes → ew1 → coastal
  road(ROADS.jamestownLink.x - 3.5, ROADS.jamestownLink.z0, ROADS.jamestownLink.x + 3.5, ROADS.jamestownLink.z1)
  // Task 12: Nungua east edge lane (was in ROADS + the sim but never painted)
  road(ROADS.nunguaE.x - ROADS.nunguaE.w / 2, ROADS.nunguaE.z0, ROADS.nunguaE.x + ROADS.nunguaE.w / 2, ROADS.nunguaE.z1)

  // Task 13 roads — painted generically from ROADS (asphalt + edge lines +
  // centre dashes on two-lane roads); the island ring lane is a 3D decal
  const t13 = T13_ROAD_IDS.map((id) => ROADS[id] as { x?: number; z?: number; x0?: number; x1?: number; z0?: number; z1?: number; w: number })
  for (const r of t13) {
    if (r.x0 !== undefined) road(r.x0, r.z! - r.w / 2, r.x1!, r.z! + r.w / 2)
    else road(r.x! - r.w / 2, r.z0!, r.x! + r.w / 2, r.z1!)
  }
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = L(0.28)
  for (const r of t13) {
    const hw = r.w / 2
    g.beginPath()
    if (r.x0 !== undefined) {
      g.moveTo(X(r.x0), Z(r.z! - hw)); g.lineTo(X(r.x1!), Z(r.z! - hw))
      g.moveTo(X(r.x0), Z(r.z! + hw)); g.lineTo(X(r.x1!), Z(r.z! + hw))
    } else {
      g.moveTo(X(r.x! - hw), Z(r.z0!)); g.lineTo(X(r.x! - hw), Z(r.z1!))
      g.moveTo(X(r.x! + hw), Z(r.z0!)); g.lineTo(X(r.x! + hw), Z(r.z1!))
    }
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.7)'
  for (const r of t13) {
    if (r.w < 6) continue
    if (r.x0 !== undefined) for (let x = r.x0; x < r.x1!; x += 4) g.fillRect(X(x), Z(r.z! - 0.14), L(2.2), L(0.28))
    else for (let z = r.z0!; z < r.z1!; z += 4) g.fillRect(X(r.x! - 0.14), Z(z), L(0.28), L(2.2))
  }

  // circle roundabout ring
  g.fillStyle = COLORS.asphalt
  g.beginPath()
  g.arc(X(CIRCLE.x), Z(CIRCLE.z), L(CIRCLE.ringOuter), 0, Math.PI * 2)
  g.fill()
  g.fillStyle = COLORS.grass
  g.beginPath()
  g.arc(X(CIRCLE.x), Z(CIRCLE.z), L(CIRCLE.island), 0, Math.PI * 2)
  g.fill()

  // road edge lines
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = L(0.28)
  const edgeH = (z: number, x0: number, x1: number) => {
    g.beginPath(); g.moveTo(X(x0), Z(z - 4.5)); g.lineTo(X(x1), Z(z - 4.5)); g.stroke()
    g.beginPath(); g.moveTo(X(x0), Z(z + 4.5)); g.lineTo(X(x1), Z(z + 4.5)); g.stroke()
  }
  const edgeV = (x: number, z0: number, z1: number, hw = 4.5) => {
    g.beginPath(); g.moveTo(X(x - hw), Z(z0)); g.lineTo(X(x - hw), Z(z1)); g.stroke()
    g.beginPath(); g.moveTo(X(x + hw), Z(z0)); g.lineTo(X(x + hw), Z(z1)); g.stroke()
  }
  edgeH(ROADS.ew1.z, ROADS.ew1.x0, ROADS.ew1.x1); edgeH(ROADS.ew2.z, ROADS.ew2.x0, ROADS.ew2.x1)
  edgeH(ROADS.coastal.z, ROADS.coastal.x0, ROADS.coastal.x1); edgeH(ROADS.north.z, ROADS.north.x0, ROADS.north.x1)
  edgeH(ROADS.campusSt.z, ROADS.campusSt.x0, ROADS.campusSt.x1); edgeH(ROADS.airportRd.z, ROADS.airportRd.x0, ROADS.airportRd.x1)
  edgeV(ROADS.ns1.x, ROADS.ns1.z0, ROADS.ns1.z1); edgeV(ROADS.ns2.x, ROADS.ns2.z0, ROADS.ns2.z1)
  edgeV(ROADS.westP.x, ROADS.westP.z0, ROADS.westP.z1); edgeV(ROADS.eastP.x, ROADS.eastP.z0, ROADS.eastP.z1)
  edgeV(ROADS.midC.x, ROADS.midC.z0, ROADS.midC.z1); edgeV(ROADS.parkC.x, ROADS.parkC.z0, ROADS.parkC.z1)
  edgeV(ROADS.ns3.x, ROADS.ns3.z0, ROADS.ns3.z1); edgeV(ROADS.stadiumRd.x, ROADS.stadiumRd.z0, ROADS.stadiumRd.z1)
  edgeV(ROADS.eastLink.x, ROADS.eastLink.z0, ROADS.eastLink.z1)
  edgeV(ROADS.nsD1.x, ROADS.nsD1.z0, ROADS.nsD1.z1, 3.5); edgeV(ROADS.nsD2.x, ROADS.nsD2.z0, ROADS.nsD2.z1, 3.5)
  edgeV(ROADS.nsD3.x, ROADS.nsD3.z0, ROADS.nsD3.z1, 3.5); edgeV(ROADS.nimaN1.x, ROADS.nimaN1.z0, ROADS.nimaN1.z1, 3.5)
  edgeV(ROADS.nimaN2.x, ROADS.nimaN2.z0, ROADS.nimaN2.z1, 3.5); edgeV(ROADS.nsE1.x, ROADS.nsE1.z0, ROADS.nsE1.z1, 3.5)
  edgeV(ROADS.nsN1.x, ROADS.nsN1.z0, ROADS.nsN1.z1, 3.5)
  edgeV(ROADS.adabrakaLane.x, ROADS.adabrakaLane.z0, ROADS.adabrakaLane.z1, 1.7)
  edgeV(ROADS.islandCauseway.x, ROADS.islandCauseway.z0, ROADS.islandCauseway.z1, 3.5)
  edgeV(ROADS.jamestownLink.x, 2, 28)
  g.beginPath(); g.arc(X(CIRCLE.x), Z(CIRCLE.z), L(CIRCLE.ringOuter), 0, Math.PI * 2); g.stroke()
  g.beginPath(); g.arc(X(CIRCLE.x), Z(CIRCLE.z), L(CIRCLE.ringInner), 0, Math.PI * 2); g.stroke()

  // yellow center dashes on main highway + white dashes elsewhere
  const dashesH = (z: number, x0: number, x1: number, col: string) => {
    g.fillStyle = col
    for (let x = x0; x < x1; x += 4) g.fillRect(X(x), Z(z - 0.14), L(2.2), L(0.28))
  }
  const dashesV = (x: number, z0: number, z1: number, col: string) => {
    g.fillStyle = col
    for (let z = z0; z < z1; z += 4) g.fillRect(X(x - 0.14), Z(z), L(0.28), L(2.2))
  }
  dashesH(ROADS.ew1.z, ROADS.ew1.x0, ROADS.ew1.x1, '#e8b83a')
  dashesH(ROADS.ew2.z, ROADS.ew2.x0, ROADS.ew2.x1, 'rgba(255,255,255,0.85)')
  dashesH(ROADS.coastal.z, ROADS.coastal.x0, ROADS.coastal.x1, 'rgba(255,255,255,0.85)')
  dashesH(ROADS.north.z, ROADS.north.x0, ROADS.north.x1, 'rgba(255,255,255,0.85)')
  dashesH(ROADS.airportRd.z, ROADS.airportRd.x0, ROADS.airportRd.x1, 'rgba(255,255,255,0.85)')
  dashesV(ROADS.ns1.x, ROADS.ns1.z0, ROADS.ns1.z1, '#e8b83a')
  dashesV(ROADS.ns2.x, ROADS.ns2.z0, ROADS.ns2.z1, 'rgba(255,255,255,0.85)')
  dashesV(ROADS.ns3.x, -86, -75, 'rgba(255,255,255,0.85)')
  dashesV(ROADS.eastLink.x, ROADS.eastLink.z0, ROADS.eastLink.z1, 'rgba(255,255,255,0.85)')
  dashesV(ROADS.nsD1.x, ROADS.nsD1.z0, ROADS.nsD1.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.nsD2.x, ROADS.nsD2.z0, ROADS.nsD2.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.nimaN1.x, ROADS.nimaN1.z0, ROADS.nimaN1.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.nimaN2.x, ROADS.nimaN2.z0, ROADS.nimaN2.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.nsE1.x, ROADS.nsE1.z0, ROADS.nsE1.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.nsN1.x, ROADS.nsN1.z0, ROADS.nsN1.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.islandCauseway.x, ROADS.islandCauseway.z0, ROADS.islandCauseway.z1, 'rgba(255,255,255,0.6)')
  dashesV(ROADS.jamestownLink.x, 2, 28, 'rgba(255,255,255,0.6)')

  // zebra crossings at circle spokes
  g.fillStyle = 'rgba(255,255,255,0.9)'
  const zebra = (cx: number, cz: number, horizontal: boolean) => {
    for (let i = 0; i < 5; i++) {
      if (horizontal) g.fillRect(X(cx - 3.4), Z(cz - 2 + i * 0.85), L(6.8), L(0.45))
      else g.fillRect(X(cx - 2 + i * 0.85), Z(cz - 3.4), L(0.45), L(6.8))
    }
  }
  zebra(CIRCLE.x + 17.5, CIRCLE.z, true)
  zebra(CIRCLE.x - 17.5, CIRCLE.z, true)
  zebra(CIRCLE.x, CIRCLE.z - 17.5, false)
  zebra(CIRCLE.x, CIRCLE.z + 17.5, false)

  // landscaped roundabouts at key junctions
  const roundabout = (cx: number, cz: number, r: number) => {
    g.fillStyle = COLORS.asphalt
    g.beginPath(); g.arc(X(cx), Z(cz), L(r + 1.4), 0, Math.PI * 2); g.fill()
    g.fillStyle = COLORS.grass
    g.beginPath(); g.arc(X(cx), Z(cz), L(r), 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = L(0.22)
    g.beginPath(); g.arc(X(cx), Z(cz), L(r + 1.1), 0, Math.PI * 2); g.stroke()
  }
  roundabout(60, -35, 4.5)
  roundabout(95, -50, 4.5)
  roundabout(-45, -50, 4.5)
  roundabout(72, -86, 3.2)

  // Osu Oxford Street: sidewalks + crossings along ns2
  g.fillStyle = '#b8b2a4'
  g.fillRect(X(54.2), Z(-18), L(1.3), L(44.5))
  g.fillRect(X(64.5), Z(-18), L(1.3), L(44.5))
  g.fillStyle = 'rgba(255,255,255,0.9)'
  zebra(60, 21.5, true)
  zebra(60, -10, true)

  // Airport City: promenade sidewalks + surface parking (east & west)
  g.fillStyle = '#a8a296'
  g.fillRect(X(68), Z(-92.5), L(66), L(1.5))
  g.fillRect(X(-140), Z(-92.5), L(70), L(1.5))
  g.fillStyle = COLORS.parking
  g.fillRect(X(-88), Z(-99), L(16), L(4))
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = L(0.2)
  for (let i = 0; i <= 8; i++) {
    g.beginPath()
    g.moveTo(X(-88 + i * 2), Z(-98.8)); g.lineTo(X(-88 + i * 2), Z(-95.2))
    g.stroke()
  }

  // ── Phase 3 street infrastructure (painted after roads) ─────────────────
  const sidewalk = (x0: number, z0: number, x1: number, z1: number, col = '#b8b2a4') => {
    g.fillStyle = col
    g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
  }
  const gutter = (x0: number, z0: number, x1: number, z1: number) => {
    g.fillStyle = 'rgba(30,32,36,0.35)'
    g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
  }
  // sidewalks + gutters along ew1 (gaps at ns1 / midC / ns2 junctions)
  ;[[-110, -14.5], [-5.5, -64.5], [64.5, 96]].forEach(([a, b]) => {
    const [xa, xb] = a < b ? [a, b] : [b, a]
    sidewalk(xa, 3.2, xb, 4.4)
    sidewalk(xa, 15.6, xb, 16.8)
    gutter(xa, 4.4, xb, 4.9)
    gutter(xa, 15.1, xb, 15.6)
  })
  // sidewalks + gutters along coastal road north side
  ;[[-110, -14.5], [-5.5, 64.5], [64.5, 110]].forEach(([a, b]) => {
    const [xa, xb] = a < b ? [a, b] : [b, a]
    sidewalk(xa, 32.5, xb, 33.7)
    gutter(xa, 32.5, xb, 33)
  })
  // sidewalks along ns1/ns2 south of the circle (toward the beach)
  sidewalk(-14.5, 15.6, -5.5, 23.2)
  sidewalk(55.5, 15.6, 64.5, 18.7)
  // sidewalks along midC + campusSt new stretch
  sidewalk(-64.5, -35, -55.5, -45.5, '#b8b2a4')
  // pedestrian zebra crossings at major junctions
  g.fillStyle = 'rgba(255,255,255,0.9)'
  zebra(-10, -27.5, true)
  zebra(-10, 24.5, true)
  zebra(60, 24.5, true)
  zebra(95, 10, false)
  zebra(-60, 10, false)
  zebra(30, -86, false)
  zebra(30, 10, false)
  zebra(-36, 10, false)
  // painted splitter islands at the dual-carriageway junctions
  const splitterV = (x: number, zA: number, zB: number) => {
    g.fillStyle = '#c9c2b2'
    g.beginPath()
    g.moveTo(X(x), Z(zA))
    g.lineTo(X(x + 1.1), Z((zA + zB) / 2))
    g.lineTo(X(x), Z(zB))
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.75)'
    g.lineWidth = L(0.16)
    g.stroke()
  }
  splitterV(-10, 17.5, 22.5)
  splitterV(60, 17.5, 22.5)
  splitterV(-10, -30.5, -25.5)
  splitterV(60, -30.5, -25.5)
  // taxi rank bay on the ew1 south service lane
  g.fillStyle = '#e8b83a'
  g.fillRect(X(-30), Z(15.8), L(10), L(1))
  g.fillStyle = '#1a1a1a'
  g.font = 'bold 11px Arial, sans-serif'
  g.textAlign = 'center'
  g.fillText('TAXI', X(-25), Z(16.6))
  // beach access paths from the coastal road down to the boardwalk
  ;[20, 52, 68].forEach((px) => {
    g.fillStyle = '#e6cf96'
    g.fillRect(X(px - 1.3), Z(33.7), L(2.6), L(2.7))
    g.strokeStyle = 'rgba(122,90,54,0.4)'
    g.lineWidth = L(0.14)
    g.beginPath()
    g.moveTo(X(px - 1.3), Z(33.7)); g.lineTo(X(px - 1.3), Z(36.4))
    g.moveTo(X(px + 1.3), Z(33.7)); g.lineTo(X(px + 1.3), Z(36.4))
    g.stroke()
  })
  // Labadi boardwalk repainted over the ns2 road cut
  g.fillStyle = '#c8a06a'
  g.fillRect(X(-60), Z(36.4), L(152), L(1.2))
  g.strokeStyle = 'rgba(122,90,54,0.55)'
  g.lineWidth = L(0.16)
  for (let x = -60; x < 92; x += 2) {
    g.beginPath()
    g.moveTo(X(x), Z(36.4)); g.lineTo(X(x), Z(37.6))
    g.stroke()
  }
  // ── airport ground detail ──────────────────────────────────────────
  // taxiway linking the apron to the runway (lead-in stops short of the
  // re-parked airliner's fuselage)
  g.fillStyle = '#4a4e54'
  g.fillRect(X(8), Z(-109.5), L(8), L(13.5))
  g.strokeStyle = '#e8b83a'
  g.lineWidth = L(0.3)
  g.beginPath()
  g.moveTo(X(12), Z(-98.4)); g.lineTo(X(12), Z(-109))
  g.stroke()
  // apron aircraft stand boxes + stand numbers (stand 0 added under the
  // re-parked airliner on the west apron)
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = L(0.22)
  ;([[4, '0'], [14, '1'], [30, '2']] as [number, string][]).forEach(([sx, n]) => {
    g.strokeRect(X(sx), Z(-101), L(8), L(4))
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.font = 'bold 12px Arial, sans-serif'
    g.fillText(n as string, X(sx + 4), Z(-98.6))
  })
  // terminal drop-off bay (lay-by cut into the airport road north edge)
  g.fillStyle = '#8f9399'
  g.fillRect(X(20), Z(-92.6), L(20), L(2.1))
  g.fillStyle = 'rgba(255,255,255,0.75)'
  for (let i = 0; i < 8; i++) g.fillRect(X(21 + i * 2.4), Z(-91.1), L(1.4), L(0.18))
  // runway edge ticks
  g.fillStyle = 'rgba(255,255,255,0.8)'
  for (let x = -46; x <= 136; x += 12) {
    g.fillRect(X(x), Z(-110.1), L(0.7), L(0.4))
    g.fillRect(X(x), Z(-102), L(0.7), L(0.4))
  }
  // ── stadium forecourt + supporters parking ───────────────────────
  g.fillStyle = '#b8b2a4'
  g.fillRect(X(120), Z(-78), L(30), L(6))
  g.fillStyle = COLORS.parking
  g.fillRect(X(104), Z(-80), L(30), L(6))
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = L(0.2)
  for (let i = 0; i <= 15; i++) {
    g.beginPath()
    g.moveTo(X(104 + i * 2), Z(-79.7)); g.lineTo(X(104 + i * 2), Z(-74.3))
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.9)'
  zebra(140, -76, false)

  // ── Task 14: community realism pass (Chorkor West) — swept laterite yards,
  // concrete walkways, open gutters, patched asphalt, potholes, oil stains,
  // crumbling road edges, a zebra crossing and light litter. Painted LAST so
  // it reads over the generic Task 13 paint (and the roads it patches).
  for (const op of COMMUNITY.paint) {
    const kind = op[0] as string
    if (kind === 'rect') {
      const [, x0, z0, x1, z1, fill] = op as [string, number, number, number, number, string]
      g.fillStyle = fill
      g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
    } else if (kind === 'ellipse') {
      const [, x, z, rx, rz, fill] = op as [string, number, number, number, number, string]
      g.fillStyle = fill
      g.beginPath(); g.ellipse(X(x), Z(z), L(rx), L(rz), 0, 0, Math.PI * 2); g.fill()
    } else if (kind === 'line') {
      const [, x0, z0, x1, z1, col, lw] = op as [string, number, number, number, number, string, number]
      g.strokeStyle = col; g.lineWidth = L(lw)
      g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke()
    } else if (kind === 'stroke') {
      const [, x0, z0, x1, z1, col, lw] = op as [string, number, number, number, number, string, number]
      g.strokeStyle = col; g.lineWidth = L(lw)
      g.strokeRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
    }
  }

  // ── Task 15: community realism round 2 (Osu Oxford Street + Nima) — same
  // paint-op protocol as Task 14, executed AFTER it so the new walkways,
  // yards, gutters, zebra and patches read over the earlier paint.
  for (const zone of [OSU_STREET, NIMA_QUARTER]) {
    for (const op of zone.paint) {
      const kind = op[0] as string
      if (kind === 'rect') {
        const [, x0, z0, x1, z1, fill] = op as [string, number, number, number, number, string]
        g.fillStyle = fill
        g.fillRect(X(x0), Z(z0), L(x1 - x0), L(z1 - z0))
      } else if (kind === 'ellipse') {
        const [, x, z, rx, rz, fill] = op as [string, number, number, number, number, string]
        g.fillStyle = fill
        g.beginPath(); g.ellipse(X(x), Z(z), L(rx), L(rz), 0, 0, Math.PI * 2); g.fill()
      } else if (kind === 'line') {
        const [, x0, z0, x1, z1, col, lw] = op as [string, number, number, number, number, string, number]
        g.strokeStyle = col; g.lineWidth = L(lw)
        g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke()
      }
    }
  }

  // drainage channel outlining the Adabraka grid block
  g.strokeStyle = 'rgba(90,75,60,0.45)'
  g.lineWidth = L(0.7)
  g.strokeRect(X(9.5), Z(-27), L(43.7), L(31.2))

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// ───────────────────────────────────────────── map-edge skirt alpha maps ────
// The map plate is finite; at full zoom-out the world must not read as a
// floating slab over the sky. These alpha maps fade the sea/land skirts out
// so they melt into the sky haze with no visible edge.

// radial fade for the ocean skirt disc (opaque core → transparent rim)
// NOTE: three.js alphaMap reads the GREEN channel → write grayscale
export function skirtDiscAlpha(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(256, 256, 140, 256, 256, 256)
  grad.addColorStop(0, 'rgb(255,255,255)')
  grad.addColorStop(0.72, 'rgb(255,255,255)')
  grad.addColorStop(1, 'rgb(0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(c)
}

// rectangular edge fade for the land apron (fades on all four sides)
export function skirtRectAlpha(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const img = g.createImageData(256, 256)
  const m = 34 // fade margin in px (≈180 world units on x, ≈80 on y at map scale)
  const fade = (v: number) => {
    const d = Math.min(v, 255 - v)
    if (d >= m) return 1
    const t = Math.max(0, d / m)
    return t * t * (3 - 2 * t)
  }
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const a = Math.min(fade(x), fade(y)) * 255
      const i = (y * 256 + x) * 4
      img.data[i] = a; img.data[i + 1] = a; img.data[i + 2] = a; img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(c)
}

function drawStar(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  g.save()
  g.translate(cx, cy)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const a2 = a + Math.PI / 5
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    g.lineTo(Math.cos(a2) * r * 0.42, Math.sin(a2) * r * 0.42)
  }
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.restore()
}

// ───────────────────────────────────────────────────────── building facades ─
interface FacadeOpts {
  wall: string
  rows: number
  cols: number
  litRatio: number
  glass?: boolean
  /** Task 14 community facades: 'louvre' (naco louvre windows + burglar-proof
   *  bars), 'worn' (louvres + faded/damp-stained paint), 'block' (exposed
   *  sandcrete blockwork, empty openings — unfinished storeys) */
  style?: 'plain' | 'louvre' | 'worn' | 'block'
}

// ── Facade atlas ─────────────────────────────────────────────────────────────
// All building facades are drawn into ONE shared albedo canvas + ONE emissive
// canvas (tiles of TILE_W × TILE_H on an 8×4 grid). Tiles are pattern-only:
// walls are drawn WHITE and the actual wall colour arrives via vertex colors
// on the building mesh (map × vcolor), so two buildings that differ only in
// wall colour share a single tile. The result: every building in the city can
// be merged into a couple of draw calls with one shared material.
const ATLAS_TILE_W = 256
const ATLAS_TILE_H = 512
const ATLAS_COLS = 8
const ATLAS_ROWS = 8 // Task 13: 64 slots (was 32 — the salons / gyms / clubs / warehouses overflowed it and some towers fell back to slot 0)

interface AtlasRect { u0: number; v0: number; u1: number; v1: number }
export type { AtlasRect }
interface FacadeAtlas {
  map: THREE.CanvasTexture
  emissive: THREE.CanvasTexture
  slots: Map<string, AtlasRect>
  next: number
}

let facadeAtlas: FacadeAtlas | null = null

// quantize window rows so near-identical towers share a tile
function quantRows(rows: number): number {
  if (rows <= 1) return 1
  if (rows <= 2) return 2
  if (rows <= 4) return 4
  if (rows <= 7) return 6
  if (rows <= 10) return 9
  return 12
}

// pattern key — deliberately excludes wall colour (vertex colors handle it)
function facadePatternKey(opts: FacadeOpts): string {
  const rows = quantRows(opts.rows)
  const lit = Math.round(opts.litRatio * 10) / 10
  const st = opts.style && opts.style !== 'plain' ? `|${opts.style}` : ''
  return `${opts.glass ? 'glass' : 'wall'}|r${rows}|c${opts.cols}|l${lit}${st}`
}

function getFacadeAtlas(): FacadeAtlas {
  if (facadeAtlas) return facadeAtlas
  const albedo = document.createElement('canvas')
  albedo.width = ATLAS_TILE_W * ATLAS_COLS
  albedo.height = ATLAS_TILE_H * ATLAS_ROWS
  const emissive = document.createElement('canvas')
  emissive.width = albedo.width
  emissive.height = albedo.height
  const a = albedo.getContext('2d')!
  const e = emissive.getContext('2d')!
  a.fillStyle = '#808080' // neutral mid-grey — never sampled (slots are drawn over)
  a.fillRect(0, 0, albedo.width, albedo.height)
  e.fillStyle = '#000000'
  e.fillRect(0, 0, emissive.width, emissive.height)

  const map = new THREE.CanvasTexture(albedo)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const em = new THREE.CanvasTexture(emissive)
  em.colorSpace = THREE.SRGBColorSpace
  em.anisotropy = 4
  facadeAtlas = { map, emissive: em, slots: new Map(), next: 0 }
  return facadeAtlas
}

// draw one facade pattern into the next free atlas slot
function drawFacadePattern(key: string, opts: FacadeOpts): AtlasRect {
  const atlas = getFacadeAtlas()
  const hit = atlas.slots.get(key)
  if (hit) return hit
  if (atlas.next >= ATLAS_COLS * ATLAS_ROWS) {
    // out of slots — reuse slot 0 (never expected with the quantized key set)
    console.warn('[facade-atlas] out of slots, reusing slot 0 for', key)
    return atlas.slots.get(facadePatternKey({ ...opts, rows: 1, cols: 3, litRatio: 0.6 })) ?? {
      u0: 0, v0: 0, u1: 1 / ATLAS_COLS, v1: 1 / ATLAS_ROWS,
    }
  }
  const col = atlas.next % ATLAS_COLS
  const row = Math.floor(atlas.next / ATLAS_COLS)
  atlas.next++
  const px = col * ATLAS_TILE_W
  const py = row * ATLAS_TILE_H
  const rect: AtlasRect = {
    u0: col / ATLAS_COLS,
    v0: 1 - (row + 1) / ATLAS_ROWS, // canvas y-down → UV v-up
    u1: (col + 1) / ATLAS_COLS,
    v1: 1 - row / ATLAS_ROWS,
  }
  atlas.slots.set(key, rect)

  const a = atlas.map.image as HTMLCanvasElement
  const g = a.getContext('2d')!
  const eg = (atlas.emissive.image as HTMLCanvasElement).getContext('2d')!

  // local tile drawing (tile-local coordinates)
  const W = ATLAS_TILE_W
  const H = ATLAS_TILE_H
  g.save()
  g.translate(px, py)
  eg.save()
  eg.translate(px, py)

  // WHITE wall — tinted at render time by vertex colors
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  eg.fillStyle = '#000000'
  eg.fillRect(0, 0, W, H)

  // subtle facade shading
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, 'rgba(255,255,255,0.14)')
  grad.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)

  const qrows = quantRows(opts.rows)
  if (opts.style === 'block' || opts.style === 'louvre' || opts.style === 'worn') {
    drawCommunityFacade(g, eg, W, H, qrows, opts, atlas.next)
    g.restore()
    eg.restore()
    atlas.map.needsUpdate = true
    atlas.emissive.needsUpdate = true
    return rect
  }
  const mx = W * 0.09
  const my = H * 0.06
  const cw = (W - mx * 2) / opts.cols
  const ch = (H - my * 2) / qrows
  for (let r = 0; r < qrows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const lit = ((r * 7 + c * 13 + (atlas.next - 1) * 31) % 10) / 10 < opts.litRatio
      const wx = mx + c * cw + cw * 0.18
      const wy = my + r * ch + ch * 0.2
      const ww = cw * 0.64
      const wh = ch * 0.58
      if (opts.glass) {
        g.fillStyle = lit ? '#ffe9c4' : '#c8dce8'
        g.fillRect(wx, wy, ww, wh)
        if (!lit) {
          g.fillStyle = 'rgba(255,255,255,0.5)'
          g.fillRect(wx, wy, ww, wh * 0.4)
        }
      } else {
        g.fillStyle = lit ? '#ffe9c4' : '#3a3630'
        g.fillRect(wx, wy, ww, wh)
        g.strokeStyle = 'rgba(0,0,0,0.3)'
        g.lineWidth = 2
        g.strokeRect(wx, wy, ww, wh)
      }
      if (lit) {
        eg.fillStyle = ((r + c) % 4 === 0) ? '#ffb85c' : '#ffd27d'
        eg.fillRect(wx, wy, ww, wh)
      }
    }
  }
  g.restore()
  eg.restore()

  atlas.map.needsUpdate = true
  atlas.emissive.needsUpdate = true
  return rect
}

// ── Task 14: community facades (Ghanaian block houses) ──────────────────────
// Walls stay WHITE-ish (vertex colour tints them); everything drawn here is
// pattern: louvre ("naco") windows with burglar-proof bars, plaster wear and
// a damp/dust band at the base, or bare sandcrete block coursing.
function drawCommunityFacade(g: CanvasRenderingContext2D, eg: CanvasRenderingContext2D, W: number, H: number, rows: number, opts: FacadeOpts, seed: number) {
  const rnd = (i: number) => { const x = Math.sin(seed * 91.7 + i * 12.9898) * 43758.5453; return x - Math.floor(x) }
  if (opts.style === 'block') {
    // sandcrete blocks 450×225 mm → ~10 courses per storey tile band
    g.fillStyle = '#e9e6df'
    g.fillRect(0, 0, W, H)
    const ch = H / (rows * 12)
    const bw = ch * 2.1
    for (let r = 0; r * ch < H; r++) {
      const off = (r % 2) * bw * 0.5
      for (let x = -off; x < W; x += bw) {
        const t = 0.86 + rnd(r * 31 + Math.floor(x)) * 0.14
        g.fillStyle = `rgba(${Math.round(200 * t)},${Math.round(197 * t)},${Math.round(190 * t)},1)`
        g.fillRect(x + 1.5, r * ch + 1.5, bw - 3, ch - 3)
      }
    }
    // empty window / door openings (no frames yet) + concrete lintels
    const cw = W / opts.cols
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < opts.cols; c++) {
        const wx = c * cw + cw * 0.24
        const wy = (r * H) / rows + (H / rows) * 0.26
        g.fillStyle = '#9d9a92'
        g.fillRect(wx - 6, wy - 12, cw * 0.52 + 12, 10)
        g.fillStyle = '#26221e'
        g.fillRect(wx, wy, cw * 0.52, (H / rows) * 0.42)
      }
    }
    return
  }
  // plaster: subtle trowel mottling
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${rnd(i) > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd(i + 7) * 0.04})`
    g.beginPath()
    g.ellipse(rnd(i + 1) * W, rnd(i + 2) * H, 8 + rnd(i + 3) * 30, 6 + rnd(i + 4) * 22, 0, 0, Math.PI * 2)
    g.fill()
  }
  const worn = opts.style === 'worn'
  const bandH = H / rows
  const cw = W / opts.cols
  for (let r = 0; r < rows; r++) {
    // floor-slab line between storeys
    if (r > 0) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, r * bandH - 3, W, 6) }
    for (let c = 0; c < opts.cols; c++) {
      const lit = ((r * 7 + c * 13 + seed * 31) % 10) / 10 < opts.litRatio
      const ww = cw * 0.56
      const wh = bandH * 0.36
      const wx = c * cw + (cw - ww) / 2
      const wy = r * bandH + bandH * 0.3
      // painted surround
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.fillRect(wx - 7, wy - 7, ww + 14, wh + 14)
      // louvre blades
      g.fillStyle = lit ? '#ffe2ac' : '#5f6f77'
      g.fillRect(wx, wy, ww, wh)
      g.fillStyle = lit ? 'rgba(170,110,40,0.35)' : 'rgba(255,255,255,0.28)'
      for (let y = wy + 4; y < wy + wh; y += 9) g.fillRect(wx + 2, y, ww - 4, 3)
      // burglar-proof bars
      g.strokeStyle = '#2b2b2b'
      g.lineWidth = 3
      g.strokeRect(wx, wy, ww, wh)
      g.beginPath()
      for (let k = 1; k < 4; k++) { g.moveTo(wx + (ww * k) / 4, wy); g.lineTo(wx + (ww * k) / 4, wy + wh) }
      g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2)
      g.stroke()
      // sill + a rust/rain streak under it
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(wx - 6, wy + wh + 4, ww + 12, 5)
      if (worn || rnd(r * 9 + c) > 0.6) {
        const grd = g.createLinearGradient(0, wy + wh + 8, 0, wy + wh + 60)
        grd.addColorStop(0, 'rgba(70,50,30,0.28)')
        grd.addColorStop(1, 'rgba(70,50,30,0)')
        g.fillStyle = grd
        g.fillRect(wx + ww * 0.2, wy + wh + 8, ww * 0.25, 52)
      }
      if (lit) {
        eg.fillStyle = ((r + c) % 3 === 0) ? '#ffb85c' : '#ffd27d'
        eg.fillRect(wx, wy, ww, wh)
      }
    }
  }
  // dust / damp band at the base of the wall (laterite splash)
  const base = g.createLinearGradient(0, H - 70, 0, H)
  base.addColorStop(0, 'rgba(150,90,50,0)')
  base.addColorStop(1, worn ? 'rgba(130,78,44,0.6)' : 'rgba(150,90,50,0.38)')
  g.fillStyle = base
  g.fillRect(0, H - 70, W, 70)
  if (worn) {
    // faded, peeling patches showing the grey render underneath
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(120,116,108,${0.25 + rnd(i + 50) * 0.25})`
      g.beginPath()
      g.ellipse(rnd(i + 60) * W, rnd(i + 70) * H * 0.9, 6 + rnd(i + 80) * 18, 4 + rnd(i + 90) * 12, rnd(i) * 3, 0, Math.PI * 2)
      g.fill()
    }
    const top = g.createLinearGradient(0, 0, 0, 60)
    top.addColorStop(0, 'rgba(60,50,40,0.35)')
    top.addColorStop(1, 'rgba(60,50,40,0)')
    g.fillStyle = top
    g.fillRect(0, 0, W, 60)
  }
}

// UV inset (UV units) guarding against tile bleeding at mip levels
export const FACADE_UV_INSET = 0.004

export interface FacadeBinding {
  rect: AtlasRect
  glass: boolean
}

// public API used by Building: resolve (and draw if needed) this facade's tile
export function facadeSlotsUsed(): number { return facadeAtlas ? facadeAtlas.next : 0 }

export function resolveFacade(opts: FacadeOpts): FacadeBinding {
  const key = facadePatternKey(opts)
  const rect = drawFacadePattern(key, opts)
  return { rect, glass: !!opts.glass }
}

// shared materials — one per roughness class, tagged for the batcher
let facadeMatWall: THREE.MeshStandardMaterial | null = null
let facadeMatGlass: THREE.MeshStandardMaterial | null = null

export function getFacadeMaterials(): { wall: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial } {
  const atlas = getFacadeAtlas()
  if (!facadeMatWall) {
    facadeMatWall = new THREE.MeshStandardMaterial({
      map: atlas.map,
      emissiveMap: atlas.emissive,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 1.15,
      roughness: 0.85,
      metalness: 0.05,
      vertexColors: true,
    })
    facadeMatWall.userData.facadeTag = 'wall'
    facadeMatGlass = new THREE.MeshStandardMaterial({
      map: atlas.map,
      emissiveMap: atlas.emissive,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 1.15,
      roughness: 0.35,
      metalness: 0.35,
      vertexColors: true,
    })
    facadeMatGlass.userData.facadeTag = 'glass'
  }
  return { wall: facadeMatWall, glass: facadeMatGlass! }
}

// ─────────────────────────────────────────────────────────────── shop signs ─
export function signTexture(text: string, bg: string, fg = '#111111'): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = 'rgba(0,0,0,0.14)'
  g.fillRect(0, 96, 512, 32)
  g.font = 'bold 64px Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = fg
  g.fillText(text, 256, 62, 460)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ───────────────────────────────────────────────────────────── ghana flag ──
export function flagTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#ce1126'
  g.fillRect(0, 0, 256, 54)
  g.fillStyle = '#fcd116'
  g.fillRect(0, 54, 256, 52)
  g.fillStyle = '#006b3f'
  g.fillRect(0, 106, 256, 54)
  drawStar(g, 128, 80, 20, '#000000')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ───────────────────────────── balloon envelope (red/gold/green stripes) ────
export function balloonTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  const cols = ['#ce1126', '#fcd116', '#006b3f', '#fcd116', '#ce1126', '#fcd116']
  const w = 256 / cols.length
  cols.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(i * w, 0, w + 1, 256)
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ───────────────────────────────────────────── lighthouse banding texture ───
export function lighthouseTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 512
  const g = c.getContext('2d')!
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 === 0 ? '#f4f1ea' : '#ce1126'
    g.fillRect(0, i * 64, 128, 64)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ────────────────────────────────────────────────────────── checker (race) ──
export function checkerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 240
  c.height = 120
  const g = c.getContext('2d')!
  const sq = 20
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 12; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#111111' : '#f5f5f5'
      g.fillRect(x * sq, y * sq, sq, sq)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ───────────────────────────── Chale Wote street-art murals (3 variants) ────
export function muralTexture(variant = 0): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  if (variant === 0) {
    // kente-stripe wall with black zigzag band + festival title
    const cols = ['#ce1126', '#fcd116', '#006b3f', '#2e7fa8', '#e08a3c', '#d4557a', '#3aa08f', '#ce1126']
    cols.forEach((col, i) => {
      g.fillStyle = col
      g.fillRect(i * 64, 0, 64, 256)
    })
    g.fillStyle = 'rgba(255,255,255,0.14)'
    for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 8, 0, 10, 256)
    g.fillStyle = '#1a1a1a'
    g.beginPath()
    g.moveTo(0, 168)
    for (let x = 0; x <= 512; x += 64) {
      g.lineTo(x + 32, 128)
      g.lineTo(x + 64, 168)
    }
    g.lineTo(512, 206)
    g.lineTo(0, 206)
    g.closePath()
    g.fill()
    g.font = 'bold 58px Arial, sans-serif'
    g.textAlign = 'center'
    g.lineWidth = 10
    g.strokeStyle = '#1a1a1a'
    g.strokeText('CHALE WOTE', 256, 84)
    g.fillStyle = '#ffffff'
    g.fillText('CHALE WOTE', 256, 84)
  } else if (variant === 1) {
    // sunset sea mural: sun disc, waves, adinkra-style motifs
    g.fillStyle = '#f4a52a'
    g.fillRect(0, 0, 512, 128)
    g.fillStyle = '#d4557a'
    g.fillRect(0, 128, 512, 128)
    g.fillStyle = '#fcd116'
    g.beginPath()
    g.arc(256, 118, 62, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#f4f1ea'
    g.lineWidth = 9
    for (let i = 0; i < 3; i++) {
      g.beginPath()
      for (let x = 0; x <= 512; x += 8) {
        const y = 160 + i * 30 + Math.sin(x * 0.045 + i * 2) * 9
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    g.fillStyle = '#1a1a1a'
    for (let i = 0; i < 5; i++) {
      const x = 52 + i * 102
      g.beginPath()
      g.arc(x, 52, 17, 0, Math.PI * 2)
      g.fill()
      g.fillRect(x - 4, 60, 8, 26)
    }
  } else {
    // boxing-gym mural: rays + gloves silhouette + star
    g.fillStyle = '#ce1126'
    g.fillRect(0, 0, 512, 256)
    g.strokeStyle = '#fcd116'
    g.lineWidth = 10
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.beginPath()
      g.moveTo(256 + Math.cos(a) * 60, 128 + Math.sin(a) * 60)
      g.lineTo(256 + Math.cos(a) * 300, 128 + Math.sin(a) * 300)
      g.stroke()
    }
    g.fillStyle = '#1a1a1a'
    g.beginPath()
    g.arc(196, 140, 44, 0.6, Math.PI * 1.4)
    g.fill()
    g.fillRect(160, 96, 52, 40)
    g.beginPath()
    g.arc(316, 140, 44, Math.PI * 1.6, Math.PI * 0.4)
    g.fill()
    g.fillRect(300, 96, 52, 40)
    drawStar(g, 256, 70, 26, '#fcd116')
    g.font = 'bold 46px Arial, sans-serif'
    g.textAlign = 'center'
    g.fillStyle = '#ffffff'
    g.fillText('JAMESTOWN', 256, 226)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ───────────────────────── festival bunting strip (transparent background) ──
export function buntingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 48
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 512, 48)
  g.strokeStyle = '#d8d2c4'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(0, 6)
  g.quadraticCurveTo(256, 22, 512, 6)
  g.stroke()
  const cols = ['#ce1126', '#fcd116', '#006b3f', '#2e7fa8', '#e08a3c', '#d4557a']
  for (let i = 0; i < 16; i++) {
    const x = 16 + i * 32
    const y = 10 + Math.sin((i / 15) * Math.PI) * 12
    g.fillStyle = cols[i % cols.length]
    g.beginPath()
    g.moveTo(x - 9, y)
    g.lineTo(x + 9, y)
    g.lineTo(x, y + 24)
    g.closePath()
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ─────────────────────────────────────────────────────────────── sun glow ──
export function glowTexture(color = '#ffb46b'): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128)
  grad.addColorStop(0, color)
  grad.addColorStop(0.35, 'rgba(255,150,80,0.45)')
  grad.addColorStop(1, 'rgba(255,120,60,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
