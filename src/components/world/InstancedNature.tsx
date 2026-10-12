'use client'

// ─── Instanced scenery: one draw call per prop type (handover perf work) ────
// Palms/trees/lamps/people/umbrellas/benches used to be individual groups of
// meshes (≈1200 draw calls across the map). Each type is now merged into a
// single geometry with baked vertex colors and rendered as one InstancedMesh.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface PropItem {
  p: [number, number] // x, z (ground props)
  s?: number
  r?: number
  /** Task 13: base height (island plinth tops at 0.44) — lets island props
   *  share the map-wide instanced mesh instead of costing extra draw calls */
  y?: number
}

const CLOTH_COLORS = ['#ce1126', '#fcd116', '#2e7fa8', '#4f9e4f', '#e08a3c', '#d97b8f', '#f4f1ea', '#3aa08f']
const SKIN_TONES = ['#8a5a3b', '#6e4226', '#a06a42', '#5b3520']

// bake a flat color into every vertex of a transformed geometry part
function part(
  geo: THREE.BufferGeometry,
  color: string,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] | number = 1
): THREE.BufferGeometry {
  const g = geo.clone()
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]))
  const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale)
  m.compose(new THREE.Vector3(...pos), q, s)
  g.applyMatrix4(m)
  const c = new THREE.Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2))
  }
  return g
}

function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false)
  if (!g) throw new Error('merge failed')
  return g
}

// ── shared geometries (module singletons) ──
let palmGeo: THREE.BufferGeometry | null = null
function getPalmGeo() {
  if (!palmGeo) {
    const parts: THREE.BufferGeometry[] = [
      part(new THREE.CylinderGeometry(0.16, 0.3, 5.2, 7), '#8a6a44', [0, 2.6, 0], [0.06, 0, 0.05]),
    ]
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      parts.push(
        part(
          new THREE.ConeGeometry(0.42, 2.6, 4),
          i % 2 === 0 ? '#3e8f4a' : '#57a85f',
          [Math.cos(a) * 1.15, 5.08, Math.sin(a) * 1.15],
          [0.55 * Math.sin(a), -a, 0.5]
        )
      )
    }
    parts.push(part(new THREE.SphereGeometry(0.18, 6, 6), '#6b4a2f', [0.2, 4.95, 0.15]))
    palmGeo = merged(parts)
  }
  return palmGeo
}

let treeGeo: THREE.BufferGeometry | null = null
function getTreeGeo() {
  if (!treeGeo) {
    treeGeo = merged([
      part(new THREE.CylinderGeometry(0.22, 0.34, 2, 6), '#7a5230', [0, 1, 0]),
      part(new THREE.SphereGeometry(1.55, 9, 8), '#3e8f4a', [0, 2.9, 0]),
      part(new THREE.SphereGeometry(0.95, 8, 7), '#4da058', [0.5, 2.3, 0.4]),
    ])
  }
  return treeGeo
}

// overgrown bush cluster — the landmark dressing of every land-for-sale plot
let shrubGeo: THREE.BufferGeometry | null = null
function getShrubGeo() {
  if (!shrubGeo) {
    shrubGeo = merged([
      part(new THREE.SphereGeometry(0.62, 7, 6), '#4d8f3e', [0, 0.42, 0]),
      part(new THREE.SphereGeometry(0.45, 7, 6), '#5aa04a', [0.42, 0.32, 0.18]),
      part(new THREE.SphereGeometry(0.38, 6, 5), '#3e7f38', [-0.38, 0.3, -0.2]),
      part(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 5), '#6b4a2f', [0.1, 0.2, 0.05], [0.3, 0, 0.2]),
    ])
  }
  return shrubGeo
}

// small grass tuft (colliderless dressing) — 5 blades as thin cones
let grassGeo: THREE.BufferGeometry | null = null
function getGrassGeo() {
  if (!grassGeo) {
    const blades: THREE.BufferGeometry[] = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      blades.push(
        part(
          new THREE.ConeGeometry(0.07, 0.55 + (i % 2) * 0.22, 4),
          i % 2 === 0 ? '#6fa347' : '#83b355',
          [Math.cos(a) * 0.14, 0.26, Math.sin(a) * 0.14],
          [0.22 * Math.sin(a), 0, -0.22 * Math.cos(a)]
        )
      )
    }
    grassGeo = merged(blades)
  }
  return grassGeo
}

let benchGeo: THREE.BufferGeometry | null = null
function getBenchGeo() {
  if (!benchGeo) {
    benchGeo = merged([
      part(new THREE.BoxGeometry(0.14, 0.55, 0.5), '#3c4046', [-0.7, 0.28, 0]),
      part(new THREE.BoxGeometry(0.14, 0.55, 0.5), '#3c4046', [0.7, 0.28, 0]),
      part(new THREE.BoxGeometry(1.9, 0.12, 0.55), '#8a5c36', [0, 0.56, 0]),
      part(new THREE.BoxGeometry(1.9, 0.4, 0.1), '#8a5c36', [0, 0.88, -0.24], [0.18, 0, 0]),
    ])
  }
  return benchGeo
}

