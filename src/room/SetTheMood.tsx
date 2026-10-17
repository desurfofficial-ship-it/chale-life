'use client'

// ─── SET THE MOOD — Gyan's room as a dollhouse you dress by hand ────────────
// Portrait-phone layout (390×844 first). Tap a surface then a swatch, or drag
// a swatch straight onto the room. Pull the sun across the sky with the
// daylight slider. Mood meter reacts to every change.
//
// Tabs: Devices (real toggles — ceiling lamp / desk lamp / fan drive the 3D
// room), Surfaces (paint), Day (daylight), Shop (furniture that renders the
// moment you buy it). State persists via roomPrefs (shared with the walkable
// world room) + localStorage ('chale-room-v1').
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { create } from 'zustand'
import { listHomeFurniture, findFurnitureById, comfortPctFromOwned } from '../data/furniture'
import { useStoreSnapshot, buyHomeFurniture, getState } from '../store/gameStore'
import {
  requestPlaceHomeFurniture,
  requestMoveHomeFurniture,
  requestRotateHomeFurniture,
  requestRemoveHomeFurniture,
  selectHomeFurniture,
  clearHomeFeedback,
  getHomeLayoutState,
  subscribeHomeLayout,
} from './homeLayoutStore'
import {
  HOME_ZONES,
  zoneUnlocked,
  deviceUnlocked,
  type ZoneDevice,
  type ZoneId,
} from '../data/roomZones'
import { findHousingTierById } from '../data/housing'
import { GyanRoom, ROOM } from './GyanRoom'
import {
  MOODS, SLOTS, SWATCH, SWATCHES, moodScores, moodSentence,
  type MatKind, type MoodId, type RoomMats, type Slot,
} from './materials'
import { loadRoomMats, saveRoomMats, loadRoomDevices, saveRoomDevices, type RoomDevices } from './roomPrefs'

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
export const useMood = create<MoodState>((set, get) => ({
  ...loadRoomMats(),
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
    saveRoomMats(s.mats, s.hour)
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
// P3-4: the hour slider calls daylight() on every drag tick — the returned
// Colors/Vector3 are reusable module temps (callers copy out of them).
const _skyTop = new THREE.Color()
const _skyBottom = new THREE.Color()
const _skyA = new THREE.Color()
const _skyB = new THREE.Color()
const _sunPos = new THREE.Vector3()
const _sunColor = new THREE.Color()
const _SUN_WARM_FROM = new THREE.Color('#fff6e8')
const _SUN_WARM_TO = new THREE.Color('#ff9a4a')
function lerpSky(h: number): [THREE.Color, THREE.Color] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, a0, b0] = SKY[i]
    const [h1, a1, b1] = SKY[i + 1]
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0)
      return [_skyTop.set(a0).lerp(_skyA.set(a1), t), _skyBottom.set(b0).lerp(_skyB.set(b1), t)]
    }
  }
  return [_skyTop.set(SKY[0][1]), _skyBottom.set(SKY[0][2])]
}
export function daylight(h: number) {
  const dayT = (h - 6) / 12 // 0 sunrise … 1 sunset
  const elev = Math.sin(Math.PI * Math.min(1, Math.max(0, dayT)))
  const isDay = dayT > 0 && dayT < 1
  const az = Math.PI * (0.15 + 0.7 * Math.min(1, Math.max(0, dayT))) // east → west
  const sunPos = _sunPos.set(-Math.cos(az) * 14, 2 + elev * 14, 6 - Math.sin(az) * 4)
  const warm = 1 - elev // low sun = warm
  const sunColor = _sunColor.copy(_SUN_WARM_FROM).lerp(_SUN_WARM_TO, Math.pow(warm, 1.6))
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
  // P2-4: the mood editor mounts per visit — release its background texture
  // and don't leave the scene pointing at disposed GPU memory
  useEffect(() => {
    return () => {
      if (scene.background === bg.tex) scene.background = null
      bg.tex.dispose()
    }
  }, [bg, scene])
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

// ── shared UI atoms ──────────────────────────────────────────────────────────
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
const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 8,
}

