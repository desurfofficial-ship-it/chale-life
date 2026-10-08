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

## E-003 additions (Earn-and-eat wiring)

- `requestAct()` — samples the store into a rules/act.ts `ActSession`, runs the
  pure `resolveAct(session, nearLocationId)` and commits the returned wallet /
  needs / job slices (identity-checked: disabled acts commit nothing). Completing
  a shift latches `hasWorked`; every toast is stored as `{ message, at }` and
  auto-expires after `TOAST_LINGER_MS` so repeated identical messages re-trigger
  the HUD.
- `nearLocationId` — id of the location within `NEAR_LOCATION_RADIUS_M` (2.5 m)
  of the player, maintained by the GameLoop via `setNearLocationId` (notifies
  only on enter/leave).
- `tickNeedsDrain(dtSeconds)` — store-side drain commit with the starter
  profile; the GameLoop calls it ~once per `NEEDS_DRAIN_INTERVAL_S` (1 s) with
  clamped accumulated dt, paused while the tab is hidden. Unit-tested in
  `__tests__/gameStore.test.ts` (the ₵20 → ₵35 → ₵23 loop lives there too).
