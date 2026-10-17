'use client'

// ─── Task 14: COMMUNITY REALISM PASS — Chorkor West / Daavi Street West ─────
// The block west of Daavi's plot along the Daavi Street extension, rebuilt as
// an inhabited Ghanaian neighbourhood. All placements come from
// lib/communityLayout.ts (generated + audited by tools/t14_community.py).
//   Zone A residential streets (compound houses with courtyards, family
//          houses, bungalows, flats, unfinished blockwork, walled houses)
//   Zone B commercial strip (Daavi St north walkway: provisions, phones,
//          MoMo, chop bar, food stand, tailor, kenkey, carpentry, water seller)
//   Zone C gathering ground (big neem, benches, draughts, notice board,
//          drinking spot) + trotro station, taxi rank, okada stand
//   Zone D market cluster (two market sheds, stalls, kiosks, waste point)
//   Zone E road connections (gutters, culverts, poles + cables, lamps)
// Draw calls: shells → facade batch; signs → sign-atlas batch; every kit mesh
// uses the shared vertex-coloured materials → SceneBatcher buckets; cables are
// ONE LineSegments; NPCs + vehicles live in <CommunityLife/> (instanced).
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Building } from '../../scene/Buildings'
import { signGeometry, getSignMaterial } from '@/lib/signAtlas'
import { COMMUNITY, type CRes, type CBiz, type CommunityData } from '@/lib/communityLayout'
import {
  Kit, kitMats, propGeometry, PROP_NO_COLLIDE, neemGeometries, plantainGeometry, poleGeometries, rooftopGeometry,
} from '@/lib/communityKit'
import { CommunityLife } from '../CommunityLife'

const ST = 3.0 // storey height
type V3 = [number, number, number]
const NC = { noCollide: true }

export function KM({ geo, mat, p = [0, 0, 0], r = 0, s = 1, nc = false, cast = true, name }: { geo: THREE.BufferGeometry; mat?: THREE.Material; p?: V3; r?: number; s?: number; nc?: boolean; cast?: boolean; name?: string }) {
  return <mesh geometry={geo} material={mat ?? kitMats().matte} position={p} rotation={[0, r, 0]} scale={s} castShadow={cast} receiveShadow userData={nc ? NC : undefined} name={name} />
}
export function SignBoard({ text, bg, fg = '#ffffff', w, h, p, r = 0 }: { text: string; bg: string; fg?: string; w: number; h: number; p: V3; r?: number }) {
  const geo = useMemo(() => signGeometry(text, bg, fg, w, h), [text, bg, fg, w, h])
  return <mesh geometry={geo} material={getSignMaterial()} position={p} rotation={[0, r, 0]} />
}
/** facade shell (the city's shared atlas) sitting on y0 */
function Shell({ w, h, d, wall, rows, cols, style, x = 0, y0 = 0, z = 0, lit = 0.55 }: { w: number; h: number; d: number; wall: string; rows: number; cols: number; style: 'louvre' | 'worn' | 'block'; x?: number; y0?: number; z?: number; lit?: number }) {
  return <Building position={[x, y0 + h / 2, z]} size={[w, h, d]} wall={wall} facadeKey="t14" rows={rows} cols={cols} litRatio={lit} style={style} noCap />
}

const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString()
const ROOF_COL = { rust: ['#93603f', '#7c4f34', '#a8714a'], alu: ['#b9bec3', '#a3a9af', '#cfd3d6'], slab: ['#9d9890', '#8c877f', '#b0aba2'], none: ['#999', '#999', '#999'] }

// ── roof builders (all parts sit above head height → no colliders) ─────────
function gableRoof(K: Kit, w: number, d: number, h: number, kind: 'rust' | 'alu', wall: string, ribs = true) {
  const p = 0.2, hd = d / 2 + 0.35, rise = (d / 2) * Math.tan(p)
  const L = hd / Math.cos(p)
  const [c0, c1, c2] = ROOF_COL[kind]
  K.gable(d, rise, w, 0, h, 0, wall, Math.PI / 2)
  for (const s of [1, -1]) {
    const zc = s * hd / 2, yc = h + rise - (hd / 2) * Math.tan(p) + 0.04
    K.box(w + 0.5, 0.06, L, 0, yc, zc, s > 0 ? c0 : c1, 0, s * p)
    if (ribs) for (let i = 0; i < Math.floor((w + 0.4) / 0.55); i++) K.box(0.05, 0.035, L, -w / 2 - 0.15 + i * 0.55, yc + 0.045, zc, c2, 0, s * p)
  }
  K.box(w + 0.55, 0.1, 0.3, 0, h + rise + 0.08, 0, c1)
}
function leanTo(K: Kit, x0: number, x1: number, z0: number, z1: number, h: number, dir: 'x+' | 'x-' | 'z+' | 'z-', kind: 'rust' | 'alu') {
  const [c0, , c2] = ROOF_COL[kind]
  const p = 0.16
  const along = dir[0] === 'z'
  const span = along ? z1 - z0 + 0.5 : x1 - x0 + 0.5
  const len = along ? x1 - x0 + 0.3 : z1 - z0 + 0.3
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const sgn = dir[1] === '+' ? 1 : -1
  const y = h + 0.12 + (span / 2) * Math.tan(p)
  if (along) {
    K.box(len, 0.06, span / Math.cos(p), cx, y, cz, c0, 0, sgn * p)
    for (let i = 0; i < Math.floor(len / 0.6); i++) K.box(0.05, 0.035, span / Math.cos(p), x0 + 0.2 + i * 0.6, y + 0.045, cz, c2, 0, sgn * p)
  } else {
    K.box(span / Math.cos(p), 0.06, len, cx, y, cz, c0, 0, 0, -sgn * p)
    for (let i = 0; i < Math.floor(len / 0.6); i++) K.box(span / Math.cos(p), 0.035, 0.05, cx, y + 0.045, z0 + 0.2 + i * 0.6, c2, 0, 0, -sgn * p)
  }
  // wall-top packing under the high side
  if (along) K.box(len - 0.3, span * Math.tan(p), 0.2, cx, h + (span * Math.tan(p)) / 2, sgn > 0 ? z0 : z1, '#cfc8ba')
  else K.box(0.2, span * Math.tan(p), len - 0.3, sgn > 0 ? x0 : x1, h + (span * Math.tan(p)) / 2, cz, '#cfc8ba')
}
function slabRoof(K: Kit, w: number, d: number, h: number) {
  K.box(w + 0.3, 0.22, d + 0.3, 0, h + 0.11, 0, '#a9a49b')
  for (const s of [1, -1]) {
    K.box(w + 0.3, 0.6, 0.14, 0, h + 0.52, s * (d / 2 + 0.08), '#d9d3c7')
    K.box(0.14, 0.6, d + 0.3, s * (w / 2 + 0.08), h + 0.52, 0, '#d9d3c7')
  }
}
function balcony(K: Kit, bx: number, bw: number, y: number, front: number, railCol = '#2b2b2b', laundry = 0) {
  K.box(bw, 0.15, 1.1, bx, y, front + 0.55, '#c9c3b6')
  K.box(bw, 0.06, 0.06, bx, y + 1.0, front + 1.07, railCol)
  for (const s of [-1, 1]) K.box(0.06, 0.06, 1.1, bx + s * (bw / 2 - 0.03), y + 1.0, front + 0.55, railCol)
  const n = Math.floor(bw / 0.2)
  for (let i = 0; i <= n; i++) K.box(0.035, 0.92, 0.035, bx - bw / 2 + 0.05 + (i * (bw - 0.1)) / n, y + 0.54, front + 1.07, railCol)
  K.box(1.0, 2.1, 0.05, bx, y + 1.13, front + 0.03, '#4a3426')
  const cl = ['#ce1126', '#fcd116', '#1d4fa0', '#f4f1ea', '#3aa08f']
  for (let i = 0; i < laundry; i++) K.box(0.5, 0.45, 0.02, bx - bw / 2 + 0.45 + i * 0.6, y + 0.82, front + 1.1, cl[(i * 2 + Math.round(bx)) % cl.length])
}
function door(K: Kit, x: number, z: number, col = '#5b3d28', y0 = 0) {
  K.box(1.15, 2.25, 0.05, x, y0 + 1.12, z + 0.02, '#e9e4d8')
  K.box(0.95, 2.1, 0.06, x, y0 + 1.05, z + 0.04, col)
  K.box(0.06, 0.06, 0.04, x + 0.32, y0 + 1.05, z + 0.08, '#c9b38a')
}
function skirt(K: Kit, w: number, d: number, x = 0, z = 0) {
  K.base(w + 0.08, 0.38, d + 0.08, x, 0, z, '#8f7a64')
}

