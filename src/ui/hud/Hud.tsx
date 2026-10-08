/**
 * Chalé Life HUD — the one overlay the player reads while walking Accra.
 *
 * CONTRACT (Task G-001):
 *  - Reads ONLY the existing store via `subscribe` — no window globals,
 *    no document.querySelector, no writes to the store, no rule wiring.
 *  - Because the store mutates its single state object in place and
 *    notifies listeners, every read uses a PRIMITIVE selector through
 *    useSyncExternalStore. The HUD can therefore never re-render more
 *    often than the store's notify rate — and each card re-renders only
 *    when its own value actually changed (a position-only notify costs
 *    the HUD nothing).
 *  - Look comes from salvage/ui/HUD.tsx (dark glass cards, yellow
 *    accent) — visual reference only, no salvage imports.
 *  - Phone-first: one-thumb reach (Act at the bottom, in the thumb
 *    zone), iPhone safe-area aware via env(safe-area-inset-*).
 *
 * Engine mounts this in one line:  import { Hud } from '../ui';
 */

import { useSyncExternalStore, type CSSProperties } from 'react';
import { getState, subscribe, type GameState } from '../../store/gameStore';
import { formatGHS } from '../../rules/economy';
import { objectiveFor } from '../../rules/jobs';
import { isLow, LOW_THRESHOLD } from '../../rules/needs';

export interface HudProps {
  /** Called by the Act button — the Engine decides what "Act" means. */
  onAct: () => void;
  /** Optional label override (defaults to the step verb or "Act"). */
  actLabel?: string;
}

// ── Store plumbing (subscribe-only) ─────────────────────────────────────────

function useStoreValue<T>(select: (state: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()));
}

// ── Look: dark glass + yellow accent (salvage/ui/HUD.tsx reference) ─────────

const GLASS: CSSProperties = {
  background: 'rgba(9,13,22,0.88)',
  border: '1px solid rgba(250,204,21,0.35)',
  borderRadius: 12,
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const YELLOW = '#facc15';
const MUTED = '#94a3b8';
const TEXT = '#e2e8f0';
const LOW_RED = '#f87171';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: MUTED,
};

/**
 * Clearance contract with the Engine's joystick (E-002 geometry, see
 * src/styles.css): on 390×844 the ring's bounding box is left 10 + 108 px
 * wide → right edge x = 118, top y = 722. The HUD root already pads 12 px,
 * so indenting the objective card's wrapper by 118 − 12 + 6 = 112 keeps its
 * left edge at x ≥ 124 — ≥ 6 px clear of the ring's top arc at any viewport
 * (G-001c, fixes PR #5 ISSUES #1). Do not shrink below 112.
 */
const JOYSTICK_CLEAR_PX = 112;

// ── Cards ────────────────────────────────────────────────────────────────────

function WalletCard() {
  const balance = useStoreValue((s) => s.wallet.balanceGHS);
  return (
    <div style={{ ...GLASS, padding: '8px 14px', display: 'inline-block' }}>
      <div style={labelStyle}>Wallet</div>
      <div
        style={{
          color: YELLOW,
          fontWeight: 800,
          fontSize: 22,
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatGHS(balance)}
      </div>
    </div>
  );
}

function NeedBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const low = isLow(value);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 30px', gap: 8, alignItems: 'center' }}>
      <span style={labelStyle}>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.14)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 999,
            background: low ? LOW_RED : YELLOW,
            transition: 'width 240ms linear, background 240ms linear',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: low ? LOW_RED : TEXT,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

function NeedsCard() {
  const hunger = useStoreValue((s) => s.needs.hunger);
  const energy = useStoreValue((s) => s.needs.energy);
  return (
    <div style={{ ...GLASS, padding: '10px 14px', display: 'grid', gap: 7, minWidth: 196 }}>
      <NeedBar label="Hunger" value={hunger} />
      <NeedBar label="Energy" value={energy} />
      {(isLow(hunger) || isLow(energy)) && (
        <div style={{ fontSize: 10, fontWeight: 700, color: LOW_RED, letterSpacing: '0.04em' }}>
          LOW — eat waakye / rest at the compound ({LOW_THRESHOLD}▼)
        </div>
      )}
    </div>
  );
}

function ObjectiveCard() {
  const activeId = useStoreValue((s) => s.job.activeId);
  const step = useStoreValue((s) => s.job.step);
  const objective = objectiveFor({ activeId, step });
  return (
    <div
      style={{
        ...GLASS,
        padding: '9px 14px',
        // 64vw / 300px cap (PR #5 ISSUES #1): keeps the card inside the
        // right-of-joystick zone on small phones and proportionate on desktop.
        maxWidth: 'min(64vw, 300px)',
        borderColor: objective ? 'rgba(250,204,21,0.55)' : 'rgba(250,204,21,0.35)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: objective ? YELLOW : MUTED,
          }}
        >
          {objective ? objective.tag : 'Chalé Life'}
        </span>
        {objective && (
          <span style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>{objective.title}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.35 }}>
        {objective ? objective.instruction : 'No job yet — find work at Aunty Ba’s waakye joint.'}
      </div>
    </div>
  );
}

// ── Act button (one-thumb zone) ─────────────────────────────────────────────

function ActButton({ onAct, actLabel }: { onAct: () => void; actLabel?: string }) {
  const activeId = useStoreValue((s) => s.job.activeId);
  const step = useStoreValue((s) => s.job.step);
  const objective = objectiveFor({ activeId, step });
  const label = actLabel ?? (objective ? objective.actionVerb : 'Act');
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onAct();
      }}
      style={{
        pointerEvents: 'auto',
        minWidth: 148,
        minHeight: 56,
        padding: '0 26px',
        borderRadius: 999,
        border: '1px solid rgba(250,204,21,0.65)',
        background: YELLOW,
        color: '#0a0f1a',
        fontSize: 17,
        fontWeight: 800,
        letterSpacing: '0.02em',
        fontFamily: FONT,
        boxShadow: '0 6px 20px rgba(250,204,21,0.28)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function Hud({ onAct, actLabel }: HudProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: FONT,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // iPhone safe-area aware: keep every element out of the notch,
        // rounded corners and the home-indicator swipe zone.
        padding:
          'calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top: wallet first, needs bars right under it */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <WalletCard />
        <NeedsCard />
      </div>

      {/* Bottom: objective line sits just above the thumb-zone Act button.
          The card is left-inset (JOYSTICK_CLEAR_PX) so its box never reaches
          over the joystick ring's top arc — measured 0 px² overlap on
          390×844 in G-001c; the Act pill keeps its own 3 px ring clearance. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            justifyContent: 'flex-start',
            paddingLeft: JOYSTICK_CLEAR_PX,
          }}
        >
          <ObjectiveCard />
        </div>
        <ActButton onAct={onAct} actLabel={actLabel} />
      </div>
    </div>
  );
}
