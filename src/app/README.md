# src/app — Owner: Agent 2 (Engine & Platform)

Composition root: Canvas (orthographic, DPR capped [1, 1.25]), lights, temporary
ground, the WebGL fallback message, and the DOM overlays (joystick, Recenter,
`?debug=1` HUD).

Component order inside the Canvas matters: `<GameLoop />` is first so its
`useFrame` runs before `<Player />` and `<CameraRig />` consume the transform
in the same frame.

`GroundPlane.tsx` is temporary until W-001 replaces the world. `index.html`,
`src/main.tsx` and `src/styles.css` are the platform bootstrap around this folder.

Created/restructured by Agent 2 in E-001 (absorbed the old `src/r3f` shell).
