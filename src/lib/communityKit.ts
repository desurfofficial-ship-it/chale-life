// ─── Task 14: community kit — low-poly vertex-coloured geometry builders ────
// Everything in the community realism pass is built from merged, vertex-
// coloured primitives that share THREE materials (matte / metal / glow), so
// SceneBatcher folds every static piece into the existing colour buckets (no
// new draw calls) and every prop stays well under the 1k-tri prop budget.
// One mesh per logical solid → the collider exporter gets one honest AABB per
// wall / prop / shell (decorative flat or overhead parts are tagged noCollide
// or sit above head height, which the exporter skips).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type V3 = [number, number, number]

// P3-4: Kit.add runs per part during kit baking (hundreds of calls per
// mount batch) — the transform temps are module-scope, not per-call.
const _kitM = new THREE.Matrix4()
const _kitP = new THREE.Vector3()
const _kitQ = new THREE.Quaternion()
const _kitE = new THREE.Euler()
const _kitS = new THREE.Vector3()
const _kitC = new THREE.Color()

export class Kit {
  parts: THREE.BufferGeometry[] = []
  add(g: THREE.BufferGeometry, color: string, pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
    const m = _kitM.compose(
      _kitP.set(pos[0], pos[1], pos[2]),
      _kitQ.setFromEuler(_kitE.set(rot[0], rot[1], rot[2], 'YXZ')),
      _kitS.set(scale[0], scale[1], scale[2]),
    )
    g.applyMatrix4(m)
    const ng = g.index ? g.toNonIndexed() : g
    for (const k of Object.keys(ng.attributes)) if (k !== 'position' && k !== 'normal') ng.deleteAttribute(k)
    const c = _kitC.set(color)
    const n = ng.attributes.position.count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
    ng.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    this.parts.push(ng)
    return this
  }
  /** box sized sx×sy×sz centred at (x,y,z) */
  box(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, ry = 0, rx = 0, rz = 0) {
    return this.add(new THREE.BoxGeometry(sx, sy, sz), color, [x, y, z], [rx, ry, rz])
  }
  /** box whose base sits at y (convenience for ground-standing parts) */
  base(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, ry = 0) {
    return this.box(sx, sy, sz, x, y + sy / 2, z, color, ry)
  }
  cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, color: string, seg = 8, rx = 0, rz = 0, ry = 0) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, [x, y, z], [rx, ry, rz])
  }
  sphere(r: number, x: number, y: number, z: number, color: string, ws = 7, hs = 5, sx = 1, sy = 1, sz = 1) {
    return this.add(new THREE.SphereGeometry(r, ws, hs), color, [x, y, z], [0, 0, 0], [sx, sy, sz])
  }
  cone(r: number, h: number, x: number, y: number, z: number, color: string, seg = 8, ry = 0) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, [x, y, z], [0, ry, 0])
  }
  /** triangular prism (gable infill): base width w along x, height h, depth d along z */
  gable(w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0) {
    const s = new THREE.Shape()
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    g.translate(0, 0, -d / 2)
    return this.add(g, color, [x, y, z], [0, ry, 0])
  }
  build(): THREE.BufferGeometry {
    const g = this.parts.length === 1 ? this.parts[0] : mergeGeometries(this.parts, false)
    if (!g) throw new Error('kit merge failed')
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }
}

// ── shared materials (one per behaviour class — the batcher keys on these) ──
let mats: { matte: THREE.MeshStandardMaterial; metal: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial } | null = null
export function kitMats() {
  if (!mats) {
    mats = {
      matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 }),
      glow: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: new THREE.Color('#ffc477'), emissiveIntensity: 1.4 }),
      plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    }
  }
  return mats
}

const cache = new Map<string, THREE.BufferGeometry>()
export function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key)
  if (!g) { g = make(); cache.set(key, g) }
  return g
}

// ─────────────────────────────────────────────────────────── palettes ───────
export const PLASTIC = ['#c8102e', '#2e7fa8', '#f1c40f', '#3a9a4a', '#f2f2ee', '#e67e22']
const GOODS = [
  ['#d8321f', '#e04a2a', '#c2261a'],   // 0 tomatoes
  ['#c9a46a', '#b98d55', '#d8b97a'],   // 1 onions
  ['#d9281a', '#2f8f3a', '#e8b31a'],   // 2 peppers
  ['#9aa3a8', '#7d878c', '#b4bcc0'],   // 3 fish (in enamel basins)
  ['#1d4fa0', '#e0a21c', '#b0172b'],   // 4 wax-print cloth bolts
  ['#2bb3c0', '#e94f9a', '#f3d02e'],   // 5 plastic wares
]

