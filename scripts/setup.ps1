#Requires -Version 7
<#
.SYNOPSIS
  One-click setup for the EfficiencyMemo Docker distribution on Windows.
.DESCRIPTION
  Mirrors scripts/setup.sh. Checks Docker prerequisites, validates
  .env.docker, and starts the Docker Compose stack.

  This script is read-only with respect to the host: it does not install
  anything, modify the system PATH, or require elevated privileges.
  The only side effect on success is the creation/management of the
  Docker containers declared in docker-compose.yml.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Resolve repo root from script location. $PSScriptRoot is the directory
# that contains this file (i.e. <repo>/scripts); its parent is the repo.
$RepoRoot = Split-Path -Parent $PSScriptRoot

# --- Colored output helpers ------------------------------------------------
function Write-Ok([string]$msg)   { Write-Host "✓ $msg"   -ForegroundColor Green }
function Write-Err([string]$msg)  { Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Warn([string]$msg) { Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Info([string]$msg) { Write-Host "  $msg" }

# --- 1. Docker executable --------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Err "Docker not found"
  Write-Info "Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop"
  exit 1
}
Write-Ok "Docker is installed"

# --- 2. Docker daemon ------------------------------------------------------
try {
  docker info | Out-Null
} catch {
  Write-Err "Docker daemon is not running"
  Write-Info "Start Docker Desktop and try again."
  exit 1
}
Write-Ok "Docker daemon is running"

# --- 3. Docker Compose v2 plugin -------------------------------------------
try {
  docker compose version | Out-Null
} catch {
  Write-Err "docker compose plugin not found"
  Write-Info "Update Docker Desktop to v4.x or newer (the 'docker compose' v2 plugin is bundled)."
  exit 1
}
Write-Ok "Docker Compose is available"

# --- 4. .env.docker presence -----------------------------------------------
$EnvFile = Join-Path $RepoRoot '.env.docker'
if (-not (Test-Path $EnvFile)) {
  Write-Err ".env.docker not found at repo root"
  Write-Info "Create it from the template and populate the placeholders:"
  Write-Info "  The shipped .env.docker is itself the template (contains <replace-with-...> placeholders)."
  Write-Info "  bash scripts/generate-keys.sh | Out-File -Append .env.docker"
  exit 1
}
Write-Ok ".env.docker exists"

# --- 5. Placeholder sanity check -------------------------------------------
if (Select-String -Path $EnvFile -Pattern '<replace' -Quiet) {
  Write-Warn ".env.docker still contains unreplaced placeholders"
  Write-Info "Run: bash scripts/generate-keys.sh and paste the output into .env.docker"
  exit 1
}
Write-Ok ".env.docker is populated"

# --- 6. Bring the stack up -------------------------------------------------
Write-Info "Starting the stack (this may take a minute)..."
Push-Location $RepoRoot
try {
  docker compose up -d
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose up -d exited with code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

# --- 7. Success banner -----------------------------------------------------
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  EfficiencyMemo is starting up"     -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Info "App:    http://localhost:3000"
Write-Info "Auth:   http://localhost:54321"
Write-Info "Studio: http://localhost:54323"
Write-Info "Email:  http://localhost:54324"
Write-Host ""
Write-Info "Run 'docker compose logs -f' to follow the logs."
