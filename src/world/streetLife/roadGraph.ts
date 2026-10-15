/**
 * Road graph pose helpers (W-008) — pure, no three.js.
 * Closed loops of straight segments; distance → {x,z,yaw} into a reused out object.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Pose {
  x: number;
  z: number;
  yaw: number;
}

export interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  length: number;
}

/** Build a polyline of straight segments (open or closed). */
export function buildSegments(points: readonly Vec2[], closed = true): Segment[] {
  if (points.length < 2) return [];
  const segs: Segment[] = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) continue;
    segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, length });
  }
  return segs;
}

export function loopLength(segs: readonly Segment[]): number {
  let t = 0;
  for (const s of segs) t += s.length;
  return t;
}

/**
 * Write pose at arc length `s` (wraps for closed loops) into `out`.
 * No allocations beyond the write.
 */
export function poseAt(
  segs: readonly Segment[],
  totalLen: number,
  s: number,
  out: Pose,
): Pose {
  if (!segs.length || totalLen <= 0) {
    out.x = 0;
    out.z = 0;
    out.yaw = 0;
    return out;
  }
  let d = ((s % totalLen) + totalLen) % totalLen;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (d <= seg.length || i === segs.length - 1) {
      const u = seg.length > 1e-6 ? Math.min(1, d / seg.length) : 0;
      out.x = seg.ax + (seg.bx - seg.ax) * u;
      out.z = seg.az + (seg.bz - seg.az) * u;
      out.yaw = Math.atan2(-(seg.bz - seg.az), seg.bx - seg.ax);
      return out;
    }
    d -= seg.length;
  }
  const last = segs[segs.length - 1];
  out.x = last.bx;
  out.z = last.bz;
  out.yaw = Math.atan2(-(last.bz - last.az), last.bx - last.ax);
  return out;
}

/** Offset a pose sideways (right-hand = positive lane). */
export function laneOffset(pose: Pose, lateral: number, out: Pose): Pose {
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  // right perpendicular on XZ: (c,s) forward → (s, -c) or (-s, c)
  out.x = pose.x + s * lateral;
  out.z = pose.z - c * lateral;
  out.yaw = pose.yaw;
  return out;
}

/**
 * Continuity check helper: max jump between samples along the loop.
 * Used by unit tests.
 */
export function maxPoseJump(
  segs: readonly Segment[],
  totalLen: number,
  step: number,
): number {
  const a: Pose = { x: 0, z: 0, yaw: 0 };
  const b: Pose = { x: 0, z: 0, yaw: 0 };
  poseAt(segs, totalLen, 0, a);
  let max = 0;
  for (let s = step; s <= totalLen + step * 0.5; s += step) {
    poseAt(segs, totalLen, s, b);
    const jump = Math.hypot(b.x - a.x, b.z - a.z);
    if (jump > max) max = jump;
    a.x = b.x;
    a.z = b.z;
    a.yaw = b.yaw;
  }
  return max;
}

/** Primary city traffic loops (hand-authored from major ROADS corridors). */
export const CITY_LOOPS: readonly { id: string; points: readonly Vec2[] }[] = [
  {
    id: 'ring-central',
    points: [
      { x: -100, z: 10 },
      { x: 120, z: 10 },
      { x: 120, z: -50 },
      { x: -100, z: -50 },
    ],
  },
  {
    id: 'ring-south',
    points: [
      { x: -80, z: 28 },
      { x: 80, z: 28 },
      { x: 80, z: 8 },
      { x: -80, z: 8 },
    ],
  },
  {
    id: 'ring-west',
    points: [
      { x: -150, z: 4 },
      { x: -110, z: 4 },
      { x: -110, z: -40 },
      { x: -150, z: -40 },
    ],
  },
];

/** Pavement walk loops — inset from traffic (same shapes, smaller). */
export const WALK_LOOPS: readonly { id: string; points: readonly Vec2[] }[] = [
  {
    id: 'walk-central',
    points: [
      { x: -96, z: 14 },
      { x: 116, z: 14 },
      { x: 116, z: -46 },
      { x: -96, z: -46 },
    ],
  },
  {
    id: 'walk-south',
    points: [
      { x: -76, z: 32 },
      { x: 76, z: 32 },
      { x: 76, z: 12 },
      { x: -76, z: 12 },
    ],
  },
];

export const LANE_WIDTH = 3.2;
