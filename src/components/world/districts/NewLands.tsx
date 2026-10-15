'use client'

// ─── Task 13: the new land — west (Chorkor West, Mamprobi, Dansoman West,
// Kaneshie Market, Chorkor Harbour, KORLE ISLAND) and east (Teshie–Nungua
// Estates, Sakumono, TEMA PORT). Every coordinate comes from lib/t13Layout.ts,
// generated + audited by tools/t13_layout.py (roads, Task 12 colliders, water,
// plate edge, each other). Businesses (salons, barbers, gyms, cafés, clubs,
// kiosks, warehouses, market halls) render through TownLife like every other
// business so their signs share the one sign-atlas draw call.
//
// Draw-call budget: houses → facade batch; containers / cranes / ships /
// canoes / decks → SceneBatcher buckets (plain MeshStandardMaterials); props
// → one InstancedMesh per kind for the whole new land.
import { CompoundHouse } from '../../scene/Buildings'
import { VendorTable, BannerGate } from '../../scene/Expansion3'
import { Guardrail } from '../../scene/Expansion5'
import { Rocks } from '../../scene/Expansion2'
import {
  T13_HOUSES, T13_WALLS, T13_STALLS, T13_LAMPS, T13_TREES, T13_PALMS, T13_PEOPLE, T13_SHRUBS, T13_GRASS,
  T13_CONTAINERS, T13_CRANES, T13_SHIPS, T13_CANOES, T13_OVENS, T13_BOLLARDS, T13_GATES, type T13Prop,
} from '@/lib/t13Layout'
import { COMMUNITY } from '@/lib/communityLayout'
import { TEMA_FLEET, WHEEL_R, type FleetVehicle } from '@/lib/temaFleet'
import {
  InstancedLamps, InstancedTrees, InstancedPalms, InstancedPeople, InstancedShrubs, InstancedGrassTufts,
} from '../InstancedNature'

const PI = Math.PI
const ISL_Y = 0.44
const KORLE = { x0: -260, x1: -196, z0: 62, z1: 100, cx: -228, cz: 81 }

// Task 14: the community realism pass (CommunityQuarter) owns the Chorkor West
// block — its generated rows, stalls and random scatter are replaced there.
const CZ = COMMUNITY.zone
const inCommunity = (x: number, z: number) => x >= CZ.x0 && x <= CZ.x1 && z >= CZ.z0 && z <= CZ.z1
const outside = (it: T13Prop) => !inCommunity(it.p[0], it.p[1])
const onKorle = (it: T13Prop) => it.p[0] >= KORLE.x0 && it.p[0] <= KORLE.x1 && it.p[1] >= KORLE.z0 && it.p[1] <= KORLE.z1
const split = (items: T13Prop[]) => [items.filter((i) => !onKorle(i) && outside(i)), items.filter(onKorle)] as const

const lift = (items: readonly T13Prop[]) => items.map((i) => ({ ...i, y: ISL_Y }))
const [LAMPS_T13] = split(T13_LAMPS)
// ew2-side lamps on the zone's north kerb stay; community lamps are appended
const LAMPS_L = [...LAMPS_T13, ...T13_LAMPS.filter((l) => !outside(l) && l.p[1] < -25.5), ...(COMMUNITY.lamps as T13Prop[])]
// scenery trees on the north apron fields (off-plate — no colliders needed)
const NORTH_FIELD_TREES: T13Prop[] = Array.from({ length: 34 }, (_, i) => {
  const east = i % 2 === 1
  const k = Math.floor(i / 2)
  return { p: [east ? 206 + ((k * 37) % 130) : -276 + ((k * 41) % 122), -122 - ((k * 23) % 56)] as [number, number], s: 0.9 + (k % 4) * 0.12 }
})
const [TREES_L, TREES_I] = split(T13_TREES)
const [PALMS_L, PALMS_I] = split(T13_PALMS)
const [PEOPLE_L, PEOPLE_I] = split(T13_PEOPLE)
const [SHRUBS_L, SHRUBS_I] = split(T13_SHRUBS)
const [GRASS_L, GRASS_I] = split(T13_GRASS)

