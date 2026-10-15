/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk.
 *
 * Play mode: orthographic follow cam + Player + objective marker.
 * Onboarding (first visit or ?onboarding=1): perspective cinematic cam;
 * Gyan house is already dressed by Jamestown via isOnboardingActive().
 */

import { Suspense, useSyncExternalStore } from 'react';
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
import {
  isOnboardingActive,
  OnboardingCamera,
  STOPS,
} from '../onboarding/Onboarding';

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
  const onboarding = isOnboardingActive();
  const start = STOPS[0];

  return (
    <Canvas
      orthographic={!onboarding}
      shadows="percentage"
      dpr={[1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={
        onboarding
          ? {
              fov: 40,
              position: start.pos,
              near: 0.5,
              far: 900,
            }
          : {
              position: [0, 60, 60],
              zoom: INITIAL_ZOOM,
              near: 0.1,
              far: 900,
            }
      }
      style={{ position: 'absolute', inset: 0 }}
    >
      <GameLoop />
      <Suspense fallback={null}>
        <AccraWorld tycoon={onboarding ? null : tycoon} />
      </Suspense>
      {onboarding ? (
        <OnboardingCamera />
      ) : (
        <>
          <Player />
          <ObjectiveMarker />
          <CameraRig />
        </>
      )}
    </Canvas>
  );
}
