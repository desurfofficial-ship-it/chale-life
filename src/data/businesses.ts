/**
 * Player-owned tycoon businesses (G-009 / T-001).
 *
 * Distinct from src/lib/businesses.ts (World static neighbourhood placements).
 * Pure data — no store, no three.js, no React.
 *
 * Currency is GH₵ as pure numbers. Furniture kit ids reference
 * src/data/furniture.ts (business items added in the same ticket).
 */

export type BusinessCategory = 'services' | 'food_drink' | 'entertainment';

export type BudgetTier = 'min' | 'suggested' | 'max';

export interface StaffByTier {
  readonly min: number;
  readonly suggested: number;
  readonly max: number;
}

export interface BusinessTypeDef {
  readonly id: string;
  readonly name: string;
  readonly category: BusinessCategory;
  /** Startup cost range GH₵ */
  readonly startupMin: number;
  readonly startupSuggested: number;
  readonly startupMax: number;
  /** Daily operating cost (staff wages + utilities) at suggested tier */
  readonly costPerDay: number;
  readonly difficulty: 1 | 2 | 3;
  readonly potential: 1 | 2 | 3;
  /** Base customers per game-hour at suggested capacity, fair weather, midday */
  readonly baseCustomersPerHour: number;
  /** Average ticket GH₵ per customer */
  readonly averageTicket: number;
  readonly staffByTier: StaffByTier;
  /** Furniture kit ids (from furniture catalogue / business props) */
  readonly furnitureKit: readonly string[];
  /** Indoor = helped by rain; street = hurt by rain */
  readonly indoor: boolean;
  /** Night (20–5) demand multiplier bias */
  readonly nightBoost: number;
}

export const BUSINESS_TYPES: readonly BusinessTypeDef[] = [
  {
    id: 'chop_bar',
    name: 'Chop Bar',
    category: 'food_drink',
    startupMin: 800,
    startupSuggested: 1500,
    startupMax: 2800,
    costPerDay: 45,
    difficulty: 1,
    potential: 2,
    baseCustomersPerHour: 8,
    averageTicket: 12,
    staffByTier: { min: 1, suggested: 2, max: 4 },
    furnitureKit: ['biz_counter', 'biz_bench', 'biz_stool', 'biz_cooker', 'biz_shelf'],
    indoor: true,
    nightBoost: 1.35,
  },
  {
    id: 'waakye_stand',
    name: 'Waakye Stand',
    category: 'food_drink',
    startupMin: 400,
    startupSuggested: 900,
    startupMax: 1600,
    costPerDay: 28,
    difficulty: 1,
    potential: 2,
    baseCustomersPerHour: 10,
    averageTicket: 8,
    staffByTier: { min: 1, suggested: 2, max: 3 },
    furnitureKit: ['biz_counter', 'biz_stool', 'biz_cooker', 'biz_umbrella'],
    indoor: false,
    nightBoost: 0.7,
  },
  {
    id: 'phone_shop',
    name: 'Phone & Accessories',
    category: 'services',
    startupMin: 2000,
    startupSuggested: 4500,
    startupMax: 9000,
    costPerDay: 60,
    difficulty: 2,
    potential: 3,
    baseCustomersPerHour: 4,
    averageTicket: 35,
    staffByTier: { min: 1, suggested: 2, max: 3 },
    furnitureKit: ['biz_counter', 'biz_shelf', 'biz_display', 'biz_chair'],
    indoor: true,
    nightBoost: 0.85,
  },
  {
    id: 'barber',
    name: 'Barber Shop',
    category: 'services',
    startupMin: 1200,
    startupSuggested: 2500,
    startupMax: 4500,
    costPerDay: 40,
    difficulty: 1,
    potential: 2,
    baseCustomersPerHour: 3,
    averageTicket: 25,
    staffByTier: { min: 1, suggested: 2, max: 4 },
    furnitureKit: ['biz_barber_chair', 'biz_mirror', 'biz_counter', 'biz_stool'],
    indoor: true,
    nightBoost: 1.1,
  },
  {
    id: 'salon',
    name: 'Hair Salon',
    category: 'services',
    startupMin: 1800,
    startupSuggested: 3500,
    startupMax: 6500,
    costPerDay: 55,
    difficulty: 2,
    potential: 3,
    baseCustomersPerHour: 2.5,
    averageTicket: 40,
    staffByTier: { min: 1, suggested: 2, max: 4 },
    furnitureKit: ['biz_salon_chair', 'biz_mirror', 'biz_counter', 'biz_shelf'],
    indoor: true,
    nightBoost: 1.05,
  },
  {
    id: 'provisions',
    name: 'Provisions Store',
    category: 'services',
    startupMin: 1500,
    startupSuggested: 3200,
    startupMax: 6000,
    costPerDay: 50,
    difficulty: 1,
    potential: 2,
    baseCustomersPerHour: 6,
    averageTicket: 15,
    staffByTier: { min: 1, suggested: 2, max: 3 },
    furnitureKit: ['biz_counter', 'biz_shelf', 'biz_fridge', 'biz_display'],
    indoor: true,
    nightBoost: 0.9,
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    category: 'services',
    startupMin: 3000,
    startupSuggested: 6000,
    startupMax: 12000,
    costPerDay: 80,
    difficulty: 2,
    potential: 3,
    baseCustomersPerHour: 5,
    averageTicket: 22,
    staffByTier: { min: 1, suggested: 2, max: 3 },
    furnitureKit: ['biz_counter', 'biz_shelf', 'biz_fridge', 'biz_display'],
    indoor: true,
    nightBoost: 0.95,
  },
  {
    id: 'fuel_station',
    name: 'Fuel Station',
    category: 'services',
    startupMin: 15000,
    startupSuggested: 28000,
    startupMax: 50000,
    costPerDay: 2500,
    difficulty: 3,
    potential: 3,
    baseCustomersPerHour: 2,
    averageTicket: 40,
    staffByTier: { min: 2, suggested: 3, max: 5 },
    furnitureKit: ['biz_fuel_pump', 'biz_counter', 'biz_shelf', 'biz_canopy'],
    indoor: false,
    nightBoost: 1.4,
  },
] as const;

export function findBusinessType(id: string): BusinessTypeDef | undefined {
  return BUSINESS_TYPES.find((b) => b.id === id);
}

export const BUSINESS_CATEGORIES: readonly { id: BusinessCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'services', label: 'Services' },
  { id: 'food_drink', label: 'Food & drink' },
  { id: 'entertainment', label: 'Entertainment' },
];
