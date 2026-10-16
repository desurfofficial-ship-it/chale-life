/**
 * Furniture catalogue — home items + business kit props (G-009).
 *
 * Resale is 50% of cost everywhere (standard for the catalog).
 * Gameplay-effect items are deliberately Tier 1–2 affordable
 * (anti-pay-to-win guardrail); premium items add comfort/flex only.
 *
 * Pure data — no state, no store imports, no three.js, no React.
 */

export type FurnitureRarity = 'basic' | 'standard' | 'premium';

export interface FurnitureEffects {
  readonly comfort: number;
  readonly sleepEnergyBonus?: number;
  readonly energyDecayMult?: number;
  readonly funDecayMult?: number;
  readonly funRestore?: number;
  readonly hygieneRestore?: number;
  readonly bladderRestore?: number;
  readonly enablesCooking?: boolean;
  readonly foodStorage?: boolean;
  readonly dumsorImmunity?: boolean;
}

export interface FurnitureCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly costGHS: number;
  readonly rarity: FurnitureRarity;
  readonly effects: FurnitureEffects;
  readonly dimensions?: { readonly widthMeters: number; readonly depthMeters: number };
  readonly summary: string;
  /** When true, used in tycoon business kits (not home placement). */
  readonly businessKit?: boolean;
  /** Optional meshopt GLB under public/models/furniture/ (1 unit = 1 m, +Y up). */
  readonly modelPath?: string;
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

  // ── Low-poly batch 01 (CC0, meshopt) — public/models/furniture/*.glb ───────
  {
    id: 'sofa_lp',
    title: 'Low-poly 2-Seater Sofa',
    costGHS: 340,
    rarity: 'standard',
    effects: { comfort: 9, funRestore: 8, energyDecayMult: 0.92 },
    dimensions: { widthMeters: 2.0, depthMeters: 0.9 },
    summary: 'Clean low-poly sofa — same comfort as the basic 2-seater, real mesh.',
    modelPath: 'models/furniture/sofa.glb',
  },
  {
    id: 'office_chair_lp',
    title: 'Office Chair',
    costGHS: 180,
    rarity: 'standard',
    effects: { comfort: 5 },
    dimensions: { widthMeters: 0.62, depthMeters: 0.65 },
    summary: 'Swivel office chair — home desk or office floor.',
    modelPath: 'models/furniture/office-chair.glb',
  },
  {
    id: 'office_desk_lp',
    title: 'Office Desk',
    costGHS: 420,
    rarity: 'standard',
    effects: { comfort: 6 },
    dimensions: { widthMeters: 1.4, depthMeters: 0.72 },
    summary: 'Simple desk with legs — laptop and letters live here.',
    modelPath: 'models/furniture/office-desk.glb',
  },
  {
    id: 'coffee_table_lp',
    title: 'Coffee Table',
    costGHS: 150,
    rarity: 'basic',
    effects: { comfort: 4 },
    dimensions: { widthMeters: 1.0, depthMeters: 0.56 },
    summary: 'Low table for the sitting area.',
    modelPath: 'models/furniture/coffee-table.glb',
  },
  {
    id: 'bookshelf_lp',
    title: 'Bookshelf',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 6 },
    dimensions: { widthMeters: 0.86, depthMeters: 0.32 },
    summary: 'Tall open shelves — books, boxes, and a little pride.',
    modelPath: 'models/furniture/bookshelf.glb',
  },
  {
    id: 'floor_lamp_lp',
    title: 'Floor Lamp',
    costGHS: 95,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.42, depthMeters: 0.42 },
    summary: 'Standing lamp — warm light for the room corner.',
    modelPath: 'models/furniture/floor-lamp.glb',
  },
  {
    id: 'potted_plant_lp',
    title: 'Potted Plant',
    costGHS: 45,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.69, depthMeters: 0.57 },
    summary: 'A little green — same spirit as the terracotta planters.',
    modelPath: 'models/furniture/potted-plant.glb',
  },
  {
    id: 'filing_cabinet_lp',
    title: 'Filing Cabinet',
    costGHS: 220,
    rarity: 'standard',
    effects: { comfort: 4 },
    dimensions: { widthMeters: 0.46, depthMeters: 0.65 },
    summary: 'Metal drawers for papers and receipts.',
    modelPath: 'models/furniture/filing-cabinet.glb',
  },
  {
    id: 'water_cooler_lp',
    title: 'Water Cooler',
    costGHS: 160,
    rarity: 'standard',
    effects: { comfort: 3, hygieneRestore: 10 },
    dimensions: { widthMeters: 0.32, depthMeters: 0.43 },
    summary: 'Office water dispenser — sachet alternative at home too.',
    modelPath: 'models/furniture/water-cooler.glb',
  },
  {
    id: 'reception_counter_lp',
    title: 'Reception Counter',
    costGHS: 380,
    rarity: 'standard',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 2.06, depthMeters: 0.86 },
    summary: 'Long counter for lobby or small shop front.',
    businessKit: true,
    modelPath: 'models/furniture/reception-counter.glb',
  },

  // ── Low-poly packs office/living/bedroom/bathroom (variant -00) ───────────
  {
    id: 'lp_office_chair_00',
    title: 'Office Chair',
    costGHS: 180,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.66, depthMeters: 0.63 },
    summary: 'Low-poly office chair — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/office/office-chair/office-chair-00.glb',
  },
  {
    id: 'lp_office_desk_00',
    title: 'Office Desk',
    costGHS: 420,
    rarity: 'premium',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.46, depthMeters: 0.80 },
    summary: 'Low-poly office desk — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/office/office-desk/office-desk-00.glb',
  },
  {
    id: 'lp_filing_cabinet_00',
    title: 'Filing Cabinet',
    costGHS: 220,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.45, depthMeters: 0.62 },
    summary: 'Low-poly filing cabinet — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/office/filing-cabinet/filing-cabinet-00.glb',
  },
  {
    id: 'lp_reception_counter_00',
    title: 'Reception Counter',
    costGHS: 380,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.66, depthMeters: 0.81 },
    summary: 'Low-poly reception counter — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/reception-counter/reception-counter-00.glb',
  },
  {
    id: 'lp_meeting_table_00',
    title: 'Meeting Table',
    costGHS: 450,
    rarity: 'premium',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 2.93, depthMeters: 1.04 },
    summary: 'Low-poly meeting table — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/meeting-table/meeting-table-00.glb',
  },
  {
    id: 'lp_whiteboard_00',
    title: 'Whiteboard',
    costGHS: 140,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.52, depthMeters: 0.50 },
    summary: 'Low-poly whiteboard — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/whiteboard/whiteboard-00.glb',
  },
  {
    id: 'lp_water_cooler_00',
    title: 'Water Cooler',
    costGHS: 160,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.41, depthMeters: 0.41 },
    summary: 'Low-poly water cooler — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/water-cooler/water-cooler-00.glb',
  },
  {
    id: 'lp_printer_copier_00',
    title: 'Printer / Copier',
    costGHS: 600,
    rarity: 'premium',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.59, depthMeters: 0.68 },
    summary: 'Low-poly printer copier — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/printer-copier/printer-copier-00.glb',
  },
  {
    id: 'lp_office_partition_00',
    title: 'Office Partition',
    costGHS: 200,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.63, depthMeters: 0.49 },
    summary: 'Low-poly office partition — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/office-partition/office-partition-00.glb',
  },
  {
    id: 'lp_locker_00',
    title: 'Locker',
    costGHS: 250,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.36, depthMeters: 0.53 },
    summary: 'Low-poly locker — meshopt GLB for room placement.',
    businessKit: true,
    modelPath: 'models/furniture/office/locker/locker-00.glb',
  },
  {
    id: 'lp_sofa_00',
    title: 'Sofa',
    costGHS: 340,
    rarity: 'standard',
    effects: { comfort: 9, funRestore: 8 },
    dimensions: { widthMeters: 1.74, depthMeters: 0.98 },
    summary: 'Low-poly sofa — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/sofa/sofa-00.glb',
  },
  {
    id: 'lp_armchair_00',
    title: 'Armchair',
    costGHS: 220,
    rarity: 'standard',
    effects: { comfort: 6 },
    dimensions: { widthMeters: 0.80, depthMeters: 0.78 },
    summary: 'Low-poly armchair — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/armchair/armchair-00.glb',
  },
  {
    id: 'lp_coffee_table_00',
    title: 'Coffee Table',
    costGHS: 150,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.05, depthMeters: 0.60 },
    summary: 'Low-poly coffee table — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/coffee-table/coffee-table-00.glb',
  },
  {
    id: 'lp_tv_stand_00',
    title: 'TV Stand',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.44, depthMeters: 0.46 },
    summary: 'Low-poly tv stand — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/tv-stand/tv-stand-00.glb',
  },
  {
    id: 'lp_bookshelf_00',
    title: 'Bookshelf',
    costGHS: 260,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.86, depthMeters: 0.34 },
    summary: 'Low-poly bookshelf — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/bookshelf/bookshelf-00.glb',
  },
  {
    id: 'lp_side_table_00',
    title: 'Side Table',
    costGHS: 90,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.41, depthMeters: 0.41 },
    summary: 'Low-poly side table — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/side-table/side-table-00.glb',
  },
  {
    id: 'lp_floor_lamp_00',
    title: 'Floor Lamp',
    costGHS: 95,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.41, depthMeters: 0.41 },
    summary: 'Low-poly floor lamp — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/floor-lamp/floor-lamp-00.glb',
  },
  {
    id: 'lp_rug_00',
    title: 'Rug',
    costGHS: 120,
    rarity: 'basic',
    effects: { comfort: 5 },
    dimensions: { widthMeters: 1.99, depthMeters: 1.62 },
    summary: 'Low-poly rug — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/rug/rug-00.glb',
  },
  {
    id: 'lp_cushion_pouf_00',
    title: 'Cushion / Pouf',
    costGHS: 55,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.48, depthMeters: 0.48 },
    summary: 'Low-poly cushion pouf — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/cushion-pouf/cushion-pouf-00.glb',
  },
  {
    id: 'lp_display_cabinet_00',
    title: 'Display Cabinet',
    costGHS: 320,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.10, depthMeters: 0.52 },
    summary: 'Low-poly display cabinet — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/living/display-cabinet/display-cabinet-00.glb',
  },
  {
    id: 'lp_bed_00',
    title: 'Bed',
    costGHS: 320,
    rarity: 'standard',
    effects: { comfort: 10, sleepEnergyBonus: 20, energyDecayMult: 0.95 },
    dimensions: { widthMeters: 1.51, depthMeters: 2.12 },
    summary: 'Low-poly bed — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/bed/bed-00.glb',
  },
  {
    id: 'lp_wardrobe_00',
    title: 'Wardrobe',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 5 },
    dimensions: { widthMeters: 1.93, depthMeters: 0.61 },
    summary: 'Low-poly wardrobe — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/wardrobe/wardrobe-00.glb',
  },
  {
    id: 'lp_dresser_00',
    title: 'Dresser',
    costGHS: 240,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.81, depthMeters: 0.52 },
    summary: 'Low-poly dresser — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/dresser/dresser-00.glb',
  },
  {
    id: 'lp_nightstand_00',
    title: 'Nightstand',
    costGHS: 110,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.54, depthMeters: 0.41 },
    summary: 'Low-poly nightstand — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/nightstand/nightstand-00.glb',
  },
  {
    id: 'lp_mirror_stand_00',
    title: 'Mirror Stand',
    costGHS: 130,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.60, depthMeters: 0.49 },
    summary: 'Low-poly mirror stand — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/mirror-stand/mirror-stand-00.glb',
  },
  {
    id: 'lp_mattress_roll_00',
    title: 'Mattress Roll',
    costGHS: 90,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.23, depthMeters: 0.59 },
    summary: 'Low-poly mattress roll — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/mattress-roll/mattress-roll-00.glb',
  },
  {
    id: 'lp_baby_cot_00',
    title: 'Baby Cot',
    costGHS: 200,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.35, depthMeters: 0.64 },
    summary: 'Low-poly baby cot — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/baby-cot/baby-cot-00.glb',
  },
  {
    id: 'lp_clothes_rack_00',
    title: 'Clothes Rack',
    costGHS: 80,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.48, depthMeters: 0.48 },
    summary: 'Low-poly clothes rack — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/clothes-rack/clothes-rack-00.glb',
  },
  {
    id: 'lp_trunk_chest_00',
    title: 'Trunk / Chest',
    costGHS: 160,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.85, depthMeters: 0.60 },
    summary: 'Low-poly trunk chest — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/trunk-chest/trunk-chest-00.glb',
  },
  {
    id: 'lp_mosquito_net_frame_00',
    title: 'Mosquito-net Frame',
    costGHS: 70,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 1.33, depthMeters: 2.38 },
    summary: 'Low-poly mosquito net frame — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bedroom/mosquito-net-frame/mosquito-net-frame-00.glb',
  },
  {
    id: 'lp_toilet_00',
    title: 'Toilet',
    costGHS: 140,
    rarity: 'basic',
    effects: { comfort: 2, bladderRestore: 80 },
    dimensions: { widthMeters: 0.43, depthMeters: 0.73 },
    summary: 'Low-poly toilet — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/toilet/toilet-00.glb',
  },
  {
    id: 'lp_sink_basin_00',
    title: 'Sink Basin',
    costGHS: 160,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.51, depthMeters: 0.48 },
    summary: 'Low-poly sink basin — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/sink-basin/sink-basin-00.glb',
  },
  {
    id: 'lp_shower_stall_00',
    title: 'Shower Stall',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 3, hygieneRestore: 50 },
    dimensions: { widthMeters: 0.94, depthMeters: 1.15 },
    summary: 'Low-poly shower stall — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/shower-stall/shower-stall-00.glb',
  },
  {
    id: 'lp_bathtub_00',
    title: 'Bathtub',
    costGHS: 400,
    rarity: 'premium',
    effects: { comfort: 5, hygieneRestore: 60 },
    dimensions: { widthMeters: 1.67, depthMeters: 0.82 },
    summary: 'Low-poly bathtub — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/bathtub/bathtub-00.glb',
  },
  {
    id: 'lp_bucket_bath_00',
    title: 'Bucket Bath',
    costGHS: 80,
    rarity: 'basic',
    effects: { comfort: 2, hygieneRestore: 40 },
    dimensions: { widthMeters: 0.35, depthMeters: 0.34 },
    summary: 'Low-poly bucket bath — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/bucket-bath/bucket-bath-00.glb',
  },
  {
    id: 'lp_towel_rail_00',
    title: 'Towel Rail',
    costGHS: 45,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.85, depthMeters: 0.30 },
    summary: 'Low-poly towel rail — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/towel-rail/towel-rail-00.glb',
  },
  {
    id: 'lp_bath_cabinet_00',
    title: 'Bath Cabinet',
    costGHS: 180,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.71, depthMeters: 0.18 },
    summary: 'Low-poly bath cabinet — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/bath-cabinet/bath-cabinet-00.glb',
  },
  {
    id: 'lp_mop_bucket_00',
    title: 'Mop Bucket',
    costGHS: 35,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.43, depthMeters: 0.73 },
    summary: 'Low-poly mop bucket — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/mop-bucket/mop-bucket-00.glb',
  },
  {
    id: 'lp_laundry_basket_00',
    title: 'Laundry Basket',
    costGHS: 40,
    rarity: 'basic',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.59, depthMeters: 0.56 },
    summary: 'Low-poly laundry basket — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/laundry-basket/laundry-basket-00.glb',
  },
  {
    id: 'lp_water_heater_00',
    title: 'Water Heater',
    costGHS: 350,
    rarity: 'standard',
    effects: { comfort: 3 },
    dimensions: { widthMeters: 0.51, depthMeters: 0.60 },
    summary: 'Low-poly water heater — meshopt GLB for room placement.',
    
    modelPath: 'models/furniture/bathroom/water-heater/water-heater-00.glb',
  },

  // ── Business kit (G-009 / T-001) — tycoon interiors, not home ─────────────
  {
    id: 'biz_counter',
    title: 'Shop Counter',
    costGHS: 200,
    rarity: 'standard',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.6, depthMeters: 0.6 },
    summary: 'Serve customers across this counter.',
    businessKit: true,
  },
  {
    id: 'biz_bench',
    title: 'Waiting Bench',
    costGHS: 80,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.4, depthMeters: 0.45 },
    summary: 'Customers sit while they wait.',
    businessKit: true,
  },
  {
    id: 'biz_stool',
    title: 'Shop Stool',
    costGHS: 25,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 0.4, depthMeters: 0.4 },
    summary: 'Staff or customer stool.',
    businessKit: true,
  },
  {
    id: 'biz_chair',
    title: 'Shop Chair',
    costGHS: 45,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 0.5, depthMeters: 0.5 },
    summary: 'Simple indoor chair.',
    businessKit: true,
  },
  {
    id: 'biz_cooker',
    title: 'Commercial Cooker',
    costGHS: 350,
    rarity: 'standard',
    effects: { comfort: 0, enablesCooking: true },
    dimensions: { widthMeters: 0.9, depthMeters: 0.7 },
    summary: 'Chop-bar and waakye heat.',
    businessKit: true,
  },
  {
    id: 'biz_shelf',
    title: 'Stock Shelf',
    costGHS: 120,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.2, depthMeters: 0.4 },
    summary: 'Goods on display.',
    businessKit: true,
  },
  {
    id: 'biz_display',
    title: 'Display Case',
    costGHS: 280,
    rarity: 'standard',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.0, depthMeters: 0.5 },
    summary: 'Glass case for phones, meds, or accessories.',
    businessKit: true,
  },
  {
    id: 'biz_fridge',
    title: 'Commercial Fridge',
    costGHS: 900,
    rarity: 'premium',
    effects: { comfort: 0, foodStorage: true },
    dimensions: { widthMeters: 0.8, depthMeters: 0.8 },
    summary: 'Cold drinks and perishables.',
    businessKit: true,
  },
  {
    id: 'biz_barber_chair',
    title: 'Barber Chair',
    costGHS: 450,
    rarity: 'standard',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 0.7, depthMeters: 0.8 },
    summary: 'Hydraulic seat for the cut.',
    businessKit: true,
  },
  {
    id: 'biz_salon_chair',
    title: 'Salon Chair',
    costGHS: 520,
    rarity: 'standard',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 0.7, depthMeters: 0.8 },
    summary: 'Styling chair with headrest.',
    businessKit: true,
  },
  {
    id: 'biz_mirror',
    title: 'Wall Mirror',
    costGHS: 90,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 0.8, depthMeters: 0.1 },
    summary: 'Barber and salon mirror.',
    businessKit: true,
  },
  {
    id: 'biz_fuel_pump',
    title: 'Fuel Pump',
    costGHS: 4000,
    rarity: 'premium',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.0, depthMeters: 0.8 },
    summary: 'Petrol / diesel pump island.',
    businessKit: true,
  },
  {
    id: 'biz_canopy',
    title: 'Station Canopy',
    costGHS: 2500,
    rarity: 'premium',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 4, depthMeters: 3 },
    summary: 'Shade over the pumps.',
    businessKit: true,
  },
  {
    id: 'biz_umbrella',
    title: 'Street Umbrella',
    costGHS: 60,
    rarity: 'basic',
    effects: { comfort: 0 },
    dimensions: { widthMeters: 1.5, depthMeters: 1.5 },
    summary: 'Waakye stand shade.',
    businessKit: true,
  },
];

