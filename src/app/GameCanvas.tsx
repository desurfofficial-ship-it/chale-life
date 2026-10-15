/**
 * GameCanvas — the 3D world subtree, code-split out of the main chunk.
 *
 * L-001: passes hour + weather into AccraWorld for the day/night cycle.
 * Tycoon mode uses the tycoon clock; walking mode uses ambientClock
 * (starts 09:00, 1 real min = 10 game min). ?hour= and ?weather= override.
 */

import { Suspense, useSyncExternalStore, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraRig } from '../engine/CameraRig';
import { GameLoop } from '../engine/GameLoop';
import { ObjectiveMarker } from '../engine/ObjectiveMarker';
import { Player } from '../player/Player';
import { INITIAL_ZOOM } from '../store/gameStore';
import { getTycoonState, subscribeTycoon } from '../store/tycoonStore';
import {
  getAmbientHour,
  getAmbientWeather,
  tickAmbientClock,
} from '../store/ambientClock';
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

  // MoneyPops derives the per-window sale delta itself from the CUMULATIVE
  // revenueToday (see the dedupe note there) — computing it here used to
  // mutate a module map during render, which double-invoked renders would
  // read twice (dropping every pop under StrictMode/concurrent discards).
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
      revenueToday: b.revenueToday,
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
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      // NO clock tick here — AmbientTick (per-frame, dt-clamped) owns the
      // ambient clock. This loop ticked it too, double-counting ~1.7 % of
      // ambient time. It only refreshes the RESOLVED hour so the walking-
      // mode sky moves without a store commit to piggyback on.
      setTick((n) => n + 1);
      id = window.setTimeout(loop, 2000); // UI hour changes slowly
    };
    id = window.setTimeout(loop, 2000);
    return () => clearTimeout(id);
  }, []);
  void tick;

  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    const h = q.get('hour');
    if (h != null && h !== '' && Number.isFinite(Number(h))) {
      const weather = (q.get('weather') as WeatherKind) || getAmbientWeather();
      return { hour: Number(h), weather: weather === 'rain' || weather === 'cloudy' ? weather : 'clear' };
    }
  }
  if (tycoon) {
    const w = tycoon.weather;
    const weather: WeatherKind =
      w === 'rain' || w === 'cloudy' ? w : 'clear';
    return { hour: tycoon.hour, weather };
  }
  return { hour: getAmbientHour(), weather: getAmbientWeather() };
}

function AmbientTick() {
  useFrame((_, dt) => {
    // Clamp — useFrame's dt is the RAW frame delta; after a tab switch it
    // can be the whole hidden duration, fast-forwarding the sky clock.
    tickAmbientClock(Math.min(dt, 2));
  });
  return null;
}

export default function GameCanvas() {
  const snap = useTycoonSnapshot();
  const tycoon = toProps(snap);
  const onboarding = isOnboardingActive();
  const start = STOPS[0];
  const { hour, weather } = useWorldTime(tycoon);

  return (
    <Canvas
      orthographic={!onboarding}
      shadows="percentage"
      dpr={[1, 1.25]}
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
