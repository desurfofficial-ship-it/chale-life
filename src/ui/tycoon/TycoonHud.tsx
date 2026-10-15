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
import {
  arrange,
  districtDemand,
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
  /** Store commit — returns false when the purchase was rejected. */
  readonly onBuyPlot: (plot: PlotRef) => boolean;
  /** Store commit — returns false when the opening was rejected. */
  readonly onOpenBusiness: (plot: PlotRef, typeId: string, budget: BudgetTier) => boolean;
  readonly onCloseSheet: () => void;
  readonly onEstimate?: (typeId: string, plot: PlotRef, budget: BudgetTier) => void;
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} stars`} style={{ letterSpacing: 1, color: MUSTARD }}>
      {'★'.repeat(n)}
      <span style={{ color: '#ccc' }}>{'★'.repeat(3 - n)}</span>
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
        {quest.step === 'earn_500' ? ` (${Math.floor(quest.earnedToward)}/${quest.earnTarget})` : ''}
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
        // The bar spans the full width ABOVE the joystick (z 10) — a
        // pointerEvents:auto container swallowed every dead-space tap,
        // including the bottom band of the stick. Only the buttons take
        // pointers; the strip's padding/gaps fall through.
        pointerEvents: 'none',
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
            pointerEvents: 'auto',
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
  plot,
}: {
  filter: BusinessCategory | 'all';
  onFilter: (c: BusinessCategory | 'all') => void;
  onPick: (t: BusinessTypeDef) => void;
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
                  onClick={() => onPick(t)}
                  style={{ ...btnPrimary, flex: 1, minHeight: 44 }}
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
        ← Back
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
  hasBusiness,
  onBuy,
  onClose,
  onOpenBusiness,
}: {
  plot: PlotRef;
  owned: boolean;
  hasBusiness: boolean;
  onBuy: () => boolean;
  onClose: () => void;
  onOpenBusiness: (typeId: string, budget: BudgetTier) => boolean;
}) {
  // Step state keys off the PLOT (the parent mounts this with
  // key={plot.id}, so a plot switch resets it — reusing the instance used
  // to carry a half-finished setup for plot A onto plot B).
  const [step, setStep] = useState<0 | 1 | 2 | 3>(hasBusiness ? 3 : owned ? 1 : 0);
  const [filter, setFilter] = useState<BusinessCategory | 'all'>('all');
  const [picked, setPicked] = useState<BusinessTypeDef | null>(null);
  const tiles = Math.round(plot.w * plot.d);
  // Engine truth (rules/business districtDemand) — the old hardcode said
  // 100 % for 7 of 9 zones and 125 % for cbd when the sim uses 95–140 %.
  const demandPct = Math.round(districtDemand(plot) * 100);

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
          onClick={onClose}
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

      {step === 0 && (
        <button
          type="button"
          style={btnPrimary}
          onClick={() => {
            // Advance ONLY on a committed purchase — the store rejects
            // (insufficient cash, already owned elsewhere) and the sheet
            // used to jump to "Choose industry" for land you don't own.
            if (onBuy()) setStep(1);
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
            // Same gate as the buy step — a rejected open (no land, plot
            // already occupied) must not show "✓ Venue open".
            if (onOpenBusiness(picked.id, budget)) setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, color: FOREST }}>✓</div>
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
          key={selectedPlot.id}
          plot={selectedPlot}
          owned={ownedPlotIds.includes(selectedPlot.id)}
          hasBusiness={businesses.some((b) => b.plotId === selectedPlot.id)}
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
