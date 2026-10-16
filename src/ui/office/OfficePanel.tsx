/**
 * O-001 — Office UI: read-only card for world-run offices, floor selector,
 * staff list + selected staff card, and the employer job/shift controls.
 * Portrait-phone first (390×844): a bottom sheet capped at 46% height.
 */
import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { findOffice, findOfficeJob, type OfficeKind } from '../../data/offices';
import { findRoom, isOpen, staffInBuilding, staffProgress, type StaffActivity } from '../../rules/office';
import {
  applyForJob,
  endShift,
  getOfficeState,
  officeJobsFor,
  officeLayout,
  requestPlayerFloor,
  selectOffice,
  selectStaff,
  setAtDesk,
  setViewFloor,
  startShift,
  subscribeOffice,
  currentHour,
} from '../../store/officeStore';
import { requestFrame } from '../../store/gameStore';

const KIND_LABEL: Record<OfficeKind, string> = {
  bank: 'Bank',
  law: 'Law & accounts',
  tech: 'Tech hub',
  callcentre: 'Call centre',
  radio: 'Radio & newsroom',
  lands: 'Government office',
};

const STATUS: Record<StaffActivity, { label: string; bg: string; fg: string }> = {
  working: { label: 'Working', bg: '#e3f7ea', fg: '#1e7d43' },
  planning: { label: 'Planning', bg: '#ece6fb', fg: '#5b3cc4' },
  meeting: { label: 'Meeting', bg: '#e3effb', fg: '#1f5fa8' },
  break: { label: 'Break', bg: '#fdf1dc', fg: '#a86a12' },
  lunch: { label: 'Lunch', bg: '#fdf1dc', fg: '#a86a12' },
  waiting: { label: 'Waiting', bg: '#f0f0f3', fg: '#555' },
  off: { label: 'Off', bg: '#f0f0f3', fg: '#888' },
};

