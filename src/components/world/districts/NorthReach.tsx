'use client'

// ─── District: NORTH REACH (Task 12) — new land north of the airport ────────
// A strip of new land on the north apron (x −150…200, z −116…−182, beyond the
// walkable plate's north edge at z −116) carrying the map-wide additions the
// plate has no room for:
//   FARMS (x −150…−70)        crop fields, farm huts, fenced plots
//   INDUSTRIAL AREA (−62…22)  3 factory sheds, chimneys, tanks
//   HOSPITAL (30…80)          Korle Ridge Hospital + ambulance bay
//   AKWAABA MALL (86…126)     second mall + car park
//   BUSINESS PARK (134…200)   2 office towers + FOR SALE / FOR RENT homes
//   AKWAPIM HILLS             low-poly ridge backdrop (z −200…−330)
// It is SCENERY for now: the movement sim / colliders cover the plate only
// (z ≥ −116). The land is a separate textured slab at y 0.05 (3 cm above the
// apron plinth, so no z-fighting) — extending PLATE north later would make it
// walkable without moving anything here.
import { useLayoutEffect, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Hospital, Mall, Factory, OfficeBlock, PropertyListing, FarmHut, Hills, Sign, Box } from '../../scene/Businesses'
import type { PropItem } from '../InstancedNature'
import { InstancedTrees, InstancedPalms } from '../InstancedNature'

export const NORTH_REACH = { x0: -150, x1: 200, z0: -182, z1: -116 }
const PX = 4 // px per metre on the slab texture

// farm fields: x0, x1, z0, z1, crop colour
const FIELDS: [number, number, number, number, string][] = [
  [-146, -122, -170, -150, '#4f9e4f'], // maize
  [-118, -96, -170, -150, '#6fae54'], // cassava
  [-146, -122, -144, -128, '#3e8f4a'], // cocoa seedlings
  [-92, -72, -170, -140, '#83b355'], // plantain/vegetables
]

function buildSlabTexture(): THREE.CanvasTexture {
  const { x0, x1, z0, z1 } = NORTH_REACH
  const W = (x1 - x0) * PX, H = (z1 - z0) * PX
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const X = (x: number) => (x - x0) * PX
  const Z = (z: number) => (z - z0) * PX
  g.fillStyle = '#7aa955'
  g.fillRect(0, 0, W, H)
  // mottling (deterministic)
  let s = 7
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(109,156,77,0.35)' : 'rgba(147,196,105,0.3)'
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 8 + rnd() * 26, 0, Math.PI * 2); g.fill()
  }
  // farm fields: tilled soil with furrow stripes
  for (const [a, b, c0, c1] of FIELDS) {
    g.fillStyle = '#9a6a3f'
    g.fillRect(X(a), Z(c0), (b - a) * PX, (c1 - c0) * PX)
    g.fillStyle = 'rgba(70,45,25,0.45)'
    for (let x = a + 1; x < b; x += 2) g.fillRect(X(x), Z(c0), 0.5 * PX, (c1 - c0) * PX)
  }
  // concrete yards: industrial, hospital, mall, business park
  g.fillStyle = '#b8b3a8'
  g.fillRect(X(-62), Z(-170), 84 * PX, 44 * PX)
  g.fillStyle = '#c9c4b8'
  g.fillRect(X(30), Z(-160), 50 * PX, 34 * PX)
  g.fillRect(X(134), Z(-166), 66 * PX, 40 * PX)
  g.fillRect(X(86), Z(-166), 40 * PX, 40 * PX)
  // north ring road (z −121, 8 m) + spurs
  g.fillStyle = '#3b4048'
  g.fillRect(X(-150), Z(-125), 350 * PX, 8 * PX)
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.lineWidth = 0.3 * PX
  g.setLineDash([3 * PX, 3 * PX])
  g.beginPath(); g.moveTo(X(-150), Z(-121)); g.lineTo(X(200), Z(-121)); g.stroke()
  g.setLineDash([])
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.beginPath(); g.moveTo(X(-150), Z(-125)); g.lineTo(X(200), Z(-125)); g.stroke()
  g.beginPath(); g.moveTo(X(-150), Z(-117)); g.lineTo(X(200), Z(-117)); g.stroke()
  // dirt farm track
  g.fillStyle = '#b07a48'
  g.fillRect(X(-121), Z(-170), 3 * PX, 45 * PX)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