// ════════════════════════════════════════════ residential typologies ═══════
export function ResBuilding({ r }: { r: CRes }) {
  const els = useMemo(() => buildRes(r), [r])
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, r.rot, 0]} name={`t14:${r.id}`} userData={{ bldg: r.census, biz: r.type === 'mixed' ? 'shop' : '', hood: 'chorkor' }}>
      {els}
    </group>
  )
}

function buildRes(r: CRes): React.ReactNode[] {
  const { w, d } = r
  const wall = r.wallHex
  const out: React.ReactNode[] = []
  const M = kitMats()
  const worn = (r.wear ?? 0) > 0.75
  const style: 'louvre' | 'worn' = worn ? 'worn' : 'louvre'
  const low = new Kit(), up = new Kit(), met = new Kit()
  const roofKind = (r.roof === 'rust' || r.roof === 'alu') ? r.roof : 'rust'
  const key = r.id

  if (r.type === 'compound') {
    const W = w, D = d, h = ST
    const back: [number, number, number, number] = [-W / 2, W / 2, -D / 2, -D / 2 + 3.0]
    const sideL: [number, number, number, number] = [-W / 2, -W / 2 + 2.8, -D / 2 + 3.0, D / 2 - 2.6]
    const sideR: [number, number, number, number] = [W / 2 - 2.8, W / 2, -D / 2 + 3.0, D / 2 - 2.6]
    const frL: [number, number, number, number] = [-W / 2, -1.2, D / 2 - 2.6, D / 2]
    const frR: [number, number, number, number] = [1.2, W / 2, D / 2 - 2.6, D / 2]
    const wings = [back, sideL, sideR, frL, frR]
    wings.forEach(([x0, x1, z0, z1], i) => {
      out.push(<Shell key={`w${i}`} w={x1 - x0} h={h} d={z1 - z0} x={(x0 + x1) / 2} z={(z0 + z1) / 2} wall={i % 2 ? shade(wall, 0.94) : wall} rows={1} cols={Math.max(1, Math.round((x1 - x0) / 2.6))} style={i === 0 ? 'worn' : style} />)
      const k = new Kit()
      k.base(x1 - x0 + 0.08, 0.38, z1 - z0 + 0.08, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#8f7a64')
      out.push(<KM key={`sk${i}`} geo={k.build()} />)
    })
    // lean-to zinc roofs draining into the courtyard
    leanTo(met, back[0], back[1], back[2], back[3], h, 'z+', roofKind)
    leanTo(met, sideL[0], sideL[1], sideL[2], sideL[3], h, 'x+', roofKind)
    leanTo(met, sideR[0], sideR[1], sideR[2], sideR[3], h, 'x-', roofKind)
    leanTo(met, frL[0], frL[1], frL[2], frL[3], h, 'z-', roofKind)
    leanTo(met, frR[0], frR[1], frR[2], frR[3], h, 'z-', roofKind)
    // room doors onto the courtyard
    const cx0 = -W / 2 + 2.8, cx1 = W / 2 - 2.8, cz0 = -D / 2 + 3.0, cz1 = D / 2 - 2.6
    for (let i = 0; i < Math.max(1, Math.floor((cx1 - cx0) / 2.8)); i++) door(up, cx0 + 1.2 + i * 2.8, cz0, i % 2 ? '#2f5d4a' : '#5b3d28')
    for (const [xx, rr] of [[cx0, Math.PI / 2], [cx1, -Math.PI / 2]] as [number, number][]) {
      const n = Math.max(1, Math.floor((cz1 - cz0) / 2.6))
      for (let i = 0; i < n; i++) {
        const zz = cz0 + 1.3 + i * 2.6
        up.box(1.15, 2.25, 0.05, xx + Math.sin(rr) * 0.02, 1.12, zz, '#e9e4d8', rr)
        up.box(0.95, 2.1, 0.06, xx + Math.sin(rr) * 0.04, 1.05, zz, i % 2 ? '#7a1f2b' : '#5b3d28', rr)
      }
    }
    // entrance passage: gate leaves swung open against the passage walls
    for (const s of [-1, 1]) {
      const g = new Kit()
      g.box(0.06, 2.0, 1.1, s * 1.13, 1.0, D / 2 - 0.65, '#2f5d4a')
      for (let i = 0; i < 4; i++) g.box(0.08, 1.9, 0.04, s * 1.15, 1.0, D / 2 - 1.1 + i * 0.3, '#244a3a')
      out.push(<KM key={`gate${s}`} geo={g.build()} mat={M.metal} />)
    }
    // a lintel beam over the passage + the family's name plate
    up.box(2.6, 0.3, 0.25, 0, 2.55, D / 2 - 0.12, shade(wall, 0.85))
    out.push(<SignBoard key="nm" text={r.name ?? 'FAMILY HOUSE'} bg="#f4f1ea" fg="#5b3d28" w={2.3} h={0.32} p={[0, 2.95, D / 2 + 0.02]} />)
    // rooftop dish
    out.push(<KM key="dish" geo={rooftopGeometry('dish')} p={[W / 2 - 1.2, h + 0.35, -D / 2 + 1.0]} r={0.6} />)
  } else if (r.type === 'walled') {
    const W = w, D = d, wh = 1.9, t = 0.2
    // r.gate is a gate STYLE name ("sliding", "double", …) in the T15 data,
    // not a colour — only a hex literal may feed THREE.Color (else it warns
    // "Unknown color sliding" and paints the gate black).
    const gateCol =
      typeof r.gate === 'string' && r.gate.startsWith('#') ? r.gate : '#2f5d4a'
    const runs: [number, number, number, number][] = [
      [0, -D / 2 + t / 2, W, t], [-W / 2 + t / 2, 0, t, D], [W / 2 - t / 2, 0, t, D],
      [(-W / 2 + -1.7) / 2, D / 2 - t / 2, -1.7 + W / 2, t], [(-0.65 + -0.45) / 2, D / 2 - t / 2, 0.2, t], [(2.25 + W / 2) / 2, D / 2 - t / 2, W / 2 - 2.25, t],
    ]
    runs.forEach(([x, z, sx, sz], i) => {
      if (sx <= 0.05) return
      const k = new Kit()
      k.base(sx, wh, sz, x, 0, z, shade(wall, 0.9))
      k.base(sx + 0.06, 0.08, sz + 0.06, x, wh, z, '#bdb6a8')
      k.base(sx + 0.02, 0.35, sz + 0.02, x, 0, z, '#8f7a64')
      out.push(<KM key={`wall${i}`} geo={k.build()} />)
    })
    // sliding metal gate (closed) + spikes, pedestrian door swung open
    const g = new Kit()
    g.base(2.7, 1.85, 0.08, 0.9, 0.05, D / 2 - 0.1, gateCol)
    for (let i = 0; i < 9; i++) g.base(0.05, 0.25, 0.05, -0.4 + i * 0.33, 1.9, D / 2 - 0.1, '#2b2b2b')
    for (let i = 0; i < 5; i++) g.box(2.6, 0.04, 0.1, 0.9, 0.3 + i * 0.36, D / 2 - 0.07, shade(gateCol, 0.75))
    out.push(<KM key="gate" geo={g.build()} mat={M.metal} />)
    const pd = new Kit()
    pd.base(0.05, 1.85, 0.9, -1.65, 0.03, D / 2 - 0.62, gateCol)
    out.push(<KM key="ped" geo={pd.build()} mat={M.metal} />)
    // the house behind the wall
    const iw = W - 1.4, id = D - 2.6, iz = -D / 2 + 0.45 + id / 2
    out.push(<Shell key="sh" w={iw} h={ST} d={id} z={iz} wall={wall} rows={1} cols={2} style={style} />)
    skirt(low, iw, id, 0, iz)
    door(low, -0.6, iz + id / 2, '#4a3426')
    gableRoof(up, iw, id, ST, roofKind, wall)
    out.push(<KM key="tank" geo={propGeometry('polytank')} p={[W / 2 - 0.95, 0, D / 2 - 1.15]} s={0.8} />)
    out.push(<KM key="dish" geo={rooftopGeometry('dish')} p={[iw / 2 - 0.4, 2.2, iz + id / 2 + 0.05]} r={-0.4} />)
  } else {
    // ── storeyed / single block houses ──
    const floors = r.type === 'flats' ? (r.floors ?? 3) : (r.type === 'house2' || r.type === 'mixed' || r.type === 'unfinished') ? 2 : 1
    const porch = r.type === 'bungalow' || r.type === 'colonial' ? 1.5 : 0
    const plinth = r.type === 'colonial' ? 0.5 : 0
    const sd = d - porch
    const sz = -porch / 2
    const front = sz + sd / 2
    const cols = Math.max(2, Math.round(w / 2.6))
    if (r.type === 'unfinished1') {
      out.push(<Shell key="sh" w={w} h={2.1} d={d} wall="#d8d4cb" rows={1} cols={cols} style="block" />)
      for (const [x, z, sx, sz2] of [[0, -d / 2 + 0.13, w - 0.06, 0.2], [0, d / 2 - 0.13, w - 0.06, 0.2], [-w / 2 + 0.13, 0, 0.2, d - 0.06], [w / 2 - 0.13, 0, 0.2, d - 0.06]] as [number, number, number, number][]) low.base(sx, 2.1, sz2, x, 0, z, '#bdb9b0')
      for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, d / 2], [0, -d / 2]] as [number, number][]) out.push(<KM key={`rb${x},${z}`} geo={rooftopGeometry('rebar')} p={[x * 0.97, 2.1, z * 0.97]} nc />)
    } else {
      const gH = floors * ST
      if (r.type === 'unfinished') {
        out.push(<Shell key="sh0" w={w} h={ST} d={sd} z={sz} wall={wall} rows={1} cols={cols} style={style} />)
        // first floor slab + bare block storey + columns with rebar stubs
        up.box(w + 0.1, 0.22, sd + 0.1, 0, ST + 0.11, sz, '#a9a49b')
        out.push(<Shell key="sh1" w={w} h={2.7} d={sd} z={sz} y0={ST + 0.22} wall="#d8d4cb" rows={1} cols={cols} style="block" lit={0} />)
        for (const [x, z, sx, sz2] of [[0, sz - sd / 2 + 0.13, w - 0.06, 0.2], [0, sz + sd / 2 - 0.13, w - 0.06, 0.2], [-w / 2 + 0.13, sz, 0.2, sd - 0.06], [w / 2 - 0.13, sz, 0.2, sd - 0.06]] as [number, number, number, number][]) up.base(sx, 2.7, sz2, x, ST + 0.22, z, '#bdb9b0')
        for (const [x, z] of [[-w / 2, -sd / 2], [w / 2, -sd / 2], [-w / 2, sd / 2], [w / 2, sd / 2], [0, sd / 2], [0, -sd / 2]] as [number, number][]) {
          out.push(<KM key={`col${x},${z}`} geo={rooftopGeometry('column')} p={[x * 0.96, ST + 2.92, sz + z * 0.96]} nc />)
          out.push(<KM key={`rb${x},${z}`} geo={rooftopGeometry('rebar')} p={[x * 0.96, ST + 3.4, sz + z * 0.96]} nc />)
        }
        out.push(<KM key="blk" geo={propGeometry('blocks')} p={[w / 4, ST + 0.22, sz - sd / 4]} nc />)
      } else {
        out.push(<Shell key="sh" w={w} h={gH} d={sd} z={sz} y0={plinth} wall={wall} rows={floors} cols={cols} style={r.type === 'flats' ? 'louvre' : style} />)
      }
      skirt(low, w, sd, 0, sz)
      if (plinth) { low.base(w + 0.2, plinth, d, 0, 0, 0, '#b3a58f'); low.base(1.6, plinth * 0.5, 0.5, 0, 0, d / 2 - 0.1, '#a99b85') }
      // roofs
      const top = plinth + gH
      if (r.roof === 'slab' || r.type === 'flats' || r.type === 'house2' || r.type === 'mixed') {
        const k = new Kit(); slabRoof(k, w, sd, top); up.parts.push(...k.parts.map((p) => { p.translate(0, 0, sz); return p }))
        out.push(<KM key="tank" geo={rooftopGeometry('tank')} p={[-w / 2 + 0.8, top + 0.22, sz - sd / 2 + 0.8]} nc />)
        if (r.type === 'flats') out.push(<KM key="tank2" geo={rooftopGeometry('tank')} p={[w / 2 - 0.8, top + 0.22, sz - sd / 2 + 0.8]} nc />)
        out.push(<KM key="dish" geo={rooftopGeometry('dish')} p={[w / 2 - 0.7, top + 0.22, sz + sd / 2 - 0.5]} r={-0.5} nc />)
        if (r.type === 'flats') out.push(<KM key="dish2" geo={rooftopGeometry('dish')} p={[0.4, top + 0.22, sz + sd / 2 - 0.5]} r={-0.9} nc />)
      } else if (r.type === 'colonial') {
        up.cone(Math.max(w, d) * 0.78, 1.9, 0, top + 0.95, 0, ROOF_COL.rust[0], 4, Math.PI / 4)
      } else if (r.roof !== 'none') {
        const k = new Kit(); gableRoof(k, w, d, top, roofKind, wall); up.parts.push(...k.parts)
      }
      // porch posts (bungalow / colonial) — each its own slim collider
      if (porch) {
        for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {
          const k = new Kit(); k.base(0.18, top - 0.02, 0.18, x, 0, d / 2 - 0.2, '#e9e4d8')
          out.push(<KM key={`post${x}`} geo={k.build()} />)
        }
        low.base(w, 0.04, porch, 0, 0, d / 2 - porch / 2, '#b8b2a6')
        door(low, -0.8, front, worn ? '#6b4a33' : '#2f5d4a', plinth)
        up.box(w, 0.25, 0.25, 0, top - 0.12, d / 2 - 0.2, '#e9e4d8')
      } else if (r.type === 'mixed') {
        // ground-floor shop: open front, shutter rolled up, goods, sign, awning
        low.box(w - 1.8, 2.3, 0.08, -0.4, 1.15, front + 0.04, '#2a241f')
        for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) low.box(0.42, 0.22, 0.06, -2.0 + j * 0.8 + (i % 2) * 0.1, 0.5 + i * 0.6, front + 0.11, ['#e9c54a', '#2e7fa8', '#c8102e', '#3a9a4a', '#f2f2ee'][(i + j) % 5])
        up.box(w - 1.6, 0.35, 0.25, -0.4, 2.48, front + 0.14, '#8d9399')
        door(low, w / 2 - 0.75, front, '#4a3426')
        out.push(<SignBoard key="sg" text={r.shop ?? 'SHOP'} bg={r.shopBg ?? '#2e7fa8'} w={w - 0.6} h={0.55} p={[0, 2.95, front + 0.1]} />)
        up.box(w - 0.4, 0.05, 1.1, 0, 2.62, front + 0.55, '#c8102e', 0, 0.28)
      } else {
        door(low, r.type === 'flats' ? 0 : -0.9, front, '#4a3426')
        up.box(1.6, 0.12, 0.8, r.type === 'flats' ? 0 : -0.9, 2.45, front + 0.4, '#c9c3b6')
      }
      // balconies on the upper floors
      if (r.type === 'house2' || r.type === 'mixed') balcony(up, 0.6, 3.2, ST, front, '#2b2b2b', r.type === 'house2' ? 3 : 2)
      if (r.type === 'flats') for (let f = 1; f < floors; f++) for (const bx of [-3.4, 3.4]) balcony(up, bx, 3.0, f * ST, front, f % 2 ? '#2b2b2b' : '#7a1f2b', (f + (bx > 0 ? 1 : 0)) % 3)
      // AC unit + wall dish on some
      if (r.type === 'flats' || r.type === 'house2') out.push(<KM key="ac" geo={rooftopGeometry('ac')} p={[w / 2 + 0.16, ST + 1.2, sz]} r={Math.PI / 2} nc />)
      if (r.type === 'bungalow') out.push(<KM key="dish" geo={rooftopGeometry('dish')} p={[w / 2 + 0.1, 2.3, sz - 0.6]} r={Math.PI / 2} nc />)
    }
  }
  if (low.parts.length) out.push(<KM key={`low-${key}`} geo={low.build()} />)
  if (up.parts.length) out.push(<KM key={`up-${key}`} geo={up.build()} nc />)
  if (met.parts.length) out.push(<KM key={`met-${key}`} geo={met.build()} mat={M.metal} nc />)
  return out
}

