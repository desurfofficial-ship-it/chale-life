# docs/assets — Owner: Agent 3 (World & Art)

Ledgers, credits and evidence for every asset the game ships (or once
shipped). Three ledgers, three different jobs:

| File | Job | Consumed by |
| --- | --- | --- |
| `LICENSES.csv` | **Runtime model ledger** — one row per file under `public/models/` (road tiles, vehicles, player character) with author, source URL, licence, attribution text and modified-flag | `scripts/check-models.sh` (CI gate): coverage, per-file < 1.5 MB, directory < 15 MB, stale-row detection |
| `ASSET_REGISTRY.csv` | **Full audit history** — the pre-S-001 `public/assets/` tree (293 rows, AST-0001…0293). That tree was purged in S-001 (licence-unverifiable FBX/OBJ packs); the rows are kept as provenance, their `File` paths are dead by design | nothing automated — historical record |
| `CREDITS.md` | In-game credit strings + pack-level credits | the game's credits surface |

## Rules

- **New runtime models** (anything under `public/models/`) must land with a
  `LICENSES.csv` row in the same PR — `check-models.sh` fails otherwise.
- **Pipeline:** drop sources into `asset-sources/` (gitignored), then
  `npm run assets` (`scripts/optimize-assets.mjs`: dedup → weld → metre
  normalisation → meshopt + KTX2 ≤ 1024 px). Budgets: single file < 1.5 MB,
  `public/models/` total < 15 MB.
- **Brands:** keep trademarked names, logos and badge marks out of the game
  — no "Honda" / "Volkswagen" strings or roundels in GLB binaries, textures
  or code (W-004 scrub; `dist/` is grepped in verification). Licence rows
  for scrubbed assets carry `modified: y` and say what was removed.
- **Evidence screenshots** (`w00*.png`, `g008*.png`) are the visual proof
  packed with each world PR's report — they stay in the repo so the report
  links never rot.

## Regenerating the ledgers

- `check:models` failure naming a missing row → add the row from the
  source pack's licence file, then re-run `npm run check:models`.
- Sketchfab sources are re-verified via the API at intake time (licence
  must be CC Attribution or CC0); the URL in the row is the UID-form
  model URL, which 301s to the canonical page.
