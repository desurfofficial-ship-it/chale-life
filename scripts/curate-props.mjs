#!/usr/bin/env node
/**
 * W-009 curate-props.mjs — copy the curated subset of the 10 user-supplied
 * prop packs into asset-sources/accra-props/ (gitignored, like all raw
 * sources). Curation = archetypes that fit Accra Life's districts; the
 * packs ship 50 variants per archetype, we take 1-3 for hero items.
 *
 * Single source of truth for the curated list — colorize-props.mjs reads
 * the same CURATED table (imported) so the two can never drift.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.env.PROPS_SRC ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../asset-packs');
const DST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../asset-sources/accra-props');

/** hero archetypes get 2-3 geometric variants (00/01/02); the rest take 00 */
const HERO = new Set([
  'palm-tree', 'banana-plant', 'broadleaf-tree', 'bush',
  'barrel', 'sack-stack',
  'fishing-canoe', 'fish-smoker',
  'bicycle',
]);

/** archetypes that fit the world — everything else stays out (cactus,
 *  indoor-only civic furniture, ground-hugging patches the canvas already
 *  paints, pier-section utility pieces, etc.) */
const CURATED = {
  plants: ['banana-plant', 'broadleaf-tree', 'bush', 'flower-bed', 'grass-clump', 'hedge-block', 'palm-tree', 'plantain-tree', 'potted-plant'],
  terrain: ['boulder-cluster', 'laterite-chunk', 'log', 'rock', 'sand-pile', 'stump'],
  containers: ['barrel', 'bucket', 'cardboard-box', 'cooler-box', 'gas-cylinder', 'jerrycan', 'plastic-chair-stack', 'polytank', 'sack-stack', 'storage-bin'],
  construction: ['cement-bag-stack', 'cement-block-stack', 'ladder', 'plank-pile', 'rebar-bundle', 'sandcrete-mixer', 'scaffold', 'site-hoarding', 'traffic-cone', 'wheelbarrow'],
  signage: ['a-frame-sign', 'banner-pole', 'billboard', 'flag-pole', 'neon-box-sign', 'notice-board', 'price-board', 'road-sign', 'street-name-sign'],
  transport: ['baby-stroller', 'bicycle', 'hand-cart', 'motorbike', 'push-truck', 'scooter', 'tricycle-cargo', 'wheel-tyre-stack'],
  civic: ['atm-machine', 'notice-kiosk', 'security-booth', 'ticket-booth'],
  leisure: ['basketball-hoop', 'draughts-table', 'drum-set', 'football-goal', 'ludo-table', 'swing-set', 'table-tennis-table'],
  coast: ['beach-chair', 'beach-umbrella', 'buoy', 'fish-smoker', 'fishing-canoe', 'fishing-net-pile', 'jetty-post', 'lifeguard-tower', 'outboard-motor'],
  utility: ['electric-pole', 'generator', 'overhead-tank', 'satellite-dish', 'solar-panel', 'transformer', 'water-pump'],
};

let copied = 0, bytes = 0;
for (const [pack, archs] of Object.entries(CURATED)) {
  mkdirSync(path.join(DST, pack), { recursive: true });
  for (const a of archs) {
    const dir = path.join(SRC, pack, a);
    const files = readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
    if (files.length === 0) { console.error(`EMPTY archetype: ${pack}/${a}`); continue; }
    const want = HERO.has(a) ? files.slice(0, 2) : files.slice(0, 1);
    for (const f of want) {
      copyFileSync(path.join(dir, f), path.join(DST, pack, f));
      copied++; bytes += statSize(path.join(dir, f));
    }
  }
}
console.log(`curated: ${copied} GLBs, ${(bytes / 1024).toFixed(0)} KB raw`);

function statSize(p) {
  return statSync(p).size;
}
