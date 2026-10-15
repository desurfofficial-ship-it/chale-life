import { T13_PLOTS } from './t13Layout'
// ─── Accra Open-World Game Map — shared layout config (EXPANDED EDITION) ────
// World units: plate is 372 (x) × 232 (z), top surface at y = 0, spanning
// x −160…212 (Task 11 eastward extension for the Nungua district) — the plate
// MESH is centred at x = 26. Sea along the south edge (+z, z 46→116).
// Land spans z −116→46. Circle interchange near center-west. Districts:
//   west  (x −160…−112): James Town — lighthouse, fishing harbor, village
//   north (z −116…−78):  Kotoka airport strip + Airport City (both sides)
//   east  (x 112…160):   stadium, national theatre, Osu Castle point
//   far east (x 160…212): NUNGUA — the Task 11 land-extension neighborhood
//   sea    (z 66…98):    CHALÉ ISLAND — buyable land plots + causeway
//   plus rooftop-pool terrace hotel, boardwalk cafe, playground, fun zone,
//   Chorkor market row, land-for-sale plots across every district.

// Task 13: the plate grew again — west to x −280 (Chorkor West, Mamprobi,
// Kaneshie Market, Korle Island) and east to x 340 (Teshie–Nungua Estates,
// Sakumono, Tema Port). 620 m × 232 m, spanning x −280…340.
export const PLATE = { w: 620, d: 232, h: 6 }
/** plate centre in world x (mesh position + texture mapping offset) */
export const PLATE_CX = 30

export const COLORS = {
  grass: '#7fb35a',
  grassDark: '#6d9c4d',
  lawn: '#93c469',
  sand: '#ecd69f',
  dirt: '#b06f3d',
  asphalt: '#5d6168',
  asphaltEdge: '#4a4e54',
  plaza: '#e8e0d0',
  parking: '#666b73',
  water: '#1d6e8f',
  waterDeep: '#12506e',
  roofTerracotta: '#c65a33',
  roofAlt: '#a84e2c',
  roofPurple: '#6b4e8a',
  white: '#f4f1ea',
  wallTeal: '#8DA69A',
  wallOrange: '#F0AB70',
  wallPink: '#E4A0A8',
  wallGreen: '#8DA69A',
  wallCream: '#E4C782',
  wallYellow: '#E4C782',
  wallPurple: '#8e6fae',
  taxi: '#f6b21b',
  mtnYellow: '#ffcb05',
  windowWarm: '#ffcf7d',
  poolBlue: '#2fb8d9',
}