// ══════════════════════════════════════════════════════ businesses ═════════
export function BizBuilding({ b }: { b: CBiz }) {
  const els = useMemo(() => buildBiz(b), [b])
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]} name={`t14biz:${b.id}`} userData={b.census ? { bldg: b.census, biz: b.biz, hood: 'chorkor' } : undefined}>
      {els}
    </group>
  )
}
function post(out: React.ReactNode[], key: string, x: number, z: number, h: number, col = '#6b4428', s = 0.12) {
  const k = new Kit(); k.base(s, h, s, x, 0, z, col)
  out.push(<KM key={key} geo={k.build()} />)
}
function buildBiz(b: CBiz): React.ReactNode[] {
  const { w, d } = b
  const out: React.ReactNode[] = []
  const M = kitMats()
  const fr = d / 2
  const bg = b.bg ?? '#2e7fa8'
  const fg = b.fg ?? '#ffffff'
  const up = new Kit(), met = new Kit()
  switch (b.kind) {
    case 'provision': case 'phone': case 'tailor': {
      const wall = b.wallHex ?? '#e6dbc0'
      out.push(<Shell key="sh" w={w} h={ST} d={d} wall={wall} rows={1} cols={1} style="worn" lit={0.9} />)
      const k = new Kit()
      k.base(w + 0.08, 0.36, d + 0.08, 0, 0, 0, '#8f7a64')
      k.box(w - 1.0, 2.25, 0.08, 0, 1.13, fr + 0.04, '#2a241f')
      // goods on shelves just inside the opening
      const G = b.kind === 'phone' ? ['#111111', '#2e7fa8', '#e9c54a', '#c8102e'] : b.kind === 'tailor' ? ['#1d4fa0', '#e0a21c', '#b0172b', '#3aa08f', '#7b3fa0'] : ['#e9c54a', '#c8102e', '#2e7fa8', '#f2f2ee', '#3a9a4a', '#e67e22']
      const rows = b.kind === 'tailor' ? 2 : 4
      for (let i = 0; i < rows; i++) {
        k.box(w - 1.1, 0.04, 0.2, 0, 0.45 + i * 0.5, fr + 0.12, '#6b4428')
        const n = Math.floor((w - 1.2) / (b.kind === 'tailor' ? 0.5 : 0.28))
        for (let j = 0; j < n; j++) k.box(b.kind === 'tailor' ? 0.4 : 0.2, b.kind === 'tailor' ? 0.42 : 0.22, 0.12, -(w - 1.3) / 2 + 0.15 + j * ((w - 1.3) / Math.max(1, n - 1)), 0.6 + i * 0.5, fr + 0.14, G[(i * 3 + j) % G.length])
      }
      if (b.kind === 'phone') { const ct = new Kit(); ct.base(w - 1.4, 0.95, 0.45, -0.25, 0, fr + 0.3, '#c9d6dd'); ct.base(w - 1.4, 0.05, 0.47, -0.25, 0.95, fr + 0.3, '#2b2b2b'); out.push(<KM key="counter" geo={ct.build()} />) } // glass counter at the door
      // burglar-proof grille door folded back beside the opening
      k.box(0.5, 2.2, 0.04, w / 2 - 0.3, 1.1, fr + 0.06, '#3c444b')
      out.push(<KM key="low" geo={k.build()} />)
      up.box(w + 0.3, 0.2, d + 0.3, 0, ST + 0.1, 0, '#a9a49b')
      met.box(w + 0.2, 0.05, 1.2, 0, 2.55, fr + 0.55, b.kind === 'phone' ? '#e9c54a' : b.kind === 'tailor' ? '#6b3e8e' : '#c8102e', 0, 0.26)
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w - 0.2} h={0.5} p={[0, ST - 0.3, fr + 0.06]} />)
      break
    }
    case 'momo': case 'kiosk': case 'foodstand': {
      const body = b.kind === 'momo' ? bg : b.kind === 'kiosk' ? '#2e7fa8' : '#3a9a4a'
      const h = 2.4
      const k = new Kit()
      k.base(w, 1.0, d, 0, 0, 0, body)                       // counter-height body
      k.base(w, 0.12, d + 0.1, 0, 1.0, 0.05, '#e9e4d8')      // counter top
      for (const s of [-1, 1]) k.base(0.12, h - 1.0, d, s * (w / 2 - 0.06), 1.0, 0, body)
      k.base(w, h - 1.0, 0.1, 0, 1.0, -d / 2 + 0.05, body)
      k.base(w, 0.4, d, 0, h - 0.4, 0, body)                  // fascia band
      k.base(w - 0.3, 1.0, 0.05, 0, 1.0, -d / 2 + 0.12, '#2a241f')
      if (b.kind === 'foodstand') { k.base(0.9, 0.4, 0.5, -0.5, 1.12, fr - 0.2, '#d9eef5'); k.box(0.8, 0.1, 0.4, -0.5, 1.2, fr - 0.2, '#e8a33a') }
      if (b.kind === 'momo') for (let i = 0; i < 4; i++) k.box(w * 0.9, 0.06, 0.01, 0, 0.2 + i * 0.22, fr + 0.005, i % 2 ? '#1a1a1a' : bg)
      if (b.kind === 'kiosk') for (let i = 0; i < 6; i++) k.box(0.22, 0.26, 0.12, -0.9 + i * 0.36, 1.25, -d / 2 + 0.3, ['#f2f2ee', '#e9c54a', '#c8102e'][i % 3])
      out.push(<KM key="body" geo={k.build()} mat={b.kind === 'momo' ? M.matte : M.metal} />)
      met.box(w + 0.4, 0.06, d + 0.6, 0, h + 0.05, 0.1, '#9aa0a6', 0, 0.06)
      met.box(w - 0.1, 0.04, 0.8, 0, 2.05, fr + 0.35, shade(body, 0.8), 0, -0.9) // propped-up hatch flap
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w + 0.2} h={0.45} p={[0, h + 0.35, 0.1]} />)
      out.push(<SignBoard key="sg2" text={b.name} bg={bg} fg={fg} w={w + 0.2} h={0.45} p={[0, h + 0.35, 0.08]} r={Math.PI} />)
      break
    }
    case 'chopbar': {
      const h = 2.6
      post(out, 'p0', -w / 2 + 0.1, fr - 0.1, h); post(out, 'p1', w / 2 - 0.1, fr - 0.1, h); post(out, 'p2', 0, fr - 0.1, h)
      const bw = new Kit(); bw.base(w, h, 0.15, 0, 0, -fr + 0.08, b.wallHex ?? '#e8b98c'); bw.base(w, 0.35, 0.17, 0, 0, -fr + 0.08, '#8f7a64')
      out.push(<KM key="back" geo={bw.build()} />)
      for (const s of [-1, 1]) { const sw = new Kit(); sw.base(0.15, 1.1, d - 0.4, s * (w / 2 - 0.08), 0, -0.2, b.wallHex ?? '#e8b98c'); out.push(<KM key={`side${s}`} geo={sw.build()} />) }
      const kc = new Kit(); kc.base(1.3, 0.9, 0.7, w / 2 - 0.85, 0, -fr + 0.5, '#b8b2a6'); kc.base(1.3, 0.05, 0.72, w / 2 - 0.85, 0.9, -fr + 0.5, '#7a4a2a')
      out.push(<KM key="kitchen" geo={kc.build()} />)
      met.box(w + 0.6, 0.06, d + 1.0, 0, h + 0.18, 0.25, ROOF_COL.rust[0], 0, 0.1)
      for (let i = 0; i < Math.floor(w / 0.6); i++) met.box(0.05, 0.035, d + 1.0, -w / 2 + 0.1 + i * 0.6, h + 0.22, 0.25, ROOF_COL.rust[2], 0, 0.1)
      up.box(w, 0.3, 0.12, 0, h - 0.15, fr - 0.1, '#7a4a2a')
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w * 0.75} h={0.5} p={[0, h - 0.05, fr + 0.0]} />)
      break
    }
    case 'carpentry': {
      const h = 2.7
      for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) post(out, `p${x}`, x, fr - 0.15, h)
      const bw = new Kit(); bw.base(w, h, 0.15, 0, 0, -fr + 0.08, '#b5a58b'); out.push(<KM key="back" geo={bw.build()} />)
      const wb = new Kit(); wb.base(1.8, 0.85, 0.7, -0.6, 0, -fr + 0.6, '#8a5c36'); wb.base(0.5, 1.4, 0.4, 1.6, 0, -fr + 0.4, '#9a6635'); out.push(<KM key="wb" geo={wb.build()} />)
      met.box(w + 0.5, 0.06, d + 0.8, 0, h + 0.15, 0.2, ROOF_COL.rust[1], 0, 0.1)
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w - 0.4} h={0.45} p={[0, h - 0.25, fr - 0.05]} />)
      break
    }
    case 'seller': {
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={1.6} h={0.32} p={[0, 1.5, -0.28]} />)
      const k = new Kit(); k.base(0.05, 1.4, 0.05, -0.75, 0, -0.3, '#6b4428').base(0.05, 1.4, 0.05, 0.75, 0, -0.3, '#6b4428')
      out.push(<KM key="sgp" geo={k.build()} />)
      break
    }
    case 'shed': {
      const h = 2.8
      const xs = [-w / 2 + 0.15, 0, w / 2 - 0.15]
      for (const x of xs) for (const z of [-fr + 0.15, fr - 0.15]) post(out, `p${x},${z}`, x, z, h + (z < 0 ? 0.3 : 0), '#5d666c', 0.12)
      met.box(w + 0.6, 0.06, d + 0.9, 0, h + 0.2, 0.15, b.goods === 'cloth' ? '#5f8f7a' : ROOF_COL.rust[0], 0, 0.1)
      for (let i = 0; i < Math.floor(w / 0.55); i++) met.box(0.05, 0.035, d + 0.9, -w / 2 + 0.1 + i * 0.55, h + 0.24, 0.15, b.goods === 'cloth' ? '#7aa894' : ROOF_COL.rust[2], 0, 0.1)
      up.box(w, 0.32, 0.1, 0, h - 0.1, fr - 0.15, '#5d666c')
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={Math.min(5.5, w * 0.55)} h={0.5} p={[0, h - 0.05, fr - 0.08]} />)
      break
    }
    case 'waste': {
      const k = new Kit()
      k.base(w - 0.6, 1.2, d, 0, 0.15, 0, '#2f6b3a')
      k.box(0.5, 1.0, d, -w / 2 + 0.38, 0.75, 0, '#2f6b3a', 0, 0, 0.45).box(0.5, 1.0, d, w / 2 - 0.38, 0.75, 0, '#2f6b3a', 0, 0, -0.45)
      k.base(w - 0.7, 0.25, d - 0.2, 0, 1.35, 0, '#3b3b3b')                      // heaped refuse
      for (let i = 0; i < 6; i++) k.box(0.25, 0.12, 0.2, -1 + i * 0.4, 1.62, (i % 3) * 0.3 - 0.3, ['#f2f2ee', '#2e7fa8', '#c8102e', '#3a9a4a'][i % 4])
      out.push(<KM key="skip" geo={k.build()} mat={M.metal} />)
      const p = new Kit(); p.base(0.07, 1.9, 0.07, w / 2 + 0.6, 0, fr - 0.2, '#5d666c'); out.push(<KM key="sp" geo={p.build()} />)
      out.push(<SignBoard key="sg" text="WASTE POINT · KEEP CHORKOR CLEAN" bg={bg} fg="#ffffff" w={1.6} h={0.36} p={[w / 2 + 0.6, 1.9, fr - 0.15]} />)
      break
    }
    case 'fitting': {
      const h = 3.0
      for (const [x, z] of [[-w / 2 + 0.1, -fr + 0.1], [w / 2 - 0.1, -fr + 0.1], [-w / 2 + 0.1, fr - 0.1], [w / 2 - 0.1, fr - 0.1]] as [number, number][]) post(out, `p${x},${z}`, x, z, h, '#4a4f55', 0.14)
      const bw = new Kit(); bw.base(w, 2.2, 0.15, 0, 0, -fr + 0.08, '#9aa0a6')
      for (let i = 0; i < 5; i++) bw.box(0.1, 0.5, 0.05, -1.6 + i * 0.6, 1.6, -fr + 0.2, '#6b6f74') // tool rack
      out.push(<KM key="back" geo={bw.build()} />)
      met.box(w + 0.5, 0.06, d + 0.6, 0, h + 0.15, 0, '#8a6448', 0, 0.08)
      for (const x of [-1.3, 1.3]) for (const z of [-0.6, 0.6]) { const kb = new Kit(); kb.base(0.3, 0.32, 0.3, x, 0, z, '#9d9a92'); out.push(<KM key={`blk${x},${z}`} geo={kb.build()} />) }
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w - 0.4} h={0.55} p={[0, h - 0.3, fr - 0.02]} />)
      break
    }
    case 'vulcanizer': {
      const k = new Kit()
      k.base(w, 2.1, d, 0, 0, -0.1, '#7a4a2a')
      k.base(w - 0.4, 1.0, 0.05, 0, 0.9, fr - 0.06, '#2a241f')
      k.base(0.6, 0.5, 0.4, -w / 2 - 0.0, 0, fr + 0.35, '#c8102e') // compressor
      out.push(<KM key="hut" geo={k.build()} />)
      met.box(w + 0.4, 0.05, d + 0.5, 0, 2.2, 0, '#9aa0a6', 0, 0.08)
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w + 0.2} h={0.4} p={[0, 2.5, fr - 0.05]} />)
      break
    }
    case 'drink': {
      const h = 2.5
      const k = new Kit()
      k.base(w, 1.05, 0.5, 0, 0, fr - 0.25, '#7a4a2a')
      k.base(w, 0.06, 0.6, 0, 1.05, fr - 0.25, '#e9c54a')
      k.base(w, h, 0.12, 0, 0, -fr + 0.06, '#2e7fa8')
      for (const s of [-1, 1]) k.base(0.12, h, d, s * (w / 2 - 0.06), 0, 0, '#2e7fa8')
      k.base(0.7, 1.7, 0.6, w / 2 - 0.6, 0, -fr + 0.45, '#f2f2ee').box(0.72, 0.25, 0.62, w / 2 - 0.6, 1.55, -fr + 0.45, '#c8102e') // drinks fridge
      for (let i = 0; i < 2; i++) k.box(w - 1.6, 0.04, 0.25, -0.5, 1.4 + i * 0.45, -fr + 0.25, '#6b4428')
      for (let i = 0; i < 10; i++) k.cyl(0.04, 0.04, 0.24, -1.2 + (i % 5) * 0.3, 1.55 + Math.floor(i / 5) * 0.45, -fr + 0.25, i % 3 ? '#7a4a1a' : '#2f6b3a', 5)
      out.push(<KM key="bar" geo={k.build()} />)
      met.box(w + 0.6, 0.06, d + 1.0, 0, h + 0.1, 0.3, ROOF_COL.rust[0], 0, 0.1)
      out.push(<SignBoard key="sg" text={b.name} bg={bg} fg={fg} w={w - 0.2} h={0.5} p={[0, h + 0.45, fr - 0.05]} />)
      out.push(<SignBoard key="sg2" text="SIKA LAGER · ICE COLD" bg="#c8102e" fg="#ffffff" w={w - 0.6} h={0.32} p={[0, 1.55, fr + 0.02]} />)
      break
    }
    default:
      break
  }
  if (up.parts.length) out.push(<KM key="up" geo={up.build()} nc />)
  if (met.parts.length) out.push(<KM key="met" geo={met.build()} mat={M.metal} nc />)
  return out
}

