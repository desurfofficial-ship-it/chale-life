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
