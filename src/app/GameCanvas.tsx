/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk.
 *
 * E-010: when tycoonMode is on, pass live store businesses into AccraWorld.
 * ?tycoonDemo=1 still fakes four opens if the store is empty (W-007 harness).
 * Store imports here are fine — this chunk already loads after first paint.
 */

import { useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { getTycoonState, subscribeTycoon } from '../store/tycoonStore';
import { AccraWorld } from '../world';
import {
  buildTycoonDemoProps,
  type TycoonBusinessView,
  type TycoonWorldProps,
} from '../world/tycoon';
import { findBusinessType } from '../data/businesses';

/** Module-level so money pops fire once per revenue increase, not every frame. */
const prevRevenueToday = new Map<string, number>();

function useTycoonSnapshot(): ReturnType<typeof getTycoonState> {
  return useSyncExternalStore(subscribeTycoon, getTycoonState, getTycoonState);
}

function toProps(s: ReturnType<typeof getTycoonState>): TycoonWorldProps | null {
  if (!s.tycoonMode) {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('tycoonDemo') === '1'
    ) {
      return buildTycoonDemoProps();
    }
    return null;
  }

  const businesses: TycoonBusinessView[] = s.businesses.map((b) => {
    const type = findBusinessType(b.typeId);
    return {
      id: b.id,
      plotId: b.plotId,
      typeId: b.typeId,
      category: type?.category ?? 'services',
      layout: b.layout,
      open: b.open,
      customersVisible: Math.min(8, Math.floor(b.customersToday / 4)),
      staff: b.staff,
      lastSaleGHS: (() => {
        const prev = prevRevenueToday.get(b.id) ?? 0;
        const delta = b.revenueToday - prev;
        prevRevenueToday.set(b.id, b.revenueToday);
        return delta > 0 ? Math.round(delta * 100) / 100 : 0;
      })(),
    };
  });

  if (
    businesses.length === 0 &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('tycoonDemo') === '1'
  ) {
    return buildTycoonDemoProps();
  }

  return {
    ownedPlotIds: s.ownedPlotIds,
    businesses,
    weather: s.weather,
    hour: Math.floor(s.clock.minutes / 60),
    selectedPlotId: s.selectedPlotId,
  };
}

export default function GameCanvas() {
  const snap = useTycoonSnapshot();
  const tycoon = toProps(snap);

  return (
    <Canvas
      orthographic
      shadows="percentage"
      dpr={[1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 60, 60], zoom: INITIAL_ZOOM, near: 0.1, far: 900 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <GameLoop />
      <AccraWorld tycoon={tycoon} />
      <Player />
      <ObjectiveMarker />
      <CameraRig />
    </Canvas>
  );
}
