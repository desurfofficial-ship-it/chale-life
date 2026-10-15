'use client'

// ─── Chalé Life onboarding — one continuous camera move ─────────────────────
// Dusk skyline over the sea → glide west to James Town → drop onto Daavi
// Street facing Gyan's lit window → push through the open window into his
// room. Each stop holds a gentle drift while an onboarding card asks one
// thing. Mounted by AccraScene when the URL has ?onboarding=1.
//
// Deterministic demo/proof mode: set window.__ONB_T = <seconds> and the rig
// + cards follow the scripted DEMO timeline instead of user taps (used to
// render the preview video frame by frame).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { create } from 'zustand'
import { GyanRoom, ROOM, FRONT_WINDOW } from '../room/GyanRoom'
import { MOODS, type RoomMats } from '../room/materials'
import { COLORS } from '@/lib/mapConfig'
import { getState } from '../store/gameStore'
import { isInsideGyanHouse } from '../world/colliders'
import { useAnimatedRef } from '../components/world/SceneBatcher'

/** True when the intro camera + Gyan house path should run. */
export function isOnboardingActive(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  // CI / playtests never run the cinematic
  // CI playtests and debug probes stay in play mode
  if (q.get('e2e') === '1' || q.get('debug') === '1' || q.get('onboarding') === '0') return false
  if (q.get('onboarding') === '1') return true
  try {
    return !window.localStorage.getItem('chale-onboarding-done')
  } catch {
    return false
  }
}

export function markOnboardingDone(): void {
  try {
    window.localStorage.setItem('chale-onboarding-done', '1')
  } catch {
    /* private mode */
  }
}

/** Module-load snapshot for world dress (Jamestown). Prefer isOnboardingActive() at runtime. */
export const ONBOARDING = isOnboardingActive()

// Gyan's house replaces the Daavi-plot compound house (same footprint)
export const GYAN_HOUSE = { x: -146.8, z: -7 }
const H = GYAN_HOUSE
const WIN_Y = FRONT_WINDOW.sill + FRONT_WINDOW.h / 2
const FRONT_Z = H.z + ROOM.d / 2 + ROOM.wall // outer face of the front wall

// camera stops (world space): position, look-at
type Stop = { pos: [number, number, number]; look: [number, number, number] }
export const STOPS: Stop[] = [
  { pos: [-10, 48, 196], look: [-58, 6, -30] }, // 0 skyline from the sea
  { pos: [-112, 24, 50], look: [-142, 4, -4] }, // 1 James Town, lighthouse
  { pos: [H.x, 2.3, 7.6], look: [H.x, 1.75, FRONT_Z] }, // 2 Daavi St, lit window
  { pos: [H.x + 0.3, 1.6, H.z + 2.2], look: [H.x - 0.2, 1.05, H.z - 3.0] }, // 3 inside the room
]
// extra waypoints that shape each leg (so the push-in threads the window)
const VIA: [number, number, number][][] = [
  [[-70, 40, 125]],
  [[-130, 18, 32], [-147.4, 7.5, 12.5]], // over the rooftops, then down the gap between the café patio and the arcade posts (0 collider hits, tools/campath_audit.py)
  [[H.x, 1.62, FRONT_Z + 1.2], [H.x, WIN_Y, FRONT_Z - 0.3]],
]
const LEG_SECONDS = [4.2, 3.8, 2.8]

// ── step state ───────────────────────────────────────────────────────────────
interface OnbState {
  step: number // stop we're at / heading to
  moving: boolean
  name: string
  next: () => void
  setName: (n: string) => void
  arrived: () => void
}
export const useOnb = create<OnbState>((set, get) => ({
  step: 0,
  moving: false,
  name: typeof window !== 'undefined' ? window.localStorage.getItem('chale-player-name') ?? '' : '',
  next: () => {
    const { step, moving } = get()
    if (moving || step >= STOPS.length - 1) return
    set({ step: step + 1, moving: true })
  },
  setName: (n) => {
    set({ name: n })
    try {
      window.localStorage.setItem('chale-player-name', n)
    } catch {
      /* private mode */
    }
  },
  arrived: () => set({ moving: false }),
}))

