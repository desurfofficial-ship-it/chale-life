# src/ui — Owner: Agent 4 (Gameplay & UI)

Purpose: HUD and in-game UI. Reads game state only through the store's
throttled HUD channel — `useSyncExternalStore(subscribeHud, getHud)` from
`src/store/gameStore.ts`, ≤ ~10 notifications/s — via subscribe/selectors.
Never subscribe to `position` / `yaw` directly (they update every frame).

`Shell.tsx` (scaffold placeholder HUD) lives here untouched until G-001
replaces it. Created/populated by Agent 4.

Created empty-ish by Agent 2 in E-001 (skeleton).