function B({ p, s, c, r = 0, rough = 0.85, metal = 0, cast = true }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; rough?: number; metal?: number; cast?: boolean }) {
  return (
    <mesh position={p} rotation={[0, r, 0]} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  )
}

// ── houses + market stalls ───────────────────────────────────────────────────
function Homes() {
  return (
    <group name="t13-homes">
      {T13_HOUSES.map((h, i) => (h.hood === 'chorkor' && inCommunity(h.x, h.z)) ? null : (
        <CompoundHouse
          key={`t13h-${i}`} position={[h.x, 0, h.z]} rotation={h.rot}
          wall={T13_WALLS[h.wall]} w={6.4} d={5.6} h={3.8} variant={h.variant}
          roof={h.metal ? 'metal' : 'tile'} walled={i % 9 === 4}
        />
      ))}
      {T13_STALLS.map(([x, z, r, c], i) => inCommunity(x, z) ? null : (
        <VendorTable key={`t13s-${i}`} position={[x, 0, z]} rotation={r} colorIndex={c} />
      ))}
    </group>
  )
}

// ── TEMA PORT: containers, ship-to-shore cranes, pier, quay wall, ships ─────
function Container({ x, z, len, rot, color, tiers }: { x: number; z: number; len: number; rot: number; color: string; tiers: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {Array.from({ length: tiers }, (_, t) => (
        <group key={t}>
          <B p={[0, 1.3 + t * 2.62, 0]} s={[len, 2.58, 2.44]} c={t % 2 ? shade(color) : color} rough={0.55} metal={0.35} />
          {/* door end ribs */}
          <B p={[len / 2 + 0.02, 1.3 + t * 2.62, 0]} s={[0.06, 2.4, 2.3]} c="#3b3b3b" rough={0.55} metal={0.35} cast={false} />
        </group>
      ))}
    </group>
  )
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 255) - 28), g = Math.max(0, ((n >> 8) & 255) - 28), b = Math.max(0, (n & 255) - 28)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/** ship-to-shore gantry crane: legs on the quay apron (z ±3.5), boom out over the water */
function GantryCrane({ x, z, rot }: { x: number; z: number; rot: number }) {
  const blue = '#2e7fa8'
  const white = '#e9ecef'
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[-3, 3].map((lx) => [-3.5, 3.5].map((lz) => (
        <B key={`${lx}${lz}`} p={[lx, 7, lz]} s={[0.6, 14, 0.6]} c={blue} rough={0.55} metal={0.35} />
      )))}
      {/* sill beams (low, between the legs along z only — walkers pass in x) */}
      {[-3, 3].map((lx) => <B key={`s${lx}`} p={[lx, 0.35, 0]} s={[0.7, 0.7, 7.6]} c="#d4a017" rough={0.55} metal={0.35} />)}
      {/* portal frame */}
      {[-3, 3].map((lx) => <B key={`t${lx}`} p={[lx, 14.4, 0]} s={[0.7, 0.8, 8]} c={blue} rough={0.55} metal={0.35} />)}
      {[-3.5, 3.5].map((lz) => <B key={`x${lz}`} p={[0, 14.4, lz]} s={[6.7, 0.8, 0.7]} c={blue} rough={0.55} metal={0.35} />)}
      {/* upper A-frame + boom (back-reach over the apron, out-reach over the ship) */}
      {[-2.6, 2.6].map((lx) => <B key={`a${lx}`} p={[lx, 19, -1.5]} s={[0.5, 9, 0.5]} c={white} rough={0.55} metal={0.35} />)}
      {[-1.4, 1.4].map((lx) => <B key={`b${lx}`} p={[lx, 17.6, 7]} s={[0.55, 0.9, 34]} c={white} rough={0.55} metal={0.35} />)}
      <B p={[0, 23.6, -1.5]} s={[5.8, 0.6, 0.6]} c={white} rough={0.55} metal={0.35} />
      {/* machinery house + operator cab + trolley */}
      <B p={[0, 18.9, -6.5]} s={[4.2, 2.2, 3.6]} c={blue} rough={0.55} metal={0.35} />
      <B p={[0, 16.3, 10]} s={[1.6, 1.4, 1.8]} c="#fcd116" rough={0.7} />
      <B p={[0, 13.5, 10]} s={[2.4, 0.3, 2.4]} c="#3b4048" rough={0.55} metal={0.35} />
    </group>
  )
}

