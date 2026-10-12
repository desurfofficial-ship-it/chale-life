// ─── Sign atlas (Task 12) — every business signboard shares ONE texture ─────
// Business signs (chop bars, hotels, supermarkets, FOR SALE boards…) draw
// their text into slots of a single 2048×2048 canvas. Each sign is a plane
// whose UVs point at its slot, with a white vertex-colour attribute, and the
// shared material is tagged `facadeTag = 'signs'` so SceneBatcher merges ALL
// signboards in the city into one draw call (same path as the facade atlas).
import * as THREE from 'three'

const W = 2048
const H = 4096 // Task 13: 168 slots (salons, barbers, gyms, cafés, clubs, port + plot boards)
const SW = 512 // slot width (px)
const SH = 64 // slot height (px) — Task 14: 64 (was 72 / 96) → 4 × 64 = 256 slots (the community pass added ~30 signs)
const COLS = W / SW // 4
const ROWS = Math.floor(H / SH) // 64 rows → 256 slots

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let texture: THREE.CanvasTexture | null = null
let material: THREE.MeshStandardMaterial | null = null
const slots = new Map<string, { u0: number; u1: number; v0: number; v1: number }>()

function ensure() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  material = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: new THREE.Color('#8a8a8a'),
    emissiveIntensity: 0.75,
    roughness: 0.6,
    metalness: 0,
    vertexColors: true,
  })
  material.userData.facadeTag = 'signs'
}

function drawSlot(i: number, text: string, bg: string, fg: string) {
  const g = ctx!
  const x = (i % COLS) * SW
  const y = Math.floor(i / COLS) * SH
  g.fillStyle = bg
  g.fillRect(x, y, SW, SH)
  // thin darker band + inner border = painted-board look
  g.fillStyle = 'rgba(0,0,0,0.16)'
  g.fillRect(x, y + SH - 10, SW, 10)
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 4
  g.strokeRect(x + 6, y + 6, SW - 12, SH - 12)
  g.fillStyle = fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let size = 38
  g.font = `bold ${size}px Arial, sans-serif`
  while (g.measureText(text).width > SW - 40 && size > 22) {
    size -= 2
    g.font = `bold ${size}px Arial, sans-serif`
  }
  g.fillText(text, x + SW / 2, y + SH / 2 - 2, SW - 30)
}

/** UV rect of a sign's slot (allocates + draws on first use) */
function slotFor(text: string, bg: string, fg: string) {
  ensure()
  const key = `${text}|${bg}|${fg}`
  let s = slots.get(key)
  if (!s) {
    const i = slots.size
    if (i >= COLS * ROWS) {
      // overflow — reuse the last slot rather than crash (raise H if hit)
      console.warn('[signAtlas] slot overflow:', text)
      return [...slots.values()][slots.size - 1]
    }
    drawSlot(i, text, bg, fg)
    texture!.needsUpdate = true
    const px = (i % COLS) * SW
    const py = Math.floor(i / COLS) * SH
    const inset = 1.5
    s = {
      u0: (px + inset) / W,
      u1: (px + SW - inset) / W,
      v1: 1 - (py + inset) / H, // canvas y down → texture v up (flipY)
      v0: 1 - (py + SH - inset) / H,
    }
    slots.set(key, s)
  }
  return s
}

const geoCache = new Map<string, THREE.BufferGeometry>()

/** plane w×h (centred, facing +z) textured with the sign's slot */
export function signGeometry(text: string, bg: string, fg: string, w: number, h: number): THREE.BufferGeometry {
  const key = `${text}|${bg}|${fg}|${w}|${h}`
  let g = geoCache.get(key)
  if (!g) {
    const r = slotFor(text, bg, fg)
    g = new THREE.PlaneGeometry(w, h)
    const uv = g.attributes.uv as THREE.BufferAttribute
    // PlaneGeometry uv order: (0,1) (1,1) (0,0) (1,0)
    uv.setXY(0, r.u0, r.v1)
    uv.setXY(1, r.u1, r.v1)
    uv.setXY(2, r.u0, r.v0)
    uv.setXY(3, r.u1, r.v0)
    uv.needsUpdate = true
    const n = g.attributes.position.count
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(n * 3).fill(1), 3))
    geoCache.set(key, g)
  }
  return g
}

export function getSignMaterial(): THREE.MeshStandardMaterial {
  ensure()
  return material!
}
