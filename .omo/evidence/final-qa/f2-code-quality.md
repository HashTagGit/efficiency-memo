# F2 — Code Quality Review: docker-release

**Reviewer:** Sisyphus-Junior (F2)  
**Date:** 2026-06-06  
**Scope:** All 12 new/modified files from the docker-release plan  
**Constraint:** Docker unavailable — static review only

---

## Files Reviewed: 12

| # | File | Lines | Type |
|---|---|---|---|
| 1 | `Dockerfile` | 88 | Multi-stage build |
| 2 | `docker-compose.yml` | 131 | Compose stack (7 services) |
| 3 | `.env.docker` | 79 | Environment template |
| 4 | `.dockerignore` | 82 | Build context filter |
| 5 | `scripts/generate-keys.sh` | 95 | JWT key generator |
| 6 | `scripts/init-supabase.sh` | 109 | Migration runner |
| 7 | `scripts/docker-entrypoint.sh` | 39 | Container entrypoint |
| 8 | `scripts/setup.sh` | 128 | Unix setup launcher |
| 9 | `scripts/setup.ps1` | 99 | Windows setup launcher |
| 10 | `.github/workflows/release.yml` | 99 | CI release workflow |
| 11 | `release/README.md` | 225 | End-user documentation |
| 12 | `apps/web/next.config.ts` | 9 | Build config (modified) |

---

## Check 1: Hardcoded Secrets

**Result: PASS — zero hardcoded secrets found.**

- `.env.docker`: All secret values use `<replace-with-output-from-generate-keys.sh>` placeholders or `${VAR}` references. No populated secrets.
- `docker-compose.yml`: All secret references use Docker Compose variable interpolation (`${POSTGRES_PASSWORD}`, `${JWT_SECRET}`, `${ANON_KEY}`, `${SERVICE_ROLE_KEY}`, `${NEXT_PUBLIC_SUPABASE_ANON_KEY}`). No hardcoded values.
- `release.yml`: Uses `${{ secrets.GITHUB_TOKEN }}` and `${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}` — proper GitHub Actions secret references.
- `generate-keys.sh`: JWT_SECRET is derived from a random seed file via SHA-256. JWT header/payload templates (`{"alg":"HS256","typ":"JWT"}`, `{"role":"anon",...}`) are standard non-secret JWT structures.
- `next.config.ts`: No env var values — only structural config.
- Grep for JWT token patterns (`eyJ...`) returned zero hits in source files (only a sha512 integrity hash in `pnpm-lock.yaml`, which is expected).

---

## Check 2: Insecure Defaults

**Result: PASS with one note.**

- `Dockerfile:61` — `HOSTNAME=0.0.0.0`: Standard Docker practice. The container binds all interfaces internally; external exposure is controlled by `docker-compose.yml` port mappings. Correct.
- `docker-compose.yml:119` — `HOSTNAME: "0.0.0.0"`: Same pattern. Correct.
- `Dockerfile:86` — Healthcheck path `http://localhost:3000/`: Next.js serves the landing page at `/`. Valid.
- `docker-compose.yml:13` — `db` healthcheck: `pg_isready -U postgres -d postgres`. Standard Postgres readiness check. Valid.
- `docker-compose.yml:58` — `auth` healthcheck: `http://localhost:8000/health`. GoTrue exposes `/health` on its default port 8000. Valid.
- `docker-compose.yml:75` — `rest` healthcheck: `http://localhost:3000/`. PostgREST listens on port 3000 by default and responds on root path. Valid. Note: `wget` is assumed to be available in the `postgrest/postgrest:v14.0` image (Alpine-based, includes busybox wget). Cannot runtime-verify without Docker.
- `docker-compose.yml:123` — `nextjs` healthcheck: `http://localhost:3000/`. Next.js serves on port 3000. Valid.
- `GOTRUE_DISABLE_SIGNUP: "false"` (line 53): Signup enabled by default is acceptable for a local Docker distribution with internal-only email (Inbucket). Documented in `release/README.md`.
- `GOTRUE_MAILER_AUTOCONFIRM: "true"` (line 48): Auto-confirm is acceptable for local-only use. Consistent with the Inbucket-only email setup.

---

## Check 3: Error Handling

**Result: PASS with one minor inconsistency.**

| Script | Error handling | Verdict |
|---|---|---|
| `generate-keys.sh` | `set -euo pipefail` (line 21) | ✓ Full |
| `init-supabase.sh` | `set -euo pipefail` (line 22) | ✓ Full |
| `setup.sh` | `set -euo pipefail` (line 24) | ✓ Full |
| `docker-entrypoint.sh` | `set -e` only (line 2) | ⚠ Partial — see LOW-3 |
| `setup.ps1` | `$ErrorActionPreference = 'Stop'` (line 18) | ✓ Full |

