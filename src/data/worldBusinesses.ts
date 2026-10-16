/**
 * B-001 — World-run shops & restaurants (pure data).
 *
 * Same ownership model as O-001 offices: every business is 'world' |
 * 'employer' | 'player'. These start as world-run NPC businesses. The player
 * can buy food/items, take a shift job, and later (tycoon) buy or rent one.
 *
 * Sites re-use footprints where possible (`site.replaces`) so colliders stay
 * valid. At least three sites sit within 60 m of Daavi spawn (−136, −2).
 *
 * No store, no three.js, no React.
 */

export type Ownership = 'world' | 'employer' | 'player';

export type BusinessKind = 'restaurant' | 'shop';

export type RestaurantSub =
  | 'chop_bar'
  | 'waakye'
  | 'fast_food'
  | 'sit_down'
  | 'drinking_spot';

export type ShopSub =
  | 'provision'
  | 'supermarket'
  | 'boutique'
  | 'electronics'
  | 'pharmacy';

export type BusinessSub = RestaurantSub | ShopSub;

export type StaffRole = 'cook' | 'waiter' | 'cashier' | 'stocker' | 'pharmacist' | 'bartender';

export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly priceGHS: number;
  /** Hunger restored (restaurants / edible stock). */
  readonly hungerRestore?: number;
  /** Thirst / small energy bump for drinks. */
  readonly thirstRestore?: number;
  readonly category: 'meal' | 'drink' | 'snack' | 'goods' | 'meds' | 'tech' | 'clothes';
}

export interface BusinessJobDef {
  readonly id: string;
  readonly businessId: string;
  readonly role: StaffRole;
  readonly title: string;
  readonly payGHS: number;
  /** Game-minutes of a shift. */
  readonly shiftMinutes: number;
}

export interface BusinessSite {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly yaw: number;
  readonly replaces: string;
  readonly district: string;
}

export interface BusinessFacade {
  readonly wall: string;
  readonly roof: string;
  readonly sign: string;
  readonly signBg: string;
  readonly awning: string;
}

export interface BusinessDef {
  readonly id: string;
  readonly name: string;
  readonly kind: BusinessKind;
  readonly sub: BusinessSub;
  readonly ownership: Ownership;
  readonly ownerName: string;
  readonly site: BusinessSite;
  readonly facade: BusinessFacade;
  readonly openHour: number;
  readonly closeHour: number;
  readonly staffRoles: readonly { role: StaffRole; count: number; names: readonly string[] }[];
  readonly menu: readonly MenuItem[];
  /** Seats (restaurants) or shelf slots (shops). */
  readonly capacity: number;
  /** Customers per open hour at base (rules scale by rush). */
  readonly customersPerHour: number;
  readonly jobs: readonly BusinessJobDef[];
}

/** Daavi Compound Yard spawn ≈ (−136, −2). */
export const SPAWN_XZ = { x: -136, z: -2 } as const;

