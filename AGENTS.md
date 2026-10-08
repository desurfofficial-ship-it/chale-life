# AGENTS.md — Team rules for autonomous agents

> Owned by Agent 1 (Hark, Producer). Created by Agent 2 (Engine & Platform) in E-001
> because it did not exist at branch time. Hark: edit freely — this file defers to you.

## Working agreement

1. **Inspect before changing.** Read latest `main`, this file, `OWNERSHIP.md` and
   `salvage/README.md` before starting a ticket. Check open PRs — other agents work
   in parallel and you must not collide with them.
2. **Smallest safe change.** One ticket per PR. No drive-by refactors, no formatting
   churn in files you don't own.
3. **No silent scope growth.** Anything beyond your ticket goes into the PR's
   `ISSUES` / `NEXT STEP` sections — never quietly into the diff.
4. **Tests for everything.** Every behaviour you ship ships with a test. Reference
   example: `movementStep` in `src/engine/movement.ts` — a pure function with unit
   tests for direction, speed cap, collision stop and bounds.
5. **CI green before merge.** `typecheck → test → checks → build` must pass. Tests
   run before build on purpose (fail fast, keep builds honest).
6. **Report format.** Every PR description uses exactly these sections:
   `COMPLETED / FILES CHANGED / TESTED / RESULTS / ISSUES / NEXT STEP`
   (`.github/pull_request_template.md` enforces the skeleton).

## Ownership

See `OWNERSHIP.md`. Only touch your own folders. Shared behaviour lives in contracts
(see below), not in cross-folder edits.

## Contracts (do not break)

- **World → Engine**: `src/world/colliders.ts` exports
  `colliders: { minX; minZ; maxX; maxZ }[]` and `worldBounds` (same shape), in
  metres, 1 unit = 1 m. Engine reads it for collision. World never imports engine
  code.
- **World → Gameplay**: `src/data/locations.ts` exports `{ id, name, type, x, z }[]`
  (e.g. LOC-001 Aunty Ba's Waakye Joint).
- **Store**: `src/store` is owned by Engine. Gameplay rules are pure functions
  `(state, input) => newState`; Engine wires them into the store when asked. HUD
  only reads the store via subscribe/selectors — use the throttled HUD channel
  (`subscribeHud` / `getHud` in `src/store/gameStore.ts`, ≤ ~10 notifications/s).

## Hard technical rules

- No `window` globals, no `document.querySelector` for gameplay.
- No `<Html distanceFactor>` under the orthographic camera
  (enforced by `scripts/check-html-labels.sh` in CI).
- **One `useFrame` game loop**: `src/engine/GameLoop.tsx`. New systems feed pure
  steps into it — never add a second loop.
- Phone-first: 30+ fps on a mid-range iPhone. Keep DPR capped, avoid per-frame
  allocations in hot paths, no new heavy dependencies, no physics engines.

## Dev commands

```bash
npm ci                 # install (package-lock.json is the source of truth)
npm run dev            # vite dev server on :3000
npm run typecheck      # tsc --noEmit
npm run test           # vitest (unit + perf smoke)
npm run checks         # repo guard scripts + lint
npm run build          # typecheck + vite build
bash scripts/check-all.sh   # the full CI gate locally, same order
```

Note: `bun.lock` is left over from the scaffold; CI and this team use npm +
`package-lock.json`.