// ══════════════════════════════════════════ streets: gutters, poles, cables ══
export function GuttersAndSlabs({ data }: { data: CommunityData }) {
  const geo = useMemo(() => {
    if (data.gutters.length === 0 && data.slabs.length === 0) return null
    const K = new Kit()
    for (const [x0, z0, x1, z1] of data.gutters) {
      // Task 15: N-S streets get z-aligned drains (lips on the x edges)
      if (Math.abs(x1 - x0) >= Math.abs(z1 - z0)) {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = x1 - x0
        K.box(L, 0.012, z1 - z0 - 0.08, cx, 0.012, cz, '#2e2a26')
        K.box(L, 0.045, 0.07, cx, 0.0225, z0 + 0.035, '#c6c0b4')
        K.box(L, 0.045, 0.07, cx, 0.0225, z1 - 0.035, '#c6c0b4')
      } else {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = z1 - z0
        K.box(x1 - x0 - 0.08, 0.012, L, cx, 0.012, cz, '#2e2a26')
        K.box(0.07, 0.045, L, x0 + 0.035, 0.0225, cz, '#c6c0b4')
        K.box(0.07, 0.045, L, x1 - 0.035, 0.0225, cz, '#c6c0b4')
      }
    }
    for (const [x, z, w, d] of data.slabs) K.box(w, 0.045, d, x, 0.03, z, '#b4aea2')
    return K.build()
  }, [data])
  if (!geo) return null
  return <KM geo={geo} nc cast={false} name="t15-gutters" />
}

