/**
 * Tycoon HUD overlay (G-009) — reference-style top bar, quest card,
 * bottom tabs, plot sheet, business grid, setup sheet.
 *
 * CONTRACT: presentation only. Engine (E-010) owns state and wires
 * callbacks. No three.js. Phone-first: 390×844, tap targets ≥ 44 px.
 *
 * Warm muted palette: cream / forest green / mustard / brick.
 */

import { useMemo, useState, type CSSProperties } from 'react';
import {
  BUSINESS_CATEGORIES,
  BUSINESS_TYPES,
  type BusinessCategory,
  type BusinessTypeDef,
} from '../../data/businesses';
import { formatGHS } from '../../rules/economy';
import { OFFICES } from '../../data/offices';
import {
  arrange,
  estimate,
  type BudgetTier,
  type BusinessState,
  type PlotRef,
  type QuestProgress,
} from '../../rules/business';

const CREAM = '#f5f0e6';
const FOREST = '#2d5a3d';
const MUSTARD = '#c4a035';
const BRICK = '#a03c2e';
const INK = '#1a1a1a';
const MUTED = '#6b6560';
const PANEL = 'rgba(245,240,230,0.94)';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const sheet: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '78%',
  overflowY: 'auto',
  background: PANEL,
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  boxShadow: '0 -8px 32px rgba(0,0,0,0.28)',
  padding: '14px 16px calc(16px + env(safe-area-inset-bottom))',
  fontFamily: FONT,
  color: INK,
  zIndex: 40,
  pointerEvents: 'auto',
};

const btnPrimary: CSSProperties = {
  minHeight: 48,
  borderRadius: 12,
  border: 'none',
  background: FOREST,
  color: CREAM,
  fontWeight: 800,
  fontSize: 16,
  width: '100%',
  touchAction: 'manipulation',
  cursor: 'pointer',
};

const chipBase: CSSProperties = {
  minHeight: 36,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(0,0,0,0.12)',
  fontSize: 13,
  fontWeight: 700,
  touchAction: 'manipulation',
  cursor: 'pointer',
};

export type TycoonTab = 'manage' | 'city' | 'shop' | 'finance' | 'property' | 'report' | 'alerts';

export interface AlertItem {
  readonly id: string;
  readonly at: number;
  readonly message: string;
}

