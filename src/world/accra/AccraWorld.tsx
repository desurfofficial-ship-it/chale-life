/**
 * AccraWorld — the Chalé Life game's environment layer: the overhauled
 * Accra map (v6, Task 15 community realism rounds included) mounted INSIDE
 * the game's own Canvas. This is the map-viewer's scene content with the
 * viewer shell (Canvas, orbit rig, fly-to flights, label pills, marker
 * sprites, demo character) removed — the game's CameraRig / Player / Hud own
 * all of that. Colliders for the engine come from world/colliders.ts
 * (generated from the same capture the map's sim uses).
 *
 * Static meshes merge through SceneBatcher (draw-call budget) exactly as in
 * the map viewer. Mounted by src/app/App.tsx in place of the old starter
 * block.
 */
import * as THREE from 'three'
import { useMemo } from 'react'
import { buildGroundTexture, skirtDiscAlpha, skirtRectAlpha } from '@/lib/mapTextures'
import { PLATE, PLATE_CX, LAGOON } from '@/lib/mapConfig'
import { SkyDome, Water, SceneLights, DayCycleFog } from '@/components/scene/Environment'
import type { WeatherKind } from '@/components/scene/dayCycle'
import { SceneBatcher } from '@/components/world/SceneBatcher'
import { CBD } from '@/components/world/districts/CBD'
import { CivicCenter } from '@/components/world/districts/CivicCenter'
import { MakolaQuarter } from '@/components/world/districts/MakolaQuarter'
import { Jamestown } from '@/components/world/districts/Jamestown'
import { ChaleWote } from '@/components/world/districts/ChaleWote'
import { OxfordOsu } from '@/components/world/districts/OxfordOsu'
import { OsuStreet } from '@/components/world/districts/OsuStreet'
import { NimaQuarter } from '@/components/world/districts/NimaQuarter'
import { LabadiFunzone } from '@/components/world/districts/LabadiFunzone'
import { AirportDistrict } from '@/components/world/districts/AirportDistrict'
import { StadiumDistrict } from '@/components/world/districts/StadiumDistrict'
import { Legon } from '@/components/world/districts/Legon'
import { Neighborhoods } from '@/components/world/districts/Neighborhoods'
import { Chorkor } from '@/components/world/districts/Chorkor'
import { Nungua } from '@/components/world/districts/Nungua'
import { ChaleIsland } from '@/components/world/districts/ChaleIsland'
import { LandForSale } from '@/components/world/districts/LandForSale'
import { Coast } from '@/components/world/districts/Coast'
import { Greenery } from '@/components/world/districts/Greenery'
import { Infrastructure } from '@/components/world/districts/Infrastructure'
import { TownLife } from '@/components/world/districts/TownLife'
import { NewLands } from '@/components/world/districts/NewLands'
import { CommunityQuarter } from '@/components/world/districts/CommunityQuarter'
import { TycoonLayer, type TycoonWorldProps } from '@/world/tycoon'

