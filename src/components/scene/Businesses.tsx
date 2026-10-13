'use client'

// ─── Task 12: neighbourhood businesses + map-wide landmarks ─────────────────
// Low-poly builders for restaurants, chop bars, drinking spots, stores,
// boutiques, supermarkets, gaming centres, hotels, malls, a hospital,
// factories, farms, office blocks, FOR SALE / FOR RENT properties and the
// stylised Akwapim hills. Conventions (same as Buildings.tsx):
//   • local origin = footprint centre at ground level, the FRONT (door,
//     signboard) faces local +z; callers rotate the group.
//   • shells use the shared facade atlas (<Building>) → facade batch;
//   • every other part is a plain MeshStandardMaterial → SceneBatcher merges
//     them by material class; signboards use the shared sign atlas
//     (lib/signAtlas) → ONE draw call for every sign in the city;
//   • repeated small props (plastic chairs, umbrellas, crops) are NOT built
//     here — the district modules collect them into instanced meshes.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Building } from './Buildings'
import { signGeometry, getSignMaterial } from '@/lib/signAtlas'

type V3 = [number, number, number]

// ── tiny primitives ──────────────────────────────────────────────────────────
export function Box({ p, s, c, r = 0, rough = 0.85, metal = 0, cast = true, emissive, ei = 0 }: { p: V3; s: V3; c: string; r?: number; rough?: number; metal?: number; cast?: boolean; emissive?: string; ei?: number }) {
  return (
    <mesh position={p} rotation={[0, r, 0]} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} emissive={emissive ?? '#000000'} emissiveIntensity={ei} />
    </mesh>
  )
}

function Cyl({ p, r, h, c, seg = 8, rough = 0.85, metal = 0 }: { p: V3; r: number; h: number; c: string; seg?: number; rough?: number; metal?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  )
}

/** flat signboard from the shared sign atlas (facing +z) */
export function Sign({ text, bg, fg = '#ffffff', w, h, position, rotation = 0 }: { text: string; bg: string; fg?: string; w: number; h: number; position: V3; rotation?: number }) {
  const geo = useMemo(() => signGeometry(text, bg, fg, w, h), [text, bg, fg, w, h])
  return <mesh geometry={geo} material={getSignMaterial()} position={position} rotation={[0, rotation, 0]} name="sign" />
}

/** signboard on a backing board (visible thickness, mounted on two posts when `posts`) */
function BoardSign({ text, bg, fg, w, h, y, z = 0, posts = false }: { text: string; bg: string; fg?: string; w: number; h: number; y: number; z?: number; posts?: boolean }) {
  return (
    <group>
      <Box p={[0, y, z]} s={[w + 0.16, h + 0.16, 0.1]} c="#2b2622" />
      <Sign text={text} bg={bg} fg={fg} w={w} h={h} position={[0, y, z + 0.056]} />
      {posts && [-1, 1].map((k) => <Box key={k} p={[k * (w / 2 - 0.15), (y - h / 2) / 2, z - 0.02]} s={[0.1, y - h / 2, 0.1]} c="#5a5f66" metal={0.5} rough={0.5} />)}
    </group>
  )
}

function Door({ w = 1.2, h = 2.2, d, x = 0, c = '#5b3d28' }: { w?: number; h?: number; d: number; x?: number; c?: string }) {
  return (
    <mesh position={[x, h / 2, d / 2 + 0.03]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  )
}

function ShopWindow({ w, h = 1.4, y = 1.3, d, x = 0 }: { w: number; h?: number; y?: number; d: number; x?: number }) {
  return (
    <mesh position={[x, y, d / 2 + 0.035]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#ffd89a" emissive="#ffb85a" emissiveIntensity={0.55} roughness={0.4} />
    </mesh>
  )
}

function Awning({ w, d, y, color }: { w: number; d: number; y: number; color: string }) {
  return (
    // underside stays above head height (≥1.85 m) so the awning never becomes a walker collider
    <mesh position={[0, y, d / 2 + 0.6]} rotation={[0.35, 0, 0]} castShadow>
      <boxGeometry args={[w, 0.12, 1.3]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}

// plastic table (white/red) — plain meshes, batched
export function PlasticTable({ p, c = '#f1f1ee' }: { p: V3; c?: string }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.72, 0]} r={0.45} h={0.05} c={c} seg={10} rough={0.6} />
      <Cyl p={[0, 0.36, 0]} r={0.05} h={0.72} c={c} seg={6} rough={0.6} />
    </group>
  )
}

// ═════════════════════════════════════ NEIGHBOURHOOD BUSINESSES ════════════

interface BizProps { w: number; d: number; name: string; bg: string; fg?: string; wall?: string; door?: number }

/** generic storefront: facade shell + board sign + lit window + awning */
export function Storefront({ w, d, h = 3.6, name, bg, fg, wall = '#e8dcc2', awning = '#ce1126', door = 0, cols = 3 }: BizProps & { h?: number; awning?: string; cols?: number }) {
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey="biz" rows={1} cols={cols} litRatio={0.7} />
      <Box p={[0, h + 0.12, 0]} s={[w + 0.2, 0.24, d + 0.2]} c="#6d6a64" />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.92, 6)} h={Math.min(0.85, w * 0.24)} y={h - 0.5} z={d / 2 + 0.07} />
      <Door d={d} x={door} w={1.1} h={2.1} />
      {w > 3.4 && <ShopWindow w={Math.min(1.6, (w - 1.6) / 2 - 0.3)} d={d} x={door > 0 ? door - 1.6 : door + 1.6} />}
      <Awning w={w * 0.9} d={d} y={Math.max(2.3, h - 1.25)} color={awning} />
    </group>
  )
}

