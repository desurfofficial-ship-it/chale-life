# src/engine — Owner: Agent 2 (Engine & Platform)

- `movement.ts` — pure `movementStep(state, input, dt, colliders, config?)`:
  acceleration toward camera-relative target velocity, analog magnitude scaling,
  axis-separated circle-vs-box collision (free wall sliding), hard world-bounds
  clamp, travel-direction yaw. Fully unit-tested in `movement.test.ts` — keep it
  pure, keep tests green.
- `collision.ts` — circle/box math shared by the movement rule and its tests.
- `GameLoop.tsx` — THE single `useFrame` loop (team rule: never add a second
  one). New systems either feed pure steps into it or expose steps it can run.
- `CameraRig.tsx` — orthographic follow camera: smooth follow, pinch/wheel zoom
  clamped to `[MIN_ZOOM, MAX_ZOOM]` (store-owned), drag/pinch-pan, and Recenter
  via the store's recenter token.

**Collision contract (World → Engine):** boxes in metres from
`src/world/colliders.ts` (`colliders`, `worldBounds`), 1 unit = 1 m. Engine reads
that file every frame; World never imports engine code. The current file is a
placeholder (60 × 60 m bounds, no obstacles) until W-001 lands.
- `ObjectiveMarker.tsx` — glowing ground ring + faint beam (2 draw calls when
  visible, 0 when hidden, no `<Html>`, no re-renders) at the active job step's
  location; falls back to LOC-001 until the player's first completed shift
  (empty `job.completedIds` — E-004's run history, the retired `hasWorked`
  latch's replacement). Step→location comes from `JobStep.locationId`, with a
  small interactable-id fallback map for untagged steps.
- `spawn.ts` — resolveSpawn/initializePlayerSpawn (E-002): picks the starter
  compound gate (LOC-002), guarantees not-inside-collider, commits at boot.
- GameLoop systems (E-003): nearest-location probe (≤2.5 m, write-on-change)
  and the ~1 Hz starter needs drain (`tickNeedsDrain`, paused when hidden).
