'use client'

// ─── Game-map UI: floating white labels, mission pins, collectibles, checkpoint
// Labels are WebGL sprites (canvas textures) — no DOM portals, always readable.
// Handover fixes: labels scale with distance (capped on screen), fade out when
// the camera gets close, and a per-frame overlap resolver nudges/hides lower
// priority labels instead of stacking them (Airport City/Legon, Circle/MTN…).
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LANDMARKS, type LandmarkDef } from '@/lib/mapConfig'
import { checkerTexture } from '@/lib/mapTextures'
import { markAnimated, unmarkAnimated } from '../world/SceneBatcher'
import { starGeo } from './Landmarks'

// ───────────────────────────────────────────── label sprite (canvas texture) ─
function makeLabelTexture(text: string): { tex: THREE.CanvasTexture; aspect: number } {
  const font = `700 46px Arial, "Helvetica Neue", sans-serif`
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const textW = measure.measureText(text).width
  const w = Math.ceil(textW) + 56
  const h = 78

  const c = document.createElement('canvas')
  c.width = w * 2
  c.height = h * 2
  const g = c.getContext('2d')!
  g.scale(2, 2)

  // soft drop shadow
  g.shadowColor = 'rgba(8, 4, 24, 0.45)'
  g.shadowBlur = 10
  g.shadowOffsetY = 4

  // rounded pill (near-opaque so underlying labels never bleed through)
  const r = h / 2 - 4
  g.beginPath()
  g.roundRect(3, 3, w - 6, h - 6, r)
  g.fillStyle = 'rgba(255,255,255,0.99)'
  g.fill()
  g.shadowColor = 'transparent'
  g.lineWidth = 2
  g.strokeStyle = 'rgba(15,23,42,0.15)'
  g.stroke()

  // text
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#1e293b'
  g.fillText(text, w / 2, h / 2 + 2)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: w / h }
}

// draw order = priority: district landmarks first, small shops last
const LABEL_PRIORITY = [
  'blacksquare', 'arch', 'makola', 'stadium', 'airport', 'airportcity',
  // neighborhood districts (Task 11) rank with the big landmarks — they were
  // missing here, so they fell to priority 99 behind every small shop
  'island', 'nungua', 'adabraka', 'teshie', 'dansoman', 'nima', 'chorkor',
  'lighthouse', 'beach', 'funzone', 'castle', 'oxford', 'chalewote',
  'park', 'theatre', 'mall', 'legon', 'trotro', 'harbor', 'terrace',
  'waterfront', 'circle', 'playground', 'fuel', 'jollof', 'mtn',
]
// Task 13 districts / island / port rank right after the big landmarks
LABEL_PRIORITY.splice(6, 0, 'temaport', 'korle', 'kaneshie', 'mamprobi', 'sakumono', 'estates', 'chorkorharbour', 'chorkorwest')

// ─ label sizing — SCREEN-SPACE capped (portrait-phone safe) ─────────────────
// Bug seen on real iPhone: world-space sizing (max 13 u tall, up to ~100 u wide)
// made pills wider than the whole portrait viewport and let them run off-screen.
// Now the world height is derived from the distance, then hard-capped by BOTH
// a viewport-height fraction and a viewport-width fraction, and the final rect
// is clamped into the safe area (inside screen edges, above the bottom tab bar,
// below the title chip).
const SCALE_PER_DIST = 0.034 // desired world pill height ≈ 3.4% of camera distance
const MIN_WORLD_H = 1.2 // world floor so pills never vanish entirely
const MAX_SCREEN_H = 0.034 // pill height ≤ 3.4% of viewport height (5.2% buried the overview under pills on a 390×844 phone)
const MAX_SCREEN_W = 0.5 // pill width ≤ 50% of viewport width
const NEAR_FADE_START = 30 // begin fading when camera closer than this
const NEAR_FADE_END = 16 // fully gone at this distance
const FAR_HIDE_DIST = 1000 // Task 13: end-on overview ~690 m from the target, far districts ~950 m (max zoom 800); Task 13: overview pulled back to ~560 m for the 620 m plate (max zoom 700); beyond max zoom-out (480): the overview camera sits ~400 m out, so 380 hid nearly every district name there; the overlap resolver declutters instead
const EDGE = 0.03 // NDC margin to keep pills fully on-screen
const ANCHOR_CULL = 0.98 // anchor must be on screen — 1.3 let off-screen landmarks get clamped in and float far from their place
// HUD exclusion zones in CSS px (MapHUD: title chip top, tabs + hint bottom)
const HUD_TOP_PX = 74
const HUD_BOTTOM_PX = 112

