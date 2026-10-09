#!/usr/bin/env bash
# check-asset-paths.sh — fail if any source file uses absolute public-root
# path literals ('/assets/', '/models/', '/basis/') instead of going
# through the base-aware publicUrl() helper.
#
# Background: vite.config.ts uses base: '/chale-life/'. Locally (vite
# preview) and on GitHub Pages the app is served at
# https://<host>/chale-life/ — absolute paths like '/models/…' resolve
# against the ORIGIN ROOT (https://<host>/models/…) and 404. E-007 found
# exactly this: the W-003 road tiles and W-004 vehicles 404ed in every
# built deploy (preview + Pages) because their URL tables used hard
# '/models/…' literals — only a console.warn noticed, so the runtime e2e
# now also fails on asset 404s. This script is the static guardrail.
# The publicUrl() helper (src/world/gltfSupport.ts) prepends
# import.meta.env.BASE_URL so paths resolve correctly under any base.
#
# Runs inside `npm run test:all` → `checks`. Locally:
#   bash scripts/check-asset-paths.sh
set -euo pipefail

# Match any quote character followed by '/<public-root>/' — covers
# single-quote, double-quote, and backtick-delimited strings.
# rg (ripgrep) is preferred for performance + cleaner output, but fall
# back to grep -rn if rg isn't installed (CI runners have rg by default).
PATTERN="['\"\`]/(assets|models|basis)/"
if command -v rg >/dev/null 2>&1; then
  matches=$(rg -n "$PATTERN" src/ index.html || true)
else
  matches=$(grep -rnE "$PATTERN" src/ index.html || true)
fi

# Allowed exceptions:
#  - arguments of the publicUrl() helper itself: publicUrl('/models/…')
#  - comment lines (they may cite the bad pattern in docs)
if [ -n "$matches" ]; then
  matches=$(printf '%s\n' "$matches" \
    | grep -v "publicUrl(" \
    | grep -vE ":(\s*(\*|//|/\*))" || true)
fi

if [ -n "$matches" ]; then
  echo "ERROR: found absolute public-root asset paths ('/assets/', '/models/', '/basis/') —"
  echo "they 404 wherever the app is not served from the domain root (vite base"
  echo "'/chale-life/': vite preview AND GitHub Pages)."
  echo "Wrap them with the publicUrl() helper (import from src/world/gltfSupport.ts)."
  echo ""
  echo "$matches"
  exit 1
fi

echo "OK: no absolute public-root asset paths in src/ or index.html."
exit 0