let lampGeo: THREE.BufferGeometry | null = null
let lampBulbGeo: THREE.BufferGeometry | null = null
function getLampGeos() {
  if (!lampGeo) {
    lampGeo = merged([
      part(new THREE.CylinderGeometry(0.09, 0.14, 5.2, 6), '#3c4046', [0, 2.6, 0]),
      part(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 6), '#3c4046', [0.55, 5.15, 0], [0, 0, -0.5]),
    ])
    lampBulbGeo = part(new THREE.SphereGeometry(0.26, 8, 8), '#ffe2a8', [1.05, 5.5, 0])
  }
  return { pole: lampGeo, bulb: lampBulbGeo! }
}

let umbrellaBaseGeo: THREE.BufferGeometry | null = null
function getUmbrellaBaseGeo() {
  if (!umbrellaBaseGeo) {
    umbrellaBaseGeo = merged([
      part(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), '#c8c8c8', [0, 1.4, 0]),
      part(new THREE.PlaneGeometry(1.5, 0.8), '#e8dcc2', [0.85, 0.06, 0.6], [-Math.PI / 2, 0, 0.4]),
    ])
  }
  return umbrellaBaseGeo
}

const UMBRELLA_COLORS = ['#ce1126', '#2e7fa8', '#fcd116', '#4f9e4f', '#d97b8f']

// ─────────────────────────────────────────────────────────── instanced meshes
function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  items: PropItem[],
  colorFn?: (i: number) => string
) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    items.forEach((it, i) => {
      dummy.position.set(it.p[0], it.y ?? 0, it.p[1])
      dummy.rotation.set(0, it.r ?? 0, 0)
      const s = it.s ?? 1
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (colorFn) mesh.setColorAt(i, col.set(colorFn(i)))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [ref, items, colorFn])
}

export function InstancedPalms({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  return (
    <instancedMesh name="inst-palm" ref={ref} args={[getPalmGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.85} />
    </instancedMesh>
  )
}

export function InstancedTrees({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  return (
    <instancedMesh name="inst-tree" ref={ref} args={[getTreeGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.85} />
    </instancedMesh>
  )
}

export function InstancedShrubs({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items, (i) => ['#4d8f3e', '#5aa04a', '#6fae54', '#3e7f38'][i % 4])
  return (
    <instancedMesh name="inst-shrub" ref={ref} args={[getShrubGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </instancedMesh>
  )
}

export function InstancedGrassTufts({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  return (
    <instancedMesh name="inst-grass" ref={ref} args={[getGrassGeo(), undefined, items.length]} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </instancedMesh>
  )
}

export function InstancedBenches({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  return (
    <instancedMesh name="inst-bench" ref={ref} args={[getBenchGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.85} />
    </instancedMesh>
  )
}

export function InstancedLamps({ items }: { items: PropItem[] }) {
  const { pole, bulb } = getLampGeos()
  const ref = useRef<THREE.InstancedMesh>(null)
  const bulbRef = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  useInstances(bulbRef, items)
  // all lamp glows as ONE THREE.Points draw call
  const glow = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255,220,150,0.95)')
    grad.addColorStop(1, 'rgba(255,200,120,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const arr = new Float32Array(items.length * 3)
    items.forEach((it, i) => {
      // bulb sits at local (1.05, 5.5) rotated by the lamp's yaw
      const r = it.r ?? 0
      arr[i * 3] = it.p[0] + Math.cos(r) * 1.05
      arr[i * 3 + 1] = 5.5
      arr[i * 3 + 2] = it.p[1] - Math.sin(r) * 1.05
    })
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [items])
  return (
    <group>
      <instancedMesh name="inst-lamp" ref={ref} args={[pole, undefined, items.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.6} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={bulbRef} args={[bulb, undefined, items.length]} frustumCulled={false}>
        <meshStandardMaterial vertexColors emissive="#ffc86e" emissiveIntensity={2.4} />
      </instancedMesh>
      <points geometry={pointsGeo} frustumCulled={false}>
        <pointsMaterial
          map={glow}
          size={2.6}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

export function InstancedPeople({ items }: { items: PropItem[] }) {
  const bodyGeo = useMemo(
    () => part(new THREE.CapsuleGeometry(0.22, 0.75, 3, 8), '#ffffff', [0, 0.62, 0]),
    []
  )
  const headGeo = useMemo(() => part(new THREE.SphereGeometry(0.2, 8, 8), '#ffffff', [0, 1.32, 0]), [])
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  useInstances(bodyRef, items, (i) => CLOTH_COLORS[i % CLOTH_COLORS.length])
  useInstances(headRef, items, (i) => SKIN_TONES[i % SKIN_TONES.length])
  return (
    <group>
      <instancedMesh name="inst-person" ref={bodyRef} args={[bodyGeo, undefined, items.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[headGeo, undefined, items.length]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

export function InstancedUmbrellas({ items }: { items: PropItem[] }) {
  const canopyGeo = useMemo(() => part(new THREE.ConeGeometry(1.7, 0.85, 8), '#ffffff', [0, 2.7, 0]), [])
  const ref = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, items)
  useInstances(canopyRef, items, (i) => UMBRELLA_COLORS[i % UMBRELLA_COLORS.length])
  return (
    <group>
      <instancedMesh name="inst-umbrella" ref={ref} args={[getUmbrellaBaseGeo(), undefined, items.length]} frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[canopyGeo, undefined, items.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
    </group>
  )
}
