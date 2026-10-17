'use client';

/**
 * Touch-first furniture layout editor for player-owned tycoon businesses.
 * Uses existing requestMove/Rotate/Remove + room bounds from rules/business.
 * No desktop-only drag-and-drop — N/E/S/W tiles + rotate + remove.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { findFurnitureById } from '../../data/furniture';
import { findBusinessType } from '../../data/businesses';
import { LAND_PLOTS } from '@/lib/mapConfig';
import type { BusinessState } from '../../rules/business';
import {
  requestMoveFurniture,
  requestRotateFurniture,
  requestRemoveFurniture,
  setFurnitureEditBusinessId,
} from '../../store/tycoonStore';

const FOREST = '#0d7a45';
const CREAM = '#f7f1e6';
const INK = '#1a1a1a';
const MUTED = '#6b7280';
const DANGER = '#b91c1c';

const sheet: CSSProperties = {
  position: 'absolute',
  left: 10,
  right: 10,
  bottom: 'calc(72px + env(safe-area-inset-bottom))',
  maxHeight: '52%',
  overflowY: 'auto',
  zIndex: 58,
  background: 'rgba(247,241,230,0.97)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 16,
  padding: 12,
  color: INK,
  pointerEvents: 'auto',
  fontFamily: 'Inter, system-ui, sans-serif',
  WebkitOverflowScrolling: 'touch',
};

const btn: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.12)',
  background: CREAM,
  color: INK,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const btnPrimary: CSSProperties = {
  ...btn,
  background: FOREST,
  color: CREAM,
  border: 'none',
  flex: 1,
};

function plotTiles(plotId: string): { w: number; d: number } {
  const p = LAND_PLOTS.find((x) => x.id === plotId);
  if (!p) return { w: 6, d: 5 };
  return { w: Math.max(3, Math.floor(p.w)), d: Math.max(3, Math.floor(p.d)) };
}

export function FurnitureEditPanel({ business }: { business: BusinessState }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    business.layout[0]?.id ?? null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const tiles = useMemo(() => plotTiles(business.plotId), [business.plotId]);
  const typeName = findBusinessType(business.typeId)?.name ?? business.typeId.replace(/_/g, ' ');
  const selected = business.layout.find((p) => p.id === selectedId) ?? null;

  const tryMove = (dtx: number, dtz: number) => {
    if (!selected) return;
    const ok = requestMoveFurniture(
      business.id,
      selected.id,
      selected.tx + dtx,
      selected.tz + dtz,
      tiles,
    );
    setConfirmRemove(false);
    setFeedback(ok ? null : 'Cannot place there — outside the room or tile taken.');
  };

  const tryRotate = () => {
    if (!selected) return;
    const next = ((selected.rot + 90) % 360) as 0 | 90 | 180 | 270;
    const ok = requestRotateFurniture(business.id, selected.id, next);
    setFeedback(ok ? null : 'Could not rotate.');
  };

  const tryRemove = () => {
    if (!selected) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      setFeedback('Tap Remove again to confirm.');
      return;
    }
    const ok = requestRemoveFurniture(business.id, selected.id);
    setConfirmRemove(false);
    if (ok) {
      setSelectedId(null);
      setFeedback('Removed. Layout saved.');
    } else {
      setFeedback('Could not remove.');
    }
  };

  return (
    <div style={sheet} data-testid="furniture-edit-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Edit furniture</div>
          <div style={{ fontSize: 12, color: MUTED }}>{typeName}</div>
        </div>
        <button
          type="button"
          style={{ ...btn, background: FOREST, color: CREAM, border: 'none' }}
          onClick={() => setFurnitureEditBusinessId(null)}
          data-testid="furniture-edit-done"
        >
          Done
        </button>
      </div>

      <p style={{ fontSize: 12, color: MUTED, margin: '8px 0' }}>
        Select a piece, then move or rotate. Layout saves automatically.
      </p>

      <div style={{ display: 'grid', gap: 6, marginBottom: 10, maxHeight: 120, overflowY: 'auto' }}>
        {business.layout.length === 0 && (
          <div style={{ fontSize: 13, color: MUTED }}>No furniture placed.</div>
        )}
        {business.layout.map((p) => {
          const title = findFurnitureById(p.furnitureId)?.title ?? p.furnitureId;
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedId(p.id);
                setConfirmRemove(false);
                setFeedback(null);
              }}
              style={{
                ...btn,
                textAlign: 'left',
                background: active ? FOREST : CREAM,
                color: active ? CREAM : INK,
                borderColor: active ? FOREST : 'rgba(0,0,0,0.12)',
              }}
              data-testid={`furniture-item-${p.id}`}
            >
              {title}
              <span style={{ opacity: 0.8, fontWeight: 500, fontSize: 12 }}>
                {' '}
                · tile {p.tx},{p.tz} · {p.rot}°
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 10 }} data-testid="furniture-tile-grid">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
          Tap a free tile to move the selected piece (N/E/S/W still work).
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tiles.w}, 28px)`,
            gap: 3,
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: tiles.d }, (_, tz) =>
            Array.from({ length: tiles.w }, (_, tx) => {
              const occ = business.layout.find((p) => p.tx === tx && p.tz === tz);
              const isSel = selected != null && occ?.id === selected.id;
              const edge = tx === 0 || tz === 0 || tx === tiles.w - 1 || tz === tiles.d - 1;
              return (
                <button
                  key={`${tx}-${tz}`}
                  type="button"
                  disabled={edge}
                  aria-label={`Tile ${tx},${tz}`}
                  onClick={() => {
                    if (!selected || edge) return;
                    const ok = requestMoveFurniture(business.id, selected.id, tx, tz, tiles);
                    setConfirmRemove(false);
                    setFeedback(ok ? null : 'Cannot place there — outside the room or tile taken.');
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    border: isSel ? `2px solid ${FOREST}` : '1px solid rgba(0,0,0,0.12)',
                    background: edge
                      ? '#d4d4d8'
                      : isSel
                        ? FOREST
                        : occ
                          ? '#a8a29e'
                          : CREAM,
                    padding: 0,
                    cursor: edge ? 'default' : 'pointer',
                  }}
                />
              );
            }),
          )}
        </div>
      </div>

      {selected && (
        <div data-testid="furniture-edit-controls">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 44px 44px',
              gridTemplateRows: '44px 44px 44px',
              gap: 6,
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <span />
            <button type="button" style={btn} onClick={() => tryMove(0, -1)} aria-label="Move north">
              N
            </button>
            <span />
            <button type="button" style={btn} onClick={() => tryMove(-1, 0)} aria-label="Move west">
              W
            </button>
            <button type="button" style={btn} onClick={() => tryMove(0, 1)} aria-label="Move south">
              S
            </button>
            <button type="button" style={btn} onClick={() => tryMove(1, 0)} aria-label="Move east">
              E
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={btnPrimary} onClick={tryRotate} data-testid="furniture-rotate">
              Rotate 90°
            </button>
            <button
              type="button"
              style={{
                ...btn,
                flex: 1,
                background: confirmRemove ? DANGER : CREAM,
                color: confirmRemove ? '#fff' : DANGER,
                borderColor: DANGER,
              }}
              onClick={tryRemove}
              data-testid="furniture-remove"
            >
              {confirmRemove ? 'Confirm remove' : 'Remove'}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          data-testid="furniture-edit-feedback"
          style={{
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: feedback.includes('Cannot') || feedback.includes('Could')
              ? 'rgba(185,28,28,0.1)'
              : 'rgba(13,122,69,0.12)',
            color: feedback.includes('Cannot') || feedback.includes('Could') ? DANGER : FOREST,
            fontSize: 13,
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
