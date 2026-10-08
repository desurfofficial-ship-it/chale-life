# src/input — Owner: Agent 2 (Engine & Platform)

All movement input converges on the store's `movementInput` via
`inputManager.ts`:

- `Joystick.tsx` — on-screen analog stick, bottom-left, pointer events,
  dead-zoned and rescaled, one steering pointer max.
- Keyboard — WASD / arrows, normalised so diagonals are not faster; mounted
  once from `src/app/App.tsx` (`initKeyboardInput`, returns its own dispose).
- `RecenterButton.tsx` — bumps the store's recenter token for the camera rig.

The stick wins while active; otherwise the keyboard drives. Add new devices by
extending `inputManager` — components never write `movementInput` directly.