// Road centerlines (painted on ground texture + used by ground art)
// Phase 3: ew1 + coastal start at x=-114 so the highway no longer cuts
// through the Chale Wote heritage block / fishing quay; ns1+ns2 reach both
// airportRd (north) and the beach (south); midC + campusSt join at (-60,-50).
// Handover: westP rerouted x -140 → -157.5 so it no longer drives through the
// Chale Wote courtyard (a colonial building used to stand on the asphalt); it
// now skirts the village's west side and meets the Daavi street + z=18 lane.
export const ROADS = {
  ew1: { z: 10, x0: -114, x1: 209.75, w: 9 },  // extended east onto the Nungua land
  ew2: { z: -31.5, x0: -276, x1: 332, w: 9 }, // Task 13: spans the whole plate (west rim road ↔ Tema port east road)
  ns1: { x: -10, z0: -86, z1: 36, w: 9 },
  ns2: { x: 60, z0: -86, z1: 36, w: 9 },
  coastal: { z: 28, x0: -114, x1: 332, w: 9 }, // Task 13: continues east as the Tema port quay road
  north: { z: -75, x0: -157.5, x1: 95, w: 9 }, // extended west to meet westP
  westP: { x: -157.5, z0: -86, z1: 18, w: 9 },
  eastP: { x: 95, z0: -75, z1: 10, w: 9 },
  campusSt: { z: -50, x0: -157.5, x1: 100, w: 9 }, // Dansoman Ave: extended west to westP (east end still stops before the stadium wall)
  parkC: { x: -45, z0: -50, z1: -31.5, w: 9 },
  midC: { x: -60, z0: -50, z1: 10, w: 9 },
  airportRd: { z: -86, x0: -276, x1: 332, w: 9 }, // Task 13: full-width northern artery (Kaneshie ↔ Sakumono)
  stadiumRd: { x: 140, z0: -86, z1: -76, w: 9 }, // stub ends at the forecourt
  ns3: { x: 72, z0: -86, z1: -75, w: 9 }, // Airport City spine
  eastLink: { x: 150, z0: -31.5, z1: 28, w: 9 }, // closes the eastern ring (ew2 ↔ coastal)
  // ── neighborhood grids (Task 10: large residential districts) ──────────────
  // DANSOMAN (west): nsD1/nsD2 run the full block from north rd down to ew2;
  // nsD3 serves the west quarter. campusSt extended west to westP becomes
  // Dansoman Avenue (the spine the neighborhood rows front onto).
  nsD1: { x: -140, z0: -75, z1: -31.5, w: 7 },
  nsD2: { x: -114, z0: -75, z1: -31.5, w: 7 },
  nsD3: { x: -88, z0: -75, z1: -50, w: 7 },
  // NIMA / MAAMOBI (north-center): two residential spines between ns1 and ns2
  nimaN1: { x: 8, z0: -75, z1: -50, w: 7 },
  nimaN2: { x: 30, z0: -75, z1: -50, w: 7 },
  // TESHIE/NUNGUA (east): spine between the theatre plaza and the castle lawn
  nsE1: { x: 124, z0: -36, z1: 28, w: 7 },
  // Jamestown link: joins the village lanes (z 4 / z 18) with ew1 + coastal
  jamestownLink: { x: -114, z0: 2, z1: 28, w: 7 },
  // Daavi street: paved two-lane street on the z=4 lane alignment,
  // running from westP to the jamestown link (painted in mapTextures).
  daaviSt: { z: 4, x0: -276, x1: -114, w: 7 }, // Task 13: continues west through Chorkor West to the rim road
  // ── Task 11 additions ──────────────────────────────────────────────────────
  // Chalé Island causeway: coastal road → island north head (cars included)
  islandCauseway: { x: -45, z0: 26, z1: 85, w: 7 },
  // Nungua spine: the only car road into the new east district
  nsN1: { x: 162, z0: -31.5, z1: 28, w: 7 },
  // island dirt lane: the causeway T-junctions into it (cars can reach the
  // lane between the island's plot columns; ends stay ≤ 15 m from the junction)
  islandLane: { z: 85, x0: -60, x1: -30, w: 4 },
  // Adabraka car lane: the N-S foot lane opened to traffic (kiosks/lamps
  // re-seated; 3.4 m wide — one car fits with 0.2 m to spare, proven by sim)
  adabrakaLane: { x: 9.5, z0: -31.5, z1: 10, w: 3.4 },
  // east edge connector: closes the Nungua ring (ew2 ↔ ew1 ↔ coastal)
  // Task 12: was x 208 / w 7 — never painted and its band ran 2.7 m into the
  // x 204 house column (hidden by the old collider clip at x 186). Now a
  // painted one-lane edge road (4.5 m: car Ø 2.6 m + 0.95 m each side).
  nunguaE: { x: 209.75, z0: -31.5, z1: 28, w: 4.5 },
  // ── Task 13: west land (Chorkor West, Mamprobi, Kaneshie Market, Korle Island)
  westRim: { x: -272, z0: -86, z1: 28, w: 9 },            // west rim road
  korleCoast: { z: 28, x0: -272, x1: -170, w: 9 },       // Korle Gonno coast road
  chorkorLink: { x: -170, z0: 4, z1: 28, w: 7 },         // Daavi St ext ↔ coast road
  mamprobiN1: { x: -240, z0: -86, z1: -31.5, w: 7 },     // Mamprobi spine
  dansomanW1: { x: -205, z0: -86, z1: -31.5, w: 7 },     // Dansoman West spine
  mamprobiE: { z: -58.5, x0: -272, x1: -157.5, w: 7 },   // Mamprobi / Dansoman West cross lane
  chorkorN1: { x: -215, z0: -31.5, z1: 4, w: 7 },        // Chorkor West spine
  chorkorMkt: { z: -8.5, x0: -272, x1: -157.5, w: 6 },   // Chorkor market lane (stalls on the south side)
  kaneshieW: { x: -228, z0: -104, z1: -86, w: 6 },       // Kaneshie Market loop (U from airportRd)
  kaneshieE: { x: -168, z0: -104, z1: -86, w: 6 },
  kaneshieN: { z: -104, x0: -228, x1: -168, w: 6 },
  korleCauseway: { x: -228, z0: 28, z1: 70, w: 7 },      // second island causeway (cars drive across)
  korleRingN: { z: 70, x0: -253, x1: -203, w: 4 },       // Korle Island ring lane (a loop — no dead ends)
  korleRingS: { z: 93, x0: -253, x1: -203, w: 4 },
  korleRingW: { x: -253, z0: 70, z1: 93, w: 4 },
  korleRingE: { x: -203, z0: 70, z1: 93, w: 4 },
  // ── Task 13: east land (Teshie–Nungua Estates, Sakumono, Tema Port)
  estatesN1: { x: 186, z0: -86, z1: -31.5, w: 7 },       // Estates spine
  sakumonoN1: { x: 240, z0: -86, z1: -31.5, w: 7 },      // Sakumono spines
  sakumonoN2: { x: 290, z0: -86, z1: -31.5, w: 7 },
  estatesE: { z: -58.5, x0: 186, x1: 332, w: 7 },        // Estates / Sakumono cross lane
  portEastRd: { x: 332, z0: -86, z1: 28, w: 9 },         // Tema port east road
  portGateRd: { x: 222, z0: -31.5, z1: 28, w: 9 },       // port gate road (ew2 → quay)
  pierW: { x: 278, z0: 28, z1: 86, w: 6 },               // container pier loop (on the pier deck)
  pierE: { x: 292, z0: 28, z1: 86, w: 6 },
  pierN: { z: 86, x0: 278, x1: 292, w: 6 },
}

