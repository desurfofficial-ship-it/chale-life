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
 *  - G-002: the Engine drives the Act button through props —
 *    `actEnabled` (grey the button out) and `toast` (a ~2 s message
 *    above Act) come from rules/act.ts actPromptFor/resolveAct via E-003.
 *
 * Engine mounts this in one line:  import { Hud } from '../ui';
 */

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { getState, subscribe, type GameState } from '../../store/gameStore';
import { formatGHS } from '../../rules/economy';
import { idleObjectiveFor, objectiveFor } from '../../rules/jobs';
import { isLow, lowNeedsHints, LOW_THRESHOLD } from '../../rules/needs';

export interface HudProps {
  /** Called by the Act button — the Engine decides what "Act" means. */
  onAct: () => void;
  /** Optional label override (defaults to the step verb or "Act"). */
  actLabel?: string;
  /** false greys the Act button out (Engine computed actPromptFor). */
  actEnabled?: boolean;
  /**
   * Why the Act button is disabled right now (G-008b item 6) — the rules'
   * ActPrompt.reason (canWork/unmet-requirement wording), shown under Act.
   */
  actReason?: string | null;
  /** Transient message shown above Act for ~2 s (resolveAct toast). */
  toast?: string | null;
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
 * src/styles.css): the ring's bounding box is left 10 + 108 px wide →
 * right edge x = 118. G-001c used that number to left-inset the objective
 * card (left edge ≥ 124 — ≥ 6 px clear of the ring's top arc). G-008d
 * item 6 moved the Act pill itself to the BOTTOM-RIGHT thumb zone (the
 * centred pill and its centred reason line used to cross the ring on
 * narrow phones), so the card keeps the left inset and the pill keeps
 * this one. Do not shrink below 112.
 */
const JOYSTICK_CLEAR_PX = 112;

/**
 * G-008d item 6 geometry: the Act pill hugs the BOTTOM-RIGHT thumb zone
 * — its right edge lands at 16px + safe-area-inset-right (the HUD root
 * pads 12px + safe-right, so the right stack takes marginRight 4px), and
 * its bottom aligns with the joystick (the ring sits at bottom
 * 14px + safe-area-inset-bottom; the root pads 12px + safe-bottom, so the
 * bottom group takes paddingBottom 2px). The reason line rides ABOVE the
 * pill, right-aligned, capped at 100vw − (joystick right edge 118px) −
 * 32px — it can never reach the ring's x-band on any viewport, and being
 * in-flow it can never collide with the objective card above it. Pinned
 * by the actLayout e2e spec at 360×780 / 375×667 / 390×844.
 */
const ACT_STACK_MARGIN_RIGHT_PX = 4;
const ACT_REASON_MAX_WIDTH = 'calc(100vw - 150px)';

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
  // G-008b item 5: the hints are a pure, unit-tested rules helper —
  // hungry → "eat waakye", low energy → "LOW ENERGY — sleep at the
  // compound" (both lines when both stats are low).
  const hints = lowNeedsHints({ hunger, energy });
  return (
    <div style={{ ...GLASS, padding: '10px 14px', display: 'grid', gap: 7, minWidth: 196 }}>
      <NeedBar label="Hunger" value={hunger} />
      <NeedBar label="Energy" value={energy} />
      {hints.map((hint) => (
        <div key={hint} style={{ fontSize: 10, fontWeight: 700, color: LOW_RED, letterSpacing: '0.04em' }}>
          {hint}
        </div>
      ))}
    </div>
  );
}

function ObjectiveCard() {
  const activeId = useStoreValue((s) => s.job.activeId);
  const step = useStoreValue((s) => s.job.step);
  // E-004 store slice carries the run history (reference replaced, never
  // mutated — a safe useSyncExternalStore snapshot).
  const completedIds = useStoreValue((s) => s.job.completedIds);
  // G-008e: the cooldown rest line counts from the payout stamp — the
  // card reads it with the UI's wall clock (the store owns Date.now()
  // at its boundary too; the rules stay pure data-in/data-out).
  const lastPayoutAt = useStoreValue((s) => s.job.lastPayoutAt);
  const hunger = useStoreValue((s) => s.needs.hunger);
  const energy = useStoreValue((s) => s.needs.energy);
  const objective = objectiveFor({ activeId, step, completedIds });
  // G-005: the idle line is a pure rules helper — Daavi-aware and
  // completedIds-aware (fresh guest vs. hungry-after-the-hustle nudge).
  // G-006: it is also needs-aware — low energy swaps the line for the
  // sleep hint (unless hunger needs the waakye nudge more). G-008e: it
  // now reads the job cooldown, so a paid guest sees "Daavi needs you
  // again in Ns" instead of a work line the button would refuse.
  const idleLine = idleObjectiveFor(
    { activeId, step, completedIds, lastPayoutAt },
    { hunger, energy },
    Date.now()
  );
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
        {objective ? objective.instruction : idleLine}
      </div>
    </div>
  );
}

