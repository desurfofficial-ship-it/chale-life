# src/ui — Owner: Agent 4 (Gameplay & UI)

Purpose: HUD and in-game UI. Reads game state only through the store's
throttled HUD channel — `useSyncExternalStore(subscribeHud, getHud)` from
`src/store/gameStore.ts`, ≤ ~10 notifications/s — via subscribe/selectors.
Never subscribe to `position` / `yaw` directly (they update every frame).

`Shell.tsx` (E-001 scaffold placeholder HUD) was deleted in G-001c — E-002
replaced it with the real `<Hud />` mount, and nothing imported the placeholder.

Layout contract with the Engine (G-001c, reworked by G-008d item 6): the
bottom objective card + toast stay LEFT-inset by `JOYSTICK_CLEAR_PX` (112) in
`hud/Hud.tsx` so their boxes never reach over the joystick ring's top arc
(ring right edge x = 118 on 390×844, card left edge ≥ 124). Since G-008d the
Act pill lives in the bottom-RIGHT thumb zone: right-aligned
(marginRight 4 inside the root's 12px + safe-right padding ⇒ right edge at
16px + safe-area-inset-right), bottom aligned with the ring (the bottom
group's 2px padding lands the pill's bottom edge at the ring's
14px + safe-area-inset-bottom), with the disabled reason line ABOVE the pill,
right-aligned, capped at `calc(100vw − 118px − 32px)` so it can never reach
the ring's x-band. The geometry is pinned by `tests/e2e/actLayout.spec.ts` at
360×780 / 375×667 / 390×844 with the longest label + reason forced through
the `?e2e=1` hook (`__chaleTest.setActPrompt`). Keep in sync with the ring
geometry comment in `src/styles.css`.

Created empty-ish by Agent 2 in E-001 (skeleton).