/** Task 13 roads (painted generically by mapTextures — the older roads keep
 *  their hand-tuned paint calls) */
export const T13_ROAD_IDS = [
  'westRim', 'korleCoast', 'chorkorLink', 'mamprobiN1', 'dansomanW1', 'mamprobiE', 'chorkorN1', 'chorkorMkt',
  'kaneshieW', 'kaneshieE', 'kaneshieN', 'korleCauseway', 'korleRingN', 'korleRingS', 'korleRingW', 'korleRingE',
  'estatesN1', 'sakumonoN1', 'sakumonoN2', 'estatesE', 'portEastRd', 'portGateRd', 'pierW', 'pierE', 'pierN',
] as const

/** dry-land exceptions inside the sea strip (z > 46): islands, causeways,
 *  piers and jetties the player may walk on — mirrored into sim water.json */
export const DRY_ISLANDS = [
  { id: 'chale-island', x0: -77, x1: -13, z0: 66, z1: 98 },
  { id: 'korle-island', x0: -260, x1: -196, z0: 62, z1: 100 },
  { id: 'tema-pier', x0: 272, x1: 298, z0: 44, z1: 92 },
  { id: 'chorkor-jetty', x0: -186, x1: -180, z0: 44, z1: 60 },
]
export const DRY_BRIDGES = [
  { id: 'chale-causeway', x0: -48.6, x1: -41.4, z0: 26, z1: 68 },
  { id: 'korle-causeway', x0: -231.6, x1: -224.4, z0: 26, z1: 64 },
]

// ── Daavi's reserved plot (Chalé Life handover) ──────────────────────────────
// A flat, clear ~30 × 20 m plot in James Town, fronting the two-lane Daavi
// street. Only a kiosk, a compound house with an open sleep yard and a
// pavement occupy it — the rest is left empty for the game to build on.
export const DAAVI_PLOT = {
  x0: -152,
  x1: -122, // widened to the full 30 m handover width (jamestown link at -117.5)
  z0: -20,  // deepened north (village house row moved to z -23.5)
  z1: -1.3, // south edge (pavement strip z -1.3…0.5, street z 0.5…7.5)
}
export const DAAVI_PLOT_SIZE = { w: DAAVI_PLOT.x1 - DAAVI_PLOT.x0, d: DAAVI_PLOT.z1 - DAAVI_PLOT.z0 } // 30 × 18.7 m

// ── fly-to no-fly volumes ─────────────────────────────────────────────────────
// Vertical cylinders the camera rig must climb over during flights so the
// fly-to path never passes through a tall structure.
export interface NoFlyZone { x: number; z: number; r: number; h: number }