export const BUSINESSES: readonly BusinessDef[] = [
  // ── within ~60 m of spawn ──────────────────────────────────────────
  {
    id: 'BIZ_MAMA_AFIA_CHOP',
    name: 'Mama Afia Chop Bar',
    kind: 'restaurant',
    sub: 'chop_bar',
    ownership: 'world',
    ownerName: 'Afia Mensah',
    site: {
      x: -118,
      z: -8,
      w: 8,
      d: 6,
      yaw: 0.1,
      replaces: 'Neighborhoods shed near Daavi yard',
      district: 'daavi',
    },
    facade: {
      wall: '#f5e6c8',
      roof: '#8b4513',
      sign: 'MAMA AFIA CHOP BAR',
      signBg: '#c8102e',
      awning: '#0d7a45',
    },
    openHour: 6,
    closeHour: 21,
    staffRoles: [
      { role: 'cook', count: 2, names: ['Kwame', 'Abena'] },
      { role: 'waiter', count: 1, names: ['Yaw'] },
    ],
    menu: [
      { id: 'jollof', name: 'Jollof + chicken', priceGHS: 25, hungerRestore: 45, category: 'meal' },
      { id: 'banku', name: 'Banku + okro', priceGHS: 18, hungerRestore: 40, category: 'meal' },
      { id: 'fufu', name: 'Fufu + light soup', priceGHS: 22, hungerRestore: 48, category: 'meal' },
      { id: 'sobolo', name: 'Sobolo', priceGHS: 5, thirstRestore: 8, category: 'drink' },
    ],
    capacity: 12,
    customersPerHour: 8,
    jobs: [
      {
        id: 'BJOB_CHOP_COOK',
        businessId: 'BIZ_MAMA_AFIA_CHOP',
        role: 'cook',
        title: 'Chop-bar cook',
        payGHS: 35,
        shiftMinutes: 180,
      },
      {
        id: 'BJOB_CHOP_WAITER',
        businessId: 'BIZ_MAMA_AFIA_CHOP',
        role: 'waiter',
        title: 'Waiter',
        payGHS: 22,
        shiftMinutes: 180,
      },
    ],
  },
  {
    id: 'BIZ_KOFI_PROVISION',
    name: "Kofi's Provision",
    kind: 'shop',
    sub: 'provision',
    ownership: 'world',
    ownerName: 'Kofi Asante',
    site: {
      x: -145,
      z: 8,
      w: 5,
      d: 4,
      yaw: -0.2,
      replaces: 'Neighborhoods kiosk west of Daavi',
      district: 'daavi',
    },
    facade: {
      wall: '#fff8e7',
      roof: '#4a5568',
      sign: "KOFI'S PROVISION",
      signBg: '#1e3a5f',
      awning: '#e4b15a',
    },
    openHour: 6.5,
    closeHour: 20,
    staffRoles: [{ role: 'cashier', count: 1, names: ['Ama'] }],
    menu: [
      { id: 'water_sachet', name: 'Pure water (sachet)', priceGHS: 1, thirstRestore: 6, category: 'drink' },
      { id: 'bread', name: 'Tea bread', priceGHS: 4, hungerRestore: 12, category: 'snack' },
      { id: 'eggs', name: 'Eggs (3)', priceGHS: 8, hungerRestore: 15, category: 'goods' },
      { id: 'milo', name: 'Milo sachet', priceGHS: 3, category: 'goods' },
    ],
    capacity: 6,
    customersPerHour: 6,
    jobs: [
      {
        id: 'BJOB_PROV_CASHIER',
        businessId: 'BIZ_KOFI_PROVISION',
        role: 'cashier',
        title: 'Kiosk cashier',
        payGHS: 18,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_LIFECARE_PHARM',
    name: 'LifeCare Pharmacy',
    kind: 'shop',
    sub: 'pharmacy',
    ownership: 'world',
    ownerName: 'Dr. Serwaa Owusu',
    site: {
      x: -125,
      z: -28,
      w: 7,
      d: 5,
      yaw: 0,
      replaces: 'Neighborhoods shop south of Daavi',
      district: 'daavi',
    },
    facade: {
      wall: '#e8f5e9',
      roof: '#2e7d32',
      sign: 'LIFECARE PHARMACY',
      signBg: '#1565c0',
      awning: '#ffffff',
    },
    openHour: 8,
    closeHour: 20,
    staffRoles: [
      { role: 'pharmacist', count: 1, names: ['Serwaa'] },
      { role: 'cashier', count: 1, names: ['Efua'] },
    ],
    menu: [
      { id: 'paracetamol', name: 'Paracetamol', priceGHS: 8, category: 'meds' },
      { id: 'ors', name: 'ORS sachets', priceGHS: 5, thirstRestore: 4, category: 'meds' },
      { id: 'vitamin_c', name: 'Vitamin C', priceGHS: 12, category: 'meds' },
      { id: 'plaster', name: 'Plaster pack', priceGHS: 4, category: 'meds' },
    ],
    capacity: 8,
    customersPerHour: 5,
    jobs: [
      {
        id: 'BJOB_PHARM_CASHIER',
        businessId: 'BIZ_LIFECARE_PHARM',
        role: 'cashier',
        title: 'Pharmacy cashier',
        payGHS: 28,
        shiftMinutes: 240,
      },
    ],
  },
  // ── rest of city ───────────────────────────────────────────────────
  {
    id: 'BIZ_AUNTIE_WAAKYE',
    name: 'Auntie Ama Waakye',
    kind: 'restaurant',
    sub: 'waakye',
    ownership: 'world',
    ownerName: 'Ama Boateng',
    site: {
      x: -95,
      z: 22,
      w: 7,
      d: 5,
      yaw: 0.4,
      replaces: 'Neighborhoods food stall',
      district: 'daavi',
    },
    facade: {
      wall: '#fff3e0',
      roof: '#bf360c',
      sign: 'AUNTIE AMA WAAKYE',
      signBg: '#e65100',
      awning: '#ffcc80',
    },
    openHour: 6,
    closeHour: 16,
    staffRoles: [
      { role: 'cook', count: 1, names: ['Ama'] },
      { role: 'waiter', count: 1, names: ['Kofi'] },
    ],
    menu: [
      { id: 'waakye_full', name: 'Waakye full', priceGHS: 20, hungerRestore: 50, category: 'meal' },
      { id: 'kenkey_fish', name: 'Kenkey + fish', priceGHS: 18, hungerRestore: 42, category: 'meal' },
      { id: 'gari', name: 'Gari soakings', priceGHS: 6, hungerRestore: 15, category: 'snack' },
    ],
    capacity: 10,
    customersPerHour: 10,
    jobs: [
      {
        id: 'BJOB_WAAKYE_COOK',
        businessId: 'BIZ_AUNTIE_WAAKYE',
        role: 'cook',
        title: 'Waakye cook',
        payGHS: 30,
        shiftMinutes: 180,
      },
    ],
  },
  {
    id: 'BIZ_FAST_BITE',
    name: 'Fast Bite',
    kind: 'restaurant',
    sub: 'fast_food',
    ownership: 'world',
    ownerName: 'Nana Yaw',
    site: { x: -70, z: -15, w: 9, d: 7, yaw: 0, replaces: 'Airport road kiosk block', district: 'airport-city' },
    facade: {
      wall: '#e3f2fd',
      roof: '#0d47a1',
      sign: 'FAST BITE',
      signBg: '#f57c00',
      awning: '#ff9800',
    },
    openHour: 9,
    closeHour: 22,
    staffRoles: [
      { role: 'cook', count: 2, names: ['Yaw', 'Akosua'] },
      { role: 'cashier', count: 1, names: ['Isaac'] },
    ],
    menu: [
      { id: 'burger', name: 'Beef burger', priceGHS: 28, hungerRestore: 38, category: 'meal' },
      { id: 'chips', name: 'Chips', priceGHS: 12, hungerRestore: 18, category: 'snack' },
      { id: 'soda', name: 'Soft drink', priceGHS: 6, thirstRestore: 10, category: 'drink' },
    ],
    capacity: 16,
    customersPerHour: 12,
    jobs: [
      {
        id: 'BJOB_FAST_CASHIER',
        businessId: 'BIZ_FAST_BITE',
        role: 'cashier',
        title: 'Fast-food cashier',
        payGHS: 24,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_ROYAL_TABLE',
    name: 'Royal Table',
    kind: 'restaurant',
    sub: 'sit_down',
    ownership: 'world',
    ownerName: 'Mrs. Adjei',
    site: { x: 28, z: -48, w: 12, d: 9, yaw: 0, replaces: 'CBD restaurant pad', district: 'cbd' },
    facade: {
      wall: '#fce4ec',
      roof: '#4a148c',
      sign: 'ROYAL TABLE',
      signBg: '#6a1b9a',
      awning: '#ce93d8',
    },
    openHour: 11,
    closeHour: 23,
    staffRoles: [
      { role: 'cook', count: 3, names: ['Chef Mensah', 'Ama', 'Kojo'] },
      { role: 'waiter', count: 3, names: ['Efua', 'Kwesi', 'Aba'] },
    ],
    menu: [
      { id: 'grilled_tilapia', name: 'Grilled tilapia', priceGHS: 55, hungerRestore: 52, category: 'meal' },
      { id: 'banku_set', name: 'Banku set menu', priceGHS: 40, hungerRestore: 48, category: 'meal' },
      { id: 'palm_wine', name: 'Palm wine', priceGHS: 15, thirstRestore: 6, category: 'drink' },
    ],
    capacity: 24,
    customersPerHour: 9,
    jobs: [
      {
        id: 'BJOB_ROYAL_WAITER',
        businessId: 'BIZ_ROYAL_TABLE',
        role: 'waiter',
        title: 'Restaurant waiter',
        payGHS: 40,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_SPOT_21',
    name: 'Spot 21',
    kind: 'restaurant',
    sub: 'drinking_spot',
    ownership: 'world',
    ownerName: 'Uncle Joe',
    site: { x: -55, z: 35, w: 8, d: 6, yaw: 0.2, replaces: 'Osu drinking pad', district: 'osu' },
    facade: {
      wall: '#efebe9',
      roof: '#3e2723',
      sign: 'SPOT 21',
      signBg: '#1b5e20',
      awning: '#81c784',
    },
    openHour: 14,
    closeHour: 2,
    staffRoles: [
      { role: 'bartender', count: 2, names: ['Joe', 'Ama'] },
      { role: 'waiter', count: 1, names: ['Kofi'] },
    ],
    menu: [
      { id: 'club_beer', name: 'Club beer', priceGHS: 12, thirstRestore: 5, category: 'drink' },
      { id: 'star_beer', name: 'Star beer', priceGHS: 11, thirstRestore: 5, category: 'drink' },
      { id: 'kelewele', name: 'Kelewele', priceGHS: 10, hungerRestore: 14, category: 'snack' },
      { id: 'grilled_sausage', name: 'Grilled sausage', priceGHS: 8, hungerRestore: 12, category: 'snack' },
    ],
    capacity: 18,
    customersPerHour: 11,
    jobs: [
      {
        id: 'BJOB_SPOT_BAR',
        businessId: 'BIZ_SPOT_21',
        role: 'bartender',
        title: 'Bartender',
        payGHS: 32,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_FRESHMART',
    name: 'FreshMart',
    kind: 'shop',
    sub: 'supermarket',
    ownership: 'world',
    ownerName: 'FreshMart Ghana Ltd',
    site: { x: -40, z: -55, w: 14, d: 10, yaw: 0, replaces: 'Airport retail pad', district: 'airport-city' },
    facade: {
      wall: '#e8f5e9',
      roof: '#1b5e20',
      sign: 'FRESHMART',
      signBg: '#2e7d32',
      awning: '#a5d6a7',
    },
    openHour: 7,
    closeHour: 21,
    staffRoles: [
      { role: 'cashier', count: 3, names: ['Ama', 'Kwame', 'Efua'] },
      { role: 'stocker', count: 2, names: ['Yaw', 'Akua'] },
    ],
    menu: [
      { id: 'rice_5kg', name: 'Rice 5 kg', priceGHS: 55, category: 'goods' },
      { id: 'oil_1l', name: 'Cooking oil 1 L', priceGHS: 28, category: 'goods' },
      { id: 'milk', name: 'Peak milk', priceGHS: 18, category: 'goods' },
      { id: 'water_pack', name: 'Water pack', priceGHS: 12, thirstRestore: 15, category: 'drink' },
    ],
    capacity: 30,
    customersPerHour: 14,
    jobs: [
      {
        id: 'BJOB_MART_STOCKER',
        businessId: 'BIZ_FRESHMART',
        role: 'stocker',
        title: 'Shelf stocker',
        payGHS: 26,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_OHEMAA_BOUTIQUE',
    name: 'Ohemaa Boutique',
    kind: 'shop',
    sub: 'boutique',
    ownership: 'world',
    ownerName: 'Ohemaa Darko',
    site: { x: 55, z: 12, w: 8, d: 6, yaw: 0.05, replaces: 'OxfordOsu shopfront', district: 'osu' },
    facade: {
      wall: '#f3e5f5',
      roof: '#4a148c',
      sign: 'OHEMAA BOUTIQUE',
      signBg: '#ad1457',
      awning: '#f48fb1',
    },
    openHour: 9,
    closeHour: 19,
    staffRoles: [{ role: 'cashier', count: 2, names: ['Ohemaa', 'Aba'] }],
    menu: [
      { id: 'kente_scarf', name: 'Kente scarf', priceGHS: 80, category: 'clothes' },
      { id: 'slippers', name: 'Slippers', priceGHS: 35, category: 'clothes' },
      { id: 'handbag', name: 'Handbag', priceGHS: 120, category: 'clothes' },
    ],
    capacity: 10,
    customersPerHour: 4,
    jobs: [
      {
        id: 'BJOB_BOUTIQUE_CASH',
        businessId: 'BIZ_OHEMAA_BOUTIQUE',
        role: 'cashier',
        title: 'Boutique cashier',
        payGHS: 30,
        shiftMinutes: 240,
      },
    ],
  },
  {
    id: 'BIZ_MOBILE_WORLD',
    name: 'Mobile World',
    kind: 'shop',
    sub: 'electronics',
    ownership: 'world',
    ownerName: 'Tech Brothers Ltd',
    site: { x: -88, z: -42, w: 9, d: 7, yaw: 0, replaces: 'Airport electronics pad', district: 'airport-city' },
    facade: {
      wall: '#e3f2fd',
      roof: '#0d47a1',
      sign: 'MOBILE WORLD',
      signBg: '#1565c0',
      awning: '#64b5f6',
    },
    openHour: 9,
    closeHour: 19,
    staffRoles: [
      { role: 'cashier', count: 2, names: ['Kwesi', 'Ama'] },
      { role: 'stocker', count: 1, names: ['Fiifi'] },
    ],
    menu: [
      { id: 'phone_case', name: 'Phone case', priceGHS: 25, category: 'tech' },
      { id: 'earbuds', name: 'Earbuds', priceGHS: 45, category: 'tech' },
      { id: 'powerbank', name: 'Power bank', priceGHS: 90, category: 'tech' },
      { id: 'sim_pack', name: 'SIM pack', priceGHS: 5, category: 'tech' },
    ],
    capacity: 12,
    customersPerHour: 7,
    jobs: [
      {
        id: 'BJOB_MOBILE_CASH',
        businessId: 'BIZ_MOBILE_WORLD',
        role: 'cashier',
        title: 'Electronics cashier',
        payGHS: 34,
        shiftMinutes: 240,
      },
    ],
  },
];

export function findBusiness(id: string): BusinessDef | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

export function findBusinessJob(id: string): BusinessJobDef | undefined {
  for (const b of BUSINESSES) {
    const j = b.jobs.find((x) => x.id === id);
    if (j) return j;
  }
  return undefined;
}

export function businessesNear(x: number, z: number, radiusM: number): BusinessDef[] {
  return BUSINESSES.filter((b) => Math.hypot(b.site.x - x, b.site.z - z) <= radiusM);
}

/** Deterministic variant index for furniture pick (0–49). */
export function variantIndex(businessId: string, slot: string): number {
  let h = 0;
  const s = businessId + ':' + slot;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 50;
}
