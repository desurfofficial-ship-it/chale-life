# src/world — Owner: Agent 3 (World & Art)

The game's environment layer: the full **Accra map (v6)** — the overhauled
620 × 232 m diorama plate (x −280…340, z −116…116) with the Task 15
community-realism rounds — mounted inside the game's own Canvas.

## Public surface (`src/world/index.ts`)

```ts
import { AccraWorld } from '@/world';                              // the map
import { colliders, worldBounds, type ColliderBox } from '@/world'; // the contract
```

The engine mounts `<AccraWorld />` in one line. It brings its own dusk
lights, sky dome, fog, sea/land skirts and scene batching — the game's
CameraRig / Player / Hud own everything else (camera, character, UI).

## Contract (World → Engine): `src/world/colliders.ts`

Exports `colliders: ColliderBox[]` (`{ minX, minZ, maxX, maxZ }` in metres)
and `worldBounds` (same shape). No three.js / engine imports — engine and
rules consume it from anywhere, including node-side tests.

- **Source of truth:** `src/world/accra/data/colliders.json` — the captured
  AccraScene set (5,480 boxes). Boxes whose top is below 0.3 m (mats, ground
  decals) or whose base is above 1.2 m (head-height signs, awnings) are
  excluded by the same head-height rule the map's movement sim uses.
- **Provenance:** captured from the live scene graph with `?capture=1`
  (`src/lib/colliderExport.ts`) during the v6 integration — every collider
  matches a visible mesh. `?capture=1` is NOT yet wired into the game app
  (it ran in the map viewer); if it gets wired, re-capture after any world
  edit and re-run the clearance pins (below).
- **Daavi plot dressing is deliberately NOT in the set:** the job-spot
  crate/pan stack and the step-2 bench (`Jamestown.tsx` →
  `DaaviPlotDressing`) are walk-through dressing. Their footprints already
  satisfy the clearance bars (see below), so a future capture cannot turn
  them into route blockers.

## Contract (World → Gameplay): `src/data/locations.ts`

`{ id, name, type, x, z }[]` — points of interest on the v6 map, anchored
on the reserved DAAVI_PLOT in James Town (kiosk at −126.5, −3.6). Agent 3
owns this file. Zone-backed ids (`LOC-001-JOB`, `LOC-001-BENCH`) resolve
only through their own circles in `src/rules/proximity.ts` — never add them
to a generic point-reach loop (the G-008e takeover bug).

## Layout of the plot (the game's home turf)

| Thing | Where (metres) | Notes |
| --- | --- | --- |
| Kiosk (LOC-001 area) | −126.5, −3.6 | sign "DAAVI WAAKYE", counter slab on the north face |
| Job spot (LOC-001-JOB) | −122.9, −2.4 | 0.9 m zone; marked by the crate/pan stack on the east wall |
| Bench waypoint (LOC-001-BENCH) | −132.5, −0.6 | step-2 set-down; Bench mesh 2.3 m north inside the yard edge |
| Sleep yard (LOC-002 zone) | x −142…−131, z −12…−1.4 | spawn at (−136, −2); mats, clothesline, bench, drum |

## Invariants to keep green

- `src/rules/__tests__/jobs.test.ts` (world clearance): walk waypoints and
  named locations stay off the Daavi St carriageway (z 0.5…7.5), outside
  every plot solid with the 0.35 m capsule + 0.25 m margin, and the
  job spot → bench straight line hits no solid.
- `src/rules/__tests__/g008e-hotfix.test.ts`: zone-backed ids never win the
  point loop; the counter/job zone disjointness (2.5 + 0.9 < 3.61 m).
- Draw-call budget: 450 at street view (e2e-enforced; the whole city batches
  through `SceneBatcher` — keep new props plain-coloured so they merge).