export const NO_FLY_ZONES: NoFlyZone[] = [
  // Task 13: the CBD glass towers moved out of Nima to AIRPORT CITY EAST
  { x: 158, z: -100.5, r: 7, h: 28 }, { x: 171, z: -100.5, r: 7, h: 26 }, { x: 184, z: -100.5, r: 7, h: 30 },
  { x: 158, z: -110.5, r: 4.5, h: 24 }, { x: 171, z: -110.5, r: 4.5, h: 28 },
  // Task 13: Tema port ship-to-shore cranes (portal + boom out over the water)
  ...[233, 251, 310, 326].flatMap((x) => [35, 47, 59].map((z) => ({ x, z, r: 7.5, h: 25 }))),
  // Task 13: moored ships' bridges / funnels
  { x: 241, z: 66, r: 6, h: 11 }, { x: 266, z: 68, r: 6, h: 11 }, { x: 319, z: 64, r: 6, h: 11 },
  { x: 15, z: -41, r: 6, h: 15 },
  // Airport City towers + deck, terminal + control tower
  { x: 78, z: -95.5, r: 8, h: 24 }, { x: 92, z: -95.5, r: 8, h: 29 },
  { x: 106, z: -95.5, r: 8, h: 23 }, { x: 120, z: -95.5, r: 8, h: 26 },
  { x: 130, z: -95.5, r: 9, h: 14 }, { x: 30, z: -94.5, r: 12, h: 20 },
  // civic landmarks
  { x: 76, z: -6, r: 15, h: 14 },   // Accra Mall (moved 5 m west, clear of eastP)
  { x: 79, z: -62, r: 5, h: 15 },   // Legon tower
  { x: 128, z: -55, r: 26, h: 23 }, // stadium bowl + facade + floodlight masts
  // stadium approach guarantee: flights may only descend toward the stadium
  // from above the facade rim — the focus camera sits 41 m north of the bowl
  // centre at y 27 (above h + 2.5), so the final descent is always outside
  // the ellipse (facade rx 21.2 / rz 16.2 < r 26).
  { x: -146, z: 22.5, r: 5, h: 27 },// lighthouse
  { x: -58, z: -58, r: 9, h: 18 },  // mosque minarets
  { x: 72, z: 41, r: 11, h: 18 },   // ferris wheel
  { x: -96, z: 19, r: 9, h: 15 },   // terrace hotel
  { x: 135, z: 38, r: 12, h: 11 },  // Osu castle keep
  { x: 112, z: -20, r: 9, h: 13 },  // national theatre shell
  { x: -48, z: 10, r: 6, h: 13 },   // black star gate beam
  { x: -89, z: 19, r: 3.5, h: 18 }, { x: -33, z: 19, r: 3.5, h: 18 },
]

// minimum camera altitude enforced mid-flight (above houses/shops/stalls)
export const MIN_FLIGHT_ALT = 12.5

// ── hand-authored colliders for animated / composite structures ──────────────
// The auto-captured boxes cover every static mesh. These extras cover the
// static parts of ANIMATED landmarks (whose moving subtrees are excluded) and
// hollow structures (the stadium bowl is a ring — players must walk the pitch).
export const EXTRA_COLLIDERS: { min: [number, number, number]; max: [number, number, number]; kind: string }[] = [
  // stadium bowl ring (facade ellipse rx 21.2 / rz 16.2 at (128,-55)) — four
  // wall boxes leave the pitch open
  { min: [106.8, 0, -72.2], max: [149.2, 10.5, -68.2], kind: 'stadium-wall-N' },
  { min: [106.8, 0, -41.8], max: [149.2, 10.5, -37.8], kind: 'stadium-wall-S' },
  { min: [104.8, 0, -68.2], max: [109.8, 10.5, -41.8], kind: 'stadium-wall-W' },
  { min: [146.2, 0, -68.2], max: [151.2, 10.5, -41.8], kind: 'stadium-wall-E' },
  // ferris wheel base + lower arc keep-out (wheel at (72,41), r≈11)
  { min: [68.5, 0, 38.5], max: [75.5, 9, 43.5], kind: 'ferris-wheel' },
]

export const CIRCLE = { x: -10, z: 10, ringOuter: 13.5, ringInner: 8, island: 5.2 }

export const BEACH = { z0: 36, z1: 46 }
export const SEA = { z0: 46, z1: 116 }
export const LAGOON = { x: 80, z: 18.5, rx: 13, rz: 4 }

