/**
 * propsKit.ts — W-009 manifest of the colorized prop-pack GLBs shipped
 * under public/models/props/ (generated alongside scripts/colorize-props.mjs;
 * every file carries a docs/assets/LICENSES.csv row — CI enforces it).
 *
 * All packs arrived 100% untextured gray (single "LowPolyKit" material, no
 * COLOR_0, empty "sheets/" folders), so colors are baked per-face into the
 * geometry by the colorize pipeline — the runtime needs NO textures and can
 * merge every archetype into one vertexColors material per district.
 * Geometry is real-world metres, Y-up, origin on the ground (bbox minY ≈ 0).
 */
import { publicUrl } from '../gltfSupport'

/** archetype id → meshopt GLB variants (index picked deterministically per
 *  placement so a 2-variant kit adds variety without extra data) */
export const PROP_KITS: Record<string, string[]> = {
  'a-frame-sign': ['models/props/signage/a-frame-sign-00.glb'],
  'atm-machine': ['models/props/civic/atm-machine-00.glb'],
  'baby-stroller': ['models/props/transport/baby-stroller-00.glb'],
  'banana-plant': ['models/props/plants/banana-plant-00.glb', 'models/props/plants/banana-plant-01.glb'],
  'banner-pole': ['models/props/signage/banner-pole-00.glb'],
  'barrel': ['models/props/containers/barrel-00.glb', 'models/props/containers/barrel-01.glb'],
  'basketball-hoop': ['models/props/leisure/basketball-hoop-00.glb'],
  'beach-chair': ['models/props/coast/beach-chair-00.glb'],
  'beach-umbrella': ['models/props/coast/beach-umbrella-00.glb'],
  'bicycle': ['models/props/transport/bicycle-00.glb', 'models/props/transport/bicycle-01.glb'],
  'billboard': ['models/props/signage/billboard-00.glb'],
  'boulder-cluster': ['models/props/terrain/boulder-cluster-00.glb'],
  'broadleaf-tree': ['models/props/plants/broadleaf-tree-00.glb', 'models/props/plants/broadleaf-tree-01.glb'],
  'bucket': ['models/props/containers/bucket-00.glb'],
  'buoy': ['models/props/coast/buoy-00.glb'],
  'bush': ['models/props/plants/bush-00.glb', 'models/props/plants/bush-01.glb'],
  'cardboard-box': ['models/props/containers/cardboard-box-00.glb'],
  'cement-bag-stack': ['models/props/construction/cement-bag-stack-00.glb'],
  'cement-block-stack': ['models/props/construction/cement-block-stack-00.glb'],
  'cooler-box': ['models/props/containers/cooler-box-00.glb'],
  'draughts-table': ['models/props/leisure/draughts-table-00.glb'],
  'drum-set': ['models/props/leisure/drum-set-00.glb'],
  'electric-pole': ['models/props/utility/electric-pole-00.glb'],
  'fish-smoker': ['models/props/coast/fish-smoker-00.glb', 'models/props/coast/fish-smoker-01.glb'],
  'fishing-canoe': ['models/props/coast/fishing-canoe-00.glb', 'models/props/coast/fishing-canoe-01.glb'],
  'fishing-net-pile': ['models/props/coast/fishing-net-pile-00.glb'],
  'flag-pole': ['models/props/signage/flag-pole-00.glb'],
  'flower-bed': ['models/props/plants/flower-bed-00.glb'],
  'football-goal': ['models/props/leisure/football-goal-00.glb'],
  'gas-cylinder': ['models/props/containers/gas-cylinder-00.glb'],
  'generator': ['models/props/utility/generator-00.glb'],
  'grass-clump': ['models/props/plants/grass-clump-00.glb'],
  'hand-cart': ['models/props/transport/hand-cart-00.glb'],
  'hedge-block': ['models/props/plants/hedge-block-00.glb'],
  'jerrycan': ['models/props/containers/jerrycan-00.glb'],
  'jetty-post': ['models/props/coast/jetty-post-00.glb'],
  'ladder': ['models/props/construction/ladder-00.glb'],
  'laterite-chunk': ['models/props/terrain/laterite-chunk-00.glb'],
  'lifeguard-tower': ['models/props/coast/lifeguard-tower-00.glb'],
  'log': ['models/props/terrain/log-00.glb'],
  'ludo-table': ['models/props/leisure/ludo-table-00.glb'],
  'motorbike': ['models/props/transport/motorbike-00.glb'],
  'neon-box-sign': ['models/props/signage/neon-box-sign-00.glb'],
  'notice-board': ['models/props/signage/notice-board-00.glb'],
  'notice-kiosk': ['models/props/civic/notice-kiosk-00.glb'],
  'outboard-motor': ['models/props/coast/outboard-motor-00.glb'],
  'overhead-tank': ['models/props/utility/overhead-tank-00.glb'],
  'palm-tree': ['models/props/plants/palm-tree-00.glb', 'models/props/plants/palm-tree-01.glb'],
  'plank-pile': ['models/props/construction/plank-pile-00.glb'],
  'plantain-tree': ['models/props/plants/plantain-tree-00.glb'],
  'plastic-chair-stack': ['models/props/containers/plastic-chair-stack-00.glb'],
  'polytank': ['models/props/containers/polytank-00.glb'],
  'potted-plant': ['models/props/plants/potted-plant-00.glb'],
  'price-board': ['models/props/signage/price-board-00.glb'],
  'push-truck': ['models/props/transport/push-truck-00.glb'],
  'rebar-bundle': ['models/props/construction/rebar-bundle-00.glb'],
  'road-sign': ['models/props/signage/road-sign-00.glb'],
  'rock': ['models/props/terrain/rock-00.glb'],
  'sack-stack': ['models/props/containers/sack-stack-00.glb', 'models/props/containers/sack-stack-01.glb'],
  'sand-pile': ['models/props/terrain/sand-pile-00.glb'],
  'sandcrete-mixer': ['models/props/construction/sandcrete-mixer-00.glb'],
  'satellite-dish': ['models/props/utility/satellite-dish-00.glb'],
  'scaffold': ['models/props/construction/scaffold-00.glb'],
  'scooter': ['models/props/transport/scooter-00.glb'],
  'security-booth': ['models/props/civic/security-booth-00.glb'],
  'site-hoarding': ['models/props/construction/site-hoarding-00.glb'],
  'solar-panel': ['models/props/utility/solar-panel-00.glb'],
  'storage-bin': ['models/props/containers/storage-bin-00.glb'],
  'street-name-sign': ['models/props/signage/street-name-sign-00.glb'],
  'stump': ['models/props/terrain/stump-00.glb'],
  'swing-set': ['models/props/leisure/swing-set-00.glb'],
  'table-tennis-table': ['models/props/leisure/table-tennis-table-00.glb'],
  'ticket-booth': ['models/props/civic/ticket-booth-00.glb'],
  'traffic-cone': ['models/props/construction/traffic-cone-00.glb'],
  'transformer': ['models/props/utility/transformer-00.glb'],
  'tricycle-cargo': ['models/props/transport/tricycle-cargo-00.glb'],
  'water-pump': ['models/props/utility/water-pump-00.glb'],
  'wheel-tyre-stack': ['models/props/transport/wheel-tyre-stack-00.glb'],
  'wheelbarrow': ['models/props/construction/wheelbarrow-00.glb'],
}

/** resolved public URLs for the loader */
export const PROP_URLS: string[] = Object.values(PROP_KITS).flat().map(publicUrl)