const useOffice = () => useSyncExternalStore(subscribeOffice, getOfficeState, getOfficeState);

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
    <span style={{ background: bg, color: fg, borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, primary, testId }: { children: ReactNode; onClick: () => void; primary?: boolean; testId?: string }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: 12,
        padding: '9px 12px',
        fontWeight: 700,
        fontSize: 13,
        background: primary ? '#5b3cc4' : '#f0eef8',
        color: primary ? '#fff' : '#3a2f6b',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function OfficePanel() {
  const st = useOffice();
  const [toast, setToast] = useState<string | null>(null);
  const def = st.selectedOfficeId ? findOffice(st.selectedOfficeId) : undefined;
  const shift = st.player.shift;
  if (!def && !shift) return null;

  const say = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3500);
  };

  // on-shift strip stays visible even with no office selected
  const shiftJob = shift ? findOfficeJob(shift.jobId) : undefined;
  const shiftOffice = shiftJob ? findOffice(shiftJob.officeId) : undefined;

  const wrap: CSSProperties = {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 'calc(10px + env(safe-area-inset-bottom))',
    maxHeight: '46vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 30,
    pointerEvents: 'none',
  };

  return (
    <div style={wrap} data-testid="office-panel">
      {shift && shiftJob && shiftOffice ? (
        <div style={card} data-testid="office-shift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>
              {shiftJob.title} · {shiftOffice.name}
            </b>
            <Pill bg="#e3f7ea" fg="#1e7d43">
              On shift
            </Pill>
          </div>
          <div style={{ fontSize: 12, color: '#666', margin: '6px 0' }}>
            {Math.floor(shift.minutesWorked / 60)}h {Math.floor(shift.minutesWorked % 60)}m of {shiftJob.shiftHours}h · {shift.tasksDone} tasks ·{' '}
            {st.player.inLift ? 'In the lift' : `Floor ${st.player.floor === 0 || st.player.floor == null ? 'G' : st.player.floor}`}
          </div>
          <Bar value={shift.taskProgress} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {shiftOffice.floors.map((f) => (
              <Btn key={f.level} testId={`office-ride-${f.level}`} onClick={() => say(requestPlayerFloor(shiftOffice.id, f.level).message)}>
                {shiftOffice.hasLift ? 'Lift' : 'Stairs'} → {f.level === 0 ? 'G' : f.level}
              </Btn>
            ))}
            <Btn primary testId="office-desk" onClick={() => say(setAtDesk(!st.player.atDesk).message)}>
              {st.player.atDesk ? 'Stand up' : 'Sit at desk'}
            </Btn>
            <Btn testId="office-end-shift" onClick={() => say(endShift().message)}>
              End shift
            </Btn>
          </div>
        </div>
      ) : null}

      {def ? (
        <div style={card} data-testid="office-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{def.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {KIND_LABEL[def.kind]} · {def.openHour}:00–{def.closeHour}:00 · {def.floors.length} floor{def.floors.length > 1 ? 's' : ''}
                {def.hasLift ? ' · lift' : ''}
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={() => selectOffice(null)}
              style={{ border: 'none', background: '#f0f0f3', borderRadius: 999, width: 28, height: 28, fontWeight: 800, cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
            {isOpen(def, currentHour()) ? (
              <Pill bg="#e3f7ea" fg="#1e7d43">
                Open
              </Pill>
            ) : (
              <Pill bg="#f0f0f3" fg="#888">
                Closed
              </Pill>
            )}
            <Pill bg="#f0eef8" fg="#3a2f6b">
              {staffInBuilding(st.sims[def.id])} staff in
            </Pill>
            <Pill bg="#f0eef8" fg="#3a2f6b">
              {st.sims[def.id].deliveredToday} done today
            </Pill>
            {def.ownership === 'employer' ? (
              <Pill bg="#fff1c7" fg="#8a6200">
                Hiring
              </Pill>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn
              primary
              testId="office-look-inside"
              onClick={() => {
                setViewFloor(def.id, st.viewFloor[def.id] ?? 0);
                requestFrame(def.site.x, def.site.z, 38);
              }}
            >
              Look inside
            </Btn>
            {def.floors.length > 1 ? (
              <div style={{ display: 'flex', gap: 4 }} data-testid="office-floor-selector">
                {def.floors.map((f) => {
                  const on = (st.viewFloor[def.id] ?? 0) === f.level;
                  return (
                    <button
                      key={f.level}
                      onClick={() => setViewFloor(def.id, f.level)}
                      style={{
                        border: 'none',
                        borderRadius: 10,
                        width: 34,
                        height: 34,
                        fontWeight: 800,
                        background: on ? '#5b3cc4' : '#f0eef8',
                        color: on ? '#fff' : '#3a2f6b',
                        cursor: 'pointer',
                      }}
                    >
                      {f.level === 0 ? 'G' : f.level}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* staff list */}
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {st.sims[def.id].staff.map((s) => {
              const task = st.sims[def.id].tasks.find((t) => t.assigneeId === s.id);
              const pill = STATUS[s.activity];
              return (
                <button
                  key={s.id}
                  onClick={() => selectStaff(s.id === st.selectedStaffId ? null : s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    background: s.id === st.selectedStaffId ? '#f4f0ff' : 'transparent',
                    borderRadius: 10,
                    padding: '5px 6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <b style={{ fontSize: 13, minWidth: 64 }}>{s.name}</b>
                  <span style={{ fontSize: 12, color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task ? task.name : s.role}
                  </span>
                  <Pill bg={pill.bg} fg={pill.fg}>
                    {pill.label}
                  </Pill>
                </button>
              );
            })}
          </div>

          {/* employer jobs */}
          {def.ownership === 'employer' ? (
            <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 8 }} data-testid="office-jobs">
              {officeJobsFor(def.id).map((j) => {
                const hired = st.player.employedJobIds.includes(j.id);
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {j.title} · GH₵{j.salaryPerShiftGHS}/shift
                      </div>
                      <div style={{ fontSize: 11, color: '#777' }}>{j.requirementLabel}</div>
                    </div>
                    {hired ? (
                      <Btn primary testId={`office-start-${j.id}`} onClick={() => say(startShift(j.id).message)}>
                        Start shift
                      </Btn>
                    ) : (
                      <Btn testId={`office-apply-${j.id}`} onClick={() => say(applyForJob(j.id).message)}>
                        Apply
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {def && st.selectedStaffId ? <StaffCard officeId={def.id} staffId={st.selectedStaffId} /> : null}

      {toast ? (
        <div style={{ ...card, padding: '9px 12px', fontSize: 13, fontWeight: 600 }} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function StaffCard({ officeId, staffId }: { officeId: string; staffId: string }) {
  const st = useOffice();
  const def = findOffice(officeId)!;
  const sim = st.sims[officeId];
  const s = sim.staff.find((x) => x.id === staffId);
  if (!s) return null;
  const task = sim.tasks.find((t) => t.assigneeId === s.id);
  const room = s.roomId ? findRoom(officeLayout(officeId), s.roomId) : undefined;
  const pill = STATUS[s.activity];
  return (
    <div style={card} data-testid="office-staff-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <b style={{ fontSize: 15 }}>{s.name}</b>
          <span style={{ fontSize: 12, color: '#666' }}> · {s.role}</span>
        </div>
        <Pill bg={pill.bg} fg={pill.fg}>
          {pill.label}
        </Pill>
      </div>
      {task ? (
        <div style={{ margin: '8px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {def.pipeline[task.stageIdx].stage} · {task.name}
          </div>
          <Bar value={staffProgress(def, sim, s.id)} />
          <Timeline stages={def.pipeline.map((p) => p.stage)} at={task.stageIdx} />
        </div>
      ) : null}
      <Row k="Room" v={room ? `${room.spec.label} · ${room.floor === 0 ? 'G' : `Floor ${room.floor}`}` : 'Out of the building'} />
      <Row k="Energy" v={`${Math.round(s.energy)}%`} />
      <Row k="Done today" v={String(s.tasksToday)} />
      {s.log.length > 0 ? (
        <div style={{ marginTop: 6, background: '#f7f7fa', borderRadius: 10, padding: '6px 8px' }}>
          {s.log.map((l, i) => (
            // P3-3: the log is capped (pushLog slices from the end), so a
            // plain index key shifts on every append — key by index+content
            <div key={`${i}:${l}`} style={{ fontSize: 11, color: '#555', lineHeight: '17px' }}>
              {l}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
      <span style={{ color: '#777' }}>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div style={{ height: 6, background: '#eeeaf8', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', background: '#5b3cc4' }} />
    </div>
  );
}

function Timeline({ stages, at }: { stages: string[]; at: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 2 }}>
      {stages.map((s, i) => (
        <div key={s} style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              width: 14,
              height: 14,
              margin: '0 auto',
              borderRadius: 999,
              background: i < at ? '#1e9e57' : i === at ? '#5b3cc4' : '#e2e2ea',
            }}
          />
          <div style={{ fontSize: 9.5, color: i <= at ? '#333' : '#999', marginTop: 2 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}
