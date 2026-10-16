'use client'

// ─── Gyan's room — one room, two uses ───────────────────────────────────────
// mode="world":     a closed room inside Gyan's house on Daavi's street (the
//                   onboarding camera flies through its open front window)
// mode="dollhouse": the same room as a cutaway diorama for "Set the Mood"
//                   (front + right walls cut to stubs, no ceiling, on a plinth)
//
// Local units: metres, origin at the floor centre, +Z = street side (front),
// interior 6.6 × 6.0 m, 3.0 m ceiling. Every dressable mesh carries
// userData.slot so the editor can raycast / tap a surface.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { swatchTexture, SWATCH, type RoomMats, type Slot } from './materials'
import { useAnimatedRef } from '../components/world/SceneBatcher'
import { isInsideGyanHouse } from '../world/colliders'
import { getState } from '../store/gameStore'

export const ROOM = { w: 6.6, d: 6.0, h: 3.0, wall: 0.16 }
// front window (street side) — the onboarding camera passes through it
export const FRONT_WINDOW = { x: 0, w: 1.7, sill: 0.85, h: 1.45 }

// texture repeats per slot (metres per tile ≈ 1 / repeat)
const REPEAT: Record<Slot, [number, number]> = {
  floor: [3.3, 3], walls: [2, 1], accentWall: [3.3, 1.5], upholstery: [1.4, 0.6], bedding: [1.2, 1.2],
  rug: [1.2, 0.9], woodwork: [0.8, 0.8], accents: [0.6, 0.6],
}

function useSlotMaterials(mats: RoomMats, selected: Slot | null) {
  const set = useMemo(() => {
    const m = {} as Record<Slot, THREE.MeshStandardMaterial>
    for (const s of Object.keys(REPEAT) as Slot[]) m[s] = new THREE.MeshStandardMaterial({ roughness: 0.8 })
    return m
  }, [])
  useEffect(() => {
    for (const s of Object.keys(REPEAT) as Slot[]) {
      const sw = SWATCH[mats[s]]
      const base = swatchTexture(sw.id)
      const t = base.clone()
      t.needsUpdate = true
      t.repeat.set(...REPEAT[s])
      const old = set[s].map
      set[s].map = t
      set[s].roughness = sw.rough
      set[s].color.set('#ffffff')
      set[s].needsUpdate = true
      old?.dispose()
    }
  }, [mats, set])
  // selected surface breathes softly so the player sees what they're dressing
  useFrame(({ clock }) => {
    for (const s of Object.keys(set) as Slot[]) {
      const on = s === selected
      const k = on ? 0.08 + 0.06 * Math.sin(clock.elapsedTime * 4) : 0
      set[s].emissive.setRGB(k * 1.0, k * 0.85, k * 0.5)
    }
  })
  return set
}

const plain = (color: string, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })

export function GyanRoom({
  mode,
  mats,
  selected = null,
  onPick,
  lampsOn = 1,
}: {
  mode: 'world' | 'dollhouse'
  mats: RoomMats
  selected?: Slot | null
  onPick?: (slot: Slot) => void
  lampsOn?: number // 0..1 lamp brightness (night = 1)
}) {
  const M = useSlotMaterials(mats, selected)
  const fixed = useMemo(
    () => ({
      white: plain('#f3efe8', 0.6),
      metal: plain('#2b2b2e', 0.4, 0.6),
      chrome: plain('#c9ccd1', 0.25, 0.9),
      screen: new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: '#5fb4ff', emissiveIntensity: 0.9, roughness: 0.3 }),
      bulb: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf86', emissiveIntensity: 2.2 }),
      glass: new THREE.MeshStandardMaterial({ color: '#9fc6e8', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 }),
      leaf: plain('#2f6b3a', 0.8),
      pot: plain('#b0623e', 0.9),
      redPlastic: plain('#e23b2f', 0.75),
      shade: new THREE.MeshStandardMaterial({ color: '#f2e2c4', emissive: '#ffb75e', emissiveIntensity: 0.6, roughness: 0.9, side: THREE.DoubleSide }),
      frame: plain('#1c1a18', 0.6),
      edge: plain('#15131a', 0.9),
      ceiling: plain('#efe9dd', 0.95),
      cut: plain('#2a2530', 0.95),
      flagRed: plain('#ce1126', 0.8),
      flagGold: plain('#fcd116', 0.8),
      flagGreen: plain('#006b3f', 0.8),
      star: plain('#111111', 0.8),
      book: [plain('#b5462c'), plain('#2f5d7c'), plain('#e0b04a'), plain('#3b6b45'), plain('#e8e0d0')],
    }),
    []
  )
  const shadeMat = fixed.shade
  useEffect(() => {
    shadeMat.emissiveIntensity = 0.15 + lampsOn * 0.9
    fixed.bulb.emissiveIntensity = 0.4 + lampsOn * 2
  }, [lampsOn, shadeMat, fixed.bulb])

  const pick = (slot: Slot) => (e: ThreeEvent<MouseEvent>) => {
    if (!onPick) return
    e.stopPropagation()
    onPick(slot)
  }
  const tag = (slot: Slot) => ({ userData: { slot }, onClick: pick(slot) })

  const { w, d, h, wall } = ROOM
  const doll = mode === 'dollhouse'
  const stub = 0.55 // cut wall height in the dollhouse
  const fw = FRONT_WINDOW
  const ceilingRef = useRef<THREE.Group>(null)
  const frontWallRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (mode !== 'world') return
    const p = getState().player.position
    const inside = isInsideGyanHouse(p.x, p.z)
    // Open the room from above (and open the street face) while the player is inside
    if (ceilingRef.current) ceilingRef.current.visible = !inside
    if (frontWallRef.current) frontWallRef.current.visible = !inside
  })

  return (
    <group userData={{ noBatch: true }}>
      {/* ── floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow material={M.floor} {...tag('floor')}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {/* skirting */}
      {[
        [0, -d / 2 + 0.01, w, 0],
        [-w / 2 + 0.01, 0, d, Math.PI / 2],
      ].map(([x, z, len, r], i) => (
        <mesh key={i} position={[x as number, 0.05, z as number]} rotation={[0, r as number, 0]} material={M.woodwork}>
          <boxGeometry args={[len as number, 0.1, 0.02]} />
        </mesh>
      ))}

      {/* ── back wall = accent wall (slats / paint / stone) ── */}
      <mesh position={[0, h / 2, -d / 2]} receiveShadow material={M.accentWall} {...tag('accentWall')}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* ── left wall with a glazed side window ── */}
      <WallWithWindow
        length={d}
        height={h}
        win={{ c: 0.6, w: 1.5, sill: 0.95, h: 1.3 }}
        material={M.walls}
        position={[-w / 2, 0, 0]}
        rotationY={Math.PI / 2}
        tagProps={tag('walls')}
      />
      <WindowFrame position={[-w / 2 + 0.02, 0.95 + 0.65, -0.6]} rotationY={Math.PI / 2} w={1.5} h={1.3} glass={fixed.glass} frame={fixed.white} />
      {/* curtains */}
      {[-1.5, 0.3].map((z) => (
        <mesh key={z} position={[-w / 2 + 0.12, 1.55, z]} material={M.bedding}>
          <boxGeometry args={[0.05, 2.5, 0.42]} />
        </mesh>
      ))}

      {/* ── right wall ── */}
      {doll ? (
        <mesh position={[w / 2, stub / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={M.walls} {...tag('walls')}>
          <planeGeometry args={[d, stub]} />
        </mesh>
      ) : (
        <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow material={M.walls} {...tag('walls')}>
          <planeGeometry args={[d, h]} />
        </mesh>
      )}

      {/* ── front wall (street side) with the open window ── */}
      {doll ? (
        <mesh position={[0, stub / 2, d / 2]} rotation={[0, Math.PI, 0]} material={M.walls} {...tag('walls')}>
          <planeGeometry args={[w, stub]} />
        </mesh>
      ) : (
        <>
          <group ref={frontWallRef}>
            <WallWithWindow
              length={w}
              height={h}
              win={{ c: fw.x, w: fw.w, sill: fw.sill, h: fw.h }}
              material={M.walls}
              position={[0, 0, d / 2]}
              rotationY={Math.PI}
              tagProps={tag('walls')}
            />
          </group>
          <group ref={ceilingRef}>
            <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={fixed.ceiling}>
              <planeGeometry args={[w, d]} />
            </mesh>
            {/* ceiling bulb */}
            <mesh position={[0.6, h - 0.25, -0.4]} material={fixed.bulb}>
              <sphereGeometry args={[0.09, 12, 10]} />
            </mesh>
            <mesh position={[0.6, h - 0.12, -0.4]} material={fixed.metal}>
              <cylinderGeometry args={[0.01, 0.01, 0.24]} />
            </mesh>
          </group>
        </>
      )}

      {/* dollhouse wall caps: dark cut edges make it read as a sliced model */}
      {doll && (
        <group>
          <mesh position={[0, h + 0.005, -d / 2 - wall / 2]} material={fixed.cut}>
            <boxGeometry args={[w + wall * 2, 0.01, wall]} />
          </mesh>
          <mesh position={[-w / 2 - wall / 2, h + 0.005, 0]} material={fixed.cut}>
            <boxGeometry args={[wall, 0.01, d]} />
          </mesh>
          <mesh position={[0, stub + 0.005, d / 2 + wall / 2]} material={fixed.cut}>
            <boxGeometry args={[w + wall * 2, 0.01, wall]} />
          </mesh>
          <mesh position={[w / 2 + wall / 2, stub + 0.005, 0]} material={fixed.cut}>
            <boxGeometry args={[wall, 0.01, d]} />
          </mesh>
          {/* outer wall bodies */}
          <mesh position={[0, h / 2, -d / 2 - wall / 2]} material={fixed.edge} castShadow>
            <boxGeometry args={[w + wall * 2, h, wall - 0.004]} />
          </mesh>
          <mesh position={[-w / 2 - wall / 2, h / 2, 0]} material={fixed.edge} castShadow>
            <boxGeometry args={[wall - 0.004, h, d]} />
          </mesh>
          <mesh position={[0, stub / 2, d / 2 + wall / 2]} material={fixed.edge}>
            <boxGeometry args={[w + wall * 2, stub, wall - 0.004]} />
          </mesh>
          <mesh position={[w / 2 + wall / 2, stub / 2, 0]} material={fixed.edge}>
            <boxGeometry args={[wall - 0.004, stub, d]} />
          </mesh>
        </group>
      )}

      {/* ════════════ furniture ════════════ */}

      {/* ═══════════════════════════════════════════════════════════════
          STARTER single-room (world): bed + cheap table + buckets + mat.
          Everything lives in one room — wash, sleep, cook corner.
          Dollhouse mode keeps the fuller set so Set-the-Mood has slots.
         ═══════════════════════════════════════════════════════════════ */}
      {mode === 'world' ? (
        <group name="starter-room">
          {/* thin floor mat (cheap plastic / rubber) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.012, 0.3]} receiveShadow material={M.rug} {...tag('rug')}>
            <planeGeometry args={[2.4, 1.8]} />
          </mesh>

          {/* simple mattress bed against back wall (no fancy headboard) */}
          <group position={[1.6, 0, -d / 2 + 1.0]}>
            <mesh position={[0, 0.12, 0]} material={fixed.metal} castShadow>
              <boxGeometry args={[1.9, 0.18, 1.1]} />
            </mesh>
            <RoundedBox args={[1.85, 0.14, 1.05]} radius={0.04} position={[0, 0.28, 0]} material={M.bedding} castShadow {...tag('bedding')} />
            <RoundedBox args={[0.55, 0.12, 0.32]} radius={0.05} position={[0, 0.36, -0.35]} material={M.bedding} castShadow {...tag('bedding')} />
          </group>

          {/* cheap wood table (cook / eat corner) */}
          <group position={[-1.8, 0, -1.4]}>
            <mesh position={[0, 0.72, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
              <boxGeometry args={[0.9, 0.05, 0.55]} />
            </mesh>
            {[[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.36, z]} material={M.woodwork}>
                <boxGeometry args={[0.05, 0.72, 0.05]} />
              </mesh>
            ))}
            {/* small green charcoal / stove pot on table */}
            <mesh position={[0.15, 0.82, 0]} material={fixed.metal}>
              <cylinderGeometry args={[0.12, 0.14, 0.18, 12]} />
            </mesh>
            <mesh position={[0.15, 0.94, 0]} material={fixed.pot}>
              <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
            </mesh>
          </group>

          {/* second cheap table by the window */}
          <group position={[-1.9, 0, 1.2]}>
            <mesh position={[0, 0.55, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
              <boxGeometry args={[0.7, 0.04, 0.5]} />
            </mesh>
            {[[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.27, z]} material={M.woodwork}>
                <boxGeometry args={[0.04, 0.54, 0.04]} />
              </mesh>
            ))}
          </group>

          {/* plastic monobloc chair (red — Accra classic) */}
          <group position={[0.15, 0, -0.2]}>
            <mesh position={[0, 0.42, 0]} material={fixed.redPlastic} castShadow>
              <boxGeometry args={[0.42, 0.06, 0.42]} />
            </mesh>
            <mesh position={[0, 0.55, -0.18]} material={fixed.redPlastic}>
              <boxGeometry args={[0.42, 0.32, 0.05]} />
            </mesh>
            {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.2, z]} material={fixed.redPlastic}>
                <boxGeometry args={[0.04, 0.4, 0.04]} />
              </mesh>
            ))}
          </group>

          {/* blue cooler (eat / drink) */}
          <mesh position={[2.2, 0.28, 1.6]} material={fixed.chrome} castShadow>
            <boxGeometry args={[0.55, 0.55, 0.4]} />
          </mesh>
          <mesh position={[2.2, 0.58, 1.6]} material={fixed.metal}>
            <boxGeometry args={[0.55, 0.06, 0.4]} />
          </mesh>

          {/* wash corner: buckets + basin (bathroom in the same room) */}
          <group position={[2.2, 0, -1.8]}>
            <mesh position={[0, 0.22, 0]} material={fixed.chrome} castShadow>
              <cylinderGeometry args={[0.22, 0.2, 0.42, 14]} />
            </mesh>
            <mesh position={[-0.45, 0.16, 0.15]} material={fixed.pot} castShadow>
              <cylinderGeometry args={[0.16, 0.14, 0.32, 12]} />
            </mesh>
            <mesh position={[-0.2, 0.08, 0.45]} material={fixed.metal} castShadow>
              <cylinderGeometry args={[0.14, 0.12, 0.16, 12]} />
            </mesh>
          </group>

          {/* yellow jerrycan */}
          <mesh position={[1.5, 0.2, 1.8]} material={fixed.leaf} castShadow>
            <boxGeometry args={[0.28, 0.4, 0.2]} />
          </mesh>

          {/* single wall shelf (no books wall of fame) */}
          <mesh position={[-0.3, 1.55, -d / 2 + 0.08]} material={M.woodwork} castShadow {...tag('woodwork')}>
            <boxGeometry args={[1.1, 0.06, 0.22]} />
          </mesh>
          <mesh position={[-0.3, 1.72, -d / 2 + 0.06]} material={fixed.metal}>
            <boxGeometry args={[0.5, 0.28, 0.08]} />
          </mesh>

          {/* soft ceiling bulb only */}
        </group>
      ) : (
        <>
      {/* rug under the lounge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.55, 0.012, -1.35]} receiveShadow material={M.rug} {...tag('rug')}>
        <planeGeometry args={[2.6, 2.0]} />
      </mesh>

      {/* sofa (back-left, facing the room) */}
      {/* sofa (back-left, facing the room) */}
      <group position={[-1.55, 0, -2.45]}>
        <RoundedBox args={[2.2, 0.42, 0.9]} radius={0.08} position={[0, 0.3, 0]} material={M.upholstery} castShadow {...tag('upholstery')} />
        <RoundedBox args={[2.2, 0.55, 0.22]} radius={0.08} position={[0, 0.7, -0.36]} material={M.upholstery} castShadow {...tag('upholstery')} />
        {[-1.02, 1.02].map((x) => (
          <RoundedBox key={x} args={[0.2, 0.62, 0.9]} radius={0.07} position={[x, 0.4, 0]} material={M.upholstery} castShadow {...tag('upholstery')} />
        ))}
        {[-0.6, 0.55].map((x, i) => (
          <RoundedBox key={x} args={[0.42, 0.38, 0.14]} radius={0.06} position={[x, 0.68, -0.2]} rotation={[0.2, 0, i ? 0.12 : -0.1]} material={M.accents} castShadow {...tag('accents')} />
        ))}
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, 0.05, 0.3]} material={M.woodwork}>
            <cylinderGeometry args={[0.03, 0.02, 0.1, 6]} />
          </mesh>
        ))}
      </group>
      {/* coffee table */}
      <group position={[-1.55, 0, -1.25]}>
        <mesh position={[0, 0.38, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 28]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} material={M.woodwork}>
          <cylinderGeometry args={[0.08, 0.14, 0.36, 10]} />
        </mesh>
        <mesh position={[0.15, 0.45, 0.05]} material={fixed.pot}>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 10]} />
        </mesh>
      </group>

      {/* wall art above the sofa: kente panel + Black Stars poster */}
      <group position={[-1.55, 1.85, -d / 2 + 0.02]}>
        <mesh position={[-0.5, 0, 0]} material={fixed.frame}>
          <boxGeometry args={[0.72, 0.92, 0.03]} />
        </mesh>
        <mesh position={[-0.5, 0, 0.018]}>
          <planeGeometry args={[0.62, 0.82]} />
          <meshStandardMaterial map={swatchTexture('kente')} roughness={0.9} />
        </mesh>
        <group position={[0.45, 0.05, 0]}>
          <mesh material={fixed.frame}>
            <boxGeometry args={[0.6, 0.44, 0.03]} />
          </mesh>
          {[0.13, 0, -0.13].map((y, i) => (
            <mesh key={y} position={[0, y, 0.018]} material={[fixed.flagRed, fixed.flagGold, fixed.flagGreen][i]}>
              <planeGeometry args={[0.54, 0.13]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.02]} material={fixed.star}>
            <circleGeometry args={[0.05, 5]} />
          </mesh>
        </group>
      </group>

      {/* floating shelf with books (back wall, centre) */}
      <group position={[0.15, 1.5, -d / 2 + 0.13]}>
        <mesh material={M.woodwork} castShadow {...tag('woodwork')}>
          <boxGeometry args={[0.9, 0.04, 0.24]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[-0.32 + i * 0.075, 0.13, 0]} rotation={[0, 0, i === 4 ? 0.3 : 0]} material={fixed.book[i]}>
            <boxGeometry args={[0.055, 0.22, 0.17]} />
          </mesh>
        ))}
        <mesh position={[0.28, 0.1, 0]} material={fixed.pot}>
          <cylinderGeometry args={[0.07, 0.06, 0.14, 10]} />
        </mesh>
        <mesh position={[0.28, 0.25, 0]} material={fixed.leaf}>
          <sphereGeometry args={[0.12, 8, 6]} />
        </mesh>
      </group>

      {/* standing fan */}
      <group position={[0.15, 0, -2.45]}>
        <mesh position={[0, 0.02, 0]} material={fixed.metal}>
          <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
        </mesh>
        <mesh position={[0, 0.65, 0]} material={fixed.chrome}>
          <cylinderGeometry args={[0.018, 0.018, 1.25, 8]} />
        </mesh>
        <FanHead />
      </group>

      {/* bed (back-right) */}
      <group position={[1.75, 0, -1.85]}>
        <mesh position={[0, 0.17, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
          <boxGeometry args={[1.7, 0.3, 2.1]} />
        </mesh>
        <RoundedBox args={[1.6, 0.26, 2.0]} radius={0.06} position={[0, 0.45, 0.02]} material={fixed.white} castShadow />
        <RoundedBox args={[1.64, 0.1, 1.45]} radius={0.04} position={[0, 0.6, 0.3]} material={M.bedding} castShadow {...tag('bedding')} />
        <mesh position={[0, 0.47, 0.95]} material={M.accents} {...tag('accents')}>
          <boxGeometry args={[1.66, 0.3, 0.12]} />
        </mesh>
        {[-0.4, 0.4].map((x) => (
          <RoundedBox key={x} args={[0.62, 0.16, 0.36]} radius={0.07} position={[x, 0.68, -0.72]} material={M.bedding} castShadow {...tag('bedding')} />
        ))}
        <mesh position={[0, 0.85, -1.08]} material={M.woodwork} castShadow {...tag('woodwork')}>
          <boxGeometry args={[1.8, 1.3, 0.08]} />
        </mesh>
        {/* bedside tables + lamps */}
        {[-1.2, 1.2].map((x) => (
          <group key={x} position={[x, 0, -0.75]}>
            <mesh position={[0, 0.25, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
              <boxGeometry args={[0.46, 0.5, 0.42]} />
            </mesh>
            <mesh position={[0, 0.62, 0]} material={fixed.pot}>
              <cylinderGeometry args={[0.06, 0.09, 0.24, 10]} />
            </mesh>
            <mesh position={[0, 0.84, 0]} material={shadeMat}>
              <cylinderGeometry args={[0.1, 0.16, 0.22, 16, 1, true]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* wardrobe (right wall, front) */}
      <group position={[w / 2 - 0.34, 0, 1.25]}>
        <mesh position={[0, 1.05, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
          <boxGeometry args={[0.62, 2.1, 1.5]} />
        </mesh>
        <mesh position={[-0.315, 1.05, 0]} material={fixed.frame}>
          <boxGeometry args={[0.01, 2.0, 0.012]} />
        </mesh>
        {[-0.1, 0.1].map((z) => (
          <mesh key={z} position={[-0.33, 1.05, z]} material={fixed.chrome}>
            <boxGeometry args={[0.02, 0.32, 0.02]} />
          </mesh>
        ))}
      </group>

      {/* desk + laptop + chair (left wall, front) */}
      <group position={[-w / 2 + 0.4, 0, 1.75]}>
        <mesh position={[0, 0.74, 0]} material={M.woodwork} castShadow {...tag('woodwork')}>
          <boxGeometry args={[0.65, 0.04, 1.3]} />
        </mesh>
        {[-0.58, 0.58].map((z) => (
          <mesh key={z} position={[0, 0.37, z]} material={fixed.metal}>
            <boxGeometry args={[0.6, 0.72, 0.03]} />
          </mesh>
        ))}
        {/* laptop */}
        <mesh position={[0.05, 0.77, 0]} material={fixed.chrome}>
          <boxGeometry args={[0.24, 0.015, 0.34]} />
        </mesh>
        <mesh position={[-0.07, 0.88, 0]} rotation={[0, 0, -0.25]} material={fixed.screen}>
          <boxGeometry args={[0.012, 0.22, 0.34]} />
        </mesh>
        {/* desk lamp */}
        <mesh position={[0, 0.9, -0.5]} material={fixed.metal}>
          <cylinderGeometry args={[0.012, 0.012, 0.3]} />
        </mesh>
        <mesh position={[0.05, 1.05, -0.5]} rotation={[0, 0, -0.9]} material={shadeMat}>
          <coneGeometry args={[0.08, 0.12, 14, 1, true]} />
        </mesh>
        {/* chair */}
        <group position={[0.65, 0, 0.05]}>
          <RoundedBox args={[0.46, 0.08, 0.46]} radius={0.03} position={[0, 0.47, 0]} material={M.upholstery} {...tag('upholstery')} />
          <RoundedBox args={[0.08, 0.5, 0.44]} radius={0.03} position={[0.22, 0.75, 0]} material={M.upholstery} {...tag('upholstery')} />
          <mesh position={[0, 0.23, 0]} material={fixed.metal}>
            <cylinderGeometry args={[0.03, 0.03, 0.44]} />
          </mesh>
          <mesh position={[0, 0.03, 0]} material={fixed.metal}>
            <cylinderGeometry args={[0.24, 0.24, 0.03, 5]} />
          </mesh>
        </group>
      </group>

      {/* plants in the corners */}
      <Plant position={[-w / 2 + 0.35, 0, -d / 2 + 0.35]} pot={fixed.pot} leaf={fixed.leaf} scale={1.15} />
      <Plant position={[w / 2 - 0.4, 0, -0.2]} pot={fixed.pot} leaf={fixed.leaf} scale={0.9} />
      <Plant position={[-0.7, 0, 2.6]} pot={fixed.pot} leaf={fixed.leaf} scale={0.75} />


        </>
      )}

      {/* ── room lights (warm lamps; brightness follows lampsOn) ── */}
      <pointLight position={[0.6, h - 0.35, -0.4]} intensity={(mode === 'world' ? 6 : 3) + lampsOn * 5} distance={9} decay={1.6} color="#ffc98a" />
      {/* one extra lamp light only: every point light adds shader uniforms to
          every lit material, and with the skinned player in the room a third
          light pushed low-end GPUs (SwiftShader proof run) into context loss */}
      <pointLight position={[1.75, 1.0, -2.6]} intensity={lampsOn * 3.2} distance={5} decay={1.8} color="#ffb766" />
    </group>
  )
}

// a plane wall with a rectangular hole (4 panels), facing inward
function WallWithWindow({
  length, height, win, material, position, rotationY, tagProps,
}: {
  length: number
  height: number
  win: { c: number; w: number; sill: number; h: number }
  material: THREE.Material
  position: [number, number, number]
  rotationY: number
  tagProps: object
}) {
  // local x runs along the wall; panels: left, right, below, above
  const L = length / 2
  const x0 = win.c - win.w / 2
  const x1 = win.c + win.w / 2
  const top = win.sill + win.h
  const panels: [number, number, number, number][] = [
    [(-L + x0) / 2, height / 2, x0 + L, height],
    [(x1 + L) / 2, height / 2, L - x1, height],
    [win.c, win.sill / 2, win.w, win.sill],
    [win.c, (top + height) / 2, win.w, height - top],
  ]
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {panels.map(([x, y, pw, ph], i) => (
        <mesh key={i} position={[x, y, 0]} material={material} receiveShadow {...tagProps}>
          <planeGeometry args={[pw, ph]} />
        </mesh>
      ))}
    </group>
  )
}

function WindowFrame({ position, rotationY, w, h, glass, frame }: { position: [number, number, number]; rotationY: number; w: number; h: number; glass: THREE.Material; frame: THREE.Material }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={glass}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {[
        [0, h / 2, w + 0.08, 0.06],
        [0, -h / 2, w + 0.12, 0.08],
        [-w / 2, 0, 0.06, h],
        [w / 2, 0, 0.06, h],
        [0, 0, 0.04, h],
      ].map(([x, y, fw, fh], i) => (
        <mesh key={i} position={[x, y, 0.01]} material={frame}>
          <boxGeometry args={[fw, fh, 0.05]} />
        </mesh>
      ))}
    </group>
  )
}

function FanHead() {
  // registered as animated so the map's SceneBatcher never freezes the blades
  const blades = useAnimatedRef<THREE.Group>()
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 9
  })
  return (
    <group position={[0, 1.32, 0.04]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.008, 6, 28]} />
        <meshStandardMaterial color="#d9dce0" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0.01]}>
            <boxGeometry args={[0.07, 0.36, 0.005]} />
            <meshStandardMaterial color="#5aa7d6" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Plant({ position, pot, leaf, scale = 1 }: { position: [number, number, number]; pot: THREE.Material; leaf: THREE.Material; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} material={pot} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.4, 12]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos(i) * 0.12, 0.62 + (i % 3) * 0.16, Math.sin(i) * 0.12]} rotation={[Math.cos(i) * 0.5, i, Math.sin(i) * 0.5]} material={leaf} castShadow>
          <sphereGeometry args={[0.16, 7, 5]} />
        </mesh>
      ))}
    </group>
  )
}
