// ─── Gyan's room — material library, procedural textures, mood presets ──────
// Everything is generated on a canvas at runtime: no image files, no licences.
import * as THREE from 'three'

export type MatKind = 'wood' | 'stone' | 'fabric' | 'paint'

export interface Swatch {
  id: string
  name: string
  kind: MatKind
  color: string // base colour
  alt?: string // secondary colour (grain / pattern)
  pattern:
    | 'planks'
    | 'slats'
    | 'terrazzo'
    | 'tiles'
    | 'laterite'
    | 'weave'
    | 'kente'
    | 'knit'
    | 'plaster'
    | 'velvet'
    | 'marble'
    | 'concrete'
    | 'chevron'
  rough: number
}

export const SWATCHES: Swatch[] = [
  // wood
  { id: 'honeyOak', name: 'Honey oak', kind: 'wood', color: '#d9a85f', alt: '#b9853f', pattern: 'planks', rough: 0.62 },
  { id: 'whiteOak', name: 'White oak', kind: 'wood', color: '#e6d6bb', alt: '#cdb999', pattern: 'planks', rough: 0.66 },
  { id: 'odum', name: 'Odum', kind: 'wood', color: '#9a5a2c', alt: '#6f3c1a', pattern: 'planks', rough: 0.58 },
  { id: 'walnut', name: 'Walnut', kind: 'wood', color: '#7a4a2a', alt: '#55301a', pattern: 'slats', rough: 0.55 },
  { id: 'smokedOak', name: 'Smoked oak', kind: 'wood', color: '#4a3527', alt: '#30221a', pattern: 'planks', rough: 0.6 },
  { id: 'blackAsh', name: 'Black ash', kind: 'wood', color: '#2c2724', alt: '#1b1715', pattern: 'slats', rough: 0.55 },
  // stone
  { id: 'terrazzo', name: 'Terrazzo', kind: 'stone', color: '#e7e1d6', alt: '#8d7a68', pattern: 'terrazzo', rough: 0.4 },
  { id: 'laterite', name: 'Laterite', kind: 'stone', color: '#a8552f', alt: '#7d3a1d', pattern: 'laterite', rough: 0.9 },
  { id: 'slate', name: 'Slate tile', kind: 'stone', color: '#4b5157', alt: '#3a3f44', pattern: 'tiles', rough: 0.5 },
  { id: 'sandTile', name: 'Sand tile', kind: 'stone', color: '#d8c3a0', alt: '#c2aa82', pattern: 'tiles', rough: 0.45 },
  // fabric
  { id: 'linen', name: 'Linen', kind: 'fabric', color: '#ece6da', alt: '#d9d1c2', pattern: 'weave', rough: 0.95 },
  { id: 'boucle', name: 'Bouclé', kind: 'fabric', color: '#efe9df', alt: '#dcd4c6', pattern: 'knit', rough: 1 },
  { id: 'rustWool', name: 'Rust wool', kind: 'fabric', color: '#c4602e', alt: '#a14b22', pattern: 'weave', rough: 0.95 },
  { id: 'kente', name: 'Kente', kind: 'fabric', color: '#e0a526', alt: '#1f6b3a', pattern: 'kente', rough: 0.9 },
  { id: 'indigo', name: 'Indigo', kind: 'fabric', color: '#2f3f6e', alt: '#24315a', pattern: 'weave', rough: 0.95 },
  { id: 'velvet', name: 'Orange velvet', kind: 'fabric', color: '#d4561f', alt: '#a8401a', pattern: 'velvet', rough: 0.7 },
  { id: 'oatKnit', name: 'Oat knit', kind: 'fabric', color: '#e8dcc6', alt: '#d2c3a8', pattern: 'knit', rough: 1 },
  // paint
  { id: 'sandLime', name: 'Sand limewash', kind: 'paint', color: '#e9d8b8', pattern: 'plaster', rough: 0.95 },
  { id: 'chalk', name: 'Chalk white', kind: 'paint', color: '#f1eee8', pattern: 'plaster', rough: 0.95 },
  { id: 'teal', name: 'Jamestown teal', kind: 'paint', color: '#3f8f8a', pattern: 'plaster', rough: 0.9 },
  { id: 'sunYellow', name: 'Sun yellow', kind: 'paint', color: '#e8b84a', pattern: 'plaster', rough: 0.9 },
  { id: 'clay', name: 'Clay', kind: 'paint', color: '#c27b56', pattern: 'plaster', rough: 0.92 },
  { id: 'charcoal', name: 'Charcoal', kind: 'paint', color: '#34343a', pattern: 'plaster', rough: 0.9 },
  { id: 'navy', name: 'Night navy', kind: 'paint', color: '#25304d', pattern: 'plaster', rough: 0.9 },

  // ── modern range — city apartments, contemporary finishes ────────────────
  // wood
  { id: 'ashGrey', name: 'Ash grey', kind: 'wood', color: '#a3a4a2', alt: '#8b8c8a', pattern: 'planks', rough: 0.6 },
  { id: 'espresso', name: 'Espresso', kind: 'wood', color: '#4a352a', alt: '#33241c', pattern: 'slats', rough: 0.52 },
  { id: 'whitewash', name: 'Whitewash', kind: 'wood', color: '#eae4d8', alt: '#d5ccbc', pattern: 'planks', rough: 0.68 },
  { id: 'herringAsh', name: 'Herringbone ash', kind: 'wood', color: '#c9bfae', alt: '#a89a86', pattern: 'chevron', rough: 0.6 },
  // stone
  { id: 'marbleWhite', name: 'Marble white', kind: 'stone', color: '#f2f1ee', alt: '#c9c9c4', pattern: 'marble', rough: 0.25 },
  { id: 'concreteGrey', name: 'Concrete', kind: 'stone', color: '#b0b0ab', alt: '#96968f', pattern: 'concrete', rough: 0.85 },
  { id: 'mintTile', name: 'Mint tile', kind: 'stone', color: '#bfe0d2', alt: '#9fc9b8', pattern: 'tiles', rough: 0.4 },
  { id: 'basaltTile', name: 'Basalt tile', kind: 'stone', color: '#43464a', alt: '#33363a', pattern: 'tiles', rough: 0.45 },
  { id: 'porcelain', name: 'Porcelain', kind: 'stone', color: '#e9e7e2', alt: '#d3d0c8', pattern: 'tiles', rough: 0.3 },
  // fabric
  { id: 'greyWeave', name: 'Stone weave', kind: 'fabric', color: '#8f9094', alt: '#7c7d81', pattern: 'weave', rough: 0.95 },
  { id: 'blushVelvet', name: 'Blush velvet', kind: 'fabric', color: '#d9a7a2', alt: '#b9827e', pattern: 'velvet', rough: 0.7 },
  { id: 'oliveWeave', name: 'Olive weave', kind: 'fabric', color: '#71754f', alt: '#5d6142', pattern: 'weave', rough: 0.95 },
  { id: 'denimBlue', name: 'Denim', kind: 'fabric', color: '#4a678f', alt: '#3a5276', pattern: 'weave', rough: 0.95 },
  { id: 'mustardVelvet', name: 'Mustard velvet', kind: 'fabric', color: '#c99a33', alt: '#a67d28', pattern: 'velvet', rough: 0.7 },
  { id: 'tealVelvet', name: 'Teal velvet', kind: 'fabric', color: '#2f837c', alt: '#256a64', pattern: 'velvet', rough: 0.7 },
  { id: 'charcoalWeave', name: 'Charcoal weave', kind: 'fabric', color: '#43444a', alt: '#34353a', pattern: 'weave', rough: 0.95 },
  // paint
  { id: 'sageGreen', name: 'Sage green', kind: 'paint', color: '#9caf88', pattern: 'plaster', rough: 0.92 },
  { id: 'metroGrey', name: 'Metro grey', kind: 'paint', color: '#7e838a', pattern: 'plaster', rough: 0.9 },
  { id: 'blushPink', name: 'Blush pink', kind: 'paint', color: '#e6c2ba', pattern: 'plaster', rough: 0.92 },
  { id: 'violetDusk', name: 'Violet dusk', kind: 'paint', color: '#6f5aa8', pattern: 'plaster', rough: 0.88 },
  { id: 'mintPaint', name: 'Mint', kind: 'paint', color: '#bfe0cf', pattern: 'plaster', rough: 0.92 },
  { id: 'coralEmber', name: 'Coral ember', kind: 'paint', color: '#e07856', pattern: 'plaster', rough: 0.9 },
  { id: 'matteBlack', name: 'Matte black', kind: 'paint', color: '#202024', pattern: 'plaster', rough: 0.9 },
  { id: 'doveWhite', name: 'Dove white', kind: 'paint', color: '#f4f2ee', pattern: 'plaster', rough: 0.95 },
  { id: 'slateBlue', name: 'Slate blue', kind: 'paint', color: '#4a5d78', pattern: 'plaster', rough: 0.9 },
  { id: 'mustardPaint', name: 'Mustard', kind: 'paint', color: '#d9a13b', pattern: 'plaster', rough: 0.9 },
]

