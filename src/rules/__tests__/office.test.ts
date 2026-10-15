import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT_M, OFFICES, OFFICE_JOBS, findOffice, findOfficeJob } from '../../data/offices';
import { BUSINESS_TYPES } from '../../data/businesses';
import {
  CORE_W,
  activeEvent,
  canApply,
  canPlayerBuy,
  canStartShift,
  createOfficeSim,
  isOpen,
  isPlayerBusiness,
  layoutOffice,
  lunchRushMultiplier,
  officeCashDelta,
  permitWaitMinutes,
  seatPositions,
  shiftComplete,
  shiftPay,
  startShift,
  staffInBuilding,
  tickOffice,
  tickShift,
} from '../office';

describe('office data (O-001)', () => {
  it('has six distinct office kinds with unique ids', () => {
    expect(OFFICES).toHaveLength(6);
    expect(new Set(OFFICES.map((o) => o.id)).size).toBe(6);
    expect(new Set(OFFICES.map((o) => o.kind)).size).toBe(6);
  });

  it('exactly one employer; the rest are world-run; none player-owned', () => {
    expect(OFFICES.filter((o) => o.ownership === 'employer')).toHaveLength(1);
    expect(OFFICES.filter((o) => o.ownership === 'world')).toHaveLength(5);
    expect(OFFICES.some((o) => o.ownership === 'player')).toBe(false);
  });

  it('lift offices have capacity; stair offices have none', () => {
    for (const o of OFFICES) {
      if (o.hasLift) expect(o.liftCapacity).toBeGreaterThan(0);
      else expect(o.liftCapacity).toBe(0);
      if (o.floors.length >= 3) expect(o.hasLift).toBe(true);
    }
  });

  it('every pipeline stage happens in a room the office actually has', () => {
    for (const o of OFFICES) {
      const kinds = new Set(o.floors.flatMap((f) => f.rooms.map((r) => r.kind)));
      for (const st of o.pipeline) expect(kinds.has(st.roomKind), `${o.id}:${st.stage}`).toBe(true);
      for (const ev of o.events) expect(kinds.has(ev.roomKind), `${o.id}:${ev.id}`).toBe(true);
    }
  });

  it('office jobs point at the employer and are not tycoon businesses', () => {
    for (const j of OFFICE_JOBS) {
      const o = findOffice(j.officeId)!;
      expect(o.ownership).toBe('employer');
      expect(o.floors.some((f) => f.level === j.deskFloor)).toBe(true);
    }
    const ids = new Set(BUSINESS_TYPES.map((b) => b.id));
    for (const o of OFFICES) expect(ids.has(o.id)).toBe(false);
  });
});

