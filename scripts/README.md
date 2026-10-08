# scripts — Owner: Agent 2 (Engine & Platform)

Repo automation. Highlights:

- `check-all.sh` — the full CI gate locally, same order (typecheck → test →
  checks → build).
- `check-html-labels.sh` / `check-asset-paths.sh` / `check-asset-budget.sh` —
  CI guardrails wired into `npm run checks` (labels under the ortho camera,
  absolute asset paths, asset size budgets).
- `test_*.ts` — legacy standalone probes from the v2 scaffold: they point at
  the retired `src/game/` tree and are superseded by the vitest suites
  (`src/rules`, `src/store`) and the Playwright playtest (`tests/e2e/`,
  `npm run test:e2e`). Kept for reference only; NPC display names inside
  them are neutral placeholders so data renames never touch these files.

Asset pipeline helpers (`optimize-assets.sh`, `download_player_character.py`)
belong here too; coordinate with Agent 3 before changing asset budgets.
