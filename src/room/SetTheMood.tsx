'use client'

// ─── SET THE MOOD — Gyan's room as a dollhouse you dress by hand ────────────
// Portrait-phone layout (390×844 first). Tap a surface then a swatch, or drag
// a swatch straight onto the room. Pull the sun across the sky with the
// daylight slider. Mood meter (Cozy / Bright / Moody) reacts to every change.
// State persists in localStorage ('chale-room-v1').
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { create } from 'zustand'
import { listHomeFurniture, findFurnitureById } from '../data/furniture'
import { getState, subscribe, buyHomeFurniture } from '../store/gameStore'
import { GyanRoom, ROOM } from './GyanRoom'
import {
  MOODS, SLOTS, SWATCH, SWATCHES, moodScores, moodSentence, swatchURL,
  type MatKind, type MoodId, type RoomMats, type Slot,
} from './materials'
import { PlayerCharacter } from '../components/world/PlayerCharacter'

// ?nochar=1 hides the player (the headless SwiftShader proof renderer on ARM
// crashes its GPU process on skinned meshes; real phones are unaffected)
const SHOW_PLAYER = typeof window === 'undefined' || !new URLSearchParams(window.location.search).get('nochar')

// ── store ────────────────────────────────────────────────────────────────────
interface MoodState {
  mats: RoomMats
  hour: number
  selected: Slot
  past: RoomMats[]
  future: RoomMats[]
  apply: (slot: Slot, id: string) => void
  preset: (m: MoodId) => void
  select: (s: Slot) => void
  setHour: (h: number) => void
  undo: () => void
  redo: () => void
}
const KEY = 'chale-room-v1'
function load(): { mats: RoomMats; hour: number } {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
    if (raw) {
      const v = JSON.parse(raw)
      if (v.mats && Object.values(v.mats).every((id) => SWATCH[id as string])) return v
    }
  } catch {
    /* ignore */
  }
  return { mats: { ...MOODS[0].mats }, hour: MOODS[0].hour }
}
export const useMood = create<MoodState>((set, get) => ({
  ...load(),
  selected: 'floor',
  past: [],
  future: [],
  apply: (slot, id) => {
    const { mats, past } = get()
    if (mats[slot] === id) return
    set({ mats: { ...mats, [slot]: id }, past: [...past.slice(-40), mats], future: [], selected: slot })
  },
  preset: (m) => {
    const p = MOODS.find((x) => x.id === m)!
    const { mats, past } = get()
    set({ mats: { ...p.mats }, hour: p.hour, past: [...past.slice(-40), mats], future: [] })
  },
  select: (s) => set({ selected: s }),
  setHour: (h) => set({ hour: h }),
  undo: () => {
    const { past, mats, future } = get()
    if (!past.length) return
    set({ mats: past[past.length - 1], past: past.slice(0, -1), future: [mats, ...future] })
  },
  redo: () => {
    const { past, mats, future } = get()
    if (!future.length) return
    set({ mats: future[0], future: future.slice(1), past: [...past, mats] })
  },
}))
if (typeof window !== 'undefined') {
  // tooling/proof hook: lets automated demos drive the editor
  ;(window as unknown as Record<string, unknown>).__MOOD_STORE = useMood
  useMood.subscribe((s) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ mats: s.mats, hour: s.hour }))
    } catch {
      /* private mode */
    }
  })
}

// ── daylight model ───────────────────────────────────────────────────────────
const SKY: [number, string, string][] = [
  // hour, sky top, sky bottom
  [0, '#070b18', '#131a30'],
  [5.5, '#1a2140', '#4a3a5c'],
  [7, '#9fb6d8', '#f3c99a'],
  [12.5, '#7fb2e0', '#d9e9f5'],
  [17, '#7a8fc0', '#f4c58c'],
  [18.6, '#3b3a6a', '#f08a4b'],
  [20, '#141a36', '#3a2c4a'],
  [24, '#070b18', '#131a30'],
]
function lerpSky(h: number): [THREE.Color, THREE.Color] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, a0, b0] = SKY[i]
    const [h1, a1, b1] = SKY[i + 1]
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0)
      return [new THREE.Color(a0).lerp(new THREE.Color(a1), t), new THREE.Color(b0).lerp(new THREE.Color(b1), t)]
    }
  }
  return [new THREE.Color(SKY[0][1]), new THREE.Color(SKY[0][2])]
}
export function daylight(h: number) {
  const dayT = (h - 6) / 12 // 0 sunrise … 1 sunset
  const elev = Math.sin(Math.PI * Math.min(1, Math.max(0, dayT)))
  const isDay = dayT > 0 && dayT < 1
  const az = Math.PI * (0.15 + 0.7 * Math.min(1, Math.max(0, dayT))) // east → west
  const sunPos = new THREE.Vector3(-Math.cos(az) * 14, 2 + elev * 14, 6 - Math.sin(az) * 4)
  const warm = 1 - elev // low sun = warm
  const sunColor = new THREE.Color('#fff6e8').lerp(new THREE.Color('#ff9a4a'), Math.pow(warm, 1.6))
  const sunI = isDay ? 0.4 + elev * 2.6 : 0
  const dark = isDay ? Math.max(0, 1 - elev * 3.2) : 1
  return { sunPos, sunColor, sunI, ambient: 0.18 + elev * 0.55, lamps: dark, sky: lerpSky(h) }
}

