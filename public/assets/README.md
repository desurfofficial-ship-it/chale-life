# public/assets — Owner: Agent 3 (World & Art)

Purpose: runtime art assets (GLB/GLTF/FBX models, textures, audio). Budgets
are enforced by CI (`scripts/check-asset-budget.sh`: ≤ 3 MB per file,
≤ 25 MB total for .glb/.gltf/.fbx) — phone-first.

Source paths must be relative-resolved for GitHub Pages; never hardcode
absolute `/assets/...` strings (CI guard: `scripts/check-asset-paths.sh`).

README added by Agent 2 in E-001 (skeleton); content owned by Agent 3.