// Landmarks — label positions are where the floating tag hovers.
export interface LandmarkDef {
  id: string
  label: string
  pos: [number, number, number]
  focus: [number, number, number] // camera position when focused
  target: [number, number, number] // orbit target when focused
}

export const LANDMARKS: LandmarkDef[] = [
  { id: 'arch', label: 'INDEPENDENCE ARCH', pos: [-65, 15, 18.5], focus: [-65, 16, 58], target: [-65, 4, 18.5] },
  { id: 'blacksquare', label: 'BLACK STAR SQUARE', pos: [-49, 10.5, 25.5], focus: [-58, 24, 74], target: [-58, 0, 20] },
  { id: 'oxford', label: 'OSU OXFORD STREET', pos: [60, 9.5, -28], focus: [60, 15, 42], target: [60, 0, -12] },
  { id: 'airportcity', label: 'AIRPORT CITY', pos: [99, 13, -94], focus: [132, 30, -56], target: [96, 6, -95] },
  { id: 'chalewote', label: 'CHALE WOTE STREET', pos: [-128, 9.5, 6], focus: [-126, 14, 54], target: [-130, 0, 8] },
  { id: 'makola', label: 'MAKOLA MARKET', pos: [-40, 11, -16], focus: [-40, 22, 22], target: [-40, 0, -16] },
  { id: 'park', label: 'KWAME NKRUMAH PARK', pos: [-78, 11, -15], focus: [-78, 18, 20], target: [-78, 0, -15] },
  { id: 'beach', label: 'LABADI BEACH', pos: [52, 7.5, 36], focus: [52, 14, 66], target: [52, 0, 36] },
  { id: 'mall', label: 'ACCRA MALL', pos: [76, 15, -6], focus: [76, 16, 30], target: [76, 2, -6] },
  { id: 'legon', label: 'LEGON CAMPUS', pos: [80, 16, -60], focus: [80, 16, -26], target: [80, 0, -58] },
  { id: 'circle', label: 'CIRCLE', pos: [-10, 11, 10], focus: [-10, 15, 48], target: [-10, 0, 10] },
  { id: 'trotro', label: 'TROTRO STATION', pos: [-36, 8.5, -60], focus: [-36, 16, -26], target: [-36, 0, -60] },
  { id: 'jollof', label: 'JOLLOF SPOT', pos: [8, 8, 3], focus: [8, 10, 32], target: [7.5, 0, 3] },
  { id: 'mtn', label: 'MTN SHOP', pos: [-24, 8, 26], focus: [-24, 10, 48], target: [-24, 0, 26] },
  { id: 'fuel', label: 'FUEL STATION', pos: [35, 10, 18.5], focus: [35, 12, 46], target: [35, 0, 18.5] },
  { id: 'lighthouse', label: 'JAMES TOWN LIGHTHOUSE', pos: [-146, 17.5, 22.5], focus: [-138, 30, 82], target: [-146, 7, 22.5] },
  { id: 'harbor', label: 'FISHING HARBOR', pos: [-136, 8, 34], focus: [-136, 13, 62], target: [-136, 0, 36] },
  { id: 'terrace', label: 'ROOFTOP POOL', pos: [-96, 15, 19.35], focus: [-96, 14, 47], target: [-96, 4, 19.35] },
  { id: 'waterfront', label: 'THE WATERFRONT', pos: [-58, 9, 52], focus: [-58, 13, 84], target: [-58, 1, 54] },
  { id: 'stadium', label: 'ACCRA STADIUM', pos: [128, 14, -55], focus: [128, 27, -14], target: [128, 2, -55] },
  { id: 'airport', label: 'KOTOKA AIRPORT', pos: [30, 13, -92], focus: [38, 30, -156], target: [30, 1, -96] },
  { id: 'playground', label: 'PLAYGROUND', pos: [-100, 7, -12], focus: [-100, 9, 16], target: [-100, 0, -12] },
  { id: 'castle', label: 'OSU CASTLE', pos: [135, 12, 38], focus: [135, 12, 68], target: [135, 2, 38] },
  { id: 'theatre', label: 'NATIONAL THEATRE', pos: [112, 10, -20], focus: [112, 11, 12], target: [112, 0, -20] },
  { id: 'funzone', label: 'FUN ZONE', pos: [72, 13, 41], focus: [72, 12, 70], target: [72, 2, 41] },
  // large residential neighborhoods (Task 10 + Adabraka grid)
  { id: 'dansoman', label: 'DANSOMAN', pos: [-114, 9, -62], focus: [-114, 22, -22], target: [-114, 0, -60] },
  { id: 'nima', label: 'NIMA', pos: [19, 9, -62], focus: [19, 20, -22], target: [19, 0, -60] },
  { id: 'adabraka', label: 'ADABRAKA', pos: [31, 9, -11], focus: [31, 17, 24], target: [31, 0, -11] },
  { id: 'teshie', label: 'TESHIE', pos: [131, 9, 5], focus: [131, 20, 44], target: [131, 0, 3] },
  // Task 11: new districts + buyable land
  { id: 'chorkor', label: 'CHORKOR MARKET', pos: [-131, 9, -13], focus: [-131, 15, 26], target: [-131, 0, -11] },
  { id: 'nungua', label: 'NUNGUA', pos: [186, 9, -12], focus: [186, 20, 30], target: [186, 0, -12] },
  { id: 'island', label: 'CHALÉ ISLAND', pos: [-45, 9, 82], focus: [-45, 16, 122], target: [-45, 0, 82] },
  // Task 13: new land, second island, port + harbour, new districts
  { id: 'mamprobi', label: 'MAMPROBI', pos: [-238, 9, -60], focus: [-238, 22, -18], target: [-238, 0, -58] },
  { id: 'kaneshie', label: 'KANESHIE MARKET', pos: [-198, 9, -97], focus: [-198, 22, -56], target: [-198, 0, -96] },
  { id: 'chorkorwest', label: 'CHORKOR WEST', pos: [-215, 9, -12], focus: [-215, 20, 26], target: [-215, 0, -10] },
  { id: 'korle', label: 'KORLE ISLAND', pos: [-228, 9, 81], focus: [-228, 18, 124], target: [-228, 0, 81] },
  { id: 'chorkorharbour', label: 'CHORKOR HARBOUR', pos: [-186, 8, 42], focus: [-176, 14, 80], target: [-186, 0, 44] },
  { id: 'estates', label: 'TESHIE–NUNGUA ESTATES', pos: [205, 9, -60], focus: [205, 22, -18], target: [205, 0, -58] },
  { id: 'sakumono', label: 'SAKUMONO', pos: [285, 9, -60], focus: [285, 22, -18], target: [285, 0, -58] },
  { id: 'temaport', label: 'TEMA PORT', pos: [285, 16, 40], focus: [252, 40, 108], target: [282, 2, 40] },
]

