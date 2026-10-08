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
  needs / job slices (identity-checked: disabled acts commit nothing). Every
  toast is stored as `{ message, at }` and auto-expires after
  `TOAST_LINGER_MS` so repeated identical messages re-trigger the HUD.

- `nearLocationId` — id of the location within `NEAR_LOCATION_RADIUS_M` (2.5 m)
  of the player, maintained by the GameLoop via `setNearLocationId` (notifies
  only on enter/leave).
- `tickNeedsDrain(dtSeconds)` — store-side drain commit with the starter
  profile; the GameLoop calls it ~once per `NEEDS_DRAIN_INTERVAL_S` (1 s) with
  clamped accumulated dt, paused while the tab is hidden. Unit-tested in
  `__tests__/gameStore.test.ts` (the ₵20 → ₵35 → ₵23 loop lives there too).

## E-004 additions (job completion history)

- The job slice is `{ activeId, step, completedIds: string[] }` — `completedIds`
  is the run's completed-shift history (the G-004 earn-first flag), starting
  empty. `requestAct()` threads it into `resolveAct` and commits the returned
  array by reference: the same array rides along while a shift advances; a
  payout latches a fresh, deduped array. It is the ONE source of truth for
  "worked before" — the E-003 `hasWorked` latch is retired and the objective
  marker reads `completedIds.length` instead.
- Store tests: `__tests__/gameStore.test.ts` (canonical ₵20 → ₵35 → ₵23 loop)
  and `__tests__/gameStoreEarnFirst.test.ts` (drain-hunger-to-60 earn-first
  session — separate file so both start from a pristine store).