export const SWATCH = Object.fromEntries(SWATCHES.map((s) => [s.id, s])) as Record<string, Swatch>

// surfaces the player can dress
export type Slot = 'floor' | 'walls' | 'accentWall' | 'upholstery' | 'bedding' | 'rug' | 'woodwork' | 'accents'

export const SLOTS: { id: Slot; label: string; kinds: MatKind[] }[] = [
  { id: 'floor', label: 'Floor', kinds: ['wood', 'stone'] },
  { id: 'walls', label: 'Walls', kinds: ['paint', 'stone'] },
  { id: 'accentWall', label: 'Accent wall', kinds: ['wood', 'paint', 'stone', 'fabric'] },
  { id: 'upholstery', label: 'Sofa', kinds: ['fabric'] },
  { id: 'bedding', label: 'Bedding', kinds: ['fabric'] },
  { id: 'rug', label: 'Rug', kinds: ['fabric'] },
  { id: 'woodwork', label: 'Woodwork', kinds: ['wood'] },
  { id: 'accents', label: 'Cushions', kinds: ['fabric'] },
]

export type RoomMats = Record<Slot, string>

export type MoodId = 'cozy' | 'bright' | 'moody' | 'modern' | 'afrofusion'

export const MOODS: { id: MoodId; label: string; sub: string; mats: RoomMats; hour: number }[] = [
  {
    id: 'cozy', label: 'Cozy', sub: 'golden hour', hour: 18.4,
    mats: { floor: 'honeyOak', walls: 'sandLime', accentWall: 'walnut', upholstery: 'boucle', bedding: 'linen', rug: 'oatKnit', woodwork: 'walnut', accents: 'rustWool' },
  },
  {
    id: 'bright', label: 'Bright', sub: 'midday', hour: 12.8,
    mats: { floor: 'whiteOak', walls: 'chalk', accentWall: 'sandTile', upholstery: 'linen', bedding: 'linen', rug: 'oatKnit', woodwork: 'whiteOak', accents: 'indigo' },
  },
  {
    id: 'moody', label: 'Moody', sub: 'after dark', hour: 22.2,
    mats: { floor: 'smokedOak', walls: 'charcoal', accentWall: 'blackAsh', upholstery: 'velvet', bedding: 'indigo', rug: 'kente', woodwork: 'blackAsh', accents: 'velvet' },
  },
  {
    // contemporary city look — marble, concrete, clean greys, one mustard pop
    id: 'modern', label: 'Modern', sub: 'city clean', hour: 14,
    mats: { floor: 'marbleWhite', walls: 'doveWhite', accentWall: 'ashGrey', upholstery: 'greyWeave', bedding: 'linen', rug: 'denimBlue', woodwork: 'espresso', accents: 'mustardVelvet' },
  },
  {
    // heritage × contemporary — Ghanaian palette on modern silhouettes
    id: 'afrofusion', label: 'Afro-fusion', sub: 'heritage × modern', hour: 17.6,
    mats: { floor: 'odum', walls: 'sageGreen', accentWall: 'kente', upholstery: 'oliveWeave', bedding: 'linen', rug: 'rustWool', woodwork: 'espresso', accents: 'tealVelvet' },
  },
]

