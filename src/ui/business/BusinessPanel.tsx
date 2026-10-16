'use client';
/**
 * B-001 — Bottom sheet for a world-run shop/restaurant (mirrors OfficePanel).
 */
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { findBusiness, type BusinessKind } from '../../data/worldBusinesses';
import { isBusinessOpen, busyLabel } from '../../rules/worldBusiness';
import {
  getBusinessState,
  selectBusiness,
  subscribeBusiness,
  businessJobsFor,
  requestSetStaffOnShift,
} from '../../store/businessStore';
import { getAmbientHour } from '../../store/ambientClock';
import { getState, subscribe as subscribeGame, buyBusinessItem } from '../../store/gameStore';

const KIND_LABEL: Record<BusinessKind, string> = {
  restaurant: 'Restaurant',
  shop: 'Shop',
};

const card: CSSProperties = {
  background: '#ffffff',
  borderRadius: 18,
  boxShadow: '0 6px 24px rgba(30,30,60,0.14)',
  padding: 14,
  color: '#22222e',
  fontFamily: 'Inter, system-ui, sans-serif',
  pointerEvents: 'auto',
};

function Pill({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <span style={{ background: bg, color: fg, borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

const useBiz = () => useSyncExternalStore(subscribeBusiness, getBusinessState, getBusinessState);
const useWallet = () =>
  useSyncExternalStore(
    subscribeGame,
    () => getState().wallet.balanceGHS,
    () => getState().wallet.balanceGHS,
  );

export function BusinessPanel() {
  const st = useBiz();
  const id = st.selectedBusinessId;
  const wallet = useWallet();
  if (!id) return null;
  const def = findBusiness(id);
  if (!def) return null;
  const sim = st.sims[id];
  const hour = getAmbientHour();
  const open = isBusinessOpen(def, hour);
  const busy = sim ? busyLabel(sim, def.capacity) : '—';
  const jobs = businessJobsFor(id);

  const buy = (itemId: string) => {
    buyBusinessItem(id, itemId);
  };

  return (
    <div
      data-testid="business-panel"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        maxHeight: '46%',
        overflowY: 'auto',
        padding: '10px 12px calc(12px + env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...card, pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{def.name}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {KIND_LABEL[def.kind]} · Owner {def.ownerName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectBusiness(null)}
            style={{ border: 'none', background: '#f0eef8', borderRadius: 10, padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <Pill bg={open ? '#e3f7ea' : '#f0f0f3'} fg={open ? '#1e7d43' : '#888'}>
            {open ? 'Open' : 'Closed'}
          </Pill>
          <Pill bg="#e3effb" fg="#1f5fa8">
            {busy}
          </Pill>
          <Pill bg="#fdf1dc" fg="#a86a12">
            {def.openHour}:00–{def.closeHour}:00
          </Pill>
          {sim ? (
            <Pill bg="#f0eef8" fg="#3a2f6b">
              Queue {sim.queue} · Seated {Math.floor(sim.seated)}
            </Pill>
          ) : null}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
          {def.kind === 'restaurant' ? 'Menu' : 'Stock'}
        </div>
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {def.menu.map((m) => {
            const stock = sim?.stock[m.id];
            const out = def.kind === 'shop' && (stock ?? 0) <= 0;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!open || out || wallet < m.priceGHS}
                onClick={() => buy(m.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  border: '1px solid #eceaf3',
                  borderRadius: 12,
                  padding: '10px 12px',
                  background: '#faf9fc',
                  cursor: open && !out ? 'pointer' : 'default',
                  opacity: !open || out || wallet < m.priceGHS ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {m.hungerRestore ? `+${m.hungerRestore} hunger` : m.category}
                    {def.kind === 'shop' ? ` · stock ${stock ?? 0}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>GHS {m.priceGHS}</div>
              </button>
            );
          })}
        </div>

        {jobs.length > 0 ? (
          <>
            <div style={{ marginTop: 12, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
              Jobs
            </div>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {jobs.map((j) => (
                <div key={j.id} style={{ padding: '8px 10px', borderRadius: 10, background: '#f0eef8', fontSize: 13 }}>
                  <strong>{j.title}</strong> · GHS {j.payGHS} / shift
                </div>
              ))}
            </div>
          </>
        ) : null}

        {sim ? (
          <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
            Day revenue (owner) GHS {sim.dayRevenueGHS.toFixed(0)} · Staff on shift{' '}
            {sim.staff.filter((s) => s.onShift).length}/{sim.staff.length}
          </div>
          <div style={{ marginTop: 10 }} data-testid="business-staff-list">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Staff roster</div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
              Hours {def.openHour}:00–{def.closeHour}:00 (world schedule). Toggle staff on shift.
            </p>
            {sim.staff.map((s) => (
              <button
                key={s.id}
                type="button"
                data-testid={`staff-toggle-${s.id}`}
                onClick={() => requestSetStaffOnShift(id, s.id, !s.onShift)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 44,
                  marginBottom: 6,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: s.onShift ? '#e8f5e9' : '#f5f5f5',
                  color: '#222',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>
                  <strong>{s.name}</strong> · {s.role}
                </span>
                <span style={{ fontWeight: 700, color: s.onShift ? '#0d7a45' : '#6b7280' }}>
                  {s.onShift ? 'On shift' : 'Off'}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
