'use client'

// ─── SET THE MOOD — Gyan's room as a dollhouse you dress by hand ────────────
// Portrait-phone layout (390×844 first). Tap a surface then a swatch, or drag
// a swatch straight onto the room. Pull the sun across the sky with the
// daylight slider. Mood meter (Cozy / Bright / Moody) reacts to every change.
// State persists in localStorage ('chale-room-v1').
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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



import { listHomeFurniture, findFurnitureById } from '../data/furniture'
import { getState, subscribe, buyHomeFurniture } from '../store/gameStore'

/** Furniture marketplace list — reads catalog, buys into home.furnitureIds. */
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
      <div style={{ fontSize: 13, color: '#fcd116', fontWeight: 800 }}>Wallet GHS {balance.toFixed(0)}</div>
      {items.map((f) => {
        const has = owned.includes(f.id)
        const can = !has && balance >= f.costGHS
        return (
          <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px',
            borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.summary}</div>
              <div style={{ fontSize: 12, color: '#fcd116', marginTop: 2 }}>GHS {f.costGHS} · {f.rarity}</div>
            </div>
            <button type="button" disabled={!can && !has}
              onClick={() => buy(f.id)}
              style={{ minWidth: 72, minHeight: 36, borderRadius: 10, border: 'none', fontWeight: 800, cursor: can ? 'pointer' : 'default',
                background: has ? 'rgba(16,185,129,0.25)' : can ? '#fcd116' : 'rgba(100,116,139,0.3)',
                color: has ? '#6ee7b7' : can ? '#0a0f1a' : '#94a3b8' }}>
              {has ? 'Owned' : can ? 'Buy' : 'Need cash'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function SetTheMood() {
  const { mats, hour, selected, apply, preset, select, setHour, undo, redo, past, future } = useMood()
  const scores = useMemo(() => moodScores(mats, hour), [mats, hour])
  const sentence = useMemo(() => moodSentence(mats, scores), [mats, scores])
  // Room tools tabs: mood (materials/daylight) | shop (furniture marketplace)
  const initialTab = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('room') === 'shop')
    ? 'shop' : 'mood'
  const [tab, setTab] = useState<'mood' | 'shop'>(initialTab as 'mood' | 'shop')
  const slotDef = SLOTS.find((s) => s.id === selected)!
  const [tab, setTab] = useState<MatKind>(slotDef.kinds[0])
  const [idle, setIdle] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean; over: Slot | null } | null>(null)
  const lamps = daylight(hour).lamps

  useEffect(() => {
    if (!slotDef.kinds.includes(tab)) setTab(slotDef.kinds[0])
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (msg: string) => {
    setToast(msg)
    window.clearTimeout((flash as unknown as { t?: number }).t)
    ;(flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 1600)
  }
  const tryApply = (slot: Slot, id: string) => {
    const def = SLOTS.find((s) => s.id === slot)!
    const sw = SWATCH[id]
    if (!def.kinds.includes(sw.kind)) {
      flash(`${sw.name} can't go on the ${def.label.toLowerCase()}`)
      return
    }
    apply(slot, id)
    flash(`${def.label} · ${sw.name}`)
  }

  // drag-and-drop from the tray onto the room
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8
      setDrag({ ...drag, x: e.clientX, y: e.clientY, moved, over: moved ? slotAt(e.clientX, e.clientY) : null })
    }
    const up = (e: PointerEvent) => {
      if (drag.moved) {
        const s = slotAt(e.clientX, e.clientY)
        if (s) tryApply(s, drag.id)
      } else {
        tryApply(selected, drag.id)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const hh = Math.floor(hour)
  const mm = Math.floor((hour - hh) * 60)
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  const tabs: MatKind[] = ['wood', 'stone', 'fabric', 'paint']
  const glass = 'rounded-2xl border border-white/10 bg-[#0e1018]/75 backdrop-blur-md'

  return (
    <div className="relative h-[100dvh] w-screen select-none overflow-hidden bg-[#0b0d14] text-white" style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [18, 20, 23], fov: 38, near: 0.5, far: 300 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
        onPointerMissed={() => undefined}
      >
        <Bridge />
        <DaylightRig />
        <group position={[0, 0, 0.6]}>
          <GyanRoom mode="dollhouse" mats={mats} selected={selected} onPick={(s) => select(s)} lampsOn={lamps} />
          {/* the GLB suspends while loading: without its own boundary the
              suspension reached the page and remounted the whole Canvas
              (WebGL context lost → blank screen) */}
          {SHOW_PLAYER && (
            <Suspense fallback={null}>
              <PlayerCharacter position={[-0.3, 0, 0.4]} rotationY={0.5} />
            </Suspense>
          )}
          <Plinth />
        </group>
        <ContactShadows position={[0, -0.9, 0.6]} opacity={0.5} scale={14} blur={2.6} far={2} />
        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={50}
          minPolarAngle={0.5}
          maxPolarAngle={1.15}
          target={[0, LOOK_Y, 0]}
          onStart={() => setIdle(false)}
        />
        <IdleDrift active={idle} />
      </Canvas>

      {/* back to play — mood is an in-room editor only */}
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem('chale.moodOk')
          } catch { /* */ }
          const u = new URL(window.location.href)
          u.searchParams.delete('mood')
          u.searchParams.delete('from')
          window.location.href = u.pathname + (u.search || '') + u.hash
        }}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 40,
          padding: '8px 12px', borderRadius: 10, border: 'none',
          background: 'rgba(0,0,0,0.55)', color: '#fff', fontWeight: 700, fontSize: 13,
        }}
      >
        Back to street
      </button>
      {/* Room tools tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px 0', pointerEvents: 'auto' }}>
        <button type="button" onClick={() => setTab('mood')}
          style={{ flex: 1, minHeight: 40, borderRadius: 12, border: tab==='mood' ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.15)',
            background: tab==='mood' ? 'rgba(252,209,22,0.18)' : 'rgba(9,13,22,0.7)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
          Mood
        </button>
        <button type="button" onClick={() => setTab('shop')}
          style={{ flex: 1, minHeight: 40, borderRadius: 12, border: tab==='shop' ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.15)',
            background: tab==='shop' ? 'rgba(252,209,22,0.18)' : 'rgba(9,13,22,0.7)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
          Furniture shop
        </button>
      </div>

      {tab === 'shop' && (
        <div style={{ pointerEvents: 'auto', margin: 12, maxHeight: '55vh', overflow: 'auto', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(14,16,24,0.92)', padding: 14, color: '#e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
            Marketplace — buy for your room
          </div>
          <FurnitureShop />
        </div>
      )}

      {/* ── top: title, undo/redo, mood meter ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] font-black uppercase leading-none tracking-wide text-white/90">Set the</div>
            <div className="text-[30px] font-black uppercase leading-[0.95] text-[#5fd4ff]">Mood</div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button onClick={undo} disabled={!past.length} className={`${glass} h-9 w-9 text-base disabled:opacity-30`} aria-label="Undo">↶</button>
            <button onClick={redo} disabled={!future.length} className={`${glass} h-9 w-9 text-base disabled:opacity-30`} aria-label="Redo">↷</button>
          </div>
        </div>
        <div className="pointer-events-auto mt-3 grid grid-cols-3 gap-2">
          {MOODS.map((m) => {
            const v = scores[m.id]
            const top = Math.max(scores.cozy, scores.bright, scores.moody) === v
            return (
              <button key={m.id} onClick={() => preset(m.id)} className={`${glass} p-2 text-left transition ${top ? 'border-[#5fd4ff]/70 bg-white/10' : ''}`}>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  {(['floor', 'walls', 'accentWall', 'accents'] as Slot[]).map((s) => (
                    <span key={s} className="flex-1" style={{ background: SWATCH[m.mats[s]].color }} />
                  ))}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] font-bold">{m.label}</span>
                  <span className="font-mono text-[11px] text-[#5fd4ff]">{v}%</span>
                </div>
                <div className="font-mono text-[9px] text-white/50">{m.sub}</div>
                <div className="mt-1 h-1 rounded-full bg-white/10">
                  <div className="h-1 rounded-full bg-[#5fd4ff] transition-all" style={{ width: `${v}%` }} />
                </div>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-white/80">{sentence}</p>
      </div>

      {/* ── toast ── */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 font-mono text-[11px] text-white backdrop-blur">
          {toast}
        </div>
      )}

      {/* ── bottom sheet ── */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* daylight */}
        <div className={`${glass} px-3 py-2`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Daylight</span>
            <span className="font-mono text-[13px] font-bold">{clock}</span>
          </div>
          <input
            type="range"
            min={5}
            max={23.9}
            step={0.05}
            value={hour}
            onChange={(e) => setHour(parseFloat(e.target.value))}
            className="mood-range mt-1.5 w-full"
            aria-label="Time of day"
          />
          <div className="mt-1 grid grid-cols-4 gap-1">
            {[
              ['AM', 'Morning', 7.6],
              ['MD', 'Midday', 12.8],
              ['PM', 'Evening', 18.5],
              ['NT', 'Night', 22.2],
            ].map(([ic, label, h]) => {
              const on = Math.abs(hour - (h as number)) < 1.2
              return (
                <button key={label as string} onClick={() => setHour(h as number)} className={`rounded-lg py-1 text-[10px] ${on ? 'bg-white/15 text-white' : 'text-white/55'}`}>
                  <span className="mr-1">{ic}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* surfaces + swatches */}
        <div className={`${glass} p-2.5`}>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none]">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                onClick={() => select(s.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11px] ${selected === s.id ? 'bg-[#5fd4ff] font-bold text-[#0b0d14]' : 'bg-white/8 text-white/75'}`}
              >
                <span className="h-4 w-4 rounded-full border border-black/20 bg-cover" style={{ backgroundImage: `url(${swatchURL(mats[s.id])})` }} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="mb-2 flex gap-1">
            {tabs.map((t) => {
              const allowed = slotDef.kinds.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3 py-1 text-[11px] capitalize ${tab === t ? 'bg-white text-[#0b0d14] font-bold' : allowed ? 'text-white/80' : 'text-white/30'}`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
            {SWATCHES.filter((s) => s.kind === tab).map((s) => {
              const on = mats[selected] === s.id
              return (
                <div
                  key={s.id}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setDrag({ id: s.id, x: e.clientX, y: e.clientY, moved: false, over: null })
                  }}
                  className="w-[62px] shrink-0 cursor-grab text-center"
                >
                  <div
                    className={`mx-auto h-[52px] w-[52px] rounded-xl bg-cover shadow-lg ${on ? 'ring-2 ring-[#5fd4ff] ring-offset-2 ring-offset-[#0e1018]' : ''}`}
                    style={{ backgroundImage: `url(${swatchURL(s.id)})` }}
                  />
                  <div className={`mt-1 truncate text-[10px] ${on ? 'text-[#5fd4ff]' : 'text-white/70'}`}>{on ? '• ' : ''}{s.name}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 text-center font-mono text-[9.5px] text-white/45">tap a surface, then a swatch, or drag a swatch onto the room</div>
        </div>
      </div>

      {/* ── drag ghost ── */}
      {drag?.moved && (
        <div className="pointer-events-none fixed z-50" style={{ left: drag.x - 30, top: drag.y - 70 }}>
          <div className="h-[60px] w-[60px] rounded-xl border-2 border-white bg-cover shadow-2xl" style={{ backgroundImage: `url(${swatchURL(drag.id)})` }} />
          <div className="mt-1 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-center font-mono text-[10px]">
            {drag.over ? `drop on ${SLOTS.find((s) => s.id === drag.over)!.label.toLowerCase()}` : SWATCH[drag.id].name}
          </div>
        </div>
      )}

      <style>{`
        .mood-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:9px;
          background:linear-gradient(90deg,#f3c99a,#d9e9f5 40%,#f08a4b 72%,#141a36)}
        .mood-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;
          background:#fff;border:3px solid #5fd4ff;box-shadow:0 2px 8px rgba(0,0,0,.5)}
        .mood-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #5fd4ff}
      `}</style>
    </div>
  )
}
