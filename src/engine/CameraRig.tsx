/**
 * Camera rig for the orthographic follow camera.
 *
 * - Smooth follow: the look-at target exponentially approaches the player
 *   (frame-rate independent `1 - e^(-k·dt)` smoothing).
 * - Zoom: pinch (two pointers) and wheel, clamped to [MIN_ZOOM, MAX_ZOOM].
 *   The store owns the zoom value; this component applies it to the camera.
 * - Pan: one-finger / mouse drag pans and suspends follow; pinch midpoint
 *   movement pans too. The Recenter button (recenter token in the store)
 *   snaps back onto the player and resumes follow.
 *
 * Canvas is orthographic (src/app/App.tsx) — screen→world scale is 1/zoom for
 * both axes, and the camera yaw is fixed (offset direction (0, 30, 30)), so
 * pan mapping stays trivial.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  getRecenterToken,
  getState,
  getZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  setZoom,
} from '../store/gameStore';

/** Fixed 45° top-down offset (direction only — ortho size is zoom-driven). */
const OFFSET = new THREE.Vector3(0, 30, 30);
/** Exponential follow rate (1/s) — higher = tighter. */
const FOLLOW_RATE = 5;
const WHEEL_SENSITIVITY = 0.0012;
/** Cumulative pointer travel (px) before a drag counts as an intentional pan. */
const PAN_SUSPEND_PX = 6;

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const gl = useThree((s) => s.gl);
  // Start on the player (store is spawn-initialized by src/engine/spawn.ts
  // before App renders) — no glide from the world origin on frame 1.
  const spawn = getState().player.position;
  const target = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const follow = useRef(true);
  const appliedZoom = useRef(getZoom());
  const lastRecenter = useRef(getRecenterToken());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);

    // Apply store zoom (single source of truth) when it changed.
    const z = getZoom();
    if (z !== appliedZoom.current) {
      appliedZoom.current = z;
      camera.zoom = z;
      camera.updateProjectionMatrix();
    }

    // Recenter: snap onto the player and resume following.
    const token = getRecenterToken();
    if (token !== lastRecenter.current) {
      lastRecenter.current = token;
      follow.current = true;
      const p = getState().player.position;
      target.current.set(p.x, 0, p.z);
    } else if (follow.current) {
      const a = 1 - Math.exp(-FOLLOW_RATE * dt);
      const p = getState().player.position;
      target.current.x += (p.x - target.current.x) * a;
      target.current.z += (p.z - target.current.z) * a;
    }

    camera.position.set(
      target.current.x + OFFSET.x,
      OFFSET.y,
      target.current.z + OFFSET.z,
    );
    camera.lookAt(target.current.x, 0, target.current.z);
  });

  // Pointer gestures + wheel on the canvas element. Cleaned up on dispose.
  // Zoom and pan apply INCREMENTAL per-event deltas — compounding a cumulative
  // ratio per pointermove would make pinch zoom race to its clamp on phones.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let prevPinchDist = 0;
    let prevMid: { x: number; y: number } | null = null;
    let midTravel = 0; // cumulative midpoint drift of the active pinch
    let dragPrev: { x: number; y: number } | null = null;
    let dragTravel = 0; // cumulative travel of the active drag

    const mid = (): { x: number; y: number } => {
      const [a, b] = [...pointers.values()];
      if (!b) return a ? { x: a.x, y: a.y } : { x: 0, y: 0 }; // 1 pointer left (pinch release)
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const pinchDist = (): number => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    // Ortho: 1 px = 1/zoom world units. Screen +x = world +x, screen +y = +z.
    const pan = (dxPx: number, dyPx: number): void => {
      const w = 1 / camera.zoom;
      target.current.x -= dxPx * w;
      target.current.z -= dyPx * w;
    };

    const onDown = (e: PointerEvent): void => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        prevPinchDist = pinchDist();
        prevMid = mid();
        midTravel = 0;
        dragPrev = null;
      } else if (pointers.size === 1) {
        dragPrev = { x: e.clientX, y: e.clientY };
        dragTravel = 0;
      }
    };

    const onMove = (e: PointerEvent): void => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        // Pinch: incremental distance ratio → zoom; midpoint drift → pan.
        const d = pinchDist();
        if (prevPinchDist > 0 && d > 0) {
          setZoom(getZoom() * (d / prevPinchDist));
        }
        prevPinchDist = d;
        if (prevMid) {
          const m = mid();
          const dx = m.x - prevMid.x;
          const dy = m.y - prevMid.y;
          pan(dx, dy);
          midTravel += Math.hypot(dx, dy);
          if (midTravel > PAN_SUSPEND_PX) follow.current = false;
          prevMid = m;
        }
      } else if (dragPrev) {
        const dx = e.clientX - dragPrev.x;
        const dy = e.clientY - dragPrev.y;
        pan(dx, dy);
        dragTravel += Math.hypot(dx, dy);
        if (dragTravel > PAN_SUSPEND_PX) follow.current = false;
        dragPrev = { x: e.clientX, y: e.clientY };
      }
    };

    const onUp = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      if (pointers.size < 2) {
        prevPinchDist = 0;
        prevMid = null;
      }
      dragPrev = pointers.size === 1 ? mid() : null;
    };

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      setZoom(getZoom() * Math.exp(-e.deltaY * WHEEL_SENSITIVITY));
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  return null;
}
