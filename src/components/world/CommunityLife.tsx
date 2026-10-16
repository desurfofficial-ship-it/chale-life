'use client'

// ─── Task 14: community life — instanced NPCs + vehicles (Chorkor West) ─────
// NPCs: the city's stylised low-poly people, now articulated (torso, head,
// hair / headwrap, skirt, head-load + 6 limb segments) and drawn as 6
// InstancedMeshes for the WHOLE neighbourhood. Static residents hold poses
// (stand / sit / vend / squat / kid); walkers follow audited footpath loops
// (sim/data/community.json → community.spec.ts proves every sample is on
// walkable ground) with a procedural walk cycle.
// Vehicles: trotro / taxi / car / okada instanced meshes (parked + moving in
// the same 4–5 draws). Moving ones run ONE clockwise right-hand loop round
// the south block at equal speed + equal spacing, so they can never meet;
// the loop lanes are proven clear by community.spec.ts.
// Neither NPCs nor moving vehicles produce colliders (names are not in the
// exporter's instanced table); parked vehicles get hand boxes (colliderExport).
import { useLayoutEffect, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { buildSegments, gapSpeedScale, laneOffset, pathLength, poseAt, type Pose } from '@/world/airport/paths'
import { registerAmbient } from '@/engine/ambient'
import { COMMUNITY, type CommunityData } from '@/lib/communityLayout'
import { npcGeometries, vehicleGeometry } from '@/lib/communityKit'

// ── outfits (24 looks): shirt, legs, skin, hair/wrap, dress?, scale ─────────
const SKIN = ['#8a5a3b', '#6e4226', '#a06a42', '#5b3520', '#7b4c2e']
const SHIRT = ['#f4f1ea', '#c8102e', '#1d4fa0', '#e9c54a', '#3a9a4a', '#e67e22', '#7b3fa0', '#2b2b2b', '#9cc7d8', '#d4557a', '#0f6e6e', '#b0172b']
const LEGS = ['#24324a', '#3b3f44', '#6b4a33', '#1d1d1d', '#4a5a3a', '#c9b38a']
const WRAP = ['#e0a21c', '#b0172b', '#1d4fa0', '#3aa08f', '#7b3fa0', '#d61f3a']
interface Look { shirt: string; legs: string; skin: string; hair: string; wrap: boolean; cap: boolean; dress: string | null; s: number }
const LOOKS: Look[] = Array.from({ length: 24 }, (_, i) => {
  const female = i % 2 === 1
  const dress = female && i % 4 === 1 ? ['#e0a21c', '#1d4fa0', '#b0172b', '#3aa08f', '#7b3fa0', '#d4557a'][i % 6] : null
  const wrap = female && (i % 3 !== 0)
  return {
    shirt: dress ?? SHIRT[(i * 5) % SHIRT.length],
    legs: dress ? SKIN[i % SKIN.length] : LEGS[(i * 7) % LEGS.length],
    skin: SKIN[i % SKIN.length],
    hair: wrap ? WRAP[i % WRAP.length] : (i % 5 === 2 ? '#c8102e' : '#1a1410'),
    wrap,
    cap: !female && i % 5 === 2,
    dress,
    s: female ? 0.93 + (i % 3) * 0.025 : 0.97 + (i % 4) * 0.025,
  }
})

interface Agent { x: number; z: number; r: number; pose: string; look: number; sh: number; load: boolean; walk?: { pts: [number, number][]; L: number[]; total: number; speed: number; off: number; closed: boolean } }

const dummy = new THREE.Object3D()

function buildAgents(D: CommunityData): Agent[] {
  const out: Agent[] = D.npcs.map((n) => ({ x: n.x, z: n.z, r: n.r, pose: n.pose, look: n.look % 24, sh: n.sh ?? 0.46, load: false }))
  let seed = 7
  for (const w of D.walks) {
    const pts = w.closed ? [...w.pts, w.pts[0]] : [...w.pts, ...w.pts.slice(0, -1).reverse()] // ping-pong
    const L: number[] = [0]
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const total = L[L.length - 1]
    for (let k = 0; k < w.n; k++) {
      seed = (seed * 9301 + 49297) % 233280
      out.push({ x: pts[0][0], z: pts[0][1], r: 0, pose: 'walk', look: seed % 24, sh: 0.46, load: !!w.carry && k === 0, walk: { pts, L, total, speed: w.speed * (0.9 + (seed % 20) / 100), off: (total * (k + 0.37 * (seed % 3))) / w.n, closed: w.closed } })
    }
  }
  return out
}

function sampleWalk(a: Agent, t: number) {
  const w = a.walk!
  let s = (w.off + t * w.speed) % w.total
  let i = 1
  while (i < w.L.length - 1 && w.L[i] < s) i++
  const p0 = w.pts[i - 1], p1 = w.pts[i]
  const seg = w.L[i] - w.L[i - 1] || 1
  const u = (s - w.L[i - 1]) / seg
  s = 0
  return { x: p0[0] + (p1[0] - p0[0]) * u, z: p0[1] + (p1[1] - p0[1]) * u, r: Math.atan2(p1[0] - p0[0], p1[1] - p0[1]) }
}

// write one person's 11 instance matrices (+ colours on first pass)
function poseAgent(
  a: Agent, i: number, t: number,
  maps: { skirt: number[]; load: number[] },
  M: { torso: THREE.InstancedMesh; head: THREE.InstancedMesh; hair: THREE.InstancedMesh; skirt: THREE.InstancedMesh; load: THREE.InstancedMesh; limb: THREE.InstancedMesh },
) {
  const L = LOOKS[a.look]
  let x = a.x, z = a.z, r = a.r
  let phase = 0
  if (a.walk) { const p = sampleWalk(a, t); x = p.x; z = p.z; r = p.r; phase = (t * a.walk.speed * 2.1 + i) }
  const kid = a.pose === 'kid'
  const s = kid ? 0.62 : L.s
  const seated = a.pose === 'sit' || a.pose === 'squat'
  const hipY = seated ? (a.pose === 'squat' ? 0.42 : a.sh + 0.04) : 0.92 * s
  const lean = a.pose === 'squat' ? 0.45 : a.pose === 'vend' ? 0.12 : 0
  const bob = a.walk ? Math.abs(Math.sin(phase)) * 0.035 : 0
  const cr = Math.cos(r), sr = Math.sin(r)
  // local (lx, ly, lz) → world; local +z = facing
  const W = (lx: number, ly: number, lz: number): [number, number, number] => [x + lx * cr + lz * sr, ly, z - lx * sr + lz * cr]
  const up = (ly: number, lz = 0): [number, number] => [ly * Math.cos(lean) + 0, lz + ly * Math.sin(lean)]
  const set = (m: THREE.InstancedMesh, idx: number, p: [number, number, number], pitch: number, sc: [number, number, number]) => {
    dummy.position.set(p[0], p[1], p[2])
    dummy.rotation.set(pitch, r, 0, 'YXZ')
    dummy.scale.set(sc[0], sc[1], sc[2])
    dummy.updateMatrix()
    m.setMatrixAt(idx, dummy.matrix)
  }
  const hy = hipY + bob
  // torso (capsule centre 0.3 above its origin) — origin at the hip
  const [ty, tz] = up(0.02)
  set(M.torso, i, W(0, hy + ty, tz), lean, [s, s, s])
  const [hy2, hz2] = up(0.72 * s)
  set(M.head, i, W(0, hy + hy2, hz2), lean, [s, s, s])
  set(M.hair, i, W(0, hy + hy2 + 0.02 * s, hz2), lean, L.wrap ? [s * 1.08, s * 1.7, s * 1.08] : L.cap ? [s * 1.05, s * 0.8, s * 1.12] : [s, s, s])
  const si = maps.skirt[i], li = maps.load[i]
  if (si >= 0 && !seated) set(M.skirt, si, W(0, hy + 0.06, 0), 0, [s, s, s])
  else if (si >= 0) set(M.skirt, si, W(0, hy + 0.08, 0.12), -1.2, [s, s * 0.7, s])
  if (li >= 0) {
    const [ly, lz] = up(0.86 * s)
    set(M.load, li, W(0, hy + ly, lz), 0, [s, s, s])
  }
  // limbs: 0 thighL 1 thighR 2 shinL 3 shinR 4 armL 5 armR
  const thigh = 0.47 * s, shin = 0.47 * s, arm = 0.6 * s
  const base = i * 6
  for (const side of [-1, 1]) {
    const k = side < 0 ? 0 : 1
    const hipP = W(side * 0.1 * s, hy, 0)
    let tp = 0, sp = 0 // pitches (negative = forward)
    if (a.walk) {
      const sw = Math.sin(phase + (side < 0 ? 0 : Math.PI))
      tp = -0.42 * sw
      sp = tp + Math.max(0, -Math.cos(phase + (side < 0 ? 0 : Math.PI))) * 0.55
    } else if (a.pose === 'sit') { tp = -Math.PI / 2; sp = 0 }
    else if (a.pose === 'squat') { tp = -1.25; sp = 0.35 }
    set(M.limb, base + k, hipP, tp, [s, thigh, s])
    // knee = hip + R(tp)·(0,−thigh,0)
    const kx = side * 0.1 * s, ky = hy - thigh * Math.cos(tp), kz = -thigh * Math.sin(tp)
    const shinLen = a.pose === 'sit' ? Math.max(0.2, ky) : shin
    set(M.limb, base + 2 + k, W(kx, ky, kz), sp, [s * 0.92, shinLen, s * 0.92])
    // arms
    const [sy, sz] = up(0.5 * s)
    let ap = 0
    if (a.walk) ap = 0.4 * Math.sin(phase + (side < 0 ? Math.PI : 0))
    else if (a.pose === 'vend') ap = -0.7 - (side < 0 ? 0.15 : 0)
    else if (seated) ap = -0.55
    else if (a.load && side > 0) ap = Math.PI - 0.2 // steadying the head-pan
    set(M.limb, base + 4 + k, W(side * 0.23 * s, hy + sy, sz), ap + lean * 0.5, [s * 0.75, arm, s * 0.75])
  }
}

function useColors(M: React.RefObject<THREE.InstancedMesh | null>, n: number, f: (i: number) => string) {
  useLayoutEffect(() => {
    const m = M.current
    if (!m) return
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) m.setColorAt(i, c.set(f(i)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [M, n, f])
}

function People({ data: D }: { data: CommunityData }) {
  const agents = useMemo(() => buildAgents(D), [D])
  const n = agents.length
  const G = npcGeometries()
  const torso = useRef<THREE.InstancedMesh>(null), head = useRef<THREE.InstancedMesh>(null), hair = useRef<THREE.InstancedMesh>(null)
  const skirt = useRef<THREE.InstancedMesh>(null), load = useRef<THREE.InstancedMesh>(null), limb = useRef<THREE.InstancedMesh>(null)
  const look = (i: number) => LOOKS[agents[i].look]
  // skirts / head-loads are only instanced for the people who have them
  const maps = useMemo(() => {
    let ns = 0, nl = 0
    const skirt = agents.map((a) => (LOOKS[a.look].dress ? ns++ : -1))
    const load = agents.map((a) => (a.load ? nl++ : -1))
    return { skirt, load, ns, nl, skirtOwner: agents.map((_, i) => i).filter((i) => skirt[i] >= 0), loadOwner: agents.map((_, i) => i).filter((i) => load[i] >= 0) }
  }, [agents])
  useColors(torso, n, (i) => look(i).shirt)
  useColors(head, n, (i) => look(i).skin)
  useColors(hair, n, (i) => look(i).hair)
  useColors(skirt, maps.ns, (j) => look(maps.skirtOwner[j]).dress ?? '#ffffff')
  useColors(load, maps.nl, (j) => (j % 2 ? '#d9e3e8' : '#c8102e'))
  useColors(limb, n * 6, (j) => {
    const a = agents[Math.floor(j / 6)]
    const L = LOOKS[a.look]
    const part = j % 6
    if (part < 4) return L.dress ? L.skin : L.legs
    return a.look % 3 === 0 ? L.shirt : L.skin // long vs short sleeves
  })
  const meshes = () => ({ torso: torso.current!, head: head.current!, hair: hair.current!, skirt: skirt.current!, load: load.current!, limb: limb.current! })
  const walkers = useMemo(() => agents.map((a, i) => (a.walk ? i : -1)).filter((i) => i >= 0), [agents])
  useLayoutEffect(() => {
    const M = meshes()
    if (!M.torso) return
    agents.forEach((a, i) => poseAgent(a, i, 0, maps, M))
    for (const m of Object.values(M)) m.instanceMatrix.needsUpdate = true
  })
  useFrame(({ clock }) => {
    const M = meshes()
    if (!M.torso) return
    const t = clock.elapsedTime
    for (const i of walkers) poseAgent(agents[i], i, t, maps, M)
    for (const m of Object.values(M)) m.instanceMatrix.needsUpdate = true
  })
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85 }), [])
  // P2-4: per-mount material — free it on unmount
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <group name="t14-people">
      <instancedMesh ref={torso} name="t14-npc-torso" args={[G.torso, mat, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={head} name="t14-npc-head" args={[G.head, mat, n]} frustumCulled={false} />
      <instancedMesh ref={hair} name="t14-npc-hair" args={[G.hair, mat, n]} frustumCulled={false} />
      <instancedMesh ref={skirt} name="t14-npc-skirt" args={[G.skirt, mat, Math.max(1, maps.ns)]} frustumCulled={false} />
      <instancedMesh ref={load} name="t14-npc-load" args={[G.load, mat, Math.max(1, maps.nl)]} frustumCulled={false} />
      <instancedMesh ref={limb} name="t14-npc-limb" args={[G.limb, mat, n * 6]} castShadow frustumCulled={false} />
    </group>
  )
}

// ── vehicle loop (same rounded rectangle as tools/t14_community.py) ────────
function loopPath(D: CommunityData, step = 0.5): [number, number][] {
  const c = D.loop.corners
  const RR = D.loop.r
  const pts: [number, number][] = []
  for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length], nb = c[(i + 2) % c.length]
    const Ra = RR[i], R = RR[(i + 1) % c.length]
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L
    for (let s = Ra; s < L - R; s += step) pts.push([a[0] + ux * s, a[1] + uz * s])
    const VL = Math.hypot(nb[0] - b[0], nb[1] - b[1])
    const vx = (nb[0] - b[0]) / VL, vz = (nb[1] - b[1]) / VL
    const p0 = [b[0] - ux * R, b[1] - uz * R]
    const cx = p0[0] + vx * R, cz = p0[1] + vz * R
    const a0 = Math.atan2(p0[1] - cz, p0[0] - cx)
    const a1 = Math.atan2(b[1] + vz * R - cz, b[0] + vx * R - cx)
    let da = a1 - a0
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    const k = Math.max(4, Math.floor((Math.abs(da) * R) / step))
    for (let j = 0; j < k; j++) { const t = a0 + (da * j) / k; pts.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R]) }
  }
  return pts
}

