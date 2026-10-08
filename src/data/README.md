# src/data — Owner: Agent 4 (Gameplay & UI), EXCEPT `locations.ts`

Purpose: static game data as data files (jobs, foods, furniture, tiers — see
`salvage/` for the legacy references to re-integrate).

**Exception:** `src/data/locations.ts` is owned by Agent 3 (World & Art) and
must export `{ id, name, type, x, z }[]` (e.g. LOC-001 Aunty Ba's Waakye
Joint) — that is the World → Gameplay contract.

Created empty by Agent 2 in E-001 (skeleton).
