/**
 * src/world — public surface.
 *
 * The engine mounts the whole Accra map in one line:
 *
 *   import { AccraWorld } from '@/world';
 *   <AccraWorld />
 *
 * Colliders live at ./colliders (contract module, engine-importable) — the
 * captured Accra collider set (5,400+ boxes) + the 620 × 232 m plate bounds.
 * The old 60 × 60 m starter block was deleted when the Accra map (v6, with
 * the Task 15 community realism rounds) replaced it as the game's world.
 */
export { AccraWorld } from './accra/AccraWorld';
export { colliders, worldBounds, type ColliderBox } from './colliders';
