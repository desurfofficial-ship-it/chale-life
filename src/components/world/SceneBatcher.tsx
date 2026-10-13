'use client'

// ─── SceneBatcher — merges the static, plain-colored world into few draws ───
// The diorama is ~1800 plain MeshStandardMaterial meshes (posts, rails, walls,
// roofs, props…). At mount this pass merges them into a handful of
// vertex-colored meshes, grouped by (color, roughness, metalness, emissive,
// opacity, side). Textured meshes, instanced meshes, sprites, shader meshes
// and REGISTERED animated subtrees are left untouched.
//
// Animated components register their moving subtree via useAnimatedRef() so
// their meshes are never frozen into a batch.
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const animatedRoots = new Set<THREE.Object3D>()

export function markAnimated(obj: THREE.Object3D | null | undefined) {
  if (obj) {
    animatedRoots.add(obj)
    // also flag the subtree for the collider exporter (moving parts never
    // become static collision boxes)
    obj.userData.animatedRoot = true
  }
}
export function unmarkAnimated(obj: THREE.Object3D | null | undefined) {
  if (obj) {
    animatedRoots.delete(obj)
    obj.userData.animatedRoot = false
  }
}

// hook for animated components: attach to the moving group
export function useAnimatedRef<T extends THREE.Object3D>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  return ref
}

function isUnderAnimated(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o
  while (p) {
    if (animatedRoots.has(p)) return true
    p = p.parent
  }
  return false
}

interface Bucket {
  key: string
  color: THREE.Color
  roughness: number
  metalness: number
  emissive: THREE.Color
  emissiveIntensity: number
  transparent: boolean
  opacity: number
  side: THREE.Side
  parts: THREE.BufferGeometry[]
  orig: THREE.Mesh[]
  cast: boolean
  receive: boolean
}

let activeBatch: { meshes: THREE.Mesh[]; hidden: THREE.Mesh[] } | null = null

function undoBatch() {
  if (!activeBatch) return
  for (const m of activeBatch.meshes) m.removeFromParent()
  for (const m of activeBatch.hidden) m.visible = true
  activeBatch = null
}

// ── facade atlas merge ───────────────────────────────────────────────────────
// Every Building shell shares one of two atlas materials (wall / glass). Their
// geometries already carry atlas UVs + wall vertex colors, so a straight
// world-transform merge collapses the whole city's facades into 2 draws.
function mergeFacadeShells(
  scene: THREE.Scene,
  shells: THREE.Mesh[],
  merged: THREE.Mesh[],
  hidden: THREE.Mesh[]
) {
  if (shells.length === 0) return
  const groups = new Map<string, { parts: THREE.BufferGeometry[]; cast: boolean; receive: boolean; orig: THREE.Mesh[] }>()
  const mat4 = new THREE.Matrix4()
  for (const mesh of shells) {
    const m = mesh.material as THREE.MeshStandardMaterial
    const tag = m.userData.facadeTag as string
    mesh.updateWorldMatrix(true, false)
    let g = mesh.geometry.clone()
    if (g.index) g = g.toNonIndexed()
    g.morphAttributes = {}
    g.clearGroups()
    mat4.copy(mesh.matrixWorld)
    g.applyMatrix4(mat4)
    let grp = groups.get(tag)
    if (!grp) {
      grp = { parts: [], cast: false, receive: false, orig: [] }
      groups.set(tag, grp)
    }
    grp.parts.push(g)
    grp.orig.push(mesh)
    if (mesh.castShadow) grp.cast = true
    if (mesh.receiveShadow) grp.receive = true
    mesh.visible = false
    hidden.push(mesh)
  }
  for (const [tag, grp] of groups) {
    let geo: THREE.BufferGeometry | null = null
    try {
      geo = grp.parts.length === 1 ? grp.parts[0] : mergeGeometries(grp.parts, false)
    } catch {
      geo = null
    }
    if (!geo) {
      console.warn('[batch] facade merge failed, kept individual shells:', tag)
      // restore ONLY this group's shells and keep going
      for (const o of grp.orig) o.visible = true
      // remove them from the hidden list so undoBatch doesn't re-show later
      for (const o of grp.orig) {
        const i = hidden.indexOf(o)
        if (i >= 0) hidden.splice(i, 1)
      }
      continue
    }
    // reuse the SAME shared material (tag → wall/glass)
    const mat = shells.find((s) => (s.material as THREE.MeshStandardMaterial).userData.facadeTag === tag)!
      .material as THREE.MeshStandardMaterial
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = grp.cast
    mesh.receiveShadow = grp.receive
    mesh.matrixAutoUpdate = false
    mesh.frustumCulled = false
    mesh.name = 'facade-batch:' + tag
    scene.add(mesh)
    merged.push(mesh)
  }
}

