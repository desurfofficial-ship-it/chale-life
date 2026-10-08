/**
 * Street-food menu — prices and need effects for the Accra food loop.
 *
 * Sources: salvage/ui/HUD.tsx prompt ('Waakye · ₵12'), the housing balance
 * doc (waakye ₵12/meal, cooker meal ₵5), and the salvage NeedsSystem
 * constants (meal +45 hunger, water +6 hunger / +10 energy).
 *
 * Pure data — no state, no store imports, no three.js, no React.
 */

export interface FoodItem {
  readonly id: string;
  readonly title: string;
  readonly priceGHS: number;
  /** Hunger (satiation) restored when eaten, clamped to 100 by the rules. */
  readonly hungerRestore: number;
  /** Energy restored when eaten, clamped to 100 by the rules. */
  readonly energyRestore: number;
  /** Where the player buys it. */
  readonly vendorInteractableId: string;
  readonly summary: string;
}

/** The canonical meal: matches rules/needs.ts MEAL_HUNGER_RESTORE = 45. */
export const FOOD_WAAKYE_ID = 'FOOD_WAAKYE';

/** The canonical water: matches rules/needs.ts WATER_HUNGER/WATER_ENERGY. */
export const FOOD_SACHET_WATER_ID = 'FOOD_SACHET_WATER';

export const FOODS: ReadonlyArray<FoodItem> = [
  {
    id: 'FOOD_WAAKYE',
    title: 'Waakye',
    priceGHS: 12,
    hungerRestore: 45,
    energyRestore: 6,
    vendorInteractableId: 'food_vendor',
    summary: 'Daavi’s rice and beans — the proper meal. +45 hunger.',
  },
  {
    id: 'FOOD_KELEWELE',
    title: 'Kelewele',
    priceGHS: 5,
    hungerRestore: 18,
    energyRestore: 5,
    vendorInteractableId: 'food_vendor',
    summary: 'Spiced fried plantain cubes — a sweet street snack. +18 hunger.',
  },
  {
    id: 'FOOD_SACHET_WATER',
    title: 'Sachet Water',
    priceGHS: 1,
    hungerRestore: 6,
    energyRestore: 10,
    vendorInteractableId: 'provision_shop',
    summary: 'Ice-cold pure water — small bite, real lift. +10 energy.',
  },
];

export function findFoodById(foodId: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === foodId);
}
