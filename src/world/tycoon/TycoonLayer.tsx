'use client';

import { useMemo } from 'react';
import type { TycoonWorldProps } from './types';
import { PlotMarkers } from './PlotMarkers';
import { BusinessShells } from './BusinessShell';
import { InstancedFurniture } from './InstancedFurniture';
import { InstancedPeople } from './InstancedPeople';
import { MoneyPops } from './MoneyPops';
import { TycoonWeatherFX } from './TycoonWeather';

/**
 * Tycoon world overlay (W-007). Presentation only — props from Engine / demo.
 */
export function TycoonLayer(props: TycoonWorldProps) {
  // Memo the open-business filter — a fresh array identity every render
  // (and the 2 s ambient ticker re-renders GameCanvas) defeated every
  // child's useMemo([businesses]) below.
  const openBiz = useMemo(
    () => props.businesses.filter((b) => b.open),
    [props.businesses],
  );

  return (
    <group name="tycoon-layer">
      <TycoonWeatherFX weather={props.weather} hour={props.hour} />
      <PlotMarkers ownedPlotIds={props.ownedPlotIds} selectedPlotId={props.selectedPlotId} />
      <BusinessShells businesses={openBiz} hour={props.hour} />
      <InstancedFurniture businesses={openBiz} />
      <InstancedPeople businesses={openBiz} />
      <MoneyPops businesses={openBiz} />
    </group>
  );
}

export type { TycoonWorldProps, TycoonBusinessView, TycoonWeather } from './types';