function runBatch(scene: THREE.Scene) {
  undoBatch()
  const buckets = new Map<string, Bucket>()

  const candidates: THREE.Mesh[] = []
  const facadeCandidates: THREE.Mesh[] = []
  scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return
    const mesh = o as THREE.Mesh
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) return
    if (isUnderAnimated(mesh)) return
    const m = mesh.material as THREE.MeshStandardMaterial
    if (Array.isArray(m)) return
    if (!(m instanceof THREE.MeshStandardMaterial)) return
    // facade-tagged shells (shared atlas material) merge separately, keeping UVs
    // ('signs' = the Task 12 business signboard atlas, lib/signAtlas.ts)
    if (m.userData.facadeTag === 'wall' || m.userData.facadeTag === 'glass' || m.userData.facadeTag === 'signs') {
      facadeCandidates.push(mesh)
      return
    }
    if (m.map || m.emissiveMap || m.alphaMap || m.roughnessMap || m.metalnessMap || m.normalMap) return
    // skip the big ground plate / pedestal: they have their own draw already
    // (the plate is textured anyway; pedestal is cheap as-is)
    candidates.push(mesh)
  })

  const mergedAll: THREE.Mesh[] = []
  const hiddenAll: THREE.Mesh[] = [] // NOT aliased to candidates (shells get pushed here)
  mergeFacadeShells(scene, facadeCandidates, mergedAll, hiddenAll)

  const mat4 = new THREE.Matrix4()
  for (const mesh of candidates) {
    mesh.updateWorldMatrix(true, false)
    const m = mesh.material as THREE.MeshStandardMaterial
    // bucket ONLY by material behavior — colors are baked into vertex
    // attributes so dozens of differently-tinted parts share one material
    const key = [
      m.roughness.toFixed(2),
      m.metalness.toFixed(2),
      m.emissive.getHexString(),
      m.emissiveIntensity.toFixed(2),
      m.transparent ? 1 : 0,
      m.opacity.toFixed(2),
      m.side,
    ].join('|')

    let b = buckets.get(key)
    if (!b) {
      b = {
        key,
        color: new THREE.Color(0xffffff),
        roughness: m.roughness,
        metalness: m.metalness,
        emissive: m.emissive.clone(),
        emissiveIntensity: m.emissiveIntensity,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        parts: [],
        orig: [],
        cast: false,
        receive: false,
      }
      buckets.set(key, b)
    }
    const g0 = mesh.geometry.clone()
    // normalize attributes: batched material is untextured → keep only
    // position/normal/color, and mergeGeometries requires all-indexed or
    // all-non-indexed
    g0.deleteAttribute('uv')
    g0.deleteAttribute('uv1')
    g0.deleteAttribute('uv2')
    const g = g0.index ? g0.toNonIndexed() : g0
    const keep = new Set(['position', 'normal', 'color'])
    for (const name of Object.keys(g.attributes)) {
      if (!keep.has(name)) g.deleteAttribute(name)
    }
    g.morphAttributes = {}
    g.clearGroups()
    mat4.copy(mesh.matrixWorld)
    g.applyMatrix4(mat4)
    {
      // always (re)write the color attribute from the material color
      const n = g.attributes.position.count
      const c = m.color
      const existing = g.getAttribute('color')
      if (m.vertexColors && existing) {
        // keep baked vertex colors as-is
      } else {
        const arr = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) {
          arr[i * 3] = c.r
          arr[i * 3 + 1] = c.g
          arr[i * 3 + 2] = c.b
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
      }
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    b.parts.push(g)
    b.orig.push(mesh)
    if (mesh.castShadow) b.cast = true
    if (mesh.receiveShadow) b.receive = true
    mesh.visible = false
  }

  const meshes: THREE.Mesh[] = []
  const hidden: THREE.Mesh[] = candidates
  for (const b of buckets.values()) {
    if (b.parts.length === 0) continue
    let geo: THREE.BufferGeometry | null = null
    try {
      geo = b.parts.length === 1 ? b.parts[0] : mergeGeometries(b.parts, false)
    } catch {
      geo = null
    }
    if (!geo) {
      // merge failed — restore ONLY this bucket's meshes and keep going
      console.warn('[batch] bucket merge failed, kept individual meshes:', b.key)
      for (const h of b.orig) h.visible = true
      continue
    }
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: b.roughness,
      metalness: b.metalness,
      emissive: b.emissive,
      emissiveIntensity: b.emissiveIntensity,
      transparent: b.transparent,
      opacity: b.opacity,
      side: b.side,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = b.cast
    mesh.receiveShadow = b.receive
    mesh.matrixAutoUpdate = false
    mesh.frustumCulled = false
    mesh.name = 'batch:' + b.key
    scene.add(mesh)
    meshes.push(mesh)
  }
  activeBatch = { meshes: mergedAll.concat(meshes), hidden: hiddenAll.concat(candidates) }
}

export function SceneBatcher() {
  // The scene comes from the R3F store we're mounted in. (The map viewer's
  // bootstrap used to publish window.__ACCRA.scene — the game never sets
  // that, so relying on it here silently skipped the whole batch pass and
  // left the Accra map at ~4000 draw calls.)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    let cancelled = false
    let raf2 = 0
    // wait two frames: the whole world must be mounted first
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !scene) return
        const w = window as unknown as { __ACCRA?: { scene?: THREE.Scene } }
        runBatch(w.__ACCRA?.scene ?? scene)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [scene])
  // on final unmount, restore the original meshes
  useEffect(() => {
    return () => undoBatch()
  }, [])
  return null
}
