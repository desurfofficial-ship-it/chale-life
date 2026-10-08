# src/player — Owner: Agent 2 (Engine & Platform)

`Player.tsx` is the visual for the store transform — exactly one capsule. It
reads `position` / `yaw` inside `useFrame` via `getState()` (no React state, no
re-renders, no DOM lookups). Never add a second player.

Keep `CAPSULE_RADIUS` in sync with `DEFAULT_MOVEMENT.radius` in
`src/engine/movement.ts` — the collision radius must match the visual capsule.
