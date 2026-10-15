/**
 * O-001 — Furniture for a laid-out room, as plain box parts (office-local,
 * metres, y = 0 at the floor slab). Rendered as ONE instanced box mesh per
 * floor (+ one emissive mesh for screens/lights), so a whole floor of desks,
 * chairs and monitors is two draw calls.
 */
import type { LaidRoom } from '../../rules/office';
import { seatPositions } from '../../rules/office';

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

const DESK = '#f7f7f5';
const LEG = '#c9c9cf';
const CHAIR = '#2b2d36';
const SCREEN = '#15171c';
const WOOD = '#c89b6a';
const PLANT = '#3f8f4f';
const POT = '#e9e4da';

function deskSet(out: Part[], x: number, z: number): void {
  // desk top + legs block, monitor, chair (staff sits at +z, faces −z)
  out.push({ x, y: 0.74, z: z - 0.45, sx: 1.1, sy: 0.05, sz: 0.6, color: DESK });
  out.push({ x, y: 0.36, z: z - 0.45, sx: 1.0, sy: 0.7, sz: 0.04, color: LEG });
  out.push({ x, y: 0.98, z: z - 0.62, sx: 0.55, sy: 0.34, sz: 0.04, color: SCREEN, glow: true });
  out.push({ x, y: 0.82, z: z - 0.6, sx: 0.06, sy: 0.12, sz: 0.06, color: SCREEN });
  out.push({ x, y: 0.45, z: z + 0.05, sx: 0.46, sy: 0.08, sz: 0.46, color: CHAIR });
  out.push({ x, y: 0.75, z: z + 0.27, sx: 0.46, sy: 0.55, sz: 0.06, color: CHAIR });
}

function plant(out: Part[], x: number, z: number): void {
  out.push({ x, y: 0.2, z, sx: 0.32, sy: 0.4, sz: 0.32, color: POT });
  out.push({ x, y: 0.7, z, sx: 0.45, sy: 0.6, sz: 0.45, color: PLANT });
}

/** Staff seat spots for a room (same order the sim's `seat` index uses). */
export function roomSeats(room: LaidRoom): { x: number; z: number }[] {
  return seatPositions(room, Math.max(1, room.spec.seats));
}

