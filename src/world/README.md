# src/world — Owner: Agent 3 (World & Art)

Purpose: 3D world geometry, scenery, and the collision contract.

**Contract (World → Engine):** `src/world/colliders.ts` must export
`colliders: { minX; minZ; maxX; maxZ }[]` and `worldBounds` (same shape), in
metres (1 unit = 1 m). Engine (src/engine) reads it for collision every frame.
World never imports engine code.

`colliders.ts` currently holds a PLACEHOLDER created by Agent 2 (E-001):
60 × 60 m bounds, empty colliders. Replace it in W-001 — the export shapes must
stay identical.

Also owned by Agent 3: `src/data/locations.ts` (World → Gameplay contract,
`{ id, name, type, x, z }[]`) and `public/assets/` + `docs/assets/`.