**LOW-3: `scripts/docker-entrypoint.sh:2`** — Uses `set -e` only instead of `set -euo pipefail`. The script is small (39 lines) and has explicit null checks on its two env vars (`${NEXT_PUBLIC_SUPABASE_URL:-}` at line 5), so `-u` would not trigger. However, it is inconsistent with the other three bash scripts, all of which use the full hardened preamble. Adding `-u` and `-o pipefail` would align with the project's bash conventions at zero risk.

---

## Check 4: AI Slop

**Result: PASS — no slop detected.**

Evaluated each file for excessive comments, over-abstraction, placeholder patterns, and "intelligent-looking" cruft:

- **Dockerfile (88 lines):** 6 section dividers (`# Stage N: ...`), 5 inline explanations. All functional — stage boundaries, `corepack` rationale, `outputFileTracingRoot` note. No fluff.
- **docker-compose.yml (131 lines):** Zero inline comments. Clean YAML.
- **`.env.docker` (79 lines):** Heavily commented (~40 comment lines for ~30 config lines), but this is a self-documenting template for end users. The comments explain each variable's purpose and relationship to other services. Acceptable for a distribution template. No AI-speak ("leverage", "utilize", "robust").
- **`.dockerignore` (82 lines):** Section headers with brief rationale. Standard Docker pattern. No slop.
- **`generate-keys.sh` (95 lines):** Header doc block (17 lines) explains deterministic key generation. Step markers (`Step 1... Step 4`). Inline comments on non-obvious logic (base64url encoding, HMAC hexkey). Appropriate density.
- **`init-supabase.sh` (109 lines):** Header doc block (19 lines). Well-structured with helpers and step markers. All comments justify non-obvious behavior (`ON_ERROR_STOP=1`, glob guard).
- **`docker-entrypoint.sh` (39 lines):** Minimal comments — only an "echo banner" equivalent. No slop.
- **`setup.sh` (128 lines):** Color output helpers and a trap for terminal reset. Well-documented prerequisite checks with user-facing guidance. The helpers (`ok()`, `err()`, `warn()`, `info()`) are 4 one-liners — reasonable abstraction, not over-engineering.
- **`setup.ps1` (99 lines):** PowerShell mirror of `setup.sh`. Same structure, appropriate density.
- **`release.yml` (99 lines):** Standard GitHub Actions workflow. No comments — the step names are self-documenting.
- **`release/README.md` (226 lines):** This is user documentation. Not subject to slop evaluation.
- **`next.config.ts` (9 lines):** Two config properties. Clean.

---

## Check 5: YAML / Dockerfile Syntax

- **docker-compose.yml:** `python -c "import yaml; yaml.safe_load(open('...'))"` → **VALID**. All service definitions parse cleanly.
- **release.yml:** Standard GitHub Actions workflow; structurally valid YAML.
- **Dockerfile:** Multi-stage `FROM ... AS` syntax is valid Dockerfile 1.7. COPY instructions reference real source files (verified via `glob` for `apps/web/package.json`, `pnpm-lock.yaml`, etc.). The `docker-entrypoint.sh` path at line 77 (`scripts/docker-entrypoint.sh`) exists. The `outputFileTracingRoot` value (`../..`) is correct for a monorepo where the app lives at `apps/web/`.

---

## Check 6: Cross-File Port Consistency

**Result: FAIL — two documentation bugs found.**

Port mapping reference table:

| Service | docker-compose.yml | release/README.md | setup.sh | setup.ps1 | docker-entrypoint.sh |
|---|---|---|---|---|---|
| Next.js app | 3000:3000 | 3000 ✓ | 3000 ✓ | 3000 ✓ | 3000 ✓ |
| Auth (GoTrue) | 54321:8000 | 54321 ✓ | 54321 ✓ | 54321 ✓ | — |
| Postgres | **no ports mapping** | **54322 ✗** | — | — | — |
| Studio | 54323:3000 | 54323 ✓ | 54323 ✓ | 54323 ✓ | — |
| Inbucket (Web) | 54324:9000 | 54324 ✓ | 54324 ✓ | 54324 ✓ | 54324 ✓ |
| Inbucket (SMTP) | 54325:2500 | 54325 ✓ | — | — | — |

**MEDIUM-1: `release/README.md:43`** — The port table claims Postgres is on port 54322. The `db` service in `docker-compose.yml` has **no `ports:` mapping at all**. Postgres is accessible only internally via Docker DNS at `db:5432`. The number 54322 appears to be a residual from the Supabase CLI's default host-port mapping for Postgres, but it does not exist in this Compose file. The table row says "(internal Docker network)" which acknowledges no external access — but the port column should be `—` or `5432 (internal)`, not `54322`.