// ── scripted demo timeline (seconds) ─────────────────────────────────────────
// hold0 → leg0 → hold1 → leg1 → hold2 (name typed) → leg2 → hold3
export const DEMO = [2.4, LEG_SECONDS[0], 2.2, LEG_SECONDS[1], 3.0, LEG_SECONDS[2], 3.2]
export const DEMO_TOTAL = DEMO.reduce((a, b) => a + b, 0)
function demoState(t: number): { step: number; legT: number | null; typed: number; holdT: number } {
  let acc = 0
  for (let i = 0; i < DEMO.length; i++) {
    const d = DEMO[i]
    if (t < acc + d || i === DEMO.length - 1) {
      const local = Math.min(d, t - acc)
      if (i % 2 === 0) return { step: i / 2, legT: null, typed: i === 4 ? local / 1.4 : i > 4 ? 1 : 0, holdT: local }
      return { step: (i + 1) / 2, legT: local / d, typed: i > 4 ? 1 : 0, holdT: 0 }
    }
    acc += d
  }
  return { step: 3, legT: null, typed: 1, holdT: 0 }
}
const demoT = () => (window as unknown as { __ONB_T?: number }).__ONB_T

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// ── camera rig ───────────────────────────────────────────────────────────────
export function OnboardingCamera() {
  const { camera } = useThree()
  const step = useOnb((s) => s.step)
  const moving = useOnb((s) => s.moving)
  const arrived = useOnb((s) => s.arrived)
  const legStart = useRef(0)
  const clock = useRef(0)
  const curves = useMemo(
    () =>
      STOPS.slice(1).map((to, i) => {
        const from = STOPS[i]
        const pts = [from.pos, ...VIA[i], to.pos].map((p) => new THREE.Vector3(...p))
        return { pos: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), from, to }
      }),
    []
  )
  const tmpLook = useMemo(() => new THREE.Vector3(), [])
  const a = useMemo(() => new THREE.Vector3(), [])
  const b = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (moving) legStart.current = clock.current
  }, [moving, step])

  useFrame((_, dt) => {
    clock.current += dt
    const cam = camera as THREE.PerspectiveCamera
    const T = demoT()
    let s = step
    let legT: number | null = null
    let hold = clock.current
    if (T !== undefined) {
      const d = demoState(T)
      s = d.step
      legT = d.legT
      hold = d.holdT + T * 0.3
    } else if (moving) {
      legT = Math.min(1, (clock.current - legStart.current) / LEG_SECONDS[step - 1])
      if (legT >= 1) arrived()
    }

    // fov: wide over the city, tighter on the street, wide again inside
    const fovAt = [40, 42, 44, 62]
    if (legT !== null && s > 0) {
      const k = ease(legT)
      const c = curves[s - 1]
      c.pos.getPoint(k, a)
      cam.position.copy(a)
      // look target blends; inside the window leg it swings late
      const lk = s === 3 ? ease(Math.max(0, (legT - 0.55) / 0.45)) : k
      tmpLook.set(...c.from.look).lerp(b.set(...c.to.look), lk)
      cam.lookAt(tmpLook)
      cam.fov = THREE.MathUtils.lerp(fovAt[s - 1], fovAt[s], s === 3 ? ease(Math.max(0, (legT - 0.6) / 0.4)) : k)
    } else {
      // hold: slow breathing drift around the stop
      const st = STOPS[s]
      const amp = s === 0 ? 3 : s === 1 ? 1.2 : s === 2 ? 0.12 : 0.05
      cam.position.set(
        st.pos[0] + Math.sin(hold * 0.35) * amp,
        st.pos[1] + Math.sin(hold * 0.5) * amp * 0.25,
        st.pos[2] + Math.cos(hold * 0.3) * amp * 0.5
      )
      cam.lookAt(st.look[0], st.look[1], st.look[2])
      cam.fov = fovAt[s]
    }
    cam.near = s >= 2 || (legT !== null && s === 2) ? 0.05 : 0.5
    cam.updateProjectionMatrix()
  })
  return null
}