// ═══════════════════════════════════════════════════════════════ props ═════
export function propGeometry(k: string, c = 0): THREE.BufferGeometry {
  return cached(`prop:${k}:${c}`, () => {
    const K = new Kit()
    const pc = PLASTIC[c % PLASTIC.length]
    switch (k) {
      case 'polytank': // black polytank on a steel stand
        for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) K.base(0.07, 1.5, 0.07, x * 0.9, 0, z * 0.9, '#4a4f55')
        K.base(1.1, 0.08, 1.1, 0, 1.5, 0, '#4a4f55')
        K.cyl(0.5, 0.55, 1.1, 0, 2.13, 0, '#1d1f22', 10)
        K.cyl(0.18, 0.18, 0.12, 0, 2.74, 0, '#1d1f22', 8)
        K.cyl(0.035, 0.035, 1.5, 0.45, 0.8, 0.4, '#3d6fa3', 5)
        break
      case 'washarea': // concrete washing slab with a low splash wall + tap
        K.base(1.3, 0.1, 1.1, 0, 0, 0, '#b3ada2')
        K.base(1.3, 0.45, 0.12, 0, 0.1, -0.5, '#c4beb2')
        K.base(0.05, 0.75, 0.05, 0.45, 0.1, -0.42, '#7a7f84')
        K.cyl(0.32, 0.26, 0.2, -0.15, 0.2, 0.15, '#2e7fa8', 10)
        break
      case 'coalpot': // clay/metal coal pot with glowing coals
        K.cyl(0.2, 0.14, 0.22, 0, 0.11, 0, '#2b2a28', 8)
        K.cyl(0.24, 0.2, 0.14, 0, 0.29, 0, '#3a3836', 8)
        K.cyl(0.19, 0.19, 0.02, 0, 0.37, 0, '#ff6a1a', 8)
        break
      case 'pot':
        K.cyl(0.3, 0.27, 0.42, 0, 0.21, 0, '#c9cdd1', 10)
        K.cyl(0.32, 0.32, 0.03, 0, 0.43, 0, '#9aa0a6', 10)
        break
      case 'basin':
        K.cyl(0.42, 0.3, 0.2, 0, 0.1, 0, pc, 10)
        K.cyl(0.36, 0.36, 0.02, 0, 0.17, 0, '#dfe6ea', 10)
        break
      case 'bucket':
        K.cyl(0.17, 0.13, 0.34, 0, 0.17, 0, pc, 8)
        break
      case 'gascyl': // LPG cylinder
        K.cyl(0.17, 0.17, 0.5, 0, 0.3, 0, ['#3a9a4a', '#c8102e', '#2e7fa8'][c % 3], 8)
        K.sphere(0.17, 0, 0.55, 0, ['#3a9a4a', '#c8102e', '#2e7fa8'][c % 3], 8, 4, 1, 0.5, 1)
        K.cyl(0.06, 0.06, 0.1, 0, 0.66, 0, '#8d9399', 6)
        K.cyl(0.14, 0.14, 0.06, 0, 0.03, 0, '#3b3f44', 8)
        break
      case 'chair': // monobloc plastic chair (faces +z)
        K.box(0.44, 0.05, 0.42, 0, 0.44, 0, pc)
        K.box(0.44, 0.42, 0.04, 0, 0.67, -0.2, pc, 0, -0.12)
        K.box(0.03, 0.44, 0.4, -0.2, 0.22, 0, pc)
        K.box(0.03, 0.44, 0.4, 0.2, 0.22, 0, pc)
        break
      case 'stool':
        K.cyl(0.17, 0.15, 0.04, 0, 0.42, 0, '#8a5c36', 7)
        for (const a of [0, 2.1, 4.2]) K.box(0.04, 0.42, 0.04, Math.cos(a) * 0.11, 0.21, Math.sin(a) * 0.11, '#6b4428')
        break
      case 'pbench': // plank bench (no back)
        K.base(1.8, 0.05, 0.3, 0, 0.42, 0, '#8a5c36')
        K.base(0.06, 0.42, 0.26, -0.75, 0, 0, '#6b4428')
        K.base(0.06, 0.42, 0.26, 0.75, 0, 0, '#6b4428')
        break
      case 'bench': // wooden bench with back (faces +z)
        K.base(1.9, 0.06, 0.45, 0, 0.52, 0, '#8a5c36')
        K.box(1.9, 0.36, 0.06, 0, 0.82, -0.2, '#8a5c36', 0, -0.15)
        for (const x of [-0.8, 0.8]) K.base(0.08, 0.52, 0.4, x, 0, 0, '#5a3a22')
        break
      case 'table': // plastic / wooden table
        K.base(1.0, 0.05, 0.7, 0, 0.72, 0, c === 1 ? '#7a4a2a' : '#f1f1ee')
        for (const [x, z] of [[-0.42, -0.28], [0.42, -0.28], [-0.42, 0.28], [0.42, 0.28]]) K.base(0.05, 0.72, 0.05, x, 0, z, c === 1 ? '#5a3a22' : '#e3e3df')
        break
      case 'laundry': { // two poles + line + clothes (scaled along x)
        K.base(0.06, 2.0, 0.06, -2, 0, 0, '#7a5230').base(0.06, 2.0, 0.06, 2, 0, 0, '#7a5230')
        K.box(4.0, 0.02, 0.02, 0, 1.95, 0, '#d8d4c8')
        const cl = ['#ce1126', '#fcd116', '#1d4fa0', '#f4f1ea', '#3aa08f', '#e08a3c', '#7b3fa0']
        for (let i = 0; i < 6; i++) K.box(0.42 + (i % 2) * 0.14, 0.5 + (i % 3) * 0.12, 0.02, -1.6 + i * 0.64, 1.62 - (i % 3) * 0.06, 0, cl[(i + c) % cl.length])
        break
      }
      case 'mortar': // fufu mortar + pestle
        K.cyl(0.24, 0.2, 0.5, 0, 0.25, 0, '#6b4428', 8)
        K.cyl(0.05, 0.05, 1.4, 0.05, 0.95, 0, '#a7835a', 6, 0.08)
        break
      case 'flowerpot': // painted pot with hibiscus / croton
        K.cyl(0.24, 0.18, 0.4, 0, 0.2, 0, ['#b5552e', '#e6dbc0', '#2e7fa8'][c % 3], 8)
        K.sphere(0.34, 0, 0.66, 0, '#3f8a3a', 7, 5)
        K.sphere(0.07, 0.15, 0.85, 0.18, '#d61f3a', 5, 4).sphere(0.07, -0.2, 0.78, 0.1, '#d61f3a', 5, 4).sphere(0.07, 0.05, 0.9, -0.2, '#f08a1f', 5, 4)
        break
      case 'blocks': // stacked sandcrete blocks
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) K.base(0.44, 0.22, 0.22, -0.45 + x * 0.45, y * 0.225, 0, y % 2 ? '#b4b0a7' : '#a9a59c')
        for (let x = 0; x < 2; x++) K.base(0.44, 0.22, 0.22, -0.22 + x * 0.45, 0.675, 0, '#b0aca3')
        break
      case 'sandpile':
        K.cone(0.8, 0.6, 0, 0.3, 0, '#c9a46e', 8)
        break
      case 'crates': // beer / minerals crates
        for (let i = 0; i < 4; i++) K.base(0.4, 0.28, 0.3, (i % 2) * 0.42 - 0.21, Math.floor(i / 2) * 0.29, 0, ['#c8102e', '#e9c54a', '#2e7fa8'][(i + c) % 3])
        break
      case 'waterbags': // sachet-water bags
        for (let i = 0; i < 5; i++) K.base(0.38, 0.22, 0.3, (i % 3) * 0.38 - 0.38, Math.floor(i / 3) * 0.22, 0, i % 2 ? '#e8f2f8' : '#cfe6f3')
        break
      case 'priceboard': { // A-frame chalk price board (faces +z)
        K.box(0.6, 0.8, 0.04, 0, 0.62, 0.08, '#1f3b2b', 0, -0.18)
        K.box(0.6, 0.8, 0.04, 0, 0.62, -0.08, '#1f3b2b', 0, 0.18)
        for (let i = 0; i < 4; i++) K.box(0.36 - (i % 2) * 0.12, 0.03, 0.01, -0.04, 0.85 - i * 0.14, 0.12 - i * 0.025, '#f4f1ea', 0, -0.18)
        K.box(0.5, 0.08, 0.012, 0, 0.98, 0.135, ['#e9c54a', '#c8102e', '#2e7fa8'][c % 3], 0, -0.18)
        break
      }
      case 'umbrella': // market umbrella (pole only collides; canopy above head)
        K.cyl(0.03, 0.03, 2.3, 0, 1.15, 0, '#d0d0d0', 5)
        K.cone(1.25, 0.5, 0, 2.3, 0, ['#c8102e', '#2e7fa8', '#f1c40f', '#3a9a4a', '#f2f2ee'][c % 5], 8)
        K.cyl(0.18, 0.22, 0.12, 0, 0.06, 0, '#555', 6)
        break
      case 'sewing': // treadle sewing machine on a table
        K.base(0.9, 0.05, 0.5, 0, 0.72, 0, '#6b4428')
        K.base(0.06, 0.72, 0.42, -0.4, 0, 0, '#2b2b2b').base(0.06, 0.72, 0.42, 0.4, 0, 0, '#2b2b2b')
        K.base(0.42, 0.2, 0.16, 0.05, 0.77, 0, '#1b1b1b').base(0.1, 0.3, 0.14, 0.22, 0.77, 0, '#1b1b1b')
        K.box(0.5, 0.02, 0.3, 0, 0.8, 0.05, '#2f68b0')
        break
      case 'mannequin': // dress form with a kaba
        K.cyl(0.02, 0.02, 1.0, 0, 0.5, 0, '#444', 5)
        K.cyl(0.16, 0.24, 0.6, 0, 1.25, 0, '#e0a21c', 8)
        K.sphere(0.16, 0, 1.58, 0, '#b0172b', 6, 4)
        break
      case 'timber':
        for (let i = 0; i < 6; i++) K.base(1.6, 0.08, 0.18, 0, i * 0.085, -0.2 + (i % 3) * 0.2, i % 2 ? '#b07a45' : '#9a6635', 0)
        break
      case 'workbench':
        K.base(1.6, 0.08, 0.6, 0, 0.8, 0, '#8a5c36')
        for (const [x, z] of [[-0.7, -0.25], [0.7, -0.25], [-0.7, 0.25], [0.7, 0.25]]) K.base(0.08, 0.8, 0.08, x, 0, z, '#6b4428')
        break
      case 'furniture': // a new wardrobe for sale
        K.base(0.6, 1.7, 0.45, 0, 0, 0, '#9a6635')
        K.box(0.01, 1.5, 0.02, 0, 0.9, 0.23, '#6b4428')
        break
      case 'coolbox':
        K.base(0.6, 0.42, 0.4, 0, 0, 0, '#2e7fa8')
        K.base(0.62, 0.08, 0.42, 0, 0.42, 0, '#f2f2ee')
        break
      case 'stalltable': { // wooden market table with goods by type (c)
        K.base(2.0, 0.06, 1.0, 0, 0.78, 0, '#8a5c36')
        for (const [x, z] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) K.base(0.07, 0.78, 0.07, x, 0, z, '#5a3a22')
        const gs = GOODS[c % GOODS.length]
        if (c % 6 === 4) { for (let i = 0; i < 6; i++) K.box(0.3, 0.14, 0.7, -0.75 + i * 0.3, 0.92 + (i % 2) * 0.12, 0, gs[i % 3]) }
        else if (c % 6 === 3) { for (let i = 0; i < 3; i++) { K.cyl(0.3, 0.24, 0.12, -0.6 + i * 0.6, 0.87, 0, '#eef1f2', 10); K.box(0.36, 0.06, 0.14, -0.6 + i * 0.6, 0.95, 0, gs[i % 3]) } }
        else if (c % 6 === 5) { for (let i = 0; i < 5; i++) K.cyl(0.14, 0.12, 0.3, -0.7 + i * 0.35, 0.96, (i % 2) * 0.2 - 0.1, gs[i % 3], 7) }
        else {
          // little pyramids of produce on enamel plates
          for (let i = 0; i < 4; i++) {
            const x = -0.72 + i * 0.48
            K.cyl(0.2, 0.18, 0.03, x, 0.83, 0.1, '#eef1f2', 8)
            K.sphere(0.07, x - 0.06, 0.9, 0.06, gs[0], 5, 4).sphere(0.07, x + 0.07, 0.9, 0.12, gs[1], 5, 4).sphere(0.07, x, 0.9, 0.2, gs[2], 5, 4).sphere(0.07, x, 1.0, 0.12, gs[0], 5, 4)
          }
          K.box(1.8, 0.02, 0.3, 0, 0.82, -0.32, '#c4b08a')
        }
        break
      }
      case 'bin': // wheelie bin
        K.base(0.6, 0.95, 0.65, 0, 0.06, 0, c % 2 ? '#2f6b3a' : '#1f4f7a')
        K.base(0.64, 0.06, 0.7, 0, 1.01, 0, c % 2 ? '#24552d' : '#173f62')
        K.cyl(0.08, 0.08, 0.06, -0.25, 0.08, -0.3, '#111', 6, 0, Math.PI / 2).cyl(0.08, 0.08, 0.06, 0.25, 0.08, -0.3, '#111', 6, 0, Math.PI / 2)
        break
      case 'tyres':
        for (let i = 0; i < 4; i++) K.cyl(0.36, 0.36, 0.2, (i % 2) * 0.05, 0.1 + i * 0.21, 0, '#1c1c1c', 10)
        break
      case 'oildrum':
        K.cyl(0.3, 0.3, 0.88, 0, 0.44, 0, '#2e5e8c', 10).cyl(0.31, 0.31, 0.04, 0, 0.3, 0, '#244b70', 10).cyl(0.31, 0.31, 0.04, 0, 0.6, 0, '#244b70', 10)
        break
      case 'draughts': // draughts table (the board is the classic red/black)
        K.base(0.8, 0.05, 0.8, 0, 0.7, 0, '#7a4a2a')
        K.base(0.08, 0.7, 0.08, 0, 0, 0, '#5a3a22').base(0.5, 0.04, 0.5, 0, 0, 0, '#5a3a22')
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K.box(0.15, 0.012, 0.15, -0.225 + i * 0.15, 0.757, -0.225 + j * 0.15, (i + j) % 2 ? '#e9dcc0' : '#2b1d14')
        break
      case 'noticeboard': // community notice board (faces +z)
        K.base(0.1, 1.9, 0.1, -0.85, 0, 0, '#5a3a22').base(0.1, 1.9, 0.1, 0.85, 0, 0, '#5a3a22')
        K.box(1.7, 0.95, 0.06, 0, 1.35, 0, '#6b4428')
        K.box(1.85, 0.12, 0.3, 0, 1.92, 0, '#8d9399')
        for (let i = 0; i < 5; i++) K.box(0.28, 0.36, 0.01, -0.6 + i * 0.3, 1.38 + (i % 2) * 0.12, 0.035, ['#f4f1ea', '#fcd116', '#f4f1ea', '#9cc7d8', '#f4c7c3'][i])
        break
      case 'standpipe': // public standpipe
        K.base(0.6, 0.12, 0.6, 0, 0, 0, '#a8a296')
        K.base(0.2, 0.9, 0.2, 0, 0.12, 0, '#b8b2a6')
        K.box(0.04, 0.04, 0.22, 0, 0.9, 0.12, '#7a7f84')
        break
      default:
        K.base(0.4, 0.4, 0.4, 0, 0, 0, '#ff00ff')
    }
    return K.build()
  })
}
/** props whose AABB would wrongly block walkers (lines, canopies) */
export const PROP_NO_COLLIDE = new Set(['laundry', 'umbrella'])