const VEH_KINDS = ['trotro', 'taxi', 'car', 'okada', 'okada-empty'] as const

function Vehicles({ data: D }: { data: CommunityData }) {
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({})
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const plan = useMemo(() => {
    const out: Record<string, { x: number; y: number; z: number; r: number; tint: string; moving: number }[]> = {}
    for (const k of VEH_KINDS) out[k] = []
    // parked
    for (const v of D.parked ?? []) {
      const kind = v.k
      if (!out[kind]) out[kind] = []
      out[kind].push({ x: v.x, y: 0, z: v.z, r: v.r, tint: v.tint, moving: -1 })
    }
    // moving fleet: [kind, tint][]
    ;(D.loop?.fleet ?? []).forEach((pair, i) => {
      const kind = pair[0]
      const tint = pair[1] ?? '#c0c4c8'
      if (!out[kind]) out[kind] = []
      out[kind].push({ x: 0, y: 0, z: 0, r: 0, tint, moving: i })
    })
    return out
  }, [D])

  const path = useMemo(() => {
    const raw = loopPath(D, 0.75)
    if (raw.length < 2) return null
    const pts = raw.map((p) => ({ x: p[0], z: p[1] }))
    const segs = buildSegments(pts, true)
    return { segs, len: pathLength(segs) }
  }, [D])

  const distances = useRef<number[]>([])
  const speeds = useRef<number[]>([])
  const tintColor = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    if (!path) return
    // init distances staggered
    let movingCount = 0
    for (const k of VEH_KINDS) {
      for (const v of plan[k]) {
        if (v.moving >= 0) movingCount++
      }
    }
    distances.current = Array.from({ length: movingCount }, (_, i) => (i / Math.max(1, movingCount)) * path.len)
    speeds.current = Array.from({ length: movingCount }, (_, i) => (D.loop?.speed ?? 6) * (0.75 + (i % 5) * 0.08))

    return registerAmbient((dt) => {
      if (!path || path.len <= 0) return
      const out: Pose = { x: 0, z: 0, yaw: 0 }
      let mi = 0
      for (const k of VEH_KINDS) {
        const mesh = refs.current[k]
        if (!mesh) { mi += plan[k].filter((v) => v.moving >= 0).length; continue }
        plan[k].forEach((v, j) => {
          if (v.moving < 0) return
          const idx = mi
          mi++
          const scale = gapSpeedScale(distances.current, idx, path.len, 4, speeds.current)
          distances.current[idx] = (distances.current[idx] + speeds.current[idx] * scale * dt) % path.len
          poseAt(path.segs, path.len, distances.current[idx], out)
          const lane = (idx % 2 === 0 ? 1 : -1) * 1.6
          laneOffset(out, lane, out)
          dummy.position.set(out.x, 0, out.z)
          dummy.rotation.set(0, out.yaw, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(j, dummy.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      }
    })
  }, [path, plan, D])

  useLayoutEffect(() => {
    for (const k of VEH_KINDS) {
      const mesh = refs.current[k]
      if (!mesh) continue
      plan[k].forEach((v, j) => {
        if (v.moving < 0) {
          dummy.position.set(v.x, v.y, v.z)
          dummy.rotation.set(0, v.r, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(j, dummy.matrix)
        }
        if (mesh.instanceColor) mesh.setColorAt(j, tintColor.set(v.tint))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [plan, dummy, tintColor])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }), [])
  // P2-4: per-mount material — free it on unmount
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <group name="t14-vehicles">
      {VEH_KINDS.map((k) => plan[k].length ? (
        <instancedMesh
          key={k}
          ref={(m) => { refs.current[k] = m }}
          name={`t14-veh-${k}`}
          args={[vehicleGeometry(k), mat, plan[k].length]}
          castShadow
          frustumCulled
        />
      ) : null)}
    </group>
  )
}

/** Task 15: instanced neighbourhood life for any CommunityData zone (the
 *  Chorkor West default is unchanged). Zones without a moving fleet render
 *  parked vehicles only. */
export function CommunityLife({ data = COMMUNITY }: { data?: CommunityData }) {
  return (
    <group name="t15-life">
      <People data={data} />
      <Vehicles data={data} />
    </group>
  )
}
