/**
 * characterAnim.ts — procedural locomotion for the AccraLife rig.
 *
 * The character GLB ships ZERO animation clips (verified: json.animations is
 * absent) and one flat skin-colour texture — a mannequin. The Reality-check
 * directive (PRIORITY 3) demands idle / walk / run with smooth transitions
 * and no foot skating, so the 19-joint armature is driven procedurally:
 *
 *   phase advances with DISTANCE TRAVELLED (speed × dt × phase-per-metre), so
 *   the feet plant per metre and never skate regardless of acceleration;
 *   amplitude blends idle → walk → run from the measured speed, so
 *   transitions are continuous by construction (no clip crossfades).
 *
 * Per-bone base rotations are captured at rig-build time — the animator only
 * composes offsets on top, so future clips / NPC posing stay possible.
 *
 * Bind-pose facts (parsed from the GLB): arms are T-POSED (straight out along
 * ±X), legs point down, the model faces +Z, hips origin sits at y≈0.
 */
import type * as THREE from 'three'

/** Shared per-frame motion state the player controller writes (m/s). */
export const CHAR_MOTION = { speed: 0, sprint: false, t: 0 }

export interface BoneRig {
  [name: string]: THREE.Object3D
}

const BONE_NAMES = [
  'Hips', 'Spine', 'Chest', 'Neck', 'Head',
  'LShoulder', 'RShoulder',
  'LUpperArm', 'LForeArm', 'LHand', 'RUpperArm', 'RForeArm', 'RHand',
  'LUpperLeg', 'LLowerLeg', 'LFoot', 'RUpperLeg', 'RLowerLeg', 'RFoot',
] as const

/** Collect the named joints (plus their base quaternions) from a clone. */
export function buildRig(
  root: THREE.Object3D,
): { rig: BoneRig; base: Map<string, THREE.Quaternion>; hipsY: number } | null {
  const byName = new Map<string, THREE.Object3D>()
  root.traverse((o) => {
    if (o.name) byName.set(o.name, o)
  })
  for (const n of BONE_NAMES) {
    if (!byName.has(n)) return null
  }
  const rig: BoneRig = {}
  const base = new Map<string, THREE.Quaternion>()
  for (const n of BONE_NAMES) {
    const b = byName.get(n)!
    rig[n] = b
    base.set(n, b.quaternion.clone())
  }
  return { rig, base, hipsY: rig.Hips.position.y }
}

// ── tuning (radians; metres for the hip bob) ─────────────────────────────────
const WALK_REF_SPEED = 3.0 // m/s at which the walk cycle runs at nominal amplitude
const RUN_REF_SPEED = 7.5 // m/s at which the run cycle saturates
const STRIDE_PHASE_PER_M = (Math.PI * 2) / 1.7 // one full stride per 1.7 m
const SWING_WALK = 0.5
const SWING_RUN = 0.82
const KNEE_WALK = 0.62
const KNEE_RUN = 1.05
const ARM_WALK = 0.34
const ARM_RUN = 0.75
const ELBOW_WALK = 0.4
const ELBOW_RUN = 1.2
const LEAN_WALK = 0.05
const LEAN_RUN = 0.2
const BOB_WALK = 0.028
const BOB_RUN = 0.06
const IDLE_BREATH = 0.022
/** T-pose → arms down along the body (bind-pose correction, applied always). */
const ARM_DOWN_L = 1.22
const ARM_DOWN_R = -1.22

export interface AnimState {
  phase: number
}

export function makeAnimState(): AnimState {
  return { phase: 0 }
}

/**
 * One animator step. `speed` is the measured ground speed this frame (m/s);
 * the caller clamps dt (GameLoop already does).
 */