// ═══════════════════════════════════════════════════════════ vehicles ══════
// nose along +x, base at y 0; body parts baked WHITE so instanceColor tints them
export function vehicleGeometry(k: string): THREE.BufferGeometry {
  return cached(`veh:${k}`, () => {
    const K = new Kit()
    const W = '#ffffff', DARK = '#1e2226', GLASS = '#33414c', TYRE = '#151515'
    const wheels = (xs: number[], zs: number, r: number, w = 0.24) => {
      for (const x of xs) for (const s of [-1, 1]) K.cyl(r, r, w, x, r, s * zs, TYRE, 10, Math.PI / 2)
    }
    if (k === 'trotro') {
      K.box(5.2, 1.15, 2.0, 0, 1.0, 0, W)                     // lower body
      K.box(4.4, 0.95, 1.96, -0.35, 2.05, 0, W)               // passenger box
      K.box(0.9, 0.55, 1.9, 2.15, 1.75, 0, W, 0, 0, -0.45)    // sloped bonnet/screen
      K.box(4.3, 0.55, 2.02, -0.35, 2.05, 0, GLASS)           // side windows band
      K.box(0.05, 0.6, 1.7, 2.62, 1.85, 0, GLASS, 0, 0, -0.45)
      K.box(5.22, 0.14, 2.03, 0, 1.2, 0, '#c8102e')           // painted stripe
      K.box(5.22, 0.08, 2.03, 0, 1.05, 0, '#f1c40f')
      K.box(3.6, 0.06, 1.7, -0.5, 2.6, 0, '#3b3f44')          // roof rack
      K.base(0.8, 0.35, 0.6, -1.2, 2.6, 0.3, '#2e7fa8').base(0.6, 0.3, 0.5, 0.0, 2.6, -0.4, '#7a4a2a').base(0.7, 0.4, 0.55, -2.0, 2.6, -0.2, '#3a9a4a')
      K.box(0.1, 0.18, 0.4, 2.6, 0.95, 0.65, '#fff4c2').box(0.1, 0.18, 0.4, 2.6, 0.95, -0.65, '#fff4c2')
      K.box(0.06, 0.2, 0.3, -2.61, 1.05, 0.7, '#c0281e').box(0.06, 0.2, 0.3, -2.61, 1.05, -0.7, '#c0281e')
      K.box(0.12, 0.3, 2.04, 2.62, 0.55, 0, DARK)             // bumper
      wheels([1.75, -1.65], 0.95, 0.38)
    } else if (k === 'taxi' || k === 'car') {
      K.box(4.3, 0.6, 1.76, 0, 0.66, 0, W)
      K.box(2.2, 0.55, 1.6, -0.25, 1.22, 0, W)
      K.box(2.1, 0.42, 1.64, -0.25, 1.22, 0, GLASS)
      K.box(0.02, 0.4, 1.5, 0.87, 1.2, 0, GLASS, 0, 0, -0.5)
      K.box(0.12, 0.22, 1.8, 2.16, 0.48, 0, DARK).box(0.12, 0.22, 1.8, -2.16, 0.48, 0, DARK)
      K.box(0.06, 0.12, 0.34, 2.17, 0.72, 0.6, '#fff4c2').box(0.06, 0.12, 0.34, 2.17, 0.72, -0.6, '#fff4c2')
      K.box(0.06, 0.12, 0.3, -2.17, 0.74, 0.62, '#c0281e').box(0.06, 0.12, 0.3, -2.17, 0.74, -0.62, '#c0281e')
      if (k === 'taxi') {
        // the Accra taxi's yellow corner panels + roof light
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.75, 0.61, 0.05, sx * 1.78, 0.66, sz * 0.885, '#f5c400')
        for (const sx of [-1, 1]) K.box(0.05, 0.61, 1.77, sx * 2.151, 0.66, 0, '#f5c400')
        K.base(0.5, 0.14, 0.22, -0.25, 1.5, 0, '#f5c400')
      }
      wheels([1.35, -1.35], 0.82, 0.33, 0.22)
    } else if (k === 'okada' || k === 'okada-empty') {
      K.cyl(0.32, 0.32, 0.09, 0.62, 0.32, 0, TYRE, 10, Math.PI / 2).cyl(0.32, 0.32, 0.09, -0.62, 0.32, 0, TYRE, 10, Math.PI / 2)
      K.box(1.0, 0.14, 0.12, 0, 0.62, 0, '#2a2a2a', 0, 0, 0.12)
      K.box(0.55, 0.32, 0.28, -0.05, 0.62, 0, W)                // tank/body (tinted)
      K.box(0.7, 0.1, 0.3, -0.35, 0.86, 0, '#1b1b1b')           // seat
      K.box(0.08, 0.6, 0.08, 0.55, 0.85, 0, '#2a2a2a', 0, 0, -0.3)
      K.box(0.06, 0.05, 0.7, 0.66, 1.12, 0, '#2a2a2a')          // handlebar
      K.box(0.08, 0.1, 0.14, 0.72, 0.92, 0, '#fff4c2')
      if (k === 'okada') { // rider + helmet + passenger bag
        K.box(0.38, 0.12, 0.34, -0.3, 0.96, 0.14, '#24324a').box(0.38, 0.12, 0.34, -0.3, 0.96, -0.14, '#24324a') // thighs
        K.box(0.12, 0.5, 0.12, -0.12, 0.7, 0.24, '#24324a').box(0.12, 0.5, 0.12, -0.12, 0.7, -0.24, '#24324a')
        K.box(0.26, 0.6, 0.4, -0.4, 1.32, 0, W, 0, 0, -0.2)       // torso (tinted shirt)
        K.box(0.5, 0.1, 0.1, -0.05, 1.42, 0.2, '#6e4226', 0, 0, -0.5).box(0.5, 0.1, 0.1, -0.05, 1.42, -0.2, '#6e4226', 0, 0, -0.5)
        K.sphere(0.14, -0.33, 1.78, 0, '#6e4226', 7, 5)
        K.sphere(0.17, -0.35, 1.84, 0, '#c8102e', 7, 5, 1, 0.8, 1)  // helmet
      }
    }
    return K.build()
  })
}
export const VEH_DIMS: Record<string, [number, number, number]> = { trotro: [5.4, 2.1, 2.7], taxi: [4.3, 1.8, 1.6], car: [4.3, 1.8, 1.5], okada: [1.9, 0.7, 1.3] }