/** kiosk-sized boutique: mannequins in a lit window, pink accents */
export function Boutique(p: BizProps) {
  const { w, d } = p
  return (
    <group>
      <Storefront {...p} h={3.2} wall={p.wall ?? '#f4e6ea'} awning="#d4557a" cols={2} />
      {/* mannequin silhouettes in front of the window */}
      {w > 3.4 && [-0.25, 0.25].map((k) => (
        <group key={k} position={[1.6 + k, 0, d / 2 + 0.25]}>
          <Cyl p={[0, 0.75, 0]} r={0.05} h={1.5} c="#3a3a3a" seg={5} />
          <Box p={[0, 1.25, 0]} s={[0.36, 0.5, 0.18]} c={k < 0 ? '#e2372f' : '#fcd116'} cast={false} />
        </group>
      ))}
    </group>
  )
}

/** provision store: roller shutter half-open + crates of goods by the door */
export function Store(p: BizProps) {
  const { w, d } = p
  return (
    <group>
      <Storefront {...p} h={3.2} wall={p.wall ?? '#e8dcc2'} awning="#2e7fa8" cols={2} />
      {w > 3.4 && <Box p={[-w / 2 + 0.4, 0.3, d / 2 + 0.3]} s={[0.5, 0.6, 0.4]} c="#c9a36a" />}
      {w > 3.4 && <Box p={[-w / 2 + 0.4, 0.75, d / 2 + 0.3]} s={[0.42, 0.3, 0.36]} c="#e2372f" cast={false} />}
      {/* goods shelf behind the counter window */}
      <Box p={[0, 0.5, d / 2 - 0.3]} s={[Math.min(1.8, w - 1.2), 1.0, 0.3]} c="#c9a36a" cast={false} />
    </group>
  )
}

/** sit-down restaurant: storefront + a front terrace with tables (chairs + umbrellas are instanced by the district) */
export function Restaurant(p: BizProps & { apron: number }) {
  const { w, d, apron } = p
  const tables = Math.max(1, Math.floor(w / 2.4))
  return (
    <group>
      <Storefront {...p} h={3.8} wall={p.wall ?? '#f2e2c4'} awning="#4f9e4f" />
      {/* terrace deck (flat) + low planter edge */}
      <mesh position={[0, 0.04, d / 2 + apron / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, apron]} />
        <meshStandardMaterial color="#b98d5e" roughness={0.9} />
      </mesh>
      {Array.from({ length: tables }, (_, i) => (
        <PlasticTable key={i} p={[-w / 2 + (i + 0.5) * (w / tables), 0, d / 2 + apron * 0.55]} c="#f4f1ea" />
      ))}
    </group>
  )
}

/** chop bar: open-sided shed, back wall, cooking corner, long bench table */
export function ChopBar({ w, d, name, bg, fg }: BizProps) {
  const ph = 2.5
  return (
    <group>
      {/* slab + back wall + half side walls */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#9c8a74" roughness={0.95} />
      </mesh>
      <Box p={[0, 1.3, -d / 2 + 0.1]} s={[w, 2.6, 0.2]} c="#e4b93f" />
      {[-1, 1].map((k) => <Box key={k} p={[k * (w / 2 - 0.08), 0.5, -0.4]} s={[0.16, 1.0, d - 1.2]} c="#e4b93f" />)}
      {/* corner posts + corrugated roof (above head height) */}
      {[-1, 1].map((k) => <Box key={`p${k}`} p={[k * (w / 2 - 0.1), ph / 2, d / 2 - 0.1]} s={[0.14, ph, 0.14]} c="#6b4a2f" />)}
      <Box p={[0, ph + 0.08, 0]} s={[w + 0.5, 0.12, d + 0.5]} c="#8f949a" rough={0.55} metal={0.35} />
      {/* cooking corner: coal pot + big soup pot + smoke-blackened wall patch */}
      <Cyl p={[-w / 2 + 0.7, 0.3, -d / 2 + 0.6]} r={0.3} h={0.6} c="#3c3a38" />
      <Cyl p={[-w / 2 + 0.7, 0.75, -d / 2 + 0.6]} r={0.34} h={0.32} c="#9aa0a6" metal={0.5} rough={0.4} />
      {/* long table + 2 benches */}
      <Box p={[0.4, 0.75, 0.1]} s={[w * 0.55, 0.08, 0.8]} c="#8a5c36" />
      <Box p={[0.4, 0.37, 0.1]} s={[w * 0.5, 0.74, 0.12]} c="#6b4a2f" />
      {[-0.75, 0.95].map((dz) => <Box key={dz} p={[0.4, 0.22, 0.1 + dz]} s={[w * 0.55, 0.44, 0.3]} c="#7a5230" />)}
      {/* roof fascia sign */}
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w - 0.2, 5)} h={0.7} y={ph + 0.5} z={d / 2 + 0.2} />
    </group>
  )
}