**MEDIUM-2: `release/README.md:173`** — The troubleshooting section suggests changing `54321:8000` (auth) to `54322:8000` as a port-conflict workaround. But 54322 is the same port the README claims Postgres uses (line 43). If a user follows both pieces of advice, they would create a new port conflict. The troubleshooting guidance should use a port NOT mentioned in the table (e.g., 54326).

---

## Check 7: Release Completeness

**Result: FAIL — release zip is missing critical files.**

**HIGH-1: `.github/workflows/release.yml:82-94`** — The `release` job's "Prepare release assets" step (lines 81-89) copies only three items into `release-dist/`:
- `docker-compose.yml`
- `.env.docker`
- `release/README.md`

The zip archive built at line 93 therefore does **not** include the `scripts/` directory. However, `release/README.md` instructs users to run:

```
bash scripts/generate-keys.sh >> .env.docker   (line 10)
bash scripts/setup.sh                           (line 17)
pwsh scripts/setup.ps1                          (line 23)
```

None of these scripts exist in the release zip. A user who downloads the GitHub release (without cloning the repository) cannot follow the documented setup flow. The `generate-keys.sh` script is essential — without it the user has no documented way to populate `.env.docker`.

---

## Check 8: Confusing User Guidance

**LOW-4: `scripts/setup.ps1:63`** — The help text reads:
```
"Copy-Item .env.docker .env.docker  (already a template; just populate it)"
```
This tells the user to copy a file to itself, which is a no-op. The intent is that `.env.docker` IS the template, and the user only needs to populate it. The PowerShell `Copy-Item` example is misleading. Suggested revision: simply state `".env.docker is already the template — populate it with secrets from generate-keys.sh."`

---

## Summary

| Check | Result |
|---|---|
| 1. Hardcoded secrets | ✅ PASS |
| 2. Insecure defaults | ✅ PASS |
| 3. Error handling | ✅ PASS (1 minor inconsistency, see LOW-3) |
| 4. AI slop | ✅ PASS |
| 5. YAML/Dockerfile syntax | ✅ PASS |
| 6. Cross-file port consistency | ❌ FAIL (2 documentation bugs: MEDIUM-1, MEDIUM-2) |
| 7. Release completeness | ❌ FAIL (1 functional gap: HIGH-1) |
| 8. Confusing guidance | ⚠ 1 cosmetic issue (LOW-4) |

### Issues Found: 5

| ID | Severity | File:Line | Description |
|---|---|---|---|
| HIGH-1 | **HIGH** | `release.yml:82-94` | Release zip omits `scripts/` directory; `release/README.md` references scripts that don't exist in the download |
| MEDIUM-1 | **MEDIUM** | `release/README.md:43` | Port table shows 54322 for Postgres, but `docker-compose.yml` has no `ports:` mapping for the `db` service |
| MEDIUM-2 | **MEDIUM** | `release/README.md:173` | Troubleshooting suggests using port 54322 as auth alt-port, but port 54322 is claimed by Postgres in the port table |
| LOW-3 | **LOW** | `docker-entrypoint.sh:2` | Uses `set -e` only; inconsistent with other bash scripts using `set -euo pipefail` |
| LOW-4 | **LOW** | `setup.ps1:63` | Help text suggests `Copy-Item .env.docker .env.docker` (copy to self) — confusing guidance |

### Could Not Verify (no Docker)
- Runtime behavior of healthcheck endpoints (assume valid based on documented API surfaces)
- Whether `wget` is present in the `postgrest/postgrest:v14.0` image (Alpine-based, likely yes)
- Whether the GoTrue `/health` endpoint returns 200 on the `supabase/gotrue:v2.177.0` image
- Docker build reproducibility (no `docker build` available)

---

## Verdict: **REJECT** (with conditions)

The docker-release implementation is technically solid — no hardcoded secrets, clean YAML/Dockerfile syntax, proper error handling in all scripts, zero AI slop. The code quality is high.

However, the release pipeline has a **functional gap (HIGH-1)** that prevents end users from following the documented setup flow with a release-zip download. This is not a cosmetic issue — it breaks the primary distribution mechanism.

**To APPROVE:**
1. Fix HIGH-1: Add `scripts/` to the release zip in `release.yml` (copy `scripts/` into `release-dist/`)
2. Fix MEDIUM-1: Either expose Postgres on 54322 in `docker-compose.yml`, or remove the 54322 entry from the port table in `release/README.md` and mark it as internal
3. Fix MEDIUM-2: Use a different port (e.g., 54326) in the troubleshooting example to avoid conflicting with the Postgres port claim
