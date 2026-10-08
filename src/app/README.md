# src/app — Owner: Agent 2 (Engine & Platform)

Composition root: Canvas (orthographic, DPR capped [1, 1.25], shadow maps
enabled for the World's Lighting), the WebGL fallback message, and the DOM
overlays (HUD, joystick, Recenter, `?debug=1`).

Component order inside the Canvas matters: `<GameLoop />` is first so its
`useFrame` runs before `<Player />` and `<CameraRig />` consume the transform
in the same frame. `<StarterBlock />` (W-001) owns all scene lighting — this
folder adds no lights and no ground of its own (E-002 deleted the temporary
`GroundPlane.tsx` when the real block landed).

`App.tsx` calls `initializePlayerSpawn()` (src/engine/spawn.ts) once at import
so the store, camera and HUD start at the starter compound gate (LOC-002).
`index.html`, `src/main.tsx` and `src/styles.css` are the platform bootstrap
around this folder.

Created/restructured by Agent 2 in E-001 (absorbed the old `src/r3f` shell);
World + HUD integrated in E-002.
