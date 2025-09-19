#!/usr/bin/env bash
set -euo pipefail

# Config
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to your Supabase connection string}"
OUT_FILE="db/schema.sql"
SNAP_DIR="db/snapshots"
SCHEMAS=("public" "auth" "storage")  # add any custom schemas here, e.g. "functions"

mkdir -p "$(dirname "$OUT_FILE")" "$SNAP_DIR"

echo "→ Dumping schemas: ${SCHEMAS[*]}"
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  $(printf -- "--schema=%s " "${SCHEMAS[@]}") \
  --file "$OUT_FILE" \
  "$SUPABASE_DB_URL"

# Normalize output for stable diffs: remove volatile SET statements & comments
# (macOS sed needs -i '' ; Linux sed uses -i)
if sed --version >/dev/null 2>&1; then
  sed -i -E '/^--|^SET /d' "$OUT_FILE"
else
  # BSD/macOS sed fallback
  sed -i '' -E '/^--|^SET /d' "$OUT_FILE"
fi

# Optional: keep historical snapshots
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
cp "$OUT_FILE" "$SNAP_DIR/schema_$STAMP.sql"

echo "✓ Schema captured to $OUT_FILE"