/** Small on/off switch (no emojis, works on touch). */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        border: `1px solid ${on ? 'rgba(252,209,22,0.7)' : 'rgba(255,255,255,0.18)'}`,
        background: on ? 'rgba(252,209,22,0.25)' : 'rgba(255,255,255,0.08)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 160ms linear, border-color 160ms linear',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: on ? '#fcd116' : 'rgba(255,255,255,0.55)',
          transition: 'left 160ms ease, background 160ms linear',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}

const KIND_META: Record<string, { label: string; color: string }> = {
  lamp: { label: 'Lamp', color: '#fcd116' },
  fan: { label: 'Fan', color: '#5fd4ff' },
  ac: { label: 'AC', color: '#7aa7ff' },
  outlet: { label: 'Power', color: '#9aa3ad' },
}

const RARITY_BORDER: Record<string, string> = {
  basic: '1px solid rgba(255,255,255,0.12)',
  standard: '1px solid rgba(95,212,255,0.4)',
  premium: '1px solid rgba(252,209,22,0.55)',
}

/**
 * Arrange tab (Reality-check P2) — touch-first editor for the player's OWN
 * layout: select a piece, move it N/E/S/W on the 0.5 m tile grid, rotate 90°,
 * remove it. Rejections (outside the room / overlaps / blocks the door) show
 * as a feedback line. The same request* paths drive the e2e probe and the
 * layout persists via homeLayoutStore.
 */
