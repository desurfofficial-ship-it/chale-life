'use client'

// ─── PlayerCharacter — Chalé Life rig, dropped into the Accra world ─────────
// Model: AccraLife_Male_Character_SkinRefined_v2.glb (user-provided, shipped
// same-origin under /models — no runtime network dependency).
//
// Parsed facts from the file (scripts/parse_glb.mjs):
//   • 1 skinned mesh, 20,000 triangles, 1 PNG skin texture (1024×1024, 1.0 MB)
//   • world bbox 1.256 (arm span, T-pose) × 1.962 (height) × 0.382 (depth) m
//   • ORIGIN AT THE HIPS — feet sit at y = −1.001 in model space, so the rig
//     is mounted with a +1.001 m Y offset to put the feet on the ground (y=0)
//   • 19-joint humanoid armature (Hips, Spine, Chest, Neck, Head, arms, legs)
//   • no animation clips yet — renders in bind pose; the game will drive the
//     armature itself (or supply clips later)
//
// Chalé Life collision contract is unchanged: the engine still collides a
// 0.35 m circle under the feet on the XZ plane (see sim/). This component is
// VISUAL ONLY — it never writes to SOLID_FOOTPRINTS.
//
// Usage in the handover build: ?player=1&spot=daavi|alley|makola|oxford|stadium
// mounts one instance at that demo location. The game mounts it directly:
//   <PlayerCharacter position={[-141, 0, -5]} rotationY={Math.PI} />
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { markAnimated, unmarkAnimated } from './SceneBatcher'
// publicUrl() (E-007 guardrail): the app deploys under vite base
// '/chale-life/' (vite preview + GitHub Pages) — a bare '/models/…'
// resolves against the ORIGIN ROOT and 404s in every built deploy.
import { publicUrl } from '../../world/gltfSupport'

export const CHARACTER_MODEL_URL = publicUrl('/models/AccraLife_Male_Character_SkinRefined_v2.glb')

// measured constants (parsed from the GLB — keep in sync if the file changes)
export const CHARACTER = {
  height: 1.962, // m, head top above feet
  feetOffset: 1.001, // m, model origin (hips) above feet
  headY: 1.78, // ≈ eye/head band for camera look-at
  footprintRadius: 0.35, // engine collision circle (informational here)
  triangles: 20000,
  textureBytes: 1044752,
}

// demo drop points, each validated against the collider set (0.7 m body disc
// clear of every solid; scripts/check_spots.mjs)
export const CHARACTER_SPOTS: Record<string, { pos: [number, number, number]; rotY: number }> = {
  daavi: { pos: [-141, 0, -5], rotY: Math.PI * 0.9 }, // Daavi's plot, front pavement
  alley: { pos: [-131, 0, 5], rotY: Math.PI * 0.75 }, // James Town lane pocket (12/18 clear azimuths; old spot had 0 after buildings were grounded)
  makola: { pos: [-40, 0, -10], rotY: Math.PI * 1.1 }, // Makola market aisle
  oxford: { pos: [60, 0, -22], rotY: Math.PI * 0.85 }, // Oxford Street sidewalk
  stadium: { pos: [128, 0, -33], rotY: Math.PI * 0.5 }, // Stadium entrance forecourt
  // Task 14 community realism pass (Chorkor West)
  community: { pos: [-238.5, 0, -0.9], rotY: Math.PI * 0.5 }, // Daavi St shop walkway
  market: { pos: [-195.5, 0, -0.6], rotY: -Math.PI * 0.5 }, // market cluster walkway
  gathering: { pos: [-183.5, 0, 13.6], rotY: Math.PI * 0.75 }, // under the neem
}

export function PlayerCharacter({
  position,
  rotationY = 0,
}: {
  position: [number, number, number]
  rotationY?: number
}) {
  const group = useRef<THREE.Group>(null)

  useEffect(() => {
    markAnimated(group.current)
    return () => unmarkAnimated(group.current)
  }, [])

  // SkeletonUtils.clone → each instance gets its OWN skeleton, so the game
  // can pose/animate NPCs independently while sharing one GLB + texture.
  const gltf = useGLTF(CHARACTER_MODEL_URL)
  const model = useMemo(() => {
    const c = skeletonClone(gltf.scene) as THREE.Group
    let feetLift = CHARACTER.feetOffset // measured fallback
    c.traverse((o) => {
      const mesh = o as THREE.Mesh
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.frustumCulled = false // skinned bounds lag the skeleton — never cull
        const g = mesh.geometry
        if (!g.boundingBox) g.computeBoundingBox()
        const bb = g.boundingBox as THREE.Box3 | null
        if (bb) feetLift = Math.max(0, -bb.min.y)
        mesh.castShadow = true
        mesh.receiveShadow = false
      }
    })
    const inner = new THREE.Group()
    inner.position.y = feetLift // feet on the ground (origin is at the hips)
    inner.add(c)
    return inner
  }, [gltf])

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} dispose={null}>
      <primitive object={model} />
    </group>
  )
}

useGLTF.preload(CHARACTER_MODEL_URL)
