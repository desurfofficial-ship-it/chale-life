/**
 * palette.ts — Chalé Life starter block colour system.
 *
 * Warm coastal Accra: red laterite earth, faded cream / sky-blue / mint
 * painted blockwork, corrugated iron roofs, one MTN-style yellow kiosk.
 * Colours are deliberately desaturated a little so midday sun doesn't blow
 * them out on cheap phone panels (see docs/ART_BIBLE_MIDDLE_GROUND.md §5).
 *
 * Owned by Agent 3 (World & Art). Pure data — no three.js import.
 */

export const PALETTE = {
  // Ground & road
  dirt: '#c4a984',
  dirtYard: '#b89a6f',
  asphalt: '#3f4348',
  asphaltEdge: '#33373b',
  roadLine: '#d8c46a',
  laterite: '#a8502c',
  lateriteDark: '#8c431f',
  concrete: '#c9c2b1',
  concreteDark: '#a9a292',
  gutterWall: '#b8b1a0',
  gutterDark: '#6f6a5e',

  // Building walls
  cream: '#efe3c2',
  creamFaded: '#ddcfab',
  skyBlue: '#8fc7dd',
  mint: '#bfe0cc',
  chopBar: '#d9a86c',

  // Roofs & trim
  ironRoof: '#a7abb1',
  ironRoofDark: '#8d9197',
  parapet: '#d8ccb0',
  trim: '#7c5a38',

  // Kiosk / signage
  kioskYellow: '#f2c11f',
  kioskYellowDark: '#d7a512',
  signBg: '#f9f3e3',

  // Wood, metal, plastic
  wood: '#7a5a3a',
  woodDark: '#5e4429',
  iron: '#6e7378',
  gate: '#5c6670',
  tank: '#24282b',
  pole: '#b9b3a5',
  wire: '#26262a',

  // Vegetation
  canopy: '#4d8a4f',
  canopyDark: '#3c7340',
  canopyLight: '#5f9c58',
  palm: '#579b4c',
  trunk: '#6d4f33',

  // Plastics
  plasticRed: '#c94f3f',
  plasticBlue: '#3f6fc9',
  plasticGreen: '#3fa05c',
  umbrellaRed: '#c0453a',
  umbrellaGreen: '#2f8f57',
} as const;

export type PaletteKey = keyof typeof PALETTE;
