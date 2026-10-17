/**
 * characterAnim tests — procedural locomotion on a fake rig.
 * Verifies the contract that matters in-game: distance-driven phase (no foot
 * skating), idle = near-bind-pose, walk = alternating legs, run = bigger
 * amplitude than walk, and base rotations are always composed ON TOP of the
 * bind pose (never accumulated).
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildRig, makeAnimState, stepCharacterAnim, type BoneRig } from '../characterAnim'

const BONES = [
  'Hips', 'Spine', 'Chest', 'Neck', 'Head',
  'LShoulder', 'RShoulder', 'LUpperArm', 'LForeArm', 'LHand',
  'RUpperArm', 'RForeArm', 'RHand', 'LUpperLeg', 'LLowerLeg', 'LFoot',
  'RUpperLeg', 'RLowerLeg', 'RFoot',
] as const

function fakeRig(): { rig: BoneRig; base: Map<string, THREE.Quaternion>; hipsY: number } {
  const root = new THREE.Group()
  for (const name of BONES) {
    const b = new THREE.Object3D()
    b.name = name
    root.add(b)
  }
  const info = buildRig(root)
  if (!info) throw new Error('rig build failed')
  return info
}

/** pitch angle of a bone relative to its base (rotation.x). */
function pitch(rig: BoneRig, base: Map<string, THREE.Quaternion>, name: string): number {
  const e = new THREE.Euler()
  const q = rig[name].quaternion.clone()
  const inv = base.get(name)!.clone().invert()
  q.premultiply(inv)
  e.setFromQuaternion(q, 'XYZ')
  return e.x
}

describe('stepCharacterAnim', () => {
  it('idle: legs stay near the bind pose, hips bob tiny', () => {
    const { rig, base, hipsY } = fakeRig()
    const st = makeAnimState()
    stepCharacterAnim(rig, base, hipsY, st, 0, 0.5, 0.016)
    expect(Math.abs(pitch(rig, base, 'LUpperLeg'))).toBeLessThan(0.02)
    expect(Math.abs(pitch(rig, base, 'RUpperLeg'))).toBeLessThan(0.02)
    expect(Math.abs(rig.Hips.position.y - hipsY)).toBeLessThan(0.01)
  })

  it('walk: legs swing in opposite phase', () => {
    const { rig, base, hipsY } = fakeRig()
    const st = makeAnimState()
    st.phase = Math.PI / 2
    stepCharacterAnim(rig, base, hipsY, st, 3.0, 1, 0.0001)
    const l = pitch(rig, base, 'LUpperLeg')
    const r = pitch(rig, base, 'RUpperLeg')
    expect(Math.abs(l)).toBeGreaterThan(0.3)
    expect(Math.abs(r)).toBeGreaterThan(0.3)
    expect(Math.sign(l)).not.toBe(Math.sign(r))
  })

  it('run amplitude exceeds walk amplitude at the same phase', () => {
    const a = fakeRig()
    const b = fakeRig()
    const sa = makeAnimState()
    const sb = makeAnimState()
    sa.phase = sb.phase = 1.2
    stepCharacterAnim(a.rig, a.base, a.hipsY, sa, 3.0, 1, 0.0001)
    stepCharacterAnim(b.rig, b.base, b.hipsY, sb, 7.5, 1, 0.0001)
    const walkSwing = Math.abs(pitch(a.rig, a.base, 'LUpperLeg'))
    const runSwing = Math.abs(pitch(b.rig, b.base, 'LUpperLeg'))
    expect(runSwing).toBeGreaterThan(walkSwing * 1.2)
  })

  it('phase advances with DISTANCE, not frame count — no skating', () => {
    // 1 m at 2 m/s: one big 1 s frame vs 60 small frames must land on the
    // same stride phase (GameLoop clamps dt, so big frames are the norm on
    // slow boxes — the cycle must follow metres, not frames).
    const t1 = fakeRig()
    const s1 = makeAnimState()
    stepCharacterAnim(t1.rig, t1.base, t1.hipsY, s1, 2, 0, 1.0)
    const t2 = fakeRig()
    const s2 = makeAnimState()
    for (let i = 0; i < 60; i++) stepCharacterAnim(t2.rig, t2.base, t2.hipsY, s2, 2, i / 60, 1 / 60)
    expect(s1.phase).toBeCloseTo(s2.phase, 1)
  })

  it('composes on the base pose without accumulating drift', () => {
    const { rig, base, hipsY } = fakeRig()
    const st = makeAnimState()
    for (let i = 0; i < 120; i++) stepCharacterAnim(rig, base, hipsY, st, 3, i / 60, 1 / 60)
    const before = pitch(rig, base, 'LUpperLeg')
    stepCharacterAnim(rig, base, hipsY, st, 3, 2, 1 / 60)
    const after = pitch(rig, base, 'LUpperLeg')
    expect(Math.abs(after - before)).toBeLessThan(0.35) // one frame of phase advance, same cycle
  })
})