/** container ship / tug: hull, deck containers, aft bridge + funnel */
function Ship({ x, z, len, beam, rot, hull, name }: { x: number; z: number; len: number; beam: number; rot: number; hull: string; name: string }) {
  const tug = len < 14
  const CC = ['#c8102e', '#0b3d6b', '#1f7a3a', '#e08a3c', '#6d6a64', '#d4a017']
  const bays = tug ? 0 : Math.floor((len * 0.62) / 6.4)
  const rows = Math.max(1, Math.floor(beam / 2.6))
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} name={`ship:${name}`}>
      {/* hull (waterline at the sea plane y 0.34) + red antifouling band + deck */}
      <B p={[0, 0.9, 0]} s={[beam, 2.6, len * 0.86]} c={hull} rough={0.55} metal={0.35} />
      {/* boot-top: the antifouling band must WRAP the hull (1.006× beam, so no
          face is coplanar with the hull's) and sit AT the waterline — it used
          to be centred at y −0.3, entirely below the sea plane (y 0.34) and
          also inside the hull box: no red showed anywhere. y 0.25 puts
          0.16 m of red above the water, the classic vessel read. */}
      <B p={[0, 0.25, 0]} s={[beam * 1.006, 0.5, len * 0.84]} c="#8b1e1e" rough={0.7} cast={false} />
      <mesh position={[0, 0.9, len * 0.43 + len * 0.06]} rotation={[PI / 2, 0, PI / 4]} castShadow>
        <cylinderGeometry args={[0, beam * 0.72, len * 0.14, 4]} />
        <meshStandardMaterial color={hull} roughness={0.6} metalness={0.2} />
      </mesh>
      <B p={[0, 2.25, 0]} s={[beam - 0.3, 0.12, len * 0.84]} c="#7a7d80" rough={0.8} cast={false} />
      {/* aft superstructure */}
      <B p={[0, 2.25 + (tug ? 1.2 : 2.6), -len * 0.34]} s={[beam * 0.8, tug ? 2.4 : 5.2, tug ? 3 : 4.4]} c="#f4f1ea" rough={0.7} />
      <B p={[0, 2.25 + (tug ? 2.6 : 5.6), -len * 0.34 + (tug ? 0 : 0.6)]} s={[beam * 0.9, 0.5, tug ? 2 : 2.4]} c="#2b2f36" rough={0.6} cast={false} />
      <B p={[0, 2.25 + (tug ? 3.4 : 6.6), -len * 0.4]} s={[1.2, tug ? 1.6 : 2.4, 1.4]} c={tug ? '#ce1126' : '#fcd116'} rough={0.7} />
      {/* deck containers */}
      {Array.from({ length: bays }, (_, i) => Array.from({ length: rows }, (_, j) => (
        <B key={`${i}-${j}`} p={[-beam / 2 + 1.3 + j * 2.6, 3.6 + ((i + j) % 2) * 1.3, -len * 0.18 + i * 6.4]}
          s={[2.44, 2.6 + ((i + j) % 2) * 2.6, 6.1]} c={CC[(i * 3 + j) % CC.length]} rough={0.55} metal={0.35} />
      )))}
    </group>
  )
}

