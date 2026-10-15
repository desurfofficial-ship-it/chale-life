/**
 * Right-hand camera rail (C-001): + − rotate fit-city fit-businesses.
 * Presentation only — callbacks from Engine.
 */

import type { CSSProperties } from 'react';

const rail: CSSProperties = {
  position: 'absolute',
  right: 10,
  top: '28%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 35,
  pointerEvents: 'auto',
};

const btn: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.12)',
  background: 'rgba(245,240,230,0.94)',
  color: '#1a1a1a',
  fontWeight: 800,
  fontSize: 16,
  cursor: 'pointer',
  touchAction: 'manipulation',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

export interface CameraRailProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onFitCity: () => void;
  onFitBusinesses: () => void;
}

export function CameraRail({
  onZoomIn,
  onZoomOut,
  onRotate,
  onFitCity,
  onFitBusinesses,
}: CameraRailProps) {
  return (
    <div style={rail} aria-label="Camera controls">
      <button type="button" style={btn} onClick={onZoomIn} aria-label="Zoom in">
        +
      </button>
      <button type="button" style={btn} onClick={onZoomOut} aria-label="Zoom out">
        −
      </button>
      <button type="button" style={btn} onClick={onRotate} aria-label="Rotate 90 degrees">
        ↻
      </button>
      <button type="button" style={{ ...btn, fontSize: 11 }} onClick={onFitCity} aria-label="Fit city">
        Map
      </button>
      <button
        type="button"
        style={{ ...btn, fontSize: 10 }}
        onClick={onFitBusinesses}
        aria-label="Fit my businesses"
      >
        Mine
      </button>
    </div>
  );
}