export function PolesAndCables({ data }: { data: CommunityData }) {
  const G = poleGeometries()
  const lines = useMemo(() => {
    const pts: number[] = []
    for (const [a, b] of data.cables) {
      const len = Math.hypot(b[0] - a[0], b[2] - a[2])
      const sag = Math.min(0.55, 0.02 * len + 0.1)
      const n = 8
      for (let i = 0; i < n; i++) {
        for (const t of [i / n, (i + 1) / n]) {
          pts.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  // P2-4: the cable polyline geometry is owned here — free it on unmount
  // (a prop-passed geometry is never auto-disposed by R3F)
  useEffect(() => () => lines.dispose(), [lines])
  if (data.poles.length === 0) return null
  return (
    <group name="t15-poles">
      {data.poles.map((p, i) => (
        <group key={i}>
          <KM geo={G.shaft} p={[p.x, 0, p.z]} />
          <KM geo={G.top} p={[p.x, 0, p.z]} nc />
          {p.t ? <KM geo={G.transformer} p={[p.x, 0, p.z]} nc /> : null}
        </group>
      ))}
      <lineSegments geometry={lines} frustumCulled={false} userData={NC}>
        <lineBasicMaterial color="#1b1d20" />
      </lineSegments>
    </group>
  )
}

export function Greens({ data }: { data: CommunityData }) {
  const N = neemGeometries()
  const pl = plantainGeometry()
  if (data.gather.neem.length === 0 && data.plantain.length === 0) return null
  return (
    <group name="t15-greens">
      {data.gather.neem.map(([x, z, s], i) => (
        <group key={i}>
          <mesh geometry={N.trunk} material={kitMats().matte} position={[x, 0, z]} scale={[s * 0.62, s, s * 0.62]} castShadow receiveShadow />
          <KM geo={N.seat} p={[x, 0, z]} />
          <KM geo={N.canopy} p={[x, 0, z]} s={s} nc />
        </group>
      ))}
      {data.plantain.map((it, i) => <KM key={i} geo={pl} p={[it.p[0], 0, it.p[1]]} r={it.r ?? 0} s={it.s ?? 1} nc />)}
    </group>
  )
}

function Shelters() {
  const st = COMMUNITY.trotroStop
  const gs = COMMUNITY.gather.shelter
  const make = (w: number, d: number, bench: boolean) => {
    const posts: React.ReactNode[] = []
    for (const [x, z] of [[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]] as [number, number][]) post(posts, `p${x},${z}`, x, z, 2.5, '#4a4f55', 0.1)
    const roof = new Kit()
    roof.box(w + 0.5, 0.06, d + 0.6, 0, 2.6, 0, '#9aa0a6', 0, -0.08)
    for (let i = 0; i < Math.floor((w + 0.4) / 0.5); i++) roof.box(0.04, 0.03, d + 0.6, -w / 2 - 0.15 + i * 0.5, 2.64, 0, '#b8bdc1', 0, -0.08)
    const bk = new Kit()
    if (bench) { bk.base(w - 0.6, 0.06, 0.4, 0, 0.44, -d / 2 + 0.45, '#8a5c36'); bk.base(0.08, 0.44, 0.35, -w / 2 + 0.6, 0, -d / 2 + 0.45, '#5a3a22').base(0.08, 0.44, 0.35, w / 2 - 0.6, 0, -d / 2 + 0.45, '#5a3a22') }
    return { posts, roof: roof.build(), bench: bench ? bk.build() : null }
  }
  const a = useMemo(() => make(st.w, st.d, true), [st])
  const b = useMemo(() => make(gs.w, gs.d, true), [gs])
  return (
    <group name="t14-shelters">
      <group position={[st.x, 0, st.z]} rotation={[0, Math.PI, 0]} userData={{ bldg: 'shelter' }}>
        {a.posts}
        <KM geo={a.roof} mat={kitMats().metal} nc />
        {a.bench && <KM geo={a.bench} />}
        <SignBoard text={st.sign} bg="#f1c40f" fg="#111111" w={st.w - 0.2} h={0.4} p={[0, 2.95, 0]} />
        <SignBoard text={st.sign} bg="#f1c40f" fg="#111111" w={st.w - 0.2} h={0.4} p={[0, 2.95, -0.02]} r={Math.PI} />
      </group>
      <group position={[gs.x, 0, gs.z]} rotation={[0, Math.PI, 0]}>
        {b.posts}
        <KM geo={b.roof} mat={kitMats().metal} nc />
        {b.bench && <KM geo={b.bench} />}
      </group>
      <SignBoard text="CHORKOR WEST NOTICES" bg="#3b7d3b" w={1.6} h={0.22} p={[-187.33, 1.71, 14.6]} r={Math.PI / 2} />
      <SignBoard text="TAXI RANK" bg="#f5c400" fg="#111111" w={1.6} h={0.36} p={[-162.6, 2.3, 16.2]} r={-Math.PI / 2} />
    </group>
  )
}
/** Task 15: standalone trotro-stop shelter (same visual recipe as the
 *  Chorkor West station) for the Osu / Nima stops. */
export function CommunityShelter({ x, z, w, d, sign, rot = Math.PI }: { x: number; z: number; w: number; d: number; sign: string; rot?: number }) {
  const parts = useMemo(() => {
    const posts: React.ReactNode[] = []
    for (const [px, pz] of [[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]] as [number, number][]) post(posts, `p${px},${pz}`, px, pz, 2.5, '#4a4f55', 0.1)
    const roof = new Kit()
    roof.box(w + 0.5, 0.06, d + 0.6, 0, 2.6, 0, '#9aa0a6', 0, -0.08)
    for (let i = 0; i < Math.floor((w + 0.4) / 0.5); i++) roof.box(0.04, 0.03, d + 0.6, -w / 2 - 0.15 + i * 0.5, 2.64, 0, '#b8bdc1', 0, -0.08)
    const bk = new Kit()
    bk.base(w - 0.6, 0.06, 0.4, 0, 0.44, -d / 2 + 0.45, '#8a5c36')
    bk.base(0.08, 0.44, 0.35, -w / 2 + 0.6, 0, -d / 2 + 0.45, '#5a3a22').base(0.08, 0.44, 0.35, w / 2 - 0.6, 0, -d / 2 + 0.45, '#5a3a22')
    return { posts, roof: roof.build(), bench: bk.build() }
  }, [w, d])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} userData={{ bldg: 'shelter' }}>
      {parts.posts}
      <KM geo={parts.roof} mat={kitMats().metal} nc />
      <KM geo={parts.bench} />
      <SignBoard text={sign} bg="#f1c40f" fg="#111111" w={w - 0.2} h={0.4} p={[0, 2.95, 0]} />
      <SignBoard text={sign} bg="#f1c40f" fg="#111111" w={w - 0.2} h={0.4} p={[0, 2.95, -0.02]} r={Math.PI} />
    </group>
  )
}

function TaxiRankPost() {
  const geo = useMemo(() => new Kit().base(0.08, 2.1, 0.08, -162.6, 0, 16.2, '#5d666c').build(), [])
  return <KM geo={geo} />
}

export function Props({ data }: { data: CommunityData }) {
  if (data.props.length === 0) return null
  return (
    <group name="t15-props">
      {data.props.map((p, i) => (
        p.k === 'laundry'
          ? <mesh key={i} geometry={propGeometry(p.k, p.c)} material={kitMats().matte} position={[p.x, 0, p.z]} rotation={[0, p.r, 0]} scale={[p.s, 1, 1]} castShadow userData={NC} />
          : <KM key={i} geo={propGeometry(p.k, p.c)} p={[p.x, 0, p.z]} r={p.r} s={p.s} nc={PROP_NO_COLLIDE.has(p.k)} />
      ))}
    </group>
  )
}

/** Task 15: shared renderer for any CommunityData zone (res + biz + streets
 *  + props). Chorkor West adds shelters, the taxi rank and instanced life on
 *  top; the Osu/Nima zones mount <CommunityLife data={...} /> themselves. */
export function CommunityBlock({ data, name }: { data: CommunityData; name: string }) {
  return (
    <group name={name}>
      {data.res.map((r) => <ResBuilding key={r.id} r={r} />)}
      {data.biz.map((b) => <BizBuilding key={b.id} b={b} />)}
      <GuttersAndSlabs data={data} />
      <PolesAndCables data={data} />
      <Greens data={data} />
      <Props data={data} />
    </group>
  )
}

export function CommunityQuarter() {
  return (
    <group name="t14-community">
      <CommunityBlock data={COMMUNITY} name="t14-core" />
      <Shelters />
      <TaxiRankPost />
      <CommunityLife />
    </group>
  )
}
