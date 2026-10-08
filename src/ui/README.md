# src/ui — Owner: Agent 4 (Gameplay & UI)

Purpose: HUD and in-game UI. Reads game state only through the store's
throttled HUD channel — `useSyncExternalStore(subscribeHud, getHud)` from
`src/store/gameStore.ts`, ≤ ~10 notifications/s — via subscribe/selectors.
Never subscribe to `position` / `yaw` directly (they update every frame).

`Shell.tsx` (E-001 scaffold placeholder HUD) was deleted in G-001c — E-002
replaced it with the real `<Hud />` mount, and nothing imported the placeholder.

Layout contract with the Engine (G-001c): the bottom objective card's wrapper
is left-inset by `JOYSTICK_CLEAR_PX` (112) in `hud/Hud.tsx` so the card's box
never reaches over the joystick ring's top arc (ring right edge x = 118 on
390×844, card left edge ≥ 124). Keep in sync with the ring geometry comment in
`src/styles.css`.

Created empty-ish by Agent 2 in E-001 (skeleton).
