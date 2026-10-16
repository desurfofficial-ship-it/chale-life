# O-002 — Offices visible + low-poly GLB furniture

## Why
The six world-run offices from O-001 were in the live build, but players spawned at Daavi Compound (-136, -2), 100–330 m from the nearest office. The closed shell was a plain box, the cutaway only opened at zoom ≥ 20 within 45 m, and nothing pointed to the offices.

## What changed
- **Floating office tags** (`OfficeTag` in `OfficeBuilding.tsx`, `officeTagTexture` in `officeVisuals.ts`). Each tag is a billboard sprite above every office: a dark pill with a brand-coloured `OFFICE` badge (`OFFICE · HIRING` on the employer), the office name, and a pin notch.
  - It keeps a constant screen size: 176 px at street level, 110 px in the city overview. It is rescaled inside the existing `registerAmbient` step, so there is no new `useFrame`.
  - It draws on top of buildings (`depthTest: false`).
  - Offices less than 30 m apart stack their tags upward.
  - Tapping a tag selects the office.
- **HUD "Offices" chip** (`src/ui/office/OfficesMenu.tsx`), in walk mode under the needs card. It opens a list of all six offices, nearest first, showing distance, Open/Closed and Hiring.
  - **Go** teleports the walker to a free spot outside the front door (`officeDoorPoint`, clear of colliders by the capsule radius) through `requestTeleport`.
  - It selects the office, which opens the cutaway and the office card.
  - It frames the camera at zoom 38, aimed just behind the building, so the opened floor sits between the top HUD and the card.
  - Test ids: `hud-offices-btn`, `offices-list`, `offices-go-<OFFICE_ID>`.
- **Facade reads as an office**:
  - Glass double door with frame.
  - Brand-coloured canopy on two posts, plus a plinth step. All of these are one instanced batch.
  - A larger company sign above the canopy and a rooftop sign.
- **GLB furniture** (`officeModels.ts` catalogue, `officeFurniture.ts` layout, `OfficeModels.tsx` renderer).
  - Desks, chairs, visitor chairs, meeting tables, reception counters, filing cabinets, water coolers, printers, free-standing whiteboards, booth partitions, lockers, potted plants and the living-room sofa.
  - Renderer: one `InstancedMesh` per model file per floor, with one shared vertex-colour material.
  - Box stand-ins show while the files load, or if one fails (Suspense + error boundary).
  - Variants are chosen per office with a deterministic hash.
  - Chairs are placed exactly on `roomSeats()`, which now also returns the yaw a seated NPC faces. Meeting chairs face the table and tellers face the customers.
  - Visitors queue in front of counters (`visitorSpots`).
  - Server racks, vault, studio desk, kitchenette and teller screens stay as boxes; there are no models for them yet.

## Asset pipeline fix
None of the existing `out_min` low-poly GLBs, nor the `-00` files already in the repo, carried `COLOR_0`, so they rendered flat grey.
- Cause: `lp_kit.export_glb` used `export_vertex_color='ACTIVE'`, but Blender 4.3 left `color_attributes.active_color` unset.
- Fix: the office archetypes, potted plants and sofa were re-exported with the active colour attribute set, then meshopt-compressed. Geometry and tri counts are identical to the catalogue.
- The renderer expands quantised attributes to float32 before baking node transforms, which avoids int16 overflow.

## Tests
- `src/world/office/__tests__/officeFurniture.test.ts`:
  - files exist, with relative paths
  - deterministic variants
  - models stay inside their rooms
  - no prop overlaps
  - chairs sit on seats with matching yaw
  - visitor spots
- `src/world/office/__tests__/officeNav.test.ts`:
  - door points are walkable and near the facade
  - nearest-first list
  - `goToOffice` wiring and framing stay within the cutaway range

## Known limits
- Gold Coast Bank and Adom Holdings (z = -152) sit outside the walkable plate (`worldBounds.minZ = -140`). **Go** puts the walker at the plate edge, about 8 m in front of the facade. The cutaway still opens because the office is selected.
- The Offices chip is only in the walk HUD, not in the tycoon (city) HUD. In city mode the floating tags still show and can be tapped.
- Desk monitors are part of the desk models, so they no longer glow at night. Teller screens still glow.