export interface TycoonHudProps {
  readonly cashGHS: number;
  readonly day: number;
  readonly clockLabel: string;
  readonly weatherIcon: string;
  readonly quest: QuestProgress | null;
  readonly selectedPlot: PlotRef | null;
  readonly ownedPlotIds: readonly string[];
  readonly businesses: readonly BusinessState[];
  readonly alerts: readonly AlertItem[];
  readonly activeTab: TycoonTab;
  readonly onTab: (tab: TycoonTab) => void;
  /** O-002: go to a world-run office from city view (id from data/offices). */
  readonly onGoToOffice?: (id: string) => void;
  /**
   * Buy a plot. Returns true when the purchase actually committed (the store
   * verified the wallet could cover the price), false when it was rejected
   * (insufficient cash, already owned, not for sale, etc.). The PlotSheet uses
   * this to decide whether to advance the 4-step tracker — the OLD contract
   * was `() => void`, so the sheet always moved to "Choose industry" even when
   * the wallet was short, which made players think they had bought the land
   * while nothing was actually persisted. See FIX note on PlotSheet below.
   */
  readonly onBuyPlot: (plot: PlotRef) => boolean;
  /**
   * Open a business on an owned plot. Returns true when the business actually
   * opened (wallet covered the startup cost), false when the store rejected
   * it (insufficient cash, plot not owned, already has a business). The
   * PlotSheet uses this to decide whether to advance to the "Venue open OK"
   * screen — same FIX rationale as onBuyPlot above.
   */
  readonly onOpenBusiness: (plot: PlotRef, typeId: string, budget: BudgetTier) => boolean;
  readonly onCloseSheet: () => void;
  readonly onEstimate?: (typeId: string, plot: PlotRef, budget: BudgetTier) => void;
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} stars`} style={{ letterSpacing: 1, color: MUSTARD }}>
      {'*'.repeat(n)}
      <span style={{ color: '#ccc' }}>{'*'.repeat(3 - n)}</span>
    </span>
  );
}

function TopBar({
  cashGHS,
  day,
  clockLabel,
  weatherIcon,
}: {
  cashGHS: number;
  day: number;
  clockLabel: string;
  weatherIcon: string;
}) {
  return (
    <div
      data-testid="tycoon-topbar"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        pointerEvents: 'none',
        padding: 'calc(8px + env(safe-area-inset-top)) 12px 8px',
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          background: PANEL,
          borderRadius: 10,
          padding: '6px 12px',
          fontWeight: 800,
          color: FOREST,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        {formatGHS(cashGHS)}
      </div>
      <div
        style={{
          background: PANEL,
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 700,
          color: INK,
          display: 'flex',
          gap: 10,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <span>Day {day}</span>
        <span style={{ color: MUTED }}>{clockLabel}</span>
        <span aria-label="weather">{weatherIcon}</span>
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestProgress }) {
  const steps: { id: string; label: string }[] = [
    { id: 'buy_plot', label: 'Buy plot' },
    { id: 'open_business', label: 'Open business' },
    { id: 'earn_500', label: 'Earn ₵500' },
    { id: 'hire_second', label: 'Hire 2nd staff' },
  ];
  const done = new Set(quest.stepsDone);
  const idx = steps.findIndex((s) => s.id === quest.step);
  const progress = (done.size + (quest.step === 'earn_500' ? quest.earnedToward / quest.earnTarget : 0)) / steps.length;
  const nextLabel = steps[idx]?.label ?? 'Done';

  return (
    <div
      data-testid="tycoon-quest"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        zIndex: 28,
        pointerEvents: 'none',
        background: PANEL,
        borderRadius: 12,
        padding: '10px 14px',
        fontFamily: FONT,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: FOREST, letterSpacing: '0.06em' }}>
        CHAPTER {quest.chapter} · {quest.title.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginTop: 2 }}>
        Next: {nextLabel}
        {quest.step === 'earn_500' ? ` (${Math.floor(quest.earnedToward)}/500)` : ''}
      </div>
      <div
        style={{
          marginTop: 8,
          height: 6,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            height: '100%',
            background: MUSTARD,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function BottomTabs({ active, onTab }: { active: TycoonTab; onTab: (t: TycoonTab) => void }) {
  const tabs: { id: TycoonTab; label: string; live: boolean }[] = [
    { id: 'property', label: 'Property', live: true },
    { id: 'manage', label: 'Manage', live: true },
    { id: 'alerts', label: 'Alerts', live: true },
    { id: 'city', label: 'City', live: true },
    { id: 'shop', label: 'Shop', live: false },
    { id: 'finance', label: 'Finance', live: false },
    { id: 'report', label: 'Report', live: false },
  ];
  return (
    <div
      data-testid="tycoon-tabs"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 32,
        pointerEvents: 'auto',
        display: 'flex',
        gap: 2,
        padding: '6px 6px calc(6px + env(safe-area-inset-bottom))',
        background: PANEL,
        borderTop: '1px solid rgba(0,0,0,0.08)',
        overflowX: 'auto',
        fontFamily: FONT,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          style={{
            minHeight: 44,
            minWidth: 64,
            flex: '0 0 auto',
            borderRadius: 10,
            border: 'none',
            background: active === t.id ? FOREST : 'transparent',
            color: active === t.id ? CREAM : t.live ? INK : MUTED,
            fontWeight: 700,
            fontSize: 12,
            touchAction: 'manipulation',
            cursor: 'pointer',
            opacity: t.live ? 1 : 0.65,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FloorPlanPreview({
  typeId,
  budget,
  plot,
}: {
  typeId: string;
  budget: BudgetTier;
  plot: PlotRef;
}) {
  const layout = useMemo(
    () => arrange(typeId, budget, { w: plot.w, d: plot.d }),
    [typeId, budget, plot.w, plot.d],
  );
  const cell = 14;
  const w = Math.max(3, Math.floor(plot.w));
  const d = Math.max(3, Math.floor(plot.d));
  return (
    <div
      data-testid="floor-plan"
      style={{
        position: 'relative',
        width: w * cell,
        height: d * cell,
        background: '#e8e0d0',
        borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.1)',
        margin: '8px auto',
      }}
    >
      {layout.map((p) => (
        <div
          key={p.id}
          title={p.furnitureId}
          style={{
            position: 'absolute',
            left: p.tx * cell,
            top: p.tz * cell,
            width: cell - 2,
            height: cell - 2,
            background: FOREST,
            borderRadius: 3,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

function BusinessTypeGrid({
  filter,
  onFilter,
  onPick,
  onEstimate,
  plot,
}: {
  filter: BusinessCategory | 'all';
  onFilter: (c: BusinessCategory | 'all') => void;
  onPick: (t: BusinessTypeDef) => void;
  onEstimate?: (t: BusinessTypeDef) => void;
  plot: PlotRef;
}) {
  const list =
    filter === 'all' ? BUSINESS_TYPES : BUSINESS_TYPES.filter((b) => b.category === filter);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {BUSINESS_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onFilter(c.id)}
            style={{
              ...chipBase,
              background: filter === c.id ? FOREST : CREAM,
              color: filter === c.id ? CREAM : INK,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {list.map((t) => {
          const est = estimate(t.id, plot, 'suggested');
          return (
            <div
              key={t.id}
              style={{
                background: CREAM,
                borderRadius: 12,
                padding: 12,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: 15 }}>{t.name}</strong>
                <span style={{ fontSize: 12, color: MUTED }}>{formatGHS(t.startupSuggested)}</span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                {formatGHS(t.costPerDay)}/day · Diff <Stars n={t.difficulty} /> · Profit{' '}
                <Stars n={t.potential} />
              </div>
              {est && (
                <div style={{ fontSize: 11, color: FOREST, marginTop: 4 }}>
                  Est. daily profit ~{formatGHS(est.expectedDailyProfit)} · staff {est.staff}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onEstimate?.(t)}
                  style={{
                    ...chipBase,
                    background: 'transparent',
                    flex: 1,
                    minHeight: 44,
                  }}
                >
                  Estimate
                </button>
                <button
                  type="button"
                  onClick={() => onPick(t)}
                  style={{ ...btnPrimary, flex: 1.4, minHeight: 44 }}
                >
                  Choose
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetupSheet({
  type,
  plot,
  onBack,
  onConfirm,
}: {
  type: BusinessTypeDef;
  plot: PlotRef;
  onBack: () => void;
  onConfirm: (budget: BudgetTier) => void;
}) {
  const [budget, setBudget] = useState<BudgetTier>('suggested');
  const est = estimate(type.id, plot, budget)!;
  const tiers: BudgetTier[] = ['min', 'suggested', 'max'];
  return (
    <div data-testid="setup-sheet">
      <button type="button" onClick={onBack} style={{ ...chipBase, marginBottom: 10 }}>
         Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{type.name}</h2>
      <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Set startup budget</p>
      <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
        {tiers.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setBudget(t)}
            style={{
              ...chipBase,
              flex: 1,
              minHeight: 44,
              background: budget === t ? MUSTARD : CREAM,
              color: INK,
              textTransform: 'capitalize',
            }}
          >
            {t === 'min' ? 'Minimum' : t === 'max' ? 'Maximum' : 'Suggested'}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <div>Capacity: {est.capacity}</div>
        <div>Staff: {est.staff}</div>
        <div>Cost/day: {formatGHS(est.costPerDay)}</div>
        <div>Expected daily profit: {formatGHS(est.expectedDailyProfit)}</div>
      </div>
      <FloorPlanPreview typeId={type.id} budget={budget} plot={plot} />
      <button type="button" data-testid="buy-and-arrange" style={btnPrimary} onClick={() => onConfirm(budget)}>
        Buy &amp; arrange · {formatGHS(est.startupCost)}
      </button>
    </div>
  );
}

function PlotSheet({
  plot,
  owned,
  onBuy,
  onClose,
  onOpenBusiness,
}: {
  plot: PlotRef;
  owned: boolean;
  /**
   * FIX: returns boolean — true when the purchase actually committed (wallet
   * covered the price, plot was not already owned). The OLD contract was
   * `() => void`, which forced the sheet to advance to "Choose industry" no
   * matter what the store decided, so a player with insufficient cash still
   * saw the industry grid and assumed the land was theirs. We now gate
   * `setStep(1)` on a true return and surface a visible error when it fails
   * (the store also pushes an alert, but that lives in the Alerts tab which
   * is not the active tab during the buy flow).
   */
  onBuy: () => boolean;
  onClose: () => void;
  /**
   * FIX: returns boolean — true when the business actually opened (wallet
   * covered the startup cost). Same rationale as `onBuy`: the old `() => void`
   * contract let the sheet advance to the "Venue open OK" screen even when the
   * store rejected the open, so the player thought they had a business while
   * nothing was persisted.
   */
  onOpenBusiness: (typeId: string, budget: BudgetTier) => boolean;
}) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(owned ? 1 : 0);
  const [filter, setFilter] = useState<BusinessCategory | 'all'>('all');
  const [picked, setPicked] = useState<BusinessTypeDef | null>(null);
  // FIX: inline error message — when the store rejects the buy or the open,
  // show the reason right under the action button so the player immediately
  // sees why nothing happened (the Alerts tab is one tap away and easy to
  // miss during the buy flow). Cleared on the next attempt and on close.
  const [error, setError] = useState<string | null>(null);
  const tiles = Math.round(plot.w * plot.d);
  const demandPct = Math.round(
    (plot.zone === 'cbd' || plot.zone === 'adabraka' ? 1.25 : 1) * 100,
  );

  const tracker = ['Buy land', 'Choose industry', 'Set up', 'Open'];

  return (
    <div style={sheet} data-testid="plot-sheet">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.08em' }}>
            FOR SALE · {plot.zone.toUpperCase()}
          </div>
          <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>{plot.id}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            onClose();
          }}
          aria-label="Close"
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 12,
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
        {tiles} tiles · Local demand {demandPct}% · {formatGHS(plot.price)}
      </div>

      {/* 4-step tracker */}
      <div style={{ display: 'flex', gap: 4, margin: '14px 0' }}>
        {tracker.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: i <= step ? FOREST : 'rgba(0,0,0,0.1)',
                marginBottom: 4,
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, color: i <= step ? FOREST : MUTED }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* FIX: inline error banner — red brick background, cream text, sits
          above the action button. Role=alert so screen readers announce it
          the moment a buy/open is rejected. */}
      {error && (
        <div
          role="alert"
          data-testid="plot-sheet-error"
          style={{
            marginTop: 4,
            marginBottom: 8,
            padding: '10px 12px',
            borderRadius: 10,
            background: BRICK,
            color: CREAM,
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      {step === 0 && (
        <button
          type="button"
          style={btnPrimary}
          data-testid="buy-land-btn"
          onClick={() => {
            // FIX: gate the step advance on the store's commit. Only move to
            // "Choose industry" when the wallet actually covered the price and
            // the plot is now in ownedPlotIds. On failure, surface the reason
            // inline so the player understands the button "didn't work"
            // instead of seeing the next step and assuming the buy landed.
            setError(null);
            const ok = onBuy();
            if (ok) {
              setStep(1);
            } else {
              // The store pushes a precise reason (with the wallet shortfall)
              // to the Alerts tab via pushAlert, but the player is on the
              // Property tab during the buy flow. Mirror a plain-English
              // reason here so they see it without changing tabs.
              setError(
                `Not enough cash to buy this plot. Earn more from jobs, or pick a cheaper plot. Tap Alerts for the exact shortfall.`,
              );
            }
          }}
        >
          Buy land · {formatGHS(plot.price)}
        </button>
      )}

      {step === 1 && !picked && (
        <BusinessTypeGrid
          filter={filter}
          onFilter={setFilter}
          plot={plot}
          onPick={(t) => {
            setPicked(t);
            setStep(2);
          }}
        />
      )}

      {step === 2 && picked && (
        <SetupSheet
          type={picked}
          plot={plot}
          onBack={() => {
            setPicked(null);
            setStep(1);
          }}
          onConfirm={(budget) => {
            // FIX: gate the "Venue open OK" screen on the store's commit.
            // requestOpenBusiness returns false if the wallet can't cover the
            // startup cost; without this check the sheet would show the green
            // success check while no business was actually persisted.
            setError(null);
            const ok = onOpenBusiness(picked.id, budget);
            if (ok) {
              setStep(3);
            } else {
              setError(
                `Not enough cash to open this business. Try a lower budget tier or earn more first.`,
              );
            }
          }}
        />
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, color: FOREST }}>OK</div>
          <p style={{ fontWeight: 700 }}>Venue open</p>
          <button type="button" style={btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function ManagePanel({ businesses }: { businesses: readonly BusinessState[] }) {
  if (businesses.length === 0) {
    return (
      <div style={{ ...sheet, maxHeight: '50%' }} data-testid="manage-panel">
        <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>Manage</h2>
        <p style={{ color: MUTED, fontSize: 14 }}>No businesses yet. Buy a FOR SALE plot to start.</p>
      </div>
    );
  }
  return (
    <div style={sheet} data-testid="manage-panel">
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Manage</h2>
      {businesses.map((b) => (
        <div
          key={b.id}
          style={{
            background: CREAM,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <strong>{b.typeId.replace(/_/g, ' ')}</strong>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            Staff {b.staff} · Today {formatGHS(b.revenueToday)} rev / {formatGHS(b.costsToday)} cost
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: readonly AlertItem[] }) {
  return (
    <div style={{ ...sheet, maxHeight: '55%' }} data-testid="alerts-panel">
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Alerts</h2>
      {alerts.length === 0 && <p style={{ color: MUTED, fontSize: 14 }}>No alerts yet.</p>}
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            padding: '10px 0',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            fontSize: 13,
          }}
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}

export function TycoonHud(props: TycoonHudProps) {
  const {
    cashGHS,
    day,
    clockLabel,
    weatherIcon,
    quest,
    selectedPlot,
    ownedPlotIds,
    businesses,
    alerts,
    activeTab,
    onTab,
    onGoToOffice,
    onBuyPlot,
    onOpenBusiness,
    onCloseSheet,
  } = props;

  const comingSoon = activeTab === 'shop' || activeTab === 'finance' || activeTab === 'report';

  return (
    <div
      data-testid="tycoon-hud"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        pointerEvents: 'none',
        fontFamily: FONT,
      }}
    >
      <TopBar cashGHS={cashGHS} day={day} clockLabel={clockLabel} weatherIcon={weatherIcon} />
      {quest && !selectedPlot && activeTab === 'property' && <QuestCard quest={quest} />}
      <BottomTabs active={activeTab} onTab={onTab} />

      {selectedPlot && (
        <PlotSheet
          plot={selectedPlot}
          owned={ownedPlotIds.includes(selectedPlot.id)}
          onBuy={() => onBuyPlot(selectedPlot)}
          onClose={onCloseSheet}
          onOpenBusiness={(typeId, budget) => onOpenBusiness(selectedPlot, typeId, budget)}
        />
      )}

      {!selectedPlot && activeTab === 'city' && (
        <div style={{ position: 'absolute', top: 56, left: 12, right: 12, zIndex: 25, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(245,240,230,0.92)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#2d5a3d', fontFamily: FONT }}>
            City view — pinch zoom · drag to pan · tap a plot ring
          </div>
          {/* O-002: the Offices chip is not walk-mode-only any more — a
              horizontally-scrollable Go list lives under the city banner */}
          {onGoToOffice && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 6,
                overflowX: 'auto',
                pointerEvents: 'auto',
                paddingBottom: 2,
              }}
            >
              {OFFICES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onGoToOffice(o.id)}
                  style={{
                    flex: '0 0 auto',
                    border: '1px solid rgba(45,90,61,0.35)',
                    background: 'rgba(245,240,230,0.92)',
                    color: '#2d5a3d',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: FONT,
                    cursor: 'pointer',
                    minHeight: 28,
                  }}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!selectedPlot && activeTab === 'manage' && <ManagePanel businesses={businesses} />}
      {!selectedPlot && activeTab === 'alerts' && <AlertsPanel alerts={alerts} />}
      {!selectedPlot && comingSoon && (
        <div style={{ ...sheet, maxHeight: '30%', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: MUTED }}>Coming soon</p>
        </div>
      )}
    </div>
  );
}