// ── port ground fleet — static dressing (no traffic sim, no colliders) ──────
// The audit found ships / cranes / containers but ZERO ground vehicles on the
// port's service roads. Every part is a plain-coloured box/cylinder so
// SceneBatcher merges the whole fleet into a handful of draws; the placement
// data + clearance contract live in src/lib/temaFleet.ts (unit-tested against
// the T13 arrays). Wheels touch ground (axle y = WHEEL_R). Not captured into
// colliders.json — same dressing-only policy as DaaviPlotDressing, and the
// port is outside every robot walk corridor.
const FLEET_DARK = '#2b2f36'
const FLEET_WHEEL = '#1b1e24'

function FleetWheel({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, WHEEL_R, z]} rotation={[PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.42, 10]} />
      <meshStandardMaterial color={FLEET_WHEEL} roughness={0.85} />
    </mesh>
  )
}

/** rigid 4×2 tractor + container body, local length along X (facing +x) */
function ContainerTruck({ x, z, rot, cab, box }: { x: number; z: number; rot: number; cab: string; box: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[3.6, -3.1, -4.2].map((wx) => (
        <FleetWheel key={wx} x={wx} z={0.98} />
      ))}
      {[3.6, -3.1, -4.2].map((wx) => (
        <FleetWheel key={`r${wx}`} x={wx} z={-0.98} />
      ))}
      <B p={[0, 0.8, 0]} s={[9.6, 0.5, 2.3]} c={FLEET_DARK} rough={0.7} metal={0.25} />
      {/* cab + dark glass band */}
      <B p={[3.55, 1.8, 0]} s={[2.1, 2.5, 2.44]} c={cab} rough={0.55} metal={0.2} />
      <B p={[4.62, 2.35, 0]} s={[0.06, 0.7, 2.1]} c="#20303f" rough={0.3} metal={0.4} cast={false} />
      {/* container body + door ribs */}
      <B p={[-1.85, 1.85, 0]} s={[6.1, 2.58, 2.44]} c={box} rough={0.55} metal={0.35} />
      <B p={[1.22, 1.85, 0]} s={[0.06, 2.4, 2.3]} c="#3b3b3b" rough={0.55} metal={0.35} cast={false} />
    </group>
  )
}

/** staged skeleton trailer on its landing legs (detached from a tractor) */
function Trailer({ x, z, rot, box }: { x: number; z: number; rot: number; box: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[-2.9, -3.9].map((wx) => (
        <FleetWheel key={wx} x={wx} z={0.98} />
      ))}
      {[-2.9, -3.9].map((wx) => (
        <FleetWheel key={`r${wx}`} x={wx} z={-0.98} />
      ))}
      <B p={[0, 0.8, 0]} s={[8.1, 0.5, 2.3]} c={FLEET_DARK} rough={0.7} metal={0.25} />
      {/* front landing legs (trailer is parked, detached) */}
      {[0.98, -0.98].map((lz) => (
        <B key={lz} p={[2.6, 0.55, lz]} s={[0.18, 1.1, 0.18]} c={FLEET_DARK} rough={0.6} metal={0.3} />
      ))}
      <B p={[-0.4, 1.85, 0]} s={[6.1, 2.58, 2.44]} c={box} rough={0.55} metal={0.35} />
      <B p={[2.67, 1.85, 0]} s={[0.06, 2.4, 2.3]} c="#3b3b3b" rough={0.55} metal={0.35} cast={false} />
    </group>
  )
}

