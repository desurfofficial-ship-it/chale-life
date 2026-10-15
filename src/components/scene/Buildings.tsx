'use client'

// W-008 facade palette: peach #F0AB70, sage #8DA69A, brick #B76544,
// sand #E4C782, slate #8999A3 — cream trims. Prefer COLORS from mapConfig.


// ─── Procedural buildings: glass towers, compound houses, shops ─────────────
// Handover perf model: every building shell is ONE geometry whose 4 side faces
// UV into a SHARED facade atlas (map + emissiveMap) with the wall colour baked
// into vertex colors — so all shells can merge into ~2 draw calls (see
// SceneBatcher's facade pass). Roof caps are plain quads that join the
// existing plain-color batches. No per-building textures remain.
import { useMemo } from 'react'
import * as THREE from 'three'
import { signGeometry, getSignMaterial } from '@/lib/signAtlas'
import { resolveFacade, getFacadeMaterials, signTexture, FACADE_UV_INSET, type AtlasRect } from '@/lib/mapTextures'
import { COLORS } from '@/lib/mapConfig'
import { HOUSE_YARDS, houseKey, type FenceKind } from '@/lib/houseYards'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 4-side facade box: +z, -z, +x, -x quads, UVs remapped into the atlas tile,
// vertex colors = wall colour (tints the white tile at render time)
// Geometry is CENTERED on y (-h/2..+h/2) exactly like the old BoxGeometry:
// callers pass the box CENTER (position.y = h/2), and the shell mesh's own
// [0, h/2, 0] offset lands the walls at 0..h in the wrapper group. Getting
// this wrong floats every building in the city (seen in the user's video).
function makeFacadeShellGeometry(w: number, h: number, d: number, rect: AtlasRect, wall: string): THREE.BufferGeometry {
  const u0 = rect.u0 + FACADE_UV_INSET
  const u1 = rect.u1 - FACADE_UV_INSET
  const v0 = rect.v0 + FACADE_UV_INSET * 2
  const v1 = rect.v1 - FACADE_UV_INSET * 2

  const faces = [
    // +z: x from -w/2..w/2, y from -h/2..+h/2 (centered), normal (0,0,1)
    { n: [0, 0, 1], corners: [[-w / 2, -h / 2, d / 2], [w / 2, -h / 2, d / 2], [w / 2, h / 2, d / 2], [-w / 2, h / 2, d / 2]] },
    // -z
    { n: [0, 0, -1], corners: [[w / 2, -h / 2, -d / 2], [-w / 2, -h / 2, -d / 2], [-w / 2, h / 2, -d / 2], [w / 2, h / 2, -d / 2]] },
    // +x
    { n: [1, 0, 0], corners: [[w / 2, -h / 2, d / 2], [w / 2, -h / 2, -d / 2], [w / 2, h / 2, -d / 2], [w / 2, h / 2, d / 2]] },
    // -x
    { n: [-1, 0, 0], corners: [[-w / 2, -h / 2, -d / 2], [-w / 2, -h / 2, d / 2], [-w / 2, h / 2, d / 2], [-w / 2, h / 2, -d / 2]] },
  ]
  const uvPerFace = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]

  const verts: number[] = []
  const norms: number[] = []
  const uvs: number[] = []
  const cols: number[] = []
  const idx: number[] = []
  const c = new THREE.Color(wall) // linear working-space colour (matches batcher)
  faces.forEach((f, fi) => {
    const base = fi * 4
    for (let i = 0; i < 4; i++) {
      verts.push(...f.corners[i])
      norms.push(...f.n)
      uvs.push(...uvPerFace[i])
      cols.push(c.r, c.g, c.b)
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  })

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
  g.setIndex(idx)
  return g
}

interface BuildingProps {
  position: [number, number, number]
  size: [number, number, number] // w, h, d
  wall: string
  facadeKey: string
  rows: number
  cols: number
  glass?: boolean
  litRatio?: number
  rotation?: number
  /** Task 14 community facade style (louvre / worn / block) */
  style?: 'plain' | 'louvre' | 'worn' | 'block'
  /** skip the plain roof-cap quad (callers that build their own roof) */
  noCap?: boolean
}

