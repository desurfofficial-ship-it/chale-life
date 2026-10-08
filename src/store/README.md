# src/store — Owner: Agent 2 (Engine & Platform)

One hand-rolled store (`gameStore.ts`): player transform + wallet/needs/job/home/
time. Reading rules:

- `position` / `yaw` are the authoritative player transform, written EVERY FRAME
  by `src/engine/GameLoop.tsx` via `setPlayerTransform` (silent, no notify).
  Systems read them inside frame callbacks via `getState()`; React components
  must never subscribe to them (that would re-render at 60 fps).
- **HUD / debug UI subscribes only to the throttled HUD channel**:
  `useSyncExternalStore(subscribeHud, getHud)` — republished at most ~10×/s
  (`HUD_INTERVAL_S`). That is the notification budget for HUD (G-001: plug in
  here).
- The notifying setters (`setPlayerPosition`, `setPlayerYaw`) are for teleports
  and gameplay wiring, not the frame loop.
- Input devices write `movementInput` through `src/input/inputManager.ts`
  (joystick + keyboard merge there), never directly.
- Gameplay rules (Agent 4) are pure `(state, input) => newState` functions;
  Engine wires them into this store when asked (G-001 handshake).