// district shortcut tabs (labels shown in the map HUD)
export const DISTRICT_TABS: { label: string; id: string }[] = [
  { label: 'BLACK STAR SQ', id: 'blacksquare' },
  { label: 'JAMESTOWN', id: 'lighthouse' },
  { label: 'MAKOLA', id: 'makola' },
  { label: 'OXFORD ST', id: 'oxford' },
  { label: 'AIRPORT CITY', id: 'airportcity' },
  { label: 'STADIUM', id: 'stadium' },
  { label: 'LABADI', id: 'beach' },
  { label: 'FUN ZONE', id: 'funzone' },
  { label: 'DANSOMAN', id: 'dansoman' },
  { label: 'CHORKOR', id: 'chorkor' },
  { label: 'NIMA', id: 'nima' },
  { label: 'ADABRAKA', id: 'adabraka' },
  { label: 'TESHIE', id: 'teshie' },
  { label: 'NUNGUA', id: 'nungua' },
  { label: 'CHALÉ ISLAND', id: 'island' },
  // Task 13
  { label: 'MAMPROBI', id: 'mamprobi' },
  { label: 'KANESHIE MKT', id: 'kaneshie' },
  { label: 'CHORKOR WEST', id: 'chorkorwest' },
  { label: 'CHORKOR HARBOUR', id: 'chorkorharbour' },
  { label: 'KORLE ISLAND', id: 'korle' },
  { label: 'ESTATES', id: 'estates' },
  { label: 'SAKUMONO', id: 'sakumono' },
  { label: 'TEMA PORT', id: 'temaport' },
]