export function Building({ position, size, wall, facadeKey, rows, cols, glass = false, litRatio = 0.5, rotation = 0, style, noCap = false }: BuildingProps) {
  void facadeKey // kept for call-site compatibility; atlas keys off pattern only
  const [w, h, d] = size
  const binding = useMemo(
    () => resolveFacade({ wall, rows, cols, litRatio, glass, style }),
    [wall, rows, cols, litRatio, glass, style]
  )
  const shell = useMemo(() => makeFacadeShellGeometry(w, h, d, binding.rect, wall), [w, h, d, binding, wall])
  const { wall: matWall, glass: matGlass } = getFacadeMaterials()
  const mat = glass ? matGlass : matWall
  const capColor = useMemo(() => new THREE.Color(wall).multiplyScalar(0.55), [wall])

  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'building' }}>
      {/* shell geometry is centered (±h/2) like the old BoxGeometry — NO extra
          offset here: the caller's group already sits at h/2, so walls land 0..h */}
      <mesh geometry={shell} material={mat} castShadow receiveShadow />
      {/* roof cap — plain quad, joins the plain-color batches.
          Group sits at h/2 (center convention) → cap goes h/2 above the
          group origin to land at world h + 0.02, just over the wall top */}
      {!noCap && <mesh name="roof-cap" position={[0, h / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={capColor} roughness={0.9} />
      </mesh>}
      {glass && (
        <mesh position={[0, h / 2 + 0.25, 0]}>
          <boxGeometry args={[w + 0.6, 0.5, d + 0.6]} />
          <meshStandardMaterial color="#2b2f36" roughness={0.8} />
        </mesh>
      )}
    </group>
  )
}