export function furnitureFor(room: LaidRoom): Part[] {
  const out: Part[] = [];
  const seats = roomSeats(room);
  const { x, z, w, d } = room;
  switch (room.spec.kind) {
    case 'desks':
    case 'private':
      for (const s of seats) deskSet(out, s.x, s.z);
      if (room.spec.kind === 'private') out.push({ x: x + w / 2 - 0.5, y: 0.9, z: z - d / 2 + 0.3, sx: 0.8, sy: 1.8, sz: 0.35, color: WOOD });
      plant(out, x - w / 2 + 0.4, z + d / 2 - 0.4);
      break;
    case 'booths':
      for (const s of seats) {
        deskSet(out, s.x, s.z);
        // booth dividers either side
        out.push({ x: s.x - 0.62, y: 0.65, z: s.z - 0.35, sx: 0.04, sy: 1.3, sz: 0.9, color: '#b8c4cc' });
        out.push({ x: s.x + 0.62, y: 0.65, z: s.z - 0.35, sx: 0.04, sy: 1.3, sz: 0.9, color: '#b8c4cc' });
      }
      break;
    case 'counter': {
      // long counter across the room, staff behind (−z side), glass top
      out.push({ x, y: 0.55, z: z - d * 0.1, sx: w - 0.8, sy: 1.1, sz: 0.6, color: '#e8e2d4' });
      out.push({ x, y: 1.25, z: z - d * 0.1, sx: w - 0.8, sy: 0.3, sz: 0.04, color: '#bfe3f0' });
      for (let i = 0; i < seats.length; i++) {
        const sx = x - (w - 0.8) / 2 + ((w - 0.8) * (i + 0.5)) / seats.length;
        out.push({ x: sx, y: 1.0, z: z - d * 0.1 - 0.15, sx: 0.4, sy: 0.28, sz: 0.04, color: SCREEN, glow: true });
      }
      break;
    }
    case 'hall':
      // rows of waiting chairs (numbered-chair look)
      for (const s of seats) out.push({ x: s.x, y: 0.42, z: s.z, sx: 0.5, sy: 0.08, sz: 0.48, color: '#2e7fa8' });
      for (const s of seats) out.push({ x: s.x, y: 0.62, z: s.z + 0.22, sx: 0.5, sy: 0.4, sz: 0.05, color: '#2e7fa8' });
      plant(out, x + w / 2 - 0.4, z - d / 2 + 0.4);
      break;
    case 'meeting':
    case 'review': {
      const tw = Math.min(w - 1.4, 2.6);
      const td = Math.min(d - 1.8, 1.2);
      out.push({ x, y: 0.74, z, sx: tw, sy: 0.06, sz: td, color: room.spec.kind === 'meeting' ? WOOD : DESK });
      out.push({ x, y: 0.36, z, sx: 0.12, sy: 0.7, sz: 0.12, color: LEG });
      for (let i = 0; i < seats.length; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const along = seats.length > 1 ? (Math.floor(i / 2) / Math.max(1, Math.ceil(seats.length / 2) - 1) - 0.5) * (tw - 0.6) : 0;
        out.push({ x: x + along, y: 0.45, z: z + side * (td / 2 + 0.35), sx: 0.44, sy: 0.08, sz: 0.44, color: CHAIR });
      }
      // whiteboard / routines board on the back wall
      out.push({ x, y: 1.0, z: z - d / 2 + 0.12, sx: Math.min(w - 1, 2), sy: 0.9, sz: 0.05, color: '#ffffff' });
      break;
    }
    case 'break':
      out.push({ x: x - w / 2 + 0.5, y: 0.45, z, sx: 0.7, sy: 0.9, sz: Math.min(d - 1.2, 2.2), color: '#e9e1cf' }); // kitchenette
      out.push({ x: x + w / 2 - 0.45, y: 0.55, z: z - d / 2 + 0.45, sx: 0.32, sy: 1.1, sz: 0.32, color: '#9fd4e8' }); // water dispenser
      out.push({ x, y: 0.3, z: z + d / 2 - 0.6, sx: Math.min(w - 1.2, 1.8), sy: 0.45, sz: 0.7, color: '#6c5ce7' }); // sofa
      out.push({ x, y: 0.4, z: z + 0.2, sx: 1.0, sy: 0.05, sz: 0.6, color: '#2e8b57' }); // ping-pong / table
      break;
    case 'vault':
      out.push({ x, y: 1.0, z: z - d / 2 + 0.3, sx: 1.4, sy: 2.0, sz: 0.4, color: '#7f8c8d' });
      out.push({ x, y: 1.0, z: z - d / 2 + 0.52, sx: 0.5, sy: 0.5, sz: 0.06, color: '#c9a227' });
      break;
    case 'server':
      for (let i = 0; i < 3; i++) {
        const rx = x - 0.9 + i * 0.9;
        out.push({ x: rx, y: 0.95, z, sx: 0.6, sy: 1.9, sz: 0.8, color: '#22262e' });
        out.push({ x: rx, y: 1.2, z: z + 0.41, sx: 0.4, sy: 0.05, sz: 0.02, color: '#00e676', glow: true });
        out.push({ x: rx, y: 0.8, z: z + 0.41, sx: 0.4, sy: 0.05, sz: 0.02, color: '#29b6f6', glow: true });
      }
      break;
    case 'records':
      for (let i = 0; i < 3; i++) out.push({ x: x - w / 2 + 0.6 + i * 1.1, y: 0.9, z: z - d / 2 + 0.35, sx: 0.9, sy: 1.8, sz: 0.4, color: WOOD });
      out.push({ x: x + w / 2 - 0.6, y: 0.5, z: z + d / 2 - 0.6, sx: 0.7, sy: 0.9, sz: 0.5, color: '#dfe6e9' }); // printer/copier
      break;
    case 'studio':
      out.push({ x, y: 0.74, z, sx: Math.min(w - 1, 2), sy: 0.06, sz: 0.9, color: '#2d3436' }); // mixing desk
      for (const s of seats) out.push({ x: s.x, y: 0.45, z: s.z + 0.2, sx: 0.44, sy: 0.08, sz: 0.44, color: CHAIR });
      out.push({ x, y: 1.0, z: z, sx: 0.06, sy: 0.4, sz: 0.06, color: '#636e72' }); // mic
      out.push({ x, y: 1.25, z: z - d / 2 + 0.12, sx: 0.9, sy: 0.3, sz: 0.04, color: '#ff1744', glow: true }); // ON AIR
      break;
    case 'lobby':
      out.push({ x: x + 0.3, y: 0.55, z: z + d * 0.15, sx: Math.min(w - 1, 1.8), sy: 1.1, sz: 0.55, color: '#efe6da' }); // reception
      plant(out, x - w / 2 + 0.4, z + d / 2 - 0.4);
      break;
  }
  return out;
}
