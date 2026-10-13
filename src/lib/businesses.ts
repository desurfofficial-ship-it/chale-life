// ─── Task 12: neighbourhood business placements (generated from the audited
// spec in tools/t12_biz_spec.py — every footprint checked against the collider
// set, road carriageways, land plots, the Daavi-house zone and each other,
// with a 2 × 1.2 m clear strip in front of every door). Front faces local +z;
// `f` = which world side the front faces (S +z, N −z, E +x, W −x).
export type BizKind = 'restaurant' | 'chopbar' | 'drink' | 'store' | 'boutique' | 'supermarket' | 'gaming' | 'hotel'
  // Task 13
  | 'salon' | 'barber' | 'gym' | 'cafe' | 'club' | 'kiosk' | 'shop' | 'warehouse' | 'hall'
export interface BizDef { /** ground level (island businesses sit on the 0.44 m plinth) */ y?: number; id: string; hood: string; kind: BizKind; name: string; x: number; z: number; f: 'S' | 'N' | 'E' | 'W'; w: number; d: number; apron?: number; floors?: number; door?: number; bg: string; fg?: string }
export const BIZ_ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 } as const
import { T13_BIZ, T13_CONVERTED } from './t13Layout'
import { COMMUNITY } from './communityLayout'
const BASE_BUSINESSES: BizDef[] = [
  {"id": "dan_rest", "hood": "dansoman", "kind": "restaurant", "name": "MAAME TAWIAH'S KITCHEN", "x": -64.4, "z": -63.4, "f": "N", "w": 7, "d": 4.2, "apron": 2.0, "bg": "#2e7fa8"},
  {"id": "dan_drink", "hood": "dansoman", "kind": "drink", "name": "BLUE KIOSK SPOT", "x": -134.25, "z": -40.75, "f": "W", "w": 6.6, "d": 3.2, "bg": "#2e7fa8"},
  {"id": "dan_bout", "hood": "dansoman", "kind": "boutique", "name": "KOFI'S BOUTIQUE", "x": -97, "z": -42.2, "f": "N", "w": 2.8, "d": 3.4, "bg": "#d4557a"},
  {"id": "dan_store", "hood": "dansoman", "kind": "store", "name": "DANSOMAN STORES", "x": -85, "z": -42.2, "f": "N", "w": 2.8, "d": 3.4, "bg": "#4f9e4f"},
  {"id": "dan_super", "hood": "dansoman", "kind": "supermarket", "name": "MELCOM", "x": -101.75, "z": -66, "f": "N", "w": 13.4, "d": 5.6, "bg": "#ce1126"},
  {"id": "dan_game", "hood": "dansoman", "kind": "gaming", "name": "PLAYZONE GAMING", "x": -124.5, "z": -59, "f": "S", "w": 6.4, "d": 5.6, "bg": "#1b1336"},
  {"id": "nim_super", "hood": "nima", "kind": "supermarket", "name": "SHOPRITE NIMA", "x": -20.25, "z": -40.7, "f": "S", "w": 7.2, "d": 5.6, "bg": "#ce1126"},
  {"id": "nim_drink", "hood": "nima", "kind": "drink", "name": "NIMA CORNER SPOT", "x": -27.1, "z": -62.5, "f": "N", "w": 3.4, "d": 7.6, "bg": "#fcd116", "fg": "#111111"},
  {"id": "nim_bout", "hood": "nima", "kind": "boutique", "name": "HAJIA'S BOUTIQUE", "x": -41.6, "z": -67.9, "f": "N", "w": 3.8, "d": 2.8, "bg": "#d4557a"},
  {"id": "nim_store", "hood": "nima", "kind": "store", "name": "NIMA STORES", "x": -36.4, "z": -67.9, "f": "N", "w": 3.8, "d": 2.8, "bg": "#4f9e4f"},
  {"id": "nim_chop", "hood": "nima", "kind": "chopbar", "name": "MAAME ESI CHOP BAR", "x": -2.75, "z": -41.2, "f": "S", "w": 4.0, "d": 5.0, "bg": "#ce1126"},
  {"id": "nim_rest", "hood": "nima", "kind": "restaurant", "name": "SAHEL GRILL", "x": 53, "z": -42.6, "f": "S", "w": 3.6, "d": 4.0, "apron": 1.8, "bg": "#e08a3c"},
  {"id": "nim_game", "hood": "nima", "kind": "gaming", "name": "GAME OVER ARCADE", "x": -0.5, "z": -59, "f": "S", "w": 6.4, "d": 5.6, "bg": "#1b1336"},
  {"id": "ada_rest", "hood": "adabraka", "kind": "restaurant", "name": "BUKA RESTAURANT", "x": 4.6, "z": -1.1, "f": "S", "w": 5.0, "d": 3.4, "apron": 1.6, "bg": "#e08a3c"},
  {"id": "ada_bout", "hood": "adabraka", "kind": "boutique", "name": "ADABRAKA BOUTIQUE", "x": 4.9, "z": -12.25, "f": "E", "w": 3.8, "d": 3.6, "bg": "#d4557a"},
  {"id": "ada_drink", "hood": "adabraka", "kind": "drink", "name": "ADABRAKA SPOT", "x": 4.1, "z": -21.6, "f": "E", "w": 5.8, "d": 3.2, "bg": "#2e7fa8"},
  {"id": "ada_super", "hood": "adabraka", "kind": "supermarket", "name": "MAXMART", "x": 46.8, "z": -22.6, "f": "N", "w": 12.8, "door": 2.8, "d": 5.6, "bg": "#2e7fa8"},
  {"id": "ada_hotel", "hood": "adabraka", "kind": "hotel", "name": "GOLDEN PALM HOTEL", "x": 15, "z": 1.2, "f": "S", "w": 6.4, "d": 5.6, "floors": 3, "bg": "#7a1f2b", "fg": "#fcd116"},
  {"id": "tes_super", "hood": "teshie", "kind": "supermarket", "name": "TESHIE MART", "x": 103.1, "z": -12.6, "f": "W", "w": 12.0, "d": 5.0, "bg": "#4f9e4f"},
  {"id": "tes_store", "hood": "teshie", "kind": "store", "name": "TESHIE STORES", "x": 103.1, "z": -21.2, "f": "W", "w": 3.0, "d": 3.0, "bg": "#e08a3c"},
  {"id": "tes_bout", "hood": "teshie", "kind": "boutique", "name": "AFUA'S BOUTIQUE", "x": 108.6, "z": -13, "f": "S", "w": 3.8, "d": 3.0, "bg": "#d4557a"},
  {"id": "tes_rest", "hood": "teshie", "kind": "restaurant", "name": "LA BEACH GRILL", "x": 102, "z": 36.5, "f": "S", "w": 6.6, "d": 3.2, "apron": 2.0, "bg": "#2e7fa8"},
  {"id": "tes_drink", "hood": "teshie", "kind": "drink", "name": "TESHIE BEACH SPOT", "x": 108.5, "z": 43.5, "f": "N", "w": 7.0, "d": 2.8, "bg": "#fcd116", "fg": "#111111"},
  {"id": "tes_chop", "hood": "teshie", "kind": "chopbar", "name": "AUNTIE AKU CHOP BAR", "x": 149.5, "z": 36.6, "f": "S", "w": 4.2, "d": 4.4, "bg": "#ce1126"},
  {"id": "tes_hotel", "hood": "teshie", "kind": "hotel", "name": "LA PALM BEACH HOTEL", "x": 139.7, "z": 17.5, "f": "S", "w": 6.0, "d": 5.6, "floors": 3, "bg": "#0f4c5c", "fg": "#ffffff"},
  {"id": "nun_drink", "hood": "nungua", "kind": "drink", "name": "KASA BEACH SPOT", "x": 168, "z": 40, "f": "S", "w": 8.0, "d": 5.6, "bg": "#2e7fa8"},
  {"id": "nun_rest", "hood": "nungua", "kind": "restaurant", "name": "SEA BREEZE GRILL", "x": 178.5, "z": 38.2, "f": "S", "w": 7.6, "d": 3.6, "apron": 2.0, "bg": "#e08a3c"},
  {"id": "nun_game", "hood": "nungua", "kind": "gaming", "name": "PS5 ZONE NUNGUA", "x": 188.5, "z": 39.5, "f": "N", "w": 6.0, "d": 5.0, "bg": "#1b1336"},
  {"id": "nun_hotel", "hood": "nungua", "kind": "hotel", "name": "NUNGUA BEACH RESORT", "x": 200.5, "z": 39.6, "f": "N", "w": 11.6, "d": 6.2, "floors": 3, "bg": "#0f4c5c", "fg": "#fcd116"},
  {"id": "nun_super", "hood": "nungua", "kind": "supermarket", "name": "CITY MART", "x": 172.5, "z": 0, "f": "S", "w": 13.4, "d": 5.6, "bg": "#ce1126"},
  {"id": "chk_drink", "hood": "chorkor", "kind": "drink", "name": "CHORKOR JOINT", "x": -119.6, "z": -3.4, "f": "S", "w": 3.4, "d": 5.4, "bg": "#fcd116", "fg": "#111111"},
  {"id": "chk_bout", "hood": "chorkor", "kind": "boutique", "name": "ADJOA'S BOUTIQUE", "x": -109.5, "z": -17.6, "f": "E", "w": 3.0, "d": 2.8, "bg": "#d4557a"},
  {"id": "chk_store", "hood": "chorkor", "kind": "store", "name": "CHORKOR STORES", "x": -109.5, "z": -12.4, "f": "E", "w": 3.0, "d": 2.8, "bg": "#4f9e4f"},
  {"id": "chk_rest", "hood": "chorkor", "kind": "restaurant", "name": "KENKEY HOUSE", "x": -106.9, "z": 1.6, "f": "S", "w": 5.4, "d": 3.2, "apron": 1.4, "bg": "#e08a3c"},
  {"id": "chk_super", "hood": "chorkor", "kind": "supermarket", "name": "CHORKOR MINI MART", "x": -116, "z": -14.5, "f": "S", "w": 6.4, "d": 5.6, "bg": "#ce1126"},
  {"id": "chk_game", "hood": "chorkor", "kind": "gaming", "name": "KONKONSA GAME CENTRE", "x": -112, "z": -23.5, "f": "S", "w": 6.4, "d": 5.6, "bg": "#1b1336"},
  {"id": "jt_super", "hood": "jamestown", "kind": "supermarket", "name": "KWIK MART", "x": -135.6, "z": 25.6, "f": "N", "w": 7.0, "d": 5.6, "bg": "#2e7fa8"},
  {"id": "jt_chop", "hood": "jamestown", "kind": "chopbar", "name": "AUNTIE MUNI CHOP BAR", "x": -120.6, "z": 28.5, "f": "E", "w": 6.0, "d": 4.0, "bg": "#ce1126"},
  {"id": "jt_bout", "hood": "jamestown", "kind": "boutique", "name": "NAA'S BOUTIQUE", "x": -155.6, "z": 35.5, "f": "E", "w": 4.4, "d": 3.6, "bg": "#d4557a"},
  {"id": "jt_store", "hood": "jamestown", "kind": "store", "name": "JAMESTOWN STORES", "x": -146.6, "z": 39.3, "f": "N", "w": 3.4, "d": 2.6, "bg": "#4f9e4f"},
  {"id": "jt_rest", "hood": "jamestown", "kind": "restaurant", "name": "OSEKAN FISH GRILL", "x": -115, "z": 37.3, "f": "S", "w": 8.0, "d": 3.4, "apron": 2.0, "bg": "#2e7fa8"},
  {"id": "jt_drink", "hood": "jamestown", "kind": "drink", "name": "SEA VIEW SPOT", "x": -101, "z": 40.2, "f": "S", "w": 8.4, "d": 5.6, "bg": "#fcd116", "fg": "#111111"},
  {"id": "jt_game", "hood": "jamestown", "kind": "gaming", "name": "BLACK STARS GAME CENTRE", "x": -107.5, "z": 20.1, "f": "W", "w": 4.6, "d": 4.2, "bg": "#1b1336"},
]
/** Task 12 placements + the Task 13 salons / barbers / gyms / cafés / clubs /
 *  kiosks / warehouses / market halls (generated + audited by tools/t13_layout.py) */