// ── mood score: how close the current room reads to each preset (0–100 %) ──
function hexToLab(hex: string): [number, number, number] {
  const c = new THREE.Color(hex)
  const r = c.r, g = c.g, b = c.b // linear already (three converts sRGB hex)
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const warm = r - b
  return [l, warm, Math.max(r, g, b) - Math.min(r, g, b)]
}
export function moodScores(mats: RoomMats, hour: number): Record<MoodId, number> {
  const weights: Record<Slot, number> = { floor: 2, walls: 3, accentWall: 1.5, upholstery: 1, bedding: 0.7, rug: 0.6, woodwork: 1, accents: 0.6 }
  const raw = MOODS.map((m) => {
    let d = 0
    for (const s of Object.keys(weights) as Slot[]) {
      const a = hexToLab(SWATCH[mats[s]].color)
      const b = hexToLab(SWATCH[m.mats[s]].color)
      d += weights[s] * (Math.abs(a[0] - b[0]) * 2.2 + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) * 0.6)
    }
    let dh = Math.abs(hour - m.hour)
    dh = Math.min(dh, 24 - dh)
    d += dh * 0.35
    return Math.exp(-d * 0.22)
  })
  const sum = raw.reduce((a, b) => a + b, 0) || 1
  const pct = raw.map((v) => Math.round((100 * v) / sum))
  // make them add to exactly 100
  const fix = 100 - pct.reduce((a, b) => a + b, 0)
  pct[pct.indexOf(Math.max(...pct))] += fix
  const out = {} as Record<MoodId, number>
  MOODS.forEach((m, i) => {
    out[m.id] = pct[i]
  })
  return out
}