function hudSafeRect(): { top: number; bottom: number } {
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    top: 1 - (2 * HUD_TOP_PX) / h,
    bottom: -1 + (2 * HUD_BOTTOM_PX) / h,
  }
}

interface LabelStatic {
  tex: THREE.CanvasTexture
  aspect: number
  phase: number
}

// mutable per-frame runtime — lives in a ref so the React compiler never
// sees us mutating memoized/render-owned values
interface LabelRuntime {
  sprite: THREE.Sprite | null
  mat: THREE.SpriteMaterial | null
  scale: number
  opacity: number
  off: THREE.Vector2
}

interface LabelScratch {
  wp: THREE.Vector3
  proj: THREE.Vector3
  right: THREE.Vector3
  up: THREE.Vector3
  placed: { x: number; y: number; hw: number; hh: number }[]
  offTargets: [number, number][]
}

function LandmarkLabelsInner({
  statics,
  rtRef,
  scratchRef,
  onSelect,
  labelsOn,
}: {
  statics: LabelStatic[]
  rtRef: RefObject<LabelRuntime[]>
  scratchRef: RefObject<LabelScratch | null>
  onSelect: (l: LandmarkDef) => void
  labelsOn: boolean
}) {
  const order = useMemo(() => {
    const idx = LANDMARKS.map((_, i) => i)
    idx.sort((a, b) => {
      const pa = LABEL_PRIORITY.indexOf(LANDMARKS[a].id)
      const pb = LABEL_PRIORITY.indexOf(LANDMARKS[b].id)
      return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb)
    })
    return idx
  }, [])

  useFrame((state, delta) => {
    const rt = rtRef.current
    if (!rt) return
    const sc = scratchRef.current
    if (!sc) return
    const cam = state.camera as THREE.PerspectiveCamera
    const t = state.clock.elapsedTime
    const tanF = Math.tan((cam.fov * Math.PI) / 360)
    const aspect = cam.aspect
    sc.placed.length = 0
    // proof hook buffer holds exactly one frame of final label rects
    const proofBuf = (window as unknown as { __LABEL_RECTS?: Record<string, unknown>[] }).__LABEL_RECTS
    if (proofBuf) proofBuf.length = 0

    for (const i of order) {
      const L = rt[i]
      const lm = LANDMARKS[i]
      const st = statics[i]
      if (!L || !lm || !st || !L.sprite) continue
      const bob = Math.sin(t * 1.3 + st.phase) * 0.28
      sc.wp.set(lm.pos[0], lm.pos[1] + bob, lm.pos[2])
      const dist = cam.position.distanceTo(sc.wp)

      // ─ size: distance-scaled, then hard-capped by screen fractions ─
      let targetScale = Math.max(MIN_WORLD_H, dist * SCALE_PER_DIST)
      const maxH = MAX_SCREEN_H * 2 * dist * tanF
      const maxW = (MAX_SCREEN_W * 2 * dist * tanF * aspect) / st.aspect
      targetScale = Math.min(targetScale, maxH, maxW)

      // ─ fade out close to the camera / behind it / extremely far
      sc.proj.copy(sc.wp).project(cam)
      const behind = dist < 0.5 || sc.proj.z > 1 || sc.proj.z < -1
      const nearFade = THREE.MathUtils.smoothstep(dist, NEAR_FADE_END, NEAR_FADE_START)
      const farFade = 1 - THREE.MathUtils.smoothstep(dist, FAR_HIDE_DIST, FAR_HIDE_DIST + 40)
      // ─ labels switch OFF → every pill fades out fast (same ghost-free
      // path as the overlap hider); the loop still runs so toggling back
      // on is instant and smooth
      let targetOpacity = behind ? 0 : nearFade * farFade
      // a pill resting at partial opacity reads as a ghost (seen at the
      // overview, where several landmarks sit inside the far-fade band):
      // labels are either shown or hidden — the smoothing below animates
      // the change, but the resting state is never in between
      targetOpacity = targetOpacity >= 0.5 ? 1 : 0
      if (!labelsOn) targetOpacity = 0
      const anchorOut =
        !behind &&
        (Math.abs(sc.proj.x) > ANCHOR_CULL || sc.proj.y > ANCHOR_CULL || sc.proj.y < -ANCHOR_CULL)
      if (anchorOut) targetOpacity = 0

      // ─ safe rect in NDC: inside screen edges + clear of the HUD zones
      const safe = hudSafeRect()
      const halfH = targetScale / 2 / (dist * tanF)
      const halfW = halfH * (st.aspect / aspect)
      const minX = -1 + EDGE + halfW
      const maxX = 1 - EDGE - halfW
      const minY = safe.bottom + EDGE + halfH
      const maxY = safe.top - EDGE - halfH

      // ─ screen-space overlap resolution: scale-aware offset ladder, clamped
      // candidates, hide (fast) as last resort
      let oxF = 0
      let oyF = 0
      if (!behind && !anchorOut && nearFade > 0.05 && farFade > 0.05) {
        const cx0 = Math.min(maxX, Math.max(minX, sc.proj.x))
        const cy0 = Math.min(maxY, Math.max(minY, sc.proj.y))
        const ladder: [number, number][] = [
          [0, 0],
          [0, halfH * 2.5], [0, -halfH * 2.5],
          [halfW * 2.5, 0], [-halfW * 2.5, 0],
          [0, halfH * 5], [0, -halfH * 5],
          [halfW * 2.5, halfH * 2.5], [-halfW * 2.5, halfH * 2.5],
          [halfW * 2.5, -halfH * 2.5], [-halfW * 2.5, -halfH * 2.5],
          // (±5 half-widths sideways removed: it parked pills a whole label
          // away from their landmark — better hidden than misleading)
        ]
        let placed_ = false
        for (const [dx, dy] of ladder) {
          const tx = Math.min(maxX, Math.max(minX, cx0 + dx))
          const ty = Math.min(maxY, Math.max(minY, cy0 + dy))
          let hit = false
          for (const p of sc.placed) {
            if (Math.abs(tx - p.x) < halfW + p.hw && Math.abs(ty - p.y) < halfH + p.hh) {
              hit = true
              break
            }
          }
          if (!hit) {
            oxF = tx - sc.proj.x
            oyF = ty - sc.proj.y
            placed_ = true
            sc.placed.push({ x: tx, y: ty, hw: halfW, hh: halfH })
            break
          }
        }
        if (!placed_) targetOpacity = 0
      } else if (!behind && !anchorOut && nearFade > 0.05) {
        sc.placed.push({
          x: Math.min(1, Math.max(-1, sc.proj.x)),
          y: Math.min(1, Math.max(-1, sc.proj.y)),
          hw: 0,
          hh: 0,
        })
      }

      // ─ smooth; hiding is FAST so faded labels never linger as ghosts
      const kShow = 1 - Math.exp(-delta * 9)
      const kHide = 1 - Math.exp(-delta * 26)
      const k = targetOpacity < L.opacity ? kHide : kShow
      L.scale += (targetScale - L.scale) * k
      L.opacity += (targetOpacity - L.opacity) * k
      L.off.x += (oxF * dist * tanF * aspect - L.off.x) * k
      L.off.y += (oyF * dist * tanF - L.off.y) * k

      // camera right/up in world space → screen offset → world offset
      // (target offsets are already NDC-clamped to the safe rect each frame,
      // so no extra magnitude cap is needed here)
      sc.right.set(1, 0, 0).applyQuaternion(cam.quaternion)
      sc.up.set(0, 1, 0).applyQuaternion(cam.quaternion)
      const ex = L.off.x
      const ey = L.off.y

      const s = L.sprite
      s.visible = L.opacity > 0.03 // ghosts never render
      s.position.set(
        sc.wp.x + sc.right.x * ex + sc.up.x * ey,
        sc.wp.y + sc.right.y * ex + sc.up.y * ey,
        sc.wp.z + sc.right.z * ex + sc.up.z * ey
      )
      s.scale.set(L.scale * st.aspect, L.scale, 1)
      if (L.mat) L.mat.opacity = L.opacity

      // ── proof hook: record what is ACTUALLY drawn this frame (final NDC
      // rect after smoothing + clamping) for the automated overlap test
      const w = window as unknown as { __LABEL_RECTS?: Record<string, unknown>[] }
      if (!w.__LABEL_RECTS) w.__LABEL_RECTS = []
      if (s.visible && L.opacity > 0.5) {
        const ndx = ex / (dist * tanF * aspect)
        const ndy = ey / (dist * tanF)
        const hh = (L.scale / 2) / (dist * tanF)
        const hw = hh * (st.aspect / aspect)
        w.__LABEL_RECTS.push({ id: lm.id, x: sc.proj.x + ndx, y: sc.proj.y + ndy, hw, hh })
      }
    }
  })

  return (
    <group>
      {LANDMARKS.map((lm, i) => (
        <sprite
          key={lm.id}
          ref={(sp) => {
            const rt = rtRef.current
            if (!sp || !rt) return
            if (!rt[i]) {
              rt[i] = { sprite: null, mat: null, scale: MIN_WORLD_H, opacity: 1, off: new THREE.Vector2() }
            }
            rt[i].sprite = sp
            rt[i].mat = sp.material as THREE.SpriteMaterial
          }}
          position={lm.pos}
          renderOrder={999}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(lm)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <spriteMaterial map={statics[i].tex} transparent depthTest={false} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

export function LandmarkLabels({
  focusedId,
  onSelect,
  labelsOn = true,
}: {
  focusedId: string | null
  onSelect: (l: LandmarkDef) => void
  labelsOn?: boolean
}) {
  void focusedId
  const statics = useMemo<LabelStatic[]>(
    () =>
      LANDMARKS.map((lm) => {
        const { tex, aspect } = makeLabelTexture(lm.label)
        return { tex, aspect, phase: Math.random() * Math.PI * 2 }
      }),
    []
  )
  const rtRef = useRef<LabelRuntime[]>([])
  const scratchRef = useRef<LabelScratch | null>(null)
  useEffect(() => {
    scratchRef.current = {
      wp: new THREE.Vector3(),
      proj: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      placed: [],
      offTargets: [], // offset ladder is computed per-label from pill size
    }
  }, [])
  return <LandmarkLabelsInner statics={statics} rtRef={rtRef} scratchRef={scratchRef} onSelect={onSelect} labelsOn={labelsOn} />
}

// ───────────────────────────────────────────────────── map pin (mission) ────
// One merged geometry (cone + sphere + highlight dot, vertex-colored) so each
// pin is a single draw call. The pin still bobs/spins as a group.
let pinGeo: THREE.BufferGeometry | null = null
function getPinGeometry(): THREE.BufferGeometry {
  if (pinGeo) return pinGeo
  const cone = new THREE.ConeGeometry(0.55, 1.4, 12)
  cone.translate(0, -0.85, 0)
  cone.rotateX(Math.PI)
  const body = new THREE.SphereGeometry(0.85, 16, 14)
  const dot = new THREE.SphereGeometry(0.26, 10, 10)
  dot.translate(0, 0.18, 0.68)
  const parts = [cone, body, dot]
  // single material tints the whole pin; the highlight dot reads via geometry
  // position (front-facing bump) — visually equivalent at map scale
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!
  cone.dispose()
  body.dispose()
  dot.dispose()
  return merged
}

export function MapPin({
  position,
  color = '#e2372f',
  scale = 1,
}: {
  position: [number, number, number]
  color?: string
  scale?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const geo = useMemo(() => getPinGeometry(), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.38,
        emissive: new THREE.Color(color).multiplyScalar(0.18),
      }),
    [color]
  )
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 1.8 + phase) * 0.45
      ref.current.rotation.y = t * 0.9 + phase
    }
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={geo} material={mat} />
    </group>
  )
}

