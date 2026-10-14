/**
 * UI layer barrel — Engine mounts the HUD in one line:
 *
 *   import { Hud } from '../ui';
 *   <Hud onAct={handleAct} />
 *
 * Tycoon overlay (G-009):
 *   import { TycoonHud } from '../ui';
 */

export { Hud } from './hud/Hud';
export type { HudProps } from './hud/Hud';
export { useCountdownNow } from './useTicker';
export { TycoonHud } from './tycoon/TycoonHud';
export type { TycoonHudProps, TycoonTab, AlertItem } from './tycoon/TycoonHud';