export function moodSentence(mats: RoomMats, scores: Record<MoodId, number>): string {
  const top = (Object.keys(scores) as MoodId[]).sort((a, b) => scores[b] - scores[a])[0]
  const w = SWATCH[mats.walls].name.toLowerCase()
  const f = SWATCH[mats.floor].name.toLowerCase()
  const tail = top === 'cozy' ? 'warm and soft. It reads cozy.' : top === 'bright' ? 'light and airy. It reads bright.' : 'deep and low. It reads moody.'
  return `${cap(w)} walls, ${f} floor: ${tail}`
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ── procedural textures (cached per swatch) ──────────────────────────────────
const texCache = new Map<string, THREE.CanvasTexture>()
let seed = 1
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

export function swatchTexture(id: string): THREE.CanvasTexture {
  const hit = texCache.get(id)
  if (hit) return hit
  const s = SWATCH[id]
  seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0) * 131, 7)
  const N = 256
  const c = document.createElement('canvas')
  c.width = N
  c.height = N
  const g = c.getContext('2d')!
  g.fillStyle = s.color
  g.fillRect(0, 0, N, N)
  const alt = s.alt ?? s.color
  switch (s.pattern) {
    case 'planks':
    case 'slats': {
      const rows = s.pattern === 'planks' ? 4 : 8
      const h = N / rows
      for (let r = 0; r < rows; r++) {
        const shade = (rnd() - 0.5) * 0.18
        g.fillStyle = shadeHex(s.color, shade)
        g.fillRect(0, r * h, N, h)
        g.strokeStyle = alt
        g.globalAlpha = 0.22
        for (let k = 0; k < 6; k++) {
          g.lineWidth = 0.6 + rnd() * 1.2
          g.beginPath()
          const y = r * h + rnd() * h
          g.moveTo(0, y)
          for (let x = 0; x <= N; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + k) * 1.6)
          g.stroke()
        }
        g.globalAlpha = 1
        g.fillStyle = shadeHex(alt, -0.35)
        g.fillRect(0, r * h, N, s.pattern === 'slats' ? 3 : 1.5)
        if (s.pattern === 'planks') {
          const jx = rnd() * N
          g.fillRect(jx, r * h, 1.5, h)
        }
      }
      break
    }
    case 'terrazzo':
      for (let i = 0; i < 520; i++) {
        g.fillStyle = [alt, '#c9b9a6', '#6b6e70', '#b5654a'][i % 4]
        g.globalAlpha = 0.75
        const r = 1 + rnd() * 3.5
        g.beginPath()
        g.ellipse(rnd() * N, rnd() * N, r, r * (0.5 + rnd() * 0.6), rnd() * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
      break
    case 'tiles': {
      const t = N / 4
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = shadeHex(s.color, (rnd() - 0.5) * 0.12)
          g.fillRect(x * t + 1.5, y * t + 1.5, t - 3, t - 3)
        }
      g.fillStyle = shadeHex(alt, -0.2)
      for (let k = 0; k <= 4; k++) {
        g.fillRect(k * t - 1.5, 0, 3, N)
        g.fillRect(0, k * t - 1.5, N, 3)
      }
      break
    }
    case 'laterite':
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = rnd() > 0.5 ? alt : shadeHex(s.color, 0.15)
        g.globalAlpha = 0.5
        g.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 3, 1 + rnd() * 3)
      }
      g.globalAlpha = 1
      break
    case 'weave':
      for (let y = 0; y < N; y += 4)
        for (let x = 0; x < N; x += 4) {
          g.fillStyle = (x + y) % 8 === 0 ? alt : shadeHex(s.color, 0.04)
          g.globalAlpha = 0.55
          g.fillRect(x, y, 4, 2)
        }
      g.globalAlpha = 1
      break
    case 'knit':
      for (let i = 0; i < 2200; i++) {
        g.fillStyle = rnd() > 0.5 ? alt : shadeHex(s.color, 0.06)
        g.globalAlpha = 0.6
        g.beginPath()
        g.arc(rnd() * N, rnd() * N, 1.2 + rnd() * 1.6, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
      break
    case 'kente': {
      // woven strips: gold ground, green/red/black blocks
      const strip = N / 4
      for (let k = 0; k < 4; k++) {
        for (let b = 0; b < 8; b++) {
          const cols = k % 2 === 0 ? ['#e0a526', '#1f6b3a', '#b0262a', '#141414'] : ['#1f6b3a', '#e0a526', '#141414', '#b0262a']
          g.fillStyle = cols[b % 4]
          g.fillRect(k * strip, b * (N / 8), strip, N / 8)
          g.fillStyle = cols[(b + 1) % 4]
          for (let l = 0; l < 4; l++) g.fillRect(k * strip, b * (N / 8) + 4 + l * 7, strip, 2)
        }
        g.fillStyle = '#141414'
        g.fillRect(k * strip, 0, 2, N)
      }
      break
    }
    case 'velvet': {
      const grd = g.createLinearGradient(0, 0, N, N)
      grd.addColorStop(0, shadeHex(s.color, 0.12))
      grd.addColorStop(0.5, s.color)
      grd.addColorStop(1, shadeHex(alt, -0.05))
      g.fillStyle = grd
      g.fillRect(0, 0, N, N)
      break
    }
    case 'plaster':
    default:
      for (let i = 0; i < 900; i++) {
        g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)'
        g.beginPath()
        g.arc(rnd() * N, rnd() * N, 3 + rnd() * 14, 0, Math.PI * 2)
        g.fill()
      }
      break
    case 'marble': {
      // soft grey veins over a near-white ground (polished stone)
      g.fillStyle = shadeHex(s.color, 0.02)
      g.fillRect(0, 0, N, N)
      for (let v = 0; v < 9; v++) {
        g.strokeStyle = rnd() > 0.5 ? alt : shadeHex(alt, 0.12)
        g.globalAlpha = 0.25 + rnd() * 0.3
        g.lineWidth = 0.7 + rnd() * 2.4
        g.beginPath()
        let x = rnd() * N
        let y = -8
        g.moveTo(x, y)
        while (y < N + 8) {
          y += 14 + rnd() * 22
          x += (rnd() - 0.5) * 46
          g.lineTo(x, y)
        }
        g.stroke()
      }
      g.globalAlpha = 1
      break
    }
    case 'concrete': {
      // micro-cement: blotchy tonal patches + fine pores
      for (let i = 0; i < 26; i++) {
        g.fillStyle = shadeHex(s.color, (rnd() - 0.5) * 0.14)
        g.globalAlpha = 0.5
        g.beginPath()
        g.ellipse(rnd() * N, rnd() * N, 20 + rnd() * 60, 14 + rnd() * 44, rnd() * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 0.35
      for (let i = 0; i < 700; i++) {
        g.fillStyle = rnd() > 0.5 ? alt : shadeHex(s.color, -0.1)
        g.fillRect(rnd() * N, rnd() * N, 1.4, 1.4)
      }
      g.globalAlpha = 1
      break
    }
    case 'chevron': {
      // herringbone parquet — modern floor / slat-feature wall
      const u = N / 8
      g.save()
      for (let row = -1; row < 10; row++) {
        for (let col = -1; col < 9; col++) {
          const flip = (row + col) % 2 === 0
          g.save()
          g.translate(col * u * 1.42, row * u * 0.71)
          g.rotate(flip ? Math.PI / 4 : -Math.PI / 4)
          g.fillStyle = shadeHex(s.color, (rnd() - 0.5) * 0.1)
          g.fillRect(-u * 0.62, -u * 0.2, u * 1.24, u * 0.4)
          g.strokeStyle = alt
          g.globalAlpha = 0.35
          g.strokeRect(-u * 0.62, -u * 0.2, u * 1.24, u * 0.4)
          g.restore()
        }
      }
      g.restore()
      g.globalAlpha = 1
      break
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  texCache.set(id, tex)
  return tex
}

/** swatch preview as a CSS background (data URL), for the DOM tray */
const urlCache = new Map<string, string>()
export function swatchURL(id: string): string {
  const hit = urlCache.get(id)
  if (hit) return hit
  const img = (swatchTexture(id).image as HTMLCanvasElement).toDataURL('image/jpeg', 0.8)
  urlCache.set(id, img)
  return img
}

function shadeHex(hex: string, amt: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)))
  return '#' + c.getHexString()
}
