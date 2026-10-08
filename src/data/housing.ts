/**
 * Housing tiers — ported from salvage (docs/housing-economic-balance.md
 * progression table + docs/housing-architecture.md). The salvage
 * game/Home/HomeSystem.ts module was not preserved in salvage/, so the
 * tier table below is the canonical port of its HOUSING_TIERS data.
 *
 * Progression (locked order, cheapest → priciest):
 *   14 m² single room (start) → 25 m² ₵650 → 38 m² ₵1,600 →
 *   55 m² ₵3,600 → 80 m² ₵7,800 → 140 m² ₵16,000.
 *
 * Pure data — no state, no store imports, no three.js, no React.
 */

export interface HousingTier {
  readonly id: string;
  readonly title: string;
  readonly shortLabel: string;
  /** Floor area in m². */
  readonly areaM2: number;
  /** Interior footprint used by placement validation (room-local bounds). */
  readonly roomWidthM: number;
  readonly roomDepthM: number;
  /** Upgrade cost in cedis (0 = the tier the player starts in). */
  readonly costGHS: number;
  /** Comfort % required before this tier can be bought. */
  readonly minComfortPct: number;
  readonly maxFurnitureSlots: number;
  /** Base energy restored by sleeping in this home. */
  readonly sleepEnergyRestore: number;
  /** Passive energy-decay reduction while living here (0–100). */
  readonly fatigueReductionPct: number;
}

export const HOUSING_TIERS: ReadonlyArray<HousingTier> = [
  {
    id: 'single_room',
    title: 'Single Room',
    shortLabel: 'Single Room',
    areaM2: 14,
    roomWidthM: 3.5,
    roomDepthM: 4,
    costGHS: 0,
    minComfortPct: 0,
    maxFurnitureSlots: 4,
    sleepEnergyRestore: 55,
    fatigueReductionPct: 0,
  },
  {
    id: 'chamber_kitchen_bath',
    title: 'Chamber + Kitchen/Bath',
    shortLabel: 'Chamber & Bath',
    areaM2: 25,
    roomWidthM: 5,
    roomDepthM: 5,
    costGHS: 650,
    minComfortPct: 48,
    maxFurnitureSlots: 6,
    sleepEnergyRestore: 72,
    fatigueReductionPct: 12,
  },
  {
    id: 'self_contained',
    title: 'Self-Contained',
    shortLabel: 'Self-Contained',
    areaM2: 38,
    roomWidthM: 7.6,
    roomDepthM: 5,
    costGHS: 1600,
    minComfortPct: 65,
    maxFurnitureSlots: 8,
    sleepEnergyRestore: 84,
    fatigueReductionPct: 18,
  },
  {
    id: 'one_bedroom_apartment',
    title: '1-Bedroom Apartment',
    shortLabel: '1-Bedroom',
    areaM2: 55,
    roomWidthM: 10,
    roomDepthM: 5.5,
    costGHS: 3600,
    minComfortPct: 80,
    maxFurnitureSlots: 10,
    sleepEnergyRestore: 94,
    fatigueReductionPct: 24,
  },
  {
    id: 'premium_apartment',
    title: 'Premium Apartment',
    shortLabel: 'Premium Apt',
    areaM2: 80,
    roomWidthM: 10,
    roomDepthM: 8,
    costGHS: 7800,
    minComfortPct: 92,
    maxFurnitureSlots: 12,
    sleepEnergyRestore: 100,
    fatigueReductionPct: 30,
  },
  {
    id: 'luxury_house',
    title: 'Luxury House',
    shortLabel: 'Luxury House',
    areaM2: 140,
    roomWidthM: 14,
    roomDepthM: 10,
    costGHS: 16000,
    minComfortPct: 100,
    maxFurnitureSlots: 12,
    sleepEnergyRestore: 100,
    fatigueReductionPct: 35,
  },
];

/** The 14 m² room every new guest starts in (store default home.tierId). */
export const STARTER_HOUSING_TIER_ID = 'single_room';

export function findHousingTierById(tierId: string): HousingTier | undefined {
  return HOUSING_TIERS.find((t) => t.id === tierId);
}

/** Index in the locked upgrade order (0 = starter room). */
export function housingTierIndex(tierId: string): number {
  return HOUSING_TIERS.findIndex((t) => t.id === tierId);
}