// ── instanced crops + farm fence posts ───────────────────────────────────────
function cropGeo() {
  const g = new THREE.ConeGeometry(0.32, 1.1, 5)
  g.translate(0, 0.55, 0)
  return g
}
function postGeo() {
  const g = new THREE.BoxGeometry(0.1, 1.1, 0.1)
  g.translate(0, 0.55, 0)
  return g
}
function Instanced({ name, geo, items, color }: { name: string; geo: THREE.BufferGeometry; items: PropItem[]; color: (i: number) => string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      d.position.set(it.p[0], 0.05, it.p[1])
      d.rotation.set(0, it.r ?? 0, 0)
      d.scale.setScalar(it.s ?? 1)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
      m.setColorAt(i, c.set(color(i)))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items, color])
  return (
    <instancedMesh name={name} ref={ref} args={[geo, undefined, items.length]} frustumCulled={false} userData={{ noCollide: true }}>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  )
}

const HILLS: { x: number; z: number; r: number; h: number; seed: number }[] = (() => {
  const out: { x: number; z: number; r: number; h: number; seed: number }[] = []
  let s = 11
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  // main Akwapim ridge — two staggered rows
  for (let i = 0; i < 16; i++) {
    out.push({ x: -260 + i * 38 + rnd() * 10, z: -232 - rnd() * 22, r: 30 + rnd() * 18, h: 26 + rnd() * 26, seed: i + 1 })
  }
  for (let i = 0; i < 12; i++) {
    out.push({ x: -230 + i * 50 + rnd() * 14, z: -292 - rnd() * 24, r: 42 + rnd() * 20, h: 40 + rnd() * 30, seed: 40 + i })
  }
  // foothills closer in (still behind the north reach land)
  for (let i = 0; i < 8; i++) {
    out.push({ x: -170 + i * 52 + rnd() * 12, z: -214 - rnd() * 8, r: 15 + rnd() * 7, h: 8 + rnd() * 7, seed: 80 + i })
  }
  return out
})()