function DaylightRig() {
  const hour = useMood((s) => s.hour)
  const sun = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.HemisphereLight>(null)
  const { scene } = useThree()
  const bg = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 256
    return { c, tex: new THREE.CanvasTexture(c) }
  }, [])
  useEffect(() => {
    const d = daylight(hour)
    const g = bg.c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, 256)
    grd.addColorStop(0, '#' + d.sky[0].getHexString())
    grd.addColorStop(1, '#' + d.sky[1].getHexString())
    g.fillStyle = grd
    g.fillRect(0, 0, 4, 256)
    bg.tex.colorSpace = THREE.SRGBColorSpace
    bg.tex.needsUpdate = true
    scene.background = bg.tex
    if (sun.current) {
      sun.current.position.copy(d.sunPos)
      sun.current.color.copy(d.sunColor)
      sun.current.intensity = d.sunI
    }
    if (amb.current) amb.current.intensity = d.ambient
  }, [hour, bg, scene])
  return (
    <>
      <hemisphereLight ref={amb} args={['#cfd8ff', '#3a2e28', 0.5]} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[8, 6, 10]} intensity={0.25} color="#9bb3ff" />
    </>
  )
}

// exposes the r3f camera/scene to the DOM drag-and-drop layer
const r3f: { camera: THREE.Camera | null; scene: THREE.Scene | null; el: HTMLElement | null } = { camera: null, scene: null, el: null }
function Bridge() {
  const { camera, scene, gl } = useThree()
  useEffect(() => {
    r3f.camera = camera
    r3f.scene = scene
    r3f.el = gl.domElement
    ;(window as unknown as Record<string, unknown>).__MOOD = { gl, scene, camera }
  }, [camera, scene, gl])
  return null
}
function slotAt(clientX: number, clientY: number): Slot | null {
  if (!r3f.camera || !r3f.scene || !r3f.el) return null
  const r = r3f.el.getBoundingClientRect()
  const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  const rc = new THREE.Raycaster()
  rc.setFromCamera(ndc, r3f.camera)
  for (const hit of rc.intersectObjects(r3f.scene.children, true)) {
    let o: THREE.Object3D | null = hit.object
    while (o) {
      if (o.userData?.slot) return o.userData.slot as Slot
      o = o.parent
    }
  }
  return null
}

// distance that fits the whole diorama (≈ 5.4 m radius) across a portrait
// screen's narrow horizontal field of view
const LOOK_Y = -1.6 // look below the room so it sits above the bottom sheet
function fitDistance(cam: THREE.PerspectiveCamera) {
  const vHalf = (cam.fov * Math.PI) / 360
  const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect)
  return Math.min(48, Math.max(16, 6.1 / Math.tan(Math.min(vHalf, hHalf))))
}

// a slow idle drift so the diorama feels alive (stops while the user orbits)
function IdleDrift({ active }: { active: boolean }) {
  const { camera } = useThree()
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!active) return
    t.current += dt
    const a = 0.62 + Math.sin(t.current * 0.18) * 0.07
    const R = fitDistance(camera as THREE.PerspectiveCamera)
    camera.position.set(Math.sin(a) * R * 0.78, R * 0.62, Math.cos(a) * R * 0.78)
    camera.lookAt(0, LOOK_Y, 0)
  })
  return null
}

