#!/usr/bin/env bash
# Fails if any <Html in src/ uses distanceFactor while the scene uses an
# orthographic camera (drei objectScale returns camera.zoom → giant labels).
# E-001: src/r3f was absorbed into src/app + src/engine, so this now scans all
# of src/ (team rule in AGENTS.md: no <Html distanceFactor> under the ortho cam).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCAN="$ROOT/src"

if ! rg -q "OrthographicCamera|orthographic" "$SCAN" --glob '*.tsx' --glob '*.ts'; then
  echo "check-html-labels: no orthographic camera found — skip"
  exit 0
fi

# Match distanceFactor= on the same line as <Html, or numeric distanceFactor={
hits=$(rg -n --glob '*.tsx' -U '<Html[^>]*distanceFactor|distanceFactor=\{[0-9]' "$SCAN" || true)
# Filter out comments
real=$(echo "$hits" | grep -v '^\s*$' | grep -v '//.*distanceFactor' | grep -v '\*.*distanceFactor' || true)

if [ -n "$real" ]; then
  echo "FAIL: <Html distanceFactor> is forbidden under OrthographicCamera"
  echo "      (drei scales by camera.zoom → labels ~100× too big on phone)"
  echo "$real"
  echo ""
  echo "Fix: remove distanceFactor, use fixed screen size + zIndexRange={[40,0]}"
  echo "See salvage/r3f/worldLabel.ts for the safe label pattern"
  exit 1
fi

echo "check-html-labels: OK (no distanceFactor on <Html>)"
