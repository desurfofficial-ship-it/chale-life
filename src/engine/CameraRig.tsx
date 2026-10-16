/**
 * Camera rig — orthographic follow + tycoon free cam (C-001).
 *
 * Walking: follow player, zoom [MIN_ZOOM, MAX_ZOOM], free yaw (twist / rail ↻).
 * Tycoon: wide zoom (fit-city … ×25), rotate (twist / +90°), pan with
 * inertia, double-tap zoom 2×, framing presets via requestFrame().
 */

import { useFrame, useThree } from '@react-three/fiber';
import { isInsideGyanHouse } from '../world/colliders';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  clearFrameRequest,
  getCameraYaw,
  getFrameRequest,
  getRecenterToken,
  getState,
  getZoom,
  getZoomRange,
  MAX_ZOOM,
  MIN_ZOOM,
  movementInput,
  setCameraYaw,
  setZoom,
} from '../store/gameStore';
import { isTycoonCamera } from '../store/tycoonStore';
import {
  clampTarget,
  CITY_BOUNDS,
  panDeltaWorld,
  rotateOffsetXZ,
  zoomToFitBox,
  DEFAULT_HUD_INSETS,
  detailLodFromRelativeZoom,
} from './zoomFit';

const OFFSET = new THREE.Vector3(0, 30, 30);
/** Tighter high angle so the single room fills the view when inside. */
const ROOM_OFFSET = new THREE.Vector3(0, 11, 9);
const TYCOON_OFFSET = new THREE.Vector3(0, 48, 48);
export const projectedPlayerScreen = { x: 0, y: 0 };
const _proj = new THREE.Vector3();
const FOLLOW_RATE = 5;
const FRAME_RATE = 4;
const WHEEL_SENSITIVITY = 0.0012;
const PAN_SUSPEND_PX = 6;
const PLAYER_FROM_TOP = 0.45;
const INERTIA_DECAY = 6;