// ───────────────────────────────────────────── gold collectible star ────────
export function CollectibleStar({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null)
  const geo = useMemo(() => starGeo(1), [])
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 1.6
      ref.current.position.y = position[1] + Math.sin(t * 2 + phase) * 0.35
    }
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#ffcf3f" emissive="#ffb400" emissiveIntensity={1.4} metalness={0.55} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────── race checkpoint (checkered) ──
export function CheckpointFlag({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => checkerTexture(), [])
  const ref = useRef<THREE.Mesh>(null)
  useEffect(() => {
    markAnimated(ref.current)
    return () => unmarkAnimated(ref.current)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) ref.current.rotation.y = Math.sin(t * 2) * 0.28
  })
  return (
    <group position={position}>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 3.8, 6]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh ref={ref} position={[1.05, 3.35, 0]}>
        <planeGeometry args={[2.1, 1.05]} />
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  )
}

// ───────────────────────────────────────────────────── scatter all markers ──
export function GameMarkers() {
  return (
    <group>
      {/* red mission pins */}
      <MapPin position={[-55, 7.5, 27]} />
      <MapPin position={[46, 8, -52]} />
      <MapPin position={[-40, 6.5, -23]} />
      <MapPin position={[-136, 7, 31]} />
      <MapPin position={[135, 8.5, 35]} />
      {/* phase 2 district pins */}
      <MapPin position={[-24, 6.5, -29.5]} />
      <MapPin position={[47, 5.5, 43]} />
      {/* blue delivery pins */}
      <MapPin position={[60, 6, -25]} color="#2e7fd0" />
      <MapPin position={[-18, 6, -50]} color="#2e7fd0" />
      <MapPin position={[14, 6.5, -93]} color="#2e7fd0" />
      <MapPin position={[-89, 7, 26.5]} color="#2e7fd0" />
      {/* phase 2 blue pins */}
      <MapPin position={[68, 6, 6]} color="#2e7fd0" />
      <MapPin position={[-137, 6.5, 15.5]} color="#2e7fd0" />
      <MapPin position={[66, 6, -92.5]} color="#2e7fd0" />
      {/* gold collectible stars */}
      <CollectibleStar position={[72, 3.4, 35.5]} scale={0.9} />
      <CollectibleStar position={[24, 3.2, 19]} scale={0.9} />
      <CollectibleStar position={[-84, 3.4, -3]} scale={0.9} />
      <CollectibleStar position={[-138, 3.4, 26]} scale={0.9} />
      <CollectibleStar position={[128, 3.6, -55]} scale={0.9} />
      <CollectibleStar position={[-100, 3.4, -12]} scale={0.9} />
      <CollectibleStar position={[112, 3.2, -11]} scale={0.9} />
      {/* phase 2 gold stars */}
      <CollectibleStar position={[-72, 3.6, 19]} scale={0.9} />
      <CollectibleStar position={[-78, 3.4, -15]} scale={0.9} />
      <CollectibleStar position={[85, 3.4, -95]} scale={0.9} />
      <CollectibleStar position={[-124.5, 3.4, 4.5]} scale={0.9} />
      <CollectibleStar position={[41, 3.2, 43.8]} scale={0.9} />
      <CollectibleStar position={[68, 3.2, 20]} scale={0.9} />
      {/* race checkpoints — highway + runway threshold */}
      <CheckpointFlag position={[37, 0, 14.5]} />
      <CheckpointFlag position={[-38, 0, -104]} />
    </group>
  )
}