/** fuel tanker: tractor + barrel + end caps + catwalk */
function Tanker({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[3.4, -2.6, -3.7].map((wx) => (
        <FleetWheel key={wx} x={wx} z={0.98} />
      ))}
      {[3.4, -2.6, -3.7].map((wx) => (
        <FleetWheel key={`r${wx}`} x={wx} z={-0.98} />
      ))}
      <B p={[0, 0.8, 0]} s={[9.8, 0.5, 2.3]} c={FLEET_DARK} rough={0.7} metal={0.25} />
      <B p={[3.9, 1.55, 0]} s={[1.9, 2.1, 2.44]} c="#0b3d6b" rough={0.55} metal={0.2} />
      <B p={[4.87, 2.0, 0]} s={[0.06, 0.6, 2.0]} c="#20303f" rough={0.3} metal={0.4} cast={false} />
      {/* barrel: cylinder axis along local X */}
      <mesh position={[-1.2, 1.7, 0]} rotation={[0, 0, PI / 2]} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 7.2, 14]} />
        <meshStandardMaterial color="#c8102e" roughness={0.45} metalness={0.3} />
      </mesh>
      {[-4.6, 2.2].map((bx) => (
        <mesh key={bx} position={[bx, 1.7, 0]} rotation={[0, 0, PI / 2]} castShadow>
          <cylinderGeometry args={[1.16, 1.16, 0.2, 14]} />
          <meshStandardMaterial color="#e9ecef" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      <B p={[-1.2, 2.95, 0]} s={[4.4, 0.1, 0.5]} c={FLEET_DARK} rough={0.7} cast={false} />
    </group>
  )
}

/** reach stacker: body + cab + lifting mast + fork over the pier staging lane */
function ReachStacker({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[1.1, -1.1].map((wx) => (
        <FleetWheel key={wx} x={wx} z={0.6} />
      ))}
      {[1.1, -1.1].map((wx) => (
        <FleetWheel key={`r${wx}`} x={wx} z={-0.6} />
      ))}
      <B p={[0, 1.0, 0]} s={[2.7, 1.1, 1.6]} c="#fcd116" rough={0.6} />
      <B p={[-0.2, 2.0, 0.45]} s={[1.5, 1.1, 0.9]} c={FLEET_DARK} rough={0.55} />
      {/* telescopic mast + spreader frame */}
      <B p={[1.45, 1.9, 0]} s={[0.28, 2.6, 1.3]} c={FLEET_DARK} rough={0.6} metal={0.3} />
      <B p={[1.75, 0.75, 0]} s={[0.5, 0.35, 2.3]} c={FLEET_DARK} rough={0.6} metal={0.3} />
    </group>
  )
}

function PortFleet() {
  return (
    <group name="tema-fleet">
      {TEMA_FLEET.map((v: FleetVehicle, i) => {
        if (v.kind === 'containerTruck') {
          const cabs = ['#0b3d6b', '#c8102e', '#1f7a3a']
          const boxes = ['#2e7fa8', '#e08a3c', '#d4a017']
          return <ContainerTruck key={i} x={v.x} z={v.z} rot={v.rot} cab={cabs[i % 3]} box={boxes[i % 3]} />
        }
        if (v.kind === 'trailer') return <Trailer key={i} x={v.x} z={v.z} rot={v.rot} box={i % 2 ? '#1f7a3a' : '#0b3d6b'} />
        if (v.kind === 'tanker') return <Tanker key={i} x={v.x} z={v.z} rot={v.rot} />
        return <ReachStacker key={i} x={v.x} z={v.z} rot={v.rot} />
      })}
    </group>
  )
}

function TemaPort() {
  return (
    <group name="tema-port">
      {/* quay wall along the port shoreline + the container pier deck */}
      <mesh position={[274, -0.55, 46.6]} userData={{ noCollide: true }}>
        <boxGeometry args={[124, 1.9, 1.2]} />
        <meshStandardMaterial color="#8d8a83" roughness={0.95} />
      </mesh>
      <mesh position={[285, -0.35, 68]} userData={{ noCollide: true }} receiveShadow>
        <boxGeometry args={[26, 1.6, 48]} />
        <meshStandardMaterial color="#9a978f" roughness={0.95} />
      </mesh>
      {/* pier lanes (flat decals on the deck — the ground canvas is under it) */}
      {[[278, 68, 6, 48], [292, 68, 6, 48], [285, 86, 20, 6]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.46, z]} rotation={[-PI / 2, 0, 0]} userData={{ noCollide: true }} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#3b4048" roughness={0.95} />
        </mesh>
      ))}
      {T13_CONTAINERS.map(([x, z, len, rot, color, tiers], i) => {
        const onPier = x > 272 && x < 298 && z > 46
        return (
          <group key={i} position={[0, onPier ? 0.45 : 0, 0]}>
            <Container x={x} z={z} len={len} rot={rot} color={color} tiers={tiers} />
          </group>
        )
      })}
      {T13_CRANES.map(([x, z, r], i) => <GantryCrane key={i} x={x} z={z} rot={r} />)}
      {T13_SHIPS.map(([x, z, len, beam, rot, hull, name], i) => (
        <Ship key={i} x={x} z={z} len={len} beam={beam} rot={rot} hull={hull} name={name} />
      ))}
      {/* static ground fleet on the service roads (see temaFleet.ts contract) */}
      <PortFleet />
      {/* breakwater out in the sea */}
      <Rocks positions={Array.from({ length: 26 }, (_, i) => [222 + i * 4.4, 106 + ((i * 7) % 3) * 0.8] as [number, number])} />
    </group>
  )
}

