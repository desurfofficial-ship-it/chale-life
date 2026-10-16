/**
 * O-002 — "Offices" HUD chip + Go-to list (walk mode).
 *
 * The six world-run offices were in the build but nothing pointed at them.
 * This chip opens a short list (nearest first, open/closed, Hiring badge);
 * "Go" teleports the walker to the office's front door, opens its cutaway
 * + office card, and frames the camera on it.
 */
import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { findOffice } from '../../data/offices';
import { isOpen } from '../../rules/office';
import { getState, requestFrame, requestTeleport, subscribe } from '../../store/gameStore';
import { currentHour, selectOffice, setViewFloor } from '../../store/officeStore';
import { goToOffice, officesByDistance } from '../../world/office/officeNav';

const GLASS: CSSProperties = {
  background: 'rgba(9,13,22,0.88)',
  border: '1px solid rgba(250,204,21,0.35)',
  borderRadius: 12,
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const YELLOW = '#facc15';

function usePlayerXZ(): { x: number; z: number } {
  // coarse (5 m) snapshot so walking doesn't re-render the HUD every frame
  const key = useSyncExternalStore(subscribe, () => {
    const p = getState().player.position;
    return `${Math.round(p.x / 5)}|${Math.round(p.z / 5)}`;
  });
  const [gx, gz] = key.split('|').map(Number);
  return { x: gx * 5, z: gz * 5 };
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function travelToOffice(id: string): void {
  goToOffice(id, {
    teleport: requestTeleport,
    frame: requestFrame,
    select: (officeId) => {
      setViewFloor(officeId, 0);
      selectOffice(officeId);
    },
  });
}

export function OfficesMenu() {
  const [open, setOpen] = useState(false);
  const p = usePlayerXZ();
  const list = officesByDistance(p.x, p.z);
  const hour = currentHour();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', pointerEvents: 'auto' }}>
      <button
        type="button"
        data-testid="hud-offices-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...GLASS,
          cursor: 'pointer',
          padding: '8px 12px',
          color: TEXT,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          touchAction: 'manipulation',
          minHeight: 36,
        }}
      >
        <span
          style={{
            background: '#5b3cc4',
            color: '#fff',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          OFFICES
        </span>
        <span style={{ color: MUTED, fontWeight: 700 }}>{open ? 'Close' : `${list.length} nearby`}</span>
      </button>
      {open ? (
        <div
          data-testid="offices-list"
          role="list"
          style={{
            ...GLASS,
            padding: 6,
            width: 'min(78vw, 300px)',
            maxHeight: '46vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {list.map((e) => {
            const def = findOffice(e.id)!;
            const openNow = isOpen(def, hour);
            return (
              <div
                key={e.id}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 9,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: def.facade.signBg, flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {def.name}
                  </div>
                  <div style={{ color: MUTED, fontSize: 11, display: 'flex', gap: 6 }}>
                    <span>{fmtDistance(e.distanceM)}</span>
                    <span style={{ color: openNow ? '#4ade80' : MUTED }}>{openNow ? 'Open' : 'Closed'}</span>
                    {def.ownership === 'employer' ? <span style={{ color: YELLOW }}>Hiring</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid={`offices-go-${e.id}`}
                  onClick={() => {
                    travelToOffice(e.id);
                    setOpen(false);
                  }}
                  style={{
                    border: 'none',
                    borderRadius: 9,
                    padding: '7px 12px',
                    background: YELLOW,
                    color: '#1a1a1a',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  Go
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
