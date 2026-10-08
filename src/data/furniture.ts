/**
 * Furniture catalogue — ported from the salvage housing data
 * (docs/housing-economic-balance.md starter catalog + the furniture ids
 * referenced by salvage/game/Housing/FurnitureMeshes.ts and
 * PlacementEngine.ts, which imported FURNITURE_CATALOG from the
 * unpreserved game/Home/HomeSystem.ts).
 *
 * Resale is 50% of cost everywhere (standard for the catalog).
 * Gameplay-effect items are deliberately Tier 1–2 affordable
 * (anti-pay-to-win guardrail); premium items add comfort/flex only.
 *
 * Pure data — no state, no store imports, no three.js, no React.
 */

export type FurnitureRarity = 'basic' | 'standard' | 'premium';

export interface FurnitureEffects {
  /** Comfort points contributed to the home's comfort score. */
  readonly comfort: number;
  /** Extra energy restored on top of the tier's sleepEnergyRestore. */
  readonly sleepEnergyBonus?: number;
  /** Multiplier applied to passive energy decay (lower = better). */
  readonly energyDecayMult?: number;
  /** Multiplier applied to passive fun decay (lower = better). */
  readonly funDecayMult?: number;
  /** Instant fun restored when used. */
  readonly funRestore?: number;
  /** Instant hygiene restored when used. */
  readonly hygieneRestore?: number;
  /** Instant bladder relief when used. */
  readonly bladderRestore?: number;
  /** Enables cooking at home (₵5/meal, hunger +38). */
  readonly enablesCooking?: boolean;
  /** Food storage — groceries keep longer. */
  readonly foodStorage?: boolean;
  /** Immunity to dumsor (power cuts) — lights and fan keep running. */
  readonly dumsorImmunity?: boolean;
}

export interface FurnitureCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly costGHS: number;
  readonly rarity: FurnitureRarity;
  readonly effects: FurnitureEffects;
  /** XZ footprint in meters (placement collision). Omit for wall items. */
  readonly dimensions?: { readonly widthMeters: number; readonly depthMeters: number };
  readonly summary: string;
}