describe('layout', () => {
  it('rooms stay inside the footprint, clear of the core, and never overlap', () => {
    for (const o of OFFICES) {
      for (const fl of layoutOffice(o)) {
        expect(fl.y).toBeCloseTo(fl.level * FLOOR_HEIGHT_M);
        for (const r of fl.rooms) {
          expect(r.x - r.w / 2).toBeGreaterThanOrEqual(-o.site.w / 2 + CORE_W - 1e-6);
          expect(r.x + r.w / 2).toBeLessThanOrEqual(o.site.w / 2 + 1e-6);
          expect(Math.abs(r.z) + r.d / 2).toBeLessThanOrEqual(o.site.d / 2 + 1e-6);
        }
        for (let i = 0; i < fl.rooms.length; i++)
          for (let k = i + 1; k < fl.rooms.length; k++) {
            const a = fl.rooms[i];
            const b = fl.rooms[k];
            const overlapX = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
            expect(overlapX).toBeLessThanOrEqual(1e-6);
          }
      }
    }
  });

  it('seat positions are inside the room and distinct', () => {
    const room = { x: 1, z: -2, w: 4, d: 5 };
    const seats = seatPositions(room, 6);
    expect(seats).toHaveLength(6);
    const keys = new Set(seats.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`));
    expect(keys.size).toBe(6);
    for (const p of seats) {
      expect(Math.abs(p.x - room.x)).toBeLessThan(room.w / 2);
      expect(Math.abs(p.z - room.z)).toBeLessThan(room.d / 2);
    }
  });
});

describe('ownership guard', () => {
  it('world-run and employer offices cannot be bought', () => {
    expect(canPlayerBuy('world')).toBe(false);
    expect(canPlayerBuy('employer')).toBe(false);
    expect(canPlayerBuy('player')).toBe(true);
    expect(canApply('employer')).toBe(true);
    expect(canApply('world')).toBe(false);
  });

  it('a full simulated day never produces player cash and never lists as a player business', () => {
    for (const o of OFFICES) {
      let s = createOfficeSim(o);
      for (let m = 0; m < 24 * 60; m += 15) {
        s = tickOffice(o, s, 15, ((m + 15) / 60) % 24);
        expect(officeCashDelta(o, s)).toBe(0);
      }
      expect(isPlayerBusiness(o.ownership)).toBe(false);
    }
  });
});

describe('schedules + task loops (all six offices)', () => {
  it('opens and closes on its hours', () => {
    for (const o of OFFICES) {
      expect(isOpen(o, o.openHour - 0.5)).toBe(false);
      expect(isOpen(o, o.openHour + 0.5)).toBe(true);
      expect(isOpen(o, o.closeHour + 0.1)).toBe(false);
    }
  });

  it('staff arrive when open and go home after close', () => {
    for (const o of OFFICES) {
      let s = createOfficeSim(o);
      s = tickOffice(o, s, 30, o.openHour + 0.5);
      expect(staffInBuilding(s)).toBeGreaterThan(0);
      s = tickOffice(o, s, 60, o.closeHour + 0.9);
      expect(staffInBuilding(s)).toBe(0);
      expect(s.tasks).toHaveLength(0);
    }
  });

  it('every office delivers work through its whole pipeline in a working day', () => {
    for (const o of OFFICES) {
      let s = createOfficeSim(o);
      let h = o.openHour;
      while (h < o.closeHour - 0.25) {
        h += 0.25;
        s = tickOffice(o, s, 15, h);
      }
      expect(s.deliveredToday, o.id).toBeGreaterThan(0);
    }
  });

  it('task stages advance in pipeline order', () => {
    const o = findOffice('OFF_KOTOKA_TECH_HUB')!;
    let s = createOfficeSim(o);
    let h = o.openHour;
    const seen: number[] = [];
    for (let k = 0; k < 40; k++) {
      h += 5 / 60;
      s = tickOffice(o, s, 5, h);
      const t = s.tasks.find((x) => x.id.endsWith(':T1'));
      if (t && seen[seen.length - 1] !== t.stageIdx) seen.push(t.stageIdx);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBe(seen[i - 1] + 1);
  });

  it('is deterministic and dt-sliced', () => {
    const o = findOffice('OFF_GOLD_COAST_BANK')!;
    const a = tickOffice(o, createOfficeSim(o), 240, o.openHour + 4);
    const b = tickOffice(o, createOfficeSim(o), 240, o.openHour + 4);
    expect(a).toEqual(b);
  });

  it('scheduled events pull staff into the event room', () => {
    const bank = findOffice('OFF_ADOM_HOLDINGS')!;
    expect(activeEvent(bank, 11.2)?.id).toBe('board_meeting');
    let s = createOfficeSim(bank);
    s = tickOffice(bank, s, 200, 11.2);
    expect(s.staff.some((st) => st.activity === 'meeting' && st.roomId === 'board')).toBe(true);
  });

  it('month-end keeps Adom Holdings open late; normal days close on time', () => {
    const o = findOffice('OFF_ADOM_HOLDINGS')!;
    expect(isOpen(o, 19, 10)).toBe(false);
    expect(isOpen(o, 19, 29)).toBe(true);
  });

  it('lunch sends a share of staff out of the building', () => {
    const o = findOffice('OFF_KOTOKA_TECH_HUB')!;
    let s = createOfficeSim(o);
    s = tickOffice(o, s, 240, o.lunchHour + 0.2);
    expect(s.staff.filter((x) => x.activity === 'lunch').length).toBe(Math.round(o.staffNames.length * o.lunchOutRatio));
  });

  it('activity log keeps the 3 newest lines', () => {
    const o = findOffice('OFF_AKWAABA_TELECOM')!;
    const s = tickOffice(o, createOfficeSim(o), 300, o.openHour + 5);
    for (const st of s.staff) expect(st.log.length).toBeLessThanOrEqual(3);
  });
});

describe('lunch rush + permits', () => {
  it('boosts businesses near an office at lunch only, capped at 1.5', () => {
    const bank = findOffice('OFF_GOLD_COAST_BANK')!;
    const near = lunchRushMultiplier(bank.site.x + 10, bank.site.z, bank.lunchHour + 0.3);
    const offHours = lunchRushMultiplier(bank.site.x + 10, bank.site.z, 10);
    const far = lunchRushMultiplier(bank.site.x + 200, bank.site.z, bank.lunchHour + 0.3);
    expect(near).toBeGreaterThan(1);
    expect(near).toBeLessThanOrEqual(1.5);
    expect(offHours).toBe(1);
    expect(far).toBe(1);
  });

  it('permits take longer after lunch and wait overnight when closed', () => {
    const morning = permitWaitMinutes(9);
    const afternoon = permitWaitMinutes(14);
    const night = permitWaitMinutes(22);
    expect(afternoon).toBeGreaterThan(morning);
    expect(night).toBeGreaterThan(afternoon);
  });
});

describe('employer shifts', () => {
  const job = findOfficeJob('OJOB_JUNIOR_DEV')!;
  const hub = findOffice(job.officeId)!;

  it('checks needs, trait and shift hours', () => {
    expect(canStartShift(job, hub, { energy: 80, hunger: 80, trait: 'campus', hour: 9 }).ok).toBe(true);
    expect(canStartShift(job, hub, { energy: 10, hunger: 80, trait: 'campus', hour: 9 }).ok).toBe(false);
    expect(canStartShift(job, hub, { energy: 80, hunger: 80, trait: 'party', hour: 9 }).ok).toBe(false);
    expect(canStartShift(job, hub, { energy: 80, hunger: 80, trait: 'campus', hour: 22 }).ok).toBe(false);
    // career ladder: no trait, but 3 Office Assistant shifts done
    expect(
      canStartShift(job, hub, { energy: 80, hunger: 80, hour: 9, completedShifts: { OJOB_OFFICE_ASSISTANT: 3 } }).ok,
    ).toBe(true);
    expect(
      canStartShift(job, hub, { energy: 80, hunger: 80, hour: 9, completedShifts: { OJOB_OFFICE_ASSISTANT: 2 } }).ok,
    ).toBe(false);
    // entry job has no trait gate
    const entry = findOfficeJob('OJOB_OFFICE_ASSISTANT')!;
    expect(canStartShift(entry, hub, { energy: 80, hunger: 80, hour: 9 }).ok).toBe(true);
    const bank = findOffice('OFF_GOLD_COAST_BANK')!;
    expect(canStartShift(job, bank, { energy: 80, hunger: 80, trait: 'campus', hour: 9 }).ok).toBe(false);
  });

  it('pays salary + bonus per task; desk time is what makes tasks', () => {
    let sh = startShift(job, 9);
    for (let i = 0; i < job.shiftHours * 4; i++) sh = tickShift(sh, 15, true);
    expect(shiftComplete(job, sh)).toBe(true);
    expect(sh.tasksDone).toBe(Math.floor((job.shiftHours * 60) / 45));
    expect(shiftPay(job, sh)).toBe(job.salaryPerShiftGHS + job.bonusPerTaskGHS * sh.tasksDone);

    let away = startShift(job, 9);
    away = tickShift(away, 60, false);
    expect(away.tasksDone).toBe(0);
  });

  it('partial shift pays pro-rata', () => {
    let sh = startShift(job, 9);
    sh = tickShift(sh, job.shiftHours * 30, false);
    expect(shiftPay(job, sh)).toBe(Math.round(job.salaryPerShiftGHS / 2));
  });
});
