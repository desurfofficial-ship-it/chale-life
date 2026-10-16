'use client';
/**
 * B-001 — Mounts every world-run shop/restaurant and registers the sim
 * on the ambient step (no new useFrame).
 */
import { useEffect } from 'react';
import { BUSINESSES } from '../../data/businesses';
import { registerAmbient } from '../../engine/ambient';
import { tickBusinesses } from '../../store/businessStore';
import { getZoom, getState } from '../../store/gameStore';
import { BusinessBuilding } from './BusinessBuilding';

export function BusinessesLayer() {
  useEffect(
    () =>
      registerAmbient((dt) => {
        const p = getState().player.position;
        tickBusinesses(dt, undefined, { x: p.x, z: p.z });
      }),
    [],
  );
  return (
    <group name="b001-businesses">
      {BUSINESSES.map((b) => (
        <BusinessBuilding key={b.id} def={b} />
      ))}
    </group>
  );
}

// silence unused in some builds
void getZoom;