function ArrangePanel({ owned }: { owned: readonly string[] }) {
  const st = useSyncExternalStore(subscribeHomeLayout, getHomeLayoutState, getHomeLayoutState)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const placedUids = new Set(st.layout.map((p) => p.uid))
  // owned pieces in purchase order with their stable uid (id#n)
  const seen = new Map<string, number>()
  const pieces = owned.map((id) => {
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    return { id, uid: `${id}#${n}` }
  })
  const selected = pieces.find((p) => p.uid === st.selectedUid) ?? null
  const placed = selected ? st.layout.find((p) => p.uid === selected.uid) ?? null : null
  const tileBtn: CSSProperties = {
    minHeight: 46,
    minWidth: 46,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e8eef7',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
  }
  const actionBtn: CSSProperties = {
    ...tileBtn,
    flex: 1,
    fontSize: 13,
  }
  return (
    <div style={{ display: 'grid', gap: 10 }} data-testid="arrange-panel">
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
        Tap a piece, then move it around the room. Layout saves automatically —
        leave and come back, it stays.
      </div>

      {/* owned pieces */}
      {pieces.length === 0 ? (
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.4 }}>
          Your room is empty — buy furniture in the Shop tab, then arrange it here.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pieces.map((p) => {
            const on = st.selectedUid === p.uid
            const isPlaced = placedUids.has(p.uid)
            return (
              <button
                key={p.uid}
                type="button"
                data-testid={`arrange-item-${p.id}`}
                onClick={() => selectHomeFurniture(on ? null : p.uid)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: on ? '1px solid #fcd116' : isPlaced ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.14)',
                  background: on ? 'rgba(252,209,22,0.16)' : 'rgba(255,255,255,0.05)',
                  color: on ? '#fcd116' : '#e8eef7',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {findFurnitureById(p.id)?.title ?? p.id}
                {!isPlaced && <span style={{ color: '#fcd116' }}> · unplaced</span>}
              </button>
            )
          })}
        </div>
      )}

      {st.feedback && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }} role="status" data-testid="arrange-feedback">
          {st.feedback}
          <button type="button" onClick={clearHomeFeedback} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
            dismiss
          </button>
        </div>
      )}

      {selected && !placed ? (
        <button
          type="button"
          data-testid="arrange-place"
          onClick={() => requestPlaceHomeFurniture(selected.id, getState().home.furnitureIds)}
          style={{ ...actionBtn, background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.5)' }}
        >
          Place in the room (auto spot)
        </button>
      ) : null}

      {selected && placed ? (
        <>
          {/* compass pad: N up (−z), S down (+z), W left (−x), E right (+x) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 54px)', gridTemplateRows: 'repeat(3, 46px)', gap: 6, justifyContent: 'center' }}>
            <span />
            <button type="button" data-testid="arrange-n" aria-label="Move north" onClick={() => requestMoveHomeFurniture(selected.uid, 0, -0.5)} style={tileBtn}>↑</button>
            <span />
            <button type="button" data-testid="arrange-w" aria-label="Move west" onClick={() => requestMoveHomeFurniture(selected.uid, -0.5, 0)} style={tileBtn}>←</button>
            <span style={{ display: 'grid', placeItems: 'center', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>0.5 m</span>
            <button type="button" data-testid="arrange-e" aria-label="Move east" onClick={() => requestMoveHomeFurniture(selected.uid, 0.5, 0)} style={tileBtn}>→</button>
            <span />
            <button type="button" data-testid="arrange-s" aria-label="Move south" onClick={() => requestMoveHomeFurniture(selected.uid, 0, 0.5)} style={tileBtn}>↓</button>
            <span />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" data-testid="arrange-rotate" onClick={() => requestRotateHomeFurniture(selected.uid)} style={actionBtn}>
              Rotate 90°
            </button>
            {confirmRemove ? (
              <button
                type="button"
                data-testid="arrange-remove-confirm"
                onClick={() => {
                  requestRemoveHomeFurniture(selected.uid)
                  setConfirmRemove(false)
                }}
                style={{ ...actionBtn, background: 'rgba(185,28,28,0.3)', border: '1px solid rgba(185,28,28,0.6)', color: '#fecaca' }}
              >
                Really remove?
              </button>
            ) : (
              <button type="button" data-testid="arrange-remove" onClick={() => setConfirmRemove(true)} style={actionBtn}>
                Remove
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

/** Furniture marketplace — House Control style tiles. Buying renders the
 *  piece in the room above instantly (auto-anchored), then the Arrange tab
 *  moves / rotates / removes it — the player's own layout (homeLayoutStore). */
function FurnitureShop({ ownedCount }: { ownedCount: number }) {
  const owned = useStoreSnapshot((s) => s.home.furnitureIds)
  const balance = useStoreSnapshot((s) => s.wallet.balanceGHS)
  const items = listHomeFurniture()
  const comfort = useMemo(() => comfortPctFromOwned(owned), [owned])
  const buy = (id: string) => {
    const item = findFurnitureById(id)
    if (!item) return
    if (!buyHomeFurniture(id, item.costGHS)) return
    // Reality-check P2: bought pieces auto-anchor (first free spot) so the
    // purchase is visible immediately; the Arrange tab rearranges it.
    requestPlaceHomeFurniture(id, getState().home.furnitureIds)
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Furniture</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          Owned {ownedCount} · Comfort {comfort}%
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 800,
            color: '#fcd116',
            background: 'rgba(252,209,22,0.1)',
            border: '1px solid rgba(252,209,22,0.3)',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          GHS {balance.toFixed(0)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
        Pieces appear in the room the moment you buy (auto-placed on a free
        spot). Open the Arrange tab to move, rotate or remove them — your
        layout is saved and restored every visit.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((f) => {
          const has = owned.includes(f.id)
          const can = !has && balance >= f.costGHS
          const size = f.dimensions ? `${f.dimensions.widthMeters.toFixed(1)} × ${f.dimensions.depthMeters.toFixed(1)} m` : null
          return (
            <button
              key={f.id}
              type="button"
              data-testid={`shop-item-${f.id}`}
              onClick={() => buy(f.id)}
              disabled={!can && !has}
              style={{
                textAlign: 'left',
                padding: '12px 12px',
                borderRadius: 14,
                border: has ? '1px solid rgba(16,185,129,0.45)' : RARITY_BORDER[f.rarity] ?? RARITY_BORDER.basic,
                background: has ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                color: '#e8eef7',
                cursor: can || has ? 'pointer' : 'default',
                opacity: can || has ? 1 : 0.55,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {f.summary}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8 }}>
                <span>GHS {f.costGHS}</span>
                {size && <span>{size}</span>}
                <span style={{ color: f.rarity === 'premium' ? '#fcd116' : f.rarity === 'standard' ? '#5fd4ff' : 'rgba(255,255,255,0.3)' }}>
                  {f.rarity}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: has ? '#6ee7b7' : can ? '#fcd116' : 'rgba(255,255,255,0.35)' }}>
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
 * Device toggles drive the actual room (lights, fan) here AND in the world.
 */
export default function SetTheMood() {
  const { mats, hour, selected, apply, preset, select, setHour, undo, redo, past, future } = useMood()
  const scores = useMemo(() => moodScores(mats, hour), [mats, hour])
  const sentence = useMemo(() => moodSentence(mats, scores), [mats, scores])
  const lamps = daylight(hour).lamps

  // Panel tab: devices | surfaces (paint) | lights (daylight) | shop
  const [panel, setPanel] = useState<'arrange' | 'devices' | 'surfaces' | 'lights' | 'shop'>(() => {
    if (typeof window === 'undefined') return 'devices'
    const r = new URLSearchParams(window.location.search).get('room')
    if (r === 'shop') return 'shop'
    if (r === 'arrange') return 'arrange'
    if (r === 'surfaces') return 'surfaces'
    if (r === 'lights') return 'lights'
    return 'devices'
  })
  const tierId = useStoreSnapshot((s) => s.home.tierId) || 'single_room'
  const tier = findHousingTierById(tierId)
  const owned = useStoreSnapshot((s) => s.home.furnitureIds)
  const [zoneId, setZoneId] = useState<ZoneId>('room')
  const [drift, setDrift] = useState(true)
  // Device toggles drive the 3D room + persist to the walkable world
  const [devices, setDevices] = useState<RoomDevices>(() => loadRoomDevices())
  const [acTemp, setAcTemp] = useState(24)
  const [acOn, setAcOn] = useState(false)
  const slotDef = SLOTS.find((s) => s.id === selected)!
  const [matKind, setMatKind] = useState<MatKind>(slotDef.kinds[0])
  useEffect(() => {
    if (!slotDef.kinds.includes(matKind)) setMatKind(slotDef.kinds[0])
  }, [selected, slotDef, matKind])

  const toggleDevice = (d: ZoneDevice) => {
    // room_ceiling / room_desk / room_fan map to real room devices
    const map: Record<string, keyof RoomDevices> = { room_ceiling: 'ceiling', room_desk: 'desk', room_fan: 'fan' }
    const key = map[d.id]
    if (!key) return
    setDevices((s) => {
      const next = { ...s, [key]: !s[key] }
      saveRoomDevices(next)
      return next
    })
  }

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
  const sceneChips = MOODS.map((m) => ({ id: m.id, label: m.label }))
  const topMood = (Object.keys(scores) as MoodId[]).sort((a, b) => scores[b] - scores[a])[0]

  const zone = HOME_ZONES.find((z) => z.id === zoneId)!
  const zoneOpen = zoneUnlocked(zone, tierId)

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
            <group position={[0, -0.02, 0]}>
              <GyanRoom mode="dollhouse" mats={mats} selected={selected} onPick={select} lampsOn={lamps} owned={owned} devices={devices} />
            </group>
            <Plinth />
            <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={12} blur={2.4} far={4} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minPolarAngle={0.35}
            maxPolarAngle={1.35}
            minDistance={4}
            maxDistance={11}
            target={[0, 1.1, 0]}
            onStart={() => setDrift(false)}
          />
          <IdleDrift active={drift} />
          <Bridge />
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
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          Room
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
            {tier?.shortLabel ?? 'Single Room'} · Comfort {comfortPctFromOwned(owned)}%
          </span>
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
        <div style={sectionLabel}>Scenes</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {sceneChips.map((c) => {
            const on = c.id === topMood && scores[c.id] > 0.4
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

        {/* Zone chips — starter only has Room; upgrades unlock Living/Kitchen/… */}
        <div style={sectionLabel}>Rooms · {tier?.shortLabel ?? 'Single Room'}</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
          {HOME_ZONES.map((z) => {
            const open = zoneUnlocked(z, tierId)
            const on = zoneId === z.id
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => open && setZoneId(z.id)}
                disabled={!open}
                style={{
                  minHeight: 36,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: on && open ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.12)',
                  background: on && open ? 'rgba(252,209,22,0.18)' : 'rgba(255,255,255,0.05)',
                  color: !open ? 'rgba(255,255,255,0.28)' : on ? '#fcd116' : 'rgba(255,255,255,0.85)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: open ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
                title={open ? z.label : `Upgrade home to unlock ${z.label}`}
              >
                {open ? z.label : `Lock ${z.label}`}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {([
            ['arrange', 'Arrange'],
            ['devices', 'Devices'],
            ['surfaces', 'Surfaces'],
            ['lights', 'Day'],
            ['shop', 'Shop'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              style={{
                flex: 1,
                minHeight: 42,
                borderRadius: 12,
                border: panel === id ? '1px solid #fcd116' : '1px solid rgba(255,255,255,0.1)',
                background: panel === id ? 'rgba(252,209,22,0.16)' : 'rgba(255,255,255,0.04)',
                color: panel === id ? '#fcd116' : 'rgba(255,255,255,0.8)',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 150ms linear, color 150ms linear',
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

        {panel === 'arrange' && <ArrangePanel owned={owned} />}
        {panel === 'devices' && (
          <div>
            {!zoneOpen ? (
              <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.4 }}>
                {zone.label} unlocks when you upgrade your home past {zone.minTierId.replace(/_/g, ' ')}.
                Starter players only control the single room.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  Toggles change the room above — and the same room when you walk
                  home in the world.
                </div>
                {zone.devices.map((d) => {
                  const unlocked = deviceUnlocked(d, tierId)
                  const realKey = ({ room_ceiling: 'ceiling', room_desk: 'desk', room_fan: 'fan' } as Record<string, keyof RoomDevices | undefined>)[d.id]
                  const on = realKey ? devices[realKey] : d.kind === 'ac' ? acOn : false
                  const meta = KIND_META[d.kind] ?? KIND_META.outlet
                  if (!unlocked) {
                    return (
                      <div key={d.id} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{d.title}</span>
                        <span style={{ fontSize: 11 }}>Upgrade home to use</span>
                      </div>
                    )
                  }
                  if (d.kind === 'ac') {
                    return (
                      <div key={d.id} style={{ padding: '12px 14px', borderRadius: 14, background: on ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: on ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, display: 'inline-block' }} />
                              {d.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{on ? `Cool · ${acTemp}°` : 'Off'}</div>
                          </div>
                          <Toggle on={on} onClick={() => setAcOn((v) => !v)} />
                        </div>
                        {on && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <button type="button" onClick={() => setAcTemp((x) => Math.max(16, x - 1))}
                              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>-</button>
                            <div style={{ fontSize: 22, fontWeight: 900, minWidth: 48, textAlign: 'center' }}>{acTemp}°</div>
                            <button type="button" onClick={() => setAcTemp((x) => Math.min(30, x + 1))}
                              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>+</button>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => (realKey ? toggleDevice(d) : undefined)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                        background: on ? 'rgba(252,209,22,0.14)' : 'rgba(255,255,255,0.05)',
                        border: on ? '1px solid rgba(252,209,22,0.45)' : '1px solid rgba(255,255,255,0.1)',
                        color: '#e8eef7',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, display: 'inline-block' }} />
                          {d.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                          {meta.label} · {on ? 'On' : 'Off'}
                        </div>
                      </div>
                      <Toggle on={on} onClick={() => (realKey ? toggleDevice(d) : undefined)} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.5)', alignSelf: 'center' }}>
                {SWATCHES.filter((s) => s.kind === matKind).length} finishes
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
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
                      transition: 'transform 120ms ease',
                    }}
                  />
                )
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {slotDef.label} · {SWATCH[mats[selected]]?.name ?? '—'}
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
            <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.55)', display: 'flex', gap: 14 }}>
              <span>Lamps {Math.round(lamps * 100)}%</span>
              <span>Hour {hour.toFixed(1)}</span>
              <span style={{ color: devices.ceiling ? '#fcd116' : 'rgba(255,255,255,0.35)' }}>
                Ceiling {devices.ceiling ? 'on' : 'off'}
              </span>
            </div>
          </div>
        )}

        {panel === 'shop' && <FurnitureShop ownedCount={owned.length} />}
      </div>
    </div>
  )
}