// ── Act button (one-thumb zone) ─────────────────────────────────────────────

/** How long a toast stays up (G-002: "about 2 s"). */
const TOAST_MS = 2000;

function ActButton({
  onAct,
  actLabel,
  enabled,
  reason,
}: {
  onAct: () => void;
  actLabel?: string;
  enabled: boolean;
  reason?: string | null;
}) {
  const activeId = useStoreValue((s) => s.job.activeId);
  const step = useStoreValue((s) => s.job.step);
  const objective = objectiveFor({ activeId, step });
  const label = actLabel ?? (objective ? objective.actionVerb : 'Act');
  // G-008d item 6: the pill lives in the bottom-RIGHT thumb zone (the
  // root's flex column right-aligns this stack; see the geometry note
  // above); the reason line sits ABOVE the pill, right-aligned,
  // width-capped off the joystick ring. The grid is justify-items: end so
  // both boxes hug the right edge.
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        marginRight: ACT_STACK_MARGIN_RIGHT_PX,
        display: 'grid',
        justifyItems: 'end',
        gap: 4,
      }}
    >
      {/* G-008d item 6: the rules' disabled reason, ABOVE the pill and
          right-aligned — it grows leftward, never into the ring. */}
      {!enabled && reason && (
        <span
          data-testid="act-reason"
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: MUTED,
            letterSpacing: '0.03em',
            maxWidth: ACT_REASON_MAX_WIDTH,
            textAlign: 'right',
            lineHeight: 1.35,
          }}
        >
          {reason}
        </span>
      )}
      <button
        type="button"
        data-testid="act-pill"
        aria-disabled={!enabled}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!enabled) return;
          onAct();
        }}
        style={{
          pointerEvents: 'auto',
          minWidth: 148,
          minHeight: 56,
          padding: '0 26px',
          borderRadius: 999,
          border: enabled ? '1px solid rgba(250,204,21,0.65)' : '1px solid rgba(148,163,184,0.4)',
          background: enabled ? YELLOW : 'rgba(100,116,139,0.3)',
          color: enabled ? '#0a0f1a' : MUTED,
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '0.02em',
          fontFamily: FONT,
          boxShadow: enabled ? '0 6px 20px rgba(250,204,21,0.28)' : 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          cursor: enabled ? 'pointer' : 'default',
          transition: 'background 200ms linear, color 200ms linear, border-color 200ms linear',
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function Hud({ onAct, actLabel, actEnabled = true, actReason = null, toast = null }: HudProps) {
  // Toast lifetime is component-local (never touches the store): visible
  // while `toast` is set, hidden TOAST_MS after the latest message arrived.
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!toast) {
      setToastVisible(false);
      return;
    }
    setToastVisible(true);
    const timer = setTimeout(() => setToastVisible(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

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

      {/* Bottom group (G-008d item 6): the objective card and toast stay
          LEFT-INSET above the joystick (JOYSTICK_CLEAR_PX wrapper, G-001c
          contract); the Act pill right-aligns below them, bottom aligned
          with the joystick — root padding 12px + safe-bottom, plus this
          group's 2px, lands the pill's bottom edge exactly at the ring's
          14px + safe-bottom. */}
      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 2,
        }}
      >
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 10,
            paddingLeft: JOYSTICK_CLEAR_PX,
          }}
        >
          <ObjectiveCard />
          {toast !== null && toastVisible && (
            <div
              role="status"
              aria-live="polite"
              style={{
                ...GLASS,
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.35,
                color: TEXT,
                maxWidth: 'min(64vw, 300px)',
              }}
            >
              {toast}
            </div>
          )}
        </div>
        <ActButton onAct={onAct} actLabel={actLabel} enabled={actEnabled} reason={actReason} />
      </div>
    </div>
  );
}
