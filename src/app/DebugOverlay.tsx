/**
 * Debug overlay — mounted only when the URL has ?debug=1. Shows FPS, player
 * position, the merged input vector, zoom and the renderer's draw-call count,
 * refreshed from the throttled HUD channel (≤10 Hz), never from per-frame
 * state. Parked BELOW the HUD's top-left wallet/needs cards so the numbers
 * stay readable on a 390 × 844 phone viewport.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { getHud, subscribeHud } from '../store/gameStore';

export function DebugOverlay() {
  const hud = useSyncExternalStore(subscribeHud, getHud);
  const enabled = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === '1',
    [],
  );

  if (!enabled) return null;

  return (
    <div className="debug-overlay" aria-hidden="true">
      <div>fps  {hud.fps.toFixed(0)}</div>
      <div>pos  {hud.x.toFixed(2)} / {hud.z.toFixed(2)}</div>
      <div>in   {hud.inputX.toFixed(2)} / {hud.inputZ.toFixed(2)}</div>
      <div>zoom {hud.zoom.toFixed(1)}</div>
      <div>dc   {hud.drawCalls}</div>
    </div>
  );
}
