#!/usr/bin/env bash
# init-supabase.sh
# ----------------------------------------------------------------------------
# One-shot init container: wait for Postgres, then apply SQL migrations.
#
# Behavior:
#   1. Validate required env vars (POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB,
#      POSTGRES_USER, POSTGRES_PASSWORD). Exit 1 if any are missing.
#   2. Poll `pg_isready` every second for up to 60s. Exit 1 with a clear
#      message if Postgres never comes up.
#   3. Apply every `.sql` file in /supabase/migrations/ in sorted order.
#   4. Apply /supabase/seed.sql if and only if it exists (currently absent
#      in the repo; the step is optional for future seeding).
#   5. Print a final success line and exit 0.
#
# Intended runtime: a one-shot init service in docker-compose, against a
# `postgres:17-alpine` image which provides `pg_isready` and `psql`. This
# script deliberately avoids the Supabase CLI (no Node.js in the container)
# and avoids `cd` (uses absolute paths so it works from any CWD).
# ----------------------------------------------------------------------------

set -euo pipefail

# --- Required environment variables ----------------------------------------

: "${POSTGRES_HOST:?ERROR: POSTGRES_HOST is required}"
: "${POSTGRES_PORT:?ERROR: POSTGRES_PORT is required}"
: "${POSTGRES_DB:?ERROR: POSTGRES_DB is required}"
: "${POSTGRES_USER:?ERROR: POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?ERROR: POSTGRES_PASSWORD is required}"

# --- Configuration ---------------------------------------------------------

readonly MIGRATIONS_DIR="/supabase/migrations"
readonly SEED_FILE="/supabase/seed.sql"
readonly TIMEOUT_SECONDS=60

# --- Helpers ---------------------------------------------------------------

# psql_cmd: run psql with the standard connection flags. Forces
# ON_ERROR_STOP=1 so a single bad statement aborts the script (set -e
# would not catch a syntax error inside the pipeline otherwise).
psql_cmd() {
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    "$@"
}

# --- Step 1: wait for Postgres ---------------------------------------------

echo "Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT} (db=${POSTGRES_DB})..."

start_epoch="$(date +%s)"
while ! pg_isready \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -q; do
  now_epoch="$(date +%s)"
  elapsed=$(( now_epoch - start_epoch ))
  if [ "$elapsed" -ge "$TIMEOUT_SECONDS" ]; then
    echo "ERROR: Postgres not ready after ${TIMEOUT_SECONDS}s at ${POSTGRES_HOST}:${POSTGRES_PORT}" >&2
    exit 1
  fi
  sleep 1
done
echo "Postgres is ready."

# --- Step 2: apply migrations ----------------------------------------------

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: Migrations directory $MIGRATIONS_DIR not found" >&2
  exit 1
fi

applied_count=0
# Glob expands to the literal pattern if no .sql files are present, so
# we guard with -f before running psql.
for f in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$f" ]; then
    continue
  fi
  echo "Applying $(basename "$f")"
  psql_cmd -f "$f"
  applied_count=$(( applied_count + 1 ))
done

if [ "$applied_count" -eq 0 ]; then
  echo "No .sql files found in $MIGRATIONS_DIR"
fi

# --- Step 3: apply seed (optional) -----------------------------------------

if [ -f "$SEED_FILE" ]; then
  echo "Applying $(basename "$SEED_FILE")"
  psql_cmd -f "$SEED_FILE"
else
  echo "Skipping $(basename "$SEED_FILE") (not present)"
fi

# --- Done ------------------------------------------------------------------

echo "All migrations applied successfully."
exit 0