/** Latest relative zoom for LOD consumers. */
export let lastRelativeZoom = 1;
export let lastDetailLod: 'overview' | 'mid' | 'full' = 'full';

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const gl = useThree((s) => s.gl);
  const spawn = getState().player.position;
  const target = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const follow = useRef(true);
  const appliedZoom = useRef(getZoom());
  const lastRecenter = useRef(getRecenterToken());
  const lastFrameToken = useRef(0);
  const frameGoal = useRef<{ x: number; z: number; zoom: number } | null>(null);
  const panVel = useRef({ x: 0, z: 0 });
  const yawSmoothed = useRef(getCameraYaw());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const tycoon = isTycoonCamera();

    // Framing glide
    const fr = getFrameRequest();
    if (fr.token !== lastFrameToken.current && fr.target) {
      lastFrameToken.current = fr.token;
      frameGoal.current = { ...fr.target };
      follow.current = false;
      panVel.current = { x: 0, z: 0 };
    }
    if (frameGoal.current) {
      const g = frameGoal.current;
      const a = 1 - Math.exp(-FRAME_RATE * dt);
      target.current.x += (g.x - target.current.x) * a;
      target.current.z += (g.z - target.current.z) * a;
      setZoom(getZoom() + (g.zoom - getZoom()) * a);
      if (
        Math.hypot(g.x - target.current.x, g.z - target.current.z) < 0.4 &&
        Math.abs(g.zoom - getZoom()) < 0.15
      ) {
        target.current.x = g.x;
        target.current.z = g.z;
        setZoom(g.zoom);
        frameGoal.current = null;
        clearFrameRequest();
      }
    }

    const z = getZoom();
    if (z !== appliedZoom.current) {
      appliedZoom.current = z;
      camera.zoom = z;
      camera.updateProjectionMatrix();
    }

    // Relative zoom for LOD
    const cityZ = zoomToFitBox(
      CITY_BOUNDS,
      gl.domElement.clientWidth || 390,
      gl.domElement.clientHeight || 844,
      DEFAULT_HUD_INSETS,
    );
    lastRelativeZoom = z / Math.max(1e-6, cityZ);
    lastDetailLod = detailLodFromRelativeZoom(lastRelativeZoom);
    if (typeof window !== 'undefined') {
      (window as unknown as { __ACCRA_LOD?: string }).__ACCRA_LOD = lastDetailLod;
    }

    if (movementInput.x !== 0 || movementInput.z !== 0) {
      follow.current = true;
      frameGoal.current = null;
    }

    const token = getRecenterToken();
    if (token !== lastRecenter.current) {
      lastRecenter.current = token;
      follow.current = true;
      frameGoal.current = null;
      const p = getState().player.position;
      target.current.set(p.x, 0, p.z);
    } else if (follow.current && !tycoon) {
      const a = 1 - Math.exp(-FOLLOW_RATE * dt);
      const p = getState().player.position;
      target.current.x += (p.x - target.current.x) * a;
      target.current.z += (p.z - target.current.z) * a;
    } else if (!follow.current) {
      // pan inertia
      const decay = Math.exp(-INERTIA_DECAY * dt);
      target.current.x += panVel.current.x * dt;
      target.current.z += panVel.current.z * dt;
      panVel.current.x *= decay;
      panVel.current.z *= decay;
      if (Math.hypot(panVel.current.x, panVel.current.z) < 0.05) {
        panVel.current = { x: 0, z: 0 };
      }
    }

    // Clamp pan to city
    const clamped = clampTarget(target.current.x, target.current.z);
    target.current.x = clamped.x;
    target.current.z = clamped.z;

    // Smooth yaw
    const yawTarget = getCameraYaw();
    let dy = yawTarget - yawSmoothed.current;
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    yawSmoothed.current += dy * (1 - Math.exp(-8 * dt));

    const viewH = gl.domElement.clientHeight / camera.zoom;
    const frameOffsetZ =
      tycoon ? 0 : ((0.5 - PLAYER_FROM_TOP) * viewH) / Math.sin(Math.PI / 4);

    const playerPos = getState().player.position;
    const insideRoom = !tycoon && isInsideGyanHouse(playerPos.x, playerPos.z);

    if (insideRoom) {
      follow.current = true;
      frameGoal.current = null;
    }

    const base = tycoon ? TYCOON_OFFSET : insideRoom ? ROOM_OFFSET : OFFSET;
    // When inside, zoom in so the room fills the phone screen. 64 px/m: the
    // 6.92 m house spans the full 390 px width of the target phone and the
    // room fills over half the height — the street stays out of the frame
    // (52 kept showing the kiosk + opposite compound houses).
    if (insideRoom) {
      const want = Math.max(getZoom(), 64);
      if (Math.abs(getZoom() - want) > 0.5) setZoom(getZoom() + (want - getZoom()) * Math.min(1, dt * 3));
    }

    const off = rotateOffsetXZ(base.x, base.y, base.z, yawSmoothed.current);
    const lookZ = target.current.z + frameOffsetZ;
    camera.position.set(
      target.current.x + off.x,
      off.y,
      lookZ + off.z,
    );
    camera.lookAt(target.current.x, 0, lookZ);

    camera.updateMatrixWorld();
    const pp = getState().player.position;
    _proj.set(pp.x, 0, pp.z).project(camera);
    const el = gl.domElement;
    projectedPlayerScreen.x = (_proj.x * 0.5 + 0.5) * el.clientWidth;
    projectedPlayerScreen.y = (-_proj.y * 0.5 + 0.5) * el.clientHeight;
  });

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    const canvasOwned = new Set<number>();
    let prevPinchDist = 0;
    let prevMid: { x: number; y: number } | null = null;
    let prevAngle = 0;
    let midTravel = 0;
    let dragPrev: { x: number; y: number } | null = null;
    let dragTravel = 0;
    let panPointerId: number | null = null;
    let lastTapAt = 0;
    let lastTapPos = { x: 0, y: 0 };

    const mid = (): { x: number; y: number } => {
      const vals = [...pointers.values()];
      if (vals.length < 2) return vals[0] ?? { x: 0, y: 0 };
      return { x: (vals[0].x + vals[1].x) / 2, y: (vals[0].y + vals[1].y) / 2 };
    };
    const pinchDist = (): number => {
      const vals = [...pointers.values()];
      if (vals.length < 2) return 0;
      return Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y);
    };
    const pinchAngle = (): number => {
      const vals = [...pointers.values()];
      if (vals.length < 2) return 0;
      return Math.atan2(vals[1].y - vals[0].y, vals[1].x - vals[0].x);
    };

    const pan = (dxPx: number, dyPx: number): void => {
      const d = panDeltaWorld(dxPx, dyPx, camera.zoom, yawSmoothed.current);
      target.current.x += d.x;
      target.current.z += d.z;
      // inertia sample
      panVel.current.x = d.x * 40;
      panVel.current.z = d.z * 40;
    };

    const onDown = (e: PointerEvent): void => {
      if (e.target !== el) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvasOwned.add(e.pointerId);
      if (pointers.size === 2) {
        prevPinchDist = pinchDist();
        prevMid = mid();
        prevAngle = pinchAngle();
        midTravel = 0;
        dragPrev = null;
        panPointerId = null;
      } else if (pointers.size === 1) {
        panPointerId = e.pointerId;
        dragPrev = { x: e.clientX, y: e.clientY };
        dragTravel = 0;
      }
    };

    const onMove = (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        const d = pinchDist();
        if (prevPinchDist > 0 && d > 0) {
          // Zoom toward pinch midpoint: adjust target so the world point under
          // mid stays put (ortho: scale around mid).
          const before = getZoom();
          const ratio = d / prevPinchDist;
          setZoom(before * ratio);
          const after = getZoom();
          if (prevMid && after !== before && isTycoonCamera()) {
            const rect = el.getBoundingClientRect();
            const sx = prevMid.x - rect.left - rect.width / 2;
            const sy = prevMid.y - rect.top - rect.height / 2;
            // world shift so midpoint anchors
            const k = 1 / before - 1 / after;
            const dPan = panDeltaWorld(sx, sy, 1, yawSmoothed.current);
            // dPan was for zoom=1; scale by k
            target.current.x += dPan.x * k * before; // approximate
            target.current.z += dPan.z * k * before;
          }
        }
        prevPinchDist = d;
        // Two-finger twist → orbit yaw (walking + tycoon)
        {
          const ang = pinchAngle();
          let dang = ang - prevAngle;
          if (dang > Math.PI) dang -= Math.PI * 2;
          if (dang < -Math.PI) dang += Math.PI * 2;
          if (Math.abs(dang) > 0.002) {
            setCameraYaw(getCameraYaw() + dang);
          }
          prevAngle = ang;
        }
        if (prevMid) {
          const m = mid();
          const dx = m.x - prevMid.x;
          const dy = m.y - prevMid.y;
          pan(dx, dy);
          midTravel += Math.hypot(dx, dy);
          if (midTravel > PAN_SUSPEND_PX) follow.current = false;
          prevMid = m;
        }
      } else if (dragPrev && panPointerId === e.pointerId && canvasOwned.has(e.pointerId)) {
        const dx = e.clientX - dragPrev.x;
        const dy = e.clientY - dragPrev.y;
        pan(dx, dy);
        dragTravel += Math.hypot(dx, dy);
        if (dragTravel > PAN_SUSPEND_PX) follow.current = false;
        dragPrev = { x: e.clientX, y: e.clientY };
      }
    };

    const onUp = (e: PointerEvent): void => {
      // double-tap zoom 2× toward tap (tycoon)
      if (pointers.size === 1 && canvasOwned.has(e.pointerId)) {
        const now = performance.now();
        const dt = now - lastTapAt;
        const dist = Math.hypot(e.clientX - lastTapPos.x, e.clientY - lastTapPos.y);
        if (dt < 320 && dist < 28 && isTycoonCamera()) {
          const range = getZoomRange();
          setZoom(Math.min(range.max, getZoom() * 2));
          follow.current = false;
        }
        lastTapAt = now;
        lastTapPos = { x: e.clientX, y: e.clientY };
      }
      pointers.delete(e.pointerId);
      canvasOwned.delete(e.pointerId);
      if (panPointerId === e.pointerId) panPointerId = null;
      if (pointers.size < 2) {
        prevPinchDist = 0;
        prevMid = null;
      }
      if (pointers.size === 1) {
        const [id, pt] = [...pointers.entries()][0];
        if (canvasOwned.has(id)) {
          panPointerId = id;
          dragPrev = { x: pt.x, y: pt.y };
          dragTravel = 0;
        }
      } else {
        dragPrev = null;
      }
    };

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const before = getZoom();
      setZoom(before * Math.exp(-e.deltaY * WHEEL_SENSITIVITY));
      if (isTycoonCamera()) follow.current = false;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  return null;
}

// silence unused walk constants in tree-shake
void MIN_ZOOM;
void MAX_ZOOM;
