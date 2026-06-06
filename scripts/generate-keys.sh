#!/usr/bin/env bash
# generate-keys.sh
# ----------------------------------------------------------------------------
# Deterministic generator for local/Docker Supabase keys.
#
# Output (KEY=value lines, suitable for `set -a; source` or .env.docker):
#   JWT_SECRET=<64-char hex>          (32 raw bytes, derived from seed)
#   ANON_KEY=<HS256 JWT, role=anon>
#   SERVICE_ROLE_KEY=<HS256 JWT, role=service_role>
#
# Determinism: a 64-hex-char seed is stored in .docker/keys-seed.txt.
#   - First run  -> creates a random seed.
#   - Later runs -> reuse the same seed and emit identical keys.
#   - This makes Docker builds reproducible and lets the same JWT_SECRET
#     be shared between Supabase GoTrue (signing) and the Next.js app
#     (verifying NEXT_PUBLIC_SUPABASE_ANON_KEY at build time).
#
# FOR LOCAL / DOCKER USE ONLY. Do not use these keys in production.
# ----------------------------------------------------------------------------

set -euo pipefail

# Resolve repo root from the script location so the script works from any CWD.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"

SEED_DIR="${REPO_ROOT}/.docker"
SEED_FILE="${SEED_DIR}/keys-seed.txt"

# ---------------------------------------------------------------------------
# Step 1: ensure the seed file exists. If not, create it with 32 random bytes
# (64 hex chars). On subsequent runs the same seed is read and the derived
# JWT_SECRET is therefore identical.
# ---------------------------------------------------------------------------
mkdir -p "${SEED_DIR}"

if [ ! -s "${SEED_FILE}" ]; then
  umask 077
  openssl rand -hex 32 > "${SEED_FILE}"
fi

SEED="$(tr -d '[:space:]' < "${SEED_FILE}")"

# Sanity check: 64 hex chars. If the file was edited by hand and is wrong,
# fail loudly rather than emit garbage keys.
if ! printf '%s' "${SEED}" | grep -Eq '^[0-9a-fA-F]{64}$'; then
  echo "ERROR: ${SEED_FILE} must contain exactly 64 hex characters." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 2: derive JWT_SECRET deterministically from the seed.
#   JWT_SECRET = SHA-256(seed)  -> 32 bytes -> 64 hex chars.
# This is what Supabase GoTrue stores in its `auth.jwt_secret` config and
# what we sign the ANON/SERVICE_ROLE JWTs with.
# ---------------------------------------------------------------------------
JWT_SECRET="$(printf '%s' "${SEED}" | openssl dgst -sha256 -hex | awk '{print $NF}')"

# ---------------------------------------------------------------------------
# Step 3: helpers for base64url encoding and HS256 signing.
#   - b64url: standard base64 with '+'->'-', '/'->'_', padding stripped.
#   - jwt_sign: prints <header>.<payload>.<sig> to stdout.
# ---------------------------------------------------------------------------
b64url() {
  # $1 = raw bytes on stdin. Use openssl base64 (no line wrapping) then map.
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# Build a header.payload string from the two JSON blobs.
b64url_header='{"alg":"HS256","typ":"JWT"}'
ANON_PAYLOAD='{"role":"anon","iss":"supabase","iat":0,"exp":9999999999}'
SVC_PAYLOAD='{"role":"service_role","iss":"supabase","iat":0,"exp":9999999999}'

H_B64="$(printf '%s' "${b64url_header}" | b64url)"
A_P_B64="$(printf '%s' "${ANON_PAYLOAD}" | b64url)"
S_P_B64="$(printf '%s' "${SVC_PAYLOAD}" | b64url)"

# HMAC-SHA256 in binary, then base64url. -macopt hexkey: takes the secret
# as raw hex so we don't depend on a printf-based byte conversion.
sign_b64url() {
  # $1 = the "header.payload" string (on stdin)
  openssl dgst -sha256 -mac HMAC -macopt "hexkey:${JWT_SECRET}" -binary | b64url
}

ANON_KEY="${H_B64}.${A_P_B64}.$(printf '%s' "${H_B64}.${A_P_B64}" | sign_b64url)"
SERVICE_ROLE_KEY="${H_B64}.${S_P_B64}.$(printf '%s' "${H_B64}.${S_P_B64}" | sign_b64url)"

# ---------------------------------------------------------------------------
# Step 4: emit KEY=value lines. Suitable for:
#   $ bash scripts/generate-keys.sh > .env.docker
#   $ set -a; source <(bash scripts/generate-keys.sh); set +a
# ---------------------------------------------------------------------------
printf 'JWT_SECRET=%s\n'          "${JWT_SECRET}"
printf 'ANON_KEY=%s\n'            "${ANON_KEY}"
printf 'SERVICE_ROLE_KEY=%s\n'    "${SERVICE_ROLE_KEY}"
