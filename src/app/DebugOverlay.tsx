/**
 * ?debug=1 overlay — FPS / pos / draw calls + district fly-to tabs.
 * District jumps use LANDMARKS / DISTRICT_TABS from mapConfig (MapHUD data path).
 */

import { useMemo, useSyncExternalStore } from 'react';
import { getHud, subscribeHud, setPlayerPosition, publishHud } from '../store/gameStore';
import { DISTRICT_TABS, LANDMARKS } from '../lib/mapConfig';

function flyToDistrict(id: string | null) {
  if (!id) {
    // Full map — stay put, only recentre is via Recenter button
    return;
  }
  const lm = LANDMARKS.find((l) => l.id === id);
  if (!lm) return;
  // target is the look-at point on the ground; pos is camera framing
  const x = lm.target?.[0] ?? lm.pos[0];
  const z = lm.target?.[2] ?? lm.pos[2];
  setPlayerPosition(x, 0, z);
  publishHud({ ...getHud(), x, z });
}

export function DebugOverlay() {
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);
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
      <div>scr  {hud.screenX.toFixed(0)} / {hud.screenY.toFixed(0)}</div>
      <div>in   {hud.inputX.toFixed(2)} / {hud.inputZ.toFixed(2)}</div>
      <div>zoom {hud.zoom.toFixed(1)}</div>
      <div>dc   {hud.drawCalls}</div>
      <div className="debug-districts" style={{ marginTop: 6, maxWidth: 200 }}>
        {DISTRICT_TABS.slice(0, 8).map((t) => (
          <button
            key={t.id}
            type="button"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              fontSize: 9,
              padding: '2px 4px',
              marginBottom: 2,
              background: 'rgba(0,0,0,0.35)',
              color: '#fde047',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            onClick={() => flyToDistrict(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