// Task 14 (community realism pass, Chorkor West): the four generic chorkor
// kiosks are rebuilt by CommunityQuarter under the SAME names (FISH & PEPPER,
// CHORKOR KENKEY, GARI & BEANS, CREDIT POINT); the boxing gym is set back
// 1.3 m (z 11.3 → 12.6) so the Daavi St south sidewalk runs continuously.
const T14_REPLACED = new Set(COMMUNITY.replacedKiosks)
const T14_MOVED: Record<string, Partial<BizDef>> = { 'chorkor-r0c1': { z: 12.6 } }
export const BUSINESSES: BizDef[] = [...BASE_BUSINESSES, ...(T13_BIZ as BizDef[])]
  .filter((b) => !T14_REPLACED.has(b.id))
  .map((b) => (T14_MOVED[b.id] ? { ...b, ...T14_MOVED[b.id] } : b))
/** house plots converted to businesses (the district modules skip these) */
export const CONVERTED_PLOTS: [number, number][] = [...T13_CONVERTED, [-105.5, -66], [-98, -66], [-124.5, -59], [-0.5, -59], [43, -22.6], [50, -22.6], [15, 1.2], [139.5, 17.5], [169, 0], [176, 0], [-116, -14.5], [-112, -23.5]]
export const isConverted = (x: number, z: number) => CONVERTED_PLOTS.some(([px, pz]) => Math.abs(px - x) < 0.01 && Math.abs(pz - z) < 0.01)