// ── buyable land plots (Task 11): painted clearings + 3D beacons/signs ──────
// Every rect was validated against colliders + road bands (scripts/audit_candidates.py)
export interface LandPlotDef {
  x: number
  z: number
  w: number
  d: number
  zone: string // appears in the sim/README as the plot's neighborhood
  /** Task 13 sale metadata (the game's buy-land mechanic reads these) */
  id?: string
  /** nearest landmark / selling point ('' when it is a plain neighbourhood plot) */
  near?: string
  /** ground level of the plot (islands sit on a 0.44 m plinth) */
  y?: number
  /** asking price in GH₵ (placeholder economy — tune in the game) */
  price?: number
}

const BASE_LAND_PLOTS: LandPlotDef[] = [
  { x: -113.5, z: -3.8, w: 7, d: 5.6, zone: 'chorkor' },      // Chorkor / Daavi St corner
  { x: -130, z: -22, w: 10, d: 8, zone: 'chorkor' },          // behind the Chorkor row
  { x: -34.5, z: -42.3, w: 6, d: 5, zone: 'nima' },           // Nima avenue front plot
  { x: 44, z: -41.4, w: 5, d: 6, zone: 'cbd' },               // near CBD / Oxford St
  { x: -47.5, z: -67.5, w: 5, d: 4, zone: 'trotro' },         // by the trotro station
  { x: -33, z: 37, w: 8, d: 6, zone: 'jamestown' },           // beachfront near MTN hill
  { x: -52, z: 37, w: 5, d: 4, zone: 'blacksquare' },       // Black Star beachfront
  { x: 197, z: -24, w: 5.6, d: 5.6, zone: 'nungua' },         // inside the Nungua grid
  { x: 197, z: -16, w: 5.6, d: 5.6, zone: 'nungua' },
  { x: 204, z: -8, w: 5.6, d: 5.6, zone: 'nungua' },
]

/** every buyable plot: Task 11 plots (ids assigned) + Chalé Island + the Task
 *  13 plots generated and audited by tools/t13_layout.py (lib/t13Layout.ts) */
/** Zone multipliers — CBD / landmarks cost serious money. */
const ZONE_PRICE_MULT: Record<string, number> = {
  cbd: 3.4,
  blacksquare: 3.2,
  jamestown: 2.6,
  trotro: 1.8,
  nima: 1.5,
  osu: 2.2,
  chorkor: 1.35,
  nungua: 0.85,
  airport: 2.0,
  legon: 1.9,
}

/**
 * Plot asking price (GH₵). Area base × zone mult + landmark proximity premium.
 * Plots next to named landmarks / city core are intentionally expensive.
 */
export function plotAskingPrice(p: {
  x: number
  z: number
  w: number
  d: number
  zone?: string
  price?: number
}): number {
  if (p.price != null && Number.isFinite(p.price)) return p.price
  const area = Math.max(1, p.w * p.d)
  const zoneMult = ZONE_PRICE_MULT[p.zone ?? ''] ?? 1.2
  let base = Math.round((area * 520 * zoneMult) / 100) * 100
  // Landmark proximity premium
  let premium = 0
  for (const lm of LANDMARKS) {
    const dx = p.x - lm.pos[0]
    const dz = p.z - lm.pos[2]
    const dist = Math.hypot(dx, dz)
    if (dist < 35) premium = Math.max(premium, 120_000)
    else if (dist < 70) premium = Math.max(premium, 55_000)
    else if (dist < 110) premium = Math.max(premium, 22_000)
  }
  return base + premium
}

export const LAND_PLOTS: LandPlotDef[] = [
  ...BASE_LAND_PLOTS.map((p, i) => ({
    ...p,
    id: p.id ?? `t11-${String(i + 1).padStart(2, '0')}-${p.zone}`,
    near: p.near ?? '',
    y: 0,
    price: plotAskingPrice(p),
  })),
  ...(T13_PLOTS as LandPlotDef[]).map((p) => ({
    ...p,
    price: plotAskingPrice(p),
  })),
]

export const OVERVIEW = {
  // Task 13: the 620 m plate is framed end-on from the east (Tema Port in
  // front, Korle Island at the far end) so the whole map fits a portrait phone
  camera: [640, 330, 150] as [number, number, number],
  target: [30, 0, 0] as [number, number, number],
}

// camera-target clamps used by the fly-to rig
export const CAMERA_LIMITS = {
  targetX: [-270, 330] as [number, number],
  targetZ: [-112, 112] as [number, number],
  targetY: [0, 40] as [number, number],
  minDistance: 30,
  maxDistance: 800,
}