// ═════════════════════════════════════════════════════════════ NPC parts ════
// stylised instanced people (same low-poly look as the city's crowd, but
// articulated: torso / head / hair / skirt / head-load + 6 limb segments)
export function npcGeometries() {
  return {
    torso: cached('npc:torso', () => new Kit().add(new THREE.CapsuleGeometry(0.17, 0.34, 2, 6), '#ffffff', [0, 0.3, 0], [0, 0, 0], [1.25, 1, 0.78]).build()),
    head: cached('npc:head', () => new Kit().sphere(0.125, 0, 0, 0, '#ffffff', 7, 5, 0.95, 1.08, 1).box(0.05, 0.05, 0.05, 0, -0.02, 0.12, '#ffffff').build()),
    hair: cached('npc:hair', () => new Kit().sphere(0.135, 0, 0.025, -0.01, '#ffffff', 7, 4, 1, 0.82, 1.02).build()),
    skirt: cached('npc:skirt', () => new Kit().cyl(0.2, 0.33, 0.62, 0, -0.31, 0, '#ffffff', 8).build()),
    load: cached('npc:load', () => new Kit().cyl(0.36, 0.26, 0.12, 0, 0.06, 0, '#ffffff', 12).sphere(0.08, -0.1, 0.13, 0.05, '#d8321f', 5, 4).sphere(0.08, 0.1, 0.14, -0.04, '#e9c54a', 5, 4).sphere(0.08, 0.02, 0.15, 0.12, '#3a9a4a', 5, 4).build()),
    // unit limb: 1 m long hanging DOWN from its joint (scaled per instance)
    limb: cached('npc:limb', () => new Kit().box(0.13, 1, 0.14, 0, -0.5, 0, '#ffffff').build()),
  }
}

