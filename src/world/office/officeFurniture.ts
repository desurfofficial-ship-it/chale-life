/**
 * O-001/O-002 — Furniture for a laid-out room (office-local metres, y = 0 at
 * the floor slab top).
 *
 * O-002: furniture is now low-poly GLB models (see officeModels.ts) placed
 * per room kind, rendered as ONE InstancedMesh per model file per floor, so a
 * whole floor of desks + chairs + cabinets is a handful of draw calls. Items
 * that have no model yet (server racks, vault door, studio desk, kitchenette,
 * teller screens) stay as instanced box `parts`. Every model placement also
 * has a box stand-in (`placementBox`) used while the GLBs stream in or if a
 * file fails to load.
 *
 * Seats: `roomSeats` is the single source of where staff sit AND which way
 * they face; chairs are placed exactly on those seats so NPCs sit in them.
 */
import type { LaidRoom } from '../../rules/office';
import { seatPositions } from '../../rules/office';
import { OFFICE_MODELS, pickModel, type ModelKind, type ModelVariant } from './officeModels';

export interface Part {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly color: string;
  /** Emissive parts (monitors, ON AIR, server LEDs) glow at night. */
  readonly glow?: boolean;
}

/** One GLB model instance (bottom-centre origin at x/z on the floor). */
export interface Placement {
  readonly kind: ModelKind;
  readonly model: ModelVariant;
  readonly x: number;
  readonly z: number;
  /** Rotation about +Y (rad). */
  readonly yaw: number;
  /** Per-axis scale in the model's own frame (default 1). */
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
}

export interface Seat {
  readonly x: number;
  readonly z: number;
  /** Facing when seated (rad about +Y; 0 = facing +Z). */
  readonly yaw: number;
}

export interface RoomFurniture {
  readonly parts: Part[];
  readonly models: Placement[];
}

const WOOD = '#c89b6a';
const SCREEN = '#15171c';

const FALLBACK_COLOR: Record<ModelKind, string> = {
  desk: '#f7f7f5',
  chair: '#2b2d36',
  visitorChair: '#2e7fa8',
  meetingTable: WOOD,
  reception: '#efe6da',
  filing: '#b8bcc4',
  cooler: '#9fd4e8',
  printer: '#dfe6e9',
  whiteboard: '#ffffff',
  partition: '#b8c4cc',
  locker: '#8a96a3',
  plant: '#3f8f4f',
  sofa: '#6c5ce7',
};

function place(
  out: Placement[],
  kind: ModelKind,
  model: ModelVariant,
  x: number,
  z: number,
  yaw = 0,
  scale: { sx?: number; sy?: number; sz?: number; s?: number } = {},
): Placement {
  const s = scale.s ?? 1;
  const p: Placement = {
    kind,
    model,
    x,
    z,
    yaw,
    sx: (scale.sx ?? 1) * s,
    sy: (scale.sy ?? 1) * s,
    sz: (scale.sz ?? 1) * s,
  };
  out.push(p);
  return p;
}

/** World-aligned footprint (half extents) of a placement, for tests/fallbacks. */
export function placementExtent(p: Placement): { hx: number; hz: number; h: number } {
  const w = p.model.w * p.sx;
  const d = p.model.d * p.sz;
  const c = Math.abs(Math.cos(p.yaw));
  const s = Math.abs(Math.sin(p.yaw));
  return { hx: (w * c + d * s) / 2, hz: (w * s + d * c) / 2, h: p.model.h * p.sy };
}

/** Box stand-in for a model (shown while GLBs load or if one fails). */
export function placementBox(p: Placement): Part {
  const e = placementExtent(p);
  return { x: p.x, y: e.h / 2, z: p.z, sx: e.hx * 2, sy: e.h, sz: e.hz * 2, color: FALLBACK_COLOR[p.kind] };
}

// ─────────────────────────────────────────────── seat layouts ────

const DESK_GAP = 0.3; // chair centre → desk front edge
const MEET_CHAIR_GAP = 0.38; // table edge → chair centre