export function stepCharacterAnim(
  rig: BoneRig,
  base: Map<string, THREE.Quaternion>,
  hipsY: number,
  st: AnimState,
  speed: number,
  time: number,
  dt: number,
): void {
  // distance-driven phase → feet plant per metre (no skating)
  st.phase = (st.phase + speed * STRIDE_PHASE_PER_M * dt) % (Math.PI * 2)

  // amplitude blend 0 (idle) → 1 (walk nominal) → up to ~1.55 (run)
  const walkN = Math.min(1, speed / WALK_REF_SPEED)
  const runN = Math.max(0, Math.min(1, (speed - WALK_REF_SPEED) / (RUN_REF_SPEED - WALK_REF_SPEED)))
  const moving = walkN > 0.02
  const swing = SWING_WALK * walkN + (SWING_RUN - SWING_WALK) * runN
  const knee = KNEE_WALK * walkN + (KNEE_RUN - KNEE_WALK) * runN
  const arm = ARM_WALK * walkN + (ARM_RUN - ARM_WALK) * runN
  const elbow = ELBOW_WALK + (ELBOW_RUN - ELBOW_WALK) * runN
  const lean = LEAN_WALK * walkN + (LEAN_RUN - LEAN_WALK) * runN
  const bob = BOB_WALK * walkN + (BOB_RUN - BOB_WALK) * runN

  const s = Math.sin(st.phase)
  const sOpp = Math.sin(st.phase + Math.PI)
  const breath = Math.sin(time * 1.7)

  // legs: opposite phase; the knee flexes through the swing-forward arc
  rig.LUpperLeg.quaternion.copy(base.get('LUpperLeg')!)
  rig.LUpperLeg.rotateX(s * swing)
  rig.RUpperLeg.quaternion.copy(base.get('RUpperLeg')!)
  rig.RUpperLeg.rotateX(sOpp * swing)
  const kneeL = moving ? Math.max(0, Math.sin(st.phase - 0.9)) * knee : 0
  const kneeR = moving ? Math.max(0, Math.sin(st.phase + Math.PI - 0.9)) * knee : 0
  rig.LLowerLeg.quaternion.copy(base.get('LLowerLeg')!)
  rig.LLowerLeg.rotateX(kneeL)
  rig.RLowerLeg.quaternion.copy(base.get('RLowerLeg')!)
  rig.RLowerLeg.rotateX(kneeR)

  // arms: lower from T-pose, counter-swing, elbows bend on the forward beat
  rig.LUpperArm.quaternion.copy(base.get('LUpperArm')!)
  rig.LUpperArm.rotateZ(ARM_DOWN_L)
  rig.LUpperArm.rotateX(sOpp * arm)
  rig.RUpperArm.quaternion.copy(base.get('RUpperArm')!)
  rig.RUpperArm.rotateZ(ARM_DOWN_R)
  rig.RUpperArm.rotateX(s * arm)
  rig.LForeArm.quaternion.copy(base.get('LForeArm')!)
  rig.LForeArm.rotateX(-elbow * (0.45 + 0.55 * Math.max(0, sOpp)))
  rig.RForeArm.quaternion.copy(base.get('RForeArm')!)
  rig.RForeArm.rotateX(-elbow * (0.45 + 0.55 * Math.max(0, s)))

  // torso: forward lean at speed + idle breathing when standing
  rig.Spine.quaternion.copy(base.get('Spine')!)
  rig.Spine.rotateX(lean + (moving ? 0 : breath * IDLE_BREATH * 0.6))
  rig.Chest.quaternion.copy(base.get('Chest')!)
  rig.Chest.rotateX(moving ? 0 : breath * IDLE_BREATH)
  rig.Chest.rotateY(moving ? s * 0.06 * walkN : Math.sin(time * 0.9) * 0.03)
  rig.Head.quaternion.copy(base.get('Head')!)
  if (!moving) rig.Head.rotateY(Math.sin(time * 0.5) * 0.12)

  // hips bob (2 beats per stride); standing = a slow breathing bob
  rig.Hips.position.y = hipsY + (moving ? Math.abs(Math.cos(st.phase)) * bob : breath * 0.006)
}
