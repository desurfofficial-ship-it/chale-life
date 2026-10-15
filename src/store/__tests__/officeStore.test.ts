import { beforeEach, describe, expect, it } from 'vitest';

// node test env: minimal in-memory localStorage for the save round-trip
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;
import { getState } from '../gameStore';
import { getAmbientHour } from '../ambientClock';
import {
  __resetOfficesForTests,
  applyForJob,
  endShift,
  getOfficeState,
  requestPlayerFloor,
  setAtDesk,
  startShift,
  tickOffices,
} from '../officeStore';
import { getTycoonState } from '../tycoonStore';

describe('officeStore (O-001)', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetOfficesForTests();
  });

  it('world-run office sims never change the wallet', () => {
    const before = getState().wallet.balanceGHS;
    for (let i = 0; i < 400; i++) tickOffices(0.25, 10 + i * 0.02);
    expect(getState().wallet.balanceGHS).toBe(before);
    // and never appear in the player's tycoon business list
    const ids = getTycoonState().businesses.map((b) => b.typeId);
    expect(ids.some((id) => id.startsWith('OFF_'))).toBe(false);
  });

  it('NPCs moving between floors queue for the lift', () => {
    let sawTransit = false;
    for (let i = 0; i < 600 && !sawTransit; i++) {
      tickOffices(0.25, 9 + i * 0.01);
      sawTransit = Object.values(getOfficeState().transit).some((t) => t.mode === 'lift');
    }
    expect(sawTransit).toBe(true);
  });

  it('player rides the lift to the floor they picked', () => {
    requestPlayerFloor('OFF_KOTOKA_TECH_HUB', 1);
    for (let i = 0; i < 400 && getOfficeState().player.floor !== 1; i++) tickOffices(0.05);
    expect(getOfficeState().player.floor).toBe(1);
    expect(getOfficeState().player.inLift).toBe(false);
  });

  it('apply → start shift → sit at desk → finish → salary lands', () => {
    expect(applyForJob('OJOB_OFFICE_ASSISTANT').ok).toBe(true);
    const h = getAmbientHour();
    const started = startShift('OJOB_OFFICE_ASSISTANT');
    if (!(h >= 8 && h < 14)) {
      expect(started.ok).toBe(false);
      return;
    }
    expect(started.ok).toBe(true);
    expect(setAtDesk(true).ok).toBe(true); // desk on G, player starts on G
    const wallet = getState().wallet.balanceGHS;
    // 6 h shift = 360 game min = 2160 real s; tickOffices auto-ends the shift
    for (let i = 0; i < 2200 && getOfficeState().player.shift; i++) tickOffices(1, 10);
    expect(getOfficeState().player.shift).toBeNull();
    expect(getOfficeState().player.lastPayGHS).toBeGreaterThan(60);
    expect(getState().wallet.balanceGHS).toBe(wallet + getOfficeState().player.lastPayGHS);
    expect(getOfficeState().player.completedShifts.OJOB_OFFICE_ASSISTANT).toBe(1);
    expect(endShift().ok).toBe(false);
  });

  it('senior job is locked until promoted or trait matches', () => {
    applyForJob('OJOB_JUNIOR_DEV');
    const r = startShift('OJOB_JUNIOR_DEV');
    const h = getAmbientHour();
    if (h >= 8 && h < 16) expect(r.message).toMatch(/Requires trait/);
    expect(r.ok).toBe(false);
  });

  it('hiring persists across a reload', () => {
    applyForJob('OJOB_OFFICE_ASSISTANT');
    const saved = JSON.parse(localStorage.getItem('chale.office.v1') ?? '{}');
    expect(saved.employedJobIds).toContain('OJOB_OFFICE_ASSISTANT');
  });

  it('world-run offices are not hiring', () => {
    expect(applyForJob('NOPE').ok).toBe(false);
  });

  it('entry job starts within its shift window', () => {
    applyForJob('OJOB_OFFICE_ASSISTANT');
    const r = startShift('OJOB_OFFICE_ASSISTANT');
    const h = getAmbientHour();
    if (h >= 8 && h < 14) expect(r.ok).toBe(true);
    else expect(r.ok).toBe(false);
  });
});