/** drinking spot: bar counter kiosk with canopy, cool box, crates (seating instanced) */
export function DrinkingSpot({ w, d, name, bg, fg }: BizProps) {
  const cw = Math.min(2.6, w - 0.6)
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#a8916f" roughness={0.95} />
      </mesh>
      {/* bar counter at the back of the plot */}
      <Box p={[0, 0.55, -d / 2 + 0.6]} s={[cw, 1.1, 0.8]} c="#2e7fa8" />
      <Box p={[0, 1.13, -d / 2 + 0.6]} s={[cw + 0.2, 0.07, 1.0]} c="#8a5c36" />
      {/* canopy on posts over the counter (underside 2.3 m) */}
      {[-1, 1].map((k) => <Box key={k} p={[k * (cw / 2 + 0.05), 1.2, -d / 2 + 0.2]} s={[0.1, 2.4, 0.1]} c="#5a5f66" metal={0.4} rough={0.5} />)}
      <Box p={[0, 2.45, -d / 2 + 0.75]} s={[cw + 0.6, 0.1, 1.7]} c="#ce1126" />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(cw + 0.4, 3.4)} h={0.55} y={2.79} z={-d / 2 + 1.5} />
      {/* fridge / cool box + beer crates */}
      <Box p={[cw / 2 + 0.45, 0.6, -d / 2 + 0.45]} s={[0.6, 1.2, 0.6]} c="#e9ecef" rough={0.4} />
      <Box p={[-cw / 2 - 0.45, 0.2, -d / 2 + 0.45]} s={[0.5, 0.4, 0.4]} c="#f6b21b" />
      <Box p={[-cw / 2 - 0.45, 0.55, -d / 2 + 0.45]} s={[0.5, 0.3, 0.4]} c="#4f9e4f" />
    </group>
  )
}

/** supermarket: wide single-storey box, glass frontage, big roof sign, trolleys */
export function Supermarket({ w, d, name, bg, fg, wall = '#f4f1ea', door = 0 }: BizProps) {
  const h = 4.6
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey="super" rows={1} cols={Math.max(3, Math.round(w / 2))} litRatio={0.8} />
      <Box p={[0, h + 0.2, 0]} s={[w + 0.2, 0.4, d + 0.2]} c="#c9c4ba" />
      {/* brand band along the fascia */}
      <Box p={[0, h - 0.55, d / 2 + 0.06]} s={[w, 0.9, 0.08]} c={bg} cast={false} />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.7, 7)} h={1.0} y={h + 0.95} z={d / 2 - 0.4} posts />
      {/* glass frontage + doors */}
      <ShopWindow w={Math.max(1, w - 2.6)} h={1.9} y={1.2} d={d} />
      <Door d={d} x={door} w={1.8} h={2.3} c="#2c3e50" />
      {/* trolley bay */}
      <Box p={[door + (door > 0 ? -2 : 2), 0.5, d / 2 + 0.5]} s={[1.2, 1.0, 0.5]} c="#9aa0a6" metal={0.6} rough={0.4} />
    </group>
  )
}