export const FURNITURE_CATALOG: ReadonlyArray<FurnitureCatalogItem> = [
  // ── Tier 1 — Basic (₵20–₵250) ────────────────────────────────────────────
  {
    id: 'chair_plastic',
    title: 'Plastic Monobloc Chair',
    costGHS: 20,
    rarity: 'basic',
    effects: { comfort: 1 },
    dimensions: { widthMeters: 0.5, depthMeters: 0.5 },
    summary: 'The Accra classic. Sits one chale, lasts forever.',
  },
  {
    id: 'shower_basic',
    title: 'Bucket Shower',
    costGHS: 80,
    rarity: 'basic',
    effects: { comfort: 2, hygieneRestore: 50 },
    dimensions: { widthMeters: 0.9, depthMeters: 0.9 },
    summary: 'Survival first — a proper bucket shower at home. +50 hygiene.',
  },
  {
    id: 'toilet_basic',
    title: 'Squat Toilet',
    costGHS: 120,
    rarity: 'basic',
    effects: { comfort: 2, bladderRestore: 80 },
    dimensions: { widthMeters: 0.6, depthMeters: 0.7 },
    summary: 'Survival first — no more hunting for a public loo. +80 bladder.',
  },
  {
    id: 'table_small',
    title: 'Small Wooden Table',
    costGHS: 90,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.8, depthMeters: 0.8 },
    summary: 'Meals, letters, laptop — the honest table.',
  },
  {
    id: 'cooker_gas',
    title: '2-Burner Gas Cooker',
    costGHS: 180,
    rarity: 'basic',
    effects: { comfort: 4, enablesCooking: true },
    dimensions: { widthMeters: 0.6, depthMeters: 0.6 },
    summary: 'Cook at home — ₵5 a meal, hunger +38. Cheaper than waakye.',
  },
  {
    id: 'bed_basic',
    title: 'Basic Bed Frame',
    costGHS: 250,
    rarity: 'basic',
    effects: { comfort: 8, sleepEnergyBonus: 20, energyDecayMult: 0.95 },
    dimensions: { widthMeters: 1.4, depthMeters: 2 },
    summary: 'The obvious first buy — sleep +20 energy, less fatigue.',
  },
  {
    id: 'fan_standing',
    title: 'Standing Fan',
    costGHS: 110,
    rarity: 'basic',
    effects: { comfort: 3, energyDecayMult: 0.9 },
    dimensions: { widthMeters: 0.45, depthMeters: 0.45 },
    summary: 'Passive cooling — energy decays 10% slower.',
  },
  {
    id: 'wooden_stool',
    title: 'Carved Wooden Stool',
    costGHS: 40,
    rarity: 'basic',
    effects: { comfort: 2 },
    dimensions: { widthMeters: 0.4, depthMeters: 0.4 },
    summary: 'Hand-carved Ashanti stool — seat and heritage in one.',
  },
  {
    id: 'flower_pots',
    title: 'Terracotta Planters',
    costGHS: 35,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.6, depthMeters: 0.6 },
    summary: 'A little green outside the door.',
  },
  {
    id: 'rug',
    title: 'Woven Floor Rug',
    costGHS: 120,
    rarity: 'basic',
    effects: { comfort: 5 },
    dimensions: { widthMeters: 2, depthMeters: 1.4 },
    summary: 'Warm underfoot, easy on the eyes.',
  },

  // ── Tier 2 — Standard (₵150–₵650) ────────────────────────────────────────
  {
    id: 'wardrobe_basic',
    title: 'Wooden Wardrobe',
    costGHS: 220,
    rarity: 'standard',
    effects: { comfort: 5 },
    dimensions: { widthMeters: 1.2, depthMeters: 0.6 },
    summary: 'Finally, somewhere to hang the Sunday shirt.',
  },
  {
    id: 'table_dining',
    title: 'Dining Table (4-seater)',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 6, funRestore: 5 },
    dimensions: { widthMeters: 1.4, depthMeters: 0.9 },
    summary: 'Host three friends for jollof — social hosting unlocked.',
  },
  {
    id: 'sofa_basic',
    title: 'Basic 2-Seater Sofa',
    costGHS: 320,
    rarity: 'standard',
    effects: { comfort: 9, funRestore: 8, energyDecayMult: 0.92 },
    dimensions: { widthMeters: 1.8, depthMeters: 0.9 },
    summary: 'Relax properly — fun +8, fatigue 8% slower.',
  },
  {
    id: 'tv_basic',
    title: 'Flatscreen TV',
    costGHS: 480,
    rarity: 'standard',
    effects: { comfort: 8, funDecayMult: 0.85, funRestore: 15 },
    dimensions: { widthMeters: 1.2, depthMeters: 0.4 },
    summary: 'Passion-of-the-Christ reruns and Premier League — mood holds.',
  },
  {
    id: 'fridge_basic',
    title: 'Single-Door Fridge',
    costGHS: 650,
    rarity: 'standard',
    effects: { comfort: 10, foodStorage: true },
    dimensions: { widthMeters: 0.7, depthMeters: 0.7 },
    summary: 'Keep groceries and leftover waakye fresh.',
  },
  {
    id: 'kente_cloth',
    title: 'Kente Wall Tapestry',
    costGHS: 150,
    rarity: 'standard',
    effects: { comfort: 6 },
    summary: 'Woven pride on the wall — no floor space needed.',
  },
  {
    id: 'sound_box',
    title: 'Highlife Hi-Fi System',
    costGHS: 600,
    rarity: 'standard',
    effects: { comfort: 9 },
    dimensions: { widthMeters: 0.8, depthMeters: 0.4 },
    summary: 'Amakye Dede on vinyl volume. The compound will complain.',
  },

  // ── Legacy duplicates kept from the v1 catalogue ─────────────────────────
  {
    id: 'chair_plastic_legacy',
    title: 'Plastic Chair (legacy)',
    costGHS: 25,
    rarity: 'basic',
    effects: { comfort: 1 },
    dimensions: { widthMeters: 0.5, depthMeters: 0.5 },
    summary: 'Same chair, slightly worse price. Nostalgia tax.',
  },
  {
    id: 'table_veranda_legacy',
    title: 'Veranda Table (legacy)',
    costGHS: 80,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.9, depthMeters: 0.6 },
    summary: 'Front-porch watching table.',
  },
  {
    id: 'bed_queen_legacy',
    title: 'Orthopedic Queen Bed (legacy)',
    costGHS: 400,
    rarity: 'standard',
    effects: { comfort: 12, sleepEnergyBonus: 20 },
    dimensions: { widthMeters: 1.6, depthMeters: 2 },
    summary: 'Same sleep +20 as the basic bed — more comfort, more flex.',
  },
  {
    id: 'fridge_double_legacy',
    title: 'Double-Door Fridge (legacy)',
    costGHS: 800,
    rarity: 'premium',
    effects: { comfort: 12, foodStorage: true },
    dimensions: { widthMeters: 0.9, depthMeters: 0.8 },
    summary: 'Premium cold storage — comfort over the single door.',
  },

  // ── Tier 3 — Premium (₵800+) ─────────────────────────────────────────────
  {
    id: 'generator',
    title: 'Backup Generator',
    costGHS: 1200,
    rarity: 'premium',
    effects: { comfort: 15, dumsorImmunity: true },
    dimensions: { widthMeters: 0.8, depthMeters: 0.6 },
    summary: 'Dumsor immunity. The whole compound hears you have power.',
  },
];

/** Standard resale: 50% of purchase price (money sink — see balance doc). */
export function furnitureResaleValue(item: FurnitureCatalogItem): number {
  return Math.round(item.costGHS * 50) / 100;
}

export function findFurnitureById(id: string): FurnitureCatalogItem | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}
