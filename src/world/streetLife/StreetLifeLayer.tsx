'use client';

/**
 * W-008 street life — lamps + horizon only for now.
 * Box-car traffic and capsule walkers removed (looked unfinished).
 * Proper GLB fleet + CommunityLife NPCs remain in district modules.
 */
import { HorizonSilhouette } from './HorizonSilhouette';
import { StreetLamps } from './StreetLamps';

export function StreetLifeLayer({ hour = 12 }: { hour?: number }) {
  return (
    <group name="w008-street-life">
      <HorizonSilhouette />
      <StreetLamps hour={hour} />
      {/* StreetTraffic / StreetWalkers intentionally offline until models polish */}
    </group>
  );
}

export { HorizonSilhouette, StreetLamps };
