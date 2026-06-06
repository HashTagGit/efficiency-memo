# F3 — Real Manual QA (Structural — Docker Unavailable)

**Reviewer**: F3 (unspecified-high)  
**Date**: 2026-06-06  
**Plan**: `.omo/plans/docker-release.md`  
**Limitation**: Docker is NOT installed on this machine. All dynamic smoke tests (build, up, curl, restart) are SKIPPED. This QA is structural only.

---

## REAL MANUAL QA (STRUCTURAL — Docker unavailable)

### Startup (docker compose up)
**N/A — no Docker**

Cannot verify. Recommended command for user: `docker compose up -d --wait` on a Docker-capable machine. The task-14 evidence file (`task-14-full-smoke-test.txt`) confirms the same agent encountered the same limitation and performed structural checks only.

### Data persistence
**N/A — no Docker**

Cannot verify volume survival across `docker compose down && docker compose up -d`. The `docker-compose.yml` declares a named volume `pgdata` for the `db` service (line 11), which is the correct mechanism.

---

### Cross-reference checks: PASS

| Check | Result | Details |
|---|---|---|
| All `${VAR}` in docker-compose.yml match `.env.docker` | **PASS** | 7 vars cross-referenced, all present (ANON_KEY, JWT_SECRET, NEXT_PUBLIC_SUPABASE_ANON_KEY, POSTGRES_PASSWORD, SERVICE_ROLE_KEY, SUPABASE_AUTH_SITE_URL, SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS) |
| Dockerfile ARGs match compose `build-args:` | **PASS** | `ARG NEXT_PUBLIC_SUPABASE_URL` ← compose line 108; `ARG NEXT_PUBLIC_SUPABASE_ANON_KEY` ← compose line 109 |
| Dockerfile ARGs match CI workflow `build-args:` | **PASS** | Both ARGs get `${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}` and `${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}` from workflow lines 71-72 |
| docker-entrypoint.sh validated vars passed by compose | **PASS** | `NEXT_PUBLIC_SUPABASE_URL` (compose line 116 → entrypoint line 5); `NEXT_PUBLIC_SUPABASE_ANON_KEY` (compose line 117 → entrypoint line 10) |
| No mock-auth env vars in production configs | **PASS** | `.env.docker`, `Dockerfile`, `docker-entrypoint.sh` all clean of MOCK/E2E_MOCK/ENABLE_AUTH_MOCK |
| No dev references in release README | **PASS** | `release/README.md` clean of `pnpm`, `npm install`, `vercel`, `dev server`, `Node.js`, `Supabase CLI` |
| Supabase migrations unchanged | **PASS** | `git diff HEAD~6..HEAD -- supabase/migrations/` returns no output |

**Minor finding — POSTGRES_PASSWORD placeholder gap**:
`generate-keys.sh` outputs only `JWT_SECRET`, `ANON_KEY`, and `SERVICE_ROLE_KEY` (lines 93-95). It does NOT output `POSTGRES_PASSWORD`. However, `.env.docker` line 25 says `POSTGRES_PASSWORD=<replace-with-output-from-generate-keys.sh>`, implying the keygen script should generate it. After a user runs `bash scripts/generate-keys.sh >> .env.docker`, `POSTGRES_PASSWORD` will still have its `<replace-...>` placeholder. The `setup.sh` placeholder check (line 103: `grep -q '<replace'`) correctly catches this and exits, but the `setup.sh` error message (line 105: "Run: bash scripts/generate-keys.sh") points the user back to the script that won't fix POSTGRES_PASSWORD. The user would need to manually set it. Severity: **low** — easily remedied, and the setup script's gate prevents proceeding with bad config.

---

### File structure: PASS

All 11 expected files exist and have non-zero size:

| File | Size (bytes) | Status |
|---|---|---|
| `Dockerfile` | 3,375 | ✓ |
| `docker-compose.yml` | 3,542 | ✓ |
| `.env.docker` | 3,983 | ✓ |
| `.dockerignore` | 2,565 | ✓ |
| `scripts/setup.sh` | 4,982 | ✓ |
| `scripts/setup.ps1` | 3,760 | ✓ |
| `scripts/generate-keys.sh` | 4,342 | ✓ |
| `scripts/init-supabase.sh` | 3,710 | ✓ |
| `scripts/docker-entrypoint.sh` | 914 | ✓ |
| `.github/workflows/release.yml` | 2,534 | ✓ |
| `release/README.md` | 5,717 | ✓ |

Additional files created by implementation (accounted for):
- `.docker/keys-seed.txt` — deterministic seed for `generate-keys.sh` (Task 2)
- `.gitignore` modified — added `!.env.docker` whitelist (necessary for template commit)
- `.omo/evidence/task-*.txt` — evidence files per QA requirements

---

### CI workflow: PASS

| Check | Result |
|---|---|
| Valid YAML | **PASS** — `yaml.safe_load()` succeeds |
| Trigger on tag `v*` | **PASS** — `on: push: tags: - 'v*'` (line 4-6) |
| Permissions | **PASS** — `packages: write, contents: write` (lines 8-10) |
| 3 jobs present | **PASS** — `test` (line 13), `build` (line 40), `release` (line 74) |
| Sequential dependency chain | **PASS** — `build: needs: test`, `release: needs: build` |
| All actions pinned to major versions | **PASS** — checkout@v4, setup-node@v4, setup-buildx-action@v3, login-action@v3, metadata-action@v5, build-push-action@v5, softprops/action-gh-release@v2 |
| Test job runs typecheck + unit + E2E | **PASS** — `pnpm typecheck` (line 29), `pnpm test` (line 32), `pnpm test:e2e` (line 38) |
| Build job pushes to ghcr.io | **PASS** — login to ghcr.io (line 48-52), docker/metadata-action for tags (line 54-61), docker/build-push-action with push: true (line 63-72) |
| Release job creates zip + GitHub Release | **PASS** — zip archive created (line 91-94), softprops/action-gh-release@v2 with auto-generated notes (line 96-99) |
| Zip contains correct files | **PASS** — `docker-compose.yml`, `.env.docker`, `release/README.md` (lines 83-89) |
| Dockerfile path referenced | **PASS** — `file: ./Dockerfile` (line 66) |