/** gaming centre: dark shell, neon edging, arcade cabinets by the door */
export function GamingCenter({ w, d, name, bg, fg = '#38f2ff' }: BizProps) {
  const h = 4.2
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall="#56428a" facadeKey="game" rows={1} cols={2} litRatio={0.9} />
      <Box p={[0, h + 0.15, 0]} s={[w + 0.2, 0.3, d + 0.2]} c="#24193d" />
      {/* neon strips (one emissive bucket) */}
      <Box p={[0, h - 0.05, d / 2 + 0.06]} s={[w, 0.08, 0.06]} c="#38f2ff" emissive="#38f2ff" ei={1.6} cast={false} />
      <Box p={[0, 0.12, d / 2 + 0.06]} s={[w, 0.06, 0.06]} c="#ff3df2" emissive="#ff3df2" ei={1.6} cast={false} />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.92, 6)} h={0.9} y={h - 0.75} z={d / 2 + 0.08} />
      <Door d={d} w={1.3} h={2.2} c="#120c22" />
      {[-1, 1].map((k) => (
        <group key={k} position={[k * (w / 2 - 0.6), 0, d / 2 + 0.4]}>
          <Box p={[0, 0.85, 0]} s={[0.6, 1.7, 0.55]} c={k < 0 ? '#ce1126' : '#2e7fa8'} />
          <Box p={[0, 1.25, 0.29]} s={[0.46, 0.36, 0.02]} c="#38f2ff" emissive="#38f2ff" ei={1.6} cast={false} />
        </group>
      ))}
    </group>
  )
}

/** hotel: multi-storey facade, balcony bands, entrance canopy, rooftop sign */
export function Hotel({ w, d, name, bg, fg, floors = 3, wall = '#f4efe6' }: BizProps & { floors?: number }) {
  const fh = 3.05
  const h = fh * floors
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey="hotel" rows={floors} cols={Math.max(3, Math.round(w / 1.8))} litRatio={0.75} />
      <Box p={[0, h + 0.15, 0]} s={[w + 0.3, 0.3, d + 0.3]} c="#b9ab94" />
      {Array.from({ length: floors - 1 }, (_, i) => (
        <Box key={i} p={[0, fh * (i + 1), d / 2 + 0.35]} s={[w * 0.92, 0.12, 0.7]} c="#d9cbb2" />
      ))}
      {/* entrance canopy on two posts (underside 2.5 m) */}
      <Box p={[0, 2.6, d / 2 + 1.0]} s={[2.8, 0.16, 2.0]} c={bg} />
      {[-1, 1].map((k) => <Box key={k} p={[k * 1.25, 1.27, d / 2 + 1.85]} s={[0.1, 2.54, 0.1]} c="#c8c8c8" metal={0.5} rough={0.4} />)}
      <Door d={d} w={1.6} h={2.3} c="#2c3e50" />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.9, 7)} h={0.85} y={h + 0.75} z={d / 2 - 0.3} posts />
    </group>
  )
}

// ════════════════════════════════════════════ MAP-WIDE LANDMARKS ═════════════

/** shopping mall: two-storey block with glass atrium and parking apron */
export function Mall({ name, w = 30, d = 18 }: { name: string; w?: number; d?: number }) {
  const h = 9
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall="#e9e2d6" facadeKey="mall" rows={2} cols={10} litRatio={0.8} />
      <Box p={[0, h + 0.25, 0]} s={[w + 0.4, 0.5, d + 0.4]} c="#cfc6b6" />
      {/* glass atrium */}
      <Building position={[0, 5.5, d / 2 + 1.5]} size={[10, 11, 3]} wall="#3d7fa6" facadeKey="mall-atrium" rows={4} cols={4} glass litRatio={0.7} />
      <BoardSign text={name} bg="#ce1126" fg="#ffffff" w={9} h={1.4} y={12.2} z={d / 2 + 3.1} />
      {/* parking apron + bays */}
      <mesh position={[0, 0.05, d / 2 + 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 6, 16]} />
        <meshStandardMaterial color="#666b73" roughness={0.9} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 1 + i * ((w - 2) / 8), 0.06, d / 2 + 11]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 5]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** hospital: white 3-storey main block + wing, red cross, ambulance bay */
