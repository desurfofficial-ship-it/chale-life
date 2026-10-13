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
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { create } from 'zustand'
import { GyanRoom, ROOM, FRONT_WINDOW } from '../room/GyanRoom'
import { MOODS, type RoomMats } from '../room/materials'
import { COLORS } from '@/lib/mapConfig'

export const ONBOARDING =
  typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('onboarding')

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
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 5 + Math.sin(clock.elapsedTime * 2.1) * 0.25
  })
  // front face split around the window
  const fx0 = fw.x - fw.w / 2
  const fx1 = fw.x + fw.w / 2
  const front: [number, number, number, number][] = [
    [(-W / 2 + fx0) / 2, Hh / 2, fx0 + W / 2, Hh],
    [(fx1 + W / 2) / 2, Hh / 2, W / 2 - fx1, Hh],
    [fw.x, fw.sill / 2, fw.w, fw.sill],
    [fw.x, (fw.sill + fw.h + Hh) / 2, fw.w, Hh - fw.sill - fw.h],
  ]
  return (
    <group position={[H.x, 0, H.z]}>
      {/* lawn + a low blockwork fence with a gate gap */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, D / 2 + 1.1]} receiveShadow>
        <planeGeometry args={[W + 2, 2.2]} />
        <meshStandardMaterial color="#5f9a45" roughness={1} />
      </mesh>
      {/* outer walls */}
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
      {front.map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, D / 2 - t / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, t]} />
          <meshStandardMaterial color={wall} roughness={0.9} />
        </mesh>
      ))}
      {/* window reveal + open wooden shutters swung out to the street */}
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
      {/* front door + step + wall lamp */}
      <mesh position={[2.2, 1.1, D / 2 + 0.01]}>
        <planeGeometry args={[1.0, 2.15]} />
        <meshStandardMaterial color="#5b3d28" roughness={0.8} />
      </mesh>
      <mesh position={[2.2, 0.06, D / 2 + 0.35]} receiveShadow>
        <boxGeometry args={[1.4, 0.12, 0.6]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.9} />
      </mesh>
      <mesh position={[2.95, 2.25, D / 2 + 0.08]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#fff1cf" emissive="#ffc46b" emissiveIntensity={2.4} />
      </mesh>
      <pointLight position={[2.95, 2.2, D / 2 + 0.5]} intensity={2.2} distance={6} decay={1.8} color="#ffc46b" />
      {/* window spill onto the street (the beacon that draws the camera in) */}
      <pointLight ref={glow} position={[fw.x, WIN_Y, D / 2 + 1.0]} intensity={5} distance={9} decay={1.7} color="#ffbf70" />
      {/* tin roof, slight overhang */}
      <mesh position={[0, Hh + 0.32, 0]} rotation={[0.05, 0, 0]} castShadow>
        <boxGeometry args={[W + 0.6, 0.12, D + 0.7]} />
        <meshStandardMaterial color="#8f949a" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, Hh + 0.12, 0]}>
        <boxGeometry args={[W, 0.3, D]} />
        <meshStandardMaterial color="#d9cfbd" roughness={0.9} />
      </mesh>
      {/* the room itself */}
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
  // demo mode re-renders the DOM each animation frame from __ONB_T
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
  const card = 'mx-4 rounded-3xl border border-white/12 bg-[#0e1018]/72 p-5 text-white shadow-2xl backdrop-blur-xl'
  const btn = 'mt-4 w-full rounded-2xl bg-[#fcd116] py-3.5 text-[15px] font-extrabold text-[#141018] active:scale-[0.98] transition disabled:opacity-40'
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end pb-[max(1.25rem,env(safe-area-inset-bottom))]" style={{ opacity: show ? fade : 0, transition: T === undefined ? 'opacity .45s' : undefined }}>
      {/* progress dots */}
      <div className="absolute left-0 right-0 top-[max(1.25rem,env(safe-area-inset-top))] flex justify-center gap-1.5">
        {STOPS.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === s ? 'w-6 bg-[#fcd116]' : i < s ? 'w-1.5 bg-white/80' : 'w-1.5 bg-white/30'}`} />
        ))}
      </div>
      <div className="pointer-events-auto">
        {s === 0 && (
          <div className="mb-6 px-6 text-white">
            <div className="flex gap-1">
              <span className="h-1.5 w-8 rounded-full bg-[#ce1126]" />
              <span className="h-1.5 w-8 rounded-full bg-[#fcd116]" />
              <span className="h-1.5 w-8 rounded-full bg-[#006b3f]" />
            </div>
            <h1 className="mt-3 text-[44px] font-black uppercase leading-[0.9] tracking-tight drop-shadow-lg">
              Chalé
              <br />
              <span className="text-[#fcd116]">Life</span>
            </h1>
            <p className="mt-3 max-w-[18rem] text-[15px] leading-snug text-white/85 drop-shadow">A new life in Accra starts tonight.</p>
            <button className={btn} onClick={next}>Begin</button>
          </div>
        )}
        {s === 1 && (
          <div className={card}>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#fcd116]">James Town · 18:24</div>
            <h2 className="mt-2 text-[28px] font-black leading-tight">Akwaaba.</h2>
            <p className="mt-1.5 text-[14.5px] leading-snug text-white/80">From the lighthouse to Nungua beach, this whole city is yours to live in. First, let's get you home.</p>
            <button className={btn} onClick={next}>Continue</button>
          </div>
        )}
        {s === 2 && (
          <div className={card}>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#fcd116]">Daavi Street</div>
            <h2 className="mt-2 text-[24px] font-black leading-tight">What should Daavi call you?</h2>
            <input
              value={typedName}
              onChange={(e) => setName(e.target.value.slice(0, 18))}
              placeholder="Your name"
              className="mt-3 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-[17px] font-bold text-white placeholder-white/35 outline-none focus:border-[#fcd116]"
              autoComplete="off"
              enterKeyHint="go"
              onKeyDown={(e) => e.key === 'Enter' && typedName.trim() && next()}
            />
            <button className={btn} disabled={!typedName.trim()} onClick={next}>
              Continue
            </button>
          </div>
        )}
        {s === 3 && (
          <div className={card}>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#fcd116]">Home</div>
            <h2 className="mt-2 text-[26px] font-black leading-tight">Welcome home, {typedName || 'Gyan'}.</h2>
            <p className="mt-1.5 text-[14.5px] leading-snug text-white/80">One room on Daavi Street, a fan, a bed, big plans. Make it yours.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href="?mood=1" className="rounded-2xl border border-white/20 py-3.5 text-center text-[14px] font-bold text-white">Set the mood</a>
              <button className="rounded-2xl bg-[#fcd116] py-3.5 text-[14px] font-extrabold text-[#141018]">Start playing</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
