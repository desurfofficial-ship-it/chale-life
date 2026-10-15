/**
 * Arc-length road paths with rounded corners, smoothed yaw, lane offsets,
 * and a simple gap-keeping rule. Pure TS — no three.js.
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
  /** yaw at segment start (rad) */
  yaw0: number;
  /** yaw at segment end (rad) — differs on curves */
  yaw1: number;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Insert quarter-circle fillets of radius `r` at interior corners. */
export function roundCorners(points: readonly Vec2[], r: number, closed = true): Vec2[] {
  if (points.length < 3 || r <= 0) return points.slice();
  const n = points.length;
  const out: Vec2[] = [];
  const count = closed ? n : n;
  for (let i = 0; i < count; i++) {
    if (!closed && (i === 0 || i === n - 1)) {
      out.push({ ...points[i] });
      continue;
    }
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const dx0 = cur.x - prev.x;
    const dz0 = cur.z - prev.z;
    const len0 = Math.hypot(dx0, dz0) || 1;
    const dx1 = next.x - cur.x;
    const dz1 = next.z - cur.z;
    const len1 = Math.hypot(dx1, dz1) || 1;
    const rr = Math.min(r, len0 * 0.45, len1 * 0.45);
    const a = { x: cur.x - (dx0 / len0) * rr, z: cur.z - (dz0 / len0) * rr };
    const b = { x: cur.x + (dx1 / len1) * rr, z: cur.z + (dz1 / len1) * rr };
    // sample arc (5 steps)
    const steps = 5;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // approximate with quadratic bezier through corner
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cur.x + t * t * b.x;
      const z = (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * cur.z + t * t * b.z;
      out.push({ x, z });
    }
  }
  return out;
}

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
    const yaw = Math.atan2(-dz, dx);
    segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, length, yaw0: yaw, yaw1: yaw });
  }
  // smooth yaw across joins: set yaw1 of each to yaw0 of next
  for (let i = 0; i < segs.length; i++) {
    const next = segs[(i + 1) % segs.length];
    segs[i].yaw1 = next.yaw0;
  }
  return segs;
}

export function pathLength(segs: readonly Segment[]): number {
  let t = 0;
  for (const s of segs) t += s.length;
  return t;
}

export function poseAt(segs: readonly Segment[], totalLen: number, s: number, out: Pose): Pose {
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
      out.yaw = lerpAngle(seg.yaw0, seg.yaw1, u);
      return out;
    }
    d -= seg.length;
  }
  const last = segs[segs.length - 1];
  out.x = last.bx;
  out.z = last.bz;
  out.yaw = last.yaw1;
  return out;
}

/** Offset pose sideways by `lane` metres (positive = left of travel). */
export function laneOffset(pose: Pose, lane: number, out: Pose = { x: 0, z: 0, yaw: 0 }): Pose {
  const lx = -Math.sin(pose.yaw);
  const lz = -Math.cos(pose.yaw);
  out.x = pose.x + lx * lane;
  out.z = pose.z + lz * lane;
  out.yaw = pose.yaw;
  return out;
}

/**
 * Gap-keeping: given ordered arc distances on a loop of length L,
 * return speed scale 0.15–1 for vehicle i (slow when leader < gapM ahead).
 */
export function gapSpeedScale(
  distances: readonly number[],
  i: number,
  loopLen: number,
  gapM = 4,
  speeds: readonly number[],
): number {
  if (loopLen <= 0 || distances.length < 2) return 1;
  const mine = distances[i];
  let nearest = Infinity;
  for (let j = 0; j < distances.length; j++) {
    if (j === i) continue;
    let ahead = distances[j] - mine;
    ahead = ((ahead % loopLen) + loopLen) % loopLen;
    if (ahead < nearest) nearest = ahead;
  }
  if (nearest >= gapM) return 1;
  const base = speeds[i] ?? 1;
  // linear slow to 0.15× when almost touching
  return Math.max(0.15, nearest / gapM) * (base > 0 ? 1 : 1);
}
