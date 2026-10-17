/**
 * Orthographic zoom-to-fit maths (C-001).
 * zoom = px per world-metre (R3F OrthographicCamera.zoom).
 * Visible world width  = canvasWidth  / zoom
 * Visible world height = canvasHeight / zoom
 */

export interface HudInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WorldBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Default phone HUD chrome insets (px) for Fit framing. */
export const DEFAULT_HUD_INSETS: HudInsets = {
  top: 72,
  bottom: 120,
  left: 12,
  right: 12,
};

/**
 * Camera look-at bounds. MUST cover everything the walker can reach —
 * worldBounds (colliders.ts) lets the player walk to z −170 (NorthReach
 * offices at z −139…−152), so a −116 floor here stranded the follow camera
 * 56 m short of the Gold Coast Bank: the walker left the screen and the
 * office cutaway's 45 m proximity probe could never fire (audit 2026-10-17,
 * live __CAM probe: tz frozen at −96 with the player at z −139).
 * The plate apron (AccraWorld plinths) renders ground to z −366, so framing
 * slightly past the plate edge is safe.
 */
export const CITY_BOUNDS: WorldBox = {
  minX: -280,
  maxX: 340,
  minZ: -170,
  maxZ: 116,
};

/**
 * Pan/follow clamp margin that scales with zoom. A fixed 20 m margin pushed
 * the walker off-screen at street zoom (viewH ≈ 28 m at zoom 30): the camera
 * stopped 20 m short of the player near a bound and the follow ease parked
 * there. Margin = 30 % of the visible height keeps the player on screen at
 * any zoom while still never framing past the plate at overview zooms.
 */
export function clampMarginForZoom(zoom: number, canvasH: number): number {
  const viewH = canvasH / Math.max(1e-3, zoom);
  return Math.min(20, Math.max(3, viewH * 0.3));
}

/**
 * Ortho zoom that fits `box` into the canvas minus HUD insets.
 * `padding` > 1 leaves a margin around the box.
 */
export function zoomToFitBox(
  box: WorldBox,
  canvasW: number,
  canvasH: number,
  insets: HudInsets = DEFAULT_HUD_INSETS,
  padding = 1.12,
): number {
  const availW = Math.max(1, canvasW - insets.left - insets.right);
  const availH = Math.max(1, canvasH - insets.top - insets.bottom);
  const boxW = Math.max(1e-3, (box.maxX - box.minX) * padding);
  const boxD = Math.max(1e-3, (box.maxZ - box.minZ) * padding);
  const zoomW = availW / boxW;
  const zoomH = availH / boxD;
  const z = Math.min(zoomW, zoomH);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

export function boxCenter(box: WorldBox): { x: number; z: number } {
  return { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
}

/** Axis-aligned box from a list of centres with half-extents. */
export function boxFromPoints(
  points: readonly { x: number; z: number }[],
  pad = 8,
): WorldBox {
  if (!points.length) return { ...CITY_BOUNDS };
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
  };
}

/**
 * Rotate a camera offset (x, z) around Y by yaw radians.
 * Pitch (y) is unchanged.
 */
export function rotateOffsetXZ(
  ox: number,
  oy: number,
  oz: number,
  yaw: number,
): { x: number; y: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: ox * c - oz * s,
    y: oy,
    z: ox * s + oz * c,
  };
}

/**
 * Screen-pixel pan → world XZ delta, accounting for camera yaw.
 * Screen +x should move the view right; +y (down) moves view "forward" on ground.
 */
export function panDeltaWorld(
  dxPx: number,
  dyPx: number,
  zoom: number,
  yaw: number,
): { x: number; z: number } {
  const w = 1 / Math.max(1e-6, zoom);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Unrotated: screen +x → −world x (existing CameraRig convention), +y → −world z
  const lx = -dxPx * w;
  const lz = -dyPx * w;
  return {
    x: lx * c - lz * s,
    z: lx * s + lz * c,
  };
}

/** Clamp a look-at point into the city box with a margin. */
export function clampTarget(
  x: number,
  z: number,
  bounds: WorldBox = CITY_BOUNDS,
  margin = 20,
): { x: number; z: number } {
  return {
    x: Math.min(bounds.maxX - margin, Math.max(bounds.minX + margin, x)),
    z: Math.min(bounds.maxZ - margin, Math.max(bounds.minZ + margin, z)),
  };
}

/**
 * Detail LOD band from relative zoom (absoluteZoom / fitCityZoom).
 * < 3× overview, 3–8× mid, > 8× full.
 */
export type DetailLod = 'overview' | 'mid' | 'full';

export function detailLodFromRelativeZoom(rel: number): DetailLod {
  if (rel < 3) return 'overview';
  if (rel < 8) return 'mid';
  return 'full';
}