/** Standard resale: 50% of purchase price (money sink — see balance doc). */
export function furnitureResaleValue(item: FurnitureCatalogItem): number {
  return Math.round(item.costGHS * 50) / 100;
}

export function findFurnitureById(id: string): FurnitureCatalogItem | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}


/** Home-placement items (excludes business kit props). */
export function listHomeFurniture(): ReadonlyArray<FurnitureCatalogItem> {
  return FURNITURE_CATALOG.filter((f) => !f.businessKit);
}

/** Tycoon business kit props. */
export function listBusinessFurniture(): ReadonlyArray<FurnitureCatalogItem> {
  return FURNITURE_CATALOG.filter((f) => !!f.businessKit);
}

/**
 * Comfort 0–100 from owned home furniture ids.
 * Sum of effect.comfort, soft-capped so a full single-room still needs upgrades
 * before the next housing tier (48% gate).
 */
export function comfortPctFromOwned(ownedIds: readonly string[]): number {
  let sum = 0;
  for (const id of ownedIds) {
    const item = findFurnitureById(id);
    if (!item || item.businessKit) continue;
    sum += item.effects.comfort;
  }
  // 1 comfort point ≈ 4% — a basic starter set (~12 pts) ≈ 48%
  return Math.max(0, Math.min(100, Math.round(sum * 4)));
}

