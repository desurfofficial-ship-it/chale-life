/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk.
 *
 * L-001: passes hour + weather into AccraWorld for the day/night cycle.
 * Tycoon mode uses the tycoon clock; walking mode uses ambientClock
 * (starts 09:00, 1 real min = 10 game min). ?hour= and ?weather= override.
 */

import { Suspense, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { getTycoonState, subscribeTycoon } from '../store/tycoonStore';
import { getWorldTime, subscribeWorldTime, tickAmbientClock } from '../store/ambientClock';
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
import type { WeatherKind } from '../components/scene/dayCycle';

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

/** Resolve display hour/weather for the world (tycoon clock or ambient). */
function useWorldTime(tycoon: TycoonWorldProps | null): { hour: number; weather: WeatherKind } {
  // Ambient hour/weather live in an external store that only emits when the
  // lighting bucket (quarter game-hour) or weather changes — the world tree
  // no longer re-renders on a 2 s timer. URL ?hour/?weather are parsed once
  // at module load inside ambientClock (its init()).
  const ambient = useSyncExternalStore(
    subscribeWorldTime,
    getWorldTime,
    getWorldTime,
  );
  if (tycoon) {
    const w = tycoon.weather;
    const weather: WeatherKind =
      w === 'rain' || w === 'cloudy' ? w : 'clear';
    return { hour: tycoon.hour, weather };
  }
  return ambient;
}

function AmbientTick() {
  useFrame((_, dt) => {
    tickAmbientClock(dt);
  });
  return null;
}

export default function GameCanvas() {
  const snap = useTycoonSnapshot();
  const tycoon = toProps(snap);
  const onboarding = isOnboardingActive();
  const start = STOPS[0];
  const worldTime = useWorldTime(tycoon);
  // Intro is written as dusk ("starts tonight") — pin hour so night void isn't pure black
  const hour = onboarding ? 18.4 : worldTime.hour;
  const weather = onboarding ? 'clear' : worldTime.weather;

  return (
    <Canvas
      orthographic={!onboarding}
      shadows="percentage"
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer:
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('e2e') === '1',
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
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
      {!onboarding && <AmbientTick />}
      <Suspense fallback={null}>
        <AccraWorld
          tycoon={onboarding ? null : tycoon}
          hour={hour}
          weather={weather}
        />
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