function Plinth() {
  return (
    <group>
      <mesh position={[0, -0.45, 0]} receiveShadow castShadow>
        <boxGeometry args={[ROOM.w + 0.9, 0.9, ROOM.d + 0.9]} />
        <meshStandardMaterial color="#14121a" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w + 0.9, ROOM.d + 0.9]} />
        <meshStandardMaterial color="#1d1a24" roughness={0.9} />
      </mesh>
      {/* gold rim line, Ghana-flag stripe on the front face */}
      <mesh position={[0, -0.12, (ROOM.d + 0.9) / 2 + 0.002]}>
        <planeGeometry args={[ROOM.w + 0.9, 0.025]} />
        <meshStandardMaterial color="#fcd116" emissive="#fcd116" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}





/** Furniture marketplace — House Control style tiles. */
function FurnitureShop() {
  const [owned, setOwned] = useState<readonly string[]>(() => getState().home.furnitureIds)
  const [balance, setBalance] = useState(() => getState().wallet.balanceGHS)
  useEffect(() => {
    return subscribe(() => {
      setOwned(getState().home.furnitureIds)
      setBalance(getState().wallet.balanceGHS)
    })
  }, [])
  const items = listHomeFurniture()
  const buy = (id: string) => {
    const item = findFurnitureById(id)
    if (!item) return
    if (buyHomeFurniture(id, item.costGHS)) {
      setOwned(getState().home.furnitureIds)
      setBalance(getState().wallet.balanceGHS)
    }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Wallet GHS {balance.toFixed(0)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((f) => {
          const has = owned.includes(f.id)
          const can = !has && balance >= f.costGHS
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => buy(f.id)}
              disabled={!can && !has}
              style={{
                textAlign: 'left',
                padding: '12px 12px',
                borderRadius: 14,
                border: has ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.1)',
                background: has ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                color: '#e8eef7',
                cursor: can || has ? 'pointer' : 'default',
                opacity: can || has ? 1 : 0.55,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>GHS {f.costGHS}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, color: has ? '#6ee7b7' : can ? '#fcd116' : 'rgba(255,255,255,0.35)' }}>
                {has ? 'Owned' : can ? 'Buy' : 'Need cash'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Room editor — House Control–inspired layout:
 *   3D dollhouse on top, dark glass panel below with scene chips + tiles.
 * Tap a surface in 3D to select it; scene chips set the whole mood at once.
 */
export default function SetTheMood() {
  const { mats, hour, selected, apply, preset, select, setHour, undo, redo, past, future } = useMood()
  const scores = useMemo(() => moodScores(mats, hour), [mats, hour])
  const sentence = useMemo(() => moodSentence(mats, scores), [mats, scores])
  const lamps = daylight(hour).lamps

  // Panel tab: surfaces (paint) | lights (daylight) | shop (furniture)
  const [panel, setPanel] = useState<'surfaces' | 'lights' | 'shop'>(() => {
    if (typeof window === 'undefined') return 'surfaces'
    return new URLSearchParams(window.location.search).get('room') === 'shop' ? 'shop' : 'surfaces'
  })
  const slotDef = SLOTS.find((s) => s.id === selected)!
  const [matKind, setMatKind] = useState<MatKind>(slotDef.kinds[0])
  useEffect(() => {
    if (!slotDef.kinds.includes(matKind)) setMatKind(slotDef.kinds[0])
  }, [selected, slotDef, matKind])

  const goStreet = () => {
    try {
      sessionStorage.removeItem('chale.moodOk')
    } catch {
      /* */
    }
    const u = new URL(window.location.href)
    u.searchParams.delete('mood')
    u.searchParams.delete('room')
    u.searchParams.delete('from')
    window.location.href = u.pathname + (u.search ? u.search : '') + u.hash
  }

  const kinds: MatKind[] = ['wood', 'stone', 'fabric', 'paint']
  const sceneChips: { id: MoodId; label: string }[] = [
    { id: 'bright', label: 'Bright' },
    { id: 'cozy', label: 'Cozy' },
    { id: 'moody', label: 'Night' },
  ]

  const chipBase: CSSProperties = {
    minHeight: 40,
    padding: '0 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <div
      className="relative h-[100dvh] w-screen select-none overflow-hidden bg-[#0a0c12] text-white"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── 3D dollhouse (upper half) ── */}
      <div style={{ position: 'absolute', inset: 0, bottom: '42%' }}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false }}
          camera={{ position: [4.2, 3.6, 4.8], fov: 42, near: 0.1, far: 40 }}
          onPointerMissed={() => { /* keep last selection */ }}
        >
          <color attach="background" args={['#0a0c12']} />
          <ambientLight intensity={0.35 + lamps * 0.15} />
          <directionalLight position={[4, 8, 2]} intensity={0.55 + lamps * 0.35} color="#fff1d6" />
          <Suspense fallback={null}>
            <GyanRoom mode="dollhouse" mats={mats} selected={selected} onPick={select} lampsOn={lamps} />
            <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={12} blur={2.4} far={4} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minPolarAngle={0.35}
            maxPolarAngle={1.35}
            minDistance={4}
            maxDistance={11}
            target={[0, 1.1, 0]}
          />
          <DaylightRig />
        </Canvas>
      </div>

      {/* Top chrome */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(10px, env(safe-area-inset-top)) 12px 8px',
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={goStreet}
          style={{
            ...chipBase,
            pointerEvents: 'auto',
            background: 'rgba(14,16,24,0.82)',
            backdropFilter: 'blur(10px)',
          }}
        >
          Back
        </button>
        <div
          style={{
            pointerEvents: 'none',
            background: 'rgba(14,16,24,0.82)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: '8px 14px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          Room
        </div>
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          <button type="button" onClick={undo} disabled={!past.length} style={{ ...chipBase, opacity: past.length ? 1 : 0.35, background: 'rgba(14,16,24,0.82)' }}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!future.length} style={{ ...chipBase, opacity: future.length ? 1 : 0.35, background: 'rgba(14,16,24,0.82)' }}>
            Redo
          </button>
        </div>
      </div>

      {/* ── Bottom glass panel (House Control style) ── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          maxHeight: '58%',
          overflowY: 'auto',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          background: 'rgba(12,14,22,0.94)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.45)',
          padding: '14px 14px calc(14px + env(safe-area-inset-bottom))',
          pointerEvents: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Scene chips — one tap sets the whole mood */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
          Scenes
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {sceneChips.map((c) => {
            const on = scores[c.id] >= Math.max(scores.cozy, scores.bright, scores.moody) - 0.02 && scores[c.id] > 0.4
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => preset(c.id)}
                style={{
                  ...chipBase,
                  background: on ? 'rgba(252,209,22,0.2)' : 'rgba(255,255,255,0.06)',
                  border: on ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.12)',
                  color: on ? '#fcd116' : 'rgba(255,255,255,0.85)',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Panel tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {([
            ['surfaces', 'Surfaces'],
            ['lights', 'Lights'],
            ['shop', 'Shop'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 12,
                border: panel === id ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.1)',
                background: panel === id ? 'rgba(252,209,22,0.16)' : 'rgba(255,255,255,0.04)',
                color: panel === id ? '#fcd116' : 'rgba(255,255,255,0.8)',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mood sentence */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.35 }}>
          {sentence}
        </div>

        {panel === 'surfaces' && (
          <div>
            {/* Slot picker */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
              {SLOTS.map((s) => {
                const on = selected === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => select(s.id)}
                    style={{
                      ...chipBase,
                      background: on ? 'rgba(95,212,255,0.18)' : 'rgba(255,255,255,0.05)',
                      border: on ? '1px solid #5fd4ff' : '1px solid rgba(255,255,255,0.1)',
                      color: on ? '#5fd4ff' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
            {/* Mat kind + swatches */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {kinds.filter((k) => slotDef.kinds.includes(k)).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMatKind(k)}
                  style={{
                    ...chipBase,
                    textTransform: 'capitalize',
                    background: matKind === k ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: matKind === k ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SWATCHES.filter((s) => s.kind === matKind).map((s) => {
                const on = mats[selected] === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => apply(selected, s.id)}
                    title={s.name}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 12,
                      border: on ? '2px solid #fcd116' : '1px solid rgba(255,255,255,0.12)',
                      background: s.color,
                      cursor: 'pointer',
                      boxShadow: on ? '0 0 0 2px rgba(252,209,22,0.35)' : undefined,
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {panel === 'lights' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Daylight
            </div>
            <input
              type="range"
              min={5}
              max={23}
              step={0.1}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#fcd116' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
              {(
                [
                  ['AM', 7.6],
                  ['Mid', 12.8],
                  ['Eve', 18.4],
                  ['Night', 22.2],
                ] as const
              ).map(([label, h]) => {
                const on = Math.abs(hour - h) < 1.2
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setHour(h)}
                    style={{
                      ...chipBase,
                      flex: 1,
                      background: on ? 'rgba(252,209,22,0.18)' : 'rgba(255,255,255,0.05)',
                      border: on ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.1)',
                      color: on ? '#fcd116' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Lamps {Math.round(lamps * 100)}% · Hour {hour.toFixed(1)}
            </div>
          </div>
        )}

        {panel === 'shop' && <FurnitureShop />}
      </div>
    </div>
  )
}