/** Extra energy on sleep from beds / AC / etc. */
export function sleepEnergyBonusFromOwned(ownedIds: readonly string[]): number {
  let bonus = 0;
  for (const id of ownedIds) {
    const item = findFurnitureById(id);
    if (!item) continue;
    bonus += item.effects.sleepEnergyBonus ?? 0;
  }
  return bonus;
}

/** Every id in a business furnitureKit must exist in the catalogue. */
export function validateFurnitureKit(kit: readonly string[]): string[] {
  return kit.filter((id) => !findFurnitureById(id));
}

/** Footprint [w, h, d] metres for world placement; falls back to 0.5 cube. */
export function furnitureSizeMeters(id: string): [number, number, number] {
  const item = findFurnitureById(id);
  if (item?.dimensions) {
    const w = item.dimensions.widthMeters;
    const d = item.dimensions.depthMeters;
    // height heuristic by kind
    let h = 0.5;
    if (id.includes('shelf') || id.includes('display') || id.includes('fridge')) h = 1.4;
    else if (id.includes('counter')) h = 0.9;
    else if (id.includes('fuel') || id.includes('mirror')) h = 1.2;
    else if (id.includes('canopy')) h = 0.12;
    else if (id.includes('umbrella')) h = 1.6;
    else if (id.includes('chair') || id.includes('stool') || id.includes('bench')) h = 0.5;
    else if (id.includes('cooker')) h = 0.7;
    return [w, h, d];
  }
  return [0.5, 0.5, 0.5];
}