export function Hospital({ name }: { name: string }) {
  return (
    <group>
      <Building position={[0, 6, 0]} size={[24, 12, 12]} wall="#f6f4ef" facadeKey="hosp" rows={4} cols={9} litRatio={0.85} />
      <Building position={[16, 3.5, 2]} size={[8, 7, 8]} wall="#eef2f3" facadeKey="hosp-wing" rows={2} cols={3} litRatio={0.8} />
      <Box p={[0, 12.2, 0]} s={[24.4, 0.4, 12.4]} c="#d7d2c8" />
      {/* red cross on a white panel (front + roof) */}
      <Box p={[-8, 9, 6.12]} s={[3, 3, 0.12]} c="#ffffff" cast={false} />
      <Box p={[-8, 9, 6.2]} s={[2.2, 0.7, 0.06]} c="#d81e1e" emissive="#d81e1e" ei={0.6} cast={false} />
      <Box p={[-8, 9, 6.2]} s={[0.7, 2.2, 0.06]} c="#d81e1e" emissive="#d81e1e" ei={0.6} cast={false} />
      <Box p={[6, 12.5, 0]} s={[4, 0.06, 1.2]} c="#d81e1e" cast={false} />
      <Box p={[6, 12.5, 0]} s={[1.2, 0.06, 4]} c="#d81e1e" cast={false} />
      <BoardSign text={name} bg="#1f5f8b" fg="#ffffff" w={11} h={1.2} y={13.6} z={5.5} posts />
      {/* ambulance bay canopy + ambulance */}
      <Box p={[16, 3.2, 9]} s={[8, 0.2, 5]} c="#d81e1e" />
      {[-1, 1].map((k) => <Box key={k} p={[16 + k * 3.8, 1.55, 11.3]} s={[0.15, 3.1, 0.15]} c="#c8c8c8" metal={0.5} rough={0.4} />)}
      <group position={[16, 0, 9.5]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 1.1, 0]} s={[1.9, 1.7, 4.4]} c="#ffffff" />
        <Box p={[0, 0.35, 0]} s={[1.95, 0.25, 4.45]} c="#d81e1e" cast={false} />
        <Box p={[0, 2.05, -0.8]} s={[0.9, 0.18, 0.3]} c="#2e7fa8" emissive="#2e7fa8" ei={1.4} cast={false} />
        <Box p={[0, 1.4, 2.22]} s={[1.6, 0.6, 0.02]} c="#1e2a33" cast={false} />
      </group>
      <mesh position={[0, 0.05, 13]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[34, 12]} />
        <meshStandardMaterial color="#666b73" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** factory shed: sawtooth roof, chimney, tanks, loading door */
export function Factory({ name, w = 22, d = 14, chimney = true, tint = '#c9c4ba' }: { name: string; w?: number; d?: number; chimney?: boolean; tint?: string }) {
  const h = 7
  const teeth = Math.max(3, Math.round(w / 5))
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={tint} facadeKey="factory" rows={1} cols={6} litRatio={0.35} />
      {/* sawtooth roof */}
      {Array.from({ length: teeth }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / teeth), h + 0.9, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.25, 1.25, d, 3, 1]} />
          <meshStandardMaterial color="#8f949a" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
      {/* loading door */}
      <mesh position={[w / 4, 2.2, d / 2 + 0.03]}>
        <planeGeometry args={[4, 4.4]} />
        <meshStandardMaterial color="#5e6a72" roughness={0.5} metalness={0.5} />
      </mesh>
      {chimney && (
        <group position={[-w / 2 - 2, 0, -d / 4]}>
          <Cyl p={[0, 7.5, 0]} r={0.9} h={15} c="#a35d3c" seg={10} />
          <Cyl p={[0, 13.8, 0]} r={0.95} h={0.6} c="#f4f1ea" seg={10} />
          <Cyl p={[0, 11.8, 0]} r={0.95} h={0.6} c="#f4f1ea" seg={10} />
        </group>
      )}
      {/* storage tanks */}
      {[0, 1].map((i) => <Cyl key={i} p={[w / 2 + 2.2, 2.5, -d / 4 + i * 4]} r={1.5} h={5} c="#d9dde0" seg={12} rough={0.4} metal={0.4} />)}
      <BoardSign text={name} bg="#2c3e50" fg="#fcd116" w={Math.min(w * 0.7, 10)} h={1.2} y={h - 1.0} z={d / 2 + 0.06} />
    </group>
  )
}

/** office block: glass tower with a company sign */
export function OfficeBlock({ name, w = 10, d = 10, h = 18, hue = '#2f5d7c', bg = '#1f3b57' }: { name: string; w?: number; d?: number; h?: number; hue?: string; bg?: string }) {
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={hue} facadeKey="office" rows={Math.round(h / 3)} cols={4} glass litRatio={0.6} />
      <Box p={[0, h + 0.3, 0]} s={[w + 0.4, 0.6, d + 0.4]} c="#2b2f36" />
      <Box p={[0, 1.6, d / 2 + 1]} s={[4, 0.15, 2]} c="#2b2f36" />
      <BoardSign text={name} bg={bg} fg="#ffffff" w={Math.min(w * 0.9, 8)} h={1.0} y={h + 1.4} z={0} posts />
    </group>
  )
}

/** property for sale / rent: house + a FOR SALE board on posts in the yard */
export function PropertyListing({ label, bg, wall = '#e8dcc2', storeys = 1, w = 8, d = 7 }: { label: string; bg: string; wall?: string; storeys?: number; w?: number; d?: number }) {
  const h = storeys * 3.2
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey="prop" rows={storeys} cols={3} litRatio={0.15} />
      <mesh position={[0, h + 1.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.75, 2, 4]} />
        <meshStandardMaterial color="#a84e2c" roughness={0.8} />
      </mesh>
      <Door d={d} />
      <group position={[w / 2 - 0.8, 0, d / 2 + 2.2]}>
        <BoardSign text={label} bg={bg} fg="#ffffff" w={2.4} h={0.9} y={1.9} posts />
      </group>
    </group>
  )
}