function meetingTableFor(room: LaidRoom, officeId: string): { model: ModelVariant; s: number; cz: number } {
  const model = pickModel('meetingTable', officeId, room.spec.id);
  // table long axis runs along Z (rooms are narrow + deep): model.w → Z, model.d → X
  const s = Math.max(0.5, Math.min(1, (room.w - 1.7) / model.d, (room.d - 3.2) / model.w));
  return { model, s, cz: room.z - 0.3 };
}

function counterRow(room: LaidRoom, officeId: string): { model: ModelVariant; n: number; sx: number; cz: number } {
  const model = pickModel('reception', officeId, room.spec.id);
  const span = Math.max(0.8, room.w - 0.6);
  const n = Math.max(1, Math.round(span / model.w));
  const sx = Math.min(1.3, Math.max(0.6, span / (n * model.w)));
  return { model, n, sx, cz: room.z - room.d * 0.1 };
}

function receptionFor(room: LaidRoom, officeId: string): { model: ModelVariant; sx: number; cx: number; cz: number } {
  const model = pickModel('reception', officeId, room.spec.id);
  const sx = Math.min(1, Math.max(0.6, (room.w - 0.5) / model.w));
  return { model, sx, cx: room.x, cz: room.z + room.d * 0.15 };
}

/**
 * Staff seat spots for a room (same order the sim's `seat` index uses),
 * with the direction a seated person faces. Chairs sit exactly here.
 */
export function roomSeats(room: LaidRoom, officeId = ''): Seat[] {
  const n = Math.max(1, room.spec.seats);
  switch (room.spec.kind) {
    case 'meeting':
    case 'review': {
      const t = meetingTableFor(room, officeId);
      const L = t.model.w * t.s;
      const D = t.model.d * t.s;
      if (n === 1) return [{ x: room.x, z: t.cz + L / 2 + MEET_CHAIR_GAP, yaw: Math.PI }];
      const k = Math.ceil(n / 2);
      const span = Math.max(L, k * 0.68);
      const out: Seat[] = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const along = Math.floor(i / 2);
        out.push({
          x: room.x + side * (D / 2 + MEET_CHAIR_GAP),
          z: t.cz - span / 2 + (span * (along + 0.5)) / k,
          yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
        });
      }
      return out;
    }
    case 'counter': {
      const c = counterRow(room, officeId);
      const width = c.n * c.model.w * c.sx;
      const z = c.cz - (c.model.d * 1) / 2 - 0.45;
      return Array.from({ length: n }, (_, i) => ({ x: room.x - width / 2 + (width * (i + 0.5)) / n, z, yaw: 0 }));
    }
    case 'lobby': {
      const r = receptionFor(room, officeId);
      const width = r.model.w * r.sx;
      const z = r.cz - r.model.d / 2 - 0.45;
      return Array.from({ length: n }, (_, i) => ({ x: r.cx - width / 2 + (width * (i + 0.5)) / n, z, yaw: 0 }));
    }
    default:
      return seatPositions(room, n).map((s) => ({ x: s.x, z: s.z, yaw: Math.PI }));
  }
}

/** Where visitors stand/sit in a public room (in front of counters). */
export function visitorSpots(room: LaidRoom, officeId = ''): { x: number; z: number }[] {
  if (room.spec.kind === 'counter' || room.spec.kind === 'lobby') {
    const front =
      room.spec.kind === 'counter'
        ? counterRow(room, officeId).cz + 0.5
        : receptionFor(room, officeId).cz + 0.5;
    const out: { x: number; z: number }[] = [];
    const cols = Math.max(1, Math.floor((room.w - 0.6) / 0.6));
    const rows = Math.max(1, Math.floor((room.z + room.d / 2 - 0.3 - (front + 0.6)) / 0.6) + 1);
    for (let i = 0; i < 12; i++) {
      const slot = i % (cols * rows);
      const c = slot % cols;
      const r = Math.floor(slot / cols);
      out.push({ x: room.x - ((cols - 1) * 0.6) / 2 + c * 0.6, z: front + 0.6 + r * 0.6 });
    }
    return out;
  }
  return roomSeats(room, officeId).map((s) => ({ x: s.x, z: s.z }));
}

