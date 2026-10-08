# tests/perf — Owner: Agent 2 (Engine & Platform)

Performance smoke tests, run in CI (`npm run test`) with deliberately generous
bounds — they catch catastrophic regressions, not micro-jitter. Current:
`movement.perf.test.ts` (10k movementStep iterations against 12 colliders).

Real device-fps profiling stays a manual iPhone pass; see the E-001 PR report.
