#!/usr/bin/env bash
set -euo pipefail

# Script audit findings (2026-03-20)
# Referenced by: package.json (npm run setup)
# Referenced by docs: docs/LOCAL-DEVELOPMENT.md
# Decision: keep
# Purpose: reset local PocketBase data, import canonical schema snapshot,
# and seed local development data in one repeatable bootstrap flow.

PB_BIN="./pocketbase/pocketbase"
PB_DIR="./pocketbase/pb_data"
PB_ADDR="127.0.0.1:8090"
PB_URL="http://127.0.0.1:8090"
PB_ADMIN_EMAIL="admin@local.dev"
PB_ADMIN_PASSWORD="password123"
SCHEMA_FILE="schema/pocketbase-collections.json"

echo "→ Resetting PocketBase data at ${PB_DIR}"
rm -rf "$PB_DIR"
mkdir -p "$PB_DIR"

if [[ ! -x "$PB_BIN" ]]; then
  echo "Error: PocketBase binary not found or not executable at $PB_BIN" >&2
  exit 1
fi

# Start pocketbase in background
echo "→ Starting PocketBase (will run briefly to initialize)"
"$PB_BIN" serve --http=$PB_ADDR --dir=$PB_DIR > /tmp/pb_setup.log 2>&1 &
PB_PID=$!

echo "→ Waiting for PocketBase to be available at $PB_URL"
# wait up to 30s
for i in {1..30}; do
  if curl -sSf "$PB_URL" >/dev/null 2>&1; then
    echo "  PocketBase is up"
    break
  fi
  sleep 1
done

if ! curl -sSf "$PB_URL" >/dev/null 2>&1; then
  echo "Error: PocketBase did not start in time. See /tmp/pb_setup.log" >&2
  kill $PB_PID || true
  exit 1
fi

# Create admin user (idempotent — will error if already exists but we continue)
echo "→ Creating admin user ${PB_ADMIN_EMAIL}"
"$PB_BIN" admin create --email="$PB_ADMIN_EMAIL" --password="$PB_ADMIN_PASSWORD" || true

# Import schema if present
if [[ -f "$SCHEMA_FILE" ]]; then
  IMPORT_SRC="$SCHEMA_FILE"
else
  IMPORT_SRC=""
fi

if [[ -n "$IMPORT_SRC" ]]; then
  echo "→ Importing schema from $IMPORT_SRC"
  curl -sS -X POST "$PB_URL/api/collections/import" \
    -H "Content-Type: application/json" \
    --data-binary "@$IMPORT_SRC" || echo "Schema import returned non-zero status"
else
  echo "→ No schema file found (schema/pocketbase-collections.json) — skipping import"
fi

# Run local seeding script
echo "→ Running seed-local.js"
PB_ADMIN_EMAIL="$PB_ADMIN_EMAIL" PB_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD" PB_URL="$PB_URL" node scripts/seed-local.js

# Stop the temporary PocketBase instance
echo "→ Stopping temporary PocketBase (pid $PB_PID)"
kill $PB_PID || true
sleep 1

echo "Setup complete. You can now run: npm run dev"
