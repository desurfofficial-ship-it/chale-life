#!/usr/bin/env bash
# Runs the same gate as CI, in the same order. Fails fast.
# E-001 (Agent 2): typecheck → test → checks → build.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run typecheck
npm run test
npm run checks
npm run build

echo ""
echo "All checks passed ✓ (typecheck, test, checks, build)"
