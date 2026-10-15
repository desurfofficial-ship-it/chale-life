'use client';

/**
 * Soft highlight rings + tappable hit planes for every LAND_PLOTS entry.
 * Emits plotSelected via worldEvents — no store imports.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LAND_PLOTS } from '@/lib/mapConfig';
import { emitWorldEvent } from './worldEvents';

const RING = '#c4a035'; // mustard
const RING_OWNED = '#2d5a3d'; // forest
const RING_SELECTED = '#a03c2e'; // brick

export function PlotMarkers({
  ownedPlotIds,
  selectedPlotId,
}: {
  ownedPlotIds: readonly string[];
  selectedPlotId?: string | null;
}) {
  const owned = useMemo(() => new Set(ownedPlotIds), [ownedPlotIds]);

  return (
    <group name="tycoon-plot-markers">
      {LAND_PLOTS.map((p, i) => {
        const id = p.id ?? `plot-${i}`;
        const isOwned = owned.has(id);
        const isSel = selectedPlotId === id;
        const color = isSel ? RING_SELECTED : isOwned ? RING_OWNED : RING;
        const y = (p.y ?? 0) + 0.04;
        return (
          <group key={id} position={[p.x, y, p.z]} name={`plot-marker:${id}`}>
            {/* soft ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} userData={{ noCollide: true }}>
              <ringGeometry args={[Math.min(p.w, p.d) * 0.42, Math.min(p.w, p.d) * 0.5, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSel ? 0.85 : 0.45}
                depthWrite={false}
              />
            </mesh>
            {/* invisible hit plane for pointer — onClick only: R3F already
                synthesizes it after pointerdown+up on the same object; the
                extra onPointerDown fired EVERY tap twice */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, 0]}
              userData={{ noCollide: true, plotId: id }}
              onClick={(e) => {
                e.stopPropagation();
                emitWorldEvent('plotSelected', { plotId: id });
              }}
            >
              <planeGeometry args={[p.w * 0.95, p.d * 0.95]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