export function GlassTower({ position, height, w = 8, d = 8, hue = '#274b63' }: { position: [number, number, number]; height: number; w?: number; d?: number; hue?: string }) {
  return (
    <group position={position} userData={{ bldg: 'tower' }}>
      <Building position={[0, height / 2, 0]} size={[w, height, d]} wall={hue} facadeKey={`tower-${hue}-${height}`} rows={Math.round(height / 2.6)} cols={4} glass litRatio={0.55} />
      {/* rooftop AC units + antenna */}
      <mesh position={[w * 0.22, height + 0.9, d * 0.18]} castShadow>
        <boxGeometry args={[1.6, 1.4, 1.6]} />
        <meshStandardMaterial color="#3a3f45" />
      </mesh>
      <mesh position={[-w * 0.2, height + 0.7, -d * 0.2]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#44494f" />
      </mesh>
      <mesh position={[0, height + 2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 3.6, 6]} />
        <meshStandardMaterial color="#777" />
      </mesh>
      <mesh position={[0, height + 4.5, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ff4040" emissive="#ff2020" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

export function CompoundHouse({ position, rotation = 0, wall = COLORS.wallTeal, w = 7, d = 6.4, h = 4.2, variant = 0, roof = 'tile', walled = false, lawn = true, fence }: { position: [number, number, number]; rotation?: number; wall?: string; w?: number; d?: number; h?: number; variant?: number; roof?: 'tile' | 'metal'; walled?: boolean; /** Task 12: draw the yard lawn from lib/houseYards (default on) */ lawn?: boolean; /** override the table's fence ('none' to suppress) */ fence?: FenceKind | 'none' }) {
  // Task 12 yard: lawn depth / side / fence come from the audited table
  // (lib/houseYards.ts, generated against colliders + road bands). Houses
  // without an entry get no yard (e.g. the Daavi-plot house is excluded on
  // purpose — the onboarding camera flies through its front window).
  const yard = lawn ? HOUSE_YARDS[houseKey(position[0], position[2])] : undefined
  const fenceKind = fence === 'none' ? undefined : (fence ?? yard?.fence)
  const roofColor = roof === 'metal' ? (variant % 2 === 0 ? '#8f949a' : '#7c828a') : COLORS.roofTerracotta
  return (
    <group position={position} rotation={[0, rotation, 0]} name="compound-house" userData={{ bldg: 'house', house: { key: houseKey(position[0], position[2]), w, d, walled } }}>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey={`house-${wall}-v${variant}`} rows={1} cols={3} litRatio={0.62} />
      {yard && (() => {
        const side = yard.side ?? 'front'
        const across = side === 'front' || side === 'back'
        return <HouseYard len={across ? w : d} half={across ? d / 2 : w / 2} rot={YARD_ROT[side]} depth={yard.d} fenceDepth={yard.fd ?? yard.d} fence={walled || side !== 'front' ? undefined : fenceKind} />
      })()}
      {/* hip roof — 4-sided pyramid (tile) or low-pitch corrugated metal */}
      {roof === 'metal' ? (
        <group>
          <mesh position={[0, h + 0.55, 0]} castShadow>
            <boxGeometry args={[w + 0.5, 0.9, d + 0.5]} />
            <meshStandardMaterial color={roofColor} roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, h + 1.05, 0]} castShadow>
            <boxGeometry args={[w * 0.55, 0.16, d * 0.55]} />
            <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, h + 1.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.78, 2.1, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.8} />
        </mesh>
      )}
      {/* door */}
      <mesh position={[0, 1.15, d / 2 + 0.03]}>
        <planeGeometry args={[1.1, 2.2]} />
        <meshStandardMaterial color="#5b3d28" />
      </mesh>
      {/* W-008: cream cornice + rooftop polytank (reads at street LOD) */}
      <mesh position={[0, h + 0.08, 0]} name="w008-cornice" userData={{ noCollide: true }}>
        <boxGeometry args={[w + 0.25, 0.16, d + 0.25]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.85} />
      </mesh>
      <mesh position={[w * 0.28, h + 0.85, -d * 0.2]} name="w008-polytank" userData={{ noCollide: true }}>
        <cylinderGeometry args={[0.45, 0.48, 1.1, 8]} />
        <meshStandardMaterial color="#8999A3" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* optional front courtyard wall + metal gate */}
      {walled && (
        <group>
          {[-w / 2 + 0.35, w / 2 - 0.35].map((dx) => (
            <mesh key={dx} position={[dx, 0.55, d / 2 + 1.9]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.42, 1.1, 0.28]} />
              <meshStandardMaterial color="#d9cbb2" roughness={0.9} />
            </mesh>
          ))}
          {/* sliding metal gate */}
          <mesh position={[0, 0.62, d / 2 + 1.9]} castShadow>
            <boxGeometry args={[w * 0.34, 1.24, 0.12]} />
            <meshStandardMaterial color="#5e6a72" roughness={0.5} metalness={0.55} />
          </mesh>
          {[-1, 0, 1].map((i) => (
            <mesh key={i} position={[i * w * 0.11, 0.62, d / 2 + 1.97]}>
              <boxGeometry args={[0.06, 1.1, 0.03]} />
              <meshStandardMaterial color="#3c444b" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

export function Shop({ position, rotation = 0, sign, signBg, wall = COLORS.wallCream, w = 8, d = 5, h = 3.6, variant = 0 }: { position: [number, number, number]; rotation?: number; sign: string; signBg: string; wall?: string; w?: number; d?: number; h?: number; variant?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ bldg: 'shop' }}>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey={`shop-${wall}-v${variant}`} rows={1} cols={4} litRatio={0.7} />
      {/* Task 13: sign from the shared sign atlas (one draw for every sign) */}
      <ShopSign text={sign} bg={signBg} w={w * 0.86} position={[0, h - 0.15, d / 2 + 0.08]} />
      {/* awning */}
      <mesh position={[0, h - 1.6, d / 2 + 0.55]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.14, 1.5]} />
        <meshStandardMaterial color="#ce1126" roughness={0.7} />
      </mesh>
    </group>
  )
}

// shop fascia sign from the shared sign atlas
function ShopSign({ text, bg, w, position }: { text: string; bg: string; w: number; position: [number, number, number] }) {
  const geo = useMemo(() => signGeometry(text, bg, '#111111', w, 1.5), [text, bg, w])
  return <mesh position={position} geometry={geo} material={getSignMaterial()} />
}

// ─── Task 12: house yards — lawn + optional low fence with a gate gap ───────
// The lawn is a flat plane (no collider: the exporter skips flat decals) that
// fills the audited front (or back) yard; the fence is ≤ 1.15 m and sits
// INSIDE the lawn rectangle, so it never reaches past the audited yard. Each
// straight run is its own mesh so its collider AABB stays a thin strip; all
// runs share plain vertex-coloured materials → SceneBatcher merges them.
const FENCE_STYLE: Record<FenceKind, { color: string; rough: number; metal: number }> = {
  picket: { color: '#f1ece0', rough: 0.85, metal: 0 },
  block: { color: '#d9cbb2', rough: 0.9, metal: 0 },
  rail: { color: '#3c444b', rough: 0.4, metal: 0.6 },
}
const fenceGeoCache = new Map<string, THREE.BufferGeometry>()
function boxPart(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string) {
  const g = new THREE.BoxGeometry(sx, sy, sz)
  g.translate(x, y, z)
  const c = new THREE.Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}
/** one straight fence run along local x, centred, base at y 0 */
function fenceGeometry(kind: FenceKind, len: number): THREE.BufferGeometry {
  const L = Math.round(len * 20) / 20
  const key = `${kind}:${L}`
  let g = fenceGeoCache.get(key)
  if (g) return g
  const parts: THREE.BufferGeometry[] = []
  const col = FENCE_STYLE[kind].color
  if (kind === 'picket') {
    parts.push(boxPart(0.1, 1.05, 0.1, -L / 2 + 0.05, 0.525, 0, col), boxPart(0.1, 1.05, 0.1, L / 2 - 0.05, 0.525, 0, col))
    parts.push(boxPart(L, 0.07, 0.04, 0, 0.32, 0, '#d8d0bf'), boxPart(L, 0.07, 0.04, 0, 0.78, 0, '#d8d0bf'))
    const n = Math.max(1, Math.floor((L - 0.2) / 0.3))
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + 0.1 + (i + 0.5) * ((L - 0.2) / n)
      parts.push(boxPart(0.08, 0.92, 0.035, x, 0.46, 0.035, col))
    }
  } else if (kind === 'block') {
    parts.push(boxPart(L, 0.95, 0.2, 0, 0.475, 0, col))
    parts.push(boxPart(L + 0.04, 0.07, 0.26, 0, 0.985, 0, '#bfb19a'))
    parts.push(boxPart(0.3, 1.12, 0.3, -L / 2 + 0.15, 0.56, 0, '#c9b99e'), boxPart(0.3, 1.12, 0.3, L / 2 - 0.15, 0.56, 0, '#c9b99e'))
  } else {
    const posts = Math.max(2, Math.ceil(L / 1.4) + 1)
    for (let i = 0; i < posts; i++) parts.push(boxPart(0.08, 1.1, 0.08, -L / 2 + 0.04 + (i * (L - 0.08)) / (posts - 1), 0.55, 0, col))
    parts.push(boxPart(L, 0.05, 0.05, 0, 1.05, 0, col), boxPart(L, 0.05, 0.05, 0, 0.18, 0, col))
    const n = Math.max(1, Math.floor(L / 0.22))
    for (let i = 0; i < n; i++) parts.push(boxPart(0.025, 0.85, 0.025, -L / 2 + (i + 0.5) * (L / n), 0.615, 0, col))
  }
  g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false)!
  fenceGeoCache.set(key, g)
  return g
}
const fenceMatCache = new Map<string, THREE.MeshStandardMaterial>()
function fenceMaterial(kind: FenceKind) {
  let m = fenceMatCache.get(kind)
  if (!m) {
    const st = FENCE_STYLE[kind]
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: st.rough, metalness: st.metal })
    fenceMatCache.set(kind, m)
  }
  return m
}
const LAWN_COLORS = ['#7db657', '#86bd5c', '#74ad50']
const YARD_ROT = { front: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 } as const
/** yard strip along one wall: `len` = wall length, `half` = centre→wall distance */
function HouseYard({ len, half, rot, depth, fenceDepth, fence }: { len: number; half: number; rot: number; depth: number; fenceDepth: number; fence?: FenceKind }) {
  const z0 = half // house wall
  const lawnColor = LAWN_COLORS[Math.abs(Math.round(len * 10 + depth * 7)) % 3]
  const gate = 1.7
  const inset = 0.1
  const zf = z0 + fenceDepth
  const frontLen = (len - gate) / 2 - inset
  const sideLen = fenceDepth - 0.12
  return (
    <group rotation={[0, rot, 0]}>
      <mesh position={[0, 0.045, z0 + depth / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="lawn">
        <planeGeometry args={[len, depth]} />
        <meshStandardMaterial color={lawnColor} roughness={0.95} />
      </mesh>
      {fence && (
        <group name="fence">
          {/* front run, split by the gate gap facing the door */}
          {[-1, 1].map((k) => (
            <mesh key={k} geometry={fenceGeometry(fence, frontLen)} material={fenceMaterial(fence)} castShadow
              position={[k * (gate / 2 + frontLen / 2), 0, zf - 0.12]} />
          ))}
          {/* side runs from the house wall to the front line */}
          {[-1, 1].map((k) => (
            <mesh key={`s${k}`} geometry={fenceGeometry(fence, sideLen)} material={fenceMaterial(fence)} castShadow
              position={[k * (len / 2 - inset), 0, z0 + sideLen / 2]} rotation={[0, Math.PI / 2, 0]} />
          ))}
        </group>
      )}
    </group>
  )
}