// ── CHORKOR HARBOUR: fishing jetty, canoes, smoking ovens ────────────────────
function Canoe({ x, z, rot, c, y }: { x: number; z: number; rot: number; c: number; y: number }) {
  const cols = ['#ce1126', '#fcd116', '#006b3f', '#2e7fa8', '#e08a3c']
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <B p={[0, 0.32, 0]} s={[1.15, 0.62, 6.2]} c="#6b4a2f" rough={0.9} />
      <B p={[0, 0.5, 0]} s={[1.2, 0.18, 6.0]} c={cols[c]} rough={0.8} cast={false} />
      <B p={[0, 0.66, 0]} s={[1.22, 0.12, 5.6]} c={cols[(c + 2) % 5]} rough={0.8} cast={false} />
      {[-1, 1].map((k) => (
        <mesh key={k} position={[0, 0.42, k * 3.55]} rotation={[k * PI / 2, 0, PI / 4]} castShadow>
          <cylinderGeometry args={[0, 0.82, 1.0, 4]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function ChorkorHarbour() {
  return (
    <group name="chorkor-harbour">
      {/* jetty deck (walkable — water.json dry rect) + piles */}
      <mesh position={[-183, -0.05, 52]} userData={{ noCollide: true }} receiveShadow>
        <boxGeometry args={[6, 1.0, 16]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.9} />
      </mesh>
      {[46, 52, 58].map((z) => [-185.8, -180.2].map((x) => (
        <mesh key={`${x}${z}`} position={[x, -0.2, z]} userData={{ noCollide: true }}>
          <cylinderGeometry args={[0.2, 0.24, 1.6, 6]} />
          <meshStandardMaterial color="#5a3f28" roughness={0.9} />
        </mesh>
      )))}
      {T13_BOLLARDS.map(([x, z, y], i) => (
        <mesh key={`bo${i}`} position={[x, y + 0.25, z]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.5, 8]} />
          <meshStandardMaterial color="#2b2f36" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
      {T13_CANOES.map(([x, z, r, c, y], i) => <Canoe key={i} x={x} z={z} rot={r} c={c} y={y} />)}
      {/* fish-smoking ovens (chorkor smokers): mud drum + dark rim + smoke rack */}
      {T13_OVENS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.85, 0.9, 1.0, 12]} />
            <meshStandardMaterial color="#9b6a45" roughness={1} />
          </mesh>
          <mesh position={[0, 1.04, 0]}>
            <cylinderGeometry args={[0.88, 0.88, 0.1, 12]} />
            <meshStandardMaterial color="#2b2622" roughness={1} />
          </mesh>
        </group>
      ))}
      <Rocks positions={Array.from({ length: 8 }, (_, i) => [-172 + (i % 2) * 1.2, 47.5 + i * 1.6] as [number, number])} />
    </group>
  )
}

// ── KORLE ISLAND: plinth, grass top, ring lane, causeway, gate, jetty ───────
function KorleIsland() {
  const lane = '#a7774b'
  return (
    <group name="korle-island">
      <mesh position={[KORLE.cx, -0.35, KORLE.cz]} userData={{ noCollide: true }}>
        <boxGeometry args={[64, 1.6, 38]} />
        <meshStandardMaterial color="#d9c08a" roughness={1} />
      </mesh>
      <mesh position={[KORLE.cx, 0.44, KORLE.cz]} rotation={[-PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[59.5, 33.5]} />
        <meshStandardMaterial color="#8fbf68" roughness={0.95} />
      </mesh>
      {/* ring lane decals (cars loop the island — ROADS.korleRing*) */}
      {[[-228, 70, 54, 4], [-228, 93, 54, 4], [-253, 81.5, 4, 27], [-203, 81.5, 4, 27], [-228, 66, 7, 8]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.455, z]} rotation={[-PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={lane} roughness={1} />
        </mesh>
      ))}
      {/* causeway deck: Korle coast road → island head (walkable + drivable) */}
      <mesh position={[-228, 0.05, 47.5]} userData={{ noCollide: true }}>
        <boxGeometry args={[7, 1.1, 32]} />
        <meshStandardMaterial color="#b9b2a4" roughness={0.95} />
      </mesh>
      <Guardrail from={[-231.8, 34]} to={[-231.8, 62]} />
      <Guardrail from={[-224.2, 34]} to={[-224.2, 62]} />
      <BannerGate position={[-228, ISL_Y, 64.6]} rotation={0} text="KORLE ISLAND" bg="#ce1126" fg="#fcd116" width={8.2} />
      {/* south jetty over the water */}
      <mesh position={[-228, 0.28, 105]} userData={{ noCollide: true }}>
        <boxGeometry args={[3.4, 0.5, 10]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.9} />
      </mesh>
      {[101, 105, 109].map((z) => (
        <mesh key={z} position={[-228, -0.1, z]} userData={{ noCollide: true }}>
          <cylinderGeometry args={[0.18, 0.22, 1.4, 6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

const ALL_TREES = [...TREES_L, ...lift(TREES_I), ...NORTH_FIELD_TREES, ...(COMMUNITY.trees as T13Prop[])]
const ALL_PALMS = [...PALMS_L, ...lift(PALMS_I), ...(COMMUNITY.palms as T13Prop[])]
const ALL_PEOPLE = [...PEOPLE_L, ...lift(PEOPLE_I)]
const ALL_SHRUBS = [...SHRUBS_L, ...lift(SHRUBS_I), ...(COMMUNITY.shrubs as T13Prop[])]
const ALL_GRASS = [...GRASS_L, ...lift(GRASS_I), ...(COMMUNITY.grass as T13Prop[])]

export function NewLands() {
  return (
    <group name="t13-new-lands">
      {/* north apron fields beyond the new west / east land (continues the
          North Reach slab so the plate's north edge never reads as a void) */}
      {[[-215, 130], [270, 140]].map(([cx, w]) => (
        <mesh key={cx} position={[cx, 0.05, -149]} rotation={[-PI / 2, 0, 0]} receiveShadow userData={{ noCollide: true }}>
          <planeGeometry args={[w, 66]} />
          <meshStandardMaterial color="#6d9c4d" roughness={1} />
        </mesh>
      ))}
      <Homes />
      <TemaPort />
      <ChorkorHarbour />
      <KorleIsland />
      {T13_GATES.map(([x, y, z, r, text, bg, fg, w], i) => (
        <BannerGate key={i} position={[x, y, z]} rotation={r} text={text} bg={bg} fg={fg} width={w} />
      ))}
      {/* one instanced mesh per prop kind for the whole new land (Korle
          Island props ride along with y = 0.44) */}
      <InstancedLamps items={LAMPS_L} />
      <InstancedTrees items={ALL_TREES} />
      <InstancedPalms items={ALL_PALMS} />
      <InstancedPeople items={ALL_PEOPLE} />
      <InstancedShrubs items={ALL_SHRUBS} />
      <InstancedGrassTufts items={ALL_GRASS} />
    </group>
  )
}
