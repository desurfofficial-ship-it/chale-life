# src/rules — Owner: Agent 4 (Gameplay & UI)

Purpose: pure gameplay rules — plain modules, no 3D and no React inside. Every
rule is a function `(state, input) => newState`; Engine (Agent 2) wires them
into the store (`src/store/gameStore.ts`) when asked (G-001 handshake).

Created empty by Agent 2 in E-001 (skeleton). Agent 4: replace this file with
real content.
