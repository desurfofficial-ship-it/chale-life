'use client'

// ─── District: TOWN LIFE (Task 12) ───────────────────────────────────────────
// Businesses in EVERY neighbourhood (Dansoman, Nima, Adabraka, Teshie, Nungua,
// Chorkor, Jamestown): restaurant, chop bar, drinking spot, store, boutique,
// supermarket and a gaming centre or hotel — placements in lib/businesses.ts
// (audited). Plus the map-wide NORTH REACH land: farms, industrial area,
// hospital, a second mall, offices, FOR SALE / FOR RENT properties and the
// Akwapim hills backdrop (see NorthReach.tsx).
//
// Draw-call budget: shells → facade batch, signs → sign-atlas batch, plain
// parts → SceneBatcher buckets; plastic chairs / umbrellas / crops are one
// InstancedMesh each for the whole map.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BUSINESSES, BIZ_ROT, type BizDef } from '@/lib/businesses'
import {
  Restaurant, ChopBar, DrinkingSpot, Store, Boutique, Supermarket, GamingCenter, Hotel, PlasticTable,
  Salon, Barber, Gym, Cafe, Club, KioskBox, Storefront, Warehouse, MarketHall,
} from '../../scene/Businesses'
import { NorthReach } from './NorthReach'
import type { PropItem } from '../InstancedNature'

// ── local → world for a business placement ───────────────────────────────────
function toWorld(b: BizDef, lx: number, lz: number): [number, number] {
  const r = BIZ_ROT[b.f]
  const c = Math.cos(r), s = Math.sin(r)
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c]
}

// seating layout (local coords) for drinking spots + restaurant terraces
function seating(b: BizDef): { tables: [number, number][]; chairs: { p: [number, number]; r: number }[]; umbrellas: [number, number][] } {
  const tables: [number, number][] = []
  const chairs: { p: [number, number]; r: number }[] = []
  const umbrellas: [number, number][] = []
  if (b.kind === 'drink') {
    const z0 = -b.d / 2 + 1.75, z1 = b.d / 2 - 0.5
    const x0 = -b.w / 2 + 1.0, x1 = b.w / 2 - 1.0
    const nx = Math.max(1, Math.floor((x1 - x0) / 2.3) + 1)
    const nz = Math.max(1, Math.floor((z1 - z0) / 1.9) + 1)
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const tx = nx === 1 ? 0 : x0 + (i * (x1 - x0)) / (nx - 1)
        const tz = nz === 1 ? (z0 + z1) / 2 : z0 + (j * (z1 - z0)) / (nz - 1)
        tables.push([tx, tz])
        chairs.push({ p: [tx - 0.68, tz], r: Math.PI / 2 }, { p: [tx + 0.68, tz], r: -Math.PI / 2 })
        if ((i + j) % 2 === 0) umbrellas.push([tx, tz])
      }
    }
  } else if (b.kind === 'restaurant' || b.kind === 'cafe') {
    const apron = b.apron ?? 0
    const n = Math.max(1, Math.floor(b.w / 2.4))
    for (let i = 0; i < n; i++) {
      const tx = -b.w / 2 + (i + 0.5) * (b.w / n)
      const tz = b.d / 2 + apron * 0.55
      chairs.push({ p: [tx - 0.66, tz], r: Math.PI / 2 }, { p: [tx + 0.66, tz], r: -Math.PI / 2 })
      if (apron >= 1.9) umbrellas.push([tx, tz])
    }
  }
  return { tables, chairs, umbrellas }
}

function BusinessMesh({ b }: { b: BizDef }) {
  const p = { w: b.w, d: b.d, name: b.name, bg: b.bg, fg: b.fg, door: b.door ?? 0 }
  const seats = useMemo(() => seating(b), [b])
  let body: React.ReactNode = null
  switch (b.kind) {
    case 'restaurant': body = <Restaurant {...p} apron={b.apron ?? 0} />; break
    case 'chopbar': body = <ChopBar {...p} />; break
    case 'drink': body = <DrinkingSpot {...p} />; break
    case 'store': body = <Store {...p} />; break
    case 'boutique': body = <Boutique {...p} />; break
    case 'supermarket': body = <Supermarket {...p} />; break
    case 'gaming': body = <GamingCenter {...p} />; break
    case 'hotel': body = <Hotel {...p} floors={b.floors ?? 3} />; break
    // Task 13
    case 'salon': body = <Salon {...p} />; break
    case 'barber': body = <Barber {...p} />; break
    case 'gym': body = <Gym {...p} />; break
    case 'cafe': body = <Cafe {...p} apron={b.apron ?? 0} />; break
    case 'club': body = <Club {...p} />; break
    case 'kiosk': body = <KioskBox {...p} />; break
    case 'shop': body = <Storefront {...p} />; break
    case 'warehouse': body = <Warehouse {...p} />; break
    case 'hall': body = <MarketHall {...p} />; break
  }
  return (
    <group position={[b.x, b.y ?? 0, b.z]} rotation={[0, BIZ_ROT[b.f], 0]} name={`biz:${b.id}`} userData={{ bldg: 'biz', biz: b.kind, hood: b.hood }}>
      {body}
      {seats.tables.map(([x, z], i) => <PlasticTable key={i} p={[x, 0, z]} c={i % 2 ? '#f1f1ee' : '#ce1126'} />)}
    </group>
  )
}

