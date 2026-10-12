// ─── Third-person camera spring-arm (engine-agnostic, no three.js) ──────────
// The map's sim found that a fixed 4.3 m-behind / 2.35 m-up camera ends up
// inside a solid on ~8.7 % of player poses (market stalls, alley walls, the
// airport fence). This module is the game-side fix: cast the arm from the
// character's head toward the desired camera spot and stop it short of the
// first collider box, so the camera never enters a building and never loses
// sight of the player.
//
// Pure data in, numbers out: feed it the collider boxes exported with the map
// (sim/data/colliders.json — metres, Y-up, world origin). Use it every frame:
//
//   const arm = createSpringArm(colliders.boxes)
//   const cam = arm.solve(px, pz, yaw)      // → { x, y, z, length }
//   camera.position.lerp(cam, 1 - Math.exp(-dt * 12))   // smooth it
//
// Same file is mirrored in sim/src/springArm.ts and proven there.

export interface ArmBox {
  min: [number, number, number]
  max: [number, number, number]
  kind?: string
}

export interface ArmConfig {
  distance: number // desired arm length (m)
  height: number // desired camera height above ground (m)
  pivotY: number // head height the arm hangs from (m)
  radius: number // camera collision radius (near plane + margin)
  minLength: number // never pull in closer than this
  step: number // march step (m)
  margin: number // stop this far before the first hit
}

export const DEFAULT_ARM: ArmConfig = {
  distance: 4.3,
  height: 2.35,
  pivotY: 1.78,
  radius: 0.3,
  minLength: 0.6,
  step: 0.1,
  margin: 0.1,
}

const CELL = 8

export function createSpringArm(boxes: ArmBox[], cfg: ArmConfig = DEFAULT_ARM) {
  // ground decals (top < 0.4 m) never block a camera
  const solid = boxes.filter((b) => b.max[1] >= 0.4)
  const buckets = new Map<number, ArmBox[]>()
  const key = (ix: number, iz: number) => (ix + 4096) * 8192 + (iz + 4096)
  for (const b of solid) {
    const ix0 = Math.floor(b.min[0] / CELL), ix1 = Math.floor(b.max[0] / CELL)
    const iz0 = Math.floor(b.min[2] / CELL), iz1 = Math.floor(b.max[2] / CELL)
    for (let ix = ix0; ix <= ix1; ix++)
      for (let iz = iz0; iz <= iz1; iz++) {
        const k = key(ix, iz)
        let a = buckets.get(k)
        if (!a) buckets.set(k, (a = []))
        a.push(b)
      }
  }

  function sphereHits(x: number, y: number, z: number, r: number): boolean {
    const a = buckets.get(key(Math.floor(x / CELL), Math.floor(z / CELL)))
    // the sphere can straddle a bucket edge: check neighbours when near one
    const lists: (ArmBox[] | undefined)[] = [a]
    const fx = x / CELL - Math.floor(x / CELL), fz = z / CELL - Math.floor(z / CELL)
    const rr = r / CELL
    if (fx < rr) lists.push(buckets.get(key(Math.floor(x / CELL) - 1, Math.floor(z / CELL))))
    if (fx > 1 - rr) lists.push(buckets.get(key(Math.floor(x / CELL) + 1, Math.floor(z / CELL))))
    if (fz < rr) lists.push(buckets.get(key(Math.floor(x / CELL), Math.floor(z / CELL) - 1)))
    if (fz > 1 - rr) lists.push(buckets.get(key(Math.floor(x / CELL), Math.floor(z / CELL) + 1)))
    for (const list of lists) {
      if (!list) continue
      for (const b of list) {
        const nx = Math.max(b.min[0], Math.min(x, b.max[0]))
        const ny = Math.max(b.min[1], Math.min(y, b.max[1]))
        const nz = Math.max(b.min[2], Math.min(z, b.max[2]))
        const dx = x - nx, dy = y - ny, dz = z - nz
        if (dx * dx + dy * dy + dz * dz < r * r) return true
      }
    }
    return false
  }

  /**
   * Camera position for a player at (px, pz) facing `yaw` (radians, 0 = +Z).
   * The camera sits behind the player (opposite the facing direction).
   */
  function solve(px: number, pz: number, yaw: number, out = { x: 0, y: 0, z: 0, length: 0, pulled: false }) {
    const dirX = -Math.sin(yaw)
    const dirZ = -Math.cos(yaw)
    const rise = cfg.height - cfg.pivotY
    // unit vector along the arm (behind + slightly up)
    const len = Math.hypot(cfg.distance, rise)
    const ux = (dirX * cfg.distance) / len
    const uy = rise / len
    const uz = (dirZ * cfg.distance) / len

    let safe = 0
    let hit = false
    for (let d = cfg.step; d <= len + 1e-6; d += cfg.step) {
      if (sphereHits(px + ux * d, cfg.pivotY + uy * d, pz + uz * d, cfg.radius)) {
        hit = true
        break
      }
      safe = d
    }
    let L = hit ? Math.max(0, safe - cfg.margin) : len
    if (L < cfg.minLength) {
      // boxed in tight (player's back to a wall): lift the camera over the
      // head instead of pushing it into the wall — a short, steep arm
      L = cfg.minLength
      out.x = px + dirX * 0.15
      out.y = cfg.pivotY + 1.1
      out.z = pz + dirZ * 0.15
    } else {
      out.x = px + ux * L
      out.y = cfg.pivotY + uy * L
      out.z = pz + uz * L
    }
    out.length = L
    out.pulled = hit
    return out
  }

  return { solve, sphereHits }
}
