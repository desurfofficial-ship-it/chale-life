# O-001 — World-run offices + lifts: handoff

Base: `main` @ 165c414. Apply with `git am 0001-*.patch` (or copy the `src/` and `docs/` folders over the repo root).

## What's in this drop

| Area | Files | Status |
|---|---|---|
| Data | `src/data/offices.ts` | 6 offices (bank, law/accounts, tech hub = employer, call centre, radio, lands office). Each has its own rooms, roles, staff, pipeline, events, hours and site. Plus 3 office jobs with a career ladder. |
| Lift rules | `src/rules/lift.ts` | Pure LOOK/SCAN scheduler: per-floor FIFO queues, capacity, door open/dwell/close, sub-stepped dt. |
| Office rules | `src/rules/office.ts` | Floor layout (core + rooms), seats, hours, month-end, events, lunch, deterministic task pipeline, energy/breaks, activity log, ownership guard, lunch-rush multiplier, permit wait, employer shift check/pay. |
| Store | `src/store/officeStore.ts` | Sims at 4 Hz, lifts every frame, NPC lift/stairs transit (≥5 queued → stairs), player job + shift (saved to `chale.office.v1`), selection, view floor. Only an employer shift payout touches the wallet. |
| Ambient loop | `src/engine/ambient.ts` + 1 line in `GameCanvas` AmbientTick | Registry so world systems step without a new `useFrame`. Pauses when the tab is hidden. |
| World | `src/world/office/*` | Facade shell when far. Roofless cutaway of the selected floor when near: pastel tiled room floors, low white walls with caps + door gaps, room-name pills, instanced furniture per room kind, glass lift shaft with a moving car + sliding doors + glowing call button, stairs for no-lift offices, instanced NPC staff (walk cycle, sit, name pills, purple selection ring) and visitors in halls. |
| UI | `src/ui/office/OfficePanel.tsx` | Read-only office card (open/closed, staff in, done today, Hiring badge), Look inside, floor selector, staff list with status pills, staff card (task, stage timeline, room, energy, 3-line log), job Apply / Start shift, on-shift strip (lift → floor, Sit at desk, End shift). |
| Sites | `NorthReach`, `AirportDistrict`, `OxfordOsu`, `CBD` | The office replaces the old building on the SAME footprint, so the captured colliders stay valid. |

## Verified here
- `npm run typecheck`: clean.
- `vitest`: 26 files, 337/337 passed. New: 9 lift tests, 23 office tests, 8 store tests.
- `vite build`: OK. The index chunk grew 196 → 230 kB because OfficePanel + store + data load with App. You can lazy-load OfficePanel if you need that back.

## NOT verified (no GPU/WebGL in this sandbox): you must do these
1. Run on a real WebGL browser or iPhone and tune:
   - `DETAIL_ZOOM` (20) and `DETAIL_RADIUS_M` (45) in `OfficeBuilding.tsx`, so the cutaway opens when zoomed in and the facade shows when zoomed out
   - pill sizes, wall height, and facade sign placement
2. Check each site visually. The office footprint equals the old building, but the cutaway must not clip neighbours or roads. Calibrate front-face yaw per site if a door faces a wall.
3. Collider capture caveat: office roots are `markAnimated`, so a future `?capture=1` recapture would SKIP their footprints. Before recapturing, add the six `site` rects to `EXTRA_COLLIDERS` in `mapConfig.ts` (or make the exporter include `userData.bldg === 'office'` shells). `tools/campath_audit` must still print 0.
4. Player inside the building (not done):
   - open a door gap in the colliders for the Kotoka Tech Hub entrance
   - put the player capsule on the floor plane at `floor × 3.2 m`
   - when the player stands in the core and picks a floor, call `requestPlayerFloor`, and have CameraRig follow `carHeightM` while `player.inLift`
   The shift UI already works through the store (lift ride, desk only counts on the desk floor, pay on completion).
5. Wire the lunch rush into the business tick: multiply customers by `lunchRushMultiplier(plot.x, plot.z, hour)` in `rules/business.ts`, with a test.
6. Optional: use `permitWaitMinutes` to delay the player's newly bought business opening.
7. Energy: a shift should drain `shiftEnergyCost(job, shift)`. gameStore has no public needs setter outside e2e. Add one in gameStore (your folder) and call it from `endShift`.
8. Performance: capture `window.__ACCRA_STATS` with one office in cutaway (target ≤ 420 draw calls / 320k triangles) and at city zoom.
   - The cutaway uses about 14 draw calls per floor: slab, rooms, walls, caps, 2 furniture batches, lift parts, 4 people meshes, plus pills.
9. Acceptance screenshots (real WebGL, 390×844, each > 100 KB):
   - o001-bank-hall.png
   - o001-tech-hub.png
   - o001-callcentre.png
   - o001-radio-onair.png
   - o001-lift-lobby-9am.png (use `?hour=8.9`)
   - o001-floor-selector.png
   - o001-player-desk.png
   - o001-night.png
   Plus a 15-second recording.
10. e2e via the real UI only (data-testids present):
    tap a building → `office-card` → `office-apply-OJOB_OFFICE_ASSISTANT` → `office-start-…` → `office-desk` → advance clock → pay lands. Then `office-ride-1` for the lift.

## Rules that must hold
- World-run offices never change the wallet and never appear in the tycoon business list (tests cover this).
- Don't touch `src/onboarding/*`, `src/room/*`, `DaaviPlot()`, or the onboarding camera path.
- If anything loops more than twice, stop and report in ISSUES.
