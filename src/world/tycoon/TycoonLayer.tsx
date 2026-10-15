'use client';

import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { TycoonWorldProps } from './types';
import { PlotMarkers } from './PlotMarkers';
import { BusinessShells } from './BusinessShell';
import { InstancedFurniture } from './InstancedFurniture';
import { InstancedPeople } from './InstancedPeople';
import { MoneyPops } from './MoneyPops';
import { TycoonWeatherFX } from './TycoonWeather';
import { lastDetailLod } from '../../engine/CameraRig';
import type { DetailLod } from '../../engine/zoomFit';

/**
 * Tycoon world overlay (W-007 + C-001 LOD).
 * overview: shells + plot rings + label chips only
 * mid: + people (low)
 * full: furniture, people, money pops
 */
export function TycoonLayer(props: TycoonWorldProps) {
  const openBiz = props.businesses.filter((b) => b.open);
  const [lod, setLod] = useState<DetailLod>('full');

  useFrame(() => {
    if (lastDetailLod !== lod) setLod(lastDetailLod);
  });

  return (
    <group name="tycoon-layer">
      <TycoonWeatherFX weather={props.weather} hour={props.hour} />
      <PlotMarkers ownedPlotIds={props.ownedPlotIds} selectedPlotId={props.selectedPlotId} />
      <BusinessShells businesses={openBiz} hour={props.hour} />
      {lod !== 'overview' ? <InstancedPeople businesses={openBiz} /> : null}
      {lod === 'full' ? (
        <>
          <InstancedFurniture businesses={openBiz} />
          <MoneyPops businesses={openBiz} />
        </>
      ) : null}
    </group>
  );
}

export type { TycoonWorldProps, TycoonBusinessView, TycoonWeather } from './types';