// ═══════════════════════════════════════════════════════════════ trees ══════
/** neem: trunk (collides) + broad canopy (above head height → no collider) */
export function neemGeometries() {
  return {
    trunk: cached('neem:trunk', () => {
      const K = new Kit()
      K.cyl(0.26, 0.42, 3.0, 0, 1.5, 0, '#5f4630', 7)
      return K.build()
    }),
    seat: cached('neem:seat', () => {
      const K = new Kit()
      K.cyl(1.25, 1.3, 0.45, 0, 0.225, 0, '#b8b2a6', 14)
      K.cyl(0.6, 0.6, 0.47, 0, 0.235, 0, '#7a6a52', 10)
      return K.build()
    }),
    canopy: cached('neem:canopy', () => {
      const K = new Kit()
      const G = ['#2f6b2c', '#3a7a33', '#2a5f28', '#447f38']
      const blobs: [number, number, number, number][] = [[0, 4.6, 0, 2.6], [1.9, 4.3, 0.6, 1.9], [-1.8, 4.4, -0.4, 2.0], [0.4, 4.4, -1.9, 1.8], [-0.5, 4.3, 1.9, 1.9], [0.2, 5.6, 0.2, 1.8], [1.4, 4.0, -1.4, 1.4], [-1.4, 4.0, 1.3, 1.4]]
      blobs.forEach(([x, y, z, r], i) => K.sphere(r, x, y, z, G[i % 4], 8, 6, 1, 0.62, 1))
      // limbs fork out of the trunk top (above head height → no collider)
      K.cyl(0.12, 0.18, 1.8, 0.7, 3.2, 0.2, '#5f4630', 6, 0, -0.6)
      K.cyl(0.12, 0.18, 1.8, -0.6, 3.3, -0.3, '#5f4630', 6, 0.3, 0.6)
      return K.build()
    }),
  }
}
export function plantainGeometry() {
  return cached('plantain', () => {
    const K = new Kit()
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7
      const x = Math.cos(a) * 0.35, z = Math.sin(a) * 0.35
      K.cyl(0.09, 0.12, 2.2 + (i % 2) * 0.4, x, 1.1, z, '#6f8f3a', 6)
      for (let j = 0; j < 3; j++) {
        const b = a + j * 2.1
        K.box(1.5, 0.02, 0.42, x + Math.cos(b) * 0.7, 2.3 + (i % 2) * 0.4 - j * 0.15, z + Math.sin(b) * 0.7, j % 2 ? '#4f9a3a' : '#5fae44', -b, 0, -0.35)
      }
    }
    return K.build()
  })
}