/** farm hut: mud walls + thatch cone */
export function FarmHut() {
  return (
    <group>
      <Cyl p={[0, 1.1, 0]} r={2} h={2.2} c="#a8703f" seg={10} />
      <mesh position={[0, 3.0, 0]} castShadow>
        <coneGeometry args={[2.7, 1.8, 10]} />
        <meshStandardMaterial color="#c9a85a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.9, 2.02]}>
        <planeGeometry args={[0.9, 1.8]} />
        <meshStandardMaterial color="#3b2a1c" />
      </mesh>
    </group>
  )
}

// ── stylised low-poly hills (Akwapim ridge backdrop) ────────────────────────
// One merged, vertex-coloured geometry: each hill is a squashed low-poly
// icosahedron, coloured green→rock with height. Plain material → batched.
export function Hills({ items }: { items: { x: number; z: number; r: number; h: number; seed: number }[] }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const low = new THREE.Color('#5d8a45')
    const mid = new THREE.Color('#6f9a52')
    const top = new THREE.Color('#8f8a70')
    for (const it of items) {
      const g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 1) // already non-indexed
      const pos = g.attributes.position as THREE.BufferAttribute
      const cols = new Float32Array(pos.count * 3)
      const c = new THREE.Color()
      // per-face jitter so ridges read as faceted (deterministic by seed)
      let s = it.seed * 9301 + 49297
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
      const jit = new Map<string, number>()
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
        const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`
        if (!jit.has(k)) jit.set(k, 0.82 + rnd() * 0.36)
        const j = jit.get(k)!
        x *= it.r * j; z *= it.r * j
        y = Math.max(y, -0.05) * it.h * j
        pos.setXYZ(i, x + it.x, y, z + it.z)
      }
      for (let f = 0; f < pos.count; f += 3) {
        const yAvg = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3
        const t = yAvg / it.h
        if (t > 0.72) c.copy(top)
        else if (t > 0.35) c.copy(mid).lerp(top, (t - 0.35) * 0.8)
        else c.copy(low).lerp(mid, t * 2.4)
        for (let v = 0; v < 3; v++) { cols[(f + v) * 3] = c.r; cols[(f + v) * 3 + 1] = c.g; cols[(f + v) * 3 + 2] = c.b }
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3))
      g.deleteAttribute('uv')
      g.computeVertexNormals()
      parts.push(g)
    }
    return parts.length ? mergeAll(parts) : null
  }, [items])
  if (!geo) return null
  return (
    <mesh geometry={geo} receiveShadow name="hills" userData={{ noCollide: true }}>
      <meshStandardMaterial vertexColors roughness={0.95} flatShading />
    </mesh>
  )
}

function mergeAll(parts: THREE.BufferGeometry[]) {
  // tiny local merge (all parts are non-indexed with position/normal/color)
  let n = 0
  for (const p of parts) n += p.attributes.position.count
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3)
  let o = 0
  for (const p of parts) {
    pos.set(p.attributes.position.array as Float32Array, o * 3)
    nor.set(p.attributes.normal.array as Float32Array, o * 3)
    col.set(p.attributes.color.array as Float32Array, o * 3)
    o += p.attributes.position.count
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

// ═════════════════════════ Task 13: salons, barbers, gyms, cafés, clubs ═════
// Same conventions: facade shells → facade batch, plain parts → SceneBatcher,
// signboards → the shared sign atlas (one draw call for every sign).

/** hair salon: pink storefront, styling chair + dryer hood behind the window */
export function Salon(p: BizProps) {
  const { w, d } = p
  return (
    <group>
      <Storefront {...p} h={3.4} wall={p.wall ?? '#f7e1ea'} awning="#d4557a" cols={2} />
      {/* styling chair + hood dryer seen through the lit window */}
      <Box p={[w > 3.4 ? 1.6 : 0.9, 0.45, d / 2 - 0.45]} s={[0.55, 0.9, 0.55]} c="#2b2622" cast={false} />
      <Box p={[w > 3.4 ? 1.6 : 0.9, 1.45, d / 2 - 0.55]} s={[0.5, 0.35, 0.45]} c="#d9d9d9" cast={false} />
      {/* wig-head display shelf by the door */}
      <Box p={[-w / 2 + 0.45, 0.55, d / 2 + 0.3]} s={[0.5, 1.1, 0.35]} c="#8a5c36" />
      <Cyl p={[-w / 2 + 0.45, 1.25, d / 2 + 0.3]} r={0.14} h={0.28} c="#3a2a22" seg={8} />
    </group>
  )
}

/** barbering shop: blue/white storefront + the striped barber pole by the door */
export function Barber(p: BizProps) {
  const { w, d } = p
  const px = w / 2 - 0.35
  return (
    <group>
      <Storefront {...p} h={3.3} wall={p.wall ?? '#e6eef3'} awning="#2e7fa8" cols={2} />
      {/* barber pole: white column with red + blue bands */}
      <Cyl p={[px, 1.2, d / 2 + 0.22]} r={0.13} h={1.5} c="#f4f1ea" seg={10} />
      {[0.65, 1.05, 1.45, 1.85].map((y, i) => (
        <Cyl key={y} p={[px, y, d / 2 + 0.22]} r={0.135} h={0.14} c={i % 2 ? '#2e7fa8' : '#ce1126'} seg={10} />
      ))}
      <Cyl p={[px, 2.05, d / 2 + 0.22]} r={0.16} h={0.12} c="#c9c9c9" seg={10} metal={0.5} rough={0.4} />
      {/* waiting bench out front */}
      <Box p={[-w / 2 + 1.0, 0.24, d / 2 + 0.35]} s={[1.4, 0.48, 0.36]} c="#6b4a2f" />
    </group>
  )
}

/** gym / fitness centre: tall shell, glass frontage, dumbbell rack + a bench outside */
export function Gym({ w, d, name, bg, fg }: BizProps) {
  const h = 5.2
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall="#c8cdd2" facadeKey="gym" rows={1} cols={Math.max(3, Math.round(w / 2))} litRatio={0.9} />
      <Box p={[0, h + 0.15, 0]} s={[w + 0.2, 0.3, d + 0.2]} c="#3b4048" />
      <Box p={[0, h - 0.4, d / 2 + 0.06]} s={[w, 0.7, 0.08]} c="#1b1b1b" cast={false} />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.85, 7)} h={0.95} y={h + 0.95} z={d / 2 - 0.4} posts />
      <ShopWindow w={Math.max(1, w - 2.4)} h={2.4} y={1.5} d={d} />
      <Door d={d} w={1.4} h={2.3} c="#1b1b1b" />
      {/* giant dumbbell sculpture on the fascia (plain meshes) */}
      <Box p={[w / 2 - 1.1, h - 0.4, d / 2 + 0.25]} s={[1.2, 0.12, 0.12]} c="#9aa0a6" metal={0.6} rough={0.4} />
      {[-1, 1].map((k) => <Box key={k} p={[w / 2 - 1.1 + k * 0.6, h - 0.4, d / 2 + 0.25]} s={[0.18, 0.55, 0.55]} c="#1b1b1b" />)}
      {/* outdoor pull-up bar (posts + bar above head height) */}
      {[-1, 1].map((k) => <Box key={`b${k}`} p={[-w / 2 + 1.2 + k * 0.7, 1.15, d / 2 + 0.9]} s={[0.1, 2.3, 0.1]} c="#5a5f66" metal={0.5} rough={0.5} />)}
      <Box p={[-w / 2 + 1.2, 2.32, d / 2 + 0.9]} s={[1.5, 0.07, 0.07]} c="#9aa0a6" metal={0.6} rough={0.4} />
    </group>
  )
}

/** café: cream storefront, green awning, pastry window (terrace tables via seating) */
export function Cafe(p: BizProps & { apron: number }) {
  const { w, d, apron } = p
  return (
    <group>
      <Storefront {...p} h={3.5} wall={p.wall ?? '#f3ead8'} awning="#6b8e23" cols={2} />
      <mesh position={[0, 0.04, d / 2 + apron / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, apron]} />
        <meshStandardMaterial color="#c2a27a" roughness={0.9} />
      </mesh>
      {/* coffee-cup sign drum on the roof edge */}
      <Cyl p={[w / 2 - 0.6, 3.9, d / 2 - 0.4]} r={0.35} h={0.55} c="#f4f1ea" seg={10} />
      <Cyl p={[w / 2 - 0.6, 4.2, d / 2 - 0.4]} r={0.36} h={0.06} c="#6b3e26" seg={10} />
    </group>
  )
}

/** night club: dark shell, neon edging, entrance canopy, velvet-rope posts */
export function Club({ w, d, name, bg, fg = '#ff3df2' }: BizProps) {
  const h = 4.8
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall="#2d2440" facadeKey="club" rows={1} cols={2} litRatio={0.35} />
      <Box p={[0, h + 0.15, 0]} s={[w + 0.2, 0.3, d + 0.2]} c="#141019" />
      <Box p={[0, h - 0.05, d / 2 + 0.06]} s={[w, 0.08, 0.06]} c="#ff3df2" emissive="#ff3df2" ei={1.6} cast={false} />
      <Box p={[0, 0.12, d / 2 + 0.06]} s={[w, 0.06, 0.06]} c="#38f2ff" emissive="#38f2ff" ei={1.6} cast={false} />
      {[-1, 1].map((k) => <Box key={k} p={[k * (w / 2 + 0.04), h / 2, d / 2 + 0.04]} s={[0.06, h, 0.06]} c="#38f2ff" emissive="#38f2ff" ei={1.6} cast={false} />)}
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.9, 6.5)} h={0.95} y={h - 0.85} z={d / 2 + 0.08} />
      <Door d={d} w={1.6} h={2.3} c="#0b0812" />
      {/* entrance canopy (underside 2.6 m) */}
      <Box p={[0, 2.7, d / 2 + 0.8]} s={[2.6, 0.14, 1.6]} c="#141019" />
      {/* velvet rope posts (low, kept tight to the facade) */}
      {[-1.6, -0.9, 0.9, 1.6].map((x) => <Cyl key={x} p={[x, 0.45, d / 2 + 0.5]} r={0.05} h={0.9} c="#d4af37" seg={6} metal={0.6} rough={0.4} />)}
    </group>
  )
}

/** lane kiosk: small lockable box shop with a serving hatch + atlas sign */
export function KioskBox({ w, d, name, bg, fg, wall = '#e8dcc2' }: BizProps) {
  const h = 2.6
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall={wall} facadeKey="kiosk" rows={1} cols={1} litRatio={0.6} />
      <Box p={[0, h + 0.08, 0.15]} s={[w + 0.3, 0.12, d + 0.6]} c="#8f949a" rough={0.55} metal={0.35} />
      <Box p={[0, 1.0, d / 2 + 0.18]} s={[w * 0.75, 0.08, 0.36]} c="#8a5c36" />
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w - 0.1, 3.2)} h={0.5} y={h - 0.4} z={d / 2 + 0.07} />
    </group>
  )
}

/** port / industrial warehouse: tall shell, metal roof, roller doors, big sign */
export function Warehouse({ w, d, name, bg, fg }: BizProps) {
  const h = 8
  return (
    <group>
      <Building position={[0, h / 2, 0]} size={[w, h, d]} wall="#b9b3a6" facadeKey="warehouse" rows={2} cols={Math.max(4, Math.round(w / 3))} litRatio={0.25} />
      <Box p={[0, h + 0.35, 0]} s={[w + 0.6, 0.7, d + 0.6]} c="#8f949a" rough={0.55} metal={0.35} />
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * (w / 3.2), 2.2, d / 2 + 0.04]}>
          <planeGeometry args={[3.4, 4.4]} />
          <meshStandardMaterial color="#6f7780" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.6, 10)} h={1.3} y={h - 1.1} z={d / 2 + 0.08} />
    </group>
  )
}

/** open market hall: posts + corrugated roof over long stall tables */
export function MarketHall({ w, d, name, bg, fg }: BizProps) {
  const ph = 3.4
  const nx = Math.max(2, Math.round(w / 4))
  return (
    <group>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#a39a8a" roughness={0.95} />
      </mesh>
      {Array.from({ length: nx + 1 }, (_, i) => -w / 2 + 0.2 + (i * (w - 0.4)) / nx).map((x) =>
        [-1, 1].map((k) => <Box key={`${x}${k}`} p={[x, ph / 2, k * (d / 2 - 0.2)]} s={[0.18, ph, 0.18]} c="#6b4a2f" />)
      )}
      <Box p={[0, ph + 0.1, 0]} s={[w + 0.8, 0.14, d + 0.8]} c="#a84e2c" rough={0.55} metal={0.35} />
      <Box p={[0, ph + 0.55, 0]} s={[w + 0.2, 0.12, d * 0.45]} c="#c65a33" rough={0.55} metal={0.35} />
      {/* long trading tables (gaps every bay so shoppers walk through) */}
      {Array.from({ length: nx }, (_, i) => -w / 2 + ((i + 0.5) * w) / nx).map((x, i) => (
        <group key={x}>
          <Box p={[x, 0.42, -d / 4]} s={[w / nx - 1.4, 0.84, 1.0]} c={['#ce1126', '#fcd116', '#4f9e4f', '#e08a3c'][i % 4]} />
          <Box p={[x, 0.42, d / 4]} s={[w / nx - 1.4, 0.84, 1.0]} c={['#2e7fa8', '#e08a3c', '#ce1126', '#fcd116'][i % 4]} />
        </group>
      ))}
      <BoardSign text={name} bg={bg} fg={fg} w={Math.min(w * 0.6, 9)} h={1.0} y={ph + 1.25} z={d / 2 - 0.2} posts />
    </group>
  )
}
