#!/bin/sh
set -e

# Validate required env vars
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL is not set" >&2
  exit 1
fi

if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set" >&2
  exit 1
fi

# Wait for Supabase API
echo "Waiting for Supabase at $NEXT_PUBLIC_SUPABASE_URL..."
i=0
while [ $i -lt 60 ]; do
  if curl -sf "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health" > /dev/null 2>&1; then
    echo "Supabase is ready"
    break
  fi
  i=$((i + 1))
  if [ $i -eq 60 ]; then
    echo "ERROR: Supabase did not become ready in 60s" >&2
    exit 1
  fi
  sleep 1
done

# Print banner
echo "===================================="
echo "EfficiencyMemo starting..."
echo "App: http://localhost:3000"
echo "Inbucket (email): http://localhost:54324"
echo "===================================="

# Start Next.js
exec node server.js