// ── instanced props (whole map: one draw per kind) ──────────────────────────
function bake(geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]) {
  const g = geo.clone()
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)))
  const c = new THREE.Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g.index ? g.toNonIndexed() : g
}

let chairGeo: THREE.BufferGeometry | null = null
function getChairGeo() {
  // white base colour — tinted per instance (instanceColor multiplies)
  if (!chairGeo) {
    const W = '#ffffff'
    const parts = [
      bake(new THREE.BoxGeometry(0.44, 0.05, 0.42), W, [0, 0.44, 0]),
      bake(new THREE.BoxGeometry(0.44, 0.42, 0.04), W, [0, 0.67, -0.2], [-0.12, 0, 0]),
    ]
    // monobloc side panels instead of 4 legs (48 tris per chair)
    for (const x of [-0.2, 0.2]) parts.push(bake(new THREE.BoxGeometry(0.03, 0.44, 0.4), W, [x, 0.22, 0]))
    chairGeo = mergeGeometries(parts, false)!
  }
  return chairGeo
}
let umbGeo: THREE.BufferGeometry | null = null
function getUmbrellaGeo() {
  if (!umbGeo) {
    umbGeo = mergeGeometries([
      bake(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), '#e6e6e6', [0, 1.25, 0]),
      bake(new THREE.ConeGeometry(1.35, 0.6, 8), '#ffffff', [0, 2.55, 0]),
    ], false)!
  }
  return umbGeo
}

function useInst(ref: React.RefObject<THREE.InstancedMesh | null>, items: PropItem[], colors: string[]) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      d.position.set(it.p[0], 0, it.p[1])
      d.rotation.set(0, it.r ?? 0, 0)
      d.scale.setScalar(it.s ?? 1)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
      m.setColorAt(i, c.set(colors[i % colors.length]))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [ref, items, colors])
}

const CHAIR_COLORS = ['#ce1126', '#f4f1ea', '#2e7fa8', '#ce1126', '#4f9e4f', '#f4f1ea']
const UMB_COLORS = ['#ce1126', '#fcd116', '#2e7fa8', '#4f9e4f', '#ffffff']

export function InstancedChairs({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInst(ref, items, CHAIR_COLORS)
  return (
    <instancedMesh name="inst-chair" ref={ref} args={[getChairGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.6} />
    </instancedMesh>
  )
}
export function InstancedCafeUmbrellas({ items }: { items: PropItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInst(ref, items, UMB_COLORS)
  return (
    <instancedMesh name="inst-cafe-umbrella" ref={ref} args={[getUmbrellaGeo(), undefined, items.length]} castShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.75} />
    </instancedMesh>
  )
}

export function NeighborhoodBusinesses() {
  const { chairs, umbrellas } = useMemo(() => {
    const chairs: PropItem[] = []
    const umbrellas: PropItem[] = []
    for (const b of BUSINESSES) {
      const s = seating(b)
      const r = BIZ_ROT[b.f]
      for (const c of s.chairs) chairs.push({ p: toWorld(b, c.p[0], c.p[1]), r: r + c.r })
      for (const u of s.umbrellas) umbrellas.push({ p: toWorld(b, u[0], u[1]), r: r })
    }
    return { chairs, umbrellas }
  }, [])
  return (
    <group name="neighborhood-businesses">
      {BUSINESSES.map((b) => <BusinessMesh key={b.id} b={b} />)}
      <InstancedChairs items={chairs} />
      <InstancedCafeUmbrellas items={umbrellas} />
    </group>
  )
}

export function TownLife() {
  return (
    <group name="town-life">
      <NeighborhoodBusinesses />
      <NorthReach />
    </group>
  )
}
