import { describe, expect, it } from 'vitest';
import {
  layoutOwnedFurniture,
  replacedFixedCategories,
  categoryOf,
  replacesFixed,
  isSoftCategory,
  REPLACE_CATEGORIES,
  ROOM_W,
  ROOM_D,
  roomFootprint,
  type Rect,
  type RoomMode,
} from '../furnitureLayout';
import { listHomeFurniture, findFurnitureById } from '../../data/furniture';

const MODES: RoomMode[] = ['dollhouse', 'world'];

/** Fixed dressing copied from furnitureLayout (kept in sync by its tests). */
const FIXED: Record<RoomMode, Rect[]> = {
  dollhouse: [
    { x: -1.55, z: -2.45, w: 2.2, d: 0.95 },
    { x: -1.55, z: -1.25, w: 1.05, d: 1.05 },
    { x: 0.15, z: -2.45, w: 0.55, d: 0.55 },
    { x: 1.75, z: -1.85, w: 1.75, d: 2.15 },
    { x: 0.55, z: -2.6, w: 0.5, d: 0.45 },
    { x: 2.95, z: -2.6, w: 0.5, d: 0.45 },
    { x: 2.96, z: 1.25, w: 0.7, d: 1.55 },
    { x: -2.9, z: 1.75, w: 0.7, d: 1.35 },
    { x: -2.25, z: 1.8, w: 0.55, d: 0.55 },
    { x: -2.95, z: -2.65, w: 0.5, d: 0.5 },
    { x: 2.9, z: -0.2, w: 0.5, d: 0.5 },
    { x: -0.7, z: 2.6, w: 0.5, d: 0.5 },
  ],
  world: [
    { x: 1.6, z: -2.0, w: 1.95, d: 1.15 },
    { x: -1.8, z: -1.4, w: 0.95, d: 0.6 },
    { x: -1.9, z: 1.2, w: 0.75, d: 0.55 },
    { x: 0.15, z: -0.2, w: 0.5, d: 0.5 },
    { x: 2.2, z: 1.6, w: 0.6, d: 0.45 },
    { x: 2.2, z: -1.8, w: 0.85, d: 0.75 },
    { x: 1.5, z: 1.8, w: 0.35, d: 0.25 },
    { x: 0.15, z: -2.6, w: 0.55, d: 0.55 },
  ],
};

const SOFT: Rect[] = [
  { x: 0.2, z: 0.3, w: 2.4, d: 1.8 },
  { x: -1.55, z: -1.35, w: 2.6, d: 2.0 },
];

const REPLACEMENT_DOLLHOUSE: { x: number; z: number }[] = [
  { x: 1.75, z: -1.85 }, { x: -1.55, z: -2.45 }, { x: 2.94, z: 1.25 }, { x: -2.85, z: 1.75 },
  { x: -1.55, z: -1.25 }, { x: -1.55, z: -1.35 }, { x: 0.15, z: -2.45 }, { x: 0.15, z: -2.62 },
];
const REPLACEMENT_WORLD: { x: number; z: number }[] = [
  { x: 1.6, z: -1.88 }, { x: -1.55, z: -2.46 }, { x: 2.94, z: 0.6 }, { x: -2.7, z: -0.1 },
  { x: 2.6, z: -0.9 }, { x: 0.2, z: 0.3 }, { x: 0.15, z: -2.6 }, { x: 2.62, z: -0.55 },
];

function overlap(a: Rect, b: Rect, margin = 0.06): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margin &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 + margin
  );
}

/** All home ids as a realistic "bought everything" wallet-blast scenario. */
const ALL_HOME = listHomeFurniture().map((f) => f.id);

const CATEGORIES_KNOWN = [
  'chair', 'stool', 'table', 'bed', 'wardrobe', 'sofa', 'tv', 'fridge', 'fan', 'rug',
  'plant', 'kente', 'speaker', 'cooker', 'bucket_bath', 'toilet', 'generator', 'desk',
  'coffee_table', 'bookshelf', 'floor_lamp', 'cabinet', 'water_cooler', 'armchair',
  'side_table', 'pouf', 'dresser', 'nightstand', 'mirror', 'mattress_roll', 'cot',
  'clothes_rack', 'trunk', 'net', 'sink', 'shower_stall', 'bathtub', 'towel_rail',
  'bath_cabinet', 'mop_bucket', 'laundry_basket', 'water_heater',
  'decor', 'wall_art', 'table_lamp',
];

