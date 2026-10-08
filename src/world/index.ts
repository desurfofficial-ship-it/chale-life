/**
 * src/world — public surface.
 *
 * The engine mounts the whole starter block in one line:
 *
 *   import { StarterBlock } from '@/world';
 *   <StarterBlock />
 *
 * Colliders live at ./colliders (contract module, engine-importable).
 * Owned by Agent 3 (World & Art).
 */
export { StarterBlock } from './starter/StarterBlock';
export { colliders, worldBounds, type ColliderBox } from './colliders';