// ── Gyan's house (exterior shell + the room inside) ──────────────────────────
export function GyanHouse({ mats }: { mats?: RoomMats }) {
  const roomMats = mats ?? MOODS[0].mats
  const t = ROOM.wall
  const W = ROOM.w + 2 * t
  const D = ROOM.d + 2 * t
  const Hh = ROOM.h + 0.25
  const fw = FRONT_WINDOW
  const wall = COLORS.wallTeal
  const glow = useRef<THREE.PointLight>(null)
  // The exterior is the CUTAWAY group — its visibility flips every time the
  // walker crosses the door threshold, so it must never be frozen into a
  // SceneBatcher merge (batched geometry renders from the scene-root batch
  // mesh and would keep the roof/walls/beacon visible while "inside").
  // Registering it animated keeps the batcher's hands off the whole subtree.
  const exteriorRef = useAnimatedRef<THREE.Group>()
  const doorW = 1.15
  const doorX = 2.2 // local — matches COMPOUND_DOOR / collider gap

  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 5 + Math.sin(clock.elapsedTime * 2.1) * 0.25
    // Cutaway: hide the whole exterior group (walls + roof + lamps + the
    // find-home beacon) so the player sees ONLY the room from above.
    const p = getState().player.position
    const inside = isInsideGyanHouse(p.x, p.z)
    if (exteriorRef.current) exteriorRef.current.visible = !inside
  })

  // Front wall: full-height slabs with a door hole + a window hole.
  // Segments along X on the front face (local).
  const doorL = doorX - doorW / 2
  const doorR = doorX + doorW / 2
  const winL = fw.x - fw.w / 2
  const winR = fw.x + fw.w / 2
  const xCuts = [-W / 2, winL, winR, doorL, doorR, W / 2].sort((a, b) => a - b)
  const front: [number, number, number, number][] = []
  for (let i = 0; i < xCuts.length - 1; i++) {
    const a = xCuts[i]
    const b = xCuts[i + 1]
    const mid = (a + b) / 2
    const segW = b - a
    if (segW < 0.08) continue
    const inDoor = mid > doorL && mid < doorR
    const inWin = mid > winL && mid < winR
    if (inDoor) {
      // lintel only above the doorway
      const lh = Hh - 2.2
      if (lh > 0.05) front.push([mid, 2.2 + lh / 2, segW, lh])
    } else if (inWin) {
      front.push([mid, fw.sill / 2, segW, fw.sill])
      const topH = Hh - (fw.sill + fw.h)
      if (topH > 0.05) front.push([mid, fw.sill + fw.h + topH / 2, segW, topH])
    } else {
      front.push([mid, Hh / 2, segW, Hh])
    }
  }

  return (
    <group position={[H.x, 0, H.z]} name="gyan-house">
      {/* lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, D / 2 + 1.1]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[W + 2, 2.2]} />
        <meshStandardMaterial color="#5f9a45" roughness={1} />
      </mesh>

      <group ref={exteriorRef} name="gyan-exterior">
        {/* back + side walls */}
        <mesh position={[0, Hh / 2, -D / 2 + t / 2]} castShadow receiveShadow>
          <boxGeometry args={[W, Hh, t]} />
          <meshStandardMaterial color={wall} roughness={0.9} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[(sx * (W - t)) / 2, Hh / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, Hh, D]} />
            <meshStandardMaterial color={wall} roughness={0.9} />
          </mesh>
        ))}
        {front.map(([x, y, w, h], i) =>
          w > 0.05 && h > 0.05 ? (
            <mesh key={i} position={[x, y, D / 2 - t / 2]} castShadow receiveShadow>
              <boxGeometry args={[w, h, t]} />
              <meshStandardMaterial color={wall} roughness={0.9} />
            </mesh>
          ) : null,
        )}
        {/* window shutters */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[fw.x + sx * (fw.w / 2 + 0.42), fw.sill + fw.h / 2, D / 2 + 0.05]} rotation={[0, sx * 0.35, 0]} castShadow>
            <boxGeometry args={[0.82, fw.h + 0.05, 0.05]} />
            <meshStandardMaterial color="#6b4428" roughness={0.75} />
          </mesh>
        ))}
        <mesh position={[fw.x, fw.sill - 0.05, D / 2 + 0.09]}>
          <boxGeometry args={[fw.w + 0.3, 0.08, 0.22]} />
          <meshStandardMaterial color="#e8e1d2" roughness={0.8} />
        </mesh>
        {/* open doorway frame (no door leaf — walk straight in) */}
        {[-1, 1].map((sx) => (
          <mesh key={`jamb-${sx}`} position={[doorX + sx * (doorW / 2 + 0.04), 1.1, D / 2 - t / 2 + 0.02]} castShadow>
            <boxGeometry args={[0.08, 2.2, t + 0.04]} />
            <meshStandardMaterial color="#5b3d28" roughness={0.8} />
          </mesh>
        ))}
        {/* door step */}
        <mesh position={[doorX, 0.06, D / 2 + 0.35]} receiveShadow userData={{ noCollide: true }}>
          <boxGeometry args={[doorW + 0.3, 0.12, 0.6]} />
          <meshStandardMaterial color="#cfc6b6" roughness={0.9} />
        </mesh>
        {/* wall lamp */}
        <mesh position={[doorX + 0.75, 2.25, D / 2 + 0.08]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color="#fff1cf" emissive="#ffc46b" emissiveIntensity={2.4} />
        </mesh>
        <pointLight position={[doorX + 0.75, 2.2, D / 2 + 0.5]} intensity={2.2} distance={6} decay={1.8} color="#ffc46b" />
        <pointLight ref={glow} position={[fw.x, WIN_Y, D / 2 + 1.0]} intensity={5} distance={9} decay={1.7} color="#ffbf70" />
        {/* tin roof */}
        <mesh position={[0, Hh + 0.32, 0]} rotation={[0.05, 0, 0]} castShadow>
          <boxGeometry args={[W + 0.6, 0.12, D + 0.7]} />
          <meshStandardMaterial color="#8f949a" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, Hh + 0.12, 0]}>
          <boxGeometry args={[W, 0.3, D]} />
          <meshStandardMaterial color="#d9cfbd" roughness={0.9} />
        </mesh>
        {/* Find-home beacon — soft pulse over the roof so the plot is readable
            from the street. Lives INSIDE the cutaway group (moved here from
            Jamestown's DaaviPlot): the batcher froze the old copy into a
            scene-root merge that ignored the cutaway, so a stray yellow dot
            + ground ring floated over the room whenever the player was
            inside. Same world position as before (group is at GYAN_HOUSE). */}
        <mesh position={[0, 5.2, 0]} userData={{ noCollide: true }} name="home-beacon">
          <sphereGeometry args={[0.35, 10, 8]} />
          <meshStandardMaterial color="#fcd116" emissive="#fcd116" emissiveIntensity={1.4} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noCollide: true }} name="home-beacon-ring">
          <ringGeometry args={[1.6, 2.1, 32]} />
          <meshBasicMaterial color="#fcd116" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      </group>

      {/* interior always present — visible when exterior hides (cutaway) or through door */}
      <group position={[0, 0, 0]}>
        <GyanRoom mode="world" mats={roomMats} lampsOn={1} />
      </group>
    </group>
  )
}