// ───────────────────────────────────────────────── map-edge skirts ──────────
// The diorama plate is finite; sea + land skirts fade into the sky haze so
// full zoom-out never shows a floating slab over a void.
function SeaAndSkirts() {
  const discAlpha = useMemo(() => skirtDiscAlpha(), [])
  const rectAlpha = useMemo(() => skirtRectAlpha(), [])

  // rectangular land ring with a hole where the map plate sits — sits at plate
  // level (y ≈ 0) so it reads as continuing land from low camera angles.
  // NOTE: shape y maps to world −z → shape.y = −worldZ. The shape spans the
  // land sides only (worldZ −564…+46, i.e. shape.y −46…564) and stops at the
  // coastline; the hole exposes the plate (worldZ −116…46, x −160…212).
  const landRing = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-860, -46)
    shape.lineTo(900, -46)
    shape.lineTo(900, 564)
    shape.lineTo(-860, 564)
    shape.closePath()
    // Task 13: the hole follows the 620 m plate (x −280…340) — derived from
    // PLATE so a future extension can never be covered by the apron again
    const hx0 = PLATE_CX - PLATE.w / 2 - 2
    const hx1 = PLATE_CX + PLATE.w / 2 + 2
    const hole = new THREE.Path()
    hole.moveTo(hx0, -46)
    hole.lineTo(hx1, -46)
    hole.lineTo(hx1, 116)
    hole.lineTo(hx0, 116)
    hole.closePath()
    shape.holes.push(hole)
    const g = new THREE.ShapeGeometry(shape, 4)
    // normalize UVs into 0..1 for the edge-fade alpha map
    g.computeBoundingBox()
    const bb = g.boundingBox!
    const uv = g.attributes.uv as THREE.BufferAttribute
    const pos = g.attributes.position
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(
        i,
        (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x),
        (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y)
      )
    }
    uv.needsUpdate = true
    return g
  }, [])

  return (
    <group>
      {/* dusk ocean surrounding the diorama */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} userData={{ noCollide: true }}>
        <circleGeometry args={[980, 72]} />
        <meshStandardMaterial
          color="#1a4a66"
          roughness={0.35}
          metalness={0.1}
          alphaMap={discAlpha}
          transparent
          depthWrite={false}
        />
      </mesh>
      {/* land apron around the plate (hole = the plate itself), fading on all
          outer edges so it melts into the horizon haze */}
      <mesh
        geometry={landRing}
        position={[0, -0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
        userData={{ noCollide: true }}
      >
        <meshStandardMaterial color="#3a4a2c" roughness={1} alphaMap={rectAlpha} transparent depthWrite={false} />
      </mesh>
      {/* shallow plinths give the land skirt vertical presence at grazing
          angles (a 4 cm plane is invisible edge-on) — north, west, east */}
      {/* Task 13: plinths are derived from PLATE — west/east plinths start
          exactly at the plate edges (the Task 11 bug: a plinth centred for an
          older plate covered new land in dark green / black) */}
      {([
        [PLATE_CX, -241, PLATE.w + 520, 250],
        [PLATE_CX - PLATE.w / 2 - 125, -35, 250, 162],
        [PLATE_CX + PLATE.w / 2 + 125, -35, 250, 162],
      ] as [number, number, number, number][]).map(([cx, cz, w, d], i) => (
        <mesh key={i} position={[cx, -0.29, cz]} receiveShadow={false} userData={{ noCollide: true }}>
          <boxGeometry args={[w, 0.62, d]} />
          <meshStandardMaterial color="#3a4a2c" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────────────── perf readout feed ────
// Writes FPS / draw calls / triangles into a ref twice a second — no state
// updates, so the world never re-renders because of the HUD. Also refreshes
// the shadow map every ~0.4 s (static world; animated objects' shadows lag
// imperceptibly at dusk).

export function AccraWorld({
  tycoon,
  hour = 12,
  weather = 'clear',
}: {
  tycoon?: TycoonWorldProps | null
  hour?: number
  weather?: WeatherKind
} = {}) {
  const groundTex = useMemo(() => buildGroundTexture(), [])
  // Sea band overlay: SEA = { z0: 46, z1: 116 } (mapConfig) → the animated
  // water covers the plate's southern 70 m ONLY (centre z 81, depth 70),
  // exactly like the lagoon plane mirrors LAGOON's footprint. The plane used
  // to be 260 m deep (z −49…211): it flooded the whole playable city south
  // of z −49 — Daavi's plot, Makola, Oxford St, the CBD fronts and the beach
  // all rendered under 0.34 m of opaque water (ground canvas + roads hidden).
  const seaGeo = useMemo(() => new THREE.PlaneGeometry(980, 70), [])
  const lagoonGeo = useMemo(() => new THREE.PlaneGeometry(26, 8), [])

  return (
    <group name="accra-world">
      <DayCycleFog hour={hour} weather={weather} />
      <SceneLights hour={hour} weather={weather} />
      <SkyDome hour={hour} weather={weather} />

      {/* sea + land skirts so the map edge never floats over a void */}
      <SeaAndSkirts />

      {/* ── diorama plate ── */}
      <mesh receiveShadow position={[PLATE_CX, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noCollide: true }}>
        <planeGeometry args={[PLATE.w, PLATE.d]} />
        <meshStandardMaterial map={groundTex} roughness={0.95} />
      </mesh>
      <mesh position={[PLATE_CX, -3.6, 0]} userData={{ noCollide: true }}>
        <boxGeometry args={[PLATE.w, 7, PLATE.d]} />
        <meshStandardMaterial color="#5e4128" roughness={0.95} />
      </mesh>
      <mesh position={[PLATE_CX, -8.2, 0]} userData={{ noCollide: true }}>
        <boxGeometry args={[PLATE.w + 6, 3, PLATE.d + 6]} />
        <meshStandardMaterial color="#2a2438" roughness={1} />
      </mesh>

      {/* ── water ── */}
      <Water geometry={seaGeo} position={[PLATE_CX, 0.34, 81]} rotation={[-Math.PI / 2, 0, 0]} noCollide />
      <Water geometry={lagoonGeo} position={[LAGOON.x, 0.36, LAGOON.z]} rotation={[-Math.PI / 2, 0, 0]} noCollide />

      {/* ── districts (each in its own module) ── */}
      <CBD />
      <Neighborhoods />
      <Chorkor />
      <Nungua />
      <ChaleIsland />
      <LandForSale ownedPlotIds={tycoon?.ownedPlotIds ?? []} />
      <CivicCenter />
      <MakolaQuarter />
      <Jamestown />
      <ChaleWote />
      <OxfordOsu />
      <OsuStreet />
      <NimaQuarter />
      <LabadiFunzone />
      <AirportDistrict />
      <StadiumDistrict />
      <Legon />
      <Coast />
      <Infrastructure />
      <Greenery />
      <TownLife />
      <NewLands />
      <CommunityQuarter />

      {tycoon ? <TycoonLayer {...tycoon} /> : null}

      {/* merge the static plain-coloured world into few draw calls */}
      <SceneBatcher />
    </group>
  )
}
