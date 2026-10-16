'use client';
/**
 * B-001 — Places / Go-to list: every office, shop and restaurant.
 * Teleports the player to the door and frames the camera so the cutaway opens.
 */
import { useState, type CSSProperties } from 'react';
import { OFFICES } from '../../data/offices';
import { BUSINESSES } from '../../data/businesses';
import { isBusinessOpen } from '../../rules/business';
import { isOpen as isOfficeOpen } from '../../rules/office';
import { getAmbientHour } from '../../store/ambientClock';
import { requestTeleport, requestFrame } from '../../store/gameStore';
import { selectOffice } from '../../store/officeStore';
import { selectBusiness } from '../../store/businessStore';
import { DETAIL_ZOOM as OFFICE_ZOOM } from '../../world/office/OfficeBuilding';
import { DETAIL_ZOOM as BIZ_ZOOM } from '../../world/business/BusinessBuilding';

const sheet: CSSProperties = {
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 'calc(12px + env(safe-area-inset-bottom))',
  maxHeight: '50%',
  overflowY: 'auto',
  zIndex: 55,
  background: 'rgba(12,14,22,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 12,
  color: '#e8eef7',
  pointerEvents: 'auto',
  fontFamily: 'Inter, system-ui, sans-serif',
};

type Place =
  | { kind: 'office'; id: string; name: string; x: number; z: number; open: boolean }
  | { kind: 'business'; id: string; name: string; x: number; z: number; open: boolean; tag: string };

export function PlacesPanel() {
  const [open, setOpen] = useState(false);
  const hour = getAmbientHour();

  const places: Place[] = [
    ...OFFICES.map((o) => ({
      kind: 'office' as const,
      id: o.id,
      name: o.name,
      x: o.site.x,
      z: o.site.z,
      open: isOfficeOpen(o, hour),
    })),
    ...BUSINESSES.map((b) => ({
      kind: 'business' as const,
      id: b.id,
      name: b.name,
      x: b.site.x,
      z: b.site.z,
      open: isBusinessOpen(b, hour),
      tag: b.kind === 'restaurant' ? 'Eat' : 'Shop',
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const go = (p: Place) => {
    // door = front edge of footprint, approximate +Z
    requestTeleport(p.x, p.z + 4);
    requestFrame(p.x, p.z, Math.max(OFFICE_ZOOM, BIZ_ZOOM) + 2);
    if (p.kind === 'office') {
      selectBusiness(null);
      selectOffice(p.id);
    } else {
      selectOffice(null);
      selectBusiness(p.id);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        data-testid="places-open"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'absolute',
          right: 12,
          bottom: 'calc(96px + env(safe-area-inset-bottom))',
          zIndex: 50,
          pointerEvents: 'auto',
          border: '1px solid rgba(252,209,22,0.35)',
          background: 'rgba(9,13,22,0.9)',
          color: '#f5f7fb',
          borderRadius: 12,
          padding: '10px 14px',
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Places
      </button>
      {open ? (
        <div style={sheet} data-testid="places-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 900 }}>Places</div>
            <button type="button" onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {places.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(p)}
                style={{
                  textAlign: 'left',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  color: '#e8eef7',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {p.kind === 'office' ? 'Office' : (p as { tag: string }).tag} ·{' '}
                  <span style={{ color: p.open ? '#4ade80' : '#94a3b8' }}>{p.open ? 'Open' : 'Closed'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