export function NorthReach() {
  const tex = useMemo(() => buildSlabTexture(), [])
  // P2-4: the district's slab canvas texture is owned here — free on unmount
  useEffect(() => () => tex.dispose(), [tex])
  const { x0, x1, z0, z1 } = NORTH_REACH
  const { crops, posts } = useMemo(() => {
    const crops: PropItem[] = []
    const posts: PropItem[] = []
    FIELDS.forEach(([a, b, c0, c1], fi) => {
      for (let x = a + 1.5; x < b - 0.5; x += 2) {
        for (let z = c0 + 1.2; z < c1 - 0.6; z += 1.6) {
          crops.push({ p: [x, z], s: 0.7 + ((x * 7 + z * 3 + fi) % 5) * 0.08, r: (x + z) % 3 })
        }
      }
      // perimeter fence posts every 2.5 m, gap on the track side
      for (let x = a - 0.5; x <= b + 0.5; x += 2.5) { posts.push({ p: [x, c0 - 0.5] }); posts.push({ p: [x, c1 + 0.5] }) }
      for (let z = c0 + 2; z <= c1 - 2; z += 2.5) { posts.push({ p: [a - 0.5, z] }); posts.push({ p: [b + 0.5, z] }) }
    })
    return { crops, posts }
  }, [])
  const cGeo = useMemo(() => cropGeo(), [])
  const pGeo = useMemo(() => postGeo(), [])
  // P2-4: instanced crop/post geometries are owned here — free on unmount
  useEffect(
    () => () => {
      cGeo.dispose()
      pGeo.dispose()
    },
    [cGeo, pGeo],
  )
  const fieldColors = useMemo(() => {
    const cols: string[] = []
    FIELDS.forEach(([a, b, c0, c1, col]) => {
      for (let x = a + 1.5; x < b - 0.5; x += 2) for (let z = c0 + 1.2; z < c1 - 0.6; z += 1.6) cols.push(col)
    })
    return cols
  }, [])
  const trees: PropItem[] = useMemo(() => [
    { p: [-66, -130] }, { p: [-66, -150] }, { p: [26, -132] }, { p: [26, -150] }, { p: [82, -132] },
    { p: [130, -132] }, { p: [130, -160] }, { p: [-100, -132] }, { p: [-140, -176] }, { p: [10, -176] },
    { p: [60, -176] }, { p: [150, -176] }, { p: [190, -176] },
  ], [])
  const palms: PropItem[] = useMemo(() => [
    { p: [34, -128] }, { p: [76, -128] }, { p: [90, -128] }, { p: [122, -128] }, { p: [138, -128] }, { p: [198, -128] },
  ], [])
  return (
    <group name="north-reach">
      {/* new land slab (+ earth skirt so its north edge never floats) */}
      <mesh position={[(x0 + x1) / 2, 0.05, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>

      {/* ── FARMS ── */}
      <group position={[-108, 0, -138]}><FarmHut /></group>
      <group position={[-80, 0, -132]}><FarmHut /></group>
      <Box p={[-114, 1.6, -132]} s={[0.2, 3.2, 0.2]} c="#5a5f66" />
      <mesh position={[-114, 3.6, -132]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 1.6, 10]} />
        <meshStandardMaterial color="#2e7fa8" roughness={0.5} />
      </mesh>
      <group position={[-130, 0, -127]}>
        <Box p={[0, 1.4, 0]} s={[3.4, 1.0, 0.1]} c="#2b2622" />
        {[-1, 1].map((k) => <Box key={k} p={[k * 1.5, 0.7, -0.05]} s={[0.1, 1.4, 0.1]} c="#6b4a2f" />)}
        <Sign text="ADOM FARMS" bg="#4f9e4f" w={3.2} h={0.85} position={[0, 1.4, 0.06]} />
      </group>
      <Instanced name="inst-crop" geo={cGeo} items={crops} color={(i) => fieldColors[i]} />
      <Instanced name="inst-farmpost" geo={pGeo} items={posts} color={() => '#7a5230'} />

      {/* ── INDUSTRIAL AREA ── */}
      <group position={[-40, 0, -146]}><Factory name="KASA FOODS FACTORY" w={22} d={14} /></group>
      <group position={[-8, 0, -150]}><Factory name="TEMA STEEL WORKS" w={18} d={12} tint="#b9c2c9" /></group>
      <group position={[8, 0, -134]} rotation={[0, 0, 0]}><Factory name="GOLDCOAST PACKAGING" w={14} d={8} chimney={false} tint="#d9cbb2" /></group>
      <group position={[-58, 0, -128]}>
        <Box p={[0, 1.4, 0]} s={[5.4, 1.1, 0.1]} c="#2b2622" />
        {[-1, 1].map((k) => <Box key={k} p={[k * 2.5, 0.75, -0.05]} s={[0.12, 1.5, 0.12]} c="#5a5f66" />)}
        <Sign text="INDUSTRIAL AREA" bg="#2c3e50" fg="#fcd116" w={5.2} h={0.95} position={[0, 1.4, 0.06]} />
      </group>

      {/* ── HOSPITAL ── */}
      <group position={[48, 0, -146]}><Hospital name="KORLE RIDGE HOSPITAL" /></group>

      {/* ── AKWAABA MALL ── */}
      <group position={[106, 0, -156]}><Mall name="AKWAABA MALL" w={30} d={16} /></group>

      {/* ── BUSINESS PARK + PROPERTIES ── */}
      {/* O-001: ADOM HOLDINGS + GOLD COAST BANK are now world-run offices (src/world/office) on these footprints */}
      <group position={[180, 0, -152]}><PropertyListing label="FOR SALE" bg="#ce1126" wall="#e8dcc2" storeys={2} /></group>
      <group position={[193, 0, -152]}><PropertyListing label="FOR RENT" bg="#2e7fa8" wall="#d97b8f" /></group>
      <group position={[180, 0, -136]}><PropertyListing label="FOR SALE" bg="#ce1126" wall="#7fae57" w={7} d={6} /></group>
      <group position={[193, 0, -136]}><PropertyListing label="FOR RENT" bg="#2e7fa8" wall="#e4b93f" storeys={2} w={7} d={6} /></group>
      <group position={[156, 0, -131]}>
        <Box p={[0, 1.4, 0]} s={[5.4, 1.1, 0.1]} c="#2b2622" />
        {[-1, 1].map((k) => <Box key={k} p={[k * 2.5, 0.75, -0.05]} s={[0.12, 1.5, 0.12]} c="#5a5f66" />)}
        <Sign text="PRIME ESTATES" bg="#9c7a1e" w={5.2} h={0.95} position={[0, 1.4, 0.06]} />
      </group>

      <InstancedTrees items={trees} />
      <InstancedPalms items={palms} />

      {/* ── AKWAPIM HILLS backdrop ── */}
      <Hills items={HILLS} />
    </group>
  )
}
