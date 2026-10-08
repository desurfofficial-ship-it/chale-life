/**
 * On-screen analog joystick — bottom-left, touch-first, pointer events only
 * (mouse works too for desktop testing). Captures its pointer so dragging
 * outside the base keeps steering. Writes through inputManager, never to the
 * store directly. Plain DOM overlay — no drei <Html> under the ortho camera.
 *
 * Geometry (108 px base) is sized so the ring's bounding box stays clear of
 * the HUD's centred Act pill on a 390 × 844 viewport (E-002): the pill's box
 * starts at x = 121, this ring's box ends at x = 10 + 108 = 118 (3 px box
 * clearance; ~7 px between the rounded arcs). (see styles.css — same numbers
 * live there; keep them in sync).
 */

import { useRef, useState } from 'react';
import { JOYSTICK_DEAD_ZONE, setJoystickVector } from './inputManager';

const BASE_SIZE = 108; // px — must match .joystick width/height in styles.css
const KNOB_SIZE = 48; // px — must match .joystick__knob in styles.css
const MAX_DEFLECTION = (BASE_SIZE - KNOB_SIZE) / 2;

interface KnobOffset {
  x: number;
  y: number;
}

export function Joystick() {
  const [knob, setKnob] = useState<KnobOffset>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pointerId = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  const update = (e: React.PointerEvent<HTMLDivElement>): void => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_DEFLECTION) {
      dx = (dx / dist) * MAX_DEFLECTION;
      dy = (dy / dist) * MAX_DEFLECTION;
    }
    setKnob({ x: dx, y: dy });

    // Normalised deflection → dead-zone → rescale, so the stick ramps from 0.
    let nx = dx / MAX_DEFLECTION;
    let nz = dy / MAX_DEFLECTION;
    const mag = Math.hypot(nx, nz);
    if (mag <= JOYSTICK_DEAD_ZONE) {
      nx = 0;
      nz = 0;
    } else {
      const rescaled = (mag - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
      nx = (nx / mag) * rescaled;
      nz = (nz / mag) * rescaled;
    }
    setJoystickVector(nx, nz, true);
  };

  const release = (): void => {
    pointerId.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    setJoystickVector(0, 0, false);
  };

  return (
    <div
      ref={baseRef}
      className={`joystick${active ? ' joystick--active' : ''}`}
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(e) => {
        if (pointerId.current !== null) return; // one steering pointer max
        pointerId.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort (synthetic/inactive pointers) */
        }
        setActive(true);
        update(e);
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) update(e);
      }}
      onPointerUp={(e) => {
        if (pointerId.current === e.pointerId) release();
      }}
      onPointerCancel={(e) => {
        if (pointerId.current === e.pointerId) release();
      }}
    >
      <div className="joystick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
