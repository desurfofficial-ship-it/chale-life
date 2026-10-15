'use client';

/**
 * W-008 living streets layer — traffic, walkers, lamps, horizon.
 * Mounted once in AccraWorld. Scenery raycasts disabled.
 */
import { StreetTraffic } from './StreetTraffic';
import { StreetWalkers } from './StreetWalkers';
import { HorizonSilhouette } from './HorizonSilhouette';
import { StreetLamps } from './StreetLamps';

export function StreetLifeLayer({ hour = 12 }: { hour?: number }) {
  return (
    <group name="w008-street-life">
      <HorizonSilhouette />
      <StreetLamps hour={hour} />
      <StreetTraffic />
      <StreetWalkers />
    </group>
  );
}

export { StreetTraffic, StreetWalkers, HorizonSilhouette, StreetLamps };