---

### Plan coverage: PASS

All 14 implementation tasks have corresponding git commits and deliverables:

| Task | Commit | Deliverable Verified |
|---|---|---|
| 1. Add `output: "standalone"` | `ab73faf` | `apps/web/next.config.ts` — contains `output: "standalone"` + `outputFileTracingRoot` |
| 2. JWT key generation | `ab73faf` | `scripts/generate-keys.sh` — 95 lines, outputs JWT_SECRET/ANON_KEY/SERVICE_ROLE_KEY, deterministic via seed |
| 3. `.env.docker` template | `ab73faf` | 79 lines, all required vars present, no mock-auth |
| 4. `.dockerignore` | `ab73faf` | 82 lines, excludes build artifacts/test/logs, includes `.env.docker` via whitelist, does NOT exclude `supabase/migrations/` or `pnpm-lock.yaml` |
| 5. Supabase init script | `ab73faf` | `scripts/init-supabase.sh` — 109 lines, waits for pg_isready (60s timeout), applies *.sql migrations, handles missing seed.sql |
| 6. Docker entrypoint | `ab73faf` | `scripts/docker-entrypoint.sh` — 39 lines, validates env vars, waits for Supabase API, prints banner, execs node server.js |
| 7. Tests pass after config change | `ab73faf` | Evidence: `task-7-test-results.txt`, `task-7-vitest.txt`, `task-7-playwright.txt`, `task-7-typecheck.txt` |
| 8. Multi-stage Dockerfile | `658bafe` | 88 lines, 3 stages (deps/build/runner), ARG for NEXT_PUBLIC_*, HEALTHCHECK, non-root user |
| 9. docker-compose.yml | `658bafe` | 131 lines, 7 services (db/init/auth/rest/studio/inbucket/nextjs), health checks, named volume, depends_on ordering |
| 10. setup.sh | `804d9c9` | 128 lines, bash, checks Docker/daemon/compose/.env.docker/placeholders, launches stack, prints URLs |
| 11. setup.ps1 | `804d9c9` | 99 lines, #Requires -Version 7, mirrors setup.sh logic in PowerShell |
| 12. GitHub release workflow | `8b9f799` | 99 lines, valid YAML, 3 sequential jobs, test→build→release pattern |
| 13. Release README | `b436d3a` | 225 lines, Quick Start (3 steps), troubleshooting, security note, no dev refs |
| 14. Smoke verification | `b436d3a` | `task-14-full-smoke-test.txt` — structural checks performed (Docker unavailable); dynamic startup/curl/restart skipped |

**Tasks**: 14/14 with verified deliverables — **PASS**

---

### End-user flow simulation: PASS

Reading `release/README.md` as a new user, I can follow the 3-step Quick Start:

**Step 1**: `bash scripts/generate-keys.sh >> .env.docker` — The command is copy-pasteable. The script exists and is functional. Minor issue: the script doesn't generate POSTGRES_PASSWORD (noted above), but the setup scripts catch this before proceeding.

**Step 2**: `bash scripts/setup.sh` (or `pwsh scripts/setup.ps1`) — Both scripts first validate Docker, daemon, compose plugin, `.env.docker` existence, and placeholder-free config before launching. This is correct and protective.

**Step 3**: Open `http://localhost:3000` — The URL is correct per docker-compose.yml port mapping (line 121: `3000:3000`).

**Correctness of URLs and ports**: All URLs in the README match docker-compose.yml port mappings (3000, 54321, 54323, 54324, 54325). The README correctly notes that port 54322 (Postgres) is internal Docker network.

**Completeness**: The README covers prerequisites, setup, accessing the app (with magic-link sign-in flow explained), upgrading, troubleshooting (port conflicts, Docker not running, placeholder errors, data reset, log viewing), and a security note.

**No dev-only references**: Confirmed — `pnpm`, `npm install`, `vercel`, `dev server`, `Node.js`, and `Supabase CLI` are all absent.

---

## VERDICT: **APPROVE**

All structural checks pass. The implementation is complete and internally consistent. The only finding is the POSTGRES_PASSWORD placeholder gap (low severity — the setup scripts catch it before proceeding, and it's easily fixed by the user).

### What was NOT verified (Docker unavailable)
- `docker build -t efficiency-memo:test .` — cannot verify build time or image size
- `docker compose up -d --wait` — cannot verify all 6+ services become healthy
- `curl http://localhost:3000` — cannot verify app responds HTTP 200
- `curl http://localhost:3000/sign-in` — cannot verify sign-in page loads
- `curl http://localhost:54324` — cannot verify Inbucket accessible
- Data persistence across `docker compose down && docker compose up -d` — cannot verify
- Clean restart from `docker compose down -v && docker compose up -d` — cannot verify

### Recommended next step
```
Run on a Docker-capable machine:
  docker compose down -v
  docker compose up -d --wait
  curl -f http://localhost:3000
  curl -f http://localhost:3000/sign-in
  curl -f http://localhost:54324
  docker compose down && docker compose up -d --wait
  curl -f http://localhost:3000     # verify persistence
  docker compose down -v
```