function fsAccess(modelPath: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  readFileSync(resolve(process.cwd(), 'public', modelPath));
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('furniture layout', () => {
  it('every home catalogue id maps to a known category', () => {
    for (const f of listHomeFurniture()) {
      expect(CATEGORIES_KNOWN, `${f.id} missing from CATEGORY table`).toContain(categoryOf(f.id));
    }
  });

  it('every home id individually gets exactly one placement per mode', () => {
    for (const mode of MODES) {
      for (const id of ALL_HOME) {
        const out = layoutOwnedFurniture([id], mode);
        expect(out, `${mode}: ${id} unplaced`).toHaveLength(1);
      }
    }
  });

  it('a realistic 24-piece shopping spree places (world fully, dollhouse within density)', () => {
    const spree = [
      'lp_bed_00', 'lp_sofa_00', 'lp_wardrobe_00', 'lp_office_desk_00', 'lp_coffee_table_00',
      'lp_rug_00', 'lp_bookshelf_00', 'lp_tv_stand_00', 'lp_floor_lamp_00', 'lp_armchair_00',
      'lp_dresser_00', 'lp_nightstand_00', 'chair_plastic', 'wooden_stool', 'table_small',
      'fridge_basic', 'tv_basic', 'flower_pots', 'sound_box', 'kente_cloth',
      'cooker_gas', 'fan_standing', 'lp_cushion_pouf_00', 'lp_side_table_00',
    ];
    const world = layoutOwnedFurniture(spree, 'world');
    expect(new Set(world.map((p) => p.id)), 'world: spree fully placed').toEqual(new Set(spree));
    // the dollhouse carries MORE fixed dressing (full lounge + office set),
    // so a 24-piece blast may run out of floor — allow at most 2 to miss
    const dh = layoutOwnedFurniture(spree, 'dollhouse');
    expect(dh.length, 'dollhouse: at most 2 pieces unplaced').toBeGreaterThanOrEqual(spree.length - 2);
    expect(new Set(dh.map((p) => p.id)).size).toBe(dh.length);
  });

  it('even a full-catalogue blast keeps every placed item valid', () => {
    for (const mode of MODES) {
      const out = layoutOwnedFurniture(ALL_HOME, mode);
      const ids = out.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length); // no duplicate placements
      for (const p of out) expect(ALL_HOME).toContain(p.id);
    }
    // every replaceable category lands in the world room (the fuller floor);
    // the dollhouse is denser (full lounge + office set baked in), so only
    // the early-buy categories are guaranteed there
    for (const cat of REPLACE_CATEGORIES) {
      const members = ALL_HOME.filter((id) => categoryOf(id) === cat);
      expect(members.length, `${cat} has catalogue members`).toBeGreaterThan(0);
      const worldIds = layoutOwnedFurniture(ALL_HOME, 'world').map((p) => p.id);
      expect(
        members.some((id) => worldIds.includes(id)),
        `world: category ${cat} represented`,
      ).toBe(true);
    }
    const dhIds = layoutOwnedFurniture(ALL_HOME, 'dollhouse').map((p) => p.id);
    for (const cat of ['bed', 'sofa', 'wardrobe', 'coffee_table', 'rug', 'fan']) {
      const members = ALL_HOME.filter((id) => categoryOf(id) === cat);
      expect(
        members.some((id) => dhIds.includes(id)),
        `dollhouse: category ${cat} represented`,
      ).toBe(true);
    }
  });

  it('placements stay inside the room footprint (rotated sizes honoured)', () => {
    for (const mode of MODES) {
      for (const p of layoutOwnedFurniture(ALL_HOME, mode)) {
        if (p.wall) continue; // wall pieces live at their anchor, not the floor
        const { w, d } = roomFootprint(p.id, p.rotY);
        expect(p.x - w / 2, `${mode}:${p.id} minX`).toBeGreaterThanOrEqual(-ROOM_W / 2);
        expect(p.x + w / 2, `${mode}:${p.id} maxX`).toBeLessThanOrEqual(ROOM_W / 2);
        expect(p.z - d / 2, `${mode}:${p.id} minZ`).toBeGreaterThanOrEqual(-ROOM_D / 2);
        expect(p.z + d / 2, `${mode}:${p.id} maxZ`).toBeLessThanOrEqual(ROOM_D / 2);
      }
    }
  });

  it('floor items never overlap the fixed dressing or each other', () => {
    for (const mode of MODES) {
      const out = layoutOwnedFurniture(ALL_HOME, mode);
      const placed: Rect[] = [];
      for (const p of out) {
        if (p.wall) continue;
        const { w, d } = roomFootprint(p.id, p.rotY);
        const r: Rect = { x: p.x, z: p.z, w, d };
        for (const f of FIXED[mode]) {
          // a replacement deliberately takes the starter piece's anchor — the
          // starter is hidden in that case, so the overlap is intended
          const atReplacementAnchor =
            (mode === 'dollhouse'
              ? REPLACEMENT_DOLLHOUSE.some((q) => q.x === p.x && q.z === p.z)
              : REPLACEMENT_WORLD.some((q) => q.x === p.x && q.z === p.z));
          if (p.replacesFixed && atReplacementAnchor) continue;
          if (overlap(r, f)) {
            throw new Error(`${mode}: ${p.id} at ${p.x},${p.z} overlaps fixed rect ${f.x},${f.z}`);
          }
        }
        for (const q of placed) {
          if (overlap(r, q)) throw new Error(`${mode}: ${p.id} overlaps an earlier placement`);
        }
        // hard items must not straddle the mat/rug edge (on it fully is fine)
        // replacements sit at starter anchors that legitimately touch the rug
        if (!p.replacesFixed && !isSoftCategory(p.category) && p.category !== 'rug') {
          for (const s of SOFT) {
            expect(overlap(r, s, -0.02), `${mode}: ${p.id} straddles a soft rect edge`).toBe(false);
          }
        }
        placed.push(r);
      }
    }
  });

  it('replaceable categories swap the starter anchor', () => {
    const dh = layoutOwnedFurniture(['lp_sofa_00'], 'dollhouse');
    expect(dh[0].replacesFixed).toBe(true);
    expect(dh[0].x).toBeCloseTo(-1.55, 2);
    expect(dh[0].z).toBeCloseTo(-2.45, 2);
    const w = layoutOwnedFurniture(['bed_basic'], 'world');
    expect(w[0].replacesFixed).toBe(true);
    expect(w[0].x).toBeCloseTo(1.6, 2);
  });

  it('a second item of the same category falls back to a free spot', () => {
    const out = layoutOwnedFurniture(['lp_sofa_00', 'sofa_basic'], 'dollhouse');
    expect(out).toHaveLength(2);
    expect(out[0].replacesFixed).toBe(true);
    expect(out[1].replacesFixed).toBe(false);
    const a = roomFootprint('lp_sofa_00', out[0].rotY);
    const b = roomFootprint('sofa_basic', out[1].rotY);
    expect(overlap({ x: out[0].x, z: out[0].z, ...a }, { x: out[1].x, z: out[1].z, ...b })).toBe(false);
  });

  it('replacedFixedCategories reports the starter pieces to hide', () => {
    const set = replacedFixedCategories(['lp_bed_00', 'lp_rug_00', 'fan_standing', 'chair_plastic']);
    expect(set.has('bed')).toBe(true);
    expect(set.has('rug')).toBe(true);
    expect(set.has('fan')).toBe(true);
    expect(set.has('chair')).toBe(false);
  });

  it('is deterministic for the same input', () => {
    const a = layoutOwnedFurniture(ALL_HOME, 'dollhouse');
    const b = layoutOwnedFurniture(ALL_HOME, 'dollhouse');
    expect(a).toEqual(b);
  });

  it('unknown ids are ignored, not crashed on', () => {
    expect(layoutOwnedFurniture(['nope_nope'], 'world')).toEqual([]);
  });

  it('every home modelPath resolves to a real GLB on disk', () => {
    for (const f of listHomeFurniture()) {
      const path = f.modelPath;
      if (!path) continue;
      expect(() => fsAccess(path), `${f.id} modelPath missing`).not.toThrow();
    }
  });

  it('replacesFixed flag is reserved for replaceable categories', () => {
    expect(replacesFixed('sofa')).toBe(true);
    expect(replacesFixed('chair')).toBe(false);
    expect(REPLACE_CATEGORIES.length).toBeGreaterThan(0);
    expect(findFurnitureById('lp_sofa_00')?.modelPath).toBeTruthy();
  });
});
