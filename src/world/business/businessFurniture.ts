/**
 * B-001 — Deterministic furniture picks for world-run shops/restaurants.
 * Paths are relative (public/). Prefer -00 meshopt GLBs from the 5 packs.
 */
import { variantIndex } from '../../data/worldBusinesses';
import type { BusinessDef } from '../../data/worldBusinesses';
import { publicUrl } from '../gltfSupport';

export type PropSpec = {
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotY?: number;
  readonly scale?: number;
};

const p = (category: string, archetype: string) =>
  publicUrl(`models/furniture/${category}/${archetype}/${archetype}-00.glb`);

/** Props laid out inside a business cutaway (local space, origin = centre). */
export function propsFor(def: BusinessDef): readonly PropSpec[] {
  const { w, d } = def.site;
  void variantIndex; // multi-variant later

  if (def.kind === 'restaurant') {
    const items: PropSpec[] = [
      { path: p('kitchen', 'dining-table'), x: -w * 0.2, y: 0, z: 0, scale: 1 },
      { path: p('kitchen', 'dining-chair'), x: -w * 0.2, y: 0, z: 0.7, scale: 1 },
      { path: p('kitchen', 'dining-chair'), x: -w * 0.2, y: 0, z: -0.7, rotY: Math.PI, scale: 1 },
      { path: p('market', 'chop-bar-bench'), x: w * 0.15, y: 0, z: -d * 0.15, scale: 1 },
      { path: p('kitchen', 'kitchen-counter'), x: 0, y: 0, z: d / 2 - 1.3, scale: 1 },
      { path: p('kitchen', 'gas-cooker'), x: -w * 0.25, y: 0, z: d / 2 - 1.3, scale: 1 },
      { path: p('kitchen', 'fridge'), x: w * 0.3, y: 0, z: d / 2 - 1.4, scale: 1 },
      { path: p('food', 'drink-bottle-crate'), x: w * 0.25, y: 0, z: 0.2, scale: 1 },
    ];
    if (def.sub === 'waakye' || def.sub === 'chop_bar') {
      items.push(
        { path: p('kitchen', 'coal-pot'), x: -w * 0.1, y: 0, z: d / 2 - 1.5, scale: 1 },
        { path: p('food', 'kenkey-pack'), x: 0.4, y: 0, z: 0.3, scale: 1 },
      );
    }
    if (def.sub === 'drinking_spot') {
      items.push({ path: p('electronics', 'speaker-box'), x: -w * 0.3, y: 0, z: -d * 0.2, scale: 1 });
    }
    return items;
  }

  const shop: PropSpec[] = [
    { path: p('market', 'display-table'), x: 0, y: 0, z: 0, scale: 1 },
    { path: p('market', 'wooden-crate'), x: -w * 0.25, y: 0, z: -0.3, scale: 1 },
    { path: p('kitchen', 'kitchen-shelf'), x: -w / 2 + 0.6, y: 0, z: 0, rotY: Math.PI / 2, scale: 1 },
  ];
  if (def.sub === 'provision' || def.sub === 'supermarket') {
    shop.push(
      { path: p('market', 'kiosk'), x: 0, y: 0, z: d / 2 - 1.5, scale: 0.85 },
      { path: p('food', 'bread-loaf-stack'), x: 0.5, y: 0, z: 0.2, scale: 1 },
      { path: p('market', 'produce-sack'), x: -0.6, y: 0, z: 0.4, scale: 1 },
    );
  }
  if (def.sub === 'electronics') {
    shop.push(
      { path: p('electronics', 'television'), x: 0.4, y: 0, z: -0.2, scale: 1 },
      { path: p('electronics', 'phone'), x: -0.3, y: 0.9, z: 0.1, scale: 1 },
      { path: p('electronics', 'laptop'), x: 0.2, y: 0.9, z: 0.2, scale: 1 },
    );
  }
  if (def.sub === 'pharmacy') {
    shop.push(
      { path: p('kitchen', 'fridge'), x: w * 0.25, y: 0, z: -d * 0.1, scale: 1 },
      { path: p('electronics', 'standing-fan'), x: -w * 0.3, y: 0, z: d * 0.1, scale: 1 },
    );
  }
  if (def.sub === 'boutique') {
    shop.push({ path: p('market', 'display-table'), x: w * 0.15, y: 0, z: 0.3, scale: 1 });
  }
  // Service vertical slice — reuse living/office/bathroom GLBs (no new models).
  if (def.sub === 'barber' || def.sub === 'salon') {
    return [
      // waiting area
      { path: p('living', 'sofa'), x: -w * 0.25, y: 0, z: -d * 0.25, scale: 0.9 },
      { path: p('living', 'side-table'), x: -w * 0.05, y: 0, z: -d * 0.25, scale: 1 },
      { path: p('decor', 'table-lamp'), x: -w * 0.05, y: 0.55, z: -d * 0.25, scale: 1 },
      // stations along the back wall
      { path: p('office', 'office-chair'), x: -w * 0.2, y: 0, z: d * 0.15, scale: 1 },
      { path: p('office', 'office-chair'), x: w * 0.15, y: 0, z: d * 0.15, scale: 1 },
      { path: p('bedroom', 'mirror-stand'), x: -w * 0.2, y: 0, z: d * 0.35, scale: 1 },
      { path: p('bedroom', 'mirror-stand'), x: w * 0.15, y: 0, z: d * 0.35, scale: 1 },
      { path: p('living', 'side-table'), x: -w * 0.35, y: 0, z: d * 0.15, scale: 0.85 },
      { path: p('living', 'side-table'), x: w * 0.3, y: 0, z: d * 0.15, scale: 0.85 },
      // counter / till
      { path: p('market', 'display-table'), x: 0, y: 0, z: d / 2 - 1.2, scale: 0.9 },
      { path: p('electronics', 'standing-fan'), x: w * 0.35, y: 0, z: -d * 0.1, scale: 1 },
      ...(def.sub === 'salon'
        ? [
            { path: p('bathroom', 'sink-basin'), x: w * 0.3, y: 0, z: d * 0.05, scale: 0.9 },
            { path: p('decor', 'vase'), x: -w * 0.1, y: 0.55, z: -d * 0.25, scale: 1 },
          ]
        : []),
    ];
  }
  if (def.sub === 'gym') {
    // No dedicated gym-equipment pack ships with the game — the honest
    // dress is the real GLBs a Chorkor neighbourhood gym actually has:
    // lockers, a front desk, a water point, a workout bench and speakers.
    return [
      { path: p('office', 'locker'), x: -w / 2 + 0.7, y: 0, z: 0, rotY: Math.PI / 2, scale: 1 },
      { path: p('office', 'locker'), x: -w / 2 + 0.7, y: 0, z: 1.2, rotY: Math.PI / 2, scale: 1 },
      { path: p('office', 'locker'), x: -w / 2 + 0.7, y: 0, z: -1.2, rotY: Math.PI / 2, scale: 1 },
      // workout bench (dining bench GLB at gym height reads as one)
      { path: p('market', 'chop-bar-bench'), x: 0, y: 0, z: -d * 0.28, scale: 1 },
      // front desk / sign-in
      { path: p('office', 'reception-counter'), x: 0, y: 0, z: d / 2 - 1.3, scale: 0.9 },
      { path: p('office', 'office-chair'), x: -w * 0.15, y: 0, z: d * 0.2, scale: 1 },
      // water point + towel shelf
      { path: p('office', 'water-cooler'), x: w * 0.3, y: 0, z: -d * 0.1, scale: 1 },
      { path: p('kitchen', 'kitchen-shelf'), x: -w * 0.28, y: 0, z: -d * 0.3, rotY: 0, scale: 0.9 },
      { path: p('electronics', 'standing-fan'), x: w * 0.32, y: 0, z: d * 0.05, scale: 1 },
      { path: p('electronics', 'speaker-box'), x: w * 0.3, y: 0, z: d * 0.2, scale: 1 },
    ];
  }
  return shop;
}