function colSpacing(seats: readonly Seat[], room: LaidRoom): number {
  const xs = [...new Set(seats.map((s) => Math.round(s.x * 100) / 100))].sort((a, b) => a - b);
  if (xs.length < 2) return room.w - 0.6;
  let m = Infinity;
  for (let i = 1; i < xs.length; i++) m = Math.min(m, xs[i] - xs[i - 1]);
  return m;
}

function deskSets(models: Placement[], room: LaidRoom, officeId: string, seats: readonly Seat[]): { deskW: number } {
  const desk = pickModel('desk', officeId);
  const chair = pickModel('chair', officeId);
  const sx = Math.min(1, Math.max(0.7, (colSpacing(seats, room) * 0.9) / desk.w));
  for (const s of seats) {
    place(models, 'desk', desk, s.x, s.z - DESK_GAP - desk.d / 2, 0, { sx });
    place(models, 'chair', chair, s.x, s.z, Math.PI);
  }
  return { deskW: desk.w * sx };
}

export function furnitureFor(room: LaidRoom, officeId = ''): RoomFurniture {
  const parts: Part[] = [];
  const models: Placement[] = [];
  const seats = roomSeats(room, officeId);
  const { x, z, w, d } = room;
  const back = z - d / 2;
  const front = z + d / 2;
  const left = x - w / 2;
  const right = x + w / 2;
  const plant = pickModel('plant', officeId, room.spec.id);
  const filing = pickModel('filing', officeId);
  const cooler = pickModel('cooler', officeId);

  switch (room.spec.kind) {
    case 'desks':
    case 'private': {
      deskSets(models, room, officeId, seats);
      place(models, 'plant', plant, left + 0.45, front - 0.6);
      if (w >= 2.2) place(models, 'filing', filing, right - filing.w / 2 - 0.15, back + filing.d / 2 + 0.12);
      if (room.spec.kind === 'desks' && seats.length >= 4 && w >= 2.6)
        place(models, 'cooler', cooler, left + cooler.w / 2 + 0.15, back + cooler.d / 2 + 0.12);
      break;
    }
    case 'booths': {
      const { deskW } = deskSets(models, room, officeId, seats);
      const part = pickModel('partition', officeId);
      const len = 1.1 / part.w;
      for (const s of seats) {
        for (const side of [-1, 1]) {
          place(models, 'partition', part, s.x + side * (deskW / 2 + 0.08), s.z - 0.45, Math.PI / 2, { sx: len, sz: 0.5 });
        }
      }
      place(models, 'cooler', cooler, left + cooler.w / 2 + 0.15, front - 0.6);
      break;
    }
    case 'counter': {
      const c = counterRow(room, officeId);
      const width = c.n * c.model.w * c.sx;
      for (let i = 0; i < c.n; i++) {
        place(models, 'reception', c.model, x - width / 2 + (width * (i + 0.5)) / c.n, c.cz, 0, { sx: c.sx });
      }
      const chair = pickModel('chair', officeId, 'counter');
      for (const s of seats) {
        place(models, 'chair', chair, s.x, s.z, 0);
        // teller screen on the staff worktop, glows at night
        parts.push({ x: s.x, y: 0.98, z: c.cz - c.model.d * 0.2, sx: 0.4, sy: 0.26, sz: 0.04, color: SCREEN, glow: true });
      }
      break;
    }
    case 'hall': {
      const vc = pickModel('visitorChair', officeId);
      for (const s of seats) place(models, 'visitorChair', vc, s.x, s.z, Math.PI);
      place(models, 'plant', plant, right - 0.45, back + 0.45);
      place(models, 'cooler', cooler, left + cooler.w / 2 + 0.15, back + cooler.d / 2 + 0.12);
      break;
    }
    case 'meeting':
    case 'review': {
      const t = meetingTableFor(room, officeId);
      place(models, 'meetingTable', t.model, x, t.cz, Math.PI / 2, { s: t.s });
      const chair = room.spec.kind === 'meeting' ? pickModel('visitorChair', officeId, 'meet') : pickModel('chair', officeId);
      const kind: ModelKind = room.spec.kind === 'meeting' ? 'visitorChair' : 'chair';
      for (const s of seats) place(models, kind, chair, s.x, s.z, s.yaw);
      const wb = pickModel('whiteboard', officeId, room.spec.id);
      place(models, 'whiteboard', wb, x, back + wb.d / 2 + 0.12, 0, { sx: Math.min(1, (w - 0.5) / wb.w) });
      if (w >= 2.6) place(models, 'plant', plant, right - 0.4, front - 0.6);
      break;
    }
    case 'break': {
      // kitchenette run along the west wall (no model yet)
      parts.push({ x: left + 0.5, y: 0.45, z, sx: 0.7, sy: 0.9, sz: Math.min(d - 1.2, 2.2), color: '#e9e1cf' });
      place(models, 'cooler', cooler, right - cooler.w / 2 - 0.15, back + cooler.d / 2 + 0.12);
      const sofa = OFFICE_MODELS.sofa[0];
      place(models, 'sofa', sofa, x + 0.2, z + 1.7, Math.PI, { s: Math.min(1, (w - 1.6) / sofa.w) });
      // low table between kitchenette and sofa
      parts.push({ x: x + 0.2, y: 0.4, z: z + 0.3, sx: Math.min(w - 1.8, 1.0), sy: 0.05, sz: 0.6, color: '#2e8b57' });
      if (w >= 3) {
        const locker = pickModel('locker', officeId);
        place(models, 'locker', locker, x, back + locker.d / 2 + 0.12);
      }
      place(models, 'plant', plant, right - 0.4, front - 0.6);
      break;
    }
    case 'vault':
      parts.push({ x, y: 1.0, z: back + 0.3, sx: 1.4, sy: 2.0, sz: 0.4, color: '#7f8c8d' });
      parts.push({ x, y: 1.0, z: back + 0.52, sx: 0.5, sy: 0.5, sz: 0.06, color: '#c9a227' });
      place(models, 'filing', filing, right - filing.w / 2 - 0.2, z + 0.5, -Math.PI / 2);
      break;
    case 'server':
      for (let i = 0; i < 3; i++) {
        const rx = x - 0.9 + i * 0.9;
        parts.push({ x: rx, y: 0.95, z, sx: 0.6, sy: 1.9, sz: 0.8, color: '#22262e' });
        parts.push({ x: rx, y: 1.2, z: z + 0.41, sx: 0.4, sy: 0.05, sz: 0.02, color: '#00e676', glow: true });
        parts.push({ x: rx, y: 0.8, z: z + 0.41, sx: 0.4, sy: 0.05, sz: 0.02, color: '#29b6f6', glow: true });
      }
      break;
    case 'records': {
      const n = Math.max(1, Math.min(4, Math.floor((w - 0.8) / (filing.w + 0.08))));
      for (let i = 0; i < n; i++) {
        place(models, 'filing', filing, x - ((n - 1) * (filing.w + 0.08)) / 2 + i * (filing.w + 0.08), back + filing.d / 2 + 0.12);
      }
      const printer = pickModel('printer', officeId);
      place(models, 'printer', printer, right - printer.d / 2 - 0.15, front - 2.2, -Math.PI / 2);
      deskSets(models, room, officeId, seats);
      break;
    }
    case 'studio': {
      parts.push({ x, y: 0.74, z, sx: Math.min(w - 1, 2), sy: 0.06, sz: 0.9, color: '#2d3436' }); // mixing desk
      const chair = pickModel('chair', officeId, 'studio');
      for (const s of seats) place(models, 'chair', chair, s.x, s.z, s.yaw);
      parts.push({ x, y: 1.0, z, sx: 0.06, sy: 0.4, sz: 0.06, color: '#636e72' }); // mic
      parts.push({ x, y: 1.25, z: back + 0.12, sx: 0.9, sy: 0.3, sz: 0.04, color: '#ff1744', glow: true }); // ON AIR
      break;
    }
    case 'lobby': {
      const r = receptionFor(room, officeId);
      place(models, 'reception', r.model, r.cx, r.cz, 0, { sx: r.sx });
      const chair = pickModel('chair', officeId, 'lobby');
      for (const s of seats) place(models, 'chair', chair, s.x, s.z, 0);
      place(models, 'plant', plant, left + 0.4, front - 0.6);
      if (w >= 1.6) place(models, 'cooler', cooler, right - cooler.w / 2 - 0.12, back + cooler.d / 2 + 0.12);
      break;
    }
  }
  return { parts, models };
}