// ── DOM cards ────────────────────────────────────────────────────────────────
export function OnboardingOverlay() {
  const { step, moving, name, next, setName } = useOnb()
  const [, force] = useState(0)
  useEffect(() => {
    if (demoT() === undefined) return
    let raf = 0
    const tick = () => {
      force((n) => n + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const T = demoT()
  let s = step
  let show = !moving
  let typedName = name
  let fade = 1
  if (T !== undefined) {
    const d = demoState(T)
    s = d.step
    show = d.legT === null
    typedName = 'Gyan'.slice(0, Math.round(Math.min(1, d.typed) * 4))
    fade = d.legT === null ? Math.min(1, d.holdT / 0.45) : 0
  }

  const skipIntro = () => {
    markOnboardingDone()
    const u = new URL(window.location.href)
    u.searchParams.delete('onboarding')
    u.searchParams.set('onboarding', '0')
    window.location.replace(u.pathname + '?' + u.searchParams.toString())
  }

  // Inline styles only — this repo has no Tailwind. Tailwind classNames were
  // invisible after the canvas mounted, leaving players stuck at the sea view.
  const shell: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom), 72px)',
    paddingLeft: 16,
    paddingRight: 16,
    pointerEvents: 'none',
    opacity: show ? fade : 0,
    transition: T === undefined ? 'opacity .45s' : undefined,
  }
  const card: CSSProperties = {
    pointerEvents: 'auto',
    marginBottom: 12,
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(14,16,24,0.88)',
    padding: 18,
    color: '#fff',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }
  const btn: CSSProperties = {
    marginTop: 14,
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    border: 'none',
    background: '#fcd116',
    color: '#141018',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    touchAction: 'manipulation',
  }
  const btnGhost: CSSProperties = {
    ...btn,
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.25)',
    marginTop: 8,
  }
  const mono: CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#fcd116',
  }
  const dots: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 'max(1.25rem, env(safe-area-inset-top))',
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    pointerEvents: 'none',
  }

  return (
    <div style={shell} data-onboarding-overlay="1">
      <div style={dots}>
        {STOPS.map((_, i) => (
          <span
            key={i}
            style={{
              height: 6,
              width: i === s ? 24 : 6,
              borderRadius: 99,
              background: i === s ? '#fcd116' : i < s ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
              transition: 'width .25s',
            }}
          />
        ))}
      </div>

      {/* Always-reachable escape hatch above Safari/Gemini chrome */}
      <button
        type="button"
        onClick={skipIntro}
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 12,
          zIndex: 60,
          pointerEvents: 'auto',
          minHeight: 40,
          padding: '0 12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(9,13,22,0.75)',
          color: '#f8fafc',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        Skip intro
      </button>

      {s === 0 && (
        <div style={{ ...card, background: 'transparent', border: 'none', boxShadow: 'none', padding: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ height: 6, width: 32, borderRadius: 99, background: '#ce1126' }} />
            <span style={{ height: 6, width: 32, borderRadius: 99, background: '#fcd116' }} />
            <span style={{ height: 6, width: 32, borderRadius: 99, background: '#006b3f' }} />
          </div>
          <h1
            style={{
              margin: '12px 0 0',
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            Chalé
            <br />
            <span style={{ color: '#fcd116' }}>Life</span>
          </h1>
          <p style={{ margin: '12px 0 0', maxWidth: 280, fontSize: 15, lineHeight: 1.35, color: 'rgba(255,255,255,0.88)' }}>
            A new life in Accra starts tonight.
          </p>
          <button type="button" style={btn} onClick={next}>
            Begin
          </button>
          <button type="button" style={btnGhost} onClick={skipIntro}>
            Skip — play now
          </button>
        </div>
      )}

      {s === 1 && (
        <div style={card}>
          <div style={mono}>James Town · dusk</div>
          <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
            This is your city.
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.35, color: 'rgba(255,255,255,0.8)' }}>
            Markets, trotros, the sea. Pinch, drag, and walk — Accra is yours to explore.
          </p>
          <button type="button" style={btn} onClick={next}>
            Continue
          </button>
        </div>
      )}

      {s === 2 && (
        <div style={card}>
          <div style={mono}>Daavi Street</div>
          <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
            What should Daavi call you?
          </h2>
          <input
            value={typedName}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            placeholder="Your name"
            autoComplete="off"
            enterKeyHint="go"
            onKeyDown={(e) => e.key === 'Enter' && typedName.trim() && next()}
            style={{
              marginTop: 12,
              width: '100%',
              minHeight: 48,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.1)',
              padding: '0 14px',
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button type="button" style={{ ...btn, opacity: typedName.trim() ? 1 : 0.4 }} disabled={!typedName.trim()} onClick={next}>
            Continue
          </button>
        </div>
      )}

      {s === 3 && (
        <div style={card}>
          <div style={mono}>Home</div>
          <h2 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, lineHeight: 1.15 }}>
            Welcome home, {typedName || 'Gyan'}.
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.35, color: 'rgba(255,255,255,0.8)' }}>
            One room on Daavi Street, a fan, a bed, big plans. Make it yours.
          </p>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a
              href="?mood=1&from=home"
              onClick={() => {
                try {
                  sessionStorage.setItem('chale.moodOk', '1')
                  localStorage.setItem('chale.moodOk', '1')
                } catch {
                  /* private */
                }
              }}
              style={{
                ...btn,
                marginTop: 0,
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              Set the mood
            </a>
            <button
              type="button"
              style={{ ...btn, marginTop: 0, fontSize: 14 }}
              onClick={() => {
                markOnboardingDone()
                const u = new URL(window.location.href)
                u.searchParams.delete('onboarding')
                window.location.href = u.pathname + (u.search || '') + u.hash
              }}
            >
              Start playing
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

