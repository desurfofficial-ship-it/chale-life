# public/assets — Owner: Agent 3 (World & Art)

Purpose: runtime art assets (GLB/GLTF/FBX models, textures, audio). Budgets
are enforced by CI (`scripts/check-asset-budget.sh`: ≤ 3 MB per file,
≤ 25 MB total for .glb/.gltf/.fbx) — phone-first.

Source paths must be relative-resolved for GitHub Pages; never hardcode
absolute `/assets/...` strings (CI guard: `scripts/check-asset-paths.sh`).

README added by Agent 2 in E-001 (skeleton); content owned by Agent 3.

## 2026-10-09 — S-001 purge

The v2 scaffold shipped ~296 salvaged model/texture files here (GLB food
kit, Sketchfab market/building/vehicle/interior packs, FBX trees/farm, OBJ
houses) plus the Draco decoder in `public/draco/`. None were referenced by
any runtime code (the v2 engine is procedural — `src/` has no loaders), so
all were deleted in S-001. Per-file size/provenance/licence inventory:
`docs/assets/s001-public-assets-audit.csv`. Files remain recoverable from
git history at the pre-purge main (`8fa7d73`); several Sketchfab packs
carry CC-BY-4.0 obligations (attribution required) and one
(`chinese_market.glb`) is Sketchfab Standard licensed — see the audit CSV
before re-shipping any of them. Re-add assets via `assets/registry.json` +
`docs/ASSET_MAPPING.md` per the recorded order of record (Agent 3, W-003).
