#!/usr/bin/env bash
# check-models.sh — W-003 licence ledger + size budget for optimised GLBs.
#
# Every file under public/models/ must:
#   1. have a row in docs/assets/LICENSES.csv (column `file` = repo-relative
#      path, exactly as shipped),
#   2. be under 1.5 MB on its own.
# All files under public/models/ together must total under 15 MB.
# Conversely, every LICENSES.csv row must point at a file that exists —
# stale ledger rows fail too.
#
# Fails the build otherwise. Run in CI via `npm run check:models`
# (part of test:all → checks). Locally: bash scripts/check-models.sh
set -euo pipefail
cd "$(dirname "$0")/.."

python3 << 'PYEOF'
import csv, os, sys

models_dir = "public/models"
ledger_path = "docs/assets/LICENSES.csv"
max_single_bytes = int(1.5 * 1024 * 1024)   # 1.5 MB per file
max_total_bytes = int(15 * 1024 * 1024)     # 15 MB total

violations = []

# ---- collect shipped model files -----------------------------------------
shipped = []
if os.path.isdir(models_dir):
    for root, _dirs, files in os.walk(models_dir):
        for fn in sorted(files):
            shipped.append(os.path.join(root, fn))

# ---- read the ledger ------------------------------------------------------
ledger_files = set()
if os.path.isfile(ledger_path):
    with open(ledger_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            f = (row.get("file") or "").strip()
            if f:
                ledger_files.add(f)
else:
    violations.append(f"ledger missing: {ledger_path}")

# ---- 1. coverage: every shipped file has a row ----------------------------
for path in shipped:
    if path not in ledger_files:
        violations.append(f"NO LEDGER ROW: {path} (add a row to {ledger_path})")

# ---- reverse: every ledger row points to a real file ----------------------
for f in sorted(ledger_files):
    if not f.startswith(models_dir + "/"):
        # rows outside public/models are not this check's concern
        continue
    if not os.path.isfile(f):
        violations.append(f"STALE LEDGER ROW: {f} does not exist (remove or fix the row)")

# ---- 2 + 3. size budgets ---------------------------------------------------
total = 0
for path in shipped:
    size = os.path.getsize(path)
    total += size
    if size > max_single_bytes:
        violations.append(
            f"OVER SIZE LIMIT: {path} ({size / (1024*1024):.2f} MB > 1.5 MB)"
        )

total_mb = total / (1024 * 1024)
if total > max_total_bytes:
    violations.append(f"TOTAL OVER LIMIT: {total_mb:.2f} MB > 15 MB under {models_dir}/")

# ---- verdict ----------------------------------------------------------------
if violations:
    print("ERROR: model ledger / budget check failed.")
    print(f"Shipped: {len(shipped)} file(s) under {models_dir}/, {total_mb:.2f} MB total.\n")
    for v in violations:
        print(f"  - {v}")
    print(
        "\nTo fix: run `npm run assets` to (re)build optimised GLBs, then add"
        "\nor update the matching rows in docs/assets/LICENSES.csv."
    )
    sys.exit(1)

print(
    f"OK: {len(shipped)} model file(s) under {models_dir}/, "
    f"{total_mb:.2f} MB total — all covered by {ledger_path}, all within budget."
)
sys.exit(0)
PYEOF
