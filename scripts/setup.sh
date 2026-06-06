#!/usr/bin/env bash
# setup.sh
# ----------------------------------------------------------------------------
# One-click launcher for the EfficiencyMemo Docker Compose stack.
#
# Behavior:
#   1. Verify Docker is installed (`command -v docker`).
#   2. Verify the Docker daemon is reachable (`docker info`).
#   3. Verify the `docker compose` v2 plugin is installed.
#   4. Verify .env.docker exists at the repo root.
#   5. Verify .env.docker has no unreplaced `<replace-...>` placeholders.
#   6. Run `docker compose up -d` from the repo root.
#   7. Print a success banner with all service URLs.
#
# Exit codes:
#   0  - stack was launched successfully
#   1  - prerequisite failure (missing tool, missing/wrong config)
#   *  - whatever `docker compose up -d` returns on launch failure
#
# Usage:
#   bash scripts/setup.sh
# ----------------------------------------------------------------------------

set -euo pipefail

# --- Colors ----------------------------------------------------------------

# ANSI escape codes. `readonly` so they cannot be mutated by accident, and
# `NC` ("no color") is used both inline and in the EXIT trap below to reset
# the terminal so the user's prompt is never left half-colored.
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly NC='\033[0m'

# Restore terminal colors on exit. Runs even when the script exits from a
# `set -e` failure or an explicit `exit 1`, so the user's terminal is never
# left holding an open color escape.
trap 'printf "%b" "${NC}"' EXIT

# --- Output helpers --------------------------------------------------------
# `printf` is used (not `echo`) for the color codes because some shells
# interpret backslash escapes in `echo` differently across platforms.

ok()   { printf "%b\u2713%b %s\n" "${GREEN}"  "${NC}" "$1"; }
err()  { printf "%b\u2717%b %s\n" "${RED}"    "${NC}" "$1" >&2; }
warn() { printf "%b\u26a0%b %s\n" "${YELLOW}" "${NC}" "$1"; }
info() { printf "  %s\n" "$1"; }

# --- Resolve repo root from script location -------------------------------
# SCRIPT_DIR is the absolute path to `scripts/`, regardless of the caller's
# CWD. REPO_ROOT is its parent — the directory holding docker-compose.yml
# and .env.docker.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"

# --- Step 1: Docker CLI ----------------------------------------------------

if ! command -v docker &> /dev/null; then
  err "Docker not found"
  info "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
  info "On Linux you can also install the docker package from your distro."
  exit 1
fi
ok "Docker is installed"

# --- Step 2: Docker daemon -------------------------------------------------

if ! docker info &> /dev/null; then
  err "Docker daemon is not running"
  info "Start Docker Desktop (or the docker service on Linux) and try again."
  exit 1
fi
ok "Docker daemon is running"

# --- Step 3: docker compose v2 plugin --------------------------------------

if ! docker compose version &> /dev/null; then
  err "docker compose plugin not found"
  info "Docker Compose v2 ships with Docker Desktop. Update Docker Desktop,"
  info "or install the compose plugin for your distro:"
  info "  https://docs.docker.com/compose/install/"
  exit 1
fi
ok "Docker Compose is available"

# --- Step 4: .env.docker presence ------------------------------------------

if [ ! -f "${REPO_ROOT}/.env.docker" ]; then
  err ".env.docker not found"
  info "Create it from the template and populate the secrets. The easiest"
  info "way is to generate them and append:"
  info "  bash scripts/generate-keys.sh >> .env.docker"
  exit 1
fi
ok ".env.docker exists"

# --- Step 5: .env.docker has no placeholders -------------------------------

# The template ships with `<replace-with-output-from-generate-keys.sh>`
# markers. `grep -q '<replace'` matches all of them with one pattern.
if grep -q '<replace' "${REPO_ROOT}/.env.docker"; then
  warn ".env.docker contains unreplaced placeholders"
  info "Run: bash scripts/generate-keys.sh and paste the output into"
  info "  .env.docker (or append: bash scripts/generate-keys.sh >> .env.docker)"
  exit 1
fi
ok ".env.docker is populated"

# --- Step 6: Launch the stack ----------------------------------------------

info "Starting the stack (this may take a minute on first run)..."
cd "${REPO_ROOT}"
docker compose up -d

# --- Step 7: Success banner ------------------------------------------------

echo ""
printf "%b======================================%b\n" "${GREEN}" "${NC}"
printf "%b  EfficiencyMemo is starting up%b\n"    "${GREEN}" "${NC}"
printf "%b======================================%b\n" "${GREEN}" "${NC}"
info "App:    http://localhost:3000"
info "Auth:   http://localhost:54321"
info "Studio: http://localhost:54323"
info "Email:  http://localhost:54324"
echo ""
info "Run 'docker compose logs -f' to follow the logs."
