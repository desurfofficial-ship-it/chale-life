/**
 * Objective marker (E-003) — a glowing ring on the ground (plus a faint
 * vertical beam so the spot reads from far) at the player's current
 * objective:
 *   - active job → the active step's location (steps carry `locationId`
 *     from src/data/jobs.ts; the starter hustle is fully tagged)
 *   - no job and the player has NEVER worked → LOC-001, Aunty Ba's joint
 *     (the "go find work" beacon a brand-new guest walks towards)
 *   - otherwise → hidden (worked already, nothing pending).
 *
 * Budget & rules:
 *   - exactly 2 draw calls when visible (ring + beam), 0 when hidden
 *     (group.visible = false skips both); no shadow casting.
 *   - no <Html> (CI guard) — pure geometry, unlit MeshBasicMaterial for
 *     the self-glow look.
 *   - store polling happens inside useFrame (getState is cheap); the
 *     React tree NEVER re-renders — position/pulse are ref mutations.
 *   - no collider added: the marker is walk-through decoration, the ring
 *     is ~1.2 m radius so the 2.5 m proximity probe fires well inside it.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import { locations } from '../data/locations';
import { findJobById } from '../data/jobs';
import { WAAKYE_LOCATION_ID } from '../rules/act';
import { getState } from '../store/gameStore';

/**
 * Fallback for job steps that predate the `locationId` tagging (G-002 only
 * tagged the starter hustle): map the interactable ids that exist on this
 * starter block to their locations (names match jobs.ts
 * targetLocationName). Steps outside this map hide the marker.
 */
const INTERACTABLE_TO_LOCATION: Readonly<Record<string, string>> = {
  food_vendor: 'LOC-001', // Waakye Joint / Aunty Ba
  provision_shop: 'LOC-003', // Provision Store
  trotro_stop: 'LOC-004', // Trotro Stop
};

export function ObjectiveMarker() {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  const targetIdRef = useRef<string | null>(null);
  const clockRef = useRef(0);

  useFrame((_, rawDt) => {
    const s = getState();

    // Where is the objective right now?
    let target: string | null = null;
    if (s.job.activeId) {
      const def = findJobById(s.job.activeId);
      if (def) {
        const step = def.steps[Math.min(s.job.step, def.steps.length - 1)];
        target =
          step.locationId ?? INTERACTABLE_TO_LOCATION[step.targetInteractableId] ?? null;
      }
    } else if (!s.hasWorked) {
      target = WAAKYE_LOCATION_ID;
    }

    const group = groupRef.current;
    if (!group) return;

    // Relocate only when the target CHANGES (never per frame).
    if (target !== targetIdRef.current) {
      targetIdRef.current = target;
      const loc = target ? locations.find((l) => l.id === target) : undefined;
      if (loc) {
        group.position.set(loc.x, 0, loc.z);
        group.visible = true;
      } else {
        group.visible = false;
      }
    }
    if (!group.visible) return;

    // Gentle pulse — scale the ring, breathe the beam. Ref mutations only.
    clockRef.current += rawDt;
    const t = clockRef.current;
    if (ringRef.current) {
      const pulse = 1 + 0.1 * Math.sin(t * 3.2);
      ringRef.current.scale.set(pulse, pulse, 1);
    }
    if (beamRef.current) {
      (beamRef.current.material as MeshBasicMaterial).opacity =
        0.1 + 0.05 * Math.sin(t * 2.4);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Flat glowing ring on the ground — draw call 1 of 2. */}
      <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.15, 0]}>
        <torusGeometry args={[1.15, 0.09, 8, 40]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* Faint additive beam — draw call 2 of 2 (open-ended, DoubleSide). */}
      <mesh ref={beamRef} position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 4.4, 12, 1, true]} />
        <meshBasicMaterial
          color="#fde047"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