// ═══════════════════════════════════════════════════════ utility poles ═════
export function poleGeometries() {
  return {
    shaft: cached('pole:shaft', () => new Kit().cyl(0.11, 0.15, 7.2, 0, 3.6, 0, '#6b5236', 7).base(0.34, 0.25, 0.34, 0, 0, 0, '#a8a296').build()),
    top: cached('pole:top', () => {
      const K = new Kit()
      K.box(0.12, 0.12, 1.5, 0, 6.6, 0, '#5a4330')
      for (const z of [-0.6, 0, 0.6]) K.cyl(0.05, 0.06, 0.16, 0, 6.74, z, '#dfe6ea', 6)
      K.box(0.12, 0.1, 1.0, 0, 6.1, 0, '#5a4330')
      return K.build()
    }),
    transformer: cached('pole:tr', () => {
      const K = new Kit()
      K.base(0.7, 0.9, 0.6, 0.45, 4.6, 0, '#7d868c')
      K.box(0.72, 0.06, 0.62, 0.45, 5.53, 0, '#5d666c')
      for (const z of [-0.18, 0, 0.18]) K.cyl(0.04, 0.05, 0.3, 0.45, 5.7, z, '#c9b38a', 5)
      return K.build()
    }),
  }
}

// ═════════════════════════════════════════ satellite dish / AC / tanks ═════
export function rooftopGeometry(k: 'tank' | 'dish' | 'ac' | 'rebar' | 'column'): THREE.BufferGeometry {
  return cached(`roof:${k}`, () => {
    const K = new Kit()
    if (k === 'tank') {
      K.base(1.0, 0.6, 1.0, 0, 0, 0, '#8d8a84')
      K.cyl(0.48, 0.52, 1.05, 0, 1.12, 0, '#1d1f22', 10)
      K.cyl(0.16, 0.16, 0.1, 0, 1.69, 0, '#1d1f22', 8)
    } else if (k === 'dish') {
      K.base(0.06, 0.55, 0.06, 0, 0, 0, '#9aa0a6')
      K.sphere(0.36, 0.1, 0.72, 0, '#e8e8e4', 10, 6, 0.3, 1, 1)
      K.box(0.04, 0.04, 0.35, 0.26, 0.72, 0, '#9aa0a6', 0, 0, 0)
    } else if (k === 'ac') {
      K.base(0.8, 0.55, 0.3, 0, 0, 0, '#e8e6e0')
      K.cyl(0.18, 0.18, 0.02, 0.15, 0.27, 0.16, '#4a4f55', 10, Math.PI / 2)
    } else if (k === 'rebar') {
      for (const [x, z] of [[0, 0], [0.12, 0], [0, 0.12], [0.12, 0.12]]) K.base(0.025, 0.9, 0.025, x - 0.06, 0, z - 0.06, '#5b3a2a')
    } else {
      K.base(0.26, 0.5, 0.26, 0, 0, 0, '#a9a59c')
    }
    return K.build()
  })
}
